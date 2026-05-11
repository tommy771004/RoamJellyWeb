// These models are free-tier on OpenRouter (tagged with :free suffix).
// List updated 2026-05-09 based on OpenRouter /api/v1/models (pricing.prompt === "0").
// Ordered by capability: gemini > deepseek > llama > qwen > mistral > others.
const FREE_MODELS = [
  // Google Gemma
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  // Meta LLaMA
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  // Hermes
  'nousresearch/hermes-3-llama-3.1-405b:free',
  // Mistral
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free'
];

// WARNING: These are PAID models on OpenRouter and will incur costs.
// They are only used as a last-resort fallback when ALLOW_PAID_FALLBACK=true.
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

      // API key is invalid or forbidden — no point retrying any model.
      if (response.status === 401 || response.status === 403) {
        throw new Error(`API key invalid or forbidden (${response.status}). Stopping retries.`);
      }

      // Rate limited — wait briefly before trying the next model.
      if (response.status === 429) {
        console.warn(`Rate limited on model ${model}, waiting before next...`);
        await sleep(500);
        lastError = new Error(`429 rate limited on ${model}`);
        continue;
      }

      // 5xx server errors — move to next model immediately.
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
      // Propagate auth failures immediately — no further models will help.
      if (err.message?.includes('Stopping retries')) throw err;
      console.warn(`Failed with model ${model}, trying next...`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All fallback models failed.');
}
