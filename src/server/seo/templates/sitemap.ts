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
  
  // UGC Public Trips
  const publicTrips = await repo.getPublicTrips(100);
  const ugcUrls = publicTrips.map((t) => `${base}/trips/${t.id}`);

  const allUrls = [...staticUrls, ...routeUrls, ...destUrls, ...ugcUrls];

  const entries = allUrls
    .map((url) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}
