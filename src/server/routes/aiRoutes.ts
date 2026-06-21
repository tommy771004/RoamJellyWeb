import type { Express, RequestHandler } from 'express';
import type { AppRepository } from '../repositories/appRepository';
import { getRequestUserId, type EnsureTripRole } from '../auth/requestAuth';
import { generateItinerary, regenerateSpot } from '../services/aiItineraryService';
import { fetchOpenRouterWithFallback } from '../services/openrouterHelper';

type GeocodeSpot = (title: string, city?: string) => Promise<{ lat: number; lng: number } | null>;

export interface AiRoutesDeps {
  repo: AppRepository;
  ensureTripRole: EnsureTripRole;
  geocodeSpot: GeocodeSpot;
  authRequired: boolean;
  guestAiLimiter: RequestHandler;
  aiLimiter: RequestHandler;
  isCoordValidForCity: (lat: number, lng: number, biasCoords: { lat: number; lng: number } | null, title: string, destination: string, label: string) => boolean;
  normalizeDateOnlyInput: (value: unknown) => string | null;
  formatDateOnly: (value?: Date | string | null) => string | null;
}

/** Registers AI-generation routes: itinerary, geocode, regenerate-spot, packing-list, chat. */
export function registerAiRoutes(app: Express, deps: AiRoutesDeps): void {
  const {
    repo,
    ensureTripRole,
    geocodeSpot,
    authRequired,
    guestAiLimiter,
    aiLimiter,
    isCoordValidForCity,
    normalizeDateOnlyInput,
    formatDateOnly,
  } = deps;

  app.post('/api/generate/itinerary', guestAiLimiter, aiLimiter, async (req, res) => {
    if (!getRequestUserId(req) && authRequired) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    try {
      const nodes = await generateItinerary(req.body);
      res.json({ status: 'success', data: nodes });
    } catch (err: any) {
      if (err?.message === 'ALL_MODELS_RATE_LIMITED') {
        return res.status(429).json({ status: 'error', code: 'RATE_LIMITED', message: 'AI 服務暫時繁忙，請稍後 1~2 分鐘再試。' });
      }
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Failed to generate itinerary' });
    }
  });

  app.post('/api/generate/geocode', guestAiLimiter, aiLimiter, async (req, res) => {
    if (!getRequestUserId(req) && authRequired) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const { title, destination } = req.body ?? {};
    if (!title) {
      res.status(400).json({ status: 'error', message: 'title is required' });
      return;
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      res.status(503).json({ status: 'error', message: 'OpenRouter API key is not configured' });
      return;
    }

    try {
      const prompt = `Please find the GPS coordinates (latitude,longitude) for the spot: "${title}" inside the destination: "${destination}".
You MUST strictly return coordinates that are physically located within or extremely close to "${destination}". If the spot matches a location outside of "${destination}", you MUST find and return a matching attraction or coordinates inside "${destination}" instead.
Return ONLY the latitude and longitude as a comma-separated string, for example: 25.0343,121.5649 or 35.6762,139.6503.
Do NOT include any extra text, markdown formatting, explanations, or labels. Only reply with the coordinates in the format lat,lng.`;

      const resText = await fetchOpenRouterWithFallback(openrouterApiKey, prompt);
      if (resText) {
        const cleaned = resText.trim().replace(/[()[\]{}]/g, '');
        const match = cleaned.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          if (!isNaN(lat) && !isNaN(lng)) {
            const biasCoords = destination ? await geocodeSpot(destination, '') : null;
            if (isCoordValidForCity(lat, lng, biasCoords, title, destination, 'AI Geocode Endpoint')) {
              console.log(`[AI Geocode API Route] Successful fallback for spot "${title}" in "${destination}": ${lat}, ${lng}`);
              res.json({ status: 'success', data: { lat, lng } });
              return;
            }
          }
        }
      }
      res.status(404).json({ status: 'error', message: 'Could not resolve valid coordinates close to the destination from AI' });
    } catch (err: any) {
      console.error(`[AI Geocode API Route] failed for ${title}:`, err);
      res.status(500).json({ status: 'error', message: err.message || 'AI Geocoding failed' });
    }
  });

  // ── Spot-level regenerate ─────────────────────────────────────────────────
  app.post('/api/itinerary/regenerate-spot', guestAiLimiter, aiLimiter, async (req, res) => {
    const { trip_id, node_id, destination, day, current_date, current_time, current_title, current_category, notes, preserve_time_window } = req.body ?? {};

    if (!trip_id || !node_id) {
      res.status(400).json({ status: 'error', message: 'trip_id and node_id are required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, String(trip_id), 'editor');
    if (!allowed) return;

    const [facts, itineraryNodes] = await Promise.all([
      repo.getTripTravelFacts(String(trip_id)),
      repo.getItineraryNodes(String(trip_id)),
    ]);

    const normalizedNodes = itineraryNodes
      .map((node) => ({
        node_id: node.nodeId,
        day: Number(node.day ?? 1),
        date: normalizeDateOnlyInput(node.date) ?? formatDateOnly(node.timestamp) ?? null,
        time: node.time ?? '10:00',
        title: node.title ?? '未命名行程',
        category: node.category ?? 'other',
      }))
      .sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        if ((a.date ?? '') !== (b.date ?? '')) return (a.date ?? '').localeCompare(b.date ?? '');
        return (a.time ?? '').localeCompare(b.time ?? '');
      });

    const currentIndex = normalizedNodes.findIndex((node) => node.node_id === String(node_id));
    if (currentIndex === -1) {
      res.status(404).json({ status: 'error', message: 'itinerary node not found' });
      return;
    }
    const previousNode = currentIndex > 0 ? normalizedNodes[currentIndex - 1] : undefined;
    const nextNode = currentIndex >= 0 && currentIndex < normalizedNodes.length - 1 ? normalizedNodes[currentIndex + 1] : undefined;
    const travelFactsContext = facts
      .map((fact: any) => `[ID: ${fact.id}] ${fact.factType} - ${fact.title}`)
      .join('\n');

    const spot = await regenerateSpot({
      destination: String(destination ?? ''),
      day: Number(day ?? 1),
      currentDate: current_date ? String(current_date) : undefined,
      currentTime: String(current_time ?? '10:00'),
      currentTitle: String(current_title ?? ''),
      currentCategory: current_category ? String(current_category) : undefined,
      notes: notes ? String(notes) : undefined,
      preserveTimeWindow: preserve_time_window !== false,
      previousNode,
      nextNode,
      travelFactsContext,
    });

    if (!spot) {
      res.status(503).json({ status: 'error', message: 'AI 服務目前無法使用，請稍後再試' });
      return;
    }

    res.json({ status: 'success', data: spot });
  });

  app.post('/api/generate/packing-list', guestAiLimiter, aiLimiter, async (req, res) => {
    if (!getRequestUserId(req) && authRequired) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const { destination = 'Kyoto', days = 5, weatherContext = 'Clear skies, 20°C' } = req.body || {};
    try {
      // dynamic import so server.ts doesn't crash if omitted
      const { generatePackingList } = await import('../services/aiService');
      const list = await generatePackingList(destination, days, weatherContext);
      res.json({ status: 'success', data: list });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Failed to generate packing list' });
    }
  });

  app.post('/api/generate/chat', guestAiLimiter, aiLimiter, async (req, res) => {
    const { message = '', history = [], context = {} } = req.body || {};
    try {
      const { generateChatResponse } = await import('../services/aiService');
      const response = await generateChatResponse(message, history, context);
      res.json({ status: 'success', data: response });
    } catch (err: any) {
      if (err?.message === 'ALL_MODELS_RATE_LIMITED') {
        return res.status(429).json({ status: 'error', code: 'RATE_LIMITED', message: 'AI 服務暫時繁忙，請稍後 1~2 分鐘再試。' });
      }
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Failed to generate chat response' });
    }
  });
}
