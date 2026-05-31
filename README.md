# MIP-3x3-Sudoku: Multiplayer Assembly Game with Live Web IDE

A **multiplayer 3x3 Sudoku game** written entirely in **MIPS Assembly**, served live in the browser through a custom Node.js Web IDE.

## ✨ Key Features

- Real-time multiplayer gameplay
- MARS simulator runs in no-console mode as child process
- Node.js bridges stdin/stdout over WebSockets (Socket.IO)
- Real-time admin approval system by IP
- Two-tier architecture (public Express server + localhost admin)
- Docker alternative with full GUI via noVNC

## Technical Breakdown

**Game Logic (MIPS Assembly)**:
- Random puzzle generation (time + random syscalls)
- Row/column validation & win condition
- Fixed-cell protection

**Server Architecture**:
- Public-facing Express server (Serveo SSH tunnel)
- Isolated MARS process per user session
- Admin dashboard with live IP approval
- Automatic cleanup on disconnect

## Stack
- **Core**: MIPS Assembly, MARS Simulator, Node.js, Express, Socket.IO
- **Deployment**: Serveo, Docker, Xvfb + noVNC
- **Java**: JRE 17 for MARS

## How to Run
```bash
git clone https://github.com/Bhushan312Nandani/MIP-3x3-Soduko.git
cd MIP-3x3-Soduko
npm install
node web-ide.js