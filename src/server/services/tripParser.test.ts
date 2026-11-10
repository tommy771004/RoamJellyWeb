import test from 'node:test';
import assert from 'node:assert/strict';

import { parseJourneyResponses, resolveIataCode } from './tripParser';

const URL = 'https://tw.trip.com/flights/tyo-to-tpe/?flighttype=ow&ddate=2026-12-15';

/** One streamed FlightMiddleSearch response, trimmed to the fields the parser reads. */
function journeyResponse(opts: {
  flightNos: string[];
  airline: string;
  depart: string;
  arrive: string;
  duration: number;
  fares: number[];
}) {
  return {
    url: 'https://tw.trip.com/restapi/soa2/27015/FlightMiddleSearch',
    data: {
      head: { retCode: 'SUCCESS' },
      basicInfo: { currency: 'TWD' },
      journeyList: [
        {
          duration: opts.duration,
          transportList: opts.flightNos.map((flightNo, i) => ({
            flight: { flightNo, airlineInfo: { name: opts.airline } },
            departPoint: { airPort: { airportCode: i === 0 ? 'NRT' : 'HKG' } },
            arrivePoint: { airPort: { airportCode: i === opts.flightNos.length - 1 ? 'TPE' : 'HKG' } },
            dateInfo: {
              departDate: i === 0 ? `2026-12-15 ${opts.depart}:00` : '2026-12-15 13:00:00',
              arriveDate: i === opts.flightNos.length - 1 ? `2026-12-15 ${opts.arrive}:00` : '2026-12-15 12:00:00',
            },
          })),
        },
      ],
      policyList: opts.fares.map((totalPrice) => ({
        gradeInfoList: [{ flightNo: opts.flightNos[0] }],
        price: { totalPrice },
      })),
    },
  };
}

test('parseJourneyResponses keeps the cheapest fare per flight, cheapest first', () => {
  const rows = parseJourneyResponses(
    [
      journeyResponse({ flightNos: ['BR197'], airline: '長榮航空', depart: '14:00', arrive: '17:05', duration: 245, fares: [8308, 13902] }),
      journeyResponse({ flightNos: ['GK013'], airline: '捷星日本', depart: '08:30', arrive: '11:50', duration: 260, fares: [5429, 3819, 4826] }),
      // The same flight streamed again with a pricier fare must not replace it.
      journeyResponse({ flightNos: ['GK013'], airline: '捷星日本', depart: '08:30', arrive: '11:50', duration: 260, fares: [4500] }),
    ],
    URL,
    '東京',
    '台北',
    '2026-12-15',
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.price), [3819, 8308]);
  assert.equal(rows[0].id, 'tripcom_2026-12-15_GK013');
  assert.deepEqual(rows[0].details, {
    airline: '捷星日本',
    departure: '08:30',
    arrival: '11:50',
    stops: 0,
    duration: '4h 20m',
    flightNumber: 'GK013',
    depCode: 'NRT',
    arrCode: 'TPE',
  });
  assert.equal(rows[0].affiliate_url, URL);
  assert.equal(rows[0].title, '東京 → 台北 · 直飛');
});

test('parseJourneyResponses reads connections from first departure to last arrival', () => {
  const [row] = parseJourneyResponses(
    [journeyResponse({ flightNos: ['CX501', 'CX400'], airline: '國泰航空', depart: '09:10', arrive: '18:30', duration: 620, fares: [9900] })],
    URL,
    '東京',
    '台北',
    '2026-12-15',
  );

  assert.equal(row.details.stops, 1);
  assert.equal(row.details.departure, '09:10');
  assert.equal(row.details.arrival, '18:30');
  assert.equal(row.details.flightNumber, 'CX501 / CX400');
  assert.equal(row.details.duration, '10h 20m');
  assert.equal(row.title, '東京 → 台北 · 1 轉');
});

test('parseJourneyResponses skips journeys without a fare', () => {
  const rows = parseJourneyResponses(
    [journeyResponse({ flightNos: ['MM621'], airline: '樂桃航空', depart: '12:40', arrive: '16:05', duration: 265, fares: [] })],
    URL,
    '東京',
    '台北',
    '2026-12-15',
  );
  assert.deepEqual(rows, []);
});

