// src/server/seo/__tests__/cities.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { getRouteBySlug, getDestinationBySlug, KNOWN_ROUTES, KNOWN_DESTINATIONS } from '../cities.js';

test('getRouteBySlug returns route for valid slug', () => {
  const r = getRouteBySlug('tpe-nrt');
  assert.ok(r);
  assert.equal(r.fromCode, 'TPE');
  assert.equal(r.toCode, 'NRT');
  assert.equal(r.fromDisplay, '台北');
  assert.equal(r.toDisplay, '東京');
});

test('getRouteBySlug returns undefined for unknown slug', () => {
  assert.equal(getRouteBySlug('xyz-abc'), undefined);
});

test('every route in KNOWN_ROUTES has non-empty fromVariants and toVariants', () => {
  for (const r of KNOWN_ROUTES) {
    assert.ok(r.fromVariants.length > 0, `${r.slug} missing fromVariants`);
    assert.ok(r.toVariants.length > 0, `${r.slug} missing toVariants`);
  }
});

test('getDestinationBySlug returns destination for valid slug', () => {
  const d = getDestinationBySlug('tokyo');
  assert.ok(d);
  assert.equal(d.displayName, '東京');
  assert.ok(d.dbVariants.includes('東京'));
});

test('getDestinationBySlug returns undefined for unknown slug', () => {
  assert.equal(getDestinationBySlug('atlantis'), undefined);
});

test('every destination has at least one dbVariant', () => {
  for (const d of KNOWN_DESTINATIONS) {
    assert.ok(d.dbVariants.length > 0, `${d.slug} missing dbVariants`);
  }
});
