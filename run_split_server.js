const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.mpeg': 'audio/mpeg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/split') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const splits = data.splits;
                console.log(`Received split request for ${splits.length} verses.`);
                
                const inputFile = path.join(__dirname, 'slokas', 'Sholka 54 to 72 adyay 2.mp4');
                const ffmpegPath = path.join(__dirname, 'ffmpeg');
                
                if (!fs.existsSync(inputFile)) {
                    throw new Error(`Input file not found at: ${inputFile}`);
                }
                
                const log = [];
                
                splits.forEach(item => {
                    const outputFile = path.join(__dirname, 'slokas', `Shloka ${item.verse} adhyay 2.mp4`);
                    const startStr = Number(item.start).toFixed(2);
                    const endStr = Number(item.end).toFixed(2);
                    const duration = (Number(item.end) - Number(item.start)).toFixed(2);
                    
                    if (Number(duration) <= 0) {
                        console.log(`Skipping verse ${item.verse} due to invalid duration: ${duration}s`);
                        return;
                    }
                    
                    console.log(`Splitting Verse ${item.verse}: ${startStr}s -> ${endStr}s (${duration}s)`);
                    
                    // Run ffmpeg with stream copy for instant, lossless split
                    const cmd = `"${ffmpegPath}" -y -ss ${startStr} -to ${endStr} -i "${inputFile}" -c copy "${outputFile}"`;
                    try {
                        execSync(cmd);
                        log.push(`Verse ${item.verse}: split successfully (${duration}s).`);
                    } catch (cmdErr) {
                        console.error(`Error splitting verse ${item.verse}:`, cmdErr);
                        throw new Error(`Failed to split verse ${item.verse}`);
                    }
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Splitting completed successfully!', log }));
            } catch (err) {
                console.error("API Error:", err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Serve static files
    let filePath = path.join(__dirname, req.url === '/' ? 'split-helper.html' : decodeURIComponent(req.url));
    
    // Safety check: ensure file path is inside directory
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404);
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        // Support Range requests for seeking in media players
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
            });
            file.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': stats.size,
                'Content-Type': contentType,
            });
            fs.createReadStream(filePath).pipe(res);
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`Gita Audio Splitter Local Server running at:`);
    console.log(`👉 http://localhost:${PORT}/split-helper.html`);
    console.log(`======================================================\n`);
});
