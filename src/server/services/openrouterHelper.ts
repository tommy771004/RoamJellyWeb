const FREE_MODELS = [
  'google/gemini-2.0-pro-exp-02-05:free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'google/gemini-2.0-flash-thinking-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1-distill-llama-70b:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  'mistralai/mistral-nemo:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'google/gemini-1.5-pro',
  'google/gemini-1.5-flash',
  'openai/gpt-4o-mini'
];

export async function fetchOpenRouterWithFallback(apiKey: string, prompt: string) {
  let lastError: Error | null = null;
  
  for (const model of FREE_MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API Error (${model}): ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      const text = data.choices[0]?.message?.content;
      
      if (text) {
        console.log(`Successfully generated content using model: ${model}`);
        return text;
      } else {
        throw new Error(`Model ${model} returned empty content`);
      }
    } catch (err: any) {
      console.warn(`Failed with model ${model}, trying next...`, err.message);
      lastError = err;
    }
  }
  
  throw lastError || new Error("All fallback models failed.");
}
