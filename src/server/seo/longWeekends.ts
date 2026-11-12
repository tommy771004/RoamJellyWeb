// src/server/seo/longWeekends.ts
//
// Turns an official office calendar (src/data/taiwanOfficeCalendar.ts) into the
// facts the /holidays/{year}/ page shows: every 連假 (3+ consecutive days off
// that include a holiday), the one-day holidays, and leave plans
// ("請 N 天休 M 天") that bridge a holiday to the nearest weekends.
import { TW_OFFICE_CALENDARS, type OfficeCalendarYear } from '../../data/taiwanOfficeCalendar.js';

/** Years with an official calendar, oldest first. */
export const HOLIDAY_YEARS: number[] = Object.keys(TW_OFFICE_CALENDARS).map(Number).sort((a, b) => a - b);

/** Footer link to the newest 連假 page, or '' when there is none. */
/**
 * The footer links every server-rendered SEO page carries, so each section
 * (routes, destinations, airport transfers, long weekends, guides) is one
 * click from any page.
 */
export function siteFooterLinks(): string {
  return [
    '<a href="/">果凍漫遊</a>',
    '<a href="/fly/">航線資訊</a>',
    '<a href="/trips/">目的地行程</a>',
    '<a href="/airport/">機場交通</a>',
    holidayFooterLink(),
    '<a href="/guide/">旅遊指南</a>',
  ].filter(Boolean).join('\n    ');
}

export function holidayFooterLink(): string {
  const year = HOLIDAY_YEARS[HOLIDAY_YEARS.length - 1];
  return year ? `<a href="/holidays/${year}/">${year} 連假</a>` : '';
}

/** Leave plans needing more days than this are not worth listing. */
export const MAX_LEAVE_DAYS = 4;

export interface OffRun {
  start: string;
  end: string;
  days: number;
  /** Holiday names in the run, in date order, without 補假 / duplicates. */
  holidays: string[];
}

export interface LeavePlan {
  start: string;
  end: string;
  totalDays: number;
  /** Working days to take off, in date order. */
  leaveDates: string[];
  holidays: string[];
}

export interface HolidayYearFacts {
  year: number;
  totalOffDays: number;
  workingWeekends: string[];
  /** 3+ day runs that contain a holiday. */
  longWeekends: OffRun[];
  /** Holidays that stay a single day off (no adjacent weekend). */
  singleDayHolidays: OffRun[];
  leavePlans: LeavePlan[];
}

const DAY_MS = 864e5;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => toIso(toMs(iso) + n * DAY_MS);
const weekdayOf = (iso: string) => new Date(toMs(iso)).getUTCDay();

const ZH_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
/** "2027-02-04" → "2/4（四）"; a date outside `year` keeps its year: "2028/1/2（日）". */
export function formatDateZh(iso: string, year?: number): string {
  const prefix = year !== undefined && !iso.startsWith(`${year}-`) ? `${iso.slice(0, 4)}/` : '';
  return `${prefix}${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}（${ZH_WEEKDAYS[weekdayOf(iso)]}）`;
}
/** "2/4（四）至 2/10（三）", or one date when start = end. */
export function formatRangeZh(start: string, end: string, year?: number): string {
  return start === end ? formatDateZh(start, year) : `${formatDateZh(start, year)}至 ${formatDateZh(end, year)}`;
}

/**
 * Days off inside the calendar year come from the calendar. Outside it only
 * weekends and 1/1 are assumed off — enough to see a run that crosses New Year.
 */
function makeIsOff(cal: OfficeCalendarYear) {
  const off = new Map(cal.offDays.map((d) => [d.date, d.note ?? '']));
  const inYear = (iso: string) => iso.startsWith(`${cal.year}-`);
  return {
    isOff(iso: string): boolean {
      if (inYear(iso)) return off.has(iso);
      const wd = weekdayOf(iso);
      return wd === 0 || wd === 6 || iso.endsWith('-01-01');
    },
    noteOf(iso: string): string {
      if (inYear(iso)) return off.get(iso) ?? '';
      return iso.endsWith('-01-01') ? `${iso.slice(0, 4)} 年開國紀念日` : '';
    },
  };
}

