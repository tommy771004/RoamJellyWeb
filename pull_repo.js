const { execSync } = require('child_process');

try {
  console.log('Downloading latest repository from Github...');
  execSync('curl -sL https://github.com/tommy771004/RoamJellyWeb/archive/refs/heads/main.tar.gz -o repo.tar.gz');
  
  console.log('Extracting files (overwriting local ones)...');
  execSync('tar -xzf repo.tar.gz --strip-components=1');
  
  console.log('Cleaning up...');
  execSync('rm repo.tar.gz');
  
  console.log('Successfully pulled and extracted repo!');
} catch (e) {
  console.error('Error occurred:', e.toString());
  if (e.stdout) console.error('stdout:', e.stdout.toString());
  if (e.stderr) console.error('stderr:', e.stderr.toString());
}
