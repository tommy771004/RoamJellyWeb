import { fetchOpenRouterWithFallback } from "./openrouterHelper";
import { distanceInKm } from "../utils/serverHelpers";

const apiKey = process.env.OPENROUTER_API_KEY;

// ─── Chunk size for parallel itinerary generation ────────────────────────────
const CHUNK_SIZE = 3; // days per parallel AI call

// ─── External API Helpers (Hybrid Architecture) ──────────────────────────────

/**
 * Geocode a spot name with standard fallback hierarchy.
 * 第一層 (First Fallback): LocationIQ API (requires LOCATIONIQ_API_KEY)
 * 第二層 (Second Fallback): Geoapify API (requires GEOAPIFY_API_KEY)
 * 額外安全備用 (Safety Fallback): Photon (Komoot) — OSM-based, no API key required.
 */
function isCoordValidForCity(
  lat: number,
  lng: number,
  biasCoords: { lat: number; lng: number } | null,
  title: string,
  city: string,
  source: string
): boolean {
  if (!biasCoords) return true;
  const dist = distanceInKm(lat, lng, biasCoords.lat, biasCoords.lng);
  if (dist > 200) {
    console.warn(`[Geocode Strict Limit TS] (${source}) Rejected coordinate (${lat}, ${lng}) for "${title}" - too far (${dist.toFixed(1)}km > 200km) from city "${city}" center (${biasCoords.lat}, ${biasCoords.lng})`);
    return false;
  }
  return true;
}

const cityCoordsCache = new Map<string, { lat: number; lng: number }>();

