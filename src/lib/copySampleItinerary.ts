// Copies a sample itinerary (src/data/sampleItineraries.ts) into a new trip
// for the signed-in user. Entry point: the "複製到我的行程" link on the
// /trips/{city}/{n}-days/ SEO pages, which opens /?template={id}.
import { createTrip, geocodeSpot, syncItinerary } from './workflowApi';
import type { SampleItinerary, SampleStopCategory } from '../data/sampleItineraries';

const PENDING_KEY = 'roamjelly.pendingTemplate';
const TEMPLATE_ID = /^[a-z0-9-]{1,64}$/;
const EMOJI: Record<SampleStopCategory, string> = { spot: '📍', food: '🍜', shopping: '🛍️', transport: '🚆' };
const GEOCODE_CONCURRENCY = 4;

/**
 * The template id to copy, from `?template=` (removed from the address bar)
 * or from a copy that was waiting for the user to sign in.
 */
export function takeTemplateRequest(): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get('template');
  if (fromUrl !== null) {
    url.searchParams.delete('template');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    if (TEMPLATE_ID.test(fromUrl)) return fromUrl;
  }
  try {
    const pending = window.sessionStorage.getItem(PENDING_KEY);
    return pending && TEMPLATE_ID.test(pending) ? pending : null;
  } catch {
    return null;
  }
}

/** Keep the request across the sign-in flow. */
export function deferTemplateRequest(id: string): void {
  try {
    window.sessionStorage.setItem(PENDING_KEY, id);
  } catch {
    /* private mode: the user can click the link again after signing in */
  }
}

export function clearTemplateRequest(): void {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export function sampleToNodes(it: SampleItinerary, idPrefix: string) {
  let order = 0;
  return it.dayPlans.flatMap((d) =>
    d.stops.map((s) => {
      order += 1;
      return {
        node_id: `${idPrefix}_${order}`,
        day: d.day,
        time: s.time,
        title: s.title,
        emoji: EMOJI[s.category],
        category: s.category,
        description: s.note ?? '',
        sort_order: order,
        source: 'local' as const,
        place: s.place,
      };
    }),
  );
}

/** Creates the trip and its nodes; resolves to the new trip id. */
export async function copySampleItinerary(templateId: string): Promise<{ tripId: string; title: string } | null> {
  const { getSampleItinerary } = await import('../data/sampleItineraries');
  const it = getSampleItinerary(templateId);
  if (!it) return null;

  const trip = await createTrip({ name: it.title, destination: it.city });
  const tripId = String(trip.id);
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const nodes = sampleToNodes(it, `node_tpl_${suffix}`);

  const coords = await mapLimit(nodes, GEOCODE_CONCURRENCY, (n) => geocodeSpot(n.place, it.city).catch(() => null));
  const results = await Promise.allSettled(
    nodes.map(({ place: _place, ...n }, i) =>
      syncItinerary({ trip_id: tripId, action: 'add_node', payload: { ...n, ...(coords[i] ?? {}) } }),
    ),
  );
  if (results.some((r) => r.status === 'rejected')) throw new Error('template copy incomplete');
  return { tripId, title: it.title };
}
