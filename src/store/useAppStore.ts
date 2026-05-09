import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ToastProps, ToastType } from '../components/JellyToast';

export interface RedirectModalState {
  isOpen: boolean;
  provider: string;
  affiliateUrl?: string;
  itemId: string;
  airline?: string;
  departure?: string;
  arrival?: string;
  duration?: string;
  stops?: number;
  price?: number;
  currency?: string;
  emoji?: string;
}

interface AppStore {
  activeTab: 'home' | 'itinerary' | 'tools' | 'ai_form' | 'ai_result';
  setActiveTab: (tab: 'home' | 'itinerary' | 'tools' | 'ai_form' | 'ai_result') => void;

  redirectModal: RedirectModalState;
  openRedirectModal: (data: Omit<RedirectModalState, 'isOpen'>) => void;
  closeRedirectModal: () => void;

  userId: string | null;
  setAuthenticated: (userId: string | null) => void;

  toasts: ToastProps[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;

  toastMessage: string | null;

  activeTripId?: string;
  setActiveTripId: (id: string) => void;

  isOffline: boolean;
  setOffline: (offline: boolean) => void;
  isDarkMode: boolean;
  setDarkMode: (dark: boolean) => void;

  aiResult: any;
  setAiResult: (res: any) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeTab: 'home',
      setActiveTab: (tab) => set({ activeTab: tab }),

      redirectModal: { isOpen: false, provider: '', itemId: '' },
      openRedirectModal: (data) => set({ redirectModal: { ...data, isOpen: true } }),
      closeRedirectModal: () => set((state) => ({ redirectModal: { ...state.redirectModal, isOpen: false } })),

      userId: null,
      setAuthenticated: (id) => set({ userId: id }),

      isOffline: false,
      setOffline: (offline) => set({ isOffline: offline }),

      isDarkMode: false,
      setDarkMode: (dark) => set({ isDarkMode: dark }),

      aiResult: null,
      setAiResult: (res) => set({ aiResult: res }),

      toastMessage: null,
      toasts: [],
      activeTripId: undefined,
      setActiveTripId: (id) => set({ activeTripId: id }),
      showToast: (message, type = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
        }, 4000);
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }))
    }),
    {
      name: 'app-store',
      partialize: (state) => ({ activeTripId: state.activeTripId, isDarkMode: state.isDarkMode }),
    }
  )
);
