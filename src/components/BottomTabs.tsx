import { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { Home, Sparkles, CalendarDays, Luggage, Menu, X } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);

  const isAiFlow = activeTab === 'ai_form' || activeTab === 'ai_result';

  // Automatically snap to expanded or collapsed based on the current flow
  useEffect(() => {
    if (isAiFlow) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [isAiFlow, activeTab]);

  const ActiveIcon = TAB_ICONS[(activeTab === 'ai_result' ? 'ai_form' : activeTab) as keyof typeof TAB_ICONS] || Menu;

  return (
    <motion.nav
      className="md:hidden fixed bottom-6 w-full z-50 flex justify-center items-center px-4 pointer-events-none pb-safe"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ y: 0, opacity: 1 }}
      transition={prefersReducedMotion ? { duration: 0.16 } : bottomBarTransition}
      aria-label="底部導覽"
    >
      <motion.div 
        layout
        className="bg-white/90 backdrop-blur-[30px] backdrop-saturate-[180%] rounded-[36px] shadow-[0_16px_40px_-5px_rgba(255,183,206,0.6),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-pink-100/60 p-1.5 pointer-events-auto flex items-center overflow-hidden"
        style={{
           width: isExpanded ? '100%' : 'auto',
           maxWidth: isExpanded ? '380px' : 'fit-content'
        }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!isExpanded ? (
            <motion.button
              key="collapsed-btn"
              layoutId="tab-container"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsExpanded(true)}
              className="flex items-center justify-center w-12 h-12 rounded-full text-pink-500 hover:text-pink-600 hover:bg-pink-50 transition-colors"
              aria-label="展開選單"
            >
              <ActiveIcon size={24} strokeWidth={2.5} />
            </motion.button>
          ) : (
            <motion.div 
              key="expanded-content"
              layoutId="tab-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="flex justify-between items-center w-full relative"
            >
              {isAiFlow && (
                 <button
                   onClick={() => setIsExpanded(false)}
                   className="absolute -left-1 sm:-left-3 p-2 text-slate-400 hover:text-pink-500 z-20"
                   aria-label="收起選單"
                 >
                   <X size={18} strokeWidth={3} />
                 </button>
              )}
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id || (activeTab === 'ai_result' && tab.id === 'ai_form');
                const Icon = TAB_ICONS[tab.id as keyof typeof TAB_ICONS];
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                        setActiveTab(tab.id as any);
                        if (tab.id === 'ai_form') {
                           setIsExpanded(false);
                        }
                    }}
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
                    {Icon ? <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} className={`mb-1 transition-all ${isActive ? 'opacity-100' : 'opacity-50'}`} /> : null}
                    <span className={`text-[10px] font-black uppercase tracking-wider whitespace-nowrap px-1 z-10 transition-colors ${isActive ? 'text-pink-600' : 'text-pink-500'}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.nav>
  );
}
