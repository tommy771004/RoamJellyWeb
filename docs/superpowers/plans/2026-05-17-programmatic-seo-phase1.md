# Programmatic SEO — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-rendered SEO landing pages at `/fly/{route-slug}/` (route search-demand analysis) and `/trips/{destination-slug}/` (UGC itinerary templates) to drive organic registration traffic from zh-TW search.

**Architecture:** Express routes registered before the Vite/static catch-all in `server.ts` serve plain HTML pages rendered from two data sources: `search_history` aggregates (proprietary demand signal) and public `trips` + `itinerary_nodes` (UGC itinerary content). No React SSR — template literals produce complete HTML documents.

**Tech Stack:** TypeScript, Express 4, Drizzle ORM `sql` template for raw aggregate queries, Node.js built-in `node:test` + `node:assert` for unit tests.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/server/seo/types.ts` | Create | TS interfaces for SEO data |
| `src/server/seo/cities.ts` | Create | Known routes + destinations (slug ↔ display ↔ DB variants) |
| `src/server/seo/seoDataService.ts` | Create | Query DB → format RouteData / DestinationData |
| `src/server/seo/templates/routePage.ts` | Create | HTML template for `/fly/:slug/` |
| `src/server/seo/templates/destinationPage.ts` | Create | HTML template for `/trips/:slug/` |
| `src/server/seo/templates/hubPage.ts` | Create | HTML for `/fly/` and `/trips/` hub listings |
| `src/server/seo/templates/sitemap.ts` | Create | XML sitemap for all pSEO pages |
| `src/server/seo/router.ts` | Create | Express Router — registers all pSEO routes |
| `src/server/seo/__tests__/cities.test.ts` | Create | Unit tests for slug lookup + variants |
| `src/server/seo/__tests__/templates.test.ts` | Create | Unit tests for template output shape |
| `src/server/repositories/appRepository.ts` | Modify | Add `getRouteSearchDemand()` + `getPublicTripsByDestination()` |
| `server.ts` | Modify | Import + register `seoRouter` before Vite/static block |
| `package.json` | Modify | Add `"test:seo"` script |

---

## Task 1: TypeScript types

**Files:**
- Create: `src/server/seo/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/server/seo/types.ts

export interface MonthlyDemand {
  month: number;  // 1–12
  count: number;
}

export interface RouteData {
  slug: string;        // "tpe-nrt"
  fromCode: string;    // "TPE"
  toCode: string;      // "NRT"
  fromDisplay: string; // "台北"
  toDisplay: string;   // "東京"
  monthly: MonthlyDemand[];
  totalSearches: number;
  peakMonth: number | null;   // month with highest count, null if no data
  lowMonth: number | null;    // month with lowest count, null if no data
}

export interface TripNode {
  day: number;
  time: string | null;
  title: string;
  category: string | null;
  description: string | null;
}

export interface PublicTrip {
  id: string;
  name: string;
  forkCount: number;
  nodes: TripNode[];
}

