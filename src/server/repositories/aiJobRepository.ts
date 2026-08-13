import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, lt, ne } from 'drizzle-orm';
import * as schema from '../db/schema';

export type AiJobStatus = 'queued' | 'running' | 'completed' | 'failed';
export type AiJobRecord = typeof schema.aiGenerationJobs.$inferSelect;
const ACTIVE_JOB_STALE_AFTER_MS = 30 * 60_000;

function requireDb(db: any) {
  if (!db) throw new Error('DATABASE_NOT_CONFIGURED');
  return db;
}

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const direct = (error as { code?: unknown }).code;
  if (typeof direct === 'string') return direct;
  const cause = (error as { cause?: { code?: unknown } }).cause?.code;
  return typeof cause === 'string' ? cause : undefined;
}

function cleanCoordinate(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function normalizeTime(value: unknown): string {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{2}):(\d{2})$/);
  if (!match) return '10:00';
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? text : '10:00';
}

function normalizeDate(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function truncate(value: unknown, maxLength: number): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

export function buildItineraryRows(jobId: string, tripId: string, result: any) {
  const days = Array.isArray(result)
    ? result
    : Array.isArray(result?.itinerary)
      ? result.itinerary
      : [];
  const rows: Array<typeof schema.itineraryNodes.$inferInsert> = [];
  let sortOrder = 0;

  for (const dayData of days) {
    const parsedDay = Number(dayData?.day ?? 1);
    const day = Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 60
      ? parsedDay
      : 1;
    const spots = Array.isArray(dayData?.spots) ? dayData.spots : [];

    for (let index = 0; index < spots.length; index += 1) {
      const spot = spots[index] ?? {};
      const title = truncate(spot.name ?? spot.title, 255);
      if (!title) continue;

      rows.push({
        nodeId: `ai_${jobId.slice(0, 8)}_${day}_${index}_${randomUUID().slice(0, 8)}`,
        tripId,
        day,
        date: normalizeDate(spot.date ?? dayData?.date),
        time: normalizeTime(spot.time),
        timestamp: null,
        sortOrder: sortOrder++,
        title,
        emoji: truncate(spot.emoji || '📍', 32),
        category: truncate(spot.category || 'other', 64),
        lat: cleanCoordinate(spot.lat, -90, 90),
        lng: cleanCoordinate(spot.lng, -180, 180),
        description: String(spot.description ?? spot.ai_note ?? ''),
        aiNote: spot.ai_note ? String(spot.ai_note) : null,
        intensity: spot.intensity ? truncate(spot.intensity, 32) : null,
        isVisited: false,
        transportToNext: spot.transport_to_next ? String(spot.transport_to_next) : null,
        imageUrl: spot.image_url ? String(spot.image_url) : null,
        attachments: Array.isArray(spot.attachments) ? spot.attachments : [],
        linkedFactId: spot.linkedFactId ?? spot.linked_fact_id ?? null,
      });
    }
  }

  if (rows.length === 0) {
    throw new Error('AI_RESULT_HAS_NO_VALID_ITINERARY_NODES');
  }

  return rows;
}

export class AiJobRepository {
  constructor(private readonly db: any) {}

  async createOrGetItineraryJob(params: {
    userId?: string | null;
    tripId: string;
    request: Record<string, unknown>;
  }): Promise<{ job: AiJobRecord; created: boolean }> {
    const db = requireDb(this.db);
    const now = new Date();
    const staleBefore = new Date(now.getTime() - ACTIVE_JOB_STALE_AFTER_MS);
    await db
      .update(schema.aiGenerationJobs)
      .set({
        status: 'failed',
        error: 'AI_JOB_STALE_TIMEOUT',
        completedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(schema.aiGenerationJobs.tripId, params.tripId),
        eq(schema.aiGenerationJobs.type, 'itinerary'),
        inArray(schema.aiGenerationJobs.status, ['queued', 'running']),
        lt(schema.aiGenerationJobs.updatedAt, staleBefore),
      ));

    try {
      const [job] = await db
        .insert(schema.aiGenerationJobs)
        .values({
          userId: params.userId ?? null,
          tripId: params.tripId,
          type: 'itinerary',
          status: 'queued',
          request: params.request,
        })
        .returning();
      return { job, created: true };
    } catch (error) {
      if (databaseErrorCode(error) !== '23505') throw error;
      const existing = await this.getActiveItineraryJob(params.tripId);
      if (!existing) throw error;
      return { job: existing, created: false };
    }
  }

  async getActiveItineraryJob(tripId: string): Promise<AiJobRecord | null> {
    const db = requireDb(this.db);
    const [job] = await db
      .select()
      .from(schema.aiGenerationJobs)
      .where(and(
        eq(schema.aiGenerationJobs.tripId, tripId),
        eq(schema.aiGenerationJobs.type, 'itinerary'),
        inArray(schema.aiGenerationJobs.status, ['queued', 'running']),
      ))
      .orderBy(desc(schema.aiGenerationJobs.createdAt))
      .limit(1);
    return job ?? null;
  }

  async getJob(jobId: string): Promise<AiJobRecord | null> {
    const db = requireDb(this.db);
    const [job] = await db
      .select()
      .from(schema.aiGenerationJobs)
      .where(eq(schema.aiGenerationJobs.id, jobId))
      .limit(1);
    return job ?? null;
  }

  async claimJob(jobId: string): Promise<{ job: AiJobRecord; claimed: boolean }> {
    const db = requireDb(this.db);
    const now = new Date();
    const [claimedJob] = await db
      .update(schema.aiGenerationJobs)
      .set({ status: 'running', startedAt: now, updatedAt: now, error: null })
      .where(and(
        eq(schema.aiGenerationJobs.id, jobId),
        eq(schema.aiGenerationJobs.status, 'queued'),
      ))
      .returning();

    if (claimedJob) return { job: claimedJob, claimed: true };
    const existing = await this.getJob(jobId);
    if (!existing) throw new Error(`AI_JOB_NOT_FOUND:${jobId}`);
    return { job: existing, claimed: false };
  }

  async completeItineraryJob(job: AiJobRecord, params: {
    result: unknown;
    provider: string;
    fallbackUsed: boolean;
    primaryError?: string | null;
  }): Promise<void> {
    const db = requireDb(this.db);
    const rows = buildItineraryRows(job.id, job.tripId, params.result);
    const now = new Date();

    await db.transaction(async (tx: any) => {
      await tx.delete(schema.itineraryNodes).where(eq(schema.itineraryNodes.tripId, job.tripId));
      await tx.insert(schema.itineraryNodes).values(rows);
      const [completedJob] = await tx
        .update(schema.aiGenerationJobs)
        .set({
          status: 'completed',
          result: params.result,
          provider: params.provider,
          fallbackUsed: params.fallbackUsed,
          primaryError: params.primaryError?.slice(0, 4000) ?? null,
          error: null,
          completedAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(schema.aiGenerationJobs.id, job.id),
          eq(schema.aiGenerationJobs.status, 'running'),
        ))
        .returning({ id: schema.aiGenerationJobs.id });
      if (!completedJob) throw new Error('AI_JOB_NOT_RUNNING');
    });
  }

  async markFailed(jobId: string, error: unknown, primaryError?: string | null): Promise<void> {
    const db = requireDb(this.db);
    const message = error instanceof Error ? error.message : String(error);
    const now = new Date();
    await db
      .update(schema.aiGenerationJobs)
      .set({
        status: 'failed',
        error: message.slice(0, 4000),
        primaryError: primaryError?.slice(0, 4000) ?? null,
        completedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(schema.aiGenerationJobs.id, jobId),
        ne(schema.aiGenerationJobs.status, 'completed'),
      ));
  }
}
