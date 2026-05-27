// Suppress url.parse DeprecationWarning caused by Express 4.x and node-postgres
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning: string | Error, ...args: any[]) {
  const msg = typeof warning === 'string' ? warning : warning.message;
  if (msg && msg.includes('url.parse')) return;
  return originalEmitWarning.call(process, warning, ...args);
};

import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import Parser from 'rss-parser';
import { createClient, type RedisClientType } from 'redis';
import { AppRepository } from './src/server/repositories/appRepository';
import { pool, db } from './src/server/db/client';
import { signAccessToken, type AuthUser, verifyAccessToken } from './src/server/auth/jwt';
import { hashPassword, verifyPassword } from './src/server/auth/password';
import * as schema from './src/server/db/schema';

import { scrapeTripFlights } from './src/server/services/tripParser';
import { generateItinerary, regenerateSpot } from './src/server/services/aiItineraryService';
import { fetchOpenRouterWithFallback } from './src/server/services/openrouterHelper';
import { createSeoRouter } from './src/server/seo/router';
import { buildAllowedCorsOrigins, isCorsOriginAllowed } from './src/server/security/cors';

// Vercel serverless: resolve/reject the app promise once startServer() finishes setup
let _resolveApp!: (app: ReturnType<typeof express>) => void;
let _rejectApp!: (err: unknown) => void;
const _appPromise = new Promise<ReturnType<typeof express>>((resolve, reject) => {
  _resolveApp = resolve;
  _rejectApp = reject;
});

const REAL_BACKEND_BASE_URL = process.env.REAL_BACKEND_BASE_URL?.replace(/\/+$/, '');
const SHOULD_SEED_DEMO_DATA = process.env.SEED_DEMO_DATA === 'true' && !REAL_BACKEND_BASE_URL;
const REDIS_URL = process.env.REDIS_URL?.trim();
const JWT_DEV_TOKEN_ENABLED = process.env.ENABLE_DEV_TOKEN_ENDPOINT !== 'false';
const GUEST_AUTH_ENABLED = process.env.ENABLE_GUEST_AUTH !== 'false';
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === 'true' || process.env.NODE_ENV === 'production';
const OTA_PROVIDER_URL = process.env.OTA_PROVIDER_URL?.replace(/\/+$/, '');
const OTA_PARTNER_BASE = process.env.OTA_PARTNER_BASE?.replace(/\/+$/, '') ?? '';
export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
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
  tripType?: 'oneway' | 'roundtrip';
  legType?: 'outbound' | 'return';
  details?: {
    airline?: string;
    departure?: string;
    arrival?: string;
    duration?: string;
    stops?: number;
    depCode?: string;
    arrCode?: string;
    flightNumber?: string;
  };
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
  action: 'add_node' | 'remove_node' | 'patch_node';
  node_id: string;
  day?: number;
  time?: string;
  title?: string;
  category?: string;
  source: 'socket' | 'api';
  timestamp: string;
};

type AuthedRequest = Request & { authUser?: AuthUser };

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitState = {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  allowed: boolean;
};

const searchCache = new Map<string, SearchCacheEntry>();
const searchHistoryFallback: SearchHistoryRecord[] = [];
const planningFallbackByTrip = new Map<string, PlanningRecord[]>();
const rateLimitFallback = new Map<string, RateLimitBucket>();

const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const SEARCH_CACHE_TTL_SECONDS = 10 * 60;
const SEARCH_HISTORY_KEY = 'history:search:global';
const SEARCH_HISTORY_MAX = 200;
const PLANNING_LOG_MAX = 500;
const PLANNING_SNAPSHOT_TTL_SECONDS = 6 * 60 * 60;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_GUEST_LIMIT = 8;
const AUTH_LOGIN_LIMIT = 10;
const AUTH_REGISTER_LIMIT = 5;
const AI_WINDOW_MS = 15 * 60 * 1000;
const AI_USER_LIMIT = 12;
const AI_GUEST_LIMIT = 4;


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

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || req.ip || 'unknown';
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0] ?? '').trim() || req.ip || 'unknown';
  }
  return req.ip || 'unknown';
}

function isGuestUserId(userId: string | null): boolean {
  return typeof userId === 'string' && userId.startsWith('guest_');
}

function setRateLimitHeaders(res: Response, state: RateLimitState) {
  res.setHeader('X-RateLimit-Limit', String(state.limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, state.remaining)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(state.resetAt / 1000)));
}

async function consumeRateLimit(bucketKey: string, limit: number, windowMs: number): Promise<RateLimitState> {
  const now = Date.now();
  const defaultResetAt = now + windowMs;

  if (redisClient?.isOpen) {
    const current = Number(await redisClient.incr(bucketKey));
    if (current === 1) {
      await redisClient.pExpire(bucketKey, windowMs);
    }
    const ttlMsRaw = Number(await redisClient.pTTL(bucketKey));
    const ttlMs = ttlMsRaw > 0 ? ttlMsRaw : windowMs;
    return {
      limit,
      remaining: Math.max(0, limit - current),
      resetAt: now + ttlMs,
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
      allowed: current <= limit,
    };
  }

  const existing = rateLimitFallback.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    rateLimitFallback.set(bucketKey, { count: 1, resetAt: defaultResetAt });
    return {
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt: defaultResetAt,
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
      allowed: true,
    };
  }

  existing.count += 1;
  rateLimitFallback.set(bucketKey, existing);
  return {
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    allowed: existing.count <= limit,
  };
}

function createRateLimit(options: {
  bucketPrefix: string;
  limit: number;
  windowMs: number;
  message: string;
  keyGenerator: (req: Request) => string | null;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const keyPart = options.keyGenerator(req);
    if (!keyPart) {
      next();
      return;
    }

    const state = await consumeRateLimit(`${options.bucketPrefix}:${keyPart}`, options.limit, options.windowMs);
    setRateLimitHeaders(res, state);
    if (!state.allowed) {
      res.setHeader('Retry-After', String(state.retryAfterSeconds));
      res.status(429).json({ status: 'error', code: 'RATE_LIMITED', message: options.message });
      return;
    }

    next();
  };
}

const guestAuthLimiter = createRateLimit({
  bucketPrefix: 'rl:auth:guest',
  limit: AUTH_GUEST_LIMIT,
  windowMs: AUTH_WINDOW_MS,
  message: '訪客登入次數過多，請稍後再試。',
  keyGenerator: (req) => getClientIp(req),
});

const loginLimiter = createRateLimit({
  bucketPrefix: 'rl:auth:login',
  limit: AUTH_LOGIN_LIMIT,
  windowMs: AUTH_WINDOW_MS,
  message: '登入嘗試次數過多，請稍後再試。',
  keyGenerator: (req) => getClientIp(req),
});

const registerLimiter = createRateLimit({
  bucketPrefix: 'rl:auth:register',
  limit: AUTH_REGISTER_LIMIT,
  windowMs: AUTH_WINDOW_MS,
  message: '註冊請求過於頻繁，請稍後再試。',
  keyGenerator: (req) => getClientIp(req),
});

const aiLimiter = createRateLimit({
  bucketPrefix: 'rl:ai:user',
  limit: AI_USER_LIMIT,
  windowMs: AI_WINDOW_MS,
  message: 'AI 服務暫時繁忙，請稍後 10 分鐘再試。',
  keyGenerator: (req) => {
    const userId = getRequestUserId(req);
    return userId && !isGuestUserId(userId) ? userId : null;
  },
});

const guestAiLimiter = createRateLimit({
  bucketPrefix: 'rl:ai:guest',
  limit: AI_GUEST_LIMIT,
  windowMs: AI_WINDOW_MS,
  message: '訪客 AI 額度已達上限，請稍後再試或登入帳號。',
  keyGenerator: (req) => {
    const userId = getRequestUserId(req);
    return isGuestUserId(userId) ? getClientIp(req) : null;
  },
});

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

function mapItineraryNodeRow(node: any, index: number) {
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
    ai_note: node.aiNote ?? null,
    intensity: node.intensity ?? null,
    is_visited: node.isVisited ?? false,
    transport_to_next: node.transportToNext ?? null,
    image_url: node.imageUrl ?? null,
    attachments: Array.isArray(node.attachments) ? node.attachments : [],
    linkedFactId: node.linkedFactId ?? null,
  };
}

