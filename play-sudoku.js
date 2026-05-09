const readline = require('readline');
const { exec } = require('child_process');
const os = require('os');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("==================================================");
console.log("       MIP 3x3 SUDOKU - REMOTE CLIENT             ");
console.log("==================================================");

rl.question('Please enter the Game URL provided by the host: ', (url) => {
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http')) {
        finalUrl = 'https://' + finalUrl;
    }
    
    console.log(`Opening connection to ${finalUrl}...`);
    
    let command;
    if (os.platform() === 'win32') {
        command = `start "" "${finalUrl}"`;
    } else if (os.platform() === 'darwin') {
        command = `open "${finalUrl}"`;
    } else {
        command = `xdg-open "${finalUrl}"`;
    }

    exec(command, (err) => {
        if (err) {
            console.error("Failed to open browser automatically. Please manually go to:", finalUrl);
        } else {
            console.log("Game launched in your browser!");
        }
        rl.close();
    });
});
