// src/server/seo/routeFlightFacts.ts
//
// Real nonstop-flight facts for the /fly/{route}/ pages ("台北飛福岡多久",
// "直飛航空公司", "廉航"). The snapshots come from the Trip.com scraper via
// scripts/refresh-route-facts.ts (run weekly by .github/workflows/route-facts.yml)
// and are committed in src/data/routeFlightFacts.ts — no database involved.
// Model-generated flights never reach this data: the script calls the scraper
// directly, not fetchFlightOffers (which falls back to AI answers).

export interface RouteFlightRow {
  airline: string;
  flightNumber: string;
  departure: string; // "14:45" local time at origin
  arrival: string;   // "18:00" local time at destination
  durationMin: number;
  price: number;     // one-way economy, TWD, as listed for `departureDate`
  departureDate: string; // YYYY-MM-DD the price is for
}

export interface RouteFlightSnapshot {
  slug: string;
  fetchedAt: string; // ISO timestamp of the scrape
  flights: RouteFlightRow[]; // nonstop flights only
}

export interface AirlineSummary {
  name: string;
  isLowCost: boolean;
  flightNumbers: string[];
  minDurationMin: number;
  minPrice: number;
}

export interface RouteFlightSummary {
  airlines: AirlineSummary[];
  lowCostAirlines: string[];
  fullServiceAirlines: string[];
  minDurationMin: number;
  maxDurationMin: number;
  medianDurationMin: number;
  minPrice: number;
  minPriceDate: string;
  flightCount: number;
  fetchedAt: string;
  flights: RouteFlightRow[]; // sorted by departure time
}

/** Low-cost carriers seen on routes from Taiwan; matched by substring of the airline name. */
const LOW_COST_MARKERS = [
  '虎航', 'Tigerair', '樂桃', 'Peach', '酷航', 'Scoot', '捷星', 'Jetstar', '亞洲航空', 'AirAsia',
  '越捷', 'VietJet', 'Vietjet', '宿霧太平洋', 'Cebu Pacific', '濟州航空', 'Jeju Air', '真航空', 'Jin Air',
  '德威航空', "T'way", '易斯達', 'Eastar', '釜山航空', 'Air Busan', '香港快運', 'HK Express',
  '泰國獅子航空', 'Thai Lion', '春秋航空', 'Spring Airlines', 'ZIPAIR', '捷特航空',
];

export function isLowCostAirline(name: string): boolean {
  return LOW_COST_MARKERS.some((marker) => name.includes(marker));
}

/** "2h 15m" → 135; null when the text has no hours/minutes. */
export function parseDurationMin(text: string | undefined | null): number | null {
  if (!text) return null;
  const h = /(\d+)\s*h/.exec(text);
  const m = /(\d+)\s*m/.exec(text);
  if (!h && !m) return null;
  const total = Number(h?.[1] ?? 0) * 60 + Number(m?.[1] ?? 0);
  return total > 0 ? total : null;
}

/** 135 → "2 小時 15 分"; 120 → "2 小時". */
export function formatDurationZh(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} 分`;
  return m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分`;
}

/** Inclusive range in Chinese, collapsing equal ends: "2 小時 10 分至 2 小時 30 分". */
export function formatDurationRangeZh(minMin: number, maxMin: number): string {
  return minMin === maxMin ? formatDurationZh(minMin) : `${formatDurationZh(minMin)}至 ${formatDurationZh(maxMin)}`;
}

/**
 * Booking sites list a codeshare once per marketing airline (an ANA number on
 * an EVA flight), which would make a partner look like it flies the route.
 * Rows with the same departure and arrival times are one flight: keep the
 * airline that has the most departures on the route (likely the operator),
 * then the cheaper row.
 */
