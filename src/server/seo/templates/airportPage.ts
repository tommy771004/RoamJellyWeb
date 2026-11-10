// src/server/seo/templates/airportPage.ts
// /airport/{slug}/ — how to get from an airport to a city area, from the
// operators' own published times and fares — and the /airport/ hub.
import type { AirportTransfer, TransferMode, TransferOption } from '../../../data/airportTransfers.js';
import { AIRPORT_TRANSFERS } from '../../../data/airportTransfers.js';
import { escHtml } from '../utils.js';
import { daysNightsZh, destinationName, itineraryPath, transferPath, type DestinationContent } from '../destinationContent.js';
import { faqSection, renderPage, type Faq } from './layout.js';

const MODE_ZH: Record<TransferMode, string> = {
  train: '電車', subway: '地鐵', monorail: '單軌電車', bus: '巴士', taxi: '計程車', rideshare: '叫車', ferry: '渡輪',
};
const CURRENCY_ZH: Record<string, string> = {
  JPY: '日圓', KRW: '韓元', HKD: '港幣', MOP: '澳門幣', SGD: '新幣', THB: '泰銖', MYR: '令吉', VND: '越南盾', PHP: '披索', TWD: '台幣',
};

export function formatFare(fare: TransferOption['fare']): string {
  if (!fare) return '—';
  const amount = fare.amountMax ? `${fare.amount.toLocaleString('en-US')}–${fare.amountMax.toLocaleString('en-US')}` : fare.amount.toLocaleString('en-US');
  return `${amount} ${CURRENCY_ZH[fare.currency] ?? fare.currency}`;
}

const durationText = (o: TransferOption) => `${o.durationSource === 'estimate' ? '約 ' : ''}${o.durationMin} 分鐘`;

/** Fastest option, and the cheapest among options with a stated fare in one currency. */
export function transferHighlights(t: AirportTransfer): { fastest?: TransferOption; cheapest?: TransferOption } {
  const fastest = [...t.options].sort((a, b) => a.durationMin - b.durationMin)[0];
  const priced = t.options.filter((o) => o.fare);
  const currency = priced[0]?.fare?.currency;
  const sameCurrency = priced.filter((o) => o.fare!.currency === currency);
  const cheapest = sameCurrency.length >= 2 ? [...sameCurrency].sort((a, b) => a.fare!.amount - b.fare!.amount)[0] : undefined;
  return { fastest, cheapest };
}

