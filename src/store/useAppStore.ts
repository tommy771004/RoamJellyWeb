import { create } from 'zustand';

export interface RedirectModalState {
  isOpen: boolean;
  provider: string;
  affiliateUrl?: string;
  itemId: string;
}

interface AppStore {
  activeTab: 'home' | 'itinerary' | 'tools';
  setActiveTab: (tab: 'home' | 'itinerary' | 'tools') => void;

  redirectModal: RedirectModalState;
  openRedirectModal: (data: Omit<RedirectModalState, 'isOpen'>) => void;
  closeRedirectModal: () => void;

  userId: string | null;
  setAuthenticated: (userId: string) => void;

  toastMessage: string | null;
  showToast: (message: string) => void;

  activeTripId?: string;
  setActiveTripId?: (id: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  redirectModal: { isOpen: false, provider: '', itemId: '' },
  openRedirectModal: (data) => set({ redirectModal: { ...data, isOpen: true } }),
  closeRedirectModal: () => set((state) => ({ redirectModal: { ...state.redirectModal, isOpen: false } })),

  userId: null,
  setAuthenticated: (id) => set({ userId: id }),

  toastMessage: null,
  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => set({ toastMessage: null }), 3000);
  },
}));
