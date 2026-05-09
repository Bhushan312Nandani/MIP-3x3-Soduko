const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// --- PUBLIC SERVER (Tunneled) ---
const publicApp = express();
const publicServer = http.createServer(publicApp);
const publicIo = new Server(publicServer, { cors: { origin: '*' } });

// --- ADMIN SERVER (Localhost only) ---
const adminApp = express();
const adminServer = http.createServer(adminApp);
const adminIo = new Server(adminServer, { cors: { origin: '*' } });

// State
let globalSudokuProcess = null;
let globalOutputHistory = "";
const users = new Map(); // socket.id -> { id, ip, name, status, canPlay }

// Persistent Database & Logging
const DB_FILE = path.join(__dirname, 'approved_users.json');
const LOG_FILE = path.join(__dirname, 'visitors.txt');

let approvedDb = {};
if (fs.existsSync(DB_FILE)) {
    try { approvedDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) {}
}

function saveDb() {
    fs.writeFileSync(DB_FILE, JSON.stringify(approvedDb, null, 2));
}

function appendLog(msg) {
    const time = new Date().toLocaleString();
    fs.appendFileSync(LOG_FILE, `[${time}] ${msg}\n`);
}

publicApp.use(express.static('public'));
publicApp.get('/sudoku.asm', (req, res) => {
    res.sendFile(path.join(__dirname, 'sudoku.asm'));
});

adminApp.use(express.static('admin_public'));

function broadcastAdminUpdate() {
    adminIo.emit('update_users', Array.from(users.values()));
}

// --- ADMIN SOCKET LOGIC ---
adminIo.on('connection', (socket) => {
    socket.emit('update_users', Array.from(users.values()));

    socket.on('approve_user', (data) => {
        const u = users.get(data.id);
        if (u) {
            u.status = 'approved';
            u.canPlay = data.canPlay;
            
            // Persistent Cache
            approvedDb[u.ip] = { name: u.name, canPlay: u.canPlay };
            saveDb();
            appendLog(`APPROVED: ${u.name} (${u.ip}) as ${u.canPlay ? 'Player' : 'Spectator'}`);

            publicIo.to(u.id).emit('access_granted', { canPlay: u.canPlay });
            broadcastAdminUpdate();
        }
    });

    socket.on('kick_user', (id) => {
        const u = users.get(id);
        if (u) {
            delete approvedDb[u.ip];
            saveDb();
            appendLog(`KICKED/DENIED: ${u.name} (${u.ip})`);

            publicIo.to(id).emit('kicked');
            const targetSocket = publicIo.sockets.sockets.get(id);
            if (targetSocket) targetSocket.disconnect();
            users.delete(id);
            broadcastAdminUpdate();
        }
    });
});

