import { motion } from 'motion/react';
import { Compass, CalendarDays, Luggage } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { TabName } from '../types/workflow';

const TABS: { id: TabName; label: string; icon: typeof Compass }[] = [
  { id: 'home', label: '探索首頁', icon: Compass },
  { id: 'itinerary', label: '行程手帳', icon: CalendarDays },
  { id: 'tools', label: '行前準備', icon: Luggage },
];

export default function BottomTabs() {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div className="absolute bottom-4 left-0 right-0 z-40 px-6 flex justify-center w-full pb-safe">
      <div className="bg-white/70 border border-white/60 shadow-xl shadow-slate-200/50 rounded-full p-1.5 flex flex-row justify-around items-center backdrop-blur-3xl w-full max-w-[300px]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center py-2 px-3 rounded-full relative appearance-none bg-transparent border-none cursor-pointer flex-1"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-white shadow-sm rounded-full"
                  transition={{ type: 'spring', bounce: 0.35, duration: 0.5 }}
                />
              )}
              <div className="items-center relative z-10 flex flex-col gap-1">
                <Icon size={20} color={isActive ? '#d946ef' : '#94a3b8'} strokeWidth={isActive ? 2.5 : 2} />
                <span
                  className={`text-[9px] font-bold ${isActive ? 'text-fuchsia-600' : 'text-slate-400'}`}
                >
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
