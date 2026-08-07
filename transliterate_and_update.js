const fs = require('fs');
const https = require('https');
const XLSX = require('xlsx');

const FILE_PATH = './நம்ம சாமி நம்ம கோவில் - data until 18-07-2026.xlsx';
const NAME_MAP_PATH = './english_to_tamil_names.json';

const apiKeys = process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : [];

function transliterateBatchWithGemini(names, apiKey) {
    return new Promise((resolve, reject) => {
        const prompt = `Convert the following English/transliterated Tamil names into standard Tamil script names: ${JSON.stringify(names)}. Return ONLY a valid JSON object mapping each English name to its Tamil script equivalent string, e.g. {"Kavalan": "காவலன்", "Manikandan": "மணிகண்டன்"}. Do not include preamble, markdown, or extra text.`;
        
        const payload = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json'
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
                        const text = responseJson.candidates[0].content.parts[0].text.trim();
                        let parsed = {};
                        try {
                            parsed = JSON.parse(text);
                        } catch (e) {
                            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
                            parsed = JSON.parse(cleaned);
                        }
                        resolve(parsed);
                    } else {
                        reject(new Error('Unexpected response format'));
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}`));
                }
            });
        });

        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
        req.on('error', err => reject(err));
        req.write(payload);
        req.end();
    });
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
    console.log('Loading existing name map...');
    let nameMap = {};
    if (fs.existsSync(NAME_MAP_PATH)) {
        try {
            nameMap = JSON.parse(fs.readFileSync(NAME_MAP_PATH, 'utf8'));
            console.log(`Loaded ${Object.keys(nameMap).length} transliterated names from cache.`);
        } catch (e) {}
    }

    console.log('Loading main Excel workbook...');
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    let pendingEnglishNames = new Set();
    for (let r = 1; r <= range.e.r; r++) {
        const cellRefA = XLSX.utils.encode_cell({ r, c: 0 });
        const nameVal = worksheet[cellRefA] ? String(worksheet[cellRefA].v).trim() : '';
        if (/[a-zA-Z]/.test(nameVal)) {
            if (!nameMap[nameVal]) {
                pendingEnglishNames.add(nameVal);
            }
        }
    }

    const nameList = Array.from(pendingEnglishNames);
    const totalToTransliterate = nameList.length;
    console.log(`Unique English names remaining to transliterate: ${totalToTransliterate}`);

    if (totalToTransliterate > 0) {
        const BATCH_SIZE = 150;
        const concurrency = 3;
        let currentKeyIndex = 0;
        let processedCount = 0;

        console.log(`Starting parallel transliteration loop (${concurrency} workers, batch size ${BATCH_SIZE})...`);

        async function runWorker(workerId) {
            let keyIdx = workerId - 1;
            while (nameList.length > 0) {
                const chunk = nameList.splice(0, BATCH_SIZE);
                if (chunk.length === 0) break;

                let success = false;
                let attempts = 0;

                while (!success && attempts < 10) {
                    attempts++;
                    const currentApiKey = apiKeys[keyIdx % apiKeys.length];
                    try {
                        const batchMap = await transliterateBatchWithGemini(chunk, currentApiKey);
                        for (const engName of chunk) {
                            if (batchMap && batchMap[engName]) {
                                nameMap[engName] = String(batchMap[engName]).trim();
                            }
                        }
                        success = true;
                        await delay(1500);
                    } catch (err) {
                        keyIdx++;
                        await delay(2000);
                    }
                }

                processedCount += chunk.length;
                console.log(`[Progress: ${processedCount}/${totalToTransliterate}] Transliterated batch of ${chunk.length} names (Worker ${workerId})`);
                fs.writeFileSync(NAME_MAP_PATH, JSON.stringify(nameMap, null, 2));
            }
        }

        const workers = [];
        for (let i = 0; i < concurrency; i++) {
            workers.push(runWorker(i + 1));
        }
        await Promise.all(workers);
        console.log('All name transliterations finished!');
    }

    console.log('\n--- Updating Column G in Workbook with Tamil Script Names ---');
    let updatedRows = 0;
    for (let r = 1; r <= range.e.r; r++) {
        const cellRefA = XLSX.utils.encode_cell({ r, c: 0 });
        const cellRefG = XLSX.utils.encode_cell({ r, c: 6 });

        const engName = worksheet[cellRefA] ? String(worksheet[cellRefA].v).trim() : '';
        const currentG = worksheet[cellRefG] ? String(worksheet[cellRefG].v).trim() : '';

        if (engName && /[a-zA-Z]/.test(engName) && nameMap[engName]) {
            const tamilName = nameMap[engName];
            const oldPrefix = `${engName} என்ற பெயர்`;
            const newPrefix = `${tamilName} என்ற பெயர்`;

            if (currentG.startsWith(oldPrefix)) {
                const updatedG = newPrefix + currentG.substring(oldPrefix.length);
                worksheet[cellRefG] = { t: 's', v: updatedG };
                updatedRows++;
            }
        }
    }

    console.log(`Updated Column G prefix for ${updatedRows} rows in main workbook.`);
    XLSX.writeFile(workbook, FILE_PATH);
    console.log('Main workbook saved successfully!');

    console.log('\n--- Updating 6 Split Part Files ---');
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const header = data[0];
    const rows = data.slice(1);
    const CHUNK_SIZE = 5000;
    const totalChunks = Math.ceil(rows.length / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
        const chunkRows = rows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const newSheetData = [header, ...chunkRows];
        const newWorksheet = XLSX.utils.aoa_to_sheet(newSheetData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);
        
        const partNum = i + 1;
        const fileName = `./நம்ம சாமி நம்ம கோவில் - part${partNum}.xlsx`;
        XLSX.writeFile(newWorkbook, fileName);
        console.log(`Updated ${fileName} (${chunkRows.length} data rows)`);
    }

    console.log('\n🎉 ALL WORKBOOKS SUCCESSFULLY UPDATED WITH TAMIL NAMES IN COLUMN G!');
}

main().catch(console.error);
