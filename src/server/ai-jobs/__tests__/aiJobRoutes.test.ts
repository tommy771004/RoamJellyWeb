import assert from 'node:assert/strict';
import test from 'node:test';
import { parseItineraryJobRequest, registerAiJobRoutes } from '../../routes/aiJobRoutes';

test('async itinerary request accepts only bounded overwrite-all input', () => {
  const valid = parseItineraryJobRequest({
    tripId: 'trip-1',
    destination: 'Tokyo',
    planner: { days: 5 },
    aiMode: { mode: 'overwrite_all' },
  });
  assert.ok('value' in valid);
  if ('value' in valid) {
    assert.deepEqual(valid.value.request.planner, {
      days: 5,
      departureFrom: '',
      arrivalTo: '',
      flightDate: '',
      countries: [],
      mustVisitSpots: [],
      mustEatFoods: [],
      autoFlightSegments: [],
      travelFactsContext: '',
      notes: '',
      companions: '',
      vibes: [],
      interests: [],
      budget: '',
      dietary: [],
      transport: [],
      pace: '',
      accommodation: [],
    });
  }

  const partial = parseItineraryJobRequest({
    tripId: 'trip-1', destination: 'Tokyo', planner: { days: 5 },
    aiMode: { mode: 'selected_day' },
  });
  assert.equal('error' in partial && partial.code, 'ASYNC_MODE_NOT_YET_SUPPORTED');

  const excessive = parseItineraryJobRequest({
    tripId: 'trip-1', destination: 'Tokyo', planner: { days: 31 },
  });
  assert.ok('error' in excessive);
});

test('async itinerary request stores only bounded planner fields', () => {
  const parsed = parseItineraryJobRequest({
    tripId: 'trip-1',
    destination: 'Tokyo',
    planner: {
      days: 5,
      notes: `  ${'n'.repeat(5_000)}  `,
      vibes: [...Array.from({ length: 25 }, (_, index) => `vibe-${index}`), 42],
      unexpectedSecret: 'must not be persisted',
    },
  });

  assert.ok('value' in parsed);
  if ('value' in parsed) {
    assert.equal(parsed.value.request.planner.notes.length, 4_000);
    assert.equal(parsed.value.request.planner.vibes.length, 20);
    assert.equal('unexpectedSecret' in parsed.value.request.planner, false);
  }
});

test('route reuses an active job without dispatching it twice', async () => {
  const handlers = new Map<string, Array<(...args: any[]) => any>>();
  const app = {
    post: (path: string, ...registered: Array<(...args: any[]) => any>) => handlers.set(`POST ${path}`, registered),
    get: (path: string, ...registered: Array<(...args: any[]) => any>) => handlers.set(`GET ${path}`, registered),
  };
  let dispatchCount = 0;
  const job = {
    id: '12345678-1234-1234-1234-123456789abc',
    tripId: 'trip-1',
    status: 'running',
  };
  const aiJobRepo = {
    createOrGetItineraryJob: async () => ({ job, created: false }),
    markFailed: async () => undefined,
  };
  registerAiJobRoutes(app as any, {
    aiJobRepo: aiJobRepo as any,
    ensureTripRole: (async () => ({ userId: 'user-1', role: 'editor' })) as any,
    aiLimiter: ((_req: any, _res: any, next: () => void) => next()) as any,
    dispatchJob: async () => { dispatchCount += 1; },
  });

  const req = {
    body: { tripId: 'trip-1', destination: 'Tokyo', planner: { days: 5 } },
    authUser: { userId: 'user-1' },
  };
  let statusCode = 200;
  let payload: any;
  const res = {
    status(code: number) { statusCode = code; return this; },
    json(value: any) { payload = value; return this; },
  };
  const routeHandlers = handlers.get('POST /api/ai/jobs/itinerary')!;
  await new Promise<void>((resolve) => routeHandlers[0](req, res, resolve));
  await routeHandlers[1](req, res);

  assert.equal(statusCode, 202);
  assert.equal(payload.data.reused, true);
  assert.equal(dispatchCount, 0);
});

test('route marks a newly created job failed when dispatch cannot start', async () => {
  const handlers = new Map<string, Array<(...args: any[]) => any>>();
  const app = {
    post: (path: string, ...registered: Array<(...args: any[]) => any>) => handlers.set(`POST ${path}`, registered),
    get: (path: string, ...registered: Array<(...args: any[]) => any>) => handlers.set(`GET ${path}`, registered),
  };
  let failedJobId = '';
  const job = {
    id: '12345678-1234-4234-9234-123456789abc',
    tripId: 'trip-1',
    status: 'queued',
  };
  registerAiJobRoutes(app as any, {
    aiJobRepo: {
      createOrGetItineraryJob: async () => ({ job, created: true }),
      markFailed: async (jobId: string) => { failedJobId = jobId; },
    } as any,
    ensureTripRole: (async () => ({ userId: 'user-1', role: 'editor' })) as any,
    aiLimiter: ((_req: any, _res: any, next: () => void) => next()) as any,
    dispatchJob: async () => { throw new Error('dispatch unavailable'); },
  });

  const req = {
    body: { tripId: 'trip-1', destination: 'Tokyo', planner: { days: 5 } },
    authUser: { userId: 'user-1' },
  };
  let statusCode = 200;
  let payload: any;
  const res = {
    status(code: number) { statusCode = code; return this; },
    json(value: any) { payload = value; return this; },
  };
  const routeHandlers = handlers.get('POST /api/ai/jobs/itinerary')!;
  await new Promise<void>((resolve) => routeHandlers[0](req, res, resolve));
  await routeHandlers[1](req, res);

  assert.equal(statusCode, 502);
  assert.equal(payload.code, 'AI_WORKER_DISPATCH_FAILED');
  assert.equal(failedJobId, job.id);
});
