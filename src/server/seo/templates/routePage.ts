// src/server/seo/templates/routePage.ts
import type { RouteData } from '../types.js';
import { escHtml, safeJsonLd } from '../utils.js';

const MONTH_NAMES_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function demandBar(count: number, max: number): string {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
    <div style="width:${pct}%;max-width:280px;height:12px;background:#f43f5e;border-radius:6px;transition:width .3s;"></div>
    <span style="font-size:13px;color:#64748b;">${count} 次</span>
  </div>`;
}

export function buildRoutePage(data: RouteData): string {
  const maxCount = Math.max(...data.monthly.map((m) => m.count), 1);
  const title = `從${data.fromDisplay}飛${data.toDisplay}幾月最便宜？台灣旅人搜尋熱度分析 | 果凍漫遊`;
  const description = `根據果凍漫遊用戶搜尋資料，分析${data.fromDisplay}（${data.fromCode}）飛往${data.toDisplay}（${data.toCode}）各月份的搜尋熱度，幫你找出最佳出發時機。`;

  const peakText = data.peakMonth ? `${MONTH_NAMES_ZH[data.peakMonth - 1]}（旺季）` : '資料不足';
  const lowText = data.lowMonth ? `${MONTH_NAMES_ZH[data.lowMonth - 1]}（淡季）` : '資料不足';

  const monthRows = data.monthly
    .slice(0, 6)
    .map((m) => `
      <div style="margin:12px 0;">
        <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:4px;">${MONTH_NAMES_ZH[m.month - 1]}</div>
        ${demandBar(m.count, maxCount)}
      </div>`)
    .join('');

  const lockedRows = data.monthly
    .slice(6)
    .map((m) => `
      <div style="margin:12px 0;filter:blur(4px);pointer-events:none;user-select:none;">
        <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:4px;">${MONTH_NAMES_ZH[m.month - 1]}</div>
        ${demandBar(m.count, maxCount)}
      </div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="https://roamjelly.com/fly/${data.slug}/">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">${safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    'name': `${data.fromDisplay} → ${data.toDisplay} 搜尋熱度資料`,
    'description': description,
    'creator': { '@type': 'Organization', 'name': '果凍漫遊 RoamJelly' },
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
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px}
    .tag{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-right:8px}
    .tag-peak{background:#fef2f2;color:#e11d48}
    .tag-low{background:#f0fdf4;color:#16a34a}
    .cta{display:block;width:100%;padding:16px;border-radius:12px;background:#f43f5e;color:#fff;font-weight:800;font-size:16px;text-align:center;text-decoration:none;margin-top:24px}
    .cta:hover{background:#e11d48}
    .lock-banner{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;text-align:center;margin:16px 0}
    footer{text-align:center;color:#94a3b8;font-size:13px;margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0}
    footer a{color:#94a3b8;margin:0 8px}
  </style>
</head>
<body>
<div class="container">
  <nav>
    <a href="/">果凍漫遊</a>
    <span>›</span>
    <a href="/fly/">航線分析</a>
    <span>›</span>
    <span>${escHtml(data.fromDisplay)} → ${escHtml(data.toDisplay)}</span>
  </nav>

  <h1>從${escHtml(data.fromDisplay)}飛${escHtml(data.toDisplay)}（${escHtml(data.fromCode)} → ${escHtml(data.toCode)}）<br>台灣旅人搜尋熱度分析</h1>
  <p class="subtitle">根據果凍漫遊用戶的真實搜尋行為，整理各月份熱度</p>

  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;">出發時機建議</h2>
    <p>
      <span class="tag tag-peak">旺季 ${escHtml(peakText)}</span>
      <span class="tag tag-low">淡季 ${escHtml(lowText)}</span>
    </p>
    <p style="margin-top:12px;font-size:14px;color:#475569;">
      過去 12 個月，果凍漫遊用戶共搜尋此航線 <strong>${data.totalSearches}</strong> 次。
    </p>
  </div>

  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;">每月搜尋熱度</h2>
    ${monthRows}

    <div class="lock-banner">
      <strong>🔒 登入查看完整 12 個月資料</strong><br>
      <span style="font-size:13px;color:#78716c;">免費建立帳號，解鎖完整熱度分析與行程規劃功能</span>
    </div>
    <div style="position:relative;overflow:hidden;border-radius:8px;">
      ${lockedRows}
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 0%,#fff 60%);pointer-events:none;"></div>
    </div>

    <a class="cta" href="/?from=${encodeURIComponent(data.fromCode)}&to=${encodeURIComponent(data.toCode)}">免費開始規劃 ${escHtml(data.fromDisplay)}→${escHtml(data.toDisplay)} 行程 →</a>
  </div>

  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;">相關航線</h2>
    <ul style="list-style:none;display:flex;flex-wrap:wrap;gap:8px;">
      <li><a href="/fly/" style="color:#f43f5e;text-decoration:none;font-size:14px;">← 所有航線分析</a></li>
      ${data.destinationSlug ? `<li><a href="/trips/${data.destinationSlug}/" style="color:#f43f5e;text-decoration:none;font-size:14px;">${escHtml(data.toDisplay)} 旅遊行程 →</a></li>` : ''}
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

