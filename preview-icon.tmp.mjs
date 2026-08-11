import { chromium } from 'playwright';
import fs from 'node:fs';
const [svgPath, outPath, size] = process.argv.slice(2);
const svg = fs.readFileSync(svgPath,'utf8');
const b = await chromium.launch();
const pg = await b.newPage({viewport:{width:+size,height:+size}, deviceScaleFactor:1});
await pg.setContent(`<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
await pg.screenshot({path:outPath});
await b.close();
