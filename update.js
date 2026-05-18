const fs = require('fs');

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  const text = await res.text();
  fs.writeFileSync(dest, text);
  console.log(`Updated ${dest}`);
}

async function main() {
  const branch = 'main'; // or master
  const files = [
    { url: `https://raw.githubusercontent.com/tommy771004/RoamJellyWeb/${branch}/server.ts`, dest: './server.ts' },
    { url: `https://raw.githubusercontent.com/tommy771004/RoamJellyWeb/${branch}/src/components/HomeTab.tsx`, dest: './src/components/HomeTab.tsx' },
    { url: `https://raw.githubusercontent.com/tommy771004/RoamJellyWeb/${branch}/src/components/ItineraryTab.tsx`, dest: './src/components/ItineraryTab.tsx' },
    { url: `https://raw.githubusercontent.com/tommy771004/RoamJellyWeb/${branch}/src/server/repositories/appRepository.ts`, dest: './src/server/repositories/appRepository.ts' },
    // If skills-lock.json exists in repo:
    // { url: `https://raw.githubusercontent.com/tommy771004/RoamJellyWeb/${branch}/skills-lock.json`, dest: './skills-lock.json' }
  ];

  for (const file of files) {
    try {
      await downloadFile(file.url, file.dest);
    } catch (err) {
      console.error(err.message);
    }
  }
}

main();
