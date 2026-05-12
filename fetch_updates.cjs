const fs = require('fs');
const path = require('path');
const https = require('https');

const files = [
  'migrations/0004_tranquil_prism.sql',
  'src/components/HomeTab.tsx',
  'src/components/ItineraryTab.tsx',
  'src/lib/itineraryUtils.ts',
  'src/lib/openrouterApi.ts',
  'src/lib/workflowApi.ts',
  'src/server/repositories/appRepository.ts',
  'src/server/services/aiItineraryService.ts',
  'src/server/services/openrouterHelper.ts',
  'src/store/useAppStore.ts',
  'src/types/workflow.ts',
  'src/App.tsx',
  '.gitignore',
  'server.ts'
];
const repoUrl = 'https://raw.githubusercontent.com/tommy771004/RoamJellyWeb/main/';

async function downloadFile(file) {
  const fileUrl = repoUrl + file;
  const targetPath = path.resolve(process.cwd(), file);
  
  // Create dir if not exists
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    https.get(fileUrl, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${file}, status: ${res.statusCode}`));
      }
      
      const fileStream = fs.createWriteStream(targetPath);
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded: ${file}`);
        resolve();
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(targetPath, () => {}); // Delete the file async
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  for (const file of files) {
    try {
      await downloadFile(file);
    } catch (e) {
      console.error(e.message);
    }
  }
}

run();
