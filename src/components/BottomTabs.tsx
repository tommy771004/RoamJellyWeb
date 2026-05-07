import { useAppStore } from '../store/useAppStore';
import type { TabName } from '../types/workflow';

export const TABS: { id: TabName; label: string; icon: string }[] = [
  { id: 'home', label: '探索首頁', icon: 'home' },
  { id: 'itinerary', label: '行程手帳', icon: 'calendar_month' },
  { id: 'tools', label: '行前準備', icon: 'backpack' },
];

export default function BottomTabs() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="md:hidden fixed bottom-6 w-full z-50 flex justify-center items-center px-4 pointer-events-none pb-safe">
      <div className="bg-white/70 backdrop-blur-[30px] rounded-[32px] border border-white/60 shadow-2xl border-t border-l flex justify-evenly items-center p-2 pointer-events-auto w-full max-w-[320px] mx-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center text-pink-500 w-20 pt-2 pb-1.5 transition-all rounded-[24px] ${
                isActive 
                  ? 'bg-white/80 shadow-[0_0_20px_rgba(255,183,206,0.6)] scale-105 active:scale-95' 
                  : 'opacity-60 hover:opacity-100 hover:scale-105 active:scale-95'
              }`}
            >
              <span 
                className="material-symbols-outlined text-[26px] leading-none mb-1" 
                data-icon={tab.icon}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              <span className={`text-[11px] font-bold ${isActive ? 'text-pink-600' : 'text-pink-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
