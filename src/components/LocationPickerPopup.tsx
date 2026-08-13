import React, { useEffect, useId, useMemo, useState } from 'react';
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
import { useTranslation } from "react-i18next";
import { useModalAccessibility } from '../lib/useModalAccessibility';

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
  const { t, i18n } = useTranslation();
  const dialogRef = useModalAccessibility(onClose);
  const titleId = useId();
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
    <AnimatePresence initial={false}>
      <div className="fixed inset-x-0 z-popup flex items-center justify-center p-3 md:p-4 transition-all duration-100" style={{ top: vv.offsetTop, height: vv.height }}>
        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={getOverlayTransition()}
          className="absolute inset-0 bg-[#17221c]/55" 
          onClick={onClose}
        />
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative z-popup-above flex h-[calc(100%-1.5rem)] w-full flex-col overflow-hidden rounded-t-[16px] bg-[#f8faf7] shadow-[0_10px_24px_rgba(23,34,28,0.18)] sm:h-[85%] md:h-auto md:max-h-[85vh] md:w-[600px] md:max-w-2xl md:min-w-[600px] md:rounded-[16px]"
        >
          <div className={`sticky top-0 z-20 bg-[#f8faf7] px-4 ${isKeyboardOpen ? 'pb-2 pt-2' : 'pb-3 mt-2 pt-4'} md:px-6 md:pb-4 md:pt-6`}>
            <div className={`flex flex-row items-center justify-between pl-1 ${isKeyboardOpen ? 'mb-1.5' : 'mb-5'}`}>
              <div className="flex flex-col">
                <h2 id={titleId} className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
              </div>
              <button 
                type="button"
                onClick={onClose}
                aria-label={t('str_12bb2d')}
                className="flex h-12 w-12 shrink-0 items-center justify-center text-[#59665e] transition-colors hover:text-[#9a452e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
              >
                <X size={isKeyboardOpen ? 18 : 20} className="text-slate-500" strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative mb-3">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                data-autofocus
                value={searchQuery}
                aria-label={t('str_dafacd0')}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('str_1426bb2')}
                className="w-full rounded-[12px] bg-[#e8ede7] py-3.5 pl-11 pr-4 text-[15px] font-bold text-[#435047] outline-none transition-colors placeholder:text-[#7b877f] focus:bg-white focus:ring-4 focus:ring-[#a3472b]/20"
                autoCapitalize="none"
                autoCorrect="off"
                onFocus={() => {
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 120);
                }}
              />
            </div>

            {!isKeyboardOpen && !searchQuery.trim() && (
              <div className="-mx-4 md:-mx-6 overflow-x-auto scrollbar-hide">
                <div className="flex flex-row gap-x-1.5 px-4 md:px-6 pb-2 pt-1 animate-in fade-in duration-300 w-max">
                  <button
                    type="button"
                    onClick={() => setSelectedRegion('全部地區')}
                    className={`min-h-11 rounded-[10px] px-4 py-2 text-[13px] font-bold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 ${
                      selectedRegion === '全部地區' 
                        ? 'bg-[#26342d] text-white' 
                        : 'bg-[#e8ede7] text-[#526159] hover:bg-[#dce4dc]'
                    }`}
                  >
                    {t('region.全部地區', '全部地區')}</button>
                  {TRAVEL_GUIDE_REGIONS.map((region) => (
                    <button
                      type="button"
                      key={region}
                      onClick={() => setSelectedRegion(region)}
                      className={`min-h-11 rounded-[10px] px-4 py-2 text-[13px] font-bold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 ${
                        selectedRegion === region 
                          ? 'bg-[#26342d] text-white' 
                          : 'bg-[#e8ede7] text-[#526159] hover:bg-[#dce4dc]'
                      }`}
                    >
                      {t('region.' + region, region)}
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
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] md:text-[15px] font-black tracking-wider text-slate-700">{t('countries.' + country, country)}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                      {dests.map((dest) => {
                        // Premium Taiwanese localized mapping function for multi-airport destination clarity
                        const getDisplayNames = (d: TravelGuideDestination) => {
                          const isEn = i18n.language === 'en';
                          if (isEn) {
                            if (d.searchAlias === 'TPE') return { main: 'Taipei Taoyuan', sub: 'Taoyuan Airport', code: 'TPE' };
                            if (d.searchAlias === 'TSA') return { main: 'Taipei Songshan', sub: 'Songshan Airport', code: 'TSA' };
                            if (d.searchAlias === 'NRT') return { main: 'Tokyo Narita', sub: 'Narita Airport', code: 'NRT' };
                            if (d.searchAlias === 'HND') return { main: 'Tokyo Haneda', sub: 'Haneda Airport', code: 'HND' };
                            if (d.searchAlias === 'ICN') return { main: 'Seoul Incheon', sub: 'Incheon Airport', code: 'ICN' };
                            if (d.searchAlias === 'GMP') return { main: 'Seoul Gimpo', sub: 'Gimpo Airport', code: 'GMP' };
                            if (d.searchAlias === 'KIX') return { main: 'Osaka Kansai', sub: 'Kansai Airport', code: 'KIX' };
                            if (d.searchAlias === 'CTS') return { main: 'Sapporo New Chitose', sub: 'New Chitose Airport', code: 'CTS' };
                            if (d.searchAlias === 'OKA') return { main: 'Okinawa Naha', sub: 'Naha Airport', code: 'OKA' };
                            if (d.searchAlias === 'BKK') return { main: 'Bangkok Suv.', sub: 'Suvarnabhumi', code: 'BKK' };
                            if (d.searchAlias === 'DMK') return { main: 'Bangkok Don M.', sub: 'Don Mueang Airport', code: 'DMK' };
                            if (d.searchAlias === 'SIN') return { main: 'Singapore Changi', sub: 'Changi Airport', code: 'SIN' };
                            if (d.searchAlias === 'PVG') return { main: 'Shanghai Pudong', sub: 'Pudong Airport', code: 'PVG' };
                            if (d.searchAlias === 'SHA') return { main: 'Shanghai Hongqiao', sub: 'Hongqiao Airport', code: 'SHA' };
                            if (d.searchAlias === 'PEK') return { main: 'Beijing Capital', sub: 'Capital Airport', code: 'PEK' };
                            if (d.searchAlias === 'LHR') return { main: 'London Heathrow', sub: 'Heathrow Airport', code: 'LHR' };
                            if (d.searchAlias === 'LGW') return { main: 'London Gatwick', sub: 'Gatwick Airport', code: 'LGW' };
                            if (d.searchAlias === 'CDG') return { main: 'Paris CDG', sub: 'CDG Airport', code: 'CDG' };
                            if (d.searchAlias === 'ORY') return { main: 'Paris Orly', sub: 'Orly Airport', code: 'ORY' };
                            if (d.searchAlias === 'JFK') return { main: 'New York JFK', sub: 'JFK Airport', code: 'JFK' };
                            if (d.searchAlias === 'EWR') return { main: 'New York Newark', sub: 'Newark Airport', code: 'EWR' };
                            if (d.searchAlias === 'MXP') return { main: 'Milan Malpensa', sub: 'Malpensa Airport', code: 'MXP' };
                            if (d.searchAlias === 'IST') return { main: 'Istanbul IST', sub: 'Istanbul Airport', code: 'IST' };
                            if (d.searchAlias === 'SAW') return { main: 'Istanbul Sabiha', sub: 'Sabiha Airport', code: 'SAW' };
                          }

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
                            return {
                              main: t(`destinations.${d.id}.main`, parts[0]),
                              sub: t(`destinations.${d.id}.sub`, parts[1]),
                              code: d.searchAlias || ''
                            };
                          }
                          return {
                            main: t(`destinations.${d.id}.main`, d.place),
                            sub: t(`destinations.${d.id}.sub`, t(`countries.${d.country}`, d.country)),
                            code: d.searchAlias || ''
                          };
                        };

                        const display = getDisplayNames(dest);

                        return (
                          <button
                            type="button"
                            key={dest.id}
                            onClick={() => onSelect(dest)}
                            className="group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[10px] bg-[#e8ede7] px-2 py-3 transition-colors hover:bg-[#dce4dc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
                          >
                            <span className="w-full truncate text-center text-[13px] font-black tracking-tight text-[#26342d] sm:text-[14px]">
                              {display.main}
                            </span>
                            
                            <span className="max-w-full truncate text-[10px] font-bold text-[#7b877f]">
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
                <Search size={28} className="mb-4 text-[#7b877f]" aria-hidden="true" />
                <span className="text-[15px] font-bold text-slate-500">{t('str_499a902f')}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
