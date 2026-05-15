import { fetchOpenRouterWithFallback } from './openrouterHelper';

const apiKey = process.env.OPENROUTER_API_KEY;

export async function generateItinerary(body: any) {
  const { destination, planner, aiMode } = body;
  const days = planner?.days || 3;
  
  let generationContext = '';
  if (aiMode) {
    if (aiMode.mode === 'selected_day') {
      generationContext = `\n【重要指示】目前我們正在重新規劃「第 ${aiMode.selectedDay} 天」的行程。請產生 ${days} 天份的行程（這將會對應到那單獨的一天），並特別留意上下文。`;
    } else if (aiMode.mode === 'generate_for_selected_days') {
      generationContext = `\n【重要指示】目前我們正在重新規劃「第 ${aiMode.rangeStartDay} 天到第 ${aiMode.rangeEndDay} 天」的區間。請產生 ${days} 天份的行程，讓使用者能接續原本的旅途步調。`;
    } else if (aiMode.mode === 'overwrite_all') {
      generationContext = `\n【重要指示】我們將全局重新規劃整趟 ${days} 天的行程。`;
    }
  }
  
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
      transport_to_next?: string; // 預估前往下一個景點的交通時間與方式 (如：搭乘地鐵約 25 分鐘)
      lat: number; // 緯度(純數字的浮點數，例如 25.0339)，不可遺漏
      lng: number; // 經度(純數字的浮點數，例如 121.5644)，不可遺漏
      linkedFactId?: string; // 如果該行程節點明確對應到 [Travel facts anchors] 中的某個已知項目，請填寫其 ID
    }>;
  }>;
}
\`\`\`
【語言與格式要求】
1. **請一律使用「繁體中文 (Traditional Chinese)」**：無論景點在世界上哪個地方，請將景點名稱（name）、提醒（ai_note）、摘要等全部翻譯或轉寫為繁體中文（專有名詞可加上括號註記外文）。
2. **嚴格的 JSON 格式**：請務必且只能使用**標準雙引號 \`"\`** 來包覆 JSON 裡的屬性(Key)與字串值(Value)。字串內容若需要用到引號，請直接使用全形引號「」或是單引號，切勿使用會破壞 JSON 解析的不合法引號。
3. **嚴格的地理一致性 (Geographic Consistency)**：規劃出的所有景點 **必須嚴格位於指定的目的地（${destination}）內**。絕對禁止將其他國家或不相關地區的景點放入行程中（例如：如果目的地是日本，絕對不准放入韓國、泰國等其他國家的景點）。

【內容客製化要求】
若使用者未提供飲食禁忌，請忽略該限制；若為情侶，請安排浪漫景點。
根據旅伴類型、節奏偏好與興趣，客製化每日行程安排與景點選擇。如果節奏為「特種兵急行軍」，請增加每日景點數量並緊湊安排；如果是「悠閒漫遊」，請減少景點數量，拉長單一景點停留時間，並在 transport_to_next 中反映出適當的預估交通時間與交通方式。
請務必完整考慮「食、衣、住、行」四個面向：每日行程必須包含確切的住宿點（hotel）、合適的餐飲安排（food），以及與當地氣候或場合相關的服裝提醒或購物點（例如在 ai_note 中給予穿著建議以滿足「衣」的需求）。
請極度客製化，發揮創意，**不要給出制式的「抵達與放行李」、「在地必吃美食推薦」、「深度體驗行程」、「經典夜生活」這種通用名稱**，請務必給出真實的當地景點名稱或特色店家名稱，並依據使用者選取的 Travel Vibes 和 Interests 打造有靈魂的旅程。

Details: 
- Trip length: ${days} days
- Destination: ${destination}
- Departure: ${planner?.departureFrom || 'unknown'}
- Auto flight segments: ${planner?.autoFlightSegments?.join(' | ') || 'Not specified'}
- Travel facts anchors: ${planner?.travelFactsContext || 'Not specified'}
- Spots user likes: ${planner?.mustVisitSpots?.join(', ') || 'Not specified'}
- Companions: ${planner?.companions || 'Not specified'}
- Travel Vibes: ${planner?.vibes?.length ? planner.vibes.join(', ') : 'Not specified'}
- Interests: ${planner?.interests?.length ? planner.interests.join(', ') : 'Not specified'}
- Dietary Restrictions: ${planner?.dietary?.length ? planner.dietary.join(', ') : 'None'}
- Transport: ${planner?.transport?.length ? planner.transport.join(', ') : 'Not specified'}
- Budget Level: ${planner?.budget || 'Not specified'}
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
  currentDate?: string;
  currentTime: string;
  currentTitle: string;
  currentCategory?: string;
  notes?: string;
  preserveTimeWindow?: boolean;
  previousNode?: {
    time?: string;
    title?: string;
    category?: string;
  };
  nextNode?: {
    time?: string;
    title?: string;
    category?: string;
  };
  travelFactsContext?: string;
}): Promise<{
  time: string;
  title: string;
  emoji: string;
  category: string;
  ai_note: string;
  transport_to_next?: string;
  lat?: number;
  lng?: number;
  linkedFactId?: string;
} | null> {
  if (!apiKey) return null;

  const prompt = buildRegenerateSpotPrompt(params);

  try {
    const text = await fetchOpenRouterWithFallback(apiKey, prompt);
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      throw new Error('No JSON object found in AI response');
    }
    
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    if (parsed && typeof parsed.title === 'string') {
      return parsed;
    }
  } catch (err) {
    console.error('regenerateSpot failed', err);
  }

  return null;
}

export function buildRegenerateSpotPrompt(params: {
  destination: string;
  day: number;
  currentDate?: string;
  currentTime: string;
  currentTitle: string;
  currentCategory?: string;
  notes?: string;
  preserveTimeWindow?: boolean;
  previousNode?: {
    time?: string;
    title?: string;
    category?: string;
  };
  nextNode?: {
    time?: string;
    title?: string;
    category?: string;
  };
  travelFactsContext?: string;
}) {
  return `你是旅遊規劃 AI，請**只輸出一個 JSON 物件**（不要陣列、不要 markdown），替換使用者不滿意的景點。

