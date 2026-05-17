# Premium Jelly Mobile Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the app into a more premium jelly aesthetic while increasing mobile-visible content density across Home, Itinerary, and Tools surfaces without changing product logic.

**Architecture:** Keep logic and state untouched, and focus on shared style primitives plus surgical JSX/className edits in existing components. Establish the material language first in shared CSS/GlassCard, then tune page-specific cards, hero sections, and mobile text density so the three tabs feel like one system.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, motion/react, Lucide, Vite

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/index.css` | Global jelly background, shared glass/button/panel polish, mobile spacing/readability tuning |
| `src/components/GlassCard.tsx` | Shared premium glass shell for reusable card surfaces |
| `src/lib/motionTokens.ts` | Soften motion easing/hover feel to reduce toy-like bounce |
| `src/components/HomeTab.tsx` | Premium hero rhythm, denser mobile featured cards, refined flight/search surfaces |
| `src/components/ItineraryTab.tsx` | More premium segmented controls and denser node-card information hierarchy |
| `src/components/ToolsTab.tsx` | More editorial tools dashboard layout, reduced decorative competition, denser content cards |

---

## Task 1: Shared Material Language

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/GlassCard.tsx`
- Modify: `src/lib/motionTokens.ts`

- [ ] **Step 1: Inspect current shared surface definitions**

Run:

```bash
rg -n "jelly-bg|jelly-surface|jelly-button|glass-panel|glass-node" src/index.css
rg -n "useGlassClass|GlassCard" src/components/GlassCard.tsx
rg -n "JELLY_EASE|raisedHoverClass|pressableSurfaceClass" src/lib/motionTokens.ts
```

Expected:
- CSS utilities and motion tokens are located without touching product logic.

- [ ] **Step 2: Refine shared CSS for premium jelly surfaces**

Update `src/index.css` to:
- soften `jelly-bg` light blobs and reduce noisy speckles
- make `.jelly-surface`, `.jelly-button`, `.glass-panel`, `.glass-node` use tighter shadows, slightly warmer white gradients, and lighter highlight borders
- reduce mobile blur/padding pressure where decorative shells consume visible content height

Implementation note:

```css
/* Keep the same utility names; only rebalance blur, shadow, highlight, and gradient stops. */
```

- [ ] **Step 3: Refine GlassCard defaults**

Update `src/components/GlassCard.tsx` so the default glass shell:
- feels creamier and less foggy
- keeps low-performance fallback simple
- preserves all existing props/call sites

Implementation note:

```tsx
// Keep `useGlassClass()` and the GlassCard API stable.
// Only change the returned utility strings.
```

- [ ] **Step 4: Soften motion tokens**

Update `src/lib/motionTokens.ts` so press and hover interactions feel more premium and less bouncy:

```ts
export const pressableSurfaceClass = 'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]';
export const subtlePressableClass = 'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985]';
export const raisedHoverClass = 'hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]';
```

- [ ] **Step 5: Run typecheck after shared edits**

Run:

```bash
npm run lint
```

Expected:
- `tsc --noEmit` exits successfully.

---

## Task 2: HomeTab Premium Hero And Content Density

**Files:**
- Modify: `src/components/HomeTab.tsx`

- [ ] **Step 1: Locate HomeTab sections to refine**

Run:

```bash
rg -n "HERO_STORY_PILLARS|FEATURED_DESTINATIONS|EXPERT_HANDBOOKS|line-clamp|isHeroExpanded|FlightCard|FlightTable" src/components/HomeTab.tsx
```

Expected:
- Hero, featured cards, handbook cards, and flight surfaces are all easy to target.

- [ ] **Step 2: Refine the hero section rhythm**

Adjust the Home hero in `src/components/HomeTab.tsx` to:
- reduce competing decorative badges
- tighten vertical spacing around headings and helper copy
- give the search surface more focus than surrounding ornamentation
- keep the existing search interaction logic intact

Implementation note:

```tsx
// Preserve `isHeroExpanded`, form state, and pickers.
// Change section spacing, card shells, helper text tone, and decorative density only.
```

- [ ] **Step 3: Increase mobile-visible text in featured destination and handbook cards**

Update the featured destination / handbook card bodies so mobile shows more real content:
- reduce excessive image-to-text ratio where needed
- increase summary visibility from short clamps to more readable clamps
- reduce badge clutter and redundant supporting text

Implementation note:

