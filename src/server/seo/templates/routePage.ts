// src/server/seo/templates/routePage.ts
import type { RouteData } from '../types.js';
import { escHtml, safeJsonLd, SITE_ORIGIN } from '../utils.js';
import { holidayFooterLink } from '../longWeekends.js';
import { formatDurationRangeZh, formatDurationZh, type RouteFlightSummary } from '../routeFlightFacts.js';

const MONTH_NAMES_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

/** Below this many searches the month-by-month demand is noise; the facts page leaves it out. */
const MIN_SEARCHES_FOR_DEMAND = 30;

type Faq = { q: string; a: string };

/**
 * Destinations also flown from 台北松山 (TSA). The scrape only covers 桃園
 * (TPE), so these pages say so instead of implying the list is complete.
 */
const ALSO_FROM_SONGSHAN: Record<string, string> = {
  HND: '長榮航空、中華航空、日本航空、全日空',
};

function demandBar(count: number, max: number): string {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
    <div style="width:${pct}%;max-width:280px;height:12px;background:#b25936;border-radius:6px;transition:width .3s;"></div>
    <span style="font-size:13px;color:#7b7167;">${count} 次</span>
  </div>`;
}

const ntd = (n: number) => `NT$${n.toLocaleString('en-US')}`;
/** "2026-12-01" → "12/1" */
const shortDate = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const joinZh = (items: string[]) => items.join('、');

function demandCard(data: RouteData, peakText: string, lowText: string): string {
  const maxCount = Math.max(...data.monthly.map((m) => m.count), 1);
  const monthRows = data.monthly
    .slice(0, 6)
    .map((m) => `
      <div style="margin:12px 0;">
        <div style="font-size:14px;font-weight:600;color:#1f1511;margin-bottom:4px;">${MONTH_NAMES_ZH[m.month - 1]}</div>
        ${demandBar(m.count, maxCount)}
      </div>`)
    .join('');

  const lockedRows = data.monthly
    .slice(6)
    .map((m) => `
      <div style="margin:12px 0;filter:blur(4px);pointer-events:none;user-select:none;">
        <div style="font-size:14px;font-weight:600;color:#1f1511;margin-bottom:4px;">${MONTH_NAMES_ZH[m.month - 1]}</div>
        ${demandBar(m.count, maxCount)}
      </div>`)
    .join('');

  return `
  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;">出發時機建議</h2>
    <p>
      <span class="tag tag-peak">旺季 ${escHtml(peakText)}</span>
      <span class="tag tag-low">淡季 ${escHtml(lowText)}</span>
    </p>
    <p style="margin-top:12px;font-size:14px;color:#5d5249;">
      過去 12 個月，果凍漫遊用戶共搜尋此航線 <strong>${data.totalSearches}</strong> 次。
    </p>
  </div>

  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;">每月搜尋熱度</h2>
    ${monthRows}

    <div class="lock-banner">
      <strong>🔒 登入查看完整 12 個月資料</strong><br>
      <span style="font-size:13px;color:#7b7167;">免費建立帳號，解鎖完整熱度分析與行程規劃功能</span>
    </div>
    <div style="position:relative;overflow:hidden;border-radius:8px;">
      ${lockedRows}
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 0%,#fff 60%);pointer-events:none;"></div>
    </div>

    <a class="cta" href="/?from=${encodeURIComponent(data.fromCode)}&to=${encodeURIComponent(data.toCode)}">免費開始規劃 ${escHtml(data.fromDisplay)}→${escHtml(data.toDisplay)} 行程 →</a>
  </div>`;
}

function flightsCard(data: RouteData, facts: RouteFlightSummary): string {
  const rows = facts.flights
    .map((f) => {
      const lowCost = facts.lowCostAirlines.includes(f.airline) ? ' <span class="tag tag-low">廉航</span>' : '';
      return `
        <tr>
          <td>${escHtml(f.airline)}${lowCost}</td>
          <td>${escHtml(f.flightNumber || '—')}</td>
          <td>${escHtml(f.departure)} → ${escHtml(f.arrival)}</td>
          <td>${escHtml(formatDurationZh(f.durationMin))}</td>
          <td>${escHtml(ntd(f.price))}<span class="muted">（${escHtml(shortDate(f.departureDate))} 出發）</span></td>
        </tr>`;
    })
    .join('');

  return `
  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;">${escHtml(data.fromDisplay)}直飛${escHtml(data.toDisplay)}航班一覽</h2>
    <div style="overflow-x:auto;">
      <table>
        <thead><tr><th>航空公司</th><th>航班</th><th>起飛 → 抵達（當地時間）</th><th>飛行時間</th><th>單程最低價</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="muted" style="margin-top:12px;">價格為 ${escHtml(facts.fetchedAt.slice(0, 10))} 在 Trip.com 查到的單程經濟艙票價，會隨日期與剩餘座位變動，訂票前請以實際查價為準；航班表只列出查詢當天出現的直飛航班${data.fromCode === 'TPE' ? '，且只含桃園機場（TPE）出發，不含松山機場' : ''}。</p>
    <a class="cta" href="/?from=${encodeURIComponent(data.fromCode)}&to=${encodeURIComponent(data.toCode)}">查 ${escHtml(data.fromDisplay)}→${escHtml(data.toDisplay)} 最新票價並規劃行程 →</a>
  </div>`;
}

function factsCard(data: RouteData, facts: RouteFlightSummary): string {
  const items: Array<[string, string]> = [
    ['飛行時間', `直飛約 ${formatDurationRangeZh(facts.minDurationMin, facts.maxDurationMin)}`],
    ['航線', `${data.fromDisplay}（${data.fromCode}）→ ${data.toDisplay}（${data.toCode}）`],
    ['直飛航空公司', joinZh(facts.airlines.map((a) => a.name))],
  ];
  if (data.timeDifference) items.push(['時差', `${data.toDisplay}${data.timeDifference}`]);
  items.push(['最近查到最低價', `${ntd(facts.minPrice)}（${shortDate(facts.minPriceDate)} 出發，單程）`]);

  return `
  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;">快速資訊</h2>
    <dl class="facts">
      ${items.map(([k, v]) => `<div><dt>${escHtml(k)}</dt><dd>${escHtml(v)}</dd></div>`).join('')}
    </dl>
  </div>`;
}

export function buildRoutePage(data: RouteData): string {
  const facts = data.flightSummary ?? null;
  const peakText = data.peakMonth ? `${MONTH_NAMES_ZH[data.peakMonth - 1]}（旺季）` : '資料不足';
  const lowText = data.lowMonth ? `${MONTH_NAMES_ZH[data.lowMonth - 1]}（淡季）` : '資料不足';
  const canonical = `${SITE_ORIGIN}/fly/${data.slug}/`;
  const planFaq: Faq = {
    q: `怎麼規劃${data.toDisplay}的行程？`,
    a: `在果凍漫遊建立${data.toDisplay}行程，AI 會依天數與偏好生成初稿並依地理位置排序；再邀請旅伴用同一連結即時共編，並用分帳工具結算多幣別費用。`,
  };

  let title: string;
  let description: string;
  let h1: string;
  let subtitle: string;
  let answerLead: string;
  let faqs: Faq[];
  let body: string;
  let datasetName: string;

  if (facts) {
    const range = formatDurationRangeZh(facts.minDurationMin, facts.maxDurationMin);
    const names = facts.airlines.map((a) => a.name);
    const updated = facts.fetchedAt.slice(0, 10);
    const songshan = data.fromCode === 'TPE' ? ALSO_FROM_SONGSHAN[data.toCode] : undefined;
    const songshanNote = songshan ? `以上為桃園機場（TPE）出發；松山機場（TSA）另有${songshan}直飛${data.toDisplay}。` : '';

    title = `${data.fromDisplay}飛${data.toDisplay}多久？直飛航空公司、廉航與機票價格 | 果凍漫遊`;
    description = `${data.fromDisplay}（${data.fromCode}）直飛${data.toDisplay}（${data.toCode}）約 ${range}，直飛航空公司有${joinZh(names.slice(0, 5))}${names.length > 5 ? '等' : ''}。最近查到單程最低 ${ntd(facts.minPrice)}。`;
    h1 = `${escHtml(data.fromDisplay)}飛${escHtml(data.toDisplay)}多久？<br>直飛航空公司與機票價格`;
    subtitle = `${data.fromCode} → ${data.toCode} · 航班資料更新於 ${updated}`;
    answerLead =
      `${data.fromDisplay}（${data.fromCode}）直飛${data.toDisplay}（${data.toCode}）飛行時間約 ${range}，多數航班約 ${formatDurationZh(facts.medianDurationMin)}。` +
      `目前查到 ${names.length} 家航空公司直飛：${joinZh(facts.fullServiceAirlines.length ? facts.fullServiceAirlines : names)}` +
      (facts.lowCostAirlines.length && facts.fullServiceAirlines.length ? `；廉航有${joinZh(facts.lowCostAirlines)}` : '') +
      `。` +
      songshanNote +
      (data.timeDifference ? `${data.toDisplay}${data.timeDifference}。` : '');

    faqs = [
      {
        q: `${data.fromDisplay}飛${data.toDisplay}要多久？`,
        a: `${data.fromDisplay}（${data.fromCode}）直飛${data.toDisplay}（${data.toCode}）約 ${range}，多數航班約 ${formatDurationZh(facts.medianDurationMin)}（依 ${updated} 查到的 ${facts.flightCount} 個直飛航班）。`,
      },
      {
        q: `${data.fromDisplay}直飛${data.toDisplay}有哪些航空公司？`,
        a: `${updated} 查到的直飛航空公司有${joinZh(names)}，共 ${names.length} 家。各家航班時間見上方航班一覽。${songshanNote}`,
      },
      {
        q: `${data.fromDisplay}飛${data.toDisplay}有廉航嗎？`,
        a: facts.lowCostAirlines.length
          ? `有。${joinZh(facts.lowCostAirlines)}有直飛${data.fromDisplay}到${data.toDisplay}，票價通常較低，但托運行李與選位多需加購。`
          : `${updated} 查到的直飛航班沒有廉價航空，直飛航空公司為${joinZh(names)}。`,
      },
      ...(data.timeDifference
        ? [{ q: `${data.toDisplay}和台灣有時差嗎？`, a: `${data.toDisplay}${data.timeDifference}，航班表上的抵達時間是${data.toDisplay}當地時間。` }]
        : []),
      planFaq,
    ];

    body =
      factsCard(data, facts) +
      flightsCard(data, facts) +
      (data.totalSearches >= MIN_SEARCHES_FOR_DEMAND ? demandCard(data, peakText, lowText) : '');
    datasetName = `${data.fromDisplay} → ${data.toDisplay} 直飛航班資料`;
  } else {
    title = `從${data.fromDisplay}飛${data.toDisplay}幾月最便宜？台灣旅人搜尋熱度分析 | 果凍漫遊`;
    description = `根據果凍漫遊用戶搜尋資料，分析${data.fromDisplay}（${data.fromCode}）飛往${data.toDisplay}（${data.toCode}）各月份的搜尋熱度，幫你找出最佳出發時機。`;
    h1 = `從${escHtml(data.fromDisplay)}飛${escHtml(data.toDisplay)}（${escHtml(data.fromCode)} → ${escHtml(data.toCode)}）<br>台灣旅人搜尋熱度分析`;
    subtitle = '根據果凍漫遊用戶的真實搜尋行為，整理各月份熱度';
    // Answer-first lead for AI citation / featured snippets.
    answerLead = data.peakMonth || data.lowMonth
      ? `從${data.fromDisplay}飛${data.toDisplay}，根據果凍漫遊用戶搜尋資料，旺季落在 ${peakText}、淡季落在 ${lowText}；想避開人潮與高峰票價，可優先考慮淡季月份出發。`
      : `從${data.fromDisplay}飛${data.toDisplay}的搜尋熱度資料仍在累積中，下方為目前可得的各月份趨勢。`;
    faqs = [
      {
        q: `${data.fromDisplay}飛${data.toDisplay}幾月最便宜？`,
        a: data.lowMonth
          ? `依果凍漫遊用戶搜尋資料，${data.fromDisplay}飛${data.toDisplay}的搜尋淡季落在 ${lowText}，通常此時段需求較低、較有機會找到便宜票價；旺季 ${peakText} 則需求最高。實際票價仍會隨航空公司與訂購時間變動。`
          : `${data.fromDisplay}飛${data.toDisplay}的搜尋資料仍在累積中。建議用果凍漫遊比價並提前 1–3 個月查詢，較容易掌握合適票價。`,
      },
      {
        q: `這份${data.fromDisplay}→${data.toDisplay}熱度資料怎麼來的？`,
        a: `資料來自果凍漫遊用戶在站內搜尋此航線（${data.fromCode} → ${data.toCode}）的真實次數，依月份彙整為搜尋熱度，反映旅人關注度與季節趨勢，非航空公司官方售價。`,
      },
      planFaq,
    ];
    body = demandCard(data, peakText, lowText);
    datasetName = `${data.fromDisplay} → ${data.toDisplay} 搜尋熱度資料`;
  }

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="RoamJelly 果凍漫遊">
  <meta property="og:locale" content="zh_TW">
  <meta property="og:image" content="${SITE_ORIGIN}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  <meta name="twitter:image" content="${SITE_ORIGIN}/og-image.png">
  <script type="application/ld+json">${safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    'name': datasetName,
    'description': description,
    'url': canonical,
    'inLanguage': 'zh-TW',
    ...(facts ? { 'dateModified': facts.fetchedAt } : {}),
    'creator': { '@type': 'Organization', 'name': '果凍漫遊 RoamJelly', 'url': SITE_ORIGIN },
    'isAccessibleForFree': true,
  })}</script>
  <script type="application/ld+json">${safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': '果凍漫遊', 'item': `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', 'position': 2, 'name': '航線分析', 'item': `${SITE_ORIGIN}/fly/` },
      { '@type': 'ListItem', 'position': 3, 'name': `${data.fromDisplay} → ${data.toDisplay}`, 'item': canonical },
    ],
  })}</script>
  <script type="application/ld+json">${safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map((f) => ({
      '@type': 'Question',
      'name': f.q,
      'acceptedAnswer': { '@type': 'Answer', 'text': f.a },
    })),
  })}</script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fbfaf7;color:#1f1511}
    .container{max-width:800px;margin:0 auto;padding:24px 16px}
    nav{display:flex;align-items:center;gap:12px;margin-bottom:32px}
    nav a{color:#b25936;text-decoration:none;font-weight:700;font-size:18px}
    nav span{color:#a79e94;font-size:14px}
    h1{font-size:clamp(20px,4vw,28px);font-weight:800;line-height:1.3;margin-bottom:8px}
    .subtitle{color:#7b7167;font-size:15px;margin-bottom:32px}
    .card{background:#fff;border:1px solid #ece7e0;border-radius:16px;padding:24px;margin-bottom:24px}
    .tag{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-right:8px}
    .tag-peak{background:#fbf2ec;color:#a04e30}
    .tag-low{background:#f0f6f1;color:#5f8b6f}
    .muted{font-size:13px;color:#7b7167;line-height:1.6}
    table{width:100%;border-collapse:collapse;font-size:14px;min-width:560px}
    th{text-align:left;font-weight:700;color:#5d5249;padding:8px;border-bottom:1px solid #ece7e0;white-space:nowrap}
    td{padding:10px 8px;border-bottom:1px solid #f7f4ef;vertical-align:top}
    td .tag{margin:0 0 0 6px;padding:2px 8px}
    td .muted{display:block}
    .facts div{display:grid;grid-template-columns:8.5em 1fr;gap:12px;padding:8px 0;border-bottom:1px solid #f7f4ef;font-size:14px}
    .facts dt{color:#7b7167;font-weight:600}
    .facts dd{color:#1f1511;line-height:1.6}
    .cta{display:block;width:100%;padding:16px;border-radius:12px;background:#b25936;color:#fff;font-weight:800;font-size:16px;text-align:center;text-decoration:none;margin-top:24px}
    .cta:hover{background:#a04e30}
    .lock-banner{background:#fdf6ef;border:1px solid #f7d7c3;border-radius:12px;padding:16px;text-align:center;margin:16px 0}
    footer{text-align:center;color:#a79e94;font-size:13px;margin-top:48px;padding-top:24px;border-top:1px solid #ece7e0}
    footer a{color:#a79e94;margin:0 8px}
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

  <h1>${h1}</h1>
  <p class="subtitle">${escHtml(subtitle)}</p>

  <p style="font-size:15px;line-height:1.7;color:#493d36;background:#fff;border:1px solid #ece7e0;border-left:4px solid #b25936;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">${escHtml(answerLead)}</p>
${body}

  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;">常見問題</h2>
    ${faqs.map((f) => `
      <div style="padding:12px 0;border-bottom:1px solid #f7f4ef;">
        <h3 style="font-size:15px;font-weight:700;color:#1f1511;margin-bottom:6px;">${escHtml(f.q)}</h3>
        <p style="font-size:14px;line-height:1.7;color:#5d5249;">${escHtml(f.a)}</p>
      </div>`).join('')}
  </div>

  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;">相關航線</h2>
    <ul style="list-style:none;display:flex;flex-wrap:wrap;gap:8px;">
      <li><a href="/fly/" style="color:#b25936;text-decoration:none;font-size:14px;">← 所有航線分析</a></li>
      ${data.destinationSlug ? `<li><a href="/trips/${data.destinationSlug}/" style="color:#b25936;text-decoration:none;font-size:14px;">${escHtml(data.toDisplay)} 旅遊行程 →</a></li>` : ''}
    </ul>
  </div>

  <footer>
    <a href="/">果凍漫遊</a>
    <a href="/fly/">航線分析</a>
    <a href="/trips/">目的地行程</a>
    ${holidayFooterLink()}
    <br><br>
    <span>© ${new Date().getFullYear()} RoamJelly 果凍漫遊</span>
  </footer>
</div>
</body>
</html>`;
}
