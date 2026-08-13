import assert from 'node:assert/strict';
import test from 'node:test';
import { assertItineraryPayload, WorkerAiProvider } from '../../services/workerAiProvider';
import { ChatGPTWebProvider } from '../../services/chatgptWebProvider';

test('worker provider accepts root objects and day-array chunk responses', () => {
  assert.doesNotThrow(() => assertItineraryPayload(JSON.stringify({
    itinerary: [{ day: 1, spots: [{ name: 'Temple', time: '09:00' }] }],
  })));
  assert.doesNotThrow(() => assertItineraryPayload(JSON.stringify([
    { day: 2, spots: [{ name: 'Market', time: '10:00' }] },
  ])));
});

test('worker provider rejects prose, empty days and malformed day entries', () => {
  assert.throws(() => assertItineraryPayload('Looks good to me'), /AI_RESPONSE_SCHEMA_INVALID/);
  assert.throws(() => assertItineraryPayload('{"itinerary":[]}'), /AI_RESPONSE_SCHEMA_INVALID/);
  assert.throws(
    () => assertItineraryPayload('{"itinerary":[{"day":1,"spots":"none"}]}'),
    /AI_RESPONSE_SCHEMA_INVALID/,
  );
});

test('worker provider records a primary failure and validates fallback output', async () => {
  const chatgpt = {
    generate: async () => { throw new Error('CHATGPT_AUTH_REQUIRED'); },
    close: async () => undefined,
  } as unknown as ChatGPTWebProvider;
  const provider = new WorkerAiProvider(chatgpt, async () => JSON.stringify({
    itinerary: [{ day: 1, spots: [{ name: 'Fallback place' }] }],
  }));

  const text = await provider.generate('plan a trip');
  assert.match(text, /Fallback place/);
  assert.equal(provider.stats.fallbackUsed, true);
  assert.equal(provider.stats.provider, 'chatgpt-web+openrouter');
  assert.match(provider.stats.primaryError || '', /CHATGPT_AUTH_REQUIRED/);
});

test('worker provider fails closed when paid fallback is not explicitly enabled', async () => {
  const previousAllowPaidFallback = process.env.ALLOW_PAID_FALLBACK;
  const previousOpenRouterKey = process.env.OPENROUTER_API_KEY;
  delete process.env.ALLOW_PAID_FALLBACK;
  process.env.OPENROUTER_API_KEY = 'unused-test-key';
  const chatgpt = {
    generate: async () => { throw new Error('CHATGPT_AUTH_REQUIRED'); },
    close: async () => undefined,
  } as unknown as ChatGPTWebProvider;

  try {
    const provider = new WorkerAiProvider(chatgpt);
    await assert.rejects(() => provider.generate('plan a trip'), /PAID_AI_FALLBACK_DISABLED/);
  } finally {
    if (previousAllowPaidFallback === undefined) delete process.env.ALLOW_PAID_FALLBACK;
    else process.env.ALLOW_PAID_FALLBACK = previousAllowPaidFallback;
    if (previousOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousOpenRouterKey;
  }
});

test('ChatGPT provider fails closed when no session path is configured', async () => {
  const provider = new ChatGPTWebProvider({});
  await assert.rejects(() => provider.init(), /CHATGPT_SESSION_NOT_CONFIGURED/);
});
