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
import { EventCard } from "./ui/event-card";

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
  UserPlus,
  CreditCard,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import GlassCard from "./GlassCard";
import IconImg from "./ui/IconImg";
import { GlowingIcon } from "./ui/GlowingIcon";
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
  geocodeSpotWithAI,
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
import { getCurrencyFromDestination } from "../lib/currency";
import { parseCsvInput, normalizeClockInput, extractMinutes, formatCurrentTime } from "../lib/itineraryText";
import { buildIcsCalendar } from "../lib/icsExport";
import { readCachedItinerary, writeCachedItineraryForLoadedDays, summarizeItineraryDiff, buildReconnectSummaryMessage } from "../lib/itinerarySync";
import { getFlightRouteSummary, extractFlightSegments } from "../lib/flightFormat";
import { getLoadedDaysFromNodes, buildNodePatchChanges, getDynamicMapPercent } from "../lib/itineraryNodes";
import { getTripCoverImage } from "../lib/tripCoverImage";
import { getTravelFactBookingLabel, getTravelFactRedirectPayload } from "../lib/travelFact";
import { withAutoCategoryIcon, normalizeScheduleForNode } from "../lib/itinerarySchedule";
import { buildDefaultPlannerForm } from "../lib/plannerForm";
import CollaboratorAvatar from "./itinerary/CollaboratorAvatar";
import TransportGapIndicator from "./itinerary/TransportGapIndicator";
import DraggableFavoriteSpot from "./itinerary/DraggableFavoriteSpot";
import ManualAddNode from "./itinerary/ManualAddNode";
import ItineraryList from "./itinerary/ItineraryList";
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




type AiGenerateMode =
  | "selected_day"
  | "overwrite_all"
  | "generate_for_selected_days";
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
  EMOJI_OPTIONS,
  getCategoryMeta,
  getNodeEmoji,
} from "../lib/itineraryUtils";
import { useTranslation } from "react-i18next";

