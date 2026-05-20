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
    const systemPrompt = `You are an expert travel planner. Please generate a realistic, essential packing list with exactly 6 key categories/items.
Output ONLY a raw JSON array of strings. No markdown, no formatting, just the array.
Example: ["Passports & ID", "Light Jackets", "Adapter & Cables", "Toiletries", "Comfortable Shoes", "Swimwear"]`;

    const userPrompt = `The user is going to ${destination} for ${days} days. Expected weather/context: ${weatherContext}.`;

    const text = await fetchOpenRouterWithFallback(apiKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);
    
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

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  text: string;
  suggestedType: 'flights' | 'packing-list' | 'activities' | 'none';
  flights?: Array<{
    provider: string;
    time: string;
    price: number;
    from: string;
    to: string;
    stops: number;
  }>;
  packingList?: string[];
  activities?: Array<{
    title: string;
    time?: string;
    description: string;
    category?: string;
  }>;
}

export async function generateChatResponse(
  userQuery: string,
  history: ChatHistoryMessage[],
  context?: { activeDestination?: string; activeDays?: number }
): Promise<ChatResponse> {
  const normalizedQuery = userQuery.toLowerCase().trim();

  // Low key keyword matching for high-fidelity fallback if OpenRouter is rate-limited or API key is absent
  const hasFlightsKeyword = normalizedQuery.includes('flight') || normalizedQuery.includes('航班') || normalizedQuery.includes('機票') || normalizedQuery.includes('飛機');
  const hasPackingKeyword = normalizedQuery.includes('pack') || normalizedQuery.includes('行李') || normalizedQuery.includes('帶什麼') || normalizedQuery.includes('準備');
  const hasTaipeiRainyKeyword = (normalizedQuery.includes('taipei') || normalizedQuery.includes('台北')) && (normalizedQuery.includes('rain') || normalizedQuery.includes('下雨') || normalizedQuery.includes('雨天'));
  const hasTaipeiKeyword = normalizedQuery.includes('taipei') || normalizedQuery.includes('台北');

  const defaultDestination = context?.activeDestination || '台北';

  // Real API Call
  if (apiKey) {
    try {
      const systemPrompt = `You are "Jelly AI 行程顧問", a delightful, knowledgeable, and highly helpful AI Travel Assistant.
The user is planning a trip. Context: Current active destination is "${defaultDestination}" (${context?.activeDays ? `${context.activeDays} days` : 'undefined days'}).

Your task is to answer the user's latest query.
Please return a valid JSON object matching the following TypeScript schema:
{
  "text": "friendly natural language explanation in Traditional Chinese (台湾正體中文)",
  "suggestedType": "flights" | "packing-list" | "activities" | "none",
  "flights": [ // fill ONLY if suggestedType is "flights"
    {
      "provider": "Airline name (e.g., 星宇航空, 長榮航空)",
      "time": "24h format duration e.g., 08:30 - 12:45",
      "price": number (in TWD),
      "from": "Origin airport code (TPE, TSA, etc)",
      "to": "Destination airport code (NRT, HND, KIX, etc)",
      "stops": number (0 for direct)
    }
  ],
  "packingList": [ // fill ONLY if suggestedType is "packing-list"
    "Item name and quick quantitatives"
  ],
  "activities": [ // fill ONLY if suggestedType is "activities"
    {
      "title": "Attractive place name or activity",
      "time": "Suggested time slot (e.g., Morning, 14:00, etc)",
      "description": "Short, engaging travel review comment in Traditional Chinese",
      "category": "landmark" | "food" | "shopping" | "nature" | "activity"
    }
  ]
}

Ensure:
- Focus on Taiwanese travelers' preference (use TWD currency, Traditional Chinese).
- If the user asks about Taipei rainy days, suggest indoor activities like museums, cafes, thermal hot springs, or record shops.
- Keep the natural text friendly, concise, and helpful.
- Return ONLY the JSON object, absolutely no markdown formatting, backticks, or other text outside of the JSON block. Let the opening curly brace be the first character.`;

      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt }
      ];

      for (const msg of history) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }

      messages.push({ role: 'user', content: userQuery });

      const text = await fetchOpenRouterWithFallback(apiKey, messages);

      try {
        const match = text.match(/\{[\s\S]*\}/);
        const jsonStr = match ? match[0] : text;
        const parsed = JSON.parse(jsonStr) as ChatResponse;
        if (parsed && typeof parsed.text === 'string') {
          return parsed;
        }
      } catch (jsonErr) {
        console.error('Failed to parse structured JSON from chat, falling back to unstructured parser', jsonErr, text);
        return {
          text: text.replace(/```json|```/g, '').trim(),
          suggestedType: 'none',
        };
      }
    } catch (apiErr) {
      console.error('API execution failed in generateChatResponse, triggering mock system fallback', apiErr);
    }
  }

  // --- MOCK FALLBACKS (Guarantees elegant immediate answers even offline or rate limit) ---
  if (hasFlightsKeyword) {
    const targetDest = normalizedQuery.includes('tokyo') || normalizedQuery.includes('東京') ? 'NRT' : 'TPE';
    return {
      text: `為您搜尋到前往台北/東京的推薦航班比價：我們推薦選用直飛舒適航班，星宇航空與長榮航空近期評分極佳，您可以點擊下方機票卡片查看與追蹤比價！`,
      suggestedType: 'flights',
      flights: [
        { provider: '星宇航空 STARLUX', time: '08:30 - 12:45', price: 11200, from: 'TPE', to: targetDest === 'TPE' ? 'NRT' : 'TPE', stops: 0 },
        { provider: '長榮航空 EVA Air', time: '13:15 - 17:30', price: 12800, from: 'TPE', to: targetDest === 'TPE' ? 'NRT' : 'TPE', stops: 0 },
        { provider: '中華航空 China Airlines', time: '16:00 - 20:15', price: 11950, from: 'TPE', to: targetDest === 'TPE' ? 'NRT' : 'TPE', stops: 0 }
      ]
    };
  }

  if (hasPackingKeyword) {
    return {
      text: `根據您的需求，我整理了一份極簡而出色的 **${defaultDestination} 行李打包清單**。您可以直接對照整理，別忘了隨身重要證件喔！`,
      suggestedType: 'packing-list',
      packingList: [
        '護照與機票 (電子檔也備份一份)',
        '萬用轉接頭與多孔快充座',
        '適合當地氣候的衣物及多層次防風外套',
        '個人常備藥物、維他命與簡單創可貼',
        '超薄行動電源 (回航需隨身攜帶)',
        '環保折疊雨傘 (隨身晴雨兩用)'
      ]
    };
  }

  if (hasTaipeiRainyKeyword) {
    return {
      text: `台北下雨別擔心！台北擁有頂級的文創室內空間、百年北投溫泉、與豐富的咖啡館文化。以下是我為您規劃的**雨天台北推薦私房散策**，讓您雨天依然玩得優雅又充實：`,
      suggestedType: 'activities',
      activities: [
        { title: '國立故宮博物院', time: '09:30 - 12:30', description: '世界頂級的中華文物收藏館，室內空間寬敞，非常適合在雨天靜靜欣賞歷史的溫度。', category: 'landmark' },
        { title: '北投老爺酒店大眾湯 / 日勝生加賀屋', time: '14:00 - 16:30', description: '搭乘捷運至新北投站，在淅淅瀝瀝的雨聲中，沐浴在硫磺溫泉中享受最極致的療癒。', category: 'activity' },
        { title: '青田街日式老屋與文青咖啡館', time: '17:00 - 18:30', description: '拜訪青田茶館或學校咖啡館，在綠意環繞的日式宿舍中點一杯暖心茶飲聽雨。', category: 'food' },
        { title: '誠品生活南西店 & 中山地下街', time: '19:00 - 21:30', description: '中山站一帶最棒的室內購物空間，從文創設計商品、精品書店到下午茶甜點一應俱全。', category: 'shopping' }
      ]
    };
  }

  if (hasTaipeiKeyword) {
    return {
      text: `台北是一座完美融合傳統廟宇文化與現代極致摩天大樓的魅力都市！推薦必玩景點像是信義區的台北101、文青齊聚的華山/松菸文創園區，以及美食天堂饒河街與士林夜市。以下是精選的台北一日推薦：`,
      suggestedType: 'activities',
      activities: [
        { title: '華山1914文化創意產業園區', time: '10:00 - 12:30', description: '由百年酒廠改建而成的文創園區，有當期展覽、獨立書店，及許多極具特色的設計小店。', category: 'landmark' },
        { title: '台北 101 觀景台', time: '14:00 - 16:00', description: '搭乘金氏紀錄超高速電梯登上 89 樓，俯瞰整座大台北盆地的壯麗風光。', category: 'activity' },
        { title: '永康街芒果冰與小籠包', time: '16:30 - 18:00', description: '走訪鼎泰豐與永康牛肉麵，用經典的台灣味道滿足味蕾。', category: 'food' },
        { title: '信義商圈 / 象山夕陽步道', time: '18:30 - 20:30', description: '象山步道拾級而上，僅需 20 分鐘即可捕捉台北 101 最美的落日與燦爛夜景。', category: 'nature' }
      ]
    };
  }

  return {
    text: `哈囉！我是您的行程果凍顧問 🍮！我可以幫您：
1. **機票航班比價**（可以輸入「幫我找飛機、航班機票」）
2. **行李打包清單**（可以輸入「行李該帶什麼、打包」）
3. **客製化景點活動**（可以輸入「台北雨天行程、Taipei attractions」）

今天想要聊聊哪一站的旅程呢？`,
    suggestedType: 'none',
  };
}
