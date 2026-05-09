import { motion } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import type { TabName } from '../types/workflow';

export const TABS: { id: string; label: string; icon: string }[] = [
  { id: 'home', label: '探索首頁', icon: 'home' },
  { id: 'ai_form', label: 'AI 行程', icon: 'auto_awesome' },
  { id: 'itinerary', label: '行程手帳', icon: 'calendar_month' },
  { id: 'tools', label: '行前準備', icon: 'backpack' },
];

export default function BottomTabs() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="md:hidden fixed bottom-6 w-full z-50 flex justify-center items-center px-4 pointer-events-none pb-safe">
      <div className="bg-white/90 backdrop-blur-[30px] rounded-[32px] border border-white/60 shadow-[0_10px_40px_rgba(0,0,0,0.1)] flex justify-between items-center p-2 pointer-events-auto w-full max-w-[480px] mx-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center text-pink-500 flex-1 min-w-0 pt-2 pb-1.5 transition-all rounded-[24px] relative ${
                isActive 
                  ? 'bg-pink-50/50 scale-105 active:scale-95' 
                  : 'opacity-50 hover:opacity-100'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="tab-pill"
                  className="absolute inset-0 bg-white shadow-sm border border-pink-100 rounded-[24px] -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                />
              )}
              <span 
                className="material-symbols-outlined text-[24px] mb-0.5 shrink-0" 
                data-icon={tab.icon}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              <span className={`text-[10px] font-black whitespace-nowrap px-1 z-10 ${isActive ? 'text-pink-600' : 'text-pink-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
