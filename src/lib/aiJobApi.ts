import { getStoredToken } from './workflowApi';

export type AiJobState = 'queued' | 'running' | 'completed' | 'failed';

export type AiJobResponse = {
  jobId: string;
  tripId: string;
  status: AiJobState;
  provider?: string | null;
  fallbackUsed?: boolean;
  primaryError?: string | null;
  error?: string | null;
  result?: any;
};

export class AiJobApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly jobId?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiJobApiError';
  }
}

function authHeaders(includeContentType = false) {
  const token = getStoredToken();
  return {
    ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson(response: Response): Promise<any> {
  return response.json().catch(() => ({}));
}

export async function startItineraryAiJob(input: {
  tripId: string;
  destination: string;
  planner: any;
  aiMode?: { mode: 'overwrite_all' };
}): Promise<{ jobId: string; status: AiJobState; reused?: boolean }> {
  const response = await fetch('/api/ai/jobs/itinerary', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(input),
  });
  const json = await readJson(response);
  if (!response.ok || json.status !== 'success') {
    throw new AiJobApiError(
      json.message || `Failed to start AI job (${response.status})`,
      json.code,
      json.jobId,
      response.status,
    );
  }
  return json.data;
}

export async function getAiJob(jobId: string, signal?: AbortSignal): Promise<AiJobResponse> {
  const response = await fetch(`/api/ai/jobs/${encodeURIComponent(jobId)}`, {
    headers: authHeaders(),
    signal,
    cache: 'no-store',
  });
  const json = await readJson(response);
  if (!response.ok || json.status !== 'success') {
    throw new AiJobApiError(
      json.message || `Failed to get AI job (${response.status})`,
      json.code,
      jobId,
      response.status,
    );
  }
  return json.data as AiJobResponse;
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }
    const handleAbort = () => {
      globalThis.clearTimeout(timer);
      signal?.removeEventListener('abort', handleAbort);
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    const timer = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

export async function waitForAiJob(
  jobId: string,
  options: {
    intervalMs?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    onStatus?: (job: AiJobResponse) => void;
  } = {},
): Promise<AiJobResponse> {
  const intervalMs = Math.max(1_000, options.intervalMs ?? 2_500);
  const timeoutMs = Math.max(intervalMs, options.timeoutMs ?? 10 * 60_000);
  const startedAt = Date.now();
  let consecutiveErrors = 0;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const job = await getAiJob(jobId, options.signal);
      consecutiveErrors = 0;
      options.onStatus?.(job);
      if (job.status === 'completed') return job;
      if (job.status === 'failed') {
        throw new AiJobApiError(job.error || 'AI job failed', 'AI_JOB_FAILED', jobId);
      }
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (error instanceof AiJobApiError && error.code === 'AI_JOB_FAILED') throw error;
      if (error instanceof AiJobApiError && [401, 403, 404].includes(error.status ?? 0)) throw error;
      consecutiveErrors += 1;
      if (consecutiveErrors >= 3) throw error;
    }
    await abortableDelay(intervalMs * Math.max(1, consecutiveErrors), options.signal);
  }

  throw new AiJobApiError('AI job polling timeout', 'AI_JOB_TIMEOUT', jobId);
}
