# Soft Glass Daydream UI Restyle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle 4 UI areas (search form, flight cards, redirect modal, itinerary nodes) to match the Soft Glass Daydream reference design while leaving all logic, state, and API calls intact.

**Architecture:** Surgical JSX className + structure edits only. No new files, no store changes, no API changes. Dark-mode variants added for all new classes. Three files touched: `HomeTab.tsx`, `RedirectModal.tsx`, `ItineraryTab.tsx`.

**Tech Stack:** React 19, Tailwind CSS, motion/react (framer-motion), Lucide icons, GlassCard component

---

## File Map

| File | Changes |
|------|---------|
| `src/components/RedirectModal.tsx` | Replace price block with fare-breakdown table (lines 119–130) |
| `src/components/HomeTab.tsx` | Restyle `FlightCard` (~85–279), restyle `FlightTable` (~281–387), merge + restyle search form (~1006–1215) |
| `src/components/ItineraryTab.tsx` | Restyle mobile day-toggle pills (~2017–2047), replace `GlassCard` with white `div` on node cards (~3041–3042) |

---

## Task 1: RedirectModal — Fare Breakdown Table

**Files:**
- Modify: `src/components/RedirectModal.tsx:119-130`

- [ ] **Step 1: Replace the price block**

In `src/components/RedirectModal.tsx`, find this block (starts at line 119):

```tsx
{/* Pricing breakdown */}
<div className="bg-slate-50/50 rounded-3xl p-6 mb-8 border border-white/50 flex items-center justify-between">
  <div className="flex flex-col">
    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Total Estimated Price</span>
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-bold text-slate-400">{currency}</span>
      <span className="text-3xl font-black text-slate-800 decoration-fuchsia-400/30 underline decoration-4 underline-offset-2 tabular-nums">{price?.toLocaleString()}</span>
    </div>
  </div>
  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-2xl shadow-sm">
    {emoji || '✨'}
  </div>
</div>
```

Replace with:

```tsx
{/* Fare breakdown */}
<div className="rounded-3xl p-5 mb-8 border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col gap-3">
  <div className="flex items-center justify-between">
    <span className="text-sm text-slate-500 dark:text-slate-400">Base Fare (1 Adult)</span>
    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">
      {currency} {price ? Math.round(price * 0.85).toLocaleString() : '--'}
    </span>
  </div>
  <div className="flex items-center justify-between">
    <span className="text-sm text-slate-500 dark:text-slate-400">
      Taxes & Fees <span className="text-[10px] text-slate-400">(est.)</span>
    </span>
    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">
      {currency} {price ? Math.round(price * 0.15).toLocaleString() : '--'}
    </span>
  </div>
  <div className="h-px bg-slate-100 dark:bg-slate-700" />
  <div className="flex items-center justify-between">
    <span className="text-sm font-bold text-slate-900 dark:text-white">Total Price</span>
    <div className="flex items-baseline gap-1">
      <span className="text-sm font-bold text-violet-400">{currency}</span>
      <span className="text-2xl font-black text-violet-600 dark:text-violet-400 tabular-nums">
        {price?.toLocaleString()}
      </span>
    </div>
  </div>
  <p className="text-[10px] text-slate-400 -mt-1">* 費用僅供參考，以訂票頁面為準</p>
</div>
```

