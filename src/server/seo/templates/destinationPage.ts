// src/server/seo/templates/destinationPage.ts
import type { DestinationData, PublicTrip } from '../types.js';
import { escHtml, safeJsonLd } from '../utils.js';

function renderTrip(trip: PublicTrip): string {
  const byDay = new Map<number, typeof trip.nodes>();
  for (const node of trip.nodes) {
    if (!byDay.has(node.day)) byDay.set(node.day, []);
    byDay.get(node.day)!.push(node);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a - b).slice(0, 3);

  const dayHtml = days.map(([day, nodes]) => `
    <div style="margin:12px 0;">
      <div style="font-size:13px;font-weight:700;color:#f43f5e;margin-bottom:8px;">第 ${day} 天</div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:6px;">
        ${nodes.map((n) => `
          <li style="display:flex;gap:8px;align-items:flex-start;">
            <span style="font-size:12px;color:#94a3b8;width:40px;flex-shrink:0;">${escHtml(n.time ?? '')}</span>
            <span style="font-size:14px;color:#0f172a;">${escHtml(n.title)}</span>
          </li>`).join('')}
      </ul>
    </div>`).join('');

  return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="font-size:15px;font-weight:700;">${escHtml(trip.name)}</h3>
        <span style="font-size:12px;color:#94a3b8;">🍴 ${trip.forkCount} 人使用</span>
      </div>
      ${dayHtml}
      ${trip.nodes.length > 6 ? `<p style="font-size:13px;color:#94a3b8;margin-top:8px;">+ 更多景點...</p>` : ''}
    </div>`;
}

export function buildDestinationPage(data: DestinationData): string {
  const title = `${data.displayName}旅遊行程推薦 — 真實旅人規劃的行程 | 果凍漫遊`;
  const description = `果凍漫遊用戶分享的${data.displayName}旅遊行程，包含景點安排、天數規劃與行程細節，免費複製使用。`;

  const tripsHtml = data.trips.slice(0, 5).map(renderTrip).join('');

  const spotsHtml = data.popularSpots.length > 0
    ? `<ul style="list-style:none;display:flex;flex-wrap:wrap;gap:8px;">
        ${data.popularSpots.map((s) => `<li style="background:#fef2f2;color:#e11d48;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;">${escHtml(s)}</li>`).join('')}
      </ul>`
    : '<p style="color:#94a3b8;font-size:14px;">暫無資料</p>';

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="https://roamjelly.com/trips/${data.slug}/">
  <script type="application/ld+json">${safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': `${data.displayName} 旅遊行程推薦`,
    'description': description,
    'itemListElement': data.trips.slice(0, 5).map((t, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': t.name,
    })),
  })}</script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;color:#0f172a}
    .container{max-width:800px;margin:0 auto;padding:24px 16px}
    nav{display:flex;align-items:center;gap:12px;margin-bottom:32px}
    nav a{color:#f43f5e;text-decoration:none;font-weight:700;font-size:18px}
    nav span{color:#94a3b8;font-size:14px}
    h1{font-size:clamp(20px,4vw,28px);font-weight:800;line-height:1.3;margin-bottom:8px}
    .subtitle{color:#64748b;font-size:15px;margin-bottom:32px}
    h2{font-size:18px;font-weight:700;margin-bottom:16px}
    .cta{display:block;width:100%;padding:16px;border-radius:12px;background:#f43f5e;color:#fff;font-weight:800;font-size:16px;text-align:center;text-decoration:none;margin:24px 0}
    .cta:hover{background:#e11d48}
    footer{text-align:center;color:#94a3b8;font-size:13px;margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0}
    footer a{color:#94a3b8;margin:0 8px}
  </style>
</head>
<body>
<div class="container">
  <nav>
    <a href="/">果凍漫遊</a>
    <span>›</span>
    <a href="/trips/">目的地行程</a>
    <span>›</span>
    <span>${escHtml(data.displayName)}</span>
  </nav>

  <h1>${escHtml(data.displayName)}旅遊行程推薦</h1>
  <p class="subtitle">果凍漫遊用戶分享的真實行程規劃，免費複製使用</p>

  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px;">
    <h2>熱門景點</h2>
    ${spotsHtml}
  </div>

  <h2>精選旅遊行程</h2>
  ${tripsHtml.length > 0 ? tripsHtml : '<p style="color:#94a3b8;">目前還沒有公開行程，成為第一個分享者吧！</p>'}

  <a class="cta" href="/">免費複製行程，開始規劃你的${escHtml(data.displayName)}之旅 →</a>

  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
    <h2 style="font-size:16px;margin-bottom:12px;">相關資源</h2>
    <ul style="list-style:none;display:flex;flex-wrap:wrap;gap:8px;">
      <li><a href="/trips/" style="color:#f43f5e;text-decoration:none;font-size:14px;">← 所有目的地</a></li>
    </ul>
  </div>

  <footer>
    <a href="/">果凍漫遊</a>
    <a href="/fly/">航線分析</a>
    <a href="/trips/">目的地行程</a>
    <br><br>
    <span>© ${new Date().getFullYear()} RoamJelly 果凍漫遊</span>
  </footer>
</div>
</body>
</html>`;
}
