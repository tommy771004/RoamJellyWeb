import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { 
  TRAVEL_GUIDE_REGIONS, 
  TRAVEL_GUIDE_SOURCE_REPO, 
  matchTravelDestinations,
  TravelGuideDestination
} from '../data/travelGuideDestinations';

export const LocationPickerPopup = ({ 
  onClose, 
  onSelect, 
  title,
  query
}: { 
  onClose: () => void; 
  onSelect: (dest: TravelGuideDestination) => void;
  title: string;
  query: string;
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('全部地區');
  const [searchQuery, setSearchQuery] = useState(query);

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);
  
  const filteredDestinations = useMemo(() => {
    return matchTravelDestinations(searchQuery || '', selectedRegion)
      .sort((a, b) => a.place.localeCompare(b.place, 'zh-Hant'));
  }, [searchQuery, selectedRegion]);

  const content = (
    <AnimatePresence>
      <div className="fixed inset-0 z-popup flex items-end justify-center p-0 md:items-center md:p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" 
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.98 }}
          className="relative z-popup-above flex h-82dvh w-full flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.25)] border border-white md:h-auto md:max-h-[80vh] md:w-[480px] md:max-w-xl md:min-w-[480px] md:rounded-3xl md:shadow-[0_32px_80px_rgba(0,0,0,0.35)]"
        >
          <div className="sticky top-0 z-20 bg-white/95 px-5 pb-4 pt-4 backdrop-blur-xl md:px-7 md:pb-5 md:pt-7">
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 md:hidden" />
            <div className="flex flex-row justify-between items-center mb-5 pl-1">
              <div className="flex flex-col">
                <span className="font-black tracking-tight text-slate-800 text-xl">{title}</span>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Select Destination</span>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full transition-all active:scale-90"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            {/* Region Tabs */}
            <div className="flex flex-row gap-x-2 mb-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              <button
                onClick={() => setSelectedRegion('全部地區')}
                className={`px-4 py-2.5 rounded-[16px] text-sm font-black transition-all whitespace-nowrap active:scale-95 ${
                  selectedRegion === '全部地區' 
                    ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' 
                    : 'bg-white/80 text-slate-500 hover:bg-white border border-slate-100'
                }`}
              >
                全部
              </button>
              {TRAVEL_GUIDE_REGIONS.map((region) => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`px-4 py-2.5 rounded-[16px] text-sm font-black transition-all whitespace-nowrap active:scale-95 ${
                    selectedRegion === region 
                      ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' 
                      : 'bg-white/80 text-slate-500 hover:bg-white border border-slate-100'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋國家、城市或景點別名"
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 py-3.5 pl-11 pr-4 text-[14px] font-bold text-slate-700 outline-none transition-[border-color,background-color,box-shadow] focus:border-fuchsia-200 focus:bg-white focus:ring-4 focus:ring-fuchsia-100"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </div>

            {/* Cities Grid */}
            <div className="grid flex-1 grid-cols-2 gap-2.5 overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-4 sm:grid-cols-3 md:px-7 md:pb-5 md:pt-0">
              {filteredDestinations.length > 0 ? (
                filteredDestinations.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => onSelect(dest)}
                    className="flex w-full min-w-0 flex-col items-start p-4 rounded-[20px] bg-white/60 border border-slate-100/50 hover:border-fuchsia-300 hover:bg-fuchsia-50/80 transition-all group active:scale-95 shadow-sm"
                  >
                    <span className="text-[11px] font-black tracking-widest uppercase text-slate-400 group-hover:text-fuchsia-400 mb-0.5">{dest.country}</span>
                    <span className="w-full break-words text-base font-extrabold text-slate-700 group-hover:text-fuchsia-700">{dest.place}</span>
                  </button>
                ))
              ) : (
                <div className="col-span-full py-10 flex flex-col items-center">
                  <span className="text-[40px] mb-3 grayscale opacity-30">🏔️</span>
                  <span className="text-sm text-slate-400 font-bold">找不到符合條件的地點</span>
                </div>
              )}
            </div>
          <div className="bg-slate-50/50 p-4 border-t border-slate-100/50 flex justify-center shrink-0">
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400/80">
              {TRAVEL_GUIDE_SOURCE_REPO}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
