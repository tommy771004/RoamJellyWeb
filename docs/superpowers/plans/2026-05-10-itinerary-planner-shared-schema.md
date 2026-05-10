# Shared Itinerary Planner Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify AI itinerary planner schema, defaults, options, and prompt-context generation across `AiForm.tsx`, `ItineraryTab.tsx`, and `aiItineraryService.ts` so food/clothing/stay/mobility preferences consistently affect itinerary generation.

**Architecture:** Introduce a shared planner module in `src/lib/itineraryPlanner.ts` that owns default form values, option sets, array/text-list helpers, and prompt-summary generation. Refactor both planner UIs to consume that module and extend the backend prompt builder so the full shared planner schema reaches AI generation and is covered by tests.

**Tech Stack:** TypeScript, React 19, Vite, node:test, tsx, Express

---

### Task 1: Expand Shared Planner Schema And Helper Module

**Files:**
- Create: `src/lib/itineraryPlanner.ts`
- Create: `src/lib/itineraryPlanner.test.ts`
- Modify: `src/types/workflow.ts`

- [ ] **Step 1: Extend the planner type with shared food/stay/clothing/mobility fields**

Update `src/types/workflow.ts` so `ItineraryPlannerForm` becomes:

```ts
export interface ItineraryPlannerForm {
  days: number;
  departureFrom: string;
  arrivalTo: string;
  flightDate: string;
  countries: string[];
  mustVisitSpots: string[];
  mustEatFoods: string[];
  autoFlightSegments: string[];
  travelFactsContext: string;
  notes: string;
  companions?: string;
  vibes?: string[];
  interests?: string[];
  budget?: string;
  dietary?: string[];
  transport?: string[];
  foodPreferences?: string[];
  stayPreferences?: string[];
  clothingNeeds?: string[];
  mobilityPreferences?: string[];
}
```

- [ ] **Step 2: Write the failing shared-helper tests first**

Create `src/lib/itineraryPlanner.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDefaultPlannerForm,
  buildPlannerPromptContext,
  parsePlannerTextList,
  togglePlannerArrayValue,
} from './itineraryPlanner';

test('buildDefaultPlannerForm includes new shared preference fields', () => {
  const form = buildDefaultPlannerForm('Tokyo', 5);

  assert.equal(form.arrivalTo, 'Tokyo');
  assert.equal(form.days, 5);
  assert.deepEqual(form.foodPreferences, []);
  assert.deepEqual(form.stayPreferences, []);
  assert.deepEqual(form.clothingNeeds, []);
  assert.deepEqual(form.mobilityPreferences, []);
});

test('parsePlannerTextList de-duplicates comma and newline separated values', () => {
  assert.deepEqual(
    parsePlannerTextList('拉麵, 壽司\n拉麵，咖啡'),
    ['拉麵', '壽司', '咖啡'],
  );
});

test('togglePlannerArrayValue adds and removes values predictably', () => {
  assert.deepEqual(togglePlannerArrayValue(['少走路'], '少走路'), []);
  assert.deepEqual(togglePlannerArrayValue(['少走路'], '可早起'), ['少走路', '可早起']);
});

test('buildPlannerPromptContext includes food stay clothing and mobility sections', () => {
  const context = buildPlannerPromptContext({
    ...buildDefaultPlannerForm('Kyoto', 4),
    mustEatFoods: ['湯豆腐'],
    foodPreferences: ['甜點咖啡店'],
    stayPreferences: ['近車站'],
    clothingNeeds: ['防雨'],
    mobilityPreferences: ['少走路'],
  });

  assert.match(context, /湯豆腐/);
  assert.match(context, /甜點咖啡店/);
  assert.match(context, /近車站/);
  assert.match(context, /防雨/);
  assert.match(context, /少走路/);
});
```

- [ ] **Step 3: Run the helper tests to verify they fail**

Run:

```bash
npx tsx --test src/lib/itineraryPlanner.test.ts
```

Expected: FAIL because `src/lib/itineraryPlanner.ts` does not exist yet.

- [ ] **Step 4: Implement the shared planner module**

Create `src/lib/itineraryPlanner.ts`:

