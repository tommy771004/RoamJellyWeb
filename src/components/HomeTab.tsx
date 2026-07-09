import { useTranslation } from 'react-i18next';
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from "motion/react";
import {
  Bell,
  BellRing,
  Heart,
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  LayoutGrid,
  List,
  PlaneTakeoff,
  Sparkles,
  ArrowRight,
  Copy,
  Globe,
  ExternalLink,
  Bed,
  Ticket,
  CarFront,
  Rss,
  Mail,
  CheckSquare,
  Share2,
  Eye,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import GlassCard from "./GlassCard";
import EditorialSectionIntro from "./EditorialSectionIntro";
import ExpandableText from "./ExpandableText";
import HorizontalScrollRail from "./HorizontalScrollRail";
import { FlightSkeletonCard } from "./SkeletonCard";
import {
  searchOffers,
  SearchServiceUnavailableError,
  SearchTimeoutError,
  fetchHandbooks,
  getDealsFeed,
  getDestinationAlerts,
  createTripFact,
  syncItinerary,
  fetchUserSubscriptions,
  toggleUserSubscription,
  trackClickOut,
} from "../lib/workflowApi";
import {
  buildTripComFlightUrl,
  buildTripComHotelUrl,
  buildSkyscannerUrl,
  buildTravelpayoutsUrl,
  buildAgodaUrl,
  buildBookingComUrl,
  buildKlookUrl,
  buildKkdayUrl,
  buildGetYourGuideUrl,
  buildViatorUrl,
} from "../config/affiliateConfig";
import { useSearchStore } from "../store/useSearchStore";
import { useAppStore } from "../store/useAppStore";
import { useItineraryStore } from "../store/useItineraryStore";
import { useHideNavOnScroll } from "../hooks/useHideNavOnScroll";
import type { SearchItem, SyncItineraryPayload } from "../types/workflow";
import {
  TRAVEL_GUIDE_DESTINATIONS,
  TRAVEL_GUIDE_REGIONS,
  TRAVEL_GUIDE_SOURCE_REPO,
  matchTravelDestinations,
  type TravelGuideDestination,
} from "../data/travelGuideDestinations";
import { LocationPickerPopup } from "./LocationPickerPopup";
import CountryGuideModal from "./CountryGuideModal";
import ExpertHandbookModal from "./ExpertHandbookModal";
import InfoPeekModal, { type InfoPeekContent } from "./InfoPeekModal";
import { getCountryGuide } from "../data/countryGuideData";
import type { CountryGuide } from "../data/countryGuideData";
import { EXPERT_HANDBOOKS } from "../data/expertHandbooks";
import DatePickerPopup from "./DatePickerPopup";
import { triggerHapticFeedback } from "../lib/haptics";
import { extractAirportCode, getIataCode, getSafetyStatus } from "../lib/airport";
import AirlineLogo from "./AirlineLogo";
import FlightCard from "./FlightCard";
import FlightTable from "./FlightTable";
import DestinationCard from "./DestinationCard";
import PortfolioSection from "./PortfolioSection";
import {
  layoutIndicatorTransition,
  pressableSurfaceClass,
  raisedHoverClass,
  subtlePressableClass,
} from "../lib/motionTokens";
import { GlowingIcon } from "./ui/GlowingIcon";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type RoundTripLegView = "outbound" | "return";

const CARD_STICKER_TONES = [
  "border-pink-100 bg-pink-50/95 text-pink-700",
  "border-sky-100 bg-sky-50/95 text-sky-700",
  "border-teal-100 bg-teal-50/95 text-teal-700",
  "border-purple-100 bg-purple-50/95 text-purple-700",
] as const;

const FEATURED_CARD_DECOR = [
  {
    body: "editorial-card",
    glow: "bg-pink-200/45",
    cta: "from-pink-400 via-rose-400 to-orange-400 hover:from-pink-500 hover:via-rose-400 hover:to-orange-500",
  },
  {
    body: "editorial-card",
    glow: "bg-teal-200/45",
    cta: "from-teal-400 via-emerald-400 to-sky-400 hover:from-teal-500 hover:via-emerald-400 hover:to-sky-500",
  },
  {
    body: "editorial-card",
    glow: "bg-sky-200/45",
    cta: "from-sky-400 via-blue-400 to-indigo-400 hover:from-sky-500 hover:via-blue-400 hover:to-indigo-500",
  },
] as const;

const HANDBOOK_CARD_DECOR = [
  {
    body: "editorial-card-soft",
    glow: "bg-pink-200/45",
    badge: "border-pink-100 bg-pink-50/95 text-pink-700",
    cta: "from-pink-400 via-rose-300 to-orange-300 hover:from-pink-500 hover:via-rose-300 hover:to-orange-400",
  },
  {
    body: "editorial-card-soft",
    glow: "bg-teal-200/45",
    badge: "border-teal-100 bg-teal-50/95 text-teal-700",
    cta: "from-teal-400 via-emerald-300 to-sky-300 hover:from-teal-500 hover:via-emerald-300 hover:to-sky-400",
  },
  {
    body: "editorial-card-soft",
    glow: "bg-sky-200/45",
    badge: "border-sky-100 bg-sky-50/95 text-sky-700",
    cta: "from-sky-400 via-blue-300 to-indigo-300 hover:from-sky-500 hover:via-blue-300 hover:to-indigo-400",
  },
] as const;

const FEATURED_DESTINATIONS = [
  {
    id: "jp",
    name: "日本",
    flag: "🇯🇵",
    image:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop",
    description:
      "東亞島國，以獨特文化、精緻料理與多彩自然景觀聞名。從千年古剎到繁華都會，橫跨北海道到九州八大地域，每個角落都值得深度探索。",
    tags: ["文化", "美食", "自然"],
    highlights: ["🗾 八大地域", "🌸 賞花勝地", "🍜 料理天堂", "🚅 JR 周遊券"],
    guideUrl: "https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/",
  },
  {
    id: "np",
    name: "尼泊爾",
    flag: "🇳🇵",
    image:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600&auto=format&fit=crop",
    description:
      "喜馬拉雅山脈的故鄉，擁有世界最高峰聖母峰。融合豐富宗教文化與壯麗高山景觀，是登山健行與靈性旅行的聖地。",
    tags: ["登山", "文化", "冒險"],
    highlights: ["🏔️ 世界屋脊", "🕌 加德滿都", "🥾 健行天堂", "🌿 自然生態"],
    guideUrl: "https://travel-guide-tw.github.io/%E5%B0%BC%E6%B3%8A%E7%88%BE/",
  },
  {
    id: "no",
    name: "挪威",
    flag: "🇳🇴",
    image:
      "https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=600&auto=format&fit=crop",
    description:
      "北歐峽灣之國，壯闊的極光與冰川雕刻的峽灣地貌令人嘆為觀止。特羅姆瑟是追尋極光的最佳基地，峽灣巡遊更是一生必訪體驗。",
    tags: ["極光", "峽灣", "自然"],
    highlights: ["🌌 北極光", "🏔️ 峽灣奇景", "❄️ 特羅姆瑟", "🦌 馴鹿體驗"],
    guideUrl: "https://travel-guide-tw.github.io/%E6%8C%AA%E5%A8%81/",
  },
  {
    id: "ch",
    name: "瑞士",
    flag: "🇨🇭",
    image:
      "https://images.unsplash.com/photo-1502784444187-359ac186c5bb?w=600&auto=format&fit=crop",
    description:
      "歐洲心臟，由 26 個州組成。阿爾卑斯山脈、瑞士高原與侏羅山構成壯麗地貌，精緻鐘錶工藝與多語言文化造就獨特魅力。",
    tags: ["阿爾卑斯", "精品", "自然"],
    highlights: ["🏔️ 阿爾卑斯山", "🕰️ 鐘錶工藝", "🧀 起司美食", "🚂 登山列車"],
    guideUrl: "https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/",
  },
];

const HomeTabContentFocusBlock = ({ children, containerRef, className }: { children: React.ReactNode, containerRef: React.RefObject<HTMLDivElement | null>, className?: string }) => {
    const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    container: containerRef,
    // 進入和退出時各自保留一定緩衝區，延長聚焦範圍
    offset: ["start 95%", "end 5%"]
  });
  
  // 透明度變化：捲動邊緣稍微淡出 (0.7)，中間完全可視 (1)
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.7, 1, 1, 0.7]);
  // 模糊效果：邊緣微弱模糊 (2.5px)，中間清晰 (0px)，保持精緻感
  const blurValue = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [2.5, 0, 0, 2.5]);
  const filter = useTransform(blurValue, v => prefersReducedMotion ? "none" : `blur(${v}px)`);
  // 縮放變化：邊緣極微小縮小 (0.975)，中間正常 (1)
  const scale = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.975, 1, 1, 0.975]);

  return (
    <motion.div ref={ref} style={{ opacity, filter, scale }} className={className}>
      {children}
    </motion.div>
  );
};

