// src/server/seo/router.ts
import { Router, type Request, type Response, type NextFunction } from 'express';
import { AppRepository } from '../repositories/appRepository.js';
import { buildRouteData, buildDestinationData, buildHolidayPageData, HOLIDAY_YEARS } from './seoDataService.js';
import { buildHolidayPage } from './templates/holidayPage.js';
import { buildItineraryPage } from './templates/itineraryPage.js';
import { buildAirportHubPage, buildAirportPage } from './templates/airportPage.js';
import { getDestinationContent, getItineraryByPath, getTransferBySlug } from './destinationContent.js';
import { buildRoutePage } from './templates/routePage.js';
import { buildDestinationPage } from './templates/destinationPage.js';
import { buildRouteHubPage, buildDestinationHubPage } from './templates/hubPage.js';
import { buildSitemapXml, buildSitemapEntries, renderSitemapXml } from './templates/sitemap.js';
import { SITE_ORIGIN } from './utils.js';
import { KNOWN_ROUTES, KNOWN_DESTINATIONS } from './cities.js';

// `s-maxage` lets the CDN in front of the function hold a page, so repeat
// crawler requests need not run the function (and, for data-backed pages, the
// database). The sitemap keeps browser-only caching: it can degrade to a
// partial list when the database is down, and that must not be held at the edge.
const PAGE_CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';

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
        // Static entries only (no DB); data-driven pages simply carry no lastmod.
        const fallbackXml = renderSitemapXml(buildSitemapEntries({ routeSearches: [], publicTrips: [] }));
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.status(200).send(fallbackXml);
      } catch (fallbackErr) {
        console.error('[seo] /sitemap.xml hard-fallback failed:', (fallbackErr as Error)?.message, fallbackErr);
        const ultraMinimalXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SITE_ORIGIN}/</loc>\n  </url>\n</urlset>`;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(ultraMinimalXml);
      }
    }
  });

  // Route hub: /fly/
  router.get('/fly/', (_req: Request, res: Response) => {
    const cached = getCached('__fly_hub__');
    if (cached) { res.setHeader('Cache-Control', PAGE_CACHE_CONTROL); res.send(cached); return; }
    const html = buildRouteHubPage();
    setCached('__fly_hub__', html);
    res.setHeader('Cache-Control', PAGE_CACHE_CONTROL);
    res.send(html);
  });

  // Destination hub: /trips/
  router.get('/trips/', (_req: Request, res: Response) => {
    const cached = getCached('__trips_hub__');
    if (cached) { res.setHeader('Cache-Control', PAGE_CACHE_CONTROL); res.send(cached); return; }
    const html = buildDestinationHubPage();
    setCached('__trips_hub__', html);
    res.setHeader('Cache-Control', PAGE_CACHE_CONTROL);
    res.send(html);
  });

  // Long weekends: /holidays/ → the newest year with a calendar; /holidays/2027/
  router.get('/holidays/', (_req: Request, res: Response) => {
    const latest = HOLIDAY_YEARS[HOLIDAY_YEARS.length - 1];
    if (!latest) { res.status(404).send('Not found'); return; }
    res.redirect(302, `/holidays/${latest}/`);
  });

  router.get('/holidays/:year/', (req: Request, res: Response) => {
    const year = Number(req.params.year);
    if (!/^\d{4}$/.test(req.params.year) || !HOLIDAY_YEARS.includes(year)) {
      res.status(404).send('Not found');
      return;
    }
    if (!req.path.endsWith('/')) { res.redirect(308, `/holidays/${year}/`); return; }
    const cacheKey = `holidays:${year}`;
    const cached = getCached(cacheKey);
    if (cached) { res.setHeader('Cache-Control', PAGE_CACHE_CONTROL); res.send(cached); return; }
    const data = buildHolidayPageData(year);
    if (!data) { res.status(404).send('Not found'); return; }
    const html = buildHolidayPage(data);
    setCached(cacheKey, html);
    res.setHeader('Cache-Control', PAGE_CACHE_CONTROL);
    res.send(html);
  });

  function sendHtml(res: Response, cacheKey: string, build: () => string): void {
    let html = getCached(cacheKey);
    if (!html) {
      html = build();
      setCached(cacheKey, html);
    }
    res.setHeader('Cache-Control', PAGE_CACHE_CONTROL);
    res.send(html);
  }

  // Airport transfers: /airport/ and /airport/fukuoka-airport-to-hakata/
  router.get('/airport/', (_req: Request, res: Response) => {
    sendHtml(res, '__airport_hub__', buildAirportHubPage);
  });

  router.get('/airport/:slug/', (req: Request, res: Response) => {
    const transfer = getTransferBySlug(req.params.slug);
    if (!transfer) { res.status(404).send('Not found'); return; }
    if (!req.path.endsWith('/')) { res.redirect(308, `/airport/${transfer.slug}/`); return; }
    sendHtml(res, `airport:${transfer.slug}`, () => buildAirportPage(transfer, getDestinationContent(transfer.destinationSlug)));
  });

  // Sample itineraries: /trips/fukuoka/3-days/
  router.get('/trips/:slug/:plan/', (req: Request, res: Response) => {
    const itinerary = getItineraryByPath(req.params.slug, req.params.plan);
    if (!itinerary) { res.status(404).send('Not found'); return; }
    if (!req.path.endsWith('/')) { res.redirect(308, `/trips/${itinerary.destinationSlug}/${itinerary.days}-days/`); return; }
    sendHtml(res, `itinerary:${itinerary.id}`, () => buildItineraryPage(itinerary, getDestinationContent(itinerary.destinationSlug)));
  });

  // Route detail: /fly/tpe-nrt/
  router.get('/fly/:slug/', async (req: Request, res: Response) => {
    const { slug } = req.params;
    // Validate against known routes to prevent arbitrary DB queries
    if (!KNOWN_ROUTES.some((r) => r.slug === slug)) {
      res.status(404).send('Not found');
      return;
    }
    if (!req.path.endsWith('/')) { res.redirect(308, `/fly/${slug}/`); return; }
    const cacheKey = `fly:${slug}`;
    const cached = getCached(cacheKey);
    if (cached) { res.setHeader('Cache-Control', PAGE_CACHE_CONTROL); res.send(cached); return; }

    try {
      const data = await buildRouteData(slug, repo);
      if (!data) { res.status(404).send('Not found'); return; }

      const html = buildRoutePage(data);
      setCached(cacheKey, html);
      res.setHeader('Cache-Control', PAGE_CACHE_CONTROL);
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
    if (!req.path.endsWith('/')) { res.redirect(308, `/trips/${slug}/`); return; }
    const cacheKey = `trips:${slug}`;
    const cached = getCached(cacheKey);
    if (cached) { res.setHeader('Cache-Control', PAGE_CACHE_CONTROL); res.send(cached); return; }

    try {
      const data = await buildDestinationData(slug, repo);
      if (!data) { res.status(404).send('Not found'); return; }

      const html = buildDestinationPage(data, getDestinationContent(slug));
      setCached(cacheKey, html);
      res.setHeader('Cache-Control', PAGE_CACHE_CONTROL);
      res.send(html);
    } catch (err) {
      console.error('[seo] /trips/:slug error:', (err as Error)?.message, err);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