```ts
import type { ItineraryPlannerForm } from '../types/workflow';

export const PLANNER_COMPANION_OPTIONS = [
  { id: 'solo', label: '獨行俠', emoji: '🚶' },
  { id: 'couple', label: '浪漫雙人', emoji: '💑' },
  { id: 'family', label: '親子育兒', emoji: '👨‍👩‍👧‍👦' },
  { id: 'elderly', label: '帶長輩', emoji: '👵' },
  { id: 'friends', label: '三五好友', emoji: '🍻' },
] as const;

export const PLANNER_VIBE_OPTIONS = ['特種兵', '睡到自然醒', '隨興漫遊', '在地深度', '網美打卡'] as const;
export const PLANNER_INTEREST_OPTIONS = ['大自然', '歷史文化', '購物血拼', '主題樂園', '在地美食', '戶外刺激'] as const;
export const PLANNER_DIETARY_OPTIONS = ['無限制', '純素', '蛋奶素', '無麩質', '不吃海鮮'] as const;
export const PLANNER_TRANSPORT_OPTIONS = ['大眾運輸', '自駕', '包車', '徒步為主'] as const;
export const PLANNER_BUDGET_OPTIONS = ['窮遊', '小資', '舒適', '奢華'] as const;
export const PLANNER_FOOD_PREFERENCE_OPTIONS = ['在地早餐', '甜點咖啡店', '宵夜友善', '市場小吃', '高級餐廳'] as const;
export const PLANNER_STAY_PREFERENCE_OPTIONS = ['近車站', '溫泉旅館', '設計旅宿', '晚回飯店也可', '午間可回飯店休息'] as const;
export const PLANNER_CLOTHING_NEED_OPTIONS = ['好拍穿搭', '保暖優先', '防曬', '防雨', '輕便好走'] as const;
export const PLANNER_MOBILITY_PREFERENCE_OPTIONS = ['少走路', '少轉乘', '可跨城市', '可早起', '可夜間移動'] as const;

export function buildDefaultPlannerForm(destination: string, days: number): ItineraryPlannerForm {
  return {
    days,
    departureFrom: '台北',
    arrivalTo: destination,
    flightDate: '2026-06-15',
    countries: [],
    mustVisitSpots: [],
    mustEatFoods: [],
    autoFlightSegments: [],
    travelFactsContext: '',
    notes: '',
    companions: '',
    vibes: [],
    interests: [],
    budget: '',
    dietary: [],
    transport: [],
    foodPreferences: [],
    stayPreferences: [],
    clothingNeeds: [],
    mobilityPreferences: [],
  };
}

export function parsePlannerTextList(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,，、]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function togglePlannerArrayValue(values: string[], nextValue: string): string[] {
  return values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue];
}

function joinOrFallback(values: string[] | undefined, fallback = '未指定') {
  return values && values.length > 0 ? values.join('、') : fallback;
}

export function buildPlannerPromptContext(form: ItineraryPlannerForm): string {
  return [
    `旅伴: ${form.companions || '未指定'}`,
    `旅遊節奏: ${joinOrFallback(form.vibes)}`,
    `興趣偏好: ${joinOrFallback(form.interests)}`,
    `預算等級: ${form.budget || '未指定'}`,
    `飲食需求: ${joinOrFallback(form.dietary)}`,
    `交通偏好: ${joinOrFallback(form.transport)}`,
    `必吃清單: ${joinOrFallback(form.mustEatFoods)}`,
    `食的偏好: ${joinOrFallback(form.foodPreferences)}`,
    `住的偏好: ${joinOrFallback(form.stayPreferences)}`,
    `衣的偏好: ${joinOrFallback(form.clothingNeeds)}`,
    `行的偏好: ${joinOrFallback(form.mobilityPreferences)}`,
  ].join('\n');
}
```

- [ ] **Step 5: Run the helper tests again**

Run:

