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
    <div className="absolute bottom-6 left-6 right-6 z-40 max-w-sm mx-auto w-full">
      <div className="bg-white/40 border border-white/60 shadow-xl rounded-3xl p-2 flex flex-row justify-around items-center backdrop-blur-md">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center p-3 rounded-2xl relative appearance-none bg-transparent border-none cursor-pointer"
              style={{ minWidth: 72 }}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-white rounded-2xl shadow-md"
                  transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                />
              )}
              <div className="items-center relative z-10 flex flex-col">
                <Icon size={24} color={isActive ? '#10b981' : '#64748b'} />
                <span
                  className={`text-[10px] font-bold mt-1 ${isActive ? 'text-emerald-500' : 'text-slate-500'}`}
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
