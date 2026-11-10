import { CalendarDays, Home, Luggage, Sparkles, type LucideIcon } from 'lucide-react';
import type { useAppStore } from '../../store/useAppStore';

/**
 * Shared navigation data for the app shell. TopAppBar (current-tab label),
 * BottomTabs (the tab capsule) and AppDrawer all read from here, so a tab's
 * id, icon and label key are defined exactly once.
 */
export type AppTab = ReturnType<typeof useAppStore.getState>['activeTab'];
export type MainTabId = Exclude<AppTab, 'ai_result'>;

export interface MainNavItem {
  id: MainTabId;
  icon: LucideIcon;
  /** i18n key, e.g. `tab_home` → 探索首頁 / Explore */
  labelKey: `tab_${MainTabId}`;
}

export const MAIN_NAV_ITEMS: readonly MainNavItem[] = [
  { id: 'home', icon: Home, labelKey: 'tab_home' },
  { id: 'ai_form', icon: Sparkles, labelKey: 'tab_ai_form' },
  { id: 'itinerary', icon: CalendarDays, labelKey: 'tab_itinerary' },
  { id: 'tools', icon: Luggage, labelKey: 'tab_tools' },
];

/** `ai_result` is a step inside the AI flow, so it belongs to the AI tab. */
export function toMainTab(tab: AppTab): MainTabId {
  return tab === 'ai_result' ? 'ai_form' : tab;
}

export function isAiFlow(tab: AppTab): boolean {
  return tab === 'ai_form' || tab === 'ai_result';
}

/** i18n key of the label the header shows for the current tab. */
export function getTabLabelKey(tab: AppTab): MainNavItem['labelKey'] {
  return `tab_${toMainTab(tab)}`;
}

/** Other sites by the same author, listed in the side menu (AppDrawer). */
export interface PortfolioProject {
  title: string;
  url: string;
  desc1: string;
  desc2: string;
  icon: string;
}

export const PORTFOLIO_PROJECTS: readonly PortfolioProject[] = [
  {
    title: '蔬果價格查詢',
    url: 'https://tw-veggieprice.vercel.app/',
    desc1: '即時掌握農產品交易行情。',
    desc2: '圖表化報價助您聰明採買。',
    icon: '🥬',
  },
  {
    title: 'AI股票分析',
    url: 'https://stock-analyze-ai-connect.vercel.app/',
    desc1: 'AI 深度分析即時股市財報。',
    desc2: '洞察市場提供客觀投資參考。',
    icon: '📉',
  },
  {
    title: '台鐵/高鐵時刻',
    url: 'https://taiwanrail.vercel.app/',
    desc1: '快速查詢雙鐵班次與誤點。',
    desc2: '介面支援通勤規劃。',
    icon: '🚄',
  },
];

/** Home-page sections the drawer can jump to (ids live on their <h2>). */
export const HOME_SECTION_IDS = {
  featuredGuides: 'home-featured-guides',
  expertItineraries: 'home-expert-itineraries',
} as const;