```bash
npx tsx --test src/lib/itineraryPlanner.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the schema/helper foundation**

Run:

```bash
git add src/types/workflow.ts src/lib/itineraryPlanner.ts src/lib/itineraryPlanner.test.ts
git commit -m "refactor: add shared itinerary planner schema helpers"
```

### Task 2: Refactor AiForm To Use The Shared Planner Schema

**Files:**
- Modify: `src/components/AiForm.tsx`
- Test: `src/lib/itineraryPlanner.test.ts`

- [ ] **Step 1: Write a focused failing test for prompt-context compatibility**

Append to `src/lib/itineraryPlanner.test.ts`:

```ts
test('shared planner defaults support AiForm submission shape', () => {
  const form = buildDefaultPlannerForm('Osaka', 3);

  form.departureFrom = '台北';
  form.arrivalTo = '大阪';
  form.companions = 'solo';
  form.vibes = ['隨興漫遊'];
  form.foodPreferences = ['在地早餐'];

  assert.equal(form.departureFrom, '台北');
  assert.equal(form.arrivalTo, '大阪');
  assert.equal(form.companions, 'solo');
  assert.deepEqual(form.foodPreferences, ['在地早餐']);
});
```

- [ ] **Step 2: Run the test to verify the current shared helpers still pass and provide a safe baseline**

Run:

```bash
npx tsx --test src/lib/itineraryPlanner.test.ts
```

Expected: PASS. This is a guardrail before moving `AiForm.tsx` onto the shared shape.

- [ ] **Step 3: Replace `AiFormData` and local constants with shared imports**

In `src/components/AiForm.tsx`, replace the top-level planner definitions with:

```ts
import type { ItineraryPlannerForm } from '../types/workflow';
import {
  buildDefaultPlannerForm,
  PLANNER_BUDGET_OPTIONS,
  PLANNER_COMPANION_OPTIONS,
  PLANNER_CLOTHING_NEED_OPTIONS,
  PLANNER_DIETARY_OPTIONS,
  PLANNER_FOOD_PREFERENCE_OPTIONS,
  PLANNER_INTEREST_OPTIONS,
  PLANNER_MOBILITY_PREFERENCE_OPTIONS,
  PLANNER_STAY_PREFERENCE_OPTIONS,
  PLANNER_TRANSPORT_OPTIONS,
  PLANNER_VIBE_OPTIONS,
  togglePlannerArrayValue,
} from '../lib/itineraryPlanner';
```

And update the props/state signatures to:

```ts
export default function AiForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: ItineraryPlannerForm) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [showDepDropdown, setShowDepDropdown] = useState(false);
  const [formData, setFormData] = useState<ItineraryPlannerForm>(() => buildDefaultPlannerForm('', 5));
```

- [ ] **Step 4: Swap AiForm state accessors onto shared field names**

Update field usage so `departure` becomes `departureFrom` and `destination` becomes `arrivalTo`:

```ts
const handleNext = () => {
  if (formData.departureFrom && formData.arrivalTo && formData.companions) {
    setStep(2);
  }
};

const handleSubmit = () => {
  onSubmit(formData);
};

const toggleArrayItem = (
  field:
    | 'vibes'
    | 'interests'
    | 'dietary'
    | 'transport'
    | 'foodPreferences'
    | 'stayPreferences'
    | 'clothingNeeds'
    | 'mobilityPreferences',
  item: string,
) => {
  setFormData((prev) => ({
    ...prev,
    [field]: togglePlannerArrayValue(prev[field] || [], item),
  }));
};
```

- [ ] **Step 5: Add the new food/stay/clothing/mobility preference chips in step two**

Add four UI groups in `AiForm.tsx` using the shared option arrays:

```tsx
<div className="flex flex-col gap-5">
  <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">食的偏好</label>
  <div className="flex flex-wrap gap-2">
    {PLANNER_FOOD_PREFERENCE_OPTIONS.map((item) => (
      <MultiSelectPill
        key={item}
        label={item}
        selected={(formData.foodPreferences || []).includes(item)}
        onClick={() => toggleArrayItem('foodPreferences', item)}
      />
    ))}
  </div>
