import { create } from 'zustand';
import type { TravelFact, TravelFactsSummary } from '../types/workflow';

interface TripFactsStore {
  facts: TravelFact[];
  setFacts: (facts: TravelFact[]) => void;
  upsertFact: (fact: TravelFact) => void;
  removeFact: (id: string) => void;
  getMissingAnchors: () => TravelFactsSummary['missingAnchors'];
  getPlanningConstraints: () => string;
}

function getMissingAnchorsFromFacts(facts: TravelFact[]): TravelFactsSummary['missingAnchors'] {
  const hasOutbound = facts.some((fact) => fact.factType === 'flight_outbound');
  const hasStay = facts.some((fact) => fact.factType === 'stay');
  const missing: TravelFactsSummary['missingAnchors'] = [];

  if (!hasOutbound) missing.push('flight_outbound');
  if (!hasStay) missing.push('stay');

  return missing;
}

function buildPlanningConstraints(facts: TravelFact[]): string {
  if (facts.length === 0) {
    return '尚未提供旅程事實，請以一般旅遊規劃模式生成。';
  }

  return facts
    .map((fact) => {
      const parts = [fact.title];
      if (fact.locationName) parts.push(`地點: ${fact.locationName}`);
      if (fact.startAt) parts.push(`開始: ${fact.startAt}`);
      if (fact.endAt) parts.push(`結束: ${fact.endAt}`);
      if (fact.metadata?.checkInTime) parts.push(`入住時間: ${fact.metadata.checkInTime}`);
      if (fact.metadata?.checkOutTime) parts.push(`退房時間: ${fact.metadata.checkOutTime}`);
      return `${fact.factType}: ${parts.join(' | ')}`;
    })
    .join('\n');
}

export const useTripFactsStore = create<TripFactsStore>((set, get) => ({
  facts: [],
  setFacts: (facts) => set({ facts }),
  upsertFact: (fact) =>
    set((state) => ({
      facts: state.facts.some((current) => current.id === fact.id)
        ? state.facts.map((current) => (current.id === fact.id ? fact : current))
        : [...state.facts, fact],
    })),
  removeFact: (id) => set((state) => ({ facts: state.facts.filter((fact) => fact.id !== id) })),
  getMissingAnchors: () => getMissingAnchorsFromFacts(get().facts),
  getPlanningConstraints: () => buildPlanningConstraints(get().facts),
}));
