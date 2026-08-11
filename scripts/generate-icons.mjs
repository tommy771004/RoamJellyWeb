/**
 * Rasterises the brand SVGs in public/ into the PNG sizes the manifest,
 * apple-touch-icon and social cards reference.
 *
 * Why this exists: the PNGs used to be produced by hand outside the repo. Every
 * one of them had been committed with a corrupted header (the leading 0x89 byte
 * replaced by the UTF-8 replacement character), so no icon or share image
 * actually rendered. Generating them from the SVG sources keeps them in sync
 * with the brand and makes the corruption impossible to reintroduce silently —
 * the script verifies the PNG signature of everything it writes.
 *
 *   node scripts/generate-icons.mjs
 *
 * Uses the Chromium that Playwright already installs for this project.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');

/** icon source -> [ [output, pixel size], ... ] */
const TARGETS = [
  ['icon-app.svg', [['icon-180.png', 180], ['icon-192.png', 192], ['icon-app-512.png', 512]]],
  ['icon-app-maskable.svg', [['icon-maskable-512.png', 512]]],
];

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function main() {
  const browser = await chromium.launch();
  const written = [];

  try {
    for (const [source, outputs] of TARGETS) {
      const svgPath = path.join(pub, source);
      if (!fs.existsSync(svgPath)) throw new Error(`missing source: ${source}`);
      const svg = fs.readFileSync(svgPath, 'utf8');

      for (const [name, size] of outputs) {
        const page = await browser.newPage({
          viewport: { width: size, height: size },
          deviceScaleFactor: 1,
        });
        // The icons are opaque tiles, so no transparent padding to preserve.
        await page.setContent(
          `<style>html,body{margin:0;padding:0}` +
            `svg{display:block;width:${size}px;height:${size}px}</style>${svg}`
        );
        const out = path.join(pub, name);
        await page.screenshot({ path: out });
        await page.close();
        written.push([name, size, source]);
      }
    }
  } finally {
    await browser.close();
  }

  let bad = 0;
  for (const [name, size, source] of written) {
    const file = path.join(pub, name);
    const head = Buffer.alloc(8);
    const fd = fs.openSync(file, 'r');
    fs.readSync(fd, head, 0, 8, 0);
    fs.closeSync(fd);
    const ok = head.equals(PNG_SIGNATURE);
    if (!ok) bad++;
    const kb = (fs.statSync(file).size / 1024).toFixed(1);
    console.log(`${ok ? 'ok  ' : 'BAD '} ${name.padEnd(24)} ${String(size).padStart(4)}px  ${kb.padStart(7)} KB  <- ${source}`);
  }

  if (bad) {
    console.error(`\n${bad} file(s) written with an invalid PNG signature`);
    process.exitCode = 1;
  } else {
    console.log(`\n${written.length} PNG(s) written, all signatures valid`);
  }
}

await main();
