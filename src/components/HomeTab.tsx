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
    <button onClick={onPress} className="block w-full text-left appearance-none cursor-pointer border-none bg-transparent p-0 mb-4 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 rounded-3xl">
      <GlassCard className="!p-5 hover:bg-white/40 transition-colors">
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-col flex-1 pr-2">
          <span className="font-black text-xl text-slate-800 flex items-center gap-1">
            {flight.emoji} {flight.provider}
          </span>
          <div className="mt-1.5 bg-white/60 p-2 rounded-full border border-white/40 w-fit">
            <span className="text-xs font-bold text-slate-500">{flight.title}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-2xl font-black text-[#9333ea]">
            {flight.currency} {flight.price.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="mt-5 flex flex-row gap-x-3">
        <button
          onClick={onToggleTrack}
          className={`flex-1 py-2.5 px-4 flex flex-row justify-center items-center rounded-2xl border cursor-pointer appearance-none transition-colors ${
            isTracked ? 'bg-[#c084fc] border-[#c084fc] hover:bg-[#a855f7]' : 'bg-white/60 border-[#e9d5ff] hover:bg-white'
          }`}
        >
          {isTracked ? <BellRing size={16} color="white" /> : <Bell size={16} color="#9333ea" />}
          <span className={`ml-2 text-sm font-bold ${isTracked ? 'text-white' : 'text-[#9333ea]'}`}>
            {isTracked ? '已開啟降價提醒' : '追蹤降價'}
          </span>
        </button>
        <button
          onClick={onToggleSave}
          className={`p-3 rounded-2xl flex justify-center items-center border cursor-pointer appearance-none transition-colors ${
            isSaved ? 'bg-pink-100 border-pink-300 hover:bg-pink-200' : 'bg-white/60 border-pink-200 hover:bg-white'
          }`}
        >
          <Heart
            size={20}
            color={isSaved ? '#ec4899' : '#f472b6'}
            fill={isSaved ? '#ec4899' : 'transparent'}
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
  const [selectedRegion, setSelectedRegion] = useState<string>('全部地區');
  const [selectedGuideId, setSelectedGuideId] = useState<string>('');

  const regionDestinations = useMemo(() => {
    const source =
      selectedRegion === '全部地區'
        ? TRAVEL_GUIDE_DESTINATIONS
        : TRAVEL_GUIDE_DESTINATIONS.filter((item) => item.region === selectedRegion);
    return [...source].sort((a, b) => a.place.localeCompare(b.place, 'zh-Hant'));
  }, [selectedRegion]);

  const destinationQuickMatches = useMemo(
    () => matchTravelDestinations(searchForm.to, selectedRegion),
    [searchForm.to, selectedRegion],
  );

  const selectedGuide = useMemo(
    () => TRAVEL_GUIDE_DESTINATIONS.find((item) => item.id === selectedGuideId) ?? null,
    [selectedGuideId],
  );

  const applyGuideDestination = (destination: TravelGuideDestination) => {
    setSelectedGuideId(destination.id);
    updateField('to', (destination.searchAlias ?? destination.place).toUpperCase());
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
    <div className="p-6 md:p-8 pt-12 md:pt-16 max-w-2xl mx-auto flex flex-col flex-1 h-full w-full overflow-y-auto">
      <h1 className="text-3xl md:text-4xl font-extrabold text-[#d946ef] mb-2 drop-shadow-sm">RoamJelly</h1>
      <p className="text-sm text-slate-600 mb-5">探索機票與體驗，確認後再溫柔導流至供應商下單。</p>

      <GlassCard className="!p-4 mb-6 border-[#f0abfc] bg-[#fdf4ff] flex flex-col">
        <span className="font-bold text-slate-700 mb-3">探索比價</span>
        <div className="flex flex-col gap-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 pl-1">選擇地區</label>
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedGuideId('');
                }}
                className="rounded-2xl border border-white bg-white/80 px-4 py-3 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-fuchsia-300"
              >
                <option value="全部地區">全部地區</option>
                {TRAVEL_GUIDE_REGIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 pl-1">選擇地方</label>
              <select
                value={selectedGuideId}
                onChange={(e) => {
                  const picked = regionDestinations.find((item) => item.id === e.target.value);
                  if (!picked) {
                    setSelectedGuideId('');
                    return;
                  }
                  applyGuideDestination(picked);
                }}
                className="rounded-2xl border border-white bg-white/80 px-4 py-3 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-fuchsia-300"
              >
                <option value="">請選擇地方</option>
                {regionDestinations.map((item) => (
                  <option key={item.id} value={item.id}>{item.country} · {item.place}</option>
                ))}
              </select>
            </div>
          </div>

          <input
            value={searchForm.from}
            onChange={(e) => updateField('from', e.target.value.toUpperCase())}
            placeholder="出發地 (例: TPE / 台北)"
            className="rounded-2xl border border-white bg-white/80 px-4 py-3 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-fuchsia-300"
          />
          <input
            value={searchForm.to}
            onChange={(e) => {
              setSelectedGuideId('');
              updateField('to', e.target.value.toUpperCase());
            }}
            placeholder="輸入目的地或機場代碼 (例: 福岡 / FUK / 東京 / NRT)"
            className="rounded-2xl border border-white bg-white/80 px-4 py-3 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-fuchsia-300"
          />
          <div className="flex flex-col gap-y-2 rounded-2xl bg-white/60 border border-white px-3 py-3">
            <span className="text-xs font-bold text-slate-500">熱門目的地快速選擇</span>
            <div className="flex flex-wrap gap-2">
              {destinationQuickMatches.map((item) => (
                <button
                  key={item.id}
                  onClick={() => applyGuideDestination(item)}
                  className="px-3 py-1.5 rounded-full bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 text-xs font-bold hover:bg-fuchsia-200 transition-colors"
                >
                  {item.country} · {item.place}
                </button>
              ))}
            </div>
            {selectedGuide ? (
              <a
                href={selectedGuide.guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-700 font-semibold hover:underline"
              >
                查看 {selectedGuide.country} {selectedGuide.place} 旅遊指南
              </a>
            ) : null}
            <span className="text-[11px] text-slate-500">
              已整合資料來源: {TRAVEL_GUIDE_SOURCE_REPO}
            </span>
          </div>

          <div className="flex flex-col">
            <input
              value={searchForm.date}
              onChange={(e) => {
                updateField('date', e.target.value);
                if (dateError) setDateError(null);
              }}
              placeholder="日期 (YYYY-MM-DD)"
              className={`rounded-2xl border bg-white/80 px-4 py-3 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-fuchsia-300 ${
                dateError ? 'border-red-400' : 'border-white'
              }`}
            />
            {dateError ? (
              <span className="text-xs text-red-500 mt-1 pl-1">{dateError}</span>
            ) : null}
          </div>
          <button
            onClick={() => void handleSearch()}
            disabled={isSearchDisabled || loading}
            className={`rounded-2xl px-4 py-3 flex flex-row items-center justify-center border-none appearance-none cursor-pointer transition-colors ${
              isSearchDisabled || loading ? 'bg-fuchsia-300 cursor-not-allowed' : 'bg-fuchsia-500 hover:bg-fuchsia-600'
            }`}
          >
            <SearchIcon size={16} color="white" />
            <span className="text-white font-extrabold ml-2 text-base">搜尋</span>
          </button>
        </div>
      </GlassCard>

      <div className="pb-32 flex flex-col">
        <span className="text-xl font-bold mb-4 text-slate-700">熱門推薦</span>

        {loading ? (
          <div className="flex flex-col gap-y-4">
            {[0, 1, 2].map((i) => <FlightSkeletonCard key={i} />)}
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
            <div className="flex flex-col gap-y-4">
              {results.map((flight, index) => (
                <motion.div
                  key={flight.id}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.06, type: 'spring', bounce: 0.35 }}
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
  );
}