/** The FlightListSearchSSE event, trimmed to the fields the parser reads. */
function sseList(itineraries: Array<{ flightNos: string[]; airlineCode: string; depart: string; arrive: string; duration: number; fares: number[] }>) {
  return {
    url: 'https://tw.trip.com/restapi/soa2/27015/FlightListSearchSSE',
    data: {
      basicInfo: { currency: 'TWD' },
      airlineList: [
        { code: 'GK', name: '捷星日本' },
        { code: 'BR', name: '長榮航空' },
      ],
      itineraryList: itineraries.map((it) => ({
        journeyList: [
          {
            duration: it.duration,
            transSectionList: it.flightNos.map((flightNo, i) => ({
              departDateTime: i === 0 ? `2026-12-15 ${it.depart}:00` : '2026-12-15 13:00:00',
              arriveDateTime: i === it.flightNos.length - 1 ? `2026-12-15 ${it.arrive}:00` : '2026-12-15 12:00:00',
              departPoint: { airportCode: i === 0 ? 'NRT' : 'HKG' },
              arrivePoint: { airportCode: i === it.flightNos.length - 1 ? 'TPE' : 'HKG' },
              flightInfo: { flightNo, airlineCode: it.airlineCode },
            })),
          },
        ],
        policies: it.fares.map((fare) => ({ price: { totalPrice: fare - 40, adult: { totalPrice: fare } } })),
      })),
    },
  };
}

test('parseJourneyResponses prefers the SSE list, keeps Trip.com order and per-adult price', () => {
  const rows = parseJourneyResponses(
    [
      // A per-flight response that arrived too — ignored once the full list is there.
      journeyResponse({ flightNos: ['MM621'], airline: '樂桃航空', depart: '12:40', arrive: '16:05', duration: 265, fares: [1000] }),
      sseList([
        { flightNos: ['BR197'], airlineCode: 'BR', depart: '14:00', arrive: '17:05', duration: 245, fares: [8310] },
        { flightNos: ['GK013'], airlineCode: 'GK', depart: '08:30', arrive: '11:50', duration: 260, fares: [3820, 4500] },
      ]),
    ],
    URL,
    '東京',
    '台北',
    '2026-12-15',
  );

  assert.deepEqual(rows.map((r) => r.details.flightNumber), ['BR197', 'GK013']);
  assert.equal(rows[1].price, 3820);
  assert.equal(rows[1].details.airline, '捷星日本');
  assert.equal(rows[1].details.depCode, 'NRT');
  assert.equal(rows[1].details.arrCode, 'TPE');
});

test('parseJourneyResponses marks next-day arrivals', () => {
  const list = sseList([
    { flightNos: ['TR873'], airlineCode: 'GK', depart: '22:55', arrive: '00:35', duration: 160, fares: [4392] },
    { flightNos: ['GK013'], airlineCode: 'GK', depart: '08:30', arrive: '11:50', duration: 260, fares: [3820] },
  ]);
  // The overnight flight lands on the 16th.
  list.data.itineraryList[0].journeyList[0].transSectionList[0].arriveDateTime = '2026-12-16 00:35:00';

  const [overnight, sameDay] = parseJourneyResponses([list], URL, '東京', '台北', '2026-12-15');
  assert.equal(overnight.details.arrival, '00:35');
  assert.equal(overnight.details.arrivalDayOffset, 1);
  assert.equal('arrivalDayOffset' in sameDay.details, false);
});

test('parseJourneyResponses caps the SSE list at 10 rows', () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    flightNos: [`GK${100 + i}`], airlineCode: 'GK', depart: '08:30', arrive: '11:50', duration: 260, fares: [4000 + i],
  }));
  assert.equal(parseJourneyResponses([sseList(many)], URL, '東京', '台北', '2026-12-15').length, 10);
});

test('resolveIataCode maps zh/en place names and keeps codes', () => {
  assert.equal(resolveIataCode('台北'), 'tpe');
  assert.equal(resolveIataCode('東京'), 'tyo');
  assert.equal(resolveIataCode('Seoul'), 'sel');
  assert.equal(resolveIataCode('NRT'), 'nrt');
});