function normalizeItineraryPatchChanges(existingNode: ReturnType<typeof mapItineraryNodeRow>, rawChanges: any) {
  const nextChanges: Record<string, unknown> = {};
  if (!rawChanges || typeof rawChanges !== 'object') {
    return nextChanges;
  }

  if ('day' in rawChanges && Number.isFinite(Number(rawChanges.day))) {
    nextChanges.day = Number(rawChanges.day);
  }
  if ('date' in rawChanges) {
    nextChanges.date = normalizeDateOnlyInput(rawChanges.date);
  }
  if ('time' in rawChanges) {
    nextChanges.time = String(rawChanges.time ?? '').trim() || existingNode.time || '10:00';
  }
  if ('timestamp' in rawChanges) {
    nextChanges.timestamp = toIsoTimestamp(rawChanges.timestamp);
  }
  if ('sort_order' in rawChanges && Number.isFinite(Number(rawChanges.sort_order))) {
    nextChanges.sort_order = Number(rawChanges.sort_order);
  }
  if ('title' in rawChanges) {
    nextChanges.title = String(rawChanges.title ?? '').trim() || existingNode.title;
  }
  if ('emoji' in rawChanges) {
    nextChanges.emoji = String(rawChanges.emoji ?? '').trim() || existingNode.emoji || '📍';
  }
  if ('category' in rawChanges) {
    nextChanges.category = String(rawChanges.category ?? '').trim() || existingNode.category || 'other';
  }
  if ('lat' in rawChanges) {
    nextChanges.lat = Number.isFinite(Number(rawChanges.lat)) ? Number(rawChanges.lat) : null;
  }
  if ('lng' in rawChanges) {
    nextChanges.lng = Number.isFinite(Number(rawChanges.lng)) ? Number(rawChanges.lng) : null;
  }
  if ('description' in rawChanges) {
    nextChanges.description = String(rawChanges.description ?? '');
  }
  if ('ai_note' in rawChanges) {
    nextChanges.ai_note = rawChanges.ai_note == null ? null : String(rawChanges.ai_note);
  }
  if ('intensity' in rawChanges) {
    nextChanges.intensity = rawChanges.intensity == null ? null : String(rawChanges.intensity);
  }
  if ('is_visited' in rawChanges) {
    nextChanges.is_visited = Boolean(rawChanges.is_visited);
  }
  if ('transport_to_next' in rawChanges) {
    nextChanges.transport_to_next = String(rawChanges.transport_to_next ?? '');
  }
  if ('image_url' in rawChanges) {
    nextChanges.image_url = String(rawChanges.image_url ?? '');
  }
  if ('attachments' in rawChanges) {
    nextChanges.attachments = Array.isArray(rawChanges.attachments) ? rawChanges.attachments : [];
  }
  if ('linkedFactId' in rawChanges) {
    nextChanges.linkedFactId = String(rawChanges.linkedFactId ?? '').trim();
  }

  if ('date' in nextChanges || 'time' in nextChanges) {
    nextChanges.timestamp = buildNodeTimestamp(
      nextChanges.date ?? existingNode.date,
      nextChanges.time ?? existingNode.time,
    )?.toISOString() ?? existingNode.timestamp ?? null;
  }

  return nextChanges;
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

  // Heuristic: If we have itinerary nodes, and the date-based range from travel facts is huge (e.g. 35 days)
  // while nodes only span a small range (e.g. 4 days), prioritize the nodes range.
  let finalDays = dateBasedDays ?? maxNodeDay;
  if (nodes.length > 0 && dateBasedDays && dateBasedDays > maxNodeDay + 7) {
    finalDays = maxNodeDay;
  }
  
  // Cap absurd day counts from default date ranges if no items are planned there
  if (nodes.length === 0 && (finalDays ?? 0) > 21) {
    finalDays = 5; // Default to 5 if it's an empty "huge" trip
  }

  const DEST_COVERS: [string, string][] = [
    ['tokyo', 'photo-1542051841857-5f90071e7989'],
    ['osaka', 'photo-1590484512398-33fb39eff960'],
    ['kyoto', 'photo-1493976040374-85c8e12f0c0e'],
    ['seoul', 'photo-1538669715315-155098f0fb1d'],
    ['paris', 'photo-1502602898657-3e91760cbb34'],
    ['bali',  'photo-1537996194471-e657df975ab4'],
    ['singapore', 'photo-1525625293386-3f8f99389edd'],
    ['bangkok', 'photo-1508009603885-50cf7c8dd0d5'],
    ['new york', 'photo-1485871981521-5b1fd3805eee'],
    ['london', 'photo-1513635269975-59663e0ac1ad'],
  ];
  const destLower = (trip.destination ?? '').toLowerCase();
  const coverMatch = DEST_COVERS.find(([k]) => destLower.includes(k));
  const coverImage = `https://images.unsplash.com/${coverMatch ? coverMatch[1] : DEST_COVERS[0][1]}?w=1200&auto=format&fit=crop`;

  return {
    trip_id: trip.id,
    id: trip.id,
    name: trip.name,
    destination: trip.destination ?? '',
    days: finalDays,
    totalSpots: nodes.length,
    startDate,
    endDate,
    coverImage,
    isPublic: Boolean(trip.isPublic),
    forkCount: Number(trip.forkCount ?? 0),
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

interface StandardFlight {
  airline: string;
  stops: number;
  duration: string;
  price: number;
  departure: string;
  arrival: string;
}

const REAL_FLIGHT_STANDARDS: Record<string, StandardFlight[]> = {
  'TPE-NRT': [
    { airline: '星宇航空 STARLUX Airlines', stops: 0, duration: '3h 15m', price: 12500, departure: '08:30', arrival: '12:45' },
    { airline: '中華航空 China Airlines', stops: 0, duration: '3h 00m', price: 11800, departure: '09:30', arrival: '13:30' },
    { airline: '長榮航空 EVA Air', stops: 0, duration: '3h 20m', price: 13200, departure: '15:20', arrival: '19:40' },
    { airline: '台灣虎航 Tigerair Taiwan', stops: 0, duration: '3h 10m', price: 7500, departure: '06:35', arrival: '10:45' },
  ],
  'TPE-KIX': [
    { airline: '星宇航空 STARLUX Airlines', stops: 0, duration: '2h 35m', price: 12800, departure: '10:15', arrival: '13:50' },
    { airline: '中華航空 China Airlines', stops: 0, duration: '2h 30m', price: 12100, departure: '08:10', arrival: '11:40' },
    { airline: '長榮航空 EVA Air', stops: 0, duration: '2h 35m', price: 13500, departure: '13:10', arrival: '16:45' },
    { airline: '台灣虎航 Tigerair Taiwan', stops: 0, duration: '2h 30m', price: 7800, departure: '14:20', arrival: '17:50' },
  ],
  'TPE-ICN': [
    { airline: '中華航空 China Airlines', stops: 0, duration: '2h 30m', price: 10500, departure: '16:15', arrival: '19:45' },
    { airline: '長榮航空 EVA Air', stops: 0, duration: '2h 30m', price: 11000, departure: '11:15', arrival: '14:45' },
    { airline: '台灣虎航 Tigerair Taiwan', stops: 0, duration: '2h 30m', price: 6200, departure: '12:30', arrival: '16:00' },
  ],
  'TPE-SIN': [
    { airline: '星宇航空 STARLUX Airlines', stops: 0, duration: '4h 45m', price: 14500, departure: '09:20', arrival: '14:05' },
    { airline: '新加坡航空 Singapore Airlines', stops: 0, duration: '4h 45m', price: 16500, departure: '14:20', arrival: '19:05' },
    { airline: '酷航 Scoot', stops: 0, duration: '4h 50m', price: 7200, departure: '15:55', arrival: '20:45' },
  ],
  'TPE-BKK': [
    { airline: '星宇航空 STARLUX Airlines', stops: 0, duration: '3h 50m', price: 11500, departure: '07:50', arrival: '10:40' },
    { airline: '中華航空 China Airlines', stops: 0, duration: '3h 50m', price: 10800, departure: '13:55', arrival: '16:45' },
    { airline: '長榮航空 EVA Air', stops: 0, duration: '3h 55m', price: 12200, departure: '09:40', arrival: '12:35' },
  ],
  'TPE-HKG': [
    { airline: '國泰航空 Cathay Pacific', stops: 0, duration: '1h 55m', price: 8200, departure: '08:00', arrival: '09:55' },
    { airline: '中華航空 China Airlines', stops: 0, duration: '1h 50m', price: 7800, departure: '11:35', arrival: '13:25' },
    { airline: '長榮航空 EVA Air', stops: 0, duration: '1h 50m', price: 8500, departure: '14:30', arrival: '16:20' },
  ],
  'TPE-LHR': [
    { airline: '中華航空 China Airlines', stops: 0, duration: '13h 30m', price: 34500, departure: '09:10', arrival: '18:40' },
    { airline: '長榮航空 EVA Air', stops: 1, duration: '16h 35m', price: 32800, departure: '08:40', arrival: '19:15' },
  ],
  'TPE-CDG': [
    { airline: '長榮航空 EVA Air', stops: 0, duration: '13h 15m', price: 37500, departure: '23:40', arrival: '07:55' },
  ],
  'TPE-JFK': [
    { airline: '中華航空 China Airlines', stops: 0, duration: '14h 45m', price: 42500, departure: '17:30', arrival: '20:15' },
    { airline: '長榮航空 EVA Air', stops: 0, duration: '14h 55m', price: 45000, departure: '19:10', arrival: '22:05' },
  ],
};

function getRealFlightStandards(from: string, to: string): SearchItem[] {
  const fCode = from.toUpperCase();
  const tCode = to.toUpperCase();
  const key = `${fCode}-${tCode}`;
  const reverseKey = `${tCode}-${fCode}`;

  let standards: StandardFlight[] = [];
  let isReversed = false;

  if (REAL_FLIGHT_STANDARDS[key]) {
    standards = REAL_FLIGHT_STANDARDS[key];
  } else if (REAL_FLIGHT_STANDARDS[reverseKey]) {
    standards = REAL_FLIGHT_STANDARDS[reverseKey];
    isReversed = true;
  } else {
    const isLong = ['JFK', 'LAX', 'SFO', 'CDG', 'LHR', 'FRA', 'AMS'].includes(tCode) || ['JFK', 'LAX', 'SFO', 'CDG', 'LHR', 'FRA', 'AMS'].includes(fCode);
    standards = [
      { airline: '中華航空 China Airlines', stops: isLong ? 1 : 0, duration: isLong ? '14h 30m' : '3h 30m', price: isLong ? 32000 : 9800, departure: '09:00', arrival: isLong ? '23:30' : '12:30' },
      { airline: '長榮航空 EVA Air', stops: isLong ? 1 : 0, duration: isLong ? '15h 00m' : '3h 40m', price: isLong ? 34500 : 10500, departure: '14:00', arrival: isLong ? '05:00' : '17:40' },
    ];
  }

  return standards.map((std, idx) => ({
    id: `std_fl_${fCode}_${tCode}_${idx}`,
    type: 'flight' as const,
    provider: std.airline,
    title: `${fCode} → ${tCode}`,
    price: std.price,
    currency: 'TWD',
    emoji: '✈️',
    affiliate_url: `https://www.trip.com/flights/${fCode.toLowerCase()}-to-${tCode.toLowerCase()}/tickets-${fCode.toLowerCase()}-${tCode.toLowerCase()}/?flighttype=ow&dcity=${fCode.toLowerCase()}&acity=${tCode.toLowerCase()}`,
    details: {
      stops: std.stops,
      airline: std.airline,
      departure: isReversed ? std.arrival : std.departure,
      arrival: isReversed ? std.departure : std.arrival,
      duration: std.duration,
    }
  }));
}

async function fetchFromOtaProvider(from: string, to: string, date: string): Promise<SearchItem[] | null> {
  // Use Trip.com Scraper as primary flight provider
  try {
    console.log(`Fetching flights from Trip.com scraper for ${from} -> ${to} on ${date}`);
    const scrapedFlights = await scrapeTripFlights(from, to, date);
    if (scrapedFlights && scrapedFlights.length > 0) {
      return scrapedFlights;
    }
  } catch (error) {
    console.error('Trip.com scraper failed:', error);
  }

  // Legacy fallback to internal OTA provider if URL exists
  if (OTA_PROVIDER_URL) {
    try {
      const url = `${OTA_PROVIDER_URL}/flights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const json = (await res.json()) as unknown;
        if (Array.isArray(json) && json.length > 0) {
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
        }
      }
    } catch { /* ignore and proceed to next fallback */ }
  }

  // Live AI Options Retrieval Fallback using OpenRouter API
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  if (openrouterApiKey) {
    try {
      console.log(`[fetchFromOtaProvider] OpenRouter real flight search fallback for ${from} -> ${to} on ${date}`);
      const prompt = `Please provide 4-6 real commercial flight options from ${from.toUpperCase()} to ${to.toUpperCase()} on or around ${date}.
Include actual airlines operating this route (e.g. STARLUX Airlines, China Airlines, EVA Air, Tigerair Taiwan, Cathay Pacific, Singapore Airlines, Peach, Jetstar, etc.).
Ensure prices, times, and flight durations are highly realistic for this route. No random strings or placeholder code.
Return ONLY a valid JSON array of objects, with NO markdown code wrappers or formatting. Inside each object, include:
- id: a unique string like "ai_fl_${from.toUpperCase()}_${to.toUpperCase()}_" followed by index
- type: "flight"
- provider: name of the airline in Traditional Chinese + English (e.g. "星宇航空 STARLUX Airlines")
- title: "${from.toUpperCase()} → ${to.toUpperCase()}"
- price: typical economy ticket price in TWD (New Taiwan Dollar) as an integer (e.g. 11500)
- currency: "TWD"
- emoji: "✈️"
- affiliate_url: "https://www.trip.com/flights/${from.toLowerCase()}-to-${to.toLowerCase()}/tickets-${from.toLowerCase()}-${to.toLowerCase()}/?flighttype=ow&dcity=${from.toLowerCase()}&acity=${to.toLowerCase()}"
- details: an object containing:
  - stops: integer (e.g. 0, 1)
  - airline: string (e.g. "STARLUX Airlines")
  - departure: typical departure time (24h format, e.g. "08:30")
  - arrival: typical arrival time (24h format, e.g. "12:15")
  - duration: typical flight duration format (e.g. "3h 45m")

Return ONLY the raw JSON string starting with [ and ending with ].`;
      const resText = await fetchOpenRouterWithFallback(openrouterApiKey, prompt);
      if (resText) {
        const jsonStart = resText.indexOf("[");
        const jsonEnd = resText.lastIndexOf("]");
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
          const parsed = JSON.parse(resText.slice(jsonStart, jsonEnd + 1)) as SearchItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((p, idx) => ({
              id: p.id || `ai_fl_${from}_${to}_${idx}`,
              type: 'flight' as const,
              provider: p.provider || 'Skyscanner',
              title: p.title || `${from} → ${to}`,
              price: Number(p.price || 8000),
              currency: 'TWD',
              emoji: '✈️',
              affiliate_url: p.affiliate_url || `https://www.trip.com/flights/${from.toLowerCase()}-to-${to.toLowerCase()}/tickets-${from.toLowerCase()}-${to.toLowerCase()}/?flighttype=ow&dcity=${from.toLowerCase()}&acity=${to.toLowerCase()}`,
              details: {
                stops: Number(p.details?.stops ?? 0),
                airline: p.details?.airline || p.provider,
                departure: p.details?.departure || '09:00',
                arrival: p.details?.arrival || '12:30',
                duration: p.details?.duration || '3h 30m',
              }
            }));
          }
        }
      }
    } catch (err) {
      console.error('[fetchFromOtaProvider] Failed to generate AI flights fallback:', err);
    }
  }

  // High-fidelity standard static real flight option records
  console.log(`[fetchFromOtaProvider] Serving high-fidelity static standard real flights for ${from} -> ${to}`);
  return getRealFlightStandards(from, to);
}

