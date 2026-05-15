# Soft Glass Daydream UI Restyle — Design Spec

**Date:** 2026-05-15  
**Reference:** [sleek.design — Soft Glass Daydream](https://sleek.design/references?project=VxvG1sYFBOW)  
**Approach:** B — Surgical JSX restyle (logic/state/API calls unchanged)  
**Palette:** Blend — white cards + lavender/violet accents, pink-500 as primary CTA only  
**Scope:** 4 areas (Account stats grid excluded — deferred)

---

## 1. Search Form (HomeTab)

### Target Layout

```
┌─────────────────────────────────────────┐
│  FROM          ✈           TO           │
│  台北 TPE             東京 NRT          │
├──────────────────┬──────────────────────┤
│  去程日期        │  回程日期            │
│  Oct 12          │  Oct 24 (來回) / —  │
├─────────────────────────────────────────┤
│        ─── 搜尋航班 →  ───             │
└─────────────────────────────────────────┘
```

### Changes

- **Merge mobile + desktop JSX blocks** into one responsive layout (currently two separate blocks: `md:hidden` and `hidden md:block`). Both are structurally identical — the duplication is unnecessary.
- **FROM/TO row:** `grid grid-cols-2` with a centered absolute airplane icon (`PlaneTakeoff`) between columns. Each cell is a clickable `div` that opens `LocationPickerPopup`.
- **Date + Return Date row:** `grid grid-cols-2 gap-3`. Left cell opens `DatePickerPopup` (去程). Right cell opens `DatePickerPopup` (回程) — visible always but dimmed/placeholder when `tripType === 'oneway'`; clicking it auto-switches `tripType` to `'roundtrip'`.
- **Card container:** `bg-white/90 rounded-3xl shadow-sm border border-slate-100 p-4` wrapping the form grid.
- **Trip type toggle** (單程/來回) stays above the card, unchanged pill group.
- **CTA button:** `bg-pink-500 hover:bg-pink-600 text-white rounded-2xl py-4 w-full` with arrow icon.
- **Collapsed summary bar** (shown after search on mobile): unchanged — already matches reference style.
- All existing handlers unchanged: `updateField`, `handleSearch`, `LocationPickerPopup`, `DatePickerPopup`, `showDatePicker`, `showDeparturePicker`, `showDestinationPicker` state.

### Files

- `src/components/HomeTab.tsx` — lines ~1006–1200 (mobile form) and ~1200–1350 (desktop form)

---

## 2. Flight Result Cards (HomeTab)

### Target Layout

```
┌──────────────────────────────────────────────┐
│ [●] Aura Airways              DIRECT · 7h20m │
│ ─────────────────────────────────────────── │
│  10:45      ────✈────      23:05             │
│  JFK          NON-STOP       LHR             │
│ · · · · · · · · · · · · · · · · · · · · · · │  ← ticket cutout
│  TWD 14,400              [🔔] [帶入] [購買]  │
└──────────────────────────────────────────────┘
```

### Changes — `FlightCard` component

- Remove expand/collapse toggle (`isExpanded` state). All info visible always.
- Top row: `AirlineLogo` (colored circle, existing) + airline name left-aligned; stop badge + duration right-aligned.
- Stop badge: `bg-emerald-50 text-emerald-600` for direct, `bg-slate-100 text-slate-600` for connecting — already exists, keep.
- Route row: existing departure/arrival time layout with dashed flight line — keep structure, clean whitespace.
- Ticket cutout separator: keep existing implementation (left/right circle cutouts + dashed line).
- Bottom price row: price left, action buttons right — keep layout, increase price font to `text-2xl font-black`.
- Card container: `bg-white border border-slate-100 rounded-2xl shadow-sm` — remove glassmorphism `bg-white/70 backdrop-blur-xl`.

### Changes — `FlightTable` component

- Restyle each row to match `FlightCard` structure above.
- Currently uses a split left/right panel (`flex-row`) — replace with the unified card layout.
- All `onPress`, `onToggleSave`, `onToggleTrack`, `onImportToTrip` props unchanged.

### Files

- `src/components/HomeTab.tsx` — `FlightCard` (~line 85–279), `FlightTable` (~line 281–387)

---

## 3. RedirectModal Fare Breakdown

### Target Layout

```
┌─────────────────────────────────────────────┐
│  [A]  Aura Airways          ✓ Verified      │  ← existing header
│  JFK ──────✈────── LHR   Direct · 7h20m    │  ← existing route visual
├─────────────────────────────────────────────┤
│  Base Fare (1 Adult)             TWD 13,100 │  ← new
│  Taxes & Fees (est.)              TWD 1,300 │  ← new
│  ─────────────────────────────────────────  │
│  Total Price                    TWD 14,400  │  ← violet-600 accent
├─────────────────────────────────────────────┤
│  [        立即前往預訂 →                  ] │
│  [♥ 收藏方案]           [暫時關閉]          │
└─────────────────────────────────────────────┘
```

### Changes

- Replace current single-block price display (`bg-slate-50/50 rounded-3xl p-6`) with a fare breakdown table:
  - Row 1: `Base Fare (1 Adult)` = `Math.round(price * 0.85).toLocaleString()`
  - Row 2: `Taxes & Fees (est.)` = `Math.round(price * 0.15).toLocaleString()`
  - Divider line
  - Row 3: `Total Price` = `price.toLocaleString()` in `text-violet-600 font-black`
- Add small `(est.)` disclaimer below the table: `text-[10px] text-slate-400 mt-1`
- All existing `onConfirm`, `onSave`, `onClose` handlers unchanged.
- Existing route visual (departure/arrival/duration/stops) unchanged.
- Existing header (airline logo, Verified badge) unchanged.

### Files

- `src/components/RedirectModal.tsx` — lines ~118–130 (price block)

---

## 4. ItineraryTab Day Toggle + Node Cards

### 4a. Day Toggle

**Current:** Horizontal scroll of day pills (`D1 D2 D3...`).

**New (SGD Upcoming/Past toggle style):**

```
[  Day 1  ]  [  Day 2  ]  [  Day 3  ]
```

- Container: `inline-flex bg-slate-100 rounded-full p-1 gap-1`
- Active pill: `bg-white rounded-full px-5 py-2 shadow-sm text-slate-900 font-bold text-sm`
- Inactive pill: `px-5 py-2 text-slate-400 font-medium text-sm`
- Same `selectedDay` state, same day navigation logic.
- Keep horizontal scroll wrapper for many days.

### 4b. Node Cards

**Current:** `GlassCard` with pink gradient borders, complex nested structure.

**New (SGD booking card style):**

```
┌──────────────────────────────────────────┐
│ ✈️  China Airlines  ·  09:00 – 11:00   │
│     [CONFIRMED]  or  [LOCAL]             │
│ ─────────────────────────────────────── │
│ 景點名稱 / 行程節點標題                  │
│ 第 1 天 · 分類 · ai_note excerpt        │
│                        [✏️] [🗑️]        │
└──────────────────────────────────────────┘
```

- Container: `bg-white border border-slate-100 rounded-2xl shadow-sm p-4`
- Status badge: `source === 'remote'` → green `CONFIRMED`; `source === 'local'` → amber `LOCAL`
- Emoji + title in `text-base font-bold text-slate-900`
- Time range `text-sm text-slate-500` below title
- ai_note truncated 1 line below
- Edit/delete buttons: icon-only `w-8 h-8 rounded-full bg-slate-50` — same handlers
- Drag handle (`GripVertical`) unchanged — keep for reorder
- All existing reorder/edit/delete/sync logic unchanged

### Files

- `src/components/ItineraryTab.tsx` — day tab render (~line 3100+), node card render (~line 3200+)

---

## Color System (Blend Palette)

| Role | Token | Value |
|------|-------|-------|
| Primary CTA | `pink-500` | existing brand |
| Accent / total price | `violet-600` | new from SGD |
| Card background | `white` | replaces glass |
| Card border | `slate-100` | |
| Active tab | `white` on `slate-100` bg | SGD toggle pattern |
| Direct badge | `emerald-50 / emerald-600` | existing |
| Status: confirmed | `emerald-50 / emerald-700` | new |
| Status: local | `amber-50 / amber-700` | new |

---

## Constraints

- Zero logic changes — all store subscriptions, API calls, event handlers identical.
- Dark mode: all new classes need `dark:` variants matching existing dark palette.
- Accessibility: existing `aria-label` attributes preserved.
- Animation: existing `motion/react` wrappers preserved.

---

## Out of Scope

- Account stats grid (Countries / Flights / Hours) — needs backend aggregation, deferred.
- DestinationCard hero image cards — already look good, no change.
- Bottom nav, TopAppBar, modals other than RedirectModal — unchanged.
