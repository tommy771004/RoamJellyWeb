// src/server/seo/router.ts
import { Router, type Request, type Response, type NextFunction } from 'express';
import { AppRepository } from '../repositories/appRepository.js';
import { buildRouteData, buildDestinationData } from './seoDataService.js';
import { buildRoutePage } from './templates/routePage.js';
import { buildDestinationPage } from './templates/destinationPage.js';
import { buildRouteHubPage, buildDestinationHubPage } from './templates/hubPage.js';
import { buildSitemapXml } from './templates/sitemap.js';
import { KNOWN_ROUTES, KNOWN_DESTINATIONS } from './cities.js';

export function createSeoRouter(repo: AppRepository): Router {
  const router = Router();

  // Cache TTL: 1 hour (pages are slow to generate, data changes infrequently)
  const CACHE_MS = 60 * 60 * 1000;
  const cache = new Map<string, { html: string; expiresAt: number }>();

  function getCached(key: string): string | null {
    const entry = cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) return null;
    return entry.html;
  }

  function setCached(key: string, html: string): void {
    cache.set(key, { html, expiresAt: Date.now() + CACHE_MS });
  }

  router.get('/sitemap.xml', async (_req: Request, res: Response) => {
    try {
      const xml = await buildSitemapXml(repo);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).send(xml);
    } catch (err) {
      console.error('[seo] /sitemap.xml error, falling back to static XML:', (err as Error)?.message, err);
      try {
        const today = new Date().toISOString().split('T')[0];
        const base = 'https://roam-jelly-web.vercel.app';
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
        const allUrls = [...staticUrls, ...routeUrls, ...destUrls];
        const entries = allUrls
          .map((url) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`)
          .join('\n');
        const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.status(200).send(fallbackXml);
      } catch (fallbackErr) {
        console.error('[seo] /sitemap.xml hard-fallback failed:', (fallbackErr as Error)?.message, fallbackErr);
        const ultraMinimalXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://roam-jelly-web.vercel.app/</loc>\n  </url>\n</urlset>`;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(ultraMinimalXml);
      }
    }
  });

  // Route hub: /fly/
  router.get('/fly/', (_req: Request, res: Response) => {
    const cached = getCached('__fly_hub__');
    if (cached) { res.setHeader('Cache-Control', 'public, max-age=3600'); res.send(cached); return; }
    const html = buildRouteHubPage();
    setCached('__fly_hub__', html);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(html);
  });

  // Destination hub: /trips/
  router.get('/trips/', (_req: Request, res: Response) => {
    const cached = getCached('__trips_hub__');
    if (cached) { res.setHeader('Cache-Control', 'public, max-age=3600'); res.send(cached); return; }
    const html = buildDestinationHubPage();
    setCached('__trips_hub__', html);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(html);
  });

  // Route detail: /fly/tpe-nrt/
  router.get('/fly/:slug/', async (req: Request, res: Response) => {
    const { slug } = req.params;
    // Validate against known routes to prevent arbitrary DB queries
    if (!KNOWN_ROUTES.some((r) => r.slug === slug)) {
      res.status(404).send('Not found');
      return;
    }
    const cacheKey = `fly:${slug}`;
    const cached = getCached(cacheKey);
    if (cached) { res.setHeader('Cache-Control', 'public, max-age=3600'); res.send(cached); return; }

    try {
      const data = await buildRouteData(slug, repo);
      if (!data) { res.status(404).send('Not found'); return; }

      const html = buildRoutePage(data);
      setCached(cacheKey, html);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(html);
    } catch (err) {
      console.error('[seo] /fly/:slug error:', (err as Error)?.message, err);
      res.status(500).send('Internal Server Error');
    }
  });

  // Destination detail: /trips/tokyo/
  // UGC trip pages (/trips/trip_*) are handled by the app-level route in
  // server.ts — fall through instead of 404ing them here.
  router.get('/trips/:slug/', async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    if (slug.startsWith('trip_')) {
      next();
      return;
    }
    if (!KNOWN_DESTINATIONS.some((d) => d.slug === slug)) {
      res.status(404).send('Not found');
      return;
    }
    const cacheKey = `trips:${slug}`;
    const cached = getCached(cacheKey);
    if (cached) { res.setHeader('Cache-Control', 'public, max-age=3600'); res.send(cached); return; }

    try {
      const data = await buildDestinationData(slug, repo);
      if (!data) { res.status(404).send('Not found'); return; }

      const html = buildDestinationPage(data);
      setCached(cacheKey, html);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(html);
    } catch (err) {
      console.error('[seo] /trips/:slug error:', (err as Error)?.message, err);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
