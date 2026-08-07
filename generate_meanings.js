const fs = require('fs');
const https = require('https');
const XLSX = require('xlsx');

// Configuration
let FILE_PATH = './நம்ம சாமி நம்ம கோவில் - data until 18-07-2026.xlsx';
const CACHE_PATH = './meanings_cache.json';

// Helper to make API call to Gemini (Single Name)
function generateMeaningWithGemini(name, apiKey) {
    return new Promise((resolve, reject) => {
        const prompt = `for the name "${name}", fetch a meaning for the name in tamil. The explanation should be based on the ancient bharatham prediction, minimum of 20 words, but in a one liner briefing. Do not repeat the name "${name}" or start with intro phrases like "${name} என்ற பெயர்" or "இந்த எண்". Write only the Tamil meaning explanation directly.`;
        
        const payload = JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.2
            }
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;
        
        const req = https.request(url, {
            method: 'POST',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const responseJson = JSON.parse(data);
                    if (responseJson.error) {
                        return reject(responseJson.error);
                    }
                    if (responseJson.candidates && responseJson.candidates[0] && responseJson.candidates[0].content && responseJson.candidates[0].content.parts[0]) {
                        const rawMeaning = responseJson.candidates[0].content.parts[0].text.trim();
                        const formatted = `${name} என்ற பெயர் ${rawMeaning}`;
                        resolve(formatted);
                    } else {
                        reject(new Error('Unexpected response format from Gemini API'));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${e.message}. Raw data: ${data}`));
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out after 30 seconds'));
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(payload);
        req.end();
    });
}

// Helper to make Batch API call to Gemini (20 names per request)
function generateMeaningsBatchWithGemini(names, apiKey) {
    return new Promise((resolve, reject) => {
        const prompt = `For each of the following names: ${JSON.stringify(names)}, fetch a meaning for the name in Tamil. The explanation should be based on the ancient bharatham prediction, minimum of 20 words, but in a one liner briefing. Do not repeat the name or start with intro phrases like "இந்த பெயர்" or "இந்த எண்". Return ONLY a valid JSON object where keys are the exact name strings from the input list and values are the Tamil meaning explanation strings directly.`;
        
        const payload = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2,
                responseMimeType: 'application/json'
            }
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;
        
        const req = https.request(url, {
            method: 'POST',
            timeout: 45000,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const responseJson = JSON.parse(data);
                    if (responseJson.error) {
                        return reject(responseJson.error);
                    }
                    if (responseJson.candidates && responseJson.candidates[0] && responseJson.candidates[0].content && responseJson.candidates[0].content.parts[0]) {
                        const text = responseJson.candidates[0].content.parts[0].text.trim();
                        let parsed = {};
                        try {
                            parsed = JSON.parse(text);
                        } catch (e) {
                            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
                            parsed = JSON.parse(cleaned);
                        }
                        
                        // Format each result with "${name} என்ற பெயர் " prefix
                        const formattedResults = {};
                        for (const n of names) {
                            if (parsed[n]) {
                                let rawM = parsed[n].trim();
                                const redundantPrefix = `${n} என்ற பெயர்`;
                                if (rawM.startsWith(redundantPrefix)) {
                                    rawM = rawM.substring(redundantPrefix.length).trim();
                                }
                                formattedResults[n] = `${n} என்ற பெயர் ${rawM}`;
                            }
                        }
                        resolve(formattedResults);
                    } else {
                        reject(new Error('Unexpected response format from Gemini API'));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${e.message}. Raw data: ${data}`));
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out after 45 seconds'));
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(payload);
        req.end();
    });
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
    // Parse Arguments & Key List
    let apiKeys = [];
    if (process.env.GEMINI_API_KEY) {
        apiKeys.push(process.env.GEMINI_API_KEY);
    }
    let rangeArg = null;       
    let limitArg = null;       
    let forceOverwrite = false;
    let concurrency = 3;       // Default 3 Parallel Workers!
    let countOnly = false;
    let monitorArg = null;     

    for (let i = 2; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg === '--file' || arg === '-i' || arg === '--input') {
            FILE_PATH = process.argv[++i];
        } else if (arg === '--range' || arg === '-r') {
            rangeArg = process.argv[++i];
        } else if (arg === '--limit' || arg === '-l') {
            limitArg = parseInt(process.argv[++i], 10);
        } else if (arg === '--force' || arg === '-f') {
            forceOverwrite = true;
        } else if (arg === '--concurrency' || arg === '-c') {
            concurrency = Math.max(1, parseInt(process.argv[++i], 10));
        } else if (arg === '--key' || arg === '-k') {
            const keysPassed = process.argv[++i].split(/[,;]/).map(k => k.trim()).filter(Boolean);
            apiKeys = keysPassed.concat(apiKeys);
        } else if (arg === '--count' || arg === 'count') {
            countOnly = true;
        } else if (arg === '--monitor' || arg === '-m' || arg === 'monitor') {
            monitorArg = parseInt(process.argv[++i], 10) || 5;
        } else if (!arg.startsWith('-')) {
            if (arg.endsWith('.xlsx') || arg.endsWith('.xls') || fs.existsSync(arg)) {
                FILE_PATH = arg;
            } else {
                const keysPassed = arg.split(/[,;]/).map(k => k.trim()).filter(Boolean);
                apiKeys = keysPassed.concat(apiKeys);
            }
        }
    }

    apiKeys = Array.from(new Set(apiKeys));

    if (apiKeys.length === 0 && !countOnly && !monitorArg) {
        console.error('Error: Please provide your Gemini API key.');
        process.exit(1);
    }

    console.log('Loading meanings cache...');
    let cache = {};
    if (fs.existsSync(CACHE_PATH)) {
        try {
            cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
            console.log(`Loaded ${Object.keys(cache).length} cached meanings.`);
        } catch (e) {
            console.warn('Could not load cache:', e.message);
        }
    }

    console.log('Loading Excel workbook...');
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    console.log(`Workbook loaded. Total rows: ${range.e.r + 1}`);

    // Detect if Row 1 is a header or a valid name
    let startRow = 0;
    const firstCellA = worksheet[XLSX.utils.encode_cell({ r: 0, c: 0 })];
    const firstVal = firstCellA ? String(firstCellA.v).trim().toLowerCase() : '';
    if (['name', 'பெயர்', 's.no', 'sno', 'no', 'sl.no', 'slno'].includes(firstVal)) {
        startRow = 1;
    }

    // Pre-scan existing valid meanings in Column G
    console.log('Pre-scanning Excel sheet for existing valid meanings to sync to cache...');
    let syncedFromExcel = 0;
    for (let rowNum = startRow; rowNum <= range.e.r; rowNum++) {
        const cellRefA = XLSX.utils.encode_cell({ r: rowNum, c: 0 });
        const cellRefG = XLSX.utils.encode_cell({ r: rowNum, c: 6 });
        
        const nameVal = worksheet[cellRefA] ? String(worksheet[cellRefA].v).trim() : '';
        const meaningVal = worksheet[cellRefG] ? String(worksheet[cellRefG].v).trim() : '';
        const expectedPrefix = `${nameVal} என்ற பெயர்`;

        if (nameVal && nameVal !== '-' && meaningVal && meaningVal !== '-' && meaningVal.length > 5) {
            if (!meaningVal.startsWith('இந்த எண்') && meaningVal.startsWith(expectedPrefix)) {
                if (!cache[nameVal]) {
                    cache[nameVal] = meaningVal;
                    syncedFromExcel++;
                }
            }
        }
    }
    if (syncedFromExcel > 0) {
        console.log(`Synced ${syncedFromExcel} valid existing meanings from Excel sheet into cache.`);
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    } else {
        console.log(`Cache has ${Object.keys(cache).length} items.`);
    }

    let endRow = range.e.r;

    if (rangeArg) {
        const parts = rangeArg.split('-').map(p => parseInt(p.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            startRow = Math.max(1, parts[0] - 1);
            endRow = Math.min(range.e.r, parts[1] - 1);
            console.log(`Processing specified row range: ${startRow + 1} to ${endRow + 1}`);
        }
    }

    let rowsToProcess = [];
    let pendingNames = new Set();

    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
        const cellRefA = XLSX.utils.encode_cell({ r: rowNum, c: 0 });
        const cellRefG = XLSX.utils.encode_cell({ r: rowNum, c: 6 });

        const nameVal = worksheet[cellRefA] ? String(worksheet[cellRefA].v).trim() : '';
        const meaningVal = worksheet[cellRefG] ? String(worksheet[cellRefG].v).trim() : '';
        const expectedPrefix = `${nameVal} என்ற பெயர்`;

        if (nameVal && nameVal !== '-') {
            const needsUpdate = forceOverwrite || 
                                !meaningVal || 
                                meaningVal === '-' || 
                                meaningVal.startsWith('இந்த எண்') || 
                                !meaningVal.startsWith(expectedPrefix);
            if (needsUpdate) {
                rowsToProcess.push({
                    rowIndex: rowNum,
                    name: nameVal
                });
                if (!cache[nameVal] || cache[nameVal].startsWith('இந்த எண்') || !cache[nameVal].startsWith(expectedPrefix)) {
                    pendingNames.add(nameVal);
                }
            }
        }
    }

    if (limitArg && limitArg > 0) {
        rowsToProcess = rowsToProcess.slice(0, limitArg);
        pendingNames.clear();
        for (const row of rowsToProcess) {
            const expectedPrefix = `${row.name} என்ற பெயர்`;
            if (!cache[row.name] || cache[row.name].startsWith('இந்த எண்') || !cache[row.name].startsWith(expectedPrefix)) {
                pendingNames.add(row.name);
            }
        }
        console.log(`Applied limit: processing first ${rowsToProcess.length} rows (${pendingNames.size} unique uncached names).`);
    }

    console.log(`Total rows selected for update: ${rowsToProcess.length}`);
    console.log(`Unique pending names to generate: ${pendingNames.size}`);

    if (countOnly) {
        console.log(`Count of empty rows to be processed: ${rowsToProcess.length}`);
        process.exit(0);
    }

    let processedCount = 0;
    const nameList = Array.from(pendingNames);
    const total = nameList.length;
    const BATCH_SIZE = 20;

    let isWritingFile = false;
    async function safeSaveWorkbook() {
        if (isWritingFile) return;
        isWritingFile = true;
        try {
            fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
            let syncCount = 0;
            if (range.e.c < 6) {
                range.e.c = 6;
            }
            worksheet['!ref'] = XLSX.utils.encode_range(range);

            const cellG1 = XLSX.utils.encode_cell({ r: 0, c: 6 });
            if (!worksheet[cellG1]) {
                worksheet[cellG1] = { t: 's', v: 'பெயரின் பொருள்' };
            }

            for (const row of rowsToProcess) {
                const m = cache[row.name];
                if (m) {
                    const cellRef = XLSX.utils.encode_cell({ r: row.rowIndex, c: 6 });
                    worksheet[cellRef] = { t: 's', v: m };
                    syncCount++;
                }
            }
            XLSX.writeFile(workbook, FILE_PATH);
            console.log(`  [SafeSave] Saved workbook & cache with ${syncCount} filled rows.`);
        } catch (err) {
            console.warn(`  [SafeSave Warning] ${err.message}`);
        } finally {
            isWritingFile = false;
        }
    }

    if (total > 0) {
        console.log(`Starting Gemini Parallel Batch Query Loop (Concurrency: ${concurrency}, Batch Size: ${BATCH_SIZE}) across ${apiKeys.length} API keys...`);
        
        async function runWorker(workerId) {
            // Assign a starting key offset for each worker to balance key usage
            let currentKeyIndex = workerId - 1;

            while (nameList.length > 0) {
                const chunk = nameList.splice(0, BATCH_SIZE);
                if (chunk.length === 0) break;

                let success = false;
                let consecutive429s = 0;

                while (!success) {
                    const currentApiKey = apiKeys[currentKeyIndex % apiKeys.length];
                    try {
                        const batchResults = await generateMeaningsBatchWithGemini(chunk, currentApiKey);
                        for (const name of chunk) {
                            if (batchResults && batchResults[name]) {
                                cache[name] = batchResults[name];
                            }
                        }

                        // Fallback for any names missed by batch output
                        const missingNames = chunk.filter(n => !cache[n] || cache[n].startsWith('இந்த எண்'));
                        if (missingNames.length > 0) {
                            console.warn(`  [Worker ${workerId}] ${missingNames.length} names missed in batch. Retrying individually...`);
                            for (const mName of missingNames) {
                                try {
                                    const singleM = await generateMeaningWithGemini(mName, currentApiKey);
                                    cache[mName] = singleM;
                                } catch (e) {}
                            }
                        }

                        success = true;
                        consecutive429s = 0;
                        await delay(3000);
                    } catch (err) {
                        const isRateLimit = err.code === 429 || 
                                            (err.message && err.message.includes('429')) || 
                                            (err.message && err.message.includes('RESOURCE_EXHAUSTED')) ||
                                            (err.message && err.message.includes('Quota exceeded'));
                        
                        if (isRateLimit) {
                            consecutive429s++;
                            currentKeyIndex++;
                            const nextKey = apiKeys[currentKeyIndex % apiKeys.length];
                            console.warn(`  [Worker ${workerId}] Rate Limit (429) Hit on key index ${(currentKeyIndex - 1) % apiKeys.length}. Switching to key index ${currentKeyIndex % apiKeys.length} (${nextKey.substring(0, 15)}...)...`);
                            
                            if (consecutive429s >= apiKeys.length * 3) {
                                console.warn(`\n[Worker ${workerId}] All ${apiKeys.length} API keys hit limit. Retrying key pool in 60 seconds...`);
                                consecutive429s = 0;
                                await delay(60 * 1000);
                            } else {
                                await delay(2000);
                            }
                        } else {
                            console.error(`  [Worker ${workerId}] Batch Error: ${err.message || err}. Retrying in 10s...`);
                            await delay(10000);
                        }
                    }
                }

                processedCount += chunk.length;
                console.log(`[Progress: ${processedCount}/${total}] Worker ${workerId} completed batch of ${chunk.length} names.`);
                await safeSaveWorkbook();
            }
        }

        const workers = [];
        for (let i = 0; i < concurrency; i++) {
            workers.push(runWorker(i + 1));
        }
        await Promise.all(workers);
        console.log('All parallel workers finished.');
    } else {
        console.log('All names already have valid formatted meanings in cache.');
    }

    console.log('Finalizing sheet updates...');
    await safeSaveWorkbook();
    console.log(`Done! Spreadsheet updated.`);
}

main().catch(console.error);