</div>
```

Repeat the same pattern for `PLANNER_STAY_PREFERENCE_OPTIONS`, `PLANNER_CLOTHING_NEED_OPTIONS`, and `PLANNER_MOBILITY_PREFERENCE_OPTIONS`.

- [ ] **Step 6: Run typecheck to catch field mismatches introduced by the refactor**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit the AiForm refactor**

Run:

```bash
git add src/components/AiForm.tsx src/lib/itineraryPlanner.ts src/lib/itineraryPlanner.test.ts
git commit -m "refactor: move ai form to shared planner schema"
```

### Task 3: Refactor ItineraryTab To Use Shared Planner Helpers And Structured Preferences

**Files:**
- Modify: `src/components/ItineraryTab.tsx`
- Modify: `src/lib/openrouterApi.ts`
- Test: `src/lib/itineraryPlanner.test.ts`

- [ ] **Step 1: Add a regression guard test for prompt summaries with freeform notes**

Append to `src/lib/itineraryPlanner.test.ts`:

```ts
test('buildPlannerPromptContext keeps notes separate from structured preference sections', () => {
  const context = buildPlannerPromptContext({
    ...buildDefaultPlannerForm('Fukuoka', 4),
    notes: '下午節奏慢一點',
    transport: ['大眾運輸'],
    mobilityPreferences: ['少轉乘'],
  });

  assert.match(context, /交通偏好: 大眾運輸/);
  assert.match(context, /行的偏好: 少轉乘/);
  assert.doesNotMatch(context, /下午節奏慢一點/);
});
```

- [ ] **Step 2: Run the helper test suite and verify the guard passes before the `ItineraryTab.tsx` refactor**

Run:

```bash
npx tsx --test src/lib/itineraryPlanner.test.ts
```

Expected: PASS.

- [ ] **Step 3: Move `buildDefaultPlannerForm` and CSV parsing out of `ItineraryTab.tsx`**

In `src/components/ItineraryTab.tsx`, remove the local `buildDefaultPlannerForm` helper and import shared planner helpers:

```ts
import {
  buildDefaultPlannerForm,
  buildPlannerPromptContext,
  parsePlannerTextList,
  PLANNER_BUDGET_OPTIONS,
  PLANNER_CLOTHING_NEED_OPTIONS,
  PLANNER_COMPANION_OPTIONS,
  PLANNER_DIETARY_OPTIONS,
  PLANNER_FOOD_PREFERENCE_OPTIONS,
  PLANNER_INTEREST_OPTIONS,
  PLANNER_MOBILITY_PREFERENCE_OPTIONS,
  PLANNER_STAY_PREFERENCE_OPTIONS,
  PLANNER_TRANSPORT_OPTIONS,
  PLANNER_VIBE_OPTIONS,
  togglePlannerArrayValue,
} from '../lib/itineraryPlanner';
```

Replace the local CSV setter with:

```ts
const setPlannerCsvField =
  (key: 'countries' | 'mustVisitSpots' | 'mustEatFoods') =>
  (text: string) =>
    setPlannerField(key, parsePlannerTextList(text));
```

- [ ] **Step 4: Stop folding `dietary` and `transport` into `notes` during AI submission**

- [ ] **Step 4: Unify `AiForm.tsx` submission with the same shared planner workflow**

In `src/components/ItineraryTab.tsx`, replace the current local-mock `handleAiFormSubmit` implementation with a planner handoff that reuses the same backend generation path:

```ts
const handleAiFormSubmit = async (formData: ItineraryPlannerForm) => {
  setPlannerForm(formData);
  setShowPlanner(true);
  setAiGenerateMode('overwrite_all');
  setIsPlanningNew(false);
  await handleAiSuggestWithForm(formData);
};

const handleAiSuggestWithForm = async (overrideForm?: ItineraryPlannerForm) => {
  const workingForm = overrideForm || plannerForm;
  if (isOffline) {
    showToast('離線中無法使用 AI 功能 📴');
    return;
  }
  if (!activeTripId) {
    showToast('缺少行程 ID，無法生成行程');
    return;
  }

  setAiLoading(true);
  try {
    const destination = tripInfo?.destination || workingForm.arrivalTo || '您的目的地';
    const facts = useTripFactsStore.getState().facts.filter((f) => f.tripId === activeTripId);
    const travelFactsContext = facts.map((f) => `[ID: ${f.id}] ${f.factType} - ${f.title}`).join('\n');
    const formToSend = {
      ...workingForm,
      travelFactsContext,
    };
    const plannerContext = buildPlannerPromptContext(formToSend);

    const suggestionsRaw = await suggestItineraryWithForm({
      destination,
      planner: formToSend,
      plannerContext,
      aiMode: { mode: 'overwrite_all' },
    });
    const suggestedNodes = mapSuggestionResponseToNodes(suggestionsRaw);
    const finalNodes = assignDaysBasedOnTimeAndOrder(suggestedNodes, formToSend.flightDate);
    await applyGeneratedNodes(finalNodes, 'overwrite_all', formToSend);
  } catch {
    showToast('AI 規劃失敗，請確認 OpenRouter API Key 是否設定。');
  } finally {
    setAiLoading(false);
  }
};
```

Extract the repeated generation helpers in the same file:

```ts
function mapSuggestionResponseToNodes(suggestionsRaw: any): ItineraryNode[] {
  const suggestedNodes: ItineraryNode[] = [];

  if (suggestionsRaw?.itinerary && Array.isArray(suggestionsRaw.itinerary)) {
    suggestionsRaw.itinerary.forEach((dayData: any) => {
      if (!Array.isArray(dayData.spots)) return;
      dayData.spots.forEach((spot: any, index: number) => {
        suggestedNodes.push({
          node_id: `ai_${Date.now()}_${dayData.day}_${index}`,
          day: dayData.day || 1,
          time: spot.time || '10:00',
          title: String(spot.name || spot.title || '景點'),
          emoji: spot.emoji || '📍',
          category: spot.category || 'other',
          description: spot.ai_note || '',
          lat: spot.lat,
          lng: spot.lng,
          linkedFactId: spot.linkedFactId,
          source: 'local',
        });
      });
    });
  } else if (Array.isArray(suggestionsRaw)) {
    return suggestionsRaw;
  }

  return suggestedNodes;
}

