import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildSitemapEntries, renderSitemapXml, GUIDE_LASTMOD, toLastmod } from '../templates/sitemap.js';
import { SITE_ORIGIN } from '../utils.js';

const empty = { routeSearches: [], publicTrips: [] };
const find = (entries: ReturnType<typeof buildSitemapEntries>, p: string) => entries.find((e) => e.loc === `${SITE_ORIGIN}${p}`);

test('/pricing is not in the sitemap', () => {
  assert.equal(find(buildSitemapEntries(empty), '/pricing'), undefined);
});

test('no entry claims today as lastmod without data', () => {
  const today = new Date().toISOString().slice(0, 10);
  const entries = buildSitemapEntries(empty);
  for (const e of entries) {
    if (e.lastmod) assert.notEqual(e.lastmod, today, `${e.loc} has today's date with no data`);
  }
  assert.equal(find(entries, '/')?.lastmod, undefined);
  assert.equal(find(entries, '/fly/tpe-nrt/')?.lastmod, undefined);
  assert.equal(find(entries, '/trips/tokyo/')?.lastmod, undefined);
  assert.ok(!renderSitemapXml(entries).includes(`<lastmod>${today}</lastmod>`));
});

test('guide lastmod matches each page\'s JSON-LD dateModified', () => {
  for (const [slug, lastmod] of Object.entries(GUIDE_LASTMOD)) {
    const html = fs.readFileSync(path.join(process.cwd(), 'public', 'guide', slug, 'index.html'), 'utf-8');
    const m = html.match(/"dateModified":\s*"([^"]+)"/);
    assert.ok(m, `${slug} has no dateModified`);
    assert.equal(lastmod, m![1].slice(0, 10), `${slug}: bump GUIDE_LASTMOD with dateModified`);
  }
});

test('route lastmod is the newest search across that route\'s variants', () => {
  const entries = buildSitemapEntries({
    routeSearches: [
      { from: '台北', to: '東京', lastSeen: new Date('2026-10-01T10:00:00Z') },
      { from: 'TPE', to: 'NRT', lastSeen: '2026-10-20T03:00:00Z' },
      { from: 'Nowhere', to: 'NRT', lastSeen: '2026-11-01T00:00:00Z' },
    ],
    publicTrips: [],
  });
  assert.equal(find(entries, '/fly/tpe-nrt/')?.lastmod, '2026-10-20');
});

test('destination and trip lastmod come from public trip changes', () => {
  const entries = buildSitemapEntries({
    routeSearches: [],
    publicTrips: [
      { id: 'trip_a', destination: '東京', lastModified: new Date('2026-09-01T00:00:00Z') },
      { id: 'trip_b', destination: 'Tokyo', lastModified: '2026-09-15T00:00:00Z' },
      { id: 'legacy', destination: '東京', lastModified: '2026-10-30T00:00:00Z' },
    ],
  });
  assert.equal(find(entries, '/trips/trip_a')?.lastmod, '2026-09-01');
  assert.equal(find(entries, '/trips/trip_b')?.lastmod, '2026-09-15');
  assert.equal(find(entries, '/trips/legacy'), undefined, 'non trip_ ids are not listed');
  // the destination page still reflects every public trip it shows
  assert.equal(find(entries, '/trips/tokyo/')?.lastmod, '2026-10-30');
});

test('toLastmod tolerates bad input', () => {
  assert.equal(toLastmod(null), undefined);
  assert.equal(toLastmod('not a date'), undefined);
});