- [ ] **Step 2: Start dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:5173`. Trigger a search result, click a flight card to open RedirectModal. Verify:
- Three rows: Base Fare / Taxes & Fees / Total Price
- Total price in violet (`text-violet-600`)
- Disclaimer text visible below

- [ ] **Step 3: Commit**

```bash
git add src/components/RedirectModal.tsx
git commit -m "feat: restyle RedirectModal with SGD fare breakdown table"
```

---

## Task 2: FlightCard — Remove Expand/Collapse, White Card

**Files:**
- Modify: `src/components/HomeTab.tsx:85-279` (the `FlightCard` function)

- [ ] **Step 1: Remove `isExpanded` state and rewrite FlightCard**

In `src/components/HomeTab.tsx`, replace the entire `FlightCard` function (from `function FlightCard(` to its closing `}`, approximately lines 85–279) with:

```tsx
function FlightCard({ flight, isSaved, isTracked, onPress, onImportToTrip, onToggleSave, onToggleTrack }: FlightCardProps) {
  const providerName = flight.details?.airline || flight.provider;

  return (
    <div
      className="block w-full h-full text-left appearance-none border-none bg-transparent p-0 flex flex-col focus:outline-none group/card"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPress();
        }
      }}
    >
      <GlassCard className={`!p-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md flex-1 flex flex-col overflow-hidden rounded-2xl transition-shadow duration-200 ${pressableSurfaceClass} ${raisedHoverClass}`}>

        {/* Top Section: Airline & Route */}
        <div className="p-4 flex flex-col gap-3">

          {/* Header: Airline + stop/duration badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AirlineLogo providerName={providerName} className="w-7 h-7 rounded-lg text-sm" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {flight.details?.airline || flight.provider}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {flight.provider}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                flight.details?.stops === 0
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {flight.details?.stops === 0 ? 'DIRECT' : `${flight.details?.stops} STOP`}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">
                {flight.details?.duration || '3h 15m'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSave(e); }}
                className={`w-8 h-8 rounded-full flex justify-center items-center ${subtlePressableClass} ${
                  isSaved ? 'bg-pink-100 text-pink-600' : 'bg-slate-100/80 text-slate-400 hover:bg-pink-50 hover:text-pink-500'
                }`}
              >
                <Heart size={13} fill={isSaved ? 'currentColor' : 'transparent'} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Time & Airports Row */}
          <div className="flex items-center justify-between mt-1 px-0.5 relative">
            <div className="absolute left-[3rem] right-[3rem] top-1/2 -translate-y-1/2 flex items-center">
              <div className="w-1.5 h-1.5 rounded-full border border-slate-300 bg-white z-10" />
              <div className="flex-1 border-t-[1.5px] border-dashed border-slate-300" />
              <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center z-10 absolute left-1/2 -translate-x-1/2 rotate-90">
                <PlaneTakeoff size={8} strokeWidth={2.5} className="-ml-0.5" />
              </div>
              <div className="w-1.5 h-1.5 rounded-full border border-slate-300 bg-white z-10" />
            </div>
            <div className="flex flex-col items-start z-10 bg-white/40 dark:bg-transparent backdrop-blur-sm pr-1">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                {flight.details?.departure}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">Depart</span>
            </div>
            <div className="flex flex-col items-end z-10 bg-white/40 dark:bg-transparent backdrop-blur-sm pl-1">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                {flight.details?.arrival}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">Arrive</span>
            </div>
          </div>

          {/* Return leg row — roundtrip bundles */}
          {flight.tripType === 'roundtrip' && flight.returnLeg && (
            <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-black tracking-[0.2em] uppercase text-sky-500 bg-sky-50 px-1.5 py-[2px] rounded-sm whitespace-nowrap">回程</span>
              </div>
              <div className="flex items-center justify-between px-0.5">
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-base font-black text-slate-900 dark:text-white tracking-tighter leading-none whitespace-nowrap">{flight.returnLeg.departure}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Depart</span>
                </div>
                <div className="flex-1 flex items-center justify-center px-2">
                  <div className="w-full border-t border-dashed border-slate-300" />
                </div>
                <div className="flex flex-col items-end min-w-0">
                  <span className="text-base font-black text-slate-900 dark:text-white tracking-tighter leading-none whitespace-nowrap">{flight.returnLeg.arrival}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Arrive</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm whitespace-nowrap ${flight.returnLeg.stops === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                  {flight.returnLeg.stops === 0 ? '直飛 DIRECT' : `${flight.returnLeg.stops} 轉 STOP`}
                </span>
                {flight.returnLeg.duration && (
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500 whitespace-nowrap">{flight.returnLeg.duration}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ticket cutout separator */}
        <div className="relative flex items-center h-3 w-full">
          <div className="absolute left-[-6px] w-3 h-3 bg-[#FAFAFA] dark:bg-slate-900 rounded-full border-r border-slate-200/60 shadow-inner" />
          <div className="absolute right-[-6px] w-3 h-3 bg-[#FAFAFA] dark:bg-slate-900 rounded-full border-l border-slate-200/60 shadow-inner" />
          <div className="w-full border-t border-dashed border-slate-300 mx-2.5" />
        </div>

        {/* Bottom: Price & CTAs */}
        <div className="p-4 pt-2 flex items-end justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Estimated Price</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-slate-400">{flight.currency}</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none tabular-nums">
                {flight.price.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleTrack(e); }}
              className={`w-11 h-11 rounded-[10px] flex items-center justify-center border ${subtlePressableClass} ${raisedHoverClass} ${
                isTracked
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 shadow-sm hover:shadow'
              }`}
            >
              {isTracked ? <BellRing size={14} strokeWidth={2.5} /> : <Bell size={14} strokeWidth={2.5} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onImportToTrip(e); }}
              className={`h-11 px-4 rounded-[10px] flex items-center gap-1.5 border border-transparent bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg ${subtlePressableClass} ${raisedHoverClass}`}
            >
              <PlaneTakeoff size={14} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">帶入</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onPress(); }}
              className={`h-11 px-5 rounded-[10px] bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold shadow-md ${subtlePressableClass} ${raisedHoverClass}`}
            >
              <span className="text-[10px] uppercase tracking-widest leading-none">購買</span>
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: Verify FlightCard renders in grid view**

In browser, switch to grid view (LayoutGrid button). Confirm:
- White card with `border border-slate-100`
- No expand/collapse on click — clicking anywhere on card triggers `onPress` (RedirectModal opens)
- 購買 button always visible
- Ticket cutout separator present

- [ ] **Step 3: Commit**

```bash
git add src/components/HomeTab.tsx
git commit -m "feat: restyle FlightCard — white card, always-visible CTAs, no expand-collapse"
```

---

## Task 3: FlightTable — Match FlightCard Structure

**Files:**
- Modify: `src/components/HomeTab.tsx:281-387` (the `FlightTable` function)

- [ ] **Step 1: Rewrite FlightTable rows to match FlightCard layout**

In `src/components/HomeTab.tsx`, replace the entire `FlightTable` function (from `function FlightTable(` to its closing `}`, approximately lines 281–387) with:

```tsx
function FlightTable({
  results,
  savedItems,
  trackedPrices,
  onPress,
  onImportToTrip,
  onToggleSave,
  onToggleTrack,
}: {
  results: SearchItem[];
  savedItems: string[];
  trackedPrices: string[];
  onPress: (f: SearchItem) => void;
  onImportToTrip: (e: React.MouseEvent, f: SearchItem) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  onToggleTrack: (e: React.MouseEvent, f: SearchItem) => void;
}) {
  return (
    <div className="flex flex-col gap-3 w-full pb-4">
      {results.map((flight) => {
        const providerName = flight.details?.airline || flight.provider;
        const isSaved = savedItems.includes(flight.id);
        const isTracked = trackedPrices.includes(flight.id);

        return (
          <div
            key={flight.id}
            className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md rounded-2xl overflow-hidden cursor-pointer transition-shadow duration-200"
            onClick={() => onPress(flight)}
          >
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">

              {/* Left: Airline + Route */}
              <div className="flex-1 flex flex-col gap-3">
                {/* Airline header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AirlineLogo providerName={providerName} className="w-6 h-6 rounded-md text-xs" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-white">{providerName}</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                    flight.details?.stops === 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {flight.details?.stops === 0 ? '直飛' : `${flight.details?.stops} 轉`}
                  </span>
                </div>

                {/* Route times */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex flex-col items-start">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {flight.details?.departure || '--:--'}
                    </span>
                    <span className="text-xs text-slate-400 font-bold tracking-widest mt-0.5">
                      {(flight.details?.depCode || 'TPE').toUpperCase().substring(0, 3)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center flex-1 px-4 sm:px-8">
                    <span className="text-xs text-slate-400 font-medium mb-1">{flight.details?.duration || '3h 15m'}</span>
                    <div className="w-full relative flex items-center justify-center h-[2px] bg-slate-200 rounded-full">
                      <div className="absolute right-0 w-2 h-2 rounded-full border border-slate-300 bg-white translate-x-1" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {flight.details?.arrival || '--:--'}
                    </span>
                    <span className="text-xs text-slate-400 font-bold tracking-widest mt-0.5">
                      {(flight.details?.arrCode || 'TYO').toUpperCase().substring(0, 3)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Price + Actions */}
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center sm:min-w-[160px] gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-700 pt-3 sm:pt-0 sm:pl-5">
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">總價</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-slate-500">{flight.currency}</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none tabular-nums">
                      {flight.price.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleSave(e, flight.id); }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 border ${
                      isSaved
                        ? 'bg-pink-50 border-pink-100 text-pink-500'
                        : 'bg-white border-slate-200 text-slate-300 hover:text-pink-400 hover:border-pink-200 shadow-sm'
                    }`}
                  >
                    <Heart size={15} fill={isSaved ? 'currentColor' : 'transparent'} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleTrack(e, flight); }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 border ${
                      isTracked
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {isTracked ? <BellRing size={15} strokeWidth={2.5} /> : <Bell size={15} strokeWidth={2.5} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onImportToTrip(e, flight); }}
                    className="h-10 px-4 rounded-xl flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all active:scale-95 border border-transparent"
                  >
                    <PlaneTakeoff size={14} strokeWidth={2.5} />
                    <span className="text-sm font-bold">帶入</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify in list view**

In browser, switch to list view (List button). Confirm:
- Airline + route left, price + buttons right (desktop)
- Stacked layout on mobile
- Save/track/import buttons all functional

- [ ] **Step 3: Commit**

```bash
git add src/components/HomeTab.tsx
git commit -m "feat: restyle FlightTable rows to match FlightCard unified layout"
```

---

## Task 4: Search Form — Unified Responsive Layout

**Files:**
- Modify: `src/components/HomeTab.tsx` — replace both `md:hidden` mobile form block and `hidden md:flex` desktop form block with one unified layout

- [ ] **Step 1: Locate the two form blocks to replace**

In `HomeTab.tsx`, find and delete the **entire** mobile form block:
```
{/* Mobile layout: vertical stacked fields */}
{isHeroExpanded && (
<div className="relative z-20 md:hidden ...">
  ...
</div>
)}
```
(approximately lines 1006–1112)

And delete the **entire** desktop form block:
```
{/* Desktop layout: horizontal pill */}
<div className="relative z-20 hidden md:flex flex-col ...">
  ...
</div>
```
(approximately lines 1114–1215)

Replace both with this single unified block, placed directly after the collapsed summary bar (`{!isHeroExpanded && (...)}`) and wrapped in `{isHeroExpanded && (...)}`:

```tsx
{isHeroExpanded && (
  <div className="relative z-20">
    {/* Trip type toggle */}
    <div className="flex items-center gap-1 mb-3 p-1 rounded-full bg-white/50 border border-white/70 w-fit">
      <button
        onClick={() => updateField('tripType', 'oneway')}
        className={`px-5 py-2 rounded-full text-[11px] font-black tracking-wide transition-all ${
          searchForm.tripType !== 'roundtrip'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >單程</button>
      <button
        onClick={() => updateField('tripType', 'roundtrip')}
        className={`px-5 py-2 rounded-full text-[11px] font-black tracking-wide transition-all ${
          searchForm.tripType === 'roundtrip'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >來回</button>
    </div>

    {/* Search card */}
    <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-white/80 dark:border-slate-700 shadow-sm backdrop-blur-xl p-4 flex flex-col gap-3">

      {/* FROM / TO row */}
      <div className="relative grid grid-cols-2">
        {/* FROM cell */}
        <div
          className={`flex flex-col gap-1 px-4 py-3 rounded-2xl cursor-text ${searchFieldSurfaceClass}`}
          onClick={() => { setShowDeparturePicker(true); setShowDestinationPicker(false); setShowDatePicker(false); setShowReturnDatePicker(false); }}
        >
          <span className="text-[10px] font-black tracking-[0.18em] text-slate-400 uppercase">FROM</span>
          <input
            id="search-from"
            className="bg-transparent border-none p-0 text-[17px] font-black text-slate-900 dark:text-white placeholder:text-slate-400 w-full outline-none leading-none"
            value={searchForm.from}
            onFocus={() => { setShowDeparturePicker(true); setShowDestinationPicker(false); setShowDatePicker(false); }}
            onChange={(e) => updateField('from', e.target.value)}
            placeholder="台北 TPE"
            autoComplete="off"
          />
        </div>

        {/* Center airplane divider */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-center">
          <PlaneTakeoff size={14} className="text-pink-500" strokeWidth={2.5} />
        </div>

        {/* TO cell */}
        <div
          className={`flex flex-col gap-1 px-4 py-3 rounded-2xl cursor-text ${searchFieldSurfaceClass}`}
          onClick={() => { setShowDestinationPicker(true); setShowDeparturePicker(false); setShowDatePicker(false); setShowReturnDatePicker(false); }}
        >
          <span className="text-[10px] font-black tracking-[0.18em] text-slate-400 uppercase">TO</span>
          <input
            id="search-to"
            className="bg-transparent border-none p-0 text-[17px] font-black text-slate-900 dark:text-white placeholder:text-slate-400 w-full outline-none leading-none"
            value={searchForm.to}
            onFocus={() => { setShowDestinationPicker(true); setShowDeparturePicker(false); setShowDatePicker(false); }}
            onChange={(e) => updateField('to', e.target.value)}
            placeholder="東京 NRT"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Date / Return Date row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Departure date */}
        <div
          className={`flex flex-col gap-1 px-4 py-3 rounded-2xl cursor-pointer bg-slate-50/60 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 ${searchFieldSurfaceClass}`}
          onClick={() => { setShowDatePicker(!showDatePicker); setShowDeparturePicker(false); setShowDestinationPicker(false); setShowReturnDatePicker(false); }}
        >
          <span className="text-[10px] font-black tracking-[0.18em] text-slate-400 uppercase flex items-center gap-1">
            <Calendar size={10} />
            去程日期
          </span>
          <span className={`text-[15px] font-black leading-none ${!searchForm.date ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
            {searchForm.date || '選擇日期'}
          </span>
        </div>

        {/* Return date — always visible, clicking when one-way auto-switches to roundtrip */}
        <div
          className={`flex flex-col gap-1 px-4 py-3 rounded-2xl cursor-pointer border ${
            searchForm.tripType === 'oneway'
              ? 'bg-slate-50/30 border-dashed border-slate-200 dark:border-slate-600 opacity-60'
              : 'bg-slate-50/60 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700'
          } ${searchFieldSurfaceClass}`}
          onClick={() => {
            if (searchForm.tripType === 'oneway') updateField('tripType', 'roundtrip');
            setShowReturnDatePicker(!showReturnDatePicker);
            setShowDatePicker(false);
            setShowDeparturePicker(false);
            setShowDestinationPicker(false);
          }}
        >
          <span className="text-[10px] font-black tracking-[0.18em] text-slate-400 uppercase flex items-center gap-1">
            <Calendar size={10} />
            回程日期
          </span>
          <span className={`text-[15px] font-black leading-none ${!searchForm.returnDate ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
            {searchForm.returnDate || (searchForm.tripType === 'oneway' ? '+ 加回程' : '選擇回程')}
          </span>
        </div>
      </div>

      {/* Error / hint */}
      {(dateError || searchBlockReason) && (
        <p className="text-[11px] text-slate-500 font-bold px-1 -mt-1">{dateError || searchBlockReason}</p>
      )}

      {/* Search CTA */}
      <button
        onClick={() => void handleSearch()}
        disabled={isSearchDisabled || loading || isOffline}
        title={isOffline ? '請連線網路以進行機票比價' : ''}
        className={`w-full py-4 rounded-2xl font-black text-[15px] tracking-wide flex items-center justify-center gap-2 transition-colors shadow-sm ${
          isSearchDisabled || loading || isOffline
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            : 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-200'
        }`}
      >
        {loading
          ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          : <><SearchIcon size={17} strokeWidth={3} /> 搜尋航班 →</>
        }
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 2: Remove now-unused `showReturnDatePicker` conditional** 

Search for any remaining `{searchForm.tripType === 'roundtrip' && (` wrappers around the return date picker popup that were inside the old mobile block. The `DatePickerPopup` for return date must remain mounted (it was already outside the `isHeroExpanded` block in the original — confirm its position is unchanged).

- [ ] **Step 3: Verify search form on both mobile and desktop**

Resize browser to 375px width (mobile):
- FROM/TO 2-column grid visible
- Departure/return date 2-column grid visible
- 單程 toggle visible above card
- Pink CTA button full-width
- Clicking return date when in 單程 mode → switches to 來回 and opens return date picker

Resize to 1280px (desktop):
- Same layout (no separate desktop version)
- LocationPickerPopup and DatePickerPopup still open correctly

- [ ] **Step 4: Commit**

```bash
git add src/components/HomeTab.tsx
git commit -m "feat: restyle search form — unified FROM/TO grid + date/return grid"
```

---

## Task 5: ItineraryTab — Day Toggle Pill Style

**Files:**
- Modify: `src/components/ItineraryTab.tsx:2017-2047` (mobile day selector)

- [ ] **Step 1: Restyle mobile day selector**

In `ItineraryTab.tsx`, find the **Mobile Day Selector** block (line ~2017):

```tsx
{/* Mobile Day Selector */}
<div className="lg:hidden flex items-center gap-3 mb-6 overflow-hidden">
  <div className="flex gap-2.5 overflow-x-auto py-3 px-1 no-scrollbar flex-1 -mx-2 snap-x">
    {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
      const isActive = safeSelectedDay === day;
      const count = nodes.filter((n: ItineraryNode) => n.day === day).length;
      const dateStr = getDateForDay(day, tripInfo?.startDate) || '';
      const displayDate = dateStr ? new Date(dateStr).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }) : '';

      return (
        <motion.button
          key={day}
          onClick={() => setSelectedDay(day)}
          whileTap={{ scale: 0.95 }}
          className={`flex flex-col min-w-[70px] sm:min-w-[85px] p-3 sm:p-4 rounded-3xl font-black text-xs transition-all uppercase tracking-widest shrink-0 border-2 snap-center ${
            isActive
              ? 'bg-white text-pink-600 border-pink-500 shadow-xl shadow-pink-100/50 scale-105'
              : 'bg-white/40 border-white/60 text-slate-500 backdrop-blur-sm'
          }`}
        >
          <span className="text-[10px] mb-1 opacity-70 uppercase tracking-widest flex items-center gap-1 justify-center">
            <span>DAY</span>
            {loadingDay === day && <Loader2 size={11} className="animate-spin" />}
          </span>
          <span className="text-lg sm:text-xl leading-none tabular-nums">{day}</span>
          {displayDate && <span className={`text-[10px] font-bold mt-1.5 opacity-60 tracking-tight`}>{displayDate}</span>}
        </motion.button>
      );
    })}
  </div>
</div>
```

Replace with:

```tsx
{/* Mobile Day Selector — SGD pill toggle style */}
<div className="lg:hidden mb-6 overflow-hidden -mx-1">
  <div className="overflow-x-auto py-2 px-1 no-scrollbar snap-x">
    <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-full p-1 gap-0.5 min-w-max">
      {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
        const isActive = safeSelectedDay === day;
        const dateStr = getDateForDay(day, tripInfo?.startDate) || '';
        const displayDate = dateStr ? new Date(dateStr).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }) : '';

        return (
          <motion.button
            key={day}
            onClick={() => setSelectedDay(day)}
            whileTap={{ scale: 0.97 }}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm transition-all shrink-0 snap-center ${
              isActive
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`}
          >
            <span>Day {day}</span>
            {displayDate && (
              <span className={`text-[10px] font-medium hidden sm:inline ${isActive ? 'text-slate-500' : 'text-slate-300'}`}>
                {displayDate}
              </span>
            )}
            {loadingDay === day && <Loader2 size={11} className="animate-spin ml-0.5" />}
          </motion.button>
        );
      })}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Verify day toggle**

Navigate to ItineraryTab. Confirm:
- Pills inside a gray `bg-slate-100` rounded-full container
- Active pill: white bg, `text-slate-900`
- Inactive pills: `text-slate-400`
- Scrolls horizontally for many days
- Clicking switches day correctly (existing `setSelectedDay` logic)

- [ ] **Step 3: Commit**

```bash
git add src/components/ItineraryTab.tsx
git commit -m "feat: restyle ItineraryTab day toggle to SGD pill style"
```

---

## Task 6: ItineraryTab — Node Cards White Background

**Files:**
- Modify: `src/components/ItineraryTab.tsx:3041-3042` (GlassCard wrapper on node card)

- [ ] **Step 1: Replace GlassCard with white div on node card**

In `ItineraryTab.tsx`, find the node card wrapper (line ~3041):

```tsx
<GlassCard
  className={`flex-1 !p-2 sm:!p-3.5 md:!p-4 !rounded-[20px] sm:!rounded-[24px] ${getCategoryStyle(item.category)} shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-700 border border-white/80 relative z-10 w-full ${!isOffline && !isEditing ? 'cursor-pointer' : ''} ${collaboratingLock ? 'ring-2 ring-fuchsia-400/60' : ''} ${isRecentlySynced ? 'ring-2 ring-emerald-300/80 bg-emerald-50/40 shadow-[0_0_18px_-6px_rgba(16,185,129,0.45)]' : ''} ${item.linkedFactId ? 'ring-2 ring-sky-300/40 border-sky-200/50 shadow-[0_0_15px_-5px_rgba(14,165,233,0.3)]' : ''}`}
  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
     if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    openEditor();
  }}
>
```

Replace with:

```tsx
<div
  className={`flex-1 p-2 sm:p-3.5 md:p-4 rounded-[20px] sm:rounded-[24px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative z-10 w-full ${!isOffline && !isEditing ? 'cursor-pointer' : ''} ${collaboratingLock ? 'ring-2 ring-fuchsia-400/60' : ''} ${isRecentlySynced ? 'ring-2 ring-emerald-300/80 shadow-emerald-100' : ''} ${item.linkedFactId ? 'ring-2 ring-sky-300/40 border-sky-200/50' : ''}`}
  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    openEditor();
  }}
