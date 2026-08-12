// src/server/seo/templates/sitemap.ts
import { KNOWN_ROUTES, KNOWN_DESTINATIONS } from '../cities.js';
import { SITE_ORIGIN } from '../utils.js';
import type { AppRepository } from '../../repositories/appRepository.js';

export async function buildSitemapXml(repo: AppRepository): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const base = SITE_ORIGIN;

  interface SitemapEntry {
    loc: string;
    lastmod: string;
    changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    priority: string;
  }

  const entries: SitemapEntry[] = [
    { loc: `${base}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${base}/pricing`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${base}/guide/`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${base}/guide/collaborative-itinerary-planner`, lastmod: today, changefreq: 'monthly', priority: '0.7' },
    { loc: `${base}/guide/taiwan-travel-planner`, lastmod: today, changefreq: 'monthly', priority: '0.7' },
    { loc: `${base}/guide/group-travel-expense-splitting`, lastmod: today, changefreq: 'monthly', priority: '0.7' },
    { loc: `${base}/fly/`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: `${base}/trips/`, lastmod: today, changefreq: 'daily', priority: '0.9' },
  ];

  KNOWN_ROUTES.forEach((r) => {
    entries.push({ loc: `${base}/fly/${r.slug}/`, lastmod: today, changefreq: 'daily', priority: '0.8' });
  });

  KNOWN_DESTINATIONS.forEach((d) => {
    entries.push({ loc: `${base}/trips/${d.slug}/`, lastmod: today, changefreq: 'daily', priority: '0.8' });
  });

  try {
    const publicTrips = await repo.getPublicTrips(1000);
    publicTrips.forEach((t) => {
      if (String(t.id).startsWith('trip_')) {
        let lastmodDate = today;
        if (t.updatedAt) {
          try {
            lastmodDate = new Date(t.updatedAt).toISOString().split('T')[0];
          } catch {
            lastmodDate = today;
          }
        } else if (t.createdAt) {
          try {
            lastmodDate = new Date(t.createdAt).toISOString().split('T')[0];
          } catch {
            lastmodDate = today;
          }
        }
        entries.push({
          loc: `${base}/trips/${t.id}`,
          lastmod: lastmodDate,
          changefreq: 'daily',
          priority: '0.7',
        });
      }
    });
  } catch (err) {
    console.error('[seo] sitemap UGC trips query failed, serving static entries', err);
  }

  const xmlUrls = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls}\n</urlset>`;
}
