import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellRing, Heart, Search as SearchIcon } from 'lucide-react';
import GlassCard from './GlassCard';
import { FlightSkeletonCard } from './SkeletonCard';
import { searchOffers, SearchServiceUnavailableError, SearchTimeoutError } from '../lib/workflowApi';
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
  return (
    <button onClick={onPress} className="block w-full h-full text-left appearance-none cursor-pointer border-none bg-transparent p-0 flex flex-col focus:outline-none focus:ring-2 focus:ring-fuchsia-400 rounded-[32px] transition-transform active:scale-[0.98]">
      <GlassCard className="!p-5 hover:bg-white/70 transition-colors shadow-sm ring-1 ring-slate-100/50 flex-1 flex flex-col justify-between h-full">
      <div className="flex flex-row justify-between items-start mb-6">
        <div className="flex flex-col flex-1 pr-2 gap-y-2">
          <span className="font-extrabold text-[22px] text-slate-800 flex items-center gap-x-2 tracking-tight">
            <span className="text-3xl">{flight.emoji}</span>
            {flight.provider}
          </span>
          <div className="bg-white/90 px-3.5 py-1.5 rounded-full border border-slate-100 shadow-sm w-fit mt-1">
            <span className="text-[13px] font-bold text-slate-500">{flight.title}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[26px] font-black text-transparent bg-clip-text bg-gradient-to-br from-[#d946ef] to-[#9333ea] tracking-tighter">
            {flight.currency} {flight.price.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="mt-auto flex flex-row gap-x-3">
        <button
          onClick={onToggleTrack}
          className={`flex-1 py-3 px-4 flex flex-row justify-center items-center rounded-2xl border cursor-pointer appearance-none transition-all active:scale-95 ${
            isTracked ? 'bg-gradient-to-r from-fuchsia-400 to-purple-500 border-transparent shadow-lg shadow-purple-500/30' : 'bg-white border-slate-200 hover:border-fuchsia-300 shadow-sm'
          }`}
        >
          {isTracked ? <BellRing size={18} color="white" strokeWidth={2.5} /> : <Bell size={18} color="#d946ef" strokeWidth={2.5} />}
          <span className={`ml-2 text-sm font-bold ${isTracked ? 'text-white' : 'text-slate-600 group-hover:text-fuchsia-600'}`}>
            {isTracked ? '已開啟提醒' : '追蹤降價'}
          </span>
        </button>
        <button
          onClick={onToggleSave}
          className={`p-3 rounded-2xl flex justify-center items-center border cursor-pointer appearance-none transition-all active:scale-95 shadow-sm ${
            isSaved ? 'bg-pink-100 border-pink-300 hover:bg-pink-200' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-pink-300'
          }`}
        >
          <Heart
            size={22}
            color={isSaved ? '#ec4899' : '#f472b6'}
            fill={isSaved ? '#ec4899' : 'transparent'}
            strokeWidth={isSaved ? 0 : 2}
          />
        </button>
      </div>
    </GlassCard>
    </button>
  );
}

export default function HomeTab({ onRequireLogin, isLoggedIn }: { onRequireLogin?: () => void; isLoggedIn?: boolean }) {
  const { searchForm, updateField, results, setResults, loading, setLoading, searchError, setSearchError, savedItems, toggleSave, trackedPrices, toggleTrack } =
    useSearchStore();
  const { openRedirectModal } = useAppStore();

  const [dateError, setDateError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('亞洲');
  const [showDestinationPicker, setShowDestinationPicker] = useState<boolean>(false);

  const filteredDestinations = useMemo(() => {
    return matchTravelDestinations(searchForm.to, selectedRegion)
      .sort((a, b) => a.place.localeCompare(b.place, 'zh-Hant'));
  }, [searchForm.to, selectedRegion]);

  const applyGuideDestination = (destination: TravelGuideDestination) => {
    updateField('to', (destination.searchAlias ?? destination.place).toUpperCase());
    setShowDestinationPicker(false);
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

  return (
    <div className="p-6 md:p-10 pt-16 md:pt-24 max-w-full lg:max-w-[72rem] xl:max-w-[80rem] mx-auto flex flex-col flex-1 h-full w-full overflow-y-auto">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left mb-10 w-full max-w-2xl lg:max-w-none mx-auto lg:mx-0">
        <h1 className="text-[44px] md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-500 tracking-tight mb-3">RoamJelly</h1>
        <p className="text-[17px] text-slate-500 font-semibold tracking-wide">探索機票與體驗，確認後再溫柔導流至供應商下單。</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* Left Side: Search Form */}
        <div className="w-full lg:w-[400px] xl:w-[460px] flex-shrink-0">
          <GlassCard className="!p-0 overflow-visible ring-1 ring-white/60 shadow-[0_8px_40px_rgb(0,0,0,0.06)] bg-white/60 backdrop-blur-3xl rounded-[32px]">
        <div className="flex flex-col">
          {/* Main Search Inputs Area */}
          <div className="p-5 flex flex-col gap-y-4 bg-white/20 rounded-[32px]">
            <div className="flex flex-row items-center gap-x-3 bg-white/80 backdrop-blur-md rounded-[24px] px-5 py-4 border border-white shadow-sm focus-within:ring-2 focus-within:ring-fuchsia-400/50 transition-all">
              <span className="text-[11px] font-black tracking-widest text-slate-400 w-12 uppercase">From</span>
              <input
                value={searchForm.from}
                onChange={(e) => updateField('from', e.target.value.toUpperCase())}
                placeholder="出發地 (例: TPE)"
                className="flex-1 bg-transparent text-lg font-bold text-slate-800 outline-none placeholder:text-slate-300"
              />
            </div>

            <div className="relative">
              <div className="flex flex-row items-center gap-x-3 bg-white/80 backdrop-blur-md rounded-[24px] px-5 py-4 border border-white shadow-sm focus-within:ring-2 focus-within:ring-fuchsia-400/50 transition-all">
                <span className="text-[11px] font-black tracking-widest text-slate-400 w-12 uppercase">To</span>
                <input
                  value={searchForm.to}
                  onFocus={() => setShowDestinationPicker(true)}
                  onChange={(e) => {
                    updateField('to', e.target.value.toUpperCase());
                  }}
                  placeholder="目的地 (例: 東京 / NRT)"
                  className="flex-1 bg-transparent text-lg font-bold text-slate-800 outline-none placeholder:text-slate-300"
                />
              </div>

              {/* Interactive Destination Picker Popup */}
              <AnimatePresence>
                {showDestinationPicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowDestinationPicker(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      className="absolute top-full left-0 right-0 mt-3 bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-[0_16px_40px_rgb(0,0,0,0.12)] border border-white/60 z-20 overflow-hidden"
                    >
                      <div className="p-5 pb-3">
                        <div className="flex flex-row justify-between items-center mb-4 pl-1">
                          <span className="font-extrabold tracking-tight text-slate-800 text-lg">熱門目的地</span>
                          <button 
                            onClick={() => setShowDestinationPicker(false)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                          >
                            <span className="text-[11px] font-black tracking-widest uppercase text-slate-500">關閉</span>
                          </button>
                        </div>

                        {/* Region Tabs */}
                        <div className="flex flex-row gap-x-2 mb-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                          <button
                            onClick={() => {
                              setSelectedRegion('全部地區');
                            }}
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
                              onClick={() => {
                                setSelectedRegion(region);
                              }}
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
                                onClick={() => applyGuideDestination(dest)}
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
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-row items-center gap-x-3 bg-white/80 backdrop-blur-md rounded-[24px] px-5 py-4 border border-white shadow-sm focus-within:ring-2 focus-within:ring-fuchsia-400/50 transition-all">
              <span className="text-[11px] font-black tracking-widest text-slate-400 w-12 uppercase">Date</span>
              <input
                type="date"
                value={searchForm.date}
                onChange={(e) => {
                  updateField('date', e.target.value);
                  if (dateError) setDateError(null);
                }}
                className={`flex-1 bg-transparent text-lg font-bold text-slate-800 outline-none placeholder:text-slate-300 ${dateError ? 'text-red-500' : ''}`}
              />
            </div>
            {dateError && <span className="text-[10px] text-rose-500 font-bold ml-5 mt-1">{dateError}</span>}

            <button
              onClick={() => void handleSearch()}
              disabled={isSearchDisabled || loading}
              className={`mt-4 rounded-[28px] py-4.5 flex flex-row items-center justify-center border-none appearance-none cursor-pointer transition-all active:scale-95 ${
                isSearchDisabled || loading 
                  ? 'bg-slate-200/50 grayscale cursor-not-allowed opacity-60' 
                  : 'bg-gradient-to-r from-fuchsia-500 to-[#9333ea] hover:opacity-90 shadow-[0_8px_20px_rgb(217,70,239,0.3)]'
              }`}
            >
              <SearchIcon size={18} color="white" strokeWidth={3} />
              <span className="text-white font-black ml-3 text-lg tracking-wide">立即探索比價</span>
            </button>
          </div>
        </div>
        </GlassCard>
        </div>

        {/* Right Side: Results */}
        <div className="pb-32 flex flex-col flex-1">
          <span className="text-2xl lg:text-3xl font-black mb-6 text-slate-800 tracking-tight pl-2">熱門推薦</span>

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
            <AnimatePresence>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
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
                      toggleTrack(flight.id);
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        ) : null}
      </div>
      </div>
    </div>
  );
}
