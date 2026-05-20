import { fetchOpenRouterWithFallback } from "./openrouterHelper";

const apiKey = process.env.OPENROUTER_API_KEY;

// ─── Chunk size for parallel itinerary generation ────────────────────────────
const CHUNK_SIZE = 3; // days per parallel AI call

// ─── External API Helpers (Hybrid Architecture) ──────────────────────────────

/**
 * Geocode a spot name.
 * Primary: Photon (Komoot) — OSM-based, no strict per-second rate limit.
 * Fallback: Nominatim — only used if Photon fails (1 req/s policy applies).
 */
async function geocodeSpot(
  name: string,
  city: string
): Promise<{ lat: number; lng: number } | null> {
  // ── Photon (primary) ──────────────────────────────────────────────────────
  try {
    const q = encodeURIComponent(`${name} ${city}`);
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${q}&limit=1`,
      { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data: any = await res.json();
      const coords = data.features?.[0]?.geometry?.coordinates; // [lng, lat]
      if (coords?.length === 2) return { lat: coords[1], lng: coords[0] };
    }
  } catch { /* fall through to Nominatim */ }

  // ── Nominatim (fallback) ──────────────────────────────────────────────────
  try {
    const q = encodeURIComponent(`${name} ${city}`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=ja,zh`,
      { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data: any[] = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* swallow */ }

  return null;
}

/** Fetch a Wikipedia thumbnail for a spot name. Returns null on failure. */
async function getWikiThumbnail(name: string): Promise<string | null> {
  const isChinese = /[\u4e00-\u9fa5]/.test(name);
  const langs = isChinese ? ["zh", "en"] : ["en", "zh"];
  for (const lang of langs) {
    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
        { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data: any = await res.json();
        if (data.thumbnail?.source) return data.thumbnail.source;
      }
    } catch {
      /* try next language */
    }
  }
  return null;
}

/**
 * Compute route duration (minutes) via OSRM.
 * mode: 'driving' | 'walking' | 'cycling'
 * Auto-selects walking when distance between two points is short (<3 km).
 */
