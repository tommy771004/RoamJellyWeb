import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls, type PanInfo } from 'motion/react';


import { 
  List as ListIcon, 
  Map as MapIcon, 
  Share2, 
  Trash2, 
  Sparkles, 
  Plus, 
  X, 
  Pencil, 
  Save, 
  GripVertical, 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  Navigation2, 
  RefreshCw,
  MapPin,
  ArrowDownUp,
  Check
} from 'lucide-react';
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
  updateTripFact,
  regenerateItinerarySpot,
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

import AiForm, { AiFormData } from './AiForm';

function getDynamicMapPercent(nodes: any[], lat: number, lng: number) {
  if (!lat || !lng || nodes.length === 0) return { x: 50, y: 50 };

  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  let hasValidCoords = false;
  nodes.forEach(n => {
    if (n.lat && n.lng) {
      hasValidCoords = true;
      if (n.lat < minLat) minLat = n.lat;
      if (n.lat > maxLat) maxLat = n.lat;
      if (n.lng < minLng) minLng = n.lng;
      if (n.lng > maxLng) maxLng = n.lng;
    }
  });

  if (!hasValidCoords) return { x: 50, y: 50 };

  // Adding padding
  const latDiff = maxLat - minLat || 0.01;
  const lngDiff = maxLng - minLng || 0.01;

  const paddedMinLat = minLat - latDiff * 0.2;
  const paddedMaxLat = maxLat + latDiff * 0.2;
  const paddedMinLng = minLng - lngDiff * 0.2;
  const paddedMaxLng = maxLng + lngDiff * 0.2;

  const x = ((lng - paddedMinLng) / (paddedMaxLng - paddedMinLng)) * 100;
  // y is inverted because maps usually have origin at bottom (lower lat), but visually top is y=0
  const y = ((paddedMaxLat - lat) / (paddedMaxLat - paddedMinLat)) * 100;

  return { 
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y))
  };
}

const EMOJI_OPTIONS = ['🏯', '🗼', '🌸', '🍣', '🍜', '🎌', '⛩️', '🏔️', '🛍️', '🎡', '🌿', '🏖️'];
type AiGenerateMode = 'selected_day' | 'overwrite_all' | 'generate_for_selected_days';

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
    departureFrom: '台北',
    arrivalTo: destination,
    flightDate: '2026-06-15',
    countries: [],
    mustVisitSpots: [],
    mustEatFoods: [],
    autoFlightSegments: [],
    notes: '',
    travelFactsContext: '',
  };
}

export function assignDaysBasedOnTimeAndOrder(nodes: any[], startDateStr?: string): ItineraryNode[] {
  let currentDay = 1;
  let lastTimeMinutes = -1;

  const baseDate = startDateStr ? new Date(startDateStr) : new Date();
  if (isNaN(baseDate.getTime())) {
    baseDate.setTime(Date.now());
  }

  return nodes.map((n) => {
    const node: ItineraryNode = {
      node_id: n.node_id || n.id || `node_${Date.now()}_${Math.random()}`,
      day: 1, // Will be overridden
      time: n.time || '10:00',
      title: n.title || n.location || '未命名行程',
      emoji: n.emoji || n.icon || '📍',
      category: n.category || 'other',
      source: n.source || 'remote',
      lat: n.lat,
      lng: n.lng,
    };

    if (n.day != null) {
      currentDay = n.day;
    } else {
      const timeParts = String(node.time).split(":");
      const hours = parseInt(timeParts[0] || "10", 10);
      const mins = parseInt(timeParts[1] || "0", 10);
      const timeMinutes = hours * 60 + mins;

      if (lastTimeMinutes !== -1 && timeMinutes < lastTimeMinutes) {
        currentDay++;
      }
      lastTimeMinutes = timeMinutes;
    }

    node.day = currentDay;

    // Calculate timestamp
    const nodeDate = new Date(baseDate);
    nodeDate.setDate(nodeDate.getDate() + (node.day - 1));
    const timeParts2 = String(node.time).split(":");
    const hours = parseInt(timeParts2[0] || "10", 10);
    const mins = parseInt(timeParts2[1] || "0", 10);
    
    const yyyy = nodeDate.getFullYear();
    const mm = String(nodeDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nodeDate.getDate()).padStart(2, '0');
    const hh = String(hours).padStart(2, '0');
    const mn = String(mins).padStart(2, '0');
    
    node.timestamp = `${yyyy}-${mm}-${dd}T${hh}:${mn}:00Z`;

    return node;
  });
}

