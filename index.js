const { spawn } = require('child_process');
const path = require('path');

function start() {
    try {
        let args = [path.join(__dirname, 'start.js'), ...process.argv.slice(2)];
        console.log([process.argv[0], ...args].join('\n'));
        
        let p = spawn(process.argv[0], args, {
            stdio: ['inherit', 'inherit', 'inherit', 'ipc']
        })
        .on('message', data => {
            if (data == 'reset') {
                console.log('Restarting Bot...');
                p.kill();
                start();
            }
        })
        .on('exit', code => {
            console.error('Exited with code:', code);
            if (code === 0 || code === 1) start();
        });
    } catch (error) {
        console.error('Error starting the process:', error);
    }
}

start();