export function buildAirportPage(t: AirportTransfer, content: DestinationContent): string {
  const path = transferPath(t);
  const city = destinationName(t.destinationSlug);
  const { fastest, cheapest } = transferHighlights(t);
  const modes = [...new Set(t.options.map((o) => MODE_ZH[o.mode]))];

  const title = `${t.airportName}到${t.areaName}怎麼去？${modes.join('、')}時間與票價 | 果凍漫遊`;
  const leadParts = [
    `${t.airportName}（${t.airportCode}）到${t.areaName}有 ${t.options.length} 種主要交通方式：${t.options.map((o) => o.name).join('、')}。`,
    fastest ? `最快是${fastest.name}，${durationText(fastest)}${fastest.fare ? `，${formatFare(fastest.fare)}` : ''}。` : '',
    cheapest && cheapest !== fastest ? `最便宜是${cheapest.name}，${formatFare(cheapest.fare)}，${durationText(cheapest)}。` : '',
  ];
  const lead = leadParts.join('');
  const description = `${lead}依各營運單位官網整理，查核日期 ${t.verifiedAt}。`;

  const faqs: Faq[] = [
    { q: `${t.airportName}到${t.areaName}怎麼去？`, a: lead },
  ];
  if (fastest) {
    faqs.push({
      q: `${t.airportName}到${t.areaName}要多久？`,
      a: t.options.map((o) => `${o.name}${durationText(o)}${o.transfers > 0 ? `（轉乘 ${o.transfers} 次）` : ''}`).join('；') + '。',
    });
  }
  const priced = t.options.filter((o) => o.fare);
  if (priced.length > 0) {
    faqs.push({
      q: `${t.airportName}到${t.areaName}多少錢？`,
      a: priced.map((o) => `${o.name} ${formatFare(o.fare)}${o.fare!.note ? `（${o.fare!.note}）` : ''}`).join('；') + `。以上為官網標示的單程價格（計程車為每車），查核日期 ${t.verifiedAt}。`,
    });
  }

  const rows = t.options
    .map(
      (o) => `<tr><td><strong>${escHtml(o.name)}</strong><div class="muted" style="margin-top:2px">${escHtml(MODE_ZH[o.mode])} · ${escHtml(o.operator)}</div></td><td>${escHtml(o.from)} → ${escHtml(o.to)}${
        o.transfers > 0 ? `<div class="muted" style="margin-top:2px">轉乘 ${o.transfers} 次</div>` : ''
      }</td><td class="num">${escHtml(durationText(o))}</td><td class="num">${escHtml(formatFare(o.fare))}</td></tr>`,
    )
    .join('');

  const details = t.options
    .map(
      (o) => `<div class="faq">
      <h3>${escHtml(o.name)}</h3>
      <p>${[
        o.frequency ? `班次：${o.frequency}` : '',
        o.reservation ? `座位：${o.reservation}` : '',
        o.fare?.note ? `票價說明：${o.fare.note}` : '',
        o.notes ?? '',
      ]
        .filter(Boolean)
        .map(escHtml)
        .join('<br>')}</p>
      <p class="muted" style="margin-top:4px">資料來源：<a href="${escHtml(o.sourceUrl)}" rel="nofollow noopener" target="_blank">${escHtml(new URL(o.sourceUrl).hostname)}</a></p>
    </div>`,
    )
    .join('');

  const related = [
    `<li><a href="/trips/${escHtml(t.destinationSlug)}/">${escHtml(city)}旅遊總覽</a></li>`,
    ...content.transfers.filter((x) => x.slug !== t.slug).map((x) => `<li><a href="${transferPath(x)}">${escHtml(x.airportName)}到${escHtml(x.areaName)}</a></li>`),
    ...content.itineraries.map((s) => `<li><a href="${itineraryPath(s)}">${escHtml(s.city)} ${daysNightsZh(s.days)}行程</a></li>`),
    ...content.routes
      .filter((r) => r.route.toCode === t.airportCode && r.summary)
      .map((r) => `<li><a href="/fly/${r.route.slug}/">${escHtml(r.route.fromDisplay)}飛${escHtml(r.route.toDisplay)}</a></li>`),
  ];

  const body = `
  <h1>${escHtml(t.airportName)}到${escHtml(t.areaName)}怎麼去？</h1>
  <p class="subtitle">${escHtml(t.airportCode)} → ${escHtml(t.areaName)} · 依各營運單位官網整理，查核日期 ${escHtml(t.verifiedAt)}</p>
  <p class="lead">${escHtml(lead)}</p>
  <section class="card">
    <h2>交通方式比較</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>交通方式</th><th>上車 → 下車</th><th>時間</th><th>成人單程</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="muted">時間為官方標示的乘車時間（標「約」者為一般情況估計），不含候車與步行；票價以查核當日官網為準，「—」表示官網未標示固定票價。</p>
  </section>
  <section class="card">
    <h2>各交通方式說明</h2>
    ${details}
  </section>
${faqSection(faqs)}
  <section class="card">
    <h2>延伸規劃</h2>
    <ul class="links">${related.join('')}</ul>
  </section>`;

  return renderPage({
    title,
    description,
    path,
    crumbs: [
      { name: '機場交通', path: '/airport/' },
      { name: `${t.airportName}到${t.areaName}`, path },
    ],
    body,
    faqs,
  });
}

export function buildAirportHubPage(): string {
  const byCity = new Map<string, AirportTransfer[]>();
  for (const t of AIRPORT_TRANSFERS) {
    const list = byCity.get(t.destinationSlug) ?? [];
    list.push(t);
    byCity.set(t.destinationSlug, list);
  }
  const sections = [...byCity.entries()]
    .map(
      ([slug, list]) => `<h3>${escHtml(destinationName(slug))}</h3>
    <ul class="links">${list.map((t) => `<li><a href="${transferPath(t)}">${escHtml(t.airportName)}到${escHtml(t.areaName)}</a></li>`).join('')}</ul>`,
    )
    .join('');

  return renderPage({
    title: '機場到市區交通攻略：日本、韓國、東南亞主要機場 | 果凍漫遊',
    description: '整理台灣旅客常去的日本、韓國、香港、東南亞機場到市區的交通方式、乘車時間與票價，資料取自各營運單位官網。',
    path: '/airport/',
    crumbs: [{ name: '機場交通', path: '/airport/' }],
    ogType: 'website',
    body: `
  <h1>機場到市區交通攻略</h1>
  <p class="subtitle">各機場到市區的電車、巴士與計程車，時間與票價取自營運單位官網</p>
  <section class="card">${sections || '<p class="muted">資料整理中。</p>'}</section>`,
  });
}
