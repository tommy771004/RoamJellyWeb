import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRegenerateSpotPrompt, placeQueryName } from './aiItineraryService';

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

test('placeQueryName strips meal/stay labels and keeps the first alternative', () => {
  assert.equal(placeQueryName('晚餐：博多燒鹵飯 / 博多拉麵'), '博多燒鹵飯');
  assert.equal(placeQueryName('住宿：福岡早良區溫泉民宿'), '福岡早良區溫泉民宿');
  assert.equal(placeQueryName('晚餐：小筑 或 嘉麻'), '小筑');
  assert.equal(placeQueryName('午餐: 一蘭拉麵'), '一蘭拉麵');
  assert.equal(placeQueryName('桃園國際機場 / 中部國際機場出發'), '桃園國際機場');
  assert.equal(placeQueryName('警固八幡宮'), '警固八幡宮');
  assert.equal(placeQueryName('博多祇園山笠 Museum'), '博多祇園山笠 Museum');
});
