// These models are free-tier on OpenRouter (tagged with :free suffix).
// List updated 2026-05-09 based on OpenRouter /api/v1/models (pricing.prompt === "0").
// Ordered by capability: gemini > deepseek > llama > qwen > mistral > others.
const FREE_MODELS = [
  // Google Gemini
  'google/gemini-2.5-pro-exp-03-25:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash-thinking-exp:free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'google/gemini-2.0-pro-exp-02-05:free',
  'google/gemini-exp-1206:free',
  // DeepSeek
  'deepseek/deepseek-r1:free',
  'deepseek/deepseek-r1-distill-llama-70b:free',
  'deepseek/deepseek-r1-zero:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-v3-base:free',
  // Meta LLaMA
  'meta-llama/llama-4-scout:free',
  'meta-llama/llama-4-maverick:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  // Qwen
  'qwen/qwen3-235b-a22b:free',
  'qwen/qwen3-30b-a3b:free',
  'qwen/qwen3-14b:free',
  'qwen/qwen3-8b:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  // Mistral
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'mistralai/mistral-nemo:free',
  // Microsoft
  'microsoft/phi-4:free',
  'microsoft/phi-3-medium-128k-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  // Others
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'huggingfaceh4/zephyr-7b-beta:free',
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
