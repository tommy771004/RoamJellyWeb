const fs = require('fs');
const https = require('https');
const path = require('path');

const repoUrl = 'https://raw.githubusercontent.com/tommy771004/RoamJellyWeb/main/';

function downloadFile(file) {
  const fileUrl = repoUrl + file;
  const targetPath = path.resolve(process.cwd(), file);
  return new Promise((resolve, reject) => {
    https.get(fileUrl, (res) => {
      const fileStream = fs.createWriteStream(targetPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => resolve());
    }).on('error', reject);
  });
}

downloadFile('skills-lock.json').then(() => console.log('Downloaded skills-lock.json'));