function holidayNames(notes: string[]): string[] {
  const names: string[] = [];
  for (const note of notes) {
    for (const name of note.split('/')) {
      const n = name.trim();
      if (n && n !== '補假' && !names.includes(n)) names.push(n);
    }
  }
  return names;
}

/**
 * Every maximal run of days off that overlaps the calendar year. With
 * `withNeighbours`, also the weekends just outside it, so a leave plan can
 * bridge New Year's Day back into December.
 */
export function findOffRuns(cal: OfficeCalendarYear, withNeighbours = false): OffRun[] {
  const { isOff, noteOf } = makeIsOff(cal);
  const first = addDays(`${cal.year}-01-01`, -10);
  const last = addDays(`${cal.year}-12-31`, 10);
  const runs: OffRun[] = [];
  let current: { start: string; end: string; notes: string[] } | null = null;
  for (let d = first; d <= last; d = addDays(d, 1)) {
    if (isOff(d)) {
      if (!current) current = { start: d, end: d, notes: [] };
      current.end = d;
      const note = noteOf(d);
      if (note) current.notes.push(note);
    } else if (current) {
      runs.push(toRun(current));
      current = null;
    }
  }
  if (current) runs.push(toRun(current));
  if (withNeighbours) return runs;
  return runs.filter((r) => r.end >= `${cal.year}-01-01` && r.start <= `${cal.year}-12-31`);
}

function toRun(r: { start: string; end: string; notes: string[] }): OffRun {
  return { start: r.start, end: r.end, days: (toMs(r.end) - toMs(r.start)) / DAY_MS + 1, holidays: holidayNames(r.notes) };
}

/**
 * Leave plans: windows from the start of one run to the end of a later run that
 * contain a holiday, where every working day in between is taken off. For each
 * holiday, a plan is kept only if it gains strictly more free days (days off
 * minus days of leave) than every cheaper plan for that holiday — "請 3 休 6"
 * is not listed next to "請 1 休 4".
 */
export function findLeavePlans(runs: OffRun[], maxLeave = MAX_LEAVE_DAYS): LeavePlan[] {
  const plans = new Map<string, LeavePlan>();
  runs.forEach((anchor, h) => {
    if (anchor.holidays.length === 0) return;
    const candidates: LeavePlan[] = [];
    for (let i = h; i >= 0; i--) {
      for (let j = h; j < runs.length; j++) {
        if (i === h && j === h) continue;
        const leaveDates: string[] = [];
        for (let k = i; k < j; k++) {
          for (let d = addDays(runs[k].end, 1); d < runs[k + 1].start; d = addDays(d, 1)) leaveDates.push(d);
        }
        if (leaveDates.length > maxLeave) continue;
        const start = runs[i].start;
        const end = runs[j].end;
        candidates.push({
          start,
          end,
          totalDays: (toMs(end) - toMs(start)) / DAY_MS + 1,
          leaveDates,
          holidays: holidayNames(runs.slice(i, j + 1).flatMap((r) => r.holidays)),
        });
      }
    }
    // Cheapest first; among equal cost, longest and earliest first.
    candidates.sort((a, b) => a.leaveDates.length - b.leaveDates.length || b.totalDays - a.totalDays || a.start.localeCompare(b.start));
    let bestFree = anchor.days;
    for (const c of candidates) {
      const free = c.totalDays - c.leaveDates.length;
      if (free <= bestFree) continue;
      bestFree = free;
      plans.set(`${c.start}|${c.end}`, c);
    }
  });
  return [...plans.values()].sort((a, b) => a.start.localeCompare(b.start) || a.leaveDates.length - b.leaveDates.length);
}

export function buildHolidayYearFacts(cal: OfficeCalendarYear): HolidayYearFacts {
  const runs = findOffRuns(cal);
  const withHoliday = runs.filter((r) => r.holidays.length > 0);
  return {
    year: cal.year,
    totalOffDays: cal.offDays.length,
    workingWeekends: cal.workingWeekends,
    longWeekends: withHoliday.filter((r) => r.days >= 3),
    singleDayHolidays: withHoliday.filter((r) => r.days === 1),
    // Leave outside the year would rest on guessed (weekend-only) days off, so it is left out.
    leavePlans: findLeavePlans(findOffRuns(cal, true)).filter((p) => p.leaveDates.every((d) => d.startsWith(`${cal.year}-`))),
  };
}
