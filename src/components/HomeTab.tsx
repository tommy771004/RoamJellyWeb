import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellRing, Heart, Search as SearchIcon, ChevronLeft, ChevronRight, Calendar, LayoutGrid, List } from 'lucide-react';
import GlassCard from './GlassCard';
import { FlightSkeletonCard } from './SkeletonCard';
import { searchOffers, SearchServiceUnavailableError, SearchTimeoutError, fetchHandbooks } from '../lib/workflowApi';
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

interface FlightCardProps {
  flight: SearchItem;
  isSaved: boolean;
  isTracked: boolean;
  onPress: () => void;
  onToggleSave: (e: React.MouseEvent) => void;
  onToggleTrack: (e: React.MouseEvent) => void;
}

function FlightCard({ flight, isSaved, isTracked, onPress, onToggleSave, onToggleTrack }: FlightCardProps) {
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
      <GlassCard className="!p-0 hover:bg-white transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 ring-slate-100/50 flex-1 flex flex-col overflow-hidden rounded-[40px] border border-white group-hover/card:scale-[1.02]">
        {/* Card Header with Provider Info */}
        <div className="p-5 pb-0 flex items-center justify-between">
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
        <div className="p-5 pt-8 flex flex-col items-center">
            <div className="flex items-center justify-between w-full relative px-2">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 h-[1px] bg-slate-100 dashed" />
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
        <div className="mt-auto p-5 pt-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Estimated Price</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-slate-400">{flight.currency}</span>
                    <span className="text-2xl font-black text-slate-800">{flight.price.toLocaleString()}</span>
                </div>
            </div>
            
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
      </GlassCard>
    </div>
  );
}