export default function HomeTab({
  onRequireLogin,
  isLoggedIn,
}: {
  onRequireLogin?: () => void;
  isLoggedIn?: boolean;
}) {
  const { t, i18n } = useTranslation();

  const localizedExpertHandbooks = useMemo(() => {
    if (i18n.language === 'zh') return EXPERT_HANDBOOKS;
    return EXPERT_HANDBOOKS.map((handbook) => ({
      ...handbook,
      title: t(`expert_handbook.${handbook.id}.title`, handbook.title),
      author: t(`expert_handbook.${handbook.id}.author`, handbook.author),
      tags: handbook.tags.map((tag, idx) => 
        t(`expert_handbook.${handbook.id}.tags.${idx}`, tag)
      ),
      cities: handbook.cities.map((city, idx) => ({
        ...city,
        name: t(`expert_handbook.${handbook.id}.cities.${idx}.name`, city.name),
        reason: t(`expert_handbook.${handbook.id}.cities.${idx}.reason`, city.reason)
      })),
      nodes: handbook.nodes.map((node) => ({
        ...node,
        title: t(`expert_handbook.${handbook.id}.nodes.${node.node_id}.title`, node.title),
        description: t(`expert_handbook.${handbook.id}.nodes.${node.node_id}.description`, node.description)
      }))
    }));
  }, [t, i18n.language]);

  const localizedFeaturedDestinations = useMemo(() => {
    return FEATURED_DESTINATIONS.map((dest) => ({
      ...dest,
      name: t(`featured_destinations.${dest.id}.name`, dest.name),
      description: t(`featured_destinations.${dest.id}.description`, dest.description),
      tags: dest.tags.map((tag, idx) => t(`featured_destinations.${dest.id}.tags.${idx}`, tag)),
      highlights: dest.highlights.map((hl, idx) => t(`featured_destinations.${dest.id}.highlights.${idx}`, hl)),
    }));
  }, [t]);

  const {
    searchForm,
    updateField,
    results,
    setResults,
    loading,
    setLoading,
    searchError,
    setSearchError,
    savedItems,
    toggleSave,
    trackedPrices,
    toggleTrack,
  } = useSearchStore();
  const {
    openRedirectModal,
    isOffline,
    showToast,
    setActiveTab,
    activeTripId,
  } = useAppStore();

  const [dateError, setDateError] = useState<string | null>(null);
  const [showDeparturePicker, setShowDeparturePicker] =
    useState<boolean>(false);
  const [showDestinationPicker, setShowDestinationPicker] =
    useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showReturnDatePicker, setShowReturnDatePicker] =
    useState<boolean>(false);

  const [flyingCard, setFlyingCard] = useState<{
    id: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
    handbook?: any;
  } | null>(null);
  const [activeGuide, setActiveGuide] = useState<CountryGuide | null>(null);
  const [activeHandbook, setActiveHandbook] = useState<
    (typeof EXPERT_HANDBOOKS)[0] | null
  >(null);
  const [activeStoryInfo, setActiveStoryInfo] = useState<InfoPeekContent | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isHeroIntroCollapsed, setIsHeroIntroCollapsed] = useState<boolean>(true);
  const [isHeroExpanded, setIsHeroExpanded] = useState<boolean>(true);
  
  const [newsFeed, setNewsFeed] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [destinationAlerts, setDestinationAlerts] = useState<any[]>([
    { name: "東京 Tokyo", code: "NRT", image: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=300&q=80", price: "登入後更新", health: "💡 可訂閱", advisory: "登入後開啟即時優惠與目的地警示。", tagColor: "bg-slate-50 text-slate-700 font-extrabold" },
    { name: "大阪 Osaka", code: "KIX", image: "https://images.unsplash.com/photo-1590253187631-6f9aa4563a57?auto=format&fit=crop&w=300&q=80", price: "登入後更新", health: "💡 可訂閱", advisory: "登入後開啟即時優惠與目的地警示。", tagColor: "bg-slate-50 text-slate-700 font-extrabold" },
    { name: "台北 Taipei", code: "TPE", image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=300&q=80", price: "登入後更新", health: "💡 可訂閱", advisory: "登入後開啟即時優惠與目的地警示。", tagColor: "bg-slate-50 text-slate-700 font-extrabold" },
    { name: "倫敦 London", code: "LHR", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=300&q=80", price: "登入後更新", health: "💡 可訂閱", advisory: "登入後開啟即時優惠與目的地警示。", tagColor: "bg-slate-50 text-slate-700 font-extrabold" },
  ]);

  useEffect(() => {
    async function loadNews() {
      setNewsLoading(true);
      try {
        const [newsData, alertsData] = await Promise.all([
          getDealsFeed({ query: '旅遊 促銷 機票 優惠' }),
          getDestinationAlerts()
        ]);
        if (newsData && newsData.length > 0) {
          setNewsFeed(newsData);
        }
        if (alertsData && alertsData.length > 0) {
          setDestinationAlerts(alertsData);
        }
      } catch (err) {
        console.error('Failed to load dynamic data:', err);
      } finally {
        setNewsLoading(false);
      }
    }
    loadNews();
  }, []);
  const [searchProgress, setSearchProgress] = useState(0);
  const [progressMsgIdx, setProgressMsgIdx] = useState(0);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { onScroll } = useHideNavOnScroll();

  const [showFlightsDropdown, setShowFlightsDropdown] = useState(false);
  const [zoomedFlightsIndex, setZoomedFlightsIndex] = useState<number | null>(null);
  const flightDropdownRef = useRef<HTMLDivElement>(null);
  const flightMenuContentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<any>(null);

  const [showHotelsDropdown, setShowHotelsDropdown] = useState(false);
  const [zoomedHotelsIndex, setZoomedHotelsIndex] = useState<number | null>(null);
  const hotelDropdownRef = useRef<HTMLDivElement>(null);
  const hotelMenuContentRef = useRef<HTMLDivElement>(null);
  const hotelHoverTimeout = useRef<any>(null);

  const [showTicketsDropdown, setShowTicketsDropdown] = useState(false);
  const [zoomedTicketsIndex, setZoomedTicketsIndex] = useState<number | null>(null);
  const ticketDropdownRef = useRef<HTMLDivElement>(null);
  const ticketMenuContentRef = useRef<HTMLDivElement>(null);
  const ticketHoverTimeout = useRef<any>(null);

  const [showTransfersDropdown, setShowTransfersDropdown] = useState(false);
  const [zoomedTransfersIndex, setZoomedTransfersIndex] = useState<number | null>(null);
  const transfersDropdownRef = useRef<HTMLDivElement>(null);
  const transfersMenuContentRef = useRef<HTMLDivElement>(null);
  const transfersHoverTimeout = useRef<any>(null);

  const chipsScrollContainerRef = useRef<HTMLDivElement>(null);
  const destsScrollRef = useRef<HTMLDivElement>(null);

  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 左右自動軌道式滾動效果 (Auto track scrolling back and forth)
  useEffect(() => {
    const el = destsScrollRef.current;
    if (!el) return;

    let direction = 1; // 1 = right, -1 = left
    let intervalId: any = null;
    let isHovered = false;

    const startScrolling = () => {
      intervalId = setInterval(() => {
        if (isHovered) return;
        
        // 取得最大可捲動寬度
        const maxScrollLeft = el.scrollWidth - el.clientWidth;
        if (maxScrollLeft <= 0) return;

        // 如果到最右邊則往左，到最左邊則往右
        if (el.scrollLeft >= maxScrollLeft - 1 && direction === 1) {
          direction = -1;
        } else if (el.scrollLeft <= 1 && direction === -1) {
          direction = 1;
        }

        el.scrollLeft += direction * 0.8; // 絲滑漸進慢速移動 0.8px
      }, 25);
    };

    const handleMouseEnter = () => {
      isHovered = true;
    };

    const handleMouseLeave = () => {
      isHovered = false;
    };

    const handleTouchStart = () => {
      isHovered = true;
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        isHovered = false;
      }, 1500); // 觸碰結束 1.5 秒後，恢復自動左右軌道滾動
    };

    startScrolling();

    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      if (intervalId) clearInterval(intervalId);
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      
      const insideFlightBtn = flightDropdownRef.current && flightDropdownRef.current.contains(target);
      const insideFlightMenu = flightMenuContentRef.current && flightMenuContentRef.current.contains(target);
      if (!insideFlightBtn && !insideFlightMenu) {
        setShowFlightsDropdown(false);
        setZoomedFlightsIndex(null);
      }

      const insideHotelBtn = hotelDropdownRef.current && hotelDropdownRef.current.contains(target);
      const insideHotelMenu = hotelMenuContentRef.current && hotelMenuContentRef.current.contains(target);
      if (!insideHotelBtn && !insideHotelMenu) {
        setShowHotelsDropdown(false);
        setZoomedHotelsIndex(null);
      }

      const insideTicketBtn = ticketDropdownRef.current && ticketDropdownRef.current.contains(target);
      const insideTicketMenu = ticketMenuContentRef.current && ticketMenuContentRef.current.contains(target);
      if (!insideTicketBtn && !insideTicketMenu) {
        setShowTicketsDropdown(false);
        setZoomedTicketsIndex(null);
      }

      const insideTransfersBtn = transfersDropdownRef.current && transfersDropdownRef.current.contains(target);
      const insideTransfersMenu = transfersMenuContentRef.current && transfersMenuContentRef.current.contains(target);
      if (!insideTransfersBtn && !insideTransfersMenu) {
        setShowTransfersDropdown(false);
        setZoomedTransfersIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // ─── 平台列表 — URL 由 src/config/affiliateConfig.ts 統一管理 ───
  const FLIGHT_PLATFORMS = useMemo(() => [
    {
      name: "Trip.com 攜程機票",
      badge: "最推薦 ✨",
      logoColor: "from-blue-500 to-sky-400",
      category: "flights" as const,
      url: buildTripComFlightUrl(),
    },
    {
      name: "Skyscanner 比價機票",
      badge: "流量王 ✦",
      logoColor: "from-teal-400 to-emerald-400",
      category: "flights" as const,
      url: buildSkyscannerUrl(),
    },
    {
      name: "Travelpayouts 旅遊聚合",
      badge: "優選 ✦",
      logoColor: "from-pink-500 to-rose-400",
      category: "flights" as const,
      url: buildTravelpayoutsUrl(),
    }
  ], []);

  const HOTEL_PLATFORMS = useMemo(() => [
    {
      name: "Agoda 雅高達訂房",
      badge: "亞洲首選 ✨",
      logoColor: "from-purple-500 to-pink-500",
      category: "hotels" as const,
      url: buildAgodaUrl(),
    },
    {
      name: "Booking.com 繽客訂房",
      badge: "房源最多 ✦",
      logoColor: "from-blue-600 to-sky-500",
      category: "hotels" as const,
      url: buildBookingComUrl(),
    },
    {
      name: "Trip.com 攜程訂房",
      badge: "高額回饋 ✦",
      logoColor: "from-teal-500 to-emerald-400",
      category: "hotels" as const,
      url: buildTripComHotelUrl(),
    }
  ], []);

  const TICKET_PLATFORMS = useMemo(() => [
    {
      name: "Klook 客路門票",
      badge: "亞洲首選 ✨",
      logoColor: "from-orange-500 to-amber-500",
      category: "tickets" as const,
      url: buildKlookUrl('', 'nav-tickets'),
    },
    {
      name: "KKday 觀光行程",
      badge: "在地深度 ✦",
      logoColor: "from-cyan-400 to-sky-500",
      category: "tickets" as const,
      url: buildKkdayUrl('', 'nav-tickets'),
    },
    {
      name: "GetYourGuide 體驗",
      badge: "歐美最熱 ✦",
      logoColor: "from-orange-600 to-yellow-500",
      category: "tickets" as const,
      url: buildGetYourGuideUrl(),
    },
    {
      name: "Viator 國外景點",
      badge: "全球最大 ✦",
      logoColor: "from-emerald-600 to-teal-500",
      category: "tickets" as const,
      url: buildViatorUrl(),
    }
  ], []);

  const TRANSFERS_PLATFORMS = useMemo(() => [
    {
      name: "Klook 機場接送",
      badge: "專車/共享 🚗",
      logoColor: "from-orange-500 to-amber-500",
      category: "transfers" as const,
      url: buildKlookUrl('activity/987-taoyuan-airport-transfers-taipei/', 'nav-transfers'),
    },
    {
      name: "KKday 機場/包車接駁",
      badge: "優質司機 ✦",
      logoColor: "from-cyan-400 to-sky-500",
      category: "transfers" as const,
      url: buildKkdayUrl('product/productlist?page=1&keyword=%E6%A9%9F%E5%A0%B4%E6%8E%A5%E9%80%81', 'nav-transfers'),
    },
    {
      name: "Tripool 旅步專車",
      badge: "回頭車划算 ✦",
      logoColor: "from-blue-600 to-indigo-500",
      category: "transfers" as const,
      url: "https://www.tripool.app/",
    },
    {
      name: "Gleefultour 快活兔車隊",
      badge: "合法安全 ✦",
      logoColor: "from-rose-500 to-red-400",
      category: "transfers" as const,
      url: "https://www.gleefultour.com/",
    }
  ], []);

  const HOT_DESTINATIONS = useMemo(() => [
    // 亞洲
    { name: "東京", flag: "🇯🇵" },
    { name: "大阪", flag: "🇯🇵" },
    { name: "首爾", flag: "🇰🇷" },
    { name: "釜山", flag: "🇰🇷" },
    { name: "曼谷", flag: "🇹🇭" },
    { name: "清邁", flag: "🇹🇭" },
    { name: "新加坡", flag: "🇸🇬" },
    { name: "吉隆坡", flag: "🇲🇾" },
    { name: "香港", flag: "🇭🇰" },
    { name: "澳門", flag: "🇲🇴" },
    // 歐洲
    { name: "巴黎", flag: "🇫🇷" },
    { name: "倫敦", flag: "🇬🇧" },
    // 美洲
    { name: "紐約", flag: "🇺🇸" },
    { name: "洛杉磯", flag: "🇺🇸" },
    // 大洋洲
    { name: "雪梨", flag: "🇦🇺" },
    { name: "奧克蘭", flag: "🇳🇿" },
    // 中東
    { name: "杜拜", flag: "🇦🇪" },
    { name: "伊斯坦堡", flag: "🇹🇷" }
  ], []);

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      setLoadingSubscriptions(true);
      fetchUserSubscriptions()
        .then((data) => {
          setSubscriptions(data || []);
        })
        .catch((err) => {
          console.error("fetchSubscriptions error", err);
        })
        .finally(() => setLoadingSubscriptions(false));
    } else {
      setSubscriptions([]);
    }
  }, [isLoggedIn]);

  const handleToggleSubscription = async (destination: string, channel: string) => {
    if (!isLoggedIn) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    try {
      const res = await toggleUserSubscription(destination, channel);
      if (res?.status === 'success') {
        const updated = await fetchUserSubscriptions();
        setSubscriptions(updated || []);
        
        const isSubscribed = res.data?.status === 'subscribed' || res.data?.data?.id !== undefined || res.data?.status !== 'unsubscribed';
        showToast(
          isSubscribed 
            ? `🎉 已成功訂閱 ${destination} 的「${channel === 'web-push' ? '網頁即時推送' : '電子信箱/RSS 快訊'}」！` 
            : `🔕 已取消 ${destination} 的「${channel === 'web-push' ? '網頁即時推送' : '電子信箱/RSS 快訊'}」訂閱。`,
          'success'
        );

        if (isSubscribed && channel === 'web-push') {
          if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              new Notification('Jelly AI 果凍機票優惠與警報速報 🍮', {
                body: `您已成功開啟【${destination}】的即時推送通知！我們將持續為您追蹤最殺優惠與重要旅遊安全警報。`,
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast('切換訂閱失敗，請稍後再試。', 'warning');
    }
  };

  const SEARCH_LOADING_MESSAGES = [
    "搜尋航班中...",
    "比較多家票價...",
    "篩選最優惠...",
    "整理結果中...",
  ];

  useEffect(() => {
    if (!loading) {
      if (searchProgress > 0) {
        setSearchProgress(100);
        const t = setTimeout(() => setSearchProgress(0), 500);
        return () => clearTimeout(t);
      }
      return;
    }
    setSearchProgress(0);
    setProgressMsgIdx(0);
    const progressInterval = setInterval(() => {
      setSearchProgress((prev) => {
        if (prev < 30) return prev + 4;
        if (prev < 60) return prev + 1.8;
        if (prev < 82) return prev + 0.6;
        return Math.min(prev + 0.08, 92);
      });
    }, 120);
    const msgInterval = setInterval(() => {
      setProgressMsgIdx((prev) => (prev + 1) % SEARCH_LOADING_MESSAGES.length);
    }, 2000);
    return () => {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (!loading && hasSearched) setIsHeroExpanded(false);
  }, [loading]);

  const cardSurfaceClass = `${pressableSurfaceClass} ${raisedHoverClass} shadow-sm sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10`;
  const cardActionClass = `${subtlePressableClass} ${raisedHoverClass}`;
  const searchFieldSurfaceClass = `${pressableSurfaceClass} hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] hover:bg-white/80 dark:hover:bg-slate-800/80 bg-white/50 dark:bg-slate-900/40 ring-1 ring-slate-200/50 dark:ring-slate-700/50`;
  const chipPressClass = `${subtlePressableClass} ${raisedHoverClass}`;

  const handleCopyExpertItinerary = (
    e: React.MouseEvent | undefined,
    handbook: (typeof EXPERT_HANDBOOKS)[0],
  ) => {
    e?.stopPropagation?.();

    if (!isLoggedIn) {
      if (onRequireLogin) {
        onRequireLogin();
      } else {
        showToast("請先登入後再進行此操作", "warning");
      }
      return;
    }

    // Get card position for animation start
    const cardElement = e?.currentTarget
      ? (e.currentTarget as HTMLElement).closest(".group\\/handbook")
      : null;
    const rect = cardElement
      ? cardElement.getBoundingClientRect()
      : e?.currentTarget
        ? (e.currentTarget as HTMLElement).getBoundingClientRect()
        : {
            left: window.innerWidth / 2 - 140,
            top: window.innerHeight / 2 - 80,
            width: 280,
            height: 160,
          };
    setFlyingCard({
      id: Date.now(),
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      width: rect.width || 320,
      height: rect.height || 380,
      handbook,
    });

    // Reset animation after it finishes
    setTimeout(async () => {
      setFlyingCard(null);

      try {
        const { useItineraryStore } =
          await import("../store/useItineraryStore");
        const { useAppStore } = await import("../store/useAppStore");
        const { syncItinerary, createTrip } =
          await import("../lib/workflowApi");
        const { setNodes, addNode } = useItineraryStore.getState();
        const { activeTripId, setActiveTripId, setActiveTab } =
          useAppStore.getState();

        // Always create a new trip for expert handbooks to avoid mixing nodes into an existing trip
        const newTrip = await createTrip({
          name: `${handbook.title} (複製)`,
          destination: handbook.tags[0] || "指定地點",
        });
        const newTripId = String(newTrip.id);
        const ensuredTripId = newTripId;

        if (handbook.nodes && handbook.nodes.length) {
          setNodes([]);
          let nodeIdx = 0;
          const normalized = handbook.nodes.map(
            (rawNode: any) => {
              const currentIdx = ++nodeIdx;
              const suffix = `${Date.now()}_${currentIdx}_${Math.random().toString(36).substring(2, 10)}`;
              return {
                ...rawNode,
                node_id: `node_expert_${suffix}`,
                id: `node_expert_${suffix}`,
                sort_order: currentIdx,
                source: "local"
              } as any;
            }
          );
          normalized.forEach((n: any) => addNode(n));
          
          const results = await Promise.allSettled(
            normalized.map((n: any) =>
              syncItinerary({
                trip_id: ensuredTripId,
                action: "add_node",
                payload: n,
              } as any),
            ),
          );
          if (results.some((r) => r.status === "rejected")) {
            setNodes(
              normalized.filter(
                (_: any, i: number) => results[i].status === "fulfilled",
              ),
            );
            throw new Error("clone sync failed");
          }
        }

        showToast(`已成功將 ${handbook.title} 複製到您的行程！`, "success");
        setActiveTripId(ensuredTripId);
        setActiveTab("itinerary");
      } catch (err) {
        showToast("複製行程失敗", "warning");
      }
    }, 1200); // 1.2s to match animation duration
  };

  const [communityTrips, setCommunityTrips] = useState<any[]>([]);
  const [viewType, setViewType] = useState<"grid" | "table">("table");
  const [roundTripLegView, setRoundTripLegView] =
    useState<RoundTripLegView>("outbound");
  const [filterType, setFilterType] = useState<
    "all" | "flight" | "ticket" | "other"
  >("all");
  const [sortType, setSortType] = useState<"recommended" | "cheapest" | "fastest">("recommended");

  const normalizedResults = useMemo(
    () =>
      results.map((item) => {
        if (item.type !== "flight") return item;

        const isReturnLeg = item.legType === "return";
        const fallbackDepCode = extractAirportCode(
          isReturnLeg ? searchForm.to : searchForm.from,
        );
        const fallbackArrCode = extractAirportCode(
          isReturnLeg ? searchForm.from : searchForm.to,
        );

        return {
          ...item,
          details: {
            ...(item.details ?? {}),
            depCode: item.details?.depCode || fallbackDepCode,
            arrCode: item.details?.arrCode || fallbackArrCode,
          },
        };
      }),
    [results, searchForm.from, searchForm.to],
  );

  const typeFilteredResults = useMemo(() => {
    if (filterType === "all") return normalizedResults;
    return normalizedResults.filter((result) => result.type === filterType);
  }, [normalizedResults, filterType]);

  const hasRoundTripLegMenu = useMemo(
    () =>
      searchForm.tripType === "roundtrip" &&
      typeFilteredResults.some(
        (result) =>
          result.legType === "outbound" || result.legType === "return",
      ),
    [searchForm.tripType, typeFilteredResults],
  );

  const roundTripLegCounts = useMemo(
    () => ({
      outbound: typeFilteredResults.filter(
        (result) => result.legType === "outbound",
      ).length,
      return: typeFilteredResults.filter(
        (result) => result.legType === "return",
      ).length,
    }),
    [typeFilteredResults],
  );

  const sortingStats = useMemo(() => {
    let list = typeFilteredResults;
    if (hasRoundTripLegMenu) {
      list = typeFilteredResults.filter(
        (result) => result.legType === roundTripLegView,
      );
    }
    if (list.length === 0) return null;

    const parseDuration = (dur: string) => {
      let totalMinutes = 0;
      const hMatch = dur.match(/(\d+)h/i);
      const mMatch = dur.match(/(\d+)m/i);
      if (hMatch) totalMinutes += parseInt(hMatch[1], 10) * 60;
      if (mMatch) totalMinutes += parseInt(mMatch[1], 10);
      return totalMinutes;
    };

    let cheapest = list[0].price;
    let fastestMin = parseDuration(list[0].details?.duration || "10h");
    let fastestDurString = list[0].details?.duration || "--";

    list.forEach(item => {
      if (item.price < cheapest) cheapest = item.price;
      const dur = parseDuration(item.details?.duration || "10h");
      if (dur < fastestMin) {
        fastestMin = dur;
        fastestDurString = item.details?.duration || "--";
      }
    });

    return {
      cheapest,
      fastestDurString
    };
  }, [hasRoundTripLegMenu, roundTripLegView, typeFilteredResults]);

  const filteredResults = useMemo(() => {
    let list = typeFilteredResults;
    if (hasRoundTripLegMenu) {
      list = typeFilteredResults.filter(
        (result) => result.legType === roundTripLegView,
      );
    }
    
    // Sort logic
    return [...list].sort((a, b) => {
      // cheapest: lowest price first
      if (sortType === "cheapest") {
        return a.price - b.price;
      }
      // fastest: shortest duration or stops
      if (sortType === "fastest") {
        const parseDuration = (dur: string) => {
          let totalMinutes = 0;
          const hMatch = dur.match(/(\d+)h/i);
          const mMatch = dur.match(/(\d+)m/i);
          if (hMatch) totalMinutes += parseInt(hMatch[1], 10) * 60;
          if (mMatch) totalMinutes += parseInt(mMatch[1], 10);
          return totalMinutes;
        };
        const durA = parseDuration(a.details?.duration || "10h");
        const durB = parseDuration(b.details?.duration || "10h");
        return durA - durB;
      }
      
      // recommended: balance of price and duration, maybe default order
      return 0; // retain original order or specific logic
    });
  }, [hasRoundTripLegMenu, roundTripLegView, typeFilteredResults, sortType]);

  useEffect(() => {
    if (!hasRoundTripLegMenu) {
      setRoundTripLegView("outbound");
      return;
    }

    if (
      typeFilteredResults.some((result) => result.legType === roundTripLegView)
    ) {
      return;
    }

    setRoundTripLegView(
      typeFilteredResults.some((result) => result.legType === "outbound")
        ? "outbound"
        : "return",
    );
  }, [hasRoundTripLegMenu, roundTripLegView, typeFilteredResults]);

  const demoTemplates = useMemo(() => EXPERT_HANDBOOKS.slice(0, 3), []);

  const resolveCurrentTripId = () =>
    activeTripId ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("trip_id")
      : "");

  useEffect(() => {
    // Initial fetch for handbooks
    const loadInitialData = async () => {
      try {
        const handbooks = await fetchHandbooks();
        setCommunityTrips(handbooks);
      } catch (e) {
        console.error("Failed to load initial data", e);
        showToast("熱門行程載入失敗，我們將盡快恢復服務", "warning");
      }
    };
    void loadInitialData();
  }, []);

  const handleCloneTrip = async (e: React.MouseEvent, trip: any) => {
    e.stopPropagation();
    triggerHapticFeedback([18]);

    if (!isLoggedIn && onRequireLogin) {
      onRequireLogin();
      return;
    }

    // Trigger animation
    const cardElement =
      (e.currentTarget as HTMLElement).closest(".group\\/trip") ||
      (e.currentTarget as HTMLElement);
    const rect = cardElement.getBoundingClientRect();
    setFlyingCard({
      id: Date.now(),
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      width: rect.width || 320,
      height: rect.height || 200,
      handbook: trip,
    });

    try {
      const { getStoredToken } = await import("../lib/workflowApi");
      const token = getStoredToken();
      const res = await fetch(`/api/trips/${trip.id}/clone`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      showToast(
        `已成功將行程 ${trip.name ?? trip.title ?? ""} 複製到您的行程！`,
        "success",
      );

      // Navigate to the newly cloned trip
      setTimeout(() => {
        useAppStore.getState().setActiveTripId(data.data.new_trip_id);
        setActiveTab("itinerary");
      }, 800);
    } catch {
      showToast("複製失敗", "warning");
    }
  };

  const applyGuideDestination = (
    destination: TravelGuideDestination,
    field: "from" | "to",
  ) => {
    // 根據選好的地方 僅顯示中文，不含任何英文縮寫或機場代碼
    const displayValue = destination.place;
    updateField(field, displayValue);
    if (field === "from") setShowDeparturePicker(false);
    if (field === "to") setShowDestinationPicker(false);
  };

  const selectDate = (dateStr: string) => {
    updateField("date", dateStr);
    setShowDatePicker(false);
    if (dateError) setDateError(null);
    // Auto-clear return date if it's before the new departure date
    if (searchForm.returnDate && dateStr > searchForm.returnDate) {
      updateField("returnDate", "");
    }
  };

  const selectReturnDate = (dateStr: string) => {
    updateField("returnDate", dateStr);
    setShowReturnDatePicker(false);
    if (dateError) setDateError(null);
  };

  const isSearchDisabled = useMemo(() => {
    if (
      !searchForm.from.trim() ||
      !searchForm.to.trim() ||
      !searchForm.date.trim()
    )
      return true;
    if (searchForm.tripType === "roundtrip" && !searchForm.returnDate.trim())
      return true;
    return false;
  }, [searchForm]);

  const searchBlockReason = useMemo(() => {
    if (isOffline) return "目前離線中，恢復連線後才能查詢即時票價。";
    if (!searchForm.from.trim()) return "先填寫出發地。";
    if (!searchForm.to.trim()) return "再補上目的地。";
    if (!searchForm.date.trim()) return "最後選擇去程日期。";
    if (searchForm.tripType === "roundtrip" && !searchForm.returnDate.trim())
      return "請選擇回程日期。";
    return null;
  }, [isOffline, searchForm]);

  const handleSearch = async () => {
    if (!DATE_REGEX.test(searchForm.date.trim())) {
      setDateError("日期格式需為 YYYY-MM-DD，例如 2025-08-01");
      return;
    }
    if (
      searchForm.tripType === "roundtrip" &&
      !DATE_REGEX.test(searchForm.returnDate.trim())
    ) {
      setDateError("回程日期格式需為 YYYY-MM-DD，例如 2025-08-08");
      return;
    }
    setDateError(null);
    setHasSearched(true);
    setLoading(true);
    setSearchError(null);
    try {
      const result = await searchOffers(searchForm);
      setResults(result);
    } catch (error) {
      if (error instanceof SearchTimeoutError) {
        setSearchError("timeout");
      } else if (error instanceof SearchServiceUnavailableError) {
        setSearchError("service");
      } else {
        setSearchError("service");
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toHHMM = (s: string | undefined) =>
    s?.match(/\d{1,2}:\d{2}/)?.[0] ?? "09:00";

  const handleImportFlight = async (flight: SearchItem) => {
    if (!isLoggedIn && onRequireLogin) {
      onRequireLogin();
      return;
    }

    const tripId = resolveCurrentTripId();
    if (!tripId) {
      showToast("請先開啟一趟旅程，再把航班帶入行程。", "warning");
      return;
    }

    try {
      const isReturnLeg = flight.legType === "return";
      const depCode =
        flight.details?.depCode ||
        (isReturnLeg ? searchForm.to?.trim() : searchForm.from?.trim()) ||
        "TPE";
      const arrCode =
        flight.details?.arrCode ||
        (isReturnLeg ? searchForm.from?.trim() : searchForm.to?.trim()) ||
        "NRT";
      const factDate =
        (isReturnLeg ? searchForm.returnDate?.trim() : searchForm.date?.trim()) ||
        searchForm.date?.trim() ||
        new Date().toISOString().slice(0, 10);
      const newFact = await createTripFact(tripId, {
        factType: isReturnLeg ? "flight_inbound" : "flight_outbound",
        source: "imported_search",
        title: `${flight.details?.airline || flight.provider} ${depCode} → ${arrCode}`,
        startAt: `${factDate}T${toHHMM(flight.details?.departure)}:00.000Z`,
        endAt: `${factDate}T${toHHMM(flight.details?.arrival) || "13:00"}:00.000Z`,
        locationName: arrCode,
        referenceCode: flight.details?.flightNumber || null,
        metadata: {
          airline: flight.details?.airline || flight.provider,
          depCode,
          arrCode,
          flightNumber: flight.details?.flightNumber,
          provider: flight.provider,
          bookingUrl: flight.bookingUrl || flight.affiliate_url,
          price: flight.price,
          currency: flight.currency,
        },
      });

      const payload: SyncItineraryPayload = {
        trip_id: tripId,
        action: "add_node",
        payload: {
          node_id: isReturnLeg
            ? `node_flight_return_${Date.now()}`
            : `node_flight_${Date.now()}`,
          day: isReturnLeg ? 2 : 1,
          date: factDate,
          time: toHHMM(flight.details?.departure),
          title: `${flight.details?.airline || flight.provider} 航班`,
          emoji: "✈️",
          category: "flight",
          description: `航班代號: ${flight.details?.flightNumber || "未知"}\n預定金額: ${flight.currency} ${flight.price}\n來源: ${flight.provider}`,
          linkedFactId: newFact?.id,
          source: "remote",
        },
      };
      // Update local store immediately so the node appears in the UI
      useItineraryStore.getState().addNode(payload.payload);

      try {
        await syncItinerary(payload);
      } catch {
        useItineraryStore.getState().removeNode(payload.payload.node_id);
        throw new Error("flight import sync failed");
      }

      // If roundtrip and return leg exists, create a second trip fact + node
      if (!isReturnLeg && flight.tripType === "roundtrip" && flight.returnLeg) {
        const retDate = searchForm.returnDate?.trim() || factDate;
        const retFact = await createTripFact(tripId, {
          factType: "flight_inbound",
          source: "imported_search",
          title: `${flight.returnLeg.airline || flight.provider} ${arrCode} → ${depCode}`,
          startAt: `${retDate}T${toHHMM(flight.returnLeg.departure)}:00.000Z`,
          endAt: `${retDate}T${toHHMM(flight.returnLeg.arrival) || "13:00"}:00.000Z`,
          locationName: depCode,
          referenceCode: null,
          metadata: {
            airline: flight.returnLeg.airline || flight.provider,
            depCode: arrCode,
            arrCode: depCode,
            provider: flight.provider,
            bookingUrl: flight.bookingUrl || flight.affiliate_url,
            price: flight.price,
            currency: flight.currency,
          },
        });

        const retPayload: SyncItineraryPayload = {
          trip_id: tripId,
          action: "add_node",
          payload: {
            node_id: `node_flight_return_${Date.now()}`,
            day: 2,
            date: retDate,
            time: toHHMM(flight.returnLeg.departure),
            title: `${flight.returnLeg.airline || flight.provider} 回程航班`,
            emoji: "🔄",
            category: "flight",
            description: `回程航班\n預定金額: ${flight.currency} ${flight.price}（來回合計）\n來源: ${flight.provider}`,
            linkedFactId: retFact?.id,
            source: "remote",
          },
        };
        useItineraryStore.getState().addNode(retPayload.payload);
        try {
          await syncItinerary(retPayload);
        } catch {
          useItineraryStore.getState().removeNode(retPayload.payload.node_id);
        }
      }

      showToast(`已把 ${flight.provider} 航班帶入旅程錨點。`, "success");
      setTimeout(() => {
        useAppStore.getState().setActiveTab("itinerary");
      }, 500);
    } catch {
      showToast("帶入旅程失敗，請稍後再試。", "warning");
    }
  };

  return (
    <motion.div
      ref={scrollRef}
      onScroll={onScroll}
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.985 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col flex-1 w-full min-h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-tab-safe md:pb-14"
    >
      {/* === HERO SECTION with gradient background === */}
      <div
        className={`relative z-10 w-full pt-5 sm:pt-[55px] ${!isHeroExpanded ? "pb-2" : "pb-6 sm:pb-10"} px-3 sm:px-6 overflow-visible`}
      >
        <motion.div 
          style={{ willChange: 'transform, opacity' }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.2, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-10 right-6 h-72 w-72 rounded-full bg-sky-200/30 blur-[100px] pointer-events-none transform-gpu" />
        <motion.div 
          style={{ willChange: 'transform, opacity' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.2, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-10 left-[-1rem] h-60 w-60 rounded-full bg-pink-200/30 blur-[90px] pointer-events-none transform-gpu" />
        <motion.div 
          style={{ willChange: 'transform, opacity' }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.18, 0.22, 0.18] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-12 right-[18%] h-64 w-64 rounded-full bg-orange-200/30 blur-[90px] pointer-events-none transform-gpu" />

        <div className="relative z-20 mx-auto w-full max-w-[1120px]">
          {/* Hero title */}
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: "easeOut" }}
            onClick={() => setIsHeroIntroCollapsed((prev) => !prev)}
            className={`group relative mx-auto mb-5 max-w-[900px] space-y-3 overflow-hidden px-4 text-center sm:mb-8 sm:px-6 cursor-pointer transition-colors duration-300 ${!isHeroExpanded ? " hidden sm:block" : ""}`}
          >
            <div className="relative space-y-3 sm:space-y-4 flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 14 }}
                className="relative mb-2 select-none group/mascot"
              >
                <div className="absolute inset-0 bg-pink-400/20 blur-xl rounded-full scale-90 group-hover/mascot:scale-105 transition-transform duration-500" />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/60 dark:border-white/20 shadow-md flex items-center justify-center overflow-hidden animate-cute-bounce">
                  <img
                    src="/src/assets/images/jelly_brand_asset_1783589988704.jpg"
                    alt="RoamJelly Mascot"
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </motion.div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 flex items-center gap-2 transition-all duration-300">
                <span className="w-8 h-px bg-slate-300 dark:bg-slate-700"></span>
                RoamJelly Trip Planner
                <span className="w-8 h-px bg-slate-300 dark:bg-slate-700"></span>
              </p>
              <h1 className="mx-auto max-w-4xl text-balance text-[32px] font-black tracking-[-0.04em] text-slate-800 dark:text-slate-100 sm:text-[46px] md:text-[56px] leading-[1.15] sm:leading-[1.1] font-heading drop-shadow-sm">
                {t('str_628a')}<span className="text-gradient drop-shadow-sm">{t('str_5fb0dfc4')}</span>{t('str_8207')}<span className="text-gradient drop-shadow-sm">{t('str_ca20f')}</span><br className="hidden sm:block" />{t('str_2dd96b8d')}</h1>
            </div>
          </motion.div>

          {/* === SEARCH FORM === */}
          <div
            className={`relative z-20 transition-opacity duration-300 ${loading ? "opacity-60 pointer-events-none" : ""}`}
          >
            {/* Compact search summary bar — mobile only, shown after search */}
            {!isHeroExpanded && (
              <button
                onClick={() => setIsHeroExpanded(true)}
                className="relative z-20 md:hidden w-full flex items-center gap-2.5 rounded-[28px] border border-white/85 bg-[rgba(255,255,255,0.82)] px-4 py-3 shadow-[0_12px_30px_rgba(14,165,233,0.12)] backdrop-blur-[20px]"
              >
                <PlaneTakeoff size={16} className="shrink-0 text-sky-600" />
                <span className="flex-1 text-left text-[14px] font-black text-slate-900 truncate">
                  {searchForm.from || searchForm.to
                    ? `${searchForm.from || "未設定"} → ${searchForm.to || "待挑選"}`
                    : "規劃一趟新旅程"}
                </span>
                <span className="text-[10px] font-bold text-slate-500 shrink-0 truncate max-w-[110px] sm:max-w-[150px]">
                  {searchForm.date}
                  {searchForm.tripType === "roundtrip" && searchForm.returnDate
                    ? ` · ↩ ${searchForm.returnDate}`
                    : ""}
                </span>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-orange-400 text-white shadow-md">
                  <SearchIcon size={13} strokeWidth={3} />
                </div>
              </button>
            )}
            {/* Unified search form */}
            {isHeroExpanded && (
              <div className="relative z-20">
                {/* Trip type toggle */}
                <div className="mb-2.5 flex w-fit items-center gap-1 rounded-full border border-white/75 bg-white/62 p-1">
                  <button
                    onClick={() => updateField("tripType", "oneway")}
                    aria-pressed={searchForm.tripType !== "roundtrip"}
                    className={`px-5 py-2 rounded-full text-[11px] font-black tracking-wide transition-all ${
                      searchForm.tripType !== "roundtrip"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t('str_ada1d')}</button>
                  <button
                    onClick={() => updateField("tripType", "roundtrip")}
                    aria-pressed={searchForm.tripType === "roundtrip"}
                    className={`px-5 py-2 rounded-full text-[11px] font-black tracking-wide transition-all ${
                      searchForm.tripType === "roundtrip"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t('str_9f818')}</button>
                </div>

                {/* Search card */}
                <div className="flex flex-col gap-2 rounded-[32px] sm:rounded-[40px] glass-card dark-transition p-3 sm:gap-2.5 sm:p-4">
                  {/* FROM / TO row */}
                  <div className="relative grid grid-cols-2 gap-2 sm:gap-3">
                    {/* FROM cell */}
                    <div
                      className={`flex flex-col gap-1 sm:gap-2 px-4 py-3.5 sm:px-6 sm:py-4 rounded-[24px] sm:rounded-[28px] cursor-text ${searchFieldSurfaceClass}`}
                      onClick={() => {
                        setShowDeparturePicker(true);
                        setShowDestinationPicker(false);
                        setShowDatePicker(false);
                        setShowReturnDatePicker(false);
                      }}
                    >
                      <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase">
                        {t('str_1426bae')}</span>
                      <input
                        aria-label={t('str_1426bae')}
                        className="bg-transparent border-none p-0 text-[18px] sm:text-[20px] font-black tracking-tight text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 w-full outline-none focus-visible:outline-none leading-none"
                        value={searchForm.from}
                        onFocus={() => {
                          setShowDeparturePicker(true);
                          setShowDestinationPicker(false);
                          setShowDatePicker(false);
                        }}
                        onChange={(e) => updateField("from", e.target.value)}
                        placeholder={t('str_7d05f8dd')}
                        autoComplete="off"
                      />
                    </div>

                    {/* Center airplane divider (Click to Swap departure and destination) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const tempFrom = searchForm.from;
                        updateField("from", searchForm.to);
                        updateField("to", tempFrom);
                        triggerHapticFeedback([10]);
                      }}
                        title={t('str_9e9b7')}
                        aria-label={t('str_7dc97fb6')}
                      className="absolute left-1/2 top-1/2 z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.1)] hover:scale-105 ios-press text-slate-400 hover:text-sky-500 transition-all cursor-pointer group"
                    >
                      <PlaneTakeoff
                        size={15}
                        className="transform group-hover:rotate-180 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        strokeWidth={2.5}
                      />
                    </button>

                    {/* TO cell */}
                    <div
                      className={`flex flex-col gap-1 sm:gap-2 px-4 py-3.5 sm:px-6 sm:py-4 rounded-[24px] sm:rounded-[28px] cursor-text ${searchFieldSurfaceClass}`}
                      onClick={() => {
                        setShowDestinationPicker(true);
                        setShowDeparturePicker(false);
                        setShowDatePicker(false);
                        setShowReturnDatePicker(false);
                      }}
                    >
                      <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase">
                        {t('str_1cd249a')}</span>
                      <input
                        aria-label={t('str_1cd249a')}
                        className="bg-transparent border-none p-0 text-[18px] sm:text-[20px] font-black tracking-tight text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 w-full outline-none focus-visible:outline-none leading-none"
                        value={searchForm.to}
                        onFocus={() => {
                          setShowDestinationPicker(true);
                          setShowDeparturePicker(false);
                          setShowDatePicker(false);
                        }}
                        onChange={(e) => updateField("to", e.target.value)}
                        placeholder={t('str_2760232d')}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="relative group/dests-row w-full flex items-center my-1.5 pb-0.5 overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_16px,_black_calc(100%-16px),transparent_100%)]">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase shrink-0 select-none pl-1 pr-3 z-10 bg-gradient-to-r from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900 border-r-transparent">
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500 shadow-[0_0_6px_#0ea5e9] flex-shrink-0"></span>
                      </span>
                    </div>

                    {/* 跑馬燈容器 */}
                    <div className="flex animate-marquee w-max py-1">
                      {/* 第一組 */}
                      <div className="flex items-center gap-2 pr-2 shrink-0">
                        {HOT_DESTINATIONS.map((dest) => (
                          <button
                            key={`m1-${dest.name}`}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              updateField("to", dest.name);
                              setShowDestinationPicker(false);
                              if (typeof triggerHapticFeedback === 'function') {
                                triggerHapticFeedback([10]);
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 text-[12px] sm:text-[13px] font-extrabold shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0 transition-all duration-300 hover:-translate-y-0.5 ios-press hover:border-sky-400/80 dark:hover:border-sky-500/80 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer`}
                          >
                            <span className="text-[13px] sm:text-[14px]">{dest.flag}</span>
                            <span className="tracking-wide">{dest.name}</span>
                          </button>
                        ))}
                      </div>
                      
                      {/* 第二組 (為了無縫循環) */}
                      <div className="flex items-center gap-2 pr-2 shrink-0" aria-hidden="true">
                        {HOT_DESTINATIONS.map((dest) => (
                          <button
                            key={`m2-${dest.name}`}
                            type="button"
                            tabIndex={-1}
                            onClick={(e) => {
                              e.preventDefault();
                              updateField("to", dest.name);
                              setShowDestinationPicker(false);
                              if (typeof triggerHapticFeedback === 'function') {
                                triggerHapticFeedback([10]);
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 text-[12px] sm:text-[13px] font-extrabold shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0 transition-all duration-300 hover:-translate-y-0.5 ios-press hover:border-sky-400/80 dark:hover:border-sky-500/80 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer`}
                          >
                            <span className="text-[13px] sm:text-[14px]">{dest.flag}</span>
                            <span className="tracking-wide">{dest.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Date / Return Date row */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Departure date */}
                    <button
                      type="button"
                      aria-label={`去程日期：${searchForm.date || "尚未選擇"}`}
                      className={`flex flex-col gap-1 sm:gap-2 px-4 py-3.5 sm:px-6 sm:py-4 rounded-[24px] sm:rounded-[28px] cursor-pointer bg-slate-50/60 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 text-left w-full ${searchFieldSurfaceClass}`}
                      onClick={() => {
                        setShowDatePicker(!showDatePicker);
                        setShowDeparturePicker(false);
                        setShowDestinationPicker(false);
                        setShowReturnDatePicker(false);
                      }}
                    >
                      <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                        <Calendar size={11} className="text-sky-500" strokeWidth={2.5} />
                        {t('str_27e6af8a')}</span>
                      <span
                        className={`text-[16px] sm:text-[18px] tracking-tight font-black leading-none ${!searchForm.date ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}
                      >
                        {searchForm.date || "選擇日期"}
                      </span>
                    </button>

                    {/* Return date — always visible; clicking in oneway mode auto-switches to roundtrip */}
                    <button
                      type="button"
                      aria-label={`回程日期：${searchForm.returnDate || (searchForm.tripType === "oneway" ? "單程（點擊切換來回）" : "尚未選擇")}`}
                      className={`flex flex-col gap-1 sm:gap-2 px-4 py-3.5 sm:px-6 sm:py-4 rounded-[24px] sm:rounded-[28px] cursor-pointer border text-left w-full ${
                        searchForm.tripType === "oneway"
                          ? "bg-slate-50/50 border-dashed border-slate-200 dark:border-slate-600 opacity-80"
                          : "bg-slate-50/60 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700"
                      } ${searchFieldSurfaceClass}`}
                      onClick={() => {
                        if (searchForm.tripType === "oneway")
                          updateField("tripType", "roundtrip");
                        setShowReturnDatePicker(!showReturnDatePicker);
                        setShowDatePicker(false);
                        setShowDeparturePicker(false);
                        setShowDestinationPicker(false);
                      }}
                    >
                      <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                        <Calendar size={11} className={searchForm.tripType === "oneway" ? "text-slate-400" : "text-sky-500"} strokeWidth={2.5} />
                        {t('str_2953b587')}</span>
                      <span
                        className={`text-[16px] sm:text-[18px] tracking-tight font-black leading-none ${!searchForm.returnDate ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}
                      >
                        {searchForm.returnDate ||
                          (searchForm.tripType === "oneway"
                            ? "+ 加回程"
                            : "選擇回程")}
                      </span>
                    </button>
                  </div>

                  {/* Error / hint */}
                  {(dateError || searchBlockReason) && (
                    <p className="text-[11px] text-slate-500 font-bold px-1 -mt-1">
                      {dateError || searchBlockReason}
                    </p>
                  )}

                  {/* Search CTA */}
                  <button
                    onClick={() => void handleSearch()}
                    disabled={isSearchDisabled || loading || isOffline}
                    title={isOffline ? "請連線網路以進行機票比價" : ""}
                    className={`group relative flex w-full overflow-hidden items-center justify-center gap-2.5 rounded-[28px] sm:rounded-[32px] py-4 sm:py-5 mt-1 text-[17px] sm:text-[19px] font-black tracking-wide shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] transform-gpu ${
                      isSearchDisabled || loading || isOffline
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-slate-900 border border-slate-800 text-white shadow-[0_8px_20px_-6px_rgba(15,23,42,0.4)] hover:bg-slate-800 hover:shadow-[0_12px_24px_-6px_rgba(15,23,42,0.5)] ios-press active:translate-y-[1px]"
                    }`}
                  >
                    {!isSearchDisabled && !loading && !isOffline && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-150%] skew-x-[-25deg] group-hover:transition-all group-hover:duration-700 group-hover:ease-in-out group-hover:translate-x-[150%]" />
                    )}
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <SearchIcon size={18} strokeWidth={3} className="drop-shadow-sm group-hover:animate-cute-bounce opacity-90" /> 
                        <span className="drop-shadow-sm relative z-10 transition-colors">{t('str_7a2c8e5')}</span>
                      </>
                    )}
                  </button>
                  <p className="px-1 pt-2 sm:pt-2 text-center text-[13px] font-bold leading-5 text-slate-500 dark:text-slate-400 tracking-tight">
                    {t('str_72cbb618')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === CONTENT BELOW HERO === */}
      <div className="relative z-10 flex-1 flex flex-col px-4 sm:px-6 bg-gradient-to-b from-white/80 to-slate-50/60 dark:from-slate-900/80 dark:to-slate-950/60 dark-transition">
        {/* Quick External Links */}
        <div className="max-w-3xl mx-auto w-full pt-3 sm:pt-4 pb-1 sm:pb-2 relative z-20">
          <div className="relative group/scroll-row w-full flex items-center pr-2">
            {/* Left transparent glass arrow button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                if (chipsScrollContainerRef.current) {
                  chipsScrollContainerRef.current.scrollBy({ left: -200, behavior: "smooth" });
                }
              }}
              className="absolute left-[-10px] md:left-[-16px] z-30 flex items-center justify-center w-11 h-11 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm border border-slate-200/50 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all opacity-40 hover:opacity-100 hover:scale-105 ios-press"
              aria-label={t('str_2cd64a89')}
            >
              <ChevronLeft size={16} strokeWidth={3} />
            </button>

            {/* The scrollable section */}
            <div 
              ref={chipsScrollContainerRef}
              className="flex flex-row items-center overflow-x-auto hide-scrollbar gap-2.5 snap-x pb-1 w-full"
            >
              {/* 找機票 (Flights Platform Multi-action Menu Button) */}
              <div 
                ref={flightDropdownRef} 
                className="relative shrink-0 snap-start z-[50]"
                onMouseEnter={() => {
                  if (!isMobileDevice) {
                    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                    setShowFlightsDropdown(true);
                  }
                }}
                onMouseLeave={() => {
                  if (!isMobileDevice) {
                    hoverTimeout.current = setTimeout(() => {
                      setShowFlightsDropdown(false);
                    }, 250);
                  }
                }}
              >
                <button
                  id="home-find-flights-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowFlightsDropdown(prev => !prev);
                    setShowHotelsDropdown(false);
                    setShowTicketsDropdown(false);
                    setShowTransfersDropdown(false);
                    if (zoomedFlightsIndex !== null) setZoomedFlightsIndex(null);
                  }}
                  className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press hover:-translate-y-1 ${chipPressClass}`}
                >
                  <div className="group-hover:scale-110 transition-transform">
                    <GlowingIcon icon={PlaneTakeoff} size={17} iconColor="text-slate-800 dark:text-slate-100" glowColor="bg-sky-400" />
                  </div>
                  <span className="font-bold text-[13px] tracking-wide">
                    {t('str_17f15e7')}</span>
                  <ChevronDown
                    size={12}
                    className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-300 ${showFlightsDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {/* 找住宿 (Hotels Platform Multi-action Menu Button) */}
              <div 
                ref={hotelDropdownRef} 
                className="relative shrink-0 snap-start z-[50]"
                onMouseEnter={() => {
                  if (!isMobileDevice) {
                    if (hotelHoverTimeout.current) clearTimeout(hotelHoverTimeout.current);
                    setShowHotelsDropdown(true);
                  }
                }}
                onMouseLeave={() => {
                  if (!isMobileDevice) {
                    hotelHoverTimeout.current = setTimeout(() => {
                      setShowHotelsDropdown(false);
                    }, 250);
                  }
                }}
              >
                <button
                  id="home-find-hotels-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowHotelsDropdown(prev => !prev);
                    setShowFlightsDropdown(false);
                    setShowTicketsDropdown(false);
                    setShowTransfersDropdown(false);
                    if (zoomedHotelsIndex !== null) setZoomedHotelsIndex(null);
                  }}
                  className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press hover:-translate-y-1 ${chipPressClass}`}
                >
                  <div className="group-hover:scale-110 transition-transform">
                    <GlowingIcon icon={Bed} size={17} iconColor="text-slate-800 dark:text-slate-100" glowColor="bg-pink-400" />
                  </div>
                  <span className="font-bold text-[13px] tracking-wide">
                    {t('str_17bb14e')}</span>
                  <ChevronDown
                    size={12}
                    className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-300 ${showHotelsDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {/* 門票 & 觀光行程 (Tickets/Activities Platform Multi-action Menu Button) */}
              <div 
                ref={ticketDropdownRef} 
                className="relative shrink-0 snap-start z-[50]"
                onMouseEnter={() => {
                  if (!isMobileDevice) {
                    if (ticketHoverTimeout.current) clearTimeout(ticketHoverTimeout.current);
                    setShowTicketsDropdown(true);
                  }
                }}
                onMouseLeave={() => {
                  if (!isMobileDevice) {
                    ticketHoverTimeout.current = setTimeout(() => {
                      setShowTicketsDropdown(false);
                    }, 250);
                  }
                }}
              >
                <button
                  id="home-find-tickets-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTicketsDropdown(prev => !prev);
                    setShowFlightsDropdown(false);
                    setShowHotelsDropdown(false);
                    setShowTransfersDropdown(false);
                    if (zoomedTicketsIndex !== null) setZoomedTicketsIndex(null);
                  }}
                  className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press hover:-translate-y-1 ${chipPressClass}`}
                >
                  <div className="group-hover:scale-110 transition-transform">
                    <GlowingIcon icon={Ticket} size={15} iconColor="text-slate-800 dark:text-slate-100" glowColor="bg-orange-400" />
                  </div>
                  <span className="font-bold text-[13px] tracking-wide">
                    {t('str_483a8c86')}</span>
                  <ChevronDown
                    size={12}
                    className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-300 ${showTicketsDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {/* 機場接送 (Transfers/Charter Platform Multi-action Menu Button) */}
              <div 
                ref={transfersDropdownRef} 
                className="relative shrink-0 snap-start z-[50]"
                onMouseEnter={() => {
                  if (!isMobileDevice) {
                    if (transfersHoverTimeout.current) clearTimeout(transfersHoverTimeout.current);
                    setShowTransfersDropdown(true);
                  }
                }}
                onMouseLeave={() => {
                  if (!isMobileDevice) {
                    transfersHoverTimeout.current = setTimeout(() => {
                      setShowTransfersDropdown(false);
                    }, 250);
                  }
                }}
              >
                <button
                  id="home-find-transfers-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTransfersDropdown(prev => !prev);
                    setShowFlightsDropdown(false);
                    setShowHotelsDropdown(false);
                    setShowTicketsDropdown(false);
                    if (zoomedTransfersIndex !== null) setZoomedTransfersIndex(null);
                  }}
                  className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press hover:-translate-y-1 ${chipPressClass}`}
                >
                  <div className="relative group-hover:scale-110 transition-transform">
                    <GlowingIcon icon={CarFront} size={17} iconColor="text-slate-800 dark:text-slate-100" glowColor="bg-fuchsia-400" />
                    <PlaneTakeoff
                      size={9}
                      strokeWidth={3}
                      className="absolute -top-1 -left-1 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <span className="font-bold text-[13px] tracking-wide">
                    {t('str_31b24171')}</span>
                  <ChevronDown
                    size={12}
                    className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-300 ${showTransfersDropdown ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* Right transparent glass arrow button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                if (chipsScrollContainerRef.current) {
                  chipsScrollContainerRef.current.scrollBy({ left: 200, behavior: "smooth" });
                }
              }}
              className="absolute right-[-10px] md:right-[-16px] z-30 flex items-center justify-center w-11 h-11 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm border border-slate-200/50 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all opacity-40 hover:opacity-100 hover:scale-105 ios-press"
              aria-label={t('str_2cb0f156')}
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>

          <AnimatePresence>
            {showFlightsDropdown && (
              <motion.div
                ref={flightMenuContentRef}
                onMouseEnter={() => {
                  if (!isMobileDevice) {
                    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                    setShowFlightsDropdown(true);
                  }
                }}
                onMouseLeave={() => {
                  if (!isMobileDevice) {
                    setShowFlightsDropdown(false);
                  }
                }}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                style={{ originY: 0 }}
                className="absolute left-0 mt-3 w-[260px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/55 dark:border-white/10 rounded-[20px] p-3 shadow-[0_20px_40px_rgba(15,23,42,0.14)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.35)] z-[100] overflow-hidden"
              >
                <div className="mb-2 px-1 pb-2 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[12px] font-black tracking-wide text-slate-800 dark:text-slate-100">
                    {t('str_63f349c0')}</span>
                  {isMobileDevice ? (
                    <span className="text-[8px] font-black tracking-widest bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-200/40">
                      {t('str_15c56f94')}</span>
                  ) : (
                    <span className="text-[8px] font-black tracking-widest bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-500 px-1.5 py-0.5 rounded-full border border-sky-200/45">
                      {t('str_165ed4e5')}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {FLIGHT_PLATFORMS.map((platform, idx) => {
                    const isZoomed = zoomedFlightsIndex === idx;
                    return (
                      <motion.a
                        key={platform.name}
                        id={`flight-platform-${idx}`}
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          // 追蹤分潤點擊（非阻塞）
                          trackClickOut({
                            user_id: null,
                            item_id: `nav-flights-${platform.name}`,
                            provider: platform.name,
                            timestamp: new Date().toISOString(),
                            affiliate_url: platform.url,
                          });
                          if (isMobileDevice) {
                            if (!isZoomed) {
                              e.preventDefault();
                              e.stopPropagation();
                              setZoomedFlightsIndex(idx);
                            }
                          }
                        }}
                        whileHover={!isMobileDevice ? {
                          scale: 1.05,
                          x: 2,
                          backgroundColor: "rgba(241, 245, 249, 0.9)",
                        } : undefined}
                        animate={isMobileDevice ? {
                          scale: isZoomed ? 1.06 : 1,
                          backgroundColor: isZoomed ? "rgba(241, 245, 249, 0.9)" : "rgba(255, 255, 255, 0)"
                        } : undefined}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-slate-700 dark:text-slate-200 ${
                          isZoomed 
                            ? "border-sky-400 dark:border-sky-500 bg-slate-50 dark:bg-slate-900/60" 
                            : "border-transparent hover:border-slate-100 dark:hover:border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-tr ${platform.logoColor} shrink-0`} />
                          <span className="font-extrabold text-[12.5px] leading-none text-slate-800 dark:text-slate-100">
                            {platform.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500">
                            {isZoomed ? "點擊前往 ➔" : platform.badge}
                          </span>
                        </div>
                      </motion.a>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {showHotelsDropdown && (
              <motion.div
                ref={hotelMenuContentRef}
                onMouseEnter={() => {
                  if (!isMobileDevice) {
                    if (hotelHoverTimeout.current) clearTimeout(hotelHoverTimeout.current);
                    setShowHotelsDropdown(true);
                  }
                }}
                onMouseLeave={() => {
                  if (!isMobileDevice) {
                    setShowHotelsDropdown(false);
                  }
                }}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                style={{ originY: 0 }}
                className="absolute left-[70px] sm:left-[110px] mt-3 w-[260px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/55 dark:border-white/10 rounded-[20px] p-3 shadow-[0_20px_40px_rgba(15,23,42,0.14)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.35)] z-[100] overflow-hidden"
              >
                <div className="mb-2 px-1 pb-2 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[12px] font-black tracking-wide text-slate-800 dark:text-slate-100">
                    {t('str_70c1b1d5')}</span>
                  {isMobileDevice ? (
                    <span className="text-[8px] font-black tracking-widest bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-200/40">
                      {t('str_15c56f94')}</span>
                  ) : (
                    <span className="text-[8px] font-black tracking-widest bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-500 px-1.5 py-0.5 rounded-full border border-sky-200/45">
                      {t('str_165ed4e5')}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {HOTEL_PLATFORMS.map((platform, idx) => {
                    const isZoomed = zoomedHotelsIndex === idx;
                    return (
                      <motion.a
                        key={platform.name}
                        id={`hotel-platform-${idx}`}
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          // 追蹤分潤點擊（非阻塞）
                          trackClickOut({
                            user_id: null,
                            item_id: `nav-hotels-${platform.name}`,
                            provider: platform.name,
                            timestamp: new Date().toISOString(),
                            affiliate_url: platform.url,
                          });
                          if (isMobileDevice) {
                            if (!isZoomed) {
                              e.preventDefault();
                              e.stopPropagation();
                              setZoomedHotelsIndex(idx);
                            }
                          }
                        }}
                        whileHover={!isMobileDevice ? {
                          scale: 1.05,
                          x: 2,
                          backgroundColor: "rgba(241, 245, 249, 0.9)",
                        } : undefined}
                        animate={isMobileDevice ? {
                          scale: isZoomed ? 1.06 : 1,
                          backgroundColor: isZoomed ? "rgba(241, 245, 249, 0.9)" : "rgba(255, 255, 255, 0)"
                        } : undefined}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-slate-700 dark:text-slate-200 ${
                          isZoomed 
                            ? "border-sky-400 dark:border-sky-500 bg-slate-50 dark:bg-slate-900/60" 
                            : "border-transparent hover:border-slate-100 dark:hover:border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-tr ${platform.logoColor} shrink-0`} />
                          <span className="font-extrabold text-[12.5px] leading-none text-slate-800 dark:text-slate-100">
                            {platform.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500">
                            {isZoomed ? "點擊前往 ➔" : platform.badge}
                          </span>
                        </div>
                      </motion.a>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {showTicketsDropdown && (
              <motion.div
                ref={ticketMenuContentRef}
                onMouseEnter={() => {
                  if (!isMobileDevice) {
                    if (ticketHoverTimeout.current) clearTimeout(ticketHoverTimeout.current);
                    setShowTicketsDropdown(true);
                  }
                }}
                onMouseLeave={() => {
                  if (!isMobileDevice) {
                    setShowTicketsDropdown(false);
                  }
                }}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                style={{ originY: 0 }}
                className="absolute left-[140px] sm:left-[220px] mt-3 w-[260px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/55 dark:border-white/10 rounded-[20px] p-3 shadow-[0_20px_40px_rgba(15,23,42,0.14)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.35)] z-[100] overflow-hidden"
              >
                <div className="mb-2 px-1 pb-2 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[12px] font-black tracking-wide text-slate-800 dark:text-slate-100">
                    {t('str_2b09fc0a')}</span>
                  {isMobileDevice ? (
                    <span className="text-[8px] font-black tracking-widest bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-200/40">
                      {t('str_15c56f94')}</span>
                  ) : (
                    <span className="text-[8px] font-black tracking-widest bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-500 px-1.5 py-0.5 rounded-full border border-sky-200/45">
                      {t('str_165ed4e5')}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {TICKET_PLATFORMS.map((platform, idx) => {
                    const isZoomed = zoomedTicketsIndex === idx;
                    return (
                      <motion.a
                        key={platform.name}
                        id={`ticket-platform-${idx}`}
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          // 追蹤分潤點擊（非阻塞）
                          trackClickOut({
                            user_id: null,
                            item_id: `nav-tickets-${platform.name}`,
                            provider: platform.name,
                            timestamp: new Date().toISOString(),
                            affiliate_url: platform.url,
                          });
                          if (isMobileDevice) {
                            if (!isZoomed) {
                              e.preventDefault();
                              e.stopPropagation();
                              setZoomedTicketsIndex(idx);
                            }
                          }
                        }}
                        whileHover={!isMobileDevice ? {
                          scale: 1.05,
                          x: 2,
                          backgroundColor: "rgba(241, 245, 249, 0.9)",
                        } : undefined}
                        animate={isMobileDevice ? {
                          scale: isZoomed ? 1.06 : 1,
                          backgroundColor: isZoomed ? "rgba(241, 245, 249, 0.9)" : "rgba(255, 255, 255, 0)"
                        } : undefined}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-slate-700 dark:text-slate-200 ${
                          isZoomed 
                            ? "border-sky-400 dark:border-sky-500 bg-slate-50 dark:bg-slate-900/60" 
                            : "border-transparent hover:border-slate-100 dark:hover:border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-tr ${platform.logoColor} shrink-0`} />
                          <span className="font-extrabold text-[12.5px] leading-none text-slate-800 dark:text-slate-100">
                            {platform.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500">
                            {isZoomed ? "點擊前往 ➔" : platform.badge}
                          </span>
                        </div>
                      </motion.a>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {showTransfersDropdown && (
              <motion.div
                ref={transfersMenuContentRef}
                onMouseEnter={() => {
                  if (!isMobileDevice) {
                    if (transfersHoverTimeout.current) clearTimeout(transfersHoverTimeout.current);
                    setShowTransfersDropdown(true);
                  }
                }}
                onMouseLeave={() => {
                  if (!isMobileDevice) {
                    setShowTransfersDropdown(false);
                  }
                }}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                style={{ originY: 0 }}
                className="absolute left-[200px] sm:left-[320px] mt-3 w-[260px] bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/55 dark:border-white/10 rounded-[20px] p-3 shadow-[0_20px_40px_rgba(15,23,42,0.14)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.35)] z-[100] overflow-hidden"
              >
                <div className="mb-2 px-1 pb-2 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[12px] font-black tracking-wide text-slate-800 dark:text-slate-100">
                    {t('str_648260b9')}</span>
                  {isMobileDevice ? (
                    <span className="text-[8px] font-black tracking-widest bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-200/40">
                      {t('str_15c56f94')}</span>
                  ) : (
                    <span className="text-[8px] font-black tracking-widest bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-500 px-1.5 py-0.5 rounded-full border border-sky-200/45">
                      {t('str_165ed4e5')}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {TRANSFERS_PLATFORMS.map((platform, idx) => {
                    const isZoomed = zoomedTransfersIndex === idx;
                    return (
                      <motion.a
                        key={platform.name}
                        id={`transfers-platform-${idx}`}
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          // 追蹤分潤點擊（非阻塞）
                          trackClickOut({
                            user_id: null,
                            item_id: `nav-transfers-${platform.name}`,
                            provider: platform.name,
                            timestamp: new Date().toISOString(),
                            affiliate_url: platform.url,
                          });
                          if (isMobileDevice) {
                            if (!isZoomed) {
                              e.preventDefault();
                              e.stopPropagation();
                              setZoomedTransfersIndex(idx);
                            }
                          }
                        }}
                        whileHover={!isMobileDevice ? {
                          scale: 1.05,
                          x: 2,
                          backgroundColor: "rgba(241, 245, 249, 0.9)",
                        } : undefined}
                        animate={isMobileDevice ? {
                          scale: isZoomed ? 1.06 : 1,
                          backgroundColor: isZoomed ? "rgba(241, 245, 249, 0.9)" : "rgba(255, 255, 255, 0)"
                        } : undefined}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-slate-700 dark:text-slate-200 ${
                          isZoomed 
                            ? "border-sky-400 dark:border-sky-500 bg-slate-50 dark:bg-slate-900/60" 
                            : "border-transparent hover:border-slate-100 dark:hover:border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-tr ${platform.logoColor} shrink-0`} />
                          <span className="font-extrabold text-[12.5px] leading-none text-slate-800 dark:text-slate-100">
                            {platform.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500">
                            {isZoomed ? "點擊前往 ➔" : platform.badge}
                          </span>
                        </div>
                      </motion.a>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-5 sm:pt-7 pb-16 md:pb-32 flex flex-col flex-1 min-w-0">
          <HomeTabContentFocusBlock containerRef={scrollRef} className="flex flex-col gap-3 mb-5 sm:mb-6 md:mb-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <EditorialSectionIntro
                eyebrow={t('str_315202e0')}
                title=""
                description=""
                highlights={[
                  {
                    label: "出發",
                    value: searchForm.from || "未設定",
                  },
                  {
                    label: "目的地",
                    value: searchForm.to || "待挑選",
                  },
                  {
                    label: "日期",
                    value: searchForm.date
                      ? searchForm.date.replace(/-/g, "/")
                      : "未選日期",
                  },
                ]}
                titleClassName="text-2xl sm:text-3xl tracking-tighter"
                descriptionClassName="text-[12px] font-bold leading-5 text-slate-500 sm:text-[13px]"
              />
              {results.length > 0 && (
                <div className="flex items-center gap-1 bg-white/70 backdrop-blur-md p-1 rounded-[10px] shadow-sm border border-slate-200/60 shrink-0">
                  <button
                    onClick={() => setViewType("grid")}
                    className={`w-11 h-11 flex items-center justify-center rounded-[8px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press ${viewType === "grid" ? "bg-white shadow-sm text-slate-900 border border-slate-200/50" : "text-slate-500 hover:text-slate-600 hover:-translate-y-0.5"}`}
                    title={t('str_27a154ba')}
                    aria-label={t('str_27a154ba')}
                    aria-pressed={viewType === "grid"}
                  >
                    <LayoutGrid size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setViewType("table")}
                    className={`w-11 h-11 flex items-center justify-center rounded-[8px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press ${viewType === "table" ? "bg-white shadow-sm text-slate-900 border border-slate-200/50" : "text-slate-500 hover:text-slate-600 hover:-translate-y-0.5"}`}
                    title={t('str_275e6425')}
                    aria-label={t('str_275e6425')}
                    aria-pressed={viewType === "table"}
                  >
                    <List size={16} strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>
            {results.length > 0 && (
              <div className="flex items-center bg-white/70 backdrop-blur-md p-1 rounded-[10px] shadow-sm border border-slate-200/60 w-full sm:w-auto overflow-x-auto hide-scrollbar">
                {(["all", "flight", "ticket", "other"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`relative flex-1 sm:flex-none px-3 py-2.5 min-h-[44px] flex items-center justify-center rounded-[8px] text-[11px] font-black tracking-widest uppercase z-10 whitespace-nowrap ${subtlePressableClass} ${filterType === type ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    aria-pressed={filterType === type}
                  >
                    {filterType === type && (
                      <motion.div
                        layoutId="filterTypeIndicator"
                        className="absolute inset-0 bg-white rounded-[8px] -z-10 shadow-sm border border-slate-200"
                        transition={layoutIndicatorTransition}
                      />
                    )}
                    {type === "all"
                      ? "全部"
                      : type === "flight"
                        ? "機票"
                        : type === "ticket"
                          ? "票券"
                          : "其他"}
                  </button>
                ))}
              </div>
            )}
            {hasRoundTripLegMenu && (
              <div className="flex items-center bg-white/70 backdrop-blur-md p-1 rounded-[10px] shadow-sm border border-slate-200/60 w-full overflow-x-auto hide-scrollbar">
                {(
                  [
                    {
                      key: "outbound" as const,
                      label: "去程",
                      route: `${searchForm.from || "—"} → ${searchForm.to || "—"}`,
                      date: searchForm.date || "未選日期",
                      count: roundTripLegCounts.outbound,
                    },
                    {
                      key: "return" as const,
                      label: "回程",
                      route: `${searchForm.to || "—"} → ${searchForm.from || "—"}`,
                      date: searchForm.returnDate || "未選日期",
                      count: roundTripLegCounts.return,
                    },
                  ] satisfies Array<{
                    key: RoundTripLegView;
                    label: string;
                    route: string;
                    date: string;
                    count: number;
                  }>
                ).map((leg) => (
                  <button
                    key={leg.key}
                    onClick={() => setRoundTripLegView(leg.key)}
                    className={`relative flex-1 min-w-[164px] rounded-[8px] px-3 py-2.5 text-left ${subtlePressableClass} ${roundTripLegView === leg.key ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    aria-pressed={roundTripLegView === leg.key}
                  >
                    {roundTripLegView === leg.key && (
                      <motion.div
                        layoutId="roundTripLegIndicator"
                        className="absolute inset-0 rounded-[8px] bg-white shadow-sm border border-slate-200"
                        transition={layoutIndicatorTransition}
                      />
                    )}
                    <div className="relative z-10 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em]">
                          {leg.label}
                        </div>
                        <div className="mt-1 truncate text-[12px] font-bold">
                          {leg.route}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                          {leg.date}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-600">
                        {leg.count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Sorting Tabs  */}
            {results.length > 0 && !loading && viewType === "table" && (
              <div className="flex items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 w-full overflow-hidden shrink-0 mt-2 mb-4">
                {(["recommended", "cheapest", "fastest"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortType(s)}
                    className={`relative flex flex-col items-center justify-center flex-1 py-2.5 px-2 transition-colors rounded-xl z-10 focus:outline-none ${
                        sortType === s ? "text-sky-600 dark:text-sky-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {sortType === s && (
                      <motion.div
                        layoutId="sortTypeIndicator"
                        className="absolute inset-0 bg-sky-50 dark:bg-sky-900/30 rounded-xl -z-10 border border-sky-100 dark:border-sky-800"
                        transition={layoutIndicatorTransition}
                      />
                    )}
                    <span className="text-[13px] md:text-[14px] font-black tracking-widest">{s === "recommended" ? "推薦" : s === "cheapest" ? "最便宜" : "最短時間"}</span>
                    <span className="text-[10px] md:text-[11px] font-bold mt-0.5 opacity-80 tracking-wider">
                      {s === "recommended" && "綜合最優"}
                      {s === "cheapest" && `NT$ ${sortingStats?.cheapest?.toLocaleString() || "--"}`}
                      {s === "fastest" && `${sortingStats?.fastestDurString || "--"}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </HomeTabContentFocusBlock>

          <div className="relative min-h-[300px]">
            {/* Loading Overlay — Skyscanner-style progress bar */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col items-center pt-20 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm rounded-[32px] sm:rounded-[36px]"
                >
                  <div className="flex flex-col items-center gap-5 p-7 bg-white/95 dark:bg-slate-800/95 shadow-2xl rounded-3xl border border-slate-200/80 dark:border-slate-700 w-[88%] max-w-sm">
                    {/* Animated plane */}
                    <div className="relative w-full h-6 flex items-center overflow-hidden">
                      <motion.div
                        animate={{ x: ["0%", "85%", "0%"] }}
                        transition={{
                          duration: 2.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="absolute"
                      >
                        <PlaneTakeoff size={20} className="text-[#b35f76] dark:text-[#d97c96]" />
                      </motion.div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest leading-none whitespace-nowrap">
                          {SEARCH_LOADING_MESSAGES[progressMsgIdx]}
                        </span>
                        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 tabular-nums">
                          {Math.round(searchProgress)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#b35f76] via-[#7b5ea7] to-[#2c6956]"
                          animate={{ width: `${searchProgress}%` }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px] tracking-wide text-center whitespace-nowrap">
                      {t('str_40f98d9')}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List & Content Container */}
            <div
              className={`transition-opacity duration-300 ${loading ? "opacity-30 pointer-events-none" : ""}`}
            >
              {searchError && !loading ? (
                <div className="flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-[24px] border border-slate-200/50 dark:border-slate-700/50 shadow-[0_2px_12px_rgba(15,23,42,0.03)] my-4 text-center">
                  <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 rounded-full flex items-center justify-center mb-4 border border-rose-200 dark:border-rose-800/60 shadow-sm">
                    <AlertCircle className="text-rose-500" size={24} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-[16px] md:text-[18px] font-black tracking-tight text-slate-900 dark:text-white mb-2">
                    {t('str_33d7d1e0')}</h3>
                  <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-6 max-w-[280px] leading-relaxed">
                    {searchError === "timeout"
                      ? "伺服器查詢逾時，可能是搜尋範圍過大。請點擊下方按鈕重試。"
                      : "航班供應商暫時無法回應，請稍後再試一次。"}
                  </p>
                  <button
                    onClick={handleSearch}
                    className="group flex items-center gap-2 h-10 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-[14px] hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors ios-press shadow-sm"
                  >
                    <RefreshCw size={14} className="group-active:rotate-45 transition-transform" />
                    {t('str_43cfaff2')}</button>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {filteredResults.length > 0 ? (
                    viewType === "grid" ? (
                      <motion.div
                        key="grid-view"
                        initial={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, y: 8 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        exit={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, y: 8 }
                        }
                        transition={
                          prefersReducedMotion
                            ? { duration: 0.16 }
                            : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
                        }
                        className="flex gap-3 overflow-x-auto px-1 pr-7 pb-2 snap-x snap-mandatory hide-scrollbar sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pr-0 sm:pb-0 lg:grid-cols-3"
                      >
                        {filteredResults.map((flight, index) => (
                          <motion.div
                            key={flight.id}
                            initial={
                              prefersReducedMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: 16 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            transition={
                              prefersReducedMotion
                                ? { duration: 0.16 }
                                : {
                                    delay: Math.min(index, 5) * 0.028,
                                    duration: 0.24,
                                    ease: [0.22, 1, 0.36, 1],
                                  }
                            }
                            className="h-full min-w-[295px] xs:min-w-[330px] sm:min-w-0 snap-center"
                          >
                            <DestinationCard
                              flight={flight}
                              isSaved={savedItems.includes(flight.id)}
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
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="table-view"
                        initial={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, y: 8 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        exit={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, y: 8 }
                        }
                        transition={
                          prefersReducedMotion
                            ? { duration: 0.16 }
                            : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
                        }
                      >
                        <FlightTable
                          results={filteredResults}
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
                            const isCurrentlyTracked = trackedPrices.includes(
                              flight.id,
                            );
                            toggleTrack(flight.id);
                            showToast(
                              !isCurrentlyTracked
                                ? `✨ 已開啟 ${flight.provider} 的降價提醒！`
                                : `🔕 已關閉降價提醒`,
                            );
                          }}
                        />
                      </motion.div>
                    )
                  ) : hasSearched && !loading ? (
                    <motion.div
                      key="no-results"
                      initial={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: 10 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0.16 }
                          : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
                      }
                      className="flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-[32px] border border-white/60 dark:border-slate-700/60 mx-2 shadow-sm"
                    >
                      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/80 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                        <SearchIcon className="text-slate-400 dark:text-slate-500" size={32} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-[18px] font-black tracking-tight text-slate-800 dark:text-white mb-2">
                        {t('str_4ca52765')}</h3>
                      <p className="text-slate-500 dark:text-slate-400 font-bold max-w-xs text-center leading-relaxed text-[13px]">
                        {t('str_647cfb13')}</p>
                    </motion.div>
                  ) : !hasSearched && !loading ? (
                    <motion.div
                      key="initial-state"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex flex-col items-center justify-center py-10 sm:py-18 px-3 sm:px-6 mx-1 sm:mx-2 bg-gradient-to-br from-white/70 to-slate-50/60 dark:from-slate-900/80 dark:to-slate-950/80 backdrop-blur-xl rounded-[32px] sm:rounded-[40px] border border-white/60 dark:border-white/10 shadow-sm relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-fuchsia-100 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-orange-100 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>

                      <div className="relative z-10 w-full max-w-5xl mb-10">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                          <div>
                            <h4 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                              {t('str_23b668d')}</h4>
                          </div>
                          <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
                            {t('str_c0e005')}</p>
                        </div>
                        <HorizontalScrollRail
                          label={t('str_404151bd')}
                          className="md:hidden"
                          viewportClassName="-mx-1 px-1 pb-2"
                          contentClassName="gap-3"
                          controlsVisibilityClass="flex"
                        >
                          {demoTemplates.map((handbook, index) => {
                            return (
                              <div
                                key={handbook.id}
                                onClick={() => {
                                  triggerHapticFeedback([16]);
                                  setActiveHandbook(handbook);
                                }}
                                className="relative overflow-hidden w-[320px] xs:w-[350px] sm:w-[410px] h-[255px] sm:h-[275px] shrink-0 rounded-[30px] flex flex-col justify-between cursor-pointer border border-slate-200 dark:border-white/10 shadow-md hover:shadow-xl transition-all group/demo ios-press"
                              >
                                {/* Absolute Background Image */}
                                <div className="absolute inset-0 z-0">
                                  <img
                                    src={handbook.image}
                                    alt={handbook.title}
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).onerror = null;
                                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                                    }}
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover transition-transform duration-750 group-hover/demo:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/65 to-slate-950/25" />
                                </div>

                                {/* Top Overlays */}
                                <div className="relative z-10 p-4 pb-0 flex items-start justify-between">
                                  <div className="w-fit inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 backdrop-blur-md px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                                    <Sparkles size={11} strokeWidth={2.6} className="text-purple-300" />
                                    {t('str_3ae3b039')}</div>
                                  
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex gap-1">
                                      <span className="rounded-md bg-slate-950/50 text-white border border-white/10 px-2 py-0.5 text-[9px] font-black backdrop-blur-md font-mono">
                                        {getIataCode(handbook.title)}
                                      </span>
                                      <span className="rounded-md bg-slate-950/50 text-pink-300 border border-white/10 px-1.5 py-0.5 text-[8.5px] font-black backdrop-blur-md uppercase tracking-wider font-sans">
                                        {handbook.days} Days
                                      </span>
                                    </div>
                                    <span className="rounded-md bg-emerald-500/85 text-white px-1.5 py-0.5 text-[8.5px] font-black backdrop-blur-md uppercase tracking-wider">
                                      {t('str_7f9d6ad7')}</span>
                                  </div>
                                </div>

                                {/* Bottom Overlays */}
                                <div className="relative z-10 p-5 pt-2 text-left text-white">
                                  <h3 className="text-[14.5px] xs:text-[15.5px] font-black tracking-tight drop-shadow-md text-white mb-1.5 leading-snug line-clamp-2">
                                    {handbook.title}
                                  </h3>
                                  <p className="text-[11px] leading-relaxed font-bold text-slate-200 drop-shadow-sm mb-3 line-clamp-2">
                                    {handbook.title.includes("東京") 
                                      ? "梅雨季最佳晴雨備案！由達人親研，不畏天氣，一次打包東京經典與潮牌地標。"
                                      : handbook.title.includes("大阪")
                                      ? "親自肉測！最省時的環球影城與極致美食，高含金量的保姆級關西規劃。"
                                      : "免等待免登入！專為新朋友準備的起跑暖身路線，體驗共編與豐富工具。"}
                                  </p>

                                  <div className="flex gap-2 border-t border-white/10 pt-3">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHapticFeedback([16]);
                                        handleCopyExpertItinerary(e, handbook);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black transition-all bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md ios-press"
                                    >
                                      <Copy size={11} />
                                      {t('str_405d3e95')}</button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHapticFeedback([16]);
                                        setActiveHandbook(handbook);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black border border-white/20 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 ios-press transition-all"
                                    >
                                      <Eye size={11} />
                                      {t('str_4735b7ac')}</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </HorizontalScrollRail>
                        <div className="hidden gap-3 md:grid md:grid-cols-3">
                          {demoTemplates.map((handbook) => {
                            return (
                              <div
                                key={handbook.id}
                                onClick={() => {
                                  triggerHapticFeedback([16]);
                                  setActiveHandbook(handbook);
                                }}
                                className="relative overflow-hidden w-full h-[255px] sm:h-[275px] rounded-[30px] flex flex-col justify-between cursor-pointer border border-slate-200 dark:border-white/10 shadow-md hover:shadow-xl transition-all group/demo ios-press"
                              >
                                {/* Absolute Background Image */}
                                <div className="absolute inset-0 z-0">
                                  <img
                                    src={handbook.image}
                                    alt={handbook.title}
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).onerror = null;
                                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                                    }}
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover transition-transform duration-750 group-hover/demo:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/65 to-slate-950/25" />
                                </div>

                                {/* Top Overlays */}
                                <div className="relative z-10 p-4 pb-0 flex items-start justify-between">
                                  <div className="w-fit inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 backdrop-blur-md px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                                    <Sparkles size={11} strokeWidth={2.6} className="text-purple-300" />
                                    {t('str_3ae3b039')}</div>
                                  
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex gap-1">
                                      <span className="rounded-md bg-slate-950/50 text-white border border-white/10 px-2 py-0.5 text-[9px] font-black backdrop-blur-md font-mono">
                                        {getIataCode(handbook.title)}
                                      </span>
                                      <span className="rounded-md bg-slate-950/50 text-pink-300 border border-white/10 px-1.5 py-0.5 text-[8.5px] font-black backdrop-blur-md uppercase tracking-wider font-sans">
                                        {handbook.days} Days
                                      </span>
                                    </div>
                                    <span className="rounded-md bg-emerald-500/85 text-white px-1.5 py-0.5 text-[8.5px] font-black backdrop-blur-md uppercase tracking-wider">
                                      {t('str_7f9d6ad7')}</span>
                                  </div>
                                </div>

                                {/* Bottom Overlays */}
                                <div className="relative z-10 p-5 pt-2 text-left text-white">
                                  <h3 className="text-[14.5px] xs:text-[15.5px] font-black tracking-tight drop-shadow-md text-white mb-1.5 leading-snug line-clamp-2">
                                    {handbook.title}
                                  </h3>
                                  <p className="text-[11px] leading-relaxed font-bold text-slate-200 drop-shadow-sm mb-3">
                                    {handbook.title.includes("東京") 
                                      ? "梅雨季最佳晴雨備案！由達人親研，不畏天氣，一次打包東京經典與潮牌地標。"
                                      : handbook.title.includes("大阪")
                                      ? "親自肉測！最省時的環球影城與極致美食，高含金量的保姆級關西規劃。"
                                      : "免等待免登入！專為新朋友準備的起跑暖身路線，體驗共編與豐富工具。"}
                                  </p>

                                  <div className="flex gap-2 border-t border-white/10 pt-3">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHapticFeedback([16]);
                                        handleCopyExpertItinerary(e, handbook);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black transition-all bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md ios-press"
                                    >
                                      <Copy size={11} />
                                      {t('str_405d3e95')}</button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHapticFeedback([16]);
                                        setActiveHandbook(handbook);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black border border-white/20 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 ios-press transition-all"
                                    >
                                      <Eye size={11} />
                                      {t('str_4735b7ac')}</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="relative mb-8">
                        <div className="w-24 h-24 bg-white shadow-xl shadow-slate-200/50 rounded-full flex items-center justify-center text-4xl relative z-10 group-hover:-translate-y-2 transition-transform duration-500 border border-slate-50">
                          <PlaneTakeoff
                            className="text-slate-900"
                            size={32}
                            strokeWidth={2.5}
                          />
                        </div>
                        <div className="absolute -inset-4 border-2 border-dashed border-slate-200 rounded-full animate-[spin_15s_linear_infinite] opacity-50"></div>
                      </div>

                      <h3 className="text-2xl sm:text-[32px] font-black text-slate-900 dark:text-white mb-4 tracking-tight text-center leading-tight">
                        {t('str_3c0246dd')}</h3>

                      <div className="flex flex-wrap gap-2 justify-center mb-4">
                        {["東京 NRT", "大阪 KIX", "倫敦 LHR", "紐約 JFK"].map(
                          (city, idx) => (
                            <button
                              key={city}
                              onClick={() => {
                                updateField("to", city);
                                setShowDestinationPicker(false);
                              }}
                              className={`px-4 py-2 bg-white hover:bg-slate-900 hover:text-white text-slate-600 rounded-full text-xs font-black tracking-widest border border-slate-200 hover:border-slate-900 shadow-sm ${chipPressClass}`}
                            >
                              {city}
                            </button>
                          ),
                        )}
                      </div>

                    </motion.div>
                  ) : loading ? (
                    <motion.div
                      key="skeleton"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                    >
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <FlightSkeletonCard key={i} />
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              )}
            </div>
          </div>

          {communityTrips.length > 0 && (
            <HomeTabContentFocusBlock containerRef={scrollRef} className="mt-12 md:mt-20 mb-8 md:mb-12 px-2">
              <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Globe className="text-sky-500" size={24} />
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    {t('str_26817364')}</h2>
                </div>
                <span className="text-[11px] font-black tracking-[0.15em] uppercase text-slate-500">
                  fork-and-remix
                </span>
              </div>

              <HorizontalScrollRail
                label={t('str_74034a96')}
                viewportClassName="w-full pb-6 -mx-6 px-6"
              >
                  {communityTrips.map((trip, index) => {
                    const isEven = index % 2 === 0;
                    const cardBg = isEven
                      ? "from-[#FCF9F2] to-[#FFF1EA] dark:from-slate-800 dark:to-slate-900"
                      : "from-[#EEF2FC] to-[#E2E8F0] dark:from-slate-800/90 dark:to-slate-900/90";

                    // Asymmetric Corners
                    const cornerShape = index % 3 === 0
                      ? "rounded-tl-[52px] rounded-br-[52px] rounded-tr-[20px] rounded-bl-[20px]"
                      : index % 3 === 1
                      ? "rounded-tr-[52px] rounded-bl-[52px] rounded-tl-[20px] rounded-br-[20px]"
                      : "rounded-tl-[24px] rounded-tr-[54px] rounded-br-[24px] rounded-bl-[54px]";

                    const polaroidRotation = index % 2 === 0 ? "rotate-[-3deg]" : "rotate-[2deg]";
                    const tapeRotation = index % 2 === 0 ? "rotate-[3deg]" : "rotate-[-2deg]";

                    return (
                      <motion.div
                        key={trip.id}
                        className="w-[320px] xs:w-[360px] sm:w-[440px] md:w-[480px] shrink-0 group/trip"
                      >
                        <div
                          onClick={(event) => {
                            handleCloneTrip(event, trip);
                          }}
                          className={`relative overflow-hidden h-[245px] sm:h-[270px] ${cornerShape} flex flex-row items-stretch cursor-pointer border-[2px] border-slate-900/10 dark:border-white/10 bg-gradient-to-br ${cardBg} shadow-[4px_4px_0px_0px_rgba(15,23,42,0.05)] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,0.1)] hover:-translate-y-1 hover:border-slate-400 dark:hover:border-white/30 transition-all duration-300 p-4 sm:p-5`}
                        >
                          {/* Left Column: Polaroid Framed Image */}
                          <div className="w-[105px] xs:w-[125px] sm:w-[145px] shrink-0 flex flex-col justify-start relative select-none">
                            <div className={`w-full aspect-[4/5] sm:h-[185px] bg-white dark:bg-slate-800 p-2 sm:p-2.5 pb-6 sm:pb-8 rounded-[16px] shadow-md border border-slate-200/40 dark:border-slate-700 ${polaroidRotation} group-hover/trip:scale-102 transition-transform duration-300 flex flex-col`}>
                              <div className="flex-1 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-[10px] relative">
                                <img
                                  src={trip.cover}
                                  alt={trip.title}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).onerror = null;
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                                  }}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                              </div>
                              <div className="h-4 sm:h-5 mt-1 sm:mt-2 overflow-hidden flex items-center justify-center">
                                <span className="font-mono text-[8.5px] sm:text-[9.5px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase leading-none truncate">
                                  {getIataCode(trip.destination) || "MEMO"}
                                </span>
                              </div>
                            </div>
                            <div className={`absolute top-[-8px] right-[4px] px-2.5 py-0.5 bg-yellow-100/90 dark:bg-yellow-950/95 border border-yellow-200/50 dark:border-yellow-905 text-yellow-800 dark:text-yellow-300 shadow-sm text-[8px] font-black uppercase tracking-widest leading-none ${tapeRotation} rounded-sm select-none`}>
                              POSTCARD
                            </div>
                          </div>

                          {/* Right Column: Custom Text & Badges */}
                          <div className="flex-1 flex flex-col justify-between text-left pl-2 select-none">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="inline-flex items-center gap-1 rounded-full bg-slate-900 dark:bg-slate-100 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white dark:text-slate-900 shadow-sm">
                                  <Sparkles size={8} className="text-yellow-400 dark:text-yellow-500" />
                                  {t('str_4057d75b')}</div>
                                <span className="rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-1 py-0.5 text-[8px] font-black uppercase tracking-wider font-mono">
                                  #{trip.destination || "台北"}
                                </span>
                              </div>
                              <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                                by {trip.author || "Anonymous"}
                              </span>
                            </div>

                            <div className="my-1.5 flex-1 flex flex-col justify-center">
                              <h3 className="text-[13px] xs:text-[14px] sm:text-[15px] font-black tracking-tight text-slate-900 dark:text-white leading-snug line-clamp-2">
                                {trip.title}
                              </h3>
                              <p className="text-[10.5px] line-clamp-2 sm:line-clamp-3 leading-relaxed font-bold text-slate-500 dark:text-slate-300 mt-0.5">
                                {t('str_2cc6af8f')}{trip.forkCount ?? trip.likes ?? 0} {t('str_28c8e103')}</p>
                            </div>

                            <div className="flex items-center gap-1.5 mt-auto">
                              <span className="rounded bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider whitespace-nowrap">
                                💚 {getSafetyStatus(trip.destination)}
                              </span>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleCloneTrip(event, trip);
                                }}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 sm:py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 shadow-md ios-press"
                              >
                                <Copy size={10} />
                                {t('str_2a6dcb5f')}</button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </HorizontalScrollRail>
            </HomeTabContentFocusBlock>
          )}

          {/* Subscription Section */}
          <HomeTabContentFocusBlock containerRef={scrollRef} className="mt-12 md:mt-20 mb-8 md:mb-12 px-2 pt-10 border-t border-slate-200/50 dark:border-white/10 text-left">
            <div className="flex items-center gap-2 mb-2">
              <BellRing size={20} className="text-pink-500 animate-pulse" />
              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {t('str_497b0ec5')}</h4>
            </div>
            <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {t('str_4e2be4eb')}</p>

            {/* List of Destinations available for subscriptions */}
            <div className="w-full mb-6">
              <HorizontalScrollRail
                label={t('str_3cd84df7')}
                viewportClassName="w-full pb-4 -mx-6 px-6"
                contentClassName="gap-4"
              >
                {destinationAlerts.map((dest) => {
                  const isWebPush = subscriptions.some(s => s.destination === dest.name && s.channel === 'web-push');
                  const isEmail = subscriptions.some(s => s.destination === dest.name && s.channel === 'email');

                  return (
                    <div key={dest.name} className="flex flex-row items-stretch w-[290px] xs:w-[325px] sm:w-[365px] shrink-0 rounded-[22px] border border-slate-100 dark:border-white/5 bg-slate-50/42 dark:bg-slate-900/30 overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <div className="relative w-28 xs:w-32 sm:w-36 shrink-0 overflow-hidden font-sans">
                        <img
                          src={dest.image}
                          alt={dest.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).onerror = null;
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                          }}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/40" />
                        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5 flex-wrap">
                          <span className="rounded-md bg-slate-950/45 px-2 py-0.5 text-[9px] font-black text-white backdrop-blur-md font-mono">
                            {dest.code}
                          </span>
                          <span className={`rounded-md px-1.5 py-0.5 text-[8.5px] font-black backdrop-blur-md ${dest.tagColor}`}>
                            {dest.health}
                          </span>
                        </div>
                        <div className="absolute bottom-2.5 left-2.5 text-white pr-2">
                          <h5 className="font-extrabold text-[13.5px] leading-tight">{dest.name}</h5>
                        </div>
                      </div>
                      
                      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                        <p className="text-[11.5px] leading-relaxed font-bold text-slate-500 dark:text-slate-400 text-left">
                          {dest.advisory}
                        </p>
                        <div className="flex gap-2 border-t border-slate-100 dark:border-white/5 pt-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSubscription(dest.name, 'web-push')}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black transition-all ${
                              isWebPush
                                ? "bg-pink-100 dark:bg-pink-950/40 text-pink-700 border border-pink-200"
                                : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            <Bell size={11} className={isWebPush ? "text-pink-600" : ""} />
                            {isWebPush ? "已開啟" : "推送"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSubscription(dest.name, 'email')}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black transition-all ${
                              isEmail
                                ? "bg-sky-100 dark:bg-sky-950/40 text-sky-700 border border-sky-200"
                                : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            <Mail size={11} className={isEmail ? "text-sky-600" : ""} />
                            {isEmail ? "已設" : "Email"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </HorizontalScrollRail>
            </div>

            {/* Subscription alerts and newsfeed */}
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 p-4 bg-white/20 dark:bg-slate-950/20">
              <div className="flex items-center gap-2 mb-3">
                <Rss size={16} className="text-pink-500 animate-pulse" />
                <h5 className="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  {t('str_6083175a')}</h5>
              </div>

              {newsLoading ? (
                <div className="text-center py-6 flex flex-col items-center justify-center">
                  <RefreshCw className="animate-spin text-slate-300 mb-2" size={24} />
                  <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                    {t('str_62990507')}</p>
                </div>
              ) : newsFeed.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                    {t('str_217cdbb5')}</p>
                </div>
              ) : (
                <div className="w-full relative mt-2">
                  <HorizontalScrollRail
                    label={t('str_62e7dd15')}
                    viewportClassName="w-full pb-4 -mx-4 px-4"
                    contentClassName="gap-3"
                  >
                    {newsFeed.map((alert, idx) => (
                      <div key={alert.id || idx} className="flex flex-col w-[240px] xs:w-[260px] shrink-0 gap-2 p-3.5 rounded-[18px] bg-white/60 dark:bg-slate-900/40 border border-white/80 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 shrink-0 rounded-full bg-pink-100 dark:bg-pink-950/40 text-pink-600 text-[10px] font-black flex items-center justify-center">
                            {alert.type === 'deal' ? '💰' : '⚠️'}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-black text-slate-800 dark:text-white">
                              {alert.dest}
                            </span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                              alert.type === 'deal' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {alert.tag}
                            </span>
                          </div>
                        </div>
                        <a href={alert.link} target="_blank" rel="noopener noreferrer" className="block text-[12px] font-bold text-slate-600 dark:text-slate-300 mt-1 leading-relaxed text-left font-sans hover:text-sky-600 hover:underline transition-colors line-clamp-3">
                          {alert.text}
                        </a>
                      </div>
                    ))}
                  </HorizontalScrollRail>
                  {/* Show total count */}
                  <p className="text-[10px] text-slate-400 font-extrabold text-right pr-2">
                    {t('str_25433f3d')}</p>
                </div>
              )}
            </div>
          </HomeTabContentFocusBlock>


          {/* Featured Destinations Section */}
          <HomeTabContentFocusBlock containerRef={scrollRef} className="mt-12 md:mt-20 mb-8 md:mb-12 px-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Globe className="text-emerald-500" size={24} />
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  {t('str_11552810')}</h2>
              </div>
              <span className="text-[11px] font-black tracking-[0.15em] uppercase text-slate-500 hidden sm:block">
                travel-guide-tw
              </span>
            </div>

            <HorizontalScrollRail
              label={t('str_11552810')}
              viewportClassName="w-full pb-6 -mx-6 px-6"
            >
                {localizedFeaturedDestinations.map((dest, index) => {
                  const isEven = index % 2 === 0;
                  const cardBg = isEven
                    ? "from-[#EAF5EC] to-[#E2F0EA] dark:from-slate-800 dark:to-slate-900"
                    : "from-[#FFF5F2] to-[#FFEBE4] dark:from-slate-800 dark:to-indigo-950";

                  // Alternate corners for asymmetrical organic look
                  const cornerShape = index % 3 === 0
                    ? "rounded-tr-[52px] rounded-bl-[52px] rounded-tl-[20px] rounded-br-[20px]"
                    : index % 3 === 1
                    ? "rounded-tl-[52px] rounded-br-[52px] rounded-tr-[20px] rounded-bl-[20px]"
                    : "rounded-tl-[24px] rounded-tr-[54px] rounded-br-[24px] rounded-bl-[54px]";

                  const polaroidRotation = index % 2 === 0 ? "rotate-[2.5deg]" : "rotate-[-3deg]";
                  const tapeRotation = index % 2 === 0 ? "rotate-[-3deg]" : "rotate-[2deg]";

                  return (
                    <motion.div
                      key={dest.id}
                      className="w-[280px] xs:w-[320px] sm:w-[400px] md:w-[440px] shrink-0 group/dest"
                    >
                      <div
                        onClick={() => {
                          const g = getCountryGuide(dest.id);
                          if (g) setActiveGuide(g);
                        }}
                        className={`relative overflow-hidden h-[210px] xs:h-[230px] sm:h-[270px] ${cornerShape} flex flex-row items-stretch cursor-pointer border-[2px] border-slate-900/10 dark:border-white/10 bg-gradient-to-br ${cardBg} shadow-[4px_4px_0px_0px_rgba(15,23,42,0.05)] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,0.1)] hover:-translate-y-1 hover:border-slate-400 dark:hover:border-white/30 transition-all duration-300 p-3 sm:p-5`}
                      >
                        {/* Left Column: Polaroid Framed Image */}
                        <div className="w-[90px] xs:w-[110px] sm:w-[140px] shrink-0 flex flex-col justify-start relative select-none">
                          <div className={`w-full aspect-[4/5] sm:h-[185px] bg-white dark:bg-slate-800 p-1.5 sm:p-2.5 pb-4 sm:pb-8 rounded-[12px] sm:rounded-[16px] shadow-md border border-slate-200/40 dark:border-slate-700 ${polaroidRotation} group-hover/dest:scale-102 transition-transform duration-300 flex flex-col`}>
                            <div className="flex-1 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-[10px] relative">
                              <img
                                src={dest.image}
                                alt={dest.name}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).onerror = null;
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                                }}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                            </div>
                            <div className="h-4 sm:h-5 mt-1 sm:mt-2 overflow-hidden flex items-center justify-center">
                              <span className="font-mono text-[8.5px] sm:text-[9.5px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase leading-none truncate">
                                {dest.name || "GUIDE"}
                              </span>
                            </div>
                          </div>

                          {/* Paper Tape Decorative Sticker */}
                          <div className={`absolute top-[-8px] left-[4px] px-2.5 py-0.5 bg-emerald-100/90 dark:bg-emerald-950/95 border border-emerald-200/50 dark:border-emerald-905 text-emerald-800 dark:text-emerald-300 shadow-sm text-[8px] font-black uppercase tracking-widest leading-none ${tapeRotation} rounded-sm select-none`}>
                            {getIataCode(dest.name) || "GUIDE"}
                          </div>
                        </div>

                        {/* Right Column: Custom Info Details */}
                        <div className="flex-1 flex flex-col justify-between text-left pl-2 select-none">
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-900 dark:bg-emerald-100 px-2.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white dark:text-emerald-900 shadow-sm">
                                <Sparkles size={8} className="text-yellow-400 dark:text-yellow-500" />
                                {t('str_3adf062a')}</div>
                              <span className="rounded bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-300 px-1 py-0.5 text-[8.5px] font-black uppercase tracking-wider font-mono">
                                #{dest.tags[0] || "漫遊"}
                              </span>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div className="my-1.5 flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xl leading-none drop-shadow-sm">{dest.flag}</span>
                              <h3 className="text-[13.5px] xs:text-[14px] sm:text-[15.5px] font-black tracking-tight text-slate-900 dark:text-white leading-snug">
                                {dest.name} {t('str_354a01b2')}</h3>
                            </div>
                            <p className="text-[11px] leading-relaxed font-bold text-slate-500 dark:text-slate-400 line-clamp-2 sm:line-clamp-3">
                              {dest.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 mt-auto">
                            <span className="rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider whitespace-nowrap">
                              {dest.highlights?.[0] || "🗺️ 精選行程"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const g = getCountryGuide(dest.id);
                                if (g) setActiveGuide(g);
                              }}
                              className="ml-auto flex items-center gap-1 px-3 py-1.5 sm:py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-500 dark:hover:bg-emerald-400 text-white shadow-md ios-press"
                            >
                              <ExternalLink size={10} />
                              {t('str_4623bd5f')}</button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </HorizontalScrollRail>
          </HomeTabContentFocusBlock>

          {/* Expert Handbooks Section */}
          <HomeTabContentFocusBlock containerRef={scrollRef} className="mt-12 md:mt-20 mb-8 md:mb-12 px-2">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-fuchsia-500" size={24} />
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {t('str_7f35ed14')}</h2>
            </div>

            <HorizontalScrollRail
              label={t('str_7f35ed14')}
              viewportClassName="w-full pb-6 -mx-6 px-6"
            >
                {localizedExpertHandbooks.map((handbook, index) => {
                  const isEven = index % 2 === 0;
                  const cardBg = isEven
                    ? "from-[#F5F3FF] to-[#EDE9FE] dark:from-slate-800 dark:to-slate-900"
                    : "from-[#FFF1EB] to-[#FFF9F5] dark:from-slate-800/90 dark:to-slate-900/95";

                  // Asymmetrical corners
                  const cornerShape = index % 3 === 0
                    ? "rounded-tl-[52px] rounded-br-[52px] rounded-tr-[20px] rounded-bl-[20px]"
                    : index % 3 === 1
                    ? "rounded-tr-[52px] rounded-bl-[52px] rounded-tl-[20px] rounded-br-[20px]"
                    : "rounded-tl-[24px] rounded-tr-[54px] rounded-br-[24px] rounded-bl-[54px]";

                  const polaroidRotation = index % 2 === 0 ? "rotate-[-2.5deg]" : "rotate-[3deg]";
                  const tapeRotation = index % 2 === 0 ? "rotate-[3deg]" : "rotate-[-2.5deg]";

                  return (
                    <motion.div
                      key={handbook.id}
                      className="w-[280px] xs:w-[320px] sm:w-[400px] md:w-[440px] shrink-0 group/handbook"
                    >
                      <div
                        onClick={() => setActiveHandbook(handbook)}
                        className={`relative overflow-hidden h-[210px] xs:h-[230px] sm:h-[270px] ${cornerShape} flex flex-row items-stretch cursor-pointer border-[2px] border-slate-900/10 dark:border-white/10 bg-gradient-to-br ${cardBg} shadow-[4px_4px_0px_0px_rgba(15,23,42,0.05)] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,0.1)] hover:-translate-y-1 hover:border-slate-400 dark:hover:border-white/30 transition-all duration-300 p-3 sm:p-5`}
                      >
                        {/* Left Column: Polaroid Framed Image */}
                        <div className="w-[90px] xs:w-[110px] sm:w-[140px] shrink-0 flex flex-col justify-start relative select-none">
                          <div className={`w-full aspect-[4/5] sm:h-[185px] bg-white dark:bg-slate-800 p-1.5 sm:p-2.5 pb-4 sm:pb-8 rounded-[12px] sm:rounded-[16px] shadow-md border border-slate-200/40 dark:border-slate-700 ${polaroidRotation} group-hover/handbook:scale-102 transition-transform duration-300 flex flex-col`}>
                            <div className="flex-1 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-[10px] relative">
                              <img
                                src={handbook.image}
                                alt={handbook.title}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).onerror = null;
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                                }}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                            </div>
                            <div className="h-4 sm:h-5 mt-1 sm:mt-2 overflow-hidden flex items-center justify-center">
                              <span className="font-mono text-[8.5px] sm:text-[9.5px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase leading-none truncate">
                                {handbook.days || 3} DAYS
                              </span>
                            </div>
                          </div>

                          {/* Paper Tape Decorative Sticker */}
                          <div className={`absolute top-[-8px] right-[4px] px-2.5 py-0.5 bg-fuchsia-100/90 dark:bg-fuchsia-950/95 border border-fuchsia-200/50 dark:border-fuchsia-905 text-fuchsia-800 dark:text-fuchsia-300 shadow-sm text-[8px] font-black uppercase tracking-widest leading-none ${tapeRotation} rounded-sm select-none`}>
                            {getIataCode(handbook.title) || "TRIP"}
                          </div>
                        </div>

                        {/* Right Column: Custom Info Details */}
                        <div className="flex-1 flex flex-col justify-between text-left pl-2 select-none">
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="inline-flex items-center gap-1 rounded-full bg-purple-900 dark:bg-purple-100 px-2.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white dark:text-purple-900 shadow-sm">
                                <Sparkles size={8} className="text-yellow-400 dark:text-yellow-500" />
                                {t('str_42d422a5')}</div>
                              <span className="rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-1 py-0.5 text-[8.5px] font-black uppercase tracking-wider font-mono">
                                #{handbook.tags[0] || "漫遊"}
                              </span>
                            </div>

                            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 dark:text-slate-500">
                              by {handbook.author}
                            </span>
                          </div>

                          {/* Title & Description */}
                          <div className="my-1.5 flex-1 flex flex-col justify-center">
                            <h3 className="text-[13px] xs:text-[14.5px] sm:text-[15.5px] font-black tracking-tight text-slate-900 dark:text-white leading-snug line-clamp-2">
                              {handbook.title}
                            </h3>
                            <p className="text-[11px] leading-relaxed font-bold text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 sm:line-clamp-3">
                              {t('str_27ea802b')}{handbook.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}。
                            </p>
                          </div>

                          <div className="flex items-center gap-1 mt-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyExpertItinerary(e, handbook);
                              }}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all bg-purple-600 dark:bg-purple-500 hover:bg-purple-500 dark:hover:bg-purple-400 text-white shadow-md ios-press"
                            >
                              <Copy size={10} />
                              {t('str_405d3e95')}</button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveHandbook(handbook);
                              }}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 rounded-full text-[9px] font-black uppercase tracking-wider border border-slate-400 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white/45 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 ios-press transition-all"
                            >
                              {t('str_12f3ad')}</button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </HorizontalScrollRail>
          </HomeTabContentFocusBlock>        </div>
      </div>

      {activeGuide && (
        <CountryGuideModal
          open={!!activeGuide}
          guide={activeGuide}
          onClose={() => setActiveGuide(null)}
        />
      )}

      <InfoPeekModal
        open={!!activeStoryInfo}
        content={activeStoryInfo}
        onClose={() => setActiveStoryInfo(null)}
      />

      {activeHandbook && (
        <ExpertHandbookModal
          open={!!activeHandbook}
          handbook={activeHandbook}
          onClose={() => setActiveHandbook(null)}
          onCopyPath={(handbook) => {
            handleCopyExpertItinerary(undefined, handbook);
          }}
        />
      )}

      {showDeparturePicker && (
        <LocationPickerPopup
          title={t('str_1426bae')}
          query={searchForm.from}
          onClose={() => setShowDeparturePicker(false)}
          onSelect={(dest) => applyGuideDestination(dest, "from")}
        />
      )}

      {showDestinationPicker && (
        <LocationPickerPopup
          title={t('str_781f2fb5')}
          query={searchForm.to}
          onClose={() => setShowDestinationPicker(false)}
          onSelect={(dest) => applyGuideDestination(dest, "to")}
        />
      )}

      {showDatePicker && (
        <DatePickerPopup
          selectedDate={searchForm.date}
          onSelect={selectDate}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {showReturnDatePicker && (
        <DatePickerPopup
          selectedDate={searchForm.returnDate}
          onSelect={selectReturnDate}
          onClose={() => setShowReturnDatePicker(false)}
          minDate={searchForm.date || undefined}
        />
      )}

      {/* Portfolio Section */}
      <PortfolioSection />

      {/* Animation Overlay for Flying Card */}
      <AnimatePresence>
        {flyingCard && (
          <motion.div
            key={flyingCard.id}
            initial={{
              position: "fixed",
              top: flyingCard.startY,
              left: flyingCard.startX,
              width: flyingCard.width,
              height: flyingCard.height,
              opacity: 1,
              scale: 1,
              zIndex: 9999,
              borderRadius: "24px",
              backgroundColor: "white",
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              overflow: "hidden",
              x: "-50%",
              y: "-50%",
            }}
            animate={{
              top: [
                flyingCard.startY,
                flyingCard.startY - 100,
                window.innerHeight - 40,
              ],
              left: [
                flyingCard.startX,
                flyingCard.startX +
                  (window.innerWidth / 2 - flyingCard.startX) * 0.5,
                window.innerWidth / 2,
              ],
              width: [flyingCard.width, 160, 20],
              height: [flyingCard.height, 100, 20],
              scale: [1, 1.05, 0.1],
              opacity: [1, 1, 0],
              rotate: [0, -10, -360],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
              times: [0, 0.4, 1],
            }}
          >
            {flyingCard.handbook ? (
              <div className="w-full h-full flex flex-col pointer-events-none">
                <img
                  src={
                    flyingCard.handbook.image || flyingCard.handbook.coverImage
                  }
                  alt={flyingCard.handbook.title || "行程預覽"}
                  onError={(e) => {
                    (e.target as HTMLImageElement).onerror = null;
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                  }}
                  referrerPolicy="no-referrer"
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

      {/* SEO internal links */}
      <div style={{ paddingTop: 24, paddingBottom: 24, alignItems: 'center' }} className="flex flex-col items-center gap-1">
        <div className="flex flex-row gap-4">
          <a
            href="/fly/"
            style={{ color: '#94a3b8', fontSize: 11 }}
          >
            {t('str_ab8ff02')}</a>
          <a
            href="/trips/"
            style={{ color: '#94a3b8', fontSize: 11 }}
          >
            {t('str_78790f42')}</a>
        </div>
      </div>
    </motion.div>
  );
}
