// Free-tier models sourced from https://openrouter.ai/api/v1/models (pricing.prompt === "0").
// Last synced 2026-05-11. Ordered by expected capability for Chinese travel JSON generation.
// Excluded: audio (lyria), OCR (qianfan-ocr), internal (openrouter/owl-alpha, openrouter/free), code-only (poolside/*), unknown (inclusionai/ring).
const FREE_MODELS = [
  // Large / high-capability
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  // Mid-tier — confirmed present
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'z-ai/glm-4.5-air:free',
  'qwen/qwen3-coder:free',
  'minimax/minimax-m2.5:free',
  // Small — confirmed present
  'meta-llama/llama-3.2-3b-instruct:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
  // Tiny — last resort
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

export async function fetchOpenRouterWithFallback(apiKey: string, prompt: string) {
  let lastError: Error | null = null;
  let rateLimitedCount = 0;
  let notFoundCount = 0;

  for (const model of FALLBACK_MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://roamjelly.app',
          'X-Title': 'RoamJelly'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000
        })
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
