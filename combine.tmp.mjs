import { chromium } from 'playwright';
import fs from 'node:fs';
const svg=fs.readFileSync('public/icon-app.svg','utf8');
const b=await chromium.launch();
const pg=await b.newPage({viewport:{width:340,height:96}});
// favicon-scale check on both a light and a dark browser chrome
await pg.setContent(`<style>html,body{margin:0;display:flex}
 .p{padding:16px;display:flex;gap:18px;align-items:center}
 .l{background:#ffffff}.d{background:#1f1f1f}
 .s16 svg{width:16px;height:16px}.s24 svg{width:24px;height:24px}.s32 svg{width:32px;height:32px}.s48 svg{width:48px;height:48px}
 </style>
 <div class="p l"><span class="s16">${svg}</span><span class="s24">${svg}</span><span class="s32">${svg}</span><span class="s48">${svg}</span></div>
 <div class="p d"><span class="s16">${svg}</span><span class="s24">${svg}</span><span class="s32">${svg}</span><span class="s48">${svg}</span></div>`);
await pg.screenshot({path:process.argv[2]});
await b.close();
