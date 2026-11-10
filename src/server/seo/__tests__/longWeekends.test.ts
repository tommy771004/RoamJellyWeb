// src/server/seo/__tests__/longWeekends.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { TW_OFFICE_CALENDARS } from '../../../data/taiwanOfficeCalendar.js';
import { buildHolidayYearFacts, findLeavePlans, findOffRuns, formatDateZh, formatRangeZh, HOLIDAY_YEARS } from '../longWeekends.js';
import { buildHolidayPage } from '../templates/holidayPage.js';
import { buildSitemapEntries } from '../templates/sitemap.js';

const cal2027 = TW_OFFICE_CALENDARS[2027];
const facts = buildHolidayYearFacts(cal2027);
const plan = (start: string, end: string) => facts.leavePlans.find((p) => p.start === start && p.end === end);

test('dates print with the Chinese weekday, and the year only when it differs', () => {
  assert.equal(formatDateZh('2027-02-04'), '2/4（四）');
  assert.equal(formatDateZh('2028-01-02', 2027), '2028/1/2（日）');
  assert.equal(formatRangeZh('2027-02-04', '2027-02-10'), '2/4（四）至 2/10（三）');
  assert.equal(formatRangeZh('2027-06-09', '2027-06-09'), '6/9（三）');
});

test('the 2027 calendar (DGPA 116年) yields the published long weekends', () => {
  assert.equal(facts.totalOffDays, 121);
  assert.deepEqual(facts.workingWeekends, []);
  assert.deepEqual(
    facts.longWeekends.map((r) => [r.start, r.end, r.days]),
    [
      ['2027-01-01', '2027-01-03', 3],
      ['2027-02-04', '2027-02-10', 7],
      ['2027-02-27', '2027-03-01', 3],
      ['2027-04-03', '2027-04-06', 4],
      ['2027-04-30', '2027-05-02', 3],
      ['2027-10-09', '2027-10-11', 3],
      ['2027-10-23', '2027-10-25', 3],
      ['2027-12-24', '2027-12-26', 3],
      // 12/31 補假 for 2028's New Year's Day (a Saturday) runs into 2028.
      ['2027-12-31', '2028-01-02', 3],
    ],
  );
  assert.deepEqual(facts.longWeekends[1].holidays, ['小年夜', '農曆除夕', '春節']);
  assert.deepEqual(facts.longWeekends.at(-1)?.holidays, ['2028 年開國紀念日']);
  assert.deepEqual(
    facts.singleDayHolidays.map((r) => [r.start, r.holidays.join('/')]),
    [
      ['2027-06-09', '端午節'],
      ['2027-09-15', '中秋節'],
      ['2027-09-28', '孔子誕辰紀念日/教師節'],
    ],
  );
});

test('leave plans bridge holidays to weekends', () => {
  // 春節: take Thu 2/11 + Fri 2/12 → 2/4–2/14.
  assert.deepEqual(plan('2027-02-04', '2027-02-14')?.leaveDates, ['2027-02-11', '2027-02-12']);
  // 教師節 (Tue): take Mon 9/27 → 9/25–9/28.
  assert.deepEqual(plan('2027-09-25', '2027-09-28')?.leaveDates, ['2027-09-27']);
  // 行憲紀念日 + New Year's: 4 days → 12/24–2028/1/2.
  assert.equal(plan('2027-12-24', '2028-01-02')?.totalDays, 10);
  // Never more than 4 days of leave.
  assert.ok(facts.leavePlans.every((p) => p.leaveDates.length >= 1 && p.leaveDates.length <= 4));
});

test('a costlier plan is only listed when it gains free days', () => {
  // 請 3 休 12 (1/30–2/10) gains no free day over 請 2 休 11; 請 3 休 6 none over 請 1 休 4.
  assert.equal(plan('2027-01-30', '2027-02-10'), undefined);
  assert.equal(plan('2027-09-28', '2027-10-03'), undefined);
  for (const p of facts.leavePlans) assert.ok(p.holidays.length > 0);
  // Leave in December 2026 is not suggested: that year's holidays are not in the 2027 calendar.
  assert.ok(facts.leavePlans.every((p) => p.leaveDates.every((d) => d.startsWith('2027-'))));
});

test('a synthetic year with a 補班 Saturday', () => {
  // 2030-01-01 is a Tuesday; Saturday 1/5 is a working day.
  const offDays = [{ date: '2030-01-01', note: '開國紀念日' }];
  for (let d = new Date(Date.UTC(2030, 0, 1)); d.getUTCFullYear() === 2030; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const wd = d.getUTCDay();
    if ((wd === 0 || wd === 6) && iso !== '2030-01-05') offDays.push({ date: iso } as { date: string; note: string });
  }
  const cal = { year: 2030, sourceUrl: '', sourcePage: '', offDays, workingWeekends: ['2030-01-05'] };
  const runs = findOffRuns(cal);
  assert.deepEqual(runs[0], { start: '2030-01-01', end: '2030-01-01', days: 1, holidays: ['開國紀念日'] });
  // 補班 Saturday 1/5 leaves Sunday 1/6 alone.
  assert.deepEqual(runs[1], { start: '2030-01-06', end: '2030-01-06', days: 1, holidays: [] });
  // Monday 12/31 bridges back to the weekend before New Year: 請 1 休 4.
  const plans = findLeavePlans(findOffRuns(cal, true));
  assert.deepEqual(plans[0], { start: '2029-12-29', end: '2030-01-01', totalDays: 4, leaveDates: ['2029-12-31'], holidays: ['開國紀念日'] });
});

test('the holiday page answers the year\'s questions and cites DGPA', () => {
  const html = buildHolidayPage({
    facts,
    sourcePage: cal2027.sourcePage,
    sourceUrl: cal2027.sourceUrl,
    shortTrips: [{ slug: 'tpe-fuk', label: '台北 → 福岡', durationText: '2 小時 10 分起', minPrice: 5593 }],
    longTrips: [],
  });
  assert.match(html, /<title>2027 連假一覽（民國116年）：9 個連假與請假攻略/);
  assert.ok(html.includes('<link rel="canonical" href="https://'));
  assert.ok(html.includes('/holidays/2027/'));
  assert.ok(html.includes('最長連假：春節'));
  assert.ok(html.includes('請 2 休 11'));
  assert.ok(html.includes('2028/1/2（日）'));
  assert.ok(html.includes('2027 年有補班嗎？'));
  assert.ok(html.includes('沒有。'));
  assert.ok(html.includes('行政院人事行政總處'));
  assert.ok(html.includes('href="/fly/tpe-fuk/"'));
  assert.ok(html.includes('"@type":"FAQPage"'));
  assert.ok(!html.includes('請假湊 5 天以上'), 'empty trip group is left out');
});

test('every calendar year is in the sitemap', () => {
  assert.ok(HOLIDAY_YEARS.includes(2027));
  const locs = buildSitemapEntries({ routeSearches: [], publicTrips: [] }).map((e) => e.loc);
  for (const y of HOLIDAY_YEARS) assert.ok(locs.some((l) => l.endsWith(`/holidays/${y}/`)));
});
