// src/server/seo/templates/destinationPage.ts
// /trips/{city}/ — a destination overview built from fixed content (sample
// itineraries, airport transfers, nonstop flights) with travellers' public
// trips as an extra. Title, sections and FAQ follow what actually exists.
import type { DestinationData, PublicTrip } from '../types.js';
import { escHtml, SITE_ORIGIN } from '../utils.js';
import { daysNightsZh, itineraryPath, transferPath, type DestinationContent } from '../destinationContent.js';
import { formatDurationRangeZh, formatDurationZh } from '../routeFlightFacts.js';
import { formatFare, transferHighlights } from './airportPage.js';
import { faqSection, renderPage, type Faq } from './layout.js';

/** Trips with fewer stops than this are placeholders (e.g. seeded demo trips), not itineraries. */
export const MIN_TRIP_STOPS = 3;

const ntd = (n: number) => `NT$${n.toLocaleString('en-US')}`;

function renderTrip(trip: PublicTrip): string {
  const byDay = new Map<number, typeof trip.nodes>();
  for (const node of trip.nodes) {
    if (!byDay.has(node.day)) byDay.set(node.day, []);
    byDay.get(node.day)!.push(node);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a - b).slice(0, 3);
  return `
    <div class="faq">
      <h3>${escHtml(trip.name)} <span class="muted">· ${trip.forkCount} 人複製</span></h3>
      ${days
        .map(
          ([day, nodes]) => `<p><strong>第 ${day} 天</strong>：${nodes.map((n) => escHtml(n.title)).join(' → ')}</p>`,
        )
        .join('')}
      ${trip.id.startsWith('trip_') ? `<p class="muted" style="margin-top:4px"><a href="/trips/${encodeURIComponent(trip.id)}">查看完整行程</a></p>` : ''}
    </div>`;
}