async function applyGeneratedNodes(
  suggestedNodes: ItineraryNode[],
  mode: AiGenerateMode,
  workingForm: ItineraryPlannerForm,
) {
  let finalNodes: ItineraryNode[] = [];

  if (mode === 'overwrite_all') {
    await removeNodesBatch([...nodes]);
    finalNodes = assignDaysBasedOnTimeAndOrder(suggestedNodes, workingForm.flightDate);
  }

  for (const node of finalNodes) {
    const normalized = withAutoCategoryIcon(node);
    addNode(normalized);
    const payload: SyncItineraryPayload = { trip_id: activeTripId!, action: 'add_node', payload: normalized };
    socketRef.current?.emit('sync_itinerary', payload);
    void syncItinerary(payload);
  }

  showToast(`✨ 已一鍵覆蓋行程，共 ${finalNodes.length} 個新節點`);
}
```

Then refactor `handleAiSuggest` into:

```ts
const handleAiSuggest = async () => {
  await handleAiSuggestWithForm();
};
```

- [ ] **Step 5: Stop folding `dietary` and `transport` into `notes` during AI submission**

Replace the current `extraNotes` packing in `handleAiSuggest` with:

```ts
const facts = useTripFactsStore.getState().facts.filter((f) => f.tripId === activeTripId);
const travelFactsContext = facts.map((f) => `[ID: ${f.id}] ${f.factType} - ${f.title}`).join('\n');

const formToSend = {
  ...plannerForm,
  days: genDays,
  travelFactsContext,
  notes: plannerForm.notes,
};

const plannerContext = buildPlannerPromptContext(formToSend);
const suggestionsRaw = await suggestItineraryWithForm({
  destination,
  planner: formToSend,
  plannerContext,
  aiMode:
    aiGenerateMode === 'overwrite_all'
      ? { mode: 'overwrite_all' }
      : aiGenerateMode === 'generate_for_selected_days'
        ? { mode: 'generate_for_selected_days', rangeStartDay, rangeEndDay }
        : { mode: 'selected_day', selectedDay },
});
```

- [ ] **Step 6: Extend the inline planner UI with shared food/stay/clothing/mobility sections**

Add structured controls in `ItineraryTab.tsx` for:

```tsx
<div className="flex flex-col gap-2">
  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">必吃清單</label>
  <textarea
    value={(plannerForm.mustEatFoods || []).join('、')}
    onChange={(e) => setPlannerField('mustEatFoods', parsePlannerTextList(e.target.value))}
    className="w-full bg-white/50 border border-slate-100 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 min-h-[84px]"
    placeholder="例如：拉麵、壽司、草莓聖代"
  />
</div>
```

Then add chip groups for `foodPreferences`, `stayPreferences`, `clothingNeeds`, and `mobilityPreferences` using the shared option arrays and `togglePlannerArrayValue`.

- [ ] **Step 7: Extend `SuggestItineraryInput` to carry planner context**

In `src/lib/openrouterApi.ts`, change the input shape to:

```ts
export interface SuggestItineraryInput {
  destination: string;
  planner: ItineraryPlannerForm;
  plannerContext?: string;
  aiMode?: {
    mode: string;
    rangeStartDay?: number;
    rangeEndDay?: number;
    selectedDay?: number;
  };
}
```

Keep `suggestItineraryWithForm` sending the full input object unchanged:

```ts
const res = await fetch('/api/generate/itinerary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(input),
});
```

- [ ] **Step 8: Re-run the shared helper tests and full typecheck**

Run:

```bash
npx tsx --test src/lib/itineraryPlanner.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 9: Commit the inline planner refactor**

