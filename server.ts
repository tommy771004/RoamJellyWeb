import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { createClient, type RedisClientType } from 'redis';
import { AppRepository } from './src/server/repositories/appRepository';
import { pool, db } from './src/server/db/client';
import { signAccessToken, type AuthUser, verifyAccessToken } from './src/server/auth/jwt';
import { hashPassword, verifyPassword } from './src/server/auth/password';
import * as schema from './src/server/db/schema';

import { scrapeTripFlights } from './src/server/services/tripParser';
import { generateItinerary, regenerateSpot } from './src/server/services/aiItineraryService';

const REAL_BACKEND_BASE_URL = process.env.REAL_BACKEND_BASE_URL?.replace(/\/+$/, '');
const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SHOULD_SEED_DEMO_DATA = process.env.SEED_DEMO_DATA === 'true' && !REAL_BACKEND_BASE_URL;
const REDIS_URL = process.env.REDIS_URL?.trim();
const JWT_DEV_TOKEN_ENABLED = process.env.ENABLE_DEV_TOKEN_ENDPOINT !== 'false';
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === 'true' || process.env.NODE_ENV === 'production';
const OTA_PROVIDER_URL = process.env.OTA_PROVIDER_URL?.replace(/\/+$/, '');

const PORT = 3000;

type TripRole = 'owner' | 'editor' | 'viewer';

type SearchItem = {
  id: string;
  type: 'flight' | 'ticket' | 'other';
  provider: string;
  title: string;
  price: number;
  currency: string;
  emoji: string;
  affiliate_url: string;
};

type SearchCacheEntry = {
  data: SearchItem[];
  expiresAt: number;
};

type SearchHistoryRecord = {
  from: string;
  to: string;
  date: string;
  cache: 'hit' | 'miss';
  result_count: number;
  timestamp: string;
};

type PlanningRecord = {
  trip_id: string;
  action: 'add_node' | 'remove_node';
  node_id: string;
  day?: number;
  time?: string;
  title?: string;
  category?: string;
  source: 'socket' | 'api';
  timestamp: string;
};

type AuthedRequest = Request & { authUser?: AuthUser };

const searchCache = new Map<string, SearchCacheEntry>();
const searchHistoryFallback: SearchHistoryRecord[] = [];
const planningFallbackByTrip = new Map<string, PlanningRecord[]>();

const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const SEARCH_CACHE_TTL_SECONDS = 10 * 60;
const SEARCH_HISTORY_KEY = 'history:search:global';
const SEARCH_HISTORY_MAX = 200;
const PLANNING_LOG_MAX = 500;
const PLANNING_SNAPSHOT_TTL_SECONDS = 6 * 60 * 60;


let redisClient: any | null = null;

function getSearchCacheKey(cacheKey: string) {
  return `cache:search:${cacheKey}`;
}

function getPlanningLogKey(tripId: string) {
  return `planning:trip:${tripId}:events`;
}

function getPlanningSnapshotKey(tripId: string) {
  return `planning:trip:${tripId}:snapshot`;
}

function normalizeMembers(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.map((item) => String(item).trim()).filter((item) => item.length > 0)));
}

function hasRequiredRole(role: TripRole, required: TripRole): boolean {
  const score: Record<TripRole, number> = { viewer: 1, editor: 2, owner: 3 };
  return score[role] >= score[required];
}

