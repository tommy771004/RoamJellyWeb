import { motion, useReducedMotion } from 'motion/react';
import { Home, Sparkles, CalendarDays, Luggage } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { TabName } from '../types/workflow';
import { bottomBarTransition, layoutIndicatorTransition, subtlePressableClass } from '../lib/motionTokens';

const TAB_ICONS = {
  home: Home,
  ai_form: Sparkles,
  itinerary: CalendarDays,
  tools: Luggage,
} as const;

export const TABS = [
  { id: 'home', label: '探索首頁', iconName: 'compass' },
  { id: 'ai_form', label: 'AI 行程', iconName: 'hot-air-balloon' },
  { id: 'itinerary', label: '行程手帳', iconName: 'calendar' },
  { id: 'tools', label: '行前準備', iconName: 'backpack' },
];

export default function BottomTabs() {
  const { activeTab, setActiveTab } = useAppStore();
  const prefersReducedMotion = useReducedMotion();

  // Hide on full-screen flows that have their own CTA at the bottom
  if (activeTab === 'ai_form' || activeTab === 'ai_result') return null;

  return (
    <motion.nav
      className="md:hidden fixed bottom-6 w-full z-50 flex justify-center items-center px-6 pointer-events-none pb-safe"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ y: 0, opacity: 1 }}
      transition={prefersReducedMotion ? { duration: 0.16 } : bottomBarTransition}
      aria-label="底部導覽"
    >
      <div className="bg-white/80 backdrop-blur-[30px] backdrop-saturate-[180%] rounded-[36px] shadow-[0_16px_40px_-5px_rgba(255,183,206,0.5),inset_0_1px_2px_rgba(255,255,255,0.7)] border border-pink-100/50 flex justify-between items-center p-1.5 pointer-events-auto w-full max-w-[380px] mx-auto overflow-hidden">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id || (activeTab === 'ai_result' && tab.id === 'ai_form');
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center text-pink-500 flex-1 min-w-0 pt-2.5 pb-2 rounded-[30px] relative ${subtlePressableClass} ${
                isActive
                  ? 'scale-[1.03]'
                  : 'opacity-60 hover:opacity-100'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 bg-white shadow-sm border border-pink-100 rounded-[30px] -z-10"
                  transition={layoutIndicatorTransition}
                />
              )}
              {(() => { const Icon = TAB_ICONS[tab.id as keyof typeof TAB_ICONS]; return Icon ? <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} className={`mb-1 transition-all ${isActive ? 'opacity-100' : 'opacity-50'}`} /> : null; })()}
              <span className={`text-[10px] font-black uppercase tracking-wider whitespace-nowrap px-1 z-10 transition-colors ${isActive ? 'text-pink-600' : 'text-pink-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
