# Shared Itinerary Planner Schema Design

**Date:** 2026-05-10
**Status:** Approved for planning
**Scope:** Unify AI itinerary planner data model and form behavior across `AiForm.tsx`, `ItineraryTab.tsx`, and AI prompt generation.

## Goal

Replace the duplicated planner form models in `src/components/AiForm.tsx` and `src/components/ItineraryTab.tsx` with one shared schema, one shared set of options/helpers, and one shared prompt-context builder so that user preferences consistently affect AI itinerary generation.

## Problem Summary

The current planner experience has drifted into two separate systems:

1. `AiForm.tsx` owns its own `AiFormData` type and local option constants.
2. `ItineraryTab.tsx` owns an inline planner UI backed by `ItineraryPlannerForm`.
3. `src/server/services/aiItineraryService.ts` only consumes a subset of planner fields, so some UI selections do not meaningfully affect generation.

This causes three visible problems:

- Users can choose preferences that do not reliably reach the AI prompt.
- `AiForm.tsx` and `ItineraryTab.tsx` can drift in option labels, values, defaults, and behavior.
- Food, clothing, stay, and mobility preferences are either missing or weakly represented in the actual generation workflow.

## Design Principles

- One planner schema across all entry points.
- Shared defaults, option sets, and state helpers.
- Preserve existing product flows where possible.
- Avoid a full visual merge of `AiForm.tsx` and `ItineraryTab.tsx` in this refactor.
- Make planner data more structured instead of hiding intent inside `notes`.
- Ensure backend prompt generation uses the full planner signal.

## Proposed Shared Schema

`src/types/workflow.ts` remains the single source of truth for planner data.

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

### Field Intent

- `mustVisitSpots`: named destinations or attractions the user explicitly wants included.
- `mustEatFoods`: named dishes, cafes, restaurants, or food styles that must appear if feasible.
- `foodPreferences`: higher-level dining style signals such as coffee-first mornings, dessert stops, late-night food, local market food, omakase, or family-friendly meals.
- `stayPreferences`: accommodation and rhythm preferences such as near-station stays, onsen ryokan, design hotel, slow hotel mornings, or room-first rest breaks.
- `clothingNeeds`: practical and stylistic cues such as photo-friendly outfits, light packing, rain-ready, warm layers, sun protection, or walking shoes.
- `mobilityPreferences`: movement tolerance and routing preferences such as less walking, fewer transfers, willing to wake early, can travel at night, can cross cities, or avoid steep terrain.

## Shared Module

Create `src/lib/itineraryPlanner.ts` as the common planner configuration and behavior module.

Responsibilities:

- `buildDefaultPlannerForm(destination: string, days: number): ItineraryPlannerForm`
- shared option arrays for all planner chips/pills
- `togglePlannerArrayValue(...)`
- `setPlannerTextList(...)`
- `buildPlannerPromptContext(form: ItineraryPlannerForm): string`
- small utility formatters for prompt-safe text

This module will replace planner-specific constants duplicated across `AiForm.tsx` and `ItineraryTab.tsx`.

## File Responsibilities

### `src/types/workflow.ts`

- Own the canonical `ItineraryPlannerForm` interface.
- Remove the need for a parallel `AiFormData` type.

### `src/lib/itineraryPlanner.ts`

- Own defaults, options, and planner formatting rules.
- Provide stable helper behavior that both planner UIs can reuse.

### `src/components/AiForm.tsx`

- Become a pure guided UI shell around the shared schema.
- Stop defining its own planner type and option constants.
- Continue serving as the “first-time or full-screen itinerary setup” experience.

### `src/components/ItineraryTab.tsx`

- Continue serving as the inline refinement and regeneration experience.
- Reuse the same shared schema, options, and helpers as `AiForm.tsx`.
- Stop manually building partial AI context in ad hoc ways where the shared planner helper can provide structured output.

### `src/server/services/aiItineraryService.ts`

- Use the full planner object, not only a subset of fields.
- Incorporate the shared planner context into the AI prompt.
- Explicitly mention food, stay, clothing, and mobility preferences in the prompt so the model can act on them.

## UI Strategy

The refactor shares data and rules, but not the full visual component tree.

### `AiForm.tsx`

Keep the two-step guided flow:

1. Core trip setup
   - departure
   - destination
   - days
   - companions
