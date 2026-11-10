// src/server/seo/__tests__/routeFlightFacts.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collapseCodeshares,
  formatDurationRangeZh,
  formatDurationZh,
  isLowCostAirline,
  parseDurationMin,
  summarizeRouteFlights,
  timeDifferenceFromTaiwanZh,
  type RouteFlightRow,
} from '../routeFlightFacts.js';
import { buildRoutePage } from '../templates/routePage.js';
import type { RouteData } from '../types.js';

const row = (over: Partial<RouteFlightRow>): RouteFlightRow => ({
  airline: '中華航空',
  flightNumber: 'CI110',
  departure: '06:50',
  arrival: '10:00',
  durationMin: 130,
  price: 10962,
  departureDate: '2026-12-01',
  ...over,
});

// Shape of a real TPE→FUK scrape (2026-11-10), incl. an ANA codeshare on EVA's BR106.
const TPE_FUK: RouteFlightRow[] = [
  row({}),
  row({ flightNumber: 'CI116', departure: '16:25', arrival: '19:35', price: 13774 }),
  row({ airline: '長榮航空', flightNumber: 'BR106', departure: '08:00', arrival: '11:15', durationMin: 135, price: 10065 }),
  row({ airline: '長榮航空', flightNumber: 'BR102', departure: '16:25', arrival: '19:55', durationMin: 150, price: 8562 }),
  row({ airline: '全日空航空', flightNumber: 'NH5820', departure: '08:00', arrival: '11:15', durationMin: 135, price: 9800 }),
  row({ airline: '臺灣虎航', flightNumber: 'IT240', departure: '06:45', arrival: '10:00', durationMin: 135, price: 6739 }),
  row({ airline: '馬來西亞亞洲航空公司', flightNumber: 'AK1510', departure: '12:00', arrival: '15:20', durationMin: 140, price: 5593, departureDate: '2026-12-25' }),
];

test('parseDurationMin reads the scraper format', () => {
  assert.equal(parseDurationMin('2h 15m'), 135);
  assert.equal(parseDurationMin('3h 0m'), 180);
  assert.equal(parseDurationMin('45m'), 45);
  assert.equal(parseDurationMin('--'), null);
  assert.equal(parseDurationMin(undefined), null);
});

test('durations print in Chinese and collapse equal ranges', () => {
  assert.equal(formatDurationZh(135), '2 小時 15 分');
  assert.equal(formatDurationZh(120), '2 小時');
  assert.equal(formatDurationRangeZh(130, 150), '2 小時 10 分至2 小時 30 分');
  assert.equal(formatDurationRangeZh(130, 130), '2 小時 10 分');
});

test('low-cost carriers are recognised by name', () => {
  assert.ok(isLowCostAirline('臺灣虎航'));
  assert.ok(isLowCostAirline('馬來西亞亞洲航空公司'));
  assert.ok(isLowCostAirline('樂桃航空'));
  assert.ok(!isLowCostAirline('中華航空'));
  assert.ok(!isLowCostAirline('星宇航空'));
});

test('a codeshare listed under a partner airline collapses onto the operating airline', () => {
  const flights = collapseCodeshares(TPE_FUK);
  assert.equal(flights.length, TPE_FUK.length - 1);
  assert.ok(!flights.some((f) => f.airline === '全日空航空'), 'ANA codeshare should be dropped');
  assert.ok(flights.some((f) => f.flightNumber === 'BR106'));
});

const NOW = new Date('2026-11-12T00:00:00Z');

test('summarizeRouteFlights states duration range, airlines, low-cost split and cheapest fare', () => {
  const s = summarizeRouteFlights({ slug: 'tpe-fuk', fetchedAt: '2026-11-10T03:00:00.000Z', flights: TPE_FUK }, NOW);
  assert.ok(s);
  assert.equal(s.minDurationMin, 130);
  assert.equal(s.maxDurationMin, 150);
  assert.equal(s.flightCount, 6);
  assert.deepEqual(s.lowCostAirlines.sort(), ['臺灣虎航', '馬來西亞亞洲航空公司'].sort());
  assert.deepEqual(s.fullServiceAirlines.sort(), ['中華航空', '長榮航空'].sort());
  assert.equal(s.minPrice, 5593);
  assert.equal(s.minPriceDate, '2026-12-25');
  assert.deepEqual(s.flights.map((f) => f.departure), ['06:45', '06:50', '08:00', '12:00', '16:25', '16:25']);
});

test('no usable nonstop flight means no summary (the page keeps its old layout)', () => {
  assert.equal(summarizeRouteFlights(undefined), null);
  assert.equal(summarizeRouteFlights({ slug: 'tpe-itm', fetchedAt: '2026-11-10T00:00:00Z', flights: [] }), null);
  assert.equal(
    summarizeRouteFlights({ slug: 'x', fetchedAt: '2026-11-10T00:00:00Z', flights: [row({ durationMin: 0 }), row({ price: 0 })] }),
    null,
  );
});

test('a snapshot the weekly refresh stopped updating is not shown', () => {
  const snapshot = { slug: 'tpe-fuk', fetchedAt: '2026-11-10T03:00:00.000Z', flights: TPE_FUK };
  assert.ok(summarizeRouteFlights(snapshot, new Date('2026-12-10T00:00:00Z')));
  assert.equal(summarizeRouteFlights(snapshot, new Date('2026-12-20T00:00:00Z')), null);
});

test('time difference from Taiwan', () => {
  assert.equal(timeDifferenceFromTaiwanZh('FUK'), '比台灣快 1 小時');
  assert.equal(timeDifferenceFromTaiwanZh('bkk'), '比台灣慢 1 小時');
  assert.equal(timeDifferenceFromTaiwanZh('HKG'), '與台灣沒有時差');
  assert.equal(timeDifferenceFromTaiwanZh('XXX'), null);
});

const baseRoute: RouteData = {
  slug: 'tpe-fuk',
  fromCode: 'TPE',
  toCode: 'FUK',
  fromDisplay: '台北',
  toDisplay: '福岡',
  monthly: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: i === 0 ? 2 : 0 })),
  totalSearches: 2,
  peakMonth: 1,
  lowMonth: 1,
  destinationSlug: 'fukuoka',
};

test('with flight facts the route page answers "飛多久" and lists the airlines', () => {
  const html = buildRoutePage({
    ...baseRoute,
    flightSummary: summarizeRouteFlights({ slug: 'tpe-fuk', fetchedAt: '2026-11-10T03:00:00.000Z', flights: TPE_FUK }, NOW),
    timeDifference: '比台灣快 1 小時',
  });
  assert.match(html, /<title>台北飛福岡多久？直飛航空公司、廉航與機票價格/);
  assert.ok(html.includes('2 小時 10 分至2 小時 30 分'));
  assert.ok(html.includes('臺灣虎航'));
  assert.ok(html.includes('福岡比台灣快 1 小時'));
  assert.ok(html.includes('NT$5,593'));
  assert.ok(html.includes('台北飛福岡有廉航嗎？'));
  assert.ok(!html.includes('NH5820'), 'codeshare row should not be listed');
  // 2 searches is too few to show the demand chart.
  assert.ok(!html.includes('每月搜尋熱度'));
});

test('without flight facts the route page keeps the search-demand layout', () => {
  const html = buildRoutePage({ ...baseRoute, flightSummary: null });
  assert.match(html, /<title>從台北飛福岡幾月最便宜？/);
  assert.ok(html.includes('每月搜尋熱度'));
  assert.ok(!html.includes('飛多久'));
});
