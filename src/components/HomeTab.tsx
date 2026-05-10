import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellRing, Heart, Search as SearchIcon, ChevronLeft, ChevronRight, Calendar, LayoutGrid, List, PlaneTakeoff, Sparkles, ArrowRight, Copy, Globe, ExternalLink, Bed, Ticket, CarFront } from 'lucide-react';
import GlassCard from './GlassCard';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FlightSkeletonCard } from './SkeletonCard';
import { searchOffers, SearchServiceUnavailableError, SearchTimeoutError, fetchHandbooks, createTripFact } from '../lib/workflowApi';
import { useSearchStore } from '../store/useSearchStore';
import { useAppStore } from '../store/useAppStore';
import type { SearchItem } from '../types/workflow';
import {
  TRAVEL_GUIDE_DESTINATIONS,
  TRAVEL_GUIDE_REGIONS,
  TRAVEL_GUIDE_SOURCE_REPO,
  matchTravelDestinations,
  type TravelGuideDestination,
} from '../data/travelGuideDestinations';
import { LocationPickerPopup } from './LocationPickerPopup';
import CountryGuideModal from './CountryGuideModal';
import ExpertHandbookModal from './ExpertHandbookModal';
import { getCountryGuide } from '../data/countryGuideData';
import type { CountryGuide } from '../data/countryGuideData';
import { EXPERT_HANDBOOKS } from '../data/expertHandbooks';

const AIRLINE_CODES: Record<string, string> = {
  'EVA Air': 'BR', '長榮航空': 'BR',
  'China Airlines': 'CI', '中華航空': 'CI',
  'Starlux Airlines': 'JX', '星宇航空': 'JX',
  'Tigerair Taiwan': 'IT', '台灣虎航': 'IT',
  'Peach Aviation': 'MM', '樂桃航空': 'MM',
  'Cathay Pacific': 'CX', '國泰航空': 'CX',
  'Japan Airlines': 'JL', '日本航空': 'JL',
  'All Nippon Airways': 'NH', '全日空': 'NH',
  'Hong Kong Airlines': 'HX', '香港航空': 'HX',
  'Asiana Airlines': 'OZ', '韓亞航空': 'OZ',
  'Korean Air': 'KE', '大韓航空': 'KE',
  'China Eastern Airlines': 'MU', '東方航空': 'MU',
  'China Eastern': 'MU', '中國東方航空': 'MU',
  'Air Macau': 'NX', '澳門航空': 'NX',
  'Scoot': 'TR', '酷航': 'TR',
  'HK Express': 'UO', '香港快運': 'UO',
  // standard OTAs no image
};