被替換的景點：
- 目的地: ${params.destination}
- Day: ${params.day}
- 日期: ${params.currentDate || '未提供'}
- 時間: ${params.currentTime}
- 原景點名稱: ${params.currentTitle}
- 原分類: ${params.currentCategory || 'other'}
- 使用者備註: ${params.notes || '無'}
- 時間策略: ${params.preserveTimeWindow ? '盡量保留原本時間窗，不要打亂前後節點節奏' : '可微調時間'}
- 上一個節點: ${params.previousNode ? `${params.previousNode.time || '時間未定'} ${params.previousNode.title || '未提供'} (${params.previousNode.category || 'other'})` : '無'}
- 下一個節點: ${params.nextNode ? `${params.nextNode.time || '時間未定'} ${params.nextNode.title || '未提供'} (${params.nextNode.category || 'other'})` : '無'}

Travel Facts / Anchor：
${params.travelFactsContext || '無'}

請直接輸出一個 JSON 物件，欄位如下：
{
  "time": "HH:MM",
  "title": "景點名稱（在 ${params.destination} 附近、符合上下文的替代景點）",
  "emoji": "對應表情",
  "category": "landmark|food|shopping|nature|hotel|activity|nightlife|transport|other",
  "ai_note": "一句話的貼心提醒，說明為何適合替換",
  "transport_to_next": "預估前往下一個景點的交通時間與方式 (如：搭乘地鐵約 25 分鐘)（可選）",
  "intensity": "chill|balanced|hardcore",
  "lat": 緯度(純數字的浮點數，例如 25.0339)，不可遺漏,
  "lng": 經度(純數字的浮點數，例如 121.5644)，不可遺漏,
  "linkedFactId": "如果這明確綁定到某個 Travel Fact 可選填"
}

注意：
1. 若沒有充分理由，time 請維持 ${params.currentTime}。
2. 替換後請考量上下個節點的節奏、距離與旅程錨點。
3. **請一律使用繁體中文 (Traditional Chinese)** 填寫。
4. **嚴格的 JSON 格式**：請務必且只能使用**標準雙引號 \`"\`** 來包覆 JSON 裡的屬性(Key)與字串值(Value)。字串內容若需要用到引號，請直接使用全形引號「」或是單引號，切勿使用會破壞 JSON 解析的不合法引號。
5. **嚴格的地理一致性 (Geographic Consistency)**：規劃出的景點 **必須嚴格位於指定的目的地（${params.destination}）內**。絕對禁止將其他國家或不相關地區的景點放入行程中。
6. 請直接輸出 JSON，不要有任何多餘說明。`;
}