async function getOSRMMinutes(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): Promise<{ minutes: number; mode: "driving" | "walking" } | null> {
  // Haversine approximation to pick mode
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const mode: "driving" | "walking" = distKm < 2.5 ? "walking" : "driving";

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/${mode}/${lng1},${lat1};${lng2},${lat2}?overview=false`,
      { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data.routes?.length > 0)
      return { minutes: Math.round(data.routes[0].duration / 60), mode };
  } catch { /* swallow */ }
  return null;
}

/**
 * Enrich itinerary spots after AI generation:
 *  1. Geocode (Photon → Nominatim fallback) + Wikipedia thumbnail — parallel across all days
 *  2. OSRM transport_to_next — days run in parallel; spots within a day are sequential
 *     Auto-selects walking vs driving based on inter-spot distance.
 */
async function enrichItinerary(parsed: any, destination: string): Promise<any> {
  if (!parsed?.itinerary || !Array.isArray(parsed.itinerary)) return parsed;

  // Step 1: Geocode + wiki thumbnail — all days in parallel, all spots within day in parallel
  const enrichedDays = await Promise.all(
    parsed.itinerary.map(async (dayData: any) => {
      if (!Array.isArray(dayData.spots)) return dayData;
      const enrichedSpots = await Promise.all(
        dayData.spots.map(async (spot: any) => {
          const name: string = spot.name || spot.title || "";
          const [coords, thumbnail] = await Promise.all([
            geocodeSpot(name, destination),
            getWikiThumbnail(name),
          ]);
          return {
            ...spot,
            lat: coords?.lat ?? spot.lat,
            lng: coords?.lng ?? spot.lng,
            image_url: spot.image_url || thumbnail || undefined,
          };
        })
      );
      return { ...dayData, spots: enrichedSpots };
    })
  );

  // Step 2: OSRM transport_to_next — days run in parallel; spots within a day are sequential
  const finalDays = await Promise.all(
    enrichedDays.map(async (dayData: any) => {
      if (!Array.isArray(dayData.spots)) return dayData;
      const spots = [...dayData.spots];
      for (let si = 0; si < spots.length - 1; si++) {
        const curr = spots[si];
        const next = spots[si + 1];
        if (curr?.lat != null && curr?.lng != null && next?.lat != null && next?.lng != null) {
          const result = await getOSRMMinutes(curr.lng, curr.lat, next.lng, next.lat);
          if (result !== null) {
            const label = result.mode === "walking"
              ? `步行約 ${result.minutes} 分鐘`
              : `車程約 ${result.minutes} 分鐘`;
            spots[si] = { ...curr, transport_to_next: label };
          }
        }
      }
      return { ...dayData, spots };
    })
  );

  return { ...parsed, itinerary: finalDays };
}

// ─── Weather Forecast Helper ─────────────────────────────────────────────────

const WMO_LABEL: Record<number, string> = {
  0: "晴天", 1: "大致晴朗", 2: "局部多雲", 3: "陰天",
  45: "有霧", 48: "霧凇",
  51: "毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨",
  71: "小雪", 73: "中雪", 75: "大雪",
  80: "陣雨", 81: "中陣雨", 82: "強陣雨",
  95: "雷雨", 96: "強雷雨",
};

/**
 * Fetch daily weather forecast for the destination from Open-Meteo.
 * Returns a short human-readable string for injection into the AI prompt,
 * or an empty string if unavailable (non-blocking).
 */
async function fetchWeatherContext(
  destination: string,
  startDate: string | null | undefined,
  days: number
): Promise<string> {
  try {
    // Step 1: geocode destination (Photon)
    const geoQ = encodeURIComponent(destination);
    const geoRes = await fetch(
      `https://photon.komoot.io/api/?q=${geoQ}&limit=1`,
      { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(4000) }
    );
    if (!geoRes.ok) return "";
    const geoData: any = await geoRes.json();
    const coords = geoData.features?.[0]?.geometry?.coordinates; // [lng, lat]
    if (!coords?.length) return "";
    const [lng, lat] = coords;

    // Step 2: fetch forecast from Open-Meteo
    const forecastDays = Math.min(days, 14);
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
      `&timezone=auto&forecast_days=${forecastDays}`;
    const wxRes = await fetch(url, {
      headers: { "User-Agent": "RoamJellyApp/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!wxRes.ok) return "";
    const wx: any = await wxRes.json();

    const times: string[] = wx.daily?.time || [];
    const maxTemps: number[] = wx.daily?.temperature_2m_max || [];
    const minTemps: number[] = wx.daily?.temperature_2m_min || [];
    const rainProbs: number[] = wx.daily?.precipitation_probability_max || [];
    const codes: number[] = wx.daily?.weather_code || [];

    // Align forecast days to startDate if provided
    let startIdx = 0;
    if (startDate && times.length > 0) {
      const target = startDate.slice(0, 10);
      const found = times.findIndex((t: string) => t === target);
      if (found !== -1) startIdx = found;
    }

    const lines: string[] = [];
    for (let i = 0; i < days && startIdx + i < times.length; i++) {
      const idx = startIdx + i;
      const label = WMO_LABEL[codes[idx]] ?? "未知天氣";
      const rain = rainProbs[idx] != null ? `降雨機率 ${rainProbs[idx]}%` : "";
      lines.push(
        `Day ${i + 1} (${times[idx]}): ${label}, ` +
          `${Math.round(minTemps[idx])}°C–${Math.round(maxTemps[idx])}°C${rain ? ", " + rain : ""}`
      );
    }

    return lines.length > 0
      ? `【出發地天氣預報（供規劃參考）】\n${lines.join("\n")}`
      : "";
  } catch {
    return "";
  }
}

// ─── Prompt builder (no lat/lng/image_url in schema) ─────────────────────────

/**
 * Build the AI prompt for a chunk of days.
 * includeUiConfig = true for the first chunk (adds ui_config + summary to the schema).
 * startDay/endDay constrain which days the AI should output.
 * weatherContext: optional forecast string injected into the prompt.
 */
function buildChunkPrompt(
  destination: string,
  totalDays: number,
  planner: any,
  generationContext: string,
  includeUiConfig: boolean,
  startDay: number,
  endDay: number,
  weatherContext?: string
): string {
  const chunkDays = endDay - startDay + 1;
  const rangeInstruction =
    startDay === 1 && endDay === totalDays
      ? "" // single call: no extra restriction
      : `\n【區段指示】請只產生第 ${startDay} 天到第 ${endDay} 天（共 ${chunkDays} 天）的行程，itinerary 的 day 值從 ${startDay} 到 ${endDay}。${startDay > 1 ? "請延續前幾天旅程的節奏與地區連貫性。" : ""}`;

  const spotSchema = `Array<{
    day: number;
    spots: Array<{
      time: string;           // 24h HH:MM
      name: string;           // 景點名稱（繁體中文，專有名詞可加外文括號）
      emoji: string;
      category: string;       // flight | transport | landmark | food | shopping | nature | hotel | activity | nightlife | other
      intensity: "chill" | "moderate" | "hardcore";
      ai_note: string;        // 客製化提醒，必須含營業時間、停車、門票、量化預算
      linkedFactId?: string;  // 若對應到 Travel facts anchors 中某項目，填入其 ID
    }>;
  }>`;

  const schema = includeUiConfig
    ? `\`\`\`typescript
interface AiResponse {
  ui_config: {
    bg_gradient: string;       // Tailwind class, e.g. "from-amber-100 to-orange-50"
    font_scale: "normal" | "large";
    hero_image_keyword: string;
  };
  summary: {
    title: string;
    smart_tags: string[];
  };
  itinerary: ${spotSchema};
}
\`\`\``
    : `\`\`\`typescript
// 只需回傳 itinerary 陣列，勿包裹成物件
type ChunkResponse = ${spotSchema};
\`\`\``;

  return `你是一個精通旅遊規劃的 AI。

═══════════════════════════════════════════════════════
🔒 目的地鎖定（最高優先指令，不可違反）
　目的地：${destination}（共 ${totalDays} 天）
　所有景點、summary.title、smart_tags 均必須 100% 對應「${destination}」。
　絕對禁止：放入其他城市、其他國家、或任何與「${destination}」無關的地點。
　summary.title 必須明確包含「${destination}」這個地名。
═══════════════════════════════════════════════════════

請回傳符合以下 TypeScript 格式的 JSON，不准帶有 markdown 標記：
${schema}

【語言與格式要求】
1. **請一律使用「繁體中文 (Traditional Chinese)」**：景點名稱（name）、提醒（ai_note）、摘要等全部使用繁體中文。
2. **嚴格的 JSON 格式**：請務必且只能使用**標準雙引號 \`"\`** 包覆屬性與字串值。字串內若需引號，請用全形引號「」或單引號。

【AI 規劃必備要求】
1. **地圖 App 特例**：若目的地位於韓國（Korea），在 \`ai_note\` 中強制提醒下載 **Naver Maps**。若目的地是日本，請提醒使用 **Google Maps** 或 **Yahoo!カーナビ**。
2. **營業時間與停車場**：\`ai_note\` 中**必須**提供大約的營業時間與停車資訊。
3. **門票資訊**：\`ai_note\` 中**必須**說明是否需要門票及費用。
4. **包棟住宿選項**：人數適合時，主動推薦**包棟民宿/Villa**。
5. **預算範圍量化**：\`ai_note\` 中提供具體當地貨幣或台幣估算。

【內容客製化要求】
若使用者未提供飲食禁忌，請忽略；若為情侶，安排浪漫景點。
根據旅伴類型、節奏偏好與興趣客製化行程。
不要給出制式通用名稱，請給出真實景點與店家名稱。
請完整考慮「食、衣、住、行」四個面向。

Details:
- Destination（目的地，不可更改）: ${destination}
- Trip length: ${totalDays} days
- Departure: ${planner?.departureFrom || "unknown"}
- Auto flight segments: ${planner?.autoFlightSegments?.join(" | ") || "Not specified"}
- Travel facts anchors: ${planner?.travelFactsContext || "Not specified"}
- Spots user likes: ${planner?.mustVisitSpots?.join(", ") || "Not specified"}
- Companions: ${planner?.companions || "Not specified"}
- Travel Vibes: ${planner?.vibes?.length ? planner.vibes.join(", ") : "Not specified"}
- Interests: ${planner?.interests?.length ? planner.interests.join(", ") : "Not specified"}
- Dietary Restrictions: ${planner?.dietary?.length ? planner.dietary.join(", ") : "None"}
- Transport: ${planner?.transport?.length ? planner.transport.join(", ") : "Not specified"}
- Budget Level: ${planner?.budget || "Not specified"}
- Extra notes: ${planner?.notes || "None"}
${weatherContext ? "\n" + weatherContext : ""}
${generationContext}${rangeInstruction}

最終提醒：所有輸出內容（包含 summary.title）都必須是「${destination}」的行程，請直接輸出 JSON，不要任何多餘文字或 markdown 包裝。`;
}

/** Parse the raw text from a chunk AI call into a structured object/array. */
function parseChunkText(text: string, isFirst: boolean): any {
  if (isFirst) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object in first chunk response");
    return JSON.parse(match[0]);
  }
  // Subsequent chunks: prefer array, fall back to object with itinerary key
  const arrIdx = text.indexOf("[");
  const objIdx = text.indexOf("{");
  if (arrIdx !== -1 && (objIdx === -1 || arrIdx < objIdx)) {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const obj = JSON.parse(objMatch[0]);
    return Array.isArray(obj.itinerary) ? obj.itinerary : [obj];
  }
  throw new Error("No JSON found in chunk response");
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateItinerary(body: any) {
  const { destination, planner, aiMode } = body;
  const days = planner?.days || 3;

  let generationContext = "";
  if (aiMode) {
    if (aiMode.mode === "selected_day") {
      generationContext = `\n【重要指示】目前我們正在重新規劃「第 ${aiMode.selectedDay} 天」的行程。請產生 ${days} 天份的行程（這將會對應到那單獨的一天），並特別留意上下文。`;
    } else if (aiMode.mode === "generate_for_selected_days") {
      generationContext = `\n【重要指示】目前我們正在重新規劃「第 ${aiMode.rangeStartDay} 天到第 ${aiMode.rangeEndDay} 天」的區間。請產生 ${days} 天份的行程，讓使用者能接續原本的旅途步調。`;
    } else if (aiMode.mode === "overwrite_all") {
      generationContext = `\n【重要指示】我們將全局重新規劃整趟 ${days} 天的行程。`;
    }
  }

  if (!apiKey) {
    // Artificial delay for fallback
    await new Promise((r) => setTimeout(r, 2000));
    return [
      { day: 1, time: "10:00", title: `Arrival at ${destination}`, category: "flight", emoji: "✈️" },
      { day: 1, time: "12:00", title: "Hotel Check-in", category: "hotel", emoji: "🏨" },
      { day: 1, time: "13:30", title: "Local Lunch", category: "food", emoji: "🍜" },
      { day: 1, time: "15:00", title: "City Center Walk", category: "landmark", emoji: "🏯" },
      { day: 2, time: "09:00", title: "Morning Market", category: "food", emoji: "🍱" },
      { day: 2, time: "11:00", title: "Main Attraction", category: "landmark", emoji: "📸" },
    ];
  }

  const fallback = [{ day: 1, time: "10:00", title: "系統繁忙: 這是一筆備用資料", category: "other", emoji: "📍" }];

  // ── Pre-fetch weather forecast (non-blocking; injected into AI prompt) ──────
  const weatherContext = await fetchWeatherContext(
    destination,
    planner?.startDate,
    days
  );

  // ── Decide: single call vs. parallel chunking ──────────────────────────────
  const useParallel = days > 4;

  let parsed: any;

  if (!useParallel) {
    // ── Single call ──────────────────────────────────────────────────────────
    const prompt = buildChunkPrompt(destination, days, planner, generationContext, true, 1, days, weatherContext);
    try {
      const text = await fetchOpenRouterWithFallback(apiKey, prompt);
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON object found in output");
      parsed = JSON.parse(match[0]);
    } catch (err) {
      console.error("Failed to generate AI itinerary", err);
      return fallback;
    }
  } else {
    // ── Parallel Chunking ────────────────────────────────────────────────────
    // Split days into chunks of CHUNK_SIZE and run all AI calls concurrently.
    const chunks: Array<[number, number]> = [];
    for (let i = 0; i < Math.ceil(days / CHUNK_SIZE); i++) {
      chunks.push([i * CHUNK_SIZE + 1, Math.min((i + 1) * CHUNK_SIZE, days)]);
    }

    try {
      const chunkResults = await Promise.all(
        chunks.map(([startDay, endDay], idx) => {
          const isFirst = idx === 0;
          const prompt = buildChunkPrompt(
            destination,
            days,
            planner,
            generationContext,
            isFirst,
            startDay,
            endDay,
            weatherContext
          );
          return fetchOpenRouterWithFallback(apiKey!, prompt).then((text) =>
            parseChunkText(text, isFirst)
          );
        })
      );

      // Merge: chunk 0 carries ui_config + summary; remaining chunks are itinerary arrays.
      // Also correct day numbers in case the AI reset its counter inside a non-first chunk.
      const [firstChunk, ...restChunks] = chunkResults;

      const correctedChunks = chunks.map(([startDay, endDay], idx) => {
        const raw: any[] = idx === 0
          ? (Array.isArray(firstChunk?.itinerary) ? firstChunk.itinerary : [])
          : (Array.isArray(restChunks[idx - 1]) ? restChunks[idx - 1] : []);
        return raw.map((dayObj: any, i: number) => ({
          ...dayObj,
          day: startDay + i <= endDay ? startDay + i : endDay, // force correct day number
        }));
      });

      const mergedItinerary = correctedChunks.flat();
      parsed = { ...firstChunk, itinerary: mergedItinerary };
    } catch (err) {
      console.error("Failed to generate parallel AI itinerary", err);
      return fallback;
    }
  }

  // ── Hybrid Enrichment: geocode + wiki + OSRM (AI never touches coords) ─────
  if (parsed && typeof parsed === "object") {
    try {
      parsed = await enrichItinerary(parsed, destination);
    } catch (err) {
      console.error("Enrichment failed (returning un-enriched result)", err);
    }
    return parsed;
  }

  return fallback;
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
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      throw new Error("No JSON object found in AI response");
    }

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    if (parsed && typeof parsed.title === "string") {
      // Hybrid enrichment: geocode (Photon→Nominatim) + wiki thumbnail
      const name: string = parsed.title || "";
      const [coords, thumbnail] = await Promise.all([
        geocodeSpot(name, params.destination),
        getWikiThumbnail(name),
      ]);
      return {
        ...parsed,
        lat: coords?.lat ?? parsed.lat,
        lng: coords?.lng ?? parsed.lng,
        image_url: parsed.image_url || thumbnail || undefined,
      };
    }
  } catch (err) {
    console.error("regenerateSpot failed", err);
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

🔒 目的地鎖定：${params.destination}。新景點必須 100% 位於「${params.destination}」，禁止放入其他城市或國家的景點。

被替換的景點：
- 目的地: ${params.destination}
- Day: ${params.day}
- 日期: ${params.currentDate || "未提供"}
- 時間: ${params.currentTime}
- 原景點名稱: ${params.currentTitle}
- 原分類: ${params.currentCategory || "other"}
- 使用者備註: ${params.notes || "無"}
- 時間策略: ${params.preserveTimeWindow ? "盡量保留原本時間窗，不要打亂前後節點節奏" : "可微調時間"}
- 上一個節點: ${params.previousNode ? `${params.previousNode.time || "時間未定"} ${params.previousNode.title || "未提供"} (${params.previousNode.category || "other"})` : "無"}
- 下一個節點: ${params.nextNode ? `${params.nextNode.time || "時間未定"} ${params.nextNode.title || "未提供"} (${params.nextNode.category || "other"})` : "無"}

Travel Facts / Anchor：
${params.travelFactsContext || "無"}

請直接輸出一個 JSON 物件，欄位如下：
{
  "time": "HH:MM",
  "title": "景點名稱（在 ${params.destination} 附近、符合上下文的替代景點）",
  "emoji": "對應表情",
  "category": "landmark|food|shopping|nature|hotel|activity|nightlife|transport|other",
  "ai_note": "一句話的貼心提醒，說明為何適合替換。並請務必包含：營業時間、停車資訊、門票資訊、以及預估花費（量化成當地貨幣或台幣）。若為韓國地區請推薦使用 Naver Maps。",
  "transport_to_next": "預估前往下一個景點的交通時間與方式，以文字描述即可 (如：搭乘地鐵約 25 分鐘)（可選）",
  "intensity": "chill|balanced|hardcore",
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
