import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getModalMotion, getOverlayTransition } from '../lib/motionTokens';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { useVisualViewport } from '../lib/useKeyboardHeight';
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
  const vv = useVisualViewport();
  const [selectedRegion, setSelectedRegion] = useState<string>('全部地區');
  const [searchQuery, setSearchQuery] = useState(query);

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);
  
  const filteredDestinations = useMemo(() => {
    return matchTravelDestinations(searchQuery || '', selectedRegion)
      .sort((a, b) => a.place.localeCompare(b.place, 'zh-Hant'));
  }, [searchQuery, selectedRegion]);

  const isKeyboardOpen = vv.height < 520 && window.innerWidth < 1024;

  const content = (
    <AnimatePresence>
      <div className="fixed inset-x-0 z-popup flex items-end justify-center p-0 md:items-center md:p-4 transition-all duration-100" style={{ top: vv.offsetTop, height: vv.height }}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={getOverlayTransition()}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-popup-above flex h-[calc(100%-1.5rem)] sm:h-[82%] w-full flex-col overflow-hidden rounded-t-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,250,251,0.94),rgba(241,248,255,0.92))] shadow-[0_-12px_36px_rgba(15,23,42,0.14)] md:h-auto md:max-h-[80vh] md:w-[480px] md:max-w-xl md:min-w-[480px] md:rounded-[34px] md:shadow-[0_28px_60px_rgba(15,23,42,0.16)]"
        >
          <div className={`sticky top-0 z-20 bg-white/90 px-4 ${isKeyboardOpen ? 'pb-2 pt-2' : 'pb-3.5 pt-4'} backdrop-blur-xl md:px-6 md:pb-4 md:pt-6`}>
            <div className={`mx-auto rounded-full bg-slate-200 md:hidden ${isKeyboardOpen ? 'mb-1 h-1 w-10' : 'mb-3 h-1.5 w-12'}`} />
            <div className={`flex flex-row items-center justify-between pl-1 ${isKeyboardOpen ? 'mb-1.5' : 'mb-4'}`}>
              <div className="flex flex-col">
                <span className="fluid-title font-black text-slate-800">{title}</span>
                {!isKeyboardOpen && (
                  <span className="fluid-kicker mt-0.5 font-black uppercase text-slate-500">Select Destination</span>
                )}
              </div>
              <button 
                onClick={onClose}
                className={`flex items-center justify-center rounded-full bg-slate-100/80 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] hover:bg-slate-200 ${isKeyboardOpen ? 'h-8 w-8' : 'h-10 w-10'}`}
              >
                <span className={`${isKeyboardOpen ? 'text-xs' : 'text-xl'} text-slate-500 font-bold`}>✕</span>
              </button>
            </div>

            {/* Region Tabs */}
            {!isKeyboardOpen && (
              <div className="-mx-1 mb-4 flex flex-row gap-x-2 overflow-x-auto px-1 pb-1 scrollbar-hide animate-in fade-in duration-300">
                <button
                  onClick={() => setSelectedRegion('全部地區')}
                  className={`fluid-caption rounded-[16px] px-4 py-2 font-black transition-all whitespace-nowrap active:scale-[0.97] ${
                    selectedRegion === '全部地區' 
                      ? 'bg-gradient-to-br from-sky-500 to-orange-400 text-white shadow-[0_10px_22px_rgba(14,165,233,0.20)]' 
                      : 'border border-white/84 bg-white/84 text-slate-500 hover:bg-white'
                  }`}
                >
                  全部
                </button>
                {TRAVEL_GUIDE_REGIONS.map((region) => (
                  <button
                    key={region}
                    onClick={() => setSelectedRegion(region)}
                    className={`fluid-caption rounded-[16px] px-4 py-2 font-black transition-all whitespace-nowrap active:scale-[0.97] ${
                      selectedRegion === region 
                        ? 'bg-gradient-to-br from-sky-500 to-orange-400 text-white shadow-[0_10px_22px_rgba(14,165,233,0.20)]' 
                        : 'border border-white/84 bg-white/84 text-slate-500 hover:bg-white'
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                aria-label="搜尋世界旅遊目的地"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋國家、城市或景點別名"
                className="fluid-copy w-full rounded-[20px] border border-white/84 bg-white/84 py-3.5 pl-11 pr-4 font-bold text-slate-700 outline-none shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-[border-color,background-color,box-shadow] focus:border-fuchsia-200 focus:bg-white focus:ring-4 focus:ring-fuchsia-100"
                autoCapitalize="none"
                autoCorrect="off"
                onFocus={() => {
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 120);
                }}
              />
            </div>
          </div>

          {/* Cities Grid */}
          <div className="grid flex-1 grid-cols-2 gap-2.5 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.1rem)] pt-3 sm:grid-cols-3 md:px-6 md:pb-5 md:pt-0 no-scrollbar">
            {filteredDestinations.length > 0 ? (
              filteredDestinations.map((dest) => (
                <button
                  key={dest.id}
                  onClick={() => onSelect(dest)}
                  className="group flex w-full min-w-0 flex-col items-start rounded-[22px] border border-white/86 bg-white/80 p-3.5 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:border-fuchsia-300 hover:bg-fuchsia-50/80 hover:shadow-[0_10px_22px_rgba(217,70,239,0.10)] active:scale-[0.97]"
                >
                  <span className="fluid-kicker mb-0.5 font-black uppercase text-slate-500 group-hover:text-fuchsia-400">{dest.country}</span>
                  <span className="w-full break-words text-[15px] font-extrabold tracking-[-0.03em] text-slate-700 group-hover:text-fuchsia-700 sm:text-base">{dest.place}</span>
                </button>
              ))
            ) : (
              <div className="col-span-full py-10 flex flex-col items-center">
                <span className="text-[40px] mb-3 grayscale opacity-30">🏔️</span>
                <span className="fluid-copy font-bold text-slate-500">找不到符合條件的地點</span>
              </div>
            )}
          </div>
          {!isKeyboardOpen && (
            <div className="flex shrink-0 justify-center border-t border-white/78 bg-slate-50/46 p-4">
              <span className="fluid-kicker font-black uppercase text-slate-500/80">
                {TRAVEL_GUIDE_SOURCE_REPO}
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
