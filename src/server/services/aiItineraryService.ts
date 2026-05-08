import { fetchOpenRouterWithFallback } from './openrouterHelper';

const apiKey = process.env.OPENROUTER_API_KEY;

export async function generateItinerary(body: any) {
  const { destination, planner } = body;
  const days = planner?.days || 3;
  
  if (!apiKey) {
    // Artificial delay for fallback
    await new Promise(r => setTimeout(r, 2000));
    return [
      { day: 1, time: '10:00', title: `Arrival at ${destination}`, category: 'flight', emoji: '✈️' },
      { day: 1, time: '12:00', title: 'Hotel Check-in', category: 'hotel', emoji: '🏨' },
      { day: 1, time: '13:30', title: 'Local Lunch', category: 'food', emoji: '🍜' },
      { day: 1, time: '15:00', title: 'City Center Walk', category: 'landmark', emoji: '🏯' },
      { day: 2, time: '09:00', title: 'Morning Market', category: 'food', emoji: '🍱' },
      { day: 2, time: '11:00', title: 'Main Attraction', category: 'landmark', emoji: '📸' },
    ];
  }

  const detailedPrompt = `你是一個精通 UI 參數與旅遊規劃的 AI。請讀取使用者的偏好，並**強制**回傳符合以下 TypeScript 介面的 JSON，不准帶有 markdown 標記：
\`\`\`typescript
interface AiResponse {
  ui_config: {
    bg_gradient: string; // Tailwind class, 例: "from-amber-100 to-orange-50" (若是帶長輩)
    font_scale: "normal" | "large"; // 若有長輩，設為 large
    hero_image_keyword: string; // 用於 Unsplash API 抓圖的關鍵字
  };
  summary: {
    title: string;
    smart_tags: string[]; // 例: ["步調極慢", "素食友善"]
  };
  itinerary: Array<{
    day: number;
    spots: Array<{
      time: string; // 24-hour HH:MM
      name: string;
      emoji: string;
      category: string; // flight, transport, landmark, food, shopping, nature, hotel, activity, nightlife, other
      intensity: "chill" | "moderate" | "hardcore"; // 體力消耗指標
      ai_note: string; // 根據使用者偏好的客製化提醒
      lat?: number; // Approximate latitude of the spot
      lng?: number; // Approximate longitude of the spot
    }>;
  }>;
}
\`\`\`
若使用者未提供飲食禁忌，請忽略該限制；若為情侶，請安排浪漫景點。

Details: 
- Trip length: ${days} days
- Destination: ${destination}
- Departure: ${planner?.departureFrom || 'unknown'}
- Auto flight segments: ${planner?.autoFlightSegments?.join(' | ') || 'Not specified'}
- Travel facts anchors: ${planner?.travelFactsContext || 'Not specified'}
- Spots user likes: ${planner?.mustVisitSpots?.join(', ') || 'Not specified'}
- Extra notes: ${planner?.notes || 'None'}

注意：請直接輸出 JSON，不要有任何多餘的解釋文字或 markdown \`\`\` 包裝。
`;

  try {
    let text = '';
    
    // We strictly use OpenRouter apiKey per user request "拿掉gemini api 僅用 openrouter api"
    if (apiKey) {
      text = await fetchOpenRouterWithFallback(apiKey, detailedPrompt);
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error('No JSON object found in output');
    }
    
    const parsed = JSON.parse(match[0]);
    if (parsed && typeof parsed === 'object') {
      return parsed; // Return the whole AiResponse
    }
  } catch (err) {
    console.error('Failed to generate AI itinerary', err);
  }

  return [
    { day: 1, time: '10:00', title: `系統繁忙: 這是一筆備用資料`, category: 'other', emoji: '📍' },
  ];
}

/**
 * Spot-level regeneration: replaces a single itinerary node with a fresh AI suggestion.
 * Returns a single spot object compatible with ItineraryNode.
 */
export async function regenerateSpot(params: {
  destination: string;
  day: number;
  currentTime: string;
  currentTitle: string;
  notes?: string;
}): Promise<{
  time: string;
  title: string;
  emoji: string;
  category: string;
  ai_note: string;
  lat?: number;
  lng?: number;
} | null> {
  if (!apiKey) return null;

  const prompt = `你是旅遊規劃 AI，請**只輸出一個 JSON 物件**（不要陣列、不要 markdown），替換使用者不滿意的景點。

被替換的景點：
- 目的地: ${params.destination}
- Day: ${params.day}
- 時間: ${params.currentTime}
- 原景點名稱: ${params.currentTitle}
- 使用者備註: ${params.notes || '無'}

請直接輸出一個 JSON 物件，欄位如下：
{
  "time": "HH:MM",
  "title": "景點名稱（在 ${params.destination} 附近的替代景點）",
  "emoji": "對應表情",
  "category": "landmark|food|shopping|nature|hotel|activity|nightlife|transport|other",
  "ai_note": "一句話的貼心提醒",
  "lat": 緯度數字（可選）,
  "lng": 經度數字（可選）
}

注意：請直接輸出 JSON，不要有任何多餘說明。`;

  try {
    const text = await fetchOpenRouterWithFallback(apiKey, prompt);
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('No JSON found');
    const parsed = JSON.parse(match[0]);
    if (parsed && typeof parsed.title === 'string') {
      return parsed;
    }
  } catch (err) {
    console.error('regenerateSpot failed', err);
  }

  return null;
}
