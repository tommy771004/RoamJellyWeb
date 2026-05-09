const fs = require('fs');
const content = fs.readFileSync('src/components/HomeTab.tsx', 'utf8');
const newContent = content.replace(/gap-y-1 bg-white\/90 backdrop-blur-md rounded-\[24px\] px-5 py-3/g, 'gap-y-1.5 bg-white/90 backdrop-blur-md rounded-[20px] px-6 py-4');
fs.writeFileSync('src/components/HomeTab.tsx', newContent);
