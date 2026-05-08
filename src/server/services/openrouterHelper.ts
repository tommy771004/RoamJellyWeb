const FREE_MODELS = [
  'google/gemini-2.5-flash:free',
  'google/gemini-2.5-pro:free',
  'google/gemini-1.5-pro:free',
  'google/gemini-1.5-flash:free',
  'deepseek/deepseek-chat:free',
  'meta-llama/llama-3-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free'
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
