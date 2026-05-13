import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Home, Sparkles, CalendarDays, Luggage } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { TabName } from '../types/workflow';

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
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;

      if (currentY < 24) {
        setIsHidden(false);
      } else if (delta > 8) {
        setIsHidden(true);
      } else if (delta < -8) {
        setIsHidden(false);
      }

      lastScrollYRef.current = currentY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className="md:hidden fixed bottom-6 w-full z-50 flex justify-center items-center px-6 pointer-events-none pb-safe"
      animate={{ y: isHidden ? 120 : 0, opacity: isHidden ? 0 : 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      aria-hidden={isHidden}
    >
      <div className="bg-white/80 backdrop-blur-[30px] backdrop-saturate-[180%] rounded-[36px] shadow-[0_16px_40px_-5px_rgba(255,183,206,0.5),inset_0_1px_2px_rgba(255,255,255,0.7)] border border-pink-100/50 flex justify-between items-center p-1.5 pointer-events-auto w-full max-w-[380px] mx-auto overflow-hidden">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id || (activeTab === 'ai_result' && tab.id === 'ai_form');
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center text-pink-500 flex-1 min-w-0 pt-2.5 pb-2 transition-all rounded-[30px] relative ${
                isActive 
                  ? 'scale-105 active:scale-95' 
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="tab-pill"
                  className="absolute inset-0 bg-white shadow-sm border border-pink-100 rounded-[30px] -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
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
