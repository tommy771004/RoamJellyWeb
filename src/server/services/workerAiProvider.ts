import { fetchOpenRouterWithFallback } from './openrouterHelper';
import { robustJSONParse } from './aiItineraryService';
import { ChatGPTWebProvider } from './chatgptWebProvider';

type FallbackTextGenerator = (prompt: string) => Promise<string>;

export function assertItineraryPayload(text: string): void {
  if (!text?.trim()) throw new Error('AI_EMPTY_RESPONSE');
  if (!/[\[{]/.test(text)) throw new Error('AI_RESPONSE_SCHEMA_INVALID');

  let parsed: any;
  try {
    parsed = robustJSONParse(text, false);
  } catch {
    throw new Error('AI_RESPONSE_SCHEMA_INVALID');
  }
  const days = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray(parsed.itinerary)
      ? parsed.itinerary
      : null;
  const valid = Array.isArray(days)
    && days.length > 0
    && days.every((day) => Array.isArray(day?.spots));

  if (!valid || !days.some((day) => day.spots.length > 0)) {
    throw new Error('AI_RESPONSE_SCHEMA_INVALID');
  }
}

export class WorkerAiProvider {
  private fallbackUsed = false;
  private readonly primaryErrors: string[] = [];

  constructor(
    private readonly chatgpt: ChatGPTWebProvider,
    private readonly fallbackTextGenerator?: FallbackTextGenerator,
  ) {}

  get stats() {
    return {
      fallbackUsed: this.fallbackUsed,
      primaryError: this.primaryErrors.length > 0
        ? [...new Set(this.primaryErrors)].join(' | ').slice(0, 4000)
        : null,
      provider: this.fallbackUsed ? 'chatgpt-web+openrouter' : 'chatgpt-web',
    };
  }

  async generate(prompt: string): Promise<string> {
    if (!this.fallbackUsed) {
      try {
        const text = await this.chatgpt.generate(prompt);
        assertItineraryPayload(text);
        return text;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.fallbackUsed = true;
        this.primaryErrors.push(message);
        console.warn(`[AI Worker] ChatGPT Web primary unavailable (${message}); evaluating OpenRouter fallback.`);
      }
    }

    const text = this.fallbackTextGenerator
      ? await this.fallbackTextGenerator(prompt)
      : await this.generateWithOpenRouter(prompt);
    assertItineraryPayload(text);
    return text;
  }

  private async generateWithOpenRouter(prompt: string): Promise<string> {
    if (process.env.ALLOW_PAID_FALLBACK?.trim().toLowerCase() !== 'true') {
      throw new Error('PAID_AI_FALLBACK_DISABLED');
    }
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) throw new Error('ALL_AI_PROVIDERS_UNAVAILABLE');
    return fetchOpenRouterWithFallback(apiKey, prompt);
  }

  async close(): Promise<void> {
    await this.chatgpt.close();
  }
}
