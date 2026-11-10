import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { FREE_MODELS, fetchOpenRouterWithFallback, resetOpenRouterModelState } from './openrouterHelper';

type Behaviour = { status?: number; text?: string; delayMs?: number };

const realFetch = globalThis.fetch;
let calls: Array<{ model: string; body: any }> = [];

/** Stubs OpenRouter: each model answers per `behaviours` (default: 404). */
function stubOpenRouter(behaviours: Record<string, Behaviour>) {
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push({ model: body.model, body });
    const b = behaviours[body.model] ?? { status: 404 };
    if (b.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, b.delayMs);
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      });
    }
    const status = b.status ?? 200;
    const payload = status === 200 ? { choices: [{ message: { content: b.text ?? '' } }] } : { error: 'x' };
    return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

const FAST = { hedgeAfterMs: 50, attemptTimeoutMs: 400 };
const [M1, M2, M3] = FREE_MODELS;

beforeEach(() => {
  calls = [];
  resetOpenRouterModelState();
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('the model list holds the requested free models and the backups', () => {
  assert.ok(FREE_MODELS.includes('thinkingmachines/inkling-2-small:free'));
  assert.ok(FREE_MODELS.includes('liquid/lfm-3-1.7b:free'));
  assert.ok(FREE_MODELS.includes('recursive/flint-v1.0:free'));
  assert.ok(FREE_MODELS.includes('xingchen-agi/xing4.0-29b-a4b:free'));
  assert.ok(FREE_MODELS.includes('nvidia/nemotron-3.5-lightning:free'));
  assert.ok(FREE_MODELS.includes('nvidia/nemotron-3-ultra-550b-a55b:free'));
  assert.ok(FREE_MODELS.includes('dots-studio/dots-3-note-preview:free'));
  assert.ok(FREE_MODELS.every((m) => m.endsWith(':free')));
});

test('asks for low-effort, hidden reasoning', async () => {
  stubOpenRouter({ [M1]: { text: 'ok' } });
  assert.equal(await fetchOpenRouterWithFallback('k', 'hi', FAST), 'ok');
  assert.deepEqual(calls[0].body.reasoning, { effort: 'low', exclude: true });
});

test('skips a missing model and does not try it again on the next call', async () => {
  stubOpenRouter({ [M1]: { status: 404 }, [M2]: { text: 'from m2' } });
  assert.equal(await fetchOpenRouterWithFallback('k', 'hi', FAST), 'from m2');
  calls = [];
  assert.equal(await fetchOpenRouterWithFallback('k', 'hi', FAST), 'from m2');
  assert.deepEqual(calls.map((c) => c.model), [M2], 'last answering model goes first; 404 model is skipped');
});

test('a slow model gets a second model started alongside it; the faster answer wins', async () => {
  stubOpenRouter({ [M1]: { text: 'slow', delayMs: 300 }, [M2]: { text: 'fast', delayMs: 10 } });
  const started = Date.now();
  assert.equal(await fetchOpenRouterWithFallback('k', 'hi', FAST), 'fast');
  assert.ok(Date.now() - started < 250, 'did not wait for the slow model');
  assert.deepEqual(calls.map((c) => c.model), [M1, M2]);
});

test('never runs more than two models at once', async () => {
  stubOpenRouter({ [M1]: { text: 'a', delayMs: 200 }, [M2]: { text: 'b', delayMs: 200 }, [M3]: { text: 'c', delayMs: 10 } });
  assert.equal(await fetchOpenRouterWithFallback('k', 'hi', FAST), 'a');
  assert.deepEqual(calls.map((c) => c.model), [M1, M2]);
});

test('a model that times out counts as failed and the next one answers', async () => {
  stubOpenRouter({ [M1]: { text: 'late', delayMs: 2000 }, [M2]: { status: 500 }, [M3]: { text: 'third' } });
  assert.equal(await fetchOpenRouterWithFallback('k', 'hi', { hedgeAfterMs: 5000, attemptTimeoutMs: 80 }), 'third');
});

test('stops at once on a bad API key', async () => {
  stubOpenRouter({ [M1]: { status: 401 } });
  await assert.rejects(fetchOpenRouterWithFallback('bad', 'hi', FAST), /Stopping retries/);
  assert.equal(calls.length, 1);
});

test('reports ALL_MODELS_RATE_LIMITED when every model is limited or missing', async () => {
  stubOpenRouter(Object.fromEntries(FREE_MODELS.map((m) => [m, { status: 429 }])));
  await assert.rejects(fetchOpenRouterWithFallback('k', 'hi', FAST), /ALL_MODELS_RATE_LIMITED/);
});

test('empty answers count as failures', async () => {
  stubOpenRouter({ [M1]: { text: '   ' }, [M2]: { text: 'real' } });
  assert.equal(await fetchOpenRouterWithFallback('k', 'hi', FAST), 'real');
});
