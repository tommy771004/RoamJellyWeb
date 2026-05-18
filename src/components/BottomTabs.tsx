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
  { id: 'itinerary', label: '你的行程', iconName: 'calendar' },
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
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl backdrop-saturate-[200%] rounded-[48px] shadow-[0_24px_48px_-12px_rgba(244,114,182,0.25),inset_0_2px_4px_rgba(255,255,255,0.9)] dark:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)] border-[1.5px] border-white/80 dark:border-white/10 p-2 pointer-events-auto flex items-center overflow-hidden transform-gpu"
        style={{
           width: isExpanded ? '100%' : 'auto',
           maxWidth: isExpanded ? '360px' : 'fit-content',
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
              className="flex items-center justify-center w-[3.5rem] h-[3.5rem] rounded-full text-pink-500 hover:text-pink-600 shadow-[0_8px_20px_rgba(244,114,182,0.25)] bg-gradient-to-tl from-pink-50 via-white to-orange-50 border-[2px] border-white transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90 hover:scale-110 hover:-translate-y-1"
              aria-label="展開選單"
            >
              <ActiveIcon size={26} strokeWidth={2.8} className="drop-shadow-sm" />
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
                   className="absolute -left-1 sm:-left-3 p-2 text-slate-400 hover:text-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 rounded-full z-20 transition-colors active:scale-90 bg-white/50 border border-white"
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
                    className={`flex flex-col items-center justify-center flex-1 min-w-0 pt-3 pb-2.5 rounded-full relative transition-[transform,opacity,filter] duration-300 transform-gpu active:scale-[0.85] ${
                      isActive
                        ? 'text-pink-500'
                        : 'opacity-70 hover:opacity-100 text-slate-500 dark:text-slate-400 hover:text-sky-500 hover:-translate-y-1 active:opacity-100'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="tab-pill"
                        className="absolute inset-0 bg-gradient-to-b from-white/95 to-pink-50/50 dark:bg-slate-800/80 shadow-[0_6px_20px_rgba(244,114,182,0.15)] border-2 border-white/90 dark:border-white/10 rounded-full -z-10 backdrop-blur-md"
                        transition={{type: "spring", stiffness: 400, damping: 25, mass: 0.8}}
                      />
                    )}
                    {Icon ? (
                      <motion.div 
                        className="transform-gpu flex items-center justify-center relative"
                        animate={isActive ? { y: -4, scale: 1.2, rotate: [0, -6, 6, 0] } : { y: 0, scale: 1, rotate: 0 }}
                        transition={{ 
                          type: "spring", stiffness: 400, damping: 20, 
                          rotate: { duration: 0.4, delay: 0.1 }
                        }}
                      >
                         <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.8 : 2.2} className={`mb-1 transition-all drop-shadow-sm ${isActive ? 'text-pink-500 fill-pink-500/20' : 'text-slate-400 dark:text-slate-400'}`} />
                         {isActive && <motion.div 
                             initial={{ scale: 0 }} 
                             animate={{ scale: 1 }} 
                             transition={{ delay: 0.2, type: "spring" }}
                             className="absolute -bottom-2 w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-orange-400 shadow-[0_0_10px_rgba(244,114,182,0.8)] border border-white" 
                         />}
                      </motion.div>
                    ) : null}
                    <span className={`text-[11px] font-black tracking-widest whitespace-nowrap z-10 transition-colors ${isActive ? 'text-pink-600 dark:text-pink-400 mt-1 opacity-100' : 'mt-0 opacity-80'}`}>
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
