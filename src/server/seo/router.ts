// src/server/seo/router.ts
import { Router, type Request, type Response } from 'express';
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

  // Sitemap
  router.get('/sitemap-seo.xml', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buildSitemapXml());
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
      console.error('[seo] /fly/:slug error', err);
      res.status(500).send('Internal Server Error');
    }
  });

  // Destination detail: /trips/tokyo/
  router.get('/trips/:slug/', async (req: Request, res: Response) => {
    const { slug } = req.params;
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
      console.error('[seo] /trips/:slug error', err);
      res.status(500).send('Internal Server Error');
    }
  });

  return router;
}
