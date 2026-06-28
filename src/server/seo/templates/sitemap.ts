// src/server/seo/templates/sitemap.ts
import { KNOWN_ROUTES, KNOWN_DESTINATIONS } from '../cities.js';
import { SITE_ORIGIN } from '../utils.js';
import type { AppRepository } from '../../repositories/appRepository.js';

export async function buildSitemapXml(repo: AppRepository): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const base = SITE_ORIGIN;

  const staticUrls = [
    `${base}/`,
    `${base}/pricing`,
    `${base}/guide/`,
    `${base}/guide/collaborative-itinerary-planner`,
    `${base}/guide/taiwan-travel-planner`,
    `${base}/guide/group-travel-expense-splitting`,
    `${base}/fly/`,
    `${base}/trips/`,
  ];

  const routeUrls = KNOWN_ROUTES.map((r) => `${base}/fly/${r.slug}/`);
  const destUrls = KNOWN_DESTINATIONS.map((d) => `${base}/trips/${d.slug}/`);

  // UGC Public Trips — never let a DB hiccup fail the whole sitemap (a 500 here
  // makes Vercel serve an HTML error page, which Search Console rejects as
  // "Sitemap is HTML"). Degrade gracefully to the static/route/destination URLs.
  let ugcUrls: string[] = [];
  try {
    const publicTrips = await repo.getPublicTrips(100);
    // Only list trips the UGC SEO handler actually enhances (it requires a
    // `trip_` prefix). Excludes legacy/demo ids (e.g. h1/h2/h3) that would
    // otherwise surface as thin, metadata-less SPA pages.
    ugcUrls = publicTrips
      .filter((t) => String(t.id).startsWith('trip_'))
      .map((t) => `${base}/trips/${t.id}`);
  } catch (err) {
    console.error('[seo] sitemap UGC trips query failed, serving without them', err);
  }

  const allUrls = [...staticUrls, ...routeUrls, ...destUrls, ...ugcUrls];

  const entries = allUrls
    .map((url) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`)
    .join('\n');

  // No <?xml-stylesheet?> PI: a browser-only cosmetic that points at /sitemap.xsl.
  // If that XSL ever resolves to HTML (SPA fallback), fetchers can mislabel the
  // whole sitemap as "HTML". Bare XML is maximally compatible with Search Console.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}
