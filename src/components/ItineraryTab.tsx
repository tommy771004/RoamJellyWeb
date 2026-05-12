import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder } from 'motion/react';


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
  Image as ImageIcon,
  ArrowDownUp,
  Check,
  ChevronDown,
  Clock,
  Printer,
  Users,
  Plane,
  Link,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Settings2,
  Bookmark,
  Lock
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
  fetchTripFacts,
  syncItinerary,
  deleteItineraryNode,
  addFavorite,
  deleteFavorite,
  regenerateItinerarySpot,
  updateTripPublicState,
  geocodeSpot,
  fetchSpotEnrichment,
  submitLedgerExpense,
} from '../lib/workflowApi';
import { suggestItineraryWithForm, AiRateLimitedError } from '../lib/openrouterApi';
import { haversineKm, estimateTransport } from '../lib/geoUtils';
import { useItineraryStore } from '../store/useItineraryStore';
import { useAppStore } from '../store/useAppStore';
import { useTripFactsStore } from '../store/useTripFactsStore';
import type {
  Collaborator,
  FavoriteSpot,
  ItineraryAttachment,
  ItineraryNode,
  ItineraryNodePatchChanges,
  ItineraryPlannerForm,
  SearchItem,
  SyncItineraryPayload,
  TravelFact,
  TripInfo,
} from '../types/workflow';

import AiForm, { AiFormData } from './AiForm';
import DatePickerPopup from './DatePickerPopup';
import {
  assignDaysBasedOnTimeAndOrder,
  buildTimestampFromDateTime,
  getDateForDay,
  getDayForDate,
  sortNodesForDisplay,
} from '../lib/itineraryUtils';

