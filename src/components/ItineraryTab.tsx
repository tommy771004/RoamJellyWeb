import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'motion/react';


import { List as ListIcon, Map as MapIcon, Share2, Trash2, Sparkles, Plus, X, Pencil, Save } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import GlassCard from './GlassCard';
import { ItinerarySkeletonCard } from './SkeletonCard';
import {
  searchOffers,
  ensureClientAccessToken,
  fetchCollaborators,
  fetchFavorites,
  fetchItinerary,
  fetchTripInfo,
  shareText,
  syncItinerary,
  deleteItineraryNode,
  addFavorite,
  deleteFavorite,
} from '../lib/workflowApi';
import { suggestItineraryWithForm } from '../lib/geminiApi';
import { useItineraryStore } from '../store/useItineraryStore';
import { useAppStore } from '../store/useAppStore';
import type {
  Collaborator,
  FavoriteSpot,
  ItineraryNode,
  ItineraryPlannerForm,
  SearchItem,
  SyncItineraryPayload,
  TripInfo,
} from '../types/workflow';

const TRIP_ID =
  (typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('trip_id')
    : '') ||
  ((typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env?.VITE_TRIP_ID) ||
    '')
    .trim();
const CACHE_KEY = `roamjelly_itinerary_${TRIP_ID}`;

// Tokyo bounding box for map normalization
const LAT_MIN = 35.60, LAT_MAX = 35.75;
const LNG_MIN = 139.65, LNG_MAX = 139.85;

function toMapPercent(lat: number, lng: number) {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 80 + 10;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 80 + 10;
  return { x: Math.min(90, Math.max(10, x)), y: Math.min(90, Math.max(10, y)) };
}

const EMOJI_OPTIONS = ['🏯', '🗼', '🌸', '🍣', '🍜', '🎌', '⛩️', '🏔️', '🛍️', '🎡', '🌿', '🏖️'];
type AiGenerateMode = 'selected_day' | 'overwrite_all';

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  flight: { label: '航班', icon: '✈️' },
  transport: { label: '交通', icon: '🚆' },
  landmark: { label: '景點', icon: '🏯' },
  food: { label: '美食', icon: '🍜' },
  shopping: { label: '購物', icon: '🛍️' },
  nature: { label: '自然', icon: '🌿' },
  hotel: { label: '住宿', icon: '🏨' },
  activity: { label: '活動', icon: '🎡' },
  nightlife: { label: '夜生活', icon: '🌃' },
  other: { label: '其他', icon: '📍' },
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_META);

function getCategoryMeta(category?: string) {
  const key = category && CATEGORY_META[category] ? category : 'other';
  return { key, ...CATEGORY_META[key] };
}

function withAutoCategoryIcon(node: ItineraryNode): ItineraryNode {
  const meta = getCategoryMeta(node.category);
  return {
    ...node,
    category: meta.key,
    emoji: node.emoji?.trim() ? node.emoji : meta.icon,
  };
}

function buildDefaultPlannerForm(destination: string, days: number): ItineraryPlannerForm {
  return {
    days,
    departureFrom: 'TPE',
    arrivalTo: destination,
    flightDate: '2026-06-15',
    countries: ['日本'],
    mustVisitSpots: [],
    mustEatFoods: [],
    autoFlightSegments: [],
    notes: '',
  };
}

