import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellRing, Heart, Search as SearchIcon, ChevronLeft, ChevronRight, Calendar, LayoutGrid, List, PlaneTakeoff, Sparkles, ArrowRight, Copy, Globe, ExternalLink } from 'lucide-react';
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
import JapanGuideModal from './JapanGuideModal';

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
  const airlineInitial = flight.details?.airline ? flight.details.airline.charAt(0) : flight.provider.charAt(0);

  return (
    <div 
      onClick={onPress} 
      className="block w-full h-full text-left appearance-none cursor-pointer border-none bg-transparent p-0 flex flex-col focus:outline-none group/card"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPress();
        }
      }}
    >
      <GlassCard className="!p-0 hover:bg-white transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 ring-slate-100/50 flex-1 flex flex-col overflow-hidden rounded-3xl border border-white group-hover/card:scale-[1.02]">
        {/* Card Header with Provider Info */}
        <div className="p-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl font-black text-fuchsia-500 border border-slate-100">
              {airlineInitial}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                {flight.provider}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-700">{flight.details?.airline || flight.provider}</span>
                <div className="w-1 h-1 rounded-full bg-slate-200" />
                <span className="text-[10px] font-bold text-fuchsia-500 bg-fuchsia-50 px-1.5 py-0.5 rounded-md">Verified</span>
              </div>
            </div>
          </div>
          <button
            onClick={onToggleSave}
            className={`w-10 h-10 rounded-full flex justify-center items-center transition-all active:scale-90 ${
              isSaved ? 'bg-pink-50 text-pink-500' : 'bg-slate-50 text-slate-300 hover:text-pink-400'
            }`}
          >
            <Heart
              size={18}
              fill={isSaved ? 'currentColor' : 'transparent'}
              strokeWidth={2.5}
            />
          </button>
        </div>

        {/* Flight Details Section */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center">
            <div className="flex items-center justify-between w-full relative px-2">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 border-t-2 border-dashed border-slate-200" />
                <div className="flex flex-col items-center z-10 bg-white px-2">
                    <span className="text-2xl font-black text-slate-800 tracking-tight">{flight.details?.departure}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Depart</span>
                </div>
                <div className="flex flex-col items-center z-10 px-2 opacity-50">
                    <div className="text-fuchsia-400 rotate-90">
                        <SearchIcon size={14} strokeWidth={3} />
                    </div>
                </div>
                <div className="flex flex-col items-center z-10 bg-white px-2">
                    <span className="text-2xl font-black text-slate-800 tracking-tight">{flight.details?.arrival}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Arrive</span>
                </div>
            </div>
            
            <div className="mt-4 flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-1">
                    <span className="text-[11px] font-black uppercase tracking-tighter">
                        {flight.details?.stops === 0 ? '直飛 Direct' : `${flight.details?.stops} 轉 Stop`}
                    </span>
                </div>
                <div className="w-1 h-1 rounded-full bg-slate-200" />
                <span className="text-[11px] font-black uppercase tracking-tighter">{flight.details?.duration || '3h 15m'}</span>
            </div>
        </div>

        {/* Price and Action Section */}
        <div className="mt-auto px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Estimated Price</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-slate-400">{flight.currency}</span>
                    <span className="text-2xl font-black text-slate-800">{flight.price.toLocaleString()}</span>
                </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onImportToTrip}
                className="px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all active:scale-95 border bg-white border-slate-200 text-slate-600 hover:border-pink-300 hover:text-pink-600 shadow-sm"
              >
                <PlaneTakeoff size={14} strokeWidth={3} />
                <span className="text-xs font-black uppercase tracking-wide">帶入行程</span>
              </button>
              <button
                  onClick={onToggleTrack}
                  className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 transition-all active:scale-95 border ${
                      isTracked 
                          ? 'bg-slate-900 border-slate-900 text-white' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-fuchsia-300 hover:text-fuchsia-600 shadow-sm'
                  }`}
              >
                  {isTracked ? <BellRing size={14} strokeWidth={3} /> : <Bell size={14} strokeWidth={3} />}
                  <span className="text-xs font-black uppercase tracking-wide">
                      {isTracked ? 'Tracking' : 'Track Price'}
                  </span>
              </button>
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
    <div className="table-wrapper pb-4">
      <table className="scroll-table">
        <caption className="sr-only">搜尋結果比較表</caption>
        <thead>
          <tr>
            <th scope="col">航空公司</th>
            <th scope="col">航班時間</th>
            <th scope="col">轉機</th>
            <th scope="col" className="amount">價格 (TWD)</th>
            <th scope="col" className="text-right">動作</th>
          </tr>
        </thead>
        <tbody>
          {results.map((flight) => (
            <tr key={flight.id} className="cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => onPress(flight)}>
              <td data-label="航空公司">
                <div className="flex items-center gap-3 justify-start">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-sm font-black text-primary border border-slate-100 flex-shrink-0">
                    {flight.details?.airline?.charAt(0) || flight.provider.charAt(0)}
                  </div>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-slate-800 text-sm font-bold truncate max-w-[120px]">{flight.details?.airline || flight.provider}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{flight.provider}</span>
                  </div>
                </div>
              </td>
              <td data-label="航班時間">
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800 font-black">{flight.details?.departure}</span>
                    <span className="text-slate-300 text-xs">→</span>
                    <span className="text-slate-800 font-black">{flight.details?.arrival}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{flight.details?.duration || '3h 15m'}</span>
                </div>
              </td>
              <td data-label="轉機">
                <div className="flex flex-col items-start">
                  <span className={`text-xs font-black ${flight.details?.stops === 0 ? 'text-emerald-500' : 'text-fuchsia-500'}`}>
                    {flight.details?.stops === 0 ? '直飛' : `${flight.details?.stops} 轉`}
                  </span>
                </div>
              </td>
              <td data-label="價格 (TWD)" className="amount">
                <div className="flex flex-col items-end text-lg font-black text-slate-800 tracking-tight justify-end">
                  <span className="text-fuchsia-600">{flight.price.toLocaleString()}</span>
                </div>
              </td>
              <td data-label="操作">
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={(e) => onImportToTrip(e, flight)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 border bg-white border-slate-200 text-slate-400 hover:text-pink-500"
                  >
                    <PlaneTakeoff size={16} strokeWidth={3} />
                  </button>
                  <button
                    onClick={(e) => onToggleTrack(e, flight)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
                      trackedPrices.includes(flight.id) 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : 'bg-white border-slate-200 text-slate-400 hover:text-fuchsia-500'
                    }`}
                  >
                    {trackedPrices.includes(flight.id) ? <BellRing size={16} strokeWidth={3} /> : <Bell size={16} strokeWidth={3} />}
                  </button>
                  <button
                    onClick={(e) => onToggleSave(e, flight.id)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
                      savedItems.includes(flight.id) 
                        ? 'bg-pink-50 border-pink-100 text-pink-500' 
                        : 'bg-white border-slate-200 text-slate-300 hover:text-pink-400'
                    }`}
                  >
                    <Heart size={16} fill={savedItems.includes(flight.id) ? 'currentColor' : 'transparent'} strokeWidth={3} />
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
  const [showJapanGuide, setShowJapanGuide] = useState(false);

  const expertHandbooks = [
    {
      id: 101,
      title: '京都賞楓 3 日遊',
      author: '@TravelBlogger',
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
      days: 3,
      tags: ['賞楓', '古都', '美食']
    },
    {
      id: 102,
      title: '曼谷美食 5 日深度行',
      author: '@FoodieTraveler',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop',
      days: 5,
      tags: ['巷弄美食', '按摩', '夜市']
    },
    {
      id: 103,
      title: '倫敦藝文漫步',
      author: '@ArtHunter',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=800&auto=format&fit=crop',
      days: 4,
      tags: ['博物館', '文創', '地標']
    }
  ];

  const handleCopyExpertItinerary = (e: React.MouseEvent, handbook: any) => {
    e.stopPropagation();
    
    // Get card position for animation start
    const cardElement = (e.currentTarget as HTMLElement).closest('.group\\/handbook');
    const rect = cardElement ? cardElement.getBoundingClientRect() : (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyingCard({
      id: Date.now(),
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      width: rect.width || 320,
      height: rect.height || 380,
      handbook
    });

    // Reset animation after it finishes
    setTimeout(() => {
      setFlyingCard(null);
      // Mock copy behavior, pop up after animation finishes
      showToast('已成功將行程複製到您的手帳！', 'success');
    }, 1200); // 1.2s to match animation duration
  };

  const [communityTrips, setCommunityTrips] = useState<any[]>([]);
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');

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
          results.length === 0 ? searchOffers({}) : Promise.resolve(results)
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
    <div className="p-4 sm:p-6 md:p-8 max-w-full lg:max-w-[90rem] xl:max-w-[150rem] mx-auto flex flex-col flex-1 h-full w-full overflow-y-auto">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left mb-6 w-full max-w-2xl lg:max-w-none mx-auto lg:mx-0">
        <p className="text-[17px] text-slate-500 font-semibold tracking-wide">探索機票與體驗。</p>
      </div>

      {/* AI Form Banner */}
      <div className="mb-10 w-full">
        <div className="bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-3xl p-6 sm:p-8 flex items-center justify-between shadow-[0_15px_40px_rgba(217,70,239,0.3)] text-white relative overflow-hidden group hover:scale-[1.01] transition-transform cursor-pointer"
             onClick={() => setActiveTab('ai_form')}
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
          
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black mb-2 flex items-center gap-2 drop-shadow-md">
              <Sparkles size={32} />
              AI 行程規劃
            </h3>
            <p className="text-white/90 text-sm sm:text-base font-bold">告訴我們你想去哪，秒速客製專屬行程！</p>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/50 group-hover:bg-white/40 transition-colors shadow-sm">
            <ArrowRight size={24} />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Left Side: Search Form */}
        <div className="w-full lg:w-[400px] xl:w-[460px] flex-shrink-0">
          <GlassCard className="!p-0 overflow-visible ring-1 ring-white/60 shadow-[0_8px_40px_rgb(0,0,0,0.06)] bg-white/60 backdrop-blur-3xl rounded-3xl">
            <div className="flex flex-col">
              {/* Main Search Inputs Area */}
              <div className="p-6 flex flex-col gap-y-5 bg-white/30 rounded-3xl relative overflow-visible">
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-4">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <Label htmlFor="search-from">出發地</Label>
                      <Input
                        id="search-from"
                        value={searchForm.from}
                        onFocus={() => {
                          setShowDeparturePicker(true);
                          setShowDestinationPicker(false);
                          setShowDatePicker(false);
                        }}
                        onChange={(e) => updateField('from', e.target.value)}
                        placeholder="從哪裡出發？"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1">
                      <Label htmlFor="search-to">目的地</Label>
                      <Input
                        id="search-to"
                        value={searchForm.to}
                        onFocus={() => {
                          setShowDestinationPicker(true);
                          setShowDeparturePicker(false);
                          setShowDatePicker(false);
                        }}
                        onChange={(e) => updateField('to', e.target.value)}
                        placeholder="要去哪裡冒險？"
                      />
                    </div>
                  </div>

                <div className="relative">
                  <div 
                    onClick={() => {
                      setShowDatePicker(!showDatePicker);
                      setShowDeparturePicker(false);
                      setShowDestinationPicker(false);
                    }}
                    className={`flex flex-row items-center gap-x-3 bg-white/90 backdrop-blur-md rounded-[20px] px-6 py-4 border border-white shadow-sm cursor-pointer hover:bg-white transition-all ${showDatePicker ? 'ring-2 ring-orange-400/50' : ''}`}
                  >
                    <Calendar size={18} className="text-slate-400" />
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">出發日期</span>
                      <span className={`text-lg font-bold ${!searchForm.date ? 'text-slate-300' : 'text-slate-800'}`}>
                        {searchForm.date || '選擇出發日期'}
                      </span>
                    </div>
                  </div>
                </div>
                {dateError && <span className="text-[10px] text-rose-500 font-bold ml-5 mt-1">{dateError}</span>}
                {!searchForm.from || !searchForm.to || !searchForm.date ? (
                  <span className="text-[10px] text-slate-400 font-bold ml-5 mt-2 animate-pulse">
                    * 請填寫出發地、目的地與日期以開啟比價
                  </span>
                ) : null}

                  <button
                    onClick={() => void handleSearch()}
                    disabled={isSearchDisabled || loading || isOffline}
                    title={isOffline ? '請連線網路以進行機票比價' : ''}
                    className={`mt-6 rounded-full py-5 flex flex-row items-center justify-center border-none appearance-none cursor-pointer transition-all active:scale-[0.95] ${
                      isSearchDisabled || loading || isOffline
                        ? 'bg-slate-200/50 grayscale cursor-not-allowed opacity-60' 
                        : 'bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 hover:shadow-[0_25px_50px_rgba(249,115,22,0.5)] shadow-[0_12px_30px_rgba(245,158,11,0.3)] hover:scale-[1.025] hover:brightness-110 ring-2 ring-white/40'
                }`}
              >
                <SearchIcon size={28} color="white" strokeWidth={3.5} />
                <span className="text-white font-black ml-4 text-[22px] tracking-wider drop-shadow-xl">{isOffline ? '需連網進行比價' : '立即探索比價'}</span>
              </button>
              </div>
            </div>
          </GlassCard>
        </div>


        {/* Right Side: Results */}
        <div className="pb-32 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-6 px-2">
            <span className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">熱門推薦</span>
            <div className="flex items-center bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
              <button 
                onClick={() => setViewType('grid')}
                className={`p-2 rounded-xl transition-all ${viewType === 'grid' ? 'bg-white text-fuchsia-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={18} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => setViewType('table')}
                className={`p-2 rounded-xl transition-all ${viewType === 'table' ? 'bg-white text-fuchsia-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List size={18} strokeWidth={2.5} />
              </button>
            </div>
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
              {results.length > 0 ? (
                viewType === 'grid' ? (
                  <motion.div 
                    key="grid-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5"
                  >
                    {results.map((flight, index) => (
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
                      results={results}
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
              ) : (
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

                        {dest.id === 'jp' ? (
                          <button
                            className="mt-auto w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-rose-600 active:scale-95 group/btn"
                            onClick={(e) => { e.stopPropagation(); setShowJapanGuide(true); }}
                          >
                            <ExternalLink size={13} className="transition-transform group-hover/btn:translate-x-0.5" />
                            查看完整攻略
                          </button>
                        ) : (
                          <a
                            href={dest.guideUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-auto w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-emerald-600 active:scale-95 group/btn"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={13} className="transition-transform group-hover/btn:translate-x-0.5" />
                            查看完整攻略
                          </a>
                        )}
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
                    <GlassCard className="!p-0 overflow-hidden h-full rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all">
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

      <JapanGuideModal open={showJapanGuide} onClose={() => setShowJapanGuide(false)} />

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
