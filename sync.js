const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("Creating temp directory...");
if (!fs.existsSync('temp_repo')) {
    fs.mkdirSync('temp_repo');
} else {
    fs.rmSync('temp_repo', { recursive: true, force: true });
    fs.mkdirSync('temp_repo');
}

console.log("Cloning repo with degit...");
execSync('npx -y degit tommy771004/RoamJellyWeb temp_repo --force', { stdio: 'inherit' });

console.log("Copying files...");
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);
    for (const file of files) {
        if (file === '.git' || file === 'temp_repo') continue;
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            console.log(`Overwriting ${destPath}`);
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

copyDir('temp_repo', '.');

console.log("Cleaning up...");
fs.rmSync('temp_repo', { recursive: true, force: true });
console.log("Done.");
