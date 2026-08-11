import { chromium } from 'playwright';
import fs from 'node:fs';
const svg = fs.readFileSync(process.argv[2],'utf8');
const b = await chromium.launch();
const pg = await b.newPage({viewport:{width:512,height:512}});
await pg.setContent(`<style>html,body{margin:0}svg{display:block;width:512px;height:512px}</style>${svg}`);
const out = await pg.evaluate(()=>{
  const c = e => { const r = e.getBoundingClientRect(); return {cx:+(r.x+r.width/2).toFixed(1), cy:+(r.y+r.height/2).toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), top:+r.y.toFixed(1), bottom:+(r.y+r.height).toFixed(1), left:+r.x.toFixed(1), right:+(r.x+r.width).toFixed(1)}; };
  const svgEl=document.querySelector('svg');
  const bodyRect=[...svgEl.querySelectorAll('rect')].filter(r=>r.getAttribute('width')==='232')[0];
  const plane=svgEl.querySelector('g[transform^="translate(256 266)"] path');
  const group=svgEl.querySelector('g[transform^="rotate(-9"]');
  return { tileCenter:{cx:256,cy:256}, body:c(bodyRect), plane:c(plane), object:c(group) };
});
console.log(JSON.stringify(out,null,1));
await b.close();
