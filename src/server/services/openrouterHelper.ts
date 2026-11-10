// Free-tier models sourced from https://openrouter.ai/api/v1/models
// (pricing.prompt === "0", text output). Last synced 2026-11-10.
//
// Order is the starting preference only: at runtime the model that last
// answered moves to the front, and models that fail are skipped for a while
// (see `modelHealth`), so a dead or overloaded model stops costing time.
//
// EXCLUDED MODELS:
// - 'openrouter/free': Meta-router which can fail or return unexpected, unparsable formats.
// - 'google/lyria-3-*': Paid (402 Insufficient credits) audio models.
// - 'cohere/north-mini-code:free': Coding-specialised.
// - 'parallel/decisions-fast:free', 'heygen/heygen-voice-1-turbo:free': Not in the
//   OpenRouter catalog as of 2026-11-10 (heygen is a voice model anyway).
// - Removed 2026-11-10 because OpenRouter no longer lists them (every call was a 404):
//   qwen3-coder, deepseek-v4-flash, qwen3-next-80b, llama-3.3-70b, llama-3.2-3b,
//   hermes-3-405b, minimax-m2.5, gpt-oss-120b/20b, glm-4.5-air, lfm-2.5-1.2b ×2,
//   dolphin-mistral-24b, baidu/cobuddy, nemotron embed/super/nano ×3.
export const FREE_MODELS = [
  'google/gemma-4-26b-a4b-it:free',      // MoE, 4B active — fast, proven in production
  'xingchen-agi/xing4.0-29b-a4b:free',   // MoE, 4B active
  'thinkingmachines/inkling-2-small:free',
  'google/gemma-4-31b-it:free',
  'recursive/flint-v1.0:free',
  'liquid/lfm-3-1.7b:free',              // smallest; last resort for long JSON
  // Backups — used when the models above are failing or cooling down.
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'dots-studio/dots-3-note-preview:free',
];

// WARNING: PAID models — only used when ALLOW_PAID_FALLBACK=true.
const PAID_FALLBACK_MODELS = [
  'google/gemini-1.5-flash',
  'openai/gpt-4o-mini',
  'google/gemini-1.5-pro',
];

const FALLBACK_MODELS = process.env.ALLOW_PAID_FALLBACK === 'true'
  ? [...FREE_MODELS, ...PAID_FALLBACK_MODELS]
  : FREE_MODELS;

/** A single model gets this long before it counts as failed. */
const ATTEMPT_TIMEOUT_MS = 45_000;
/**
 * If the current model has not answered after this long, the next one starts
 * alongside it and whichever answers first wins. Free models are often queued,
 * so waiting on one slow model was the main source of long AI waits.
 */
const HEDGE_AFTER_MS = 12_000;
/** At most this many models run at once (free-tier rate limits are per account). */
const MAX_PARALLEL = 2;

/** How long a model is skipped after each kind of failure. */
const COOLDOWN_MS = {
  notFound: 6 * 60 * 60_000, // model removed or renamed
  rateLimited: 60_000,
  forbidden: 10 * 60_000, // moderation / account or region block / key limit
  failed: 2 * 60_000, // error, timeout or empty answer
} as const;

type FailureKind = keyof typeof COOLDOWN_MS;

const modelHealth = new Map<string, { until: number; kind: FailureKind }>();
let preferredModel: string | null = null;

class ModelAttemptError extends Error {
  constructor(readonly kind: FailureKind | 'auth', message: string) {
    super(message);
  }
}

/** Models to try, in order: last success first, then healthy models, then cooling-down ones. */
function orderModels(now = Date.now()): string[] {
  const healthy = FALLBACK_MODELS.filter((m) => (modelHealth.get(m)?.until ?? 0) <= now);
  const cooling = FALLBACK_MODELS.filter((m) => !healthy.includes(m))
    // Retry the soonest-recovering first; models that were not found go last.
    .sort((a, b) => {
      const ha = modelHealth.get(a)!;
      const hb = modelHealth.get(b)!;
      if ((ha.kind === 'notFound') !== (hb.kind === 'notFound')) return ha.kind === 'notFound' ? 1 : -1;
      return ha.until - hb.until;
    });
  // Cooling-down models are only used when nothing healthy is left, so a
  // single bad minute does not leave the app with no AI at all.
  const ordered = healthy.length > 0 ? healthy : cooling;
  if (preferredModel && ordered.includes(preferredModel)) {
    return [preferredModel, ...ordered.filter((m) => m !== preferredModel)];
  }
  return ordered;
}