Run:

```bash
git add src/components/ItineraryTab.tsx src/lib/openrouterApi.ts src/lib/itineraryPlanner.ts src/lib/itineraryPlanner.test.ts
git commit -m "refactor: unify itinerary tab planner inputs"
```

### Task 4: Rebuild Backend Prompt Composition Around The Shared Planner Schema

**Files:**
- Modify: `src/server/services/aiItineraryService.ts`
- Modify: `src/server/services/aiItineraryService.test.ts`
- Modify: `src/lib/openrouterApi.ts`

- [ ] **Step 1: Write failing backend prompt tests first**

Replace `src/server/services/aiItineraryService.test.ts` with:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGenerateItineraryPrompt,
  buildRegenerateSpotPrompt,
} from './aiItineraryService';

test('buildGenerateItineraryPrompt includes structured planner preferences', () => {
  const prompt = buildGenerateItineraryPrompt({
    destination: 'Tokyo',
    planner: {
      days: 5,
      departureFrom: '台北',
      arrivalTo: '東京',
      flightDate: '2026-06-15',
      countries: ['日本'],
      mustVisitSpots: ['淺草寺'],
      mustEatFoods: ['壽司'],
      autoFlightSegments: ['CI100 TPE -> NRT 08:00-12:10'],
      travelFactsContext: '[ID: stay_1] stay - Ueno Hotel',
      notes: '下午安排鬆一點',
      companions: 'couple',
      vibes: ['隨興漫遊'],
      interests: ['在地美食'],
      budget: '舒適',
      dietary: ['不吃海鮮'],
      transport: ['大眾運輸'],
      foodPreferences: ['甜點咖啡店'],
      stayPreferences: ['近車站'],
      clothingNeeds: ['防雨'],
      mobilityPreferences: ['少走路'],
    },
    plannerContext: [
      '食的偏好: 甜點咖啡店',
      '住的偏好: 近車站',
      '衣的偏好: 防雨',
      '行的偏好: 少走路',
    ].join('\\n'),
    aiMode: { mode: 'overwrite_all' },
  });

  assert.match(prompt, /壽司/);
  assert.match(prompt, /甜點咖啡店/);
  assert.match(prompt, /近車站/);
  assert.match(prompt, /防雨/);
  assert.match(prompt, /少走路/);
  assert.match(prompt, /情侶|couple/);
});

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
```

- [ ] **Step 2: Run the backend prompt test and verify it fails**

Run:

```bash
npx tsx --test src/server/services/aiItineraryService.test.ts
```

Expected: FAIL because `buildGenerateItineraryPrompt` does not exist yet.

- [ ] **Step 3: Extract prompt building into a dedicated function**

In `src/server/services/aiItineraryService.ts`, add:

```ts
export function buildGenerateItineraryPrompt(body: {
  destination: string;
  planner?: any;
  plannerContext?: string;
  aiMode?: {
    mode: string;
    rangeStartDay?: number;
    rangeEndDay?: number;
    selectedDay?: number;
  };
}) {
  const { destination, planner, plannerContext, aiMode } = body;
  const days = planner?.days || 3;

  let generationContext = '';
  if (aiMode?.mode === 'selected_day') {
    generationContext = `\n【重要指示】目前我們正在重新規劃「第 ${aiMode.selectedDay} 天」的行程。請產生 ${days} 天份的行程（這將會對應到那單獨的一天），並特別留意上下文。`;
  } else if (aiMode?.mode === 'generate_for_selected_days') {
    generationContext = `\n【重要指示】目前我們正在重新規劃「第 ${aiMode.rangeStartDay} 天到第 ${aiMode.rangeEndDay} 天」的區間。請產生 ${days} 天份的行程，讓使用者能接續原本的旅途步調。`;
  } else if (aiMode?.mode === 'overwrite_all') {
    generationContext = `\n【重要指示】我們將全局重新規劃整趟 ${days} 天的行程。`;
  }

  return `你是一個精通 UI 參數與旅遊規劃的 AI。請讀取使用者偏好，並只輸出 JSON。
${generationContext}

行程骨架:
- Trip length: ${days} days
- Destination: ${destination}
- Departure: ${planner?.departureFrom || 'unknown'}
- Arrival: ${planner?.arrivalTo || destination}
- Flight date: ${planner?.flightDate || 'unknown'}
- Auto flight segments: ${planner?.autoFlightSegments?.join(' | ') || 'Not specified'}
- Travel facts anchors: ${planner?.travelFactsContext || 'Not specified'}

使用者偏好:
- Companions: ${planner?.companions || '未指定'}
- Vibes: ${planner?.vibes?.join('、') || '未指定'}
- Interests: ${planner?.interests?.join('、') || '未指定'}
- Budget: ${planner?.budget || '未指定'}
- Dietary: ${planner?.dietary?.join('、') || '未指定'}
- Transport: ${planner?.transport?.join('、') || '未指定'}
- Must visit spots: ${planner?.mustVisitSpots?.join('、') || '未指定'}
- Must eat foods: ${planner?.mustEatFoods?.join('、') || '未指定'}
- Extra notes: ${planner?.notes || 'None'}

食衣住行摘要:
${plannerContext || '未提供'}

輸出規則:
- category 限定: flight, transport, landmark, food, shopping, nature, hotel, activity, nightlife, other
- time 必須為 24 小時制 HH:MM
- 若有 travel facts 或 flight anchors，盡量對齊
- 請直接輸出 JSON，不要帶 markdown`;
}
```

- [ ] **Step 4: Make `generateItinerary` call the extracted prompt builder**

Replace the inline prompt assembly in `generateItinerary` with:

```ts
export async function generateItinerary(body: any) {
  const { destination } = body;

  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 2000));
    return [
      { day: 1, time: '10:00', title: `Arrival at ${destination}`, category: 'flight', emoji: '✈️' },
      { day: 1, time: '12:00', title: 'Hotel Check-in', category: 'hotel', emoji: '🏨' },
      { day: 1, time: '13:30', title: 'Local Lunch', category: 'food', emoji: '🍜' },
      { day: 1, time: '15:00', title: 'City Center Walk', category: 'landmark', emoji: '🏯' },
      { day: 2, time: '09:00', title: 'Morning Market', category: 'food', emoji: '🍱' },
      { day: 2, time: '11:00', title: 'Main Attraction', category: 'landmark', emoji: '📸' },
    ];
  }

  const detailedPrompt = buildGenerateItineraryPrompt(body);
  // keep the rest of the parsing flow unchanged
}
```

- [ ] **Step 5: Re-run backend tests and verify they pass**

Run:

```bash
npx tsx --test src/server/services/aiItineraryService.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the backend prompt refactor**

