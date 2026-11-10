// src/server/seo/templates/itineraryPage.ts
// /trips/{city}/{n}-days/ — a sample day-by-day itinerary that can be copied
// into the app with one click (/?template={id}).
import type { SampleItinerary, SampleStopCategory } from '../../../data/sampleItineraries.js';
import { escHtml, SITE_ORIGIN } from '../utils.js';
import { daysNightsZh, itineraryPath, transferPath, type DestinationContent } from '../destinationContent.js';
import { formatDurationZh } from '../routeFlightFacts.js';
import { faqSection, renderPage, type Faq } from './layout.js';

const CATEGORY_EMOJI: Record<SampleStopCategory, string> = { spot: '📍', food: '🍜', shopping: '🛍️', transport: '🚆' };

const mapsLink = (place: string, city: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place} ${city}`)}`;

export function buildItineraryPage(it: SampleItinerary, content: DestinationContent): string {
  const path = itineraryPath(it);
  const dn = daysNightsZh(it.days);
  const others = content.itineraries.filter((s) => s.id !== it.id);
  const flights = content.routes.filter((r) => r.summary);

  const title = `${it.city} ${dn}自由行行程｜每日景點與交通安排 | 果凍漫遊`;
  const description = `${it.summary}可一鍵複製到果凍漫遊，再依日期與喜好調整。`;

  const faqs: Faq[] = [
    { q: `${it.city}玩 ${it.days} 天夠嗎？`, a: `適合${it.bestFor}。${it.summary}` },
    {
      q: `${it.city} ${dn}怎麼安排？`,
      a: it.dayPlans.map((d) => `第 ${d.day} 天${d.theme}（${d.area}）`).join('；') + '。',
    },
  ];
  if (content.transfers.length > 0) {
    faqs.push({
      q: `從機場怎麼到${it.city}市區？`,
      a: content.transfers
        .map((t) => {
          const fastest = [...t.options].sort((a, b) => a.durationMin - b.durationMin)[0];
          return fastest ? `${t.airportName}到${t.areaName}最快是${fastest.name}，約 ${fastest.durationMin} 分鐘` : '';
        })
        .filter(Boolean)
        .join('；') + '。詳細票價與班次見機場交通頁。',
    });
  }

  const dayCards = it.dayPlans
    .map(
      (d) => `
  <section class="card">
    <h2>第 ${d.day} 天：${escHtml(d.theme)}</h2>
    <p class="muted" style="margin:0 0 10px">區域：${escHtml(d.area)}</p>
    <div class="table-wrap"><table>
      <tbody>${d.stops
        .map(
          (s) => `<tr><td class="num">${escHtml(s.time)}</td><td>${CATEGORY_EMOJI[s.category]} <a href="${escHtml(mapsLink(s.place, it.city))}" rel="nofollow noopener" target="_blank">${escHtml(s.title)}</a>${
            s.note ? `<div class="muted" style="margin-top:2px">${escHtml(s.note)}</div>` : ''
          }</td></tr>`,
        )
        .join('')}</tbody>
    </table></div>
  </section>`,
    )
    .join('');

  const relatedLinks = [
    `<li><a href="/trips/${escHtml(it.destinationSlug)}/">${escHtml(it.city)}旅遊總覽</a></li>`,
    ...others.map((s) => `<li><a href="${itineraryPath(s)}">${escHtml(it.city)} ${daysNightsZh(s.days)}行程</a></li>`),
    ...content.transfers.map((t) => `<li><a href="${transferPath(t)}">${escHtml(t.airportName)}到${escHtml(t.areaName)}</a></li>`),
    ...flights.map(
      (r) => `<li><a href="/fly/${r.route.slug}/">${escHtml(r.route.fromDisplay)}飛${escHtml(r.route.toDisplay)}（約 ${formatDurationZh(r.summary!.minDurationMin)}）</a></li>`,
    ),
  ];

  const body = `
  <h1>${escHtml(it.city)} ${dn}自由行行程</h1>
  <p class="subtitle"><span class="pill">範例行程</span>${
    it.reviewedAt ? `果凍漫遊編輯校對於 ${escHtml(it.reviewedAt)}` : '果凍漫遊 AI 生成初稿'
  }</p>
  <p class="lead">${escHtml(it.summary)} 適合${escHtml(it.bestFor)}。</p>
  <p><a class="cta" href="/?template=${encodeURIComponent(it.id)}" rel="nofollow">複製到我的行程，自己調整</a></p>
  <p class="muted" style="margin:0 0 20px">複製後可以改日期、增刪景點、邀請旅伴一起編輯。</p>
${dayCards}
  <section class="card">
    <h2>行前提醒</h2>
    <ul style="padding-left:20px;font-size:14px;color:#5d5249">${it.tips.map((t) => `<li style="margin:4px 0">${escHtml(t)}</li>`).join('')}</ul>
    <p class="muted">景點開放時間與票價會變動，出發前請以各景點官網為準。</p>
  </section>
${faqSection(faqs)}
  <section class="card">
    <h2>延伸規劃</h2>
    <ul class="links">${relatedLinks.join('')}</ul>
  </section>`;

  return renderPage({
    title,
    description,
    path,
    crumbs: [
      { name: '目的地行程', path: '/trips/' },
      { name: it.city, path: `/trips/${it.destinationSlug}/` },
      { name: `${it.days} 天行程`, path },
    ],
    body,
    faqs,
    noindex: !it.reviewedAt,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        'name': `${it.city} ${dn}自由行行程`,
        'description': it.summary,
        'url': `${SITE_ORIGIN}${path}`,
        'inLanguage': 'zh-TW',
        'itinerary': {
          '@type': 'ItemList',
          'itemListElement': it.dayPlans.flatMap((d) => d.stops)
            .filter((s) => s.category !== 'transport')
            .map((s, i) => ({ '@type': 'ListItem', 'position': i + 1, 'item': { '@type': 'TouristAttraction', 'name': s.title } })),
        },
      },
    ],
  });
}