async function callModel(model: string, apiKey: string, prompt: string, signal: AbortSignal): Promise<string> {
  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://roamjelly.app',
        'X-Title': 'RoamJelly',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        // Every free model here is a reasoning model. Long hidden reasoning
        // made answers slow and sometimes used up max_tokens before any
        // content; low effort keeps answers quick, and excluding it keeps the
        // reply to the content the callers parse.
        reasoning: { effort: 'low', exclude: true },
      }),
    });
  } catch (err: any) {
    if (signal.aborted) throw new ModelAttemptError('failed', `${model} timed out or was cancelled`);
    throw new ModelAttemptError('failed', `${model} network error: ${err?.message ?? err}`);
  }

  // 401 = the key itself is invalid or disabled — no point retrying any model.
  if (response.status === 401) {
    const errText = await response.text().catch(() => '');
    throw new ModelAttemptError('auth', `API key invalid (401): ${errText.slice(0, 300)}. Stopping retries.`);
  }
  // 403 can be model-specific (input flagged by a model's moderation, model
  // blocked for this account/region) or key-wide (key credit limit reached).
  // Log OpenRouter's reason and move on; if the key is the problem every model
  // returns 403 quickly and the run still ends in an error.
  if (response.status === 403) {
    const errText = await response.text().catch(() => '');
    throw new ModelAttemptError('forbidden', `403 forbidden on ${model}: ${errText.slice(0, 300)}`);
  }
  if (response.status === 429) throw new ModelAttemptError('rateLimited', `429 rate limited on ${model}`);
  if (response.status === 404) throw new ModelAttemptError('notFound', `Model ${model} not found (404)`);
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new ModelAttemptError('failed', `OpenRouter API Error (${model}): ${response.status} ${errText.slice(0, 300)}`);
  }

  const data = await response.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text === 'string' && text.trim()) return text;
  throw new ModelAttemptError('failed', `Model ${model} returned empty content`);
}

/**
 * Sends `prompt` to the free OpenRouter models and returns the first answer.
 *
 * Tries models in order; a model that is slow to answer gets a second model
 * started alongside it (at most MAX_PARALLEL at once), and the first answer
 * wins while the rest are cancelled. Throws 'ALL_MODELS_RATE_LIMITED' when the
 * models were all rate limited or missing, and stops at once on a bad API key.
 */
export async function fetchOpenRouterWithFallback(
  apiKey: string,
  prompt: string,
  timing: {
    hedgeAfterMs?: number;
    attemptTimeoutMs?: number;
    /** Give up on all models after this long (rejects with 'AI_TIME_BUDGET_EXCEEDED'). */
    totalBudgetMs?: number;
  } = {},
): Promise<string> {
  const hedgeAfterMs = timing.hedgeAfterMs ?? HEDGE_AFTER_MS;
  const attemptTimeoutMs = Math.min(timing.attemptTimeoutMs ?? ATTEMPT_TIMEOUT_MS, timing.totalBudgetMs ?? Infinity);
  const models = orderModels();
  const controllers = new Set<AbortController>();
  let nextIndex = 0;
  let running = 0;
  let settled = false;
  let rateLimitedCount = 0;
  let notFoundCount = 0;
  let forbiddenCount = 0;
  let lastError: Error | null = null;

  return new Promise<string>((resolve, reject) => {
    let budgetTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(budgetTimer);
      for (const c of controllers) c.abort();
      settle();
    };

    const finalError = () => {
      const unavailable = rateLimitedCount + notFoundCount;
      if (forbiddenCount === models.length) {
        return new Error(`OpenRouter returned 403 for every model — check the API key's status and credit limit. Last: ${lastError?.message ?? ''}`);
      }
      if (unavailable === models.length || rateLimitedCount > 0) return new Error('ALL_MODELS_RATE_LIMITED');
      return lastError || new Error('All fallback models failed.');
    };

    const launchNext = () => {
      if (settled || running >= MAX_PARALLEL) return;
      if (nextIndex >= models.length) {
        if (running === 0) finish(() => reject(finalError()));
        return;
      }

      const model = models[nextIndex++];
      const controller = new AbortController();
      controllers.add(controller);
      running++;
      const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);
      const hedge = setTimeout(() => {
        console.warn(`[openrouter] ${model} still working after ${hedgeAfterMs / 1000}s; starting the next model alongside it.`);
        launchNext();
      }, hedgeAfterMs);
      const startedAt = Date.now();

      callModel(model, apiKey, prompt, controller.signal)
        .then((text) => {
          modelHealth.delete(model);
          preferredModel = model;
          console.log(`[openrouter] Answered by ${model} in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
          finish(() => resolve(text));
        })
        .catch((err: unknown) => {
          if (settled) return; // cancelled because another model won
          const error = err instanceof ModelAttemptError ? err : new ModelAttemptError('failed', String(err));
          if (error.kind === 'auth') {
            finish(() => reject(new Error(error.message)));
            return;
          }
          if (error.kind === 'rateLimited') rateLimitedCount++;
          if (error.kind === 'notFound') notFoundCount++;
          if (error.kind === 'forbidden') forbiddenCount++;
          modelHealth.set(model, { until: Date.now() + COOLDOWN_MS[error.kind], kind: error.kind });
          if (preferredModel === model) preferredModel = null;
          lastError = error;
          console.warn(`[openrouter] ${error.message}; trying next model...`);
        })
        .finally(() => {
          clearTimeout(timeout);
          clearTimeout(hedge);
          controllers.delete(controller);
          running--;
          launchNext();
        });
    };

    const { totalBudgetMs } = timing;
    if (totalBudgetMs !== undefined) {
      budgetTimer = setTimeout(() => {
        console.warn(`[openrouter] No answer within ${totalBudgetMs / 1000}s; giving up.`);
        finish(() => reject(new Error('AI_TIME_BUDGET_EXCEEDED')));
      }, totalBudgetMs);
    }

    launchNext();
  });
}

/** Test hook: forget runtime model health and preference. */
export function resetOpenRouterModelState(): void {
  modelHealth.clear();
  preferredModel = null;
}
