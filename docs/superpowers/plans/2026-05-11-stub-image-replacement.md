# Stub Image Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `picsum.photos` placeholder images with destination-matched Unsplash static URLs, and seed the HomeTab recommendations slot with real data instead of an empty array.

**Architecture:** Pure string replacement across two files plus a one-line logic change in `loadInitialData`. No new abstractions introduced. All Unsplash URLs follow the same pattern already established in `ItineraryTab.tsx`.

**Tech Stack:** React 19, TypeScript, static JSON data file

---

## File Map

| File | Change |
|---|---|
| `src/components/HomeTab.tsx` | Replace 4 image URLs in `FEATURED_DESTINATIONS` (L353/363/373/383) + replace `Promise.resolve([])` with `searchOffers` call (L484) |
| `src/data/expertHandbooksData.json` | Replace 20 `image` fields (lines 6,301,706,1276,1736,2031,2326,2621,3191,3596,3946,4296,4536,4831,5236,5531,5826,6286,6746,7316) |

---

### Task 1: Replace HomeTab featured destination images

**Files:**
- Modify: `src/components/HomeTab.tsx:353-383`

- [ ] **Step 1: Replace all 4 picsum URLs in `FEATURED_DESTINATIONS`**

Open `src/components/HomeTab.tsx`. Find `FEATURED_DESTINATIONS` (around line 348). Replace each `image` field:

```typescript
// 日本 (line ~353)
image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop',

// 尼泊爾 (line ~363)
image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&auto=format&fit=crop',

// 挪威 (line ~373)
image: 'https://images.unsplash.com/photo-1531365737338-5a6d5e3abe3a?w=600&auto=format&fit=crop',

// 瑞士 (line ~383)
image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&auto=format&fit=crop',
```

- [ ] **Step 2: Verify no picsum URLs remain in HomeTab.tsx**

```bash
grep -n "picsum" src/components/HomeTab.tsx
```

Expected: no output (zero matches).

- [ ] **Step 3: Commit**

```bash
git add src/components/HomeTab.tsx
git commit -m "fix: replace picsum placeholder images in HomeTab featured destinations"
```

---

### Task 2: Replace handbook images in expertHandbooksData.json

**Files:**
- Modify: `src/data/expertHandbooksData.json` (20 `image` fields)

- [ ] **Step 1: Replace all 20 picsum image fields**

Each replacement: find the exact `picsum` URL on the listed line, replace with the Unsplash URL. Pattern: `https://images.unsplash.com/<photo-id>?w=800&auto=format&fit=crop`

| Line | Old (picsum seed) | New photo ID |
|---|---|---|
| 6 | `seed/600` | `photo-1542051841857-5f90071e7989` |
| 301 | `seed/601` | `photo-1499856871958-5b9627545d1a` |
| 706 | `seed/602` | `photo-1552832230-c0197dd311b5` |
| 1276 | `seed/603` | `photo-1513635269975-59663e0ac1ad` |
| 1736 | `seed/604` | `photo-1493976040374-85c8e12f0c0e` |
| 2031 | `seed/605` | `photo-1508009603885-50cf7c579365` |
| 2326 | `seed/606` | `photo-1538485399081-7191377e8241` |
| 2621 | `seed/607` | `photo-1531366936337-7c912a4589a7` |
| 3191 | `seed/608` | `photo-1496442226666-8d4d0e62e6e9` |
| 3596 | `seed/609` | `photo-1524820197278-540935bbf401` |
| 3946 | `seed/610` | `photo-1516690561799-46d8f74f9abf` |
| 4296 | `seed/611` | `photo-1525625293386-3f8f99389edd` |
| 4536 | `seed/612` | `photo-1569924709013-f9ee62c737f3` |
| 4831 | `seed/613` | `photo-1534430480872-3498386e7856` |
| 5236 | `seed/614` | `photo-1537996194471-e657df975ab4` |
| 5531 | `seed/615` | `photo-1571536802807-30f71f28e3f2` |
| 5826 | `seed/616` | `photo-1519677100203-a0e668c92439` |
| 6286 | `seed/617` | `photo-1539037116277-4db20889f2d4` |
| 6746 | `seed/618` | `photo-1476514525535-07fb3b4ae5f1` |
| 7316 | `seed/619` | `photo-1507699622108-4be3abd695ad` |

- [ ] **Step 2: Verify no picsum URLs remain in the JSON**

```bash
grep -c "picsum" src/data/expertHandbooksData.json
```

Expected: `0`

- [ ] **Step 3: Verify JSON is still valid**

```bash
python -c "import json; json.load(open('src/data/expertHandbooksData.json', encoding='utf-8')); print('valid')"
```

Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add src/data/expertHandbooksData.json
git commit -m "fix: replace picsum placeholder images in expert handbooks with Unsplash"
```

---

### Task 3: Fix recommendations fallback to seed real data

**Files:**
- Modify: `src/components/HomeTab.tsx:482-487`

- [ ] **Step 1: Update `loadInitialData` to fetch seed recommendations**

In `src/components/HomeTab.tsx`, find the `loadInitialData` function (around line 480). Replace `Promise.resolve([])` with a call to `searchOffers` using a popular default route. The date is computed at runtime so it's always ~30 days ahead:

```typescript
useEffect(() => {
  // Initial fetch for recommendations and handbooks
  const loadInitialData = async () => {
    try {
      const seedDate = new Date();
      seedDate.setDate(seedDate.getDate() + 30);
      const seedDateStr = seedDate.toISOString().slice(0, 10);

      const [handbooks, recommendations] = await Promise.all([
        fetchHandbooks(),
        searchOffers({ from: 'TPE', to: 'TYO', date: seedDateStr }).catch(() => [])
      ]);
      setCommunityTrips(handbooks);
      if (results.length === 0) setResults(recommendations);
    } catch (e) {
      console.error('Failed to load initial data', e);
    }
  };
  void loadInitialData();
}, []);
```

Note: `searchOffers` is already imported from `../lib/workflowApi` — verify with:

```bash
grep -n "searchOffers" src/components/HomeTab.tsx
```

Expected: at least one import line. If not present, add `searchOffers` to the existing import from `'../lib/workflowApi'`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on modified files.

- [ ] **Step 3: Commit**

```bash
git add src/components/HomeTab.tsx
git commit -m "fix: seed HomeTab recommendations with default TPE→TYO search instead of empty array"
```