function AirlineLogo({ providerName, className }: { providerName: string, className: string }) {
  const normalizedName = providerName?.trim() || '';
  const code = AIRLINE_CODES[normalizedName];
  if (code) {
    return (
      <img 
        src={`https://skyticket.com/img/airline_images/${code}.jpg`}
        alt={normalizedName}
        className={`${className} object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }
  const initial = normalizedName?.charAt(0) || '?';
  return (
    <div className={`${className} bg-slate-900 flex items-center justify-center font-black text-white shadow-sm`}>
      {initial}
    </div>
  );
}

interface FlightCardProps {
  flight: SearchItem;
  isSaved: boolean;
  isTracked: boolean;
  onPress: () => void;
  onImportToTrip: (e: React.MouseEvent) => void;
  onToggleSave: (e: React.MouseEvent) => void;
  onToggleTrack: (e: React.MouseEvent) => void;
}

function FlightCard({ flight, isSaved, isTracked, onPress, onImportToTrip, onToggleSave, onToggleTrack }: FlightCardProps) {
  const providerName = flight.details?.airline || flight.provider;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)} 
      className="block w-full h-full text-left appearance-none cursor-pointer border-none bg-transparent p-0 flex flex-col focus:outline-none group/card"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
    >
      <GlassCard className="!p-0 bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:bg-white flex-1 flex flex-col overflow-hidden rounded-[24px] group-hover/card:-translate-y-1 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]">
        
        {/* Top Section: Airline & Route */}
        <div className="p-4 flex flex-col gap-3">
          {/* Header Row: Airline + Save Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AirlineLogo providerName={providerName} className="w-7 h-7 rounded-lg text-sm" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1 leading-none mb-1">
                  <span className="text-xs font-semibold text-slate-900">{flight.details?.airline || flight.provider}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{flight.provider}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold text-fuchsia-600 bg-fuchsia-50 px-1 py-[2px] rounded-sm tracking-tight">VERIFIED</span>
                </div>
              </div>
            </div>
            <button
              onClick={onToggleSave}
              className={`w-7 h-7 rounded-full flex justify-center items-center transition-all duration-200 active:scale-90 ${
                isSaved ? 'bg-pink-100 text-pink-600' : 'bg-slate-100/80 text-slate-400 hover:bg-pink-50 hover:text-pink-500'
              }`}
            >
              <Heart
                size={14}
                fill={isSaved ? 'currentColor' : 'transparent'}
                strokeWidth={2.5}
              />
            </button>
          </div>

          {/* Time & Airports Row */}
          <div className="flex items-center justify-between mt-1 px-0.5 relative">
            <div className="absolute left-[3rem] right-[3rem] top-1/2 -translate-y-1/2 flex items-center">
               <div className="w-1.5 h-1.5 rounded-full border border-slate-300 bg-white z-10" />
               <div className="flex-1 border-t-[1.5px] border-dashed border-slate-300" />
               <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center z-10 absolute left-1/2 -translate-x-1/2 rotate-90">
                 <PlaneTakeoff size={8} strokeWidth={2.5} className="-ml-0.5" />
               </div>
               <div className="w-1.5 h-1.5 rounded-full border border-slate-300 bg-white z-10" />
            </div>

            <div className="flex flex-col items-start z-10 bg-white/40 backdrop-blur-sm pr-1">
              <span className="text-xl font-black text-slate-900 tracking-tighter leading-none mb-1">
                {flight.details?.departure}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
                Depart
              </span>
            </div>

            <div className="flex flex-col items-end z-10 bg-white/40 backdrop-blur-sm pl-1">
              <span className="text-xl font-black text-slate-900 tracking-tighter leading-none mb-1">
                {flight.details?.arrival}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
                Arrive
              </span>
            </div>
          </div>
          
          {/* Flight Info Badges */}
          <div className="flex items-center gap-2 mt-1 text-slate-500 px-1">
            <div className="flex items-center gap-1">
               <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${flight.details?.stops === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                 {flight.details?.stops === 0 ? '直飛 DIRECT' : `${flight.details?.stops} 轉 STOP`}
               </span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-tight">{flight.details?.duration || '3h 15m'}</span>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-200/50 bg-slate-50/80"
            >
              <div className="p-4 px-5 text-sm flex flex-col gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Flight Details</span>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Operated by {flight.details?.airline || flight.provider}. This flight takes {flight.details?.duration || '3h 15m'} and offers an excellent travel experience. Please double-check terminal information upon arrival.
                  </p>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Baggage & Extras</span>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Standard fare typically includes one cabin bag. Additional baggage allowance and seat selection may incur extra charges with {flight.provider}.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Separator with cutout effect */}
        <div className="relative flex items-center h-3 w-full">
          <div className="absolute left-[-6px] w-3 h-3 bg-[#FAFAFA] rounded-full border-r border-slate-200/60 shadow-inner" />
          <div className="absolute right-[-6px] w-3 h-3 bg-[#FAFAFA] rounded-full border-l border-slate-200/60 shadow-inner" />
          <div className="w-full border-t border-dashed border-slate-300 mx-2.5" />
        </div>

        {/* Bottom Section: Price & CTA */}
        <div className="p-4 pt-2 bg-gradient-to-b from-transparent to-slate-50/80 flex items-end justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Estimated Price</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-slate-400">{flight.currency}</span>
              <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{flight.price.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleTrack(e); }}
              className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all active:scale-95 border ${
                isTracked 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 shadow-sm hover:shadow'
              }`}
            >
              {isTracked ? <BellRing size={14} strokeWidth={2.5} /> : <Bell size={14} strokeWidth={2.5} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onImportToTrip(e); }}
              className="h-8 px-3 rounded-[10px] flex items-center gap-1.5 transition-all active:scale-95 border border-transparent bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg"
            >
              <PlaneTakeoff size={14} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">帶入</span>
            </button>
            {isExpanded && (
              <button
                onClick={(e) => { e.stopPropagation(); onPress(); }}
                className="h-8 px-4 rounded-[10px] bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold transition-transform active:scale-95 shadow-md ml-1"
              >
                <span className="text-[10px] uppercase tracking-widest leading-none">購買</span>
              </button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function FlightTable({ 
  results, 
  savedItems, 
  trackedPrices, 
  onPress, 
  onImportToTrip,
  onToggleSave, 
  onToggleTrack 
}: { 
  results: SearchItem[]; 
  savedItems: string[]; 
  trackedPrices: string[]; 
  onPress: (f: SearchItem) => void;
  onImportToTrip: (e: React.MouseEvent, f: SearchItem) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  onToggleTrack: (e: React.MouseEvent, f: SearchItem) => void;
}) {
  return (
    <div className="overflow-x-auto pb-4 w-full">
      <table className="w-full min-w-[750px] border-separate" style={{ borderSpacing: '0 8px' }}>
        <caption className="sr-only">搜尋結果比較表</caption>
        <thead>
          <tr className="[&>th]:font-bold [&>th]:text-slate-400 [&>th]:text-[11px] [&>th]:uppercase [&>th]:tracking-widest [&>th]:pb-3 border-b border-slate-200">
            <th scope="col" className="text-left pl-4 font-sans align-bottom">航空公司</th>
            <th scope="col" className="text-left font-sans align-bottom">航班時間</th>
            <th scope="col" className="text-left font-sans align-bottom">轉機</th>
            <th scope="col" className="text-right font-sans align-bottom">價格 (TWD)</th>
            <th scope="col" className="text-right pr-4 font-sans align-bottom">動作</th>
          </tr>
        </thead>
        <tbody>
          {results.map((flight) => (
            <tr key={flight.id} className="cursor-pointer group/row bg-white hover:bg-slate-50/80 transition-all duration-300 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] rounded-2xl relative" onClick={() => onPress(flight)}>
              <td data-label="航空公司" className="py-4 pl-4 rounded-l-[16px] border-y border-l border-slate-100 group-hover/row:border-slate-200/60 transition-colors">
                <div className="flex items-center gap-3 justify-start">
                  <AirlineLogo providerName={flight.details?.airline || flight.provider} className="w-10 h-10 rounded-[10px] text-lg" />
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-slate-900 text-[13px] font-bold truncate max-w-[140px] leading-tight">{flight.details?.airline || flight.provider}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{flight.provider}</span>
                  </div>
                </div>
              </td>
              <td data-label="航班時間" className="py-4 border-y border-slate-100 group-hover/row:border-slate-200/60 transition-colors">
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-slate-900 font-bold text-[15px]">{flight.details?.departure}</span>
                    <span className="text-slate-300 text-xs">→</span>
                    <span className="text-slate-900 font-bold text-[15px]">{flight.details?.arrival}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{flight.details?.duration || '3h 15m'}</span>
                </div>
              </td>
              <td data-label="轉機" className="py-4 border-y border-slate-100 group-hover/row:border-slate-200/60 transition-colors">
                <div className="flex flex-col items-start">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${flight.details?.stops === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                    {flight.details?.stops === 0 ? '直飛' : `${flight.details?.stops} 轉`}
                  </span>
                </div>
              </td>
              <td data-label="價格 (TWD)" className="amount py-4 border-y border-slate-100 group-hover/row:border-slate-200/60 transition-colors pr-6 text-right">
                <div className="flex flex-col items-end justify-end">
                  <span className="text-xl font-black text-slate-900 tracking-tighter leading-none">{flight.price.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">{flight.currency}</span>
                </div>
              </td>
              <td data-label="操作" className="py-4 pr-4 rounded-r-[16px] border-y border-r border-slate-100 group-hover/row:border-slate-200/60 transition-colors">
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    onClick={(e) => onImportToTrip(e, flight)}
                    className="h-9 px-3 rounded-[10px] flex items-center gap-1 transition-all active:scale-95 border bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-sm"
                  >
                    <PlaneTakeoff size={14} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold tracking-widest hidden sm:inline tracking-widest">帶入</span>
                  </button>
                  <button
                    onClick={(e) => onToggleTrack(e, flight)}
                    className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all active:scale-95 border ${
                      trackedPrices.includes(flight.id) 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {trackedPrices.includes(flight.id) ? <BellRing size={15} strokeWidth={2.5} /> : <Bell size={15} strokeWidth={2.5} />}
                  </button>
                  <button
                    onClick={(e) => onToggleSave(e, flight.id)}
                    className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all active:scale-95 border ${
                      savedItems.includes(flight.id) 
                        ? 'bg-pink-100 border-pink-100 text-pink-500' 
                        : 'bg-white border-slate-200 text-slate-300 hover:text-pink-400 hover:border-pink-200 shadow-sm'
                    }`}
                  >
                    <Heart size={15} fill={savedItems.includes(flight.id) ? 'currentColor' : 'transparent'} strokeWidth={2.5} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FEATURED_DESTINATIONS = [
  {
    id: 'jp',
    name: '日本',
    flag: '🇯🇵',
    image: 'https://picsum.photos/seed/japan-shrine/600/400',
    description: '東亞島國，以獨特文化、精緻料理與多彩自然景觀聞名。從千年古剎到繁華都會，橫跨北海道到九州八大地域，每個角落都值得深度探索。',
    tags: ['文化', '美食', '自然'],
    highlights: ['🗾 八大地域', '🌸 賞花勝地', '🍜 料理天堂', '🚅 JR 周遊券'],
    guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/',
  },
  {
    id: 'np',
    name: '尼泊爾',
    flag: '🇳🇵',
    image: 'https://picsum.photos/seed/nepal-himalaya/600/400',
    description: '喜馬拉雅山脈的故鄉，擁有世界最高峰聖母峰。融合豐富宗教文化與壯麗高山景觀，是登山健行與靈性旅行的聖地。',
    tags: ['登山', '文化', '冒險'],
    highlights: ['🏔️ 世界屋脊', '🕌 加德滿都', '🥾 健行天堂', '🌿 自然生態'],
    guideUrl: 'https://travel-guide-tw.github.io/%E5%B0%BC%E6%B3%8A%E7%88%BE/',
  },
  {
    id: 'no',
    name: '挪威',
    flag: '🇳🇴',
    image: 'https://picsum.photos/seed/norway-fjord/600/400',
    description: '北歐峽灣之國，壯闊的極光與冰川雕刻的峽灣地貌令人嘆為觀止。特羅姆瑟是追尋極光的最佳基地，峽灣巡遊更是一生必訪體驗。',
    tags: ['極光', '峽灣', '自然'],
    highlights: ['🌌 北極光', '🏔️ 峽灣奇景', '❄️ 特羅姆瑟', '🦌 馴鹿體驗'],
    guideUrl: 'https://travel-guide-tw.github.io/%E6%8C%AA%E5%A8%81/',
  },
  {
    id: 'ch',
    name: '瑞士',
    flag: '🇨🇭',
    image: 'https://picsum.photos/seed/switzerland-alps/600/400',
    description: '歐洲心臟，由 26 個州組成。阿爾卑斯山脈、瑞士高原與侏羅山構成壯麗地貌，精緻鐘錶工藝與多語言文化造就獨特魅力。',
    tags: ['阿爾卑斯', '精品', '自然'],
    highlights: ['🏔️ 阿爾卑斯山', '🕰️ 鐘錶工藝', '🧀 起司美食', '🚂 登山列車'],
    guideUrl: 'https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/',
  },
];

export default function HomeTab({ onRequireLogin, isLoggedIn }: { onRequireLogin?: () => void; isLoggedIn?: boolean }) {
  const { searchForm, updateField, results, setResults, loading, setLoading, searchError, setSearchError, savedItems, toggleSave, trackedPrices, toggleTrack } =
    useSearchStore();
  const { openRedirectModal, isOffline, showToast, setActiveTab, activeTripId } = useAppStore();

  const [dateError, setDateError] = useState<string | null>(null);
  const [showDeparturePicker, setShowDeparturePicker] = useState<boolean>(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [flyingCard, setFlyingCard] = useState<{ id: number; startX: number; startY: number; width: number; height: number; handbook?: any } | null>(null);
  const [activeGuide, setActiveGuide] = useState<CountryGuide | null>(null);
  const [activeHandbook, setActiveHandbook] = useState<typeof EXPERT_HANDBOOKS[0] | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const expertHandbooks = EXPERT_HANDBOOKS;

  const handleCopyExpertItinerary = (e: React.MouseEvent | undefined, handbook: typeof EXPERT_HANDBOOKS[0]) => {
    e?.stopPropagation?.();
    
    // Get card position for animation start
    const cardElement = e?.currentTarget ? (e.currentTarget as HTMLElement).closest('.group\\/handbook') : null;
    const rect = cardElement ? cardElement.getBoundingClientRect() : e?.currentTarget ? (e.currentTarget as HTMLElement).getBoundingClientRect() : { left: window.innerWidth / 2 - 140, top: window.innerHeight / 2 - 80, width: 280, height: 160 };
    setFlyingCard({
      id: Date.now(),
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      width: rect.width || 320,
      height: rect.height || 380,
      handbook
    });

    // Reset animation after it finishes
    setTimeout(async () => {
      setFlyingCard(null);
      
      try {
        const { useItineraryStore } = await import('../store/useItineraryStore');
        const { useAppStore } = await import('../store/useAppStore');
        const { syncItinerary, createTrip } = await import('../lib/workflowApi');
        const { setNodes, addNode } = useItineraryStore.getState();
        const { activeTripId, setActiveTripId, setActiveTab } = useAppStore.getState();
        
        let TRIP_ID = activeTripId;

        // If no active trip, create a new one first
        if (!TRIP_ID) {
          const newTrip = await createTrip({ 
            name: handbook.title, 
            destination: handbook.tags[0] || '指定地點'
          });
          TRIP_ID = newTrip.id;
          setActiveTripId(TRIP_ID);
        }

        if (handbook.nodes && handbook.nodes.length) {
          setNodes([]);
          for (const rawNode of handbook.nodes) {
             const normalized = { ...rawNode, source: 'local' } as any;
             addNode(normalized);
             const payload = { trip_id: TRIP_ID, action: 'add_node', payload: normalized } as any;
             await syncItinerary(payload);
          }
        }

        showToast(`已成功將 ${handbook.title} 複製到您的手帳！`, 'success');
        setActiveTab('itinerary');
      } catch (err) {
        showToast('複製行程失敗', 'warning');
      }
    }, 1200); // 1.2s to match animation duration
  };

  const [communityTrips, setCommunityTrips] = useState<any[]>([]);
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'flight' | 'ticket' | 'other'>('all');

  const filteredResults = useMemo(() => {
    if (filterType === 'all') return results;
    return results.filter(r => r.type === filterType);
  }, [results, filterType]);

  const resolveCurrentTripId = () =>
    activeTripId ||
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('trip_id') : '') ||
    ((typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string> }).env?.VITE_TRIP_ID) || '').trim();

  useEffect(() => {
    // Initial fetch for recommendations and handbooks
    const loadInitialData = async () => {
      try {
        const [handbooks, recommendations] = await Promise.all([
          fetchHandbooks(),
          Promise.resolve([])
        ]);
        setCommunityTrips(handbooks);
        if (results.length === 0) setResults(recommendations);
      } catch (e) {
        console.error('Failed to load initial data', e);
      }
    };
    void loadInitialData();
  }, []);

  const handleCloneTrip = async (e: React.MouseEvent, trip: any) => {
    e.stopPropagation();
    
    // Trigger animation
    const cardElement = (e.currentTarget as HTMLElement).closest('.group\\/trip') || (e.currentTarget as HTMLElement);
    const rect = cardElement.getBoundingClientRect();
    setFlyingCard({
      id: Date.now(),
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      width: rect.width || 320,
      height: rect.height || 200,
      handbook: trip
    });

    try {
      const { getStoredToken } = await import('../lib/workflowApi');
      const token = getStoredToken();
      const res = await fetch(`/api/trips/${trip.id}/clone`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      showToast(`已成功將行程 ${trip.name ?? trip.title ?? ''} 複製到您的手帳！`, 'success');
      
      // Navigate to the newly cloned trip
      setTimeout(() => {
        useAppStore.getState().setActiveTripId(data.data.new_trip_id);
        setActiveTab('itinerary');
      }, 800);
    } catch {
      showToast('複製失敗', 'warning');
    }
  };


  const applyGuideDestination = (destination: TravelGuideDestination, field: 'from' | 'to') => {
    // 根據選好的地方 顯示中文
    updateField(field, destination.place);
    if (field === 'from') setShowDeparturePicker(false);
    if (field === 'to') setShowDestinationPicker(false);
  };

  const selectDate = (dateStr: string) => {
    updateField('date', dateStr);
    setShowDatePicker(false);
    if (dateError) setDateError(null);
  };

  const isSearchDisabled = useMemo(
    () => !searchForm.from.trim() || !searchForm.to.trim() || !searchForm.date.trim(),
    [searchForm],
  );

  const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  const handleSearch = async () => {
    if (!DATE_REGEX.test(searchForm.date.trim())) {
      setDateError('日期格式需為 YYYY-MM-DD，例如 2025-08-01');
      return;
    }
    setDateError(null);
    setHasSearched(true);
    setLoading(true);
    setSearchError(null);
    try {
      const result = await searchOffers(searchForm);
      setResults(result);
    } catch (error) {
      if (error instanceof SearchTimeoutError) {
        setSearchError('timeout');
      } else if (error instanceof SearchServiceUnavailableError) {
        setSearchError('service');
      } else {
        setSearchError('service');
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toHHMM = (s: string | undefined) => s?.match(/\d{1,2}:\d{2}/)?.[0] ?? '09:00';

  const handleImportFlight = async (flight: SearchItem) => {
    if (!isLoggedIn && onRequireLogin) {
      onRequireLogin();
      return;
    }

    const tripId = resolveCurrentTripId();
    if (!tripId) {
      showToast('請先開啟一趟旅程，再把航班帶入手帳。', 'warning');
      return;
    }

    try {
      const depCode = searchForm.from?.trim() || flight.details?.depCode || 'TPE';
      const arrCode = searchForm.to?.trim() || flight.details?.arrCode || 'NRT';
      const factDate = searchForm.date?.trim() || new Date().toISOString().slice(0, 10);
      await createTripFact(tripId, {
        factType: 'flight_outbound',
        source: 'imported_search',
        title: `${flight.details?.airline || flight.provider} ${depCode} → ${arrCode}`,
        startAt: `${factDate}T${toHHMM(flight.details?.departure)}:00.000Z`,
        endAt: `${factDate}T${toHHMM(flight.details?.arrival) || '13:00'}:00.000Z`,
        locationName: arrCode,
        referenceCode: flight.details?.flightNumber || null,
        metadata: {
          airline: flight.details?.airline || flight.provider,
          depCode,
          arrCode,
          flightNumber: flight.details?.flightNumber,
          provider: flight.provider,
        },
      });
      showToast(`已把 ${flight.provider} 航班帶入旅程錨點。`, 'success');
    } catch {
      showToast('帶入旅程失敗，請稍後再試。', 'warning');
    }
  };

  // Rendered location and date picker popups are located at the bottom of the component

  const DatePickerPopup = ({ 
    onClose, 
    onSelect,
    selectedDate
  }: { 
    onClose: () => void; 
    onSelect: (date: string) => void;
    selectedDate: string;
  }) => {
    const today = new Date();
    const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
    
    // Safety check for invalid dates
    const effectiveViewDate = isNaN(viewDate.getTime()) ? new Date() : viewDate;

    const month = effectiveViewDate.getMonth();
    const year = effectiveViewDate.getFullYear();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const startDate = new Date(monthStart);
    startDate.setDate(monthStart.getDate() - monthStart.getDay());

    const days = [];
    let currDay = new Date(startDate);
    while (currDay <= monthEnd || days.length % 7 !== 0) {
      days.push(new Date(currDay));
      currDay.setDate(currDay.getDate() + 1);
      if (days.length > 42) break; // Prevent infinite loop
    }

    const changeMonth = (offset: number) => {
      const next = new Date(year, month + offset, 1);
      setViewDate(next);
    };

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

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
            className="relative w-[90vw] md:w-[480px] max-w-[480px] md:max-w-xl min-w-[300px] md:min-w-[480px] shrink-0 bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] border border-white z-[210] overflow-hidden p-6 md:p-8"
          >
            <div className="flex flex-row justify-between items-center mb-8">
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-800 tracking-tight">{year}年 {monthNames[month]}</span>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Select Travel Date</span>
              </div>
              <div className="flex gap-x-3">
                <button onClick={() => changeMonth(-1)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all">
                  <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <button onClick={() => changeMonth(1)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all">
                  <ChevronRight size={24} className="text-slate-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <div key={d} className="text-center text-[11px] font-black text-slate-400 uppercase tracking-widest pb-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((date, i) => {
                const isCurrentMonth = date.getMonth() === month;
                const isSelected = formatDate(date) === selectedDate;
                const isToday = formatDate(date) === formatDate(today);
                const isPast = date < new Date(today.setHours(0,0,0,0));

                return (
                  <button
                    key={i}
                    disabled={isPast && !isToday}
                    onClick={() => {
                      if (!isPast || isToday) onSelect(formatDate(date));
                    }}
                    className={`
                      relative py-2.5 rounded-xl text-sm font-bold transition-all
                      ${!isCurrentMonth ? 'opacity-20' : 'opacity-100'}
                      ${isSelected 
                        ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20 z-10' 
                        : isPast && !isToday ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-pink-50 hover:text-pink-600'}
                    `}
                  >
                    {date.getDate()}
                    {isToday && !isSelected && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-pink-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-center">
              <button 
                onClick={onClose}
                className="text-[11px] font-black tracking-[0.2em] uppercase text-slate-400 hover:text-pink-500 transition-colors"
              >
                關閉暫存
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );

    return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 md:pt-12 max-w-full lg:max-w-[90rem] mx-auto flex flex-col flex-1 h-full w-full overflow-y-auto">
      
      {/* Hero section with artistic horizontal text (Marquee effect) */}
      <div className="relative w-full mb-4 md:mb-6 mt-1 sm:mt-3 min-h-[140px] sm:min-h-[180px] md:min-h-[220px] overflow-hidden rounded-[18px] sm:rounded-[24px] md:rounded-[32px] flex flex-col justify-center group shadow-sm border border-black/5">
        {/* Dynamic Abstract Background */}
        <div className="absolute inset-0 transition-colors duration-1000 bg-gradient-to-br from-indigo-50/80 via-white to-orange-50/80 -z-20 group-hover:from-indigo-100/80 group-hover:via-white group-hover:to-rose-50/80" />
        <div className="absolute right-0 top-[-20%] w-3/4 h-[140%] bg-gradient-to-l from-pink-200/40 via-fuchsia-200/20 to-transparent blur-3xl -z-10 transform rotate-12 transition-transform duration-1000 group-hover:rotate-6 group-hover:scale-110" />
        <div className="absolute left-[-10%] bottom-[-20%] w-1/2 h-full bg-gradient-to-tr from-sky-200/40 to-transparent blur-3xl -z-10 transition-transform duration-1000 group-hover:-translate-y-10 group-hover:scale-110" />
        
        {/* Marquee layer */}
        <div className="absolute inset-0 flex items-center pointer-events-none z-0 overflow-hidden mix-blend-overlay">
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, ease: 'linear', duration: 60 }}
            className="flex whitespace-nowrap opacity-[0.04] select-none"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="text-[48px] sm:text-[64px] md:text-[88px] font-black text-slate-900 uppercase tracking-tighter pr-4 md:pr-8 leading-none py-3">
                Explore the World • 探索無界 •
              </span>
            ))}
          </motion.div>
        </div>
        
        {/* Foreground Content */}
        <div className="relative z-10 flex flex-col justify-center items-start px-5 sm:px-8 md:px-12 pointer-events-none">
           <motion.div 
             initial={{ opacity: 0, y: 15 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
             className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 backdrop-blur-md border border-white/80 shadow-sm mb-3 sm:mb-4"
           >
             <Sparkles size={12} className="text-orange-500" />
             <span className="text-[10px] sm:text-xs font-bold text-slate-700 tracking-wide">AI Powered Travel</span>
           </motion.div>
           <h1 className="text-[24px] sm:text-[32px] md:text-[44px] font-black text-slate-900 tracking-tight leading-[1.1] mb-2 sm:mb-3 max-w-[80%]">
             預見下一次<br className="sm:hidden" />
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600 pb-1 relative inline-block">
               非凡旅程
               <div className="absolute -bottom-1 left-0 w-full h-[6px] bg-fuchsia-500/20 -rotate-1 skew-x-12 rounded-full" />
             </span>
           </h1>
           <p className="text-[11px] sm:text-[13px] md:text-[15px] text-slate-500 font-bold tracking-wide">
             探索全球機票、質感住宿與在地體驗
           </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:gap-8 w-full max-w-7xl mx-auto">
        {/* Left Side: Search Form & AI Banner */}
        <div className="w-full flex-shrink-0 flex flex-col gap-6 md:gap-8">
          
          {/* Immersive AI Banner */}
          <div className="w-full group cursor-pointer" onClick={() => setActiveTab('ai_form')}>
            <div className="bg-slate-900 rounded-[20px] md:rounded-[28px] p-5 sm:p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-2xl shadow-slate-900/20 relative overflow-hidden transition-all duration-500 hover:shadow-fuchsia-500/10 hover:-translate-y-0.5">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/30 via-transparent to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"></div>
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000 ease-out pointer-events-none"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-sky-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000 ease-out pointer-events-none delay-75"></div>
              
              <div className="relative z-10 flex items-center gap-4 sm:gap-5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-fuchsia-500 flex items-center justify-center p-0.5 shadow-xl shadow-fuchsia-500/30 group-hover:rotate-6 transition-transform duration-500 shrink-0">
                   <div className="w-full h-full bg-slate-900/40 rounded-[14px] flex items-center justify-center backdrop-blur-md">
                     <Sparkles size={24} strokeWidth={2.5} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                   </div>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1 flex items-center gap-2">
                    AI 智慧行程規劃
                    <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-[9px] font-bold uppercase tracking-widest border border-fuchsia-500/30 backdrop-blur-sm">Beta</span>
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm font-medium tracking-wide">
                    輸入目的地，秒速生成專屬客製化旅航計畫
                  </p>
                </div>
              </div>
              <div className="relative z-10 mt-5 sm:mt-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:bg-white group-hover:text-slate-900 text-white transition-all shadow-sm group-active:scale-95 shrink-0 self-end sm:self-auto">
                <ArrowRight size={18} strokeWidth={2.5} className="-rotate-45 group-hover:rotate-0 transition-transform duration-500" />
              </div>
            </div>
          </div>

          {/* Horizontal Search Form */}
          <GlassCard className={`!p-1.5 md:!p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-3xl rounded-[32px] md:rounded-[36px] border border-white/60 transition-opacity duration-300 ${loading ? 'opacity-60 pointer-events-none grayscale-[0.2]' : ''}`}>
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-3">
              <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 flex-1">
                {/* 出發地 */}
                <div className="relative flex-1 bg-slate-50/50 hover:bg-slate-100/60 focus-within:bg-white focus-within:border-slate-300 focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 rounded-[20px] md:rounded-[24px] px-5 py-3 md:py-3.5 border border-slate-200/60 flex items-center group/input">
                  <div className="absolute left-6 text-slate-400 group-hover/input:text-orange-500 group-focus-within/input:text-orange-500 transition-colors">
                    <PlaneTakeoff size={20} />
                  </div>
                  <div className="flex flex-col pl-10 w-full text-left">
                    <Label htmlFor="search-from" className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase mb-1 cursor-text">出發從哪裡</Label>
                    <input
                      id="search-from"
                      className="bg-transparent border-none p-0 focus:ring-0 text-base md:text-lg font-black text-slate-900 placeholder:text-slate-300 placeholder:font-bold w-full outline-none leading-none h-6"
                      value={searchForm.from}
                      onFocus={() => {
                        setShowDeparturePicker(true);
                        setShowDestinationPicker(false);
                        setShowDatePicker(false);
                      }}
                      onChange={(e) => {
                        updateField('from', e.target.value);
                      }}
                      placeholder="台北 TPE"
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* 目的地 */}
                <div className="relative flex-1 bg-slate-50/50 hover:bg-slate-100/60 focus-within:bg-white focus-within:border-slate-300 focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 rounded-[20px] md:rounded-[24px] px-5 py-3 md:py-3.5 border border-slate-200/60 flex items-center group/input">
                  <div className="absolute left-6 text-slate-400 group-hover/input:text-fuchsia-500 group-focus-within/input:text-fuchsia-500 transition-colors">
                    <Globe size={20} />
                  </div>
                  <div className="flex flex-col pl-10 w-full text-left">
                    <Label htmlFor="search-to" className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase mb-1 cursor-text">飛往目的地</Label>
                    <input
                      id="search-to"
                      className="bg-transparent border-none p-0 focus:ring-0 text-base md:text-lg font-black text-slate-900 placeholder:text-slate-300 placeholder:font-bold w-full outline-none leading-none h-6"
                      value={searchForm.to}
                      onFocus={() => {
                        setShowDestinationPicker(true);
                        setShowDeparturePicker(false);
                        setShowDatePicker(false);
                      }}
                      onChange={(e) => {
                        updateField('to', e.target.value);
                      }}
                      placeholder="東京 NRT"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 lg:gap-3 flex-none lg:w-[280px]">
                {/* 日期 */}
                <div 
                  onClick={() => {
                    setShowDatePicker(!showDatePicker);
                    setShowDeparturePicker(false);
                    setShowDestinationPicker(false);
                  }}
                  className={`relative flex-1 transition-all duration-300 rounded-[20px] md:rounded-[24px] px-5 py-3 md:py-3.5 border flex items-center cursor-pointer group/date ${showDatePicker ? 'border-orange-300 bg-orange-50 shadow-[0_4px_20px_rgba(249,115,22,0.08)]' : 'bg-slate-50/50 hover:bg-slate-100/60 border-slate-200/60'}`}
                >
                  <div className={`absolute left-5 transition-colors ${showDatePicker ? 'text-orange-500' : 'text-slate-400 group-hover/date:text-slate-600'}`}>
                    <Calendar size={20} />
                  </div>
                  <div className="flex flex-col pl-9 w-full text-left">
                    <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase mb-1">去程日期</span>
                    <span className={`text-base md:text-lg font-black truncate leading-none h-6 flex items-center ${!searchForm.date ? 'text-slate-300' : 'text-slate-900'}`}>
                      {searchForm.date || '選擇日期'}
                    </span>
                  </div>
                </div>

                {/* 搜尋按鈕 */}
                <button
                  onClick={() => void handleSearch()}
                  disabled={isSearchDisabled || loading || isOffline}
                  title={isOffline ? '請連線網路以進行機票比價' : ''}
                  className={`w-16 lg:w-[76px] rounded-[20px] md:rounded-[24px] flex items-center justify-center transition-all duration-300 active:scale-95 flex-shrink-0 ${
                    isSearchDisabled || loading || isOffline
                      ? 'bg-slate-100 border border-slate-200 grayscale cursor-not-allowed text-slate-300 shadow-inner' 
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-[0_8px_20px_rgba(15,23,42,0.15)] hover:shadow-[0_12px_25px_rgba(15,23,42,0.25)] hover:-translate-y-0.5 border border-transparent'
                  }`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <SearchIcon size={22} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
            {dateError && <div className="text-[11px] text-rose-500 font-bold px-6 py-2 pb-1">{dateError}</div>}
          </GlassCard>
        </div>

        {/* Quick External Links */}
        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 lg:gap-8 mb-10 px-2 lg:px-4">
          <a href="https://www.agoda.com/partners/partnersearch.aspx?cid=1762106&hl=zh-tw" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-slate-600 hover:text-slate-900 transition-colors group">
            <div className="text-[#B92A8E] group-hover:scale-110 transition-transform">
              <Bed size={26} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[15px] tracking-wide">找住宿</span>
          </a>
          
          <div className="w-px h-5 bg-slate-200 hidden sm:block" />
          
          <a href="https://www.kkday.com/zh-tw?cid=4480" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-slate-600 hover:text-slate-900 transition-colors group">
            <div className="text-[#F18400] group-hover:scale-110 transition-transform">
              <Ticket size={24} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[15px] tracking-wide">門票 & 觀光行程</span>
          </a>

          <div className="w-px h-5 bg-slate-200 hidden sm:block" />
          
          <a href="https://www.kkday.com/zh-tw/product/productlist?page=1&keyword=%E6%A9%9F%E5%A0%B4%E6%8E%A5%E9%80%81&cid=4480" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-slate-600 hover:text-slate-900 transition-colors group">
            <div className="text-[#EC4899] group-hover:scale-110 transition-transform relative">
              <CarFront size={26} strokeWidth={2.5} />
              <PlaneTakeoff size={12} strokeWidth={3} className="absolute -top-1.5 -left-1.5" />
            </div>
            <span className="font-bold text-[15px] tracking-wide">機場接送</span>
          </a>
        </div>

        {/* Right Side / Bottom: Results */}
        <div className="pb-32 flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-between mb-8 px-1">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-3">
                 <h2 className="text-[28px] md:text-[34px] font-black text-slate-900 tracking-tighter leading-none">探索航班與活動</h2>
                 {filteredResults.length > 0 && (
                   <span className="px-2.5 py-1 bg-slate-900 text-white rounded-[8px] text-[10px] font-black tracking-widest uppercase shadow-sm">
                     {filteredResults.length} 個結果
                   </span>
                 )}
              </div>
              <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Explore Travels</p>
            </div>
            {results.length > 0 && (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                <div className="flex items-center bg-white/70 backdrop-blur-md p-1.5 rounded-[12px] shadow-sm border border-slate-200/60 relative">
                  {(['all', 'flight', 'ticket', 'other'] as const).map((type) => (
                    <button 
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`relative px-3 py-1.5 rounded-[8px] text-[11px] font-black tracking-widest uppercase transition-colors duration-300 z-10 ${filterType === type ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      {filterType === type && (
                        <motion.div
                          layoutId="filterTypeIndicator"
                          className="absolute inset-0 bg-white rounded-[8px] -z-10 shadow-sm border border-slate-200"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      {type === 'all' ? '全部' : type === 'flight' ? '機票' : type === 'ticket' ? '票券' : '其他'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center bg-white/70 backdrop-blur-md p-1.5 rounded-[12px] shadow-sm border border-slate-200/60 relative">
                  <button 
                    onClick={() => setViewType('grid')}
                    className={`relative p-2 rounded-[10px] transition-colors duration-300 z-10 ${viewType === 'grid' ? 'text-white' : 'text-slate-400 hover:text-slate-800'}`}
                  >
                    {viewType === 'grid' && (
                      <motion.div
                        layoutId="viewTypeIndicator"
                        className="absolute inset-0 bg-slate-900 rounded-[10px] -z-10 shadow-md"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <LayoutGrid size={18} strokeWidth={2.5} />
                  </button>
                  <button 
                    onClick={() => setViewType('table')}
                    className={`relative p-2 rounded-[10px] transition-colors duration-300 z-10 ${viewType === 'table' ? 'text-white' : 'text-slate-400 hover:text-slate-800'}`}
                  >
                    {viewType === 'table' && (
                      <motion.div
                        layoutId="viewTypeIndicator"
                        className="absolute inset-0 bg-slate-900 rounded-[10px] -z-10 shadow-md"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <List size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {[0, 1, 2, 3, 4, 5].map((i) => <FlightSkeletonCard key={i} />)}
            </div>
          ) : null}

          {!loading && searchError ? (
            <GlassCard className="bg-[#fff1f2] border-[#fecdd3] flex flex-col">
            <span className="text-[#be123c] font-bold text-base">果凍精靈迷路了 🥺，請稍後再試試看！</span>
            <span className="text-[#be123c] mt-2 text-sm">
              {searchError === 'timeout' ? '目前查詢逾時，已先收起錯誤細節。' : '供應商稍忙，請再試一次。'}
            </span>
          </GlassCard>
        ) : null}

          {!loading && !searchError ? (
            <AnimatePresence mode="wait">
              {filteredResults.length > 0 ? (
                viewType === 'grid' ? (
                  <motion.div 
                    key="grid-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5"
                  >
                    {filteredResults.map((flight, index) => (
                      <motion.div
                        key={flight.id}
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.05, type: 'spring', bounce: 0.35 }}
                        className="h-full"
                      >
                        <FlightCard
                          flight={flight}
                          isSaved={savedItems.includes(flight.id)}
                          isTracked={trackedPrices.includes(flight.id)}
                          onPress={() =>
                            openRedirectModal({
                              provider: flight.provider,
                              affiliateUrl: flight.affiliate_url,
                              itemId: flight.id,
                              airline: flight.details?.airline,
                              departure: flight.details?.departure,
                              arrival: flight.details?.arrival,
                              duration: flight.details?.duration,
                              stops: flight.details?.stops,
                              price: flight.price,
                              currency: flight.currency,
                              emoji: flight.emoji,
                            })
                          }
                          onImportToTrip={(e) => {
                            e.stopPropagation();
                            void handleImportFlight(flight);
                          }}
                          onToggleSave={(e) => {
                            e.stopPropagation();
                            if (!isLoggedIn && onRequireLogin) {
                              onRequireLogin();
                              return;
                            }
                            toggleSave(flight.id);
                          }}
                          onToggleTrack={(e) => {
                            e.stopPropagation();
                            if (!isLoggedIn && onRequireLogin) {
                              onRequireLogin();
                              return;
                            }
                            const isCurrentlyTracked = trackedPrices.includes(flight.id);
                            toggleTrack(flight.id);
                            showToast(
                              !isCurrentlyTracked
                                ? `✨ 已開啟 ${flight.provider} 的降價提醒！`
                                : `🔕 已關閉降價提醒`
                            );
                          }}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="table-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <FlightTable 
                      results={filteredResults}
                      savedItems={savedItems}
                      trackedPrices={trackedPrices}
                      onImportToTrip={(e, flight) => {
                        e.stopPropagation();
                        void handleImportFlight(flight);
                      }}
                      onPress={(flight) => 
                        openRedirectModal({
                          provider: flight.provider,
                          affiliateUrl: flight.affiliate_url,
                          itemId: flight.id,
                          airline: flight.details?.airline,
                          departure: flight.details?.departure,
                          arrival: flight.details?.arrival,
                          duration: flight.details?.duration,
                          stops: flight.details?.stops,
                          price: flight.price,
                          currency: flight.currency,
                          emoji: flight.emoji,
                        })
                      }
                      onToggleSave={(e, id) => {
                        e.stopPropagation();
                        if (!isLoggedIn && onRequireLogin) {
                          onRequireLogin();
                          return;
                        }
                        toggleSave(id);
                      }}
                      onToggleTrack={(e, flight) => {
                        e.stopPropagation();
                        if (!isLoggedIn && onRequireLogin) {
                          onRequireLogin();
                          return;
                        }
                        const isCurrentlyTracked = trackedPrices.includes(flight.id);
                        toggleTrack(flight.id);
                        showToast(
                          !isCurrentlyTracked
                            ? `✨ 已開啟 ${flight.provider} 的降價提醒！`
                            : `🔕 已關閉降價提醒`
                        );
                      }}
                    />
                  </motion.div>
                )
              ) : hasSearched ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-xl rounded-3xl border border-white mx-2 shadow-sm"
                >
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-5xl mb-6 grayscale opacity-60">
                    🔍
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">找不到符合條件的航班</h3>
                  <p className="text-slate-500 font-bold max-w-xs text-center leading-relaxed">
                    請嘗試更換日期或是搜尋其他城市，果凍精靈會繼續為您守候。
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center justify-center py-24 sm:py-32 px-6 mx-2 bg-gradient-to-br from-white/60 to-slate-50/50 backdrop-blur-xl rounded-[40px] border border-white/60 shadow-sm relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-fuchsia-100 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                  <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-orange-100 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                  
                  <div className="relative mb-8">
                     <div className="w-24 h-24 bg-white shadow-xl shadow-slate-200/50 rounded-full flex items-center justify-center text-4xl relative z-10 group-hover:-translate-y-2 transition-transform duration-500 border border-slate-50">
                       <PlaneTakeoff className="text-slate-900" size={32} strokeWidth={2.5} />
                     </div>
                     <div className="absolute -inset-4 border-2 border-dashed border-slate-200 rounded-full animate-[spin_15s_linear_infinite] opacity-50"></div>
                  </div>
                  
                   <h3 className="text-2xl sm:text-[32px] font-black text-slate-900 mb-4 tracking-tight text-center leading-tight">
                    輸入出發地、目的地與日期，找出最聰明的飛航選擇。
                  </h3>
                  
                  <div className="text-2xl sm:text-[32px] font-black text-slate-900 mb-4 tracking-tight text-center leading-tight">
                     {['東京 NRT', '大阪 KIX', '倫敦 LHR', '紐約 JFK'].map((city, idx) => (
                       <button 
                         key={city}
                         onClick={() => {
                           updateField('to', city);
                           setShowDestinationPicker(false);
                         }}
                         className="px-4 py-2 bg-white hover:bg-slate-900 hover:text-white text-slate-600 rounded-full text-xs font-black tracking-widest border border-slate-200 hover:border-slate-900 transition-all shadow-sm duration-300"
                       >
                         {city}
                       </button>
                     ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ) : null}

          {/* Featured Destinations Section */}
          <div className="mt-16 mb-8 px-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Globe className="text-emerald-500" size={24} />
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">精選目的地指南</h2>
              </div>
              <span className="text-[10px] font-black tracking-[0.15em] uppercase text-slate-400 hidden sm:block">travel-guide-tw</span>
            </div>

            <div className="w-full overflow-x-auto pb-6 -mx-6 px-6 scrollbar-hide">
              <div className="flex gap-6 min-w-max">
                {FEATURED_DESTINATIONS.map((dest) => (
                  <motion.div
                    key={dest.id}
                    whileHover={{ y: -6 }}
                    className="w-[260px] sm:w-[300px] group/dest"
                  >
                    <GlassCard className="!p-0 overflow-hidden h-full rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all flex flex-col">
                      {/* Cover Image */}
                      <div className="relative h-44 overflow-hidden flex-shrink-0">
                        <img
                          src={dest.image}
                          alt={dest.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/dest:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-2">
                          <span className="text-3xl drop-shadow-lg">{dest.flag}</span>
                          <h3 className="text-white font-black text-xl leading-tight drop-shadow-md">{dest.name}</h3>
                        </div>
                        {/* Tag pills on top-right */}
                        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                          {dest.tags.map((tag) => (
                            <span key={tag} className="text-[9px] font-black text-white bg-white/20 backdrop-blur-md border border-white/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 flex flex-col flex-1">
                        <p className="text-[13px] text-slate-600 font-medium mb-4 leading-relaxed line-clamp-3">
                          {dest.description}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {dest.highlights.map((h) => (
                            <span key={h} className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl">
                              {h}
                            </span>
                          ))}
                        </div>

                        <button
                          className="mt-auto w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-emerald-600 active:scale-95 group/btn"
                          onClick={(e) => { e.stopPropagation(); const g = getCountryGuide(dest.id); if (g) setActiveGuide(g); }}
                        >
                          <ExternalLink size={13} className="transition-transform group-hover/btn:translate-x-0.5" />
                          查看完整攻略
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Expert Handbooks Section */}
          <div className="mt-16 mb-8 px-2">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-fuchsia-500" size={24} />
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">熱門達人手帳</h2>
            </div>
            
            <div className="w-full overflow-x-auto pb-6 -mx-6 px-6 scrollbar-hide">
              <div className="flex gap-6 min-w-max">
                {expertHandbooks.map((handbook) => (
                  <motion.div
                    key={handbook.id}
                    whileHover={{ y: -5 }}
                    className="w-[280px] sm:w-[320px] group/handbook"
                  >
                    <GlassCard onClick={() => setActiveHandbook(handbook)} className="!p-0 overflow-hidden h-full rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all cursor-pointer">
                      <div className="relative h-44 overflow-hidden">
                        <img 
                          src={handbook.image} 
                          alt={handbook.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/handbook:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex items-center gap-2">
                            <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-wider border border-white/30">
                              {handbook.days} Days
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <h3 className="text-xl font-black text-slate-800 mb-1 leading-tight">{handbook.title}</h3>
                        <p className="text-sm font-bold text-slate-400 mb-4">{handbook.author}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-6">
                          {handbook.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        
                        <button
                          onClick={(e) => handleCopyExpertItinerary(e, handbook)}
                          className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-slate-800 active:scale-95 group/btn"
                        >
                          <Copy size={14} className="transition-transform group-hover/btn:rotate-12" />
                          複製行程
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeGuide && (
        <CountryGuideModal open={!!activeGuide} guide={activeGuide} onClose={() => setActiveGuide(null)} />
      )}

      {activeHandbook && (
        <ExpertHandbookModal 
          open={!!activeHandbook} 
          handbook={activeHandbook} 
          onClose={() => setActiveHandbook(null)} 
          onCopyPath={(handbook) => {
            handleCopyExpertItinerary(undefined, handbook);
          }}
        />
      )}

      {showDeparturePicker && (
        <LocationPickerPopup 
          title="出發地"
          query={searchForm.from}
          onClose={() => setShowDeparturePicker(false)}
          onSelect={(dest) => applyGuideDestination(dest, 'from')}
        />
      )}

      {showDestinationPicker && (
        <LocationPickerPopup 
          title="熱門目的地"
          query={searchForm.to}
          onClose={() => setShowDestinationPicker(false)}
          onSelect={(dest) => applyGuideDestination(dest, 'to')}
        />
      )}

      {showDatePicker && (
        <DatePickerPopup 
          selectedDate={searchForm.date}
          onSelect={selectDate}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* Animation Overlay for Flying Card */}
      <AnimatePresence>
        {flyingCard && (
          <motion.div
            key={flyingCard.id}
            initial={{ 
              position: 'fixed',
              top: flyingCard.startY,
              left: flyingCard.startX,
              width: flyingCard.width,
              height: flyingCard.height,
              opacity: 1,
              scale: 1,
              zIndex: 9999,
              borderRadius: '24px',
              backgroundColor: 'white',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              x: '-50%',
              y: '-50%'
            }}
            animate={{ 
              top: [flyingCard.startY, flyingCard.startY - 100, window.innerHeight - 40],
              left: [flyingCard.startX, flyingCard.startX + (window.innerWidth / 2 - flyingCard.startX) * 0.5, window.innerWidth / 2],
              width: [flyingCard.width, 160, 20],
              height: [flyingCard.height, 100, 20],
              scale: [1, 1.05, 0.1],
              opacity: [1, 1, 0],
              rotate: [0, -10, -360]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
              times: [0, 0.4, 1]
            }}
          >
            {flyingCard.handbook ? (
              <div className="w-full h-full flex flex-col pointer-events-none">
                <img 
                  src={flyingCard.handbook.image || flyingCard.handbook.coverImage} 
                  alt="" 
                  className="w-full h-2/3 object-cover" 
                />
                <div className="p-4 flex-1 bg-white">
                  <div className="w-3/4 h-4 bg-slate-200 rounded-full mb-2"></div>
                  <div className="w-1/2 h-3 bg-slate-100 rounded-full"></div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1 bg-fuchsia-400">
                <Sparkles color="white" size={24} />
                <div className="w-12 h-1 bg-white/40 rounded-full" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
