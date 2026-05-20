import { SPRING_SMOOTH, SPRING_SNAPPY, SPRING_BOUNCY } from '../lib/motionTokens';
import React, {
  Fragment,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  Reorder,
  useReducedMotion,
  useDragControls,
} from "motion/react";

import MapSelectorModal from "./MapSelectorModal";
import EditorialSectionIntro from "./EditorialSectionIntro";
import ExpandableText from "./ExpandableText";
import HorizontalScrollRail from "./HorizontalScrollRail";

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
  Lock,
  ZoomIn,
  Instagram,
  AlertTriangle,
  FileText,
  ChevronUp,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import GlassCard from "./GlassCard";
import IconImg from "./ui/IconImg";
import { ItinerarySkeletonCard } from "./SkeletonCard";
import { WikiPreviewCard } from "./WikiPreviewCard";
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
  fetchDirections,
  fetchSpotEnrichment,
  submitLedgerExpense,
  deleteTripApi,
  openNativeMap,
} from "../lib/workflowApi";
import {
  suggestItineraryWithForm,
  AiRateLimitedError,
} from "../lib/openrouterApi";
import { haversineKm, estimateTransport, formatMinutes } from "../lib/geoUtils";
import { useItineraryStore } from "../store/useItineraryStore";
import { useSearchStore } from "../store/useSearchStore";
import { useAppStore } from "../store/useAppStore";
import { useTripFactsStore } from "../store/useTripFactsStore";
import { useHideNavOnScroll } from "../hooks/useHideNavOnScroll";
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
} from "../types/workflow";

import AiForm, { AiFormData } from "./AiForm";
import DatePickerPopup from "./DatePickerPopup";
import {
  assignDaysBasedOnTimeAndOrder,
  buildTimestampFromDateTime,
  getDateForDay,
  getDayForDate,
  sortNodesForDisplay,
} from "../lib/itineraryUtils";
import { triggerHapticFeedback } from "../lib/haptics";
import {
  getModalMotion,
  getOverlayTransition,
  getSheetMotion,
} from "../lib/motionTokens";
import { useTypewriter } from "../lib/useTypewriter";

// Split itinerary components
import CollapsibleNotes from "./itinerary/CollapsibleNotes";
import SelectedNodeTransportDetails from "./itinerary/SelectedNodeTransportDetails";
import CalendarView from "./itinerary/CalendarView";
import QuickExpenseModal from "./itinerary/QuickExpenseModal";
import ImagePreviewModal from "./itinerary/ImagePreviewModal";

const ItineraryMapView = lazy(() => import("./ItineraryMapView"));


const DESTINATION_IMAGES: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ["台北", "taipei"],
    url: "https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["九份", "jiufen"],
    url: "https://images.unsplash.com/photo-1548468787-56de8ce95253?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["太魯閣", "taroko", "花蓮", "hualien"],
    url: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["日月潭", "sun moon lake"],
    url: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["台南", "tainan"],
    url: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["高雄", "kaohsiung"],
    url: "https://images.unsplash.com/photo-1605552490120-dba5cfe84eac?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["墾丁", "kenting"],
    url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["清境", "cingjing", "合歡", "hehuanshan"],
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["台東", "taitung", "池上", "chishang"],
    url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["淡水", "tamsui"],
    url: "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=800&auto=format&fit=crop",
  },
  {
    keywords: [
      "日本",
      "japan",
      "東京",
      "tokyo",
      "大阪",
      "osaka",
      "京都",
      "kyoto",
    ],
    url: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["韓國", "korea", "首爾", "seoul"],
    url: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&auto=format&fit=crop",
  },
  {
    keywords: ["泰國", "thailand", "曼谷", "bangkok"],
    url: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&auto=format&fit=crop",
  },
];
const DEFAULT_TRIP_IMAGE =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";

function getTripCoverImage(destination: string): string {
  if (!destination) return DEFAULT_TRIP_IMAGE;
  const lower = destination.toLowerCase();
  for (const entry of DESTINATION_IMAGES) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.url;
  }
  return DEFAULT_TRIP_IMAGE;
}