2. Preference refinement
   - vibes
   - interests
   - budget
   - dietary
   - transport
   - food/stay/clothing/mobility preference groups

This preserves the current onboarding-style planner experience.

### `ItineraryTab.tsx`

Keep the inline planner panel, but reshape it into a structured refinement form:

- freeform notes remain available
- structured sections are added or promoted:
  - food: `mustEatFoods`, `foodPreferences`
  - clothing: `clothingNeeds`
  - stay: `stayPreferences`
  - mobility: `transport`, `mobilityPreferences`

`mustVisitSpots` and `mustEatFoods` should remain text-list style inputs because users often enter specific names. The preference groups should use the same shared chip/pill options as `AiForm.tsx`.

## Shared Data Flow

1. User changes planner state in `AiForm.tsx` or `ItineraryTab.tsx`.
2. Both UIs write into the same `ItineraryPlannerForm` shape.
3. Before AI submission, frontend uses shared helpers to normalize and summarize planner state.
4. Frontend sends the full planner object to `/api/generate/itinerary`.
5. Backend AI service reads the full planner plus a prompt-ready context summary.
6. Generated itinerary returns to `ItineraryTab.tsx` and is converted into `ItineraryNode[]` as before.

This removes the current split where some fields are only implied in `notes` while others are direct fields.

## Prompt Design Changes

The backend prompt should be reorganized into explicit sections rather than loosely appended notes.

### Section 1: Trip skeleton

- destination
- day count
- regeneration mode context
- departure/flight timing
- travel facts anchors

### Section 2: traveler preferences

- companions
- vibes
- interests
- budget
- dietary restrictions
- transport preferences

### Section 3: food / clothing / stay / mobility context

- foods the user must eat
- dining style cues
- accommodation and rest preferences
- clothing/weather/style practicality
- walking/transfer/range tolerance

### Section 4: hard generation rules

- output format
- node count guidance
- category constraints
- time formatting
- anchor alignment when flight or stay facts exist

## Why Shared Prompt Context Matters

The frontend should stop manually packing pieces of planner state into `notes`, because that creates a second, inconsistent prompt-building path. Instead:

- frontend sends the planner data structure
- frontend or backend builds a deterministic human-readable context block from the same shared rules
- backend prompt includes both structured values and the derived summary

This keeps prompt behavior explainable and testable.

## Testing Strategy

### 1. Shared planner helper tests

Add `src/lib/itineraryPlanner.test.ts` to cover:

- default form output
- text-list parsing behavior
- array toggle helpers
- `buildPlannerPromptContext(form)` output
- inclusion of food/stay/clothing/mobility details

### 2. AI prompt tests

Extend `src/server/services/aiItineraryService.test.ts` to verify prompt output includes:

- companions
- vibes
- interests
- budget
- dietary
- transport
- mustEatFoods
- foodPreferences
- stayPreferences
- clothingNeeds
- mobilityPreferences

### 3. Frontend integration safety

At minimum, ensure both `AiForm.tsx` and `ItineraryTab.tsx` import shared option sets from `src/lib/itineraryPlanner.ts` instead of defining their own.

This is enough to prevent immediate drift even if full component tests are not added in this refactor.

## Non-Goals

- No redesign of the overall AI generation feature flow.
- No migration to a global planner store in this refactor.
- No full visual merge into one reusable planner component yet.
- No backend contract change for itinerary node persistence.

## Risks

### Risk: Scope creep from “schema unification” into “component rewrite”

Mitigation:

- share schema and helper logic first
- preserve existing screen roles
- do not force a single UI component abstraction in the same pass

### Risk: Prompt becomes too verbose

Mitigation:

- use concise grouped summaries
- avoid duplicating the same information in multiple sections
- keep freeform notes as supplemental, not primary, context

### Risk: Existing partial planner behavior changes unexpectedly

Mitigation:

- keep current baseline fields and semantics
- add regression tests around prompt composition
- keep `notes` available as a final override channel

## Implementation Summary

The refactor should produce one shared planner schema and one shared planner rules module, while allowing both `AiForm.tsx` and `ItineraryTab.tsx` to keep their current UX roles. The backend prompt generation must be updated so that structured food, clothing, stay, and mobility preferences materially affect itinerary output rather than being lost in translation.
