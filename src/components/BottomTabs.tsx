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
        className="bg-white/80 backdrop-blur-2xl backdrop-saturate-[180%] rounded-[36px] shadow-[0_12px_32px_-12px_rgba(15,23,42,0.15),inset_0_1px_1px_rgba(255,255,255,1)] border border-white p-1.5 pointer-events-auto flex items-center overflow-hidden transform-gpu"
        style={{
           width: isExpanded ? '100%' : 'auto',
           maxWidth: isExpanded ? '340px' : 'fit-content',
           willChange: 'transform, opacity, width'
        }}
        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
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
              className="flex items-center justify-center w-[3rem] h-[3rem] rounded-full text-pink-500 hover:text-pink-600 shadow-[0_8px_16px_rgba(236,72,153,0.15)] bg-gradient-to-br from-white to-pink-50 border border-white transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95"
              aria-label="展開選單"
            >
              <ActiveIcon size={22} strokeWidth={2.8} />
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
                   className="absolute -left-1 sm:-left-3 p-2 text-slate-400 hover:text-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 rounded-full z-20 transition-colors active:scale-90"
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
                    className={`flex flex-col items-center justify-center flex-1 min-w-0 pt-2 pb-1.5 rounded-full relative active:scale-95 ${
                      isActive
                        ? 'text-pink-500'
                        : 'opacity-80 hover:opacity-100 text-slate-400 hover:text-sky-500'
                    } transition-all duration-300 transform-gpu`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="tab-pill"
                        className="absolute inset-0 bg-white/60 shadow-sm border border-white/80 rounded-full -z-10"
                        transition={{type: "spring", stiffness: 300, damping: 25}}
                      />
                    )}
                    {Icon ? (
                      <motion.div
                        className="transform-gpu"
                        animate={isActive ? { y: -1, scale: 1.05 } : { y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                         <Icon size={isActive ? 20 : 18} strokeWidth={isActive ? 2.5 : 2.2} className={`mb-0.5 transition-all drop-shadow-sm ${isActive ? 'text-pink-500 fill-pink-500/10' : 'text-slate-400'}`} />
                      </motion.div>
                    ) : null}
                    <span className={`text-[9px] font-black tracking-widest whitespace-nowrap z-10 transition-colors ${isActive ? 'text-pink-600' : ''}`}>
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
