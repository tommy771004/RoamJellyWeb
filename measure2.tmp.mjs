import { chromium } from 'playwright';
import fs from 'node:fs';
const svg = fs.readFileSync(process.argv[2],'utf8');
const b = await chromium.launch();
const pg = await b.newPage({viewport:{width:512,height:512}});
await pg.setContent(`<style>html,body{margin:0}svg{display:block;width:512px;height:512px}</style>${svg}`);
const out = await pg.evaluate(()=>{
  const g=document.querySelector('g[transform^="rotate(-9"]');
  // union of every drawn child except the cast shadow ellipse
  let l=1e9,t=1e9,r=-1e9,bm=-1e9;
  for (const el of g.children){
    if (el.tagName==='ellipse') continue;              // contact shadow: ground, not mass
    const q=el.getBoundingClientRect();
    l=Math.min(l,q.x); t=Math.min(t,q.y); r=Math.max(r,q.x+q.width); bm=Math.max(bm,q.y+q.height);
  }
  return { left:+l.toFixed(1), top:+t.toFixed(1), right:+r.toFixed(1), bottom:+bm.toFixed(1),
           cx:+((l+r)/2).toFixed(1), cy:+((t+bm)/2).toFixed(1),
           w:+(r-l).toFixed(1), h:+(bm-t).toFixed(1),
           offsetX:+((l+r)/2-256).toFixed(1), offsetY:+((t+bm)/2-256).toFixed(1),
           coverage:+(((r-l)/512*100).toFixed(1)) };
});
console.log(JSON.stringify(out,null,1));
await b.close();
