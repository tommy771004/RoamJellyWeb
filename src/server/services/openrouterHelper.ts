// Free-tier models sourced from https://openrouter.ai/api/v1/models (pricing.prompt === "0").
// Last synced 2026-05-11. Ordered by expected capability for Chinese travel JSON generation.
// Excluded: audio (lyria), OCR (qianfan-ocr), internal (openrouter/owl-alpha, openrouter/free), code-only (poolside/*), unknown (inclusionai/ring).
const FREE_MODELS = [
  // Highly active, stable, lightning-fast models (highly recommended for Chinese travel JSON generation)
  'google/gemini-2.5-flash:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'google/gemini-2.5-pro:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  
  // Mid-tier backup
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'z-ai/glm-4.5-air:free',
  'minimax/minimax-m2.5:free',
  
  // Small / Tiny backups
  'meta-llama/llama-3.2-3b-instruct:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'liquid/lfm-2.5-1.2b-thinking:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Options to tune LLM generation speed, cost, and output format. */
export interface OpenRouterOptions {
  /** Force structured JSON output (models that support it). */
  responseFormat?: { type: 'json_object' | 'text' };
  /** Lower = faster & more deterministic. Default 0.7. */
  temperature?: number;
  /** Token budget — smaller = faster response. Default 4000. */
  maxTokens?: number;
}

export async function fetchOpenRouterWithFallback(
  apiKey: string,
  promptOrMessages: string | Array<{ role: string; content: string }>,
  options?: OpenRouterOptions
) {
  let lastError: Error | null = null;
  let rateLimitedCount = 0;
  let notFoundCount = 0;

  const messages = typeof promptOrMessages === 'string'
    ? [{ role: 'user', content: promptOrMessages }]
    : promptOrMessages;

  const maxTokens = options?.maxTokens ?? 4000;
  const temperature = options?.temperature ?? 0.7;

  for (const model of FALLBACK_MODELS) {
    try {
      // Build request body with optional structured output and temperature
      const requestBody: Record<string, unknown> = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      };

      // Attach JSON mode for models that support structured output
      if (options?.responseFormat) {
        requestBody.response_format = options.responseFormat;
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://roamjelly.app',
          'X-Title': 'RoamJelly'
        },
        body: JSON.stringify(requestBody)
      });

      // Auth failure — no point retrying any model.
      if (response.status === 401 || response.status === 403) {
        throw new Error(`API key invalid or forbidden (${response.status}). Stopping retries.`);
      }

      // Rate limited — wait then try next model.
      if (response.status === 429) {
        console.warn(`Rate limited on model ${model}, trying next model...`);
        await sleep(1200);
        rateLimitedCount++;
        lastError = new Error(`429 rate limited on ${model}`);
        continue;
      }

      // Model not found — skip silently (stale model ID in list).
      if (response.status === 404) {
        console.warn(`Model ${model} not found (404), skipping...`);
        notFoundCount++;
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`OpenRouter API Error (${model}): ${response.status} ${errText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (text) {
        console.log(`Successfully generated content using model: ${model}`);
        return text;
      } else {
        throw new Error(`Model ${model} returned empty content`);
      }
    } catch (err: any) {
      if (err.message?.includes('Stopping retries')) throw err;
      console.warn(`Failed with model ${model}, trying next...`, err.message);
      lastError = err;
    }
  }

  // All models tried: distinguish rate-limit saturation from other failures.
  const totalTried = FALLBACK_MODELS.length;
  const unavailable = rateLimitedCount + notFoundCount;
  if (unavailable === totalTried || rateLimitedCount > 0) {
    throw new Error('ALL_MODELS_RATE_LIMITED');
  }
  throw lastError || new Error('All fallback models failed.');
}