function getTokenFromRequest(req: Request): string | null {
  const value = req.headers.authorization;
  if (!value || !value.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim() || null;
}

function getRequestUserId(req: Request): string | null {
  return (req as AuthedRequest).authUser?.userId ?? null;
}

function formatDateOnly(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function mapTravelFactRow(row: any) {
  return {
    id: row.id,
    tripId: row.tripId,
    factType: row.factType,
    source: row.source,
    title: row.title,
    startAt: row.startAt ? new Date(row.startAt).toISOString() : null,
    endAt: row.endAt ? new Date(row.endAt).toISOString() : null,
    locationName: row.locationName ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    referenceCode: row.referenceCode ?? null,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
}

function summarizeTravelFacts(rows: any[]) {
  const mapped = rows.map(mapTravelFactRow);
  const missingAnchors: Array<'flight_outbound' | 'stay'> = [];

  if (!mapped.some((row) => row.factType === 'flight_outbound')) {
    missingAnchors.push('flight_outbound');
  }
  if (!mapped.some((row) => row.factType === 'stay')) {
    missingAnchors.push('stay');
  }

  return {
    items: mapped,
    missingAnchors,
    hasCompleteAiAnchors: missingAnchors.length === 0,
  };
}

function normalizeDateOnlyInput(value: unknown): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function buildNodeTimestamp(valueDate: unknown, valueTime: unknown): Date | null {
  const date = normalizeDateOnlyInput(valueDate);
  const time = String(valueTime ?? '').trim();
  if (!date || !/^\d{1,2}:\d{2}$/.test(time)) return null;

  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoTimestamp(value: unknown): string | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function validateLinkedFactId(repo: AppRepository, tripId: string, linkedFactId?: string | null) {
  if (!linkedFactId) return true;
  const fact = await repo.getTripTravelFactById(linkedFactId);
  return Boolean(fact && fact.tripId === tripId);
}

async function buildTripInfo(repo: AppRepository, tripId: string) {
  const trip = await repo.getTripById(tripId);
  if (!trip) return null;

  const [nodes, facts] = await Promise.all([
    repo.getItineraryNodes(tripId),
    repo.getTripTravelFacts(tripId),
  ]);

  const outbound = facts.find((fact: any) => fact.factType === 'flight_outbound');
  const inbound = facts.find((fact: any) => fact.factType === 'flight_inbound');
  const stay = facts.find((fact: any) => fact.factType === 'stay');

  const startDate =
    formatDateOnly(outbound?.startAt) ??
    formatDateOnly(stay?.startAt) ??
    null;
  const endDate =
    formatDateOnly(inbound?.endAt) ??
    formatDateOnly(stay?.endAt) ??
    null;

  const dateBasedDays =
    startDate && endDate
      ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1)
      : null;

  const maxNodeDay = nodes.reduce((max, node) => Math.max(max, Number(node.day ?? 1)), 1);

  return {
    trip_id: trip.id,
    id: trip.id,
    name: trip.name,
    destination: trip.destination ?? '',
    days: dateBasedDays ?? maxNodeDay,
    startDate,
    endDate,
  };
}

async function getSearchCacheData(cacheKey: string): Promise<SearchItem[] | null> {
  if (redisClient?.isOpen) {
    const raw = await redisClient.get(getSearchCacheKey(cacheKey));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SearchItem[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  return null;
}

async function setSearchCacheData(cacheKey: string, data: SearchItem[]): Promise<void> {
  if (redisClient?.isOpen) {
    await redisClient.set(getSearchCacheKey(cacheKey), JSON.stringify(data), {
      EX: SEARCH_CACHE_TTL_SECONDS,
    });
    return;
  }

  searchCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });
}

async function fetchFromOtaProvider(from: string, to: string, date: string): Promise<SearchItem[] | null> {
  // If we have a SerpApi key, use Google Flights via SerpApi
  if (SERPAPI_KEY) {
    try {
      console.log(`Fetching real flight data from SerpApi (Google Flights) for ${from} -> ${to} on ${date}`);
      const params = new URLSearchParams({
        engine: 'google_flights',
        departure_id: from,
        arrival_id: to,
        outbound_date: date,
        currency: 'TWD',
        hl: 'zh-tw',
        gl: 'tw',
        api_key: SERPAPI_KEY
      });

      const url = `https://serpapi.com/search.json?${params.toString()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (!res.ok) {
        console.error(`SerpApi error: ${res.status}`);
      } else {
        const json = await res.json() as any;
        
        if (json.error) {
          console.error('SerpApi returned error:', json.error);
        } else if (json.best_flights) {
          return json.best_flights.slice(0, 10).map((flight: any, idx: number) => {
            const leg = flight.flights[0];
            return {
              id: `serp_${idx}_${Date.now()}`,
              type: 'flight' as const,
              provider: 'Google Flights',
              title: `${from} → ${to} · ${flight.type === 'Nonstop' ? '直飛' : flight.type}`,
              price: flight.price,
              currency: 'TWD',
              emoji: '✈️',
              affiliate_url: 'https://www.google.com/travel/flights',
              details: {
                airline: leg.airline,
                departure: leg.departure_airport.time.split(' ')[1] || '08:00',
                arrival: leg.arrival_airport.time.split(' ')[1] || '12:00',
                stops: flight.type === 'Nonstop' ? 0 : 1,
                duration: `${Math.floor(flight.total_duration / 60)}h ${flight.total_duration % 60}m`
              }
            };
          });
        }
      }
    } catch (error) {
      console.error('SerpApi call failed:', error);
    }
  }

  // Fallback to Trip.com Scraper (Route B)
  console.log(`Fallback to Trip.com scraper for ${from} -> ${to} on ${date}`);
  const scrapedFlights = await scrapeTripFlights(from, to, date);
  if (scrapedFlights && scrapedFlights.length > 0) {
    return scrapedFlights;
  }

  // Legacy fallback to internal OTA provider if URL exists
  if (OTA_PROVIDER_URL) {
    try {
      const url = `${OTA_PROVIDER_URL}/flights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const json = (await res.json()) as unknown;
      if (!Array.isArray(json) || json.length === 0) return null;
      return (json as Record<string, any>[]).map((item, idx) => ({
        id: String(item.id ?? `ota_${idx}`),
        type: 'flight' as const,
        provider: String(item.provider ?? 'Skyscanner'),
        title: String(item.title ?? `${from} → ${to}`),
        price: Number(item.price ?? 0),
        currency: String(item.currency ?? 'TWD'),
        emoji: '✈️',
        affiliate_url: String(item.affiliate_url ?? ''),
        ...(item.details ? { details: item.details } : {})
      }));
    } catch {
      return null;
    }
  }
  
  return null;
}

async function appendSearchHistory(record: SearchHistoryRecord): Promise<void> {
  if (redisClient?.isOpen) {
    const pipeline = redisClient.multi();
    pipeline.lPush(SEARCH_HISTORY_KEY, JSON.stringify(record));
    pipeline.lTrim(SEARCH_HISTORY_KEY, 0, SEARCH_HISTORY_MAX - 1);
    await pipeline.exec();
    return;
  }

  searchHistoryFallback.unshift(record);
  if (searchHistoryFallback.length > SEARCH_HISTORY_MAX) {
    searchHistoryFallback.pop();
  }
}

async function getSearchHistory(limit: number): Promise<SearchHistoryRecord[]> {
  const safeLimit = Math.max(1, Math.min(200, limit));
  if (redisClient?.isOpen) {
    const rows = await redisClient.lRange(SEARCH_HISTORY_KEY, 0, safeLimit - 1);
    return rows
      .map((row: string) => {
        try {
          return JSON.parse(row) as SearchHistoryRecord;
        } catch {
          return null;
        }
      })
      .filter((item: SearchHistoryRecord | null): item is SearchHistoryRecord => Boolean(item));
  }

  return searchHistoryFallback.slice(0, safeLimit);
}

async function appendPlanningRecord(record: PlanningRecord): Promise<void> {
  if (redisClient?.isOpen) {
    const key = getPlanningLogKey(record.trip_id);
    const pipeline = redisClient.multi();
    pipeline.lPush(key, JSON.stringify(record));
    pipeline.lTrim(key, 0, PLANNING_LOG_MAX - 1);
    await pipeline.exec();
    return;
  }

  const current = planningFallbackByTrip.get(record.trip_id) ?? [];
  current.unshift(record);
  if (current.length > PLANNING_LOG_MAX) {
    current.pop();
  }
  planningFallbackByTrip.set(record.trip_id, current);
}

async function getPlanningRecords(tripId: string, limit: number): Promise<PlanningRecord[]> {
  const safeLimit = Math.max(1, Math.min(300, limit));
  if (redisClient?.isOpen) {
    const rows = await redisClient.lRange(getPlanningLogKey(tripId), 0, safeLimit - 1);
    return rows
      .map((row: string) => {
        try {
          return JSON.parse(row) as PlanningRecord;
        } catch {
          return null;
        }
      })
      .filter((item: PlanningRecord | null): item is PlanningRecord => Boolean(item));
  }

  return (planningFallbackByTrip.get(tripId) ?? []).slice(0, safeLimit);
}

async function updatePlanningSnapshot(repo: AppRepository, tripId: string): Promise<void> {
  if (!redisClient?.isOpen) return;
  const nodes = await repo.getItineraryNodes(tripId);
  await redisClient.set(getPlanningSnapshotKey(tripId), JSON.stringify(nodes), {
    EX: PLANNING_SNAPSHOT_TTL_SECONDS,
  });
}

async function getPlanningSnapshot(tripId: string): Promise<unknown[] | null> {
  if (!redisClient?.isOpen) return null;
  const raw = await redisClient.get(getPlanningSnapshotKey(tripId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function geocodeSpot(title: string, city = ''): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${title} ${city}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=ja`;
    const apiRes = await fetch(url, { headers: { 'User-Agent': 'RoamJellyApp/1.0' } });
    if (!apiRes.ok) return null;
    const data = (await apiRes.json()) as Array<{ lat: string; lon: string }>;
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function startServer() {
  const repo = new AppRepository(db);

  if (REDIS_URL) {
    const candidate = createClient({ url: REDIS_URL });
    candidate.on('error', (error: unknown) => {
      console.error('Redis client error', error);
    });
    try {
      await candidate.connect();
      redisClient = candidate;
      console.log('Redis connected');
    } catch (error) {
      console.error('Redis connect failed, fallback to local memory', error);
      redisClient = null;
    }
  }

  const app = express();
  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const originList = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((item: string) => item.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: originList.length === 0 ? true : originList,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    try {
      await repo.healthCheck();
      res.json({
        status: 'ok',
        checks: {
          database: 'ok',
          redis: redisClient?.isOpen ? 'ok' : 'fallback',
        },
      });
    } catch (error) {
      res.status(503).json({ status: 'error', message: 'health check failed', error: String(error) });
    }
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      if (
        AUTH_REQUIRED &&
        req.path.startsWith('/api') &&
        req.path !== '/api/auth/dev-token' &&
        req.path !== '/api/auth/register' &&
        req.path !== '/api/auth/login' &&
        !req.path.startsWith('/api/search') &&
        req.path !== '/api/weather'
      ) {
        res.status(401).json({ status: 'error', message: 'missing bearer token' });
        return;
      }
      next();
      return;
    }

    const user = verifyAccessToken(token);
    if (!user) {
      res.status(401).json({ status: 'error', message: 'invalid bearer token' });
      return;
    }

    (req as AuthedRequest).authUser = user;
    next();
  });

  const ensureTripRole = async (req: Request, res: Response, tripId: string, requiredRole: TripRole) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return null;
    }

    const role = await repo.getTripMemberRole(tripId, userId);
    if (!role) {
      res.status(403).json({ status: 'error', message: 'forbidden: not a trip member' });
      return null;
    }

    if (!hasRequiredRole(role, requiredRole)) {
      res.status(403).json({ status: 'error', message: 'forbidden: insufficient role' });
      return null;
    }

    return { userId, role };
  };

  if (REAL_BACKEND_BASE_URL) {
    app.use('/api', async (req, res) => {
      try {
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const targetUrl = `${REAL_BACKEND_BASE_URL}/api${req.path}${query}`;
        const response = await fetch(targetUrl, {
          method: req.method,
          headers: {
            'Content-Type': req.headers['content-type'] ?? 'application/json',
            ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
          },
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body),
        });

        const contentType = response.headers.get('content-type') ?? '';
        const textBody = await response.text();
        res.status(response.status);

        if (contentType.includes('application/json')) {
          try {
            res.json(JSON.parse(textBody));
            return;
          } catch {
            res.send(textBody);
            return;
          }
        }

        res.send(textBody);
      } catch (error) {
        console.error('proxy api error', error);
        res.status(502).json({ status: 'error', message: 'failed to reach real backend api' });
      }
    });
  }

  if (JWT_DEV_TOKEN_ENABLED) {
    app.post('/api/auth/dev-token', async (req, res) => {
      if (process.env.NODE_ENV === 'production') {
        res.status(404).json({ status: 'error', message: 'endpoint disabled in production' });
        return;
      }

      const userId = String(req.body?.user_id ?? 'demo_user').trim() || 'demo_user';
      await repo.ensureUser(userId, userId);

      const token = signAccessToken({ userId });
      res.json({ status: 'success', token, user_id: userId, expires_in: process.env.JWT_EXPIRES_IN ?? '12h' });
    });
  }

  // ── Auth: Register ──────────────────────────────────────────────────────────
  app.post('/api/auth/register', async (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    const displayName = String(req.body?.display_name ?? username).trim() || username;

    if (!username || !password) {
      res.status(400).json({ status: 'error', message: '請提供使用者名稱和密碼' });
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      res.status(400).json({ status: 'error', message: '使用者名稱需為 3–30 個英數字或底線' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ status: 'error', message: '密碼長度需在 8–128 個字元之間' });
      return;
    }

    const existing = await repo.getUserByUsername(username);
    if (existing) {
      res.status(409).json({ status: 'error', message: '此使用者名稱已被使用' });
      return;
    }

    const passwordHash = await hashPassword(password);
    await repo.createUserWithPassword(username, displayName, passwordHash);
    
    const token = signAccessToken({ userId: username });
    res.status(201).json({ status: 'success', token, user_id: username, expires_in: process.env.JWT_EXPIRES_IN ?? '12h' });
  });

  // ── Auth: Login ─────────────────────────────────────────────────────────────
  app.post('/api/auth/login', async (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!username || !password) {
      res.status(400).json({ status: 'error', message: '請提供使用者名稱和密碼' });
      return;
    }

    const user = await repo.getUserByUsername(username);
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ status: 'error', message: '使用者名稱或密碼不正確' });
      return;
    }

    const token = signAccessToken({ userId: user.userId });
    res.json({ status: 'success', token, user_id: user.userId, expires_in: process.env.JWT_EXPIRES_IN ?? '12h' });
  });

  io.use(async (socket, next) => {
    try {
      const authHeader = typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : typeof socket.handshake.headers.authorization === 'string'
          ? socket.handshake.headers.authorization
          : '';

      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : authHeader;
      if (!token) {
        if (AUTH_REQUIRED) {
          next(new Error('missing token'));
          return;
        }
        socket.data.userId = 'demo_user';
        next();
        return;
      }

      const user = verifyAccessToken(token);
      if (!user) {
        next(new Error('invalid token'));
        return;
      }

      socket.data.userId = user.userId;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_room', async (payload: { trip_id?: string }) => {
      if (!payload?.trip_id) return;
      const userId = String(socket.data.userId ?? '');
      if (!userId) return;

      const role = await repo.getTripMemberRole(payload.trip_id, userId);
      if (!role) {
        socket.emit('error', { message: 'forbidden: not a trip member' });
        return;
      }

      socket.join(payload.trip_id);
    });

    socket.on(
      'sync_itinerary',
      async (event: {
        trip_id?: string;
        action?: string;
        payload?: { node_id?: string; day?: number; date?: string; time?: string; timestamp?: string; sort_order?: number; title?: string; emoji?: string; category?: string; lat?: number | null; lng?: number | null; description?: string; is_visited?: boolean; transport_to_next?: string; image_url?: string; linkedFactId?: string };
      }) => {
        if (
          !event?.trip_id ||
          event.action !== 'add_node' ||
          !event.payload?.node_id ||
          !event.payload.time ||
          !event.payload.title
        ) {
          return;
        }

        const userId = String(socket.data.userId ?? '');
        if (!userId) return;

        const role = await repo.getTripMemberRole(event.trip_id, userId);
        if (!role || !hasRequiredRole(role, 'editor')) {
          socket.emit('error', { message: 'forbidden: editor role required' });
          return;
        }

        const linkedFactAllowed = await validateLinkedFactId(repo, event.trip_id, event.payload.linkedFactId);
        if (!linkedFactAllowed) {
          socket.emit('error', { message: 'invalid linked travel fact' });
          return;
        }

        await repo.upsertItineraryNode(event.trip_id, {
          node_id: event.payload.node_id,
          day: event.payload.day,
          date: normalizeDateOnlyInput(event.payload.date) ?? undefined,
          time: event.payload.time,
          timestamp: event.payload.timestamp ?? buildNodeTimestamp(event.payload.date, event.payload.time)?.toISOString(),
          sort_order: event.payload.sort_order,
          title: event.payload.title,
          emoji: event.payload.emoji,
          category: event.payload.category,
          lat: event.payload.lat,
          lng: event.payload.lng,
          is_visited: event.payload.is_visited,
          description: event.payload.description,
          transport_to_next: event.payload.transport_to_next,
          image_url: event.payload.image_url,
          linkedFactId: event.payload.linkedFactId,
        });

        await appendPlanningRecord({
          trip_id: event.trip_id,
          action: 'add_node',
          node_id: event.payload.node_id,
          day: Number(event.payload.day ?? 1),
          time: event.payload.time,
          title: event.payload.title,
          category: event.payload.category ?? 'other',
          source: 'socket',
          timestamp: new Date().toISOString(),
        });
        await updatePlanningSnapshot(repo, event.trip_id);

        socket.to(event.trip_id).emit('sync_itinerary', {
          trip_id: event.trip_id,
          action: 'add_node',
          payload: {
            node_id: event.payload.node_id,
            day: Number(event.payload.day ?? 1),
            date: normalizeDateOnlyInput(event.payload.date) ?? null,
            time: event.payload.time,
            timestamp: event.payload.timestamp ?? buildNodeTimestamp(event.payload.date, event.payload.time)?.toISOString() ?? null,
            sort_order: Number(event.payload.sort_order ?? 0),
            title: event.payload.title,
            emoji: event.payload.emoji ?? '📍',
            category: event.payload.category ?? 'other',
            lat: event.payload.lat ?? null,
            lng: event.payload.lng ?? null,
            is_visited: event.payload.is_visited ?? false,
            description: event.payload.description ?? '',
            transport_to_next: event.payload.transport_to_next ?? null,
            image_url: event.payload.image_url ?? null,
            linkedFactId: event.payload.linkedFactId ?? null,
          },
        });
      },
    );

    socket.on('editing_start', async (payload: { trip_id?: string; nodeId?: string; day?: number }) => {
      const tripId = String(payload?.trip_id ?? '');
      const nodeId = String(payload?.nodeId ?? '');
      const day = Number(payload?.day ?? 1);
      if (!tripId || !socket.data?.userId) return;

      // Verify the user is a trip member before broadcasting
      const role = await repo.getTripMemberRole(tripId, socket.data.userId).catch(() => null);
      if (!role) return;

      const userRecord = await repo.getUserById(socket.data.userId).catch(() => null);
      const userName = userRecord?.displayName || String(socket.data.userId);

      // Broadcast to all other members in the trip room
      socket.to(tripId).emit('editing_start', { userName, nodeId, day });
    });

    socket.on('editing_stop', async (payload: { trip_id?: string }) => {
      const tripId = String(payload?.trip_id ?? '');
      if (!tripId || !socket.data?.userId) return;

      const role = await repo.getTripMemberRole(tripId, socket.data.userId).catch(() => null);
      if (!role) return;

      socket.to(tripId).emit('editing_stop', {});
    });
  });

  app.get('/api/trips/:trip_id/flights', async (req, res) => {
    const flightsData = await repo.getAllFlights();
    if (flightsData.length > 0) {
       res.json(flightsData.map(f => ({
         airline: f.provider,
         direct: true,
         duration: '4h 00m',
         price: f.price,
         depTime: f.time?.split(' - ')[0] || '10:00',
         depCode: 'TPE',
         arrTime: f.time?.split(' - ')[1] || '14:00',
         arrCode: 'NRT'
       })));
       return;
    }
    res.json([]);
  });

  app.get('/api/trips/:trip_id/activities', async (req, res) => {
    const tripId = req.params.trip_id;
    const nodes = await repo.getItineraryNodes(tripId);
    
    if (nodes.length > 0) {
      res.json(nodes.map(node => ({
        img: 'https://images.unsplash.com/photo-1542931287-023b922fa89b?auto=format&fit=crop&q=80&w=200&h=200', 
        title: `${node.title} Admission Ticket`, 
        rating: 4.8, 
        reviews: '12k', 
        price: 580 
      })));
      return;
    }

    res.json([]);
  });

  app.post('/api/generate/itinerary', async (req, res) => {
    try {
      const nodes = await generateItinerary(req.body);
      res.json({ status: 'success', data: nodes });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Failed to generate itinerary' });
    }
  });

  // ── Spot-level regenerate ─────────────────────────────────────────────────
  app.post('/api/itinerary/regenerate-spot', async (req, res) => {
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

  app.post('/api/generate/packing-list', async (req, res) => {
    const { destination = 'Kyoto', days = 5, weatherContext = 'Clear skies, 20°C' } = req.body || {};
    try {
      // dynamic import so server.ts doesn't crash if omitted
      const { generatePackingList } = await import('./src/server/services/aiService');
      const list = await generatePackingList(destination, days, weatherContext);
      res.json({ status: 'success', data: list });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Failed to generate packing list' });
    }
  });

  app.post('/api/dev/generate-handbooks', async (req, res) => {
    try {
      const { GoogleGenAI, Type } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Execute script manually 
      const fs = require('fs');
      const path = require('path');
      const destinations = [
        { city: "東京", name: "日本東京精選5日遊", days: 5 },
        { city: "首爾", name: "韓國首爾流行5日遊", days: 5 },
        { city: "巴黎", name: "法國巴黎浪漫文藝7日遊", days: 7 },
        { city: "倫敦", name: "英國倫敦深度8日遊", days: 8 },
        { city: "大阪", name: "日本京都大阪5日遊", days: 5 },
        { city: "曼谷", name: "泰國曼谷自由行5日遊", days: 5 },
        { city: "羅馬", name: "義大利羅馬威尼斯10日遊", days: 10 },
        { city: "琉森", name: "瑞士湖光山色10日遊", days: 10 },
        { city: "紐約", name: "美國紐約繁華7日遊", days: 7 },
        { city: "雪梨", name: "澳洲雪梨與藍山6日遊", days: 6 },
        { city: "札幌", name: "日本北海道秘境6日遊", days: 6 },
        { city: "新加坡", name: "新加坡文化4日遊", days: 4 },
        { city: "清邁", name: "泰國清邁慢活5日遊", days: 5 },
        { city: "洛杉磯", name: "美國洛杉磯與樂園7日遊", days: 7 },
        { city: "峇里島", name: "印尼峇里島度假5日遊", days: 5 },
        { city: "釜山", name: "韓國釜山自由行5日遊", days: 5 },
        { city: "布拉格", name: "奧捷東歐風情8日遊", days: 8 },
        { city: "巴塞隆納", name: "西班牙熱情8日遊", days: 8 },
        { city: "雷克雅維克", name: "冰島極光10日遊", days: 10 },
        { city: "皇后鎮", name: "紐西蘭南島8日遊", days: 8 }
      ];

      res.json({ status: 'started' }); // Send response early so it doesn't timeout

      const results = [];
      const fileOut = path.join(process.cwd(), 'src/data/expertHandbooksData.json');
      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        console.log(`Generating data for ${dest.name}...`);
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `請身為一個專業的旅遊達人，幫我規劃一個真實的「${dest.name}」旅遊行程。
這個行程共 ${dest.days} 天。
**絕對不要使用假資料或模擬資料(例如：不要寫"某美食", "知名餐廳")，請給出真實存在的景點、餐廳、住宿地點與交通方式。**
請深入到「食、衣、住、行」，每天必須安排豐富詳細的行程，並符合以下要求：
每「天」至少要包含 4 個節點 (Node)：
1. 上午出發/景點 (提示今天的【衣】穿搭建議與【行】交通方式) -> category='spot'/'activity' (如果只寫出發可為 hotel)
2. 午餐 (真實存在的餐廳/美食，提示【食】的細節) -> category='food'
3. 下午景點 -> category='spot'/'shopping'
4. 晚餐 (真實存在的餐廳) -> category='food'
若要補充住宿可加 category='hotel'。
回應只能是 JSON。
請確保為合法的 JSON 並且不要包含 markdown 代碼塊：
{
  "id": "expert_curated_real_${i}",
  "title": "${dest.name} 全攻略",
  "author": "${dest.city}在地達人",
  "image": "https://picsum.photos/seed/${600 + i}/800/600",
  "days": ${dest.days},
  "tags": ["真實推薦", "必去", "食衣住行"],
  "cities": [{ "name": "${dest.city}", "reason": "真實推薦" }],
  "nodes": [
    {
      "node_id": "隨機英數ID 例如 node_abc123",
      "day": 1,
      "time": "09:00",
      "title": "真實的地點名稱",
      "emoji": "🏨",
      "category": "hotel", 
      "description": "詳細描述。例如：【衣】今天天氣...適合穿... 【行】搭乘地鐵... ",
      "lat": 真實緯度(數字),
      "lng": 真實經度(數字)
    }
  ]
}`,
            config: {
              temperature: 0.5,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  author: { type: Type.STRING },
                  image: { type: Type.STRING },
                  days: { type: Type.INTEGER },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        reason: { type: Type.STRING }
                      },
                      required: ['name', 'reason']
                    }
                  },
                  nodes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        node_id: { type: Type.STRING },
                        day: { type: Type.INTEGER },
                        time: { type: Type.STRING },
                        title: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        category: { type: Type.STRING, enum: ['spot', 'food', 'activity', 'transport', 'hotel', 'shopping'] },
                        description: { type: Type.STRING },
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER }
                      },
                      required: ['node_id', 'day', 'time', 'title', 'emoji', 'category', 'description', 'lat', 'lng']
                    }
                  }
                },
                required: ['id', 'title', 'author', 'image', 'days', 'tags', 'cities', 'nodes']
              }
            }
          });
          const text = response.text;
          // Safe parse
          results.push(JSON.parse(text));
          fs.writeFileSync(fileOut, JSON.stringify(results, null, 2), 'utf-8');
        } catch (e: any) {
          console.error(`Failed on ${dest.name}: `, e);
        }
      }
      console.log('Background generation completed!');
    } catch (err: any) {
      console.error(err);
    }
  });

  app.get('/api/search', async (req, res) => {
    const from = String(req.query.from ?? '').trim().toUpperCase();
    const to = String(req.query.to ?? '').trim().toUpperCase();
    const date = String(req.query.date ?? '').trim();

    // If no params, return "Popular Recommendations" (latest flights)
    if (!from || !to || !date) {
      let topFlights = await repo.getTopFlights(5).catch(() => []);
      if (!topFlights || topFlights.length === 0) {
        topFlights = [
          { id: 'f1', provider: 'EVA Air', time: '08:00 - 12:15', price: 12500 },
          { id: 'f2', provider: 'Starlux Airlines', time: '10:30 - 14:45', price: 14200 },
          { id: 'f3', provider: 'China Airlines', time: '12:00 - 16:15', price: 11800 }
        ];
      }
      const results = topFlights.map((f: any, idx: number) => ({
        id: f.id || `flight_trend_${idx}`,
        type: 'flight',
        provider: f.provider,
        title: `台北 (TPE) -> 目的地 · 直飛`, // Simple fallback for title if not in db
        price: f.price,
        currency: 'TWD',
        emoji: '✈️',
        affiliate_url: `https://example.com/flight/${f.id}`,
        details: { stops: 0, airline: f.provider, departure: f.time?.split(' - ')[0] || '10:00', arrival: f.time?.split(' - ')[1] || '14:00' }
      }));
      res.json({ status: 'success', data: results });
      return;
    }

    const cacheKey = `${from}_${to}_${date}`;
    const cached = await getSearchCacheData(cacheKey);
    if (cached) {
      await appendSearchHistory({
        from,
        to,
        date,
        cache: 'hit',
        result_count: cached.length,
        timestamp: new Date().toISOString(),
      });
      res.json({ status: 'success', data: cached, cache: 'hit' });
      return;
    }

    // Try OTA provider first; fall back to local flights table
    let data: SearchItem[];
    const otaData = await fetchFromOtaProvider(from, to, date);
    if (otaData && otaData.length > 0) {
      data = otaData;
    } else {
      let flightRows = await repo.getTopFlights(4).catch(() => []);
      if (!flightRows || flightRows.length === 0) {
        flightRows = [
          { id: 'f4', provider: 'Tigerair Taiwan', time: '14:20 - 17:05', price: 8500 },
          { id: 'f5', provider: 'Peach Aviation', time: '16:55 - 20:40', price: 7900 }
        ];
      }
      if (flightRows.length === 0) {
        res.status(503).json({ status: 'error', message: 'no flight provider data available' });
        return;
      }
          data = flightRows.map((flight, idx) => {
        const providers = ['EVA Air', 'China Airlines', 'Starlux Airlines', 'Tigerair Taiwan', 'Peach Aviation', 'Skyscanner', 'Expedia'];
        const provider = providers[idx % providers.length];
        return {
          id: `flight_${flight.id}`,
          type: 'flight' as const,
          provider: provider,
          title: `${from} -> ${to} · ${idx % 2 === 0 ? '直飛' : '1 轉'}`,
          price: flight.price + (idx * 300),
          currency: 'TWD',
          emoji: '✈️',
          affiliate_url: `https://partner.example.com/flights/${encodeURIComponent(flight.id)}`,
          details: {
            airline: provider,
            departure: flight.time.split(' - ')[0] || '10:00',
            arrival: flight.time.split(' - ')[1] || '14:30',
            stops: idx % 2 === 0 ? 0 : 1,
            duration: idx === 0 ? '3h 15m' : (idx === 1 ? '2h 45m' : '4h 10m')
          }
        };
      });
    }

    await setSearchCacheData(cacheKey, data);
    await appendSearchHistory({
      from,
      to,
      date,
      cache: 'miss',
      result_count: data.length,
      timestamp: new Date().toISOString(),
    });

    res.json({ status: 'success', data, cache: 'miss' });
  });

  app.get('/api/search/history', async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const data = await getSearchHistory(Number.isFinite(limit) ? limit : 50);
    res.json({ status: 'success', data });
  });

  app.get('/api/handbooks', async (req, res) => {
    const limit = Number(req.query.limit ?? 10);
    const trips = await repo.getPublicTrips(limit).catch(() => []);
    res.json(trips.length > 0 ? trips : [
      { id: 'h1', title: '東京散策：巷弄裡的小秘密', author: 'Travel Guru', likes: 120, cover: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800' },
      { id: 'h2', title: '大阪美食地圖 2024', author: 'Travel Guru', likes: 85, cover: 'https://images.unsplash.com/photo-1590484512398-33fb39eff960?w=800' },
      { id: 'h3', title: '京都紅葉季完全攻略', author: 'Travel Guru', likes: 210, cover: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800' }
    ]);
  });

  app.get('/api/weather', async (req, res) => {
    const city = req.query.city ? String(req.query.city) : null;
    if (!req.query.lat && !req.query.lng && !city) {
      res.status(400).json({ status: 'error', message: 'lat/lng or city is required' });
      return;
    }
    let lat = String(req.query.lat ?? '');
    let lng = String(req.query.lng ?? '');
    try {
      if (city && !req.query.lat && !req.query.lng) {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            lat = String(geoData.results[0].latitude);
            lng = String(geoData.results[0].longitude);
          }
        }
      }

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,precipitation_probability` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
        `&timezone=auto&forecast_days=14`;
      const apiRes = await fetch(url);
      if (!apiRes.ok) throw new Error('open-meteo upstream error');
      const data = (await apiRes.json());
      res.json({
        temp_current: Math.round(data.current?.temperature_2m || 0),
        temp_max: Math.round(data.daily?.temperature_2m_max?.[0] || 0),
        temp_min: Math.round(data.daily?.temperature_2m_min?.[0] || 0),
        rain_prob: data.current?.precipitation_probability ?? data.daily?.precipitation_probability_max?.[0] ?? 0,
        daily: data.daily?.time?.map((timeStr, idx) => ({
           date: timeStr,
           temp_max: Math.round(data.daily.temperature_2m_max[idx]),
           temp_min: Math.round(data.daily.temperature_2m_min[idx]),
           rain_prob: data.daily.precipitation_probability_max[idx],
           weather_code: data.daily.weather_code[idx]
        })) || []
      });
    } catch {
      res.status(503).json({ status: 'error', message: 'weather service unavailable' });
    }
  });

  app.get('/api/flights', async (req, res) => {
    if (!getRequestUserId(req) && AUTH_REQUIRED) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const rows = await repo.getAllFlights();
    res.json(rows);
  });

  app.get('/api/collaborators', async (req, res) => {
    if (!getRequestUserId(req) && AUTH_REQUIRED) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const tripId = String(req.query.trip_id ?? '').trim();
    const rows = tripId ? await repo.getCollaboratorsByTrip(tripId) : await repo.getCollaborators();
    res.json(rows.map((r) => ({ id: r.id, name: r.name, avatar: r.avatar })));
  });

  // ── User Preferences ────────────────────────────────────────────────────────
  app.get('/api/user/preferences', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const [savedItems, trackedPrices] = await Promise.all([
      repo.getUserSavedItems(userId),
      repo.getUserTrackedPrices(userId),
    ]);
    res.json({ saved_items: savedItems, tracked_prices: trackedPrices });
  });

  app.post('/api/user/saves', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const itemId = String(req.body?.item_id ?? '').trim();
    if (!itemId) {
      res.status(400).json({ status: 'error', message: 'item_id is required' });
      return;
    }
    await repo.saveUserItem(userId, itemId);
    res.status(201).json({ status: 'success' });
  });

  app.delete('/api/user/saves/:item_id', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    await repo.unsaveUserItem(userId, req.params.item_id);
    res.json({ status: 'success' });
  });

  app.post('/api/user/tracks', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const itemId = String(req.body?.item_id ?? '').trim();
    if (!itemId) {
      res.status(400).json({ status: 'error', message: 'item_id is required' });
      return;
    }
    await repo.trackUserPrice(userId, itemId);
    res.status(201).json({ status: 'success' });
  });

  app.delete('/api/user/tracks/:item_id', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    await repo.untrackUserPrice(userId, req.params.item_id);
    res.json({ status: 'success' });
  });

  // ── User Trips ──────────────────────────────────────────────────────────────
  app.get('/api/user/trips', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const tripRows = await repo.getTripsByUser(userId);
    res.json(
      tripRows.map((trip) => ({
        tripId: trip.id,
        name: trip.name,
        destination: trip.destination ?? '',
      })),
    );
  });

  // ── Trip: Create new trip ────────────────────────────────────────────────────
  app.post('/api/trips', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const { name, destination } = req.body ?? {};
    if (!name?.trim()) {
      res.status(400).json({ status: 'error', message: 'name is required' });
      return;
    }
    const tripId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await repo.createTrip({ id: tripId, name: String(name).trim(), destination: destination ? String(destination).trim() : undefined });
    await repo.addTripMember(tripId, userId, 'owner');
    res.status(201).json({ status: 'success', data: { id: tripId, name: String(name).trim(), destination: destination ?? null } });
  });

  // ── Trip: public preview (requires auth, no membership needed) ──────────────
  app.get('/api/trips/:trip_id/preview', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const info = await buildTripInfo(repo, req.params.trip_id);
    if (!info) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }
    res.json(info);
  });

  // ── Trip: Join via invite link ───────────────────────────────────────────────
  app.post('/api/trips/:trip_id/join', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const trip = await repo.getTripById(req.params.trip_id);
    if (!trip) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }
    await repo.ensureTripMember({ tripId: req.params.trip_id, userId, role: 'editor' });
    res.json({ status: 'success', trip_id: req.params.trip_id });
  });

  app.post('/api/trips/:trip_id/clone', async (req, res) => {
    const tripId = req.params.trip_id;
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }

    let trip = await repo.getTripById(tripId);
    let nodes = await repo.getItineraryNodes(tripId);
    
    if (!trip) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }

    // Create new trip
    const newTripId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await repo.createTrip({
      id: newTripId,
      name: `${trip.name} (複製)`,
      destination: trip.destination,
    });
    // Add user as owner
    await repo.addTripMember(newTripId, userId, 'owner');

    // Copy nodes
    for (const node of nodes) {
      await repo.upsertItineraryNode(newTripId, {
        node_id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        day: node.day,
        time: node.time || '10:00',
        title: node.title,
        emoji: node.emoji || '📍',
        category: node.category || 'spot',
      });
    }

    res.json({ status: 'success', data: { new_trip_id: newTripId } });
  });

  app.get('/api/trips/:trip_id', async (req, res) => {
    const tripId = req.params.trip_id;
    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const info = await buildTripInfo(repo, tripId);
    if (!info) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }

    res.json(info);
  });

  app.get('/api/trips/:trip_id/facts', async (req, res) => {
    const tripId = req.params.trip_id;
    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const facts = await repo.getTripTravelFacts(tripId);
    res.json(summarizeTravelFacts(facts));
  });

  app.post('/api/trips/:trip_id/facts', async (req, res) => {
    const tripId = req.params.trip_id;
    const allowed = await ensureTripRole(req, res, tripId, 'editor');
    if (!allowed) return;

    const {
      factType,
      source = 'manual',
      title,
      startAt,
      endAt,
      locationName,
      lat,
      lng,
      referenceCode,
      metadata,
    } = req.body ?? {};

    if (!factType || !title?.trim()) {
      res.status(400).json({ status: 'error', message: 'factType and title are required' });
      return;
    }

    const created = await repo.createTripTravelFact(tripId, {
      factType: String(factType),
      source: String(source),
      title: String(title).trim(),
      startAt,
      endAt,
      locationName: locationName ? String(locationName).trim() : null,
      lat: Number.isFinite(Number(lat)) ? Number(lat) : null,
      lng: Number.isFinite(Number(lng)) ? Number(lng) : null,
      referenceCode: referenceCode ? String(referenceCode).trim() : null,
      metadata: metadata && typeof metadata === 'object' ? metadata : null,
    });

    res.status(201).json(mapTravelFactRow(created));
  });

  app.patch('/api/trips/:trip_id/facts/:fact_id', async (req, res) => {
    const tripId = req.params.trip_id;
    const factId = req.params.fact_id;
    const allowed = await ensureTripRole(req, res, tripId, 'editor');
    if (!allowed) return;

    const existing = await repo.getTripTravelFactById(factId);
    if (!existing || existing.tripId !== tripId) {
      res.status(404).json({ status: 'error', message: 'travel fact not found' });
      return;
    }

    const updated = await repo.updateTripTravelFact(factId, {
      factType: String(req.body?.factType ?? existing.factType),
      source: String(req.body?.source ?? existing.source),
      title: String(req.body?.title ?? existing.title).trim(),
      startAt: req.body?.startAt ?? existing.startAt,
      endAt: req.body?.endAt ?? existing.endAt,
      locationName: req.body?.locationName ?? existing.locationName,
      lat: req.body?.lat ?? existing.lat,
      lng: req.body?.lng ?? existing.lng,
      referenceCode: req.body?.referenceCode ?? existing.referenceCode,
      metadata: req.body?.metadata ?? existing.metadata,
    });

    res.json(mapTravelFactRow(updated));
  });

  app.delete('/api/trips/:trip_id/facts/:fact_id', async (req, res) => {
    const tripId = req.params.trip_id;
    const factId = req.params.fact_id;
    const allowed = await ensureTripRole(req, res, tripId, 'editor');
    if (!allowed) return;

    const existing = await repo.getTripTravelFactById(factId);
    if (!existing || existing.tripId !== tripId) {
      res.status(404).json({ status: 'error', message: 'travel fact not found' });
      return;
    }

    await repo.deleteTripTravelFact(factId);
    res.json({ status: 'success' });
  });

  app.get('/api/itinerary', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const nodes = await repo.getItineraryNodes(tripId);
    const formatted = nodes.map((node, index) => {
      const lat = node.lat ?? null;
      const lng = node.lng ?? null;
      return {
        id: node.nodeId,
        day: node.day,
        date: normalizeDateOnlyInput(node.date) ?? formatDateOnly(node.timestamp) ?? null,
        time: node.time,
        timestamp: toIsoTimestamp(node.timestamp),
        sort_order: Number(node.sortOrder ?? index + 1),
        location: node.title,
        icon: node.emoji,
        category: node.category ?? 'other',
        node_id: node.nodeId,
        title: node.title,
        emoji: node.emoji,
        lat,
        lng,
        coords: lat != null ? null : { top: `${18 + index * 20}%`, left: `${25 + (index % 2) * 35}%` },
        description: node.description ?? null,
        is_visited: node.isVisited ?? false,
        transport_to_next: node.transportToNext ?? null,
        image_url: node.imageUrl ?? null,
        linkedFactId: node.linkedFactId ?? null,
      };
    });

    res.json(formatted);
  });

  app.post('/api/itinerary/sync', async (req, res) => {
    const { trip_id, action, payload } = req.body as {
      trip_id?: string;
      action?: string;
      payload?: { node_id?: string; day?: number; date?: string; time?: string; timestamp?: string; sort_order?: number; title?: string; emoji?: string; category?: string; lat?: number | null; lng?: number | null; description?: string; is_visited?: boolean; transport_to_next?: string; image_url?: string; linkedFactId?: string };
    };

    if (!trip_id || action !== 'add_node' || !payload?.node_id || !payload.time || !payload.title) {
      res.status(400).json({ status: 'error', message: 'invalid sync payload' });
      return;
    }

    const allowed = await ensureTripRole(req, res, trip_id, 'editor');
    if (!allowed) return;

    const linkedFactAllowed = await validateLinkedFactId(repo, trip_id, payload.linkedFactId);
    if (!linkedFactAllowed) {
      res.status(400).json({ status: 'error', message: 'linked travel fact is invalid' });
      return;
    }

    await repo.upsertItineraryNode(trip_id, {
      node_id: payload.node_id,
      day: payload.day,
      date: normalizeDateOnlyInput(payload.date) ?? undefined,
      time: payload.time,
      timestamp: payload.timestamp ?? buildNodeTimestamp(payload.date, payload.time)?.toISOString(),
      sort_order: payload.sort_order,
      title: payload.title,
      emoji: payload.emoji,
      category: payload.category,
      lat: payload.lat,
      lng: payload.lng,
      is_visited: payload.is_visited,
      description: payload.description,
      transport_to_next: payload.transport_to_next,
      image_url: payload.image_url,
      linkedFactId: payload.linkedFactId,
    });

    await appendPlanningRecord({
      trip_id,
      action: 'add_node',
      node_id: payload.node_id,
      day: Number(payload.day ?? 1),
      time: payload.time,
      title: payload.title,
      category: payload.category ?? 'other',
      source: 'api',
      timestamp: new Date().toISOString(),
    });
    await updatePlanningSnapshot(repo, trip_id);

    io.to(trip_id).emit('sync_itinerary', {
      trip_id,
      action: 'add_node',
      payload: {
        node_id: payload.node_id,
        day: Number(payload.day ?? 1),
        date: normalizeDateOnlyInput(payload.date) ?? null,
        time: payload.time,
        timestamp: payload.timestamp ?? buildNodeTimestamp(payload.date, payload.time)?.toISOString() ?? null,
        sort_order: Number(payload.sort_order ?? 0),
        title: payload.title,
        emoji: payload.emoji ?? '📍',
        category: payload.category ?? 'other',
        lat: payload.lat ?? null,
        lng: payload.lng ?? null,
        is_visited: payload.is_visited ?? false,
        description: payload.description ?? '',
        transport_to_next: payload.transport_to_next ?? null,
        image_url: payload.image_url ?? null,
        linkedFactId: payload.linkedFactId,
      },
    });

    res.json({ status: 'success' });
  });

  app.delete('/api/itinerary/:node_id', async (req, res) => {
    const nodeId = String(req.params.node_id ?? '').trim();
    if (!nodeId) {
      res.status(400).json({ status: 'error', message: 'node_id required' });
      return;
    }

    const existed = await repo.findItineraryNode(nodeId);
    if (!existed) {
      res.status(404).json({ status: 'error', message: 'node not found' });
      return;
    }

    const allowed = await ensureTripRole(req, res, existed.tripId, 'editor');
    if (!allowed) return;

    const deleted = await repo.deleteItineraryNode(nodeId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'node not found' });
      return;
    }

    io.to(existed.tripId).emit('sync_itinerary', {
      trip_id: existed.tripId,
      action: 'remove_node',
      payload: { node_id: nodeId },
    });

    await appendPlanningRecord({
      trip_id: existed.tripId,
      action: 'remove_node',
      node_id: nodeId,
      source: 'api',
      timestamp: new Date().toISOString(),
    });
    await updatePlanningSnapshot(repo, existed.tripId);

    res.json({ status: 'success' });
  });

  app.get('/api/itinerary/planning-log', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const limit = Number(req.query.limit ?? 100);
    const data = await getPlanningRecords(tripId, Number.isFinite(limit) ? limit : 100);
    res.json({ status: 'success', data });
  });

  app.get('/api/itinerary/planning-snapshot', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const snapshot = await getPlanningSnapshot(tripId);
    res.json({ status: 'success', data: snapshot ?? [] });
  });

  app.post('/api/track/clickout', async (req, res) => {
    const { user_id, item_id, provider, timestamp } = req.body as {
      user_id?: string;
      item_id?: string;
      provider?: string;
      timestamp?: string;
    };

    if (!user_id || !item_id || !provider || !timestamp) {
      res.status(400).json({ status: 'error', message: 'invalid clickout payload' });
      return;
    }

    res.status(202).json({ status: 'accepted' });

    setImmediate(() => {
      void repo.addClickoutLog({
        userId: user_id,
        itemId: item_id,
        provider,
        eventTimestamp: new Date(timestamp),
      });
    });
  });

  app.get('/api/checklist', async (req, res) => {
    if (!getRequestUserId(req) && AUTH_REQUIRED) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const tripId = String(req.query.trip_id ?? '').trim();
    const rows = tripId ? await repo.getChecklist(tripId) : [];
    res.json(rows.map((row) => ({ id: row.id, text: row.content, checked: Boolean(row.completed) })));
  });

  app.post('/api/checklist', async (req, res) => {
    if (!getRequestUserId(req) && AUTH_REQUIRED) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const { trip_id, items } = req.body;
    if (!trip_id || !Array.isArray(items)) {
      res.status(400).json({ status: 'error', message: 'trip_id and items array required' });
      return;
    }
    await repo.updateChecklist(trip_id, items);
    res.json({ status: 'success' });
  });

  app.post('/api/ledger/expense', async (req, res) => {
    const { trip_id, title, amount, currency, payer, split_with } = req.body as {
      trip_id?: string;
      title?: string;
      amount?: number;
      currency?: string;
      payer?: string;
      split_with?: unknown;
    };

    const members = normalizeMembers(split_with);
    const safeAmount = Number(amount);
    if (!trip_id || !title || !payer || members.length === 0 || !Number.isFinite(safeAmount) || safeAmount <= 0) {
      res.status(400).json({ status: 'error', message: 'invalid ledger payload' });
      return;
    }

    const allowed = await ensureTripRole(req, res, trip_id, 'editor');
    if (!allowed) return;

    if (!members.includes(payer)) members.push(payer);

    await repo.addLedgerExpense(trip_id, {
      payer_id: payer,
      amount: safeAmount,
      description: title,
    });

    const settlementRows = await repo.getAggregatedSettlements(trip_id);
    res.json({ status: 'success', settlements: settlementRows });
  });

  app.get('/api/settlements', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const rows = await repo.getAggregatedSettlements(tripId);
    res.json(rows);
  });

  app.post('/api/settlements/clear', async (req, res) => {
    const { trip_id, from_name, to_name, currency } = req.body as {
      trip_id?: string;
      from_name?: string;
      to_name?: string;
      currency?: string;
    };
    if (!trip_id || !from_name || !to_name) {
      res.status(400).json({ status: 'error', message: 'trip_id, from_name, to_name are required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, trip_id, 'editor');
    if (!allowed) return;

    await repo.clearSettlements(trip_id);
    const rows = await repo.getAggregatedSettlements(trip_id);
    res.json({ status: 'success', settlements: rows });
  });

  app.get('/api/settlements/history', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }
    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;
    const history = await repo.getSettlementHistory(tripId);
    res.json(history);
  });

  app.get('/api/favorites', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const rows = await repo.getFavoritesByTrip(tripId);
    res.json(
      rows.map((row) => ({
        id: row.id,
        trip_id: row.tripId,
        title: row.title,
        emoji: row.emoji,
        lat: row.lat,
        lng: row.lng,
      })),
    );
  });

  app.post('/api/favorites', async (req, res) => {
    const { trip_id, title, emoji } = req.body as { trip_id?: string; title?: string; emoji?: string };
    if (!trip_id || !title?.trim()) {
      res.status(400).json({ status: 'error', message: 'trip_id and title required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, trip_id, 'editor');
    if (!allowed) return;

    const trip = await repo.getTripById(trip_id);
    if (!trip) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }

    const coords = await geocodeSpot(title.trim(), trip.destination);
    const favorite = await repo.createFavorite(trip_id, {
      id: `fav_${Date.now()}`,
      title: title.trim(),
      emoji: emoji ?? '📍',
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });

    res.status(201).json({
      id: favorite.id,
      trip_id: favorite.tripId,
      title: favorite.title,
      emoji: favorite.emoji,
      lat: favorite.lat,
      lng: favorite.lng,
    });
  });

  app.delete('/api/favorites/:id', async (req, res) => {
    const id = String(req.params.id ?? '').trim();
    const favorite = await repo.getFavoriteById(id);
    if (!favorite) {
      res.status(404).json({ status: 'error', message: 'favorite not found' });
      return;
    }

    const allowed = await ensureTripRole(req, res, favorite.tripId, 'editor');
    if (!allowed) return;

    const removed = await repo.deleteFavorite(id);
    if (!removed) {
      res.status(404).json({ status: 'error', message: 'favorite not found' });
      return;
    }

    res.json({ status: 'success' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!REAL_BACKEND_BASE_URL) {
    try {
      const flights = await repo.getAllFlights();
      if (flights.length === 0) {
        console.log('Seeding demo flights...');
        const demoFlights = [
          { id: 'f1', provider: 'EVA Air', time: '08:00 - 12:15', price: 12500 },
          { id: 'f2', provider: 'Starlux Airlines', time: '10:30 - 14:45', price: 14200 },
          { id: 'f3', provider: 'China Airlines', time: '12:00 - 16:15', price: 11800 },
          { id: 'f4', provider: 'Tigerair Taiwan', time: '14:20 - 17:05', price: 8500 },
          { id: 'f5', provider: 'Peach Aviation', time: '16:55 - 20:40', price: 7900 },
        ];
        for (const f of demoFlights) {
          await db.insert(schema.flights).values(f).onConflictDoNothing();
        }
        console.log('Demo flights seeded successfully');
      }

      const publicTrips = await repo.getPublicTrips(1);
      if (publicTrips.length === 0) {
        console.log('Seeding demo public trips...');
        // Create a fake author if it doesn't exist
        const authorId = 'seeder_1';
        await repo.createUserWithPassword(authorId, 'Travel Guru', 'nomatter');
        
        const demoTrips = [
          { id: 'h1', name: '東京散策：巷弄裡的小秘密', destination: '東京', userId: authorId, role: 'owner' },
          { id: 'h2', name: '大阪美食地圖 2024', destination: '大阪', userId: authorId, role: 'owner' },
          { id: 'h3', name: '京都紅葉季完全攻略', destination: '京都', userId: authorId, role: 'owner' },
        ];
        
        for (const mt of demoTrips) {
          await repo.createTrip({ id: mt.id, name: mt.name, destination: mt.destination });
          await repo.addTripMember(mt.id, mt.userId, mt.role);
          await repo.upsertItineraryNode(mt.id, {
            node_id: `node_start_${mt.id}`,
            day: 1,
            time: '10:00',
            title: '抵達地點',
            emoji: '📍',
            category: 'spot',
          });
        }
        console.log('Demo trips seeded successfully');
      }
    } catch (e) {
      console.error('Failed to seed demo data', e);
    }
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (REAL_BACKEND_BASE_URL) {
      console.log(`API mode: proxy -> ${REAL_BACKEND_BASE_URL}`);
    } else {
      console.log(`API mode: postgres repository (seed demo data = ${SHOULD_SEED_DEMO_DATA})`);
    }
    console.log(`Auth mode: ${AUTH_REQUIRED ? 'required' : 'optional'}`);
    console.log(`Redis mode: ${redisClient?.isOpen ? `connected (${REDIS_URL ?? 'custom'})` : 'disabled/fallback memory'}`);
  });

  const shutdown = async () => {
    try {
      await redisClient?.quit();
    } catch {
      // ignore shutdown error
    }
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

startServer().catch((error) => {
  console.error('Server failed to start', error);
  process.exit(1);
});
