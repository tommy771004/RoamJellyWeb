import type { ItineraryNode, ItineraryPlannerForm } from '../types/workflow';

const CATEGORY_ICON_MAP: Record<string, string> = {
  flight: '✈️',
  transport: '🚆',
  landmark: '🏯',
  food: '🍜',
  shopping: '🛍️',
  nature: '🌿',
  hotel: '🏨',
  activity: '🎡',
  nightlife: '🌃',
  other: '📍',
};

export interface SuggestItineraryInput {
  destination: string;
  planner: ItineraryPlannerForm;
}

function getApiKey(): string {
  const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return (
    (typeof process !== 'undefined' && process.env?.OPENROUTER_API_KEY) ||
    nodeEnv?.OPENROUTER_API_KEY ||
    ''
  );
}

export async function suggestItinerary(destination: string, days: number): Promise<ItineraryNode[]> {
  const input: SuggestItineraryInput = {
    destination,
    planner: {
      days,
      departureFrom: '',
      arrivalTo: destination,
      flightDate: '',
      countries: [],
      mustVisitSpots: [],
      mustEatFoods: [],
      autoFlightSegments: [],
      notes: '',
    },
  };
  return suggestItineraryWithForm(input);
}

export async function suggestItineraryWithForm(input: SuggestItineraryInput): Promise<ItineraryNode[]> {
  try {
    const res = await fetch('/api/generate/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    if (!res.ok) throw new Error('API failed');
    const data = await res.json();
    if (data.status === 'success' && Array.isArray(data.data)) {
      return data.data.map((item: any, i: number) => {
        const category = normalizeCategory(item.category);
        const emoji = pickIcon(item.emoji, category);
        return {
          node_id: `ai_${Date.now()}_${i}`,
          day: normalizeDay(item.day, input.planner.days),
          time: normalizeTime(item.time),
          title: String(item.title ?? '景點'),
          emoji,
          category,
          source: 'local' as const,
        };
      });
    }
  } catch (err) {
    console.error('Failed to generate itinerary via API', err);
  }

  // Fallback
  return [
    {
      node_id: `ai_${Date.now()}_0`,
      day: 1,
      time: '10:00',
      title: '系統繁忙，這是預設行程',
      emoji: '✈️',
      category: 'flight',
      source: 'local' as const,
    }
  ];
}

export async function suggestPackingList(destination: string, season: string): Promise<string[]> {
  try {
    const res = await fetch('/api/generate/packing-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination, days: 5, weatherContext: season })
    });
    if (!res.ok) throw new Error('API failed');
    const data = await res.json();
    if (data.status === 'success' && Array.isArray(data.data)) {
      return data.data.map((item: any) => item.text || item);
    }
  } catch (err) {
    console.error('Failed to suggestion packing list via API', err);
  }
  // Fallback if network or backend fails
  return [
    `護照與簽證 (${destination})`,
    `適合 ${season} 的衣物`,
    `個人常備藥物`,
    `萬用轉接頭與充電線`,
    `盥洗用品`
  ];
}

function buildItineraryPrompt(input: SuggestItineraryInput): string {
  const planner = input.planner;
  const countries = planner.countries.length ? planner.countries.join('、') : '未指定';
  const spots = planner.mustVisitSpots.length ? planner.mustVisitSpots.join('、') : '未指定';
  const foods = planner.mustEatFoods.length ? planner.mustEatFoods.join('、') : '未指定';
  const flights = planner.autoFlightSegments.length
    ? planner.autoFlightSegments.join(' | ')
    : '尚未抓到航班資料';

  return [
    `請規劃 ${input.destination} 的 ${planner.days} 天旅遊行程。`,
    '',
    '使用者需求（制式表單）：',
    `- 天數: ${planner.days}`,
    `- 出發地: ${planner.departureFrom || '未填'}`,
    `- 抵達地: ${planner.arrivalTo || input.destination}`,
    `- 航班日期: ${planner.flightDate || '未填'}`,
    `- 自動抓取航班（含轉乘）: ${flights}`,
    `- 國家偏好: ${countries}`,
    `- 想去景點: ${spots}`,
    `- 想吃食物: ${foods}`,
    `- 其他備註: ${planner.notes || '無'}`,
    '',
    '規劃規則：',
    '- 依天數輸出每天 3~5 個節點。',
    '- 每個節點請給 category 與對應 icon。',
    '- category 限定: flight, transport, landmark, food, shopping, nature, hotel, activity, nightlife, other。',
    '- time 必須為 24 小時制 HH:MM。',
    '- 若有航班資訊，至少加入去程或回程相關節點。',
    '',
    '回傳格式（只能是 JSON 陣列）：',
    '[{"day":1,"time":"08:30","title":"桃園機場報到","category":"flight","emoji":"✈️"}]',
  ].join('\n');
}

function parseJsonArray(text: string): Array<Record<string, unknown>> {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('invalid response: no JSON array found');

  const parsed = JSON.parse(match[0]) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('invalid response: JSON payload is not an array');
  }
  return parsed.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
}

function normalizeDay(value: unknown, fallbackDays: number): number {
  const day = Number(value);
  if (!Number.isFinite(day) || day < 1) return 1;
  return Math.min(Math.max(1, Math.round(day)), Math.max(1, fallbackDays));
}

function normalizeTime(value: unknown): string {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '10:00';
  const hh = Math.min(Math.max(0, Number(match[1])), 23);
  const mm = Math.min(Math.max(0, Number(match[2])), 59);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function normalizeCategory(value: unknown): string {
  const key = String(value ?? 'other').trim().toLowerCase();
  return CATEGORY_ICON_MAP[key] ? key : 'other';
}

function pickIcon(value: unknown, category: string): string {
  const icon = String(value ?? '').trim();
  if (icon) return icon;
  return CATEGORY_ICON_MAP[category] ?? '📍';
}