```tsx
// Prefer `line-clamp-3` / `line-clamp-4` on mobile over aggressive `line-clamp-2`.
// Reduce decorative wrappers before shrinking actual content.
```

- [ ] **Step 4: Densify flight/search result cards without losing clarity**

Refine `FlightCard` / `FlightTable` styling so:
- material polish matches the new premium jelly language
- airline, timing, and pricing are the primary first-read targets
- mobile spacing is tightened before important data is truncated

Implementation note:

```tsx
// Keep card structure and handlers stable.
// Prioritize denser metadata rows, quieter secondary labels, and less decorative padding.
```

- [ ] **Step 5: Run typecheck after HomeTab edits**

Run:

```bash
npm run lint
```

Expected:
- TypeScript still passes after JSX/className changes.

---

## Task 3: ItineraryTab Premium Note Cards

**Files:**
- Modify: `src/components/ItineraryTab.tsx`

- [ ] **Step 1: Locate itinerary day selector and node-card sections**

Run:

```bash
rg -n "Mobile Day Selector|safeSelectedDay|node card|linkedFactId|collaboratingLock|isRecentlySynced" src/components/ItineraryTab.tsx
```

Expected:
- Day selector and node-card sections are found for targeted editing.

- [ ] **Step 2: Refine the mobile day selector into a quieter premium segmented control**

Adjust the day-toggle shell so:
- inactive states are quieter
- active state reads like a premium pill instead of a loud tab
- horizontal scan still works smoothly on mobile

Implementation note:

```tsx
// Preserve `setSelectedDay`, loading indicators, and current scroll behavior.
```

- [ ] **Step 3: Increase visible information density in node cards**

Tune itinerary node cards so mobile shows more useful content at once:
- reduce decorative chrome before touching core content
- let title, time, location/summary, and source/status breathe
- maintain edit, drag, delete, and click-to-edit behavior

Implementation note:

```tsx
// Preserve edit/view branching and existing event guards.
// Rebalance spacing, typography, and status placement only.
```

- [ ] **Step 4: Run typecheck after ItineraryTab edits**

Run:

```bash
npm run lint
```

Expected:
- No new TypeScript errors from itinerary JSX changes.

---

## Task 4: ToolsTab Editorial Dashboard Polish

**Files:**
- Modify: `src/components/ToolsTab.tsx`

- [ ] **Step 1: Locate ToolsTab hero, utility cards, and recommendation cards**

Run:

```bash
rg -n "Trip Utility Layer|toolHighlights|WeatherCard|ChecklistSection|LedgerSection|SettlementsSection|displayedFlights|activities|line-clamp" src/components/ToolsTab.tsx
```

Expected:
- Top summary, utility sections, and recommendation cards are located.

- [ ] **Step 2: Quiet the top hero so it feels like a premium summary card**

Adjust the tools hero so:
- it reads as a stable trip utility overview rather than a second marketing panel
- headline/copy density improves on mobile
- supporting chips and decorative gradients stop competing with task cards

Implementation note:

```tsx
// Preserve destination, navigation, and trip summary data flow.
```

- [ ] **Step 3: Increase readability of weather, checklist, ledger, and settlement surfaces**

Refine these sections to:
- show more useful content in the viewport
- tighten vertical padding and card gaps on mobile
- improve information hierarchy for numbers, labels, and helper copy

Implementation note:

```tsx
// Keep all fetch/state/form behavior intact; style and layout only.
```

- [ ] **Step 4: Reduce visual competition in recommendation cards**

Adjust the lower flight/activity recommendations so:
- they still feel on-brand
- they no longer outshine the main utility tasks above
- mobile text and price details remain easy to scan

- [ ] **Step 5: Run typecheck after ToolsTab edits**

Run:

```bash
npm run lint
```

Expected:
- TypeScript passes after tools-page visual edits.

---

## Task 5: Final Verification

**Files:**
- Modify: none

- [ ] **Step 1: Review changed files**

Run:

```bash
git diff -- src/index.css src/components/GlassCard.tsx src/lib/motionTokens.ts src/components/HomeTab.tsx src/components/ItineraryTab.tsx src/components/ToolsTab.tsx
```

Expected:
- Changes are limited to the agreed UI polish surface.

- [ ] **Step 2: Run final typecheck**

Run:

```bash
npm run lint
```

Expected:
- `tsc --noEmit` succeeds.

- [ ] **Step 3: Summarize verification**

Record in the final handoff:
- which surfaces were updated
- whether typecheck passed
- any visual verification that could not be completed in-browser from this environment
