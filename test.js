const { spawn } = require('child_process');
const mars = spawn('java', ['-jar', 'Mars.jar', 'nc', 'sudoku.asm']);

mars.stdout.on('data', d => console.log(d.toString()));
mars.stderr.on('data', d => console.error(d.toString()));

setTimeout(() => {
    mars.stdin.write('1\n');
}, 1000);
