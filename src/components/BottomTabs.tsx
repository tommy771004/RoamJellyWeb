import { useState, useEffect } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { Home, Sparkles, CalendarDays, Luggage, Menu, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { bottomBarTransition, subtlePressableClass } from '../lib/motionTokens';

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
  const { activeTab, setActiveTab, isNavVisible } = useAppStore();
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
      className="md:hidden fixed w-full z-50 flex justify-center items-center px-3.5 pointer-events-none"
      style={{ bottom: 'calc(0.6rem + env(safe-area-inset-bottom, 0px))' }}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ 
        y: isNavVisible ? 0 : 100, 
        opacity: isNavVisible ? 1 : 0,
        pointerEvents: isNavVisible ? 'auto' : 'none' 
      }}
      transition={prefersReducedMotion ? { duration: 0.16 } : bottomBarTransition}
      aria-label="底部導覽"
    >
      <motion.div 
        layout
        className="bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,249,251,0.82),rgba(241,248,255,0.82))] backdrop-blur-[36px] backdrop-saturate-[190%] rounded-[36px] shadow-[0_18px_34px_-16px_rgba(236,72,153,0.24),0_16px_28px_-18px_rgba(56,189,248,0.20),inset_0_1px_2px_rgba(255,255,255,0.96)] border border-white/86 p-1.5 pointer-events-auto flex items-center overflow-hidden"
        style={{
           width: isExpanded ? '100%' : 'auto',
           maxWidth: isExpanded ? '372px' : 'fit-content'
        }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
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
              className="flex items-center justify-center w-[3.25rem] h-[3.25rem] rounded-full text-pink-500 hover:text-pink-600 shadow-[0_8px_18px_rgba(236,72,153,0.10)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,244,248,0.94),rgba(241,248,255,0.90))] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92] hover:-translate-y-0.5"
              aria-label="展開選單"
            >
              <ActiveIcon size={24} strokeWidth={2.8} />
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
                   className="absolute -left-1 sm:-left-3 p-2 text-slate-400 hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 rounded-full z-20 transition-colors"
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
                    className={`flex flex-col items-center justify-center flex-1 min-w-0 pt-2.5 pb-1.5 rounded-[30px] relative ${subtlePressableClass} ${
                      isActive
                        ? 'scale-[1.05] text-pink-500'
                        : 'opacity-80 hover:opacity-100 text-slate-500 hover:text-sky-500'
                    } transition-all duration-300`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="tab-pill"
                        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,244,248,0.90),rgba(242,248,255,0.88))] shadow-[0_7px_16px_rgba(236,72,153,0.10),0_4px_12px_rgba(56,189,248,0.08),inset_0_1px_1px_rgba(255,255,255,0.98)] border border-white/92 rounded-[30px] -z-10"
                        transition={{type: "spring", stiffness: 300, damping: 24}}
                      />
                    )}
                    {Icon ? (
                      <motion.div
                        animate={isActive ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                         <Icon size={isActive ? 21 : 19} strokeWidth={isActive ? 2.4 : 2} className={`mb-1 transition-all drop-shadow-sm ${isActive ? 'text-pink-500 fill-pink-500/20' : 'text-slate-500/90'}`} />
                      </motion.div>
                    ) : null}
                    <span className={`text-[10px] font-black tracking-[0.1em] whitespace-nowrap px-1 z-10 transition-colors ${isActive ? 'text-pink-600' : ''}`}>
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
