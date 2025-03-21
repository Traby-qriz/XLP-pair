const express = require('express');
const fs = require('fs');
const pino = require('pino');
const NodeCache = require('node-cache');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const { upload } = require('./mega');
const { Mutex } = require('async-mutex');
const config = require('./config');
const path = require('path');

var app = express();
const port = process.env.PORT || 8000;
var session;
const msgRetryCounterCache = new NodeCache();
const mutex = new Mutex();
app.use(express.static(path.join(__dirname, 'static')));

const sessionDir = './session';
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir);
    }
async function connector(Num, res) {
    var { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    session = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
        },
        printQRInTerminal: false,
        logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
        browser: Browsers.macOS("Safari"), //check docs for more custom options
        markOnlineOnConnect: true, //true or false yoour choice
        msgRetryCounterCache
    });

    if (!session.authState.creds.registered) {
        await delay(1500);
        Num = Num.replace(/[^0-9]/g, '');
        var code = await session.requestPairingCode(Num);
        if (!res.headersSent) {
            res.send({ code: code?.match(/.{1,4}/g)?.join('-') });
        }
    }

    session.ev.on('creds.update', async () => {
        await saveCreds();
    });

    session.ev.on('connection.update', async (update) => {
        var { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('Connected successfully');
            await delay(5000);
            var myr = await session.sendMessage(session.user.id, { text: `${config.MESSAGE}` });
            var pth = './session/creds.json';
            try {
                var url = await upload(pth);
                var sID;
                if (url.includes("https://mega.nz/file/")) {
                    sID = config.PREFIX + url.split("https://mega.nz/file/")[1];
                } else {
                    sID = 'Fekd up';
                }
              //edit this you can add ur own image in config or not ur choice
              await session.sendMessage(session.user.id, { image: { url: `${config.IMAGE}` }, caption: `${sID}` }, { quoted: myr });
            await delay(100);
        fs.rm(path, { recursive: true, force: true });

            } catch (error) {
                console.error('Error:', error);
            } finally {
        await delay(100);
       if (fs.existsSync(path.join(__dirname, './session'))) {
        fs.rmdirSync(sessionDir, { recursive: true });
                }
            }
        } else if (connection === 'close') {
            var reason = lastDisconnect?.error?.output?.statusCode;
            reconn(reason);
        }
    });
}

function reconn(reason) {
    if ([DisconnectReason.connectionLost, DisconnectReason.connectionClosed, DisconnectReason.restartRequired].includes(reason)) {
        console.log('Connection lost, reconnecting...');
        connector();
    } else {
        console.log(`Disconnected! reason: ${reason}`);
        session.end();
    }
}

app.get('/pair', async (req, res) => {
    const Num = req.query.code;
    
    // Add input validation
    if (!Num || !/^\+?[\d\s-]+$/.test(Num)) {
        return res.status(400).json({ 
            message: 'Invalid phone number format. Please provide a valid phone number.' 
        });
    }
    
    const release = await mutex.acquire();
    try {
        await connector(Num, res);
    } catch (error) {
        console.error('Pairing error:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: "An error occurred during the pairing process",
                message: error.message 
            });
        }
    } finally {
        release();
    }
});

app.listen(port, () => {
    console.log(`Running on PORT:${port}`);
});
