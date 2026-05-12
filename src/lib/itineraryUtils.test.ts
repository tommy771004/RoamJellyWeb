import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignDaysBasedOnTimeAndOrder,
  buildTimestampFromDateTime,
  getDateForDay,
  getDayForDate,
  sortNodesForDisplay,
} from './itineraryUtils';

test('getDateForDay returns a stable YYYY-MM-DD string from trip start date', () => {
  assert.equal(getDateForDay(1, '2026-05-10'), '2026-05-10');
  assert.equal(getDateForDay(3, '2026-05-10'), '2026-05-12');
});

test('getDayForDate derives the correct trip day from a start date', () => {
  assert.equal(getDayForDate('2026-05-10', '2026-05-10', 1), 1);
  assert.equal(getDayForDate('2026-05-12', '2026-05-10', 1), 3);
  assert.equal(getDayForDate(undefined, '2026-05-10', 4), 4);
});

test('buildTimestampFromDateTime combines date and time into an ISO timestamp', () => {
  assert.match(buildTimestampFromDateTime('2026-05-10', '09:30') ?? '', /^2026-05-10T09:30:00/);
  assert.equal(buildTimestampFromDateTime(undefined, '09:30'), undefined);
});

test('assignDaysBasedOnTimeAndOrder fills date, timestamp, and sort order while splitting days on time reset', () => {
  const nodes = assignDaysBasedOnTimeAndOrder(
    [
      { node_id: 'a', time: '09:00', title: 'Breakfast', category: 'food', emoji: '🍳' },
      { node_id: 'b', time: '14:00', title: 'Museum', category: 'landmark', emoji: '🏛️' },
      { node_id: 'c', time: '08:30', title: 'Next Day Start', category: 'other', emoji: '📍' },
    ],
    '2026-05-10',
  );

  assert.deepEqual(
    nodes.map((node) => ({
      node_id: node.node_id,
      day: node.day,
      date: node.date,
      sort_order: node.sort_order,
    })),
    [
      { node_id: 'a', day: 1, date: '2026-05-10', sort_order: 1 },
      { node_id: 'b', day: 1, date: '2026-05-10', sort_order: 2 },
      { node_id: 'c', day: 2, date: '2026-05-11', sort_order: 1 },
    ],
  );

  assert.match(nodes[0].timestamp ?? '', /^2026-05-10T09:00:00/);
  assert.match(nodes[2].timestamp ?? '', /^2026-05-11T08:30:00/);
});

test('sortNodesForDisplay prefers explicit time before sort order', () => {
  const sorted = sortNodesForDisplay([
    { node_id: 'b', day: 1, time: '09:00', sort_order: 2, title: 'B', emoji: '📍', category: 'other', source: 'local' },
    { node_id: 'a', day: 1, time: '12:00', sort_order: 1, title: 'A', emoji: '📍', category: 'other', source: 'local' },
  ]);

  assert.deepEqual(sorted.map((node) => node.node_id), ['b', 'a']);
});
