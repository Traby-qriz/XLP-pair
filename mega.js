const mega = require('megajs');
const crypto = require('crypto');
const path = require('path');
const config = require('./config.js');

function generateUA() {
    var browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
    var versions = ['91.0', '90.0', '89.0', '88.0'];
    var os = ['Windows NT 10.0', 'Macintosh; Intel Mac OS X 10_15_7', 'Linux; Ubuntu 20.04'];
    var browser = browsers[Math.floor(Math.random() * browsers.length)];
    var version = versions[Math.floor(Math.random() * versions.length)];
    var platform = os[Math.floor(Math.random() * os.length)];
    return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) ${browser}/${version} Safari/537.36`;
}

var auth = {
    email: config.EMAIL,
    password: config.PASS,
    userAgent: generateUA()
};

var upload = (pth) => {
    return new Promise((resolve, reject) => {
        var myre = `${crypto.randomBytes(5).toString('hex')}${path.extname(pth)}`;
        var storage = new mega.Storage(auth, () => {
            try {
                var Json = require(pth);
                var Content = Buffer.from(JSON.stringify(Json));
                var stream = storage.upload({ name: myre, size: Content.length, allowUploadBuffering: true });
                stream.end(Content);
                stream.on('complete', (file) => file.link((err, url) => err ? reject(err) : resolve(url)));
                stream.on('error', (error) => reject(error));
            } catch (error) {
                reject(error);
            }
        });

        storage.on('error', (error) => {
            reject(new Error('Storage error: ' + error.message));
        });
        
        storage.on('ready', () => {
            console.log('Storage is ready');
        });
    });
};

module.exports = { upload };

/*
 * Inspired from 
 * https://github.com/Guru322/Express-pairing-code/blob/main/mega.js
 *
 * IN CASE IF YOUR LOOKING FOR MEDIA UPLOAD THEN HERE
 * (and dont wanna go through the docs of megajs then)
 *
 * var size = statSync(filePath).size;
 * var stream = storage.upload({ name: myre, size: size, allowUploadBuffering: true });
 * createReadStream(filePath).pipe(stream);
 * stream.on('complete', (file) => file.link((err, url) => err ? reject(err) : resolve(url)));
 */