export interface DestinationData {
  slug: string;        // "tokyo"
  displayName: string; // "東京"
  trips: PublicTrip[];
  popularSpots: string[]; // top-5 unique node titles across all trips
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/seo/types.ts
git commit -m "feat(seo): add TypeScript interfaces for pSEO data layer"
```

---

## Task 2: Cities + destinations map (TDD)

**Files:**
- Create: `src/server/seo/cities.ts`
- Create: `src/server/seo/__tests__/cities.test.ts`
- Modify: `package.json` (add test:seo script)

- [ ] **Step 1: Add test script to package.json**

In `package.json`, inside `"scripts"`, add:
```json
"test:seo": "node --import tsx/esm --test src/server/seo/__tests__/*.test.ts"
```

- [ ] **Step 2: Write failing tests**

```typescript
// src/server/seo/__tests__/cities.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { getRouteBySlug, getDestinationBySlug, KNOWN_ROUTES, KNOWN_DESTINATIONS } from '../cities.js';

test('getRouteBySlug returns route for valid slug', () => {
  const r = getRouteBySlug('tpe-nrt');
  assert.ok(r);
  assert.equal(r.fromCode, 'TPE');
  assert.equal(r.toCode, 'NRT');
  assert.equal(r.fromDisplay, '台北');
  assert.equal(r.toDisplay, '東京');
});

test('getRouteBySlug returns undefined for unknown slug', () => {
  assert.equal(getRouteBySlug('xyz-abc'), undefined);
});

test('every route in KNOWN_ROUTES has non-empty fromVariants and toVariants', () => {
  for (const r of KNOWN_ROUTES) {
    assert.ok(r.fromVariants.length > 0, `${r.slug} missing fromVariants`);
    assert.ok(r.toVariants.length > 0, `${r.slug} missing toVariants`);
  }
});

test('getDestinationBySlug returns destination for valid slug', () => {
  const d = getDestinationBySlug('tokyo');
  assert.ok(d);
  assert.equal(d.displayName, '東京');
  assert.ok(d.dbVariants.includes('東京'));
});

test('getDestinationBySlug returns undefined for unknown slug', () => {
  assert.equal(getDestinationBySlug('atlantis'), undefined);
});

test('every destination has at least one dbVariant', () => {
  for (const d of KNOWN_DESTINATIONS) {
    assert.ok(d.dbVariants.length > 0, `${d.slug} missing dbVariants`);
  }
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm run test:seo
```

Expected: Error — module `../cities.js` not found.

- [ ] **Step 4: Implement cities.ts**

```typescript
// src/server/seo/cities.ts

export interface KnownRoute {
  slug: string;
  fromCode: string;
  toCode: string;
  fromDisplay: string;
  toDisplay: string;
  fromVariants: string[];
  toVariants: string[];
}

export interface KnownDestination {
  slug: string;
  displayName: string;
  dbVariants: string[];
}

export const KNOWN_ROUTES: KnownRoute[] = [
  {
    slug: 'tpe-nrt',
    fromCode: 'TPE', toCode: 'NRT',
    fromDisplay: '台北', toDisplay: '東京',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['東京', 'NRT', 'Tokyo', '东京'],
  },
  {
    slug: 'tpe-hnd',
    fromCode: 'TPE', toCode: 'HND',
    fromDisplay: '台北', toDisplay: '東京羽田',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['羽田', 'HND', '東京羽田'],
  },
  {
    slug: 'tpe-icn',
    fromCode: 'TPE', toCode: 'ICN',
    fromDisplay: '台北', toDisplay: '首爾',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['首爾', 'ICN', 'Seoul', '首尔'],
  },
  {
    slug: 'tpe-bkk',
    fromCode: 'TPE', toCode: 'BKK',
    fromDisplay: '台北', toDisplay: '曼谷',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['曼谷', 'BKK', 'Bangkok'],
  },
  {
    slug: 'tpe-sin',
    fromCode: 'TPE', toCode: 'SIN',
    fromDisplay: '台北', toDisplay: '新加坡',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['新加坡', 'SIN', 'Singapore'],
  },
  {
    slug: 'tpe-hkg',
    fromCode: 'TPE', toCode: 'HKG',
    fromDisplay: '台北', toDisplay: '香港',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['香港', 'HKG', 'Hong Kong', 'Hongkong'],
  },
  {
    slug: 'tpe-kix',
    fromCode: 'TPE', toCode: 'KIX',
    fromDisplay: '台北', toDisplay: '大阪',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['大阪', 'KIX', 'Osaka'],
  },
  {
    slug: 'tpe-itm',
    fromCode: 'TPE', toCode: 'ITM',
    fromDisplay: '台北', toDisplay: '大阪伊丹',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['伊丹', 'ITM', '大阪伊丹'],
  },
  {
    slug: 'tpe-oka',
    fromCode: 'TPE', toCode: 'OKA',
    fromDisplay: '台北', toDisplay: '沖繩',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['沖繩', 'OKA', 'Okinawa', '冲绳'],
  },
  {
    slug: 'tpe-fuk',
    fromCode: 'TPE', toCode: 'FUK',
    fromDisplay: '台北', toDisplay: '福岡',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['福岡', 'FUK', 'Fukuoka', '福冈'],
  },
];

export const KNOWN_DESTINATIONS: KnownDestination[] = [
  { slug: 'tokyo', displayName: '東京', dbVariants: ['東京', 'Tokyo', '东京'] },
  { slug: 'osaka', displayName: '大阪', dbVariants: ['大阪', 'Osaka'] },
  { slug: 'seoul', displayName: '首爾', dbVariants: ['首爾', 'Seoul', '首尔'] },
  { slug: 'bangkok', displayName: '曼谷', dbVariants: ['曼谷', 'Bangkok'] },
  { slug: 'singapore', displayName: '新加坡', dbVariants: ['新加坡', 'Singapore'] },
  { slug: 'hong-kong', displayName: '香港', dbVariants: ['香港', 'Hong Kong'] },
  { slug: 'okinawa', displayName: '沖繩', dbVariants: ['沖繩', 'Okinawa', '冲绳'] },
  { slug: 'fukuoka', displayName: '福岡', dbVariants: ['福岡', 'Fukuoka', '福冈'] },
  { slug: 'kyoto', displayName: '京都', dbVariants: ['京都', 'Kyoto'] },
  { slug: 'sapporo', displayName: '札幌', dbVariants: ['札幌', 'Sapporo'] },
];

export function getRouteBySlug(slug: string): KnownRoute | undefined {
  return KNOWN_ROUTES.find((r) => r.slug === slug);
}

export function getDestinationBySlug(slug: string): KnownDestination | undefined {
  return KNOWN_DESTINATIONS.find((d) => d.slug === slug);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:seo
```

Expected: All 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/server/seo/cities.ts src/server/seo/__tests__/cities.test.ts package.json
git commit -m "feat(seo): add known routes + destinations map with slug lookup"
```

---

## Task 3: AppRepository — SEO data methods

**Files:**
- Modify: `src/server/repositories/appRepository.ts`

- [ ] **Step 1: Add import at top of appRepository.ts**

Find the imports section at the top of `src/server/repositories/appRepository.ts` and ensure `sql` is imported from drizzle-orm. Add if missing:

```typescript
import { sql } from 'drizzle-orm';
```

- [ ] **Step 2: Add `getRouteSearchDemand` method**

Inside the `AppRepository` class, add after the last existing method:

```typescript
  async getRouteSearchDemand(fromVariants: string[], toVariants: string[]): Promise<{ month: number; count: number }[]> {
    const rows = await this.db.execute(sql`
      SELECT
        EXTRACT(MONTH FROM timestamp)::int AS month,
        COUNT(*)::int AS count
      FROM search_history
      WHERE query_from = ANY(${fromVariants}::text[])
        AND query_to = ANY(${toVariants}::text[])
        AND timestamp > NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `);
    return (rows.rows as { month: number; count: number }[]);
  }
```

- [ ] **Step 3: Add `getPublicTripsByDestination` method**

```typescript
  async getPublicTripsByDestination(dbVariants: string[]): Promise<{
    id: string;
    name: string;
    fork_count: number;
    day: number;
    time: string | null;
    title: string;
    category: string | null;
    description: string | null;
    sort_order: number;
  }[]> {
    const rows = await this.db.execute(sql`
      SELECT
        t.id,
        t.name,
        t.fork_count,
        n.day,
        n.time,
        n.title,
        n.category,
        n.description,
        n.sort_order
      FROM trips t
      JOIN itinerary_nodes n ON n.trip_id = t.id
      WHERE t.is_public = true
        AND t.destination = ANY(${dbVariants}::text[])
      ORDER BY t.fork_count DESC, n.day ASC, n.sort_order ASC
      LIMIT 200
    `);
    return rows.rows as any[];
  }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/server/repositories/appRepository.ts
git commit -m "feat(seo): add getRouteSearchDemand + getPublicTripsByDestination to AppRepository"
```

---

## Task 4: SEO data service

**Files:**
- Create: `src/server/seo/seoDataService.ts`

- [ ] **Step 1: Create the service**

```typescript
// src/server/seo/seoDataService.ts
import { AppRepository } from '../repositories/appRepository.js';
import type { RouteData, DestinationData, MonthlyDemand, PublicTrip } from './types.js';
import { getRouteBySlug, getDestinationBySlug } from './cities.js';

export async function buildRouteData(slug: string, repo: AppRepository): Promise<RouteData | null> {
  const route = getRouteBySlug(slug);
  if (!route) return null;

  const rows = await repo.getRouteSearchDemand(route.fromVariants, route.toVariants);

  const monthly: MonthlyDemand[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: 0,
  }));

  for (const row of rows) {
    const idx = row.month - 1;
    if (idx >= 0 && idx < 12) monthly[idx].count = row.count;
  }

  const totalSearches = monthly.reduce((s, m) => s + m.count, 0);
  const nonZero = monthly.filter((m) => m.count > 0);

  const peakMonth = nonZero.length > 0
    ? nonZero.reduce((a, b) => (b.count > a.count ? b : a)).month
    : null;

  const lowMonth = nonZero.length > 0
    ? nonZero.reduce((a, b) => (b.count < a.count ? b : a)).month
    : null;

  return {
    slug,
    fromCode: route.fromCode,
    toCode: route.toCode,
    fromDisplay: route.fromDisplay,
    toDisplay: route.toDisplay,
    monthly,
    totalSearches,
    peakMonth,
    lowMonth,
  };
}

export async function buildDestinationData(slug: string, repo: AppRepository): Promise<DestinationData | null> {
  const dest = getDestinationBySlug(slug);
  if (!dest) return null;

  const rows = await repo.getPublicTripsByDestination(dest.dbVariants);

  // Group rows by trip id
  const tripMap = new Map<string, PublicTrip>();
  for (const row of rows) {
    if (!tripMap.has(row.id)) {
      tripMap.set(row.id, { id: row.id, name: row.name, forkCount: row.fork_count, nodes: [] });
    }
    tripMap.get(row.id)!.nodes.push({
      day: row.day,
      time: row.time ?? null,
      title: row.title,
      category: row.category ?? null,
      description: row.description ?? null,
    });
  }

  const trips = Array.from(tripMap.values());

  // Top 5 unique spot titles across all trips
  const titleCounts = new Map<string, number>();
  for (const trip of trips) {
    for (const node of trip.nodes) {
      titleCounts.set(node.title, (titleCounts.get(node.title) ?? 0) + 1);
    }
  }
  const popularSpots = [...titleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title]) => title);

  return {
    slug,
    displayName: dest.displayName,
    trips,
    popularSpots,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/seo/seoDataService.ts
git commit -m "feat(seo): add buildRouteData + buildDestinationData service functions"
```

---

## Task 5: Route page HTML template (TDD)

**Files:**
- Create: `src/server/seo/templates/routePage.ts`
- Create: `src/server/seo/__tests__/templates.test.ts`

- [ ] **Step 1: Write failing template tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:seo
```

Expected: Error — module `../templates/routePage.js` not found.

- [ ] **Step 3: Implement routePage template**

```typescript
// src/server/seo/templates/routePage.ts
import type { RouteData } from '../types.js';

const MONTH_NAMES_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function demandBar(count: number, max: number): string {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
    <div style="width:${pct}%;max-width:280px;height:12px;background:#f43f5e;border-radius:6px;transition:width .3s;"></div>
    <span style="font-size:13px;color:#64748b;">${count} 次</span>
  </div>`;
}

export function buildRoutePage(data: RouteData): string {
  const maxCount = Math.max(...data.monthly.map((m) => m.count), 1);
  const title = `從${data.fromDisplay}飛${data.toDisplay}幾月最便宜？台灣旅人搜尋熱度分析 | 果凍漫遊`;
  const description = `根據果凍漫遊用戶搜尋資料，分析${data.fromDisplay}（${data.fromCode}）飛往${data.toDisplay}（${data.toCode}）各月份的搜尋熱度，幫你找出最佳出發時機。`;

  const peakText = data.peakMonth ? `${MONTH_NAMES_ZH[data.peakMonth - 1]}（旺季）` : '資料不足';
  const lowText = data.lowMonth ? `${MONTH_NAMES_ZH[data.lowMonth - 1]}（淡季）` : '資料不足';

  const monthRows = data.monthly
    .slice(0, 6) // show only first 6 months free
    .map((m) => `
      <div style="margin:12px 0;">
        <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:4px;">${MONTH_NAMES_ZH[m.month - 1]}</div>
        ${demandBar(m.count, maxCount)}
      </div>`)
    .join('');

  const lockedRows = data.monthly
    .slice(6)
    .map((m) => `
      <div style="margin:12px 0;filter:blur(4px);pointer-events:none;user-select:none;">
        <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:4px;">${MONTH_NAMES_ZH[m.month - 1]}</div>
        ${demandBar(m.count, maxCount)}
      </div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="https://roamjelly.com/fly/${data.slug}/">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    'name': `${data.fromDisplay} → ${data.toDisplay} 搜尋熱度資料`,
    'description': description,
    'creator': { '@type': 'Organization', 'name': '果凍漫遊 RoamJelly' },
  })}</script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;color:#0f172a}
    .container{max-width:800px;margin:0 auto;padding:24px 16px}
    nav{display:flex;align-items:center;gap:12px;margin-bottom:32px}
    nav a{color:#f43f5e;text-decoration:none;font-weight:700;font-size:18px}
    nav span{color:#94a3b8;font-size:14px}
    h1{font-size:clamp(20px,4vw,28px);font-weight:800;line-height:1.3;margin-bottom:8px}
    .subtitle{color:#64748b;font-size:15px;margin-bottom:32px}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px}
    .tag{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-right:8px}
    .tag-peak{background:#fef2f2;color:#e11d48}
    .tag-low{background:#f0fdf4;color:#16a34a}
    .cta{display:block;width:100%;padding:16px;border-radius:12px;background:#f43f5e;color:#fff;font-weight:800;font-size:16px;text-align:center;text-decoration:none;margin-top:24px}
    .cta:hover{background:#e11d48}
    .lock-banner{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;text-align:center;margin:16px 0}
    footer{text-align:center;color:#94a3b8;font-size:13px;margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0}
    footer a{color:#94a3b8;margin:0 8px}
  </style>
</head>
<body>
<div class="container">
  <nav>
    <a href="/">果凍漫遊</a>
    <span>›</span>
    <a href="/fly/">航線分析</a>
    <span>›</span>
    <span>${escHtml(data.fromDisplay)} → ${escHtml(data.toDisplay)}</span>
  </nav>

  <h1>從${escHtml(data.fromDisplay)}飛${escHtml(data.toDisplay)}（${escHtml(data.fromCode)} → ${escHtml(data.toCode)}）<br>台灣旅人搜尋熱度分析</h1>
  <p class="subtitle">根據果凍漫遊用戶的真實搜尋行為，整理各月份熱度</p>

  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;">出發時機建議</h2>
    <p>
      <span class="tag tag-peak">旺季 ${escHtml(peakText)}</span>
      <span class="tag tag-low">淡季 ${escHtml(lowText)}</span>
    </p>
    <p style="margin-top:12px;font-size:14px;color:#475569;">
      過去 12 個月，果凍漫遊用戶共搜尋此航線 <strong>${data.totalSearches}</strong> 次。
    </p>
  </div>

  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;">每月搜尋熱度</h2>
    ${monthRows}

    <div class="lock-banner">
      <strong>🔒 登入查看完整 12 個月資料</strong><br>
      <span style="font-size:13px;color:#78716c;">免費建立帳號，解鎖完整熱度分析與行程規劃功能</span>
    </div>
    <div style="position:relative;overflow:hidden;border-radius:8px;">
      ${lockedRows}
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 0%,#fff 60%);pointer-events:none;"></div>
    </div>

    <a class="cta" href="/?from=${encodeURIComponent(data.fromCode)}&to=${encodeURIComponent(data.toCode)}">免費開始規劃 ${escHtml(data.fromDisplay)}→${escHtml(data.toDisplay)} 行程 →</a>
  </div>

  <div class="card">
    <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;">相關航線</h2>
    <ul style="list-style:none;display:flex;flex-wrap:wrap;gap:8px;">
      <li><a href="/fly/" style="color:#f43f5e;text-decoration:none;font-size:14px;">← 所有航線分析</a></li>
      <li><a href="/trips/${data.toCode.toLowerCase()}/" style="color:#f43f5e;text-decoration:none;font-size:14px;">${escHtml(data.toDisplay)} 旅遊行程 →</a></li>
    </ul>
  </div>

  <footer>
    <a href="/">果凍漫遊</a>
    <a href="/fly/">航線分析</a>
    <a href="/trips/">目的地行程</a>
    <br><br>
    <span>© ${new Date().getFullYear()} RoamJelly 果凍漫遊</span>
  </footer>
</div>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:seo
```

Expected: All tests pass (cities + templates).

- [ ] **Step 5: Commit**

```bash
git add src/server/seo/templates/routePage.ts src/server/seo/__tests__/templates.test.ts
git commit -m "feat(seo): add route page HTML template with demand chart + gated CTA"
```

---

## Task 6: Destination page + hub + sitemap templates

**Files:**
- Create: `src/server/seo/templates/destinationPage.ts`
- Create: `src/server/seo/templates/hubPage.ts`
- Create: `src/server/seo/templates/sitemap.ts`

- [ ] **Step 1: Add destination page tests to templates.test.ts**

Append to `src/server/seo/__tests__/templates.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
npm run test:seo
```

Expected: Error — module `../templates/destinationPage.js` not found.

- [ ] **Step 3: Implement destinationPage.ts**

```typescript
// src/server/seo/templates/destinationPage.ts
import type { DestinationData, PublicTrip } from '../types.js';

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function renderTrip(trip: PublicTrip): string {
  const byDay = new Map<number, typeof trip.nodes>();
  for (const node of trip.nodes) {
    if (!byDay.has(node.day)) byDay.set(node.day, []);
    byDay.get(node.day)!.push(node);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a - b).slice(0, 3); // max 3 days preview

  const dayHtml = days.map(([day, nodes]) => `
    <div style="margin:12px 0;">
      <div style="font-size:13px;font-weight:700;color:#f43f5e;margin-bottom:8px;">第 ${day} 天</div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:6px;">
        ${nodes.map((n) => `
          <li style="display:flex;gap:8px;align-items:flex-start;">
            <span style="font-size:12px;color:#94a3b8;width:40px;flex-shrink:0;">${escHtml(n.time ?? '')}</span>
            <span style="font-size:14px;color:#0f172a;">${escHtml(n.title)}</span>
          </li>`).join('')}
      </ul>
    </div>`).join('');

  return `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="font-size:15px;font-weight:700;">${escHtml(trip.name)}</h3>
        <span style="font-size:12px;color:#94a3b8;">🍴 ${trip.forkCount} 人使用</span>
      </div>
      ${dayHtml}
      ${trip.nodes.length > 6 ? `<p style="font-size:13px;color:#94a3b8;margin-top:8px;">+ 更多景點...</p>` : ''}
    </div>`;
}

export function buildDestinationPage(data: DestinationData): string {
  const title = `${data.displayName}旅遊行程推薦 — 真實旅人規劃的行程 | 果凍漫遊`;
  const description = `果凍漫遊用戶分享的${data.displayName}旅遊行程，包含景點安排、天數規劃與行程細節，免費複製使用。`;

  const tripsHtml = data.trips.slice(0, 5).map(renderTrip).join('');

  const spotsHtml = data.popularSpots.length > 0
    ? `<ul style="list-style:none;display:flex;flex-wrap:wrap;gap:8px;">
        ${data.popularSpots.map((s) => `<li style="background:#fef2f2;color:#e11d48;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;">${escHtml(s)}</li>`).join('')}
      </ul>`
    : '<p style="color:#94a3b8;font-size:14px;">暫無資料</p>';

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <link rel="canonical" href="https://roamjelly.com/trips/${data.slug}/">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': `${data.displayName} 旅遊行程推薦`,
    'description': description,
    'itemListElement': data.trips.slice(0, 5).map((t, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': t.name,
    })),
  })}</script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;color:#0f172a}
    .container{max-width:800px;margin:0 auto;padding:24px 16px}
    nav{display:flex;align-items:center;gap:12px;margin-bottom:32px}
    nav a{color:#f43f5e;text-decoration:none;font-weight:700;font-size:18px}
    nav span{color:#94a3b8;font-size:14px}
    h1{font-size:clamp(20px,4vw,28px);font-weight:800;line-height:1.3;margin-bottom:8px}
    .subtitle{color:#64748b;font-size:15px;margin-bottom:32px}
    h2{font-size:18px;font-weight:700;margin-bottom:16px}
    .cta{display:block;width:100%;padding:16px;border-radius:12px;background:#f43f5e;color:#fff;font-weight:800;font-size:16px;text-align:center;text-decoration:none;margin:24px 0}
    .cta:hover{background:#e11d48}
    footer{text-align:center;color:#94a3b8;font-size:13px;margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0}
    footer a{color:#94a3b8;margin:0 8px}
  </style>
</head>
<body>
<div class="container">
  <nav>
    <a href="/">果凍漫遊</a>
    <span>›</span>
    <a href="/trips/">目的地行程</a>
    <span>›</span>
    <span>${escHtml(data.displayName)}</span>
  </nav>

  <h1>${escHtml(data.displayName)}旅遊行程推薦</h1>
  <p class="subtitle">果凍漫遊用戶分享的真實行程規劃，免費複製使用</p>

  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px;">
    <h2>熱門景點</h2>
    ${spotsHtml}
  </div>

  <h2>精選旅遊行程</h2>
  ${tripsHtml.length > 0 ? tripsHtml : '<p style="color:#94a3b8;">目前還沒有公開行程，成為第一個分享者吧！</p>'}

  <a class="cta" href="/">免費複製行程，開始規劃你的${escHtml(data.displayName)}之旅 →</a>

  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
    <h2 style="font-size:16px;margin-bottom:12px;">相關資源</h2>
    <ul style="list-style:none;display:flex;flex-wrap:wrap;gap:8px;">
      <li><a href="/trips/" style="color:#f43f5e;text-decoration:none;font-size:14px;">← 所有目的地</a></li>
    </ul>
  </div>

  <footer>
    <a href="/">果凍漫遊</a>
    <a href="/fly/">航線分析</a>
    <a href="/trips/">目的地行程</a>
    <br><br>
    <span>© ${new Date().getFullYear()} RoamJelly 果凍漫遊</span>
  </footer>
</div>
</body>
</html>`;
}
```

- [ ] **Step 4: Implement hubPage.ts**

```typescript
// src/server/seo/templates/hubPage.ts
import { KNOWN_ROUTES, KNOWN_DESTINATIONS } from '../cities.js';

function escHtml(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const BASE_STYLES = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafafa;color:#0f172a}
  .container{max-width:800px;margin:0 auto;padding:24px 16px}
  nav{margin-bottom:32px}
  nav a{color:#f43f5e;text-decoration:none;font-weight:700;font-size:18px}
  h1{font-size:clamp(22px,4vw,32px);font-weight:800;margin-bottom:8px}
  .subtitle{color:#64748b;font-size:15px;margin-bottom:32px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-decoration:none;color:#0f172a;transition:box-shadow .2s}
  .card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}
  .card-title{font-weight:700;font-size:15px;margin-bottom:4px}
  .card-sub{font-size:13px;color:#94a3b8}
  footer{text-align:center;color:#94a3b8;font-size:13px;margin-top:48px;padding-top:24px;border-top:1px solid #e2e8f0}
  footer a{color:#94a3b8;margin:0 8px}
`;

export function buildRouteHubPage(): string {
  const cards = KNOWN_ROUTES.map((r) => `
    <a class="card" href="/fly/${r.slug}/">
      <div class="card-title">${escHtml(r.fromDisplay)} → ${escHtml(r.toDisplay)}</div>
      <div class="card-sub">${r.fromCode} → ${r.toCode}</div>
    </a>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>台灣出發航線搜尋熱度分析 | 果凍漫遊</title>
  <meta name="description" content="果凍漫遊整理台灣出發各大航線的旅人搜尋熱度，幫你找出最佳出發時機。">
  <link rel="canonical" href="https://roamjelly.com/fly/">
  <style>${BASE_STYLES}</style>
</head>
<body>
<div class="container">
  <nav><a href="/">← 果凍漫遊</a></nav>
  <h1>台灣出發航線分析</h1>
  <p class="subtitle">根據果凍漫遊用戶搜尋資料，找出各航線的旺淡季</p>
  <div class="grid">${cards}</div>
  <footer>
    <a href="/">果凍漫遊</a>
    <a href="/trips/">目的地行程</a>
    <br><br>
    <span>© ${new Date().getFullYear()} RoamJelly 果凍漫遊</span>
  </footer>
</div>
</body>
</html>`;
}

export function buildDestinationHubPage(): string {
  const cards = KNOWN_DESTINATIONS.map((d) => `
    <a class="card" href="/trips/${d.slug}/">
      <div class="card-title">${escHtml(d.displayName)}</div>
      <div class="card-sub">查看行程攻略 →</div>
    </a>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>旅遊目的地行程推薦 | 果凍漫遊</title>
  <meta name="description" content="果凍漫遊用戶分享的各大目的地旅遊行程，免費複製使用。">
  <link rel="canonical" href="https://roamjelly.com/trips/">
  <style>${BASE_STYLES}</style>
</head>
<body>
<div class="container">
  <nav><a href="/">← 果凍漫遊</a></nav>
  <h1>旅遊目的地行程推薦</h1>
  <p class="subtitle">果凍漫遊旅人分享的真實行程規劃</p>
  <div class="grid">${cards}</div>
  <footer>
    <a href="/">果凍漫遊</a>
    <a href="/fly/">航線分析</a>
    <br><br>
    <span>© ${new Date().getFullYear()} RoamJelly 果凍漫遊</span>
  </footer>
</div>
</body>
</html>`;
}
```

- [ ] **Step 5: Implement sitemap.ts**

```typescript
// src/server/seo/templates/sitemap.ts
import { KNOWN_ROUTES, KNOWN_DESTINATIONS } from '../cities.js';

export function buildSitemapXml(): string {
  const today = new Date().toISOString().split('T')[0];
  const base = 'https://roamjelly.com';

  const staticUrls = [
    `${base}/fly/`,
    `${base}/trips/`,
  ];

  const routeUrls = KNOWN_ROUTES.map((r) => `${base}/fly/${r.slug}/`);
  const destUrls = KNOWN_DESTINATIONS.map((d) => `${base}/trips/${d.slug}/`);
  const allUrls = [...staticUrls, ...routeUrls, ...destUrls];

  const entries = allUrls
    .map((url) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}
```

- [ ] **Step 6: Run all tests**

```bash
npm run test:seo
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/server/seo/templates/
git commit -m "feat(seo): add destination page, hub pages, and sitemap XML templates"
```

---

## Task 7: Express router

**Files:**
- Create: `src/server/seo/router.ts`

- [ ] **Step 1: Create the router**

```typescript
// src/server/seo/router.ts
import { Router, type Request, type Response } from 'express';
import { AppRepository } from '../repositories/appRepository.js';
import { buildRouteData, buildDestinationData } from './seoDataService.js';
import { buildRoutePage } from './templates/routePage.js';
import { buildDestinationPage } from './templates/destinationPage.js';
import { buildRouteHubPage, buildDestinationHubPage } from './templates/hubPage.js';
import { buildSitemapXml } from './templates/sitemap.js';
import { KNOWN_ROUTES, KNOWN_DESTINATIONS } from './cities.js';

export function createSeoRouter(repo: AppRepository): Router {
  const router = Router();

  // Cache TTL: 1 hour (pages are slow to generate, data changes infrequently)
  const CACHE_MS = 60 * 60 * 1000;
  const cache = new Map<string, { html: string; expiresAt: number }>();

  function getCached(key: string): string | null {
    const entry = cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) return null;
    return entry.html;
  }

  function setCached(key: string, html: string): void {
    cache.set(key, { html, expiresAt: Date.now() + CACHE_MS });
  }

  // Sitemap
  router.get('/sitemap-seo.xml', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buildSitemapXml());
  });

  // Route hub: /fly/
  router.get('/fly/', (_req: Request, res: Response) => {
    const cached = getCached('__fly_hub__');
    if (cached) { res.setHeader('Cache-Control', 'public, max-age=3600'); res.send(cached); return; }
    const html = buildRouteHubPage();
    setCached('__fly_hub__', html);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(html);
  });

  // Destination hub: /trips/
  router.get('/trips/', (_req: Request, res: Response) => {
    const cached = getCached('__trips_hub__');
    if (cached) { res.setHeader('Cache-Control', 'public, max-age=3600'); res.send(cached); return; }
    const html = buildDestinationHubPage();
    setCached('__trips_hub__', html);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(html);
  });

  // Route detail: /fly/tpe-nrt/
  router.get('/fly/:slug/', async (req: Request, res: Response) => {
    const { slug } = req.params;
    // Validate against known routes to prevent arbitrary DB queries
    if (!KNOWN_ROUTES.some((r) => r.slug === slug)) {
      res.status(404).send('Not found');
      return;
    }
    const cacheKey = `fly:${slug}`;
    const cached = getCached(cacheKey);
    if (cached) { res.setHeader('Cache-Control', 'public, max-age=3600'); res.send(cached); return; }

    const data = await buildRouteData(slug, repo);
    if (!data) { res.status(404).send('Not found'); return; }

    const html = buildRoutePage(data);
    setCached(cacheKey, html);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(html);
  });

  // Destination detail: /trips/tokyo/
  router.get('/trips/:slug/', async (req: Request, res: Response) => {
    const { slug } = req.params;
    if (!KNOWN_DESTINATIONS.some((d) => d.slug === slug)) {
      res.status(404).send('Not found');
      return;
    }
    const cacheKey = `trips:${slug}`;
    const cached = getCached(cacheKey);
    if (cached) { res.setHeader('Cache-Control', 'public, max-age=3600'); res.send(cached); return; }

    const data = await buildDestinationData(slug, repo);
    if (!data) { res.status(404).send('Not found'); return; }

    const html = buildDestinationPage(data);
    setCached(cacheKey, html);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(html);
  });

  return router;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/seo/router.ts
git commit -m "feat(seo): add Express router for /fly/, /trips/, and /sitemap-seo.xml with in-memory cache"
```

---

## Task 8: Wire router into server.ts

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: Add import at top of server.ts**

Find the import block at the top of `server.ts` (after existing imports around line 20). Add:

```typescript
import { createSeoRouter } from './src/server/seo/router';
```

- [ ] **Step 2: Register the router before the Vite/static block**

Find this block in `server.ts` (around line 2603):

```typescript
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
```

**Immediately before that block**, insert:

```typescript
  // pSEO routes — must be registered before Vite middleware / static catch-all
  app.use(createSeoRouter(repo));
```

- [ ] **Step 3: Start dev server and smoke test**

```bash
npm run dev
```

In a second terminal:

```bash
curl -s http://localhost:3000/fly/ | head -5
```

Expected output starts with: `<!DOCTYPE html>`

```bash
curl -s http://localhost:3000/fly/tpe-nrt/ | head -5
```

Expected output starts with: `<!DOCTYPE html>`

```bash
curl -s http://localhost:3000/trips/ | head -5
```

Expected output starts with: `<!DOCTYPE html>`

```bash
curl -s http://localhost:3000/sitemap-seo.xml | head -5
```

Expected: XML with `<?xml version="1.0"`

- [ ] **Step 4: Verify /fly/unknown-slug/ returns 404**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/fly/zzz-zzz/
```

Expected: `404`

- [ ] **Step 5: Commit**

```bash
git add server.ts
git commit -m "feat(seo): register pSEO router in server.ts before Vite/static middleware"
```

---

## Task 9: Internal linking from homepage footer

**Files:**
- Modify: `src/App.tsx` or the component containing the app footer/nav

- [ ] **Step 1: Find the footer in App.tsx**

Search for existing footer content:

```bash
grep -n "footer\|Footer\|©\|版權" src/App.tsx | head -10
```

If no footer exists in `App.tsx`, check `src/components/HomeTab.tsx`:

```bash
grep -n "footer\|©" src/components/HomeTab.tsx | head -10
```

- [ ] **Step 2: Add pSEO links to footer**

In whichever file contains the footer, add the following two links. If the footer is a `<footer>` or `<View>` element, append inside it:

```tsx
{/* pSEO internal links */}
<a
  href="/fly/"
  style={{ color: '#94a3b8', fontSize: 12, marginRight: 12 }}
  target="_self"
>
  航線搜尋熱度分析
</a>
<a
  href="/trips/"
  style={{ color: '#94a3b8', fontSize: 12 }}
  target="_self"
>
  目的地旅遊行程
</a>
```

- [ ] **Step 3: Verify links render**

With `npm run dev` running, open `http://localhost:3000` in browser. Confirm the two footer links appear. Click each and confirm they reach the pSEO hub pages.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx   # or whichever file was modified
git commit -m "feat(seo): add internal footer links to /fly/ and /trips/ hub pages"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `/fly/{slug}/` route analytics pages with demand chart
- [x] `/trips/{slug}/` destination itinerary pages with UGC content  
- [x] `/fly/` and `/trips/` hub listing pages
- [x] `/sitemap-seo.xml` for all pSEO pages
- [x] In-memory cache (1h TTL) to avoid DB on every request
- [x] Slug validation prevents arbitrary DB queries
- [x] Registration CTA on every page
- [x] `escHtml()` in all templates — no XSS from user-generated content
- [x] TypeScript types throughout
- [x] Tests for pure functions (cities lookup, template output)
- [x] Registered before Vite/static catch-all

**Gaps flagged:**
- No `robots.txt` update (add `/fly/` and `/trips/` allowlist if `robots.txt` exists — check with `ls public/robots.txt`)
- No breadcrumb structured data (enhancement for Phase 2)
- Footer link location depends on App.tsx structure (Task 9 Step 1 shows how to locate it)
