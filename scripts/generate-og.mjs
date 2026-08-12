/**
 * Builds the Open Graph / Twitter share cards.
 *
 *   node scripts/generate-og.mjs
 *
 * Outputs (1200x630, the size the meta tags declare):
 *   public/og-image.png                  site-wide card (index.html)
 *   public/og-guide-hub.png              public/guide/index.html
 *   public/og-guide-taiwan.png           台灣旅遊行程規劃
 *   public/og-guide-expense.png          多人旅遊費用分攤
 *   public/og-guide-collaborative.png    collaborative itinerary planner (en)
 *
 * Same background as the icons and the same suitcase mark, pulled straight out
 * of public/icon-app.svg so there is one source of truth for the artwork.
 *
 * Like the icons, these had all been committed with a corrupted PNG header, so
 * every share preview was blank. The script verifies each signature it writes.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const W = 1200;
const H = 630;

const CARDS = [
  {
    file: 'og-image.png',
    title: 'AI 行程規劃，<br>旅伴即時共編',
    body: '搜尋機票、整理行程、分帳與提醒，一個連結就能一起出發。',
  },
  {
    file: 'og-guide-hub.png',
    eyebrow: '旅遊規劃指南',
    title: '行程共編、台灣自由行、<br>多人分帳',
    body: '完整教學一次看。',
  },
  {
    file: 'og-guide-taiwan.png',
    eyebrow: '旅遊規劃指南',
    title: '台灣旅遊行程<br>規劃完整指南',
    body: '多人共編、天數建議、必去景點，一次說清楚。',
  },
  {
    file: 'og-guide-expense.png',
    eyebrow: '旅遊規劃指南',
    title: '多人旅遊<br>費用分攤指南',
    body: '分帳方式、跨幣別計算與快速結算流程。',
  },
  {
    file: 'og-guide-collaborative.png',
    eyebrow: 'Travel planning guide',
    title: 'Collaborative<br>itinerary planner',
    // No hyphenated compound here: it wrapped as "group-" / "chat" and the
    // stranded hyphen read as a dash.
    body: 'How group trips stay in sync without the endless chat threads.',
  },
];

/** The suitcase artwork, minus its tile, so it floats on the card background. */
function markSvg() {
  const svg = fs.readFileSync(path.join(pub, 'icon-app.svg'), 'utf8');
  const tile = /<rect id="tile-rect"[^>]*\/>/;
  if (!tile.test(svg)) throw new Error('icon-app.svg: #tile-rect not found');
  return svg.replace(tile, '');
}

function fontFace() {
  const file = path.join(pub, 'fonts', 'Sentient-Variable.woff2');
  if (!fs.existsSync(file)) return '';
  const b64 = fs.readFileSync(file).toString('base64');
  return `@font-face{font-family:'Sentient';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:200 700;font-style:normal}`;
}

function html(card, mark, face) {
  const eyebrow = card.eyebrow
    ? `<p class="eyebrow">${card.eyebrow}</p>`
    : `<p class="eyebrow">RoamJelly 果凍漫遊</p>`;
  return `<!doctype html><meta charset="utf-8"><style>
    ${face}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${W}px;height:${H}px}
    body{
      display:flex;align-items:center;
      /* same tonal warm-paper surface as the app icon tile */
      background:linear-gradient(135deg,#FDF5EC 0%,#F0D8C0 100%);
      font-family:-apple-system,'PingFang TC','Hiragino Sans GB',sans-serif;
      color:#1F1511;
    }
    .copy{flex:1;padding:0 0 0 84px;min-width:0}
    .eyebrow{
      font-size:26px;font-weight:700;letter-spacing:.06em;
      color:#B25936;margin-bottom:26px;
    }
    h1{
      font-family:'Sentient','Songti TC','Songti SC',serif;
      font-size:76px;line-height:1.18;font-weight:700;
      letter-spacing:-.01em;color:#1F1511;
    }
    .body{
      margin-top:30px;font-size:28px;line-height:1.55;
      color:#5D5249;max-width:640px;
    }
    .mark{width:430px;height:430px;flex:none;margin-right:34px}
    .mark svg{width:100%;height:100%;display:block}
  </style>
  <div class="copy">${eyebrow}<h1>${card.title}</h1><p class="body">${card.body}</p></div>
  <div class="mark">${mark}</div>`;
}

function signatureOk(file) {
  const head = Buffer.alloc(8);
  const fd = fs.openSync(file, 'r');
  fs.readSync(fd, head, 0, 8, 0);
  fs.closeSync(fd);
  return head.equals(PNG_SIGNATURE);
}

async function main() {
  const mark = markSvg();
  const face = fontFace();
  const browser = await chromium.launch();

  try {
    for (const card of CARDS) {
      const page = await browser.newPage({
        viewport: { width: W, height: H },
        deviceScaleFactor: 1,
      });
      await page.setContent(html(card, mark, face));
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(pub, card.file) });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  let bad = 0;
  for (const card of CARDS) {
    const file = path.join(pub, card.file);
    const ok = signatureOk(file);
    if (!ok) bad++;
    const kb = (fs.statSync(file).size / 1024).toFixed(1);
    console.log(`${ok ? 'ok  ' : 'BAD '} ${card.file.padEnd(30)} ${W}x${H}  ${kb.padStart(7)} KB`);
  }

  if (bad) {
    console.error(`\n${bad} file(s) written with an invalid PNG signature`);
    process.exitCode = 1;
  } else {
    console.log(`\n${CARDS.length} share cards written, all PNG signatures valid`);
  }
}

await main();
