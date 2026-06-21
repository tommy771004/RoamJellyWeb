import type { Express } from 'express';
import type { AppRepository } from '../repositories/appRepository';
import { getRequestUserId } from '../auth/requestAuth';

type GeocodeSpot = (title: string, city?: string) => Promise<{ lat: number; lng: number } | null>;

export interface GeoRoutesDeps {
  repo: AppRepository;
  geocodeSpot: GeocodeSpot;
  getRedis: () => any | null;
  authRequired: boolean;
}

/** Registers handbooks + geo/external lookup routes: geocode, directions, spot enrich, weather, flights. */
export function registerGeoRoutes(app: Express, deps: GeoRoutesDeps): void {
  const { repo, geocodeSpot, getRedis, authRequired } = deps;

  app.get('/api/handbooks', async (req, res) => {
    const limit = Number(req.query.limit ?? 10);
    const trips = await repo.getPublicTrips(limit).catch(() => []);
    res.json(trips);
  });

  app.get('/api/geocode', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const city = String(req.query.city ?? '').trim();
    if (!q) { res.json({ lat: null, lng: null }); return; }
    try {
      const coords = await geocodeSpot(q, city);
      if (!coords) {
        res.json({ lat: null, lng: null });
        return;
      }
      res.json(coords);
    } catch {
      res.json({ lat: null, lng: null });
    }
  });

  // ── Spot enrichment via Wikipedia ─────────────────────────────────────────
  app.get('/api/directions', async (req, res) => {
    const coords = String(req.query.coords ?? '');
    if (!coords) { res.json({ duration: null }); return; }
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
      const apiRes = await fetch(url, { headers: { 'User-Agent': 'RoamJellyApp/1.0' } });
      if (!apiRes.ok) { res.json({ duration: null }); return; }
      const data = (await apiRes.json()) as any;
      if (data.routes && data.routes.length > 0) {
        // duration is in seconds
        res.json({ duration: Math.round(data.routes[0].duration / 60) });
      } else {
        res.json({ duration: null });
      }
    } catch {
      res.json({ duration: null });
    }
  });

  app.get('/api/spots/enrich', async (req, res) => {
    const name = String(req.query.name ?? '').trim();
    if (!name) { res.json({}); return; }

    // Check if the query contains Chinese characters to prioritize Traditional/Simplified Chinese Wikipedia
    const containsChinese = /[一-龥]/.test(name);
    const wikis = containsChinese ? ['zh', 'en'] : ['en', 'zh'];

    for (const lang of wikis) {
      try {
        const wikiRes = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
        );
        if (wikiRes.ok) {
          const data: any = await wikiRes.json();
          if (data.thumbnail?.source || data.extract) {
            res.json({
              description: data.extract ? String(data.extract).slice(0, 220) : null,
              wiki_url: data.content_urls?.desktop?.page ?? null,
              thumbnail: data.thumbnail?.source ?? null,
            });
            return;
          }
        }
      } catch { /* try next language on failure */ }
    }
    res.json({});
  });

  app.get('/api/weather', async (req, res) => {
    const city = req.query.city ? String(req.query.city) : null;
    if (!req.query.lat && !req.query.lng && !city) {
      res.status(400).json({ status: 'error', message: 'lat/lng or city is required' });
      return;
    }
    let lat = String(req.query.lat ?? '');
    let lng = String(req.query.lng ?? '');

    const cacheKey = `cache:weather:${lat}_${lng}_${city}`;
    const redisClient = getRedis();
    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          res.json(JSON.parse(cached));
          return;
        }
      } catch (err) {
        console.warn('Weather cache read error', err);
      }
    }

    try {
      if (city && !req.query.lat && !req.query.lng) {
        // try open-meteo geocoding first (faster but limited Chinese support)
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`;
        const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(3000) }).catch(() => null);
        if (geoRes && geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.results && geoData.results.length > 0) {
            lat = String(geoData.results[0].latitude);
            lng = String(geoData.results[0].longitude);
          }
        }

        // fallback to nominatim if open-meteo failed to find coordinates
        if (!lat || !lng) {
          const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
          const nomRes = await fetch(nomUrl, { headers: { 'User-Agent': 'RoamJelly/1.0' }, signal: AbortSignal.timeout(5000) }).catch(() => null);
          if (nomRes && nomRes.ok) {
            const nomData = await nomRes.json();
            if (nomData && nomData.length > 0) {
              lat = String(nomData[0].lat);
              lng = String(nomData[0].lon);
            }
          }
        }
      }

      if (!lat || !lng) {
        res.status(404).json({ status: 'error', message: 'location not found' });
        return;
      }

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,precipitation_probability,weather_code` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
        `&timezone=auto&forecast_days=14`;
      const apiRes = await fetch(url);
      if (!apiRes.ok) throw new Error('open-meteo upstream error');
      const data = (await apiRes.json()) as any;
      const weatherRes = {
        temp_current: Math.round(data.current?.temperature_2m || 0),
        temp_max: Math.round(data.daily?.temperature_2m_max?.[0] || 0),
        temp_min: Math.round(data.daily?.temperature_2m_min?.[0] || 0),
        rain_prob: data.current?.precipitation_probability ?? data.daily?.precipitation_probability_max?.[0] ?? 0,
        weather_code: data.current?.weather_code ?? data.daily?.weather_code?.[0] ?? 0,
        daily: data.daily?.time?.map((timeStr: string, idx: number) => ({
           date: timeStr,
           temp_max: Math.round(data.daily.temperature_2m_max[idx]),
           temp_min: Math.round(data.daily.temperature_2m_min[idx]),
           rain_prob: data.daily.precipitation_probability_max[idx],
           weather_code: data.daily.weather_code[idx]
        })) || []
      };

      const redis = getRedis();
      if (redis) {
        redis.setEx(cacheKey, 7200, JSON.stringify(weatherRes)).catch(() => {});
      }

      res.json(weatherRes);
    } catch {
      res.status(503).json({ status: 'error', message: 'weather service unavailable' });
    }
  });

  app.get('/api/flights', async (req, res) => {
    if (!getRequestUserId(req) && authRequired) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const rows = await repo.getAllFlights();
    res.json(rows);
  });
}
