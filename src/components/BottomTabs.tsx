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
    <nav className="md:hidden fixed bottom-6 w-full z-50 flex justify-center items-center px-6 pointer-events-none pb-safe">
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
              <span 
                className={`material-symbols-outlined mb-0.5 shrink-0 transition-all ${isActive ? 'text-[24px] text-pink-600 drop-shadow-sm' : 'text-[22px]'}`} 
                data-icon={tab.icon}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              <span className={`text-[9px] font-black uppercase tracking-wider whitespace-nowrap px-1 z-10 transition-colors ${isActive ? 'text-pink-600' : 'text-pink-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