export function buildDestinationPage(data: DestinationData, content: DestinationContent): string {
  const city = data.displayName;
  const path = `/trips/${data.slug}/`;
  const trips = data.trips.filter((t) => t.nodes.length >= MIN_TRIP_STOPS);
  const { itineraries, transfers } = content;
  const flights = content.routes.filter((r) => r.summary);

  const dayList = itineraries.map((s) => `${s.days} 天`).join('、');
  let title: string;
  if (itineraries.length > 0) {
    title = `${city}自由行行程｜${dayList}行程範例${transfers.length > 0 ? '與機場交通' : ''} | 果凍漫遊`;
  } else if (transfers.length > 0 || flights.length > 0) {
    title = `${city}自由行攻略｜${[transfers.length > 0 ? '機場交通' : '', flights.length > 0 ? '直飛航班' : ''].filter(Boolean).join('、')}與行程規劃 | 果凍漫遊`;
  } else {
    title = `${city}旅遊行程推薦 — 真實旅人規劃的行程 | 果凍漫遊`;
  }

  const leadParts: string[] = [];
  if (flights.length > 0) {
    const f = flights[0];
    leadParts.push(`從${f.route.fromDisplay}直飛${f.route.toDisplay}約 ${formatDurationRangeZh(f.summary!.minDurationMin, f.summary!.maxDurationMin)}。`);
  }
  for (const t of transfers.slice(0, 2)) {
    const { fastest } = transferHighlights(t);
    if (fastest) leadParts.push(`${t.airportName}到${t.areaName}搭${fastest.name}約 ${fastest.durationMin} 分鐘。`);
  }
  if (itineraries.length > 0) leadParts.push(`本頁整理 ${dayList}的範例行程，可一鍵複製後自己調整。`);
  if (trips.length > 0) leadParts.push(`另有 ${trips.length} 份旅人公開分享的${city}行程可以參考。`);
  const lead =
    leadParts.length > 0
      ? leadParts.join('')
      : `${city}的公開行程仍在累積中。你可以在果凍漫遊免費建立${city}行程，AI 會依天數與偏好生成初稿，並支援旅伴即時共編。`;
  const description = `${city}自由行規劃：${lead}`.slice(0, 160);

  const faqs: Faq[] = [];
  if (itineraries.length > 0) {
    faqs.push({
      q: `${city}自由行要玩幾天？`,
      a: itineraries.map((s) => `${daysNightsZh(s.days)}適合${s.bestFor}`).join('；') + '。各天數的每日安排見範例行程。',
    });
  }
  if (flights.length > 0) {
    faqs.push({
      q: `從台灣飛${city}要多久？`,
      a: flights
        .map((f) => `${f.route.fromDisplay}（${f.route.fromCode}）直飛${f.route.toDisplay}（${f.route.toCode}）約 ${formatDurationRangeZh(f.summary!.minDurationMin, f.summary!.maxDurationMin)}`)
        .join('；') + '。',
    });
  }
  if (transfers.length > 0) {
    faqs.push({
      q: `${city}機場怎麼到市區？`,
      a: transfers
        .map((t) => `${t.airportName}到${t.areaName}可搭${t.options.map((o) => o.name).join('、')}`)
        .join('；') + '。各方式的時間與票價見機場交通頁。',
    });
  }
  if (trips.length > 0) {
    faqs.push({
      q: `這些${city}行程可以直接複製使用嗎？`,
      a: `可以。範例行程與旅人公開分享的行程都能免費複製到自己的帳號，再調整景點、天數與時段。`,
    });
  }
  faqs.push({
    q: `用果凍漫遊規劃${city}旅遊需要付費嗎？`,
    a: `早鳥階段免費。建立行程、AI 生成、旅伴即時共編與多幣別分帳目前皆可免費使用。`,
  });

  const itinerarySection =
    itineraries.length > 0
      ? `<section class="card">
    <h2>${escHtml(city)}行程範例</h2>
    ${itineraries
      .map(
        (s) => `<div class="faq"><h3><a href="${itineraryPath(s)}">${escHtml(city)} ${daysNightsZh(s.days)}行程</a></h3><p>${escHtml(s.summary)}</p></div>`,
      )
      .join('')}
  </section>`
      : '';

  const transferSection =
    transfers.length > 0
      ? `<section class="card">
    <h2>機場到市區交通</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>路線</th><th>最快</th><th>參考票價</th></tr></thead>
      <tbody>${transfers
        .map((t) => {
          const { fastest } = transferHighlights(t);
          return `<tr><td><a href="${transferPath(t)}">${escHtml(t.airportName)}到${escHtml(t.areaName)}</a></td><td>${
            fastest ? `${escHtml(fastest.name)} ${fastest.durationMin} 分鐘` : '—'
          }</td><td class="num">${fastest ? escHtml(formatFare(fastest.fare)) : '—'}</td></tr>`;
        })
        .join('')}</tbody>
    </table></div>
  </section>`
      : '';

  const flightSection =
    flights.length > 0
      ? `<section class="card">
    <h2>台灣直飛${escHtml(city)}</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>航線</th><th>飛行時間</th><th>直飛航空</th><th>近期單程最低</th></tr></thead>
      <tbody>${flights
        .map(
          (f) => `<tr><td><a href="/fly/${f.route.slug}/">${escHtml(f.route.fromDisplay)} → ${escHtml(f.route.toDisplay)}</a></td><td class="num">${escHtml(
            formatDurationZh(f.summary!.minDurationMin),
          )}起</td><td class="num">${f.summary!.airlines.length} 家</td><td class="num">${ntd(f.summary!.minPrice)}</td></tr>`,
        )
        .join('')}</tbody>
    </table></div>
    <p class="muted">票價為近期在 Trip.com 查到的單程經濟艙價格，會隨日期變動。</p>
  </section>`
      : '';

  const tripsSection =
    trips.length > 0
      ? `<section class="card">
    <h2>旅人分享的${escHtml(city)}行程</h2>
    ${trips.slice(0, 5).map(renderTrip).join('')}
  </section>`
      : '';

  const body = `
  <h1>${escHtml(title.replace(/ \| 果凍漫遊$/, ''))}</h1>
  <p class="subtitle">果凍漫遊整理的${escHtml(city)}行程、交通與航班資訊</p>
  <p class="lead">${escHtml(lead)}</p>
${itinerarySection}
${transferSection}
${flightSection}
${tripsSection}
  <p><a class="cta" href="/">免費開始規劃你的${escHtml(city)}行程</a></p>
${faqSection(faqs)}
  <section class="card">
    <h2>其他目的地</h2>
    <ul class="links"><li><a href="/trips/">所有目的地</a></li><li><a href="/fly/">所有航線</a></li></ul>
  </section>`;

  const listItems = [
    ...itineraries.map((s) => ({ name: `${city} ${daysNightsZh(s.days)}行程`, url: `${SITE_ORIGIN}${itineraryPath(s)}` })),
    ...trips.slice(0, 5).filter((t) => t.id.startsWith('trip_')).map((t) => ({ name: t.name, url: `${SITE_ORIGIN}/trips/${encodeURIComponent(t.id)}` })),
  ];

  return renderPage({
    title,
    description,
    path,
    crumbs: [
      { name: '目的地行程', path: '/trips/' },
      { name: city, path },
    ],
    body,
    faqs,
    ogType: 'website',
    jsonLd:
      listItems.length > 0
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              'name': `${city}行程`,
              'url': `${SITE_ORIGIN}${path}`,
              'itemListElement': listItems.map((it, i) => ({ '@type': 'ListItem', 'position': i + 1, 'name': it.name, 'url': it.url })),
            },
          ]
        : [],
  });
}