export default function ItineraryTab() {
    const { t } = useTranslation();
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
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
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

  const userId = useAppStore((state) => state.userId);
  const isGuestAuth = userId?.startsWith("guest_") || !userId;

  const [contextualLoginPrompt, setContextualLoginPrompt] = useState<{show: boolean; itemName: string}>({show: false, itemName: ''});

  const handleEditPermissionCheck = (itemName?: string) => {
    if (isGuestAuth) {
      setContextualLoginPrompt({ show: true, itemName: itemName || '這個項目' });
      return false;
    }
    return true;
  };

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
    setActiveTab,
  } = useAppStore();

  useEffect(() => {
    if (!isGuestAuth) {
      const pendingAction = sessionStorage.getItem('postLoginAction');
      if (pendingAction === 'invite_collaborators') {
        sessionStorage.removeItem('postLoginAction');
        setTimeout(() => handleShare(), 500);
      }
    }
  }, [isGuestAuth]);

  const [pendingSettlementsCount, setPendingSettlementsCount] = useState<number>(0);

  useEffect(() => {
    setSelectedDay(1);
    setLoadedDays([]);
    setLoadingDay(null);
    if (activeTripId) {
      import('../lib/workflowApi').then(({ fetchSettlements }) => {
        fetchSettlements(activeTripId).then(data => {
          if (Array.isArray(data)) {
            setPendingSettlementsCount(data.length);
          }
        }).catch(() => {});
      });
    }
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
    if (!handleEditPermissionCheck()) return;
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
            transport_to_next: spot.transport_to_next || undefined,
            lat: spot.lat ?? (undefined as any),
            lng: spot.lng ?? (undefined as any),
            image_url: spot.image_url || undefined,
            source: "local" as const,
          });
        });
      });

      // Priorities AI generated lat/lng, otherwise Geocode spots in parallel; fall back silently if any fail
      const destCoords = await geocodeSpot(formData.destination, "").catch(() => null);
      const geocodeResults = await Promise.allSettled(
        rawNodes.map((n) => {
          if (n.lat && n.lng) {
            if (destCoords) {
              const dist = haversineKm(n.lat, n.lng, destCoords.lat, destCoords.lng);
              if (dist <= 200) {
                return Promise.resolve({ lat: n.lat, lng: n.lng });
              } else {
                console.warn(`[Itinerary Geocode Limit Frontend] Initial coordinates for "${n.title}" are too far (${dist.toFixed(1)}km > 200km) from "${formData.destination}", re-geocoding...`);
              }
            } else {
              return Promise.resolve({ lat: n.lat, lng: n.lng });
            }
          }
          return geocodeSpot(n.title, formData.destination);
        }),
      );
      geocodeResults.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          rawNodes[i].lat = r.value.lat;
          rawNodes[i].lng = r.value.lng;
        } else {
          rawNodes[i].lat = null;
          rawNodes[i].lng = null;
        }
      });

      // AI Fallback Loop for blank coordinates
      const aiGeocodePromises = rawNodes.map(async (n) => {
        if (!n.lat || !n.lng) {
          try {
            const aiCoords = await geocodeSpotWithAI(n.title, formData.destination);
            if (aiCoords) {
              if (destCoords) {
                const dist = haversineKm(aiCoords.lat, aiCoords.lng, destCoords.lat, destCoords.lng);
                if (dist > 200) {
                  console.warn(`[AI Fallback Geocode Limit Frontend] Resolved coordinates for "${n.title}" are too far (${dist.toFixed(1)}km > 200km) from "${formData.destination}", rejecting.`);
                  return;
                }
              }
              n.lat = aiCoords.lat;
              n.lng = aiCoords.lng;
              console.log(`[AI Fallback Geocode Frontend] Resolved "${n.title}" in "${formData.destination}" to: ${aiCoords.lat}, ${aiCoords.lng}`);
            }
          } catch (err) {
            console.warn(`[AI Fallback Geocode Frontend] Failed for "${n.title}":`, err);
          }
        }
      });
      await Promise.allSettled(aiGeocodePromises);

      // Fetch spot images (Wikipedia thumbnail) in parallel; skip if server already provided one
      const enrichResults = await Promise.allSettled(
        rawNodes.map((n) =>
          n.image_url ? Promise.resolve(null) : fetchSpotEnrichment(n.title),
        ),
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

      // Loop to calculate the distance and estimate/fetch transport times (transport_to_next) before outputting
      const transportPromises = [];
      for (let i = 0; i < finalNodes.length - 1; i++) {
        const curr = finalNodes[i];
        const next = finalNodes[i + 1];
        if (
          curr.day === next.day &&
          curr.lat != null &&
          curr.lng != null &&
          next.lat != null &&
          next.lng != null
        ) {
          const lat1 = curr.lat;
          const lng1 = curr.lng;
          const lat2 = next.lat;
          const lng2 = next.lng;
          const km = haversineKm(lat1, lng1, lat2, lng2);

          if (km > 0 && !curr.transport_to_next) {
            const promise = fetchDirections(lng1, lat1, lng2, lat2)
              .then((apiDuration) => {
                if (apiDuration && km > 1) {
                  curr.transport_to_next = `車程約 ${formatMinutes(apiDuration)}`;
                } else {
                  const est = estimateTransport(km);
                  curr.transport_to_next = est.label;
                }
              })
              .catch(() => {
                const est = estimateTransport(km);
                curr.transport_to_next = est.label;
              });
            transportPromises.push(promise);
          }
        }
      }
      if (transportPromises.length > 0) {
        await Promise.allSettled(transportPromises);
      }

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
    if (!handleEditPermissionCheck()) return;
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
        
        if (isOffline) {
          setNodes(assignedNodes);
        } else {
          useItineraryStore.getState().replaceDayNodes(initialDay, assignedNodes.filter((n: any) => n.day === initialDay));
        }
        
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

  const handleInviteCollaborators = async () => {
    if (!userId) {
      setShowInviteModal(true);
      return;
    }
    handleShare();
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
    if (!handleEditPermissionCheck()) return;
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
    if (!handleEditPermissionCheck()) return;
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
    if (!handleEditPermissionCheck()) return;
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
              {t('str_66f9470e')}</button>
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
            title={t('str_d467c8f')}
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
                    title={t('str_7251b979')}
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 dark:text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
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
                                    <GlowingIcon icon={Icon} size={14} glowColor="bg-sky-400" iconColor="text-sky-700" />
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
                                    collapsedLabel={t('str_aa19e90')}
                                    expandedLabel={t('str_301f49f3')}
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
                              {t('str_75a6efe5')}</p>
                            <p className="mt-2 text-[12px] font-bold leading-5 text-slate-500">
                              {t('str_28077213')}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsPlanningNew(true);
                            }}
                            className="flex min-h-12 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-pink-400 to-orange-400 px-5 py-3 text-sm font-black text-white shadow-sm transition-colors hover:from-pink-500 hover:to-orange-500"
                          >
                            <GlowingIcon icon={Sparkles} size={18} glowColor="bg-yellow-300" iconColor="text-white" />
                            {t('str_770014d2')}</button>
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
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest px-4">
              {t('str_1dd553ed')}</span>
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
                {t('str_1a71f905')}</h3>
              <p className="mt-2 max-w-md text-pretty text-[13px] sm:text-sm font-bold leading-6 text-slate-500">
                {t('str_2f5a1b96')}</p>
              <button
                onClick={() => setIsPlanningNew(true)}
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-400 to-rose-400 px-6 py-3 text-[13px] sm:text-sm font-black text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_20px_rgba(244,63,94,0.3)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press hover:-translate-y-1 hover:from-pink-500 hover:to-rose-500 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_28px_rgba(244,63,94,0.4)]"
              >
                <Sparkles size={18} />
                {t('str_56785280')}</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTrips.map((trip) => (
                <div key={trip.tripId ?? trip.id} className="relative group w-full h-full flex">
                  <EventCard
                    heading={trip.name || t('my_itinerary', '我的行程')}
                    description={`${trip.days || 1} DAYS`}
                    date={new Date(trip.createdAt || new Date())}
                    imageUrl={getTripCoverImage(trip.destination)}
                    imageAlt={trip.name}
                    eventName={trip.destination || "Unknown Location"}
                    location={trip.destination || "Unknown Location"}
                    time="Anytime"
                    actionLabel={t('str_42ceb1f2')}
                    onActionClick={(e) => {
                      if ((e.target as HTMLElement).closest(".delete-trip-btn")) return;
                      setActiveTripId(trip.tripId ?? trip.id);
                    }}
                    className="flex-1"
                  />
                  <div className="absolute top-4 right-4 z-20">
                    <button
                      title={t('str_342d0416')}
                      aria-label={t('delete_itinerary_label', 'Delete Itinerary "{{name}}"', { name: trip.name })}
                      className="delete-trip-btn w-11 h-11 bg-white/60 hover:bg-red-500 hover:text-white text-slate-800 flex items-center justify-center rounded-full backdrop-blur-md shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (
                          window.confirm(
                            t('delete_itinerary_confirm', 'Are you sure you want to delete "{{name}}"? This will delete all related data (including finances, check-lists, etc.) and cannot be undone.', { name: trip.name })
                          )
                        ) {
                          try {
                            const ok = await deleteTripApi(trip.tripId ?? trip.id);
                            if (ok) {
                              useAppStore.getState().showToast(t('delete_itinerary_success', 'Itinerary deleted successfully'), "success");
                              setUserTrips((prev) =>
                                prev.filter((t) => (t.tripId ?? t.id) !== (trip.tripId ?? trip.id))
                              );
                            } else {
                              useAppStore.getState().showToast(t('delete_itinerary_fail_owner', 'Delete failed, or you are not the owner of this project'), "warning");
                            }
                          } catch (err) {
                            useAppStore.getState().showToast(t('delete_itinerary_error', 'An error occurred while deleting'), "warning");
                          }
                        }
                      }}
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
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
              <div className="h-11 w-64 bg-slate-200/80 rounded-3xl animate-pulse" />
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
                      className="h-16 bg-slate-100 rounded-3xl animate-pulse"
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
        {isGuestAuth && (
          <div className="mx-4 md:mx-0 mb-6 mt-6 md:mt-0 glass-card rounded-3xl p-4 bg-[linear-gradient(135deg,rgba(240,249,255,0.7),rgba(224,242,254,0.5))] border border-sky-200/50 shadow-[0_8px_30px_rgb(14,165,233,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4 z-50 relative">
            <span className="text-sky-700 font-bold text-sm tracking-wide flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500 shadow-[0_0_6px_#0ea5e9]"></span>
              </span>
              {t('str_58ab6740')}</span>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('request-login'))}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white rounded-full text-[13px] font-black uppercase tracking-widest shadow-md transition-all ios-press shrink-0 w-full sm:w-auto"
            >
              {t('str_4ca18424')}</button>
          </div>
        )}
        
        {pendingSettlementsCount > 0 && !isGuestAuth && (
          <div className="mx-4 md:mx-8 mb-6 mt-6 glass-card rounded-3xl p-4 bg-gradient-to-r from-rose-50/80 to-orange-50/80 border border-rose-200/50 shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all" onClick={() => setActiveTab('tools')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                <CreditCard size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="font-bold text-rose-700 text-sm">{t('str_47593af8')}</h4>
                <p className="text-rose-500 text-xs font-medium">{t('str_6709')}{pendingSettlementsCount} {t('str_239bcde9')}</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-white rounded-full text-rose-600 text-xs font-bold shadow-sm whitespace-nowrap">
              {t('str_26df965a')}<ArrowRight size={14} className="inline ml-1" />
            </button>
          </div>
        )}
        {isOffline ? (
          <div className="mx-4 md:mx-8 mb-6 mt-6 glass-card rounded-3xl p-4 bg-amber-50/10 border border-amber-500/20 shadow-sm flex items-center justify-center gap-2">
            <span className="text-amber-400 font-mono text-xs tracking-wide flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_6px_#f59e0b]"></span>
              </span>
              OFFLINE / READ-ONLY
            </span>
          </div>
        ) : (
          <div className="absolute top-8 left-5 z-50 flex items-center justify-center gap-2 bg-slate-900/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            <span className="text-emerald-400 font-mono text-[10px] sm:text-xs tracking-wider flex items-center gap-2 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
              </span>
              SYNC CONNECTED
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
                onClick={handleInviteCollaborators}
                aria-label={t('str_166b4aee')}
                className="w-11 h-11 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white transition-all ios-press shadow-lg"
              >
                <UserPlus size={18} strokeWidth={3} />
              </button>
              <button
                onClick={handleTogglePublicTemplate}
                disabled={isUpdatingPublicState}
                className="px-4 h-11 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white transition-all ios-press shadow-lg text-[11px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                {tripInfo?.isPublic ? t('public_status.active', '公開中') : t('public_status.publish', '發布')}
              </button>
              <button
                onClick={handleShare}
                aria-label={t('str_26817364')}
                className="w-11 h-11 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white transition-all ios-press shadow-lg"
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
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm ios-press"
              >
                <ArrowLeft size={12} strokeWidth={3} />
                {t('str_11c18a')}</button>
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-pink-50 hover:bg-pink-100 border border-pink-100 rounded-xl text-[11px] font-black text-pink-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm ios-press"
              >
                <Share2 size={12} strokeWidth={3} />
                {t('str_a3d65')}</button>
              <button
                onClick={handleInviteCollaborators}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl text-[11px] font-black text-indigo-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm ios-press"
              >
                <UserPlus size={12} strokeWidth={3} />
                {t('str_166b4aee')}</button>
              <button
                onClick={handleTogglePublicTemplate}
                disabled={isUpdatingPublicState}
                className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm ios-press disabled:opacity-60 ${tripInfo?.isPublic ? "bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-600" : "bg-white hover:bg-slate-50 border border-slate-100 text-slate-500"}`}
              >
                <Lock size={12} strokeWidth={3} />
                {tripInfo?.isPublic ? t('public_status.unpublish', '取消公開') : t('public_status.share', '分享行程')}
              </button>
              <button
                onClick={handleExportIcs}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-[11px] font-black text-emerald-600 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm ios-press"
              >
                <Calendar size={12} strokeWidth={3} />
                ICS
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-500 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm ios-press print:hidden"
              >
                <Printer size={14} className="shrink-0" />
                PDF
              </button>
            </div>

            <div className="hidden lg:block mt-8">
              <h1 className="text-5xl lg:text-6xl font-black text-slate-800 mb-4 flex items-center gap-3 font-serif tracking-tight leading-tight">
                <div className="flex items-center gap-2 group/title">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">
                    {tripInfo?.name || tripInfo?.destination || t('unnamed_destination', '未命名目的地')}
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
                    {t('str_5929')}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <Users size={16} className="text-indigo-500 shrink-0" />
                  <span className="text-slate-700 tracking-tight">
                    <span className="text-indigo-600 font-black">
                      {collaborators.length}
                    </span>{" "}
                    {t('str_259b5b51')}</span>
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
                    {tripInfo?.isPublic ? t('public_status.is_public', '公開行程中...') : t('public_status.is_private', '目前為私人行程')}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <Bookmark size={16} className="text-amber-500 shrink-0" />
                  <span className="text-slate-700 tracking-tight">
                    <span className="text-amber-600 font-black">
                      {tripInfo?.forkCount ?? 0}
                    </span>{" "}
                    {t('str_1a347b7')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center justify-start gap-3 sm:gap-4 flex-nowrap sticky top-2 md:top-4 z-[45] md:relative md:top-0 md:mt-8 px-4 md:px-8 w-full">
            <div className="shrink-0 flex items-center">
              <button
                onClick={handleBackToTrips}
                className="pl-4 pr-5 py-3 md:py-3.5 glass-card dark-transition hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-full text-[13px] md:text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 shadow-sm hover:shadow-md ios-press whitespace-nowrap"
              >
                <ArrowLeft
                  size={16}
                  strokeWidth={3}
                  className="text-slate-500 dark:text-slate-400"
                />
                {t('str_11c18a')}</button>
            </div>
            <HorizontalScrollRail
              label={t('str_7f1df301')}
              className="flex-1 min-w-0"
              contentClassName="gap-1.5 md:gap-2 rounded-[24px] md:rounded-full border border-white/50 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 md:bg-white/70 md:dark:bg-slate-900/70 p-1.5 md:p-2 shadow-sm md:shadow-md backdrop-blur-xl dark-transition"
              controlsVisibilityClass="flex"
              buttonClassName="border-white/30 dark:border-white/10 bg-white/20 dark:bg-slate-800/20 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-none hover:bg-white/40 dark:hover:bg-slate-700/40 backdrop-blur-sm size-11 ml-0.5 mr-0.5 flex"
            >
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 md:flex-none px-6 md:px-10 py-3 md:py-3.5 rounded-[18px] md:rounded-full font-black text-[13px] md:text-sm tracking-widest uppercase transition-all whitespace-nowrap ${viewMode === "list" ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md scale-[0.98] md:scale-100 border border-transparent" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-transparent"}`}
              >
                {t('str_3fc9a0b0')}</button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex-1 md:flex-none px-6 md:px-10 py-3 md:py-3.5 rounded-[18px] md:rounded-full font-black text-[13px] md:text-sm tracking-widest uppercase transition-all whitespace-nowrap ${viewMode === "map" ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md scale-[0.98] md:scale-100 border border-transparent" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-transparent"}`}
              >
                {t('str_30ef9475')}</button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex-1 md:flex-none px-6 md:px-10 py-3 md:py-3.5 rounded-[18px] md:rounded-full font-black text-[13px] md:text-sm tracking-widest uppercase transition-all whitespace-nowrap ${viewMode === "calendar" ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md scale-[0.98] md:scale-100 border border-transparent" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-transparent"}`}
              >
                {t('str_cd0c6')}</button>
            </HorizontalScrollRail>
          </div>
        </div>

        <div className="px-4 md:px-8 grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Left Column: Filters & Info */}
          <aside className="hidden lg:flex lg:col-span-1 flex-col gap-6 sticky top-24 h-fit max-h-sidebar-dvh overflow-y-auto pr-2 no-scrollbar">
            <GlassCard className="!p-6 glass-card dark-transition shadow-xl shadow-slate-200/40 dark:shadow-black/40 overflow-hidden rounded-[32px]">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <h3 className="font-black text-[11px] xl:text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>{t('str_30185cd5')}</span> <span className="text-sm">📅</span>
                </h3>
                <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
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
                            ? "text-pink-600 dark:text-pink-400 border-pink-200/50 dark:border-pink-500/30 shadow-sm"
                            : "bg-white/60 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-white dark:border-white/10 hover:bg-white dark:hover:bg-slate-800 hover:text-pink-500 dark:hover:text-pink-300"
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
                          <span className="inline xl:hidden">{t('str_7ad9')}</span>
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
              {totalDays > actualDaysLimit && (
                <button
                  onClick={() => setVisibleDaysLimit((l) => l + 14)}
                  className="w-full mt-4 py-2 border-2 border-dashed border-slate-200 rounded-3xl text-xs font-black tracking-widest text-slate-500 dark:text-slate-300 hover:text-slate-700 hover:border-slate-300 transition-colors uppercase"
                >
                  {t('str_6db9a2dd')}</button>
              )}
            </GlassCard>

            {/* Collaborators with presence */}
            <GlassCard className="!p-4 xl:!p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4 xl:mb-5 flex-wrap gap-2">
                <span className="font-black text-[11px] xl:text-xs uppercase tracking-[0.2em] text-slate-500">
                  {t('str_374ff911')}</span>
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
                    {t('str_2ece57ef')}{favorites.length})
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-500 dark:text-slate-400 transition-transform duration-200 shrink-0 ${
                      isFavoritesCollapsed ? "-rotate-90" : ""
                    }`}
                  />
                </div>
                {!isFavoritesCollapsed && (
                  <span className="text-[11px] font-bold text-pink-400 opacity-90 group-hover:opacity-100 transition-opacity">
                    {t('str_6bd53bd5')}</span>
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
                            aria-label={t('str_43315073')}
                            className="w-11 h-11 shrink-0 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center ios-press transition-all"
                          >
                            <IconImg value={newSpotEmoji} size={20} />
                          </button>
                          <input
                            value={newSpotTitle}
                            onChange={(e) => setNewSpotTitle(e.target.value)}
                            placeholder={t('str_42d7d09f')}
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
                            aria-label={t('str_2f92ecc7')}
                            className="w-11 h-11 shrink-0 rounded-xl bg-slate-800 text-white flex items-center justify-center disabled:opacity-30 ios-press transition-all"
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
                                className="w-11 h-11 flex items-center justify-center hover:bg-pink-50 rounded-lg transition-all"
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
              className="w-full py-5 rounded-[28px] bg-white text-slate-700 font-bold text-sm shadow-sm border border-slate-100 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 ios-press"
            >
              <Plus size={20} className="text-pink-400" />
              {t('str_5abc0943')}</button>
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
                  {t('str_301848af')}</p>
                <h3 className="font-black text-slate-800 text-xl mb-3">
                  {tripInfo.name} {t('str_6a5d91ce')}</h3>
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
                    {t('str_11e705')}{nodes.length - 12} {t('str_7cef40b1')}</p>
                )}
              </div>
            )}

            {/* Mobile Day Selector — Cuter segmented toggle style */}
            <div className="lg:hidden mb-2 md:mb-5 overflow-hidden -mx-1 -mt-3">
              <HorizontalScrollRail
                label={t('str_79a23dd8')}
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
                          {t('str_7b2c')}{day} {t('str_5929')}</span>
                        {displayDate && (
                          <span
                            className={`text-[10px] sm:text-[11px] font-bold hidden sm:inline z-10 transition-colors ${isActive ? "text-pink-50" : "text-slate-500 dark:text-slate-300"}`}
                          >
                            {displayDate}
                          </span>
                        )}
                        {loadingDay === day && (
                          <Loader2
                            size={12}
                            className={`animate-spin ml-0.5 z-10 transition-colors ${isActive ? "text-white" : "text-slate-500 dark:text-slate-300"}`}
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
                    className="relative flex items-center justify-center px-4 py-2.5 sm:py-2 rounded-full font-black text-[13px] sm:text-sm text-slate-500 dark:text-slate-300 hover:text-slate-700 bg-white/40 hover:bg-white border border-dashed border-slate-400 transition-all shrink-0 snap-center"
                  >
                    {t('str_72992809')}</motion.button>
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
                    <div className="flex items-center gap-3 px-5 py-3 rounded-3xl bg-fuchsia-50 border border-fuchsia-100 text-fuchsia-700 font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <Lock size={18} />
                      <span>
                        {Object.values(nodeEditingLocks)
                          .filter((lock) => lock.day === safeSelectedDay)
                          .slice(0, 2)
                          .map((lock) => lock.userName)
                          .join("、")}
                        {t('str_12ceef80')}{safeSelectedDay} {t('str_2a51960a')}</span>
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
                                {t('str_7028f9a6')}{safeSelectedDay} {t('str_15a15fa')}</h3>
                              <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wider">
                                {t('str_6db8a14d')}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowPlanner(!showPlanner)}
                            className={`w-full sm:w-auto px-10 py-4 rounded-full font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-3 ${showPlanner ? "bg-slate-100 text-slate-500" : "bg-slate-800 text-white hover:bg-slate-900 shadow-xl shadow-slate-200 ios-press"}`}
                          >
                            {showPlanner ? t('ai_planner.hide', '收起助理') : t('ai_planner.show', '召喚 AI')}
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
                                    {t('str_6db96ee9')}</label>
                                  <textarea
                                    placeholder={t('str_62f8045f')}
                                    value={plannerForm.notes}
                                    onChange={(e) =>
                                      setPlannerField("notes", e.target.value)
                                    }
                                    className="w-full bg-white/50 border border-slate-100 rounded-3xl px-6 py-5 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-100 transition-all min-h-[140px] shadow-inner text-base resize-none"
                                  />
                                </div>

                                {/* Travel Preferences */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                      {t('str_ca20f')}</label>
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
                                          {t('ai_preferences_options.' + opt, opt)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                      {t('str_12e587')}</label>
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
                                          {t('ai_preferences_options.' + opt, opt)}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    {t('str_30700374')}</label>
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
                                          {t('ai_preferences_options.' + opt, opt)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    {t('str_3d39a4e9')}</label>
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
                                          {t('ai_preferences_options.' + opt, opt)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    {t('str_47d6fc2f')}</label>
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
                                          {t('ai_preferences_options.' + opt, opt)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    {t('str_25e68384')}</label>
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
                                          {t('ai_preferences_options.' + opt, opt)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    {t('str_3fccb379')}</label>
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
                                          {t('ai_preferences_options.' + opt, opt)}
                                        </button>
                                      ),
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">
                                    {t('str_256fb55e')}</label>
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
                                          {t('ai_preferences_options.' + opt, opt)}
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
                                    {t('str_6f76fa9')}{safeSelectedDay}
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
                                    {t('str_309ba3f5')}</button>
                                  <button
                                    onClick={() =>
                                      setAiGenerateMode("overwrite_all")
                                    }
                                    className={`flex-1 py-4.5 rounded-[22px] font-black text-[11px] uppercase tracking-widest transition-all border ${aiGenerateMode === "overwrite_all" ? "bg-pink-100 text-pink-600 border-pink-200" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white"}`}
                                  >
                                    {t('str_41d03f6f')}</button>
                                </div>

                                {aiGenerateMode ===
                                  "generate_for_selected_days" && (
                                  <div className="flex gap-4 items-center justify-center bg-white/50 py-3 px-4 rounded-[22px] border border-slate-100 shadow-inner my-2">
                                    <span className="font-bold text-xs text-slate-600">
                                      {t('str_386a7818')}{" "}
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
                                      {t('str_81f3')}</span>
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
                                  className="w-full py-3 rounded-full bg-slate-50 border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 disabled:opacity-40 ios-press transition-all hover:bg-slate-100"
                                >
                                  {flightsLoading ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Plane size={16} />
                                  )}
                                  {t('str_18c6ffc3')}</button>

                                <button
                                  onClick={() => void handleAiSuggest()}
                                  disabled={aiLoading}
                                  className="w-full py-5 px-4 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-600 to-indigo-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-pink-200/50 flex flex-nowrap items-center justify-center gap-3 disabled:opacity-50 ios-press transition-all whitespace-nowrap overflow-hidden text-ellipsis"
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
                                      ? t('ai_planner.processing', 'AI 分析處理中...')
                                      : t('ai_planner.start_tuning', '開始智慧微調行程')}
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
                    onRequireLogin={handleEditPermissionCheck}
                  />

                  {selectedDayNodes.length > visibleNodeLimit && (
                    <div className="flex justify-center mt-6 mb-8 relative z-10 w-full pl-[22px] sm:pl-10 lg:pl-12">
                      <button
                        onClick={() => setVisibleNodeLimit((l) => l + 20)}
                        className="py-3 px-8 rounded-full border-2 border-dashed border-slate-300 text-sm font-black tracking-widest text-slate-500 hover:text-slate-700 hover:border-slate-400 hover:bg-white/50 transition-all uppercase"
                      >
                        {t('str_6769dc43')}</button>
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
                              {t('str_780af61c')}</p>
                          </div>
                        </div>
                      </GlassCard>
                    }
                  >
                    <div className="relative h-[65vh] md:h-[600px] w-full rounded-[2.5rem] overflow-hidden shadow-[inset_0_2px_12px_rgba(15,23,42,0.06)] border border-slate-100 dark:border-white/10 dark:shadow-[inset_0_2px_12px_rgba(255,255,255,0.05)] bg-slate-50">
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
                                  ? t('ai_planner.analyzing_places', 'AI 正在分析景點')
                                  : t('ai_planner.loading_map', '正在載入地圖資料')}
                              </p>
                              <p className="text-xs font-bold text-slate-500 mt-1">
                                {t('str_2371cd35')}</p>
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
          <button
            aria-label={t('str_43c2fe22')}
            onClick={handleInviteCollaborators}
            className="p-1 rounded-full bg-white/30 backdrop-blur-xl border border-white/60 shadow-2xl ios-press transition-all shadow-indigo-200/50"
          >
            <div className="bg-gradient-to-tr from-indigo-500 to-sky-500 w-12 h-12 rounded-full flex items-center justify-center shadow-inner text-white relative">
              <UserPlus size={22} className="drop-shadow-sm" />
            </div>
          </button>
          {!loading && favorites.length > 0 && (
            <button
              aria-label={`口袋名單 (${favorites.length} 個景點)`}
              onClick={() => setShowMobileFavorites(true)}
              className="p-1 rounded-full bg-white/30 backdrop-blur-xl border border-white/60 shadow-2xl ios-press transition-all group overflow-hidden shadow-fuchsia-200/50 relative"
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
            aria-label={t('str_2c99e34b')}
            onClick={() => setIsPlanningNew(true)}
            className="p-1 rounded-full bg-white/30 backdrop-blur-xl border border-white/60 text-white shadow-2xl ios-press transition-all group overflow-hidden shadow-pink-200/50"
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
                className="fixed bottom-0 left-0 right-0 w-full max-h-[85vh] bg-white dark:bg-slate-950 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-sheet-above flex flex-col lg:hidden dark-transition border-t border-white/5"
              >
                <div className="shrink-0 p-6 pb-2 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-t-[32px] sticky top-0 z-10 dark-transition">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-3xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-500 shadow-sm border border-fuchsia-100/50">
                      <Bookmark size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-slate-800 tracking-tight">
                        {t('str_282d1249')}</h3>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                        Saved Spots
                      </p>
                    </div>
                  </div>
                  <button
                    aria-label={t('str_1ce46ef6')}
                    onClick={() => setShowMobileFavorites(false)}
                    className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
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
                        aria-label={t('str_43315073')}
                        className="w-11 h-11 shrink-0 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center ios-press transition-all text-xl shadow-sm"
                      >
                        <IconImg value={newSpotEmoji} size={20} />
                      </button>
                      <input
                        value={newSpotTitle}
                        onChange={(e) => setNewSpotTitle(e.target.value)}
                        placeholder={t('str_7ae1c22f')}
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
                        className="w-11 h-11 shrink-0 rounded-xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-30 ios-press transition-all shadow-sm"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    {showEmojiPicker && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-slate-200 shadow-md overflow-y-auto max-h-[88px] no-scrollbar">
                        {EMOJI_OPTIONS.map((em) => (
                          <button
                            key={em}
                            onClick={() => {
                              setNewSpotEmoji(em);
                              setShowEmojiPicker(false);
                            }}
                            className="w-11 h-11 flex items-center justify-center hover:bg-pink-50 rounded-lg transition-all text-base"
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
          {contextualLoginPrompt.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
              onClick={() => setContextualLoginPrompt({ show: false, itemName: '' })}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-white border border-white/50 rounded-[32px] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.15)] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-indigo-400 to-pink-400 opacity-80" />
                <button
                  onClick={() => setContextualLoginPrompt({ show: false, itemName: '' })}
                  className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors z-10"
                >
                  <X size={16} />
                </button>
                <div className="flex flex-col items-center text-center mt-2">
                  <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mb-5 border border-sky-100 shadow-sm relative">
                     <span className="absolute -top-1 -right-1 text-2xl">✨</span>
                    <Sparkles size={28} className="text-sky-500" strokeWidth={2} />
                  </div>
                  <h2 className="text-[22px] font-black text-slate-800 mb-2 font-display leading-tight">
                    {t('str_53a4f099')}<br/>{t('str_2adc50ff')}</h2>
                  <p className="text-[13.5px] font-medium text-slate-500 leading-relaxed mb-8">
                    {t('str_7d1a3e4a')}<span className="text-sky-600 font-bold bg-sky-50 px-1 rounded">{contextualLoginPrompt.itemName}</span>。<br/>{t('str_5df399b0')}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setContextualLoginPrompt({ show: false, itemName: '' });
                      window.dispatchEvent(new CustomEvent('request-login'));
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 shadow-md shadow-indigo-200 text-white font-bold text-[15px] transition-all ios-press"
                  >
                    {t('str_4ed4b27a')}</button>
                  <button
                    onClick={() => setContextualLoginPrompt({ show: false, itemName: '' })}
                    className="w-full py-3.5 px-6 rounded-2xl bg-slate-50 text-slate-600 font-bold text-[15px] hover:bg-slate-100 transition-colors ios-press"
                  >
                    {t('str_2a28a1aa')}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {previewImageUrl && (
            <ImagePreviewModal
              imageUrl={previewImageUrl}
              onClose={() => setPreviewImageUrl(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showInviteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
              onClick={() => setShowInviteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[32px] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.15)] relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 via-indigo-400 to-sky-400 opacity-80" />
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors z-10"
                >
                  <X size={16} />
                </button>
                <div className="relative">
                  <div className="w-16 h-16 rounded-[24px] bg-[linear-gradient(135deg,#e0e7ff,#fae8ff)] dark:bg-[linear-gradient(135deg,#312e81,#701a75)] flex items-center justify-center mb-6 shadow-inner mx-auto transform -rotate-6 transition-transform">
                    <UserPlus size={28} className="text-indigo-500 dark:text-indigo-300" strokeWidth={2.5} />
                  </div>
                  <div className="absolute top-0 right-1/4 w-3 h-3 rounded-full bg-pink-400 shadow-[0_0_6px_#f472b6] hidden sm:block" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 text-center mb-3 tracking-tight">{t('str_1daa6def')}</h3>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-8 text-balance">
                  {t('str_2694a74d')}</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      sessionStorage.setItem('postLoginAction', 'invite_collaborators');
                      setShowInviteModal(false);
                      window.dispatchEvent(new CustomEvent('request-login'));
                    }}
                    className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-[20px] font-black tracking-widest text-[13px] uppercase shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all ios-press flex items-center justify-center gap-2"
                  >
                    <span>{t('str_239a6e5f')}</span>
                    <Sparkles size={14} className="opacity-70" />
                  </button>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="w-full h-12 bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-[20px] font-bold text-[13px] transition-colors"
                  >
                    {t('str_251683b3')}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile bottom nav spacer */}
        <div className="h-28 md:hidden shrink-0" aria-hidden="true" />
      </div>
    </main>
  );
}

// ─── Collaborator Avatar with presence glow ──────────────────────────────────

// ─── Constants & Helpers ────────────────────────────────────────────────────────

const getCategoryStyle = (category: string) => {
    const { t } = useTranslation();
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

// ─── Draggable Favorite Spot ─────────────────────────────────────────────────

// ─── Itinerary List ───────────────────────────────────────────────────────────


// Using imported CalendarView component


// ─── Helpers ──────────────────────────────────────────────────────────────────


// ImagePreviewModal helper
