import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'motion/react';


import { List as ListIcon, Map as MapIcon, Share2, Trash2, Sparkles, Plus, X, Pencil, Save, GripVertical } from 'lucide-react';
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
import { suggestItineraryWithForm } from '../lib/openrouterApi';
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
  const [showPlanner, setShowPlanner] = useState<boolean>(true);

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
    const textToShare = `一起共編「${name}」，點我加入：${deepLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: textToShare,
          url: deepLink,
        });
        showToast('分享成功！');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // fallback to clipboard
          try {
            await navigator.clipboard.writeText(textToShare);
            showToast('已複製連結到剪貼簿。');
          } catch (e) {
            showToast('無法複製分享連結。');
          }
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(textToShare);
        showToast('已複製連結到剪貼簿。');
      } catch (err) {
        showToast('分享未完成，請稍後再試。');
      }
    }
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
    <div className="overflow-x-hidden p-4 md:p-8 md:pb-[90px] xl:px-12 min-h-[100dvh] flex-1 max-w-full lg:max-w-5xl xl:max-w-7xl mx-auto w-full flex flex-col transition-all duration-300">
      {isOffline ? (
        <GlassCard className="mb-4 !p-4 bg-amber-50/80 backdrop-blur-md border border-amber-200 shadow-sm flex flex-row items-center justify-center gap-2">
          <span className="text-amber-700 font-bold text-sm tracking-wide flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            目前離線中，僅供查看喔 📴
          </span>
        </GlassCard>
      ) : null}

      {/* Header — title from API */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-y-6">
        <div className="flex flex-col gap-y-1 w-full md:w-auto">
          <span className="text-[36px] md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-cyan-500 tracking-tight leading-tight">
            {tripInfo?.name ?? '載入中...'}
          </span>
          {tripInfo && (
            <span className="text-sm md:text-base font-bold text-slate-500 tracking-wide mt-1">
              {tripInfo.destination} · {tripInfo.days} 天 · {collaborators.length} 人共編
            </span>
          )}
        </div>
        <div className="flex flex-row items-center bg-white/60 backdrop-blur-md px-3 md:px-4 py-2 rounded-[24px] border border-white shadow-sm ring-1 ring-slate-100/30">
          <div className="flex flex-row items-center mr-1 md:mr-2" style={{ gap: -10 }}>
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
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <button
            onClick={() => void handleShare()}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-fuchsia-400 to-purple-500 hover:opacity-90 active:scale-95 flex items-center justify-center border border-fuchsia-300 ml-2 shadow-sm transition-all"
          >
            <Plus size={20} color="white" strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* View mode + share */}
      <div className="flex flex-col sm:flex-row mb-8 items-stretch gap-3">
        <div className="flex flex-row bg-white/50 backdrop-blur-md p-1.5 rounded-full border border-white/60 shadow-sm ring-1 ring-slate-100/30 w-full sm:w-auto">
          {(['list', 'map'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex flex-1 sm:flex-none flex-row justify-center items-center px-5 py-2.5 rounded-full transition-all duration-300 ${viewMode === mode ? 'bg-white shadow-md shadow-slate-200/50 scale-[1.02]' : 'hover:bg-white/40'}`}
            >
              {mode === 'list'
                ? <ListIcon size={18} strokeWidth={2.5} color={viewMode === mode ? '#d946ef' : '#94a3b8'} />
                : <MapIcon size={18} strokeWidth={2.5} color={viewMode === mode ? '#d946ef' : '#94a3b8'} />
              }
              <span className={`ml-2 font-black tracking-wide text-sm ${viewMode === mode ? 'text-fuchsia-600' : 'text-slate-500'}`}>
                {mode === 'list' ? '列表' : '地圖'}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => void handleShare()}
          className="flex flex-1 sm:flex-none flex-row bg-gradient-to-r from-fuchsia-400 to-pink-500 hover:opacity-90 active:scale-95 rounded-full items-center justify-center sm:ml-auto px-6 py-3 shadow-[0_4px_14px_0_rgb(217,70,239,0.39)] transition-all"
        >
          <Share2 size={18} strokeWidth={2.5} color="white" />
          <span className="ml-2 font-bold tracking-wide text-white text-sm">Share to Social Media</span>
        </button>
      </div>

      {/* Day selector — days from trip API */}
      <div 
        className="mb-8 overflow-x-auto sm:overflow-visible flex sm:flex-wrap pb-3 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 touch-pan-x"
        style={{ gap: 12 }}
      >
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const isActive = selectedDay === day;
          const count = nodes.filter((n: ItineraryNode) => n.day === day).length;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className="relative flex-none group focus:outline-none"
            >
              {isActive && (
                <motion.div
                  layoutId="day-indicator"
                  className="absolute inset-0 rounded-full bg-gradient-to-b from-fuchsia-500 to-purple-600 shadow-md shadow-fuchsia-500/20"
                  transition={{ type: 'spring', bounce: 0.35, duration: 0.5 }}
                />
              )}
              <div className={`px-5 py-2.5 md:px-6 md:py-3 rounded-full items-center justify-center relative z-10 flex flex-row gap-x-2 transition-all duration-300 ${!isActive && 'bg-white/40 border border-white hover:bg-white/60 hover:shadow-sm'}`}>
                <span className={`text-sm md:text-[15px] font-bold tracking-wide transition-colors duration-300 whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-700 group-hover:text-fuchsia-700'}`}>
                  Day {day}
                </span>
                {count > 0
                  ? <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-fuchsia-400'}`} />
                  : <div className="w-1.5 h-1.5 rounded-full bg-transparent border border-slate-300 shrink-0" />
                }
              </div>
            </button>
          );
        })}
      </div>

      <GlassCard className="!p-0 mb-6 transition-all duration-500 border border-slate-100/50">
        <button 
          onClick={() => setShowPlanner(!showPlanner)}
          className="w-full flex flex-row items-center justify-between p-6 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex flex-col items-start gap-y-1">
            <span className="text-[10px] font-black tracking-widest text-fuchsia-500 uppercase">AI Assistant</span>
            <span className="font-black text-xl md:text-2xl text-slate-800 tracking-tight">AI 智能規劃助手</span>
          </div>
          <div className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center transition-transform duration-300 ${showPlanner ? 'rotate-180' : ''}`}>
            <Plus size={18} className={`transition-transform ${showPlanner ? 'rotate-45' : ''}`} />
          </div>
        </button>

        <AnimatePresence>
          {showPlanner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 flex flex-col gap-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">旅遊天數</span>
                    <input
                      value={String(plannerForm.days)}
                      onChange={(e) => setPlannerField('days', Math.max(1, Number(e.target.value) || 1))}
                      placeholder="天數"
                      inputMode="numeric"
                      className="w-full rounded-[20px] shadow-sm border border-slate-100 bg-white px-5 py-4 font-bold text-slate-800 text-[15px] focus:ring-2 focus:ring-fuchsia-400 transition-all outline-none"
                    />
                  </div>
                  <div className="flex-[2] flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">出發日期</span>
                    <input
                      type="date"
                      value={plannerForm.flightDate}
                      onChange={(e) => setPlannerField('flightDate', e.target.value)}
                      className="w-full rounded-[20px] shadow-sm border border-slate-100 bg-white px-5 py-4 font-bold text-slate-800 text-[15px] focus:ring-2 focus:ring-fuchsia-400 transition-all outline-none uppercase"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">出發地</span>
                    <input
                      value={plannerForm.departureFrom}
                      onChange={(e) => setPlannerField('departureFrom', e.target.value.toUpperCase())}
                      placeholder="例: TPE"
                      className="w-full rounded-[20px] shadow-sm border border-slate-100 bg-white px-5 py-4 font-bold text-slate-800 text-[15px] focus:ring-2 focus:ring-fuchsia-400 transition-all outline-none"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">目的地</span>
                    <input
                      value={plannerForm.arrivalTo}
                      onChange={(e) => setPlannerField('arrivalTo', e.target.value.toUpperCase())}
                      placeholder="例: NRT"
                      className="w-full rounded-[20px] shadow-sm border border-slate-100 bg-white px-5 py-4 font-bold text-slate-800 text-[15px] focus:ring-2 focus:ring-fuchsia-400 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">偏好的國家 / 景點 / 美食 / 需求備註</span>
                  <div className="flex flex-col gap-y-3">
                    <input
                      value={plannerForm.countries.join(', ')}
                      onChange={(e) => setPlannerCsvField('countries')(e.target.value)}
                      placeholder="想去的國家（例如：日本, 韓國）"
                      className="rounded-[20px] shadow-sm border border-slate-100 bg-white px-5 py-4 font-bold text-slate-800 text-[15px] focus:ring-2 focus:ring-fuchsia-400 transition-all outline-none"
                    />
                    <input
                      value={plannerForm.mustVisitSpots.join(', ')}
                      onChange={(e) => setPlannerCsvField('mustVisitSpots')(e.target.value)}
                      placeholder="必訪景點（例如：迪士尼, 雷門）"
                      className="rounded-[20px] shadow-sm border border-slate-100 bg-white px-5 py-4 font-bold text-slate-800 text-[15px] focus:ring-2 focus:ring-fuchsia-400 transition-all outline-none"
                    />
                    <input
                      value={plannerForm.mustEatFoods.join(', ')}
                      onChange={(e) => setPlannerCsvField('mustEatFoods')(e.target.value)}
                      placeholder="想吃的美食（例如：和牛, 壽司）"
                      className="rounded-[20px] shadow-sm border border-slate-100 bg-white px-5 py-4 font-bold text-slate-800 text-[15px] focus:ring-2 focus:ring-fuchsia-400 transition-all outline-none"
                    />
                    <textarea
                      value={plannerForm.notes}
                      onChange={(e) => setPlannerField('notes', e.target.value)}
                      placeholder="其他特定需求（例：慢步調、親子同行、一定要逛街）"
                      className="rounded-[24px] shadow-sm border border-slate-100 bg-white px-5 py-4 font-bold text-slate-800 text-[15px] focus:ring-2 focus:ring-fuchsia-400 transition-all outline-none min-h-[100px] resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-y-3">
                  <button
                    onClick={() => void handleAutoFetchFlights()}
                    disabled={flightsLoading || isOffline}
                    className={`rounded-[22px] shadow-sm px-6 py-4.5 flex flex-row items-center justify-center transition-all active:scale-95 ${
                      flightsLoading || isOffline ? 'bg-slate-200 cursor-not-allowed opacity-70' : 'bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-900/10'
                    }`}
                  >
                    <Plus size={18} className="mr-2 text-white" strokeWidth={3.5} />
                    <span className="text-white font-black tracking-wide">
                      {flightsLoading ? '智能抓取數據中...' : '自動獲取推薦航班資料'}
                    </span>
                  </button>
                  
                  {plannerForm.autoFlightSegments.length > 0 && (
                    <div className="rounded-[24px] bg-slate-50 border border-slate-100 p-4 shadow-inner flex flex-col gap-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">偵測到航班片段</span>
                      <div className="flex flex-col gap-2">
                        {plannerForm.autoFlightSegments.map((segment: string) => (
                          <span key={segment} className="text-[13px] font-bold text-slate-600 bg-white rounded-xl px-3 py-2.5 border border-slate-100 shadow-sm leading-relaxed">{segment}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-2 mt-2 flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest pl-3 pt-2">生成精度模式</span>
                  <div className="flex flex-row gap-x-2 p-1">
                    <button
                      onClick={() => setAiGenerateMode('selected_day')}
                      className={`flex-1 rounded-[20px] px-4 py-3.5 transition-all flex flex-col items-center gap-1 ${
                        aiGenerateMode === 'selected_day'
                          ? 'bg-white shadow-md ring-1 ring-slate-100'
                          : 'hover:bg-white/40 text-slate-500'
                      }`}
                    >
                      <span className={`text-[14px] font-black tracking-wide ${aiGenerateMode === 'selected_day' ? 'text-fuchsia-600' : ''}`}>單日重建</span>
                      <span className="text-[9px] text-slate-400 font-bold">僅更新選取的日期</span>
                    </button>
                    <button
                      onClick={() => setAiGenerateMode('overwrite_all')}
                      className={`flex-1 rounded-[20px] px-4 py-3.5 transition-all flex flex-col items-center gap-1 ${
                        aiGenerateMode === 'overwrite_all'
                          ? 'bg-white shadow-md ring-1 ring-rose-100'
                          : 'hover:bg-white/40 text-slate-500'
                      }`}
                    >
                      <span className={`text-[14px] font-black tracking-wide ${aiGenerateMode === 'overwrite_all' ? 'text-rose-500' : ''}`}>全局重建</span>
                      <span className="text-[9px] text-slate-400 font-bold">同步更新完整旅程</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* AI button */}
      <button
        onClick={() => void handleAiSuggest()}
        disabled={aiLoading}
        className={`mb-8 flex-row items-center justify-center rounded-[24px] py-4 px-4 shadow-[0_8px_20px_rgb(0,0,0,0.12)] transition-all active:scale-[0.98] ${aiLoading ? 'bg-fuchsia-300 shadow-none' : 'bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 hover:opacity-90'}`}
      >
        <Sparkles size={20} strokeWidth={2.5} color="white" />
        <span className="ml-2.5 font-black text-white tracking-wide text-lg">
          {aiLoading
            ? '果凍精靈編排中...'
            : aiGenerateMode === 'overwrite_all'
              ? 'AI 生成完整行程'
              : `AI 生成 Day ${selectedDay}`}
        </span>
      </button>

      {tip ? <span className="text-xs font-bold text-slate-500 mb-4 block text-center animate-pulse">{tip}</span> : null}

      {/* Favorites panel — data from /api/favorites */}
      <GlassCard className="!p-5 mb-8">
        <div className="flex-row items-center justify-between mb-5">
          <span className="font-extrabold text-xl text-slate-800 tracking-tight">收藏夾</span>
          <span className="text-[11px] font-bold text-slate-400 tracking-wider">點擊 + 快速加入</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex flex-row gap-3 flex-1">
                {/* Emoji picker trigger */}
                <button
                  onClick={() => setShowEmojiPicker((v: boolean) => !v)}
                  className="w-12 h-12 shrink-0 rounded-2xl bg-white/70 border border-slate-100 flex items-center justify-center shadow-sm"
                >
                  <span className="text-xl">{newSpotEmoji}</span>
                </button>
                <input
                  value={newSpotTitle}
                  onChange={(e) => setNewSpotTitle(e.target.value)}
                  placeholder="新增想去的景點名稱..."
                  className="flex-1 rounded-2xl border border-slate-100 bg-white/80 px-4 py-2.5 font-bold text-slate-700 text-sm focus:ring-2 focus:ring-fuchsia-400 outline-none transition-all"
                  onKeyDown={(e) => { if (e.key === "Enter") { void handleAddFavorite(); } }} />
              </div>
              <button
                onClick={() => void handleAddFavorite()}
                disabled={addingFavorite || !newSpotTitle.trim()}
                className={`h-12 px-6 rounded-2xl flex flex-row items-center justify-center gap-2 transition-all active:scale-95 ${
                  addingFavorite || !newSpotTitle.trim() ? 'bg-purple-100 text-purple-300' : 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                }`}
              >
                <Plus size={20} strokeWidth={3} />
                <span className="font-black">新增收藏</span>
              </button>
            </div>
            {addingFavorite && (
              <span className="text-[11px] font-bold text-purple-500 mt-2 ml-1 flex flex-row items-center animate-pulse">
                <Sparkles size={12} className="mr-1" /> Nominatim 地理編碼中...
              </span>
            )}
            {/* Emoji picker */}
            {showEmojiPicker && (
              <div className="flex flex-row flex-wrap mt-4 p-4 bg-white/60 rounded-3xl border border-white gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { setNewSpotEmoji(emoji); setShowEmojiPicker(false); }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      newSpotEmoji === emoji ? 'bg-purple-100 border border-purple-300 scale-110' : 'bg-white/80 hover:bg-white'
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Timeline / Map */}
      <div className="flex-1 pb-32">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="relative pl-6 mt-4 flex flex-col gap-8"
            >
              {[0, 1, 2].map((i) => <ItinerarySkeletonCard key={i} />)}
            </motion.div>
          ) : viewMode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <ItineraryList
                items={selectedDayNodes}
                day={selectedDay}
                onDelete={handleDeleteNode}
                onUpdate={handleUpdateNode}
                isOffline={isOffline}
                aiLoading={aiLoading}
              />
            </motion.div>
          ) : (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <TokyoMapView items={selectedDayNodes} />
            </motion.div>
          )}
        </AnimatePresence>
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
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white px-3 py-3 md:py-2.5 flex-row items-center shadow-sm hover:shadow-md transition-shadow">
          <span className="text-xl md:text-2xl mr-3 md:mr-2">{spot.emoji}</span>
          <span className="font-bold text-slate-700 flex-1 truncate text-sm md:text-base">{spot.title}</span>
          {spot.lat && spot.lng && (
            <div className="bg-emerald-50 rounded-full px-2 py-0.5 mr-2 border border-emerald-100 shrink-0 hidden sm:flex">
              <span className="text-[9px] font-black text-emerald-600 tracking-wide uppercase">LOCATED</span>
            </div>
          )}
          <div className="flex flex-row items-center gap-1.5 md:gap-1 pl-2 border-l border-slate-100 ml-1">
            <button
              onClick={() => !isOffline && onAdd(spot, selectedDay)}
              disabled={isOffline}
              className={`${isOffline ? 'bg-slate-300' : 'bg-fuchsia-600 hover:bg-fuchsia-700 active:scale-95 shadow-fuchsia-200 shadow-md'} rounded-full w-9 h-9 md:w-8 md:h-8 flex items-center justify-center transition-all`}
            >
              <Plus size={16} color="white" strokeWidth={3} />
            </button>
            <button
              onClick={() => onDelete(spot.id)}
              className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-slate-50 border border-slate-100 hover:bg-red-50 hover:border-red-100 flex items-center justify-center transition-all group"
            >
              <X size={14} className="text-slate-400 group-hover:text-red-500" strokeWidth={3} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Itinerary List ───────────────────────────────────────────────────────────

function ItineraryListItem({
  item,
  idx,
  editingId,
  draft,
  setDraft,
  startEdit,
  saveEdit,
  cancelEdit,
  isOffline,
  onDelete
}: {
  key?: React.Key;
  item: ItineraryNode;
  idx: number;
  editingId: string | null;
  draft: any;
  setDraft: any;
  startEdit: (item: ItineraryNode) => void;
  saveEdit: (item: ItineraryNode) => void;
  cancelEdit: () => void;
  isOffline: boolean;
  onDelete: (id: string) => void;
}) {
  const [isSimulatingDrag, setIsSimulatingDrag] = useState(false);

  return (
    <motion.div
      layout
      initial={{ x: -20, opacity: 0 }}
      animate={{ 
        x: 0, 
        opacity: 1,
        rotate: isSimulatingDrag ? 2 : 0,
        scale: isSimulatingDrag ? 1.02 : 1
      }}
      exit={{ x: 10, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0.4, duration: 0.5, delay: idx * 0.05 }}
      style={{ zIndex: isSimulatingDrag ? 50 : 1 }}
    >
      <div className="relative">
        <div className="absolute left-[-30px] md:left-[-42px] lg:left-[-54px] top-8 md:top-10 w-[20px] h-[20px] md:w-[24px] md:h-[24px] lg:w-[28px] lg:h-[28px] rounded-full bg-white border-[4px] border-fuchsia-500 shadow-lg ring-[4px] ring-fuchsia-50 shadow-fuchsia-200 shrink-0" style={{ zIndex: isSimulatingDrag ? 51 : 10 }} />
        <GlassCard className={`!p-4 sm:!p-6 md:!p-8 lg:!p-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10 hover:-translate-y-1 hover:translate-x-1 transition-all duration-300 ring-1 ring-white/70 border border-white ${isSimulatingDrag ? 'shadow-2xl shadow-purple-500/20 ring-4 ring-purple-300' : 'hover:shadow-[0_45px_110px_-25px_rgba(217,70,239,0.18)]'}`}>
          <div className={`flex flex-col ${editingId === item.node_id ? '' : 'sm:flex-row items-start sm:items-center'} gap-4 sm:gap-6 md:gap-10`}>
            <div className={`flex ${editingId === item.node_id ? 'flex-col' : 'flex-row items-start sm:items-center'} flex-1 min-w-0 gap-3 sm:gap-4 md:gap-6 w-full`}>
              {!isOffline && editingId !== item.node_id && (
                <div 
                  className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-fuchsia-400 p-1 -ml-3 hidden sm:block"
                  onMouseDown={() => setIsSimulatingDrag(true)}
                  onMouseUp={() => setIsSimulatingDrag(false)}
                  onMouseLeave={() => setIsSimulatingDrag(false)}
                  onTouchStart={() => setIsSimulatingDrag(true)}
                  onTouchEnd={() => setIsSimulatingDrag(false)}
                >
                  <GripVertical size={24} />
                </div>
              )}
              
              {editingId !== item.node_id && (
                <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-[24px] md:rounded-[32px] bg-gradient-to-br from-white to-slate-50 flex items-center justify-center shadow-inner border border-white shrink-0 relative group">
                  <div className="absolute inset-0 bg-fuchsia-400 opacity-0 group-hover:opacity-10 transition-opacity rounded-[24px] md:rounded-[32px]" />
                  <span className="text-3xl md:text-5xl lg:text-6xl drop-shadow-sm select-none">{item.emoji}</span>
                </div>
              )}

              {editingId === item.node_id && draft ? (
                <div className="flex-1 flex flex-col gap-4 w-full">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl bg-white shadow-sm p-3 rounded-2xl">{item.emoji}</span>
                    <h3 className="text-lg font-black text-slate-800">編輯行程</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[80px]">
                      <span className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-widest">Day</span>
                      <input
                        value={draft.day}
                        onChange={(e) => setDraft((prev: any) => (prev ? { ...prev, day: e.target.value } : prev))}
                        inputMode="numeric"
                        className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-2.5 text-sm font-black text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-400"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-[2] min-w-[120px]">
                      <span className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-widest">Time</span>
                      <input
                        value={draft.time}
                        onChange={(e) => setDraft((prev: any) => (prev ? { ...prev, time: e.target.value } : prev))}
                        placeholder="例: 10:30"
                        className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-2.5 text-sm font-black text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-400"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-widest">Title</span>
                    <input
                      value={draft.title}
                      onChange={(e) => setDraft((prev: any) => (prev ? { ...prev, title: e.target.value } : prev))}
                      className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-2.5 text-sm font-black text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-widest">Description</span>
                    <textarea
                      value={draft.description}
                      onChange={(e) => setDraft((prev: any) => (prev ? { ...prev, description: e.target.value } : prev))}
                      placeholder="活動詳情..."
                      className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-400 min-h-[60px] resize-none"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-widest">Notes (Private)</span>
                    <textarea
                      value={draft.notes}
                      onChange={(e) => setDraft((prev: any) => (prev ? { ...prev, notes: e.target.value } : prev))}
                      placeholder="私人備註，只有你看得到..."
                      className="w-full rounded-2xl border border-slate-100 bg-amber-50/50 px-4 py-2.5 text-sm font-bold text-amber-800 shadow-sm outline-none focus:ring-2 focus:ring-amber-400 min-h-[60px] resize-none"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 pl-1 tracking-widest">Category</span>
                    <div className="flex flex-row overflow-x-auto gap-2 py-1 scrollbar-hide pb-2">
                      {CATEGORY_OPTIONS.map((option) => {
                        const optionMeta = getCategoryMeta(option);
                        const active = draft.category === option;
                        return (
                          <button
                            key={option}
                            title={optionMeta.label}
                            onClick={() =>
                              setDraft((prev: any) =>
                                prev ? { ...prev, category: option, emoji: optionMeta.icon } : prev,
                              )
                            }
                            className={`flex-none px-4 py-2 rounded-full border transition-all text-xs font-bold ${
                              active ? 'bg-fuchsia-600 border-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30' : 'bg-white/80 border-slate-100 text-slate-500 hover:bg-white'
                            }`}
                          >
                            {optionMeta.icon} {optionMeta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-row gap-3 pt-2">
                    <button
                      onClick={() => saveEdit(item)}
                      className="flex-1 bg-slate-900 py-3.5 rounded-2xl shadow-lg active:scale-[0.98] transition-all"
                    >
                      <span className="text-white font-black text-[13px] tracking-wide">儲存變更</span>
                    </button>
                    <button
                      onClick={() => cancelEdit()}
                      className="flex-1 bg-slate-50 py-3.5 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.98] transition-all"
                    >
                      <span className="text-slate-500 font-bold text-[13px] tracking-wide">取消</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-y-1.5 md:gap-y-2 overflow-hidden">
                  <div className="flex flex-row flex-wrap items-center gap-2">
                    <span className="text-xs md:text-[14px] font-black text-fuchsia-600 tracking-widest font-mono bg-fuchsia-50/50 px-2.5 py-1 rounded-lg border border-fuchsia-100/50">
                      {item.time || '--:--'}
                    </span>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-wider ${
                      item.category === 'flight' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                      item.category === 'food' ? 'bg-orange-50 text-orange-500 border border-orange-100' :
                      'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      {getCategoryMeta(item.category).label}
                    </div>
                    {item.source === 'local' && (
                       <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter bg-emerald-50/50 px-1.5 py-0.5 rounded-md border border-emerald-100/50">SYNCED</span>
                    )}
                  </div>
                  <span className="text-xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight line-clamp-2 md:line-clamp-1">
                    {item.title}
                  </span>
                  {item.description && (
                    <div className="text-sm md:text-base text-slate-600 font-medium leading-relaxed mt-1 whitespace-pre-wrap">
                      {item.description}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-sm md:text-base text-amber-700 bg-amber-50/50 p-3 rounded-xl border border-amber-100 font-medium leading-relaxed mt-2 whitespace-pre-wrap flex flex-row items-start gap-2">
                      <span className="text-amber-500 shrink-0">📝</span>
                      <span>{item.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {editingId !== item.node_id && !isOffline && (
              <div className="flex flex-row lg:flex-col gap-4 w-full lg:w-auto pt-6 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100/50 pl-0 lg:pl-10 justify-end lg:justify-center shrink-0">
                <button
                  onClick={() => startEdit(item)}
                  className="flex-1 lg:flex-none w-full lg:w-16 h-14 lg:h-16 rounded-[22px] bg-white border border-slate-100 shadow-sm flex items-center justify-center hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 group"
                  title="編輯行程"
                >
                  <Pencil size={20} className="text-slate-400 group-hover:text-fuchsia-600 transition-colors" strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => onDelete(item.node_id)}
                  className="flex-1 lg:flex-none w-full lg:w-16 h-14 lg:h-16 rounded-[22px] bg-white border border-slate-100 shadow-sm flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-95 group"
                  title="刪除"
                >
                  <Trash2 size={20} className="text-slate-400 group-hover:text-rose-500 transition-colors" strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}

function ItineraryList({
  items,
  day,
  onDelete,
  onUpdate,
  isOffline,
  aiLoading,
}: {
  items: ItineraryNode[];
  day: number;
  onDelete: (node_id: string) => void;
  onUpdate: (node: ItineraryNode) => void;
  isOffline: boolean;
  aiLoading: boolean;
}) {
  type EditDraft = { day: string; time: string; title: string; emoji: string; category: string; description: string; notes: string };

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
      description: item.description || '',
      notes: item.notes || '',
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
      description: draft.description.trim() || undefined,
      notes: draft.notes.trim() || undefined,
      source: 'local',
    };
    onUpdate(nextNode);
    setEditingId(null);
    setDraft(null);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <span className="text-5xl mb-4">🗒️</span>
        <span className="text-slate-600 font-black text-xl tracking-tight">Day {day} 還沒有行程</span>
        <span className="text-slate-400 text-sm mt-2 max-w-[240px] leading-relaxed">試著從收藏夾拖曳景點，或讓 AI 幫你智能編排！</span>
      </div>
    );
  }

  return (
    <div className="relative pl-[40px] md:pl-[60px] lg:pl-[80px] mt-8 pb-32 flex flex-col gap-y-6 md:gap-y-10 lg:gap-y-12">
      <div className="absolute left-[18px] md:left-[27px] lg:left-[37px] top-4 bottom-20 w-[4px] md:w-[6px] bg-gradient-to-b from-fuchsia-400 via-purple-300/40 to-transparent rounded-full shadow-[0_0_15px_rgba(217,70,239,0.2)]" />
      <AnimatePresence>
        {aiLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <motion.div
              key={`skeleton-${idx}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 10, opacity: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="relative">
                <div className="absolute left-[-30px] md:left-[-42px] lg:left-[-54px] top-8 md:top-10 w-[20px] h-[20px] md:w-[24px] md:h-[24px] lg:w-[28px] lg:h-[28px] rounded-full bg-slate-200 border-[4px] border-white z-10 shadow-lg animate-pulse" />
                <GlassCard className="!p-4 sm:!p-6 md:!p-8 lg:!p-10 mb-4 sm:mb-6 md:mb-8 lg:mb-10 animate-pulse ring-1 ring-white/70 border border-white">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 md:gap-10">
                    <div className="flex flex-row items-start md:items-center flex-1 gap-4 md:gap-6 w-full">
                      <div className="w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-[24px] md:rounded-[32px] bg-slate-200 shrink-0" />
                      <div className="flex-1 flex flex-col gap-3 min-w-0 py-2">
                        <div className="w-16 h-4 bg-slate-200 rounded-full" />
                        <div className="w-3/4 h-8 md:h-10 bg-slate-200 rounded-xl" />
                        <div className="w-1/2 h-4 bg-slate-200 rounded-full" />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          ))
        ) : (
        items.map((item, idx) => (
          <ItineraryListItem
            key={item.node_id}
            item={item}
            idx={idx}
            editingId={editingId}
            draft={draft}
            setDraft={setDraft}
            startEdit={startEdit}
            saveEdit={saveEdit}
            cancelEdit={cancelEdit}
            isOffline={isOffline}
            onDelete={onDelete}
          />
        )))}
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
            initial={{ scale: 0, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: index * 0.12, type: 'spring', bounce: 0.5, mass: 0.8 }}
            style={{
              position: 'absolute',
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="flex flex-col items-center">
              <div className="bg-white/95 rounded-2xl px-2.5 py-2 border-2 border-white flex flex-col items-center shadow-lg">
                <span className="text-2xl">{item.emoji}</span>
              </div>
              <div
                className="w-2.5 h-2.5 bg-white -mt-1.5 border-r-2 border-b-2 border-white rotate-45"
              />
              <div className="bg-slate-800/80 px-2.5 py-0.5 rounded-full mt-1">
                <span className="text-[10px] font-bold text-white whitespace-nowrap">{item.title}</span>
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
