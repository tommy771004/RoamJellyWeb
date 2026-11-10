// src/server/seo/__tests__/siteLinks.test.ts
// Crawls every server-rendered SEO page through the real router and checks
// that each internal link opens, and that the hand-curated data is complete.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';

import { createSeoRouter } from '../router.js';
import { KNOWN_DESTINATIONS, KNOWN_ROUTES } from '../cities.js';
import { AIRPORT_TRANSFERS } from '../../../data/airportTransfers.js';
import { SAMPLE_ITINERARIES } from '../../../data/sampleItineraries.js';
import { HOLIDAY_YEARS } from '../longWeekends.js';
import { itineraryPath, transferPath } from '../destinationContent.js';

const fakeRepo = {
  getRouteSearchDemand: async () => [],
  getPublicTripsByDestination: async () => [],
  getRouteSearchLastSeen: async () => [],
  getPublicTripsLastModified: async () => [],
} as any;

/** Paths served by something other than the SEO router (SPA, static files, UGC trips). */
const servedElsewhere = (p: string) => p === '/' || p.startsWith('/?') || p.startsWith('/guide/') || /^\/trips\/trip_/.test(p);

test('every internal link on every SEO page opens', async () => {
  const app = express();
  app.use(createSeoRouter(fakeRepo));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const seeds = [
      '/fly/',
      '/trips/',
      '/airport/',
      ...KNOWN_ROUTES.map((r) => `/fly/${r.slug}/`),
      ...KNOWN_DESTINATIONS.map((d) => `/trips/${d.slug}/`),
      ...SAMPLE_ITINERARIES.map(itineraryPath),
      ...AIRPORT_TRANSFERS.map(transferPath),
      ...HOLIDAY_YEARS.map((y) => `/holidays/${y}/`),
    ];
    const seen = new Set<string>();
    const queue = [...seeds];
    const broken: string[] = [];
    while (queue.length > 0) {
      const p = queue.shift()!;
      if (seen.has(p)) continue;
      seen.add(p);
      const res = await fetch(base + p, { redirect: 'manual' });
      if (res.status !== 200) {
        broken.push(`${p} → ${res.status}`);
        continue;
      }
      const html = await res.text();
      for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
        const href = m[1].replace(/&amp;/g, '&');
        if (!servedElsewhere(href) && !seen.has(href)) queue.push(href);
      }
    }
    assert.deepEqual(broken, []);
    assert.ok(seen.size >= seeds.length);
  } finally {
    server.close();
  }
});

test('sample itineraries are internally consistent', () => {
  const ids = new Set<string>();
  for (const it of SAMPLE_ITINERARIES) {
    assert.ok(!ids.has(it.id), `duplicate id ${it.id}`);
    ids.add(it.id);
    assert.equal(it.id, `${it.destinationSlug}-${it.days}-days`);
    assert.ok(KNOWN_DESTINATIONS.some((d) => d.slug === it.destinationSlug), `${it.id}: unknown destination`);
    assert.deepEqual(it.dayPlans.map((d) => d.day), Array.from({ length: it.days }, (_, i) => i + 1), `${it.id}: day numbers`);
    for (const d of it.dayPlans) {
      assert.ok(d.stops.length >= 3, `${it.id} day ${d.day}: too few stops`);
      const times = d.stops.map((s) => s.time);
      assert.deepEqual([...times].sort(), times, `${it.id} day ${d.day}: stops out of time order`);
      for (const s of d.stops) assert.match(s.time, /^\d{2}:\d{2}$/);
    }
    if (it.reviewedAt) assert.match(it.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('every airport transfer option cites a source and a check date', () => {
  for (const t of AIRPORT_TRANSFERS) {
    assert.match(t.verifiedAt, /^\d{4}-\d{2}-\d{2}$/, `${t.slug}: verifiedAt`);
    assert.ok(KNOWN_DESTINATIONS.some((d) => d.slug === t.destinationSlug), `${t.slug}: unknown destination`);
    assert.ok(t.options.length > 0, `${t.slug}: no options`);
    for (const o of t.options) {
      assert.match(o.sourceUrl, /^https:\/\//, `${t.slug} / ${o.name}: sourceUrl`);
      assert.ok(o.durationMin > 0 && o.durationMin < 300, `${t.slug} / ${o.name}: duration`);
      if (o.fare) {
        assert.ok(o.fare.amount > 0, `${t.slug} / ${o.name}: fare amount`);
        assert.ok(o.fareQuote, `${t.slug} / ${o.name}: a fare needs the quoted source text`);
      }
    }
  }
});
