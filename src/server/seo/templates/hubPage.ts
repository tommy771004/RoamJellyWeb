// src/server/seo/templates/hubPage.ts
import { KNOWN_ROUTES, KNOWN_DESTINATIONS } from '../cities.js';
import { escHtml } from '../utils.js';

const BASE_STYLES = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;color:#0f172a}
  .container{max-width:800px;margin:0 auto;padding:24px 16px}
  nav{margin-bottom:32px}
  nav a{color:#f43f5e;text-decoration:none;font-weight:700;font-size:18px}
  h1{font-size:clamp(22px,4vw,32px);font-weight:800;margin-bottom:8px}
  .subtitle{color:#64748b;font-size:15px;margin-bottom:32px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-decoration:none;color:#0f172a;transition:box-shadow .2s}
  .card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}
  .card-title{font-weight:700;font-size:15px;margin-bottom:4px}
  .card-sub{font-size:13px;color:#94a3b8}
  footer{text-align:center;color:#94a3b8;font-size:13px;margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0}
  footer a{color:#94a3b8;margin:0 8px}
`;

export function buildRouteHubPage(): string {
  const cards = KNOWN_ROUTES.map((r) => `
    <a class="card" href="/fly/${r.slug}/">
      <div class="card-title">${escHtml(r.fromDisplay)} → ${escHtml(r.toDisplay)}</div>
      <div class="card-sub">${r.fromCode} → ${r.toCode}</div>
    </a>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>台灣出發航線搜尋熱度分析 | 果凍漫遊</title>
  <meta name="description" content="果凍漫遊整理台灣出發各大航線的旅人搜尋熱度，幫你找出最佳出發時機。">
  <link rel="canonical" href="https://roamjelly.com/fly/">
  <style>${BASE_STYLES}</style>
</head>
<body>
<div class="container">
  <nav><a href="/">← 果凍漫遊</a></nav>
  <h1>台灣出發航線分析</h1>
  <p class="subtitle">根據果凍漫遊用戶搜尋資料，找出各航線的旺淡季</p>
  <div class="grid">${cards}</div>
  <footer>
    <a href="/">果凍漫遊</a>
    <a href="/trips/">目的地行程</a>
    <br><br>
    <span>© ${new Date().getFullYear()} RoamJelly 果凍漫遊</span>
  </footer>
</div>
</body>
</html>`;
}

export function buildDestinationHubPage(): string {
  const cards = KNOWN_DESTINATIONS.map((d) => `
    <a class="card" href="/trips/${d.slug}/">
      <div class="card-title">${escHtml(d.displayName)}</div>
      <div class="card-sub">查看行程攻略 →</div>
    </a>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>旅遊目的地行程推薦 | 果凍漫遊</title>
  <meta name="description" content="果凍漫遊用戶分享的各大目的地旅遊行程，免費複製使用。">
  <link rel="canonical" href="https://roamjelly.com/trips/">
  <style>${BASE_STYLES}</style>
</head>
<body>
<div class="container">
  <nav><a href="/">← 果凍漫遊</a></nav>
  <h1>旅遊目的地行程推薦</h1>
  <p class="subtitle">果凍漫遊旅人分享的真實行程規劃</p>
  <div class="grid">${cards}</div>
  <footer>
    <a href="/">果凍漫遊</a>
    <a href="/fly/">航線分析</a>
    <br><br>
    <span>© ${new Date().getFullYear()} RoamJelly 果凍漫遊</span>
  </footer>
</div>
</body>
</html>`;
}
