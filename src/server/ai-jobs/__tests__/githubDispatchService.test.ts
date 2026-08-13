import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatchAiItineraryJob } from '../../services/githubDispatchService';

const ENV_KEYS = [
  'GITHUB_DISPATCH_TOKEN',
  'GITHUB_AI_WORKER_REPO',
  'GITHUB_AI_WORKER_EVENT',
] as const;

async function withDispatchEnvironment(run: () => Promise<void>): Promise<void> {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('GitHub dispatch fails closed when its server-side token is absent', async () => {
  await withDispatchEnvironment(async () => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    process.env.GITHUB_AI_WORKER_REPO = 'owner/repo';
    await assert.rejects(
      () => dispatchAiItineraryJob({ jobId: 'job-1' }),
      /GITHUB_DISPATCH_TOKEN_NOT_CONFIGURED/,
    );
  });
});

test('GitHub dispatch sends only the job id in repository_dispatch payload', async () => {
  await withDispatchEnvironment(async () => {
    process.env.GITHUB_DISPATCH_TOKEN = 'server-secret';
    process.env.GITHUB_AI_WORKER_REPO = 'owner/repo';
    process.env.GITHUB_AI_WORKER_EVENT = 'ai-itinerary';
    let requestUrl = '';
    let requestInit: RequestInit | undefined;
    globalThis.fetch = (async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    await dispatchAiItineraryJob({ jobId: 'job-1' });
    assert.equal(requestUrl, 'https://api.github.com/repos/owner/repo/dispatches');
    assert.equal((requestInit?.headers as Record<string, string>).Authorization, 'Bearer server-secret');
    assert.deepEqual(JSON.parse(String(requestInit?.body)), {
      event_type: 'ai-itinerary',
      client_payload: { jobId: 'job-1' },
    });
  });
});
