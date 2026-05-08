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

const REAL_BACKEND_BASE_URL = process.env.REAL_BACKEND_BASE_URL?.replace(/\/+$/, '');
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

const TOKYO_COORDS: Record<string, { lat: number; lng: number }> = {
  淺草寺: { lat: 35.7148, lng: 139.7967 },
  晴空塔: { lat: 35.7101, lng: 139.8107 },
  上野公園: { lat: 35.7159, lng: 139.7738 },
  築地市場: { lat: 35.6654, lng: 139.7707 },
  新宿御苑: { lat: 35.6851, lng: 139.7099 },
  台場: { lat: 35.6277, lng: 139.775 },
  渋谷: { lat: 35.658, lng: 139.7016 },
  秋葉原: { lat: 35.6984, lng: 139.7731 },
  東京鐵塔: { lat: 35.6586, lng: 139.7454 },
  明治神宮: { lat: 35.6763, lng: 139.6993 },
};

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
  if (!OTA_PROVIDER_URL) return null;
  try {
    const url = `${OTA_PROVIDER_URL}/flights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json) || json.length === 0) return null;
    return (json as Record<string, unknown>[]).map((item, idx) => ({
      id: String(item.id ?? `ota_${idx}`),
      type: 'flight' as const,
      provider: String(item.provider ?? 'OTA'),
      title: String(item.title ?? `${from} \u2192 ${to}`),
      price: Number(item.price ?? 0),
      currency: String(item.currency ?? 'TWD'),
      emoji: '\u2708\uFE0F',
      affiliate_url: String(item.affiliate_url ?? ''),
    }));
  } catch {
    return null;
  }
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

async function geocodeSpot(title: string, city = '東京'): Promise<{ lat: number; lng: number } | null> {
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
        payload?: { node_id?: string; day?: number; time?: string; title?: string; emoji?: string; category?: string; lat?: number | null; lng?: number | null };
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

        await repo.upsertItineraryNode(event.trip_id, {
          node_id: event.payload.node_id,
          day: event.payload.day,
          time: event.payload.time,
          title: event.payload.title,
          emoji: event.payload.emoji,
          category: event.payload.category,
          lat: event.payload.lat,
          lng: event.payload.lng,
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
            time: event.payload.time,
            title: event.payload.title,
            emoji: event.payload.emoji ?? '📍',
            category: event.payload.category ?? 'other',
            lat: event.payload.lat ?? null,
            lng: event.payload.lng ?? null,
          },
        });
      },
    );
  });

  app.get('/api/trips/:trip_id/flights', async (req, res) => {
    await new Promise((r) => setTimeout(r, 800)); // Simulate realistic OTA fetch
    res.json([
      { airline: 'EVA Air', direct: true, duration: '3h 45m', price: 14500, depTime: '10:00', depCode: 'TPE', arrTime: '14:45', arrCode: 'NRT' },
      { airline: 'Starlux Airlines', direct: true, duration: '3h 30m', price: 16800, depTime: '12:30', depCode: 'TPE', arrTime: '16:40', arrCode: 'NRT' }
    ]);
  });

  app.get('/api/trips/:trip_id/activities', async (req, res) => {
    await new Promise((r) => setTimeout(r, 800)); // Simulate realistic OTA fetch
    res.json([
      { img: 'https://images.unsplash.com/photo-1542931287-023b922fa89b?auto=format&fit=crop&q=80&w=200&h=200', title: 'Tokyo Skytree fast-track Admission Ticket', rating: 4.8, reviews: '12k', price: 580 },
      { img: 'https://images.unsplash.com/photo-1505069818817-5fa76483161a?auto=format&fit=crop&q=80&w=200&h=200', title: 'Tokyo Disney Resort 1-Day Pass', rating: 4.9, reviews: '45k', price: 2100 }
    ]);
  });

  app.post('/api/generate/itinerary', async (req, res) => {
    try {
      const { generateItinerary } = await import('./src/server/services/aiItineraryService');
      const nodes = await generateItinerary(req.body);
      res.json({ status: 'success', data: nodes });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Failed to generate itinerary' });
    }
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

  app.get('/api/search', async (req, res) => {
    const from = String(req.query.from ?? '').trim().toUpperCase();
    const to = String(req.query.to ?? '').trim().toUpperCase();
    const date = String(req.query.date ?? '').trim();

    // If no params, return "Popular Recommendations" (latest flights)
    if (!from || !to || !date) {
      const flightRows = await repo.getAllFlights();
      const results = flightRows.map((f: any) => ({
        id: `flight_${f.id}`,
        type: 'flight',
        provider: f.provider,
        title: `熱門推薦: ${f.provider}`,
        price: f.price,
        currency: 'TWD',
        emoji: '✈️',
        affiliate_url: 'https://jelly.roam'
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
      const flightRows = await repo.getTopFlights(4);
      if (flightRows.length === 0) {
        res.status(503).json({ status: 'error', message: 'no flight provider data available' });
        return;
      }
      data = flightRows.map((flight) => ({
        id: `flight_${flight.id}`,
        type: 'flight' as const,
        provider: flight.provider,
        title: `${from} -> ${to} (${flight.time})`,
        price: flight.price,
        currency: 'TWD',
        emoji: '✈️',
        affiliate_url: `https://partner.example.com/flights/${encodeURIComponent(flight.id)}`,
      }));
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
    // Return some mock creator handbooks
    res.json([
      { id: 'h1', title: '東京散策：巷弄裡的小秘密', author: 'Jelly Explorer', likes: 1205, cover: 'https://images.unsplash.com/photo-1540959733332-e94e270b4052?w=800' },
      { id: 'h2', title: '大阪美食地圖 2024', author: 'Foodie Bear', likes: 890, cover: 'https://images.unsplash.com/photo-1590559899731-a382839e5449?w=800' },
      { id: 'h3', title: '京都紅葉季完全攻略', author: 'Maple Fan', likes: 2100, cover: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800' }
    ]);
  });

  app.get('/api/weather', async (req, res) => {
    const lat = String(req.query.lat ?? '35.6762');
    const lng = String(req.query.lng ?? '139.6503');
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,precipitation_probability` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&timezone=Asia%2FTokyo&forecast_days=1`;
      const apiRes = await fetch(url);
      if (!apiRes.ok) throw new Error('open-meteo upstream error');
      const data = (await apiRes.json()) as {
        current: { temperature_2m: number; precipitation_probability: number };
        daily: { temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[] };
      };
      res.json({
        temp_current: Math.round(data.current.temperature_2m),
        temp_max: Math.round(data.daily.temperature_2m_max[0]),
        temp_min: Math.round(data.daily.temperature_2m_min[0]),
        rain_prob: data.current.precipitation_probability ?? data.daily.precipitation_probability_max[0],
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
    res.json(tripRows);
  });

  // ── Trip: public preview (requires auth, no membership needed) ──────────────
  app.get('/api/trips/:trip_id/preview', async (req, res) => {
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
    res.json({ trip_id: trip.tripId, name: trip.name, destination: trip.destination, days: trip.days });
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

  app.get('/api/trips/:trip_id', async (req, res) => {
    const tripId = req.params.trip_id;
    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const trip = await repo.getTripById(tripId);
    if (!trip) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }

    res.json({
      trip_id: trip.tripId,
      name: trip.name,
      destination: trip.destination,
      days: trip.days,
    });
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
      const knownCoords = TOKYO_COORDS[node.title];
      const lat = node.lat ?? knownCoords?.lat ?? null;
      const lng = node.lng ?? knownCoords?.lng ?? null;
      return {
        id: node.nodeId,
        day: node.day,
        time: node.time,
        location: node.title,
        icon: node.emoji,
        category: node.category ?? 'other',
        lat,
        lng,
        coords: lat != null ? null : { top: `${18 + index * 20}%`, left: `${25 + (index % 2) * 35}%` },
      };
    });

    res.json(formatted);
  });

  app.post('/api/itinerary/sync', async (req, res) => {
    const { trip_id, action, payload } = req.body as {
      trip_id?: string;
      action?: string;
      payload?: { node_id?: string; day?: number; time?: string; title?: string; emoji?: string; category?: string; lat?: number | null; lng?: number | null };
    };

    if (!trip_id || action !== 'add_node' || !payload?.node_id || !payload.time || !payload.title) {
      res.status(400).json({ status: 'error', message: 'invalid sync payload' });
      return;
    }

    const allowed = await ensureTripRole(req, res, trip_id, 'editor');
    if (!allowed) return;

    await repo.upsertItineraryNode(trip_id, {
      node_id: payload.node_id,
      day: payload.day,
      time: payload.time,
      title: payload.title,
      emoji: payload.emoji,
      category: payload.category,
      lat: payload.lat,
      lng: payload.lng,
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
        time: payload.time,
        title: payload.title,
        emoji: payload.emoji ?? '📍',
        category: payload.category ?? 'other',
        lat: payload.lat ?? null,
        lng: payload.lng ?? null,
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
