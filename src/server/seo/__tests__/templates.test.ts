// src/server/seo/__tests__/templates.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoutePage } from '../templates/routePage.js';
import type { RouteData } from '../types.js';

const sampleRoute: RouteData = {
  slug: 'tpe-nrt',
  fromCode: 'TPE',
  toCode: 'NRT',
  fromDisplay: '台北',
  toDisplay: '東京',
  monthly: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: i === 6 ? 120 : 40 })),
  totalSearches: 560,
  peakMonth: 7,
  lowMonth: 1,
  destinationSlug: 'tokyo',
};

test('buildRoutePage returns a string containing the target keyword', () => {
  const html = buildRoutePage(sampleRoute);
  assert.ok(typeof html === 'string');
  assert.ok(html.includes('台北'), 'missing 台北');
  assert.ok(html.includes('東京'), 'missing 東京');
  assert.ok(html.includes('TPE'), 'missing fromCode');
  assert.ok(html.includes('NRT'), 'missing toCode');
});

test('buildRoutePage includes peak month reference', () => {
  const html = buildRoutePage(sampleRoute);
  assert.ok(html.includes('7'), 'peak month 7 not in output');
});

test('buildRoutePage includes registration CTA', () => {
  const html = buildRoutePage(sampleRoute);
  assert.ok(html.includes('/'), 'missing CTA link');
  assert.ok(html.toLowerCase().includes('登入') || html.toLowerCase().includes('免費'), 'missing CTA text');
});

test('buildRoutePage is valid HTML structure', () => {
  const html = buildRoutePage(sampleRoute);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<html lang="zh-TW">'));
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('</html>'));
});

import { buildDestinationPage } from '../templates/destinationPage.js';
import type { DestinationData } from '../types.js';

const sampleDest: DestinationData = {
  slug: 'tokyo',
  displayName: '東京',
  trips: [
    {
      id: 'trip1',
      name: '東京散策',
      forkCount: 42,
      nodes: [
        { day: 1, time: '10:00', title: '淺草寺', category: 'spot', description: '東京著名神社' },
        { day: 1, time: '14:00', title: '上野公園', category: 'spot', description: null },
        { day: 2, time: '09:00', title: '新宿御苑', category: 'spot', description: null },
      ],
    },
  ],
  popularSpots: ['淺草寺', '上野公園', '新宿御苑'],
};

test('buildDestinationPage returns valid HTML with destination name', () => {
  const html = buildDestinationPage(sampleDest);
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('東京'));
  assert.ok(html.includes('淺草寺'));
});

test('buildDestinationPage includes registration CTA', () => {
  const html = buildDestinationPage(sampleDest);
  assert.ok(html.includes('免費') || html.includes('登入'));
});
