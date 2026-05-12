import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRegenerateSpotPrompt } from './aiItineraryService';

test('buildRegenerateSpotPrompt includes scheduling context, neighbors, and travel facts', () => {
  const prompt = buildRegenerateSpotPrompt({
    destination: 'Tokyo',
    day: 2,
    currentDate: '2026-05-12',
    currentTime: '14:00',
    currentTitle: '秋葉原',
    currentCategory: 'shopping',
    notes: '希望不要太宅，改成更優雅的區域',
    preserveTimeWindow: true,
    previousNode: { time: '11:30', title: '上野公園', category: 'nature' },
    nextNode: { time: '18:00', title: '淺草晚餐', category: 'food' },
    travelFactsContext: '[ID: fact_1] stay - Shinjuku Hotel',
  });

  assert.match(prompt, /Tokyo/);
  assert.match(prompt, /2026-05-12/);
  assert.match(prompt, /上野公園/);
  assert.match(prompt, /淺草晚餐/);
  assert.match(prompt, /Shinjuku Hotel/);
  assert.match(prompt, /盡量保留原本時間窗/);
});
