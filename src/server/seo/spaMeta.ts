// src/server/seo/spaMeta.ts
// Rewrites the SPA shell's <head> for server-rendered entry points (/pricing,
// public UGC trip pages) so each URL carries its own title, description,
// canonical and Open Graph tags instead of inheriting the homepage's.
import { escHtml, safeJsonLd } from './utils.js';

export interface SpaPageMeta {
  title: string;
  description: string;
  canonical: string;
  image?: string | null;
  jsonLd?: unknown[];
}

function replaceOrAppend(html: string, pattern: RegExp, tag: string): string {
  if (pattern.test(html)) return html.replace(pattern, () => tag);
  return html.replace('</head>', () => `    ${tag}\n  </head>`);
}

export function injectSpaPageMeta(html: string, meta: SpaPageMeta): string {
  const title = escHtml(meta.title);
  const description = escHtml(meta.description);
  const canonical = escHtml(meta.canonical);

  // Drop every existing canonical first so the page never ends up with two
  // (Google ignores conflicting canonicals and may pick the homepage).
  let out = html.replace(/\s*<link rel="canonical"[^>]*>/gi, '');
  out = out.replace('</head>', () => `    <link rel="canonical" href="${canonical}" />\n  </head>`);

  out = replaceOrAppend(out, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  out = replaceOrAppend(out, /<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${description}" />`);
  out = replaceOrAppend(out, /<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}" />`);
  out = replaceOrAppend(out, /<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
  out = replaceOrAppend(out, /<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
  out = replaceOrAppend(out, /<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
  out = replaceOrAppend(out, /<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`);

  if (meta.image) {
    const image = escHtml(meta.image);
    out = replaceOrAppend(out, /<meta property="og:image" content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${image}" />`);
    out = replaceOrAppend(out, /<meta name="twitter:image" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${image}" />`);
  }

  for (const block of meta.jsonLd ?? []) {
    out = out.replace('</head>', () => `    <script type="application/ld+json">${safeJsonLd(block)}</script>\n  </head>`);
  }

  return out;
}