const DESTINATION_IMAGES: Array<{ keywords: string[]; url: string }> = [
  { keywords: ['台北', 'taipei'], url: 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&auto=format&fit=crop' },
  { keywords: ['九份', 'jiufen'], url: 'https://images.unsplash.com/photo-1548468787-56de8ce95253?w=800&auto=format&fit=crop' },
  { keywords: ['太魯閣', 'taroko', '花蓮', 'hualien'], url: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&auto=format&fit=crop' },
  { keywords: ['日月潭', 'sun moon lake'], url: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&auto=format&fit=crop' },
  { keywords: ['台南', 'tainan'], url: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&auto=format&fit=crop' },
  { keywords: ['高雄', 'kaohsiung'], url: 'https://images.unsplash.com/photo-1605552490120-dba5cfe84eac?w=800&auto=format&fit=crop' },
  { keywords: ['墾丁', 'kenting'], url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop' },
  { keywords: ['清境', 'cingjing', '合歡', 'hehuanshan'], url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop' },
  { keywords: ['台東', 'taitung', '池上', 'chishang'], url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&auto=format&fit=crop' },
  { keywords: ['淡水', 'tamsui'], url: 'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=800&auto=format&fit=crop' },
  { keywords: ['日本', 'japan', '東京', 'tokyo', '大阪', 'osaka', '京都', 'kyoto'], url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&auto=format&fit=crop' },
  { keywords: ['韓國', 'korea', '首爾', 'seoul'], url: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&auto=format&fit=crop' },
  { keywords: ['泰國', 'thailand', '曼谷', 'bangkok'], url: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&auto=format&fit=crop' },
];
const DEFAULT_TRIP_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop';

function getTripCoverImage(destination: string): string {
  if (!destination) return DEFAULT_TRIP_IMAGE;
  const lower = destination.toLowerCase();
  for (const entry of DESTINATION_IMAGES) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.url;
  }
  return DEFAULT_TRIP_IMAGE;
}

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
const AI_LOADING_QUOTES = [
  '正在打包行李，替今天塞進剛剛好的節奏...',
  '正在幫你喬靠窗座位，也順便避開太硬的移動路線...',
  '正在請教在地老饕，看看哪一站最值得停久一點...',
  '正在替你把交通、景點與休息點排成順手的旅途節拍...',
];
const DELETE_UNDO_WINDOW_MS = 3600;

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
    companions: '',
    vibes: [] as string[],
    interests: [] as string[],
    budget: '',
    dietary: [] as string[],
    transport: [] as string[],
  } as any;
}

function getCurrencyFromDestination(destination: string): string {
  if (!destination) return 'TWD';
  const lower = destination.toLowerCase();
  if (lower.includes('日') || lower.includes('tokyo') || lower.includes('osaka') || lower.includes('kyoto')) return 'JPY';
  if (lower.includes('韓') || lower.includes('seoul')) return 'KRW';
  if (lower.includes('泰') || lower.includes('bangkok')) return 'THB';
  if (lower.includes('美') || lower.includes('usa') || lower.includes('new york')) return 'USD';
  if (lower.includes('歐') || lower.includes('paris') || lower.includes('london')) return 'EUR';
  return 'TWD';
}

function normalizeScheduleForNode(
  node: Partial<ItineraryNode>,
  options: {
    tripStartDate?: string | null;
    fallbackDay: number;
    fallbackSortOrder?: number;
  },
): Partial<ItineraryNode> {
  const fallbackDay = Number(options.fallbackDay) > 0 ? Number(options.fallbackDay) : 1;
  const normalizedDate =
    node.date ||
    getDateForDay(node.day ?? fallbackDay, options.tripStartDate) ||
    getDateForDay(fallbackDay, options.tripStartDate);
  const derivedDay = getDayForDate(normalizedDate, options.tripStartDate, node.day ?? fallbackDay);
  const normalizedTime = node.time || '10:00';

  return {
    ...node,
    day: derivedDay,
    date: normalizedDate,
    time: normalizedTime,
    timestamp: buildTimestampFromDateTime(normalizedDate, normalizedTime) ?? node.timestamp,
    sort_order:
      typeof node.sort_order === 'number'
        ? node.sort_order
        : typeof options.fallbackSortOrder === 'number'
          ? options.fallbackSortOrder
          : undefined,
  };
}

function getLoadedDaysFromNodes(nodes: ItineraryNode[]): number[] {
  return Array.from(
    new Set(
      nodes
        .map((node) => Number(node.day ?? 1))
        .filter((day) => Number.isFinite(day) && day > 0),
    ),
  ).sort((a, b) => a - b);
}

function buildNodePatchChanges(previousNode: ItineraryNode, nextNode: ItineraryNode): ItineraryNodePatchChanges {
  const changes: ItineraryNodePatchChanges = {};

  if (previousNode.day !== nextNode.day) changes.day = nextNode.day;
  if ((previousNode.date || '') !== (nextNode.date || '')) changes.date = nextNode.date || null;
  if ((previousNode.time || '') !== (nextNode.time || '')) changes.time = nextNode.time || '10:00';
  if ((previousNode.timestamp || '') !== (nextNode.timestamp || '')) changes.timestamp = nextNode.timestamp || null;
  if ((previousNode.sort_order ?? 0) !== (nextNode.sort_order ?? 0)) changes.sort_order = nextNode.sort_order ?? 0;
  if ((previousNode.title || '') !== (nextNode.title || '')) changes.title = nextNode.title;
  if ((previousNode.emoji || '') !== (nextNode.emoji || '')) changes.emoji = nextNode.emoji;
  if ((previousNode.category || 'other') !== (nextNode.category || 'other')) changes.category = nextNode.category;
  if ((previousNode.description || '') !== (nextNode.description || '')) changes.description = nextNode.description || '';
  if ((previousNode.ai_note || '') !== (nextNode.ai_note || '')) changes.ai_note = nextNode.ai_note ?? null;
  if ((previousNode.intensity || '') !== (nextNode.intensity || '')) changes.intensity = nextNode.intensity ?? null;
  if (Boolean(previousNode.is_visited) !== Boolean(nextNode.is_visited)) changes.is_visited = Boolean(nextNode.is_visited);
  if ((previousNode.lat ?? null) !== (nextNode.lat ?? null)) changes.lat = nextNode.lat ?? null;
  if ((previousNode.lng ?? null) !== (nextNode.lng ?? null)) changes.lng = nextNode.lng ?? null;
  if ((previousNode.transport_to_next || '') !== (nextNode.transport_to_next || '')) changes.transport_to_next = nextNode.transport_to_next || '';
  if ((previousNode.image_url || '') !== (nextNode.image_url || '')) changes.image_url = nextNode.image_url || '';
  if (JSON.stringify(previousNode.attachments || []) !== JSON.stringify(nextNode.attachments || [])) {
    changes.attachments = nextNode.attachments || [];
  }
  if ((previousNode.linkedFactId || '') !== (nextNode.linkedFactId || '')) {
    changes.linkedFactId = nextNode.linkedFactId || '';
  }

  return changes;
}

export default function ItineraryTab() {
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'calendar'>('list');
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
  const [showMobileFavorites, setShowMobileFavorites] = useState<boolean>(false);
  const [draggingFavorite, setDraggingFavorite] = useState<FavoriteSpot | null>(null);
  const [nodeEditingLocks, setNodeEditingLocks] = useState<Record<string, { userName: string; day: number }>>({});
  const [expenseTargetNode, setExpenseTargetNode] = useState<ItineraryNode | null>(null);
  const [isUpdatingPublicState, setIsUpdatingPublicState] = useState(false);
  const [loadedDays, setLoadedDays] = useState<number[]>([]);
  const [loadingDay, setLoadingDay] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const reorderCommitTimerRef = useRef<number | null>(null);
  const pendingReorderRef = useRef<ItineraryNode[] | null>(null);
  const reconnectHighlightTimerRef = useRef<number | null>(null);
  const offlineSnapshotRef = useRef<ItineraryNode[]>([]);
  const pendingReconnectSummaryRef = useRef(false);
  const pendingDeleteTimersRef = useRef<Record<string, number>>({});
  const [recentlySyncedNodeIds, setRecentlySyncedNodeIds] = useState<string[]>([]);

  const { nodes, setNodes, replaceDayNodes, addNode, updateNode, patchNode, removeNode, collaborators, setCollaborators, isOffline, setOffline } =
    useItineraryStore();
  const { showToast, activeTripId, setActiveTripId, openRedirectModal, addNotification } = useAppStore();

  useEffect(() => {
    setSelectedDay(1);
    setLoadedDays([]);
    setLoadingDay(null);
  }, [activeTripId]);

  useEffect(() => () => {
    if (reorderCommitTimerRef.current) {
      window.clearTimeout(reorderCommitTimerRef.current);
    }
    if (reconnectHighlightTimerRef.current) {
      window.clearTimeout(reconnectHighlightTimerRef.current);
    }
    Object.values(pendingDeleteTimersRef.current).forEach((timer) => {
      window.clearTimeout(timer);
    });
  }, []);

  const normalizeAiCategory = (raw?: string): string => {
    if (!raw) return 'other';
    const s = raw.toLowerCase().trim();
    const map: Record<string, string> = {
      accommodation: 'hotel', lodging: 'hotel', stay: 'hotel',
      restaurant: 'food', dining: 'food', cafe: 'food', coffee: 'food', eat: 'food',
      attraction: 'landmark', museum: 'landmark', temple: 'landmark', sight: 'landmark', sightseeing: 'landmark',
      nature: 'nature', park: 'nature', beach: 'nature', mountain: 'nature',
      shopping: 'shopping', market: 'shopping', mall: 'shopping',
      transport: 'transport', taxi: 'transport', bus: 'transport', train: 'transport', transit: 'transport',
      flight: 'flight', airport: 'flight',
      activity: 'activity', tour: 'activity', experience: 'activity', sport: 'activity',
      nightlife: 'nightlife', bar: 'nightlife', club: 'nightlife', night: 'nightlife',
    };
    for (const [k, v] of Object.entries(map)) {
      if (s.includes(k)) return v;
    }
    return CATEGORY_OPTIONS.includes(s) ? s : 'other';
  };

  const handleAiFormSubmit = async (formData: AiFormData) => {
    setAiLoading(true);
    showToast(`正在為您生成旅程：${formData.destination}...`);
    try {
      // Sync plannerForm.days so totalDays reflects user's selection immediately (e.g. 4 days)
      setPlannerForm(prev => ({ ...prev, days: formData.days }));

      const suggestions = await suggestItineraryWithForm({
        destination: formData.destination,
        planner: {
          days: formData.days,
          departureFrom: formData.departure,
          arrivalTo: formData.destination,
          flightDate: '',
          countries: [],
          mustVisitSpots: [],
          mustEatFoods: [],
          autoFlightSegments: [],
          travelFactsContext: '',
          notes: '',
          companions: formData.companions,
          vibes: formData.vibes,
          interests: formData.interests,
          budget: formData.budget,
          dietary: formData.dietary,
          transport: formData.transport,
        }
      });

      const rawNodes: ItineraryNode[] = [];
      suggestions.itinerary.forEach((dayData: any) => {
        dayData.spots.forEach((spot: any, i: number) => {
           rawNodes.push({
             node_id: `ai_${Date.now()}_${dayData.day}_${i}`,
             day: dayData.day || 1,
             time: normalizeClockInput(spot.time || '10:00'),
             title: spot.name || '景點',
             emoji: spot.emoji || '📍',
             category: normalizeAiCategory(spot.category),
             description: spot.ai_note || '',
             ai_note: spot.ai_note || '',
             intensity: spot.intensity,
             lat: undefined as any,
             lng: undefined as any,
             source: 'local' as const,
           });
        });
      });

      // Geocode all spots in parallel; fall back silently if any fail
      const geocodeResults = await Promise.allSettled(
        rawNodes.map(n => geocodeSpot(n.title, formData.destination))
      );
      geocodeResults.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
          rawNodes[i].lat = r.value.lat;
          rawNodes[i].lng = r.value.lng;
        }
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const finalNodes = assignDaysBasedOnTimeAndOrder(rawNodes, startDate.toISOString());

      useAppStore.getState().setAiResult({
         fullResponse: suggestions,
         title: suggestions.summary.title,
         destination: formData.destination,
         rawSuggestions: finalNodes
      });

      setIsPlanningNew(false);
      useAppStore.getState().setActiveTab('ai_result');
    } catch (err) {
      if (err instanceof AiRateLimitedError) {
        showToast(err.message, 'warning');
      } else {
        showToast('AI 規劃失敗，請稍後再試。', 'warning');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const persistReorderedDayNodes = (orderedNodes: ItineraryNode[]) => {
    if (isOffline || !activeTripId || orderedNodes.length === 0) return;

    for (const node of orderedNodes) {
      const payload: SyncItineraryPayload = {
        trip_id: activeTripId,
        action: 'patch_node',
        payload: {
          node_id: node.node_id,
          changes: {
            day: node.day,
            date: node.date || null,
            time: node.time,
            timestamp: node.timestamp || null,
            sort_order: node.sort_order ?? 0,
          },
        },
      };
      socketRef.current?.emit('sync_itinerary', payload);
      void syncItinerary(payload).catch(() => {
        setTip('排序同步失敗，重新整理後可回到最後儲存版本。');
        setTimeout(() => setTip(''), 2500);
      });
    }
  };

  const handleReorder = (newOrder: ItineraryNode[]) => {
    const reorderedNodes = sortNodesForDisplay(
      newOrder.map((node, index) =>
        withAutoCategoryIcon(
          normalizeScheduleForNode(
            {
              ...node,
              day: safeSelectedDay,
              date: node.date || getDateForDay(safeSelectedDay, tripInfo?.startDate),
              sort_order: index + 1,
            },
            {
              tripStartDate: tripInfo?.startDate,
              fallbackDay: safeSelectedDay,
              fallbackSortOrder: index + 1,
            },
          ) as ItineraryNode,
        ),
      ),
    );

    pendingReorderRef.current = reorderedNodes;
    const otherDaysNodes = nodes.filter((node: ItineraryNode) => node.day !== safeSelectedDay);
    setNodes([...otherDaysNodes, ...reorderedNodes]);

    if (reorderCommitTimerRef.current) {
      window.clearTimeout(reorderCommitTimerRef.current);
    }

    reorderCommitTimerRef.current = window.setTimeout(() => {
      if (pendingReorderRef.current) {
        persistReorderedDayNodes(pendingReorderRef.current);
        pendingReorderRef.current = null;
      }
    }, 350);
  };

  const handleManualAddNode = (node: Partial<ItineraryNode>) => {
    if (!activeTripId) return;
    const fallbackSortOrder =
      Math.max(
        0,
        ...nodes
          .filter((existingNode: ItineraryNode) => existingNode.day === safeSelectedDay)
          .map((existingNode: ItineraryNode) => existingNode.sort_order ?? 0),
      ) + 1;
    const normalized = withAutoCategoryIcon(
      normalizeScheduleForNode(
        {
          node_id: `node_manual_${Date.now()}`,
          day: node.day ?? safeSelectedDay,
          date: node.date || getDateForDay(node.day ?? safeSelectedDay, tripInfo?.startDate),
          time: node.time || '10:00',
          title: node.title || '新行程',
          emoji: node.emoji || '📍',
          category: node.category || 'other',
          source: 'local',
          lat: node.lat,
          lng: node.lng,
          description: node.description,
          linkedFactId: node.linkedFactId,
          image_url: node.image_url,
          transport_to_next: node.transport_to_next,
          is_visited: node.is_visited ?? false,
          sort_order: node.sort_order ?? fallbackSortOrder,
        },
        {
          tripStartDate: tripInfo?.startDate,
          fallbackDay: safeSelectedDay,
          fallbackSortOrder,
        },
      ) as ItineraryNode,
    );
    addNode(normalized);
    const payload: SyncItineraryPayload = { trip_id: activeTripId, action: 'add_node', payload: normalized };
    socketRef.current?.emit('sync_itinerary', payload);
    void syncItinerary(payload).catch(() => {
      removeNode(normalized.node_id);
      showToast('新增行程失敗，已還原。', 'warning');
    });
    showToast(`✨ 已新增：${normalized.title}`);
  };

  // Persist itinerary to localStorage for offline reading whenever it changes while online
  useEffect(() => {
    if (!activeTripId || isOffline || nodes.length === 0) return;
    try {
      writeCachedItineraryForLoadedDays(activeTripId, nodes, loadedDays);
    } catch {}
  }, [nodes, activeTripId, isOffline, loadedDays]);

  // Online/offline tracking
  useEffect(() => {
    if (isOffline) {
      pendingReconnectSummaryRef.current = true;
      offlineSnapshotRef.current = nodes;
    }
  }, [isOffline, nodes]);

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
        setLoadedDays([]);
        return;
      }

      const initialDay = 1;
      try {
        setLoading(true);
        setLoadingDay(initialDay);
        const [tripResult, favResult, collabResult, itineraryResult, factsResult] = await Promise.all([
          fetchTripInfo(activeTripId),
          fetchFavorites(activeTripId),
          fetchCollaborators(activeTripId),
          !isOffline ? fetchItinerary(activeTripId, { day: initialDay }) : Promise.resolve(readCachedItinerary(activeTripId)),
          fetchTripFacts(activeTripId).catch(() => []),
        ]);
        setTripInfo(tripResult);
        
        // If the trip has an absurdly long date range (e.g. 35 days) but is fresh (no nodes),
        // don't overwhelm the planner form with a 35-day count. Cap default planning to a week.
        const initialPlannerDays = (tripResult.days > 14 && (!itineraryResult || itineraryResult.length === 0))
          ? 5 
          : (tripResult.days || 5);

        setPlannerForm(buildDefaultPlannerForm(tripResult.destination, initialPlannerDays));
        setFavorites(favResult);
        setCollaborators(collabResult);
        if (Array.isArray(factsResult)) {
          useTripFactsStore.getState().setFacts(factsResult);
        }
        const assignedNodes = assignDaysBasedOnTimeAndOrder(itineraryResult, tripResult.startDate || '2026-06-15');
        setNodes(assignedNodes);
        setLoadedDays(isOffline ? getLoadedDaysFromNodes(assignedNodes) : [initialDay]);

        if (pendingReconnectSummaryRef.current && !isOffline) {
          const offlineSnapshot = offlineSnapshotRef.current.length > 0
            ? offlineSnapshotRef.current.filter((node: ItineraryNode) => node.day === initialDay)
            : readCachedItinerary(activeTripId).filter((node: ItineraryNode) => node.day === initialDay);
          const diffSummary = summarizeItineraryDiff(offlineSnapshot, assignedNodes);

          if (diffSummary.totalChanges > 0) {
            const summaryMessage = buildReconnectSummaryMessage(diffSummary);
            showToast(summaryMessage, 'success');
            addNotification(summaryMessage);

            if (diffSummary.addedNodeIds.length > 0) {
              setRecentlySyncedNodeIds(diffSummary.addedNodeIds);
              if (reconnectHighlightTimerRef.current) {
                window.clearTimeout(reconnectHighlightTimerRef.current);
              }
              reconnectHighlightTimerRef.current = window.setTimeout(() => {
                setRecentlySyncedNodeIds([]);
              }, 3200);
            }
          }

          pendingReconnectSummaryRef.current = false;
          offlineSnapshotRef.current = assignedNodes;
        }

        // Weather is supplementary — fire non-blocking so it doesn't delay the main UI
        const firstNodeWithCoords = assignedNodes.find((n: any) => n.lat && n.lng);
        if (firstNodeWithCoords) {
          fetch(`/api/weather?lat=${firstNodeWithCoords.lat}&lng=${firstNodeWithCoords.lng}`)
            .then((r) => r.json())
            .then((wData) => { if (wData?.daily) setWeatherData(wData.daily); })
            .catch(() => {});
        }
      } catch {
        const cached = readCachedItinerary(activeTripId);
        const assignedCached = assignDaysBasedOnTimeAndOrder(cached, '2026-06-15');
        setNodes(assignedCached);
        setLoadedDays(getLoadedDaysFromNodes(assignedCached));
        setTip('同步服務暫時不可用，先顯示最近的離線內容。');
      } finally {
        setLoadingDay(null);
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
          addNotification('協作者刪除了一個行程節點');
        } else if (event.action === 'patch_node') {
          const patch = event.payload as { node_id: string; changes: ItineraryNodePatchChanges };
          if (!patch?.node_id || !patch?.changes) return;
          patchNode(patch.node_id, { ...patch.changes, source: 'remote' });
          addNotification('協作者更新了一個行程節點');
        } else if (event.action === 'add_node') {
          const node = event.payload as ItineraryNode;
          addNode({ ...node, source: 'remote' });
          addNotification(`協作者新增了「${node.title ?? '行程節點'}」`);
        }
      });

      socket.on('editing_start', (data: { userName: string; day: number; nodeId: string }) => {
        if (!data?.nodeId) return;
        setNodeEditingLocks((prev) => ({
          ...prev,
          [data.nodeId]: { userName: data.userName, day: data.day },
        }));
      });
      socket.on('editing_stop', (data: { nodeId?: string }) => {
        if (!data?.nodeId) {
          setNodeEditingLocks({});
          return;
        }
        setNodeEditingLocks((prev) => {
          const next = { ...prev };
          delete next[data.nodeId as string];
          return next;
        });
      });
      socket.on('editing_denied', (data: { userName?: string; nodeId?: string; day?: number }) => {
        if (data?.nodeId && data?.userName) {
          setNodeEditingLocks((prev) => ({
            ...prev,
            [data.nodeId as string]: { userName: data.userName as string, day: Number(data.day ?? 1) },
          }));
        }
        showToast(`${data?.userName ?? '旅伴'} 正在編輯這個景點，請稍後再試。`, 'warning');
      });

      socket.on('disconnect', () => {
        setIsSocketConnected(false);
        setNodeEditingLocks({});
        setTip('即時同步已中斷，正在等待重連。');
        setTimeout(() => setTip(''), 2000);
      });

      socketRef.current = socket;
    })();

    return () => {
      mounted = false;
      socketRef.current?.off('editing_start');
      socketRef.current?.off('editing_stop');
      socketRef.current?.off('editing_denied');
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsSocketConnected(false);
      setNodeEditingLocks({});
    };
  }, [isOffline, addNode, patchNode, removeNode, activeTripId, showToast]);

  const maxNodeDay = useMemo(() => {
    if (nodes.length === 0) return 1;
    return Math.max(1, ...nodes.map((node: ItineraryNode) => node.day));
  }, [nodes]);

  // Priority: If we are planning, use plannerForm.days. 
  // If we have nodes, ensure we cover them.
  // tripInfo.days is a fallback/suggestion from travel facts range, 
  // but if the user intended a short planning session (e.g. 4 days), we shouldn't force 35 tabs.
  const totalDays = useMemo(() => {
    const planDays = plannerForm.days || 1;
    const infoDays = tripInfo?.days || 1;
    
    // CASE 1: No nodes yet. 
    if (nodes.length === 0) {
      if (infoDays > 14 && planDays < infoDays) {
        return planDays; 
      }
      return Math.max(planDays, infoDays);
    }

    // CASE 2: We have nodes. 
    // If infoDays is unrealistically long compared to our actual content (maxNodeDay),
    // we prefer the content's range.
    if (maxNodeDay > 0 && infoDays > (maxNodeDay + 7)) {
      // If planDays is also huge (likely synced from infoDays), override it.
      if (planDays === infoDays || planDays > (maxNodeDay + 14)) {
         return maxNodeDay;
      }
      return Math.max(planDays, maxNodeDay);
    }

    // CASE 3: Standard union of indicators
    return Math.max(planDays, infoDays, maxNodeDay);
  }, [plannerForm.days, tripInfo?.days, maxNodeDay, nodes.length]);

  // Clamp during render — avoids the extra render cycle from a setState-only effect
  const safeSelectedDay = Math.min(selectedDay, totalDays);

  const selectedDayNodes = useMemo(
    () =>
      sortNodesForDisplay(
        nodes
          .filter((node: ItineraryNode) => node.day === safeSelectedDay)
          .map((node: ItineraryNode) => withAutoCategoryIcon(node)),
      ),
    [nodes, safeSelectedDay],
  );

  useEffect(() => {
    const loadSelectedDay = async () => {
      if (!activeTripId || isOffline || loadedDays.includes(safeSelectedDay)) return;

      try {
        setLoadingDay(safeSelectedDay);
        const itineraryResult = await fetchItinerary(activeTripId, { day: safeSelectedDay });
        const assignedNodes = assignDaysBasedOnTimeAndOrder(itineraryResult, tripInfo?.startDate || '2026-06-15');
        replaceDayNodes(safeSelectedDay, assignedNodes.filter((node: ItineraryNode) => node.day === safeSelectedDay));
        setLoadedDays((prev: number[]) => Array.from(new Set([...prev, safeSelectedDay])).sort((a, b) => a - b));
      } catch {
        const cachedDayNodes = readCachedItinerary(activeTripId).filter((node) => node.day === safeSelectedDay);
        if (cachedDayNodes.length > 0) {
          replaceDayNodes(safeSelectedDay, cachedDayNodes);
          setLoadedDays((prev: number[]) => Array.from(new Set([...prev, safeSelectedDay])).sort((a, b) => a - b));
        } else {
          showToast(`Day ${safeSelectedDay} 載入失敗，請稍後再試。`, 'warning');
        }
      } finally {
        setLoadingDay((current: number | null) => (current === safeSelectedDay ? null : current));
      }
    };

    void loadSelectedDay();
  }, [activeTripId, isOffline, loadedDays, replaceDayNodes, safeSelectedDay, showToast, tripInfo?.startDate]);

  const handleExportIcs = () => {
    if (!tripInfo) return;
    const icsContent = buildIcsCalendar(tripInfo.name || tripInfo.destination || 'RoamJelly Trip', nodes);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(tripInfo.name || tripInfo.destination || 'roamjelly-trip').replace(/\s+/g, '-').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    showToast('已匯出 ICS，可加入 Apple Calendar 或 Google Calendar。', 'success');
  };

  const handleCreateTrip = async () => {
    if (!newTripName || !newTripDest) return;
    try {
      const { createTrip } = await import('../lib/workflowApi');
      const newTrip = await createTrip({ name: newTripName, destination: newTripDest });
      const newTripId = newTrip?.data?.id || newTrip?.id;
      showToast('成功建立新旅程！', 'success');
      setNewTripName('');
      setNewTripDest('');
      setShowCreateTrip(false);
      if (newTripId) setActiveTripId(newTripId);
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
    try {
      await navigator.clipboard.writeText(deepLink);
      showToast('🎉 行程連結已複製！邀請朋友加入吧', 'success');
    } catch (e) {
      showToast('分享失敗，請手動複製網址', 'warning');
    }
  };

  const handleTogglePublicTemplate = async () => {
    if (!activeTripId || !tripInfo || isUpdatingPublicState) return;
    const nextPublicState = !tripInfo.isPublic;
    setIsUpdatingPublicState(true);
    try {
      const response = await updateTripPublicState(activeTripId, nextPublicState);
      const data = response?.data ?? response ?? {};
      setTripInfo((prev: TripInfo | null) => prev ? {
        ...prev,
        isPublic: Boolean(data.isPublic ?? nextPublicState),
        forkCount: Number(data.forkCount ?? prev.forkCount ?? 0),
      } : prev);
      showToast(nextPublicState ? '已發布到公開模板大廳。' : '已從公開模板大廳下架。', 'success');
    } catch (error: any) {
      showToast(error?.message || '更新公開模板狀態失敗。', 'warning');
    } finally {
      setIsUpdatingPublicState(false);
    }
  };

  // Add a favorite spot from the DB to the selected day's timeline
  const addSpotToDay = (spot: FavoriteSpot, day: number, options?: { silent?: boolean }) => {
    if (isOffline || !activeTripId) return;

    const fallbackSortOrder =
      Math.max(
        0,
        ...nodes
          .filter((existingNode: ItineraryNode) => existingNode.day === day)
          .map((existingNode: ItineraryNode) => existingNode.sort_order ?? 0),
      ) + 1;

    const normalized = withAutoCategoryIcon(
      normalizeScheduleForNode(
        {
          node_id: `node_${Date.now()}`,
          day,
          date: getDateForDay(day, tripInfo?.startDate),
          time: formatCurrentTime(),
          title: spot.title,
          emoji: spot.emoji,
          category: 'landmark',
          source: 'local',
          lat: spot.lat,
          lng: spot.lng,
          sort_order: fallbackSortOrder,
        },
        {
          tripStartDate: tripInfo?.startDate,
          fallbackDay: day,
          fallbackSortOrder,
        },
      ) as ItineraryNode,
    );

    addNode(normalized);

    const payload: SyncItineraryPayload = { trip_id: activeTripId, action: 'add_node', payload: normalized };
    socketRef.current?.emit('sync_itinerary', payload);
    void syncItinerary(payload).catch(() => {
      removeNode(normalized.node_id);
      setTip('行程同步失敗，未儲存的景點已還原。');
      setTimeout(() => setTip(''), 2000);
    });

    if ((!spot.lat || !spot.lng) && tripInfo?.destination) {
      void geocodeSpot(spot.title, tripInfo.destination).then(coords => {
        if (!coords) return;
        const patched = { ...normalized, lat: coords.lat, lng: coords.lng };
        updateNode(patched);
        const syncPayload: SyncItineraryPayload = {
          trip_id: activeTripId,
          action: 'patch_node',
          payload: {
            node_id: normalized.node_id,
            changes: {
              lat: coords.lat,
              lng: coords.lng,
            },
          },
        };
        socketRef.current?.emit('sync_itinerary', syncPayload);
        void syncItinerary(syncPayload).catch(() => {
          updateNode(normalized);
          setTip('景點定位同步失敗，已保留原始資料。');
          setTimeout(() => setTip(''), 2000);
        });
      });
    }

    if (!options?.silent) {
      showToast(`${normalized.emoji} ${spot.title} 已加入 Day ${day}！`);
    }
  };

  const handleFillDayFromFavorites = (day: number) => {
    const candidateFavorites = favorites.filter(
      (spot) => !nodes.some((node: ItineraryNode) => node.day === day && node.title.trim() === spot.title.trim()),
    );

    if (candidateFavorites.length === 0) {
      showToast('口袋名單暫時沒有新的景點可以抽進今天。', 'warning');
      return;
    }

    const shuffled = [...candidateFavorites].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, Math.min(3, shuffled.length));
    picks.forEach((spot) => addSpotToDay(spot, day, { silent: true }));
    showToast(`已從口袋名單替 Day ${day} 補上 ${picks.length} 個靈感景點。`, 'success');
  };

  // Add a new custom favorite (geocoded by backend via Nominatim)
  const handleAddFavorite = async () => {
    if (!newSpotTitle.trim() || isOffline || !activeTripId) return;
    setAddingFavorite(true);
    try {
      const result = await addFavorite(activeTripId, newSpotTitle.trim(), newSpotEmoji);
      if (!result || result.error) {
        showToast(result?.error ?? '新增收藏失敗，請稍後再試。', 'warning');
        return;
      }
      setFavorites((prev: FavoriteSpot[]) => [...prev, result.spot]);
      setNewSpotTitle('');
      setNewSpotEmoji('📍');
      setShowEmojiPicker(false);
      showToast(`${result.spot.emoji} ${result.spot.title} 已加入收藏（座標已自動定位）`);
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

  const handleDeleteNode = (node_id: string) => {
    const removedNode = nodes.find((node: ItineraryNode) => node.node_id === node_id);
    if (!removedNode) return;

    if (pendingDeleteTimersRef.current[node_id]) {
      window.clearTimeout(pendingDeleteTimersRef.current[node_id]);
    }

    removeNode(node_id);

    pendingDeleteTimersRef.current[node_id] = window.setTimeout(() => {
      void (async () => {
        try {
          await deleteItineraryNode(node_id);
          socketRef.current?.emit('sync_itinerary', {
            trip_id: activeTripId,
            action: 'remove_node',
            payload: { node_id } as ItineraryNode,
          });
        } catch {
          addNode(removedNode);
          showToast('刪除失敗，已還原。', 'warning');
        } finally {
          delete pendingDeleteTimersRef.current[node_id];
        }
      })();
    }, DELETE_UNDO_WINDOW_MS);

    showToast(`已移除「${removedNode.title}」，可在幾秒內復原。`, 'warning', {
      actionLabel: '復原',
      onAction: () => {
        if (pendingDeleteTimersRef.current[node_id]) {
          window.clearTimeout(pendingDeleteTimersRef.current[node_id]);
          delete pendingDeleteTimersRef.current[node_id];
        }
        addNode(removedNode);
        showToast(`已復原「${removedNode.title}」。`, 'success');
      },
    });
  };

  const handleUpdateNode = async (node: ItineraryNode) => {
    if (isOffline || !activeTripId) return;
    const previousNode = nodes.find((existingNode: ItineraryNode) => existingNode.node_id === node.node_id);
    if (!previousNode) return;
    const derivedDay = getDayForDate(node.date, tripInfo?.startDate, node.day);
    const fallbackSortOrder =
      derivedDay === node.day && typeof node.sort_order === 'number'
        ? node.sort_order
        : Math.max(
            0,
            ...nodes
              .filter((existingNode: ItineraryNode) => existingNode.day === derivedDay && existingNode.node_id !== node.node_id)
              .map((existingNode: ItineraryNode) => existingNode.sort_order ?? 0),
          ) + 1;
    const normalized = withAutoCategoryIcon(
      normalizeScheduleForNode({ ...node, day: derivedDay, sort_order: node.sort_order ?? fallbackSortOrder }, {
        tripStartDate: tripInfo?.startDate,
        fallbackDay: derivedDay,
        fallbackSortOrder,
      }) as ItineraryNode,
    );
    const changes = buildNodePatchChanges(previousNode, normalized);
    if (Object.keys(changes).length === 0) return;
    updateNode(normalized);
    const payload: SyncItineraryPayload = {
      trip_id: activeTripId,
      action: 'patch_node',
      payload: {
        node_id: normalized.node_id,
        changes,
      },
    };
    socketRef.current?.emit('sync_itinerary', payload);
    try {
      await syncItinerary(payload);
    } catch {
      updateNode(previousNode);
      showToast('更新行程失敗，已還原。', 'warning');
    }
  };

  const handleEditingChange = (nodeId: string, day: number, isEditing: boolean) => {
    const payload = { trip_id: activeTripId, nodeId, day };
    if (isEditing) {
      socketRef.current?.emit('editing_start', payload);
    } else {
      socketRef.current?.emit('editing_stop', payload);
    }
  };

  const removeNodesBatch = async (targetNodes: ItineraryNode[]) => {
    let failedCount = 0;
    for (const target of targetNodes) {
      removeNode(target.node_id);
      try {
        await deleteItineraryNode(target.node_id);
      } catch {
        addNode(target);
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

  const handleAiSuggest = async (modeOverride?: AiGenerateMode) => {
    if (isOffline) { showToast('離線中無法使用 AI 功能 📴'); return; }
    if (!activeTripId) { showToast('缺少行程 ID，無法生成行程'); return; }
    setAiLoading(true);
    try {
      const destination = tripInfo?.destination || '您的目的地';
      const effectiveMode = modeOverride ?? aiGenerateMode;
      
      let genDays = plannerForm.days;
      if (effectiveMode === 'selected_day') genDays = 1;
      else if (effectiveMode === 'generate_for_selected_days') genDays = rangeEndDay - rangeStartDay + 1;
      
      const dietaryStr = (plannerForm.dietary || []).join(',');
      const transportStr = (plannerForm.transport || []).join(',');
      const extraNotes = [plannerForm.notes, dietaryStr && `飲食: ${dietaryStr}`, transportStr && `交通: ${transportStr}`].filter(Boolean).join(' / ');
      
      const facts = useTripFactsStore.getState().facts.filter(f => f.tripId === activeTripId);
      const travelFactsContext = facts.map(f => `[ID: ${f.id}] ${f.factType} - ${f.title}`).join('\n');
      
      const formToSend = { ...plannerForm, days: genDays, notes: extraNotes, travelFactsContext };

      const suggestionsRaw = await suggestItineraryWithForm({ destination, planner: formToSend });

      let suggestedNodes: ItineraryNode[] = [];
      if (suggestionsRaw?.itinerary && Array.isArray(suggestionsRaw.itinerary)) {
        suggestionsRaw.itinerary.forEach((dayData: any) => {
          if (Array.isArray(dayData.spots)) {
            dayData.spots.forEach((spot: any, i: number) => {
              suggestedNodes.push({
                node_id: `ai_${Date.now()}_${dayData.day}_${i}`,
                day: dayData.day || 1,
                time: spot.time || '10:00',
                title: String(spot.name || spot.title || '景點'),
                emoji: spot.emoji || '📍',
                category: spot.category || 'other',
                description: spot.ai_note || '',
                ai_note: spot.ai_note || '',
                intensity: spot.intensity,
                lat: spot.lat,
                lng: spot.lng,
                linkedFactId: spot.linkedFactId,
                source: 'local' as const
              });
            });
          }
        });
      } else if (Array.isArray(suggestionsRaw)) {
        suggestionsRaw.forEach((spot: any, i: number) => {
          suggestedNodes.push({
            node_id: spot.node_id || `ai_${Date.now()}_${spot.day || 1}_${i}`,
            day: spot.day || 1,
            time: spot.time || '10:00',
            title: String(spot.name || spot.title || '景點'),
            emoji: spot.emoji || '📍',
            category: spot.category || 'other',
            description: spot.ai_note || '',
            ai_note: spot.ai_note || '',
            intensity: spot.intensity,
            lat: spot.lat,
            lng: spot.lng,
            linkedFactId: spot.linkedFactId,
            source: 'local' as const
          });
        });
      }

      let finalNodes: ItineraryNode[] = [];

      if (effectiveMode === 'overwrite_all') {
        await removeNodesBatch([...nodes]);
        finalNodes = assignDaysBasedOnTimeAndOrder(suggestedNodes, plannerForm.flightDate);
      } else if (effectiveMode === 'generate_for_selected_days') {
        const targetDays = Array.from({ length: rangeEndDay - rangeStartDay + 1 }, (_, i) => rangeStartDay + i);
        const currentDaysNodes = nodes.filter((node: ItineraryNode) => targetDays.includes(node.day));
        await removeNodesBatch(currentDaysNodes);
        
        finalNodes = suggestedNodes.map((node, index) => {
          let targetDay = rangeStartDay + (node.day - 1);
          if (targetDay > rangeEndDay) targetDay = rangeEndDay;
          return normalizeScheduleForNode(
            {
              ...node,
              day: targetDay,
              date: getDateForDay(targetDay, plannerForm.flightDate),
            },
            {
              tripStartDate: plannerForm.flightDate,
              fallbackDay: targetDay,
              fallbackSortOrder: index + 1,
            },
          ) as ItineraryNode;
        });
      } else {
        const currentDayNodes = nodes.filter((node: ItineraryNode) => node.day === safeSelectedDay);
        await removeNodesBatch(currentDayNodes);
        finalNodes = suggestedNodes.map((node, index) =>
          normalizeScheduleForNode(
            {
              ...node,
              day: selectedDay,
              date: getDateForDay(selectedDay, plannerForm.flightDate),
            },
            {
              tripStartDate: plannerForm.flightDate,
              fallbackDay: selectedDay,
              fallbackSortOrder: index + 1,
            },
          ) as ItineraryNode,
        );
      }

      for (const node of finalNodes) {
        const normalized = withAutoCategoryIcon(node);
        addNode(normalized);
        const payload: SyncItineraryPayload = { trip_id: activeTripId, action: 'add_node', payload: normalized };
        socketRef.current?.emit('sync_itinerary', payload);
        void syncItinerary(payload).catch(() => {
          removeNode(normalized.node_id);
          setTip('部分 AI 行程同步失敗，未儲存項目已還原。');
          setTimeout(() => setTip(''), 2500);
        });
      }

      if (effectiveMode === 'overwrite_all') {
        showToast(`✨ 已一鍵覆蓋行程，共 ${finalNodes.length} 個新節點`);
      } else if (effectiveMode === 'generate_for_selected_days') {
        showToast(`✨ 已重建 Day ${rangeStartDay} 到 Day ${rangeEndDay}`);
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
        <div className="flex-1 flex flex-col pt-8 sm:pt-12 bg-[#fcfdff] min-h-[100dvh] max-h-[100dvh] overflow-y-auto scroll-smooth">
          <div className="max-w-4xl mx-auto w-full px-4 h-full flex flex-col">
            <button 
              onClick={() => setIsPlanningNew(false)}
              className="mb-4 sm:mb-8 px-4 py-2 rounded-xl bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 w-max transition-all"
            >
              <ArrowLeft size={14} />
              返回清單
            </button>
            <div className="flex-1">
              <AiForm onSubmit={handleAiFormSubmit} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 w-full overflow-y-auto scroll-smooth bg-[#fcfdff] selection:bg-pink-100">
        <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 mt-10 font-sans pb-32 animate-in fade-in duration-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-2 tracking-tight">您的行程手帳</h1>
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
                  <h2 className="text-3xl md:text-5xl font-black text-slate-800 mb-6 leading-tight tracking-tight">準備好下一個目的地了嗎？</h2>
                  <p className="text-slate-500 font-bold text-xl mb-10 leading-relaxed max-w-2xl">
                    輸入想去的地方與偏好，讓 AI 為您量身打造專屬行程，並立即啟動即時共編。
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
                key={trip.tripId ?? trip.id}
                whileHover={{ scale: 1.05, y: -12 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                onClick={() => setActiveTripId(trip.tripId ?? trip.id)}
                className="cursor-pointer group"
              >
                <GlassCard className="!p-0 overflow-hidden rounded-[32px] border border-white/60 shadow-lg hover:shadow-2xl transition-all h-full flex flex-col">
                   <div className="h-40 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                      <img 
                        src={getTripCoverImage(trip.destination)}
                        alt={trip.destination}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_TRIP_IMAGE;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      {(trip.days ?? null) != null && (
                      <div className="absolute bottom-4 left-6">
                         <span className="text-white/80 text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-white/20 backdrop-blur-md rounded-md">
                           {trip.days} DAYS
                         </span>
                      </div>
                      )}
                   </div>
                   <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-2xl font-black text-slate-800 mb-1 group-hover:text-pink-500 transition-colors uppercase tracking-tight">{trip.name}</h3>
                      <p className="text-slate-400 font-bold text-sm mb-4 flex items-center gap-1">
                        <MapPin size={18} className="shrink-0" />
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
      <main className="flex-1 w-full overflow-y-auto animate-in fade-in duration-500">
        <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 mt-6 pb-32">
          {/* Header skeleton */}
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="flex flex-col gap-3">
              <div className="h-3.5 w-20 bg-slate-100 rounded-full animate-pulse" />
              <div className="h-11 w-64 bg-slate-200/80 rounded-2xl animate-pulse" />
              <div className="h-3.5 w-48 bg-slate-100 rounded-full animate-pulse" />
            </div>
            <div className="h-12 w-44 bg-slate-100 rounded-full animate-pulse" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar skeleton */}
            <aside className="hidden lg:flex lg:col-span-1 flex-col gap-6">
              <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-6 flex flex-col gap-3">
                <div className="h-3 w-16 bg-slate-100 rounded-full animate-pulse mb-2" />
                <div className="grid grid-cols-2 gap-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>
              <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-6 h-28 animate-pulse" />
              <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-6 h-40 animate-pulse" />
            </aside>

            {/* Main content skeleton */}
            <div className="lg:col-span-3 flex flex-col gap-8">
              {/* Mobile day selector skeleton */}
              <div className="lg:hidden flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {[1,2,3].map(i => (
                  <div key={i} className="flex-shrink-0 h-11 w-24 bg-slate-100 rounded-full animate-pulse" />
                ))}
              </div>
              {/* AI assistant card skeleton */}
              <div className="bg-white/40 backdrop-blur-sm rounded-[32px] p-6 flex items-center gap-5">
                <div className="w-16 h-16 rounded-[22px] bg-slate-200 animate-pulse shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-6 w-52 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-3 w-32 bg-slate-100 rounded-full animate-pulse" />
                </div>
                <div className="h-12 w-36 bg-slate-200 rounded-full animate-pulse hidden sm:block" />
              </div>
              {/* Itinerary node skeletons */}
              <div className="relative pl-6 flex flex-col gap-8">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-100" />
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.35, ease: 'easeOut' }}
                  >
                    <ItinerarySkeletonCard />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full overflow-y-auto selection:bg-pink-100 animate-in fade-in duration-700 scroll-smooth bg-[#fafafb]">
      <div className="max-w-[1440px] mx-auto w-full pb-32">
        {isOffline && (
          <div className="mx-4 md:mx-8 mb-6 mt-6 glass-card rounded-2xl p-4 bg-amber-50/80 border-amber-200 shadow-sm flex items-center justify-center gap-2">
            <span className="text-amber-700 font-bold text-sm tracking-wide flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              目前離線中，僅供查看喔 📴
            </span>
          </div>
        )}

      {/* Cover Image Banner */}
      <div className="relative w-full h-[40vh] md:h-64 overflow-hidden md:rounded-[40px] mb-6 print:hidden -mt-4 md:mt-0 shadow-2xl z-10 sm:max-w-[calc(100%-2rem)] sm:mx-auto">
        {tripInfo?.coverImage ? (
          <img src={tripInfo.coverImage} alt={tripInfo.destination} className="w-full h-full object-cover scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#fafafb] via-[#fafafb]/20 to-black/40 md:to-black/20" />
        
        {/* Mobile Header Overlay Info - Adjusted for better immersion */}
        <div className="absolute top-6 left-4 right-4 flex justify-between items-start z-50 lg:hidden">
            <button
              onClick={handleBackToTrips}
              className="w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all active:scale-95 shadow-lg"
            >
              <ArrowLeft size={18} strokeWidth={3} />
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleTogglePublicTemplate}
                disabled={isUpdatingPublicState}
                className="px-3 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all active:scale-95 shadow-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                {tripInfo?.isPublic ? '公開中' : '發布'}
              </button>
              <button
                onClick={handleShare}
                className="w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all active:scale-95 shadow-lg"
              >
                <Share2 size={16} strokeWidth={3} />
              </button>
              <button
                onClick={handleExportIcs}
                className="w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all active:scale-95 shadow-lg"
              >
                <Calendar size={16} strokeWidth={3} />
              </button>
            </div>
        </div>

        <div className="absolute bottom-6 left-5 right-5 lg:hidden flex flex-col gap-2 z-50">
          <h1 className="text-3xl font-black text-slate-900 leading-tight drop-shadow-md truncate font-sans tracking-tight">
            {tripInfo?.name || tripInfo?.destination}
          </h1>
          <div className="flex items-center gap-2 text-slate-700 font-black text-[10px] uppercase tracking-widest flex-wrap">
            <span className="bg-white/90 backdrop-blur-xl px-3 py-1.5 rounded-full shadow-sm">{totalDays} DAYS</span>
            <span className="bg-white/90 backdrop-blur-xl px-3 py-1.5 rounded-full shadow-sm">{collaborators.length} TRAVELERS</span>
            <span className={`backdrop-blur-xl px-3 py-1.5 rounded-full shadow-sm ${tripInfo?.isPublic ? 'bg-emerald-100/90 text-emerald-700' : 'bg-white/90 text-slate-500'}`}>
              {tripInfo?.isPublic ? 'PUBLIC TEMPLATE' : 'PRIVATE DRAFT'}
            </span>
            {!!tripInfo?.forkCount && (
              <span className="bg-white/90 backdrop-blur-xl px-3 py-1.5 rounded-full shadow-sm text-slate-500">
                FORKS {tripInfo.forkCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Header Section (Desktop) */}
      <div className="px-5 md:px-8 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="group w-full md:w-auto">
          <div className="hidden lg:flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={handleBackToTrips}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-95"
            >
              <ArrowLeft size={12} strokeWidth={3} />
              返回
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-pink-50 hover:bg-pink-100 border border-pink-100 rounded-xl text-[10px] font-black text-pink-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Share2 size={12} strokeWidth={3} />
              分享
            </button>
            <button
              onClick={handleTogglePublicTemplate}
              disabled={isUpdatingPublicState}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-60 ${tripInfo?.isPublic ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-600' : 'bg-white hover:bg-slate-50 border border-slate-100 text-slate-500'}`}
            >
              <Lock size={12} strokeWidth={3} />
              {tripInfo?.isPublic ? '取消公開' : '發布模板'}
            </button>
            <button
              onClick={handleExportIcs}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-[10px] font-black text-emerald-600 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Calendar size={12} strokeWidth={3} />
              ICS
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-95 print:hidden"
            >
              <Printer size={14} className="shrink-0" />
              PDF
            </button>
          </div>
          
          <div className="hidden lg:block">
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-2 flex items-center gap-3 font-serif tracking-tight leading-tight">
              <div className="flex items-center gap-2 group/title">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                   {tripInfo?.name || tripInfo?.destination || '未命名目的地'}
                </span>
                <span className="text-3xl md:text-4xl animate-bounce group-hover/title:scale-125 transition-transform">✨</span>
              </div>
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-slate-500 font-bold text-[14px]">
               <div className="flex items-center gap-2 px-3 py-1 bg-fuchsia-50/50 rounded-full border border-fuchsia-100/50 shadow-sm">
                  <Calendar size={16} className="text-fuchsia-500 shrink-0" />
                  <span className="text-slate-700 tracking-tight">{tripInfo?.startDate && tripInfo?.endDate ? `${tripInfo.startDate} - ${tripInfo.endDate} • ` : null}<span className="text-fuchsia-600 font-black">{totalDays}</span> 天</span>
               </div>
               <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50/50 rounded-full border border-indigo-100/50 shadow-sm">
                  <Users size={16} className="text-indigo-500 shrink-0" />
                  <span className="text-slate-700 tracking-tight"><span className="text-indigo-600 font-black">{collaborators.length}</span> 位旅行者</span>
               </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm ${tripInfo?.isPublic ? 'bg-emerald-50/60 border-emerald-100/60' : 'bg-slate-50/70 border-slate-100/70'}`}>
                <Share2 size={16} className={tripInfo?.isPublic ? 'text-emerald-500 shrink-0' : 'text-slate-400 shrink-0'} />
                <span className="text-slate-700 tracking-tight">{tripInfo?.isPublic ? '公開模板已上架' : '目前為私人草稿'}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50/50 rounded-full border border-amber-100/50 shadow-sm">
                <Bookmark size={16} className="text-amber-500 shrink-0" />
                <span className="text-slate-700 tracking-tight"><span className="text-amber-600 font-black">{tripInfo?.forkCount ?? 0}</span> 次複製</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 p-1.5 md:p-1.5 rounded-[2rem] w-[calc(100%-2rem)] mx-auto md:w-auto md:mx-0 overflow-x-auto no-scrollbar shadow-lg shadow-pink-100/30 md:shadow-xl border border-white bg-white/70 backdrop-blur-xl sticky top-4 z-40 md:relative md:top-0">
          <button 
            onClick={() => setViewMode('list')}
            className={`flex-1 md:flex-none px-5 md:px-8 py-2.5 md:py-3 rounded-full font-black text-[10px] md:text-xs tracking-widest uppercase transition-all whitespace-nowrap ${viewMode === 'list' ? 'bg-slate-800 text-white shadow-xl scale-95 md:scale-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white border sm:border-transparent'}`}
          >
            LIST
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`flex-1 md:flex-none px-5 md:px-8 py-2.5 md:py-3 rounded-full font-black text-[10px] md:text-xs tracking-widest uppercase transition-all whitespace-nowrap ${viewMode === 'map' ? 'bg-slate-800 text-white shadow-xl scale-95 md:scale-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white border sm:border-transparent'}`}
          >
            EXPLORE
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            className={`flex-1 md:flex-none px-5 md:px-8 py-2.5 md:py-3 rounded-full font-black text-[10px] md:text-xs tracking-widest uppercase transition-all whitespace-nowrap ${viewMode === 'calendar' ? 'bg-slate-800 text-white shadow-xl scale-95 md:scale-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white border sm:border-transparent'}`}
          >
            CALENDAR
          </button>
        </div>
      </div>

      <div className="px-4 md:px-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Filters & Info */}
        <aside className="hidden lg:flex lg:col-span-1 flex-col gap-6 sticky top-24 h-fit max-h-[calc(100vh-120px)] overflow-y-auto pr-2 no-scrollbar">
          <GlassCard className="!p-6 shadow-xl shadow-slate-200/40 ring-1 ring-white/60 bg-white/70 backdrop-blur-3xl overflow-hidden rounded-[32px] border border-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                 <span>旅程天數</span> <span className="text-sm">📅</span>
              </h3>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <Settings2 size={14} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 relative z-10">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const isActive = safeSelectedDay === day;
                const count = nodes.filter((n: ItineraryNode) => n.day === day).length;
                const dateStr = getDateForDay(day, tripInfo?.startDate) || '';
                const displayDate = dateStr ? new Date(dateStr).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }) : '';

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
                    <span className="flex items-center gap-1">
                      <span>DAY {day}</span>
                      {loadingDay === day && <Loader2 size={12} className="animate-spin" />}
                    </span>
                    {displayDate && <span className="text-[10px] opacity-70 tracking-tighter">{displayDate}</span>}
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
                {collaborators.map((c: Collaborator, i: number) => (
                  <CollaboratorAvatar key={c.id} collaborator={c} index={i} isOnline={true} />
                ))}
             </div>
          </GlassCard>

          {/* Favorites List - Desktop */}
          <GlassCard className="!p-6">
             <div className="flex items-center justify-between mb-5">
                <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">口袋名單</span>
               <span className="text-[10px] font-bold text-pink-400">拖曳或點擊 + 加入</span>
             </div>
             <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1 -mr-1">
                {favorites.map((spot: FavoriteSpot) => (
                  <DraggableFavoriteSpot
                    key={spot.id}
                    spot={spot}
                    selectedDay={safeSelectedDay}
                    isOffline={isOffline}
                    onAdd={addSpotToDay}
                    onDelete={handleDeleteFavorite}
                    onDragStart={setDraggingFavorite}
                    onDragEnd={() => setDraggingFavorite(null)}
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
                  {addingFavorite && <p className="text-[10px] font-bold text-pink-500 mt-2 animate-pulse uppercase tracking-widest text-center">GEOCODING...</p>}
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
          {/* Memory Album — Trip Recap Banner */}
          {tripInfo?.endDate && new Date(tripInfo.endDate) < new Date() && (
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-fuchsia-50 via-pink-50 to-rose-50 border border-pink-100 p-6 print:hidden">
              <div className="absolute top-3 right-4 text-4xl opacity-20 select-none">📸</div>
              <p className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest mb-1">旅程回顧</p>
              <h3 className="font-black text-slate-800 text-xl mb-3">{tripInfo.name} · 旅行記憶</h3>
              <div className="flex flex-wrap gap-2">
                {nodes
                  .filter((n: ItineraryNode) => n.emoji && n.title)
                  .slice(0, 12)
                  .map((n: ItineraryNode) => (
                    <span key={n.node_id} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 rounded-full text-[12px] font-bold text-slate-700 border border-pink-100 shadow-sm">
                      <span>{n.emoji}</span>
                      <span className="line-clamp-1 max-w-[100px]">{n.title}</span>
                    </span>
                  ))}
              </div>
              {nodes.length > 12 && (
                <p className="text-[11px] text-slate-400 mt-2">還有 {nodes.length - 12} 個旅遊景點...</p>
              )}
            </div>
          )}

          {/* Mobile Day Selector */}
          <div className="lg:hidden flex items-center gap-3 mb-6 overflow-hidden">
            <div className="flex gap-2.5 overflow-x-auto py-3 px-1 no-scrollbar flex-1 -mx-2 snap-x">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const isActive = safeSelectedDay === day;
                const count = nodes.filter((n: ItineraryNode) => n.day === day).length;
                const dateStr = getDateForDay(day, tripInfo?.startDate) || '';
                const displayDate = dateStr ? new Date(dateStr).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }) : '';

                return (
                  <motion.button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    whileTap={{ scale: 0.95 }}
                    className={`flex flex-col min-w-[70px] sm:min-w-[85px] p-3 sm:p-4 rounded-3xl font-black text-xs transition-all uppercase tracking-widest shrink-0 border-2 snap-center ${
                      isActive
                        ? 'bg-white text-pink-600 border-pink-500 shadow-xl shadow-pink-100/50 scale-105'
                        : 'bg-white/40 border-white/60 text-slate-500 backdrop-blur-sm'
                    }`}
                  >
                    <span className="text-[10px] mb-1 opacity-70 uppercase tracking-widest flex items-center gap-1 justify-center">
                      <span>DAY</span>
                      {loadingDay === day && <Loader2 size={11} className="animate-spin" />}
                    </span>
                    <span className="text-lg sm:text-xl leading-none">{day}</span>
                    {displayDate && <span className={`text-[10px] font-bold mt-1.5 opacity-60 tracking-tight`}>{displayDate}</span>}
                  </motion.button>
                );
              })}
            </div>
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
                {Object.values(nodeEditingLocks).some((lock) => lock.day === safeSelectedDay) && (
                  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-fuchsia-50 border border-fuchsia-100 text-fuchsia-700 font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <Lock size={18} />
                    <span>
                      {Object.values(nodeEditingLocks).filter((lock) => lock.day === safeSelectedDay).slice(0, 2).map((lock) => lock.userName).join('、')}
                      正在編輯 Day {safeSelectedDay} 的景點
                    </span>
                  </div>
                )}

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
                          <h3 className="font-black text-xl text-slate-800 leading-tight">需要微調 Day {safeSelectedDay} 嗎？</h3>
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

                            {/* Travel Preferences */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* 旅伴 */}
                              <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">旅伴</label>
                                <div className="flex flex-wrap gap-2">
                                  {['獨行俠', '情侶蜜遊', '親子同遊', '好友出遊', '銀髮樂齡'].map(opt => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setPlannerField('companions', plannerForm.companions === opt ? '' : opt)}
                                      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${plannerForm.companions === opt ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* 預算 */}
                              <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">預算</label>
                                <div className="flex flex-wrap gap-2">
                                  {['窮遊背包客', '小資精打細算', '舒適中等', '奢華享受'].map(opt => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setPlannerField('budget', plannerForm.budget === opt ? '' : opt)}
                                      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${plannerForm.budget === opt ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* 旅遊節奏 */}
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">旅遊節奏</label>
                              <div className="flex flex-wrap gap-2">
                                {['特種兵式', '睡到自然醒', '隨興漫遊', '在地深度', '網美打卡'].map(opt => {
                                  const vibes = plannerForm.vibes || [];
                                  const selected = vibes.includes(opt);
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setPlannerField('vibes', selected ? vibes.filter((v: string) => v !== opt) : [...vibes, opt])}
                                      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selected ? 'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 興趣偏好 */}
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">興趣偏好</label>
                              <div className="flex flex-wrap gap-2">
                                {['大自然', '歷史文化', '購物血拼', '主題樂園', '在地美食', '戶外刺激'].map(opt => {
                                  const interests = plannerForm.interests || [];
                                  const selected = interests.includes(opt);
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setPlannerField('interests', selected ? interests.filter((v: string) => v !== opt) : [...interests, opt])}
                                      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selected ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 飲食需求 */}
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">飲食需求</label>
                              <div className="flex flex-wrap gap-2">
                                {['無限制', '純素', '蛋奶素', '無麩質', '不吃海鮮'].map(opt => {
                                  const dietary = plannerForm.dietary || [];
                                  const selected = dietary.includes(opt);
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setPlannerField('dietary', selected ? dietary.filter((v: string) => v !== opt) : [...dietary, opt])}
                                      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selected ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 交通偏好 */}
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">交通偏好</label>
                              <div className="flex flex-wrap gap-2">
                                {['大眾運輸', '自駕租車', '包車', '徒步為主'].map(opt => {
                                  const transport = plannerForm.transport || [];
                                  const selected = transport.includes(opt);
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setPlannerField('transport', selected ? transport.filter((v: string) => v !== opt) : [...transport, opt])}
                                      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selected ? 'bg-teal-100 text-teal-600 border-teal-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={() => setAiGenerateMode('selected_day')}
                                className={`flex-1 py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-widest transition-all border ${aiGenerateMode === 'selected_day' ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                              >
                                重建 Day {safeSelectedDay}
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
                                  {Array.from({ length: totalDays }, (_, i) => (
                                    <option key={i+1} value={i+1}>{i+1}</option>
                                  ))}
                                </select>
                                <span className="text-slate-400 font-bold px-1">至</span>
                                <select 
                                  value={rangeEndDay} 
                                  onChange={e => setRangeEndDay(Number(e.target.value))}
                                  className="bg-white border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-700 focus:ring-2 focus:ring-pink-200 shadow-sm"
                                >
                                  {Array.from({ length: totalDays }, (_, i) => (
                                    <option key={i+1} value={i+1}>{i+1}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <button
                              onClick={() => void handleAutoFetchFlights()}
                              disabled={flightsLoading || aiLoading}
                              className="w-full py-3 rounded-full bg-slate-50 border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all hover:bg-slate-100"
                            >
                              {flightsLoading ? <Loader2 size={14} className="animate-spin" /> : <Plane size={16} />}
                              自動抓取航班做為 AI 規劃參考
                            </button>

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
                  day={safeSelectedDay}
                  onDelete={handleDeleteNode}
                  onUpdate={handleUpdateNode}
                  onReorder={handleReorder}
                  onManualAdd={handleManualAddNode}
                  onQuickExpense={setExpenseTargetNode}
                  draggingFavorite={draggingFavorite}
                  favoriteSuggestions={favorites}
                  onFavoriteDrop={(spot, dropDay) => {
                    addSpotToDay(spot, dropDay);
                    setDraggingFavorite(null);
                  }}
                  onAskAiForDay={() => void handleAiSuggest('selected_day')}
                  onRandomizeFromFavorites={() => handleFillDayFromFavorites(safeSelectedDay)}
                  isOffline={isOffline}
                  aiLoading={aiLoading}
                  tripId={activeTripId}
                  destination={tripInfo?.destination || ''}
                  tripStartDate={tripInfo?.startDate}
                  weather={weatherData}
                  recentlySyncedNodeIds={recentlySyncedNodeIds}
                  onEditingChange={handleEditingChange}
                  nodeEditingLocks={nodeEditingLocks}
                />
              </motion.div>
            ) : viewMode === 'map' ? (
              <motion.div
                key="map"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="w-full"
              >
                <MapView items={selectedDayNodes} allNodes={nodes} />
              </motion.div>
            ) : (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="w-full"
              >
                <CalendarView nodes={nodes} tripStartDate={tripInfo?.startDate ?? undefined} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {tip ? <span className="fixed bottom-28 left-0 right-0 text-center text-xs font-black text-slate-400 pointer-events-none animate-pulse">{tip}</span> : null}

      {/* Floating Action Buttons (Mobile Only) */}
      <div className="md:hidden fixed bottom-24 right-5 flex flex-col gap-4 z-50">
        {!loading && favorites.length > 0 && (
          <button 
            onClick={() => setShowMobileFavorites(true)}
            className="p-1 rounded-full bg-white/30 backdrop-blur-xl border border-white/60 shadow-2xl active:scale-90 transition-all group overflow-hidden shadow-fuchsia-200/50 relative"
          >
            <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-inner text-fuchsia-500 relative">
              <div className="absolute inset-0 bg-fuchsia-500/10 rounded-full" />
              <Bookmark size={22} className="drop-shadow-sm" />
              <span className="absolute -top-1 -right-1 bg-fuchsia-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {favorites.length}
              </span>
            </div>
          </button>
        )}
        <button 
          onClick={() => setIsPlanningNew(true)}
          className="p-1 rounded-full bg-white/30 backdrop-blur-xl border border-white/60 text-white shadow-2xl active:scale-90 transition-all group overflow-hidden shadow-pink-200/50"
        >
          <div className="bg-gradient-to-tr from-pink-500 to-fuchsia-600 w-14 h-14 rounded-full flex items-center justify-center shadow-inner relative">
            <div className="absolute inset-0 bg-white/10 rounded-full" />
            <Sparkles size={24} className="text-white drop-shadow-sm" />
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showMobileFavorites && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFavorites(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-[210] flex flex-col lg:hidden"
            >
              <div className="shrink-0 p-6 pb-2 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur-xl rounded-t-3xl sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-500 shadow-sm border border-fuchsia-100/50">
                    <Bookmark size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-slate-800 tracking-tight">口袋名單</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Saved Spots</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMobileFavorites(false)}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto w-full no-scrollbar overscroll-contain">
                 <div className="flex flex-col gap-4">
                   {favorites.map((spot: FavoriteSpot) => (
                     <DraggableFavoriteSpot
                       key={spot.id}
                       spot={spot}
                       selectedDay={safeSelectedDay}
                       isOffline={isOffline}
                       onAdd={(node, day) => { addSpotToDay(node, day); setShowMobileFavorites(false); }}
                       onDelete={handleDeleteFavorite}
                       onDragStart={setDraggingFavorite}
                       onDragEnd={() => setDraggingFavorite(null)}
                     />
                   ))}
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {expenseTargetNode && activeTripId && (
        <QuickExpenseModal
          tripId={activeTripId}
          destination={tripInfo?.destination || ''}
          node={expenseTargetNode}
          members={collaborators.map((member: Collaborator) => member.name).filter(Boolean)}
          onClose={() => setExpenseTargetNode(null)}
        />
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
           {(collaborator.avatar?.length ?? 0) > 2 ? <img src={collaborator.avatar} className="w-full h-full object-cover" /> : (collaborator.avatar ?? '👤')}
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

// ─── Constants & Helpers ────────────────────────────────────────────────────────

const getCategoryStyle = (category: string) => {
  switch (category) {
    case 'food':
    case 'restaurant':
      return 'border-orange-200/80 bg-gradient-to-br from-white/95 via-orange-50/90 to-amber-50/90';
    case 'landmark':
    case 'attraction':
      return 'border-sky-200/80 bg-gradient-to-br from-white/95 via-sky-50/92 to-blue-50/90';
    case 'activity':
      return 'border-emerald-200/80 bg-gradient-to-br from-white/95 via-emerald-50/92 to-teal-50/88';
    case 'shopping':
      return 'border-purple-200/80 bg-gradient-to-br from-white/95 via-purple-50/92 to-fuchsia-50/88';
    case 'hotel':
    case 'accommodation':
      return 'border-indigo-200/80 bg-gradient-to-br from-white/95 via-indigo-50/92 to-slate-100/92';
    case 'transport':
    case 'flight':
      return 'border-indigo-200/80 bg-gradient-to-br from-white/95 via-indigo-50/92 to-slate-100/92';
    default:
      return 'border-slate-200/80 bg-white/88';
  }
};

function splitRouteLabel(value?: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  for (const separator of ['→', '->', '➜', '➡', '⇢']) {
    if (!normalized.includes(separator)) continue;
    const [from, to] = normalized.split(separator).map((part) => part.trim()).filter(Boolean);
    if (from && to) return { from, to };
  }
  const matched = normalized.match(/^(.+?)\s+(?:to|TO)\s+(.+)$/);
  if (matched) {
    return { from: matched[1].trim(), to: matched[2].trim() };
  }
  return null;
}

function getFlightRouteSummary(item: ItineraryNode, linkedFact?: TravelFact) {
  const metadata = linkedFact?.metadata || {};
  const from = String(metadata.depCode || '').trim();
  const to = String(metadata.arrCode || linkedFact?.locationName || '').trim();
  const parsed = splitRouteLabel(item.title) || splitRouteLabel(item.description) || splitRouteLabel(item.notes);

  return {
    from: from || parsed?.from || '出發地',
    to: to || parsed?.to || '目的地',
    flightNumber: String(metadata.flightNumber || metadata.airline || metadata.provider || 'BOARDING PASS').trim(),
  };
}

// ─── Draggable Favorite Spot ─────────────────────────────────────────────────

function DraggableFavoriteSpot({
  spot,
  selectedDay,
  isOffline,
  onAdd,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  spot: FavoriteSpot;
  selectedDay: number;
  isOffline: boolean;
  onAdd: (spot: FavoriteSpot, day: number) => void;
  onDelete: (id: string) => void | Promise<void>;
  onDragStart?: (spot: FavoriteSpot) => void;
  onDragEnd?: () => void;
  key?: string;
}) {
  const [enrichment, setEnrichment] = useState<{ description?: string; wiki_url?: string; thumbnail?: string }>({});

  useEffect(() => {
    let cancelled = false;
    fetchSpotEnrichment(spot.title).then(data => { if (!cancelled) setEnrichment(data); });
    return () => { cancelled = true; };
  }, [spot.title]);

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      draggable={!isOffline}
      onDragStart={(event: any) => {
        if (isOffline) return;
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('text/plain', spot.id);
        onDragStart?.(spot);
      }}
      onDragEnd={() => onDragEnd?.()}
      className="group relative flex flex-col gap-2 p-3 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-sm hover:shadow-xl transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-white flex items-center justify-center text-xl shadow-sm border border-slate-100/50 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
            {enrichment.thumbnail
              ? <img src={enrichment.thumbnail} alt={spot.title} className="w-full h-full object-cover" />
              : spot.emoji}
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-[13px] leading-tight">{spot.title}</h4>
            <p className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-[0.1em]">口袋名單</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAdd(spot, selectedDay)}
            disabled={isOffline}
            className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-slate-900"
            title="加入今天"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
          <button
            onClick={() => onDelete(spot.id)}
            className="w-8 h-8 rounded-full bg-white/50 text-slate-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {enrichment.description && (
        <div className="flex flex-col gap-1 pl-12">
          <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{enrichment.description}</p>
          {enrichment.wiki_url && (
            <a href={enrichment.wiki_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-fuchsia-500 hover:underline">維基百科 →</a>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Itinerary List ───────────────────────────────────────────────────────────

function ItineraryListItem({
  item,
  idx,
  onDelete,
  onUpdate,
  isOffline,
  tripId,
  destination,
  tripStartDate,
  previousItem,
  nextItem,
  isRecentlySynced,
  onQuickExpense,
  onEditingChange,
  collaboratingLock
}: {
  item: ItineraryNode;
  idx: number;
  onDelete: (node_id: string) => void;
  onUpdate: (node: ItineraryNode) => void;
  isOffline: boolean;
  tripId: string;
  destination: string;
  tripStartDate?: string | null;
  previousItem?: ItineraryNode;
  nextItem?: ItineraryNode;
  isRecentlySynced?: boolean;
  onQuickExpense?: (node: ItineraryNode) => void;
  onEditingChange?: (nodeId: string, day: number, isEditing: boolean) => void;
  collaboratingLock?: { userName: string; day: number };
  key?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDate, setEditDate] = useState(item.date || getDateForDay(item.day, tripStartDate) || '');
  const [editTime, setEditTime] = useState(item.time);
  const [editEmoji, setEditEmoji] = useState(item.emoji);
  const [editDescription, setEditDescription] = useState(item.description || item.notes || '');
  const [editTransport, setEditTransport] = useState(item.transport_to_next || '');
  const [editImageUrl, setEditImageUrl] = useState(item.image_url || '');
  const [editAttachments, setEditAttachments] = useState<ItineraryAttachment[]>(item.attachments || []);
  const [editLinkedFactId, setEditLinkedFactId] = useState(item.linkedFactId || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const facts = useTripFactsStore(s => s.facts);
  const linkedFact = item.linkedFactId ? facts.find((fact) => fact.id === item.linkedFactId) : undefined;
  const linkedFactRedirect = getTravelFactRedirectPayload(linkedFact);
  const linkedFactBookingLabel = getTravelFactBookingLabel(linkedFact);
  const detailCopy = item.description || item.notes || '';
  const isFlightCard = item.category === 'flight';
  const isHotelCard = item.category === 'hotel' || item.category === 'accommodation';
  const isAnchorCard = isFlightCard || isHotelCard;
  const flightRoute = isFlightCard ? getFlightRouteSummary(item, linkedFact) : null;
  const canExpandCopy = item.title.trim().length > 28 || detailCopy.length > 110;

  useEffect(() => {
    setEditTitle(item.title);
    setEditDate(item.date || getDateForDay(item.day, tripStartDate) || '');
    setEditTime(item.time);
    setEditEmoji(item.emoji);
    setEditDescription(item.description || item.notes || '');
    setEditTransport(item.transport_to_next || '');
    setEditImageUrl(item.image_url || '');
    setEditAttachments(item.attachments || []);
    setEditLinkedFactId(item.linkedFactId || '');
    setIsExpanded(false);
  }, [item, tripStartDate]);

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const uploaded = await Promise.all(
      files.map(async (file) => ({
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        url: await readFileAsDataUrl(file),
      })),
    );

    setEditAttachments((prev) => [...prev, ...uploaded]);
    event.target.value = '';
  };

  const removeAttachment = (attachmentId: string) => {
    setEditAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId));
  };

  const handleSave = () => {
    onUpdate({
      ...item,
      day: getDayForDate(editDate, tripStartDate, item.day),
      date: editDate || undefined,
      time: normalizeClockInput(editTime),
      title: editTitle,
      emoji: editEmoji,
      description: editDescription,
      transport_to_next: editTransport || undefined,
      image_url: editImageUrl,
      attachments: editAttachments,
      linkedFactId: editLinkedFactId || undefined,
      timestamp: buildTimestampFromDateTime(editDate, normalizeClockInput(editTime)) ?? item.timestamp,
    });
    setIsEditing(false);
    onEditingChange?.(item.node_id, getDayForDate(editDate, tripStartDate, item.day), false);
  };

  const openEditor = () => {
    if (collaboratingLock && !isEditing) {
      useAppStore.getState().showToast(`${collaboratingLock.userName} 正在編輯這個景點。`, 'warning');
      return;
    }
    if (!isOffline && !isEditing) {
      setIsEditing(true);
      onEditingChange?.(item.node_id, item.day, true);
    }
  };

  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigate = async () => {
    let lat = item.lat;
    let lng = item.lng;
    
    if (!lat || !lng) {
      setIsNavigating(true);
      try {
        const coords = await geocodeSpot(item.title, destination);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          // Optimistically update
          onUpdate({ ...item, lat, lng });
        }
      } finally {
        setIsNavigating(false);
      }
    }
    
    if (!lat || !lng) {
      useAppStore.getState().showToast('無法取得景點座標', 'warning');
      return;
    }
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const label = encodeURIComponent(item.title);
    const url = isIOS 
      ? `maps://maps.apple.com/?q=${label}&ll=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const handleRegenerate = async () => {
    if (!tripId || !destination) return;
    setRegenerating(true);
    try {
      const travelFactsContext = facts.map((fact) => `[ID: ${fact.id}] ${fact.factType} - ${fact.title}`).join('\n');
      const newNode = await regenerateItinerarySpot({
        trip_id: tripId,
        node_id: item.node_id,
        destination: destination,
        day: item.day,
        current_date: item.date || getDateForDay(item.day, tripStartDate),
        current_time: item.time,
        current_title: item.title,
        current_category: item.category,
        notes: item.description || item.notes,
        preserve_time_window: true,
        previous_node: previousItem
          ? {
              time: previousItem.time,
              title: previousItem.title,
              category: previousItem.category,
            }
          : undefined,
        next_node: nextItem
          ? {
              time: nextItem.time,
              title: nextItem.title,
              category: nextItem.category,
            }
          : undefined,
        travel_facts_context: travelFactsContext,
      });
      const { ai_note, intensity, ...restNode } = newNode as any;
      onUpdate({
        ...item,
        ...restNode,
        time: restNode.time || item.time,
        date: item.date,
        day: item.day,
        sort_order: item.sort_order,
        ai_note: ai_note || undefined,
        intensity: intensity || undefined,
        description: ai_note || restNode.description,
        timestamp: buildTimestampFromDateTime(item.date, restNode.time || item.time) ?? item.timestamp,
      });
    } catch (err) {
      console.error('Regenerate failed:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const meta = getCategoryMeta(item.category);

  return (
    <div className="relative flex items-stretch group w-full px-1 pl-6 sm:px-0 sm:pl-8 lg:pl-10">
      {/* Timeline Thread */}
      <div className="absolute left-2.5 sm:left-3.5 lg:left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-slate-200/50 rounded-full group-last:bottom-auto group-last:h-12" />
      <div className={`absolute left-1 sm:left-2 lg:left-2.5 top-5 sm:top-6 w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-4.5 lg:h-4.5 rounded-full border-[3px] lg:border-4 border-white shadow-sm z-20 transition-all duration-500 group-hover:scale-125 ${item.linkedFactId ? 'bg-sky-400 ring-2 ring-sky-200 ring-offset-1 shadow-[0_0_8px_rgba(14,165,233,0.5)]' : 'bg-slate-300 group-hover:bg-fuchsia-400'}`} />

      {/* Content Card */}
      {collaboratingLock && (
        <div className="absolute -inset-1 rounded-[40px] bg-gradient-to-r from-fuchsia-400 to-purple-400 opacity-20 blur-md z-0 animate-pulse pointer-events-none" />
      )}
      <GlassCard
        className={`flex-1 !p-1.5 sm:!p-2.5 md:!p-3 !rounded-[16px] sm:!rounded-[20px] ${getCategoryStyle(item.category)} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-700 border border-white/80 relative z-10 ${!isOffline && !isEditing ? 'cursor-pointer' : ''} ${collaboratingLock ? 'ring-2 ring-fuchsia-400/60' : ''} ${isRecentlySynced ? 'ring-2 ring-emerald-300/80 bg-emerald-50/40 shadow-[0_0_18px_-6px_rgba(16,185,129,0.45)]' : ''} ${item.linkedFactId ? 'ring-2 ring-sky-300/40 border-sky-200/50 shadow-[0_0_15px_-5px_rgba(14,165,233,0.3)]' : ''}`}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
           if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
          openEditor();
        }}
      >
        {item.linkedFactId && !isEditing && (
          <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-sky-500 text-white shadow-sm ring-2 ring-white z-20">
            <Link size={10} strokeWidth={3} />
          </div>
        )}
        <div className="flex flex-col gap-2 sm:gap-2 w-full">
          <div className="flex flex-row items-center sm:items-start gap-2 sm:gap-2.5">
            <div className={`relative w-6 h-6 sm:w-8 sm:h-8 shrink-0 rounded-[10px] sm:rounded-[12px] flex items-center justify-center text-sm sm:text-base shadow-inner border border-slate-100/50 transition-all group-hover:scale-110 group-hover:rotate-3 duration-700 ${item.category === 'flight' ? 'bg-gradient-to-br from-indigo-50 to-blue-50' : 'bg-white'}`}>
              {isEditing ? (
                 <button type="button" aria-label="選擇景點表情" title="選擇景點表情" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="animate-pulse active:scale-95 transition-transform w-full h-full flex items-center justify-center">
                    {editEmoji}
                 </button>
              ) : (
                 <span className="filter drop-shadow-sm select-none transition-transform group-hover:scale-110">{item.emoji}</span>
              )}
              {isEditing && showEmojiPicker && (
                 <div className="absolute top-full left-0 mt-2 p-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white z-[100] flex flex-wrap gap-2 w-48 animate-in zoom-in-95 duration-200">
                   {EMOJI_OPTIONS.map(e => (
                     <button key={e} type="button" title={`使用 ${e}`} onClick={() => { setEditEmoji(e); setShowEmojiPicker(false); }} className="w-10 h-10 flex items-center justify-center hover:bg-pink-50 rounded-xl text-xl transition-colors">{e}</button>
                   ))}
                 </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
               {!isEditing && isFlightCard && flightRoute && (
                 <div className="mb-2 overflow-hidden rounded-[18px] border border-indigo-200/80 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-3 py-3 text-white shadow-lg">
                   <div className="flex items-center justify-between gap-3">
                     <div className="min-w-0">
                       <div className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-100/70">Departure</div>
                       <div className={`text-lg sm:text-xl font-black leading-none ${isExpanded ? 'whitespace-normal' : 'truncate'}`}>{flightRoute.from}</div>
                     </div>
                     <div className="flex-1 min-w-[72px] px-2">
                       <div className="flex items-center gap-2 text-indigo-100/80">
                         <div className="h-px flex-1 border-t border-dashed border-white/35" />
                         <Plane size={14} className="shrink-0" />
                         <div className="h-px flex-1 border-t border-dashed border-white/35" />
                       </div>
                       <div className="mt-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-indigo-100/70 truncate">{flightRoute.flightNumber}</div>
                     </div>
                     <div className="min-w-0 text-right">
                       <div className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-100/70">Arrival</div>
                       <div className={`text-lg sm:text-xl font-black leading-none ${isExpanded ? 'whitespace-normal' : 'truncate'}`}>{flightRoute.to}</div>
                     </div>
                   </div>
                 </div>
               )}
               {!isEditing && isHotelCard && (
                 <div className="mb-2 rounded-[18px] border border-indigo-200/70 bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 px-3 py-3 text-white shadow-lg">
                   <div className="flex items-center justify-between gap-3">
                     <div className="min-w-0">
                       <div className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-100/70">Tonight's Stay</div>
                       <div className={`text-lg sm:text-xl font-black leading-tight ${isExpanded ? 'whitespace-normal' : 'truncate'}`}>{item.title}</div>
                     </div>
                     <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-50">休息錨點</span>
                   </div>
                 </div>
               )}
               {!isEditing && !isAnchorCard && (
                 <h3 title={item.title} className={`text-[12px] sm:text-[14px] font-black tracking-tight text-slate-900 leading-tight mb-0.5 font-sans ${isExpanded ? '' : 'line-clamp-2'}`}>
                   {item.title}
                 </h3>
               )}
               {!isEditing && isAnchorCard && (
                 <p className="mb-1 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                   {isFlightCard ? '跨區交通錨點' : '今晚住宿錨點'}
                 </p>
               )}
               <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
               {item.date && (
                 <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-white/95 text-[10px] sm:text-[11px] font-black tracking-widest text-slate-600 border border-slate-200 flex items-center gap-0.5">
                   <Calendar size={11} className="sm:w-[13px] sm:h-[13px]" />
                   {item.date}
                 </span>
               )}
               <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-800 text-[10px] sm:text-[11px] font-black tracking-widest text-white border border-slate-900 flex items-center gap-0.5">
                  <Clock size={11} className="sm:w-[13px] sm:h-[13px]" />
                  {item.time}
               </span>
               <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-pink-50 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] text-pink-700 border border-pink-100/70">
                 {meta.label}
               </span>
               {item.intensity && (
                 <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] border ${item.intensity === 'hardcore' ? 'bg-rose-50 text-rose-600 border-rose-100' : item.intensity === 'chill' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                   {item.intensity === 'hardcore' ? '高強度' : item.intensity === 'chill' ? '輕鬆' : '適中'}
                 </span>
               )}
               {linkedFact && (
                 <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-cyan-50 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] text-cyan-600 border border-cyan-100/50 flex items-center gap-0.5">
                   <Link size={11} className="sm:w-[13px] sm:h-[13px]" />
                   已綁定: {linkedFact.title}
                 </span>
               )}
               {collaboratingLock && (
                 <motion.span
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-fuchsia-100 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.1em] text-fuchsia-700 border border-fuchsia-200 shadow-sm shadow-fuchsia-200/50"
                 >
                   <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 animate-ping inline-block" />
                   <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 absolute" />
                   {collaboratingLock.userName} 編輯中
                 </motion.span>
               )}
               {isRecentlySynced && (
                 <motion.span
                   initial={{ scale: 0.85, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.1em] text-emerald-700 border border-emerald-200 shadow-sm"
                 >
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                   剛同步
                 </motion.span>
               )}
               {!isEditing && (
                 <button 
                   type="button"
                   aria-label={item.is_visited ? '標記為未打卡' : '標記為已打卡'}
                   onClick={() => onUpdate({ ...item, is_visited: !item.is_visited })}
                   className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] transition-all border ${item.is_visited ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                 >
                    {item.is_visited ? <CheckCircle2 size={13} className="text-emerald-500" /> : <div className="w-3 h-3 rounded-full border-2 border-slate-300" />}
                   {item.is_visited ? '已打卡' : '未打卡'}
                 </button>
               )}
               {item.category === 'flight' && (
                 <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] text-indigo-500 flex items-center gap-1 animate-pulse">
                   <div className="w-1 h-1 rounded-full bg-indigo-500" />
                   CONFIRMED
                 </span>
               )}
             </div>
           </div>
         </div>
         
         <div className="w-full">
           {isEditing ? (
              <div className="flex flex-col gap-3">
                 <input 
                   autoFocus
                   value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="text-lg font-black text-slate-900 bg-white/85 border border-slate-200 rounded-2xl px-5 py-2.5 outline-none focus:ring-4 focus:ring-pink-100 transition-all font-sans"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(true)}
                      className="text-sm font-black text-slate-700 bg-white/85 border border-slate-200 rounded-2xl px-4 py-2 outline-none hover:ring-4 hover:ring-pink-100 transition-all text-left flex items-center gap-2"
                    >
                      <span className="text-pink-400">📅</span>
                      {editDate || '選擇日期'}
                    </button>
                    {showDatePicker && (
                      <DatePickerPopup
                        allowPast
                        selectedDate={editDate}
                        onSelect={setEditDate}
                        onClose={() => setShowDatePicker(false)}
                      />
                    )}
                    <input
                      type="time"
                      inputMode="numeric"
                      step={300}
                      value={editTime}
                      onChange={e => setEditTime(e.target.value)}
                      className="text-sm font-black text-slate-700 bg-white/85 border border-slate-200 rounded-2xl px-4 py-2 outline-none focus:ring-4 focus:ring-pink-100 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">詳細說明 / 備註 (Description)</label>
                    <textarea
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      placeholder="寫下你的旅行手帳日記，或是更詳細的行程說明..."
                      className="text-sm font-bold text-slate-700 bg-white/85 border border-slate-200 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-pink-100 transition-all min-h-[80px] resize-y"
                    />
                  </div>
                  <input
                    value={editTransport}
                    onChange={e => setEditTransport(e.target.value)}
                    placeholder="前往下一站交通資訊，例如：地鐵約 20 分鐘"
                    className="text-xs font-bold text-slate-700 bg-white/85 border border-slate-200 rounded-2xl px-5 py-2 outline-none focus:ring-4 focus:ring-pink-100 transition-all"
                  />
                  <input
                    value={editImageUrl}
                    onChange={e => setEditImageUrl(e.target.value)}
                    placeholder="貼上照片網址 (例如: https://...jpg)"
                    className="text-xs font-bold text-slate-700 bg-white/85 border border-slate-200 rounded-2xl px-5 py-2 outline-none focus:ring-4 focus:ring-pink-100 transition-all"
                  />
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">附件 / 票券</label>
                      <label className="px-3 py-2 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors">
                        上傳圖片或 PDF
                        <input type="file" accept="image/*,.pdf,application/pdf" multiple className="hidden" onChange={handleAttachmentUpload} />
                      </label>
                    </div>
                    {editAttachments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {editAttachments.map((attachment) => {
                          const isImage = attachment.type.startsWith('image/');
                          return (
                            <div key={attachment.id} className="relative group/attachment rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                              <button
                                type="button"
                                onClick={() => window.open(attachment.url, '_blank', 'noopener,noreferrer')}
                                className={`flex items-center gap-2 ${isImage ? 'p-1' : 'px-3 py-2'} text-left`}
                              >
                                {isImage ? (
                                  <img src={attachment.url} alt={attachment.name} className="w-20 h-20 object-cover rounded-[12px]" />
                                ) : (
                                  <span className="text-xs font-black text-slate-700">📄 {attachment.name}</span>
                                )}
                              </button>
                              <button
                                type="button"
                                aria-label={`移除附件 ${attachment.name}`}
                                title={`移除附件 ${attachment.name}`}
                                onClick={() => removeAttachment(attachment.id)}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-slate-500 hover:text-rose-500 shadow-sm opacity-0 group-hover/attachment:opacity-100 transition-opacity"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-slate-500">可放電子票、QR code 截圖或 PDF 憑證。</p>
                    )}
                  </div>
                  {facts && facts.length > 0 && (
                    <select
                      value={editLinkedFactId}
                      onChange={e => setEditLinkedFactId(e.target.value)}
                      className="text-sm font-bold text-slate-700 bg-white/85 border border-slate-200 rounded-2xl px-4 py-2 outline-none focus:ring-4 focus:ring-pink-100 transition-all"
                    >
                      <option value="">無關聯 Travel Fact (未選擇)</option>
                      {facts.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.title} ({f.factType})
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                     <button type="button" onClick={handleSave} className="px-6 py-2 rounded-full bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">保存</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsEditing(false); onEditingChange?.(item.node_id, item.day, false); }} className="px-6 py-2 rounded-full bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">取消</button>
                  </div>
                </div>
            ) : (
               <>
                  <div className="mb-1.5">
                    <button
                      type="button"
                      aria-label={`在地圖查看 ${item.title}`}
                      title={`在地圖查看 ${item.title}`}
                      onClick={handleNavigate}
                      disabled={isNavigating}
                      className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50/95 border border-emerald-200 px-2 sm:px-2.5 py-1 rounded-full hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isNavigating ? <Loader2 size={8} className="animate-spin" /> : <MapPin size={8} strokeWidth={3} />}
                      在地圖查看
                    </button>
                  </div>
                  
                  {item.image_url && (
                    <div className="w-full h-20 sm:h-28 md:h-36 mb-2 sm:mb-2.5 rounded-[12px] sm:rounded-[16px] overflow-hidden shadow-md bg-slate-100 group/img relative">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover rounded-[12px] sm:rounded-[16px] group-hover:scale-105 transition-transform duration-1000" loading="lazy" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  )}

                  {item.attachments && item.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 sm:mb-2.5">
                      {item.attachments.map((attachment) => {
                        const isImage = attachment.type.startsWith('image/');
                        return (
                          <button
                            key={attachment.id}
                            type="button"
                            onClick={() => window.open(attachment.url, '_blank', 'noopener,noreferrer')}
                            className={`rounded-[14px] border border-slate-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all ${isImage ? 'p-1' : 'px-3 py-2 text-left'}`}
                          >
                            {isImage ? (
                              <img src={attachment.url} alt={attachment.name} className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-[10px]" />
                            ) : (
                              <span className="text-[11px] font-black text-slate-700 whitespace-nowrap">📄 {attachment.name}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {item.transport_to_next && (
                    <div className="inline-flex items-center gap-1 mb-2 sm:mb-2.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-800 text-[10px] sm:text-[11px] font-black text-white uppercase tracking-widest shadow-sm shadow-slate-200">
                      <Navigation2 size={10} strokeWidth={3} className="text-indigo-400" />
                      <span className="opacity-60 mr-1">MOVE:</span>
                      {item.transport_to_next}
                    </div>
                  )}

                  {detailCopy ? (
                    <p className={`text-[12px] font-medium text-slate-700 whitespace-pre-line tracking-tight leading-relaxed transition-all duration-500 font-sans ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {detailCopy}
                    </p>
                  ) : (
                    <p className="text-[10px] font-bold text-slate-500 italic opacity-80 transition-opacity">
                      點擊卡片編輯手帳內容、細節或照片...
                    </p>
                  )}

                  {canExpandCopy && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsExpanded((prev) => !prev);
                      }}
                      className="mt-2 inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 transition-all hover:border-slate-300 hover:bg-white"
                    >
                      {isExpanded ? '收起全文' : '查看全文'}
                    </button>
                  )}

                  {linkedFact && (
                    <div className="mt-2 p-2 rounded-xl bg-sky-50/50 border border-sky-100 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-500">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-sky-700 uppercase tracking-widest">
                        <Link size={10} />
                        <span>ASSOCIATED TRAVEL FACT</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-700">
                        {linkedFact.title}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {linkedFact.factType.includes('flight') && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Plane size={10} className="text-slate-400" />
                            <span>{linkedFact.metadata?.flightNumber || 'FLIGHT'}</span>
                          </div>
                        )}
                        {linkedFact.metadata?.address && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <MapPin size={10} className="text-slate-400" />
                            <span title={String(linkedFact.metadata?.address)} className="max-w-[210px] break-words">{linkedFact.metadata?.address}</span>
                          </div>
                        )}
                        {linkedFact.startAt && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Clock size={10} className="text-slate-400" />
                            <span>{linkedFact.startAt}</span>
                          </div>
                        )}
                      </div>
                      {linkedFactRedirect && linkedFactBookingLabel && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            useAppStore.getState().openRedirectModal(linkedFactRedirect);
                          }}
                          className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-sky-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:shadow-md"
                        >
                          <ExternalLink size={11} strokeWidth={3} />
                          <span>{linkedFactBookingLabel}</span>
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2 flex-wrap">
                     <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onUpdate({ ...item, is_visited: !item.is_visited })}
                          className={`sm:hidden flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${item.is_visited ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-inner' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                        >
                          <Check size={12} strokeWidth={3} className={item.is_visited ? 'scale-110' : 'scale-90 opacity-40'} />
                          {item.is_visited ? '已打卡' : '未打卡'}
                        </button>
                     </div>
                     {!isOffline && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (collaboratingLock) return; openEditor(); }}
                            disabled={Boolean(collaboratingLock)}
                            className="px-3 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center gap-1.5 text-slate-700 hover:border-slate-300 hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black tracking-widest"
                            title="編輯此節點"
                            aria-label="編輯此節點"
                          >
                            <Pencil size={14} strokeWidth={2.75} />
                            編輯
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (collaboratingLock) return; onQuickExpense?.(item); }}
                            disabled={Boolean(collaboratingLock)}
                            className="px-3 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black tracking-widest"
                            title="為這個景點快速記一筆"
                            aria-label="為這個景點快速記一筆"
                          >
                            💸 記一筆
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (collaboratingLock) return; void handleRegenerate(); }}
                            disabled={Boolean(collaboratingLock) || regenerating}
                            className="px-3 h-10 rounded-full bg-white border border-fuchsia-200 flex items-center justify-center gap-1.5 text-fuchsia-700 hover:bg-fuchsia-50 hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black tracking-widest"
                            title="AI 換一個建議"
                            aria-label="AI 換一個建議"
                          >
                            {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} strokeWidth={2.75} />}
                            換一個
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (collaboratingLock) return; onDelete(item.node_id); }}
                            disabled={Boolean(collaboratingLock)}
                            className="px-3 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center gap-1.5 text-rose-700 hover:bg-rose-100 hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black tracking-widest"
                            title="刪除此節點"
                            aria-label="刪除此節點"
                          >
                            <Trash2 size={14} strokeWidth={2.75} />
                            刪除
                          </button>
                        </div>
                     )}
                  </div>
               </>
            )}
          </div>

          {!isOffline && !isEditing && (
            <div className="hidden">
              {/* Elements moved into the card footer */}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function ItineraryList({
  items,
  day,
  onDelete,
  onUpdate,
  onReorder,
  onManualAdd,
  onQuickExpense,
  draggingFavorite,
  favoriteSuggestions,
  onFavoriteDrop,
  onAskAiForDay,
  onRandomizeFromFavorites,
  isOffline,
  aiLoading,
  tripId,
  destination,
  tripStartDate,
  weather,
  recentlySyncedNodeIds,
  onEditingChange,
  nodeEditingLocks
}: {
  items: ItineraryNode[];
  day: number;
  onDelete: (node_id: string) => void;
  onUpdate: (node: ItineraryNode) => void;
  onReorder: (newOrder: ItineraryNode[]) => void;
  onManualAdd: (node: Partial<ItineraryNode>) => void;
  onQuickExpense?: (node: ItineraryNode) => void;
  draggingFavorite?: FavoriteSpot | null;
  favoriteSuggestions?: FavoriteSpot[];
  onFavoriteDrop?: (spot: FavoriteSpot, day: number) => void;
  onAskAiForDay?: () => void;
  onRandomizeFromFavorites?: () => void;
  isOffline: boolean;
  aiLoading: boolean;
  tripId: string;
  destination: string;
  tripStartDate?: string | null;
  weather?: any;
  recentlySyncedNodeIds?: string[];
  onEditingChange?: (nodeId: string, day: number, isEditing: boolean) => void;
  nodeEditingLocks?: Record<string, { userName: string; day: number }>;
}) {
  const [isFavoriteDragOver, setIsFavoriteDragOver] = useState(false);
  const [manualAddTrigger, setManualAddTrigger] = useState(0);
  const [aiQuoteIndex, setAiQuoteIndex] = useState(0);

  useEffect(() => {
    if (!draggingFavorite) {
      setIsFavoriteDragOver(false);
    }
  }, [draggingFavorite]);

  useEffect(() => {
    if (!aiLoading) {
      setAiQuoteIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setAiQuoteIndex((prev) => (prev + 1) % AI_LOADING_QUOTES.length);
    }, 1600);

    return () => {
      window.clearInterval(timer);
    };
  }, [aiLoading]);

  const getDailyWeather = () => {
    if (!weather || !weather.length) return null;
    // Assuming weather is a 14-day array, pick the one matching (day - 1)
    const dayWeather = weather[day - 1] ?? null;
    if (!dayWeather) return null;
    return dayWeather;
  };

  const dayWeather = getDailyWeather();
  const canDropFavorite = Boolean(draggingFavorite && !isOffline && onFavoriteDrop);

  return (
      <div
        className={`flex flex-col gap-6 sm:gap-10 sm:mt-6 mt-2 min-h-[400px] rounded-[36px] transition-all ${isFavoriteDragOver ? 'bg-fuchsia-50/30 ring-2 ring-fuchsia-300/60 ring-offset-4 ring-offset-transparent' : ''}`}
        onDragOver={(event) => {
          if (!canDropFavorite) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          if (!isFavoriteDragOver) setIsFavoriteDragOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsFavoriteDragOver(false);
          }
        }}
        onDrop={(event) => {
          if (!canDropFavorite || !draggingFavorite) return;
          event.preventDefault();
          onFavoriteDrop?.(draggingFavorite, day);
          setIsFavoriteDragOver(false);
        }}
      >
        <AnimatePresence>
          {isFavoriteDragOver && draggingFavorite && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-2 sm:mx-0 rounded-[28px] border-2 border-dashed border-fuchsia-300 bg-white/80 px-5 py-4 text-center shadow-lg shadow-fuchsia-100/50"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-500">拖放加入 Day {day}</p>
              <p className="mt-1 text-sm font-bold text-slate-700">將「{draggingFavorite.title}」加入今天的行程</p>
            </motion.div>
          )}
        </AnimatePresence>
        {dayWeather && (
          <div className="-mt-8 sm:-mt-14 mb-4 sm:mb-6 ml-6 sm:ml-10 relative z-10 w-fit">
            <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-2 sm:py-3 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-[16px] shadow-sm transform hover:scale-105 transition-transform duration-300">
              <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full shadow-inner border border-slate-100">
                <span className="text-lg">
                  {dayWeather.rain_prob > 50 ? '🌧️' : dayWeather.rain_prob > 20 ? '⛅' : '☀️'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] sm:text-xs font-black text-slate-700 tracking-wider uppercase">
                  {dayWeather.date} 預報
                </span>
                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                  <span className="text-slate-700">{dayWeather.temp_min}°C - {dayWeather.temp_max}°C</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  降雨率 <span className={dayWeather.rain_prob > 50 ? 'text-blue-500' : 'text-slate-600'}>{dayWeather.rain_prob}%</span>
                </span>
              </div>
            </div>
          </div>
        )}
        
        {items.length === 0 && !aiLoading && (
          <GlassCard className="!p-10 sm:!p-16 !rounded-[32px] sm:!rounded-[48px] border border-white/70 bg-gradient-to-b from-white/80 to-pink-50/55 flex flex-col items-center justify-center text-center backdrop-blur-2xl shadow-sm hover:shadow-xl transition-shadow duration-700 mx-2 sm:mx-0">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-[28px] sm:rounded-[40px] bg-white flex items-center justify-center text-4xl sm:text-6xl mb-6 sm:mb-8 shadow-xl border border-slate-200/70 hover:rotate-3 hover:scale-105 transition-all duration-300">
              🏝️
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 sm:mb-3 tracking-tight">Day {day} 還是空白的</h3>
            <p className="text-slate-600 font-bold max-w-[360px] leading-relaxed text-[12px] tracking-[0.06em] px-4">現在不是提醒你空白，而是直接幫你補上第一步。</p>
            <div className="mt-6 flex w-full max-w-[340px] flex-col gap-3">
              <button
                type="button"
                onClick={() => onAskAiForDay?.()}
                disabled={isOffline}
                className="w-full rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-5 py-3 text-sm font-black tracking-[0.12em] text-white shadow-lg shadow-fuchsia-200/60 transition-all hover:-translate-y-0.5 disabled:opacity-40"
              >
                ✨ 讓 AI 幫我填滿今天
              </button>
              <button
                type="button"
                onClick={() => onRandomizeFromFavorites?.()}
                disabled={isOffline || !favoriteSuggestions?.length}
                className="w-full rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-black tracking-[0.08em] text-slate-700 transition-all hover:border-slate-300 hover:bg-white disabled:opacity-40"
              >
                📌 從口袋名單隨機挑 3 個景點
              </button>
              <button
                type="button"
                onClick={() => setManualAddTrigger((prev) => prev + 1)}
                disabled={isOffline}
                className="w-full rounded-full border border-emerald-200 bg-emerald-50/95 px-5 py-3 text-sm font-black tracking-[0.08em] text-emerald-700 transition-all hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-40"
              >
                ➕ 手動新增景點
              </button>
            </div>
          </GlassCard>
        )}

      {aiLoading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col gap-5"
        >
           <motion.div
             initial={{ opacity: 0, y: 8 }}
             animate={{ opacity: 1, y: 0 }}
             className="rounded-[28px] border border-indigo-100 bg-white/90 px-5 py-4 shadow-lg shadow-indigo-100/50"
           >
             <div className="flex items-center gap-3">
               <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-xl text-white shadow-lg shadow-fuchsia-200/50">
                 ✨
               </div>
               <div className="min-w-0">
                 <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">AI 正在排今天的節奏</p>
                 <p className="mt-1 text-sm font-bold text-slate-700">{AI_LOADING_QUOTES[aiQuoteIndex]}</p>
               </div>
             </div>
           </motion.div>
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

      <Reorder.Group axis="y" values={items} onReorder={onReorder} className="flex flex-col gap-3 sm:gap-4">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item: ItineraryNode, idx: number) => {
            const nextItem = items[idx + 1];
            let timeGapStr = '';
            let timeGapMinutes = 0;
            
            if (nextItem && item.time && nextItem.time) {
              const currentParts = item.time.split(':').map(Number);
              const nextParts = nextItem.time.split(':').map(Number);
              if (currentParts.length === 2 && nextParts.length === 2) {
                const currentMins = currentParts[0] * 60 + currentParts[1];
                const nextMins = nextParts[0] * 60 + nextParts[1];
                const diff = nextMins - currentMins;
                if (diff > 0) {
                  timeGapMinutes = diff;
                  const h = Math.floor(diff / 60);
                  const m = diff % 60;
                  timeGapStr = h > 0 ? `${h} 小時 ${m > 0 ? m + ' 分鐘' : ''}` : `${m} 分鐘`;
                }
              }
            }
            return (
              <Reorder.Item 
                key={item.node_id} 
                value={item}
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -30 }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.5, delay: idx * 0.05 }}
                className="flex flex-col w-full relative group/reorder"
              >
                <ItineraryListItem
                  item={item}
                  idx={idx}
                  previousItem={idx > 0 ? items[idx - 1] : undefined}
                  nextItem={nextItem}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onQuickExpense={onQuickExpense}
                  isOffline={isOffline}
                  tripId={tripId}
                  destination={destination}
                  tripStartDate={tripStartDate}
                  isRecentlySynced={recentlySyncedNodeIds?.includes(item.node_id)}
                  onEditingChange={onEditingChange}
                  collaboratingLock={nodeEditingLocks?.[item.node_id]}
                />
                
                {/* Drag handle for mobile/explicit drag */}
                <div className="absolute left-[-20px] sm:left-[-35px] top-1/2 -translate-y-1/2 opacity-40 sm:opacity-0 group-hover/reorder:opacity-100 transition-opacity p-1.5 sm:p-2 cursor-grab active:cursor-grabbing text-slate-400/80 hover:text-slate-600 z-20">
                   <GripVertical size={18} className="sm:w-[20px] sm:h-[20px]" />
                </div>

                {(() => {
                  const autoTransport = (!item.transport_to_next && nextItem &&
                    item.lat && item.lng && nextItem.lat && nextItem.lng)
                    ? estimateTransport(haversineKm(item.lat, item.lng, nextItem.lat!, nextItem.lng!))
                    : null;
                  const hasTransitConflict = Boolean(autoTransport && timeGapMinutes > 0 && autoTransport.minutes > timeGapMinutes);
                  const hasTightScheduleConflict = Boolean(nextItem && timeGapMinutes > 0 && timeGapMinutes < 30);
                  const showBadge = nextItem && (timeGapStr || item.transport_to_next || autoTransport);
                  return showBadge ? (
                    <div className="flex justify-start sm:pl-[60px] pl-[40px] my-1 relative z-0">
                      <div className="w-0.5 min-h-[1.5rem] sm:min-h-[2rem] bg-gradient-to-b from-slate-200 to-slate-200" />
                      <div className="flex flex-col justify-center ml-3 sm:ml-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {timeGapStr && (
                            <span className="px-3 py-1 bg-slate-50/95 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-widest border border-slate-200 shadow-sm flex items-center gap-1.5">
                              <Clock size={12} />
                              約 {timeGapStr}
                            </span>
                          )}
                          {(item.transport_to_next || autoTransport) && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 ${hasTransitConflict ? 'bg-rose-50/90 text-rose-600 border-rose-200' : 'bg-indigo-50/80 text-indigo-500 border-indigo-100'}`}>
                              <span>{autoTransport?.emoji ?? '🚇'}</span>
                              {item.transport_to_next ?? autoTransport?.label}
                            </span>
                          )}
                          {hasTransitConflict && (
                            <span className="px-3 py-1 bg-rose-50/90 rounded-full text-[10px] font-black text-rose-600 uppercase tracking-widest border border-rose-200 shadow-sm flex items-center gap-1.5">
                              <span>⚠️</span>
                              交通時間可能塞不下
                            </span>
                          )}
                          {hasTightScheduleConflict && (
                            <span className="px-3 py-1 bg-amber-50/95 rounded-full text-[10px] font-black text-amber-700 uppercase tracking-widest border border-amber-200 shadow-sm flex items-center gap-1.5">
                              <span>⚠️</span>
                              行程似乎太緊湊了
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : nextItem ? (
                    <div className="flex justify-start sm:pl-[60px] pl-[40px] my-1 relative z-0">
                      <div className="w-0.5 h-6 sm:h-8 bg-gradient-to-b from-slate-200 to-slate-200" />
                    </div>
                  ) : null;
                })()}
              </Reorder.Item>
            );
          })}
        </AnimatePresence>
      </Reorder.Group>

      {/* Manual Add Node UI */}
      <ManualAddNode onAdd={onManualAdd} isOffline={isOffline} day={day} tripStartDate={tripStartDate} openTrigger={manualAddTrigger} />
    </div>
  );
}

function ManualAddNode({
  onAdd,
  isOffline,
  day,
  tripStartDate,
  openTrigger,
}: {
  onAdd: (node: Partial<ItineraryNode>) => void;
  isOffline: boolean;
  day: number;
  tripStartDate?: string | null;
  openTrigger?: number;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [date, setDate] = useState(getDateForDay(day, tripStartDate) || '');
  const [time, setTime] = useState('10:00');
  const [emoji, setEmoji] = useState('📍');
  const [category, setCategory] = useState('landmark');
  const [description, setDescription] = useState('');
  const [transportToNext, setTransportToNext] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isVisited, setIsVisited] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [linkedFactId, setLinkedFactId] = useState('');
  const facts = useTripFactsStore(s => s.facts);

  useEffect(() => {
    if (!isAdding) {
      setDate(getDateForDay(day, tripStartDate) || '');
    }
  }, [day, tripStartDate, isAdding]);

  useEffect(() => {
    if (openTrigger && !isOffline) {
      setIsAdding(true);
    }
  }, [openTrigger, isOffline]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ 
      title, 
      day: getDayForDate(date, tripStartDate, day),
      date,
      time, 
      emoji, 
      category,
      description: [locationName ? `地點：${locationName}` : '', description].filter(Boolean).join('\n'),
      transport_to_next: transportToNext || undefined,
      image_url: imageUrl || undefined,
      is_visited: isVisited,
      linkedFactId: linkedFactId || undefined,
    });
    setTitle('');
    setLocationName('');
    setDescription('');
    setTransportToNext('');
    setImageUrl('');
    setDate(getDateForDay(day, tripStartDate) || '');
    setTime('10:00');
    setIsVisited(false);
    setLinkedFactId('');
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
        新增行程節點
      </motion.button>
    );
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" 
          onClick={() => setIsAdding(false)}
        />
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl z-[210] overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400" />
          <div className="p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[20px] bg-pink-50 flex items-center justify-center text-2xl">🗓️</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">新增行程節點</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Day {getDayForDate(date, tripStartDate, day)} {date ? `• ${date}` : ''}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setIsAdding(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><X size={20}/></button>
              </div>
              
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
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">日期</label>
                  <div className="relative group">
                    <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-pink-400 transition-colors" />
                    <input 
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">時間</label>
                  <div className="relative group">
                    <Clock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-pink-400 transition-colors" />
                    <input 
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">地點</label>
                <div className="flex gap-2">
                  <div className="relative group flex-1">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-pink-400 transition-colors" size={18} />
                    <input 
                      value={locationName}
                      onChange={e => setLocationName(e.target.value)}
                      placeholder="文字輸入地點名稱或地址"
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <button type="button" disabled className="shrink-0 px-4 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-300 font-bold text-sm tracking-wide flex items-center justify-center gap-2 cursor-not-allowed">
                    <MapPin size={16} />
                    地圖選取即將支援
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">詳細說明 / 備註 (Description)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="補充更詳細的行程說明、用餐提醒、預約資訊..."
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm min-h-[92px] resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">前往下一站交通</label>
                  <input
                    value={transportToNext}
                    onChange={e => setTransportToNext(e.target.value)}
                    placeholder="例如：地鐵約 20 分鐘"
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">照片網址</label>
                  <input
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://images..."
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">圖標 Emoji</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-full py-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex items-center justify-center text-3xl shadow-sm hover:border-pink-200 transition-all active:scale-95"
                    >
                      {emoji}
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-full mt-2 left-0 z-50 p-3 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-y-auto max-h-[160px] w-64 flex flex-wrap gap-2">
                          {EMOJI_OPTIONS.map(em => (
                            <button key={em} type="button" onClick={() => { setEmoji(em); setShowEmojiPicker(false); }} className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl transition-all ${emoji === em ? 'bg-pink-100 scale-110 shadow-sm' : 'hover:bg-slate-50'}`}>{em}</button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">分類</label>
                  <div className="relative">
                    <select 
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all appearance-none shadow-sm h-full"
                    >
                      {CATEGORY_OPTIONS.map(opt => (
                         <option key={opt} value={opt}>{CATEGORY_META[opt].label}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
              </div>

              {facts && facts.length > 0 && (
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">關聯 Travel Fact</label>
                  <div className="relative">
                    <select
                      value={linkedFactId}
                      onChange={e => setLinkedFactId(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm appearance-none"
                    >
                      <option value="">無關聯 (未選擇)</option>
                      {facts.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.title} ({f.factType})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-100 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={isVisited}
                  onChange={e => setIsVisited(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4"
                />
                標記為已完成 / 已打卡
              </label>

              <button 
                type="submit"
                className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black text-[13px] uppercase tracking-[0.15em] shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Plus size={18} strokeWidth={3} />
                確認新增至 Day {getDayForDate(date, tripStartDate, day)}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

function QuickExpenseModal({
  tripId,
  destination,
  node,
  members,
  onClose,
}: {
  tripId: string;
  destination: string;
  node: ItineraryNode;
  members: string[];
  onClose: () => void;
}) {
  const fallbackMember = members[0] || localStorage.getItem('user_id') || '我';
  const participantList = members.length > 0 ? members : [fallbackMember];
  const [title, setTitle] = useState(`${node.title}${node.date ? ` (${node.date})` : ''}`);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(getCurrencyFromDestination(destination));
  const [payer, setPayer] = useState(participantList[0] || fallbackMember);
  const [splitWith, setSplitWith] = useState<string[]>(participantList);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useAppStore();

  const toggleSplitMember = (member: string) => {
    setSplitWith((prev) => {
      const exists = prev.includes(member);
      if (exists) {
        return prev.filter((item) => item !== member);
      }
      return [...prev, member];
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!title.trim()) {
      showToast('請補上消費名稱。', 'warning');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('金額需為大於 0 的數字。', 'warning');
      return;
    }
    if (!payer.trim()) {
      showToast('請選擇代墊人。', 'warning');
      return;
    }

    const normalizedSplit = splitWith.includes(payer) ? splitWith : [...splitWith, payer];
    if (normalizedSplit.length === 0) {
      showToast('至少要有一位分攤成員。', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await submitLedgerExpense(tripId, {
        title: title.trim(),
        amount: numericAmount,
        currency,
        payer,
        splitWith: normalizedSplit,
      });
      showToast(`已為 ${node.title} 記下一筆 ${currency} ${numericAmount.toLocaleString()}。`, 'success');
      onClose();
    } catch {
      showToast('記帳失敗，請稍後再試。', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          className="relative w-full max-w-lg rounded-[36px] bg-white shadow-2xl z-[230] overflow-hidden"
        >
          <div className="absolute top-0 left-0 h-2 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
          <form onSubmit={handleSubmit} className="p-7 sm:p-8 flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Quick Expense</p>
                <h3 className="mt-2 text-2xl font-black text-slate-800 tracking-tight">為景點快速記一筆</h3>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {node.title}
                  {node.date ? ` ・ ${node.date}` : ''}
                  {node.time ? ` ・ ${node.time}` : ''}
                </p>
              </div>
              <button type="button" onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">消費名稱</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">金額</label>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="例如 980"
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">幣別</label>
                <input
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">代墊人</label>
              <select
                value={payer}
                onChange={(event) => setPayer(event.target.value)}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-100"
              >
                {participantList.map((member) => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">參與旅伴</label>
              <div className="flex flex-wrap gap-2">
                {participantList.map((member) => {
                  const selected = splitWith.includes(member);
                  return (
                    <button
                      key={member}
                      type="button"
                      onClick={() => toggleSplitMember(member)}
                      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selected ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
                    >
                      {member}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 rounded-2xl bg-slate-900 text-white py-4 font-black text-sm uppercase tracking-[0.18em] shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {submitting ? '送出中...' : '確認記帳'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}

// ─── Map View ───────────────────────────────────────────────────────────

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ScaleControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leafet default icon path issues in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ selectedLat, selectedLng, items, allItems }: { selectedLat?: number, selectedLng?: number, items: ItineraryNode[], allItems?: ItineraryNode[] }) {
  const map = useMap();
  useEffect(() => {
    if (selectedLat && selectedLng) {
      map.setView([selectedLat, selectedLng], 15, { animate: true });
    } else {
      let validItems = items.filter(n => n.lat && n.lng);
      if (validItems.length === 0 && allItems && allItems.length > 0) {
        validItems = allItems.filter(n => n.lat && n.lng);
      }
      if (validItems.length > 0) {
        const bounds = L.latLngBounds(validItems.map(n => [n.lat!, n.lng!]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [selectedLat, selectedLng, items, allItems, map]);
  return null;
}

function CustomMarker({ item, isSelected, onClick }: { item: ItineraryNode, isSelected: boolean, onClick: () => void }) {
  const iconHtml = `
    <div class="relative flex flex-col items-center">
      <div class="bg-white rounded-2xl px-2.5 py-1.5 border-2 ${isSelected ? 'border-pink-500 scale-110 shadow-lg shadow-pink-100' : 'border-white shadow-md'} flex items-center justify-center transition-all cursor-pointer group hover:scale-110">
        <span class="text-xl leading-none group-hover:scale-110 transition-transform">${item.emoji}</span>
      </div>
      <div class="w-3 h-3 -mt-2 border-r-2 border-b-2 rotate-45 ${isSelected ? 'bg-pink-500 border-pink-500' : 'bg-white border-white'}"></div>
      <div class="mt-1 px-2.5 py-1 rounded-full ${isSelected ? 'bg-pink-600 text-white shadow-md' : 'bg-slate-800/90 text-white/90'} transition-all"><span class="text-[10px] font-bold whitespace-nowrap block max-w-[120px] truncate">${item.title}</span></div>
    </div>
  `;

  const customIcon = L.divIcon({
    html: iconHtml,
    className: 'bg-transparent border-none',
    iconSize: [120, 80],
    iconAnchor: [60, 60],
    popupAnchor: [0, -60],
  });

  return (
    <Marker 
      position={[item.lat!, item.lng!]} 
      icon={customIcon}
      eventHandlers={{ click: onClick }}
      zIndexOffset={isSelected ? 1000 : 0}
    />
  );
}

function CalendarView({ nodes, tripStartDate }: { nodes: ItineraryNode[], tripStartDate?: string }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Calculate start date
  const start = tripStartDate ? new Date(tripStartDate) : new Date();
  
  // Get nodes mapped by date string (YYYY-MM-DD local)
  const nodesByDate: Record<string, ItineraryNode[]> = {};
  
  nodes.forEach(node => {
    // calculate date
    let d = new Date(start);
    if (node.date) {
      d = new Date(node.date);
    } else {
      d.setDate(d.getDate() + (node.day - 1));
    }
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!nodesByDate[dateStr]) nodesByDate[dateStr] = [];
    nodesByDate[dateStr].push(node);
  });
  
  const allDates = Object.keys(nodesByDate).sort();
  let viewMonth = start.getMonth();
  let viewYear = start.getFullYear();
  if (allDates.length > 0) {
    const firstDate = new Date(allDates[0]);
    viewMonth = firstDate.getMonth();
    viewYear = firstDate.getFullYear();
  }
  
  const [currentMonth, setCurrentMonth] = useState(new Date(viewYear, viewMonth, 1));
  
  // build calendar grid
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); 
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }
  
  const selectedNode = nodes.find(n => n.node_id === selectedNodeId);
  const facts = useTripFactsStore(s => s.facts);
  
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[75vh]">
       {/* Main calendar grid */}
       <div className={`flex-1 flex flex-col glass-card !p-0 overflow-hidden border-2 border-white/60 shadow-xl ${selectedNodeId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between p-5 border-b border-pink-100 bg-white/40">
             <button 
               onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} 
               className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-pink-500 shadow-sm hover:bg-pink-50 hover:scale-105 transition-all"
               title="上個月"
             >
               <ChevronLeft size={20} />
             </button>
             <h2 className="text-xl font-black text-slate-700 tracking-widest">
               {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
             </h2>
             <button 
               onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} 
               className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-pink-500 shadow-sm hover:bg-pink-50 hover:scale-105 transition-all"
               title="下個月"
             >
               <ChevronRight size={20} />
             </button>
          </div>
          
          <div className="grid grid-cols-7 gap-px bg-pink-100/50 flex-1 overflow-y-auto">
             {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <div key={d} className="bg-white/70 backdrop-blur-md text-center py-3 text-xs font-black text-pink-400 capitalize tracking-widest sticky top-0 z-10 shadow-sm">{d}</div>
             ))}
             {days.map((d, i) => {
                if (!d) return <div key={`empty-${i}`} className="bg-white/40 min-h-[120px]" />;
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const dayNodes = sortNodesForDisplay(nodesByDate[dateStr] || []);
                
                const isToday = new Date().toDateString() === d.toDateString();
                
                return (
                  <div key={dateStr} className={`bg-white/80 backdrop-blur-sm min-h-[120px] p-2 flex flex-col transition-colors border-t border-transparent hover:border-pink-200 ${isToday ? 'bg-pink-50/80 ring-2 ring-pink-300 inset-0' : ''}`}>
                     <span className={`text-sm font-black mb-2 px-1 ${isToday ? 'text-pink-600' : 'text-slate-400'}`}>
                        {d.getDate()}
                     </span>
                     <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar flex-1 pb-1">
                        {dayNodes.map(node => (
                           <button 
                             key={node.node_id}
                             onClick={() => setSelectedNodeId(node.node_id)}
                             className={`text-left px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all border border-transparent flex gap-1.5 shadow-sm active:scale-95 ${selectedNodeId === node.node_id ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-pink-200/50 scale-105' : 'bg-white text-slate-600 hover:border-pink-200 hover:shadow-md'}`}
                           >
                             <div className="flex flex-col w-full min-w-0">
                               <div className="flex items-center gap-1 w-full min-w-0">
                                 <span className="shrink-0 text-[14px]">{node.emoji}</span>
                                 <span className="truncate flex-1">{node.title}</span>
                               </div>
                               {node.time && <span className={`text-[9px] mt-0.5 tracking-wider ${selectedNodeId === node.node_id ? 'text-white/80' : 'text-slate-400'}`}>{node.time}</span>}
                             </div>
                           </button>
                        ))}
                     </div>
                  </div>
                )
             })}
          </div>
       </div>
       
       {/* Sidebar details */}
       {selectedNodeId && selectedNode && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-4 h-full relative z-20"
          >
             <GlassCard className="!p-4 flex items-center justify-between border-2 border-white/60 flex-shrink-0">
                <span className="font-black text-sm text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={16} className="text-pink-400"/> 詳細內容
                </span>
                <button onClick={() => setSelectedNodeId(null)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors shadow-sm cursor-pointer border border-slate-200/50"><X size={16} strokeWidth={3} /></button>
             </GlassCard>
             
             <GlassCard className="!p-6 flex flex-col gap-5 overflow-y-auto no-scrollbar border-2 border-white/60 flex-1 relative">
                {selectedNode.image_url && (
                  <div className="w-full h-48 bg-slate-100 rounded-[2rem] overflow-hidden shadow-inner border border-white relative group">
                     <img src={selectedNode.image_url} alt="spot" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                  </div>
                )}
                
                <div className="flex items-start gap-4 mt-2">
                   <div className="w-14 h-14 shrink-0 rounded-[1.5rem] bg-gradient-to-br from-pink-50 to-fuchsia-50 text-3xl flex items-center justify-center border border-white shadow-md shadow-pink-100/50">
                     {selectedNode.emoji}
                   </div>
                   <div className="flex-1 pt-1">
                     <h3 className="font-black text-xl text-slate-800 leading-tight mb-2">{selectedNode.title}</h3>
                     {selectedNode.time && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-black text-slate-500 uppercase tracking-[0.1em] border border-white shadow-sm">
                           <Clock size={12} strokeWidth={3} /> {selectedNode.time}
                        </div>
                     )}
                   </div>
                </div>
                
                {selectedNode.description && (
                  <div className="relative mt-2">
                     <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-400 to-fuchsia-400 rounded-full opacity-50" />
                     <p className="text-[13px] text-slate-600 leading-relaxed font-medium pl-3 whitespace-pre-wrap">{selectedNode.description}</p>
                  </div>
                )}
                
                {selectedNode.transport_to_next && (
                  <div className="mt-4 p-4 rounded-[2rem] bg-gradient-to-r from-indigo-50 to-blue-50 border border-white shadow-sm flex items-start gap-3">
                     <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                        <Navigation2 size={16} strokeWidth={2.5} />
                     </div>
                     <div className="flex flex-col pt-0.5">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">前往下一站</span>
                        <span className="text-[13px] font-bold text-slate-700">{selectedNode.transport_to_next}</span>
                     </div>
                  </div>
                )}
                
                {selectedNode.linkedFactId && facts.find((f: any) => f.id === selectedNode.linkedFactId) && (
                  <div className="mt-4 p-4 rounded-[1.5rem] bg-gradient-to-br from-cyan-50 to-blue-50/50 border border-white shadow-sm flex flex-col gap-2 relative overflow-hidden">
                     <div className="absolute -top-6 -right-6 p-4 opacity-10 text-6xl pointer-events-none">✨</div>
                     
                     <div className="flex items-center gap-2 mb-1">
                       <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-cyan-500 shadow-sm shrink-0 relative z-10">
                          <Link size={14} className="text-slate-400" />
                       </div>
                       <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">關聯的 Travel Fact</span>
                     </div>
                     
                     {(() => {
                       const fact = facts.find((f: any) => f.id === selectedNode.linkedFactId) as TravelFact | undefined;
                       if (!fact) return null;
                       const redirectPayload = getTravelFactRedirectPayload(fact);
                       const bookingLabel = getTravelFactBookingLabel(fact);
                       return (
                         <div className="flex flex-col gap-2 relative z-10 pl-1">
                           <span className="text-sm font-bold text-slate-800">{fact.title}</span>
                           
                           {(fact.startAt || fact.endAt) && (
                             <div className="flex items-center gap-1.5 text-xs text-slate-600">
                               <Clock size={14} className="text-slate-400" />
                               <span>{fact.startAt || '--'} {fact.endAt ? `至 ${fact.endAt}` : ''}</span>
                             </div>
                           )}
                           
                           {fact.locationName && (
                             <div className="flex items-center gap-1.5 text-xs text-slate-600">
                               <MapPin size={14} className="text-slate-400" />
                               <span>{fact.locationName}</span>
                             </div>
                           )}
                           
                           {fact.referenceCode && (
                             <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                               <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded bg-white">訂單編號</span>
                               <span className="font-mono">{fact.referenceCode}</span>
                             </div>
                           )}
                           
                           {fact.metadata && Object.keys(fact.metadata).length > 0 && (
                             <div className="mt-1 pt-2 border-t border-cyan-100/50 grid grid-cols-2 gap-2">
                               {fact.metadata.airline && (
                                 <div className="flex flex-col">
                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">航空公司</span>
                                   <span className="text-xs text-slate-700 font-bold">{fact.metadata.airline}</span>
                                 </div>
                               )}
                               {fact.metadata.flightNumber && (
                                 <div className="flex flex-col">
                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">航班編號</span>
                                   <span className="text-xs text-slate-700 font-bold font-mono">{fact.metadata.flightNumber}</span>
                                 </div>
                               )}
                               {fact.metadata.checkInTime && (
                                 <div className="flex flex-col">
                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">入住時間</span>
                                   <span className="text-xs text-slate-700 font-bold">{fact.metadata.checkInTime}</span>
                                 </div>
                               )}
                               {fact.metadata.checkOutTime && (
                                 <div className="flex flex-col">
                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">退房時間</span>
                                   <span className="text-xs text-slate-700 font-bold">{fact.metadata.checkOutTime}</span>
                                 </div>
                               )}
                               {fact.metadata.address && (
                                 <div className="flex flex-col col-span-2">
                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">地址</span>
                                   <span className="text-xs text-slate-700 font-bold">{fact.metadata.address}</span>
                                 </div>
                               )}
                             </div>
                           )}
                           {redirectPayload && bookingLabel && (
                             <button
                               type="button"
                               onClick={() => useAppStore.getState().openRedirectModal(redirectPayload)}
                               className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-cyan-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-md"
                             >
                               <ExternalLink size={14} strokeWidth={3} />
                               <span>{bookingLabel}</span>
                             </button>
                           )}
                         </div>
                       );
                     })()}
                  </div>
                )}
             </GlassCard>
          </motion.div>
       )}
    </div>
  );
}

function MapView({ items, allNodes }: { items: ItineraryNode[], allNodes?: ItineraryNode[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = items.find(n => n.node_id === selectedId) ?? null;
  const validItems = items.filter(n => n.lat && n.lng);

  // default center fallback: Tokyo
  let defaultCenter: [number, number] = [35.6762, 139.6503];
  if (validItems.length > 0) defaultCenter = [validItems[0].lat!, validItems[0].lng!];
  else if (allNodes) {
    const allValid = allNodes.filter(n => n.lat && n.lng);
    if (allValid.length > 0) defaultCenter = [allValid[0].lat!, allValid[0].lng!];
  }

  return (
    <div className="flex flex-col gap-3">
      <GlassCard className="h-[55vh] relative overflow-hidden !p-0 border-4 border-white/40 rounded-[2.5rem]">
        <MapContainer 
          center={defaultCenter} 
          zoom={13} 
          scrollWheelZoom={true} 
          className="w-full h-full z-10"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">Carto</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <MapUpdater 
            selectedLat={selectedNode?.lat} 
            selectedLng={selectedNode?.lng} 
            items={validItems} 
            allItems={allNodes}
          />
          
          {validItems.length > 1 && (
            <Polyline 
              positions={validItems.map(item => [item.lat!, item.lng!])}
              pathOptions={{ 
                color: '#ec4899', 
                weight: 4, 
                dashArray: '1, 10', 
                lineCap: 'round',
                opacity: 0.6
              }}
            />
          )}

          {validItems.map((item) => (
            <CustomMarker 
              key={item.node_id}
              item={item}
              isSelected={item.node_id === selectedId}
              onClick={() => setSelectedId(item.node_id === selectedId ? null : item.node_id)}
            />
          ))}
          <ScaleControl position="bottomright" />
        </MapContainer>
        
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-[1000]">
            <span className="text-slate-400 font-semibold bg-white px-6 py-3 rounded-full shadow-sm">目前沒有行程顯示在地圖上</span>
          </div>
        )}
      </GlassCard>

      {/* Selected node detail card */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <GlassCard className="!p-4 flex items-center gap-4 !rounded-2xl border border-fuchsia-100 bg-white/90 shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-2xl shrink-0 shadow-sm border border-fuchsia-100/50">
                {selectedNode.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 text-[15px] truncate">{selectedNode.title}</p>
                <div className="flex items-center gap-2 mt-0.5 max-w-full overflow-x-auto no-scrollbar shrink-0">
                  {selectedNode.time && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">{selectedNode.time}</span>}
                  {selectedNode.category && <span className="text-[10px] font-bold text-fuchsia-500 bg-fuchsia-50/80 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-fuchsia-100/50">{selectedNode.category}</span>}
                </div>
                {selectedNode.description && <p className="text-[12px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{selectedNode.description}</p>}
              </div>
              <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors shrink-0 outline-none">
                <X size={14} strokeWidth={3} />
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

function getTravelFactBookingLabel(fact?: TravelFact | null) {
  if (!fact?.metadata?.bookingUrl) return null;
  return fact.factType.includes('flight') ? '前往預訂' : '查看價格';
}

function getTravelFactRedirectPayload(fact?: TravelFact | null) {
  const bookingUrl = fact?.metadata?.bookingUrl?.trim();
  if (!fact || !bookingUrl) return null;

  return {
    provider: fact.metadata?.provider || fact.metadata?.airline || fact.title,
    affiliateUrl: bookingUrl,
    itemId: fact.id,
    airline: fact.metadata?.airline || fact.metadata?.provider || fact.title,
    departure: fact.metadata?.depCode || '出發',
    arrival: fact.metadata?.arrCode || fact.locationName || '目的地',
    price: typeof fact.metadata?.price === 'number' ? fact.metadata.price : undefined,
    currency: fact.metadata?.currency,
    emoji: fact.factType.includes('flight') ? '✈️' : '🏨',
  };
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

function writeCachedItineraryForLoadedDays(tripId: string, nodes: ItineraryNode[], loadedDays: number[]) {
  if (typeof window === 'undefined' || !tripId || loadedDays.length === 0) return;
  const loadedDaySet = new Set(loadedDays);
  const cached = readCachedItinerary(tripId);
  const merged = [
    ...cached.filter((node) => !loadedDaySet.has(Number(node.day ?? 1))),
    ...nodes.filter((node) => loadedDaySet.has(Number(node.day ?? 1))),
  ];
  window.localStorage.setItem(`roamjelly_itinerary_${tripId}`, JSON.stringify(merged));
}

function summarizeItineraryDiff(previousNodes: ItineraryNode[], nextNodes: ItineraryNode[]) {
  const previousMap = new Map(previousNodes.map((node) => [node.node_id, node]));
  const nextMap = new Map(nextNodes.map((node) => [node.node_id, node]));

  const addedNodeIds: string[] = [];
  let updatedCount = 0;
  let removedCount = 0;

  for (const nextNode of nextNodes) {
    const previousNode = previousMap.get(nextNode.node_id);
    if (!previousNode) {
      addedNodeIds.push(nextNode.node_id);
      continue;
    }

    const previousSignature = [
      previousNode.day,
      previousNode.date,
      previousNode.time,
      previousNode.title,
      previousNode.description,
      previousNode.transport_to_next,
      previousNode.image_url,
      previousNode.is_visited,
    ].join('|');

    const nextSignature = [
      nextNode.day,
      nextNode.date,
      nextNode.time,
      nextNode.title,
      nextNode.description,
      nextNode.transport_to_next,
      nextNode.image_url,
      nextNode.is_visited,
    ].join('|');

    if (previousSignature !== nextSignature) {
      updatedCount += 1;
    }
  }

  for (const previousNode of previousNodes) {
    if (!nextMap.has(previousNode.node_id)) {
      removedCount += 1;
    }
  }

  return {
    addedCount: addedNodeIds.length,
    updatedCount,
    removedCount,
    addedNodeIds,
    totalChanges: addedNodeIds.length + updatedCount + removedCount,
  };
}

function buildReconnectSummaryMessage(diff: {
  addedCount: number;
  updatedCount: number;
  removedCount: number;
}) {
  const parts = [
    diff.addedCount > 0 ? `新增 ${diff.addedCount} 個景點` : '',
    diff.updatedCount > 0 ? `更新 ${diff.updatedCount} 個景點` : '',
    diff.removedCount > 0 ? `刪除 ${diff.removedCount} 個景點` : '',
  ].filter(Boolean);

  return parts.length > 0
    ? `您離線期間，旅伴已${parts.join('、')}。`
    : '您已重新連線，行程已同步到最新版本。';
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatDateToIcs(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}00`;
}

function buildIcsCalendar(tripName: string, nodes: ItineraryNode[]) {
  const orderedNodes = sortNodesForDisplay([...nodes]).filter((node) => node.date && node.time);
  const nowStamp = formatDateToIcs(new Date());
  const events = orderedNodes.map((node, index) => {
    const start = new Date(`${node.date}T${normalizeClockInput(node.time)}:00`);
    const nextNode = orderedNodes[index + 1];
    const nextStart = nextNode?.date && nextNode?.time ? new Date(`${nextNode.date}T${normalizeClockInput(nextNode.time)}:00`) : null;
    const end = nextStart && nextStart > start
      ? nextStart
      : new Date(start.getTime() + 60 * 60 * 1000);

    return [
      'BEGIN:VEVENT',
      `UID:${node.node_id}@roamjelly.app`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${formatDateToIcs(start)}`,
      `DTEND:${formatDateToIcs(end)}`,
      `SUMMARY:${escapeIcsText(node.title)}`,
      `DESCRIPTION:${escapeIcsText(node.description || node.ai_note || '')}`,
      `LOCATION:${escapeIcsText(node.title)}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RoamJelly//Trip Export//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeIcsText(tripName)}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.readAsDataURL(file);
  });
}