Run:

```bash
git add src/server/services/aiItineraryService.ts src/server/services/aiItineraryService.test.ts src/lib/openrouterApi.ts
git commit -m "refactor: align ai itinerary prompt with shared planner schema"
```

### Task 5: Full Verification And Release Readiness

**Files:**
- Verify: `src/types/workflow.ts`
- Verify: `src/lib/itineraryPlanner.ts`
- Verify: `src/components/AiForm.tsx`
- Verify: `src/components/ItineraryTab.tsx`
- Verify: `src/lib/openrouterApi.ts`
- Verify: `src/server/services/aiItineraryService.ts`
- Verify: `src/server/services/aiItineraryService.test.ts`

- [ ] **Step 1: Run the focused test suite**

Run:

```bash
npx tsx --test src/lib/itineraryPlanner.test.ts src/server/services/aiItineraryService.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS with `tsc --noEmit`.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: PASS with both Vite frontend build and bundled `dist/server.cjs`.

- [ ] **Step 4: Inspect final diff for schema drift**

Run:

```bash
git diff -- src/types/workflow.ts src/lib/itineraryPlanner.ts src/components/AiForm.tsx src/components/ItineraryTab.tsx src/lib/openrouterApi.ts src/server/services/aiItineraryService.ts src/server/services/aiItineraryService.test.ts
```

Expected: only shared-planner refactor changes, no unrelated edits.

- [ ] **Step 5: Commit final verification-only fixes if needed**

If verification required any final adjustments, run:

```bash
git add src/types/workflow.ts src/lib/itineraryPlanner.ts src/lib/itineraryPlanner.test.ts src/components/AiForm.tsx src/components/ItineraryTab.tsx src/lib/openrouterApi.ts src/server/services/aiItineraryService.ts src/server/services/aiItineraryService.test.ts
git commit -m "test: finish shared planner schema verification"
```
