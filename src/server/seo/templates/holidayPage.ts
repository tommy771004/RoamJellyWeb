// src/server/seo/templates/holidayPage.ts
// /holidays/{year}/ — the year's 連假 and leave plans from the official
// office calendar, with nearby flights as trip ideas.
import { escHtml, safeJsonLd, SITE_ORIGIN } from '../utils.js';
import { formatDateZh, formatRangeZh, siteFooterLinks, type HolidayYearFacts, type LeavePlan, type OffRun } from '../longWeekends.js';

export interface HolidayTripIdea {
  slug: string;
  label: string; // "台北 → 福岡"
  durationText: string; // "2 小時 10 分起"
  minPrice: number | null;
}

export interface HolidayPageData {
  facts: HolidayYearFacts;
  sourcePage: string;
  sourceUrl: string;
  /** Flights of ≤ 3.5 h, for 3–4 day breaks. */
  shortTrips: HolidayTripIdea[];
  /** Longer flights, for 5+ day breaks. */
  longTrips: HolidayTripIdea[];
}

type Faq = { q: string; a: string };

const ntd = (n: number) => `NT$${n.toLocaleString('en-US')}`;
const names = (r: { holidays: string[] }) => r.holidays.join('、');
/** Short name for a run: "春節" rather than "小年夜". */
const label = (r: { holidays: string[] }) => (r.holidays.includes('春節') ? '春節' : r.holidays[0]);

function planLabel(p: LeavePlan): string {
  return `請 ${p.leaveDates.length} 休 ${p.totalDays}`;
}

/** Leave dates as compact ranges: "2/11（四）、2/12（五）" → "2/11（四）至 2/12（五）" when consecutive. */
function leaveDatesZh(dates: string[], year: number): string {
  const groups: string[][] = [];
  for (const d of dates) {
    const last = groups.at(-1);
    const prev = last?.at(-1);
    if (last && prev && Date.parse(`${d}T00:00:00Z`) - Date.parse(`${prev}T00:00:00Z`) === 864e5) last.push(d);
    else groups.push([d]);
  }
  return groups.map((g) => formatRangeZh(g[0], g[g.length - 1], year)).join('、');
}

/** The plan with the most free days per day of leave (ties → longer break). */
function bestPlan(plans: LeavePlan[]): LeavePlan | undefined {
  return [...plans].sort(
    (a, b) => b.totalDays / b.leaveDates.length - a.totalDays / a.leaveDates.length || b.totalDays - a.totalDays,
  )[0];
}

function tripList(trips: HolidayTripIdea[]): string {
  return `<ul class="trips">${trips
    .map(
      (t) => `<li><a href="/fly/${escHtml(t.slug)}/">${escHtml(t.label)}</a><span>飛 ${escHtml(t.durationText)}${
        t.minPrice ? ` · 單程 ${ntd(t.minPrice)} 起` : ''
      }</span></li>`,
    )
    .join('')}</ul>`;
}

