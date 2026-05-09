const { exec } = require('child_process');
const fs = require('fs');

async function startHost() {
    console.log("Building Docker image...");
    exec('docker build -t mip-sudoku .', async (err, stdout, stderr) => {
        if (err) {
            console.error(`Error building image: ${stderr}`);
            return;
        }
        console.log("Docker image built. Starting container...");
        
        exec('docker rm -f mip-sudoku-container', () => {
            const containerProcess = exec('docker run --name mip-sudoku-container -p 6080:6080 mip-sudoku');
            
            containerProcess.stdout.on('data', (data) => console.log(data.toString()));
            containerProcess.stderr.on('data', (data) => console.error(data.toString()));

            console.log("Container started. Setting up tunnel...");
            
            setTimeout(() => {
                const sshProcess = exec('ssh -R 80:localhost:6080 serveo.net -o StrictHostKeyChecking=no');
                sshProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.serveousercontent\.com/);
                    if (match) {
                        const tunnelUrl = match[0];
                        console.log("\n=======================================================");
                        console.log(`YOUR GAME IS LIVE AT: ${tunnelUrl}/vnc.html`);
                        console.log("=======================================================\n");
                        console.log("Provide this URL to your friends, or they can use the client script.");
                        fs.writeFileSync('game-url.txt', tunnelUrl + '/vnc.html');
                    }
                });
                sshProcess.stderr.on('data', (data) => {
                    // Serveo often prints connection info to stderr
                    const output = data.toString();
                    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.serveousercontent\.com/);
                    if (match) {
                        const tunnelUrl = match[0];
                        console.log("\n=======================================================");
                        console.log(`YOUR GAME IS LIVE AT: ${tunnelUrl}/vnc.html`);
                        console.log("=======================================================\n");
                        console.log("Provide this URL to your friends, or they can use the client script.");
                        fs.writeFileSync('game-url.txt', tunnelUrl + '/vnc.html');
                    } else if (!output.includes("Warning")) {
                        console.log("Tunnel:", output.trim());
                    }
                });
            }, 5000); 
        });
    });
}

startHost();
