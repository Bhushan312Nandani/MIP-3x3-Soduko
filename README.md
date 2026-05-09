# 🧩 MIPS 3×3 Sudoku — Web IDE with Integrated MARS Simulator

> A multiplayer 3×3 Sudoku game written entirely in **MIPS Assembly**, served through a real-time **Node.js Web IDE** that runs and streams the **MARS simulator** live to players in their browser — with a built-in admin dashboard for permission-based access control.

---

## 🗂️ Table of Contents

- [About the Project](#about-the-project)
- [How the Web IDE Integrates with MARS](#how-the-web-ide-integrates-with-mars)
- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [How to Run (Quick Start)](#how-to-run-quick-start)
- [How Others Can Play (Remote Users)](#how-others-can-play-remote-users)
- [Admin Dashboard](#admin-dashboard)
- [Writing Custom MIPS Code](#writing-custom-mips-code)
- [How to Run on Docker (Alternative)](#how-to-run-on-docker-alternative)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)

---

## 📖 About the Project

This project combines **low-level MIPS Assembly programming** with a **modern, browser-based Web IDE** to create a fully interactive, multiplayer Sudoku experience.

The game logic — board generation, input validation, win detection — is written entirely in **MIPS Assembly** (`sudoku.asm`) and runs on the **MARS 4.5 Simulator** (`Mars.jar`). Instead of running MARS on a local desktop, the Node.js server spawns MARS as a child process and **pipes its stdin/stdout over WebSockets** to every connected browser in real time.

This means players anywhere in the world can interact with a live MIPS program running on the host machine — directly from their browser, no installation needed.

---

## 🔗 How the Web IDE Integrates with MARS

This is the core innovation of the project. Here is a step-by-step explanation of how the browser talks to the MIPS simulator:

```
Browser (Player)
     │
     │  WebSocket (Socket.IO)
     ▼
Node.js Server (web-ide.js)
     │
     │  child_process.spawn('java', ['-jar', 'Mars.jar', 'nc', 'sudoku.asm'])
     ▼
MARS Simulator (JVM process)
     │
     │  stdout / stderr  ──►  piped to WebSocket  ──►  Browser terminal
     │
     │  stdin            ◄──  piped from WebSocket ◄──  Browser input
     ▼
MIPS Assembly Program (sudoku.asm)
```

### Step-by-Step Flow

1. **Host starts the server** — `node web-ide.js` (or `start.bat` on Windows) launches a Node.js Express + Socket.IO server.
2. **A player connects** — their browser loads the web UI from `public/index.html`. They request access by entering their name.
3. **Admin approves** — the host's local Admin Dashboard (`localhost:6082`) shows all pending connections. The host can approve them as a **Player** (can interact) or **Spectator** (read-only).
4. **Game starts** — an approved player clicks "Start Sudoku Game". The server calls:
   ```js
   spawn('java', ['-jar', 'Mars.jar', 'nc', 'sudoku.asm'])
   ```
   The `nc` flag runs MARS in **No-GUI console mode**, making it fully pipe-able.
5. **Output streaming** — Every byte that MARS prints to `stdout`/`stderr` (the board, prompts, error messages) is immediately forwarded to **all connected browsers** via `publicIo.emit('shared_output', data)`.
6. **Input piping** — When a player types a move (row, col, value) in the browser terminal and submits it, the server writes it directly to MARS's `stdin`:
   ```js
   globalSudokuProcess.stdin.write(data + '\n');
   ```
7. **Shared session** — All spectators watch the game live. Only approved Players can send input, but everyone sees the same shared board state.
8. **Personal MIPS IDE** — Each player also has their own private MIPS code editor. They can write, edit, and run any MIPS Assembly code and get their own private output — completely isolated from the shared game.

### Why MARS `nc` (No-Console) Mode?

MARS's `-nc` flag suppresses the GUI and makes it behave like a standard Unix program — reading from stdin and writing to stdout. This is what makes it scriptable from Node.js without any virtual display (Xvfb) or VNC tricks.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                     Host Machine                     │
│                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │   Public Server      │  │   Admin Server       │   │
│  │   Port: 6081         │  │   Port: 6082         │   │
│  │   (tunneled via      │  │   (localhost ONLY)   │   │
│  │    Serveo SSH)       │  │                      │   │
│  └────────┬────────────┘  └────────┬────────────┘   │
│           │                        │                  │
│           │                        │                  │
│  ┌────────▼────────────────────────▼────────────┐   │
│  │           Node.js Core (web-ide.js)           │   │
│  │  - Socket.IO for real-time communication      │   │
│  │  - Spawns MARS JVM as a child process         │   │
│  │  - Manages user sessions & permissions        │   │
│  │  - Persists approved IPs to JSON DB           │   │
│  └────────────────────┬─────────────────────────┘   │
│                        │                              │
│            spawn()     │    stdin/stdout pipes        │
│                  ┌─────▼──────┐                      │
│                  │  Mars.jar  │  (MIPS Simulator)    │
│                  │  sudoku.asm│  (Your Assembly)     │
│                  └────────────┘                      │
└──────────────────────────────────────────────────────┘
         │                              │
         │  Serveo SSH Tunnel           │  localhost
         ▼                              ▼
  Remote Players                   Host Admin
  (any browser)                  (localhost:6082)
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎮 **Shared Multiplayer Sudoku** | All approved players see the same live MIPS board and can take turns |
| 👁️ **Spectator Mode** | Watch the game without being able to interact |
| 🔐 **Admin Approval System** | The host must manually approve every incoming connection by IP address |
| 🧠 **Personal MIPS IDE** | Each user gets a private code editor to write and run their own MIPS Assembly |
| 🌐 **Zero-Install for Players** | Remote players only need a browser — no Java, no MARS, no Node.js |
| 🔄 **Auto-Reconnect** | Previously approved IPs are cached and auto-restored on reconnect |
| 📜 **Session Logging** | All connections, approvals, and kicks are logged to `visitors.txt` |
| 🚇 **SSH Tunnel** | Uses Serveo.net to expose the local server publicly with a shareable URL |

---

## 📁 Project Structure

```
MIP-3x3-Soduko/
│
├── sudoku.asm          # 3x3 Sudoku game in MIPS Assembly (the core game)
├── mips1.asm           # Additional MIPS Assembly example/playground
├── Mars.jar            # MARS 4.5 MIPS Simulator (bundled)
│
├── web-ide.js          # Main Node.js server — two-tier architecture:
│                       #   Public server (port 6081, tunneled)
│                       #   Admin server (port 6082, localhost-only)
│
├── public/
│   └── index.html      # Browser UI for players (Web IDE + game terminal)
│
├── admin_public/
│   └── index.html      # Admin dashboard UI (approve/kick users)
│
├── host-setup.js       # Alternative Docker-based host setup (VNC approach)
├── play-sudoku.js      # Minimal client helper script (legacy approach)
├── test.js             # Quick connectivity test script
│
├── Dockerfile          # Docker image with Java + Xvfb + VNC + noVNC
├── start.bat           # One-click Windows startup script
│
├── package.json        # Node.js dependencies
├── .gitignore          # Excludes node_modules, session data, temp files
│
# Runtime-generated (not in repository):
├── approved_users.json # Persistent IP → name/permission cache
├── visitors.txt        # Session activity log
└── game-url.txt        # Auto-written public URL after tunnel starts
```

---

## ✅ Prerequisites

Make sure the following are installed on the **host machine**:

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | v18+ | Runs the web server |
| **Java (JRE)** | 8+ (17 recommended) | Runs Mars.jar |
| **OpenSSH client** | Any | SSH tunnel to Serveo |
| **npm** | Bundled with Node | Installs dependencies |

> **Remote players need nothing** — just a modern web browser (Chrome, Firefox, Edge).

---

## 🚀 How to Run (Quick Start)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/MIP-3x3-Soduko.git
cd MIP-3x3-Soduko
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Start the server

**On Windows (recommended):**
```
Double-click start.bat
```

**Or from the terminal (any OS):**
```bash
node web-ide.js
```

### 4. What happens next

The terminal will show:

```
🔐 LOCAL ADMIN DASHBOARD RUNNING AT: http://localhost:6082
>>> PUBLIC GAME LINK (Share this!): https://xxxxxx.serveousercontent.com
```

- Open `http://localhost:6082` in your browser to access the **Admin Dashboard**.
- Share the **PUBLIC GAME LINK** with your friends.

---

## 👥 How Others Can Play (Remote Users)

1. The host shares the public link (e.g., `https://xxxxxx.serveousercontent.com`).
2. Players open the link in any browser.
3. They enter their name and click **"Request Access"**.
4. The host sees the connection request in the Admin Dashboard and approves it as either a **Player** or **Spectator**.
5. Once approved:
   - **Players** can start the Sudoku game, make moves, and run their own MIPS code.
   - **Spectators** can watch the game in real time but cannot send input.

---

## 🔐 Admin Dashboard

The Admin Dashboard is accessible **only from the host machine** at `http://localhost:6082`.

From here the host can:
- See all connected users (name, IP, status)
- **Approve as Player** — grants full game interaction + personal IDE access
- **Approve as Spectator** — read-only access to the shared game
- **Kick/Deny** — disconnects the user and removes them from the cache

Approved IPs are saved persistently so returning users are automatically restored.

---

## 🖥️ Writing Custom MIPS Code

Every approved user (Player or Spectator) has access to a **personal MIPS code editor** in the browser. They can:

1. Write or paste any valid MIPS Assembly code.
2. Click **"Run My Code"**.
3. The server saves it as a temporary `.asm` file and runs it with:
   ```
   java -jar Mars.jar nc temp_<socketid>.asm
   ```
4. Output appears in their private terminal, completely isolated from the shared Sudoku game.
5. The temp file is deleted automatically when they disconnect.

---

## 🐳 How to Run on Docker (Alternative)

The `Dockerfile` provides an alternative approach — running MARS inside a container with a virtual display (Xvfb) and VNC. This exposes the full MARS GUI over the browser using noVNC.

```bash
# Build the image
docker build -t mip-sudoku .

# Run the container
docker run -p 6080:6080 mip-sudoku

# Open in browser
http://localhost:6080/vnc.html
```

Then in the MARS GUI:
1. File → Open → `sudoku.asm`
2. Run → Assemble (`F3`)
3. Run → Go (`F5`)
4. Switch to the **Run I/O** tab to play

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Game Logic** | MIPS Assembly (MARS 4.5 Simulator) |
| **Backend** | Node.js + Express |
| **Real-time Comms** | Socket.IO (WebSockets) |
| **Public Tunneling** | Serveo (SSH reverse tunnel) |
| **Frontend** | Vanilla HTML/CSS/JavaScript |
| **Containerization** | Docker + Xvfb + x11vnc + noVNC |
| **Process Bridge** | Node.js `child_process.spawn` → MARS stdin/stdout |

---

## 🤝 Contributing

Pull requests are welcome! If you'd like to improve the Sudoku puzzle generator, add a 4×4 variant, or enhance the web IDE, here's how to get started:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

*Built with ❤️ using MIPS Assembly + Node.js*
