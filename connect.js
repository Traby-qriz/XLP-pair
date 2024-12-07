const { File } = require('megajs');
const fs = require('fs');

var prefix = "XLICON-V4~"; //your prefix same as in config.PREFIX
var output = "./session/"; //path where the creds.json will save

async function saveCreds(id) {
  if (!id.startsWith(prefix)) {
    throw new Error(`Prefix doesn't match check if "${prefix}" is correct`);
  }

  var url = `https://mega.nz/file/${id.replace(prefix, "")}`;
  var file = File.fromURL(url);
  await file.loadAttributes();
  var pth = output + "creds.json";
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output, { recursive: true });
  }
  
  var data = await file.downloadBuffer();
  fs.writeFileSync(pth, data);
}

// https://mega.js.org/docs/1.0/tutorial/downloading