export default function ItineraryTab() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [tip, setTip] = useState('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);

  // Trip & favorites — replaces all hardcoded constants
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [favorites, setFavorites] = useState<FavoriteSpot[]>([]);
  const [newSpotTitle, setNewSpotTitle] = useState('');
  const [newSpotEmoji, setNewSpotEmoji] = useState('📍');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [addingFavorite, setAddingFavorite] = useState<boolean>(false);
  const [plannerForm, setPlannerForm] = useState<ItineraryPlannerForm>(buildDefaultPlannerForm('東京', 5));
  const [flightsLoading, setFlightsLoading] = useState<boolean>(false);
  const [aiGenerateMode, setAiGenerateMode] = useState<AiGenerateMode>('selected_day');

  const socketRef = useRef<Socket | null>(null);

  const { nodes, setNodes, addNode, updateNode, removeNode, collaborators, setCollaborators, isOffline, setOffline } =
    useItineraryStore();
  const { showToast } = useAppStore();

  // Online/offline tracking
  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setOffline]);

  // Initial data load — trip info, favorites, collaborators, itinerary all in one shot
  useEffect(() => {
    const init = async () => {
      if (!TRIP_ID) {
        setTip('請設定網址 trip_id 或 VITE_TRIP_ID 才能載入真實行程資料。');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [tripResult, favResult, collabResult, itineraryResult] = await Promise.all([
          fetchTripInfo(TRIP_ID),
          fetchFavorites(TRIP_ID),
          fetchCollaborators(TRIP_ID),
          !isOffline ? fetchItinerary(TRIP_ID) : Promise.resolve(readCachedItinerary()),
        ]);
        setTripInfo(tripResult);
        setPlannerForm(buildDefaultPlannerForm(tripResult.destination, tripResult.days));
        setFavorites(favResult);
        setCollaborators(collabResult);
        setNodes(itineraryResult);
      } catch {
        const cached = readCachedItinerary();
        setNodes(cached);
        setTip('同步服務暫時不可用，先顯示最近的離線內容。');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [isOffline, setCollaborators, setNodes]);

  // Socket.io real-time sync
  useEffect(() => {
    if (isOffline) return;

    let mounted = true;

    void (async () => {
      const token = await ensureClientAccessToken();
      if (!mounted) return;

      const socket = io('/', {
        transports: ['websocket', 'polling'],
        auth: token ? { token: `Bearer ${token}` } : undefined,
      });

      socket.on('connect', () => {
        socket.emit('join_room', { trip_id: TRIP_ID });
        setIsSocketConnected(true);
      });

      socket.on('sync_itinerary', (event: SyncItineraryPayload) => {
        if (!event?.payload) return;
        if (event.action === 'remove_node') {
          removeNode((event.payload as { node_id: string }).node_id);
        } else if (event.action === 'add_node') {
          addNode({ ...(event.payload as ItineraryNode), source: 'remote' });
        }
      });

      socket.on('disconnect', () => {
        setIsSocketConnected(false);
        setTip('即時同步已中斷，正在等待重連。');
        setTimeout(() => setTip(''), 2000);
      });

      socketRef.current = socket;
    })();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsSocketConnected(false);
    };
  }, [isOffline, addNode, removeNode]);

  const selectedDayNodes = useMemo(
    () =>
      nodes
        .filter((node: ItineraryNode) => node.day === selectedDay)
        .map((node: ItineraryNode) => withAutoCategoryIcon(node))
        .sort((a: ItineraryNode, b: ItineraryNode) => a.time.localeCompare(b.time)),
    [nodes, selectedDay],
  );

  const maxNodeDay = useMemo(() => Math.max(1, ...nodes.map((node: ItineraryNode) => node.day)), [nodes]);
  const totalDays = Math.max(tripInfo?.days ?? 1, plannerForm.days, maxNodeDay);

  useEffect(() => {
    if (selectedDay > totalDays) {
      setSelectedDay(totalDays);
    }
  }, [selectedDay, totalDays]);

  const setPlannerField = <K extends keyof ItineraryPlannerForm>(key: K, value: ItineraryPlannerForm[K]) => {
    setPlannerForm((prev: ItineraryPlannerForm) => ({ ...prev, [key]: value }));
  };

  const setPlannerCsvField =
    (key: 'countries' | 'mustVisitSpots' | 'mustEatFoods') =>
      (text: string) => setPlannerField(key, parseCsvInput(text));

  const handleShare = async () => {
    if (!TRIP_ID) {
      showToast('缺少 trip_id，無法分享旅程');
      return;
    }
    const deepLink = `${window.location.origin}/trip/${TRIP_ID}`;
    const name = tripInfo?.name ?? '我的旅程';
    const ok = await shareText(`一起共編「${name}」，點我加入：${deepLink}`);
    setTip(ok ? '邀請連結已分享或複製。' : '分享未完成，請稍後再試。');
    setTimeout(() => setTip(''), 2200);
  };

  // Add a favorite spot from the DB to the selected day's timeline
  const addSpotToDay = (spot: FavoriteSpot, day: number) => {
    if (isOffline || !TRIP_ID) return;

    const node: ItineraryNode = {
      node_id: `node_${Date.now()}`,
      day,
      time: formatCurrentTime(),
      title: spot.title,
      emoji: spot.emoji,
      category: 'landmark',
      source: 'local',
      lat: spot.lat,
      lng: spot.lng,
    };

    const normalized = withAutoCategoryIcon(node);

    addNode(normalized);

    const payload: SyncItineraryPayload = { trip_id: TRIP_ID, action: 'add_node', payload: normalized };
    socketRef.current?.emit('sync_itinerary', payload);
    void syncItinerary(payload).catch(() => {
      setTip('行程同步暫時失敗，稍後會再嘗試。');
      setTimeout(() => setTip(''), 2000);
    });

    showToast(`${normalized.emoji} ${spot.title} 已加入 Day ${day}！`);
  };

  // Add a new custom favorite (geocoded by backend via Nominatim)
  const handleAddFavorite = async () => {
    if (!newSpotTitle.trim() || isOffline || !TRIP_ID) return;
    setAddingFavorite(true);
    try {
      const spot = await addFavorite(TRIP_ID, newSpotTitle.trim(), newSpotEmoji);
      setFavorites((prev: FavoriteSpot[]) => [...prev, spot]);
      setNewSpotTitle('');
      setNewSpotEmoji('📍');
      setShowEmojiPicker(false);
      showToast(`${spot.emoji} ${spot.title} 已加入收藏（座標已自動定位）`);
    } catch {
      showToast('新增收藏失敗，請稍後再試。');
    } finally {
      setAddingFavorite(false);
    }
  };

  // Remove a favorite from the DB
  const handleDeleteFavorite = async (id: string) => {
    setFavorites((prev: FavoriteSpot[]) => prev.filter((f: FavoriteSpot) => f.id !== id));
    try {
      await deleteFavorite(id);
    } catch {
      showToast('刪除收藏失敗，請稍後再試。');
    }
  };

  const handleDeleteNode = async (node_id: string) => {
    removeNode(node_id);
    try {
      await deleteItineraryNode(node_id);
      socketRef.current?.emit('sync_itinerary', {
        trip_id: TRIP_ID,
        action: 'remove_node',
        payload: { node_id } as ItineraryNode,
      });
    } catch {
      showToast('刪除失敗，請稍後再試。');
    }
  };

  const handleUpdateNode = async (node: ItineraryNode) => {
    if (isOffline || !TRIP_ID) return;
    const normalized = withAutoCategoryIcon(node);
    updateNode(normalized);
    const payload: SyncItineraryPayload = { trip_id: TRIP_ID, action: 'add_node', payload: normalized };
    socketRef.current?.emit('sync_itinerary', payload);
    try {
      await syncItinerary(payload);
    } catch {
      showToast('更新行程失敗，請稍後再試。');
    }
  };

  const removeNodesBatch = async (targetNodes: ItineraryNode[]) => {
    let failedCount = 0;
    for (const target of targetNodes) {
      removeNode(target.node_id);
      try {
        await deleteItineraryNode(target.node_id);
      } catch {
        failedCount += 1;
      }
    }
    if (failedCount > 0) {
      showToast(`有 ${failedCount} 筆舊行程清除失敗，請稍後再試`);
    }
  };

  const handleAutoFetchFlights = async () => {
    if (!plannerForm.departureFrom || !plannerForm.arrivalTo || !plannerForm.flightDate) {
      showToast('請先填出發地、抵達地與日期再抓航班');
      return;
    }
    setFlightsLoading(true);
    try {
      const offers = await searchOffers({
        from: plannerForm.departureFrom,
        to: plannerForm.arrivalTo,
        date: plannerForm.flightDate,
      });
      const segments = extractFlightSegments(offers);
      setPlannerField('autoFlightSegments', segments);
      showToast(`已自動抓取 ${segments.length} 筆航班資訊`);
    } catch {
      showToast('目前無法自動抓航班，請稍後再試');
    } finally {
      setFlightsLoading(false);
    }
  };

  const handleAiSuggest = async () => {
    if (isOffline) { showToast('離線中無法使用 AI 功能 📴'); return; }
    if (!TRIP_ID) { showToast('缺少 trip_id，無法生成行程'); return; }
    setAiLoading(true);
    try {
      const destination = tripInfo?.destination ?? '東京';
      const suggestions = await suggestItineraryWithForm({ destination, planner: plannerForm });

      let finalNodes: ItineraryNode[] = suggestions;

      if (aiGenerateMode === 'overwrite_all') {
        await removeNodesBatch([...nodes]);
      } else {
        const currentDayNodes = nodes.filter((node: ItineraryNode) => node.day === selectedDay);
        await removeNodesBatch(currentDayNodes);
        finalNodes = suggestions.map((node) => ({ ...node, day: selectedDay }));
      }

      for (const node of finalNodes) {
        const normalized = withAutoCategoryIcon(node);
        addNode(normalized);
        const payload: SyncItineraryPayload = { trip_id: TRIP_ID, action: 'add_node', payload: normalized };
        socketRef.current?.emit('sync_itinerary', payload);
        void syncItinerary(payload);
      }

      if (aiGenerateMode === 'overwrite_all') {
        showToast(`✨ 已一鍵覆蓋行程，共 ${finalNodes.length} 個新節點`);
      } else {
        showToast(`✨ 已重建 Day ${selectedDay}，共 ${finalNodes.length} 個節點`);
      }
    } catch {
      showToast('AI 規劃失敗，請確認 OpenRouter API Key 是否設定。');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="overflow-auto p-6 md:p-8 pt-12 md:pt-16 min-h-screen flex-1 max-w-2xl mx-auto w-full h-full">
      {isOffline ? (
        <GlassCard className="mb-4 !p-3 bg-[#fef3c7] border-[#fde68a]">
          <span className="text-amber-700 font-semibold">目前離線中，僅供查看喔 📴</span>
        </GlassCard>
      ) : null}

      {/* Header — title from API */}
      <div className="flex-row justify-between items-center mb-5">
        <div>
          <span className="text-3xl font-extrabold text-slate-800 drop-shadow-sm">
            {tripInfo?.name ?? '載入中...'}
          </span>
          {tripInfo && (
            <span className="text-xs text-slate-400 mt-0.5">
              {tripInfo.destination} · {tripInfo.days} 天
            </span>
          )}
        </div>
        <div className="flex-row items-center" style={{ gap: -8 }}>
          {collaborators.map((c: Collaborator, index: number) => {
            const Comp = CollaboratorAvatar as any;
            return (
              <Comp
                key={c.id}
                collaborator={c}
                index={index}
                isOnline={isSocketConnected}
              />
            );
          })}
          <button
            onClick={() => void handleShare()}
            className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center border-2 border-white ml-2"
          >
            <span className="text-sm font-bold text-purple-600">+</span>
          </button>
        </div>
      </div>

      {/* View mode + share */}
      <div className="flex-row mb-4 items-stretch h-12">
        <div className="flex-row bg-white/40 p-1 rounded-2xl border border-white/50">
          {(['list', 'map'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-row items-center px-4 py-2 rounded-xl ${viewMode === mode ? 'bg-white shadow-sm' : ''}`}
            >
              {mode === 'list'
                ? <ListIcon size={16} color={viewMode === mode ? '#9333ea' : '#64748b'} />
                : <MapIcon size={16} color={viewMode === mode ? '#9333ea' : '#64748b'} />
              }
              <span className={`ml-2 font-bold text-sm ${viewMode === mode ? 'text-purple-600' : 'text-slate-500'}`}>
                {mode === 'list' ? '列表' : '地圖'}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => void handleShare()}
          className="flex-1 flex-row bg-[#f472b6] rounded-2xl items-center justify-center ml-3 px-4 shadow-sm"
        >
          <Share2 size={16} color="white" />
          <span className="ml-2 font-bold text-white text-sm">邀請好友</span>
        </button>
      </div>

      {/* Day selector — days from trip API */}
      <div 
        className="mb-4 overflow-auto flex"
        style={{ gap: 8 }}
      >
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const isActive = selectedDay === day;
          const count = nodes.filter((n: ItineraryNode) => n.day === day).length;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className="relative"
            >
              {isActive && (
                <motion.div
                  layoutId="day-indicator"
                  className="absolute inset-0 rounded-2xl bg-[#9333ea]"
                  transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                />
              )}
              <div className="px-4 py-2 rounded-2xl items-center relative z-10" style={{ minWidth: 64 }}>
                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>
                  Day {day}
                </span>
                {count > 0
                  ? <div className={`mt-0.5 w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/70' : 'bg-purple-400'}`} />
                  : <div className="mt-0.5 w-1.5 h-1.5" />
                }
              </div>
            </button>
          );
        })}
      </div>

      <GlassCard className="!p-4 mb-4 border-[#d8b4fe]">
        <span className="font-bold text-slate-700 mb-3">AI 行程規劃表單</span>
        <div style={{ gap: 10 }}>
          <div className="flex-row" style={{ gap: 8 }}>
            <spanInput
              value={String(plannerForm.days)}
              onChange={(e) => setPlannerField('days', Math.max(1, Number(e.target.value) || 1))}
              placeholder="幾天"
              inputMode="numeric"
              className="flex-1 rounded-xl border border-white bg-white/80 px-3 py-2.5 font-semibold text-slate-700 text-sm"
            />
            <spanInput
              value={plannerForm.flightDate}
              onChange={(e) => setPlannerField('flightDate', e.target.value)}
              placeholder="航班日期 YYYY-MM-DD"
              className="flex-[2] rounded-xl border border-white bg-white/80 px-3 py-2.5 font-semibold text-slate-700 text-sm"
            />
          </div>
          <div className="flex-row" style={{ gap: 8 }}>
            <spanInput
              value={plannerForm.departureFrom}
              onChange={(e) => setPlannerField('departureFrom', e.target.value.toUpperCase())}
              placeholder="出發機場 (例 TPE)"
              className="flex-1 rounded-xl border border-white bg-white/80 px-3 py-2.5 font-semibold text-slate-700 text-sm"
            />
            <spanInput
              value={plannerForm.arrivalTo}
              onChange={(e) => setPlannerField('arrivalTo', e.target.value.toUpperCase())}
              placeholder="抵達機場 (例 NRT)"
              className="flex-1 rounded-xl border border-white bg-white/80 px-3 py-2.5 font-semibold text-slate-700 text-sm"
            />
          </div>
          <spanInput
            value={plannerForm.countries.join(', ')}
            onChange={(e) => setPlannerCsvField('countries')(e.target.value)}
            placeholder="想去國家（逗號分隔）"
            className="rounded-xl border border-white bg-white/80 px-3 py-2.5 font-semibold text-slate-700 text-sm"
          />
          <spanInput
            value={plannerForm.mustVisitSpots.join(', ')}
            onChange={(e) => setPlannerCsvField('mustVisitSpots')(e.target.value)}
            placeholder="想去景點（逗號分隔）"
            className="rounded-xl border border-white bg-white/80 px-3 py-2.5 font-semibold text-slate-700 text-sm"
          />
          <spanInput
            value={plannerForm.mustEatFoods.join(', ')}
            onChange={(e) => setPlannerCsvField('mustEatFoods')(e.target.value)}
            placeholder="想吃食物（逗號分隔）"
            className="rounded-xl border border-white bg-white/80 px-3 py-2.5 font-semibold text-slate-700 text-sm"
          />
          <spanInput
            value={plannerForm.notes}
            onChange={(e) => setPlannerField('notes', e.target.value)}
            placeholder="其他需求（例如：想慢旅、帶長輩、不要太早出門）"
            className="rounded-xl border border-white bg-white/80 px-3 py-2.5 font-semibold text-slate-700 text-sm"
          />
          <button
            onClick={() => void handleAutoFetchFlights()}
            disabled={flightsLoading || isOffline}
            className={`rounded-2xl px-4 py-2.5 flex-row items-center justify-center ${
              flightsLoading || isOffline ? 'bg-sky-300' : 'bg-sky-500'
            }`}
          >
            <span className="text-white font-bold">{flightsLoading ? '抓取航班中...' : '自動抓航班（含轉乘）'}</span>
          </button>
          {plannerForm.autoFlightSegments.length > 0 && (
            <div className="rounded-xl bg-white/60 border border-white p-2" style={{ gap: 4 }}>
              {plannerForm.autoFlightSegments.map((segment: string) => (
                <span key={segment} className="text-xs text-slate-600">• {segment}</span>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-white bg-white/60 p-2">
            <span className="text-xs font-bold text-slate-600 mb-2">生成模式</span>
            <div className="flex-row" style={{ gap: 8 }}>
              <button
                onClick={() => setAiGenerateMode('selected_day')}
                className={`flex-1 rounded-xl px-3 py-2 border ${
                  aiGenerateMode === 'selected_day'
                    ? 'bg-violet-100 border-violet-300'
                    : 'bg-white/70 border-white'
                }`}
              >
                <span className={`text-xs font-bold ${aiGenerateMode === 'selected_day' ? 'text-violet-700' : 'text-slate-500'}`}>
                  只生成選定 Day
                </span>
              </button>
              <button
                onClick={() => setAiGenerateMode('overwrite_all')}
                className={`flex-1 rounded-xl px-3 py-2 border ${
                  aiGenerateMode === 'overwrite_all'
                    ? 'bg-rose-100 border-rose-300'
                    : 'bg-white/70 border-white'
                }`}
              >
                <span className={`text-xs font-bold ${aiGenerateMode === 'overwrite_all' ? 'text-rose-700' : 'text-slate-500'}`}>
                  一鍵覆蓋目前行程
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white bg-white/60 p-2">
            <span className="text-xs font-bold text-slate-600 mb-2">分類 icon 對照表</span>
            <div className="overflow-auto" horizontal >
              <div className="flex-row" style={{ gap: 6 }}>
                {CATEGORY_OPTIONS.map((category) => {
                  const meta = getCategoryMeta(category);
                  return (
                    <div key={category} className="px-2 py-1 rounded-full border border-white bg-white/80">
                      <span className="text-[10px] font-bold text-slate-600">{meta.icon} {meta.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* AI button */}
      <button
        onClick={() => void handleAiSuggest()}
        disabled={aiLoading}
        className={`mb-5 flex-row items-center justify-center rounded-2xl py-3 px-4 ${aiLoading ? 'bg-violet-300' : 'bg-violet-500'}`}
      >
        <Sparkles size={16} color="white" />
        <span className="ml-2 font-bold text-white">
          {aiLoading
            ? '果凍精靈正在生成行程...'
            : aiGenerateMode === 'overwrite_all'
              ? '✨ AI 一鍵覆蓋目前行程'
              : `✨ AI 只生成 Day ${selectedDay}`}
        </span>
      </button>

      {tip ? <span className="text-xs text-slate-500 mb-3">{tip}</span> : null}

      {/* Favorites panel — data from /api/favorites */}
      <GlassCard className="!p-4 mb-5">
        <div className="flex-row items-center justify-between mb-3">
          <span className="font-bold text-slate-700">收藏夾</span>
          <span className="text-xs text-slate-400">拖曳或點「+」加入 Day {selectedDay}</span>
        </div>

        <div style={{ gap: 10 }}>
          {favorites.map((spot: FavoriteSpot) => {
            const Comp = DraggableFavoriteSpot as any;
            return (
              <Comp
                key={spot.id}
                spot={spot}
                selectedDay={selectedDay}
                isOffline={isOffline}
                onAdd={addSpotToDay}
                onDelete={handleDeleteFavorite}
              />
            );
          })}
        </div>

        {/* Add custom favorite */}
        {!isOffline && (
          <div className="mt-3 pt-3 border-t border-white/40">
            <div className="flex-row items-center" style={{ gap: 8 }}>
              {/* Emoji picker trigger */}
              <button
                onClick={() => setShowEmojiPicker((v: boolean) => !v)}
                className="w-11 h-11 rounded-xl bg-white/70 border border-white flex items-center justify-center"
              >
                <span className="text-xl">{newSpotEmoji}</span>
              </button>
              <spanInput
                value={newSpotTitle}
                onChange={(e) => setNewSpotTitle(e.target.value)}
                placeholder="新增景點名稱..."
                className="flex-1 rounded-xl border border-white bg-white/80 px-3 py-2.5 font-semibold text-slate-700 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") { void handleAddFavorite(); } }} />
              <button
                onClick={() => void handleAddFavorite()}
                disabled={addingFavorite || !newSpotTitle.trim()}
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  addingFavorite || !newSpotTitle.trim() ? 'bg-purple-200' : 'bg-[#9333ea]'
                }`}
              >
                <Plus size={18} color="white" />
              </button>
            </div>
            {addingFavorite && (
              <span className="text-xs text-purple-500 mt-1.5 ml-1">Nominatim 地理編碼中...</span>
            )}
            {/* Emoji picker */}
            {showEmojiPicker && (
              <div className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { setNewSpotEmoji(emoji); setShowEmojiPicker(false); }}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      newSpotEmoji === emoji ? 'bg-purple-100 border border-purple-300' : 'bg-white/60'
                    }`}
                  >
                    <span className="text-lg">{emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Timeline / Map */}
      <div className="flex-1 pb-32">
        {loading ? (
          <div className="relative pl-6 mt-4" style={{ gap: 32 }}>
            {[0, 1, 2].map((i) => <ItinerarySkeletonCard key={i} />)}
          </div>
        ) : viewMode === 'list' ? (
          <ItineraryList
            items={selectedDayNodes}
            day={selectedDay}
            onDelete={handleDeleteNode}
            onUpdate={handleUpdateNode}
            isOffline={isOffline}
          />
        ) : (
          <TokyoMapView items={selectedDayNodes} />
        )}
      </div>
    </div>
  );
}

// ─── Collaborator Avatar with presence glow ──────────────────────────────────

function CollaboratorAvatar({
  collaborator,
  index,
  isOnline,
}: {
  collaborator: Collaborator;
  index: number;
  isOnline: boolean;
}) {
  return (
    <div
      className="relative w-10 h-10"
      style={{ marginLeft: index === 0 ? 0 : -8, zIndex: 10 - index }}
    >
      {isOnline && (
        <motion.div
          className="absolute rounded-full bg-emerald-400"
          style={{ inset: -2 }}
          animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: index * 0.35, ease: 'easeInOut' }}
        />
      )}
      <div
        className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center"
        style={{ borderWidth: 2, borderColor: 'white' }}
      >
        <span className="text-lg">{collaborator.avatar}</span>
      </div>
      {isOnline && (
        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
      )}
    </div>
  );
}

// ─── Draggable Favorite Spot ─────────────────────────────────────────────────

function DraggableFavoriteSpot({
  spot,
  selectedDay,
  isOffline,
  onAdd,
  onDelete,
}: {
  spot: FavoriteSpot;
  selectedDay: number;
  isOffline: boolean;
  onAdd: (spot: FavoriteSpot, day: number) => void;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [isDragging, setIsDragging] = useState<boolean>(false);

  return (
    <div className="relative">
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -bottom-16 left-0 right-0 h-14 rounded-2xl border-2 border-dashed border-purple-400 bg-purple-50/80 flex items-center justify-center z-0"
          >
            <span className="text-purple-500 font-bold text-sm">放開加入 Day {selectedDay} ↓</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        drag={!isOffline}
        dragSnapToOrigin
        dragElastic={0.15}
        dragConstraints={{ top: 0, left: -20, right: 20, bottom: 200 }}
        whileDrag={{ scale: 1.05, boxShadow: '0 16px 48px rgba(147,51,234,0.25)', zIndex: 50, cursor: 'grabbing' }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_: PointerEvent, info: PanInfo) => {
          setIsDragging(false);
          if (info.offset.y > 80) onAdd(spot, selectedDay);
        }}
        style={{ cursor: isOffline ? 'default' : 'grab', position: 'relative', zIndex: 10 }}
      >
        <div className="bg-white/70 rounded-2xl border border-white px-3 py-2.5 flex-row items-center">
          <span className="text-xl mr-2">{spot.emoji}</span>
          <span className="font-semibold text-slate-700 flex-1">{spot.title}</span>
          {spot.lat && spot.lng && (
            <div className="bg-emerald-50 rounded-full px-1.5 py-0.5 mr-2 border border-emerald-100">
              <span className="text-[9px] font-bold text-emerald-600">📍 已定位</span>
            </div>
          )}
          <button
            onClick={() => !isOffline && onAdd(spot, selectedDay)}
            disabled={isOffline}
            className={`${isOffline ? 'bg-slate-300' : 'bg-[#9333ea]'} rounded-full w-8 h-8 flex items-center justify-center mr-1`}
          >
            <Plus size={14} color="white" />
          </button>
          <button
            onClick={() => onDelete(spot.id)}
            className="w-7 h-7 rounded-full bg-red-50 border border-red-100 flex items-center justify-center"
          >
            <X size={12} color="#ef4444" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Itinerary List ───────────────────────────────────────────────────────────

function ItineraryList({
  items,
  day,
  onDelete,
  onUpdate,
  isOffline,
}: {
  items: ItineraryNode[];
  day: number;
  onDelete: (node_id: string) => void;
  onUpdate: (node: ItineraryNode) => void;
  isOffline: boolean;
}) {
  type EditDraft = { day: string; time: string; title: string; emoji: string; category: string };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);

  const startEdit = (item: ItineraryNode) => {
    const meta = getCategoryMeta(item.category);
    setEditingId(item.node_id);
    setDraft({
      day: String(item.day),
      time: item.time,
      title: item.title,
      emoji: item.emoji || meta.icon,
      category: meta.key,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = (item: ItineraryNode) => {
    if (!draft) return;
    const category = CATEGORY_OPTIONS.includes(draft.category) ? draft.category : 'other';
    const categoryMeta = getCategoryMeta(category);
    const nextNode: ItineraryNode = {
      ...item,
      day: Math.max(1, Number(draft.day) || item.day),
      time: normalizeClockInput(draft.time),
      title: draft.title.trim() || item.title,
      category,
      emoji: draft.emoji.trim() || categoryMeta.icon,
      source: 'local',
    };
    onUpdate(nextNode);
    setEditingId(null);
    setDraft(null);
  };

  if (items.length === 0) {
    return (
      <div className="items-center py-16">
        <span className="text-4xl mb-3">🗒️</span>
        <span className="text-slate-500 font-semibold text-base">Day {day} 還沒有行程</span>
        <span className="text-slate-400 text-sm mt-1">從收藏夾拖曳景點，或讓 AI 幫你規劃！</span>
      </div>
    );
  }

  return (
    <div className="relative pl-6 mt-4 pb-12" style={{ gap: 32 }}>
      <div className="absolute left-[13px] top-6 bottom-4 w-1 bg-[#d8b4fe] rounded-full" />
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.node_id}
            layout
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.45, duration: 0.4 }}
          >
            <div className="relative mb-6">
              <div className="absolute -left-9 top-[25%] w-5 h-5 rounded-full bg-white border-4 border-purple-400 z-10" />
              <GlassCard className="!p-5 ml-2">
                <div className="flex-row items-center">
                  <div className="w-14 h-14 rounded-full bg-white/60 flex items-center justify-center shadow-sm border border-white shrink-0">
                    <span className="text-3xl">{item.emoji}</span>
                  </div>
                  {editingId === item.node_id && draft ? (
                    <div className="ml-5 flex-1" style={{ gap: 6 }}>
                      <div className="flex-row" style={{ gap: 8 }}>
                        <spanInput
                          value={draft.day}
                          onChange={(e) => setDraft((prev: EditDraft | null) => (prev ? { ...prev, day: e.target.value } : prev))}
                          inputMode="numeric"
                          className="w-16 rounded-lg border border-white bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-700"
                        />
                        <spanInput
                          value={draft.time}
                          onChange={(e) => setDraft((prev: EditDraft | null) => (prev ? { ...prev, time: e.target.value } : prev))}
                          className="w-24 rounded-lg border border-white bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-700"
                        />
                        <spanInput
                          value={draft.emoji}
                          onChange={(e) => setDraft((prev: EditDraft | null) => (prev ? { ...prev, emoji: e.target.value } : prev))}
                          className="w-16 rounded-lg border border-white bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-700"
                        />
                      </div>
                      <spanInput
                        value={draft.title}
                        onChange={(e) => setDraft((prev: EditDraft | null) => (prev ? { ...prev, title: e.target.value } : prev))}
                        className="rounded-lg border border-white bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-700"
                      />
                      <div className="overflow-auto" horizontal >
                        <div className="flex-row" style={{ gap: 6 }}>
                          {CATEGORY_OPTIONS.map((option) => {
                            const optionMeta = getCategoryMeta(option);
                            const active = draft.category === option;
                            return (
                              <button
                                key={option}
                                onClick={() =>
                                  setDraft((prev: EditDraft | null) =>
                                    prev ? { ...prev, category: option, emoji: optionMeta.icon } : prev,
                                  )
                                }
                                className={`px-2 py-1 rounded-full border ${
                                  active ? 'bg-purple-100 border-purple-300' : 'bg-white/70 border-white'
                                }`}
                              >
                                <span className={`text-[10px] font-bold ${active ? 'text-purple-700' : 'text-slate-500'}`}>
                                  {optionMeta.icon} {optionMeta.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-5 flex-1">
                      {(() => {
                        const categoryMeta = getCategoryMeta(item.category);
                        return (
                          <>
                            <span className="text-sm text-purple-600 font-extrabold mb-1 tracking-wider">Day {item.day} · {item.time}</span>
                            <span className="text-xl font-bold text-slate-800">{item.title}</span>
                            <div className="mt-1.5 flex-row" style={{ gap: 6 }}>
                              <div className="bg-violet-100 rounded-full px-2 py-1 border border-violet-200">
                                <span className="text-[10px] font-bold text-violet-700">{categoryMeta.icon} {categoryMeta.label}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                  <div className="flex-row items-center" style={{ gap: 8 }}>
                    {item.source === 'local' && (
                      <div className="bg-emerald-100 rounded-full px-2 py-1 border border-emerald-200">
                        <span className="text-[10px] font-bold text-emerald-700">剛同步</span>
                      </div>
                    )}
                    {!isOffline && editingId !== item.node_id && (
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 rounded-full bg-indigo-50 border border-indigo-100"
                      >
                        <Pencil size={14} color="#4f46e5" />
                      </button>
                    )}
                    {!isOffline && editingId === item.node_id && (
                      <button
                        onClick={() => saveEdit(item)}
                        className="p-2 rounded-full bg-emerald-50 border border-emerald-100"
                      >
                        <Save size={14} color="#16a34a" />
                      </button>
                    )}
                    {!isOffline && editingId === item.node_id && (
                      <button
                        onClick={cancelEdit}
                        className="p-2 rounded-full bg-slate-100 border border-slate-200"
                      >
                        <X size={14} color="#64748b" />
                      </button>
                    )}
                    {!isOffline && editingId !== item.node_id && (
                      <button
                        onClick={() => onDelete(item.node_id)}
                        className="p-2 rounded-full bg-red-50 border border-red-100"
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Tokyo Map View ───────────────────────────────────────────────────────────

function TokyoMapView({ items }: { items: ItineraryNode[] }) {
  return (
    <GlassCard className="h-[55vh] relative overflow-hidden !p-0 border-4 border-white/40 rounded-[2.5rem]">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #bfdbfe 0%, #ddd6fe 50%, #fce7f3 100%)' } as object}
      />
      {[25, 50, 75].map((p) => (
        <div key={`h-${p}`} className="absolute left-0 right-0 h-px bg-white/30" style={{ top: `${p}%` }} />
      ))}
      {[25, 50, 75].map((p) => (
        <div key={`v-${p}`} className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: `${p}%` }} />
      ))}
      <div className="absolute top-3 right-4 bg-white/70 rounded-full w-8 h-8 items-center justify-center">
        <span className="text-xs font-black text-slate-600">N↑</span>
      </div>
      {/* Connecting lines via react-native-svg */}
      {items.length > 1 && (
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' } as object}
        >
          {(items as ItineraryNode[]).slice(0, -1).map((item: ItineraryNode, i: number) => {
            const next = items[i + 1];
            if (!item.lat || !item.lng || !next.lat || !next.lng) return <Fragment key={`line-${item.node_id}`} />;
            const from = toMapPercent(item.lat, item.lng);
            const to = toMapPercent(next.lat, next.lng);
            return (
              <line
                key={`line-${item.node_id}`}
                x1={from.x} y1={from.y}
                x2={to.x}   y2={to.y}
                stroke="rgba(147,51,234,0.4)"
                strokeWidth={0.8}
                strokeDasharray="2 1.5"
              />
            );
          })}
        </svg>
      )}
      {/* Map pins */}
      {items.map((item: ItineraryNode, index: number) => {
        const pos = (item.lat && item.lng)
          ? toMapPercent(item.lat, item.lng)
          : { x: 25 + (index % 2) * 35, y: 18 + index * 20 };

        return (
          <motion.div
            key={item.node_id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.12, type: 'spring', bounce: 0.5 }}
            style={{
              position: 'absolute',
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="items-center">
              <div className="bg-white/95 rounded-2xl px-2.5 py-2 border-2 border-white items-center shadow-lg">
                <span className="text-2xl">{item.emoji}</span>
              </div>
              <div
                className="w-2.5 h-2.5 bg-white -mt-1.5 border-r-2 border-b-2 border-white"
                style={{ transform: [{ rotate: '45deg' }] }}
              />
              <div className="bg-slate-800/80 px-2.5 py-0.5 rounded-full mt-1">
                <span className="text-[10px] font-bold text-white">{item.title}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
      {items.length === 0 && (
        <div className="absolute inset-0 items-center justify-center">
          <span className="text-slate-400 font-semibold">目前沒有行程顯示在地圖上</span>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function normalizeClockInput(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '10:00';
  const hh = Math.min(Math.max(0, Number(match[1])), 23);
  const mm = Math.min(Math.max(0, Number(match[2])), 59);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function parseCsvInput(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,，、]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function extractFlightSegments(items: SearchItem[]): string[] {
  const flights = items.filter((item) => item.type === 'flight').slice(0, 4);
  return flights.map((flight) => {
    const title = flight.title;
    const routeMatch = title.match(/^([^()]+)/);
    const route = routeMatch?.[1]?.trim() ?? title;
    const timeMatch = title.match(/(\d{1,2}:\d{2}\s*[-~]\s*\d{1,2}:\d{2})/);
    const time = timeMatch?.[1]?.replace(/\s+/g, ' ') ?? '時間待確認';
    const transferMatch = title.match(/(轉機|轉乘|via\s+[^)\s]+|經[^)\s]+)/i);
    const transfer = transferMatch ? `，${transferMatch[1]}` : '';
    return `${flight.provider} ${route} ${time}${transfer}`;
  });
}

function readCachedItinerary(): ItineraryNode[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(CACHE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ItineraryNode[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
