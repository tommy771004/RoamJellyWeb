import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getModalMotion, getOverlayTransition } from '../lib/motionTokens';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useVisualViewport } from '../lib/useKeyboardHeight';
import { 
  TRAVEL_GUIDE_REGIONS, 
  TRAVEL_GUIDE_SOURCE_REPO, 
  matchTravelDestinations,
  TRAVEL_GUIDE_DESTINATIONS,
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

  const groupedDestinations = useMemo(() => {
    const grouped: Record<string, TravelGuideDestination[]> = {};
    filteredDestinations.forEach(dest => {
      if (!grouped[dest.country]) grouped[dest.country] = [];
      grouped[dest.country].push(dest);
    });
    // Optional: Taiwan and Japan first, then sort by name
    return Object.entries(grouped).sort((a, b) => {
      if (a[0] === '台灣') return -1;
      if (b[0] === '台灣') return 1;
      if (a[0] === '日本') return -1;
      if (b[0] === '日本') return 1;
      return a[0].localeCompare(b[0], 'zh-Hant');
    });
  }, [filteredDestinations]);

  const isKeyboardOpen = vv.height < 520 && window.innerWidth < 1024;

  const content = (
    <AnimatePresence>
      <div className="fixed inset-x-0 z-popup flex items-center justify-center p-3 md:p-4 transition-all duration-100" style={{ top: vv.offsetTop, height: vv.height }}>
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
          className="relative z-popup-above flex h-[calc(100%-1.5rem)] sm:h-[85%] w-full flex-col overflow-hidden rounded-t-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,1))] shadow-[0_-12px_36px_rgba(15,23,42,0.14)] md:h-auto md:max-h-[85vh] md:w-[600px] md:max-w-2xl md:min-w-[600px] md:rounded-[30px] md:shadow-[0_28px_60px_rgba(15,23,42,0.16)]"
        >
          <div className={`sticky top-0 z-20 bg-white/95 px-4 ${isKeyboardOpen ? 'pb-2 pt-2' : 'pb-3 mt-2 pt-4'} border-b border-slate-100 bg-white/80 backdrop-blur-lg md:px-6 md:pb-4 md:pt-6`}>
            <div className={`mx-auto rounded-full bg-slate-200 md:hidden ${isKeyboardOpen ? 'mb-1 h-1 w-10' : 'mb-4 h-1.5 w-12'}`} />
            <div className={`flex flex-row items-center justify-between pl-1 ${isKeyboardOpen ? 'mb-1.5' : 'mb-5'}`}>
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{title}</span>
                {!isKeyboardOpen && (
                  <span className="text-[10px] md:text-xs mt-0.5 font-bold uppercase tracking-wider text-slate-400">Select Destination</span>
                )}
              </div>
              <button 
                onClick={onClose}
                aria-label="關閉"
                className={`flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 ios-press transition-all ${isKeyboardOpen ? 'h-8 w-8' : 'h-9 w-9 md:h-10 md:w-10'}`}
              >
                <X size={isKeyboardOpen ? 18 : 20} className="text-slate-500" strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative mb-3">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                aria-label="搜尋世界旅遊目的地"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋國家、城市名"
                className="w-full rounded-[16px] border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-[15px] font-bold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                autoCapitalize="none"
                autoCorrect="off"
                onFocus={() => {
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 120);
                }}
              />
            </div>

            {/* Region Tabs */}
            {!isKeyboardOpen && !searchQuery.trim() && (
              <div className="-mx-4 md:-mx-6 overflow-x-auto scrollbar-hide">
                <div className="flex flex-row gap-x-1.5 px-4 md:px-6 pb-2 pt-1 animate-in fade-in duration-300 w-max">
                  <button
                    onClick={() => setSelectedRegion('全部地區')}
                    className={`rounded-full px-4 py-2 text-[13px] font-bold transition-all whitespace-nowrap ios-press ${
                      selectedRegion === '全部地區' 
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-100' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    綜合推薦
                  </button>
                  {TRAVEL_GUIDE_REGIONS.map((region) => (
                    <button
                      key={region}
                      onClick={() => setSelectedRegion(region)}
                      className={`rounded-full px-4 py-2 text-[13px] font-bold transition-all whitespace-nowrap ios-press ${
                        selectedRegion === region 
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-100' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-3 md:px-6 md:pb-6 no-scrollbar">
            {groupedDestinations.length > 0 ? (
              <div className="flex flex-col gap-5 md:gap-7">
                {groupedDestinations.map(([country, dests]) => (
                  <div key={country} className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 border-l-2 border-sky-400 pl-2">
                      <span className="text-[14px] md:text-[15px] font-black tracking-wider text-slate-700">{country}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                      {dests.map((dest) => {
                        // Premium Taiwanese localized mapping function for multi-airport destination clarity
                        const getDisplayNames = (d: TravelGuideDestination) => {
                          if (d.searchAlias === 'TPE') return { main: '台北桃園', sub: '桃園機場', code: 'TPE' };
                          if (d.searchAlias === 'TSA') return { main: '台北松山', sub: '松山機場', code: 'TSA' };
                          if (d.searchAlias === 'NRT') return { main: '東京成田', sub: '成田機場', code: 'NRT' };
                          if (d.searchAlias === 'HND') return { main: '東京羽田', sub: '羽田機場', code: 'HND' };
                          if (d.searchAlias === 'ICN') return { main: '首爾仁川', sub: '仁川機場', code: 'ICN' };
                          if (d.searchAlias === 'GMP') return { main: '首爾金浦', sub: '金浦機場', code: 'GMP' };
                          if (d.searchAlias === 'KIX') return { main: '大阪關西', sub: '關西機場', code: 'KIX' };
                          if (d.searchAlias === 'CTS') return { main: '札幌新千歲', sub: '新千歲機場', code: 'CTS' };
                          if (d.searchAlias === 'OKA') return { main: '沖繩那霸', sub: '那霸機場', code: 'OKA' };
                          if (d.searchAlias === 'BKK') return { main: '曼谷蘇凡', sub: '蘇凡納布', code: 'BKK' };
                          if (d.searchAlias === 'DMK') return { main: '曼谷廊曼', sub: '廊曼機場', code: 'DMK' };
                          if (d.searchAlias === 'SIN') return { main: '新加坡', sub: '樟宜機場', code: 'SIN' };
                          if (d.searchAlias === 'PVG') return { main: '上海浦東', sub: '浦東機場', code: 'PVG' };
                          if (d.searchAlias === 'SHA') return { main: '上海虹橋', sub: '虹橋機場', code: 'SHA' };
                          if (d.searchAlias === 'PEK') return { main: '北京首都', sub: '首都機場', code: 'PEK' };
                          if (d.searchAlias === 'LHR') return { main: '倫敦希斯洛', sub: '希斯洛機場', code: 'LHR' };
                          if (d.searchAlias === 'LGW') return { main: '倫敦蓋威克', sub: '蓋威克機場', code: 'LGW' };
                          if (d.searchAlias === 'CDG') return { main: '巴黎戴高樂', sub: '戴高樂機場', code: 'CDG' };
                          if (d.searchAlias === 'ORY') return { main: '巴黎奧利', sub: '奧利機場', code: 'ORY' };
                          if (d.searchAlias === 'JFK') return { main: '紐約甘迺迪', sub: '甘迺迪機場', code: 'JFK' };
                          if (d.searchAlias === 'EWR') return { main: '紐約紐華克', sub: '紐華克機場', code: 'EWR' };
                          if (d.searchAlias === 'MXP') return { main: '米蘭馬爾', sub: '馬爾彭薩', code: 'MXP' };
                          if (d.searchAlias === 'IST') return { main: '伊斯坦堡', sub: '伊斯坦堡機場', code: 'IST' };
                          if (d.searchAlias === 'SAW') return { main: '伊斯坦堡', sub: '薩比哈機場', code: 'SAW' };

                          const hasSlash = d.place.includes('/');
                          if (hasSlash) {
                            const parts = d.place.split('/');
                            return { main: parts[0], sub: parts[1], code: d.searchAlias || '' };
                          }
                          return { main: d.place, sub: d.country, code: d.searchAlias || '' };
                        };

                        const display = getDisplayNames(dest);

                        return (
                          <button
                            key={dest.id}
                            onClick={() => onSelect(dest)}
                            className="group relative flex flex-col items-center justify-center gap-1.5 rounded-[22px] border border-slate-100 bg-white/70 backdrop-blur-md py-4 px-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:bg-sky-50/25 hover:shadow-lg hover:shadow-sky-100/40 ios-press overflow-hidden"
                          >
                            {/* Subtle premium decorative color band indicators */}
                            <span className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-sky-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            
                            {/* Cute pink pulsing dot for domestic Taiwan spots as visual feedback */}
                            {dest.country === '台灣' && (
                              <span className="absolute top-3 right-3 size-1.5 rounded-full bg-pink-500 shadow-sm shadow-pink-300 animate-pulse" />
                            )}
                            
                            <span className="w-full text-center text-[13px] sm:text-[14px] font-black tracking-tight text-slate-800 group-hover:text-sky-600 transition-colors truncate">
                              {display.main}
                            </span>
                            
                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-500/85 transition-colors truncate max-w-full">
                              {display.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <span className="text-[48px] mb-4 grayscale opacity-30">✈️</span>
                <span className="text-[15px] font-bold text-slate-500">找不到符合條件的城市或機場</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
