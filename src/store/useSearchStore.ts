import { create } from 'zustand';
import type { SearchItem } from '../types/workflow';

export interface SearchFormState {
  from: string;
  to: string;
  date: string;
  // added region and destination for the advanced search
  region?: string;
  destination?: string;
  query?: string;
}

interface SearchStore {
  searchForm: SearchFormState;
  updateField: (field: keyof SearchFormState, value: string) => void;

  results: SearchItem[];
  setResults: (results: SearchItem[]) => void;

  loading: boolean;
  setLoading: (loading: boolean) => void;

  searchError: 'timeout' | 'service' | null;
  setSearchError: (error: 'timeout' | 'service' | null) => void;

  savedItems: string[];
  toggleSave: (id: string) => void;

  trackedPrices: string[];
  toggleTrack: (id: string) => void;

  loadPreferences: () => Promise<void>;
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  searchForm: { from: '', to: '', date: '' },
  updateField: (field, value) => 
    set((state) => ({ searchForm: { ...state.searchForm, [field]: value } })),

  results: [],
  setResults: (results) => set({ results }),

  loading: false,
  setLoading: (loading) => set({ loading }),

  searchError: null,
  setSearchError: (error) => set({ searchError: error }),

  savedItems: [],
  toggleSave: (id) => set((state) => ({ 
    savedItems: state.savedItems.includes(id) 
      ? state.savedItems.filter(i => i !== id) 
      : [...state.savedItems, id] 
  })),

  trackedPrices: [],
  toggleTrack: (id) => set((state) => ({
    trackedPrices: state.trackedPrices.includes(id)
      ? state.trackedPrices.filter(i => i !== id)
      : [...state.trackedPrices, id]
  })),

  loadPreferences: async () => {
    // Intentionally empty for basic restore
  }
}));