// --- PUBLIC SOCKET LOGIC ---
publicIo.on('connection', (socket) => {
    // Get IP address (handling proxies from Serveo)
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;
    
    users.set(socket.id, {
        id: socket.id,
        ip: ip,
        name: 'Unknown',
        status: 'pending',
        canPlay: false
    });

    let personalMarsProcess = null;

    socket.on('request_access', (name) => {
        const u = users.get(socket.id);
        if (u) {
            u.name = name;
            appendLog(`VISIT: ${name} connected from IP: ${u.ip}`);

            // Check if IP is already approved in cache
            if (approvedDb[u.ip]) {
                u.status = 'approved';
                u.canPlay = approvedDb[u.ip].canPlay;
                socket.emit('access_granted', { canPlay: u.canPlay });
                appendLog(`AUTO-RESTORED: ${name} (${u.ip}) as ${u.canPlay ? 'Player' : 'Spectator'}`);
            }

            broadcastAdminUpdate();
        }
    });

    // Send current global state to newly connected client immediately
    if (globalOutputHistory.length > 0) {
        socket.emit('shared_clear');
        socket.emit('shared_output', globalOutputHistory);
    }

    // --- PERSONAL SESSION EVENTS ---
    socket.on('run_personal_code', (code) => {
        const u = users.get(socket.id);
        if (!u || u.status !== 'approved') return;

        if (personalMarsProcess) personalMarsProcess.kill();
        const fileName = `temp_${socket.id}.asm`;
        fs.writeFileSync(path.join(__dirname, fileName), code);
        
        socket.emit('personal_clear');
        socket.emit('personal_output', '--- Running your custom MIPS code... ---\n');

        personalMarsProcess = spawn('java', ['-jar', 'Mars.jar', 'nc', fileName], { cwd: __dirname });
        personalMarsProcess.stdout.on('data', d => socket.emit('personal_output', d.toString()));
        personalMarsProcess.stderr.on('data', d => socket.emit('personal_output', d.toString()));
        personalMarsProcess.on('close', code => socket.emit('personal_output', `\n--- Exited (${code}) ---\n`));
    });

    socket.on('personal_input', (data) => {
        if (personalMarsProcess && !personalMarsProcess.killed) {
            socket.emit('personal_output', data + '\n');
            personalMarsProcess.stdin.write(data + '\n');
        }
    });

    // --- SHARED SESSION EVENTS (Sudoku Game) ---
    socket.on('start_sudoku', () => {
        const u = users.get(socket.id);
        if (!u || !u.canPlay) return;

        if (globalSudokuProcess) globalSudokuProcess.kill();
        globalOutputHistory = '--- Global Sudoku Game Started! ---\n';
        publicIo.emit('shared_clear');
        publicIo.emit('shared_output', globalOutputHistory);

        globalSudokuProcess = spawn('java', ['-jar', 'Mars.jar', 'nc', 'sudoku.asm'], { cwd: __dirname });
        globalSudokuProcess.stdout.on('data', d => {
            const str = d.toString();
            globalOutputHistory += str;
            publicIo.emit('shared_output', str);
        });
        globalSudokuProcess.stderr.on('data', d => {
            const str = d.toString();
            globalOutputHistory += str;
            publicIo.emit('shared_output', str);
        });
        globalSudokuProcess.on('close', code => {
            const str = `\n--- Global Game Exited (${code}) ---\n`;
            globalOutputHistory += str;
            publicIo.emit('shared_output', str);
        });
    });

    socket.on('shared_input', (data) => {
        const u = users.get(socket.id);
        if (!u || !u.canPlay) return; // Only players can send input

        if (globalSudokuProcess && !globalSudokuProcess.killed) {
            const str = data + '\n';
            globalOutputHistory += str;
            publicIo.emit('shared_output', str);
            globalSudokuProcess.stdin.write(str);
        }
    });

    socket.on('disconnect', () => {
        users.delete(socket.id);
        broadcastAdminUpdate();
        if (personalMarsProcess) personalMarsProcess.kill();
        try { fs.unlinkSync(path.join(__dirname, `temp_${socket.id}.asm`)); } catch(e) {}
    });
});

const PUBLIC_PORT = 6081;
const ADMIN_PORT = 6082;

adminServer.listen(ADMIN_PORT, 'localhost', () => {
    console.log(`\n=============================================================`);
    console.log(`🔐 LOCAL ADMIN DASHBOARD RUNNING AT: http://localhost:${ADMIN_PORT}`);
    console.log(`   (Keep this link private, use it to manage permissions)`);
    console.log(`=============================================================\n`);
});

publicServer.listen(PUBLIC_PORT, async () => {
    console.log("Starting Serveo SSH Tunnel for Public Users...");
    const { exec } = require('child_process');
    const sshProcess = exec(`ssh -R 80:localhost:${PUBLIC_PORT} serveo.net -o StrictHostKeyChecking=no`);
    sshProcess.stdout.on('data', (data) => {
        const match = data.toString().match(/https:\/\/[a-zA-Z0-9-]+\.serveousercontent\.com/);
        if (match) {
            console.log(`\n>>> PUBLIC GAME LINK (Share this!): ${match[0]}\n`);
        }
    });
});
