import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
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
  
  const filteredDestinations = useMemo(() => {
    return matchTravelDestinations(query || '', selectedRegion)
      .sort((a, b) => a.place.localeCompare(b.place, 'zh-Hant'));
  }, [query, selectedRegion]);

  const content = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" 
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          className="relative w-[90vw] md:w-[480px] max-w-[480px] md:max-w-xl min-w-[300px] md:min-w-[480px] shrink-0 bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] border border-white z-[210] overflow-hidden"
        >
          <div className="p-7 pb-5">
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

            {/* Cities Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[40vh] overflow-y-auto pr-1 pb-2">
              {filteredDestinations.length > 0 ? (
                filteredDestinations.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => onSelect(dest)}
                    className="flex flex-col items-start p-4 rounded-[20px] bg-white/60 border border-slate-100/50 hover:border-fuchsia-300 hover:bg-fuchsia-50/80 transition-all group active:scale-95 shadow-sm"
                  >
                    <span className="text-[11px] font-black tracking-widest uppercase text-slate-400 group-hover:text-fuchsia-400 mb-0.5">{dest.country}</span>
                    <span className="text-base font-extrabold text-slate-700 group-hover:text-fuchsia-700">{dest.place}</span>
                  </button>
                ))
              ) : (
                <div className="col-span-full py-10 flex flex-col items-center">
                  <span className="text-[40px] mb-3 grayscale opacity-30">🏔️</span>
                  <span className="text-sm text-slate-400 font-bold">目前該地區尚無推薦地點</span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-slate-50/50 p-4 border-t border-slate-100/50 flex justify-center">
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
