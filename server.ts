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
import {
  type TripRole,
  type AuthedRequest,
  hasRequiredRole,
  getTokenFromRequest,
  getRequestUserId,
  getClientIp,
  createEnsureTripRole,
} from './src/server/auth/requestAuth';
import {
  getSearchCacheKey,
  getPlanningLogKey,
  getPlanningSnapshotKey,
  normalizeMembers,
  isGuestUserId,
  distanceInKm,
} from './src/server/utils/serverHelpers';
import { registerAuthRoutes } from './src/server/routes/authRoutes';
import { registerUserRoutes } from './src/server/routes/userRoutes';
import { registerToolsRoutes } from './src/server/routes/toolsRoutes';
import { registerFavoritesRoutes } from './src/server/routes/favoritesRoutes';
import { registerTripsRoutes } from './src/server/routes/tripsRoutes';
import { registerItineraryRoutes } from './src/server/routes/itineraryRoutes';
import { registerDiscoveryRoutes } from './src/server/routes/discoveryRoutes';
import { registerGeoRoutes } from './src/server/routes/geoRoutes';
import { registerAiRoutes } from './src/server/routes/aiRoutes';
import { registerScrapingRoutes } from './src/server/routes/scrapingRoutes';
import { registerSocketHandlers } from './src/server/realtime/socketHandlers';
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
const PORT = Number(process.env.PORT) || 3000;

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

  // ── Layer 3 (Safety Fallback): Open-Meteo Geocoding ───────────────────────
  try {
    let url = `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en`;
    const apiRes = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && data.results && data.results.length > 0) {
        const lat = parseFloat(data.results[0].latitude);
        const lon = parseFloat(data.results[0].longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          if (isCoordValidForCity(lat, lon, biasCoords, cleanTitle, cleanCity, 'Open-Meteo')) {
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

  const ensureTripRole = createEnsureTripRole(repo);

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

  registerAuthRoutes(app, {
    repo,
    guestAuthLimiter,
    loginLimiter,
    registerLimiter,
    enableDevToken: JWT_DEV_TOKEN_ENABLED,
    enableGuest: GUEST_AUTH_ENABLED,
  });

  registerSocketHandlers(io, {
    repo,
    authRequired: AUTH_REQUIRED,
    mapItineraryNodeRow,
    normalizeItineraryPatchChanges,
    validateLinkedFactId,
    buildNodeTimestamp,
    normalizeDateOnlyInput,
    appendPlanningRecord,
    updatePlanningSnapshot,
  });

  registerScrapingRoutes(app, {
    repo,
    getRedis: () => redisClient,
    fetchFromOtaProvider,
  });

  registerAiRoutes(app, {
    repo,
    ensureTripRole,
    geocodeSpot,
    authRequired: AUTH_REQUIRED,
    guestAiLimiter,
    aiLimiter,
    isCoordValidForCity,
    normalizeDateOnlyInput,
    formatDateOnly,
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

  registerDiscoveryRoutes(app, {
    repo,
    getRedis: () => redisClient,
    getSearchCacheData,
    setSearchCacheData,
    appendSearchHistory,
    getSearchHistory,
    fetchFromOtaProvider,
    annotateRoundTripLeg,
    otaPartnerBase: OTA_PARTNER_BASE,
  });


  registerGeoRoutes(app, {
    repo,
    geocodeSpot,
    getRedis: () => redisClient,
    authRequired: AUTH_REQUIRED,
  });

  registerTripsRoutes(app, {
    repo,
    authRequired: AUTH_REQUIRED,
    ensureTripRole,
    io,
    buildTripInfo,
    mapTravelFactRow,
    summarizeTravelFacts,
  });

  registerUserRoutes(app, { repo });


  registerItineraryRoutes(app, {
    repo,
    ensureTripRole,
    io,
    mapItineraryNodeRow,
    normalizeItineraryPatchChanges,
    validateLinkedFactId,
    buildNodeTimestamp,
    normalizeDateOnlyInput,
    appendPlanningRecord,
    updatePlanningSnapshot,
    getPlanningRecords,
    getPlanningSnapshot,
  });

  registerToolsRoutes(app, { repo, authRequired: AUTH_REQUIRED, ensureTripRole });

  registerFavoritesRoutes(app, { repo, ensureTripRole, geocodeSpot });

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

  // /pricing — SPA route; inject page-specific canonical + metadata so it does not
  // self-canonicalize to the homepage and gets an accurate title/description in SERPs.
  app.get('/pricing', async (req, res, next) => {
    try {
      const fs = await import('fs');
      let html = '';
      if (vite) {
        html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        html = await vite.transformIndexHtml(req.url, html);
      } else {
        html = fs.readFileSync(path.join(process.cwd(), 'dist', 'index.html'), 'utf-8');
      }

      const canonical = 'https://roam-jelly-web.vercel.app/pricing';
      const title = 'RoamJelly 果凍漫遊 — 方案與價格｜早鳥免費';
      const description = '果凍漫遊定價：早鳥階段免費，無需信用卡。每個行程最多 10 位旅伴，含 AI 行程生成、機票比價與多幣別分帳。未來 Pro / Team 方案規劃中。';

      html = html.replace(/<title>.*?<\/title>/is, `<title>${title}</title>`);
      html = html.replace(/<meta name="description" content=".*?"\s*\/>/is, `<meta name="description" content="${description}" />`);
      html = html.replace(/<link rel="canonical" href=".*?"\s*\/>/is, `<link rel="canonical" href="${canonical}" />`);
      html = html.replace(/<meta property="og:url" content=".*?"\s*\/>/is, `<meta property="og:url" content="${canonical}" />`);
      html = html.replace(/<meta property="og:title" content=".*?"\s*\/>/is, `<meta property="og:title" content="${title}" />`);
      html = html.replace(/<meta property="og:description" content=".*?"\s*\/>/is, `<meta property="og:description" content="${description}" />`);
      html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/>/is, `<meta name="twitter:title" content="${title}" />`);
      html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/>/is, `<meta name="twitter:description" content="${description}" />`);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      console.error('[pricing SEO] Failed to render pricing page:', err);
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
        
        // IDs must be `trip_`-prefixed so the UGC SEO handler injects per-trip
        // title/description/Trip schema (and so they qualify for the sitemap).
        const demoTrips = [
          { id: 'trip_demo_tokyo', name: '東京散策：巷弄裡的小秘密', destination: '東京', userId: authorId, role: 'owner' },
          { id: 'trip_demo_osaka', name: '大阪美食地圖 2024', destination: '大阪', userId: authorId, role: 'owner' },
          { id: 'trip_demo_kyoto', name: '京都紅葉季完全攻略', destination: '京都', userId: authorId, role: 'owner' },
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
