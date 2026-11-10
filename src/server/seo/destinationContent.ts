// src/server/seo/destinationContent.ts
// The fixed (non-UGC) content each destination has: sample itineraries,
// airport transfers and nonstop routes. Pages use it to cross-link, and to
// decide which sections and title wording they can honestly show.
import { AIRPORT_TRANSFERS, type AirportTransfer } from '../../data/airportTransfers.js';
import { ROUTE_FLIGHT_SNAPSHOTS } from '../../data/routeFlightFacts.js';
import { SAMPLE_ITINERARIES, type SampleItinerary } from '../../data/sampleItineraries.js';
import { KNOWN_DESTINATIONS, KNOWN_ROUTES, type KnownRoute } from './cities.js';
import { summarizeRouteFlights, type RouteFlightSummary } from './routeFlightFacts.js';

export interface DestinationRoute {
  route: KnownRoute;
  summary: RouteFlightSummary | null;
}

export interface DestinationContent {
  itineraries: SampleItinerary[];
  transfers: AirportTransfer[];
  routes: DestinationRoute[];
}

/** URL of a sample itinerary page: /trips/fukuoka/3-days/ */
export function itineraryPath(s: Pick<SampleItinerary, 'destinationSlug' | 'days'>): string {
  return `/trips/${s.destinationSlug}/${s.days}-days/`;
}

export function transferPath(t: Pick<AirportTransfer, 'slug'>): string {
  return `/airport/${t.slug}/`;
}

/** "3 天 2 夜" */
export function daysNightsZh(days: number): string {
  return `${days} 天 ${days - 1} 夜`;
}

export function getItineraryByPath(destinationSlug: string, segment: string): SampleItinerary | undefined {
  const m = /^(\d+)-days$/.exec(segment);
  if (!m) return undefined;
  return SAMPLE_ITINERARIES.find((s) => s.destinationSlug === destinationSlug && s.days === Number(m[1]));
}

export function getTransferBySlug(slug: string): AirportTransfer | undefined {
  return AIRPORT_TRANSFERS.find((t) => t.slug === slug);
}

export function destinationName(slug: string): string {
  return KNOWN_DESTINATIONS.find((d) => d.slug === slug)?.displayName ?? slug;
}

export function getDestinationContent(destinationSlug: string, now: Date = new Date()): DestinationContent {
  return {
    itineraries: SAMPLE_ITINERARIES.filter((s) => s.destinationSlug === destinationSlug).sort((a, b) => a.days - b.days),
    transfers: AIRPORT_TRANSFERS.filter((t) => t.destinationSlug === destinationSlug),
    routes: KNOWN_ROUTES.filter((r) => r.destinationSlug === destinationSlug).map((route) => ({
      route,
      summary: summarizeRouteFlights(ROUTE_FLIGHT_SNAPSHOTS[route.slug], now),
    })),
  };
}

/** Transfers that start at the airport a route flies into. */
export function transfersForAirport(airportCode: string): AirportTransfer[] {
  return AIRPORT_TRANSFERS.filter((t) => t.airportCode === airportCode.toUpperCase());
}
