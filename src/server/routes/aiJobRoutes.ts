import type { Express, RequestHandler } from 'express';
import type { EnsureTripRole } from '../auth/requestAuth';
import { getRequestUserId } from '../auth/requestAuth';
import type { AiJobRepository, AiJobStatus } from '../repositories/aiJobRepository';
import { dispatchAiItineraryJob } from '../services/githubDispatchService';

type DispatchJob = (params: { jobId: string }) => Promise<void>;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AiJobRoutesDeps {
  aiJobRepo: AiJobRepository;
  ensureTripRole: EnsureTripRole;
  aiLimiter: RequestHandler;
  dispatchJob?: DispatchJob;
}

function boundedString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function boundedStringArray(
  value: unknown,
  maxItems = 20,
  maxItemLength = 200,
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => boundedString(item, maxItemLength))
    .filter(Boolean);
}

function sanitizePlanner(planner: Record<string, unknown>, days: number) {
  return {
    days,
    departureFrom: boundedString(planner.departureFrom, 255),
    arrivalTo: boundedString(planner.arrivalTo, 255),
    flightDate: boundedString(planner.flightDate, 32),
    countries: boundedStringArray(planner.countries),
    mustVisitSpots: boundedStringArray(planner.mustVisitSpots, 30, 255),
    mustEatFoods: boundedStringArray(planner.mustEatFoods, 30, 255),
    autoFlightSegments: boundedStringArray(planner.autoFlightSegments, 20, 500),
    travelFactsContext: boundedString(planner.travelFactsContext, 8_000),
    notes: boundedString(planner.notes, 4_000),
    companions: boundedString(planner.companions, 100),
    vibes: boundedStringArray(planner.vibes, 20, 100),
    interests: boundedStringArray(planner.interests, 20, 100),
    budget: boundedString(planner.budget, 100),
    dietary: boundedStringArray(planner.dietary, 20, 100),
    transport: boundedStringArray(planner.transport, 20, 100),
    pace: boundedString(planner.pace, 100),
    accommodation: boundedStringArray(planner.accommodation, 20, 100),
  };
}

export function parseItineraryJobRequest(body: any) {
  const tripId = String(body?.tripId ?? '').trim();
  const destination = String(body?.destination ?? '').trim();
  const planner = body?.planner;
  const days = Number(planner?.days);
  const mode = body?.aiMode?.mode ?? 'overwrite_all';

  if (!tripId || tripId.length > 128) {
    return { error: 'tripId is required and must be at most 128 characters', code: undefined } as const;
  }
  if (!destination || destination.length > 255) {
    return { error: 'destination is required and must be at most 255 characters', code: undefined } as const;
  }
  if (!planner || typeof planner !== 'object' || Array.isArray(planner) || !Number.isInteger(days) || days < 1 || days > 30) {
    return { error: 'planner.days must be an integer between 1 and 30', code: undefined } as const;
  }
  if (mode !== 'overwrite_all') {
    return {
      error: 'Async worker currently supports overwrite_all only',
      code: 'ASYNC_MODE_NOT_YET_SUPPORTED',
    } as const;
  }

  return {
    value: {
      tripId,
      request: {
        destination,
        planner: sanitizePlanner(planner, days),
        aiMode: { mode: 'overwrite_all' },
      },
    },
  } as const;
}

export function registerAiJobRoutes(app: Express, deps: AiJobRoutesDeps): void {
  const { aiJobRepo, ensureTripRole, aiLimiter } = deps;
  const dispatchJob = deps.dispatchJob ?? dispatchAiItineraryJob;

  app.post('/api/ai/jobs/itinerary', aiLimiter, async (req, res) => {
    const parsed = parseItineraryJobRequest(req.body);
    if ('error' in parsed) {
      res.status(parsed.code ? 409 : 400).json({
        status: 'error',
        code: parsed.code,
        message: parsed.error,
      });
      return;
    }

    const { tripId, request } = parsed.value;
    const allowed = await ensureTripRole(req, res, tripId, 'editor');
    if (!allowed) return;

    try {
      const { job, created } = await aiJobRepo.createOrGetItineraryJob({
        userId: getRequestUserId(req),
        tripId,
        request,
      });

      if (created) {
        try {
          await dispatchJob({ jobId: job.id });
        } catch (error) {
          await aiJobRepo.markFailed(job.id, error);
          console.error('[AI Job] GitHub dispatch failed', error);
          res.status(502).json({
            status: 'error',
            code: 'AI_WORKER_DISPATCH_FAILED',
            jobId: job.id,
            message: 'AI worker could not be started',
          });
          return;
        }
      }

      res.status(202).json({
        status: 'success',
        data: {
          jobId: job.id,
          status: job.status as AiJobStatus,
          reused: !created,
        },
      });
    } catch (error) {
      console.error('[AI Job] Could not create job', error);
      res.status(500).json({ status: 'error', message: 'AI job could not be created' });
    }
  });

  app.get('/api/ai/jobs/:jobId', async (req, res) => {
    const jobId = String(req.params.jobId ?? '').trim();
    if (!UUID_PATTERN.test(jobId)) {
      res.status(400).json({ status: 'error', message: 'A valid jobId is required' });
      return;
    }

    try {
      const job = await aiJobRepo.getJob(jobId);
      if (!job) {
        res.status(404).json({ status: 'error', message: 'AI job not found' });
        return;
      }

      const allowed = await ensureTripRole(req, res, job.tripId, 'viewer');
      if (!allowed) return;

      res.setHeader('Cache-Control', 'private, no-store');
      res.json({
        status: 'success',
        data: {
          jobId: job.id,
          tripId: job.tripId,
          type: job.type,
          status: job.status,
          provider: job.provider,
          fallbackUsed: job.fallbackUsed,
          primaryError: job.primaryError,
          error: job.error,
          result: job.status === 'completed' ? job.result : undefined,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
        },
      });
    } catch (error) {
      console.error('[AI Job] Could not read job', error);
      res.status(500).json({ status: 'error', message: 'AI job could not be read' });
    }
  });
}
