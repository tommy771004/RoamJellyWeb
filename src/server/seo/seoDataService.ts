// src/server/seo/seoDataService.ts
import { AppRepository } from '../repositories/appRepository.js';
import type { RouteData, DestinationData, MonthlyDemand, PublicTrip } from './types.js';
import { getRouteBySlug, getDestinationBySlug, KNOWN_ROUTES } from './cities.js';
import { formatDurationZh, summarizeRouteFlights, timeDifferenceFromTaiwanZh } from './routeFlightFacts.js';
import { ROUTE_FLIGHT_SNAPSHOTS } from '../../data/routeFlightFacts.js';
import { TW_OFFICE_CALENDARS } from '../../data/taiwanOfficeCalendar.js';
import { buildHolidayYearFacts } from './longWeekends.js';
export { HOLIDAY_YEARS } from './longWeekends.js';
import type { HolidayPageData, HolidayTripIdea } from './templates/holidayPage.js';

/** Flights up to this long suit a 3–4 day break. */
const SHORT_TRIP_MAX_MIN = 210;

export function buildHolidayPageData(year: number): HolidayPageData | null {
  const cal = TW_OFFICE_CALENDARS[year];
  if (!cal) return null;

  const ideas: Array<HolidayTripIdea & { minDurationMin: number }> = [];
  for (const route of KNOWN_ROUTES) {
    const summary = summarizeRouteFlights(ROUTE_FLIGHT_SNAPSHOTS[route.slug]);
    if (!summary) continue;
    ideas.push({
      slug: route.slug,
      label: `${route.fromDisplay} → ${route.toDisplay}`,
      durationText: `${formatDurationZh(summary.minDurationMin)}起`,
      minPrice: summary.minPrice,
      minDurationMin: summary.minDurationMin,
    });
  }
  ideas.sort((a, b) => a.minDurationMin - b.minDurationMin);
  const strip = ({ minDurationMin: _m, ...idea }: (typeof ideas)[number]): HolidayTripIdea => idea;

  return {
    facts: buildHolidayYearFacts(cal),
    sourcePage: cal.sourcePage,
    sourceUrl: cal.sourceUrl,
    shortTrips: ideas.filter((i) => i.minDurationMin <= SHORT_TRIP_MAX_MIN).map(strip),
    longTrips: ideas.filter((i) => i.minDurationMin > SHORT_TRIP_MAX_MIN).map(strip),
  };
}

export async function buildRouteData(slug: string, repo: AppRepository): Promise<RouteData | null> {
  const route = getRouteBySlug(slug);
  if (!route) return null;

  const rows = await repo.getRouteSearchDemand(route.fromVariants, route.toVariants);

  const monthly: MonthlyDemand[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: 0,
  }));

  for (const row of rows) {
    const idx = row.month - 1;
    if (idx >= 0 && idx < 12) monthly[idx].count = row.count;
  }

  const totalSearches = monthly.reduce((s, m) => s + m.count, 0);
  const nonZero = monthly.filter((m) => m.count > 0);

  const peakMonth = nonZero.length > 0
    ? nonZero.reduce((a, b) => (b.count > a.count ? b : a)).month
    : null;

  const lowMonth = nonZero.length > 0
    ? nonZero.reduce((a, b) => (b.count < a.count ? b : a)).month
    : null;

  return {
    slug,
    fromCode: route.fromCode,
    toCode: route.toCode,
    fromDisplay: route.fromDisplay,
    toDisplay: route.toDisplay,
    monthly,
    totalSearches,
    peakMonth,
    lowMonth,
    destinationSlug: route.destinationSlug,
    flightSummary: summarizeRouteFlights(ROUTE_FLIGHT_SNAPSHOTS[slug]),
    timeDifference: timeDifferenceFromTaiwanZh(route.toCode),
  };
}

export async function buildDestinationData(slug: string, repo: AppRepository): Promise<DestinationData | null> {
  const dest = getDestinationBySlug(slug);
  if (!dest) return null;

  const rows = await repo.getPublicTripsByDestination(dest.dbVariants);

  // Group rows by trip id
  const tripMap = new Map<string, PublicTrip>();
  for (const row of rows) {
    if (!tripMap.has(row.id)) {
      tripMap.set(row.id, { id: row.id, name: row.name, forkCount: row.fork_count, nodes: [] });
    }
    tripMap.get(row.id)!.nodes.push({
      day: row.day,
      time: row.time ?? null,
      title: row.title,
      category: row.category ?? null,
      description: row.description ?? null,
    });
  }

  const trips = Array.from(tripMap.values());

  // Top 5 unique spot titles across all trips
  const titleCounts = new Map<string, number>();
  for (const trip of trips) {
    for (const node of trip.nodes) {
      titleCounts.set(node.title, (titleCounts.get(node.title) ?? 0) + 1);
    }
  }
  const popularSpots = [...titleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title]) => title);

  return {
    slug,
    displayName: dest.displayName,
    trips,
    popularSpots,
  };
}