function FlightTable({ 
  results, 
  savedItems, 
  trackedPrices, 
  onPress, 
  onToggleSave, 
  onToggleTrack 
}: { 
  results: SearchItem[]; 
  savedItems: string[]; 
  trackedPrices: string[]; 
  onPress: (f: SearchItem) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  onToggleTrack: (e: React.MouseEvent, f: SearchItem) => void;
}) {
  return (
    <div className="w-full overflow-x-auto md:overflow-visible pb-4">
      <table className="responsive-table">
        <caption className="sr-only">搜尋結果比較表</caption>
        <thead>
          <tr>
            <th scope="col">航空公司</th>
            <th scope="col">航班時間</th>
            <th scope="col">轉機</th>
            <th scope="col" className="text-right">價格 (TWD)</th>
            <th scope="col" className="text-right">動作</th>
          </tr>
        </thead>
        <tbody>
          {results.map((flight) => (
            <tr key={flight.id} className="cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => onPress(flight)}>
              <td data-label="航空公司">
                <div className="flex items-center gap-3 md:justify-start justify-end">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-sm font-black text-primary border border-slate-100 flex-shrink-0">
                    {flight.details?.airline?.charAt(0) || flight.provider.charAt(0)}
                  </div>
                  <div className="flex flex-col items-end md:items-start overflow-hidden">
                    <span className="text-slate-800 text-sm font-bold truncate max-w-[120px]">{flight.details?.airline || flight.provider}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{flight.provider}</span>
                  </div>
                </div>
              </td>
              <td data-label="航班時間">
                <div className="flex flex-col items-end md:items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800 font-black">{flight.details?.departure}</span>
                    <span className="text-slate-300 text-xs">→</span>
                    <span className="text-slate-800 font-black">{flight.details?.arrival}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{flight.details?.duration || '3h 15m'}</span>
                </div>
              </td>
              <td data-label="轉機">
                <div className="flex flex-col items-end md:items-start">
                  <span className={`text-xs font-black ${flight.details?.stops === 0 ? 'text-emerald-500' : 'text-fuchsia-500'}`}>
                    {flight.details?.stops === 0 ? '直飛' : `${flight.details?.stops} 轉`}
                  </span>
                </div>
              </td>
              <td data-label="價格 (TWD)" className="md:text-right font-variant-numeric:tabular-nums !text-right">
                <div className="flex flex-col items-end text-lg font-black text-slate-800 tracking-tight">
                  <span className="text-fuchsia-600">{flight.price.toLocaleString()}</span>
                </div>
              </td>
              <td data-label="操作">
                <div className="flex items-center gap-2 justify-end">
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

export default function HomeTab({ onRequireLogin, isLoggedIn }: { onRequireLogin?: () => void; isLoggedIn?: boolean }) {
  const { searchForm, updateField, results, setResults, loading, setLoading, searchError, setSearchError, savedItems, toggleSave, trackedPrices, toggleTrack } =
    useSearchStore();
  const { openRedirectModal, isOffline, showToast, setActiveTab } = useAppStore();

  const [dateError, setDateError] = useState<string | null>(null);
  const [showDeparturePicker, setShowDeparturePicker] = useState<boolean>(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [communityTrips, setCommunityTrips] = useState<any[]>([]);
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');

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
    try {
      const { getStoredToken } = await import('../lib/workflowApi');
      const token = getStoredToken();
      const res = await fetch(`/api/trips/${trip.id}/clone`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      showToast(`已成功將行程 ${trip.title} 複製到您的手帳！`, 'success');
      
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

  const LocationPickerPopup = ({ 
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
      return matchTravelDestinations(query, selectedRegion)
        .sort((a, b) => a.place.localeCompare(b.place, 'zh-Hant'));
    }, [query, selectedRegion]);

    return (
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
            className="relative w-full md:max-w-xl bg-white rounded-[40px] shadow-[0_32px_80px_rgba(0,0,0,0.35)] border border-white z-[210] overflow-hidden"
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
  };

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

    return (
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
            className="relative w-full md:max-w-xl bg-white rounded-[40px] shadow-[0_32px_80px_rgba(0,0,0,0.35)] border border-white z-[210] overflow-hidden p-8"
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
  };

  return (
    <div className="p-6 md:p-10 max-w-full lg:max-w-[72rem] xl:max-w-[80rem] mx-auto flex flex-col flex-1 h-full w-full overflow-y-auto w-full">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left mb-6 w-full max-w-2xl lg:max-w-none mx-auto lg:mx-0">
        <h1 className="text-[44px] md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-500 tracking-tight mb-3">RoamJelly</h1>
        <p className="text-[17px] text-slate-500 font-semibold tracking-wide">探索機票與體驗，確認後再溫柔導流至供應商下單。</p>
      </div>

      {/* AI Form Banner */}
      <div className="mb-10 w-full">
        <div className="bg-gradient-to-r from-pink-400 to-fuchsia-500 rounded-[32px] p-6 sm:p-8 flex items-center justify-between shadow-[0_15px_40px_rgba(217,70,239,0.3)] text-white relative overflow-hidden group hover:scale-[1.01] transition-transform cursor-pointer"
             onClick={() => setActiveTab('ai_form')}
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
          
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black mb-2 flex items-center gap-2 drop-shadow-md">
              <span className="material-symbols-outlined text-[32px]">auto_awesome</span>
              AI 行程規劃
            </h3>
            <p className="text-white/90 text-sm sm:text-base font-bold">告訴我們你想去哪，秒速客製專屬行程！</p>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/50 group-hover:bg-white/40 transition-colors shadow-sm">
            <span className="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Left Side: Search Form */}
        <div className="w-full lg:w-[400px] xl:w-[460px] flex-shrink-0">
          <GlassCard className="!p-0 overflow-visible ring-1 ring-white/60 shadow-[0_8px_40px_rgb(0,0,0,0.06)] bg-white/60 backdrop-blur-3xl rounded-[32px]">
            <div className="flex flex-col">
              {/* Main Search Inputs Area */}
              <div className="p-5 flex flex-col gap-y-4 bg-white/20 rounded-[32px] relative overflow-visible">
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3">
                    <div className="flex flex-col gap-y-1 bg-white/90 backdrop-blur-md rounded-[24px] px-5 py-3 border border-white shadow-sm focus-within:ring-2 focus-within:ring-orange-400/50 transition-all flex-1 group hover:bg-white focus-within:bg-white">
                      <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase group-hover:text-orange-400 transition-colors">出發地</span>
                      <input
                        value={searchForm.from}
                        onFocus={() => {
                          setShowDeparturePicker(true);
                          setShowDestinationPicker(false);
                          setShowDatePicker(false);
                        }}
                        onChange={(e) => updateField('from', e.target.value)}
                        placeholder="從哪裡出發？"
                        className="bg-transparent text-[17px] font-bold text-slate-800 outline-none placeholder:text-slate-300 w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-y-1 bg-white/90 backdrop-blur-md rounded-[24px] px-5 py-3 border border-white shadow-sm focus-within:ring-2 focus-within:ring-orange-400/50 transition-all flex-1 group hover:bg-white focus-within:bg-white">
                      <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase group-hover:text-orange-400 transition-colors">目的地</span>
                      <input
                        value={searchForm.to}
                        onFocus={() => {
                          setShowDestinationPicker(true);
                          setShowDeparturePicker(false);
                          setShowDatePicker(false);
                        }}
                        onChange={(e) => {
                          updateField('to', e.target.value);
                        }}
                        placeholder="要去哪裡冒險？"
                        className="bg-transparent text-[17px] font-bold text-slate-800 outline-none placeholder:text-slate-300 w-full"
                      />
                    </div>
                  </div>

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

                <div className="relative">
                  <div 
                    onClick={() => {
                      setShowDatePicker(!showDatePicker);
                      setShowDeparturePicker(false);
                      setShowDestinationPicker(false);
                    }}
                    className={`flex flex-row items-center gap-x-3 bg-white/90 backdrop-blur-md rounded-[24px] px-5 py-4 border border-white shadow-sm cursor-pointer hover:bg-white transition-all ${showDatePicker ? 'ring-2 ring-orange-400/50' : ''}`}
                  >
                    <Calendar size={18} className="text-slate-400" />
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">出發日期</span>
                      <span className={`text-lg font-bold ${!searchForm.date ? 'text-slate-300' : 'text-slate-800'}`}>
                        {searchForm.date || '選擇出發日期'}
                      </span>
                    </div>
                  </div>

                  {showDatePicker && (
                    <DatePickerPopup 
                      selectedDate={searchForm.date}
                      onSelect={selectDate}
                      onClose={() => setShowDatePicker(false)}
                    />
                  )}
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
                    className={`mt-6 rounded-[32px] py-5.5 flex flex-row items-center justify-center border-none appearance-none cursor-pointer transition-all active:scale-[0.95] ${
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
                  className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-xl rounded-[40px] border border-white mx-2 shadow-sm"
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

          {/* Social Community Trips */}
          <div className="mt-12 flex flex-col">
            <span className="text-2xl font-black mb-4 text-slate-800 tracking-tight pl-2 flex items-center gap-2">熱門達人手帳 🌍</span>
            <div className="flex overflow-x-auto gap-4 pb-6 scrollbar-hide px-2">
              {communityTrips.map((trip) => (
                <div key={trip.id} className="min-w-[280px] sm:min-w-[320px] rounded-[32px] overflow-hidden relative shadow-lg group">
                  {/* Aspect ratio background */}
                  <div 
                    className="w-full h-[180px] bg-cover bg-center" 
                    style={{ 
                      background: trip.cover?.startsWith('linear-gradient') ? trip.cover : (trip.cover ? `url(${trip.cover})` : '#f1f5f9'),
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }} 
                  />
                  {/* Dark overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 pointer-events-none" />
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 flex flex-col justify-end">
                    <span className="text-white text-[13px] font-bold opacity-80 mb-1">{trip.author}</span>
                    <span className="text-white text-[20px] font-black tracking-wide leading-tight mb-4 drop-shadow-md">{trip.title}</span>
                    
                    <button 
                      onClick={(e) => handleCloneTrip(e, trip)}
                      className="w-full py-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/50"
                    >
                      <span className="material-symbols-outlined text-[18px]">file_copy</span>
                      複製行程
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

      </div>
      </div>
    </div>
  );
}