export default function ItineraryTab() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [tip, setTip] = useState('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);

  // Project List states
  const [userTrips, setUserTrips] = useState<any[]>([]);
  const [isTripsLoading, setIsTripsLoading] = useState<boolean>(false);
  const [showCreateTrip, setShowCreateTrip] = useState<boolean>(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripDest, setNewTripDest] = useState('');

  // Trip & favorites
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [favorites, setFavorites] = useState<FavoriteSpot[]>([]);
  const [newSpotTitle, setNewSpotTitle] = useState('');
  const [newSpotEmoji, setNewSpotEmoji] = useState('📍');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [addingFavorite, setAddingFavorite] = useState<boolean>(false);
  const [plannerForm, setPlannerForm] = useState<ItineraryPlannerForm>(buildDefaultPlannerForm('', 5));
  const [flightsLoading, setFlightsLoading] = useState<boolean>(false);
  const [aiGenerateMode, setAiGenerateMode] = useState<AiGenerateMode>('selected_day');
  const [rangeStartDay, setRangeStartDay] = useState<number>(1);
  const [rangeEndDay, setRangeEndDay] = useState<number>(3);
  const [showPlanner, setShowPlanner] = useState<boolean>(false);
  const [isPlanningNew, setIsPlanningNew] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);

  const { nodes, setNodes, addNode, updateNode, removeNode, collaborators, setCollaborators, isOffline, setOffline } =
    useItineraryStore();
  const { showToast, activeTripId, setActiveTripId } = useAppStore();

  const handleAiFormSubmit = async (formData: AiFormData) => {
    setAiLoading(true);
    let currentTripId = activeTripId;

    try {
      // Step 1: If no active trip, create a new one first
      if (!currentTripId) {
        const { createTrip } = await import('../lib/workflowApi');
        const newTrip = await createTrip({ 
          name: `${formData.destination} ${formData.vibes[0] || ''} 探索之旅`, 
          destination: formData.destination 
        });
        currentTripId = newTrip.id;
        setActiveTripId(currentTripId);
      }

      setIsPlanningNew(false);
      
      const suggestRequest = {
        days: formData.days,
        departureFrom: formData.departure || '台北',
        arrivalTo: formData.destination,
        flightDate: '2026-06-15',
        countries: [formData.destination],
        mustVisitSpots: formData.interests,
        mustEatFoods: [],
        autoFlightSegments: [],
        notes: `旅伴: ${formData.companions}, 氛圍: ${formData.vibes.join(',')}, 飲食: ${formData.dietary.join(',')}`,
        travelFactsContext: '',
      };
      
      let suggestionsRaw = await suggestItineraryWithForm({ 
        destination: formData.destination, 
        planner: suggestRequest 
      });

      let rawNodes: ItineraryNode[] = [];
      if (Array.isArray(suggestionsRaw)) {
        rawNodes = suggestionsRaw;
      } else if (suggestionsRaw && suggestionsRaw.itinerary && Array.isArray(suggestionsRaw.itinerary)) {
        suggestionsRaw.itinerary.forEach((dayData: any) => {
          if (Array.isArray(dayData.spots)) {
            dayData.spots.forEach((spot: any, i: number) => {
              rawNodes.push({
                node_id: `ai_${Date.now()}_${dayData.day}_${i}`,
                day: dayData.day || 1,
                time: spot.time || '10:00',
                title: spot.name || spot.title || '景點',
                emoji: spot.emoji || '📍',
                category: spot.category || 'other',
                description: spot.ai_note || '',
                lat: spot.lat,
                lng: spot.lng,
                source: 'local' as const,
              });
            });
          }
        });
      }

      // If we had nodes before, clear them (relevant for existing trip)
      await removeNodesBatch([...nodes]);
      
      const finalNodes = assignDaysBasedOnTimeAndOrder(rawNodes, plannerForm.flightDate);

      for (const node of finalNodes) {
        const normalized = withAutoCategoryIcon(node);
        addNode(normalized);
        const payload: SyncItineraryPayload = { trip_id: currentTripId, action: 'add_node', payload: normalized };
        socketRef.current?.emit('sync_itinerary', payload);
        void syncItinerary(payload);
      }
      
      showToast(activeTripId ? 'AI 行程已更新！' : '成功建立新專案並生成 AI 行程！', 'success');
    } catch (err) {
      showToast('AI 規劃失敗，請檢查系統設定');
    } finally {
      setAiLoading(false);
    }
  };

  const handleReorder = (newOrder: ItineraryNode[]) => {
    // Merge new order for current day back into the main nodes array
    const otherDaysNodes = nodes.filter(n => n.day !== selectedDay);
    setNodes([...otherDaysNodes, ...newOrder]);
  };

  const handleManualAddNode = (node: Partial<ItineraryNode>) => {
    if (!activeTripId) return;
    const newNode: ItineraryNode = {
      node_id: `node_manual_${Date.now()}`,
      day: selectedDay,
      time: node.time || '10:00',
      title: node.title || '新行程',
      emoji: node.emoji || '📍',
      category: node.category || 'other',
      source: 'local',
      lat: node.lat,
      lng: node.lng,
      description: node.description,
    };
    const normalized = withAutoCategoryIcon(newNode);
    addNode(normalized);
    const payload: SyncItineraryPayload = { trip_id: activeTripId, action: 'add_node', payload: normalized };
    socketRef.current?.emit('sync_itinerary', payload);
    void syncItinerary(payload);
    showToast(`✨ 已新增：${normalized.title}`);
  };

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

  const [weatherData, setWeatherData] = useState<any[]>([]);

  // Fetch projects list if no activeTripId
  const loadUserTrips = async () => {
    setIsTripsLoading(true);
    try {
      const { fetchUserTrips } = await import('../lib/workflowApi');
      const trips = await fetchUserTrips();
      setUserTrips(trips);
    } catch (e) {
      showToast('無法載入我的行程列表');
    } finally {
      setIsTripsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeTripId) {
      void loadUserTrips();
    }
  }, [activeTripId]);

  // Initial data load when activeTripId changes
  useEffect(() => {
    const init = async () => {
      if (!activeTripId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [tripResult, favResult, collabResult, itineraryResult] = await Promise.all([
          fetchTripInfo(activeTripId),
          fetchFavorites(activeTripId),
          fetchCollaborators(activeTripId),
          !isOffline ? fetchItinerary(activeTripId) : Promise.resolve(readCachedItinerary(activeTripId)),
        ]);
        setTripInfo(tripResult);
        setPlannerForm(buildDefaultPlannerForm(tripResult.destination, tripResult.days));
        setFavorites(favResult);
        setCollaborators(collabResult);
        setNodes(assignDaysBasedOnTimeAndOrder(itineraryResult, tripResult.startDate || '2026-06-15'));
        
        // Fetch weather
        try {
          const wRes = await fetch(`/api/weather?lat=35.6762&lng=139.6503`); 
          const wData = await wRes.json();
          if (wData && wData.daily) {
            setWeatherData(wData.daily);
          }
        } catch (e) {}
      } catch {
        const cached = readCachedItinerary(activeTripId);
        setNodes(assignDaysBasedOnTimeAndOrder(cached, '2026-06-15'));
        setTip('同步服務暫時不可用，先顯示最近的離線內容。');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [isOffline, setCollaborators, setNodes, activeTripId]);

  // Socket.io real-time sync
  useEffect(() => {
    if (isOffline || !activeTripId) return;

    let mounted = true;

    void (async () => {
      const token = await ensureClientAccessToken();
      if (!mounted) return;

      const socket = io('/', {
        transports: ['websocket', 'polling'],
        auth: token ? { token: `Bearer ${token}` } : undefined,
      });

      socket.on('connect', () => {
        socket.emit('join_room', { trip_id: activeTripId });
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
  }, [isOffline, addNode, removeNode, activeTripId]);

  const selectedDayNodes = useMemo(
    () =>
      nodes
        .filter((node: ItineraryNode) => node.day === selectedDay)
        .map((node: ItineraryNode) => withAutoCategoryIcon(node)),
    [nodes, selectedDay],
  );

  const maxNodeDay = useMemo(() => Math.max(1, ...nodes.map((node: ItineraryNode) => node.day)), [nodes]);
  const totalDays = Math.max(tripInfo?.days ?? 1, plannerForm.days, maxNodeDay);

  useEffect(() => {
    if (selectedDay > totalDays) {
      setSelectedDay(totalDays);
    }
  }, [selectedDay, totalDays]);

  const handleCreateTrip = async () => {
    if (!newTripName || !newTripDest) return;
    try {
      const { createTrip } = await import('../lib/workflowApi');
      const newTrip = await createTrip({ name: newTripName, destination: newTripDest });
      showToast('成功建立新旅程！', 'success');
      setNewTripName('');
      setNewTripDest('');
      setShowCreateTrip(false);
      setActiveTripId(newTrip.id);
    } catch (e) {
      showToast('建立行程失敗，請稍後再試');
    }
  };

  const handleBackToTrips = () => {
    setActiveTripId('');
    setNodes([]);
    setTripInfo(null);
  };

  const setPlannerField = <K extends keyof ItineraryPlannerForm>(key: K, value: ItineraryPlannerForm[K]) => {
    setPlannerForm((prev: ItineraryPlannerForm) => ({ ...prev, [key]: value }));
  };

  const setPlannerCsvField =
    (key: 'countries' | 'mustVisitSpots' | 'mustEatFoods') =>
      (text: string) => setPlannerField(key, parseCsvInput(text));

  const handleShare = async () => {
    if (!activeTripId) {
      showToast('缺少行程 ID，無法分享旅程');
      return;
    }
    const deepLink = `${window.location.origin}/trip/${activeTripId}`;
    const name = tripInfo?.name ?? '我的旅程';
    const textToShare = `一起共編「${name}」，點我加入：${deepLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: `跟我一起在 RoamJelly 規劃旅程：${name}`,
          url: deepLink,
        });
        showToast('分享成功！');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // fallback to clipboard
          try {
            await navigator.clipboard.writeText(deepLink);
            showToast('已複製分享連結到剪貼簿。');
          } catch (e) {
            showToast('無法複製分享連結。');
          }
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(deepLink);
        showToast('已複製分享連結到剪貼簿。');
      } catch (err) {
        showToast('分享未完成，請稍後再試。');
      }
    }
  };

  // Add a favorite spot from the DB to the selected day's timeline
  const addSpotToDay = (spot: FavoriteSpot, day: number) => {
    if (isOffline || !activeTripId) return;

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

    const payload: SyncItineraryPayload = { trip_id: activeTripId, action: 'add_node', payload: normalized };
    socketRef.current?.emit('sync_itinerary', payload);
    void syncItinerary(payload).catch(() => {
      setTip('行程同步暫時失敗，稍後會再嘗試。');
      setTimeout(() => setTip(''), 2000);
    });

    showToast(`${normalized.emoji} ${spot.title} 已加入 Day ${day}！`);
  };

  // Add a new custom favorite (geocoded by backend via Nominatim)
  const handleAddFavorite = async () => {
    if (!newSpotTitle.trim() || isOffline || !activeTripId) return;
    setAddingFavorite(true);
    try {
      const spot = await addFavorite(activeTripId, newSpotTitle.trim(), newSpotEmoji);
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
        trip_id: activeTripId,
        action: 'remove_node',
        payload: { node_id } as ItineraryNode,
      });
    } catch {
      showToast('刪除失敗，請稍後再試。');
    }
  };

  const handleUpdateNode = async (node: ItineraryNode) => {
    if (isOffline || !activeTripId) return;
    const normalized = withAutoCategoryIcon(node);
    updateNode(normalized);
    const payload: SyncItineraryPayload = { trip_id: activeTripId, action: 'add_node', payload: normalized };
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
    if (!activeTripId) { showToast('缺少行程 ID，無法生成行程'); return; }
    setAiLoading(true);
    try {
      const destination = tripInfo?.destination || '您的目的地';
      const plannerForSuggest = { ...plannerForm };
      
      if (aiGenerateMode === 'selected_day') {
        plannerForSuggest.days = 1;
      } else if (aiGenerateMode === 'generate_for_selected_days') {
        plannerForSuggest.days = Math.max(1, rangeEndDay - rangeStartDay + 1);
      } else if (aiGenerateMode === 'overwrite_all') {
        plannerForSuggest.days = Math.max(totalDays, 1);
      }
      
      const suggestions = await suggestItineraryWithForm({
        destination,
        planner: plannerForSuggest,
        aiMode: {
          mode: aiGenerateMode,
          rangeStartDay,
          rangeEndDay,
          selectedDay
        }
      });

      let generatedFlatNodes: ItineraryNode[] = [];
      if (suggestions && suggestions.itinerary) {
        suggestions.itinerary.forEach((dayData: any) => {
          if (dayData.spots) {
             dayData.spots.forEach((spot: any, i: number) => {
               generatedFlatNodes.push({
                 node_id: `ai_${Date.now()}_${dayData.day}_${i}`,
                 day: dayData.day || 1,
                 time: spot.time || "10:00",
                 title: String(spot.name || spot.title || '景點'),
                 emoji: spot.emoji || '📍',
                 category: spot.category || 'other',
                 description: spot.ai_note || '',
                 lat: spot.lat,
                 lng: spot.lng,
                 source: 'local' as const,
               });
             });
          }
        });
      } else if (Array.isArray(suggestions)) {
        generatedFlatNodes = suggestions;
      }

      let finalNodes: ItineraryNode[] = generatedFlatNodes;

      if (aiGenerateMode === 'overwrite_all') {
        await removeNodesBatch([...nodes]);
        finalNodes = assignDaysBasedOnTimeAndOrder(generatedFlatNodes, plannerForm.flightDate);
      } else if (aiGenerateMode === 'generate_for_selected_days') {
        const daysToRemove = Array.from({ length: rangeEndDay - rangeStartDay + 1 }, (_, i) => rangeStartDay + i);
        const currentMultiDayNodes = nodes.filter((node: ItineraryNode) => daysToRemove.includes(node.day));
        await removeNodesBatch(currentMultiDayNodes);
        
        let targetDay = rangeStartDay;
        // Assign continuous nodes intelligently across the selected range
        finalNodes = assignDaysBasedOnTimeAndOrder(generatedFlatNodes, plannerForm.flightDate).map(node => {
          let nDay = node.day - 1 + rangeStartDay; // if assignDays starts at 1
          if (nDay > rangeEndDay) nDay = rangeEndDay;
          return { ...node, day: nDay };
        });
      } else {
        const currentDayNodes = nodes.filter((node: ItineraryNode) => node.day === selectedDay);
        await removeNodesBatch(currentDayNodes);
        finalNodes = generatedFlatNodes.map((node) => ({ ...node, day: selectedDay }));
      }

      for (const node of finalNodes) {
        const normalized = withAutoCategoryIcon(node);
        addNode(normalized);
        const payload: SyncItineraryPayload = { trip_id: activeTripId, action: 'add_node', payload: normalized };
        socketRef.current?.emit('sync_itinerary', payload);
        void syncItinerary(payload);
      }

      if (aiGenerateMode === 'overwrite_all') {
        showToast(`✨ 已一鍵覆蓋行程，共 ${finalNodes.length} 個新節點`);
      } else if (aiGenerateMode === 'generate_for_selected_days') {
        showToast(`✨ 已重建 Day ${rangeStartDay} ~ ${rangeEndDay}，共 ${finalNodes.length} 個新節點`);
      } else {
        showToast(`✨ 已重建 Day ${selectedDay}，共 ${finalNodes.length} 個節點`);
      }
    } catch {
      showToast('AI 規劃失敗，請確認 OpenRouter API Key 是否設定。');
    } finally {
      setAiLoading(false);
    }
  };

  if (!activeTripId) {
    if (isPlanningNew) {
      return (
        <div className="flex-1 flex flex-col pt-8 sm:pt-12 bg-[#fcfdff] min-h-screen overflow-y-auto scroll-smooth">
          <div className="max-w-4xl mx-auto w-full px-4">
            <button 
              onClick={() => setIsPlanningNew(false)}
              className="mb-8 px-4 py-2 rounded-xl bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all"
            >
              <ArrowLeft size={14} />
              返回清單
            </button>
            <AiForm onSubmit={handleAiFormSubmit} />
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 w-full overflow-y-auto scroll-smooth bg-[#fcfdff] selection:bg-pink-100">
        <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 mt-10 font-sans pb-32 animate-in fade-in duration-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-2 tracking-tight">行程手帳專案</h1>
              <p className="text-slate-400 font-bold">請選擇一個現有行程專案，或由 AI 啟動規劃 🌍</p>
            </div>
          </div>

        {/* AI Planning Entry Hero */}
        <div className="mb-16">
          <motion.div 
            whileHover={{ scale: 1.02, y: -8 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            onClick={() => setIsPlanningNew(true)}
            className="cursor-pointer group relative overflow-hidden rounded-[40px] p-1 shadow-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500"
          >
            <div className="bg-white rounded-[38px] p-10 md:p-12 h-full flex flex-col md:flex-row items-center gap-10">
               <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                     <span className="bg-fuchsia-100 text-fuchsia-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Powered by AI</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-800 mb-6 leading-tight tracking-tight">準備好探索下一個目的地了嗎？</h2>
                  <p className="text-slate-500 font-bold text-xl mb-10 leading-relaxed max-w-2xl">
                    輸入想去的地方與偏好，讓 RoamJelly AI 為您量身打造專屬行程手帳，並立即啟動即時共編。
                  </p>
                  <button className="px-10 py-5 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest flex items-center gap-3 group-hover:bg-slate-800 transition-all shadow-xl">
                    <Sparkles size={20} />
                    開始智慧 AI 規劃
                  </button>
               </div>
               <div className="w-full md:w-1/3 flex justify-center">
                  <div className="relative">
                    <div className="w-48 h-48 bg-fuchsia-100 rounded-[48px] rotate-12 absolute -inset-2 opacity-50 blur-2xl animate-pulse" />
                    <div className="w-48 h-48 bg-white border-4 border-slate-50 rounded-[48px] shadow-xl flex items-center justify-center text-6xl relative z-10">
                      🧗
                    </div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-3 mb-8">
           <div className="h-px flex-1 bg-slate-100" />
           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4">我的行程歷史</span>
           <div className="h-px flex-1 bg-slate-100" />
        </div>

        {isTripsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[200px] bg-slate-100 animate-pulse rounded-[32px]" />
            ))}
          </div>
        ) : userTrips.length === 0 ? (
           <div className="flex flex-col items-center justify-center min-h-[30vh] group">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                <Navigation2 className="text-slate-200" size={32} />
              </div>
              <p className="text-slate-400 font-bold">目前還沒有行程專案</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userTrips.map((trip) => (
              <motion.div
                key={trip.id}
                whileHover={{ scale: 1.05, y: -12 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                onClick={() => setActiveTripId(trip.id)}
                className="cursor-pointer group"
              >
                <GlassCard className="!p-0 overflow-hidden rounded-[32px] border border-white/60 shadow-lg hover:shadow-2xl transition-all h-full flex flex-col">
                   <div className="h-40 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                      <img 
                        src={`https://source.unsplash.com/featured/?${trip.destination}`}
                        alt={trip.destination}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=800&auto=format&fit=crop';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-6">
                         <span className="text-white/80 text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-white/20 backdrop-blur-md rounded-md">
                           {trip.days} DAYS
                         </span>
                      </div>
                   </div>
                   <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-2xl font-black text-slate-800 mb-1 group-hover:text-pink-500 transition-colors uppercase tracking-tight">{trip.name}</h3>
                      <p className="text-slate-400 font-bold text-sm mb-4 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">location_on</span>
                        {trip.destination}
                      </p>
                      <div className="mt-auto flex items-center justify-between">
                         <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-pink-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-pink-600">ME</div>
                         </div>
                         <ArrowRight className="text-slate-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" size={20} />
                      </div>
                   </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col pt-8 sm:pt-12 items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-pink-400 mb-4" size={32} />
        <p className="text-slate-400 font-bold">載入行程中...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 w-full overflow-y-auto selection:bg-pink-100 animate-in fade-in duration-700 scroll-smooth">
      <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 mt-6 pb-32">
        {isOffline && (
          <div className="mb-6 glass-card rounded-2xl p-4 bg-amber-50/80 border-amber-200 shadow-sm flex items-center justify-center gap-2">
            <span className="text-amber-700 font-bold text-sm tracking-wide flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              目前離線中，僅供查看喔 📴
            </span>
          </div>
        )}

      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="group">
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={handleBackToTrips}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-black text-slate-500 transition-colors uppercase tracking-widest flex items-center gap-1"
            >
              <ArrowLeft size={12} />
              返回專案列表
            </button>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-2 flex items-center gap-3 font-serif tracking-tight leading-tight">
            <div className="flex items-center gap-3">
              {tripInfo?.name || tripInfo?.destination || '未命名目的地'} <span className="text-3xl md:text-4xl animate-bounce group-hover:scale-125 transition-transform">✨</span>
            </div>
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-slate-500 font-bold text-[15px]">
             <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-pink-400">calendar_month</span>
                <span>{tripInfo?.startDate && tripInfo?.endDate ? `${tripInfo.startDate} - ${tripInfo.endDate} • ` : null}{totalDays} 天</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-pink-400">group</span>
                <span>{collaborators.length} 位旅行者</span>
             </div>
          </div>
        </div>
        
        <div className="flex gap-2 p-1.5 glass-card rounded-full w-full md:w-auto overflow-x-auto no-scrollbar shadow-lg border border-white/60">
          <button 
            onClick={() => setViewMode('list')}
            className={`px-8 py-3 rounded-full font-black text-sm tracking-widest uppercase transition-all whitespace-nowrap ${viewMode === 'list' ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-xl shadow-pink-200/50' : 'text-slate-400 hover:text-pink-500 hover:bg-white/40'}`}
          >
            LIST
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`px-8 py-3 rounded-full font-black text-sm tracking-widest uppercase transition-all whitespace-nowrap ${viewMode === 'map' ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-xl shadow-pink-200/50' : 'text-slate-400 hover:text-pink-500 hover:bg-white/40'}`}
          >
            EXPLORE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Filters & Info */}
        <aside className="hidden lg:flex lg:col-span-1 flex-col gap-6 sticky top-24 h-fit">
          <GlassCard className="!p-6 shadow-sm ring-1 ring-slate-100/50">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-5 flex items-center gap-2">
              <span>旅程天數</span> <span className="text-lg">📅</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const isActive = selectedDay === day;
                const count = nodes.filter((n: ItineraryNode) => n.day === day).length;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-4 py-3.5 rounded-2xl font-black text-sm transition-all flex flex-col items-center gap-1 border ${
                      isActive 
                        ? 'bg-pink-50 text-pink-600 border-pink-200 shadow-inner' 
                        : 'bg-white/60 text-slate-400 border-white hover:bg-white hover:text-pink-400'
                    }`}
                  >
                    <span>DAY {day}</span>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">{count} SPOTS</span>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Collaborators with presence */}
          <GlassCard className="!p-6">
             <div className="flex items-center justify-between mb-5">
                <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">目前在線</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase">LIVE</span>
                </div>
             </div>
             <div className="flex flex-row items-center">
                {collaborators.map((c, i) => (
                  <CollaboratorAvatar key={c.id} collaborator={c} index={i} isOnline={true} />
                ))}
             </div>
          </GlassCard>

          {/* Favorites List - Desktop */}
          <GlassCard className="!p-6">
             <div className="flex items-center justify-between mb-5">
                <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">口袋名單</span>
                <span className="text-[10px] font-bold text-pink-400">點擊 + 加入</span>
             </div>
             <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1 -mr-1">
                {favorites.map((spot: FavoriteSpot) => (
                  <DraggableFavoriteSpot
                    key={spot.id}
                    spot={spot}
                    selectedDay={selectedDay}
                    isOffline={isOffline}
                    onAdd={addSpotToDay}
                    onDelete={handleDeleteFavorite}
                  />
                ))}
             </div>

             {!isOffline && (
                <div className="mt-6 pt-5 border-t border-slate-50">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg active:scale-90 transition-all"
                    >
                      {newSpotEmoji}
                    </button>
                    <input
                      value={newSpotTitle}
                      onChange={(e) => setNewSpotTitle(e.target.value)}
                      placeholder="快速收藏..."
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-pink-200 transition-all"
                      onKeyDown={(e) => { if (e.key === "Enter") { void handleAddFavorite(); } }}
                    />
                    <button
                      onClick={() => void handleAddFavorite()}
                      disabled={addingFavorite || !newSpotTitle.trim()}
                      className="w-10 h-10 shrink-0 rounded-xl bg-slate-800 text-white flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {showEmojiPicker && (
                    <div className="flex flex-wrap gap-1.5 mt-3 p-2 bg-white rounded-xl border border-slate-100 shadow-xl overflow-y-auto max-h-[120px] no-scrollbar">
                      {EMOJI_OPTIONS.map(em => (
                        <button key={em} onClick={() => { setNewSpotEmoji(em); setShowEmojiPicker(false); }} className="w-8 h-8 flex items-center justify-center hover:bg-pink-50 rounded-lg text-lg">{em}</button>
                      ))}
                    </div>
                  )}
                  {addingFavorite && <p className="text-[9px] font-bold text-pink-500 mt-2 animate-pulse uppercase tracking-widest text-center">GEOCODING...</p>}
                </div>
             )}
          </GlassCard>

          {/* New Trip Button */}
          <button 
            onClick={() => setIsPlanningNew(true)}
            className="w-full py-5 rounded-[28px] bg-white text-slate-700 font-bold text-sm shadow-sm border border-slate-100 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Plus size={20} className="text-pink-400" />
            重新規劃旅程
          </button>
        </aside>

        {/* Right Column: Content */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Mobile Day Selector */}
          <div className="lg:hidden flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const isActive = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-8 py-3 rounded-full font-black text-sm whitespace-nowrap transition-all uppercase tracking-widest ${
                    isActive 
                      ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-200/50' 
                      : 'glass-card text-slate-400 hover:text-pink-400'
                  }`}
                >
                  DAY {day}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative pl-6 mt-4 flex flex-col gap-8"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
                  >
                    <ItinerarySkeletonCard />
                  </motion.div>
                ))}
              </motion.div>
            ) : viewMode === 'list' ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col gap-8"
              >
                {/* AI Assistant Quick Trigger */}
                <div className="group relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400 rounded-[32px] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-1000" />
                  <GlassCard className="!p-6 !rounded-[32px] border border-white/80 shadow-xl overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-pink-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-pink-200">
                          <Sparkles size={28} />
                        </div>
                        <div>
                          <h3 className="font-black text-xl text-slate-800 leading-tight">需要微調 Day {selectedDay} 嗎？</h3>
                          <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">AI 行程規劃助手</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowPlanner(!showPlanner)}
                        className={`w-full sm:w-auto px-10 py-4 rounded-full font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-3 ${showPlanner ? 'bg-slate-100 text-slate-400' : 'bg-slate-800 text-white hover:bg-slate-900 shadow-xl shadow-slate-200 active:scale-95'}`}
                      >
                        {showPlanner ? '收起助理' : '喚起 AI 助理'}
                        {showPlanner ? <X size={18} /> : <ArrowRight size={18} />}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showPlanner && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-10 flex flex-col gap-6">
                            <div className="h-px bg-slate-100 w-full" />
                            <div className="flex flex-col gap-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-1">您的具體需求或對 AI 的指令</label>
                              <textarea
                                placeholder="例如：幫我把下午行程安排得更輕鬆一點，或是推薦三間必吃的拉麵店插入到晚上..."
                                value={plannerForm.notes}
                                onChange={(e) => setPlannerField('notes', e.target.value)}
                                className="w-full bg-white/50 border border-slate-100 rounded-3xl px-6 py-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 transition-all min-h-[140px] shadow-inner text-base resize-none"
                              />
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={() => setAiGenerateMode('selected_day')}
                                className={`flex-1 py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-widest transition-all border ${aiGenerateMode === 'selected_day' ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                              >
                                重建 Day {selectedDay}
                              </button>
                              <button
                                onClick={() => {
                                  setAiGenerateMode('generate_for_selected_days');
                                  setRangeStartDay(selectedDay);
                                  setRangeEndDay(Math.min(totalDays, selectedDay + 1));
                                }}
                                className={`flex-1 py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-widest transition-all border ${aiGenerateMode === 'generate_for_selected_days' ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                              >
                                指定天數區間
                              </button>
                              <button
                                onClick={() => setAiGenerateMode('overwrite_all')}
                                className={`flex-1 py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-widest transition-all border ${aiGenerateMode === 'overwrite_all' ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                              >
                                全局重新規劃
                              </button>
                            </div>

                            {aiGenerateMode === 'generate_for_selected_days' && (
                              <div className="flex gap-4 items-center justify-center bg-white/50 py-3 px-4 rounded-[22px] border border-slate-100 shadow-inner my-2">
                                <span className="font-bold text-xs text-slate-600">產生範圍：Day </span>
                                <select 
                                  value={rangeStartDay} 
                                  onChange={e => setRangeStartDay(Number(e.target.value))}
                                  className="bg-white border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-700 focus:ring-2 focus:ring-pink-200 shadow-sm"
                                >
                                  {Array.from({ length: Math.max(totalDays, 10) }, (_, i) => (
                                    <option key={i+1} value={i+1}>{i+1}</option>
                                  ))}
                                </select>
                                <span className="text-slate-400 font-bold px-1">至</span>
                                <select 
                                  value={rangeEndDay} 
                                  onChange={e => setRangeEndDay(Number(e.target.value))}
                                  className="bg-white border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-700 focus:ring-2 focus:ring-pink-200 shadow-sm"
                                >
                                  {Array.from({ length: Math.max(totalDays, 10) }, (_, i) => (
                                    <option key={i+1} value={i+1}>{i+1}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <button 
                              onClick={() => void handleAiSuggest()}
                              disabled={aiLoading}
                              className="w-full py-5 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-600 to-indigo-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-pink-200/50 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] transition-all"
                            >
                              {aiLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                              開始智慧微調行程
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </div>

                <ItineraryList
                  items={selectedDayNodes}
                  day={selectedDay}
                  onDelete={handleDeleteNode}
                  onUpdate={handleUpdateNode}
                  onReorder={handleReorder}
                  onManualAdd={handleManualAddNode}
                  isOffline={isOffline}
                  aiLoading={aiLoading}
                  tripId={activeTripId}
                  destination={tripInfo?.destination || ''}
                  weather={weatherData}
                />
              </motion.div>
            ) : (
              <motion.div
                key="map"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="w-full"
              >
                <MapView items={selectedDayNodes} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {tip ? <span className="fixed bottom-28 left-0 right-0 text-center text-xs font-black text-slate-400 pointer-events-none animate-pulse">{tip}</span> : null}

      {/* Floating Action Button (Mobile Only) */}
      <button 
        onClick={() => setIsPlanningNew(true)}
        className="md:hidden fixed bottom-24 right-6 w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-fuchsia-600 text-white shadow-2xl shadow-pink-200 flex items-center justify-center z-50 active:scale-90 transition-all"
      >
        <Sparkles size={28} />
      </button>

      {/* Favorites panel hidden below main if needed, but on desktop it's in sidebar */}
      {!loading && nodes.length > 0 && (
         <div className="lg:hidden mt-20">
           <GlassCard className="!p-6">
              <h3 className="font-black text-xl text-slate-800 mb-6">口袋名單</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {favorites.map((spot: FavoriteSpot) => (
                  <DraggableFavoriteSpot
                    key={spot.id}
                    spot={spot}
                    selectedDay={selectedDay}
                    isOffline={isOffline}
                    onAdd={addSpotToDay}
                    onDelete={handleDeleteFavorite}
                  />
                ))}
              </div>
           </GlassCard>
         </div>
      )}
      </div>
    </main>
  );
}

// ─── Collaborator Avatar with presence glow ──────────────────────────────────

function CollaboratorAvatar({ collaborator, index, isOnline }: { collaborator: Collaborator; index: number; isOnline: boolean; key?: string }) {
  return (
    <motion.div
      initial={{ scale: 0, x: -20 }}
      animate={{ scale: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative -ml-3 first:ml-0 group`}
      style={{ zIndex: 10 + index }}
    >
      <div className={`w-12 h-12 rounded-full border-[3px] border-white shadow-xl overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 relative ${isOnline ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}>
        <div className="w-full h-full bg-pink-50 flex items-center justify-center text-xl">
           {collaborator.avatar.length > 2 ? <img src={collaborator.avatar} className="w-full h-full object-cover" /> : collaborator.avatar}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
      
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800/90 backdrop-blur-md text-white text-[10px] font-black rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-widest shadow-xl">
        {collaborator.name}
      </div>
      {isOnline && (
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-[3px] border-white shadow-sm" />
      )}
    </motion.div>
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
  key?: string;
}) {
  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="group relative flex items-center justify-between p-4 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[28px] shadow-sm hover:shadow-xl transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-[20px] bg-white flex items-center justify-center text-2xl shadow-sm border border-slate-100/50 group-hover:scale-105 transition-transform">
          {spot.emoji}
        </div>
        <div>
          <h4 className="font-black text-slate-800 text-[15px] leading-tight">{spot.title}</h4>
          <p className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-[0.1em]">口袋名單</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAdd(spot, selectedDay)}
          disabled={isOffline}
          className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-slate-900"
          title="加入今天"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
        <button
          onClick={() => onDelete(spot.id)}
          className="w-10 h-10 rounded-full bg-white/50 text-slate-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Itinerary List ───────────────────────────────────────────────────────────

interface ItineraryListItemProps {
  key?: React.Key;
  item: ItineraryNode;
  idx: number;
  editingId: string | null;
  draft: any | null;
  setDraft: React.Dispatch<React.SetStateAction<any | null>>;
  startEdit: (item: ItineraryNode) => void;
  saveEdit: (item: ItineraryNode) => void;
  cancelEdit: () => void;
  isOffline: boolean;
  onDelete: (node_id: string) => void;
}

function ItineraryListItem({
  item,
  idx,
  onDelete,
  onUpdate,
  isOffline,
  tripId,
  destination,
}: {
  item: ItineraryNode;
  idx: number;
  onDelete: (node_id: string) => void;
  onUpdate: (node: ItineraryNode) => void;
  isOffline: boolean;
  tripId: string;
  destination: string;
  key?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editTime, setEditTime] = useState(item.time);
  const [editEmoji, setEditEmoji] = useState(item.emoji);
  const [editNotes, setEditNotes] = useState(item.description || item.notes || '');
  const [editImageUrl, setEditImageUrl] = useState(item.image_url || '');
  const [editTransport, setEditTransport] = useState(item.transport_to_next || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSave = () => {
    onUpdate({ ...item, title: editTitle, time: normalizeClockInput(editTime), emoji: editEmoji, description: editNotes, image_url: editImageUrl, transport_to_next: editTransport });
    setIsEditing(false);
  };

  const handleNavigate = () => {
    if (!item.lat || !item.lng) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const label = encodeURIComponent(item.title);
    const url = isIOS 
      ? `maps://maps.apple.com/?q=${label}&ll=${item.lat},${item.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
    window.open(url, '_blank');
  };

  const handleRegenerate = async () => {
    if (!tripId || !destination) return;
    setRegenerating(true);
    try {
      const newNode = await regenerateItinerarySpot({
        trip_id: tripId,
        node_id: item.node_id,
        destination: destination,
        day: item.day,
        current_time: item.time,
        current_title: item.title,
        notes: item.description || item.notes
      });
      const { ai_note, ...restNode } = newNode as any;
      onUpdate({ ...item, ...restNode, description: ai_note || restNode.description });
    } catch (err) {
      console.error('Regenerate failed:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const meta = getCategoryMeta(item.category);

  return (
    <div className="relative flex gap-6 sm:gap-10 items-start group w-full">
      {/* Time Badge */}
      <div className="flex flex-col items-center pt-2">
        <div className="w-[50px] sm:w-[60px] flex flex-col items-center">
           <span className="text-[12px] sm:text-[14px] font-black text-slate-800 tabular-nums uppercase tracking-tight">{item.time}</span>
           <div className={`w-3.5 h-3.5 rounded-full border-[3px] border-white shadow-lg z-10 mt-2.5 ${item.category === 'flight' ? 'bg-indigo-500 ring-4 ring-indigo-50' : 'bg-pink-500 ring-4 ring-pink-50'}`} />
        </div>
      </div>

      {/* Content Card */}
      <GlassCard className={`flex-1 !p-5 sm:!p-6 !rounded-[32px] border border-white/80 shadow-lg relative z-10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full">
          {/* Icon/Emoji Wrapper */}
          <div className="relative group/emoji shrink-0">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[28px] flex items-center justify-center text-3xl sm:text-4xl shadow-sm border border-slate-100/50 transition-transform group-hover:scale-105 duration-500 ${item.category === 'flight' ? 'bg-gradient-to-br from-indigo-50 to-blue-50' : 'bg-white'}`}>
              {isEditing ? (
                 <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="animate-pulse active:scale-95 transition-transform">
                    {editEmoji}
                 </button>
              ) : (
                 <span className="filter drop-shadow-sm">{item.emoji}</span>
              )}
            </div>
            {isEditing && showEmojiPicker && (
               <div className="absolute top-full left-0 mt-4 p-3 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white z-[100] flex flex-wrap gap-2 w-48 animate-in zoom-in-95 duration-200">
                 {EMOJI_OPTIONS.map(e => (
                   <button key={e} onClick={() => { setEditEmoji(e); setShowEmojiPicker(false); }} className="w-10 h-10 flex items-center justify-center hover:bg-pink-50 rounded-xl text-xl transition-colors">{e}</button>
                 ))}
               </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
               <span className="px-3 py-0.5 rounded-full bg-pink-50 text-[10px] font-black uppercase tracking-[0.15em] text-pink-500 border border-pink-100/50">
                 {meta.label}
               </span>
               {!isEditing && (
                 <button 
                   onClick={() => onUpdate({ ...item, is_visited: !item.is_visited })}
                   className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all border ${item.is_visited ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                 >
                   <span className="material-symbols-outlined text-[14px]">
                     {item.is_visited ? 'check_circle' : 'radio_button_unchecked'}
                   </span>
                   {item.is_visited ? '已打卡' : '未打卡'}
                 </button>
               )}
               {item.category === 'flight' && (
                 <span className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-500 flex items-center gap-1 animate-pulse">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                   CONFIRMED
                 </span>
               )}
            </div>
            
            {isEditing ? (
               <div className="flex flex-col gap-3">
                 <input 
                   autoFocus
                   value={editTitle}
                   onChange={e => setEditTitle(e.target.value)}
                   className="text-lg font-black text-slate-800 bg-white/50 border border-slate-100 rounded-2xl px-5 py-2.5 outline-none focus:ring-4 focus:ring-pink-100 transition-all font-sans"
                 />
                 <textarea
                   value={editNotes}
                   onChange={e => setEditNotes(e.target.value)}
                   placeholder="寫下你的旅行手帳日記，或是 AI 貼心提醒..."
                   className="text-sm font-bold text-slate-600 bg-white/50 border border-slate-100 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-pink-100 transition-all min-h-[80px] resize-y"
                 />
                 <input
                   value={editImageUrl}
                   onChange={e => setEditImageUrl(e.target.value)}
                   placeholder="貼上照片網址 (例如: https://...jpg)"
                   className="text-xs font-bold text-slate-500 bg-white/50 border border-slate-100 rounded-2xl px-5 py-2 outline-none focus:ring-4 focus:ring-pink-100 transition-all"
                 />
                 <input
                   value={editTransport}
                   onChange={e => setEditTransport(e.target.value)}
                   placeholder="交通方式 (會顯示在往下一站之間)"
                   className="text-xs font-bold text-slate-500 bg-white/50 border border-slate-100 rounded-2xl px-5 py-2 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                 />
                 <div className="flex items-center gap-3">
                    <input 
                      value={editTime}
                      onChange={e => setEditTime(e.target.value)}
                      className="text-sm font-black text-slate-500 bg-white/50 border border-slate-100 rounded-xl px-4 py-2 w-24 text-center outline-none focus:ring-4 focus:ring-pink-100 transition-all"
                    />
                    <button onClick={handleSave} className="px-6 py-2 rounded-full bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">保存</button>
                    <button onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-full bg-slate-100 text-slate-400 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">取消</button>
                 </div>
               </div>
            ) : (
               <>
                 <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight tracking-tight mb-2 truncate group-hover:text-pink-600 transition-colors">{item.title}</h3>
                 {item.image_url && (
                   <div className="w-full h-40 sm:h-56 mt-3 mb-4 rounded-3xl overflow-hidden shadow-inner bg-slate-50 relative group/img cursor-pointer">
                     <img src={item.image_url} alt={item.title} className="w-full h-full object-cover rounded-3xl hover:scale-105 transition-transform duration-700" loading="lazy" referrerPolicy="no-referrer" />
                   </div>
                 )}
                 {item.description || item.notes ? (
                   <p className="text-xs sm:text-sm font-bold text-slate-500 whitespace-pre-line tracking-wide leading-relaxed">{item.description || item.notes}</p>
                 ) : (
                   <p className="text-xs sm:text-sm font-bold text-slate-400 italic">點擊右側編輯新增手帳內容、細節或照片...</p>
                 )}
               </>
            )}
          </div>

          {!isOffline && !isEditing && (
            <div className="flex flex-row sm:flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
              {item.lat && item.lng && (
                <button
                  onClick={handleNavigate}
                  title="在地圖中導航"
                  className="w-11 h-11 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-emerald-500 hover:border-emerald-100 flex items-center justify-center shadow-sm transition-all active:scale-90"
                >
                  <Navigation2 size={16} />
                </button>
              )}
              <button
                onClick={() => void handleRegenerate()}
                disabled={regenerating}
                title="AI 換一個景點"
                className="w-11 h-11 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-fuchsia-500 hover:border-fuchsia-100 flex items-center justify-center shadow-sm transition-all active:scale-90 disabled:opacity-30"
              >
                {regenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="w-11 h-11 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-pink-500 hover:border-pink-100 flex items-center justify-center shadow-sm transition-all active:scale-90"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => onDelete(item.node_id)}
                className="w-11 h-11 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 flex items-center justify-center shadow-sm transition-all active:scale-90"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
function SortableItineraryItem({ item, idx, nextItem, onDelete, onUpdate, isOffline, tripId, destination }: any) {
  const controls = useDragControls();

  let timeGapStr = '';
  if (nextItem && item.time && nextItem.time) {
    const currentParts = item.time.split(':').map(Number);
    const nextParts = nextItem.time.split(':').map(Number);
    if (currentParts.length === 2 && nextParts.length === 2) {
      const currentMins = currentParts[0] * 60 + currentParts[1];
      const nextMins = nextParts[0] * 60 + nextParts[1];
      const diff = nextMins - currentMins;
      if (diff > 0) {
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        timeGapStr = h > 0 ? `${h} 小時 ${m > 0 ? m + ' 分鐘' : ''}` : `${m} 分鐘`;
      }
    }
  }

  return (
    <Reorder.Item 
      value={item}
      dragListener={false} 
      dragControls={controls}
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: -30 }}
      transition={{ type: 'spring', bounce: 0.4, duration: 0.5, delay: idx * 0.05 }}
      className="flex flex-col w-full relative group/reorder"
    >
      <ItineraryListItem
        item={item}
        idx={idx}
        onDelete={onDelete}
        onUpdate={onUpdate}
        isOffline={isOffline}
        tripId={tripId}
        destination={destination}
      />
      
      {/* Drag handle */}
      <div 
        className="absolute left-[-40px] top-1/2 -translate-y-1/2 opacity-0 group-hover/reorder:opacity-100 transition-opacity p-2 cursor-grab active:cursor-grabbing text-slate-300"
        onPointerDown={(e) => controls.start(e)}
        style={{ touchAction: 'none' }}
      >
         <GripVertical size={20} />
      </div>

      {nextItem && (timeGapStr || item.transport_to_next) && (
        <div className="flex justify-start sm:pl-[29px] pl-[24px] my-1 relative z-0">
          <div className="w-0.5 min-h-[3rem] bg-gradient-to-b from-slate-200 to-slate-200" />
          <div className="flex flex-col justify-center ml-4 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-50/80 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 shadow-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px]">schedule</span>
                {timeGapStr ? `約 ${timeGapStr}` : '時間未定'}
              </span>
              {item.transport_to_next && (
                <span className="px-3 py-1 bg-indigo-50/80 rounded-full text-[10px] font-black text-indigo-500 uppercase tracking-widest border border-indigo-100 shadow-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[12px]">directions_subway</span>
                  {item.transport_to_next}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      {nextItem && !timeGapStr && !item.transport_to_next && (
         <div className="flex justify-start sm:pl-[29px] pl-[24px] my-1 relative z-0">
            <div className="w-0.5 h-8 bg-gradient-to-b from-slate-200 to-slate-200" />
         </div>
      )}
    </Reorder.Item>
  );
}

function ItineraryList({
  items,
  day,
  onDelete,
  onUpdate,
  onReorder,
  onManualAdd,
  isOffline,
  aiLoading,
  tripId,
  destination,
  weather,
}: {
  items: ItineraryNode[];
  day: number;
  onDelete: (node_id: string) => void;
  onUpdate: (node: ItineraryNode) => void;
  onReorder: (newOrder: ItineraryNode[]) => void;
  onManualAdd: (node: Partial<ItineraryNode>) => void;
  isOffline: boolean;
  aiLoading: boolean;
  tripId: string;
  destination: string;
  weather?: any;
}) {
  const getDailyWeather = () => {
    if (!weather || !weather.length) return null;
    // Assuming weather is a 14-day array, pick the one matching (day - 1)
    const dayWeather = weather[day - 1];
    if (!dayWeather) return null;
    return dayWeather;
  };

  const dayWeather = getDailyWeather();

  return (
    <div className="flex flex-col gap-10 mt-6 min-h-[400px]">
      {dayWeather && (
        <div className="-mt-14 mb-4 ml-4">
          <div className="flex items-center gap-3 w-fit px-4 py-2 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100/50 rounded-2xl shadow-sm">
            <span className="text-xl">
              {dayWeather.rain_prob > 50 ? '🌧️' : dayWeather.rain_prob > 20 ? '⛅' : '☀️'}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-700 tracking-wider uppercase">
                {dayWeather.date} 天氣
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {dayWeather.temp_min}°C - {dayWeather.temp_max}°C / 降雨率 {dayWeather.rain_prob}%
              </span>
            </div>
          </div>
        </div>
      )}
      
      {items.length === 0 && !aiLoading && (
        <GlassCard className="!p-16 !rounded-[48px] border border-white/60 bg-white/30 flex flex-col items-center justify-center text-center backdrop-blur-2xl shadow-inner">
          <div className="w-28 h-28 rounded-[40px] bg-white flex items-center justify-center text-6xl mb-8 shadow-xl border border-slate-100/50 animate-bounce">
            🏝️
          </div>
          <h3 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Day {day} 還是空白的</h3>
          <p className="text-slate-400 font-bold max-w-[320px] leading-relaxed uppercase text-[10px] tracking-[0.2em]">使用 AI 助理或從側邊欄拖入景點開始您的旅程</p>
        </GlassCard>
      )}

      {aiLoading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col gap-8"
        >
           {[0, 1, 2].map(i => (
             <motion.div
               key={i}
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
             >
               <ItinerarySkeletonCard />
             </motion.div>
           ))}
        </motion.div>
      )}

      <Reorder.Group axis="y" values={items} onReorder={onReorder} className="flex flex-col gap-8">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item: ItineraryNode, idx: number) => (
            <SortableItineraryItem
              key={item.node_id}
              item={item}
              idx={idx}
              nextItem={items[idx + 1]}
              onDelete={onDelete}
              onUpdate={onUpdate}
              isOffline={isOffline}
              tripId={tripId}
              destination={destination}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Manual Add Node UI */}
      <ManualAddNode onAdd={onManualAdd} isOffline={isOffline} day={day} />
    </div>
  );
}

function ManualAddNode({ onAdd, isOffline, day }: { onAdd: (node: Partial<ItineraryNode>) => void; isOffline: boolean; day: number }) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [time, setTime] = useState('10:00');
  const [emoji, setEmoji] = useState('📍');
  const [category, setCategory] = useState('landmark');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ 
      title, 
      time, 
      emoji, 
      category,
      description: locationName ? `地點：${locationName}` : undefined,
      // Manual nodes get default coordinates if needed, 
      // but usually users just want the title/time for a custom list
    });
    setTitle('');
    setLocationName('');
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <motion.button 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsAdding(true)}
        disabled={isOffline}
        className="w-full py-8 rounded-[48px] border-2 border-dashed border-slate-200 text-slate-400 font-black text-[15px] uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:border-pink-300 hover:text-pink-400 hover:bg-pink-50/20 transition-all shadow-sm disabled:opacity-30"
      >
        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-pink-100 group-hover:text-pink-400 transition-colors">
          <Plus size={20} />
        </div>
        新增自訂行程節點
      </motion.button>
    );
  }

  return (
    <GlassCard className="!p-10 !rounded-[48px] border-2 border-pink-100 shadow-[0_32px_64px_-16px_rgba(244,114,182,0.15)] animate-in zoom-in-95 duration-300 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400" />
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-2xl">🗓️</div>
             <div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">新增行程節點</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adding to Day {day}</p>
             </div>
           </div>
           <button type="button" onClick={() => setIsAdding(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors"><X size={20}/></button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">行程名稱</label>
            <div className="relative group">
              <Pencil className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-pink-400 transition-colors" size={18} />
              <input 
                autoFocus
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如：參觀東京鐵塔"
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-5 pl-14 pr-6 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">時間</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-pink-400 transition-colors">schedule</span>
              <input 
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-5 pl-14 pr-6 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">詳細地點 (選填)</label>
          <div className="relative group">
            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-pink-400 transition-colors" size={18} />
            <input 
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              placeholder="輸入地點名稱或地址"
              className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-5 pl-14 pr-6 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="flex flex-col gap-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">圖標 Emoji</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-16 h-16 shrink-0 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-3xl shadow-md hover:border-pink-200 transition-all hover:scale-105 active:scale-95"
                >
                  {emoji}
                </button>
                <div className="flex-1 flex flex-wrap gap-2 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 overflow-y-auto max-h-[120px] no-scrollbar">
                    {EMOJI_OPTIONS.slice(0, 15).map(em => (
                      <button key={em} type="button" onClick={() => setEmoji(em)} className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl transition-all ${emoji === em ? 'bg-pink-100 scale-110 shadow-sm' : 'hover:bg-white'}`}>{em}</button>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-pink-500 hover:bg-white"
                    >
                      <Plus size={20} />
                    </button>
                </div>
              </div>
           </div>
           <div className="flex flex-col gap-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">分類</label>
              <div className="relative">
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all appearance-none shadow-sm"
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{CATEGORY_META[opt].label}</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                  <ArrowDownUp size={16} />
                </div>
              </div>
           </div>
        </div>

        <button 
          type="submit"
          className="w-full py-6 rounded-[24px] bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
        >
          <Check size={20} />
          確認新增至 Day {day}
        </button>
      </form>
    </GlassCard>
  );
}

// ─── Map View ───────────────────────────────────────────────────────────

function MapView({ items }: { items: ItineraryNode[] }) {
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
      {/* Connecting lines via SVG */}
      {items.length > 1 && (
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' } as object}
        >
          {/* Arrow marker definition for directional lines */}
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto" fill="rgba(236,72,153,0.7)">
              <polygon points="0 0, 6 2, 0 4" />
            </marker>
          </defs>
          {(items as ItineraryNode[]).slice(0, -1).map((item: ItineraryNode, i: number) => {
            const next = items[i + 1];
            if (!item.lat || !item.lng || !next.lat || !next.lng) return <Fragment key={`line-${item.node_id}`} />;
            const from = getDynamicMapPercent(items, item.lat, item.lng);
            const to = getDynamicMapPercent(items, next.lat, next.lng);
            return (
              <line
                key={`line-${item.node_id}`}
                x1={`${from.x}%`} y1={`${from.y}%`}
                x2={`${to.x}%`}   y2={`${to.y}%`}
                stroke="rgba(236,72,153,0.6)"
                strokeWidth={0.8}
                strokeDasharray="2 1.5"
                markerEnd="url(#arrowhead)"
              />
            );
          })}
        </svg>
      )}
      {/* Map pins */}
      {items.map((item: ItineraryNode, index: number) => {
        const pos = (item.lat && item.lng)
          ? getDynamicMapPercent(items, item.lat, item.lng)
          : { x: 25 + (index % 2) * 50, y: 15 + index * 12 };

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
              <div className="bg-white/95 rounded-2xl px-2.5 py-2 border-2 border-white flex flex-col items-center shadow-lg relative cursor-default group">
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm border border-white">
                  {index + 1}
                </div>
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

function readCachedItinerary(tripId: string): ItineraryNode[] {
  if (typeof window === 'undefined' || !tripId) return [];
  const raw = window.localStorage.getItem(`roamjelly_itinerary_${tripId}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ItineraryNode[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
