// src/server/seo/templates/layout.ts
// Shared shell for the server-rendered SEO pages added in phase 2
// (airport transfers, sample itineraries). Older templates keep their own.
import { escHtml, safeJsonLd, SITE_ORIGIN } from '../utils.js';
import { holidayFooterLink } from '../longWeekends.js';

export type Faq = { q: string; a: string };

export interface PageShell {
  title: string;
  description: string;
  /** Path starting and ending with "/", e.g. "/airport/". */
  path: string;
  /** Breadcrumb after 果凍漫遊, last entry = this page. */
  crumbs: Array<{ name: string; path: string }>;
  body: string;
  faqs?: Faq[];
  jsonLd?: object[];
  /** Drafts are rendered but kept out of the index. */
  noindex?: boolean;
  ogType?: 'website' | 'article';
}

export const SHELL_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fbfaf7;color:#1f1511;line-height:1.6}
  .container{max-width:800px;margin:0 auto;padding:24px 16px}
  nav.crumbs{margin-bottom:24px;font-size:14px;color:#a79e94}
  nav.crumbs a{color:#b25936;text-decoration:none;font-weight:700}
  h1{font-size:clamp(22px,4vw,30px);font-weight:800;margin-bottom:8px}
  .subtitle{color:#7b7167;font-size:14px;margin-bottom:20px}
  .lead{font-size:15px;line-height:1.7;color:#493d36;background:#fff;border:1px solid #ece7e0;border-left:4px solid #b25936;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px}
  .card{background:#fff;border:1px solid #ece7e0;border-radius:12px;padding:20px;margin-bottom:20px}
  .card h2{font-size:17px;font-weight:700;margin-bottom:12px}
  .card h3{font-size:15px;font-weight:700;margin:12px 0 6px}
  .table-wrap{overflow-x:auto}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #f1ece5;vertical-align:top}
  th{color:#7b7167;font-weight:600;font-size:13px;white-space:nowrap}
  td.num{white-space:nowrap}
  .muted{font-size:13px;color:#7b7167;margin-top:10px}
  .pill{display:inline-block;background:#fbf2ec;color:#a04e30;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;margin-right:6px}
  .links{list-style:none;display:flex;flex-wrap:wrap;gap:8px}
  .links a{display:inline-block;border:1px solid #ece7e0;border-radius:20px;padding:6px 14px;color:#b25936;text-decoration:none;font-size:14px;background:#fff}
  .cta{display:inline-block;background:#b25936;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:10px;margin:4px 0 8px}
  .faq{padding:12px 0;border-bottom:1px solid #f7f4ef}
  .faq h3{font-size:15px;margin:0 0 6px}
  .faq p{font-size:14px;color:#5d5249}
  a{color:#b25936}
  footer{text-align:center;color:#a79e94;font-size:13px;margin-top:40px;padding-top:24px;border-top:1px solid #ece7e0}
  footer a{color:#a79e94;margin:0 8px}
`;

export function faqSection(faqs: Faq[]): string {
  if (faqs.length === 0) return '';
  return `<section class="card">
    <h2>常見問題</h2>
    ${faqs.map((f) => `<div class="faq"><h3>${escHtml(f.q)}</h3><p>${escHtml(f.a)}</p></div>`).join('')}
  </section>`;
}

export function renderPage(page: PageShell): string {
  const canonical = `${SITE_ORIGIN}${page.path}`;
  const crumbs = [{ name: '果凍漫遊', path: '/' }, ...page.crumbs];
  const jsonLd: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': crumbs.map((c, i) => ({ '@type': 'ListItem', 'position': i + 1, 'name': c.name, 'item': `${SITE_ORIGIN}${c.path}` })),
    },
    ...(page.faqs && page.faqs.length > 0
      ? [{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          'mainEntity': page.faqs.map((f) => ({ '@type': 'Question', 'name': f.q, 'acceptedAnswer': { '@type': 'Answer', 'text': f.a } })),
        }]
      : []),
    ...(page.jsonLd ?? []),
  ];
  const crumbHtml = crumbs
    .slice(0, -1)
    .map((c) => `<a href="${escHtml(c.path)}">${escHtml(c.name)}</a>`)
    .join(' › ');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(page.title)}</title>
  <meta name="description" content="${escHtml(page.description)}">
  ${page.noindex ? '<meta name="robots" content="noindex, follow">' : ''}
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="${page.ogType ?? 'article'}">
  <meta property="og:title" content="${escHtml(page.title)}">
  <meta property="og:description" content="${escHtml(page.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="RoamJelly 果凍漫遊">
  <meta property="og:locale" content="zh_TW">
  <meta property="og:image" content="${SITE_ORIGIN}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
${jsonLd.map((obj) => `  <script type="application/ld+json">${safeJsonLd(obj)}</script>`).join('\n')}
  <style>${SHELL_CSS}</style>
</head>
<body>
<div class="container">
  <nav class="crumbs">${crumbHtml}</nav>
${page.body}
  <footer>
    <a href="/">果凍漫遊</a>
    <a href="/fly/">航線資訊</a>
    <a href="/trips/">目的地行程</a>
    <a href="/airport/">機場交通</a>
    ${holidayFooterLink()}
    <br><br>
    <span>© ${new Date().getFullYear()} RoamJelly 果凍漫遊</span>
  </footer>
</div>
</body>
</html>`;
}
