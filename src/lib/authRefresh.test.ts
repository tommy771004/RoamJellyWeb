import test from 'node:test';
import assert from 'node:assert/strict';

import { createAuthRefreshingFetch } from './authRefresh';

const ORIGIN = 'https://app.test';

/** Fake API: accepts only `validToken`; records every call's Authorization header. */
function setup(opts: { refreshTo?: string | null; refreshDelayMs?: number } = {}) {
  let stored: string | null = 'old';
  let validToken = 'old';
  const sent: Array<{ url: string; auth: string | null }> = [];
  let refreshCalls = 0;

  const baseFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const auth = new Headers(init?.headers).get('Authorization');
    sent.push({ url: String(input), auth });
    return new Response('{}', { status: auth === `Bearer ${validToken}` ? 200 : 401 });
  }) as typeof fetch;

  const wrapped = createAuthRefreshingFetch({
    baseFetch,
    origin: ORIGIN,
    getToken: () => stored,
    refresh: async () => {
      refreshCalls++;
      if (opts.refreshDelayMs) await new Promise((r) => setTimeout(r, opts.refreshDelayMs));
      const next = opts.refreshTo === undefined ? 'new' : opts.refreshTo;
      if (next) stored = next;
      return next;
    },
  });

  return {
    wrapped,
    sent,
    expire: () => { validToken = 'new'; },
    get refreshCalls() { return refreshCalls; },
  };
}

const authed = (token = 'old'): RequestInit => ({ method: 'POST', body: '{"a":1}', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });

test('a 401 from the API refreshes the session and replays the request with the new token', async () => {
  const s = setup();
  s.expire();
  const res = await s.wrapped('/api/generate/itinerary', authed());
  assert.equal(res.status, 200);
  assert.equal(s.refreshCalls, 1);
  assert.deepEqual(s.sent.map((c) => c.auth), ['Bearer old', 'Bearer new']);
});

test('concurrent 401s share one refresh (the refresh token is single-use)', async () => {
  const s = setup({ refreshDelayMs: 20 });
  s.expire();
  const results = await Promise.all([1, 2, 3].map(() => s.wrapped('/api/trips', authed())));
  assert.deepEqual(results.map((r) => r.status), [200, 200, 200]);
  assert.equal(s.refreshCalls, 1);
});

test('a request sent with an already-replaced token is replayed without refreshing again', async () => {
  const s = setup();
  s.expire();
  await s.wrapped('/api/a', authed());
  const res = await s.wrapped('/api/b', authed('old'));
  assert.equal(res.status, 200);
  assert.equal(s.refreshCalls, 1);
});

test('authenticated /api/auth calls such as /api/auth/me are refreshed too', async () => {
  const s = setup();
  s.expire();
  assert.equal((await s.wrapped('/api/auth/me', { headers: { Authorization: 'Bearer old' } })).status, 200);
});

test('the refresh endpoint, other origins and requests without a token are left alone', async () => {
  const s = setup();
  s.expire();
  assert.equal((await s.wrapped('/api/auth/session/refresh', authed())).status, 401);
  assert.equal((await s.wrapped('https://elsewhere.test/api/x', authed())).status, 401);
  assert.equal((await s.wrapped('/api/trips', { method: 'GET' })).status, 401);
  assert.equal(s.refreshCalls, 0);
});

test('when the session cannot be refreshed the original 401 is returned', async () => {
  const s = setup({ refreshTo: null });
  s.expire();
  const res = await s.wrapped('/api/trips', authed());
  assert.equal(res.status, 401);
  assert.equal(s.sent.length, 1);
});
