const fs = require('fs');
let content = fs.readFileSync('src/components/HomeTab.tsx', 'utf8');
content = content.replace(/p-5 pb-0 flex items-center justify-between/g, 'p-6 pb-2 flex items-center justify-between');
content = content.replace(/p-5 pt-8 flex flex-col items-center/g, 'px-6 pt-6 pb-4 flex flex-col items-center');
content = content.replace(/p-5 pt-4 bg-slate-50\/50 border-t/g, 'px-6 py-5 bg-slate-50/50 border-t');
fs.writeFileSync('src/components/HomeTab.tsx', content);
