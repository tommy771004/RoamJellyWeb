# Design Spec: AI Loading Typewriter Effect & Keyboard Fix

Date: 2026-05-14  
Status: Approved

---

## Overview

Two independent UX improvements:

1. **Typewriter effect** — Replace static/fade AI loading messages with character-by-character reveal animation in both the full-screen `AiLoadingState` and the ItineraryTab day-view inline loading card.
2. **visualViewport keyboard fix** — Prevent the AiForm "下一步" button from being obscured by the mobile virtual keyboard on iOS Safari.

---

## Feature 1: useTypewriter Hook + Animated Loading Messages

### Hook: `src/lib/useTypewriter.ts`

- **Signature:** `useTypewriter(text: string, speed?: number): { displayed: string; done: boolean }`
- **`speed`:** ms per character, default `38`
- **Behaviour:**
  - On mount or when `text` changes: reset `displayed` to `""`, restart interval
  - Interval appends one character from `text` per tick
  - When `displayed === text`: clear interval, set `done = true`
  - Cleanup interval on unmount
- **No external dependencies** — pure React (`useState`, `useEffect`)

### AiLoadingState.tsx changes

- Import `useTypewriter`
- Current message rotation interval: 2800ms → **3200ms** (allow time to finish typing a ~40-char message at 38ms/char ≈ 1.5s)
- Pass `MESSAGES[msgIndex]` to `useTypewriter`; render `displayed` instead of the full string
- Append a `<span>` blinking cursor `|` that is visible while `!done`, hidden after
- Cursor blink: CSS `animate-pulse` or `@keyframes blink`
- `AnimatePresence` fade between messages unchanged (wraps the whole text+cursor block)

### ItineraryTab day-view loading card changes

- Location: line ~3634 — `AI_LOADING_QUOTES[aiQuoteIndex]`
- The `DayTimeline` sub-component (or wherever `aiQuoteIndex` state lives) calls `useTypewriter(AI_LOADING_QUOTES[aiQuoteIndex])`
- Renders `displayed` + cursor `|` in place of the raw quote string
- Rotation interval for `aiQuoteIndex`: unchanged (already 3000ms-ish, enough for typing)

---

## Feature 2: useKeyboardHeight Hook + AiForm Button Fix

### Hook: `src/lib/useKeyboardHeight.ts`

- **Signature:** `useKeyboardHeight(): number`
- **Returns:** `keyboardHeight` in px (0 when keyboard is closed or on desktop)
- **Implementation:**
  ```ts
  const vv = window.visualViewport;
  const height = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  ```
- **Events:** `visualViewport.addEventListener('resize', handler)` + `scroll`
- **SSR guard:** `typeof window === 'undefined'` returns 0
- **Desktop guard:** returns 0 when `window.innerWidth >= 768` (md breakpoint) to avoid interfering with desktop layout

### AiForm.tsx changes

- Import `useKeyboardHeight`
- `const keyboardHeight = useKeyboardHeight()`
- **"下一步" button container** (currently `sticky bottom-4 sm:static`):
  - Change to `fixed bottom-0 left-0 right-0 z-[100] sm:static sm:z-auto`
  - Apply `style={{ paddingBottom: keyboardHeight || 16 }}` so the button floats above keyboard
  - Apply `className="px-4 sm:px-8 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm pt-3"` for visual clarity
- **Spacer div** at bottom of step 1 content (before the button group):
  - `<div style={{ height: keyboardHeight + 72 }} className="sm:hidden shrink-0" />`
  - Prevents the last form field (companions selector) from hiding behind the fixed button
- **Step 2 buttons** ("返回" + "生成行程") — same fixed treatment; fixed container uses `max-w-4xl mx-auto px-4 sm:px-8` to match form width; `keyboardHeight` hook already mounted

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/useTypewriter.ts` | New hook |
| `src/lib/useKeyboardHeight.ts` | New hook |
| `src/components/AiLoadingState.tsx` | Use typewriter hook, extend rotation interval |
| `src/components/AiForm.tsx` | Fixed button positioning, keyboard spacer |
| `src/components/ItineraryTab.tsx` | Typewriter in day-view AI loading card |

---

## Edge Cases

- **Message shorter than typing speed:** `done` fires quickly, cursor disappears fast — acceptable
- **User rotates device:** `visualViewport` resize fires, `keyboardHeight` recalculates — correct
- **Keyboard closes:** `keyboardHeight` drops to 0, button snaps back to bottom of form — correct
- **Desktop (sm+):** `useKeyboardHeight` returns 0, button reverts to `sm:static` via Tailwind, no layout change
- **SSR:** Both hooks guard `typeof window`, return 0 — no build error