function getDynamicMapPercent(nodes: any[], lat: number, lng: number) {
  if (!lat || !lng || nodes.length === 0) return { x: 50, y: 50 };

  let minLat = 90,
    maxLat = -90,
    minLng = 180,
    maxLng = -180;
  let hasValidCoords = false;
  nodes.forEach((n) => {
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
    y: Math.min(100, Math.max(0, y)),
  };
}

const EMOJI_OPTIONS = [
  "camera",
  "mountain",
  "beach",
  "food-drink",
  "hotel",
  "heart",
  "star",
  "compass",
  "backpack",
  "tent",
  "globe",
  "map",
];
type AiGenerateMode =
  | "selected_day"
  | "overwrite_all"
  | "generate_for_selected_days";
const AI_LOADING_QUOTES = [
  "正在打包行李，替今天塞進剛剛好的節奏...",
  "正在幫你喬靠窗座位，也順便避開太硬的移動路線...",
  "正在請教在地老饕，看看哪一站最值得停久一點...",
  "正在替你把交通、景點與休息點排成順手的旅途節拍...",
  "正在翻閱地圖，尋找那些不該被錯過的私房秘境...",
  "正在衡量步調，確保每天都有足夠的發呆時間...",
  "再等一下，完美的假期即將躍然紙上...",
];
const NO_TRIP_ENTRY_PILLARS = [
  {
    icon: Sparkles,
    eyebrow: "AI 起草",
    title: "先快速起一版旅程骨架",
    description: "從目的地、天數與偏好開始，讓 AI 先把第一版節奏拉出來。",
  },
  {
    icon: Users,
    eyebrow: "行程共編",
    title: "旅伴同步協作",
    description: "航班、景點與待辦事項統一管理，不需來回複製資料。",
  },
  {
    icon: Plane,
    eyebrow: "旅程銜接",
    title: "後續直接接到工具與地圖",
    description: "行程一旦建立，工具包與分享流程就能順著這趟旅程接下去。",
  },
] as const;
const DELETE_UNDO_WINDOW_MS = 3600;

import {
  CATEGORY_META,
  CATEGORY_OPTIONS,
  getCategoryMeta,
  getNodeEmoji,
} from "../lib/itineraryUtils";

function withAutoCategoryIcon(node: ItineraryNode): ItineraryNode {
  return {
    ...node,
    category: getCategoryMeta(node.category).key,
    emoji: getNodeEmoji(node),
  };
}

function buildDefaultPlannerForm(
  destination: string,
  days: number,
  profile?: any,
): ItineraryPlannerForm {
  return {
    days,
    departureFrom: profile?.departure || "台北",
    arrivalTo: destination,
    flightDate: "2026-06-15",
    countries: [],
    mustVisitSpots: [],
    mustEatFoods: [],
    autoFlightSegments: [],
    notes: "",
    travelFactsContext: "",
    companions: profile?.companions || "",
    vibes: Array.isArray(profile?.vibes)
      ? [...profile.vibes]
      : ([] as string[]),
    interests: Array.isArray(profile?.interests)
      ? [...profile.interests]
      : ([] as string[]),
    budget: profile?.budget || "",
    dietary: Array.isArray(profile?.dietary)
      ? [...profile.dietary]
      : ([] as string[]),
    transport: Array.isArray(profile?.transport)
      ? [...profile.transport]
      : ([] as string[]),
    pace: profile?.pace || "",
    accommodation: Array.isArray(profile?.accommodation)
      ? [...profile.accommodation]
      : ([] as string[]),
  } as any;
}

function getCurrencyFromDestination(destination: string): string {
  if (!destination) return "TWD";
  const lower = destination.toLowerCase();
  if (
    lower.includes("日") ||
    lower.includes("tokyo") ||
    lower.includes("osaka") ||
    lower.includes("kyoto")
  )
    return "JPY";
  if (lower.includes("韓") || lower.includes("seoul")) return "KRW";
  if (lower.includes("泰") || lower.includes("bangkok")) return "THB";
  if (
    lower.includes("美") ||
    lower.includes("usa") ||
    lower.includes("new york")
  )
    return "USD";
  if (
    lower.includes("歐") ||
    lower.includes("paris") ||
    lower.includes("london")
  )
    return "EUR";
  return "TWD";
}

function normalizeScheduleForNode(
  node: Partial<ItineraryNode>,
  options: {
    tripStartDate?: string | null;
    fallbackDay: number;
    fallbackSortOrder?: number;
  },
): Partial<ItineraryNode> {
  const fallbackDay =
    Number(options.fallbackDay) > 0 ? Number(options.fallbackDay) : 1;
  const normalizedDate =
    node.date ||
    getDateForDay(node.day ?? fallbackDay, options.tripStartDate) ||
    getDateForDay(fallbackDay, options.tripStartDate);
  const derivedDay = getDayForDate(
    normalizedDate,
    options.tripStartDate,
    node.day ?? fallbackDay,
  );
  const normalizedTime = node.time || "10:00";

  return {
    ...node,
    day: derivedDay,
    date: normalizedDate,
    time: normalizedTime,
    timestamp:
      buildTimestampFromDateTime(normalizedDate, normalizedTime) ??
      node.timestamp,
    sort_order:
      typeof node.sort_order === "number"
        ? node.sort_order
        : typeof options.fallbackSortOrder === "number"
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

function buildNodePatchChanges(
  previousNode: ItineraryNode,
  nextNode: ItineraryNode,
): ItineraryNodePatchChanges {
  const changes: ItineraryNodePatchChanges = {};

  if (previousNode.day !== nextNode.day) changes.day = nextNode.day;
  if ((previousNode.date || "") !== (nextNode.date || ""))
    changes.date = nextNode.date || null;
  if ((previousNode.time || "") !== (nextNode.time || ""))
    changes.time = nextNode.time || "10:00";
  if ((previousNode.timestamp || "") !== (nextNode.timestamp || ""))
    changes.timestamp = nextNode.timestamp || null;
  if ((previousNode.sort_order ?? 0) !== (nextNode.sort_order ?? 0))
    changes.sort_order = nextNode.sort_order ?? 0;
  if ((previousNode.title || "") !== (nextNode.title || ""))
    changes.title = nextNode.title;
  if ((previousNode.emoji || "") !== (nextNode.emoji || ""))
    changes.emoji = nextNode.emoji;
  if ((previousNode.category || "other") !== (nextNode.category || "other"))
    changes.category = nextNode.category;
  if ((previousNode.description || "") !== (nextNode.description || ""))
    changes.description = nextNode.description || "";
  if ((previousNode.ai_note || "") !== (nextNode.ai_note || ""))
    changes.ai_note = nextNode.ai_note ?? null;
  if ((previousNode.intensity || "") !== (nextNode.intensity || ""))
    changes.intensity = nextNode.intensity ?? null;
  if (Boolean(previousNode.is_visited) !== Boolean(nextNode.is_visited))
    changes.is_visited = Boolean(nextNode.is_visited);
  if ((previousNode.lat ?? null) !== (nextNode.lat ?? null))
    changes.lat = nextNode.lat ?? null;
  if ((previousNode.lng ?? null) !== (nextNode.lng ?? null))
    changes.lng = nextNode.lng ?? null;
  if (
    (previousNode.transport_to_next || "") !==
    (nextNode.transport_to_next || "")
  )
    changes.transport_to_next = nextNode.transport_to_next || "";
  if ((previousNode.image_url || "") !== (nextNode.image_url || ""))
    changes.image_url = nextNode.image_url || "";
  if (
    JSON.stringify(previousNode.attachments || []) !==
    JSON.stringify(nextNode.attachments || [])
  ) {
    changes.attachments = nextNode.attachments || [];
  }
  if ((previousNode.linkedFactId || "") !== (nextNode.linkedFactId || "")) {
    changes.linkedFactId = nextNode.linkedFactId || "";
  }

  return changes;
}

export default function ItineraryTab() {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [viewMode, setViewMode] = useState<"list" | "map" | "calendar">("list");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [tip, setTip] = useState("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [localThemeGradient, setLocalThemeGradient] = useState<string | null>(null);

  // Project List states
  const [userTrips, setUserTrips] = useState<any[]>([]);
  const [isTripsLoading, setIsTripsLoading] = useState<boolean>(false);
  const [showCreateTrip, setShowCreateTrip] = useState<boolean>(false);
  const [newTripName, setNewTripName] = useState("");
  const [newTripDest, setNewTripDest] = useState("");

  // Trip & favorites
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [favorites, setFavorites] = useState<FavoriteSpot[]>([]);
  const [newSpotTitle, setNewSpotTitle] = useState("");
  const [newSpotEmoji, setNewSpotEmoji] = useState("📍");
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [addingFavorite, setAddingFavorite] = useState<boolean>(false);
  const { aiProfile } = useSearchStore();
  const [plannerForm, setPlannerForm] = useState<ItineraryPlannerForm>(
    buildDefaultPlannerForm("", 5, aiProfile),
  );
  const [flightsLoading, setFlightsLoading] = useState<boolean>(false);
  const [aiGenerateMode, setAiGenerateMode] =
    useState<AiGenerateMode>("selected_day");
  const [rangeStartDay, setRangeStartDay] = useState<number>(1);
  const [rangeEndDay, setRangeEndDay] = useState<number>(3);
  const [showPlanner, setShowPlanner] = useState<boolean>(false);
  const [isPlanningNew, setIsPlanningNew] = useState<boolean>(false);
  const [isAiHeroExpanded, setIsAiHeroExpanded] = useState<boolean>(false);
  const [showMobileFavorites, setShowMobileFavorites] =
    useState<boolean>(false);
  const [isFavoritesCollapsed, setIsFavoritesCollapsed] = useState<boolean>(false);
  const [draggingFavorite, setDraggingFavorite] = useState<FavoriteSpot | null>(
    null,
  );
  const [nodeEditingLocks, setNodeEditingLocks] = useState<
    Record<string, { userName: string; day: number }>
  >({});
  const [expenseTargetNode, setExpenseTargetNode] =
    useState<ItineraryNode | null>(null);
  const [isUpdatingPublicState, setIsUpdatingPublicState] = useState(false);
  const [loadedDays, setLoadedDays] = useState<number[]>([]);
  const [loadingDay, setLoadingDay] = useState<number | null>(null);
  const [visibleNodeLimit, setVisibleNodeLimit] = useState<number>(20);
  const [visibleDaysLimit, setVisibleDaysLimit] = useState<number>(14);
  const overlayTransition = getOverlayTransition(prefersReducedMotion);
  const sheetMotion = getSheetMotion(prefersReducedMotion);
  const { onScroll } = useHideNavOnScroll();

  const socketRef = useRef<Socket | null>(null);
  const reorderCommitTimerRef = useRef<number | null>(null);
  const pendingReorderRef = useRef<ItineraryNode[] | null>(null);
  const reconnectHighlightTimerRef = useRef<number | null>(null);
  const offlineSnapshotRef = useRef<ItineraryNode[]>([]);
  const pendingReconnectSummaryRef = useRef(false);
  const pendingDeleteTimersRef = useRef<Record<string, number>>({});
  const [recentlySyncedNodeIds, setRecentlySyncedNodeIds] = useState<string[]>(
    [],
  );

  const {
    nodes,
    setNodes,
    replaceDayNodes,
    addNode,
    updateNode,
    patchNode,
    removeNode,
    collaborators,
    setCollaborators,
    isOffline,
    setOffline,
  } = useItineraryStore();
  const {
    showToast,
    activeTripId,
    setActiveTripId,
    openRedirectModal,
    addNotification,
    aiResult,
  } = useAppStore();

  useEffect(() => {
    setSelectedDay(1);
    setLoadedDays([]);
    setLoadingDay(null);
  }, [activeTripId]);

  useEffect(
    () => () => {
      if (reorderCommitTimerRef.current) {
        window.clearTimeout(reorderCommitTimerRef.current);
      }
      if (reconnectHighlightTimerRef.current) {
        window.clearTimeout(reconnectHighlightTimerRef.current);
      }
      Object.values(pendingDeleteTimersRef.current).forEach((timer) => {
        window.clearTimeout(timer);
      });
    },
    [],
  );

  const normalizeAiCategory = (raw?: string): string => {
    if (!raw) return "other";
    const s = raw.toLowerCase().trim();
    const map: Record<string, string> = {
      accommodation: "hotel",
      lodging: "hotel",
      stay: "hotel",
      restaurant: "food",
      dining: "food",
      cafe: "food",
      coffee: "food",
      eat: "food",
      attraction: "landmark",
      museum: "landmark",
      temple: "landmark",
      sight: "landmark",
      sightseeing: "landmark",
      nature: "nature",
      park: "nature",
      beach: "nature",
      mountain: "nature",
      shopping: "shopping",
      market: "shopping",
      mall: "shopping",
      transport: "transport",
      taxi: "transport",
      bus: "transport",
      train: "transport",
      transit: "transport",
      flight: "flight",
      airport: "flight",
      activity: "activity",
      tour: "activity",
      experience: "activity",
      sport: "activity",
      nightlife: "nightlife",
      bar: "nightlife",
      club: "nightlife",
      night: "nightlife",
    };
    for (const [k, v] of Object.entries(map)) {
      if (s.includes(k)) return v;
    }
    return CATEGORY_OPTIONS.includes(s) ? s : "other";
  };

  const handleAiFormSubmit = async (formData: AiFormData) => {
    setAiLoading(true);
    showToast(`正在為您生成旅程：${formData.destination}...`);
    try {
      // Sync plannerForm.days so totalDays reflects user's selection immediately (e.g. 4 days)
      setPlannerForm((prev) => ({ ...prev, days: formData.days }));

      const suggestions = await suggestItineraryWithForm({
        destination: formData.destination,
        planner: {
          days: formData.days,
          departureFrom: formData.departure,
          arrivalTo: formData.destination,
          flightDate: "",
          countries: [],
          mustVisitSpots: [],
          mustEatFoods: [],
          autoFlightSegments: [],
          travelFactsContext: "",
          notes: "",
          companions: formData.companions,
          vibes: formData.vibes,
          interests: formData.interests,
          budget: formData.budget,
          dietary: formData.dietary,
          transport: formData.transport,
          pace: formData.pace,
          accommodation: formData.accommodation,
        },
      });

      const rawNodes: ItineraryNode[] = [];
      suggestions.itinerary.forEach((dayData: any) => {
        dayData.spots.forEach((spot: any, i: number) => {
          const cat = normalizeAiCategory(spot.category);
          rawNodes.push({
            node_id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${dayData.day}_${i}`,
            day: dayData.day || 1,
            time: normalizeClockInput(spot.time || "10:00"),
            title: spot.name || "景點",
            emoji: getNodeEmoji({ emoji: spot.emoji, category: cat }),
            category: cat,
            description: spot.ai_note || "",
            ai_note: spot.ai_note || "",
            intensity: spot.intensity,
            lat: undefined as any,
            lng: undefined as any,
            source: "local" as const,
          });
        });
      });

      // Priorities AI generated lat/lng, otherwise Geocode spots in parallel; fall back silently if any fail
      const geocodeResults = await Promise.allSettled(
        rawNodes.map((n) =>
          n.lat && n.lng
            ? Promise.resolve({ lat: n.lat, lng: n.lng })
            : geocodeSpot(n.title, formData.destination),
        ),
      );
      geocodeResults.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          rawNodes[i].lat = r.value.lat;
          rawNodes[i].lng = r.value.lng;
        }
      });

      // Fetch spot images (Wikipedia thumbnail) in parallel; fall back silently
      const enrichResults = await Promise.allSettled(
        rawNodes.map((n) => fetchSpotEnrichment(n.title)),
      );
      enrichResults.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value?.thumbnail) {
          rawNodes[i].image_url = r.value.thumbnail;
        }
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const finalNodes = assignDaysBasedOnTimeAndOrder(
        rawNodes,
        startDate.toISOString(),
      );

      useAppStore.getState().setAiResult({
        fullResponse: suggestions,
        title: suggestions.summary.title,
        destination: formData.destination,
        rawSuggestions: finalNodes,
      });

      const themeGradient = suggestions?.ui_state?.theme_gradient || 
                            suggestions?.ui_config?.bg_gradient || 
                            suggestions?.theme_gradient || 
                            suggestions?.bg_gradient;
      if (themeGradient) {
        setLocalThemeGradient(themeGradient);
      }

      setIsPlanningNew(false);
      useAppStore.getState().setActiveTab("ai_result");
    } catch (err) {
      if (err instanceof AiRateLimitedError) {
        showToast(err.message, "warning");
      } else {
        showToast("AI 規劃失敗，請稍後再試。", "warning");
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
        action: "patch_node",
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
      socketRef.current?.emit("sync_itinerary", payload);
      void syncItinerary(payload).catch(() => {
        setTip("排序同步失敗，重新整理後可回到最後儲存版本。");
        setTimeout(() => setTip(""), 2500);
      });
    }
  };

  const handleReorder = (newOrderVisible: ItineraryNode[]) => {
    const invisibleNodes = selectedDayNodes.slice(visibleNodeLimit);
    const newOrder = [...newOrderVisible, ...invisibleNodes];

    const reorderedNodes = sortNodesForDisplay(
      newOrder.map((node, index) =>
        withAutoCategoryIcon(
          normalizeScheduleForNode(
            {
              ...node,
              day: safeSelectedDay,
              date:
                node.date ||
                getDateForDay(safeSelectedDay, tripInfo?.startDate),
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
    const otherDaysNodes = nodes.filter(
      (node: ItineraryNode) => node.day !== safeSelectedDay,
    );
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
          .filter(
            (existingNode: ItineraryNode) =>
              existingNode.day === safeSelectedDay,
          )
          .map((existingNode: ItineraryNode) => existingNode.sort_order ?? 0),
      ) + 1;
    const normalized = withAutoCategoryIcon(
      normalizeScheduleForNode(
        {
          node_id: `node_manual_${Date.now()}`,
          day: node.day ?? safeSelectedDay,
          date:
            node.date ||
            getDateForDay(node.day ?? safeSelectedDay, tripInfo?.startDate),
          time: node.time || "10:00",
          title: node.title || "新行程",
          category: node.category || "other",
          emoji: getNodeEmoji(node),
          source: "local",
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
    const payload: SyncItineraryPayload = {
      trip_id: activeTripId,
      action: "add_node",
      payload: normalized,
    };
    socketRef.current?.emit("sync_itinerary", payload);
    void syncItinerary(payload).catch(() => {
      removeNode(normalized.node_id);
      showToast("新增行程失敗，已還原。", "warning");
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
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOffline]);

  const [weatherData, setWeatherData] = useState<any[]>([]);

  // Fetch projects list if no activeTripId
  const loadUserTrips = async () => {
    setIsTripsLoading(true);
    try {
      const { fetchUserTrips } = await import("../lib/workflowApi");
      const trips = await fetchUserTrips();
      setUserTrips(trips);
    } catch (e) {
      showToast("無法載入我的行程列表");
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
        const [
          tripResult,
          favResult,
          collabResult,
          itineraryResult,
          factsResult,
        ] = await Promise.all([
          fetchTripInfo(activeTripId),
          fetchFavorites(activeTripId),
          fetchCollaborators(activeTripId),
          !isOffline
            ? fetchItinerary(activeTripId, { day: initialDay })
            : Promise.resolve(readCachedItinerary(activeTripId)),
          fetchTripFacts(activeTripId).catch(() => []),
        ]);
        setTripInfo(tripResult);

        // If the trip has an absurdly long date range (e.g. 35 days) but is fresh (no nodes),
        // don't overwhelm the planner form with a 35-day count. Cap default planning to a week.
        const initialPlannerDays =
          tripResult.days > 14 &&
          (!itineraryResult || itineraryResult.length === 0)
            ? 5
            : tripResult.days || 5;

        setPlannerForm(
          buildDefaultPlannerForm(
            tripResult.destination,
            initialPlannerDays,
            aiProfile,
          ),
        );
        setFavorites(favResult);
        setCollaborators(collabResult);
        if (Array.isArray(factsResult)) {
          useTripFactsStore.getState().setFacts(factsResult);
        }
        const assignedNodes = assignDaysBasedOnTimeAndOrder(
          itineraryResult,
          tripResult.startDate || "2026-06-15",
        );
        setNodes(assignedNodes);
        setLoadedDays(
          isOffline ? getLoadedDaysFromNodes(assignedNodes) : [initialDay],
        );

        if (pendingReconnectSummaryRef.current && !isOffline) {
          const offlineSnapshot =
            offlineSnapshotRef.current.length > 0
              ? offlineSnapshotRef.current.filter(
                  (node: ItineraryNode) => node.day === initialDay,
                )
              : readCachedItinerary(activeTripId).filter(
                  (node: ItineraryNode) => node.day === initialDay,
                );
          const diffSummary = summarizeItineraryDiff(
            offlineSnapshot,
            assignedNodes,
          );

          if (diffSummary.totalChanges > 0) {
            const summaryMessage = buildReconnectSummaryMessage(diffSummary);
            showToast(summaryMessage, "success");
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
        const firstNodeWithCoords = assignedNodes.find(
          (n: any) => n.lat && n.lng,
        );
        if (firstNodeWithCoords) {
          fetch(
            `/api/weather?lat=${firstNodeWithCoords.lat}&lng=${firstNodeWithCoords.lng}`,
          )
            .then((r) => r.json())
            .then((wData) => {
              if (wData?.daily) setWeatherData(wData.daily);
            })
            .catch(() => {});
        }
      } catch {
        const cached = readCachedItinerary(activeTripId);
        const assignedCached = assignDaysBasedOnTimeAndOrder(
          cached,
          "2026-06-15",
        );
        setNodes(assignedCached);
        setLoadedDays(getLoadedDaysFromNodes(assignedCached));
        setTip("同步服務暫時不可用，先顯示最近的離線內容。");
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

      const socket = io("/", {
        transports: ["websocket", "polling"],
        auth: token ? { token: `Bearer ${token}` } : undefined,
      });

      socket.on("connect", () => {
        socket.emit("join_room", { trip_id: activeTripId });
        setIsSocketConnected(true);
      });

      socket.on("sync_itinerary", (event: SyncItineraryPayload) => {
        if (!event?.payload) return;
        if (event.action === "remove_node") {
          removeNode((event.payload as { node_id: string }).node_id);
          addNotification("協作者刪除了一個行程節點");
        } else if (event.action === "patch_node") {
          const patch = event.payload as {
            node_id: string;
            changes: ItineraryNodePatchChanges;
          };
          if (!patch?.node_id || !patch?.changes) return;
          patchNode(patch.node_id, { ...patch.changes, source: "remote" });
          addNotification("協作者更新了一個行程節點");
        } else if (event.action === "add_node") {
          const node = event.payload as ItineraryNode;
          addNode({ ...node, source: "remote" });
          addNotification(`協作者新增了「${node.title ?? "行程節點"}」`);
        }
      });

      socket.on(
        "editing_start",
        (data: { userName: string; day: number; nodeId: string }) => {
          if (!data?.nodeId) return;
          setNodeEditingLocks((prev) => ({
            ...prev,
            [data.nodeId]: { userName: data.userName, day: data.day },
          }));
        },
      );
      socket.on("editing_stop", (data: { nodeId?: string }) => {
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
      socket.on(
        "editing_denied",
        (data: { userName?: string; nodeId?: string; day?: number }) => {
          if (data?.nodeId && data?.userName) {
            setNodeEditingLocks((prev) => ({
              ...prev,
              [data.nodeId as string]: {
                userName: data.userName as string,
                day: Number(data.day ?? 1),
              },
            }));
          }
          showToast(
            `${data?.userName ?? "旅伴"} 正在編輯這個景點，請稍後再試。`,
            "warning",
          );
        },
      );

      socket.on("disconnect", () => {
        setIsSocketConnected(false);
        setNodeEditingLocks({});
        setTip("即時同步已中斷，正在等待重連。");
        setTimeout(() => setTip(""), 2000);
      });

      socketRef.current = socket;
    })();

    return () => {
      mounted = false;
      socketRef.current?.off("editing_start");
      socketRef.current?.off("editing_stop");
      socketRef.current?.off("editing_denied");
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
    if (maxNodeDay > 0 && infoDays > maxNodeDay + 7) {
      // If planDays is also huge (likely synced from infoDays), override it.
      if (planDays === infoDays || planDays > maxNodeDay + 14) {
        return maxNodeDay;
      }
      return Math.max(planDays, maxNodeDay);
    }

    // CASE 3: Standard union of indicators
    return Math.max(planDays, infoDays, maxNodeDay);
  }, [plannerForm.days, tripInfo?.days, maxNodeDay, nodes.length]);

  // Clamp during render — avoids the extra render cycle from a setState-only effect
  const safeSelectedDay = Math.min(selectedDay, totalDays);

  // When day changes, reset visible nodes limit
  useEffect(() => {
    setVisibleNodeLimit(20);
  }, [safeSelectedDay]);

  const actualDaysLimit = Math.max(visibleDaysLimit, safeSelectedDay);
  const paginatedDaysArray = Array.from({ length: Math.min(totalDays, actualDaysLimit) }, (_, i) => i + 1);

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
      if (!activeTripId || isOffline || loadedDays.includes(safeSelectedDay))
        return;

      try {
        setLoadingDay(safeSelectedDay);
        const itineraryResult = await fetchItinerary(activeTripId, {
          day: safeSelectedDay,
        });
        const assignedNodes = assignDaysBasedOnTimeAndOrder(
          itineraryResult,
          tripInfo?.startDate || "2026-06-15",
        );
        replaceDayNodes(
          safeSelectedDay,
          assignedNodes.filter(
            (node: ItineraryNode) => node.day === safeSelectedDay,
          ),
        );
        setLoadedDays((prev: number[]) =>
          Array.from(new Set([...prev, safeSelectedDay])).sort((a, b) => a - b),
        );
      } catch {
        const cachedDayNodes = readCachedItinerary(activeTripId).filter(
          (node) => node.day === safeSelectedDay,
        );
        if (cachedDayNodes.length > 0) {
          replaceDayNodes(safeSelectedDay, cachedDayNodes);
          setLoadedDays((prev: number[]) =>
            Array.from(new Set([...prev, safeSelectedDay])).sort(
              (a, b) => a - b,
            ),
          );
        } else {
          showToast(`Day ${safeSelectedDay} 載入失敗，請稍後再試。`, "warning");
        }
      } finally {
        setLoadingDay((current: number | null) =>
          current === safeSelectedDay ? null : current,
        );
      }
    };

    void loadSelectedDay();
  }, [
    activeTripId,
    isOffline,
    loadedDays,
    replaceDayNodes,
    safeSelectedDay,
    showToast,
    tripInfo?.startDate,
  ]);

  const handleExportIcs = () => {
    if (!tripInfo) return;
    const icsContent = buildIcsCalendar(
      tripInfo.name || tripInfo.destination || "RoamJelly Trip",
      nodes,
    );
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(tripInfo.name || tripInfo.destination || "roamjelly-trip").replace(/\s+/g, "-").toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    showToast(
      "已匯出 ICS，可加入 Apple Calendar 或 Google Calendar。",
      "success",
    );
  };

  const handleCreateTrip = async () => {
    if (!newTripName || !newTripDest) return;
    try {
      const { createTrip } = await import("../lib/workflowApi");
      const newTrip = await createTrip({
        name: newTripName,
        destination: newTripDest,
      });
      const newTripId = newTrip?.data?.id || newTrip?.id;
      showToast("成功建立新旅程！", "success");
      setNewTripName("");
      setNewTripDest("");
      setShowCreateTrip(false);
      if (newTripId) setActiveTripId(newTripId);
    } catch (e) {
      showToast("建立行程失敗，請稍後再試");
    }
  };

  const handleBackToTrips = () => {
    setActiveTripId("");
    setNodes([]);
    setTripInfo(null);
  };

  const setPlannerField = <K extends keyof ItineraryPlannerForm>(
    key: K,
    value: ItineraryPlannerForm[K],
  ) => {
    setPlannerForm((prev: ItineraryPlannerForm) => ({ ...prev, [key]: value }));
  };

  const setPlannerCsvField =
    (key: "countries" | "mustVisitSpots" | "mustEatFoods") => (text: string) =>
      setPlannerField(key, parseCsvInput(text));

  const handleShare = async () => {
    if (!activeTripId) {
      showToast("缺少行程 ID，無法分享旅程");
      return;
    }
    const shareUrl = `${window.location.origin}/share/trip/${activeTripId}`;
    const shareTitle =
      tripInfo?.name || tripInfo?.destination || "RoamJelly 行程";
    const shareText = tripInfo?.destination
      ? `一起看 ${tripInfo.destination} 的旅程安排`
      : "一起打開這份 RoamJelly 旅程";
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        triggerHapticFeedback([20]);
        showToast("已開啟分享面板，快傳給旅伴吧。", "success");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      triggerHapticFeedback([20]);
      showToast("🎉 可預覽的分享連結已複製！邀請朋友加入吧", "success");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      showToast("分享失敗，請手動複製網址", "warning");
    }
  };

  const handleTogglePublicTemplate = async () => {
    if (!activeTripId || !tripInfo || isUpdatingPublicState) return;
    const nextPublicState = !tripInfo.isPublic;
    setIsUpdatingPublicState(true);
    try {
      const response = await updateTripPublicState(
        activeTripId,
        nextPublicState,
      );
      const data = response?.data ?? response ?? {};
      setTripInfo((prev: TripInfo | null) =>
        prev
          ? {
              ...prev,
              isPublic: Boolean(data.isPublic ?? nextPublicState),
              forkCount: Number(data.forkCount ?? prev.forkCount ?? 0),
            }
          : prev,
      );
      showToast(
        nextPublicState ? "已發布到公開分享行程。" : "已從公開分享行程移除。",
        "success",
      );
    } catch (error: any) {
      showToast(error?.message || "更新公開分享行程狀態失敗。", "warning");
    } finally {
      setIsUpdatingPublicState(false);
    }
  };

  // Add a favorite spot from the DB to the selected day's timeline
  const addSpotToDay = (
    spot: FavoriteSpot,
    day: number,
    options?: { silent?: boolean },
  ) => {
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
          category: "landmark",
          source: "local",
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

    const payload: SyncItineraryPayload = {
      trip_id: activeTripId,
      action: "add_node",
      payload: normalized,
    };
    socketRef.current?.emit("sync_itinerary", payload);
    void syncItinerary(payload).catch(() => {
      removeNode(normalized.node_id);
      setTip("行程同步失敗，未儲存的景點已還原。");
      setTimeout(() => setTip(""), 2000);
    });

    if ((!spot.lat || !spot.lng) && tripInfo?.destination) {
      void geocodeSpot(spot.title, tripInfo.destination).then((coords) => {
        if (!coords) return;
        const patched = { ...normalized, lat: coords.lat, lng: coords.lng };
        updateNode(patched);
        const syncPayload: SyncItineraryPayload = {
          trip_id: activeTripId,
          action: "patch_node",
          payload: {
            node_id: normalized.node_id,
            changes: {
              lat: coords.lat,
              lng: coords.lng,
            },
          },
        };
        socketRef.current?.emit("sync_itinerary", syncPayload);
        void syncItinerary(syncPayload).catch(() => {
          updateNode(normalized);
          setTip("景點定位同步失敗，已保留原始資料。");
          setTimeout(() => setTip(""), 2000);
        });
      });
    }

    if (!options?.silent) {
      showToast(`${normalized.emoji} ${spot.title} 已加入 Day ${day}！`);
    }
  };

  const handleFillDayFromFavorites = (day: number) => {
    const candidateFavorites = favorites.filter(
      (spot) =>
        !nodes.some(
          (node: ItineraryNode) =>
            node.day === day && node.title.trim() === spot.title.trim(),
        ),
    );

    if (candidateFavorites.length === 0) {
      showToast("口袋名單暫時沒有新的景點可以抽進今天。", "warning");
      return;
    }

    const shuffled = [...candidateFavorites].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, Math.min(3, shuffled.length));
    picks.forEach((spot) => addSpotToDay(spot, day, { silent: true }));
    showToast(
      `已從口袋名單替 Day ${day} 補上 ${picks.length} 個靈感景點。`,
      "success",
    );
  };

  // Add a new custom favorite (geocoded by backend via Nominatim)
  const handleAddFavorite = async () => {
    if (!newSpotTitle.trim() || isOffline || !activeTripId) return;
    setAddingFavorite(true);
    try {
      const result = await addFavorite(
        activeTripId,
        newSpotTitle.trim(),
        newSpotEmoji,
      );
      if (!result || result.error) {
        showToast(result?.error ?? "新增收藏失敗，請稍後再試。", "warning");
        return;
      }
      setFavorites((prev: FavoriteSpot[]) => [...prev, result.spot]);
      setNewSpotTitle("");
      setNewSpotEmoji("📍");
      setShowEmojiPicker(false);
      showToast(
        `${result.spot.emoji} ${result.spot.title} 已加入收藏（座標已自動定位）`,
      );
    } catch {
      showToast("新增收藏失敗，請稍後再試。");
    } finally {
      setAddingFavorite(false);
    }
  };

  // Remove a favorite from the DB
  const handleDeleteFavorite = async (id: string) => {
    setFavorites((prev: FavoriteSpot[]) =>
      prev.filter((f: FavoriteSpot) => f.id !== id),
    );
    try {
      await deleteFavorite(id);
    } catch {
      showToast("刪除收藏失敗，請稍後再試。");
    }
  };

  const handleDeleteNode = (node_id: string) => {
    const removedNode = nodes.find(
      (node: ItineraryNode) => node.node_id === node_id,
    );
    if (!removedNode) return;

    if (pendingDeleteTimersRef.current[node_id]) {
      window.clearTimeout(pendingDeleteTimersRef.current[node_id]);
    }

    removeNode(node_id);
    triggerHapticFeedback([18, 40, 18]);

    pendingDeleteTimersRef.current[node_id] = window.setTimeout(() => {
      void (async () => {
        try {
          await deleteItineraryNode(node_id);
          socketRef.current?.emit("sync_itinerary", {
            trip_id: activeTripId,
            action: "remove_node",
            payload: { node_id } as ItineraryNode,
          });
        } catch {
          addNode(removedNode);
          showToast("刪除失敗，已還原。", "warning");
        } finally {
          delete pendingDeleteTimersRef.current[node_id];
        }
      })();
    }, DELETE_UNDO_WINDOW_MS);

    showToast(`已移除「${removedNode.title}」，可在幾秒內復原。`, "warning", {
      actionLabel: "復原",
      onAction: () => {
        if (pendingDeleteTimersRef.current[node_id]) {
          window.clearTimeout(pendingDeleteTimersRef.current[node_id]);
          delete pendingDeleteTimersRef.current[node_id];
        }
        addNode(removedNode);
        showToast(`已復原「${removedNode.title}」。`, "success");
      },
    });
  };

  const handleUpdateNode = async (node: ItineraryNode) => {
    if (isOffline || !activeTripId) return;
    const previousNode = nodes.find(
      (existingNode: ItineraryNode) => existingNode.node_id === node.node_id,
    );
    if (!previousNode) return;
    const derivedDay = getDayForDate(node.date, tripInfo?.startDate, node.day);
    const fallbackSortOrder =
      derivedDay === node.day && typeof node.sort_order === "number"
        ? node.sort_order
        : Math.max(
            0,
            ...nodes
              .filter(
                (existingNode: ItineraryNode) =>
                  existingNode.day === derivedDay &&
                  existingNode.node_id !== node.node_id,
              )
              .map(
                (existingNode: ItineraryNode) => existingNode.sort_order ?? 0,
              ),
          ) + 1;
    const normalized = withAutoCategoryIcon(
      normalizeScheduleForNode(
        {
          ...node,
          day: derivedDay,
          sort_order: node.sort_order ?? fallbackSortOrder,
        },
        {
          tripStartDate: tripInfo?.startDate,
          fallbackDay: derivedDay,
          fallbackSortOrder,
        },
      ) as ItineraryNode,
    );
    const changes = buildNodePatchChanges(previousNode, normalized);
    if (Object.keys(changes).length === 0) return;
    updateNode(normalized);
    const payload: SyncItineraryPayload = {
      trip_id: activeTripId,
      action: "patch_node",
      payload: {
        node_id: normalized.node_id,
        changes,
      },
    };
    socketRef.current?.emit("sync_itinerary", payload);
    try {
      await syncItinerary(payload);
    } catch {
      updateNode(previousNode);
      showToast("更新行程失敗，已還原。", "warning");
    }
  };

  const handleEditingChange = (
    nodeId: string,
    day: number,
    isEditing: boolean,
  ) => {
    const payload = { trip_id: activeTripId, nodeId, day };
    if (isEditing) {
      socketRef.current?.emit("editing_start", payload);
    } else {
      socketRef.current?.emit("editing_stop", payload);
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
    if (
      !plannerForm.departureFrom ||
      !plannerForm.arrivalTo ||
      !plannerForm.flightDate
    ) {
      showToast("請先填出發地、抵達地與日期再抓航班");
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
      setPlannerField("autoFlightSegments", segments);
      showToast(`已自動抓取 ${segments.length} 筆航班資訊`);
    } catch {
      showToast("目前無法自動抓航班，請稍後再試");
    } finally {
      setFlightsLoading(false);
    }
  };

  const handleAiSuggest = async (modeOverride?: AiGenerateMode) => {
    if (isOffline) {
      showToast("離線中無法使用 AI 功能 📴");
      return;
    }
    if (!activeTripId) {
      showToast("缺少行程 ID，無法生成行程");
      return;
    }
    setAiLoading(true);
    try {
      const destination = tripInfo?.destination || "您的目的地";
      const effectiveMode = modeOverride ?? aiGenerateMode;

      let genDays = plannerForm.days;
      if (effectiveMode === "selected_day") genDays = 1;
      else if (effectiveMode === "generate_for_selected_days")
        genDays = rangeEndDay - rangeStartDay + 1;

      const dietaryStr = (plannerForm.dietary || []).join(",");
      const transportStr = (plannerForm.transport || []).join(",");
      const extraNotes = [
        plannerForm.notes,
        dietaryStr && `飲食: ${dietaryStr}`,
        transportStr && `交通: ${transportStr}`,
      ]
        .filter(Boolean)
        .join(" / ");

      const facts = useTripFactsStore
        .getState()
        .facts.filter((f) => f.tripId === activeTripId);
      const travelFactsContext = facts
        .map((f) => `[ID: ${f.id}] ${f.factType} - ${f.title}`)
        .join("\n");

      const formToSend = {
        ...plannerForm,
        days: genDays,
        notes: extraNotes,
        travelFactsContext,
      };

      const suggestionsRaw = await suggestItineraryWithForm({
        destination,
        planner: formToSend,
      });

      const rootThemeGradient = suggestionsRaw?.ui_state?.theme_gradient || 
                               suggestionsRaw?.ui_config?.bg_gradient || 
                               suggestionsRaw?.theme_gradient || 
                               suggestionsRaw?.bg_gradient;
      if (rootThemeGradient) {
        setLocalThemeGradient(rootThemeGradient);
      }

      let suggestedNodes: ItineraryNode[] = [];
      if (
        suggestionsRaw?.itinerary &&
        Array.isArray(suggestionsRaw.itinerary)
      ) {
        suggestionsRaw.itinerary.forEach((dayData: any) => {
          if (Array.isArray(dayData.spots)) {
            dayData.spots.forEach((spot: any, i: number) => {
              suggestedNodes.push({
                node_id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${dayData.day}_${i}`,
                day: dayData.day || 1,
                time: spot.time || "10:00",
                title: String(spot.name || spot.title || "景點"),
                category: spot.category || "other",
                emoji: getNodeEmoji(spot),
                description: spot.ai_note || "",
                ai_note: spot.ai_note || "",
                intensity: spot.intensity,
                transport_to_next: spot.transport_to_next,
                lat: spot.lat,
                lng: spot.lng,
                image_url: spot.image_url,
                linkedFactId: spot.linkedFactId,
                source: "local" as const,
              });
            });
          }
        });
      } else if (Array.isArray(suggestionsRaw)) {
        suggestionsRaw.forEach((spot: any, i: number) => {
          suggestedNodes.push({
            node_id:
              spot.node_id ||
              `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${spot.day || 1}_${i}`,
            day: spot.day || 1,
            time: spot.time || "10:00",
            title: String(spot.name || spot.title || "景點"),
            category: spot.category || "other",
            emoji: getNodeEmoji(spot),
            description: spot.ai_note || "",
            ai_note: spot.ai_note || "",
            intensity: spot.intensity,
            transport_to_next: spot.transport_to_next,
            lat: spot.lat,
            lng: spot.lng,
            image_url: spot.image_url,
            linkedFactId: spot.linkedFactId,
            source: "local" as const,
          });
        });
      }

      const enrichResults = await Promise.allSettled(
        suggestedNodes.map((n) =>
          n.image_url ? Promise.resolve(null) : fetchSpotEnrichment(n.title),
        ),
      );
      enrichResults.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value?.thumbnail) {
          suggestedNodes[i].image_url = r.value.thumbnail;
        }
      });

      let finalNodes: ItineraryNode[] = [];

      if (effectiveMode === "overwrite_all") {
        await removeNodesBatch([...nodes]);

        let tempNodes = assignDaysBasedOnTimeAndOrder(
          suggestedNodes,
          plannerForm.flightDate,
        );
        const maxGeneratedDay =
          tempNodes.length > 0 ? Math.max(...tempNodes.map((n) => n.day)) : 0;

        if (maxGeneratedDay < genDays) {
          for (let d = maxGeneratedDay + 1; d <= genDays; d++) {
            tempNodes.push({
              node_id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_empty_day_${d}`,
              day: d,
              time: "10:00",
              title: "自由活動",
              emoji: "🏖️",
              category: "activity",
              description:
                "這天尚未安排具體行程，您可以自行填加喜愛的口袋名單景點！",
              ai_note:
                "這天尚未安排具體行程，您可以自行填加喜愛的口袋名單景點！",
              intensity: "chill",
              source: "local",
            } as any);
          }
          tempNodes = assignDaysBasedOnTimeAndOrder(
            tempNodes,
            plannerForm.flightDate,
          );
        }
        finalNodes = tempNodes;
      } else if (effectiveMode === "generate_for_selected_days") {
        const targetDays = Array.from(
          { length: rangeEndDay - rangeStartDay + 1 },
          (_, i) => rangeStartDay + i,
        );
        const currentDaysNodes = nodes.filter((node: ItineraryNode) =>
          targetDays.includes(node.day),
        );
        await removeNodesBatch(currentDaysNodes);

        const offsetNodes = suggestedNodes.map((node, index) => {
          let targetDay = rangeStartDay + (node.day - 1);
          if (targetDay > rangeEndDay) targetDay = rangeEndDay;
          return { ...node, day: targetDay, sort_order: index + 1 };
        });

        const generatedDays = new Set(offsetNodes.map((n) => n.day));
        for (const targetDay of targetDays) {
          if (!generatedDays.has(targetDay)) {
            offsetNodes.push({
              node_id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_empty_day_${targetDay}`,
              day: targetDay,
              time: "10:00",
              title: "自由活動",
              emoji: "🏖️",
              category: "activity",
              description:
                "這天尚未安排具體行程，您可以自行填加喜愛的口袋名單景點！",
              ai_note:
                "這天尚未安排具體行程，您可以自行填加喜愛的口袋名單景點！",
              intensity: "chill",
              source: "local",
              sort_order: 1,
            } as any);
          }
        }

        finalNodes = offsetNodes.map((node) => {
          return normalizeScheduleForNode(
            {
              ...node,
              date: getDateForDay(node.day, plannerForm.flightDate),
            },
            {
              tripStartDate: plannerForm.flightDate,
              fallbackDay: node.day,
              fallbackSortOrder: node.sort_order,
            },
          ) as ItineraryNode;
        });
      } else {
        const currentDayNodes = nodes.filter(
          (node: ItineraryNode) => node.day === safeSelectedDay,
        );
        await removeNodesBatch(currentDayNodes);

        if (suggestedNodes.length === 0) {
          suggestedNodes.push({
            node_id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_empty_day_${selectedDay}`,
            day: selectedDay,
            time: "10:00",
            title: "自由活動",
            emoji: "🏖️",
            category: "activity",
            description:
              "這天尚未安排具體行程，您可以自行填加喜愛的口袋名單景點！",
            ai_note: "這天尚未安排具體行程，您可以自行填加喜愛的口袋名單景點！",
            intensity: "chill",
            source: "local",
          } as any);
        }

        finalNodes = suggestedNodes.map(
          (node, index) =>
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
        const payload: SyncItineraryPayload = {
          trip_id: activeTripId,
          action: "add_node",
          payload: normalized,
        };
        socketRef.current?.emit("sync_itinerary", payload);
        void syncItinerary(payload).catch(() => {
          removeNode(normalized.node_id);
          setTip("部分 AI 行程同步失敗，未儲存項目已還原。");
          setTimeout(() => setTip(""), 2500);
        });
      }

      if (effectiveMode === "overwrite_all") {
        showToast(`✨ 已一鍵覆蓋行程，共 ${finalNodes.length} 個新節點`);
      } else if (effectiveMode === "generate_for_selected_days") {
        showToast(`✨ 已重建 Day ${rangeStartDay} 到 Day ${rangeEndDay}`);
      } else {
        showToast(
          `✨ 已重建 Day ${selectedDay}，共 ${finalNodes.length} 個節點`,
        );
      }
    } catch {
      showToast("AI 規劃失敗，請確認 OpenRouter API Key 是否設定。");
    } finally {
      setAiLoading(false);
    }
  };

  if (!activeTripId) {
    if (isPlanningNew) {
      return (
        <div
          onScroll={onScroll}
          className="flex-1 flex flex-col pt-4 sm:pt-10 bg-transparent min-h-screen-dvh max-h-screen-dvh overflow-y-auto scroll-smooth"
        >
          <div className="max-w-4xl mx-auto w-full px-4 h-full flex flex-col">
            <button
              onClick={() => setIsPlanningNew(false)}
              className="mb-4 sm:mb-8 px-4 py-2.5 rounded-full border border-slate-200 bg-white text-slate-600 font-black text-xs uppercase tracking-wide flex items-center gap-2 hover:border-sky-200 hover:text-sky-700 w-max transition-colors"
            >
              <ArrowLeft size={14} />
              返回旅程入口
            </button>
            <div className="flex-1">
              <AiForm onSubmit={handleAiFormSubmit} />
            </div>
            {/* Mobile bottom nav spacer */}
            <div className="h-28 md:hidden shrink-0" aria-hidden="true" />
          </div>
        </div>
      );
    }

    return (
      <div
        onScroll={onScroll}
        className="flex-1 w-full overflow-y-auto scroll-smooth bg-transparent selection:bg-sky-100"
      >
        <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 mt-4 md:mt-10 font-sans pb-tab-safe animate-in fade-in duration-700">
          <EditorialSectionIntro
            eyebrow="Trip Notebook"
            title="選擇行程專案，集中管理所有行程與協作內容"
            highlights={[
              { label: "旅程主線", value: "日期與節奏" },
              { label: "AI 起草", value: "先有第一版" },
              { label: "旅伴共編", value: "後續一起補完" },
            ]}
            className="mb-6 md:mb-10"
            titleClassName="text-2xl md:text-5xl tracking-tight"
            descriptionClassName="max-w-3xl text-sm font-bold leading-6 sm:text-base sm:leading-7"
          />

          {/* AI Planning Entry Hero */}
          <div className="mb-8 md:mb-16">
            <motion.div
              className={`editorial-card relative overflow-hidden rounded-[32px] sm:rounded-[36px] p-4 sm:p-7 backdrop-blur-xl transition-all duration-300`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(253,186,116,0.16),transparent_42%)]" />
              <div className="relative flex flex-col">
                <div
                  className="flex items-start justify-between cursor-pointer group"
                  onClick={() => setIsAiHeroExpanded(!isAiHeroExpanded)}
                >
                  <EditorialSectionIntro
                    eyebrow="AI Planning Entry"
                    title="讓 AI 起草初步行程，隨時調整細節"
                    description=""
                    highlights={[
                      { label: "起點", value: "目的地與天數" },
                      { label: "中段", value: "調整排序與備註" },
                      { label: "後續", value: "分享給旅伴" },
                    ]}
                    className="mb-0 max-w-3xl flex-1 pr-4 sm:pr-8"
                    titleClassName="text-xl sm:text-3xl md:text-5xl"
                    descriptionClassName={`text-sm sm:text-lg font-bold leading-6 sm:leading-8 transition-opacity duration-300 ${isAiHeroExpanded ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}
                  />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
                    <ChevronDown
                      size={20}
                      className={`transition-transform duration-300 ${isAiHeroExpanded ? "rotate-180" : "rotate-0"}`}
                    />
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isAiHeroExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between pt-6 border-t border-slate-100/50 mt-6 lg:mt-8">
                        <div className="max-w-3xl flex-1">
                          <div className="grid gap-3 sm:grid-cols-3">
                            {NO_TRIP_ENTRY_PILLARS.map(
                              ({ icon: Icon, eyebrow, title, description }) => (
                                <div
                                  key={title}
                                  className="editorial-card rounded-[24px] px-4 py-4"
                                >
                                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-sky-700">
                                    <Icon size={14} strokeWidth={2.5} />
                                    {eyebrow}
                                  </span>
                                  <h3 className="mt-3 text-sm font-black text-slate-900">
                                    {title}
                                  </h3>
                                  <ExpandableText
                                    text={description}
                                    previewLines={2}
                                    minCharacters={60}
                                    className="mt-2"
                                    textClassName="text-pretty text-[13px] leading-[1.62] text-slate-600"
                                    collapsedLabel="展開完整內容"
                                    expandedLabel="收起內容"
                                  />
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-stretch justify-end gap-3 md:min-w-[260px] shrink-0">
                          <div className="editorial-card-soft rounded-[26px] px-4 py-4 text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-700">
                              Planning Flow
                            </p>
                            <p className="mt-2 text-[14px] font-black leading-6 text-slate-800">
                              快速產生行程草稿，再依需求調整細節。
                            </p>
                            <p className="mt-2 text-[12px] font-bold leading-5 text-slate-500">
                              先確立行程骨幹，方便在手機上快速瀏覽與編輯。
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsPlanningNew(true);
                            }}
                            className="flex min-h-12 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-pink-400 to-orange-400 px-5 py-3 text-sm font-black text-white shadow-sm transition-colors hover:from-pink-500 hover:to-orange-500"
                          >
                            <Sparkles size={18} />
                            使用 AI 起草行程
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-4">
              我的行程歷史
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {isTripsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[200px] bg-slate-100 animate-pulse rounded-[32px]"
                />
              ))}
            </div>
          ) : userTrips.length === 0 ? (
            <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-[32px] border border-slate-200/80 bg-white/70 px-5 py-8 text-center shadow-sm backdrop-blur-sm sm:px-6 sm:py-10">
              <div className="mb-4 flex size-16 items-center justify-center rounded-[32px] bg-gradient-to-br from-pink-50 to-rose-50 text-pink-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_12px_rgba(244,63,94,0.1)]">
                <Navigation2 size={28} />
              </div>
              <h3 className="text-balance text-[22px] sm:text-2xl font-black text-slate-900">
                目前還沒有行程
              </h3>
              <p className="mt-2 max-w-md text-pretty text-[13px] sm:text-sm font-bold leading-6 text-slate-500">
                先建立第一份草稿，再隨時補上景點與航班。
              </p>
              <button
                onClick={() => setIsPlanningNew(true)}
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 px-6 py-3 text-[13px] sm:text-sm font-black text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_20px_rgba(244,63,94,0.3)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] hover:-translate-y-1 hover:from-pink-500 hover:to-rose-500 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_28px_rgba(244,63,94,0.4)]"
              >
                <Sparkles size={18} />
                建立第一趟旅程
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTrips.map((trip) => (
                <motion.div
                  key={trip.tripId ?? trip.id}
                  whileHover={prefersReducedMotion ? undefined : { y: -6 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.2,
                    ease: "easeOut",
                  }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest(".delete-trip-btn"))
                      return;
                    setActiveTripId(trip.tripId ?? trip.id);
                  }}
                  className="cursor-pointer group"
                >
                  <div className="!p-0 overflow-hidden rounded-[30px] border border-white/60 sm:border sm:border-white/60 bg-white/70 backdrop-blur-[24px] shadow-[0_12px_40px_-5px_rgba(255,160,200,0.15),inset_0_2px_10px_rgba(255,255,255,1)] hover:shadow-[0_20px_50px_-10px_rgba(255,160,200,0.3)] hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                    <div className="h-40 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                      <img
                        src={getTripCoverImage(trip.destination)}
                        alt={trip.destination}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            DEFAULT_TRIP_IMAGE;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                      <div className="absolute top-4 right-4 z-10">
                        <button
                          title="刪除此專案"
                          aria-label={`刪除行程「${trip.name}」`}
                          className="delete-trip-btn w-8 h-8 bg-white/40 hover:bg-red-500 hover:text-white text-white flex items-center justify-center rounded-full backdrop-blur-md shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (
                              window.confirm(
                                "確定要刪除「" +
                                  trip.name +
                                  "」？這將刪除所有相關資料（包含帳務、清單等）且無法復原。",
                              )
                            ) {
                              try {
                                const ok = await deleteTripApi(
                                  trip.tripId ?? trip.id,
                                );
                                if (ok) {
                                  useAppStore
                                    .getState()
                                    .showToast("行程專案已刪除", "success");
                                  setUserTrips((prev) =>
                                    prev.filter(
                                      (t) =>
                                        (t.tripId ?? t.id) !==
                                        (trip.tripId ?? trip.id),
                                    ),
                                  );
                                } else {
                                  useAppStore
                                    .getState()
                                    .showToast(
                                      "刪除失敗，或您不是該專案擁有者",
                                      "warning",
                                    );
                                }
                              } catch (err) {
                                useAppStore
                                  .getState()
                                  .showToast("刪除發生錯誤", "warning");
                              }
                            }
                          }}
                        >
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                      {(trip.days ?? null) != null && (
                        <div className="absolute bottom-4 left-6">
                          <span className="text-white/80 text-[11px] font-black uppercase tracking-widest px-2 py-1 bg-white/20 backdrop-blur-md rounded-md">
                            {trip.days} DAYS
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-2xl font-black text-slate-800 mb-1 group-hover:text-sky-600 transition-colors uppercase tracking-tight">
                        {trip.name}
                      </h3>
                      <p className="text-slate-500 font-bold text-sm mb-4 flex items-center gap-1">
                        <MapPin size={18} className="shrink-0" />
                        {trip.destination}
                      </p>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-pink-100 border-2 border-white flex items-center justify-center text-[11px] font-black text-pink-600">
                            ME
                          </div>
                        </div>
                        <ArrowRight
                          className="text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all"
                          size={20}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        {/* Mobile bottom nav spacer */}
        <div className="h-28 md:hidden shrink-0" aria-hidden="true" />
      </div>
    );
  }

  const activeGradient = localThemeGradient || 
                         aiResult?.fullResponse?.ui_state?.theme_gradient || 
                         aiResult?.fullResponse?.ui_config?.bg_gradient || 
                         aiResult?.fullResponse?.theme_gradient ||
                         aiResult?.theme_gradient ||
                         aiResult?.bg_gradient || 
                         "from-fuchsia-50 via-pink-50 to-rose-50";

  if (loading) {
    return (
      <main
        onScroll={onScroll}
        className={`flex-1 w-full overflow-y-auto animate-in fade-in duration-500 bg-gradient-to-br ${activeGradient}`}
      >
        <div className="max-w-[1440px] mx-auto w-full px-4 md:px-8 mt-6 pb-tab-safe">
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
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-slate-100 rounded-2xl animate-pulse"
                    />
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
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 h-11 w-24 bg-slate-100 rounded-full animate-pulse"
                  />
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
              {/* Itinerary node skeletons or view skeletons */}
              {viewMode === "map" ? (
                <div className="h-[60vh] sm:h-[70vh] rounded-[32px] bg-slate-200/50 animate-pulse border-4 border-white/40 mt-4 shadow-sm" />
              ) : viewMode === "calendar" ? (
                <div className="h-[60vh] sm:h-[70vh] rounded-[32px] bg-slate-200/50 animate-pulse border border-slate-200 mt-4 shadow-sm" />
              ) : (
                <div className="relative pl-6 flex flex-col gap-8">
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-100" />
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: i * 0.08,
                        duration: 0.35,
                        ease: "easeOut",
                      }}
                    >
                      <ItinerarySkeletonCard />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Mobile bottom nav spacer */}
        <div className="h-28 md:hidden shrink-0" aria-hidden="true" />
      </main>
    );
  }

  return (
    <main
      onScroll={onScroll}
      className={`flex-1 w-full overflow-y-auto selection:bg-sky-100 animate-in fade-in duration-700 scroll-smooth bg-gradient-to-br ${activeGradient}`}
    >
      <div className="max-w-[1440px] mx-auto w-full pb-tab-safe md:px-4 lg:px-8 mt-0 sm:mt-4 md:mt-6">
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
        <div className="relative w-full h-[20vh] sm:h-[30vh] md:h-64 overflow-hidden md:rounded-[40px] mb-4 md:mb-8 print:hidden -mt-4 md:mt-0 shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-10 sm:max-w-[calc(100%-2rem)] sm:mx-auto">
          {tripInfo?.coverImage ? (
            <img
              src={tripInfo.coverImage}
              alt={tripInfo.destination}
              className="w-full h-full object-cover scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#fdfafb] via-[#fdfafb]/30 to-black/60 md:to-black/20" />

          {/* Mobile Header Overlay Info - Adjusted for better immersion */}
          <div className="absolute top-8 left-5 right-5 flex justify-end items-start z-50 lg:hidden">
            <div className="flex gap-2.5">
              <button
                onClick={handleTogglePublicTemplate}
                disabled={isUpdatingPublicState}
                className="px-4 h-11 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white transition-all active:scale-[0.97] shadow-lg text-[11px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                {tripInfo?.isPublic ? "公開中" : "發布"}
              </button>
              <button
                onClick={handleShare}
                aria-label="分享行程"
                className="w-11 h-11 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white transition-all active:scale-[0.97] shadow-lg"
              >
                <Share2 size={18} strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="absolute bottom-8 left-6 right-6 lg:hidden flex flex-col gap-3 z-50">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-800 leading-tight drop-shadow-sm font-serif tracking-tight line-clamp-2 text-balance">
              {tripInfo?.name || tripInfo?.destination}
            </h1>
            <div className="flex items-center gap-2 text-slate-700 font-black text-[11px] uppercase tracking-widest flex-wrap">
              <span className="bg-white/95 backdrop-blur-xl px-3.5 py-1.5 rounded-full shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
                {totalDays} DAYS
              </span>
            </div>
          </div>
        </div>

        {/* Header Section (Desktop) */}
        <div className="px-5 md:px-8 mb-0 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-3 md:gap-6">
          <div className="group w-full md:w-auto">
            <div className="hidden lg:flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={handleBackToTrips}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-[0.97]"
              >
                <ArrowLeft size={12} strokeWidth={3} />
                返回
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-pink-50 hover:bg-pink-100 border border-pink-100 rounded-xl text-[11px] font-black text-pink-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-[0.97]"
              >
                <Share2 size={12} strokeWidth={3} />
                分享
              </button>
              <button
                onClick={handleTogglePublicTemplate}
                disabled={isUpdatingPublicState}
                className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-[0.97] disabled:opacity-60 ${tripInfo?.isPublic ? "bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-600" : "bg-white hover:bg-slate-50 border border-slate-100 text-slate-500"}`}
              >
                <Lock size={12} strokeWidth={3} />
                {tripInfo?.isPublic ? "取消公開" : "分享行程"}
              </button>
              <button
                onClick={handleExportIcs}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-[11px] font-black text-emerald-600 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-[0.97]"
              >
                <Calendar size={12} strokeWidth={3} />
                ICS
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-[0.97] print:hidden"
              >
                <Printer size={14} className="shrink-0" />
                PDF
              </button>
            </div>

            <div className="hidden lg:block mt-8">
              <h1 className="text-5xl lg:text-6xl font-black text-slate-800 mb-4 flex items-center gap-3 font-serif tracking-tight leading-tight">
                <div className="flex items-center gap-2 group/title">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">
                    {tripInfo?.name || tripInfo?.destination || "未命名目的地"}
                  </span>
                  <span className="text-4xl lg:text-5xl group-hover/title:scale-125 transition-transform duration-300">
                    ✨
                  </span>
                </div>
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-slate-500 font-bold text-[14px]">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <Calendar size={16} className="text-pink-500 shrink-0" />
                  <span className="text-slate-700 tracking-tight">
                    {tripInfo?.startDate && tripInfo?.endDate
                      ? `${tripInfo.startDate} - ${tripInfo.endDate} • `
                      : null}
                    <span className="text-pink-600 font-black">
                      {totalDays}
                    </span>{" "}
                    天
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <Users size={16} className="text-indigo-500 shrink-0" />
                  <span className="text-slate-700 tracking-tight">
                    <span className="text-indigo-600 font-black">
                      {collaborators.length}
                    </span>{" "}
                    位旅行者
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm hover:shadow-md transition-shadow ${tripInfo?.isPublic ? "bg-emerald-50/60 border-emerald-100/60" : "bg-white border-slate-100"}`}
                >
                  <Share2
                    size={16}
                    className={
                      tripInfo?.isPublic
                        ? "text-emerald-500 shrink-0"
                        : "text-slate-500 shrink-0"
                    }
                  />
                  <span className="text-slate-700 tracking-tight">
                    {tripInfo?.isPublic ? "公開行程中..." : "目前為私人行程"}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <Bookmark size={16} className="text-amber-500 shrink-0" />
                  <span className="text-slate-700 tracking-tight">
                    <span className="text-amber-600 font-black">
                      {tripInfo?.forkCount ?? 0}
                    </span>{" "}
                    次複製
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center justify-start gap-3 sm:gap-4 flex-nowrap sticky top-2 md:top-4 z-[45] md:relative md:top-0 md:mt-8 px-4 md:px-8 w-full">
            <div className="shrink-0 flex items-center">
              <button
                onClick={handleBackToTrips}
                className="pl-4 pr-5 py-3 md:py-3.5 bg-white/90 backdrop-blur-xl hover:bg-white border-2 border-white rounded-full text-[13px] md:text-sm font-black text-slate-700 transition-all uppercase tracking-widest flex items-center gap-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)] active:scale-[0.97] transition-all whitespace-nowrap"
              >
                <ArrowLeft
                  size={16}
                  strokeWidth={3}
                  className="text-slate-500"
                />
                返回
              </button>
            </div>
            <HorizontalScrollRail
              label="行程檢視模式"
              className="flex-1 min-w-0"
              viewportClassName="w-full mx-0"
              contentClassName="gap-1.5 md:gap-2 rounded-[24px] md:rounded-full border-2 border-white/90 md:border-white bg-white/60 md:bg-white/70 p-1.5 md:p-2 shadow-[0_8px_24px_rgba(244,114,182,0.08)] md:shadow-xl backdrop-blur-xl"
              controlsVisibilityClass="flex"
              buttonClassName="border-white/30 bg-white/20 text-slate-700 hover:text-slate-900 shadow-none hover:bg-white/40 backdrop-blur-sm h-8 w-8 ml-0.5 mr-0.5 flex"
            >
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 md:flex-none px-6 md:px-10 py-3 md:py-3.5 rounded-[18px] md:rounded-full font-black text-[13px] md:text-sm tracking-widest uppercase transition-all whitespace-nowrap ${viewMode === "list" ? "bg-slate-800 text-white shadow-md scale-[0.98] md:scale-100 border border-slate-800" : "text-slate-500 hover:text-slate-700 hover:bg-white/80 border border-transparent"}`}
              >
                行程列表
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex-1 md:flex-none px-6 md:px-10 py-3 md:py-3.5 rounded-[18px] md:rounded-full font-black text-[13px] md:text-sm tracking-widest uppercase transition-all whitespace-nowrap ${viewMode === "map" ? "bg-slate-800 text-white shadow-md scale-[0.98] md:scale-100 border border-slate-800" : "text-slate-500 hover:text-slate-700 hover:bg-white/80 border border-transparent"}`}
              >
                景點地圖
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex-1 md:flex-none px-6 md:px-10 py-3 md:py-3.5 rounded-[18px] md:rounded-full font-black text-[13px] md:text-sm tracking-widest uppercase transition-all whitespace-nowrap ${viewMode === "calendar" ? "bg-slate-800 text-white shadow-md scale-[0.98] md:scale-100 border border-slate-800" : "text-slate-500 hover:text-slate-700 hover:bg-white/80 border border-transparent"}`}
              >
                日程
              </button>
            </HorizontalScrollRail>
          </div>
        </div>

        <div className="px-4 md:px-8 grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Left Column: Filters & Info */}
          <aside className="hidden lg:flex lg:col-span-1 flex-col gap-6 sticky top-24 h-fit max-h-sidebar-dvh overflow-y-auto pr-2 no-scrollbar">
            <GlassCard className="!p-6 shadow-xl shadow-slate-200/40 ring-1 ring-white/60 bg-white/70 backdrop-blur-3xl overflow-hidden rounded-[32px] border border-white">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <h3 className="font-black text-[11px] xl:text-[11px] uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <span>旅程天數</span> <span className="text-sm">📅</span>
                </h3>
                <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
                  <Settings2 size={14} />
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 xl:gap-3 relative z-10 w-full overflow-hidden">
                {paginatedDaysArray.map(
                  (day) => {
                    const isActive = safeSelectedDay === day;
                    const count = nodes.filter(
                      (n: ItineraryNode) => n.day === day,
                    ).length;
                    const dateStr =
                      getDateForDay(day, tripInfo?.startDate) || "";
                    const displayDate = dateStr
                      ? new Date(dateStr).toLocaleDateString("zh-TW", {
                          month: "short",
                          day: "numeric",
                        })
                      : "";

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`relative px-1 py-3 xl:px-2 xl:py-3.5 rounded-[14px] font-black text-xs xl:text-sm transition-colors flex flex-col items-center justify-center gap-1 border min-w-0 ${
                          isActive
                            ? "text-pink-600 border-pink-200/50 shadow-sm"
                            : "bg-white/60 text-slate-500 border-white hover:bg-white hover:text-pink-400"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="desktop_day_indicator"
                            className="absolute inset-0 bg-pink-50 rounded-[14px] shadow-inner"
                            transition={SPRING_SMOOTH}
                            style={{ zIndex: 0 }}
                          />
                        )}
                        <span className="flex items-center gap-1 relative z-10 transition-colors">
                          <span className="truncate">DAY {day}</span>
                          {loadingDay === day && (
                            <Loader2
                              size={12}
                              className="animate-spin shrink-0 text-pink-500"
                            />
                          )}
                        </span>
                        {displayDate && (
                          <span className="text-[9px] xl:text-[11px] opacity-70 tracking-tighter truncate w-full text-center px-1 relative z-10 transition-colors">
                            {displayDate}
                          </span>
                        )}
                        <span className="text-[9px] xl:text-[11px] font-bold opacity-60 uppercase tracking-tighter truncate relative z-10 transition-colors">
                          {count}{" "}
                          <span className="hidden xl:inline">SPOTS</span>
                          <span className="inline xl:hidden">站</span>
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
              {totalDays > actualDaysLimit && (
                <button
                  onClick={() => setVisibleDaysLimit((l) => l + 14)}
                  className="w-full mt-4 py-2 border-2 border-dashed border-slate-200 rounded-2xl text-xs font-black tracking-widest text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors uppercase"
                >
                  展開更多天數...
                </button>
              )}
            </GlassCard>

            {/* Collaborators with presence */}
            <GlassCard className="!p-4 xl:!p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4 xl:mb-5 flex-wrap gap-2">
                <span className="font-black text-[11px] xl:text-xs uppercase tracking-[0.2em] text-slate-500">
                  目前在線
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 shrink-0">
                  <div className="w-1 h-1 xl:w-1.5 xl:h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[8px] xl:text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                    LIVE
                  </span>
                </div>
              </div>
              <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-3 pl-1 xl:pl-3">
                {collaborators.map((c: Collaborator, i: number) => (
                  <CollaboratorAvatar
                    key={c.id}
                    collaborator={c}
                    index={i}
                    isOnline={true}
                  />
                ))}
              </div>
            </GlassCard>

            {/* Favorites List - Desktop */}
            <GlassCard className="!p-6">
              <button
                onClick={() => setIsFavoritesCollapsed(!isFavoritesCollapsed)}
                className="flex items-center justify-between w-full text-left focus:outline-none group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-800 transition-colors">
                    口袋名單 ({favorites.length})
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                      isFavoritesCollapsed ? "-rotate-90" : ""
                    }`}
                  />
                </div>
                {!isFavoritesCollapsed && (
                  <span className="text-[11px] font-bold text-pink-400 opacity-90 group-hover:opacity-100 transition-opacity">
                    拖曳或點擊 + 加入
                  </span>
                )}
              </button>

              <AnimatePresence initial={false}>
                {!isFavoritesCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-3 mt-5 max-h-[300px] overflow-y-auto no-scrollbar pr-1 -mr-1">
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
                            aria-label="選擇圖示"
                            className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center active:scale-[0.97] transition-all"
                          >
                            <IconImg value={newSpotEmoji} size={20} />
                          </button>
                          <input
                            value={newSpotTitle}
                            onChange={(e) => setNewSpotTitle(e.target.value)}
                            placeholder="快速收藏..."
                            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-pink-200 transition-all"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                void handleAddFavorite();
                              }
                            }}
                          />
                          <button
                            onClick={() => void handleAddFavorite()}
                            disabled={addingFavorite || !newSpotTitle.trim()}
                            aria-label="新增收藏"
                            className="w-10 h-10 shrink-0 rounded-xl bg-slate-800 text-white flex items-center justify-center disabled:opacity-30 active:scale-[0.97] transition-all"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        {showEmojiPicker && (
                          <div className="flex flex-wrap gap-1.5 mt-3 p-2 bg-white rounded-xl border border-slate-100 shadow-xl overflow-y-auto max-h-[120px] no-scrollbar">
                            {EMOJI_OPTIONS.map((em) => (
                              <button
                                key={em}
                                onClick={() => {
                                  setNewSpotEmoji(em);
                                  setShowEmojiPicker(false);
                                }}
                                className="w-8 h-8 flex items-center justify-center hover:bg-pink-50 rounded-lg transition-all"
                              >
                                <IconImg value={em} size={20} />
                              </button>
                            ))}
                          </div>
                        )}
                        {addingFavorite && (
                          <p className="text-[11px] font-bold text-pink-500 mt-2 animate-pulse uppercase tracking-widest text-center">
                            GEOCODING...
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>

            {/* New Trip Button */}
            <button
              onClick={() => setIsPlanningNew(true)}
              className="w-full py-5 rounded-[28px] bg-white text-slate-700 font-bold text-sm shadow-sm border border-slate-100 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-[0.97]"
            >
              <Plus size={20} className="text-pink-400" />
              重新規劃旅程
            </button>
          </aside>

          {/* Right Column: Content */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            {/* Memory Album — Trip Recap Banner */}
            {tripInfo?.endDate && new Date(tripInfo.endDate) < new Date() && (
              <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-fuchsia-50 via-pink-50 to-rose-50 border border-pink-100 p-6 print:hidden">
                <div className="absolute top-3 right-4 text-4xl opacity-20 select-none">
                  📸
                </div>
                <p className="text-[11px] font-black text-fuchsia-500 uppercase tracking-widest mb-1">
                  旅程回顧
                </p>
                <h3 className="font-black text-slate-800 text-xl mb-3">
                  {tripInfo.name} · 旅行記憶
                </h3>
                <div className="flex flex-wrap gap-2">
                  {nodes
                    .filter((n: ItineraryNode) => n.title)
                    .slice(0, 12)
                    .map((n: ItineraryNode) => (
                      <span
                        key={n.node_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 rounded-full text-[12px] font-bold text-slate-700 border border-pink-100 shadow-sm"
                      >
                        <IconImg value={getNodeEmoji(n)} size={14} />
                        <span className="line-clamp-1 max-w-[100px]">
                          {n.title}
                        </span>
                      </span>
                    ))}
                </div>
                {nodes.length > 12 && (
                  <p className="text-[11px] text-slate-500 mt-2">
                    還有 {nodes.length - 12} 個旅遊景點...
                  </p>
                )}
              </div>
            )}

            {/* Mobile Day Selector — Cuter segmented toggle style */}
            <div className="lg:hidden mb-2 md:mb-5 overflow-hidden -mx-1 -mt-3">
              <HorizontalScrollRail
                label="Day 切換"
                viewportClassName="py-2 px-1"
                contentClassName="inline-flex min-w-max gap-1.5 rounded-full border-2 border-white/80 bg-white/50 backdrop-blur-xl p-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-slate-800/90"
                controlsVisibilityClass="flex"
              >
                {paginatedDaysArray.map(
                  (day) => {
                    const isActive = safeSelectedDay === day;
                    const dateStr =
                      getDateForDay(day, tripInfo?.startDate) || "";
                    const displayDate = dateStr
                      ? new Date(dateStr).toLocaleDateString("zh-TW", {
                          month: "short",
                          day: "numeric",
                        })
                      : "";

                    return (
                      <motion.button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        whileTap={{ scale: 0.96 }}
                        className={`relative flex items-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-2 rounded-full font-black text-[13px] sm:text-sm tracking-tight transition-all shrink-0 snap-center min-w-[72px] sm:min-w-[80px] justify-center ${
                          isActive
                            ? "text-white shadow-[0_8px_16px_rgba(244,114,182,0.25)]"
                            : "text-slate-500 hover:text-slate-700 hover:bg-white/80"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="mobile_day_indicator"
                            className="absolute inset-0 bg-gradient-to-br from-pink-400 via-rose-400 to-rose-400 rounded-full"
                            transition={SPRING_SMOOTH}
                            style={{ zIndex: -1 }}
                          />
                        )}
                        <span
                          className={`drop-shadow-sm transition-colors z-10 ${isActive ? "text-white font-black" : ""}`}
                        >
                          第 {day} 天
                        </span>
                        {displayDate && (
                          <span
                            className={`text-[10px] sm:text-[11px] font-bold hidden sm:inline z-10 transition-colors ${isActive ? "text-pink-50" : "text-slate-400"}`}
                          >
                            {displayDate}
                          </span>
                        )}
                        {loadingDay === day && (
                          <Loader2
                            size={12}
                            className={`animate-spin ml-0.5 z-10 transition-colors ${isActive ? "text-white" : "text-slate-400"}`}
                          />
                        )}
                      </motion.button>
                    );
                  },
                )}
                {totalDays > actualDaysLimit && (
                  <motion.button
                    onClick={() => setVisibleDaysLimit((l) => l + 14)}
                    whileTap={{ scale: 0.96 }}
                    className="relative flex items-center justify-center px-4 py-2.5 sm:py-2 rounded-full font-black text-[13px] sm:text-sm text-slate-400 hover:text-slate-600 bg-white/40 hover:bg-white border border-dashed border-slate-300 transition-all shrink-0 snap-center"
                  >
                    + 載入更多
                  </motion.button>
                )}
              </HorizontalScrollRail>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative pl-6 mt-4 flex flex-col gap-6"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: i * 0.1,
                        duration: 0.4,
                        ease: "easeOut",
                      }}
                    >
                      <ItinerarySkeletonCard />
                    </motion.div>
                  ))}
                </motion.div>
              ) : viewMode === "list" ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col gap-6"
                >
                  {Object.values(nodeEditingLocks).some(
                    (lock) => lock.day === safeSelectedDay,
                  ) && (
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-fuchsia-50 border border-fuchsia-100 text-fuchsia-700 font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <Lock size={18} />
                      <span>
                        {Object.values(nodeEditingLocks)
                          .filter((lock) => lock.day === safeSelectedDay)
                          .slice(0, 2)
                          .map((lock) => lock.userName)
                          .join("、")}
                        正在編輯第 {safeSelectedDay} 天的景點
                      </span>
                    </div>
                  )}

                  {/* AI Assistant Quick Trigger */}
                  {nodes.length > 0 && (
                    <div className="group relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400 rounded-[32px] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-1000" />
                      <GlassCard className="!p-6 !rounded-[32px] border border-white/80 shadow-xl overflow-hidden">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-pink-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-pink-200">
                              <Sparkles size={28} />
                            </div>
                            <div>
                              <h3 className="font-black text-xl text-slate-800 leading-tight">
                                需要微調第 {safeSelectedDay} 天嗎？
                              </h3>
                              <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wider">
                                AI 行程規劃助手
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowPlanner(!showPlanner)}
                            className={`w-full sm:w-auto px-10 py-4 rounded-full font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-3 ${showPlanner ? "bg-slate-100 text-slate-500" : "bg-slate-800 text-white hover:bg-slate-900 shadow-xl shadow-slate-200 active:scale-[0.97]"}`}
                          >
                            {showPlanner ? "收起助理" : "召喚 AI"}
                            {showPlanner ? (
                              <X size={18} />
                            ) : (
                              <ArrowRight size={18} />
                            )}
                          </button>
                        </div>

                        <AnimatePresence>
                          {showPlanner && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-10 flex flex-col gap-6">
                                <div className="h-px bg-slate-100 w-full" />
                                <div className="flex flex-col gap-3">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 mb-1">
                                    您的具體需求或對 AI 的指令
                                  </label>
                                  <textarea
                                    placeholder="例如：幫我把下午行程安排得更輕鬆一點，或是推薦三間必吃的拉麵店插入到晚上..."
                                    value={plannerForm.notes}
                                    onChange={(e) =>
                                      setPlannerField("notes", e.target.value)
                                    }
                                    className="w-full bg-white/50 border border-slate-100 rounded-3xl px-6 py-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 transition-all min-h-[140px] shadow-inner text-base resize-none"
                                  />
                                </div>

                                {/* Travel Preferences */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* 旅伴 */}
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                      旅伴
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                      {[
                                        "獨行俠",
                                        "情侶蜜遊",
                                        "親子同遊",
                                        "好友出遊",
                                        "銀髮樂齡",
                                      ].map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() =>
                                            setPlannerField(
                                              "companions",
                                              plannerForm.companions === opt
                                                ? ""
                                                : opt,
                                            )
                                          }
                                          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${plannerForm.companions === opt ? "bg-pink-100 text-pink-600 border-pink-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  {/* 預算 */}
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                      預算
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                      {[
                                        "窮遊背包客",
                                        "小資精打細算",
                                        "舒適中等",
                                        "奢華享受",
                                      ].map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() =>
                                            setPlannerField(
                                              "budget",
                                              plannerForm.budget === opt
                                                ? ""
                                                : opt,
                                            )
                                          }
                                          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${plannerForm.budget === opt ? "bg-pink-100 text-pink-600 border-pink-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* 旅遊節奏 */}
                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    旅遊節奏
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      "特種兵式",
                                      "睡到自然醒",
                                      "隨興漫遊",
                                      "在地深度",
                                      "網美打卡",
                                    ].map((opt) => {
                                      const vibes = plannerForm.vibes || [];
                                      const selected = vibes.includes(opt);
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() =>
                                            setPlannerField(
                                              "vibes",
                                              selected
                                                ? vibes.filter(
                                                    (v: string) => v !== opt,
                                                  )
                                                : [...vibes, opt],
                                            )
                                          }
                                          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selected ? "bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 興趣偏好 */}
                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    興趣偏好
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      "大自然",
                                      "歷史文化",
                                      "購物血拼",
                                      "主題樂園",
                                      "在地美食",
                                      "戶外刺激",
                                    ].map((opt) => {
                                      const interests =
                                        plannerForm.interests || [];
                                      const selected = interests.includes(opt);
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() =>
                                            setPlannerField(
                                              "interests",
                                              selected
                                                ? interests.filter(
                                                    (v: string) => v !== opt,
                                                  )
                                                : [...interests, opt],
                                            )
                                          }
                                          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selected ? "bg-indigo-100 text-indigo-600 border-indigo-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 飲食需求 */}
                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    飲食需求
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      "無限制",
                                      "純素",
                                      "蛋奶素",
                                      "無麩質",
                                      "不吃海鮮",
                                    ].map((opt) => {
                                      const dietary = plannerForm.dietary || [];
                                      const selected = dietary.includes(opt);
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() =>
                                            setPlannerField(
                                              "dietary",
                                              selected
                                                ? dietary.filter(
                                                    (v: string) => v !== opt,
                                                  )
                                                : [...dietary, opt],
                                            )
                                          }
                                          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selected ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 交通偏好 */}
                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    交通偏好
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      "大眾運輸",
                                      "自駕租車",
                                      "包車",
                                      "徒步為主",
                                    ].map((opt) => {
                                      const transport =
                                        plannerForm.transport || [];
                                      const selected = transport.includes(opt);
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() =>
                                            setPlannerField(
                                              "transport",
                                              selected
                                                ? transport.filter(
                                                    (v: string) => v !== opt,
                                                  )
                                                : [...transport, opt],
                                            )
                                          }
                                          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selected ? "bg-teal-100 text-teal-600 border-teal-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 行程步調 */}
                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    行程步調
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {["緊湊特種兵", "適中", "悠閒慢活"].map(
                                      (opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() =>
                                            setPlannerField(
                                              "pace",
                                              plannerForm.pace === opt
                                                ? ""
                                                : opt,
                                            )
                                          }
                                          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${plannerForm.pace === opt ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                        >
                                          {opt}
                                        </button>
                                      ),
                                    )}
                                  </div>
                                </div>

                                {/* 住宿偏好 */}
                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    住宿偏好
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      "青旅",
                                      "商務旅館",
                                      "星級飯店",
                                      "特色民宿",
                                      "包棟/Villa",
                                    ].map((opt) => {
                                      const accommodation =
                                        plannerForm.accommodation || [];
                                      const selected =
                                        accommodation.includes(opt);
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() =>
                                            setPlannerField(
                                              "accommodation",
                                              selected
                                                ? accommodation.filter(
                                                    (v: string) => v !== opt,
                                                  )
                                                : [...accommodation, opt],
                                            )
                                          }
                                          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selected ? "bg-indigo-100 text-indigo-600 border-indigo-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                  <button
                                    onClick={() =>
                                      setAiGenerateMode("selected_day")
                                    }
                                    className={`flex-1 py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-widest transition-all border ${aiGenerateMode === "selected_day" ? "bg-pink-100 text-pink-600 border-pink-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                  >
                                    重建 Day {safeSelectedDay}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAiGenerateMode(
                                        "generate_for_selected_days",
                                      );
                                      setRangeStartDay(selectedDay);
                                      setRangeEndDay(
                                        Math.min(totalDays, selectedDay + 1),
                                      );
                                    }}
                                    className={`flex-1 py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-widest transition-all border ${aiGenerateMode === "generate_for_selected_days" ? "bg-pink-100 text-pink-600 border-pink-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                  >
                                    指定天數區間
                                  </button>
                                  <button
                                    onClick={() =>
                                      setAiGenerateMode("overwrite_all")
                                    }
                                    className={`flex-1 py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-widest transition-all border ${aiGenerateMode === "overwrite_all" ? "bg-pink-100 text-pink-600 border-pink-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                  >
                                    全局重新規劃
                                  </button>
                                </div>

                                {aiGenerateMode ===
                                  "generate_for_selected_days" && (
                                  <div className="flex gap-4 items-center justify-center bg-white/50 py-3 px-4 rounded-[22px] border border-slate-100 shadow-inner my-2">
                                    <span className="font-bold text-xs text-slate-600">
                                      產生範圍：Day{" "}
                                    </span>
                                    <select
                                      value={rangeStartDay}
                                      onChange={(e) =>
                                        setRangeStartDay(Number(e.target.value))
                                      }
                                      className="bg-white border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-700 focus:ring-2 focus:ring-pink-200 shadow-sm"
                                    >
                                      {Array.from(
                                        { length: totalDays },
                                        (_, i) => (
                                          <option key={i + 1} value={i + 1}>
                                            {i + 1}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                    <span className="text-slate-500 font-bold px-1">
                                      至
                                    </span>
                                    <select
                                      value={rangeEndDay}
                                      onChange={(e) =>
                                        setRangeEndDay(Number(e.target.value))
                                      }
                                      className="bg-white border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-700 focus:ring-2 focus:ring-pink-200 shadow-sm"
                                    >
                                      {Array.from(
                                        { length: totalDays },
                                        (_, i) => (
                                          <option key={i + 1} value={i + 1}>
                                            {i + 1}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </div>
                                )}

                                <button
                                  onClick={() => void handleAutoFetchFlights()}
                                  disabled={flightsLoading || aiLoading}
                                  className="w-full py-3 rounded-full bg-slate-50 border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-all hover:bg-slate-100"
                                >
                                  {flightsLoading ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Plane size={16} />
                                  )}
                                  自動抓取航班做為 AI 規劃參考
                                </button>

                                <button
                                  onClick={() => void handleAiSuggest()}
                                  disabled={aiLoading}
                                  className="w-full py-5 px-4 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-600 to-indigo-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-pink-200/50 flex flex-nowrap items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.97] transition-all whitespace-nowrap overflow-hidden text-ellipsis"
                                >
                                  <span className="shrink-0">
                                    {aiLoading ? (
                                      <Loader2 className="animate-spin" />
                                    ) : (
                                      <Sparkles size={20} />
                                    )}
                                  </span>
                                  <span className="truncate">
                                    {aiLoading
                                      ? "AI 分析處理中..."
                                      : "開始智慧微調行程"}
                                  </span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </GlassCard>
                    </div>
                  )}

                  <ItineraryList
                    items={selectedDayNodes.slice(0, visibleNodeLimit)}
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
                    onAskAiForDay={() => void handleAiSuggest("selected_day")}
                    onRandomizeFromFavorites={() =>
                      handleFillDayFromFavorites(safeSelectedDay)
                    }
                    isOffline={isOffline}
                    aiLoading={aiLoading}
                    isDayLoading={loadingDay === safeSelectedDay}
                    tripId={activeTripId}
                    destination={tripInfo?.destination || ""}
                    tripStartDate={tripInfo?.startDate}
                    weather={weatherData}
                    recentlySyncedNodeIds={recentlySyncedNodeIds}
                    onEditingChange={handleEditingChange}
                    nodeEditingLocks={nodeEditingLocks}
                    onPreviewImage={setPreviewImageUrl}
                  />

                  {selectedDayNodes.length > visibleNodeLimit && (
                    <div className="flex justify-center mt-6 mb-8 relative z-10 w-full pl-[22px] sm:pl-10 lg:pl-12">
                      <button
                        onClick={() => setVisibleNodeLimit((l) => l + 20)}
                        className="py-3 px-8 rounded-full border-2 border-dashed border-slate-300 text-sm font-black tracking-widest text-slate-500 hover:text-slate-700 hover:border-slate-400 hover:bg-white/50 transition-all uppercase"
                      >
                        展開更多景點...
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : viewMode === "map" ? (
                <motion.div
                  key="map"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                  className="w-full"
                >
                  <Suspense
                    fallback={
                      <GlassCard className="h-[55vh] flex items-center justify-center border-4 border-white/40 !rounded-[2.5rem]">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className="h-10 w-10 rounded-full border-4 border-fuchsia-200 border-t-fuchsia-500 animate-spin" />
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-fuchsia-500">
                              Map Chunk
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-500">
                              正在載入地圖體驗...
                            </p>
                          </div>
                        </div>
                      </GlassCard>
                    }
                  >
                    <div className="relative h-full w-full rounded-[2.5rem]">
                      {(aiLoading || loadingDay === safeSelectedDay) && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-md rounded-[2.5rem] transition-all duration-300">
                          <div className="bg-white/80 backdrop-blur-xl px-10 py-8 rounded-[32px] shadow-2xl flex flex-col items-center gap-5 border border-white/60">
                            <div className="relative">
                              <div className="absolute inset-0 bg-pink-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                              <Loader2
                                className="animate-spin text-pink-500 relative z-10"
                                size={36}
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-black tracking-widest text-slate-800 uppercase">
                                {aiLoading
                                  ? "AI 正在分析景點"
                                  : "正在載入地圖資料"}
                              </p>
                              <p className="text-xs font-bold text-slate-500 mt-1">
                                請稍候片刻
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <ItineraryMapView
                        items={selectedDayNodes}
                        allNodes={nodes}
                      />
                    </div>
                  </Suspense>
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
                  <CalendarView
                    nodes={nodes}
                    tripStartDate={tripInfo?.startDate ?? undefined}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {tip ? (
          <span className="fixed bottom-28 left-0 right-0 w-full text-center text-xs font-black text-slate-500 pointer-events-none animate-pulse">
            {tip}
          </span>
        ) : null}

        {/* Floating Action Buttons (Mobile Only) */}
        <div className="md:hidden fixed bottom-24 right-5 flex flex-col gap-4 z-50">
          {!loading && favorites.length > 0 && (
            <button
              aria-label={`口袋名單 (${favorites.length} 個景點)`}
              onClick={() => setShowMobileFavorites(true)}
              className="p-1 rounded-full bg-white/30 backdrop-blur-xl border border-white/60 shadow-2xl active:scale-[0.97] transition-all group overflow-hidden shadow-fuchsia-200/50 relative"
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
            aria-label="AI 行程規劃"
            onClick={() => setIsPlanningNew(true)}
            className="p-1 rounded-full bg-white/30 backdrop-blur-xl border border-white/60 text-white shadow-2xl active:scale-[0.97] transition-all group overflow-hidden shadow-pink-200/50"
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
                transition={overlayTransition}
                onClick={() => setShowMobileFavorites(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-sheet lg:hidden"
              />
              <motion.div
                initial={sheetMotion.initial}
                animate={sheetMotion.animate}
                exit={sheetMotion.exit}
                transition={sheetMotion.transition}
                className="fixed bottom-0 left-0 right-0 w-full max-h-[85vh] bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] z-sheet-above flex flex-col lg:hidden"
              >
                <div className="shrink-0 p-6 pb-2 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur-xl rounded-t-3xl sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-500 shadow-sm border border-fuchsia-100/50">
                      <Bookmark size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-slate-800 tracking-tight">
                        口袋名單
                      </h3>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                        Saved Spots
                      </p>
                    </div>
                  </div>
                  <button
                    aria-label="關閉口袋名單"
                    onClick={() => setShowMobileFavorites(false)}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Mobile Quick Add Row */}
                {!isOffline && (
                  <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-col gap-2.5">
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        aria-label="選擇圖示"
                        className="w-10 h-10 shrink-0 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center active:scale-[0.97] transition-all text-xl shadow-sm"
                      >
                        <IconImg value={newSpotEmoji} size={20} />
                      </button>
                      <input
                        value={newSpotTitle}
                        onChange={(e) => setNewSpotTitle(e.target.value)}
                        placeholder="新增口袋收藏，例如：一蘭拉麵..."
                        className="flex-1 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-fuchsia-200 transition-all shadow-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            void handleAddFavorite();
                          }
                        }}
                      />
                      <button
                        onClick={() => void handleAddFavorite()}
                        disabled={addingFavorite || !newSpotTitle.trim()}
                        className="w-10 h-10 shrink-0 rounded-xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 active:scale-[0.97] transition-all shadow-sm"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    {showEmojiPicker && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-150 shadow-md overflow-y-auto max-h-[88px] no-scrollbar">
                        {EMOJI_OPTIONS.map((em) => (
                          <button
                            key={em}
                            onClick={() => {
                              setNewSpotEmoji(em);
                              setShowEmojiPicker(false);
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-pink-50 rounded-lg transition-all text-base"
                          >
                            <IconImg value={em} size={18} />
                          </button>
                        ))}
                      </div>
                    )}

                    {addingFavorite && (
                      <p className="text-[10px] font-black text-fuchsia-500 animate-pulse uppercase tracking-[0.15em] text-center">
                        🎯 GEOCODING SPOT LOCATION...
                      </p>
                    )}
                  </div>
                )}

                <div className="p-6 overflow-y-auto w-full no-scrollbar overscroll-contain flex-1">
                  <div className="flex flex-col gap-4">
                    {favorites.map((spot: FavoriteSpot) => (
                      <DraggableFavoriteSpot
                        key={spot.id}
                        spot={spot}
                        selectedDay={safeSelectedDay}
                        isOffline={isOffline}
                        onAdd={(node, day) => {
                          addSpotToDay(node, day);
                          setShowMobileFavorites(false);
                        }}
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
            destination={tripInfo?.destination || ""}
            node={expenseTargetNode}
            members={collaborators
              .map((member: Collaborator) => member.name)
              .filter(Boolean)}
            onClose={() => setExpenseTargetNode(null)}
          />
        )}

        <AnimatePresence>
          {previewImageUrl && (
            <ImagePreviewModal
              imageUrl={previewImageUrl}
              onClose={() => setPreviewImageUrl(null)}
            />
          )}
        </AnimatePresence>

        {/* Mobile bottom nav spacer */}
        <div className="h-28 md:hidden shrink-0" aria-hidden="true" />
      </div>
    </main>
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
  key?: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0, x: -20 }}
      animate={{ scale: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative -ml-3 first:ml-0 group`}
      style={{ zIndex: 10 + index }}
    >
      <div
        className={`w-12 h-12 rounded-full border-[3px] border-white shadow-xl overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 relative ${isOnline ? "ring-2 ring-emerald-400 ring-offset-2" : ""}`}
      >
        <div className="w-full h-full bg-pink-50 flex items-center justify-center text-xl">
          {(collaborator.avatar?.length ?? 0) > 2 ? (
            <img
              src={collaborator.avatar}
              alt={collaborator.name ?? "協作者"}
              className="w-full h-full object-cover"
            />
          ) : (
            (collaborator.avatar ?? "👤")
          )}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800/90 backdrop-blur-md text-white text-[11px] font-black rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-widest shadow-xl">
        {collaborator.name}
      </div>
      {isOnline && (
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-[3px] border-white shadow-sm animate-pulse" />
      )}
    </motion.div>
  );
}

// ─── Constants & Helpers ────────────────────────────────────────────────────────

const getCategoryStyle = (category: string) => {
  switch (category) {
    case "food":
    case "restaurant":
      return "border-orange-200/80 bg-gradient-to-br from-white/95 via-orange-50/90 to-amber-50/90";
    case "landmark":
    case "attraction":
      return "border-sky-200/80 bg-gradient-to-br from-white/95 via-sky-50/92 to-blue-50/90";
    case "activity":
      return "border-emerald-200/80 bg-gradient-to-br from-white/95 via-emerald-50/92 to-teal-50/88";
    case "shopping":
      return "border-purple-200/80 bg-gradient-to-br from-white/95 via-purple-50/92 to-fuchsia-50/88";
    case "hotel":
    case "accommodation":
      return "border-indigo-200/80 bg-gradient-to-br from-white/95 via-indigo-50/92 to-slate-100/92";
    case "transport":
    case "flight":
      return "border-indigo-200/80 bg-gradient-to-br from-white/95 via-indigo-50/92 to-slate-100/92";
    default:
      return "border-slate-200/80 bg-white/88";
  }
};

function splitRouteLabel(value?: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  for (const separator of ["→", "->", "➜", "➡", "⇢"]) {
    if (!normalized.includes(separator)) continue;
    const [from, to] = normalized
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);
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
  const from = String(metadata.depCode || "").trim();
  const to = String(metadata.arrCode || linkedFact?.locationName || "").trim();
  const parsed =
    splitRouteLabel(item.title) ||
    splitRouteLabel(item.description) ||
    splitRouteLabel(item.notes);

  return {
    from: from || parsed?.from || "出發地",
    to: to || parsed?.to || "目的地",
    flightNumber: String(
      metadata.flightNumber ||
        metadata.airline ||
        metadata.provider ||
        "BOARDING PASS",
    ).trim(),
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
  const [enrichment, setEnrichment] = useState<{
    description?: string;
    wiki_url?: string;
    thumbnail?: string;
  }>({});

  useEffect(() => {
    let cancelled = false;
    fetchSpotEnrichment(spot.title).then((data) => {
      if (!cancelled) setEnrichment(data);
    });
    return () => {
      cancelled = true;
    };
  }, [spot.title]);

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      draggable={!isOffline}
      onDragStart={(event: any) => {
        if (isOffline) return;
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", spot.id);
        triggerHapticFeedback([14]);
        onDragStart?.(spot);
      }}
      onDragEnd={() => {
        triggerHapticFeedback([10, 32, 12]);
        onDragEnd?.();
      }}
      className="group relative flex flex-col gap-2 p-3 bg-white/40 backdrop-blur-xl border border-white/60 sm:border sm:border-white/60 rounded-[20px] shadow-sm hover:shadow-xl transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-white flex items-center justify-center text-xl shadow-sm border border-slate-100/50 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
            {enrichment.thumbnail ? (
              <img
                src={enrichment.thumbnail}
                alt={spot.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <IconImg value={spot.emoji} size={20} />
            )}
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-[13px] leading-tight">
              {spot.title}
            </h4>
            <p className="text-[11px] font-black text-slate-500 mt-0.5 uppercase tracking-[0.1em]">
              口袋名單
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAdd(spot, selectedDay)}
            disabled={isOffline}
            className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg active:scale-[0.97] transition-all hover:bg-slate-900"
            title="加入今天"
            aria-label={`將 ${spot.title} 加入 Day ${selectedDay}`}
          >
            <Plus size={16} strokeWidth={3} />
          </button>
          <button
            onClick={() => onDelete(spot.id)}
            aria-label={`刪除收藏「${spot.title}」`}
            className="w-8 h-8 rounded-full bg-white/50 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {enrichment.description && (
        <div className="flex flex-col gap-1 pl-12">
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
            {enrichment.description}
          </p>
          {enrichment.wiki_url && (
            <a
              href={enrichment.wiki_url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-fuchsia-500 hover:underline"
            >
              維基百科 →
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}

function extractMinutes(text: string): number {
  if (!text) return 0;
  let totalMinutes = 0;
  const hrMatch = text.match(/(\d+)\s*(h|hr|小時|時)/i);
  if (hrMatch) totalMinutes += parseInt(hrMatch[1], 10) * 60;
  const minMatch = text.match(/(\d+)\s*(m|min|分鐘|分)/i);
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
  return totalMinutes;
}

function TransportGapIndicator({
  item,
  nextItem,
  timeGapMinutes,
  timeGapStr,
}: {
  item: ItineraryNode;
  nextItem: ItineraryNode;
  timeGapMinutes: number;
  timeGapStr: string;
}) {
  const [apiDuration, setApiDuration] = useState<number | null>(null);

  const km =
    item.lat && item.lng && nextItem.lat && nextItem.lng
      ? haversineKm(item.lat, item.lng, nextItem.lat, nextItem.lng)
      : 0;

  useEffect(() => {
    if (
      km > 2 &&
      km <= 300 &&
      !item.transport_to_next &&
      item.lng &&
      item.lat &&
      nextItem.lng &&
      nextItem.lat
    ) {
      fetchDirections(item.lng, item.lat, nextItem.lng, nextItem.lat).then(
        (duration) => {
          if (duration) setApiDuration(duration);
        },
      );
    } else {
      setApiDuration(null);
    }
  }, [
    km,
    item.transport_to_next,
    item.lat,
    item.lng,
    nextItem.lat,
    nextItem.lng,
  ]);

  const autoTransport =
    !item.transport_to_next && km > 0 ? estimateTransport(km) : null;

  const displayTransport = (() => {
    if (item.transport_to_next) {
      return {
        emoji: "🚇",
        label: item.transport_to_next,
        minutes: extractMinutes(item.transport_to_next),
        isApi: false,
        isFlight: false,
      };
    }
    if (autoTransport) {
      if (apiDuration && km > 2 && !autoTransport.isFlight) {
        return {
          emoji: "🚗",
          label: `預計車程 ${formatMinutes(apiDuration)}`,
          minutes: apiDuration,
          isApi: true,
          isFlight: false,
        };
      }
      return { ...autoTransport, isApi: false };
    }
    return null;
  })();

  const hasTransitConflict = Boolean(
    displayTransport &&
    timeGapMinutes > 0 &&
    displayTransport.minutes > timeGapMinutes,
  );
  const isTooLong = Boolean(displayTransport && displayTransport.minutes > 90 && !displayTransport.isFlight);
  const hasWarning = hasTransitConflict || isTooLong;
  const showBadge = timeGapStr || displayTransport;

  return showBadge ? (
    <div className="flex justify-start sm:pl-[70px] pl-[50px] lg:pl-[80px] my-2 relative z-0">
      <div className="w-[3px] min-h-[2rem] sm:min-h-[2.5rem] bg-gradient-to-b from-slate-200 to-slate-200" />
      <div className="flex flex-col justify-center ml-4 sm:ml-5 -mt-2 sm:-mt-1">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {timeGapStr && (
            <span className="px-3.5 py-1.5 bg-white rounded-full text-[11px] sm:text-xs font-black text-slate-500 uppercase tracking-widest border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-1.5 transition-transform hover:scale-105">
              <Clock size={12} className="text-slate-500" />約 {timeGapStr}
            </span>
          )}
          {displayTransport && (
            <span
              className={`px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest border shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-1.5 transition-transform hover:scale-105 ${hasWarning ? "bg-amber-50/90 text-amber-600 border-amber-100" : displayTransport.isApi ? "bg-sky-50 text-sky-600 border-sky-100 shadow-[0_0_10px_-2px_rgba(14,165,233,0.2)]" : "bg-indigo-50/90 text-indigo-500 border-indigo-100"}`}
            >
              <span>{displayTransport.emoji}</span>
              {displayTransport.label}
              {displayTransport.isApi && !hasWarning && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              )}
              {displayTransport.isApi && hasWarning && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </span>
          )}
          {hasTransitConflict && (
            <span className="px-3.5 py-1.5 bg-amber-50/90 rounded-full text-[11px] sm:text-xs font-black text-amber-600 uppercase tracking-widest border border-amber-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
              <span>⚠️</span>
              行程太緊湊
            </span>
          )}
          {isTooLong && !hasTransitConflict && (
            <span className="px-3.5 py-1.5 bg-rose-50/90 rounded-full text-[11px] sm:text-xs font-black text-rose-500 uppercase tracking-widest border border-rose-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
              <span>🚨</span>
              交通時間過長
            </span>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className="flex justify-start sm:pl-[70px] pl-[50px] lg:pl-[80px] my-1 relative z-0">
      <div className="w-[3px] h-8 sm:h-10 bg-gradient-to-b from-slate-200 to-slate-200" />
    </div>
  );
}

// ─── Itinerary List ───────────────────────────────────────────────────────────

const ItineraryListItem = React.memo(
  function ItineraryListItemBase({
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
    collaboratingLock,
    onPreviewImage,
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
    onPreviewImage?: (url: string) => void;
    key?: string;
  }) {
    const [isEditing, setIsEditing] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [isTitleExpanded, setIsTitleExpanded] = useState(false);
    const [editTitle, setEditTitle] = useState(item.title);
    const [editDate, setEditDate] = useState(
      item.date || getDateForDay(item.day, tripStartDate) || "",
    );
    const [editTime, setEditTime] = useState(item.time);
    const [editEmoji, setEditEmoji] = useState(getNodeEmoji(item));
    const [editDescription, setEditDescription] = useState(
      item.description || item.notes || "",
    );
    const [editTransport, setEditTransport] = useState(
      item.transport_to_next || "",
    );
    const [editImageUrl, setEditImageUrl] = useState(item.image_url || "");
    const [editAttachments, setEditAttachments] = useState<
      ItineraryAttachment[]
    >(item.attachments || []);
    const [editLinkedFactId, setEditLinkedFactId] = useState(
      item.linkedFactId || "",
    );
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const facts = useTripFactsStore((s) => s.facts);
    const linkedFact = item.linkedFactId
      ? facts.find((fact) => fact.id === item.linkedFactId)
      : undefined;
    const linkedFactRedirect = getTravelFactRedirectPayload(linkedFact);
    const linkedFactBookingLabel = getTravelFactBookingLabel(linkedFact);
    const detailCopy = item.description || item.notes || "";
    const isFlightCard = item.category === "flight";
    const isHotelCard =
      item.category === "hotel" || item.category === "accommodation";
    const isAnchorCard = isFlightCard || isHotelCard;
    const flightRoute = isFlightCard
      ? getFlightRouteSummary(item, linkedFact)
      : null;

    useEffect(() => {
      setEditTitle(item.title);
      setEditDate(item.date || getDateForDay(item.day, tripStartDate) || "");
      setEditTime(item.time);
      setEditEmoji(getNodeEmoji(item));
      setEditDescription(item.description || item.notes || "");
      setEditTransport(item.transport_to_next || "");
      setEditImageUrl(item.image_url || "");
      setEditAttachments(item.attachments || []);
      setEditLinkedFactId(item.linkedFactId || "");
      setIsTitleExpanded(false);
    }, [item, tripStartDate]);

    const handleAttachmentUpload = async (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      const uploaded = await Promise.all(
        files.map(async (file) => ({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type || "application/octet-stream",
          url: await readFileAsDataUrl(file),
        })),
      );

      setEditAttachments((prev) => [...prev, ...uploaded]);
      event.target.value = "";
    };

    const removeAttachment = (attachmentId: string) => {
      setEditAttachments((prev) =>
        prev.filter((attachment) => attachment.id !== attachmentId),
      );
    };

    useEffect(() => {
      if (collaboratingLock && isEditing) {
        setIsEditing(false);
        useAppStore
          .getState()
          .showToast(
            `${collaboratingLock.userName} 取得了編輯權限。`,
            "warning",
          );
      }
    }, [collaboratingLock, isEditing]);

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
        timestamp:
          buildTimestampFromDateTime(editDate, normalizeClockInput(editTime)) ??
          item.timestamp,
      });
      setIsEditing(false);
      onEditingChange?.(
        item.node_id,
        getDayForDate(editDate, tripStartDate, item.day),
        false,
      );
    };

    const openEditor = () => {
      if (collaboratingLock && !isEditing) {
        useAppStore
          .getState()
          .showToast(
            `${collaboratingLock.userName} 正在編輯這個景點。`,
            "warning",
          );
        return;
      }
      if (!isOffline && !isEditing) {
        setIsEditing(true);
        onEditingChange?.(item.node_id, item.day, true);
      }
    };

    const [isNavigating, setIsNavigating] = useState(false);

    const handleNavigate = async (e: React.MouseEvent) => {
      e.stopPropagation();
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
        useAppStore.getState().showToast("無法取得景點座標", "warning");
        return;
      }

      const destinationCoords = encodeURIComponent(`${lat},${lng}`);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationCoords}`;
      triggerHapticFeedback([18]);
      window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleShareToIGStory = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (collaboratingLock) return;

      const shortDest = destination ? destination.split(",")[0].trim() : "旅行";
      const safeTitle = item.title.trim().replace(/\s+/g, "");
      const tags = `#${shortDest} #${safeTitle} #旅遊日記`;
      const text = `剛踩點了 ${item.title}！🤩\n${item.image_url ? `\n查看美照：\n${item.image_url}\n` : ""}\n${tags}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `${item.title} - ${shortDest}`,
            text: text,
          });
        } catch (err) {
          console.error("Share failed:", err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          useAppStore
            .getState()
            .showToast?.(
              "分享文案已複製到剪貼簿，可直接貼上字體到 Instagram！",
              "success",
            );
        } catch (err) {
          useAppStore.getState().showToast?.("不支援分享且複製失敗", "warning");
        }
      }
    };

    const handleRegenerate = async () => {
      if (!tripId || !destination) return;
      setRegenerating(true);
      try {
        const travelFactsContext = facts
          .map((fact) => `[ID: ${fact.id}] ${fact.factType} - ${fact.title}`)
          .join("\n");
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

        let finalImageUrl = restNode.image_url;
        if (!finalImageUrl && restNode.title) {
          try {
            const enrich = await fetchSpotEnrichment(restNode.title);
            if (enrich?.thumbnail) finalImageUrl = enrich.thumbnail;
          } catch (e) {}
        }

        onUpdate({
          ...item,
          ...restNode,
          image_url: finalImageUrl,
          time: restNode.time || item.time,
          date: item.date,
          day: item.day,
          sort_order: item.sort_order,
          ai_note: ai_note || undefined,
          intensity: intensity || undefined,
          description: ai_note || restNode.description,
          timestamp:
            buildTimestampFromDateTime(item.date, restNode.time || item.time) ??
            item.timestamp,
        });

        useAppStore.getState().showToast?.(`✨ 已為您替換為 "${restNode.title || '新景點'}"！`, "success");
      } catch (err) {
        console.error("Regenerate failed:", err);
        useAppStore.getState().showToast?.("AI 替換景點失敗，請確認網路連線或 OpenRouter 金鑰設定。", "warning");
      } finally {
        setRegenerating(false);
      }
    };

    const meta = getCategoryMeta(item.category);

    return (
      <div className="relative flex items-stretch group w-full pl-[22px] sm:pl-10 lg:pl-12">
        {/* Timeline Thread */}
        <div className="absolute left-[10px] sm:left-4 lg:left-5 top-0 bottom-0 w-[4px] bg-gradient-to-b from-pink-100/70 via-fuchsia-100/50 to-transparent rounded-full group-last:bottom-auto group-last:h-12" />
        <div
          className={`absolute left-[5px] sm:left-2 lg:left-3 top-6 sm:top-7 w-[14px] h-[14px] sm:w-[18px] sm:h-[18px] lg:w-[20px] lg:h-[20px] rounded-full border-2 sm:border-[3px] lg:border-4 border-white shadow-sm z-20 transition-all duration-500 group-hover:scale-125 ${item.linkedFactId ? "bg-sky-400 ring-2 ring-sky-200 ring-offset-1 shadow-[0_0_8px_rgba(14,165,233,0.5)]" : "bg-pink-300 group-hover:bg-fuchsia-400"}`}
        />

        {/* Content Card */}
        {collaboratingLock && (
          <div className="absolute -inset-1 rounded-[40px] bg-gradient-to-r from-fuchsia-400 to-purple-400 opacity-20 blur-md z-0 animate-pulse pointer-events-none" />
        )}
        <div
          onClick={(e) => {
            if (
              !isOffline &&
              !collaboratingLock &&
              (e.target as HTMLElement).tagName !== "INPUT" &&
              (e.target as HTMLElement).tagName !== "BUTTON" &&
              (e.target as HTMLElement).tagName !== "A"
            ) {
              openEditor();
            }
          }}
          className={`flex-1 p-4 sm:p-5 rounded-[32px] sm:rounded-[40px] cursor-pointer transition-[transform,shadow,background,colors] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] hover:scale-[1.01] relative z-10 w-full transform-gpu ${collaboratingLock ? "ring-2 ring-fuchsia-400/60 scale-[0.98]" : ""} ${isRecentlySynced ? "ring-2 ring-emerald-300/80 shadow-[0_0_12px_rgba(16,185,129,0.2)]" : ""} ${item.linkedFactId ? "ring-2 ring-sky-300/40 border-sky-200/50" : ""} ${isFlightCard ? "bg-slate-900/95 backdrop-blur-2xl text-white border border-slate-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)]" : isHotelCard ? "bg-gradient-to-br from-indigo-900/95 to-indigo-800/95 backdrop-blur-2xl text-indigo-50 border border-indigo-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(49,46,129,0.25)] hover:shadow-[0_12px_30px_rgba(49,46,129,0.35)]" : "bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_24px_rgba(15,23,42,0.05),0_2px_8px_rgba(15,23,42,0.02)] hover:border-sky-100 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_34px_rgba(15,23,42,0.08),0_4px_12px_rgba(14,165,233,0.08)]"}`}
        >
          {item.linkedFactId && (
            <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-sky-500 text-white shadow-sm ring-2 ring-white z-20">
              <Link size={10} strokeWidth={3} />
            </div>
          )}
          <div className="flex flex-col gap-2 sm:gap-3 w-full">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {isFlightCard ? "Transit" : isHotelCard ? "Stay" : "Day Note"}
                </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full inline-block ${item.source === "remote" ? "bg-emerald-500" : "bg-amber-500"}`}
                  />
                  
              </div>
            </div>
            <div className="flex flex-row items-start gap-2 sm:gap-2.5">
              <div
                className={`relative w-6 h-6 sm:w-8 sm:h-8 mt-0.5 shrink-0 rounded-[10px] sm:rounded-[12px] flex items-center justify-center text-sm sm:text-base shadow-inner border border-slate-100/50 transition-all group-hover:scale-105 group-hover:rotate-3 duration-700 ${item.category === "flight" ? "bg-gradient-to-br from-indigo-50 to-blue-50" : "bg-white/95"}`}
              >
                <span className="filter drop-shadow-sm select-none transition-transform group-hover:scale-110">
                  <IconImg value={getNodeEmoji(item)} size={16} />
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {isFlightCard && flightRoute && (
                  <div className="mb-1.5 w-full">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Departure
                        </div>
                        <div className="truncate text-lg font-black leading-none sm:text-xl">
                          {flightRoute.from}
                        </div>
                      </div>
                      <div className="flex-1 min-w-[72px] px-2">
                        <div className="flex items-center gap-2 text-slate-500">
                          <div className="h-px flex-1 border-t border-dashed border-slate-600" />
                          <Plane
                            size={14}
                            className="shrink-0 text-fuchsia-400"
                          />
                          <div className="h-px flex-1 border-t border-dashed border-slate-600" />
                        </div>
                        <div className="mt-1 text-center text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 truncate">
                          {flightRoute.flightNumber}
                        </div>
                      </div>
                      <div className="min-w-0 text-right">
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Arrival
                        </div>
                        <div className="truncate text-lg font-black leading-none sm:text-xl">
                          {flightRoute.to}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isHotelCard && (
                  <div className="mb-1.5 w-full">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-400">
                          Tonight's Stay
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTitleExpanded(!isTitleExpanded);
                          }}
                          className={`text-lg font-black leading-tight sm:text-xl cursor-pointer hover:text-indigo-300 transition-colors ${
                            isTitleExpanded ? "line-clamp-none whitespace-normal" : "truncate"
                          }`}
                        >
                          {item.title}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-100">
                        休息錨點
                      </span>
                    </div>
                  </div>
                )}
                {!isAnchorCard && (
                  <h3
                    title={item.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTitleExpanded(!isTitleExpanded);
                    }}
                    className={`mb-0.5 text-[15px] font-black leading-[1.28] tracking-[-0.025em] text-slate-900 font-sans sm:text-[16px] cursor-pointer hover:text-sky-600 transition-colors ${
                      isTitleExpanded ? "line-clamp-none" : "line-clamp-2 sm:line-clamp-3"
                    }`}
                  >
                    {item.title}
                  </h3>
                )}
                {isAnchorCard && (
                  <p
                    className={`mb-1 text-[11px] sm:text-xs font-black uppercase tracking-[0.18em] ${isFlightCard ? "text-slate-500" : "text-indigo-400/80"}`}
                  >
                    {isFlightCard ? "跨區交通錨點" : "今晚住宿錨點"}
                  </p>
                )}

                <div
                  className={`mt-1.5 flex flex-wrap items-center gap-1.5 rounded-[18px] px-2.5 py-2 ${isFlightCard || isHotelCard ? "bg-white/6" : "bg-slate-50/80 border border-slate-100 shadow-inner"}`}
                >
                  <div className="relative">
                    <div className="relative flex">
                      <div
                        className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-black tracking-widest flex items-center gap-0.5 transition-colors border ${isFlightCard ? "bg-slate-700 hover:bg-slate-600 border-slate-600 text-white" : isHotelCard ? "bg-indigo-800 hover:bg-indigo-700 border-indigo-700 text-white" : "bg-slate-800 hover:bg-slate-700 text-white border-slate-900"} relative z-0`}
                      >
                        <Clock size={11} className="sm:w-[13px] sm:h-[13px]" />
                        {item.time || "設定時間"}
                      </div>
                      {!isOffline && !collaboratingLock && (
                        <input
                          type="time"
                          value={item.time || ""}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const val = e.target.value;
                            onUpdate({
                              ...item,
                              time: val,
                              timestamp:
                                buildTimestampFromDateTime(item.date, val) ??
                                item.timestamp,
                            });
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 block"
                        />
                      )}
                    </div>
                  </div>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-pink-50 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] text-pink-700 border border-pink-100/70">
                    {meta.label}
                  </span>
                  
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
                  {item.title.includes("Cebu") && (
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-50 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] text-rose-600 border border-rose-100 flex items-center gap-0.5">
                      📌 必去景點
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={
                      item.is_visited ? "標記為未打卡" : "標記為已打卡"
                    }
                    onClick={() =>
                      onUpdate({ ...item, is_visited: !item.is_visited })
                    }
                    className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-[0.15em] transition-all border ${item.is_visited ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                  >
                    {item.is_visited ? (
                      <CheckCircle2 size={13} className="text-emerald-500" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
                    )}
                    {item.is_visited ? "已打卡" : "未打卡"}
                  </button>
                  {item.category === "flight" && (
                    <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] text-indigo-500 flex items-center gap-1 animate-pulse">
                      <div className="w-1 h-1 rounded-full bg-indigo-500" />
                      CONFIRMED
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-200/70 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <button
                  type="button"
                  aria-label={`導航至 ${item.title}`}
                  title={`導航至 ${item.title}`}
                  onClick={handleNavigate}
                  disabled={isNavigating}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 hover:bg-sky-100 hover:shadow-md transition-[transform,shadow,background-color] active:scale-[0.97] disabled:opacity-50"
                >
                  {isNavigating ? (
                    <Loader2
                      size={14}
                      className="animate-spin sm:w-4 sm:h-4 w-3.5 h-3.5"
                    />
                  ) : (
                    <span className="text-sm sm:text-lg">🧭</span>
                  )}
                </button>

                {!isOffline && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (collaboratingLock) return;
                        openEditor();
                      }}
                      disabled={Boolean(collaboratingLock)}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-slate-300 hover:shadow-md transition-[transform,shadow,background-color] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                      title="編輯此節點"
                      aria-label="編輯此節點"
                    >
                      <Pencil
                        size={14}
                        strokeWidth={2.75}
                        className="sm:w-4 sm:h-4 w-3.5 h-3.5"
                      />
                    </button>
                    {onQuickExpense && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (collaboratingLock) return;
                          onQuickExpense(item);
                        }}
                        disabled={Boolean(collaboratingLock)}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 hover:shadow-md transition-[transform,shadow,background-color] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                        title="快速記一筆"
                        aria-label="快速記一筆"
                      >
                        <span className="text-sm sm:text-lg">💸</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (collaboratingLock) return;
                        void handleRegenerate();
                      }}
                      disabled={Boolean(collaboratingLock) || regenerating}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white border border-fuchsia-200 flex items-center justify-center text-fuchsia-700 hover:bg-fuchsia-50 hover:shadow-md transition-[transform,shadow,background-color] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                      title="AI 換一個建議"
                      aria-label="AI 換一個建議"
                    >
                      {regenerating ? (
                        <Loader2
                          size={14}
                          className="animate-spin sm:w-4 sm:h-4 w-3.5 h-3.5"
                        />
                      ) : (
                        <RefreshCw
                          size={14}
                          strokeWidth={2.75}
                          className="sm:w-4 sm:h-4 w-3.5 h-3.5"
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleShareToIGStory}
                      disabled={Boolean(collaboratingLock)}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-pink-50 border border-orange-200 flex items-center justify-center text-pink-600 hover:opacity-80 hover:shadow-md transition-[transform,shadow,background-color] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                      title="分享至 IG Story"
                      aria-label="分享至 IG Story"
                    >
                      <Instagram
                        size={14}
                        strokeWidth={2.75}
                        className="sm:w-4 sm:h-4 w-3.5 h-3.5"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (collaboratingLock) return;
                        onDelete(item.node_id);
                      }}
                      disabled={Boolean(collaboratingLock)}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 hover:bg-rose-100 hover:shadow-md transition-[transform,shadow,background-color] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                      title="刪除此節點"
                      aria-label="刪除此節點"
                    >
                      <Trash2
                        size={14}
                        strokeWidth={2.75}
                        className="sm:w-4 sm:h-4 w-3.5 h-3.5"
                      />
                    </button>
                  </>
                )}
              </div>

              {item.image_url && (
                <button
                  type="button"
                  aria-label={`放大查看 ${item.title} 圖片`}
                  className="p-0 w-full h-20 sm:h-28 md:h-36 mb-2 sm:mb-2.5 rounded-[12px] sm:rounded-[16px] overflow-hidden shadow-md bg-slate-100 group/img relative cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewImage && onPreviewImage(item.image_url!);
                  }}
                >
                  <img
                    src={item.image_url}
                    alt={item.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).onerror = null;
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                    }}
                    className="w-full h-full object-cover rounded-[12px] sm:rounded-[16px] group-hover:scale-105 transition-transform duration-1000 transform-gpu"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <ZoomIn
                      className="text-white drop-shadow-md"
                      size={32}
                      strokeWidth={1.5}
                    />
                  </div>
                </button>
              )}

              {item.attachments && item.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 sm:mb-2.5">
                  {item.attachments.map((attachment) => {
                    const isImage = attachment.type.startsWith("image/");
                    return (
                      <button
                        key={attachment.id}
                        type="button"
                        onClick={() =>
                          window.open(
                            attachment.url,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className={`rounded-[14px] border border-slate-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all ${isImage ? "p-1" : "px-3 py-2 text-left"}`}
                      >
                        {isImage ? (
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-[10px]"
                          />
                        ) : (
                          <span className="text-[11px] font-black text-slate-700 whitespace-nowrap">
                            📄 {attachment.name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {item.transport_to_next && (
                <div className="inline-flex items-center gap-1 mb-2 sm:mb-2.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-800 text-[11px] sm:text-xs font-black text-white uppercase tracking-widest shadow-sm shadow-slate-200">
                  <Navigation2
                    size={10}
                    strokeWidth={3}
                    className="text-indigo-400"
                  />
                  <span className="opacity-60 mr-1">MOVE:</span>
                  {item.transport_to_next}
                </div>
              )}

              {detailCopy ? (
                <CollapsibleNotes text={detailCopy} label="NOTES" />
              ) : (
                <div className="editorial-card-soft mt-2 rounded-[20px] px-3.5 py-3">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Notes
                  </p>
                  <p className="text-[12px] font-bold text-slate-500 italic opacity-80 transition-opacity leading-5">
                    點擊卡片編輯行程細節或備註...
                  </p>
                </div>
              )}

              {/* Wikipedia Preview */}
              {["landmark", "nature", "activity"].includes(
                item.category || "",
              ) && <WikiPreviewCard query={item.title} />}

              {item.title.includes("Cebu") && (
                <div className="mt-3 p-3 rounded-xl bg-orange-50/60 border border-orange-100/80 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-orange-700 uppercase">
                    <MapPin size={12} />
                    Cebu 必去景點
                  </div>
                  <div className="text-[12px] font-bold text-slate-700 leading-relaxed pl-1">
                    1. 麥哲倫十字架 Magellan's Cross
                    <br />
                    2. 聖嬰大教堂 Basilica Minore del Santo Niño
                    <br />
                    3. 宿霧道觀 Cebu Taoist Temple
                    <br />
                    4. 莉亞神殿 Temple of Leah
                    <br />
                    5. 聖佩德羅堡 Fort San Pedro
                  </div>
                </div>
              )}

              {linkedFact && (
                <div className="mt-2 p-2 rounded-xl bg-sky-50/50 border border-sky-100 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-500">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-sky-700 uppercase tracking-widest">
                    <Link size={10} />
                    <span>ASSOCIATED TRAVEL FACT</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-700">
                    {linkedFact.title}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {linkedFact.factType.includes("flight") && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Plane size={10} className="text-slate-500" />
                        <span>
                          {linkedFact.metadata?.flightNumber || "FLIGHT"}
                        </span>
                      </div>
                    )}
                    {linkedFact.metadata?.address && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <MapPin size={10} className="text-slate-500" />
                        <span
                          title={String(linkedFact.metadata?.address)}
                          className="max-w-[210px] break-words"
                        >
                          {linkedFact.metadata?.address}
                        </span>
                      </div>
                    )}
                    {linkedFact.startAt && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Clock size={10} className="text-slate-500" />
                        <span>{linkedFact.startAt}</span>
                      </div>
                    )}
                  </div>
                  {linkedFactRedirect && linkedFactBookingLabel && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        useAppStore
                          .getState()
                          .openRedirectModal(linkedFactRedirect);
                      }}
                      className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-sky-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:shadow-md"
                    >
                      <ExternalLink size={11} strokeWidth={3} />
                      <span>{linkedFactBookingLabel}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {!isOffline && (
              <div className="hidden">
                {/* Elements moved into the card footer */}
              </div>
            )}
          </div>
        </div>

        {isEditing &&
          createPortal(
            <AnimatePresence>
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                  onClick={() => {
                    setIsEditing(false);
                    onEditingChange?.(item.node_id, item.day, false);
                  }}
                />
                {/* Modal Content */}
                <motion.div
                  layoutId={`modal-${item.node_id}`}
                  className="relative w-[calc(100vw-2rem)] md:w-full min-w-[300px] sm:min-w-[480px] max-w-lg max-h-[85vh] overflow-y-auto hide-scrollbar bg-white/95 backdrop-blur-3xl rounded-[32px] sm:rounded-[36px] shadow-2xl border border-white/50 flex flex-col pointer-events-auto"
                >
                  {/* Header */}
                  <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-xl border-b border-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                      <div className="relative">
                        <button
                          type="button"
                          aria-label="選擇景點表情"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="w-10 h-10 flex items-center justify-center bg-white shadow-sm border border-slate-100 hover:bg-pink-50 rounded-[12px] transition-colors"
                        >
                          <IconImg value={editEmoji} size={20} />
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute top-12 left-0 p-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white flex flex-wrap gap-2 w-48 animate-in zoom-in-95 duration-200">
                            {EMOJI_OPTIONS.map((e) => (
                              <button
                                key={e}
                                type="button"
                                title={`使用 ${e}`}
                                onClick={() => {
                                  setEditEmoji(e);
                                  setShowEmojiPicker(false);
                                }}
                                className="w-10 h-10 flex items-center justify-center hover:bg-pink-50 rounded-[8px] transition-colors"
                              >
                                <IconImg value={e} size={24} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      編輯行程節點
                    </h2>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        onEditingChange?.(item.node_id, item.day, false);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100/80 hover:text-rose-500 text-slate-400 hover:bg-rose-50 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Body (Form) */}
                  <div className="p-4 sm:p-6 pb-6 sm:pb-8 w-full flex-shrink-0 min-w-0">
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                          地點名稱 (Place)
                        </label>
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="修改地點名稱"
                          className="w-full text-lg font-black text-slate-900 bg-white/85 border border-slate-200 rounded-2xl px-5 py-2.5 outline-none focus:ring-4 focus:ring-pink-100 transition-all font-sans"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                            日期 (Date)
                          </label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full text-sm font-black text-slate-700 bg-white/85 border border-slate-200 rounded-2xl px-4 py-2 outline-none focus:ring-4 focus:ring-pink-100 transition-all text-left flex items-center justify-between"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                            時間 (Time)
                          </label>
                          <input
                            type="time"
                            inputMode="numeric"
                            step={300}
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="w-full text-sm font-black text-slate-700 bg-white/85 border border-slate-200 rounded-2xl px-4 py-2 outline-none focus:ring-4 focus:ring-pink-100 transition-all text-left flex items-center justify-between"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                          詳細說明 / 備註 (Description)
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="補充行程細節、提醒或預約資訊..."
                          rows={5}
                          className="w-full text-sm font-bold text-slate-700 bg-white/85 border border-slate-200 rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-pink-100 transition-all min-h-[140px] resize-y"
                        />
                      </div>
                      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            附件 / 票券
                          </label>
                          <label className="px-3 py-2 rounded-full bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors">
                            上傳圖片或 PDF
                            <input
                              type="file"
                              accept="image/*,.pdf,application/pdf"
                              multiple
                              className="hidden"
                              onChange={handleAttachmentUpload}
                            />
                          </label>
                        </div>
                        {editAttachments.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {editAttachments.map((attachment) => {
                              const isImage =
                                attachment.type.startsWith("image/");
                              return (
                                <div
                                  key={attachment.id}
                                  className="relative group/attachment rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      window.open(
                                        attachment.url,
                                        "_blank",
                                        "noopener,noreferrer",
                                      )
                                    }
                                    className={`flex items-center gap-2 ${isImage ? "p-1" : "px-3 py-2"} text-left`}
                                  >
                                    {isImage ? (
                                      <img
                                        src={attachment.url}
                                        alt={attachment.name}
                                        className="w-20 h-20 object-cover rounded-[12px]"
                                      />
                                    ) : (
                                      <span className="text-xs font-black text-slate-700">
                                        📄 {attachment.name}
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`移除附件 ${attachment.name}`}
                                    title={`移除附件 ${attachment.name}`}
                                    onClick={() =>
                                      removeAttachment(attachment.id)
                                    }
                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-slate-500 hover:text-rose-500 shadow-sm opacity-0 group-hover/attachment:opacity-100 transition-opacity"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-slate-500">
                            可放電子票、QR code 截圖或 PDF 憑證。
                          </p>
                        )}
                      </div>
                      {facts && facts.length > 0 && (
                        <select
                          value={editLinkedFactId}
                          onChange={(e) => setEditLinkedFactId(e.target.value)}
                          className="text-sm font-bold text-slate-700 bg-white/85 border border-slate-200 rounded-2xl px-4 py-2 outline-none focus:ring-4 focus:ring-pink-100 transition-all"
                        >
                          <option value="">無關聯 Travel Fact (未選擇)</option>
                          {facts.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.title} ({f.factType})
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={handleSave}
                          className="px-6 py-2 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 text-white text-[11px] font-black uppercase tracking-widest shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_12px_rgba(244,63,94,0.3)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_20px_rgba(244,63,94,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97]"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(false);
                            onEditingChange?.(item.node_id, item.day, false);
                          }}
                          className="px-6 py-2 rounded-full bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-200 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97]"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </AnimatePresence>,
            document.body,
          )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.item === next.item &&
      prev.collaboratingLock === next.collaboratingLock &&
      prev.isRecentlySynced === next.isRecentlySynced
    );
  },
);

const ReorderableItineraryItem = ({
  item,
  idx,
  items,
  nextItem,
  timeGapMinutes,
  timeGapStr,
  onDelete,
  onUpdate,
  onQuickExpense,
  isOffline,
  tripId,
  destination,
  tripStartDate,
  recentlySyncedNodeIds,
  onEditingChange,
  nodeEditingLocks,
  onPreviewImage,
}: {
  item: ItineraryNode;
  idx: number;
  items: ItineraryNode[];
  nextItem?: ItineraryNode;
  timeGapMinutes: number;
  timeGapStr: string;
  onDelete: (node_id: string) => void;
  onUpdate: (node: ItineraryNode) => void;
  onQuickExpense?: (node: ItineraryNode) => void;
  isOffline: boolean;
  tripId: string;
  destination: string;
  tripStartDate?: string | null;
  recentlySyncedNodeIds?: string[];
  onEditingChange?: (nodeId: string, day: number, isEditing: boolean) => void;
  nodeEditingLocks?: Record<string, { userName: string; day: number }>;
  onPreviewImage?: (url: string) => void;
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragControls={dragControls}
      dragListener={false}
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: -30 }}
      transition={{
        type: "spring",
        ...SPRING_BOUNCY,
        duration: 0.5,
        delay: idx * 0.05,
      }}
      onDragStart={() => triggerHapticFeedback([14])}
      onDragEnd={() => triggerHapticFeedback([10, 32, 12])}
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
        onPreviewImage={onPreviewImage}
      />

      {/* Drag handle for mobile/explicit drag */}
      <div
        className="absolute left-[-24px] sm:left-[-35px] top-1/2 -translate-y-1/2 opacity-70 sm:opacity-0 group-hover/reorder:opacity-100 transition-opacity p-2 sm:p-2 cursor-grab active:cursor-grabbing text-slate-500/80 hover:text-slate-600 z-20 md:touch-none touch-pan-x"
        style={{
          minHeight: "44px",
          minWidth: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onPointerDown={(event) => {
          dragControls.start(event);
        }}
      >
        <GripVertical size={20} className="sm:w-[20px] sm:h-[20px]" />
      </div>

      {nextItem && (
        <TransportGapIndicator
          item={item}
          nextItem={nextItem}
          timeGapMinutes={timeGapMinutes}
          timeGapStr={timeGapStr}
        />
      )}
    </Reorder.Item>
  );
};

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
  isDayLoading,
  tripId,
  destination,
  tripStartDate,
  weather,
  recentlySyncedNodeIds,
  onEditingChange,
  nodeEditingLocks,
  onPreviewImage,
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
  isDayLoading?: boolean;
  tripId: string;
  destination: string;
  tripStartDate?: string | null;
  weather?: any;
  recentlySyncedNodeIds?: string[];
  onEditingChange?: (nodeId: string, day: number, isEditing: boolean) => void;
  nodeEditingLocks?: Record<string, { userName: string; day: number }>;
  onPreviewImage?: (url: string) => void;
}) {
  const [isFavoriteDragOver, setIsFavoriteDragOver] = useState(false);
  const [manualAddTrigger, setManualAddTrigger] = useState(0);
  const [aiQuoteIndex, setAiQuoteIndex] = useState(0);
  const { displayed: aiQuoteDisplayed, done: aiQuoteDone } = useTypewriter(
    AI_LOADING_QUOTES[aiQuoteIndex],
    40,
  );

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
  const canDropFavorite = Boolean(
    draggingFavorite && !isOffline && onFavoriteDrop,
  );

  return (
    <div
      className={`flex flex-col gap-4 sm:gap-6 sm:mt-6 mt-2 min-h-[400px] rounded-[36px] transition-all ${isFavoriteDragOver ? "bg-fuchsia-50/30 ring-2 ring-fuchsia-300/60 ring-offset-4 ring-offset-transparent" : ""}`}
      onDragOver={(event) => {
        if (!canDropFavorite) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
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
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-500">
              拖放加入 Day {day}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-700">
              將「{draggingFavorite.title}」加入今天的行程
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ─── 天氣預報跑馬燈及今日日期 ─── */}
      <div className="-mt-8 sm:-mt-14 mb-4 sm:mb-6 ml-6 sm:ml-10 relative z-15 flex flex-col gap-2.5 max-w-full overflow-hidden">
        {/* 天氣預報跑馬燈 */}
        {Array.isArray(weather) && weather.length > 0 && (
          <div className="relative flex items-center w-[280px] sm:w-[360px] md:w-[420px] h-[52px] bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-[20px] shadow-sm overflow-hidden select-none group transition-all duration-300 hover:shadow-md">
            {/* 左側漸變遮罩 */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/90 to-transparent z-10 pointer-events-none" />
            {/* 右側漸變遮罩 */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/90 to-transparent z-10 pointer-events-none" />
            
            <div className="flex min-w-max overflow-hidden">
              {/* 跑馬燈主體 - 第一組 */}
              <div className="flex gap-4 px-4 animate-marquee shrink-0">
                {weather.map((wVal: any, idx: number) => {
                  const rainProb = wVal.rain_prob ?? 0;
                  const emoji = rainProb > 50 ? "🌧️" : rainProb > 20 ? "⛅" : "☀️";
                  const isCurrentSelectedDay = idx === (day - 1);
                  return (
                    <div 
                      key={`marq1-${idx}`} 
                      className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] font-black tracking-wide border transition-all ${isCurrentSelectedDay ? "bg-fuchsia-500/10 border-fuchsia-300/60 text-fuchsia-700 shadow-sm shadow-fuchsia-100/50 scale-105" : "bg-slate-50/40 border-slate-100 text-slate-600"}`}
                    >
                      <span>{emoji}</span>
                      <span className="font-bold">D{idx + 1}</span>
                      <span className="text-slate-400 font-medium">|</span>
                      <span>{wVal.temp_min}°-{wVal.temp_max}°</span>
                      <span className="text-blue-400 font-bold ml-0.5">{rainProb}%</span>
                    </div>
                  );
                })}
              </div>
              {/* 跑馬燈主體 - 第二組 (無縫銜接) */}
              <div className="flex gap-4 px-4 animate-marquee shrink-0" aria-hidden="true">
                {weather.map((wVal: any, idx: number) => {
                  const rainProb = wVal.rain_prob ?? 0;
                  const emoji = rainProb > 50 ? "🌧️" : rainProb > 20 ? "⛅" : "☀️";
                  const isCurrentSelectedDay = idx === (day - 1);
                  return (
                    <div 
                      key={`marq2-${idx}`} 
                      className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] font-black tracking-wide border transition-all ${isCurrentSelectedDay ? "bg-fuchsia-500/10 border-fuchsia-300/60 text-fuchsia-700 shadow-sm shadow-fuchsia-100/50 scale-105" : "bg-slate-50/40 border-slate-100 text-slate-600"}`}
                    >
                      <span>{emoji}</span>
                      <span className="font-bold">D{idx + 1}</span>
                      <span className="text-slate-400 font-medium">|</span>
                      <span>{wVal.temp_min}°-{wVal.temp_max}°</span>
                      <span className="text-blue-400 font-bold ml-0.5">{rainProb}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 當天日期顯示在天氣預報卡片底下 */}
        {(() => {
          const formattedDate = (tripStartDate && day) ? getDateForDay(day, tripStartDate) : null;
          if (!formattedDate) return null;
          return (
            <div className="flex items-center gap-2 pl-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/60 backdrop-blur-md border border-slate-200/40 rounded-full shadow-sm text-[11px] font-black tracking-widest text-slate-600 uppercase">
                <Calendar size={12} className="text-pink-400" />
                <span>{formattedDate}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 mx-0.5" />
                <span className="text-pink-500">第 {day} 天</span>
              </div>
            </div>
          );
        })()}
      </div>

      {isDayLoading && (
        <div className="flex flex-col gap-5 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`day-loading-${i}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
            >
              <ItinerarySkeletonCard />
            </motion.div>
          ))}
        </div>
      )}

      {!isDayLoading && items.length === 0 && !aiLoading && (
        <GlassCard className="!p-10 sm:!p-16 !rounded-[32px] sm:!rounded-[48px] border border-white/70 bg-gradient-to-b from-white/80 to-pink-50/55 flex flex-col items-center justify-center text-center backdrop-blur-2xl shadow-sm hover:shadow-xl transition-shadow duration-700 mx-2 sm:mx-0">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-[28px] sm:rounded-[40px] bg-gradient-to-br from-fuchsia-100 to-indigo-100 flex items-center justify-center text-4xl sm:text-6xl mb-6 sm:mb-8 shadow-xl shadow-fuchsia-200/40 border border-white hover:rotate-3 hover:scale-105 transition-all duration-300">
            🏝️
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 sm:mb-3 tracking-tight">
            新增行程
          </h3>
          <p className="text-slate-600 font-bold max-w-[360px] leading-relaxed text-[12px] tracking-[0.06em] px-4 text-center">
            不知道從哪開始？讓 AI 給你點靈感，或是從收藏隨機加入。
          </p>
          <div className="mt-8 flex w-full max-w-[340px] flex-col gap-3.5 sm:gap-4">
            <button
              type="button"
              onClick={() => onAskAiForDay?.()}
              disabled={isOffline}
              className="w-full rounded-[32px] bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-5 py-4 sm:py-5 text-[15px] sm:text-[16px] font-black tracking-widest text-white shadow-[0_8px_20px_rgba(192,38,211,0.25)] transition-[transform,shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(192,38,211,0.35)] active:scale-[0.97] disabled:opacity-40 flex justify-center items-center gap-2 whitespace-nowrap transform-gpu"
            >
              ✨ AI 助手幫我填滿
            </button>
            <button
              type="button"
              onClick={() => onRandomizeFromFavorites?.()}
              disabled={isOffline || !favoriteSuggestions?.length}
              className="w-full rounded-[32px] bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-4 sm:py-5 text-[15px] sm:text-[16px] font-black tracking-widest text-white shadow-[0_8px_20px_rgba(14,165,233,0.25)] transition-[transform,shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(14,165,233,0.35)] active:scale-[0.97] disabled:opacity-40 flex justify-center items-center gap-2 whitespace-nowrap transform-gpu"
            >
              📌 從口袋名單挑選
            </button>
            <button
              type="button"
              onClick={() => setManualAddTrigger((prev) => prev + 1)}
              disabled={isOffline}
              className="w-full rounded-[32px] bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 sm:py-5 text-[15px] sm:text-[16px] font-black tracking-widest text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-[transform,shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(16,185,129,0.35)] active:scale-[0.97] disabled:opacity-40 flex justify-center items-center gap-2 whitespace-nowrap transform-gpu"
            >
              ➕ 手動新增
            </button>
          </div>
        </GlassCard>
      )}

      {aiLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col gap-4"
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
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-500">
                  AI 正在排今天的節奏
                </p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {aiQuoteDisplayed}
                  <span
                    className={`inline-block w-[1.5px] h-[0.9em] ml-[1px] align-middle bg-indigo-400 ${aiQuoteDone ? "opacity-0" : "animate-pulse"}`}
                  />
                </p>
              </div>
            </div>
          </motion.div>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
            >
              <ItinerarySkeletonCard />
            </motion.div>
          ))}
        </motion.div>
      )}

      <Reorder.Group
        axis="y"
        values={items}
        onReorder={onReorder}
        className="flex flex-col gap-4 sm:gap-5"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item: ItineraryNode, idx: number) => {
            const nextItem = items[idx + 1];
            let timeGapStr = "";
            let timeGapMinutes = 0;

            if (nextItem && item.time && nextItem.time) {
              const currentParts = item.time.split(":").map(Number);
              const nextParts = nextItem.time.split(":").map(Number);
              if (currentParts.length === 2 && nextParts.length === 2) {
                const currentMins = currentParts[0] * 60 + currentParts[1];
                const nextMins = nextParts[0] * 60 + nextParts[1];
                const diff = nextMins - currentMins;
                if (diff > 0) {
                  timeGapMinutes = diff;
                  const h = Math.floor(diff / 60);
                  const m = diff % 60;
                  timeGapStr =
                    h > 0
                      ? `${h} 小時 ${m > 0 ? m + " 分鐘" : ""}`
                      : `${m} 分鐘`;
                }
              }
            }
            return (
              <ReorderableItineraryItem
                key={item.node_id}
                item={item}
                idx={idx}
                items={items}
                nextItem={nextItem}
                timeGapMinutes={timeGapMinutes}
                timeGapStr={timeGapStr}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onQuickExpense={onQuickExpense}
                isOffline={isOffline}
                tripId={tripId}
                destination={destination}
                tripStartDate={tripStartDate}
                recentlySyncedNodeIds={recentlySyncedNodeIds}
                onEditingChange={onEditingChange}
                nodeEditingLocks={nodeEditingLocks}
                onPreviewImage={onPreviewImage}
              />
            );
          })}
        </AnimatePresence>
      </Reorder.Group>

      {/* Manual Add Node UI */}
      <ManualAddNode
        onAdd={onManualAdd}
        isOffline={isOffline}
        day={day}
        tripStartDate={tripStartDate}
        openTrigger={manualAddTrigger}
      />
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
  const [title, setTitle] = useState("");
  const [locationName, setLocationName] = useState("");
  const [date, setDate] = useState(getDateForDay(day, tripStartDate) || "");
  const [time, setTime] = useState("10:00");
  const [emoji, setEmoji] = useState("📍");
  const [category, setCategory] = useState("landmark");
  const [description, setDescription] = useState("");
  const [transportToNext, setTransportToNext] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isVisited, setIsVisited] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [linkedFactId, setLinkedFactId] = useState("");
  const facts = useTripFactsStore((s) => s.facts);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [isMapSelectorOpen, setIsMapSelectorOpen] = useState(false);

  useEffect(() => {
    if (!isAdding) {
      setDate(getDateForDay(day, tripStartDate) || "");
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
      description: [locationName ? `地點：${locationName}` : "", description]
        .filter(Boolean)
        .join("\n"),
      transport_to_next: transportToNext || undefined,
      image_url: imageUrl || undefined,
      is_visited: isVisited,
      linkedFactId: linkedFactId || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
    });
    setTitle("");
    setLocationName("");
    setCoords(null);
    setDescription("");
    setTransportToNext("");
    setImageUrl("");
    setDate(getDateForDay(day, tripStartDate) || "");
    setTime("10:00");
    setIsVisited(false);
    setLinkedFactId("");
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsAdding(true)}
        disabled={isOffline}
        className="w-full py-8 rounded-[48px] border-2 border-dashed border-slate-200 text-slate-500 font-black text-[15px] uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:border-pink-300 hover:text-pink-400 hover:bg-pink-50/20 transition-all shadow-sm disabled:opacity-30"
      >
        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-pink-100 group-hover:text-pink-400 transition-colors">
          <Plus size={20} />
        </div>
        新增行程節點
      </motion.button>
    );
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-sheet flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={getOverlayTransition()}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setIsAdding(false)}
        />
        <motion.div
          initial={getModalMotion().initial}
          animate={getModalMotion().animate}
          exit={getModalMotion().exit}
          transition={getModalMotion().transition}
          className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl z-sheet-above overflow-hidden flex flex-col max-h-90dvh"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400 z-10" />
          <div className="p-5 sm:p-8 overflow-y-auto w-full pb-32">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[20px] bg-pink-50 flex items-center justify-center text-2xl">
                    🗓️
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                      新增行程節點
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      Day {getDayForDate(date, tripStartDate, day)}{" "}
                      {date ? `• ${date}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                  行程名稱
                </label>
                <div className="relative group">
                  <Pencil
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-400 transition-colors"
                    size={18}
                  />
                  <input
                    autoFocus
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：參觀東京鐵塔"
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    日期
                  </label>
                  <div className="relative group">
                    <Calendar
                      size={18}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-400 transition-colors"
                    />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    時間
                  </label>
                  <div className="relative group">
                    <Clock
                      size={18}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-400 transition-colors"
                    />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                  地點
                </label>
                <div className="flex gap-2">
                  <div className="relative group flex-1">
                    <MapPin
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-400 transition-colors"
                      size={18}
                    />
                    <input
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="文字輸入地點名稱或地址"
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapSelectorOpen(true)}
                    className="shrink-0 px-4 py-4 rounded-2xl bg-white border border-fuchsia-200 text-fuchsia-600 font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-fuchsia-50 hover:shadow-sm active:scale-[0.97] transition-all"
                  >
                    <MapPin size={16} />
                    {coords ? "已選取座標" : "地圖選取"}
                  </button>
                </div>
              </div>

                  <div className="flex flex-col gap-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                  詳細說明 / 備註 (Description)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="補充行程細節、提醒或預約資訊..."
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm min-h-[92px] resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    前往下一站交通
                  </label>
                  <input
                    value={transportToNext}
                    onChange={(e) => setTransportToNext(e.target.value)}
                    placeholder="例如：地鐵約 20 分鐘"
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    照片網址
                  </label>
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images..."
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    圖標 Emoji
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-full py-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex items-center justify-center shadow-sm hover:border-pink-200 transition-all active:scale-[0.97]"
                    >
                      <IconImg value={emoji} size={28} />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-full mt-2 left-0 z-50 p-3 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-y-auto max-h-[160px] w-64 flex flex-wrap gap-2">
                        {EMOJI_OPTIONS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              setEmoji(em);
                              setShowEmojiPicker(false);
                            }}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${emoji === em ? "bg-pink-100 scale-110 shadow-sm" : "hover:bg-slate-50"}`}
                          >
                            <IconImg value={em} size={24} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    分類
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all appearance-none shadow-sm h-full"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {CATEGORY_META[opt].label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
              </div>

              {facts && facts.length > 0 && (
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    關聯 Travel Fact
                  </label>
                  <div className="relative">
                    <select
                      value={linkedFactId}
                      onChange={(e) => setLinkedFactId(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 focus:bg-white transition-all shadow-sm appearance-none"
                    >
                      <option value="">無關聯 (未選擇)</option>
                      {facts.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.title} ({f.factType})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-100 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={isVisited}
                  onChange={(e) => setIsVisited(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4"
                />
                標記為已完成 / 已打卡
              </label>

              <button
                type="submit"
                className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black text-[13px] uppercase tracking-[0.15em] shadow-lg hover:bg-slate-800 active:scale-[0.97] transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Plus size={18} strokeWidth={3} />
                確認新增至 Day {getDayForDate(date, tripStartDate, day)}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
      <MapSelectorModal
        isOpen={isMapSelectorOpen}
        onClose={() => setIsMapSelectorOpen(false)}
        onSelect={(lat, lng) => {
          setCoords({ lat, lng });
          if (!locationName)
            setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }}
      />
    </AnimatePresence>,
    document.body,
  );
}


// Using imported CalendarView component


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function normalizeClockInput(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "10:00";
  const hh = Math.min(Math.max(0, Number(match[1])), 23);
  const mm = Math.min(Math.max(0, Number(match[2])), 59);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function getTravelFactBookingLabel(fact?: TravelFact | null) {
  if (!fact?.metadata?.bookingUrl) return null;
  return fact.factType.includes("flight") ? "前往預訂" : "查看價格";
}

function getTravelFactRedirectPayload(fact?: TravelFact | null) {
  const bookingUrl = fact?.metadata?.bookingUrl?.trim();
  if (!fact || !bookingUrl) return null;

  return {
    provider: fact.metadata?.provider || fact.metadata?.airline || fact.title,
    affiliateUrl: bookingUrl,
    itemId: fact.id,
    airline: fact.metadata?.airline || fact.metadata?.provider || fact.title,
    departure: fact.metadata?.depCode || "出發",
    arrival: fact.metadata?.arrCode || fact.locationName || "目的地",
    price:
      typeof fact.metadata?.price === "number"
        ? fact.metadata.price
        : undefined,
    currency: fact.metadata?.currency,
    emoji: fact.factType.includes("flight") ? "✈️" : "🏨",
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
  const flights = items.filter((item) => item.type === "flight").slice(0, 4);
  return flights.map((flight) => {
    const title = flight.title;
    const routeMatch = title.match(/^([^()]+)/);
    const route = routeMatch?.[1]?.trim() ?? title;
    const timeMatch = title.match(/(\d{1,2}:\d{2}\s*[-~]\s*\d{1,2}:\d{2})/);
    const time = timeMatch?.[1]?.replace(/\s+/g, " ") ?? "時間待確認";
    const transferMatch = title.match(/(轉機|轉乘|via\s+[^)\s]+|經[^)\s]+)/i);
    const transfer = transferMatch ? `，${transferMatch[1]}` : "";
    return `${flight.provider} ${route} ${time}${transfer}`;
  });
}

function readCachedItinerary(tripId: string): ItineraryNode[] {
  if (typeof window === "undefined" || !tripId) return [];
  const storageKey = `roamjelly_itinerary_${tripId}`;
  const sessionCached = window.sessionStorage.getItem(storageKey);
  const legacyCached = window.localStorage.getItem(storageKey);
  const raw = sessionCached ?? legacyCached;
  if (!sessionCached && legacyCached) {
    window.sessionStorage.setItem(storageKey, legacyCached);
    window.localStorage.removeItem(storageKey);
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ItineraryNode[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedItineraryForLoadedDays(
  tripId: string,
  nodes: ItineraryNode[],
  loadedDays: number[],
) {
  if (typeof window === "undefined" || !tripId || loadedDays.length === 0)
    return;
  const loadedDaySet = new Set(loadedDays);
  const cached = readCachedItinerary(tripId);
  const merged = [
    ...cached.filter((node) => !loadedDaySet.has(Number(node.day ?? 1))),
    ...nodes.filter((node) => loadedDaySet.has(Number(node.day ?? 1))),
  ];
  const storageKey = `roamjelly_itinerary_${tripId}`;
  window.sessionStorage.setItem(storageKey, JSON.stringify(merged));
  window.localStorage.removeItem(storageKey);
}

function summarizeItineraryDiff(
  previousNodes: ItineraryNode[],
  nextNodes: ItineraryNode[],
) {
  const previousMap = new Map(
    previousNodes.map((node) => [node.node_id, node]),
  );
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
    ].join("|");

    const nextSignature = [
      nextNode.day,
      nextNode.date,
      nextNode.time,
      nextNode.title,
      nextNode.description,
      nextNode.transport_to_next,
      nextNode.image_url,
      nextNode.is_visited,
    ].join("|");

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
    diff.addedCount > 0 ? `新增 ${diff.addedCount} 個景點` : "",
    diff.updatedCount > 0 ? `更新 ${diff.updatedCount} 個景點` : "",
    diff.removedCount > 0 ? `刪除 ${diff.removedCount} 個景點` : "",
  ].filter(Boolean);

  return parts.length > 0
    ? `您離線期間，旅伴已${parts.join("、")}。`
    : "您已重新連線，行程已同步到最新版本。";
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatDateToIcs(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}00`;
}

function buildIcsCalendar(tripName: string, nodes: ItineraryNode[]) {
  const orderedNodes = sortNodesForDisplay([...nodes]).filter(
    (node) => node.date && node.time,
  );
  const nowStamp = formatDateToIcs(new Date());
  const events = orderedNodes.map((node, index) => {
    const start = new Date(`${node.date}T${normalizeClockInput(node.time)}:00`);
    const nextNode = orderedNodes[index + 1];
    const nextStart =
      nextNode?.date && nextNode?.time
        ? new Date(`${nextNode.date}T${normalizeClockInput(nextNode.time)}:00`)
        : null;
    const end =
      nextStart && nextStart > start
        ? nextStart
        : new Date(start.getTime() + 60 * 60 * 1000);

    return [
      "BEGIN:VEVENT",
      `UID:${node.node_id}@roamjelly.app`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${formatDateToIcs(start)}`,
      `DTEND:${formatDateToIcs(end)}`,
      `SUMMARY:${escapeIcsText(node.title)}`,
      `DESCRIPTION:${escapeIcsText(node.description || node.ai_note || "")}`,
      `LOCATION:${escapeIcsText(node.title)}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RoamJelly//Trip Export//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(tripName)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

// ImagePreviewModal helper