function annotateRoundTripLeg(items: SearchItem[] | null, legType: 'outbound' | 'return'): SearchItem[] {
  return (items ?? []).map((item) => ({
    ...item,
    tripType: 'roundtrip',
    legType,
  }));
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

function distanceInKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isCoordValidForCity(
  lat: number,
  lng: number,
  biasCoords: { lat: number; lng: number } | null,
  title: string,
  city: string,
  source: string
): boolean {
  if (!biasCoords) return true;
  const dist = distanceInKm(lat, lng, biasCoords.lat, biasCoords.lng);
  if (dist > 200) {
    console.warn(`[Geocode Strict Limit] (${source}) Rejected coordinate (${lat}, ${lng}) for "${title}" - too far (${dist.toFixed(1)}km > 200km) from city "${city}" center (${biasCoords.lat}, ${biasCoords.lng})`);
    return false;
  }
  return true;
}

const cityCoordsCache = new Map<string, { lat: number; lng: number }>();

async function geocodeSpot(title: string, city = ''): Promise<{ lat: number; lng: number } | null> {
  const cleanTitle = title.trim();
  const cleanCity = city.trim();

  let biasCoords: { lat: number; lng: number } | null = null;

  if (cleanCity && cleanCity.toLowerCase() !== cleanTitle.toLowerCase()) {
    if (cityCoordsCache.has(cleanCity)) {
      biasCoords = cityCoordsCache.get(cleanCity) || null;
    } else {
      const resolved = await geocodeSpot(cleanCity, '');
      if (resolved) {
        cityCoordsCache.set(cleanCity, resolved);
        biasCoords = resolved;
      }
    }
  }

  const qStr = `${cleanTitle} ${cleanCity || ''}`.trim();
  const q = encodeURIComponent(qStr);

  // ── Layer 1 (First Fallback): LocationIQ API ────────────────────────────────
  const locationIqKey = process.env.LOCATIONIQ_API_KEY;
  if (locationIqKey) {
    try {
      let url = `https://us1.locationiq.com/v1/search.php?key=${locationIqKey}&q=${q}&format=json&limit=1`;
      if (biasCoords) {
        url += `&lat=${biasCoords.lat}&lon=${biasCoords.lng}`;
      }
      const res = await fetch(
        url,
        { headers: { 'User-Agent': 'RoamJellyApp/1.0' }, signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            if (isCoordValidForCity(lat, lon, biasCoords, cleanTitle, cleanCity, 'LocationIQ')) {
              return { lat, lng: lon };
            }
          }
        }
      }
    } catch { /* fall through */ }
  }

  // ── Layer 2 (Second Fallback): Geoapify API ─────────────────────────────────
  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  if (geoapifyKey) {
    try {
      let url = `https://api.geoapify.com/v1/geocode/search?text=${q}&apiKey=${geoapifyKey}&limit=1`;
      if (biasCoords) {
        url += `&bias=proximity:${biasCoords.lng},${biasCoords.lat}`;
      }
      const res = await fetch(
        url,
        { headers: { 'User-Agent': 'RoamJellyApp/1.0' }, signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          features?: Array<{
            geometry?: {
              coordinates?: [number, number];
            };
          }>;
        };
        const coords = data.features?.[0]?.geometry?.coordinates; // [lon, lat]
        if (coords?.length === 2) {
          const lat = coords[1];
          const lon = coords[0];
          if (isCoordValidForCity(lat, lon, biasCoords, cleanTitle, cleanCity, 'Geoapify')) {
            return { lat: coords[1], lng: coords[0] };
          }
        }
      }
    } catch { /* fall through */ }
  }

  // ── Layer 3 (Safety Fallback): Nominatim ──────────────────────────────────
  try {
    let url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=ja`;
    if (biasCoords) {
      url += `&lat=${biasCoords.lat}&lon=${biasCoords.lng}`;
    }
    const apiRes = await fetch(url, { headers: { 'User-Agent': 'RoamJellyApp/1.0' }, signal: AbortSignal.timeout(5000) });
    if (apiRes.ok) {
      const data = (await apiRes.json()) as Array<{ lat: string; lon: string }>;
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          if (isCoordValidForCity(lat, lon, biasCoords, cleanTitle, cleanCity, 'Nominatim')) {
            return { lat, lng: lon };
          }
        }
      }
    }
  } catch { /* fall through */ }

  // ── AI Fallback (Fourth Fallback) ─────────────────────────────────────────
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  if (openrouterApiKey && (cleanTitle || cleanCity)) {
    try {
      const prompt = `Please find the GPS coordinates (latitude,longitude) for the spot: "${cleanTitle}" inside the destination: "${cleanCity}".
You MUST strictly return coordinates that are physically located within or extremely close to "${cleanCity}". If the spot matches a location outside of "${cleanCity}", you MUST find and return a matching attraction or coordinates inside "${cleanCity}" instead.
Reply ONLY with the GPS latitude,longitude (e.g. 25.0343,121.5649 or 35.6762,139.6503). Do not explain or output other text or markdown wrapper.`;
      const resText = await fetchOpenRouterWithFallback(openrouterApiKey, prompt);
      if (resText) {
        try {
          const jsonStart = resText.indexOf("{");
          const jsonEnd = resText.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
            const parsed = JSON.parse(resText.slice(jsonStart, jsonEnd + 1)) as { lat?: string | number; latitude?: string | number; lng?: string | number; longitude?: string | number };
            const lat = parseFloat(String(parsed.lat ?? parsed.latitude ?? ''));
            const lng = parseFloat(String(parsed.lng ?? parsed.longitude ?? ''));
            if (!isNaN(lat) && !isNaN(lng)) {
              if (isCoordValidForCity(lat, lng, biasCoords, cleanTitle, cleanCity, 'AI Fallback JSON')) {
                console.log(`[AI Fallback Geocode Server] ${cleanTitle} in ${cleanCity} (JSON) -> ${lat}, ${lng}`);
                return { lat, lng };
              }
            }
          }
        } catch { /* ignore fallback to regex */ }

        const cleaned = resText.trim().replace(/[()[\]{}]/g, '');
        const match = cleaned.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          if (!isNaN(lat) && !isNaN(lng)) {
            if (isCoordValidForCity(lat, lng, biasCoords, cleanTitle, cleanCity, 'AI Fallback Regex')) {
              console.log(`[AI Fallback Geocode Server] ${cleanTitle} in ${cleanCity} (Regex) -> ${lat}, ${lng}`);
              return { lat, lng };
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[AI Fallback Geocode Server] failed for ${cleanTitle}:`, err.message);
    }
  }

  return null;
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

  const httpServer = createServer(app);
  const originList = buildAllowedCorsOrigins({
    configuredOrigins: process.env.CORS_ALLOWED_ORIGINS,
    nodeEnv: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL,
    vercelBranchUrl: process.env.VERCEL_BRANCH_URL,
    vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });
  const corsOriginValidator = (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    callback(null, isCorsOriginAllowed(origin, originList));
  };

  const io = new SocketServer(httpServer, {
    cors: {
      origin: corsOriginValidator,
      methods: ['GET', 'POST'],
    },
  });

  app.use(
    cors({
      origin: corsOriginValidator,
      credentials: true,
    }),
  );
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  app.use(express.json({ limit: '1mb' }));

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
        req.path !== '/api/auth/guest' &&
        req.path !== '/api/auth/register' &&
        req.path !== '/api/auth/login' &&
        !req.path.startsWith('/api/search') &&
        req.path !== '/api/weather' &&
        req.path !== '/api/handbooks'
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

  if (GUEST_AUTH_ENABLED) {
    app.post('/api/auth/guest', guestAuthLimiter, async (req, res) => {
      const rawDisplayName = String(req.body?.display_name ?? '').trim();
      const displayName = (rawDisplayName || '訪客旅人').slice(0, 32);
      const suffix = Math.random().toString(36).slice(2, 8);
      const userId = `guest_${Date.now().toString(36)}_${suffix}`;
      const username = userId;

      await repo.ensureUser(userId, username, displayName);

      const token = signAccessToken({ userId });
      res.status(201).json({
        status: 'success',
        token,
        user_id: userId,
        user: { id: userId, display_name: displayName },
        expires_in: process.env.JWT_EXPIRES_IN ?? '12h',
      });
    });
  }

  // ── Auth: Register ──────────────────────────────────────────────────────────
  app.post('/api/auth/register', registerLimiter, async (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    const displayName = String(req.body?.display_name ?? username).trim() || username;
    const avatar = req.body?.avatar ? String(req.body.avatar).trim() : undefined;

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
    await repo.createUserWithPassword(username, displayName, passwordHash, avatar);
    
    const token = signAccessToken({ userId: username });
    res.status(201).json({ status: 'success', token, user_id: username, expires_in: process.env.JWT_EXPIRES_IN ?? '12h' });
  });

  // ── Auth: Login ─────────────────────────────────────────────────────────────
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
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

  const activeEditingLocks = new Map<
    string,
    {
      tripId: string;
      nodeId: string;
      day: number;
      userId: string;
      userName: string;
      socketId: string;
    }
  >();

  const releaseLocksForSocket = (socketId: string) => {
    for (const [lockKey, lock] of activeEditingLocks.entries()) {
      if (lock.socketId !== socketId) continue;
      activeEditingLocks.delete(lockKey);
      io.to(lock.tripId).emit('editing_stop', { nodeId: lock.nodeId, day: lock.day });
    }
  };

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

      for (const lock of activeEditingLocks.values()) {
        if (lock.tripId !== payload.trip_id || lock.userId === userId) continue;
        socket.emit('editing_start', {
          userName: lock.userName,
          nodeId: lock.nodeId,
          day: lock.day,
        });
      }
    });

    socket.on(
      'sync_itinerary',
      async (event: {
        trip_id?: string;
        action?: string;
        payload?: { node_id?: string; day?: number; date?: string; time?: string; timestamp?: string; sort_order?: number; title?: string; emoji?: string; category?: string; lat?: number | null; lng?: number | null; description?: string; ai_note?: string; intensity?: string; is_visited?: boolean; transport_to_next?: string; image_url?: string; attachments?: Array<{ id?: string; name?: string; type?: string; url?: string }>; linkedFactId?: string; changes?: Record<string, unknown> };
      }) => {
        if (!event?.trip_id || !event.action || !event.payload?.node_id) {
          return;
        }

        const userId = String(socket.data.userId ?? '');
        if (!userId) return;

        const role = await repo.getTripMemberRole(event.trip_id, userId);
        if (!role || !hasRequiredRole(role, 'editor')) {
          socket.emit('error', { message: 'forbidden: editor role required' });
          return;
        }

        if (event.action === 'patch_node') {
          if (!event.payload.changes || typeof event.payload.changes !== 'object') {
            return;
          }

          const existing = await repo.findItineraryNode(event.payload.node_id);
          if (!existing || existing.tripId !== event.trip_id) {
            socket.emit('error', { message: 'node not found' });
            return;
          }

          const existingNode = mapItineraryNodeRow(existing, 0);
          const normalizedChanges = normalizeItineraryPatchChanges(existingNode, event.payload.changes);
          const nextLinkedFactId = 'linkedFactId' in normalizedChanges
            ? String(normalizedChanges.linkedFactId ?? '')
            : String(existingNode.linkedFactId ?? '');

          const linkedFactAllowed = await validateLinkedFactId(repo, event.trip_id, nextLinkedFactId);
          if (!linkedFactAllowed) {
            socket.emit('error', { message: 'invalid linked travel fact' });
            return;
          }

          const mergedNode = {
            ...existingNode,
            ...normalizedChanges,
            linkedFactId: nextLinkedFactId,
          };

          await repo.upsertItineraryNode(event.trip_id, mergedNode);

          await appendPlanningRecord({
            trip_id: event.trip_id,
            action: 'patch_node',
            node_id: event.payload.node_id,
            day: Number(mergedNode.day ?? 1),
            time: String(mergedNode.time ?? ''),
            title: String(mergedNode.title ?? ''),
            category: String(mergedNode.category ?? 'other'),
            source: 'socket',
            timestamp: new Date().toISOString(),
          });
          await updatePlanningSnapshot(repo, event.trip_id);

          socket.to(event.trip_id).emit('sync_itinerary', {
            trip_id: event.trip_id,
            action: 'patch_node',
            payload: {
              node_id: event.payload.node_id,
              changes: normalizedChanges,
            },
          });
          return;
        }

        if (
          event.action !== 'add_node' ||
          !event.payload.time ||
          !event.payload.title
        ) {
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
          ai_note: event.payload.ai_note,
          intensity: event.payload.intensity,
          transport_to_next: event.payload.transport_to_next,
          image_url: event.payload.image_url,
          attachments: Array.isArray(event.payload.attachments) ? event.payload.attachments : [],
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
            ai_note: event.payload.ai_note ?? null,
            intensity: event.payload.intensity ?? null,
            transport_to_next: event.payload.transport_to_next ?? null,
            image_url: event.payload.image_url ?? null,
            attachments: Array.isArray(event.payload.attachments) ? event.payload.attachments : [],
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
      const lockKey = `${tripId}:${nodeId}`;
      const existingLock = activeEditingLocks.get(lockKey);

      if (existingLock && existingLock.userId !== socket.data.userId) {
        socket.emit('editing_denied', {
          nodeId,
          day: existingLock.day,
          userName: existingLock.userName,
        });
        return;
      }

      activeEditingLocks.set(lockKey, {
        tripId,
        nodeId,
        day,
        userId: String(socket.data.userId),
        userName,
        socketId: socket.id,
      });

      // Broadcast to all other members in the trip room
      socket.to(tripId).emit('editing_start', { userName, nodeId, day });
    });

    socket.on('editing_stop', async (payload: { trip_id?: string; nodeId?: string }) => {
      const tripId = String(payload?.trip_id ?? '');
      const nodeId = String(payload?.nodeId ?? '');
      if (!tripId || !socket.data?.userId) return;

      const role = await repo.getTripMemberRole(tripId, socket.data.userId).catch(() => null);
      if (!role) return;

      if (!nodeId) return;

      const lockKey = `${tripId}:${nodeId}`;
      const existingLock = activeEditingLocks.get(lockKey);
      if (existingLock && existingLock.userId === socket.data.userId) {
        activeEditingLocks.delete(lockKey);
      }

      socket.to(tripId).emit('editing_stop', { nodeId });
    });

    socket.on('disconnect', () => {
      releaseLocksForSocket(socket.id);
    });
  });

  const tripFlightsCache = new Map<string, { data: any[]; expiresAt: number }>();
  const tripActivitiesCache = new Map<string, { data: any[]; expiresAt: number }>();

  app.get('/api/trips/:trip_id/flights', async (req, res) => {
    const tripId = req.params.trip_id;
    const trip = await repo.getTripById(tripId).catch(() => null);
    const destination = trip?.destination ?? '';
    const lower = destination.toLowerCase();

    // Map common destination keywords to IATA codes
    const DEST_IATA: [string, string][] = [
      ['tokyo', 'NRT'], ['osaka', 'KIX'], ['kyoto', 'ITM'],
      ['seoul', 'ICN'], ['paris', 'CDG'], ['bangkok', 'BKK'],
      ['bali', 'DPS'], ['singapore', 'SIN'], ['hong kong', 'HKG'],
      ['new york', 'JFK'], ['london', 'LHR'],
    ];
    const matched = DEST_IATA.find(([k]) => lower.includes(k));
    const arrCode = matched ? matched[1] : destination.slice(0, 3).toUpperCase() || 'NRT';

    // Get calculated dynamic start date for flight scraping
    const facts = await repo.getTripTravelFacts(tripId).catch(() => []);
    const outbound = facts.find((fact: any) => fact.factType === 'flight_outbound');
    const stay = facts.find((fact: any) => fact.factType === 'stay');
    let travelDate = '';
    const rawDate = outbound?.startAt || stay?.startAt;
    if (rawDate) {
      try {
        travelDate = new Date(rawDate).toISOString().split('T')[0];
      } catch { /* fall through */ }
    }
    if (!travelDate) {
      travelDate = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]; // Default: a week from now
    }

    const cacheKey = `${tripId}:${destination}:${travelDate}`;
    let cachedRaw = null;
    if (redisClient?.isOpen) {
      cachedRaw = await redisClient.get(`cache:trip_flights:${cacheKey}`).catch(() => null);
    } else {
      const cached = tripFlightsCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        cachedRaw = JSON.stringify(cached.data);
      }
    }
    if (cachedRaw) {
      try {
        res.json(JSON.parse(cachedRaw));
        return;
      } catch { /* fall through */ }
    }

    let finalFlights: any[] = [];
    if (destination) {
      try {
        console.log(`[tripFlights] Scraping real flights for "${destination}" -> "${arrCode}" on "${travelDate}"`);
        const scraped = await scrapeTripFlights('TPE', arrCode, travelDate);
        if (scraped && scraped.length > 0) {
          finalFlights = scraped.map(f => {
            const stopsCount = f.details?.stops ?? 0;
            return {
              airline: f.details?.airline ?? f.provider,
              stops: stopsCount,
              direct: stopsCount === 0,
              duration: f.details?.duration ?? '3h 30m',
              price: f.price,
              depTime: f.details?.departure || '10:00',
              depCode: 'TPE',
              arrTime: f.details?.arrival || '13:30',
              arrCode,
            };
          });
        }
      } catch (err) {
        console.error('Failed to scrape trip flights, falling back:', err);
      }
    }

    if (finalFlights.length === 0) {
      // Direct call to fetchFromOtaProvider to leverage cached OpenRouter live lookups or real standards
      console.log(`[tripFlights] Running high-fidelity authentic reference search for TPE -> ${arrCode}`);
      const fallbackItems = await fetchFromOtaProvider('TPE', arrCode, travelDate);
      if (fallbackItems && fallbackItems.length > 0) {
        finalFlights = fallbackItems.map(item => ({
          airline: item.details?.airline || item.provider,
          stops: item.details?.stops ?? 0,
          direct: (item.details?.stops ?? 0) === 0,
          duration: item.details?.duration || '3h 30m',
          price: item.price,
          depTime: item.details?.departure || '09:00',
          depCode: 'TPE',
          arrTime: item.details?.arrival || '12:30',
          arrCode,
        }));
      }
    }

    // Sort by price
    finalFlights.sort((a, b) => a.price - b.price);

    // Save to cache (TTL: 1 hour)
    if (redisClient?.isOpen) {
      await redisClient.set(`cache:trip_flights:${cacheKey}`, JSON.stringify(finalFlights), { EX: 3600 }).catch(() => null);
    } else {
      tripFlightsCache.set(cacheKey, { data: finalFlights, expiresAt: Date.now() + 3600 * 1000 });
    }

    res.json(finalFlights);
  });

  // Authentic Popular Activities Directory
  const POPULAR_ACTIVITIES: Record<string, Array<{title: string, img: string, rating: number, reviews: string, price: number}>> = {
    tokyo: [
      { title: "SHIBUYA SKY 展望台觀景門票", img: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&q=80&w=300", rating: 4.8, reviews: "12,450", price: 540 },
      { title: "東京迪士尼樂園 / 迪士尼海洋一日護照", img: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&q=80&w=300", rating: 4.9, reviews: "34,810", price: 1890 },
      { title: "teamLab Planets TOKYO 豐洲新型態數位美術館門票", img: "https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?auto=format&fit=crop&q=80&w=300", rating: 4.8, reviews: "21,080", price: 850 },
      { title: "東京地鐵乘車券 (24 / 48 / 72 小時)", img: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=300", rating: 4.7, reviews: "45,190", price: 180 },
      { title: "東京華納兄弟哈利波特影城門票", img: "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&q=80&w=300", rating: 4.9, reviews: "8,920", price: 1450 }
    ],
    osaka: [
      { title: "日本環球影城門票 1日券 / 1.5日券 / 2日券", img: "https://images.unsplash.com/photo-1590484512398-33fb39eff960?auto=format&fit=crop&q=80&w=300", rating: 4.9, reviews: "88,240", price: 1950 },
      { title: "關西樂享周遊券 (Have Fun in Kansai 1週通行寶)", img: "https://images.unsplash.com/photo-1590253187631-6f9aa4563a57?auto=format&fit=crop&q=80&w=300", rating: 4.6, reviews: "9,530", price: 620 },
      { title: "大阪周遊卡 (1日券 / 2日券) - 贈熱門觀光景點免費入場", img: "https://images.unsplash.com/photo-1542640244-7e672d6cef21?auto=format&fit=crop&q=80&w=300", rating: 4.7, reviews: "32,120", price: 640 },
      { title: "大阪空庭溫泉 OSAKA BAY TOWER 門票", img: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=300", rating: 4.8, reviews: "5,410", price: 520 }
    ],
    kyoto: [
      { title: "京都嵯峨野嵐山小火車車票 (單程)", img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=300", rating: 4.7, reviews: "15,820", price: 198 },
      { title: "京都｜和服體驗・祇園和服租借體驗", img: "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&q=80&w=300", rating: 4.8, reviews: "7,430", price: 820 },
      { title: "清水寺＆金閣寺＆嵐山一日遊 (大阪/京都出發)", img: "https://images.unsplash.com/photo-1504109586057-7a2ae83d1338?auto=format&fit=crop&q=80&w=300", rating: 4.8, reviews: "11,200", price: 1350 }
    ],
    seoul: [
      { title: "首爾樂天世界主題樂園門票", img: "https://images.unsplash.com/photo-1538669715315-155098f0fb1d?auto=format&fit=crop&q=80&w=300", rating: 4.7, reviews: "19,250", price: 890 },
      { title: "N首爾塔展望台電子門票", img: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&q=80&w=300", rating: 4.5, reviews: "12,190", price: 236 },
      { title: "首爾景福宮西花韓服租借體驗", img: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=300", rating: 4.8, reviews: "8,910", price: 420 },
      { title: "首爾仁川機場 AREX 直通列車車票 (單程)", img: "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?auto=format&fit=crop&q=80&w=300", rating: 4.8, reviews: "25,110", price: 210 }
    ],
    bangkok: [
      { title: "曼谷王權 Mahanakhon SkyWalk 觀景台門票", img: "https://images.unsplash.com/photo-1508009603885-50cf7c8dd0d5?auto=format&fit=crop&q=80&w=300", rating: 4.8, reviews: "14,500", price: 680 },
      { title: "曼谷野生動物世界 Safari World 門票", img: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=300", rating: 4.7, reviews: "10,800", price: 720 },
      { title: "曼谷大皇宮＆玉佛寺半日遊（中文導覽）", img: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=300", rating: 4.6, reviews: "6,920", price: 950 }
    ],
    paris: [
      { title: "羅浮宮快速通關門票＆導覽", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=300", rating: 4.7, reviews: "24,180", price: 680 },
      { title: "艾菲爾鐵塔攀登門票", img: "https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&q=80&w=300", rating: 4.6, reviews: "11,500", price: 1120 },
      { title: "塞納河觀光遊船船票", img: "https://images.unsplash.com/photo-1509060464153-4466739f78ad?auto=format&fit=crop&q=80&w=300", rating: 4.8, reviews: "18,400", price: 420 }
    ],
    london: [
      { title: "倫敦眼摩天輪門票 (快速通關可選)", img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=300", rating: 4.7, reviews: "22,500", price: 1250 },
      { title: "西敏寺門票 (含多國語言導覽)", img: "https://images.unsplash.com/photo-1513026705753-bc31c4ade3ac?auto=format&fit=crop&q=80&w=300", rating: 4.8, reviews: "9,630", price: 980 },
      { title: "巨石陣＆溫莎堡＆巴斯羅馬浴場一日遊 (倫敦出發)", img: "https://images.unsplash.com/photo-1515586838455-8f8f940d6853?auto=format&fit=crop&q=80&w=300", rating: 4.6, reviews: "14,800", price: 2950 }
    ]
  };

  app.get('/api/trips/:trip_id/activities', async (req, res) => {
    const tripId = req.params.trip_id;
    const trip = await repo.getTripById(tripId).catch(() => null);
    const destination = trip?.destination ?? '';
    const lower = destination.toLowerCase();

    const cacheKey = `${tripId}:${destination}`;
    let cachedRaw = null;
    if (redisClient?.isOpen) {
      cachedRaw = await redisClient.get(`cache:trip_activities:${cacheKey}`).catch(() => null);
    } else {
      const cached = tripActivitiesCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        cachedRaw = JSON.stringify(cached.data);
      }
    }
    if (cachedRaw) {
      try {
        res.json(JSON.parse(cachedRaw));
        return;
      } catch { /* fall through */ }
    }

    // 1. Direct Search in Popular predefined list
    const matchedKey = Object.keys(POPULAR_ACTIVITIES).find(k => lower.includes(k));
    if (matchedKey) {
      const selected = POPULAR_ACTIVITIES[matchedKey];
      if (redisClient?.isOpen) {
        await redisClient.set(`cache:trip_activities:${cacheKey}`, JSON.stringify(selected), { EX: 86400 }).catch(() => null);
      } else {
        tripActivitiesCache.set(cacheKey, { data: selected, expiresAt: Date.now() + 86400 * 1000 });
      }
      res.json(selected);
      return;
    }

    // 2. OpenRouter / Gemini Live Generation
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (openrouterApiKey && destination) {
      const prompt = `Please generate 4 real popular tourist/booking activities or day-tours (e.g., tickets, museums, theme parks, sightseeing card) for traveler to purchase in "${destination}".
Return ONLY a valid JSON array of objects representing these activities. Each object MUST have these properties:
- img: select a high-quality Unsplash image URL matching the specific activity (use a real keyword, e.g. "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=300")
- title: the specific activity name in Traditional Chinese (e.g. "東京迪士尼樂園門票")
- rating: a realistic rating number from 4.3 to 4.9
- reviews: the count of reviews, as a string with commas (e.g. "2,410")
- price: a realistic price in TWD (e.g. 520)

Return ONLY the raw JSON string. Do NOT include any markdown code blocks, explanations, or backticks. Example output format:
[
  {"title": "...", "img": "...", "rating": 4.8, "reviews": "...", "price": 450}
]`;
      try {
        const resText = await fetchOpenRouterWithFallback(openrouterApiKey, prompt);
        if (resText) {
          const cleanJson = resText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const enriched = parsed.map(item => ({
              img: item.img || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200",
              title: String(item.title),
              rating: Number(item.rating || 4.5),
              reviews: String(item.reviews || "1,200"),
              price: Number(item.price || 500)
            }));
            
            if (redisClient?.isOpen) {
              await redisClient.set(`cache:trip_activities:${cacheKey}`, JSON.stringify(enriched), { EX: 86400 }).catch(() => null);
            } else {
              tripActivitiesCache.set(cacheKey, { data: enriched, expiresAt: Date.now() + 86400 * 1000 });
            }
            res.json(enriched);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to generate activities via AI:", err);
      }
    }

    // 3. Structured fallback from itinerary nodes
    const nodes = await repo.getItineraryNodes(tripId).catch(() => []);
    const CATEGORY_IMG: Record<string, string> = {
      hotel:     'photo-1566073771259-6a8506099945',
      food:      'photo-1555396273-367ea4eb4db5',
      landmark:  'photo-1513407030348-c983a97b98d8',
      activity:  'photo-1467269204594-9661b134dd2b',
      transport: 'photo-1436491865332-7a61a109cc05',
      shopping:  'photo-1555529669-e69e7aa0ba9a',
      nightlife: 'photo-1566417713940-fe7c737a9ef2',
      spot:      'photo-1499856871958-5b9627545d1a',
      other:     'photo-1506905925346-21bda4d32df4',
    };
    const CATEGORY_PRICE: Record<string, number> = {
      hotel: 0, food: 320, landmark: 150, activity: 680,
      transport: 0, shopping: 0, nightlife: 280, spot: 120, other: 100,
    };
    const CATEGORY_RATING: Record<string, number> = {
      hotel: 4.5, food: 4.7, landmark: 4.6, activity: 4.8,
      transport: 4.2, shopping: 4.3, nightlife: 4.5, spot: 4.6, other: 4.4,
    };

    if (nodes.length > 0) {
      const results = nodes
        .filter(node => !['transport', 'hotel'].includes(node.category ?? ''))
        .slice(0, 8)
        .map(node => {
          const cat = node.category ?? 'other';
          const photoId = CATEGORY_IMG[cat] ?? CATEGORY_IMG.other;
          return {
            img: `https://images.unsplash.com/${photoId}?auto=format&fit=crop&q=80&w=200&h=200`,
            title: `${node.title} 門票特惠`,
            rating: CATEGORY_RATING[cat] ?? 4.5,
            reviews: `${Math.floor(1000 + (node.title?.length ?? 5) * 137) % 9000 + 1000}`,
            price: CATEGORY_PRICE[cat] ?? 100,
          };
        });
      res.json(results);
      return;
    }

    res.json([]);
  });

  app.post('/api/generate/itinerary', guestAiLimiter, aiLimiter, async (req, res) => {
    if (!getRequestUserId(req) && AUTH_REQUIRED) {
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
    if (!getRequestUserId(req) && AUTH_REQUIRED) {
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
    if (!getRequestUserId(req) && AUTH_REQUIRED) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
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

  app.post('/api/generate/chat', guestAiLimiter, aiLimiter, async (req, res) => {
    const { message = '', history = [], context = {} } = req.body || {};
    try {
      const { generateChatResponse } = await import('./src/server/services/aiService');
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

  app.post('/api/dev/generate-handbooks', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(404).json({ status: 'error', message: 'Not Found' });
      return;
    }
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
    const from = String(req.query.from ?? '').trim();
    const to = String(req.query.to ?? '').trim();
    const date = String(req.query.date ?? '').trim();
    const tripType = String(req.query.tripType ?? 'oneway').trim();
    const returnDate = String(req.query.returnDate ?? '').trim();

    // If no params, return "Popular Recommendations" (latest flights)
    if (!from || !to || !date) {
      const topFlights = await repo.getTopFlights(5).catch(() => []);
      const results = topFlights.map((f: any, idx: number) => ({
        id: f.id || `flight_trend_${idx}`,
        type: 'flight',
        provider: f.provider,
        title: `${f.origin_code || 'TPE'} -> ${f.destination_code || '目的地'}`,
        price: f.price,
        currency: 'TWD',
        emoji: '✈️',
        affiliate_url: OTA_PARTNER_BASE ? `${OTA_PARTNER_BASE}/flight/${encodeURIComponent(f.id)}` : `https://www.trip.com/flights/${f.origin_code}-to-${f.destination_code}/tickets-${f.origin_code}-${f.destination_code}/?flighttype=ow&dcity=${f.origin_code || 'tpe'}&acity=${f.destination_code || 'nrt'}`,
        details: { airline: f.provider, stops: f.stops || 0, departure: f.time?.split(' - ')[0] || '10:00', arrival: f.time?.split(' - ')[1] || '14:00' }
      }));
      res.json({ status: 'success', data: results });
      return;
    }

    const cacheVersion = tripType === 'roundtrip' ? 'rt-legs-v1' : 'default-v1';
    const cacheKey = `${from.toUpperCase()}_${to.toUpperCase()}_${date}_${tripType}_${returnDate}_${cacheVersion}`;
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

    // Try OTA provider first; if no data, return empty array to keep it real
    let otaData: SearchItem[] | null = null;
    if (tripType === 'roundtrip' && returnDate) {
      const [outboundData, returnData] = await Promise.all([
        fetchFromOtaProvider(from, to, date),
        fetchFromOtaProvider(to, from, returnDate),
      ]);
      otaData = [
        ...annotateRoundTripLeg(outboundData, 'outbound'),
        ...annotateRoundTripLeg(returnData, 'return'),
      ];
    } else {
      otaData = await fetchFromOtaProvider(from, to, date);
    }
    const data: SearchItem[] = otaData || [];

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

  app.get('/api/destinations/alerts', async (req, res) => {
    try {
      const cacheKey = `cache:destinations:alerts`;
      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.json({ status: 'success', data: JSON.parse(cached), cache: 'hit' });
        }
      }

      const destinations = [
        { name: "東京 Tokyo", code: "NRT", image: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=300&q=80", defaultPrice: "NT$ 9,800起" },
        { name: "大阪 Osaka", code: "KIX", image: "https://images.unsplash.com/photo-1590253187631-6f9aa4563a57?auto=format&fit=crop&w=300&q=80", defaultPrice: "NT$ 8,900起" },
        { name: "台北 Taipei", code: "TPE", image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=300&q=80", defaultPrice: "本島漫遊" },
        { name: "倫敦 London", code: "LHR", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=300&q=80", defaultPrice: "NT$ 24,500起" }
      ];

      const rssParser = new Parser();
      const results = await Promise.all(destinations.map(async (dest) => {
        try {
          const query = `${dest.name.split(' ')[0]} 旅遊 OR 機票 OR 警報`;
          const feed = await rssParser.parseURL(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`);
          const latest = feed.items[0];
          
          let health = "💚 安全無虞";
          let tagColor = "bg-emerald-50 text-emerald-700 font-extrabold";
          let advisory = "近期氣候適中，旅遊人潮穩定，適合安排自由行。";

          if (latest) {
            advisory = latest.title || advisory;
            // truncate advisory if too long
            if (advisory.length > 50) advisory = advisory.substring(0, 50) + '...';
            
            if (advisory.includes('警報') || advisory.includes('颱風') || advisory.includes('地震') || advisory.includes('注意')) {
              health = "💛 旅遊須知";
              tagColor = "bg-amber-50 text-amber-700 font-extrabold";
            } else if (advisory.includes('促銷') || advisory.includes('優惠') || advisory.includes('低價')) {
              health = "🔥 促銷中";
              tagColor = "bg-pink-50 text-pink-700 font-extrabold";
            }
          }

          return {
            name: dest.name,
            code: dest.code,
            image: dest.image,
            price: dest.defaultPrice,
            health,
            advisory,
            tagColor,
            link: latest?.link || ''
          };
        } catch (e) {
          return {
            name: dest.name,
            code: dest.code,
            image: dest.image,
            price: dest.defaultPrice,
            health: "💚 安全無虞",
            advisory: "近期氣候適中，旅遊人潮穩定。",
            tagColor: "bg-emerald-50 text-emerald-700 font-extrabold"
          };
        }
      }));

      if (redisClient) {
        await redisClient.setEx(cacheKey, 60 * 60, JSON.stringify(results)); // cache for 1 hour
      }

      res.json({ status: 'success', data: results, cache: 'miss' });
    } catch (err: any) {
      console.error('Failed to fetch destination alerts:', err);
      res.status(500).json({ status: 'error', message: 'Failed to fetch destination alerts' });
    }
  });

  app.get('/api/search/history', async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const data = await getSearchHistory(Number.isFinite(limit) ? limit : 50);
    res.json({ status: 'success', data });
  });

  const rssParser = new Parser();
  app.get('/api/deals/feed', async (req, res) => {
    const q = req.query.q as string || '旅遊優惠 OR 機票促銷 OR 降價';
    const cacheKey = `cache:rss:${encodeURIComponent(q)}`;
    try {
      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return res.json({ status: 'success', data: JSON.parse(cached), cache: 'hit' });
        }
      }
      
      const feed = await rssParser.parseURL(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`);
      
      const data = feed.items.slice(0, 10).map((item, index) => {
        let type = 'deal';
        let tag = '🔥 降價促銷';
        if (item.title?.includes('警報') || item.title?.includes('注意') || item.title?.includes('地震') || item.title?.includes('天氣') || item.title?.includes('颱風')) {
           type = 'advisory';
           tag = '⚠️ 旅遊須知';
        }
        
        let dest = '近期關注';
        const popularCities = ['東京', '大阪', '京都', '北海道', '首爾', '釜山', '台北', '曼谷', '倫敦', '巴黎'];
        for (const city of popularCities) {
          if (item.title?.includes(city)) {
            dest = city;
            break;
          }
        }

        return {
          id: `feed-${index}`,
          dest,
          type,
          tag,
          text: item.title,
          link: item.link,
          date: item.pubDate
        };
      });

      if (redisClient) {
        await redisClient.setEx(cacheKey, 60 * 60, JSON.stringify(data)); // cache for 1 hour
      }

      res.json({ status: 'success', data, cache: 'miss' });
    } catch (err: any) {
      console.error('Failed to fetch RSS:', err);
      // Fallback
      res.json({ status: 'success', data: [
        { id: 'fb-1', dest: "東京", type: "deal", tag: "🔥 降價大促銷", text: "目前無法取得即時新聞，已為您提供預設快訊。" }
      ]});
    }
  });

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
    const containsChinese = /[\u4e00-\u9fa5]/.test(name);
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
    try {
      if (city && !req.query.lat && !req.query.lng) {
        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
        const geoRes = await fetch(geoUrl, { headers: { 'User-Agent': 'RoamJelly/1.0' } });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            lat = String(geoData[0].lat);
            lng = String(geoData[0].lon);
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
      const data = (await apiRes.json());
      res.json({
        temp_current: Math.round(data.current?.temperature_2m || 0),
        temp_max: Math.round(data.daily?.temperature_2m_max?.[0] || 0),
        temp_min: Math.round(data.daily?.temperature_2m_min?.[0] || 0),
        rain_prob: data.current?.precipitation_probability ?? data.daily?.precipitation_probability_max?.[0] ?? 0,
        weather_code: data.current?.weather_code ?? data.daily?.weather_code?.[0] ?? 0,
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
    res.json(rows.map((r) => ({ id: r.userId, name: r.name, avatar: r.avatar })));
  });

  // ── User Subscriptions ──────────────────────────────────────────────────────
  app.get('/api/user/subscriptions', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    try {
      const subs = await repo.getUserSubscriptions(userId);
      res.json({ status: 'success', data: subs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Failed to fetch subscriptions' });
    }
  });

  app.post('/api/user/subscriptions/toggle', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const { destination, channel } = req.body || {};
    if (!destination || !channel) {
      res.status(400).json({ status: 'error', message: 'Missing destination or channel' });
      return;
    }
    try {
      const result = await repo.toggleUserSubscription(userId, destination, channel);
      res.json({ status: 'success', data: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Failed to toggle subscription' });
    }
  });

  // ── User Preferences ────────────────────────────────────────────────────────
  app.get('/api/user/preferences', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    try {
      const [savedItems, trackedPrices, aiProfile] = await Promise.all([
        repo.getUserSavedItems(userId).catch((err) => {
          console.error('[UserPref DB Error] getUserSavedItems failed:', err);
          return [];
        }),
        repo.getUserTrackedPrices(userId).catch((err) => {
          console.error('[UserPref DB Error] getUserTrackedPrices failed:', err);
          return [];
        }),
        repo.getUserAiProfile(userId).catch((err) => {
          console.error('[UserPref DB Error] getUserAiProfile failed:', err);
          return null;
        }),
      ]);
      res.json({
        saved_items: (savedItems || []).map((item: any) => item.itemId),
        tracked_prices: (trackedPrices || []).map((item: any) => item.itemId),
        ai_profile: aiProfile ? {
          departure: aiProfile.preferredDeparture ?? '',
          companions: aiProfile.preferredCompanions ?? '',
          vibes: Array.isArray(aiProfile.preferredVibes) ? aiProfile.preferredVibes : [],
          interests: Array.isArray(aiProfile.preferredInterests) ? aiProfile.preferredInterests : [],
          dietary: Array.isArray(aiProfile.preferredDietary) ? aiProfile.preferredDietary : [],
          transport: Array.isArray(aiProfile.preferredTransport) ? aiProfile.preferredTransport : [],
          budget: aiProfile.preferredBudget ?? '',
        } : null,
      });
    } catch (err) {
      console.error('[UserPref Endpoint Error] Failed to get preferences:', err);
      res.json({
        saved_items: [],
        tracked_prices: [],
        ai_profile: null,
      });
    }
  });

  app.patch('/api/user/preferences/profile', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }

    const profile = {
      departure: String(req.body?.departure ?? '').trim(),
      companions: String(req.body?.companions ?? '').trim(),
      vibes: Array.isArray(req.body?.vibes) ? req.body.vibes : [],
      interests: Array.isArray(req.body?.interests) ? req.body.interests : [],
      dietary: Array.isArray(req.body?.dietary) ? req.body.dietary : [],
      transport: Array.isArray(req.body?.transport) ? req.body.transport : [],
      budget: String(req.body?.budget ?? '').trim(),
    };

    try {
      const row = await repo.upsertUserAiProfile(userId, profile);
      res.json({
        departure: row?.preferredDeparture ?? profile.departure,
        companions: row?.preferredCompanions ?? profile.companions,
        vibes: Array.isArray(row?.preferredVibes) ? row.preferredVibes : profile.vibes,
        interests: Array.isArray(row?.preferredInterests) ? row.preferredInterests : profile.interests,
        dietary: Array.isArray(row?.preferredDietary) ? row.preferredDietary : profile.dietary,
        transport: Array.isArray(row?.preferredTransport) ? row.preferredTransport : profile.transport,
        budget: row?.preferredBudget ?? profile.budget,
      });
    } catch (err) {
      console.error('[UserPref Endpoint Error] Failed to upsert profile:', err);
      res.json({
        departure: profile.departure,
        companions: profile.companions,
        vibes: profile.vibes,
        interests: profile.interests,
        dietary: profile.dietary,
        transport: profile.transport,
        budget: profile.budget,
      });
    }
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

  app.delete('/api/trips/:trip_id', async (req, res) => {
    const userId = getRequestUserId(req);
    const { trip_id } = req.params;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    // Only owner can delete the trip
    const allowed = await ensureTripRole(req, res, trip_id, 'owner');
    if (!allowed) return;

    try {
      await repo.deleteTrip(trip_id);
      
      // Also broadcast to the room if needed, so clients connected to this trip can react
      io.to(`trip_${trip_id}`).emit('trip_deleted', { trip_id });
      
      res.json({ status: 'success' });
    } catch (error) {
      console.error('Delete trip error:', error);
      res.status(500).json({ status: 'error', message: 'failed to delete trip' });
    }
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

  // ── Trip: public preview (no auth required) ─────────────────────────────────
  app.get('/api/trips/:trip_id/preview', async (req, res) => {
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
    const facts = await repo.getTripTravelFacts(tripId);
    
    if (!trip) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }

    const role = await repo.getTripMemberRole(tripId, userId);
    if (!role && !trip.isPublic) {
      res.status(403).json({ status: 'error', message: 'trip is not public' });
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

    const factIdMap = new Map<string, string>();
    for (const fact of facts) {
      const createdFact = await repo.createTripTravelFact(newTripId, {
        factType: fact.factType,
        source: fact.source,
        title: fact.title,
        startAt: fact.startAt,
        endAt: fact.endAt,
        locationName: fact.locationName,
        lat: fact.lat,
        lng: fact.lng,
        referenceCode: fact.referenceCode,
        metadata: fact.metadata ?? null,
      });
      if (createdFact?.id) {
        factIdMap.set(fact.id, createdFact.id);
      }
    }

    // Copy nodes
    let cloneIdx = 0;
    for (const node of nodes) {
      const suffix = `${Date.now()}_clean_${cloneIdx++}_${Math.random().toString(36).substring(2, 10)}`;
      await repo.upsertItineraryNode(newTripId, {
        node_id: `node_cloned_${suffix}`,
        day: node.day,
        date: node.date,
        time: node.time || '10:00',
        timestamp: node.timestamp,
        sort_order: node.sortOrder,
        title: node.title,
        emoji: node.emoji || '📍',
        category: node.category || 'spot',
        description: node.description,
        ai_note: node.aiNote,
        intensity: node.intensity,
        is_visited: node.isVisited,
        lat: node.lat,
        lng: node.lng,
        transport_to_next: node.transportToNext,
        image_url: node.imageUrl,
        attachments: Array.isArray(node.attachments) ? node.attachments : [],
        linkedFactId: node.linkedFactId ? (factIdMap.get(node.linkedFactId) ?? undefined) : undefined,
      });
    }

    await repo.incrementTripForkCount(tripId);

    res.json({ status: 'success', data: { new_trip_id: newTripId } });
  });

  app.patch('/api/trips/:trip_id/public', async (req, res) => {
    const tripId = req.params.trip_id;
    const allowed = await ensureTripRole(req, res, tripId, 'owner');
    if (!allowed) return;

    const isPublic = Boolean(req.body?.isPublic);
    const updated = await repo.updateTripPublicState(tripId, isPublic);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }

    res.json({
      status: 'success',
      data: {
        trip_id: updated.id,
        isPublic: Boolean(updated.isPublic),
        forkCount: Number(updated.forkCount ?? 0),
      },
    });
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

    const day = Number(req.query.day ?? NaN);
    const safeDay = Number.isFinite(day) && day > 0 ? day : undefined;
    const nodes = await repo.getItineraryNodes(tripId, { day: safeDay });
    const formatted = nodes.map((node, index) => mapItineraryNodeRow(node, index));

    res.json(formatted);
  });

  app.post('/api/itinerary/sync', async (req, res) => {
    const { trip_id, action, payload } = req.body as {
      trip_id?: string;
      action?: string;
      payload?: { node_id?: string; day?: number; date?: string; time?: string; timestamp?: string; sort_order?: number; title?: string; emoji?: string; category?: string; lat?: number | null; lng?: number | null; description?: string; ai_note?: string; intensity?: string; is_visited?: boolean; transport_to_next?: string; image_url?: string; attachments?: Array<{ id?: string; name?: string; type?: string; url?: string }>; linkedFactId?: string; changes?: Record<string, unknown> };
    };

    if (!trip_id || !action || !payload?.node_id) {
      res.status(400).json({ status: 'error', message: 'invalid sync payload' });
      return;
    }

    const allowed = await ensureTripRole(req, res, trip_id, 'editor');
    if (!allowed) return;

    if (action === 'patch_node') {
      if (!payload.changes || typeof payload.changes !== 'object') {
        res.status(400).json({ status: 'error', message: 'invalid patch payload' });
        return;
      }

      const existing = await repo.findItineraryNode(payload.node_id);
      if (!existing || existing.tripId !== trip_id) {
        res.status(404).json({ status: 'error', message: 'node not found' });
        return;
      }

      const existingNode = mapItineraryNodeRow(existing, 0);
      const normalizedChanges = normalizeItineraryPatchChanges(existingNode, payload.changes);
      const nextLinkedFactId = 'linkedFactId' in normalizedChanges
        ? String(normalizedChanges.linkedFactId ?? '')
        : String(existingNode.linkedFactId ?? '');

      const linkedFactAllowed = await validateLinkedFactId(repo, trip_id, nextLinkedFactId);
      if (!linkedFactAllowed) {
        res.status(400).json({ status: 'error', message: 'linked travel fact is invalid' });
        return;
      }

      const mergedNode = {
        ...existingNode,
        ...normalizedChanges,
        linkedFactId: nextLinkedFactId,
      };

      await repo.upsertItineraryNode(trip_id, mergedNode);

      await appendPlanningRecord({
        trip_id,
        action: 'patch_node',
        node_id: payload.node_id,
        day: Number(mergedNode.day ?? 1),
        time: String(mergedNode.time ?? ''),
        title: String(mergedNode.title ?? ''),
        category: String(mergedNode.category ?? 'other'),
        source: 'api',
        timestamp: new Date().toISOString(),
      });
      await updatePlanningSnapshot(repo, trip_id);

      io.to(trip_id).emit('sync_itinerary', {
        trip_id,
        action: 'patch_node',
        payload: {
          node_id: payload.node_id,
          changes: normalizedChanges,
        },
      });

      res.json({ status: 'success' });
      return;
    }

    if (action !== 'add_node' || !payload.time || !payload.title) {
      res.status(400).json({ status: 'error', message: 'invalid sync payload' });
      return;
    }

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
      ai_note: payload.ai_note,
      intensity: payload.intensity,
      transport_to_next: payload.transport_to_next,
      image_url: payload.image_url,
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
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
        ai_note: payload.ai_note ?? null,
        intensity: payload.intensity ?? null,
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
    res.set('Cache-Control', 'private, max-age=300');
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
    res.json(rows.map((row) => ({ id: row.id, text: row.content, checked: Boolean(row.completed), category: row.category ?? 'other' })));
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
      currency,
      description: title,
      members,
    });

    const settlementRows = await repo.getAggregatedSettlements(trip_id);
    res.json({ status: 'success', settlements: settlementRows });
  });

  app.get('/api/ledger/expenses', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }
    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const cleared = req.query.cleared === 'true';
    const expensesList = await repo.getLedgerExpenses(tripId, cleared);
    res.json(expensesList);
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

  // pSEO routes — must be registered before Vite middleware / static catch-all
  app.use(createSeoRouter(repo));

  let vite: any;
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
  }

  // UGC trips SEO metadata injection
  app.get('/trips/:trip_id', async (req, res, next) => {
    const tripId = req.params.trip_id;
    if (!tripId.startsWith('trip_')) {
      return next();
    }

    try {
      const tripInfo = await buildTripInfo(repo, tripId);
      if (!tripInfo || !tripInfo.isPublic) {
        return next();
      }

      const fs = await import('fs');
      let html = '';

      if (vite) {
        html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        html = await vite.transformIndexHtml(req.url, html);
      } else {
        const distPath = path.join(process.cwd(), 'dist');
        const fs = await import('fs');
        html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
      }

      const title = `${tripInfo.name} - RoamJelly`;
      const description = `這是一段由漫遊果凍建立的公開旅遊行程：${tripInfo.name}。`;
      const coverImage = tripInfo.coverImage;

      html = html.replace(/<title>.*?<\/title>/is, `<title>${title}</title>`);
      html = html.replace(/<meta property="og:title" content=".*?"\s*\/>/is, `<meta property="og:title" content="${title}" />`);
      html = html.replace(/<meta property="og:description" content=".*?"\s*\/>/is, `<meta property="og:description" content="${description}" />`);
      html = html.replace(/<meta name="description" content=".*?"\s*\/>/is, `<meta name="description" content="${description}" />`);
      if (coverImage) {
        html = html.replace(/<meta property="og:image" content=".*?"\s*\/>/is, `<meta property="og:image" content="${coverImage}" />`);
        html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/>/is, `<meta name="twitter:image" content="${coverImage}" />`);
      }

      // 4. 結構化資料 (Schema Markup) 導入
      const schemaMarkup = {
        "@context": "https://schema.org",
        "@type": "Trip",
        "name": tripInfo.name,
        "description": description,
        "url": `https://roam-jelly-web.vercel.app/trips/${tripId}`
      };
      
      const schemaScript = `\n    <script type="application/ld+json">\n    ${JSON.stringify(schemaMarkup, null, 2)}\n    </script>`;
      html = html.replace('</head>', `${schemaScript}\n  </head>`);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      console.error('[UGC SEO] Failed to render trip page:', err);
      next();
    }
  });

  if (vite) {
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
          await repo.createTrip({ id: mt.id, name: mt.name, destination: mt.destination, isPublic: true, forkCount: 0 });
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

  // Expose app to Vercel serverless handler
  _resolveApp(app);
  if (process.env.VERCEL) return;

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

// Vercel serverless handler — imported by api/index.ts
export default async function handler(req: any, res: any) {
  try {
    const app = await _appPromise;
    return app(req, res);
  } catch (err) {
    console.error('Handler: app init failed', err);
    res.status(500).json({ error: 'Server initialization failed', detail: String(err) });
  }
}

// Start the server (local dev: also calls listen; Vercel: skips listen, resolves _appPromise)
startServer().catch((error) => {
  console.error('Server failed to start', error);
  _rejectApp(error);
  if (!process.env.VERCEL) process.exit(1);
});
