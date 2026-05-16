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
