// src/server/seo/templates/sitemap.ts
//
// lastmod policy: only emit a date we can back up. Google ignores lastmod on a
// site once it learns the values are not trustworthy (e.g. "always today"), so
// pages whose content has no tracked modification time get no lastmod at all.
//   - guides:               the page's own JSON-LD dateModified (GUIDE_LASTMOD)
//   - /fly/{route}/:        when the route's flight facts were scraped; else the newest
//                           search for that route in the 12-month window
//   - /airport/{slug}/:     the transfer data's verifiedAt
//   - /trips/{city}/{n}-days/: the itinerary's reviewedAt (drafts are left out)
//   - /trips/{city}/:       newest change among public trips for that destination
//   - /trips/trip_*:        newest of trip creation / itinerary-node creation
//   - /, hubs, guide index, /holidays/{year}/: omitted (static or untracked)
// /pricing is deliberately absent: it has no pricing content of its own yet.
import { KNOWN_ROUTES, KNOWN_DESTINATIONS } from '../cities.js';
import { HOLIDAY_YEARS } from '../longWeekends.js';
import { AIRPORT_TRANSFERS } from '../../../data/airportTransfers.js';
import { ROUTE_FLIGHT_SNAPSHOTS } from '../../../data/routeFlightFacts.js';
import { SAMPLE_ITINERARIES } from '../../../data/sampleItineraries.js';
import { itineraryPath, transferPath } from '../destinationContent.js';
import { summarizeRouteFlights, type RouteFlightSnapshot } from '../routeFlightFacts.js';
import { SITE_ORIGIN } from '../utils.js';
import type { AppRepository } from '../../repositories/appRepository.js';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: string;
}

/** Must equal the `dateModified` in each guide's JSON-LD (enforced by test). Bump both together. */
export const GUIDE_LASTMOD: Record<string, string> = {
  'collaborative-itinerary-planner': '2026-05-10',
  'taiwan-travel-planner': '2026-05-10',
  'group-travel-expense-splitting': '2026-05-10',
};

export interface RouteSearchLastSeen {
  from: string;
  to: string;
  lastSeen: Date | string | null;
}

export interface PublicTripLastModified {
  id: string;
  destination: string | null;
  lastModified: Date | string | null;
}

export interface SitemapLastmodSource {
  routeSearches: RouteSearchLastSeen[];
  publicTrips: PublicTripLastModified[];
  /** Flight-fact snapshots per route slug; defaults to the committed data file. */
  routeFacts?: Record<string, RouteFlightSnapshot>;
}

export function toLastmod(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function maxDate(values: (string | undefined)[]): string | undefined {
  const sorted = values.filter((v): v is string => !!v).sort();
  return sorted[sorted.length - 1];
}

export function buildSitemapEntries(source: SitemapLastmodSource): SitemapEntry[] {
  const base = SITE_ORIGIN;
  const entries: SitemapEntry[] = [
    { loc: `${base}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${base}/guide/`, changefreq: 'monthly', priority: '0.8' },
    ...Object.entries(GUIDE_LASTMOD).map(([slug, lastmod]): SitemapEntry => ({
      loc: `${base}/guide/${slug}`,
      lastmod,
      changefreq: 'monthly',
      priority: '0.7',
    })),
    { loc: `${base}/fly/`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${base}/trips/`, changefreq: 'weekly', priority: '0.9' },
    ...HOLIDAY_YEARS.map((year): SitemapEntry => ({ loc: `${base}/holidays/${year}/`, changefreq: 'monthly', priority: '0.8' })),
  ];

  if (AIRPORT_TRANSFERS.length > 0) {
    entries.push({ loc: `${base}/airport/`, changefreq: 'monthly', priority: '0.7' });
    for (const t of AIRPORT_TRANSFERS) {
      entries.push({ loc: `${base}${transferPath(t)}`, lastmod: t.verifiedAt, changefreq: 'monthly', priority: '0.8' });
    }
  }

  for (const it of SAMPLE_ITINERARIES) {
    if (!it.reviewedAt) continue;
    entries.push({ loc: `${base}${itineraryPath(it)}`, lastmod: it.reviewedAt, changefreq: 'monthly', priority: '0.8' });
  }

  for (const r of KNOWN_ROUTES) {
    const facts = summarizeRouteFlights((source.routeFacts ?? ROUTE_FLIGHT_SNAPSHOTS)[r.slug]);
    const lastmod = facts ? toLastmod(facts.fetchedAt) : maxDate(
      source.routeSearches
        .filter((s) => r.fromVariants.includes(s.from) && r.toVariants.includes(s.to))
        .map((s) => toLastmod(s.lastSeen)),
    );
    entries.push({ loc: `${base}/fly/${r.slug}/`, lastmod, changefreq: 'daily', priority: '0.8' });
  }

  for (const d of KNOWN_DESTINATIONS) {
    const lastmod = maxDate(
      source.publicTrips
        .filter((t) => t.destination != null && d.dbVariants.includes(t.destination))
        .map((t) => toLastmod(t.lastModified)),
    );
    entries.push({ loc: `${base}/trips/${d.slug}/`, lastmod, changefreq: 'weekly', priority: '0.8' });
  }

  for (const t of source.publicTrips) {
    if (!String(t.id).startsWith('trip_')) continue;
    entries.push({
      loc: `${base}/trips/${encodeURIComponent(t.id)}`,
      lastmod: toLastmod(t.lastModified),
      changefreq: 'weekly',
      priority: '0.7',
    });
  }

  return entries;
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderSitemapXml(entries: SitemapEntry[]): string {
  const xmlUrls = entries
    .map((e) => {
      const lines = [`    <loc>${escXml(e.loc)}</loc>`];
      if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority) lines.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${lines.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlUrls}\n</urlset>`;
}

export async function buildSitemapXml(repo: AppRepository): Promise<string> {
  const [routeSearches, publicTrips] = await Promise.all([
    repo
      .getRouteSearchLastSeen(
        [...new Set(KNOWN_ROUTES.flatMap((r) => r.fromVariants))],
        [...new Set(KNOWN_ROUTES.flatMap((r) => r.toVariants))],
      )
      .catch((err) => {
        console.error('[seo] sitemap route lastmod query failed, omitting route lastmod', err);
        return [] as RouteSearchLastSeen[];
      }),
    repo.getPublicTripsLastModified(1000).catch((err) => {
      console.error('[seo] sitemap public trips query failed, serving static entries', err);
      return [] as PublicTripLastModified[];
    }),
  ]);

  return renderSitemapXml(buildSitemapEntries({ routeSearches, publicTrips }));
}