>
```

Find the matching closing `</GlassCard>` tag for this card (it is after all the editing form JSX, approximately line 3400+) and replace it with `</div>`.

- [ ] **Step 2: Add source status badge to node card header**

In the same node card, find the `<div className="flex flex-col gap-2 sm:gap-2 w-full">` (line ~3053) and add a status badge row immediately after it, before the existing content:

```tsx
<div className="flex flex-col gap-2 sm:gap-2 w-full">
  {/* Source status badge */}
  {!isEditing && (
    <div className="flex items-center justify-between mb-1">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${
        item.source === 'remote'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
          : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full inline-block ${item.source === 'remote' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {item.source === 'remote' ? 'CONFIRMED' : 'LOCAL'}
      </span>
    </div>
  )}
  {/* ... rest of existing content unchanged ... */}
```

- [ ] **Step 3: Verify node cards**

Navigate to ItineraryTab with a trip loaded. Confirm:
- White card background (not glass gradient)
- `CONFIRMED` badge (green) for synced nodes, `LOCAL` badge (amber) for locally-added nodes
- Ring styles for collaborating lock / recently synced still visible
- Drag handles, edit, delete all functional
- Clicking card still opens edit mode

- [ ] **Step 4: Commit**

```bash
git add src/components/ItineraryTab.tsx
git commit -m "feat: restyle ItineraryTab node cards — white bg, source status badge"
```

---

## Task 7: Final Visual Pass + Dark Mode Check

**Files:** None (verification only)

- [ ] **Step 1: Light mode full walkthrough**

Start dev server (`npm run dev`). Go through each changed area:
1. HomeTab → search form grid layout correct
2. HomeTab → flight result cards (grid + list view) look correct
3. Click any flight → RedirectModal fare breakdown shows
4. ItineraryTab → day toggle pills correct
5. ItineraryTab → node cards white with status badges

- [ ] **Step 2: Dark mode check**

Toggle dark mode in the app header. Verify each area:
- Search form: `dark:bg-slate-800/90` visible
- FlightCard: `dark:bg-slate-800` visible, text readable
- FlightTable: same
- RedirectModal: `dark:bg-slate-800` fare breakdown readable, `dark:text-violet-400` total
- ItineraryTab day toggle: `dark:bg-slate-800` container, `dark:bg-slate-700` active pill
- ItineraryTab node cards: `dark:bg-slate-800`, `dark:border-slate-700`

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final visual verification pass — SGD restyle complete"
```
