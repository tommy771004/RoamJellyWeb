'use strict';

const {
  buildOrigin,
  buildTripDescription,
  escapeHtml,
  fetchTripPreview,
} = require('./_tripShareCommon');

module.exports = async (req, res) => {
  const tripId = String(req.query.tripId || '').trim();
  if (!tripId) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Missing tripId');
    return;
  }

  try {
    const origin = buildOrigin(req);
    const info = await fetchTripPreview(req, tripId);
    const shareUrl = `${origin}/share/trip/${encodeURIComponent(tripId)}`;
    const appUrl = `${origin}/trip/${encodeURIComponent(tripId)}`;
    const imageUrl = `${origin}/api/og/trip?tripId=${encodeURIComponent(tripId)}`;
    const title = `${info.name} | RoamJelly 果凍漫遊`;
    const description = buildTripDescription(info);

    const html = `<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="noindex, nofollow" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="RoamJelly 果凍漫遊" />
    <meta property="og:locale" content="zh_TW" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <meta http-equiv="refresh" content="2;url=${escapeHtml(appUrl)}" />
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at 18% 18%, rgba(236,72,153,0.28), transparent 32%),
          radial-gradient(circle at 82% 76%, rgba(59,130,246,0.24), transparent 30%),
          #0f172a;
        font-family: "Plus Jakarta Sans", "Noto Sans TC", sans-serif;
        color: white;
      }
      .card {
        width: min(92vw, 540px);
        padding: 28px;
        border-radius: 28px;
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 24px 70px rgba(15,23,42,0.45);
        backdrop-filter: blur(24px);
      }
      .eyebrow {
        font-size: 11px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: #f9a8d4;
        font-weight: 800;
      }
      h1 {
        margin: 12px 0 10px;
        font-size: clamp(32px, 6vw, 44px);
        line-height: 1.05;
      }
      p {
        margin: 0;
        color: #cbd5e1;
        line-height: 1.6;
      }
      .meta {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin: 18px 0 24px;
      }
      .pill {
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.08);
        font-weight: 700;
        font-size: 13px;
      }
      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 14px 18px;
        border-radius: 999px;
        text-decoration: none;
        color: #0f172a;
        background: white;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="eyebrow">RoamJelly Trip Share</div>
      <h1>${escapeHtml(info.name)}</h1>
      <p>${escapeHtml(description)}</p>
      <div class="meta">
        <span class="pill">📍 ${escapeHtml(info.destination || '旅程目的地')}</span>
        <span class="pill">🗓️ ${escapeHtml(String(info.days || 1))} 天</span>
        <span class="pill">✨ ${escapeHtml(String(info.totalSpots || 0))} 個景點</span>
      </div>
      <a href="${escapeHtml(appUrl)}">立即打開旅程</a>
    </main>
  </body>
</html>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
    res.end(html);
  } catch (error) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="zh-TW"><body style="font-family:sans-serif;background:#0f172a;color:white;display:grid;place-items:center;min-height:100vh">找不到這個分享旅程</body></html>');
  }
};