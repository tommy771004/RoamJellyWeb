import { fetchOpenRouterWithFallback } from './openrouterHelper';

const apiKey = process.env.OPENROUTER_API_KEY;

export async function generatePackingList(destination: string, days: number, weatherContext: string) {
  if (!apiKey) {
    // Fallback if no API key
    return [
      { id: '1', text: `Passports & ID for ${destination}`, checked: false },
      { id: '2', text: `Clothes for ${days} days`, checked: false },
      { id: '3', text: weatherContext ? `Gear for ${weatherContext}` : 'Umbrella / Sunglasses', checked: false },
      { id: '4', text: 'Toiletries & Meds', checked: false },
      { id: '5', text: 'Chargers & Adapters', checked: false },
      { id: '6', text: 'Travel Pillow & Earplugs', checked: false },
    ];
  }

  try {
    const prompt = `You are an expert travel planner. The user is going to ${destination} for ${days} days. Expected weather/context: ${weatherContext}.
Please generate a realistic, essential packing list with exactly 6 key categories/items.
Output ONLY a raw JSON array of strings. No markdown, no formatting, just the array.
Example: ["Passports & ID", "Light Jackets", "Adapter & Cables", "Toiletries", "Comfortable Shoes", "Swimwear"]`;

    const text = await fetchOpenRouterWithFallback(apiKey, prompt);
    
    // try to parse JSON
    try {
      const match = text.match(/\[.*\]/s);
      const jsonStr = match ? match[0] : text;
      const items = JSON.parse(jsonStr) as string[];
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item, idx) => ({ id: `ai-${idx}`, text: item, checked: false }));
      }
    } catch (e) {
      console.error('Failed to parse AI packing list', e, text);
    }
  } catch (err) {
    console.error('OpenRouter API Error:', err);
  }

  return [
    { id: '1', text: `Passports & ID for ${destination}`, checked: false },
    { id: '2', text: `Clothes for ${days} days`, checked: false },
    { id: '3', text: 'Essential Toiletries', checked: false },
  ];
}