async function geocodeSpot(
  name: string,
  city: string,
  localName?: string
): Promise<{ lat: number; lng: number } | null> {
  const cleanName = name.trim();
  const cleanCity = city.trim();

  let biasCoords: { lat: number; lng: number } | null = null;

  if (cleanCity && cleanCity.toLowerCase() !== cleanName.toLowerCase()) {
    if (cityCoordsCache.has(cleanCity)) {
      biasCoords = cityCoordsCache.get(cleanCity) || null;
    } else {
      const resolved = await geocodeSpot(cleanCity, "", "");
      if (resolved) {
        cityCoordsCache.set(cleanCity, resolved);
        biasCoords = resolved;
      }
    }
  }

  const searchName = localName && localName !== cleanName ? `${localName} ${cleanName}` : cleanName;
  const qStr = `${searchName} ${cleanCity || ""}`.trim();

  // ── LocationIQ (Primary) ──────────────────────────────────────────────────
  const locationIqKey = process.env.LOCATIONIQ_API_KEY;
  if (locationIqKey) {
    try {
      const q = encodeURIComponent(qStr);
      let url = `https://us1.locationiq.com/v1/search.php?key=${locationIqKey}&q=${q}&format=json&limit=1`;
      if (biasCoords) {
        url += `&lat=${biasCoords.lat}&lon=${biasCoords.lng}`;
      }
      const res = await fetch(
        url,
        { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data: any = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            if (isCoordValidForCity(lat, lon, biasCoords, cleanName, cleanCity, 'LocationIQ')) {
              return { lat, lng: lon };
            }
          }
        }
      }
    } catch { /* fall through */ }
  }

  // ── Geoapify (First Fallback) ─────────────────────────────────────────────
  const geoapifyKey = process.env.GEOAPIFY_API_KEY;
  if (geoapifyKey) {
    try {
      const q = encodeURIComponent(qStr);
      let url = `https://api.geoapify.com/v1/geocode/search?text=${q}&apiKey=${geoapifyKey}&limit=1`;
      if (biasCoords) {
        url += `&bias=proximity:${biasCoords.lng},${biasCoords.lat}`;
      }
      const res = await fetch(
        url,
        { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data: any = await res.json();
        const coords = data.features?.[0]?.geometry?.coordinates; // [lon, lat]
        if (coords?.length === 2) {
          const lat = coords[1];
          const lon = coords[0];
          if (isCoordValidForCity(lat, lon, biasCoords, cleanName, cleanCity, 'Geoapify')) {
            return { lat: coords[1], lng: coords[0] };
          }
        }
      }
    } catch { /* fall through */ }
  }

  // ── Photon (Second Fallback) ──────────────────────────────────────────────
  try {
    const q = encodeURIComponent(qStr);
    let url = `https://photon.komoot.io/api/?q=${q}&limit=1`;
    if (biasCoords) {
      url += `&lat=${biasCoords.lat}&lon=${biasCoords.lng}`;
    }
    const res = await fetch(
      url,
      { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data: any = await res.json();
      const coords = data.features?.[0]?.geometry?.coordinates; // [lon, lat]
      if (coords?.length === 2) {
        const lat = coords[1];
        const lon = coords[0];
        if (isCoordValidForCity(lat, lon, biasCoords, cleanName, cleanCity, 'Photon')) {
          return { lat: coords[1], lng: coords[0] };
        }
      }
    }
  } catch { /* swallow */ }

  // ── AI Fallback (Third Fallback) ──────────────────────────────────────────
  if (apiKey && (cleanName || cleanCity)) {
    try {
      const prompt = `Please find the GPS coordinates (latitude,longitude) for the spot: "${cleanName}" inside the destination: "${cleanCity}".
You MUST strictly return coordinates that are physically located within or extremely close to "${cleanCity}". If the spot matches a location outside of "${cleanCity}", you MUST find and return a matching attraction or coordinates inside "${cleanCity}" instead.
Reply ONLY with the GPS latitude,longitude (e.g. 25.0343,121.5649 or 35.6762,139.6503). Do not explain or output other text or markdown wrapper.`;
      const resText = await fetchOpenRouterWithFallback(apiKey, prompt);
      if (resText) {
        try {
          const jsonStart = resText.indexOf("{");
          const jsonEnd = resText.lastIndexOf("}");
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
            const parsed = JSON.parse(resText.slice(jsonStart, jsonEnd + 1));
            const lat = parseFloat(parsed.lat ?? parsed.latitude);
            const lng = parseFloat(parsed.lng ?? parsed.lng ?? parsed.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
              if (isCoordValidForCity(lat, lng, biasCoords, cleanName, cleanCity, 'AI Fallback JSON')) {
                console.log(`[AI Fallback Geocode] ${cleanName} in ${cleanCity} (JSON) -> ${lat}, ${lng}`);
                return { lat, lng };
              }
            }
          }
        } catch { /* ignore fallback to regex */ }

        const cleaned = resText.trim().replace(/[()[\]{}]/g, '');
        const match = cleaned.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          if (!isNaN(lat) && !isNaN(lng)) {
            if (isCoordValidForCity(lat, lng, biasCoords, cleanName, cleanCity, 'AI Fallback Regex')) {
              console.log(`[AI Fallback Geocode] ${cleanName} in ${cleanCity} (Regex) -> ${lat}, ${lng}`);
              return { lat, lng };
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[AI Fallback Geocode] failed for ${cleanName}:`, err.message);
    }
  }

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

  // Fallback: Wikimedia Commons image search (catches local restaurants / small venues)
  try {
    const q = encodeURIComponent(name);
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&format=json&origin=*`,
      { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data: any = await res.json();
      const pages = data.query?.pages || {};
      const firstPage: any = Object.values(pages)[0];
      const url: string | undefined = firstPage?.imageinfo?.[0]?.url;
      if (url && /\.(jpg|jpeg|png|webp)/i.test(url)) return url;
    }
  } catch { /* swallow */ }

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

  const biasCoords = destination ? await geocodeSpot(destination, "") : null;

  // Step 1: Geocode + wiki thumbnail — all days in parallel, all spots within day in parallel
  const enrichedDays = await Promise.all(
    parsed.itinerary.map(async (dayData: any) => {
      if (!Array.isArray(dayData.spots)) return dayData;
      const enrichedSpots = await Promise.all(
        dayData.spots.map(async (spot: any) => {
          const name: string = spot.name || spot.title || "";
          const spotCity: string = spot.city || destination || "";
          const spotLocalName: string = spot.local_name || "";
          const [coords, thumbnail] = await Promise.all([
            geocodeSpot(name, spotCity, spotLocalName),
            getWikiThumbnail(name),
          ]);

          let finalLat = coords ? coords.lat : spot.lat;
          let finalLng = coords ? coords.lng : spot.lng;

          if (finalLat != null && finalLng != null && biasCoords) {
            const dist = distanceInKm(finalLat, finalLng, biasCoords.lat, biasCoords.lng);
            if (dist > 200) {
              console.warn(`[aiItineraryService Bound Check] Rejecting spot "${name}" coordinate (${finalLat}, ${finalLng}) because it is too far (${dist.toFixed(1)}km > 200km) from destination "${destination}" center (${biasCoords.lat}, ${biasCoords.lng})`);
              finalLat = null;
              finalLng = null;
            }
          }

          // Generate Attachments (Tickets & Reviews) using traditional deep links
          const attachments: any[] = [];
          if (['landmark', 'activity', 'other'].includes(spot.category)) {
             const query = encodeURIComponent(`${name} ${spotCity}`);
             attachments.push({
               id: `klook-${Date.now()}-${Math.random().toString(36).substring(2,8)}`,
               name: "Klook 門票與體驗",
               type: "ticket",
               url: `https://www.klook.com/zh-TW/search/result/?query=${query}`
             });
             attachments.push({
               id: `kkday-${Date.now()}-${Math.random().toString(36).substring(2,8)}`,
               name: "KKday 行程庫",
               type: "ticket",
               url: `https://www.kkday.com/zh-tw/product/productlist?keyword=${query}`
             });
          }
          if (['food', 'nightlife', 'landmark'].includes(spot.category)) {
             const query = encodeURIComponent(`${spotLocalName || name} ${spotCity}`);
             attachments.push({
               id: `gmap-${Date.now()}-${Math.random().toString(36).substring(2,8)}`,
               name: "Google地圖即時評價",
               type: "review",
               url: `https://www.google.com/maps/search/?api=1&query=${query}`
             });
          }

          return {
            ...spot,
            lat: finalLat != null ? finalLat : null,
            lng: finalLng != null ? finalLng : null,
            image_url: spot.image_url || thumbnail || undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
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

// ─── Destination Context: Weather + Holidays + Country Info + Exchange Rate ────

const WMO_LABEL: Record<number, string> = {
  0: "晴天", 1: "大致晴朗", 2: "局部多雲", 3: "陰天",
  45: "有霧", 48: "霧凇",
  51: "毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨",
  71: "小雪", 73: "中雪", 75: "大雪",
  80: "陣雨", 81: "中陣雨", 82: "強陣雨",
  95: "雷雨", 96: "強雷雨",
};

/** Geocode destination via Photon; returns lat/lng + ISO-3166-1 alpha-2 country code. */
async function resolveDestinationGeo(
  destination: string
): Promise<{ lat: number; lng: number; countryCode: string } | null> {
  try {
    const q = encodeURIComponent(destination);
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${q}&limit=1`,
      { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.geometry.coordinates;
    const countryCode = (feature.properties?.countrycode || "").toUpperCase();
    return { lat, lng, countryCode };
  } catch {
    return null;
  }
}

/** Open-Meteo daily forecast — returns one line per day. */
async function fetchWeatherLines(
  lat: number, lng: number,
  startDate: string | null | undefined,
  days: number
): Promise<string[]> {
  try {
    const forecastDays = Math.min(days, 14);
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
      `&timezone=auto&forecast_days=${forecastDays}`;
    const res = await fetch(url, { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const wx: any = await res.json();
    const times: string[] = wx.daily?.time || [];
    const maxT: number[] = wx.daily?.temperature_2m_max || [];
    const minT: number[] = wx.daily?.temperature_2m_min || [];
    const rain: number[] = wx.daily?.precipitation_probability_max || [];
    const codes: number[] = wx.daily?.weather_code || [];
    let startIdx = 0;
    if (startDate && times.length > 0) {
      const found = times.findIndex((t: string) => t === startDate.slice(0, 10));
      if (found !== -1) startIdx = found;
    }
    const lines: string[] = [];
    for (let i = 0; i < days && startIdx + i < times.length; i++) {
      const idx = startIdx + i;
      const label = WMO_LABEL[codes[idx]] ?? "未知天氣";
      const rainStr = rain[idx] != null ? `, 降雨機率 ${rain[idx]}%` : "";
      lines.push(`Day ${i + 1} (${times[idx]}): ${label}, ${Math.round(minT[idx])}°C–${Math.round(maxT[idx])}°C${rainStr}`);
    }
    return lines;
  } catch {
    return [];
  }
}

/** Nager.Date public holidays that fall within the trip date range. */
async function fetchHolidayLines(
  countryCode: string,
  startDate: string | null | undefined,
  days: number
): Promise<string[]> {
  if (!countryCode || !startDate) return [];
  try {
    const year = new Date(startDate).getFullYear();
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const holidays: Array<{ date: string; localName: string; name: string }> = await res.json();
    const start = new Date(startDate.slice(0, 10));
    const lines: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const h = holidays.find((hol) => hol.date === dateStr);
      if (h) lines.push(`Day ${i + 1} (${dateStr}) 是國定假日「${h.localName || h.name}」，景點可能休館或人潮擁擠。`);
    }
    return lines;
  } catch {
    return [];
  }
}

/** RestCountries: currency, timezone, calling code for a country. */
async function fetchCountryMeta(
  countryCode: string
): Promise<{ lines: string[]; currencyCode: string }> {
  if (!countryCode) return { lines: [], currencyCode: "" };
  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/alpha/${countryCode}?fields=currencies,timezones,idd`,
      { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return { lines: [], currencyCode: "" };
    const data: any = await res.json();
    const curs = data.currencies || {};
    const currencyCode = Object.keys(curs)[0] || "";
    const cur = curs[currencyCode] || {};
    const timezone = data.timezones?.[0] || "";
    const callingCode = data.idd?.root
      ? `${data.idd.root}${(data.idd.suffixes || [])[0] || ""}`
      : "";
    const lines: string[] = [];
    if (currencyCode) lines.push(`當地貨幣: ${cur.symbol || currencyCode} (${currencyCode} — ${cur.name || ""})`);
    if (timezone) lines.push(`時區: ${timezone}`);
    if (callingCode) lines.push(`國際電話碼: ${callingCode}`);
    return { lines, currencyCode };
  } catch {
    return { lines: [], currencyCode: "" };
  }
}

/** ExchangeRate-API (open.er-api.com): TWD ↔ destination currency. */
async function fetchExchangeLines(currencyCode: string): Promise<string[]> {
  if (!currencyCode || currencyCode === "TWD") return [];
  try {
    const res = await fetch(
      `https://open.er-api.com/v6/latest/TWD`,
      { headers: { "User-Agent": "RoamJellyApp/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data: any = await res.json();
    const rate: number = data.rates?.[currencyCode];
    if (!rate) return [];
    const inverse = (1 / rate).toFixed(2);
    return [`匯率參考: 1 TWD ≈ ${rate.toFixed(4)} ${currencyCode}（即 1 ${currencyCode} ≈ ${inverse} TWD）`];
  } catch {
    return [];
  }
}

/**
 * Fetch all destination context in parallel: weather + public holidays + country info + exchange rate.
 * Returns a single formatted string for injection into the AI prompt.
 * All sources are non-blocking; returns empty string on complete failure.
 */
async function fetchAllDestinationContext(
  destination: string,
  startDate: string | null | undefined,
  days: number
): Promise<string> {
  const geo = await resolveDestinationGeo(destination);
  if (!geo) return "";
  const { lat, lng, countryCode } = geo;

  const [weatherLines, holidayLines, countryMeta] = await Promise.all([
    fetchWeatherLines(lat, lng, startDate, days),
    fetchHolidayLines(countryCode, startDate, days),
    fetchCountryMeta(countryCode),
  ]);

  const exchangeLines = await fetchExchangeLines(countryMeta.currencyCode);

  const sections: string[] = [];
  if (weatherLines.length > 0)
    sections.push(`【天氣預報（供規劃參考）】\n${weatherLines.join("\n")}`);
  if (holidayLines.length > 0)
    sections.push(`【國定假日警告】\n${holidayLines.join("\n")}`);
  const infoLines = [...countryMeta.lines, ...exchangeLines];
  if (infoLines.length > 0)
    sections.push(`【目的地基本資訊】\n${infoLines.join("\n")}`);

  return sections.join("\n\n");
}

// ─── Prompt builder (no lat/lng/image_url in schema) ─────────────────────────

export function getCountryExclusivePromptConfig(destination: string) {
  const norm = (destination || "").toLowerCase();
  
  // Korea check
  const isKorea = norm.includes("韓") || 
                  norm.includes("seoul") || 
                  norm.includes("首爾") || 
                  norm.includes("釜山") || 
                  norm.includes("busan") || 
                  norm.includes("濟州") || 
                  norm.includes("jeju") || 
                  norm.includes("korea") ||
                  norm.includes("仁川") ||
                  norm.includes("incheon");

  // Japan check
  const isJapan = norm.includes("日") || 
                  norm.includes("japan") || 
                  norm.includes("tokyo") || 
                  norm.includes("東京") || 
                  norm.includes("大阪") || 
                  norm.includes("osaka") || 
                  norm.includes("kyoto") || 
                  norm.includes("京都") || 
                  norm.includes("okinawa") || 
                  norm.includes("沖繩") || 
                  norm.includes("fukuoka") || 
                  norm.includes("福岡") || 
                  norm.includes("hokkaido") || 
                  norm.includes("北海道") || 
                  norm.includes("nagoya") || 
                  norm.includes("名古屋");

  // Taiwan check
  const isTaiwan = norm.includes("台") || 
                   norm.includes("臺") || 
                   norm.includes("taipei") || 
                   norm.includes("taiwan") || 
                   norm.includes("kaohsiung") || 
                   norm.includes("高雄") || 
                   norm.includes("taichung") || 
                   norm.includes("台中");

  if (isKorea) {
    return {
      countryName: "韓國",
      mapAppText: "🚨【地圖推薦】這是一趟【韓國】旅行。韓國當地不適用 Google Maps 導航，請務必且強制在 `ai_note` 中提醒下載並使用「Naver Maps」或「KakaoMap」進行路線規劃與查詢，不要提及任何日本地圖應用。",
      localLanguageExample: "韓文 (Hangul)",
      geographicBoundary: "🚨【嚴格地理一致性，最高指令】注意！這是一趟【韓國】旅行。所有生成的景點、店家、地名必須 100% 位於【韓國】境內（如：首爾、釜山、濟州島、仁川、大邱、慶州等）。絕對嚴格禁止在行程中放入任何位於日本（例如：新宿、淺草、東京、大阪、沖繩、清水寺等）、台灣或其它國家地區的景點！請徹底杜絕任何日本景點或地標的污染。",
      currency: "韓元 (KRW)",
    };
  }

  if (isJapan) {
    return {
      countryName: "日本",
      mapAppText: "🚨【地圖推薦】這是一趟【日本】旅行。請在 `ai_note` 提醒使用者下載並使用「Google Maps」或「Yahoo! 乘換案內」進行交通規劃。",
      localLanguageExample: "日文 (漢字、平假名等)",
      geographicBoundary: "🚨【嚴格地理一致性，最高指令】注意！這是一趟【日本】旅行。所有生成的景點、店家、地名必須 100% 位於【日本】境內（如：東京、大阪、京都、北海道、福岡、沖繩等）。絕對嚴格禁止放入任何韓國（例如：明洞、弘大、景福宮、東大門、海雲台）、台灣或其它國家地區的景點！",
      currency: "日圓 (JPY)",
    };
  }

  if (isTaiwan) {
    return {
      countryName: "台灣",
      mapAppText: "🚨【地圖推薦】這是一趟【台灣】旅行。推薦使用「Google Maps」進行導航與美食查詢。",
      localLanguageExample: "繁體中文 / 官方地名",
      geographicBoundary: "🚨【嚴格地理一致性，最高指令】注意！這是一趟【台灣】旅行。所有景點與店家必須位於【台灣】（例如台北、台中、台南、高雄、花蓮、墾丁等）。絕對禁止放入任何日本、韓國或海外景點！",
      currency: "新台幣 (TWD)",
    };
  }

  return {
    countryName: destination,
    mapAppText: "🚨【地圖推薦】請根據目的地推薦適合的導航地圖應用程式（如 Google Maps）。",
    localLanguageExample: "當地的官方語言與拼音",
    geographicBoundary: `🚨【嚴格地理一致性，最高指令】注意！規劃出的所有景點、店家與地名必須 100% 嚴格位於指定的目的地「${destination}」地區境內。絕對禁止將其它任何國家、城市或不相關地區的景點混入行程中。`,
    currency: "當地貨幣或台幣比例",
  };
}

/**
 * Build the AI prompt for a chunk of days.
 * includeUiConfig = true for the first chunk (adds ui_config + summary to the schema).
 * startDay/endDay constrain which days the AI should output.
 * destinationContext: optional context string (weather/holidays/rates) injected into the prompt.
 */
function buildChunkPrompt(
  destination: string,
  totalDays: number,
  planner: any,
  generationContext: string,
  includeUiConfig: boolean,
  startDay: number,
  endDay: number,
  destinationContext?: string
): string {
  const chunkDays = endDay - startDay + 1;
  const rangeInstruction =
    startDay === 1 && endDay === totalDays
      ? "" // single call: no extra restriction
      : `\n【區段指示】請只產生第 ${startDay} 天到第 ${endDay} 天（共 ${chunkDays} 天）的行程，itinerary 的 day 值從 ${startDay} 到 ${endDay}。${startDay > 1 ? "請延續前幾天旅程的節奏與地區連貫性。" : ""}`;

  const config = getCountryExclusivePromptConfig(destination);

  const spotSchema = `[
  {
    "day": 1, 
    "spots": [
      {
        "time": "09:00", 
        "name": "字串：景點名稱（繁體中文，專有名詞可加外文括號）",
        "local_name": "字串：該地區官方原生語言名稱（${config.localLanguageExample}），務必精準，不可留空",
        "city": "字串：所在城市名",
        "emoji": "字串",
        "category": "flight | transport | landmark | food | shopping | nature | hotel | activity | nightlife | other",
        "intensity": "chill | moderate | hardcore",
        "ai_note": "字串：精細客製提醒，含營業時間、停車、門票、預算",
        "linkedFactId": "字串（這裡只填入 ID，若無則省略整個欄位）"
      }
    ]
  }
]`;

  const schema = includeUiConfig
    ? `\`\`\`json
{
  "ui_config": {
    "bg_gradient": "Tailwind class, e.g. from-amber-100 to-orange-50",
    "font_scale": "normal | large",
    "hero_image_keyword": "字串"
  },
  "summary": {
    "title": "字串",
    "smart_tags": ["字串"]
  },
  "itinerary": ${spotSchema}
}
\`\`\``
    : `\`\`\`json
${spotSchema}
\`\`\``;

  return `你是一個精通旅遊規劃的 AI。

═══════════════════════════════════════════════════════
🔒 目的地與國家完全鎖定（最高優先指令，不可違反）
　目的地：${destination}（共 ${totalDays} 天）
　${config.geographicBoundary}
　summary.title 必須明確包含「${destination}」這個地名。
═══════════════════════════════════════════════════════

請回傳純 JSON 格式，不准帶有 markdown code block 打包，也不要有任何 // 註解：
${schema}

【語言與格式要求】
1. **請一律使用「繁體中文 (Traditional Chinese)」**：景點名稱（name）、提醒（ai_note）、摘要等全部使用繁體中文。
2. **嚴格的 JSON 格式**：請務必且只能使用**標準雙引號 \`"\`** 包覆屬性與字串值。字串內若需引號，請用全形引號「」或單引號。

【AI 規劃必備要求】
1. 地圖 App 引導與提醒限制：${config.mapAppText}
2. **營業時間與停車場**：\`ai_note\` 中**必須**提供大約的營業時間與停車資訊。
3. **門票資訊**：\`ai_note\` 中**必須**說明是否需要門票及費用。
4. **包棟住宿選項**：人數適合時，主動推薦**包棟民宿/Villa**。
5. **預算範圍量化**：\`ai_note\` 中提供估算，以「${config.currency}」或台幣標註。
6. **專屬起訖點設計**：行程的第一天必須從目的地機場開始（降落、入境），最後一天必須在目的地機場結束（前往機場、出境）。
7. **每日終點**：每一天的最後一個行程（節點）必須是該晚的住宿地點（hotel / accommodation）。

【內容客製化要求】
若使用者未提供飲食禁忌，請忽略；若為情侶，安排浪漫景點。
根據旅伴類型、節奏偏好與興趣客製化行程。
不要給出制式通用名稱，請給出真實景點與店家名稱，不可放入非「${destination}」所屬國家的景點。
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
${destinationContext ? "\n" + destinationContext : ""}
${generationContext}${rangeInstruction}

最終提醒：所有輸出內容（包含 summary.title）都必須是「${destination}」的行程，請直接輸出 JSON，不要任何多餘文字或 markdown 包裝。`;
}

function repairJsonString(s: string): string {
  let r = s.trim();

  // 1. Convert smart quotes
  r = r.replace(/[\u201c\u201d\u201e\u201f\u2033\u2036]/g, '"');
  r = r.replace(/[\u2018\u2019\u201a\u201b\u2032\u2035]/g, "'");

  // 2. Remove comments
  r = r.replace(/\s*\/\/.*$/gm, "");
  r = r.replace(/\s*\/\*[\s\S]*?\*\//g, "");

  // 3. Fix unquoted keys
  r = r.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_-]*)(\s*:)/g, '$1"$2"$3');

  // 4. Fix single quoted keys: 'day': 4 -> "day": 4
  r = r.replace(/([{,]\s*)'([^'\s]+)'(\s*:)/g, '$1"$2"$3');

  // 5. Fix single quoted values safely
  r = r.replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, content) => {
    const escaped = content.replace(/"/g, '\\"').replace(/\\'/g, "'");
    return `: "${escaped}"`;
  });

  // Also inside arrays: [ 'apple', 'banana' ]
  r = r.replace(/\[\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, content) => {
    const escaped = content.replace(/"/g, '\\"').replace(/\\'/g, "'");
    return `[ "${escaped}"`;
  });
  r = r.replace(/,\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match, content) => {
    const escaped = content.replace(/"/g, '\\"').replace(/\\'/g, "'");
    return `, "${escaped}"`;
  });

  // 6. Fix trailing commas before closing braces/brackets
  r = r.replace(/,\s*([}\]])/g, "$1");

  // 7. Ensure control characters (like raw newlines, tabs) inside string literals are properly escaped
  let formatted = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < r.length; i++) {
    const char = r[i];
    if (escape) {
      formatted += char;
      escape = false;
      continue;
    }
    if (char === '\\') {
      formatted += char;
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      formatted += char;
      continue;
    }
    if (inString) {
      if (char === '\n') {
        formatted += '\\n';
      } else if (char === '\r') {
        formatted += '\\r';
      } else if (char === '\t') {
        formatted += '\\t';
      } else {
        formatted += char;
      }
    } else {
      formatted += char;
    }
  }
  r = formatted;

  return r;
}

export function robustJSONParse(text: string, expectArray: boolean = false): any {
  // 1. Remove think/thought/reasoning elements
  let clean = text;
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, "");
  clean = clean.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  clean = clean.replace(/<thought>[\s\S]*?<\/thought>/gi, "");

  // Gather code blocks as main candidates
  const candidates: string[] = [];
  const codeBlockRegex = /```\w*\s*([\s\S]*?)\s*```/gi;
  let match;
  while ((match = codeBlockRegex.exec(clean)) !== null) {
    candidates.push(match[1]);
  }

  // Also include the entire clean text as parent candidate
  candidates.push(clean);

  for (const candidate of candidates) {
    const s = candidate.trim();
    if (!s) continue;

    // Try a direct parse with a quick repair
    try {
      const repaired = repairJsonString(s);
      return JSON.parse(repaired);
    } catch { /* proceed */ }

    // Find starting indices of all '{' and '[' inside candidate
    const startIndices: { index: number; type: '{' | '[' }[] = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '{') {
        startIndices.push({ index: i, type: '{' });
      } else if (s[i] === '[') {
        startIndices.push({ index: i, type: '[' });
      }
    }

    // Sort to prioritize start indices matching the expected outer structure (array or object)
    if (expectArray) {
      startIndices.sort((a, b) => {
        if (a.type === '[' && b.type !== '[') return -1;
        if (b.type === '[' && a.type !== '[') return 1;
        return a.index - b.index;
      });
    } else {
      startIndices.sort((a, b) => {
        if (a.type === '{' && b.type !== '{') return -1;
        if (b.type === '{' && a.type !== '{') return 1;
        return a.index - b.index;
      });
    }

    for (const { index, type } of startIndices) {
      const closingChar = type === '{' ? '}' : ']';
      const lastClose = s.lastIndexOf(closingChar);
      if (lastClose === -1 || lastClose <= index) continue;

      const subStr = s.slice(index, lastClose + 1);
      try {
        const repaired = repairJsonString(subStr);
        return JSON.parse(repaired);
      } catch {
        // Fallback: match brackets balanced-count to grab exact JSON nested ending
        let balance = 0;
        let foundEnd = -1;
        for (let j = index; j < s.length; j++) {
          if (s[j] === type) balance++;
          else if (s[j] === closingChar) {
            balance--;
            if (balance === 0) {
              foundEnd = j;
              break;
            }
          }
        }
        if (foundEnd !== -1) {
          const balancedStr = s.slice(index, foundEnd + 1);
          try {
            const repaired = repairJsonString(balancedStr);
            return JSON.parse(repaired);
          } catch { /* proceed */ }
        }
      }
    }
  }

  // Final last-resort parse of the candidates with repair
  for (const candidate of candidates) {
    try {
      const repaired = repairJsonString(candidate);
      return JSON.parse(repaired);
    } catch { /* proceed */ }
  }

  console.error("All robust JSON parsing attempts failed. Raw text preview:", text.substring(0, 300));
  throw new Error("Robust JSON parsing failed to identify a valid JSON structure.");
}

/** Parse the raw text from a chunk AI call into a structured object/array. */
function parseChunkText(text: string, isFirst: boolean): any {
  if (isFirst) {
    return robustJSONParse(text, false);
  }
  const parsed = robustJSONParse(text, true);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === "object") {
    return Array.isArray(parsed.itinerary) ? parsed.itinerary : [parsed];
  }
  return [parsed];
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

  // ── Pre-fetch destination context (weather + holidays + country + rates) ───
  const destinationContext = await fetchAllDestinationContext(
    destination,
    planner?.startDate,
    days
  );

  // ── Decide: single call vs. parallel chunking ──────────────────────────────
  const useParallel = days > 4;

  let parsed: any;

  if (!useParallel) {
    // ── Single call ──────────────────────────────────────────────────────────
    const prompt = buildChunkPrompt(destination, days, planner, generationContext, true, 1, days, destinationContext);
    try {
      const text = await fetchOpenRouterWithFallback(apiKey, prompt);
      parsed = robustJSONParse(text, false);
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
            destinationContext
          );
          const attempt = () =>
            fetchOpenRouterWithFallback(apiKey!, prompt).then((text) =>
              parseChunkText(text, isFirst)
            );
          return attempt().catch((err) => {
            console.warn(`Chunk ${idx} failed to parse JSON, retrying once...`, err);
            return attempt();
          });
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
    const parsed = robustJSONParse(text, false);
    if (parsed && typeof parsed.title === "string") {
      // Hybrid enrichment: geocode (Photon→Mapbox→Nominatim) + wiki thumbnail
      const name: string = parsed.title || "";
      const spotCity: string = parsed.city || params.destination;
      const spotLocalName: string = parsed.local_name || "";
      const [coords, thumbnail] = await Promise.all([
        geocodeSpot(name, spotCity, spotLocalName),
        getWikiThumbnail(name),
      ]);
      return {
        ...parsed,
        lat: coords?.lat ?? parsed.lat,
        lng: coords?.lng ?? parsed.lng,
        image_url: parsed.image_url || thumbnail || undefined,
        transport_to_next: parsed.transport_to_next || undefined,
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
  "local_name": "該國原生語言名稱（如日文、韓文、法語等），務必精準，不可留空",
  "city": "該景點所在的具體城市名，務必精準",
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