export function buildHolidayPage(data: HolidayPageData): string {
  const { facts } = data;
  const year = facts.year;
  const roc = year - 1911;
  const canonical = `${SITE_ORIGIN}/holidays/${year}/`;
  const longest: OffRun | undefined = [...facts.longWeekends].sort((a, b) => b.days - a.days || a.start.localeCompare(b.start))[0];
  const best = bestPlan(facts.leavePlans);
  const longestPlan = [...facts.leavePlans].sort((a, b) => b.totalDays - a.totalDays || a.leaveDates.length - b.leaveDates.length)[0];
  const lwCount = facts.longWeekends.length;
  const noMakeupWork = facts.workingWeekends.length === 0;
  const range = (r: { start: string; end: string }) => formatRangeZh(r.start, r.end, year);

  const title = `${year} 連假一覽（民國${roc}年）：${lwCount} 個連假與請假攻略 | 果凍漫遊`;
  const description =
    `${year} 年（民國 ${roc} 年）全年放假 ${facts.totalOffDays} 天，共 ${lwCount} 個三天以上連假` +
    (longest ? `，最長是${label(longest)} ${range(longest)}連休 ${longest.days} 天` : '') +
    (best ? `。請假攻略：${label(best)}${planLabel(best)}` : '') +
    '。依行政院人事行政總處公布的辦公日曆表整理。';

  const faqs: Faq[] = [
    {
      q: `${year} 年有幾個連假？`,
      a: `${year} 年（民國 ${roc} 年）共有 ${lwCount} 個三天以上的連假：${facts.longWeekends
        .map((r) => `${names(r)}（${range(r)}，${r.days} 天）`)
        .join('；')}。全年放假日（含週末）共 ${facts.totalOffDays} 天。`,
    },
  ];
  if (longest) {
    faqs.push({
      q: `${year} 年最長的連假是哪一個？`,
      a: `${label(longest)}，${range(longest)}連續放假 ${longest.days} 天。${
        longestPlan && longestPlan.holidays.includes(label(longest))
          ? `若再請 ${leaveDatesZh(longestPlan.leaveDates, year)}，共 ${longestPlan.leaveDates.length} 天假，可以連休 ${longestPlan.totalDays} 天（${range(longestPlan)}）。`
          : ''
      }`,
    });
  }
  faqs.push({
    q: `${year} 年有補班嗎？`,
    a: noMakeupWork
      ? `沒有。依人事行政總處公布的 ${roc} 年辦公日曆表，${year} 年沒有任何週六補班日。`
      : `有，補班日為 ${facts.workingWeekends.map((d) => formatDateZh(d, year)).join('、')}。`,
  });
  if (best) {
    faqs.push({
      q: `${year} 年怎麼請假最划算？`,
      a: `CP 值最高的是${label(best)}：請 ${leaveDatesZh(best.leaveDates, year)}，${planLabel(best)}（${range(best)}）。${
        longestPlan && longestPlan !== best
          ? `想放長假的話，${label(longestPlan)}請 ${longestPlan.leaveDates.length} 天可以連休 ${longestPlan.totalDays} 天。`
          : ''
      }`,
    });
  }
  if (facts.singleDayHolidays.length > 0) {
    faqs.push({
      q: `${year} 年哪些節日只放一天？`,
      a: `${facts.singleDayHolidays.map((r) => `${names(r)}（${formatDateZh(r.start, year)}）`).join('、')}剛好落在平日，只放當天；可參考下方請假攻略接上週末。`,
    });
  }

  const lead =
    `${year} 年共有 ${lwCount} 個三天以上連假` +
    (longest ? `，最長是${label(longest)} ${longest.days} 天（${range(longest)}）` : '') +
    `；${noMakeupWork ? '全年沒有補班' : `補班 ${facts.workingWeekends.length} 天`}。` +
    (best
      ? `最划算的請假方式是${label(best)}：請 ${leaveDatesZh(best.leaveDates, year)}，就能從 ${formatDateZh(best.start, year)}連休到 ${formatDateZh(best.end, year)}，${planLabel(best)}。`
      : '');

  const longRows = facts.longWeekends
    .map((r) => `<tr><td>${escHtml(names(r))}</td><td>${escHtml(range(r))}</td><td class="num">${r.days} 天</td></tr>`)
    .join('');
  const singleRows = facts.singleDayHolidays
    .map((r) => `<tr><td>${escHtml(names(r))}</td><td>${escHtml(formatDateZh(r.start, year))}</td><td class="num">1 天</td></tr>`)
    .join('');
  const planRows = facts.leavePlans
    .map(
      (p) => `<tr${p === best ? ' class="best"' : ''}><td>${escHtml(names(p))}</td><td>${escHtml(leaveDatesZh(p.leaveDates, year))}</td><td>${escHtml(
        range(p),
      )}</td><td class="num"><strong>${escHtml(planLabel(p))}</strong></td></tr>`,
    )
    .join('');

  const tripsCard =
    data.shortTrips.length + data.longTrips.length > 0
      ? `
  <section class="card">
    <h2>連假出國去哪裡？</h2>
    ${data.shortTrips.length > 0 ? `<h3>3、4 天連假：飛行 3 小時半內</h3>${tripList(data.shortTrips)}` : ''}
    ${data.longTrips.length > 0 ? `<h3>請假湊 5 天以上：可以飛遠一點</h3>${tripList(data.longTrips)}` : ''}
    <p class="muted">飛行時間與票價為近期 Trip.com 直飛航班查詢結果，點進航線頁可看各家航空與時刻。</p>
  </section>`
      : '';

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="RoamJelly 果凍漫遊">
  <meta property="og:locale" content="zh_TW">
  <meta property="og:image" content="${SITE_ORIGIN}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map((f) => ({ '@type': 'Question', 'name': f.q, 'acceptedAnswer': { '@type': 'Answer', 'text': f.a } })),
  })}</script>
  <script type="application/ld+json">${safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': '果凍漫遊', 'item': `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', 'position': 2, 'name': `${year} 連假`, 'item': canonical },
    ],
  })}</script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fbfaf7;color:#1f1511;line-height:1.6}
    .container{max-width:800px;margin:0 auto;padding:24px 16px}
    nav{margin-bottom:24px}
    nav a{color:#b25936;text-decoration:none;font-weight:700;font-size:18px}
    h1{font-size:clamp(22px,4vw,30px);font-weight:800;margin-bottom:8px}
    .subtitle{color:#7b7167;font-size:14px;margin-bottom:20px}
    .lead{font-size:15px;line-height:1.7;color:#493d36;background:#fff;border:1px solid #ece7e0;border-left:4px solid #b25936;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px}
    .card{background:#fff;border:1px solid #ece7e0;border-radius:12px;padding:20px;margin-bottom:20px}
    .card h2{font-size:17px;font-weight:700;margin-bottom:12px}
    .card h3{font-size:15px;font-weight:700;margin:12px 0 6px}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
    .stat{background:#fbfaf7;border-radius:10px;padding:12px}
    .stat b{display:block;font-size:20px;color:#b25936}
    .stat span{font-size:13px;color:#7b7167}
    .table-wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #f1ece5;vertical-align:top}
    th{color:#7b7167;font-weight:600;font-size:13px;white-space:nowrap}
    td.num{white-space:nowrap}
    tr.best td{background:#fff6ef}
    .muted{font-size:13px;color:#7b7167;margin-top:10px}
    .trips{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
    .trips li{border:1px solid #ece7e0;border-radius:10px;padding:10px 12px}
    .trips a{color:#b25936;font-weight:700;text-decoration:none;display:block}
    .trips span{font-size:13px;color:#7b7167}
    .faq{padding:12px 0;border-bottom:1px solid #f7f4ef}
    .faq h3{font-size:15px;margin:0 0 6px}
    .faq p{font-size:14px;color:#5d5249}
    a{color:#b25936}
    footer{text-align:center;color:#a79e94;font-size:13px;margin-top:40px;padding-top:24px;border-top:1px solid #ece7e0}
    footer a{color:#a79e94;margin:0 8px}
  </style>
</head>
<body>
<div class="container">
  <nav><a href="/">← 果凍漫遊</a></nav>
  <h1>${year} 連假一覽（民國 ${roc} 年）與請假攻略</h1>
  <p class="subtitle">依行政院人事行政總處公布的「${roc} 年中華民國政府行政機關辦公日曆表」整理</p>
  <p class="lead">${escHtml(lead)}</p>

  <section class="card">
    <h2>${year} 放假總覽</h2>
    <div class="stats">
      <div class="stat"><b>${facts.totalOffDays} 天</b><span>全年放假日（含週末）</span></div>
      <div class="stat"><b>${lwCount} 個</b><span>三天以上連假</span></div>
      ${longest ? `<div class="stat"><b>${longest.days} 天</b><span>最長連假：${escHtml(label(longest))}</span></div>` : ''}
      <div class="stat"><b>${noMakeupWork ? '無' : `${facts.workingWeekends.length} 天`}</b><span>週六補班</span></div>
    </div>
  </section>

  <section class="card">
    <h2>${year} 連假日期</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>假期</th><th>放假日期</th><th>天數</th></tr></thead>
      <tbody>${longRows}${singleRows}</tbody>
    </table></div>
  </section>

  ${
    planRows
      ? `<section class="card">
    <h2>${year} 請假攻略</h2>
    <p class="muted" style="margin:0 0 10px">把連假接上前後週末，最多請 4 天假。標色的是 CP 值最高的一組。</p>
    <div class="table-wrap"><table>
      <thead><tr><th>假期</th><th>請假日期</th><th>連休日期</th><th>請／休</th></tr></thead>
      <tbody>${planRows}</tbody>
    </table></div>
  </section>`
      : ''
  }
${tripsCard}
  <section class="card">
    <h2>常見問題</h2>
    ${faqs.map((f) => `<div class="faq"><h3>${escHtml(f.q)}</h3><p>${escHtml(f.a)}</p></div>`).join('')}
  </section>

  <section class="card">
    <h2>資料來源</h2>
    <p style="font-size:14px;color:#5d5249">行政院人事行政總處「${roc} 年中華民國政府行政機關辦公日曆表」，取自<a href="${escHtml(data.sourcePage)}" rel="nofollow noopener">政府資料開放平臺</a>（<a href="${escHtml(data.sourceUrl)}" rel="nofollow noopener">CSV</a>）。此表適用於行政機關；民營企業依勞動基準法放假，補假與調移以公司公告為準。</p>
  </section>

  <footer>
    ${siteFooterLinks()}
    <br><br>
    <span>© ${new Date().getFullYear()} RoamJelly 果凍漫遊</span>
  </footer>
</div>
</body>
</html>`;
}
