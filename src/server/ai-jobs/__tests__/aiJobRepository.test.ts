import assert from 'node:assert/strict';
import test from 'node:test';
import { buildItineraryRows } from '../../repositories/aiJobRepository';

const JOB_ID = '12345678-1234-1234-1234-123456789abc';

test('AI itinerary rows preserve enriched data and normalize unsafe values', () => {
  const rows = buildItineraryRows(JOB_ID, 'trip-1', {
    itinerary: [{
      day: 2,
      date: '2026-08-13',
      spots: [{
        time: '25:99',
        name: '  Shibuya Sky  ',
        category: 'landmark',
        emoji: '🌇',
        lat: 35.658,
        lng: 139.701,
        ai_note: 'Sunset view',
        transport_to_next: 'Walk 8 min',
        image_url: 'https://example.com/sky.jpg',
        attachments: [{ type: 'maps', url: 'https://maps.example' }],
      }],
    }],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'Shibuya Sky');
  assert.equal(rows[0].time, '10:00');
  assert.equal(rows[0].date, '2026-08-13');
  assert.equal(rows[0].lat, 35.658);
  assert.equal(rows[0].lng, 139.701);
  assert.deepEqual(rows[0].attachments, [{ type: 'maps', url: 'https://maps.example' }]);
});

test('AI itinerary rows reject an empty or structurally invalid result', () => {
  assert.throws(
    () => buildItineraryRows(JOB_ID, 'trip-1', { itinerary: [{ day: 1, spots: [] }] }),
    /AI_RESULT_HAS_NO_VALID_ITINERARY_NODES/,
  );
  assert.throws(
    () => buildItineraryRows(JOB_ID, 'trip-1', [{ day: 1, title: 'not a day object' }]),
    /AI_RESULT_HAS_NO_VALID_ITINERARY_NODES/,
  );
});

test('AI itinerary rows discard invalid coordinates instead of persisting them', () => {
  const [row] = buildItineraryRows(JOB_ID, 'trip-1', {
    itinerary: [{ day: 1, spots: [{ name: 'A place', lat: 190, lng: -400 }] }],
  });
  assert.equal(row.lat, null);
  assert.equal(row.lng, null);
});