export function collapseCodeshares(rows: RouteFlightRow[]): RouteFlightRow[] {
  const departuresByAirline = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = departuresByAirline.get(r.airline) ?? new Set<string>();
    set.add(r.departure);
    departuresByAirline.set(r.airline, set);
  }
  const weight = (r: RouteFlightRow) => departuresByAirline.get(r.airline)?.size ?? 0;

  const bySlot = new Map<string, RouteFlightRow>();
  for (const r of rows) {
    const slot = `${r.departure}-${r.arrival}`;
    const current = bySlot.get(slot);
    if (
      !current ||
      weight(r) > weight(current) ||
      (weight(r) === weight(current) && r.price < current.price)
    ) {
      bySlot.set(slot, r);
    }
  }
  return [...bySlot.values()];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** A snapshot older than this is not shown: its fares and schedule would mislead. */
export const MAX_SNAPSHOT_AGE_DAYS = 35;

/**
 * What a route page states as fact. Null when the snapshot has no usable
 * nonstop flight, or is older than MAX_SNAPSHOT_AGE_DAYS (the weekly refresh
 * stopped working), so the page falls back to its old layout instead of a
 * "飛多久" title with no duration or stale prices.
 */
export function summarizeRouteFlights(
  snapshot: RouteFlightSnapshot | null | undefined,
  now: Date = new Date(),
): RouteFlightSummary | null {
  if (snapshot && now.getTime() - Date.parse(snapshot.fetchedAt) > MAX_SNAPSHOT_AGE_DAYS * 864e5) return null;
  const flights = collapseCodeshares(
    (snapshot?.flights ?? []).filter((f) => f.airline && f.durationMin > 0 && f.durationMin < 24 * 60 && f.price > 0),
  );
  if (!snapshot || flights.length === 0) return null;

  const byAirline = new Map<string, RouteFlightRow[]>();
  for (const f of flights) {
    const list = byAirline.get(f.airline) ?? [];
    list.push(f);
    byAirline.set(f.airline, list);
  }

  const airlines: AirlineSummary[] = [...byAirline.entries()]
    .map(([name, rows]) => ({
      name,
      isLowCost: isLowCostAirline(name),
      flightNumbers: [...new Set(rows.map((r) => r.flightNumber).filter(Boolean))],
      minDurationMin: Math.min(...rows.map((r) => r.durationMin)),
      minPrice: Math.min(...rows.map((r) => r.price)),
    }))
    .sort((a, b) => a.minPrice - b.minPrice);

  const durations = flights.map((f) => f.durationMin);
  const cheapest = flights.reduce((a, b) => (b.price < a.price ? b : a));

  return {
    airlines,
    lowCostAirlines: airlines.filter((a) => a.isLowCost).map((a) => a.name),
    fullServiceAirlines: airlines.filter((a) => !a.isLowCost).map((a) => a.name),
    minDurationMin: Math.min(...durations),
    maxDurationMin: Math.max(...durations),
    medianDurationMin: median(durations),
    minPrice: cheapest.price,
    minPriceDate: cheapest.departureDate,
    flightCount: flights.length,
    fetchedAt: snapshot.fetchedAt,
    flights: [...flights].sort((a, b) => a.departure.localeCompare(b.departure)),
  };
}

/** UTC offset (hours) of each destination airport on the known routes; Taiwan is +8. */
const AIRPORT_UTC_OFFSET: Record<string, number> = {
  NRT: 9, HND: 9, KIX: 9, ITM: 9, OKA: 9, FUK: 9, CTS: 9, NGO: 9, ICN: 9,
  BKK: 7, HKT: 7, DAD: 7, SGN: 7, HAN: 7,
  SIN: 8, HKG: 8, MFM: 8, KUL: 8, MNL: 8, CEB: 8,
};

/** "比台灣快 1 小時" / "比台灣慢 1 小時" / "與台灣沒有時差"; null for an unknown airport. */
export function timeDifferenceFromTaiwanZh(airportCode: string): string | null {
  const offset = AIRPORT_UTC_OFFSET[airportCode.toUpperCase()];
  if (offset === undefined) return null;
  const diff = offset - 8;
  if (diff === 0) return '與台灣沒有時差';
  return diff > 0 ? `比台灣快 ${diff} 小時` : `比台灣慢 ${-diff} 小時`;
}
