import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
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
  createTripFact,
  syncItinerary,
  fetchUserSubscriptions,
  toggleUserSubscription,
} from "../lib/workflowApi";
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
import {
  layoutIndicatorTransition,
  pressableSurfaceClass,
  raisedHoverClass,
  subtlePressableClass,
} from "../lib/motionTokens";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type RoundTripLegView = "outbound" | "return";

function extractAirportCode(value?: string) {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (!normalized) return "";
  const matches = normalized.match(/[A-Z]{3}/g);
  if (matches?.length) return matches[matches.length - 1];
  return normalized.replace(/[^A-Z0-9]/g, "").slice(0, 3);
}

const HERO_STORY_PILLARS = [
  {
    icon: PlaneTakeoff,
    eyebrow: "航班節奏",
    title: "先鎖定出發與回程",
    description: "確定出發日期，建立旅行的時間骨架。",
    details: [
      "日期定下來，時間就會變得具體。",
      "先不用決定住宿與景點，將出發與回程先固定。",
      "後續都可以順著這節奏安排。",
    ],
    tone: "sky",
  },
  {
    icon: Globe,
    eyebrow: "地圖動線",
    title: "住宿與景點一目瞭然",
    description: "將所有旅途資訊，收攏在一個地圖上。",
    details: [
      "確認住宿後，景點分佈與動線更清晰。",
      "機場、行程與住宿整合成為同一路線。",
      "讓旅伴一看就懂整趟行程。",
    ],
    tone: "cyan",
  },
  {
    icon: Sparkles,
    eyebrow: "AI 輔助",
    title: "AI 起草，旅伴共編",
    description: "先產生草稿，不需一次到位，保留彈性。",
    details: [
      "AI 快速建立行程架構，再手動微調。",
      "草稿完成後再邀請旅伴加入討論。",
      "清單與分工隨時可補，先建立主線。",
    ],
    tone: "orange",
  },
] as const;

const HERO_PILLAR_DECOR = [
  {
    shell: "glass-card",
    badge: "border-pink-100 bg-pink-100/90 text-pink-700",
    glow: "bg-pink-200/55",
    note: "確定出發節奏，再調整細節。",
  },
  {
    shell: "glass-card",
    badge: "border-teal-100 bg-teal-50/95 text-teal-700",
    glow: "bg-teal-200/50",
    note: "景點與動線，一圖搞定。",
  },
  {
    shell: "glass-card",
    badge: "border-sky-100 bg-sky-50/95 text-sky-700",
    glow: "bg-sky-200/55",
    note: "先起草一版，再邀旅伴。",
  },
] as const;

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

const AIRLINE_CODES: Record<string, string> = {
  "EVA Air": "BR",
  長榮航空: "BR",
  "China Airlines": "CI",
  中華航空: "CI",
  "Starlux Airlines": "JX",
  星宇航空: "JX",
  "Tigerair Taiwan": "IT",
  台灣虎航: "IT",
  "Peach Aviation": "MM",
  樂桃航空: "MM",
  "Cathay Pacific": "CX",
  國泰航空: "CX",
  "Japan Airlines": "JL",
  日本航空: "JL",
  "All Nippon Airways": "NH",
  全日空: "NH",
  "Hong Kong Airlines": "HX",
  香港航空: "HX",
  "Asiana Airlines": "OZ",
  韓亞航空: "OZ",
  "Korean Air": "KE",
  大韓航空: "KE",
  "China Eastern Airlines": "MU",
  東方航空: "MU",
  "China Eastern": "MU",
  中國東方航空: "MU",
  "Air Macau": "NX",
  澳門航空: "NX",
  Scoot: "TR",
  酷航: "TR",
  "HK Express": "UO",
  香港快運: "UO",
  // standard OTAs no image
};

function AirlineLogo({
  providerName,
  className,
}: {
  providerName: string;
  className: string;
}) {
  const normalizedName = providerName?.trim() || "";
  const code = AIRLINE_CODES[normalizedName];
  if (code) {
    return (
      <img
        src={`https://skyticket.com/img/airline_images/${code}.jpg`}
        alt={normalizedName}
        className={`${className} object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }
  const initial = normalizedName?.charAt(0) || "?";
  return (
    <div
      className={`${className} bg-slate-900 flex items-center justify-center font-black text-white shadow-sm`}
    >
      {initial}
    </div>
  );
}

interface FlightCardProps {
  flight: SearchItem;
  isSaved: boolean;
  isTracked: boolean;
  onPress: () => void;
  onImportToTrip: (e: React.MouseEvent) => void;
  onToggleSave: (e: React.MouseEvent) => void;
  onToggleTrack: (e: React.MouseEvent) => void;
}

function FlightCard({
  flight,
  isSaved,
  isTracked,
  onPress,
  onImportToTrip,
  onToggleSave,
  onToggleTrack,
}: FlightCardProps) {
  const providerName = flight.details?.airline || flight.provider;

  return (
    <div
      className="block w-full h-full text-left appearance-none border-none bg-transparent p-0 flex flex-col focus:outline-none group/card cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={`查看 ${providerName} 航班 ${flight.details?.depCode || ""} → ${flight.details?.arrCode || ""} ${flight.currency} ${flight.price}`}
      onClick={onPress}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPress();
        }
      }}
    >
      <GlassCard
        className={`!p-0 glass-card dark:bg-slate-800 flex-1 flex flex-col overflow-hidden rounded-[32px] sm:rounded-[36px] transition-all duration-200 ${pressableSurfaceClass} ${raisedHoverClass}`}
      >
        {/* Top Section: Airline & Route */}
        <div className="p-3.5 sm:p-4 flex flex-col gap-2.5">
          {/* Header: Airline + stop/duration badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AirlineLogo
                providerName={providerName}
                className="w-7 h-7 rounded-lg text-sm"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {flight.details?.airline || flight.provider}
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-[0.22em]">
                  {flight.provider}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                  flight.details?.stops === 0
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {flight.details?.stops === 0
                  ? "DIRECT"
                  : `${flight.details?.stops} STOP`}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-tight whitespace-nowrap">
                {flight.details?.duration || "3h 15m"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(e);
                }}
                aria-label={isSaved ? "取消收藏" : "收藏航班"}
                className={`w-8 h-8 rounded-full flex justify-center items-center ${subtlePressableClass} ${
                  isSaved
                    ? "bg-pink-100 text-pink-600"
                    : "bg-slate-100/80 text-slate-500 hover:bg-pink-50 hover:text-pink-500"
                }`}
              >
                <Heart
                  size={13}
                  fill={isSaved ? "currentColor" : "transparent"}
                  strokeWidth={2.5}
                />
              </button>
            </div>
          </div>

          {/* Time & Airports Row */}
          <div className="flex items-center justify-between mt-1 px-0.5 relative">
            <div className="absolute left-[3rem] right-[3rem] top-1/2 -translate-y-1/2 flex items-center">
              <div className="w-1.5 h-1.5 rounded-full border border-slate-300 bg-white z-10" />
              <div className="flex-1 border-t-[1.5px] border-dashed border-slate-300" />
              <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center z-10 absolute left-1/2 -translate-x-1/2 rotate-90">
                <PlaneTakeoff size={8} strokeWidth={2.5} className="-ml-0.5" />
              </div>
              <div className="w-1.5 h-1.5 rounded-full border border-slate-300 bg-white z-10" />
            </div>
            <div className="flex flex-col items-start z-10 bg-white/40 dark:bg-transparent backdrop-blur-sm pr-1">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                {flight.details?.departure}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-[0.2em] leading-none">
                Depart
              </span>
            </div>
            <div className="flex flex-col items-end z-10 bg-white/40 dark:bg-transparent backdrop-blur-sm pl-1">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                {flight.details?.arrival}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-[0.2em] leading-none">
                Arrive
              </span>
            </div>
          </div>

          {/* Return leg row — roundtrip bundles */}
          {flight.tripType === "roundtrip" && flight.returnLeg && (
            <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-black tracking-[0.2em] uppercase text-sky-500 bg-sky-50 px-1.5 py-[2px] rounded-sm whitespace-nowrap">
                  回程
                </span>
              </div>
              <div className="flex items-center justify-between px-0.5">
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-base font-black text-slate-900 dark:text-white tracking-tighter leading-none whitespace-nowrap">
                    {flight.returnLeg.departure}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap">
                    Depart
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center px-2">
                  <div className="w-full border-t border-dashed border-slate-300" />
                </div>
                <div className="flex flex-col items-end min-w-0">
                  <span className="text-base font-black text-slate-900 dark:text-white tracking-tighter leading-none whitespace-nowrap">
                    {flight.returnLeg.arrival}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap">
                    Arrive
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 px-1">
                <span
                  className={`text-[11px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm whitespace-nowrap ${flight.returnLeg.stops === 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
                >
                  {flight.returnLeg.stops === 0
                    ? "直飛"
                    : `${flight.returnLeg.stops} 轉 STOP`}
                </span>
                {flight.returnLeg.duration && (
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500 dark:text-slate-300 whitespace-nowrap">
                    {flight.returnLeg.duration}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ticket cutout separator */}
        <div className="relative flex items-center h-3 w-full">
          <div className="absolute left-[-6px] w-3 h-3 bg-[#FAFAFA] dark:bg-slate-900 rounded-full border-r border-slate-200/60 shadow-inner" />
          <div className="absolute right-[-6px] w-3 h-3 bg-[#FAFAFA] dark:bg-slate-900 rounded-full border-l border-slate-200/60 shadow-inner" />
          <div className="w-full border-t border-dashed border-slate-300 mx-2.5" />
        </div>

        {/* Bottom: Price & CTAs */}
        <div className="p-3.5 pt-1.5 sm:p-4 sm:pt-2 flex items-end justify-between mt-auto">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-350 uppercase tracking-[0.22em] mb-0.5">
              Estimated Price
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-350">
                {flight.currency}
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none tabular-nums">
                {flight.price.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleTrack(e);
              }}
              aria-label={isTracked ? "取消追蹤降價" : "追蹤降價"}
              className={`w-11 h-11 rounded-[10px] flex items-center justify-center border ${subtlePressableClass} ${raisedHoverClass} ${
                isTracked
                  ? "bg-slate-900 border-slate-900 text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-500 dark:text-slate-300 hover:border-slate-300 hover:text-slate-800 shadow-sm hover:shadow"
              }`}
            >
              {isTracked ? (
                <BellRing size={14} strokeWidth={2.5} />
              ) : (
                <Bell size={14} strokeWidth={2.5} />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImportToTrip(e);
              }}
              aria-label="帶入行程"
              className={`h-11 px-4 rounded-[10px] flex items-center gap-1.5 border border-transparent bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg ${subtlePressableClass} ${raisedHoverClass}`}
            >
              <PlaneTakeoff size={14} strokeWidth={2.5} />
              <span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline">
                帶入
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPress();
              }}
              className={`h-11 px-5 rounded-[10px] bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_10px_20px_rgba(244,114,182,0.16)] ${subtlePressableClass} ${raisedHoverClass}`}
            >
              <span className="text-[11px] uppercase tracking-widest leading-none">
                購買
              </span>
            </button>
          </div>
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
  onImportToTrip,
  onToggleSave,
  onToggleTrack,
}: {
  results: SearchItem[];
  savedItems: string[];
  trackedPrices: string[];
  onPress: (f: SearchItem) => void;
  onImportToTrip: (e: React.MouseEvent, f: SearchItem) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  onToggleTrack: (e: React.MouseEvent, f: SearchItem) => void;
}) {
  return (
    <div className="flex flex-col gap-3 w-full pb-4">
      {results.map((flight) => {
        const providerName = flight.details?.airline || flight.provider;
        const isSaved = savedItems.includes(flight.id);
        const isTracked = trackedPrices.includes(flight.id);

        return (
          <div
            key={flight.id}
            role="button"
            tabIndex={0}
            aria-label={`查看 ${providerName} 航班 ${flight.details?.depCode || ""} → ${flight.details?.arrCode || ""} ${flight.currency} ${flight.price}`}
            className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden cursor-pointer shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12)] hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-300"
            onClick={() => onPress(flight)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPress(flight);
              }
            }}
          >
            <div className="p-4 flex flex-col md:flex-row md:items-stretch gap-4 md:gap-6 text-left">
              {/* Left: Leg List (Outbound + Optional Return) */}
              <div className="flex-1 flex flex-col justify-center gap-3 md:gap-4">
                
                {/* Outbound */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                  {/* Airline header (Leftmost on desktop) */}
                  <div className="flex items-center gap-2 md:w-[140px] shrink-0">
                    <AirlineLogo
                      providerName={providerName}
                      className="w-7 h-7 rounded-sm text-xs shadow-sm"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-slate-800 dark:text-white leading-tight">
                        {providerName}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {flight.details?.flightNumber || "經濟艙"}
                      </span>
                    </div>
                  </div>

                  {/* Timeline Route */}
                  <div className="flex-1 flex items-center justify-between px-1 md:px-0">
                    {/* Dep */}
                    <div className="flex flex-col items-start w-[60px]">
                      <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        {flight.details?.departure || "00:00"}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                        {(flight.details?.depCode || "TPE").toUpperCase()}
                      </span>
                    </div>

                    {/* Arrow/Line */}
                    <div className="flex flex-col items-center flex-1 px-4">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mb-1.5">
                        {flight.details?.duration || "3h 15m"}
                      </span>
                      <div className="w-full relative flex items-center justify-center">
                        <div className="w-full h-[2px] bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center px-2 bg-white dark:bg-slate-800">
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm ${
                            flight.details?.stops === 0
                              ? "text-emerald-500 border border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/30"
                              : "text-slate-500 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          }`}>
                            {flight.details?.stops === 0 ? "直飛" : `${flight.details?.stops}轉`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Arr */}
                    <div className="flex flex-col items-end w-[60px]">
                      <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        {flight.details?.arrival || "00:00"}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                        {(flight.details?.arrCode || "TYO").toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Return Leg */}
                {flight.tripType === "roundtrip" && flight.returnLeg && (
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 md:w-[140px] shrink-0">
                      <span className="text-[10px] font-black text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-100 dark:border-sky-800 rounded px-1.5 py-0.5 whitespace-nowrap hidden md:block">回程</span>
                      <AirlineLogo
                        providerName={flight.returnLeg.airline || providerName}
                        className="w-7 h-7 rounded-sm text-xs shadow-sm"
                      />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-800 dark:text-white leading-tight">
                          {flight.returnLeg.airline || providerName}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 md:hidden">
                          回程
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-between px-1 md:px-0">
                      <div className="flex flex-col items-start w-[60px]">
                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                          {flight.returnLeg.departure || "00:00"}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                          {(flight.details?.arrCode || "TYO").toUpperCase()}
                        </span>
                      </div>

                      <div className="flex flex-col items-center flex-1 px-4">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mb-1.5">
                          {flight.returnLeg.duration || "3h 15m"}
                        </span>
                        <div className="w-full relative flex items-center justify-center">
                          <div className="w-full h-[2px] bg-slate-200 dark:bg-slate-700 rounded-full" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center px-2 bg-white dark:bg-slate-800">
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm ${
                              flight.returnLeg.stops === 0
                                ? "text-emerald-500 border border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/30"
                                : "text-slate-500 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                            }`}>
                              {flight.returnLeg.stops === 0 ? "直飛" : `${flight.returnLeg.stops}轉`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end w-[60px]">
                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                          {flight.returnLeg.arrival || "00:00"}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                          {(flight.details?.depCode || "TPE").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Price Segment */}
              <div className="flex flex-row md:flex-col items-end justify-between md:justify-center md:w-[160px] md:border-l border-slate-100 dark:border-slate-700 md:pl-6 pt-4 md:pt-0 mt-2 md:mt-0 border-t md:border-t-0 border-dashed md:border-solid shrink-0">
                <div className="flex flex-col items-start md:items-end w-full">
                  <div className="flex items-baseline gap-1 text-sky-600 dark:text-sky-400 justify-end w-full">
                    <span className="text-xs font-bold">
                      {flight.currency}
                    </span>
                    <span className="text-2xl font-black tabular-nums tracking-tighter">
                      {flight.price.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">含稅總價</span>
                </div>

                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(e, flight.id);
                    }}
                    aria-label={isSaved ? "取消收藏" : "收藏航班"}
                    className={`h-8 w-8 rounded flex items-center justify-center transition-colors border ${
                      isSaved
                        ? "bg-rose-50 border-rose-100 text-rose-500"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400 hover:text-rose-500"
                    }`}
                  >
                    <Heart size={14} fill={isSaved ? "currentColor" : "transparent"} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImportToTrip(e, flight);
                    }}
                    className="h-8 px-4 rounded bg-sky-500 text-white font-bold text-xs hover:bg-sky-600 transition-colors shadow-sm"
                  >
                    選取
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Destination metadata lookup by IATA code
const DEST_META: Record<
  string,
  {
    name: string;
    country: string;
    flag: string;
    tagline: string;
    image: string;
  }
> = {
  NRT: {
    name: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    tagline: "Where tradition meets the future",
    image:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop",
  },
  TYO: {
    name: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    tagline: "Where tradition meets the future",
    image:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop",
  },
  HND: {
    name: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    tagline: "Where tradition meets the future",
    image:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop",
  },
  KIX: {
    name: "Osaka",
    country: "Japan",
    flag: "🇯🇵",
    tagline: "Street food capital of Japan",
    image:
      "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=600&auto=format&fit=crop",
  },
  OSA: {
    name: "Osaka",
    country: "Japan",
    flag: "🇯🇵",
    tagline: "Street food capital of Japan",
    image:
      "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=600&auto=format&fit=crop",
  },
  ITM: {
    name: "Osaka",
    country: "Japan",
    flag: "🇯🇵",
    tagline: "Street food capital of Japan",
    image:
      "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=600&auto=format&fit=crop",
  },
  FUK: {
    name: "Fukuoka",
    country: "Japan",
    flag: "🇯🇵",
    tagline: "Ramen city by the sea",
    image:
      "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=600&auto=format&fit=crop",
  },
  OKA: {
    name: "Okinawa",
    country: "Japan",
    flag: "🇯🇵",
    tagline: "Tropical paradise of East Asia",
    image:
      "https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=600&auto=format&fit=crop",
  },
  CTS: {
    name: "Hokkaido",
    country: "Japan",
    flag: "🇯🇵",
    tagline: "Fresh seafood and winter wonderland",
    image:
      "https://images.unsplash.com/photo-1553031977-03959cc47ac4?w=600&auto=format&fit=crop",
  },
  CDG: {
    name: "Paris",
    country: "France",
    flag: "🇫🇷",
    tagline: "City of Love and Light",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop",
  },
  LHR: {
    name: "London",
    country: "UK",
    flag: "🇬🇧",
    tagline: "Royal history meets modern culture",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&auto=format&fit=crop",
  },
  JFK: {
    name: "New York",
    country: "USA",
    flag: "🇺🇸",
    tagline: "The city that never sleeps",
    image:
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&auto=format&fit=crop",
  },
  SIN: {
    name: "Singapore",
    country: "Singapore",
    flag: "🇸🇬",
    tagline: "Garden city of Asia",
    image:
      "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=600&auto=format&fit=crop",
  },
  BKK: {
    name: "Bangkok",
    country: "Thailand",
    flag: "🇹🇭",
    tagline: "City of temples and street food",
    image:
      "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&auto=format&fit=crop",
  },
  HKG: {
    name: "Hong Kong",
    country: "HK",
    flag: "🇭🇰",
    tagline: "East meets West harbour city",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop",
  },
  ICN: {
    name: "Seoul",
    country: "Korea",
    flag: "🇰🇷",
    tagline: "K-culture and street food paradise",
    image:
      "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&auto=format&fit=crop",
  },
  SEL: {
    name: "Seoul",
    country: "Korea",
    flag: "🇰🇷",
    tagline: "K-culture and street food paradise",
    image:
      "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&auto=format&fit=crop",
  },
  TPE: {
    name: "Taipei",
    country: "Taiwan",
    flag: "🇹🇼",
    tagline: "Night markets and mountain getaways",
    image:
      "https://images.unsplash.com/photo-1541243440-2e0abf7e0de4?w=600&auto=format&fit=crop",
  },
  DPS: {
    name: "Bali",
    country: "Indonesia",
    flag: "🇮🇩",
    tagline: "Island of Gods and surf",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&auto=format&fit=crop",
  },
  SYD: {
    name: "Sydney",
    country: "Australia",
    flag: "🇦🇺",
    tagline: "Harbour city and beach life",
    image:
      "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&auto=format&fit=crop",
  },
  AMS: {
    name: "Amsterdam",
    country: "Netherlands",
    flag: "🇳🇱",
    tagline: "Canals, tulips and freedom",
    image:
      "https://images.unsplash.com/photo-1534351590666-13e3e96b5702?w=600&auto=format&fit=crop",
  },
  BCN: {
    name: "Barcelona",
    country: "Spain",
    flag: "🇪🇸",
    tagline: "Gaudí's city by the sea",
    image:
      "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&auto=format&fit=crop",
  },
};

const DEST_META_FALLBACK = {
  name: "Unknown",
  country: "",
  flag: "✈️",
  tagline: "A world waiting to be explored",
  image:
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&auto=format&fit=crop",
};

interface DestinationCardProps {
  flight: SearchItem;
  isSaved: boolean;
  onPress: () => void;
  onImportToTrip: (e: React.MouseEvent) => void;
  onToggleSave: (e: React.MouseEvent) => void;
}

function DestinationCard({
  flight,
  isSaved,
  onPress,
  onImportToTrip,
  onToggleSave,
}: DestinationCardProps) {
  const providerName = flight.details?.airline || flight.provider;
  const rawDep = (flight.details?.depCode || "").toUpperCase().substring(0, 3);
  const rawArr = (flight.details?.arrCode || "").toUpperCase().substring(0, 3);
  const meta = DEST_META[rawArr] ?? DEST_META_FALLBACK;
  const title =
    meta.name !== "Unknown"
      ? meta.name
      : flight.title || rawArr || "Destination";
  const routeLabel = [rawDep || "TPE", rawArr || "TYO"]
    .filter(Boolean)
    .join(" → ");
  const stopLabel =
    flight.details?.stops === 0 ? "直飛" : `${flight.details?.stops ?? 1} 轉`;

  return (
    <div className="group/dest w-full h-full">
      <div 
        className="flex flex-row items-stretch w-[295px] xs:w-[330px] sm:w-full min-h-[190px] sm:min-h-[200px] overflow-hidden rounded-[26px] border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/65 backdrop-blur-xl shadow-md hover:shadow-xl transition-all duration-300 relative"
      >
        {/* Invisible button overlay to view details */}
        <button
          type="button"
          onClick={onPress}
          className="absolute inset-0 z-0 bg-transparent cursor-pointer"
          aria-label={`查看 ${title} 航班詳情`}
        />

        {/* Left Section: Adaptive Destination image with high contrast */}
        <div className="relative w-28 xs:w-32 sm:w-36 shrink-0 overflow-hidden font-sans">
          <img
            src={meta.image}
            alt={title}
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null;
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&auto=format&fit=crop";
            }}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover/dest:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
          
          {/* Top image labels */}
          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1 flex-wrap z-10">
            <span className="rounded-md bg-slate-950/60 px-1.5 py-0.5 text-[8.5px] font-black text-white backdrop-blur-md font-mono">
              {rawArr || "TYO"}
            </span>
            <span className="rounded-md bg-pink-500/90 px-1.5 py-0.5 text-[8px] font-black text-white backdrop-blur-md whitespace-nowrap">
              {meta.flag} {meta.country}
            </span>
          </div>

          {/* Bottom image overlay with Title and Price */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white z-10 select-none">
            <h3 className="font-extrabold text-[13.5px] leading-tight drop-shadow-md truncate">
              {title}
            </h3>
            <span className="text-[9px] font-black text-pink-300 font-mono drop-shadow-sm block mt-0.5 whitespace-nowrap">
              最低 {flight.currency} {flight.price.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right Section: Core flight information with high contrast & beautiful symmetry */}
        <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5 text-left relative z-10 pointer-events-auto">
          {/* Top row: Airline & Save Button */}
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <AirlineLogo
                providerName={providerName}
                className="h-[18px] w-[18px] rounded-full text-[8px] shrink-0"
              />
              <span className="text-[11.5px] font-black text-slate-800 dark:text-white truncate">
                {providerName}
              </span>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(e);
              }}
              aria-label={isSaved ? "取消收藏" : "收藏"}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-100 dark:border-white/5 backdrop-blur-md transition-all active:scale-[0.97] ${isSaved ? "bg-pink-500 text-white border-none shadow-sm" : "bg-white/80 text-slate-500 hover:bg-white hover:text-pink-500 shadow-sm"}`}
            >
              <Heart
                size={11}
                fill={isSaved ? "currentColor" : "transparent"}
                strokeWidth={2.5}
              />
            </button>
          </div>

          {/* Tagline snippet with high text contrast */}
          <p className="text-[11.5px] leading-[1.3] font-bold text-slate-600 dark:text-slate-300 line-clamp-2 select-none">
            {meta.tagline}
          </p>

          {/* Symmetrical Flight Routing Row */}
          <div className="bg-slate-50/70 dark:bg-slate-900/60 rounded-xl p-2 flex items-center justify-between gap-1.5 border border-slate-100/50 dark:border-white/5 shadow-sm select-none">
            <div className="text-left">
              <span className="text-[11px] font-black text-slate-800 dark:text-white font-mono leading-none">
                {flight.details?.departure || "09:00"}
              </span>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5 leading-none font-mono">
                {rawDep}
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center px-1">
              <span className="text-[8.5px] font-black text-slate-600 dark:text-slate-300 mb-0.5 scale-[0.9] origin-bottom tracking-tight whitespace-nowrap">
                {flight.details?.duration || "3h 15m"}
              </span>
              <div className="w-full h-[1.5px] bg-slate-200/90 dark:bg-slate-700/80 relative flex items-center justify-center">
                <span className="absolute text-[8.5px] font-black text-slate-600 dark:text-slate-300 scale-[0.8] tracking-widest bg-slate-100/80 dark:bg-slate-800/80 px-1 rounded-sm border border-slate-200/50 dark:border-white/5">
                  {stopLabel}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-black text-slate-800 dark:text-white font-mono leading-none">
                {flight.details?.arrival || "12:15"}
              </span>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5 leading-none font-mono">
                {rawArr}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-white/5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImportToTrip(e);
              }}
              className="flex-1 flex h-8 items-center justify-center gap-1.5 rounded-full bg-slate-900/90 dark:bg-slate-800 hover:bg-slate-800 text-white dark:text-slate-100 px-2.5 text-[10px] font-black uppercase tracking-[0.05em] transition-all active:scale-[0.97]"
            >
              <PlaneTakeoff size={10} strokeWidth={2.5} />
              帶入
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPress();
              }}
              className="flex-1 h-8 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-3 text-[10px] font-black text-white hover:brightness-105 active:scale-[0.97] transition-all flex items-center justify-center"
            >
              Explore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

const getIataCode = (cityName: string = "") => {
  const name = cityName.toLowerCase();
  if (name.includes("東京") || name.includes("tokyo")) return "NRT";
  if (name.includes("大阪") || name.includes("osaka")) return "KIX";
  if (name.includes("倫敦") || name.includes("london")) return "LHR";
  if (name.includes("瑞士") || name.includes("switzerland") || name.includes("ch") || name.includes("瑞")) return "ZRH";
  if (name.includes("尼泊爾") || name.includes("nepal") || name.includes("尼")) return "KTM";
  if (name.includes("挪威") || name.includes("norway") || name.includes("挪")) return "OSL";
  if (name.includes("台北") || name.includes("taipei") || name.includes("tpe")) return "TPE";
  return "TPE";
};

const getSafetyStatus = (cityName: string = "") => {
  const name = cityName.toLowerCase();
  if (name.includes("倫敦") || name.includes("london")) return "💛 旅遊須知";
  return "💚 安全無虞";
};

export default function HomeTab({
  onRequireLogin,
  isLoggedIn,
}: {
  onRequireLogin?: () => void;
  isLoggedIn?: boolean;
}) {
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
  const [isHeroExpanded, setIsHeroExpanded] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth >= 768
  );
  const [searchProgress, setSearchProgress] = useState(0);
  const [progressMsgIdx, setProgressMsgIdx] = useState(0);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { onScroll } = useHideNavOnScroll();

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

  const cardSurfaceClass = `${pressableSurfaceClass} ${raisedHoverClass} shadow-sm sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)]`;
  const cardActionClass = `${subtlePressableClass} ${raisedHoverClass}`;
  const searchFieldSurfaceClass = `${pressableSurfaceClass} ${raisedHoverClass}`;
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
    // 根據選好的地方 顯示中文與機場三碼 code
    const displayValue = destination.searchAlias
      ? `${destination.place} (${destination.searchAlias})`
      : destination.place;
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
      onScroll={onScroll}
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.985 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col flex-1 w-full min-h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-tab-safe md:pb-14"
    >
      {/* === HERO SECTION with gradient background === */}
      <div
        className={`relative z-10 w-full pt-8 sm:pt-[60px] ${!isHeroExpanded ? "pb-3" : "pb-8 sm:pb-12"} px-3 sm:px-6 overflow-visible`}
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
            className={`group relative mx-auto mb-4 max-w-[960px] space-y-3 overflow-hidden rounded-[32px] glass-panel px-4 py-4 text-center sm:mb-5 sm:space-y-4 sm:px-6 sm:py-6${!isHeroExpanded ? " hidden sm:block" : ""} cursor-pointer transition-colors duration-300 hover:bg-white/40`}
          >
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-200/30 blur-3xl group-hover:bg-sky-200/40 transition-colors duration-300" />
            <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-orange-200/20 blur-3xl group-hover:bg-orange-200/30 transition-colors duration-300" />
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <span className="inline-flex items-center rounded-full border border-white/92 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-sky-700 shadow-[0_6px_14px_rgba(14,165,233,0.07)] backdrop-blur-md">
                Collaborative Trip Planner
              </span>
              <span className="hidden items-center rounded-full border border-white/92 bg-white/84 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-orange-500 shadow-[0_6px_14px_rgba(249,115,22,0.07)] backdrop-blur-md sm:inline-flex">
                Beta
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${!isHeroIntroCollapsed ? "rotate-180" : ""}`} />
            </div>
            <div className="relative space-y-2 sm:space-y-3">
              <p className={`text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 transition-all duration-300 ${isHeroIntroCollapsed ? "hidden" : "block"}`}>
                Premium Jelly Journey Desk
              </p>
              <h1 className="mx-auto max-w-4xl text-balance text-[28px] font-black tracking-[-0.045em] text-slate-900 sm:text-[42px] md:text-[54px] md:leading-[1.01] font-heading">
                把<span className="text-sky-600">航班、地圖</span>與<span className="text-sky-600">旅伴分工</span>，收進同一份旅程
              </h1>
              
              <AnimatePresence initial={false}>
                {!isHeroIntroCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden space-y-3"
                  >
                    <p className="mx-auto max-w-[40rem] text-pretty text-[14px] leading-[1.75] text-slate-600 sm:text-[15px] sm:leading-[1.82]">
                      RoamJelly 幫你搞定出發日期、行程清單與旅途工具，免切換 App，一站完成體驗。
                    </p>
                    <div className="mx-auto flex max-w-[620px] flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/70 pt-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:gap-x-5">
                      <span>先比價</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>再共編</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>最後檢查清單</span>
                    </div>

                    {isHeroExpanded && (
                      <div className="flex snap-x gap-2 overflow-x-auto pb-1 text-left sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:pb-0 pt-2">
                        {HERO_STORY_PILLARS.map((pillar, index) => {
                          const Icon = pillar.icon;
                          const decor = HERO_PILLAR_DECOR[index % HERO_PILLAR_DECOR.length];
                          return (
                            <div
                              key={pillar.title}
                              className={`group/pillar editorial-card-soft relative min-w-[248px] snap-start overflow-hidden rounded-[26px] px-3.5 py-3 backdrop-blur-xl sm:min-w-0 ${decor.shell}`}
                            >
                              <div className={`absolute -right-8 -top-8 size-24 rounded-full blur-2xl ${decor.glow}`} />
                              <div className="absolute inset-x-4 bottom-3 h-px bg-gradient-to-r from-white via-slate-200/70 to-transparent" />
                              <div className="relative mb-3 flex items-center justify-between gap-3">
                                <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${decor.badge}`}>
                                  <Icon size={13} strokeWidth={2.6} />
                                  {pillar.eyebrow}
                                </span>
                                <span className="inline-flex size-7 items-center justify-center rounded-full border border-white/80 bg-white/85 text-slate-300 shadow-sm">
                                  <ArrowRight size={14} strokeWidth={2.5} />
                                </span>
                              </div>
                              <h2 className="relative text-balance text-[15px] font-black tracking-[-0.02em] text-slate-900 sm:text-[17px]">
                                {pillar.title}
                              </h2>
                              <ExpandableText
                                text={pillar.description}
                                previewLines={2}
                                minCharacters={60}
                                className="relative mt-1.5"
                                textClassName="text-[13px] font-medium leading-[1.62] text-slate-600"
                                buttonClassName="mt-0"
                              />
                              <div className="editorial-divider relative mt-3 flex items-center justify-between gap-3 pt-3">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                  <span className={`inline-flex size-6 items-center justify-center rounded-full border bg-white/85 text-[10px] font-black shadow-sm ${decor.badge}`}>
                                    0{index + 1}
                                  </span>
                                  <span className="text-pretty line-clamp-2">{decor.note}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveStoryInfo({
                                      eyebrow: pillar.eyebrow,
                                      title: pillar.title,
                                      description: pillar.description,
                                      details: pillar.details,
                                      tone: pillar.tone,
                                      icon: Icon,
                                    })
                                  }}
                                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/92 bg-white/94 px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
                                >
                                  查看說明
                                  <ArrowRight size={12} strokeWidth={2.6} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
                  {searchForm.from || "—"} → {searchForm.to || "—"}
                </span>
                <span className="text-[10px] font-bold text-slate-500 shrink-0 truncate max-w-[110px] sm:max-w-[150px]">
                  {searchForm.date}
                  {searchForm.tripType === "roundtrip" && searchForm.returnDate
                    ? ` · ↩ ${searchForm.returnDate}`
                    : ""}
                </span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-orange-400 text-white shadow-md">
                  <SearchIcon size={13} strokeWidth={3} />
                </div>
              </button>
            )}
            {/* Unified search form */}
            {isHeroExpanded && (
              <div className="relative z-20">
                <div className="mb-2.5 flex flex-col items-start gap-1.5 px-1 sm:mb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-700/80">
                      第一站
                    </p>
                    <p className="text-pretty text-[14px] font-bold leading-6 text-slate-700 sm:text-[15px]">
                      先決定旅行的時間，後續再補上地圖與景點。
                    </p>
                  </div>
                  {!isLoggedIn && (
                    <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-[11px] font-black tracking-[0.18em] text-slate-600 uppercase backdrop-blur-md">
                      訪客也能先建立旅程
                    </span>
                  )}
                </div>
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
                    單程
                  </button>
                  <button
                    onClick={() => updateField("tripType", "roundtrip")}
                    aria-pressed={searchForm.tripType === "roundtrip"}
                    className={`px-5 py-2 rounded-full text-[11px] font-black tracking-wide transition-all ${
                      searchForm.tripType === "roundtrip"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    來回
                  </button>
                </div>

                {/* Search card */}
                <div className="flex flex-col gap-2 rounded-[32px] sm:rounded-[40px] jelly-surface p-2.5 sm:gap-2 sm:p-3.5">
                  {/* FROM / TO row */}
                  <div className="relative grid grid-cols-2">
                    {/* FROM cell */}
                    <div
                      className={`flex flex-col gap-0.5 sm:gap-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-[24px] sm:rounded-[28px] cursor-text ${searchFieldSurfaceClass}`}
                      onClick={() => {
                        setShowDeparturePicker(true);
                        setShowDestinationPicker(false);
                        setShowDatePicker(false);
                        setShowReturnDatePicker(false);
                      }}
                    >
                      <span className="text-[11px] font-black tracking-[0.18em] text-slate-500 uppercase">
                        出發地
                      </span>
                      <input
                        aria-label="出發地"
                        className="bg-transparent border-none p-0 text-[17px] font-black text-slate-900 dark:text-white placeholder:text-slate-500 w-full outline-none focus-visible:outline-none leading-none"
                        value={searchForm.from}
                        onFocus={() => {
                          setShowDeparturePicker(true);
                          setShowDestinationPicker(false);
                          setShowDatePicker(false);
                        }}
                        onChange={(e) => updateField("from", e.target.value)}
                        placeholder="台北 TPE"
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
                      title="交換出發地與目的地"
                      className="absolute left-1/2 top-1/2 z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white hover:border-slate-300 shadow-md dark:border-slate-600 dark:bg-slate-700 hover:scale-110 active:scale-95 text-sky-500 hover:text-sky-600 transition-all cursor-pointer group"
                    >
                      <PlaneTakeoff
                        size={14}
                        className="transform group-hover:rotate-180 transition-transform duration-300"
                        strokeWidth={2.5}
                      />
                    </button>

                    {/* TO cell */}
                    <div
                      className={`flex flex-col gap-0.5 sm:gap-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-[24px] sm:rounded-[28px] cursor-text ${searchFieldSurfaceClass}`}
                      onClick={() => {
                        setShowDestinationPicker(true);
                        setShowDeparturePicker(false);
                        setShowDatePicker(false);
                        setShowReturnDatePicker(false);
                      }}
                    >
                      <span className="text-[11px] font-black tracking-[0.18em] text-slate-500 uppercase">
                        目的地
                      </span>
                      <input
                        aria-label="目的地"
                        className="bg-transparent border-none p-0 text-[17px] font-black text-slate-900 dark:text-white placeholder:text-slate-500 w-full outline-none focus-visible:outline-none leading-none"
                        value={searchForm.to}
                        onFocus={() => {
                          setShowDestinationPicker(true);
                          setShowDeparturePicker(false);
                          setShowDatePicker(false);
                        }}
                        onChange={(e) => updateField("to", e.target.value)}
                        placeholder="東京 NRT"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  {/* Date / Return Date row */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Departure date */}
                    <button
                      type="button"
                      aria-label={`去程日期：${searchForm.date || "尚未選擇"}`}
                      className={`flex flex-col gap-0.5 sm:gap-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-[24px] sm:rounded-[28px] cursor-pointer bg-slate-50/60 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 text-left w-full ${searchFieldSurfaceClass}`}
                      onClick={() => {
                        setShowDatePicker(!showDatePicker);
                        setShowDeparturePicker(false);
                        setShowDestinationPicker(false);
                        setShowReturnDatePicker(false);
                      }}
                    >
                      <span className="text-[11px] font-black tracking-[0.18em] text-slate-500 uppercase flex items-center gap-1">
                        <Calendar size={10} />
                        去程日期
                      </span>
                      <span
                        className={`text-[15px] font-black leading-none ${!searchForm.date ? "text-slate-500" : "text-slate-900 dark:text-white"}`}
                      >
                        {searchForm.date || "選擇日期"}
                      </span>
                    </button>

                    {/* Return date — always visible; clicking in oneway mode auto-switches to roundtrip */}
                    <button
                      type="button"
                      aria-label={`回程日期：${searchForm.returnDate || (searchForm.tripType === "oneway" ? "單程（點擊切換來回）" : "尚未選擇")}`}
                      className={`flex flex-col gap-0.5 sm:gap-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-[24px] sm:rounded-[28px] cursor-pointer border text-left w-full ${
                        searchForm.tripType === "oneway"
                          ? "bg-slate-50/30 border-dashed border-slate-200 dark:border-slate-600 opacity-60"
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
                      <span className="text-[11px] font-black tracking-[0.18em] text-slate-500 uppercase flex items-center gap-1">
                        <Calendar size={10} />
                        回程日期
                      </span>
                      <span
                        className={`text-[15px] font-black leading-none ${!searchForm.returnDate ? "text-slate-500" : "text-slate-900 dark:text-white"}`}
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
                    className={`group flex w-full items-center justify-center gap-2 rounded-[32px] py-4 sm:py-5 text-[16px] sm:text-[17px] font-black tracking-wide shadow-sm transition-[transform,shadow,background] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform-gpu ${
                      isSearchDisabled || loading || isOffline
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 text-white shadow-[0_12px_28px_rgba(244,63,94,0.3)] hover:from-pink-500 hover:to-orange-500 active:scale-[0.97] hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(244,63,94,0.4)]"
                    }`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <SearchIcon size={18} strokeWidth={3} className="drop-shadow-sm group-hover:animate-cute-bounce" /> 
                        <span className="drop-shadow-sm group-hover:text-pink-50 transition-colors">開始規劃這趟旅程 ✨</span>
                      </>
                    )}
                  </button>
                  <p className="px-1 pt-1 text-center text-[12px] font-bold leading-5 text-slate-500">
                    決定航班後，隨時再補上其他細節。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === CONTENT BELOW HERO === */}
      <div className="relative z-0 flex-1 flex flex-col px-4 sm:px-6 bg-gradient-to-b from-white/80 to-slate-50/60">
        {/* Quick External Links */}
        <div className="max-w-3xl mx-auto w-full pt-3 sm:pt-4 pb-1 sm:pb-2">
          <div className="flex flex-row items-center overflow-x-auto hide-scrollbar gap-2.5 snap-x pb-1">
            <a
              href="https://www.agoda.com/partners/partnersearch.aspx?cid=1762106&hl=zh-tw"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 snap-start transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] hover:-translate-y-1 ${chipPressClass}`}
            >
              <Bed
                size={17}
                className="text-[#B92A8E] group-hover:scale-110 transition-transform"
                strokeWidth={2.5}
              />
              <span className="font-bold text-[13px] tracking-wide">
                找住宿
              </span>
            </a>
            <a
              href="https://www.kkday.com/zh-tw?cid=4480"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 snap-start transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] hover:-translate-y-1 ${chipPressClass}`}
            >
              <Ticket
                size={15}
                className="text-[#F18400] group-hover:scale-110 transition-transform"
                strokeWidth={2.5}
              />
              <span className="font-bold text-[13px] tracking-wide">
                門票 & 觀光行程
              </span>
            </a>
            <a
              href="https://www.kkday.com/zh-tw/product/productlist?page=1&keyword=%E6%A9%9F%E5%A0%B4%E6%8E%A5%E9%80%81&cid=4480"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 snap-start transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] hover:-translate-y-1 ${chipPressClass}`}
            >
              <div className="relative text-[#EC4899] group-hover:scale-110 transition-transform">
                <CarFront size={17} strokeWidth={2.5} />
                <PlaneTakeoff
                  size={9}
                  strokeWidth={3}
                  className="absolute -top-1 -left-1"
                />
              </div>
              <span className="font-bold text-[13px] tracking-wide">
                機場接送
              </span>
            </a>
          </div>
        </div>

        <div className="pt-5 sm:pt-7 pb-16 md:pb-32 flex flex-col flex-1 min-w-0">
          <div className="flex flex-col gap-3 mb-5 sm:mb-6 md:mb-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <EditorialSectionIntro
                eyebrow="查詢航班"
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
                  {
                    label: "結果",
                    value:
                      filteredResults.length > 0
                        ? `${filteredResults.length} 個`
                        : "等待搜尋",
                  },
                ]}
                titleClassName="text-2xl sm:text-3xl tracking-tighter"
                descriptionClassName="text-[12px] font-bold leading-5 text-slate-500 sm:text-[13px]"
              />
              {results.length > 0 && (
                <div className="flex items-center gap-1 bg-white/70 backdrop-blur-md p-1 rounded-[10px] shadow-sm border border-slate-200/60 shrink-0">
                  <button
                    onClick={() => setViewType("grid")}
                    className={`w-11 h-11 flex items-center justify-center rounded-[8px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] ${viewType === "grid" ? "bg-white shadow-sm text-slate-900 border border-slate-200/50" : "text-slate-500 hover:text-slate-600 hover:-translate-y-0.5"}`}
                    title="卡片檢視"
                    aria-label="卡片檢視"
                    aria-pressed={viewType === "grid"}
                  >
                    <LayoutGrid size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setViewType("table")}
                    className={`w-11 h-11 flex items-center justify-center rounded-[8px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] ${viewType === "table" ? "bg-white shadow-sm text-slate-900 border border-slate-200/50" : "text-slate-500 hover:text-slate-600 hover:-translate-y-0.5"}`}
                    title="列表檢視"
                    aria-label="列表檢視"
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
              <div className="flex items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 w-full overflow-hidden shrink-0 mt-2 mb-4">
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
          </div>

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
                      即時爬取航班資訊，這可能需要一些時間
                    </p>
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
                    果凍精靈暫時迷路了 🥺
                  </h3>
                  <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-6 max-w-[280px] leading-relaxed">
                    {searchError === "timeout"
                      ? "伺服器查詢逾時，可能是搜尋範圍過大。請點擊下方按鈕重試。"
                      : "航班供應商暫時無法回應，請稍後再試一次。"}
                  </p>
                  <button
                    onClick={handleSearch}
                    className="group flex items-center gap-2 h-10 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-[14px] hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors active:scale-95 shadow-sm"
                  >
                    <RefreshCw size={14} className="group-active:rotate-45 transition-transform" />
                    重新嘗試
                  </button>
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
                        找不到符合條件的航班
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-bold max-w-xs text-center leading-relaxed text-[13px]">
                        可以嘗試更換出發日期、調整篩選條件，或搜尋其他的熱門旅行目的地。
                      </p>
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
                            <p className="text-[11px] font-black tracking-[0.24em] uppercase text-fuchsia-500">
                              Demo Preview
                            </p>
                            <h4 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                              先看別人排好的旅程，立刻進入狀況
                            </h4>
                          </div>
                          <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
                            免登入、免等待，直接預覽完整節奏與景點安排。
                          </p>
                        </div>
                        <HorizontalScrollRail
                          label="Demo 卡片"
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
                                className="relative overflow-hidden w-[320px] xs:w-[350px] sm:w-[410px] h-[255px] sm:h-[275px] shrink-0 rounded-[30px] flex flex-col justify-between cursor-pointer border border-slate-150 dark:border-white/10 shadow-md hover:shadow-xl transition-all group/demo active:scale-[0.99]"
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
                                    精選行程
                                  </div>
                                  
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
                                      💚 暢遊推薦
                                    </span>
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
                                      : "免等待免登入！專專為新朋友準備的起跑暖身路線，體驗共編與豐富工具。"}
                                  </p>

                                  <div className="flex gap-2 border-t border-white/10 pt-3">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHapticFeedback([16]);
                                        handleCopyExpertItinerary(e, handbook);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black transition-all bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md active:scale-[0.97]"
                                    >
                                      <Copy size={11} />
                                      複製行程
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHapticFeedback([16]);
                                        setActiveHandbook(handbook);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black border border-white/20 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-[0.97] transition-all"
                                    >
                                      <Eye size={11} />
                                      預覽行程
                                    </button>
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
                                className="relative overflow-hidden w-full h-[255px] sm:h-[275px] rounded-[30px] flex flex-col justify-between cursor-pointer border border-slate-150 dark:border-white/10 shadow-md hover:shadow-xl transition-all group/demo active:scale-[0.99]"
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
                                    精選行程
                                  </div>
                                  
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
                                      💚 暢遊推薦
                                    </span>
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
                                      : "免等待免登入！專專為新朋友準備的起跑暖身路線，體驗共編與豐富工具。"}
                                  </p>

                                  <div className="flex gap-2 border-t border-white/10 pt-3">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHapticFeedback([16]);
                                        handleCopyExpertItinerary(e, handbook);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black transition-all bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md active:scale-[0.97]"
                                    >
                                      <Copy size={11} />
                                      複製行程
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHapticFeedback([16]);
                                        setActiveHandbook(handbook);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black border border-white/20 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-[0.97] transition-all"
                                    >
                                      <Eye size={11} />
                                      預覽行程
                                    </button>
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
                        輸入出發地、目的地與日期，找出最聰明的飛航選擇。
                      </h3>

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
            <div className="mt-8 md:mt-14 mb-6 md:mb-8 px-2">
              <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Globe className="text-sky-500" size={24} />
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    分享行程
                  </h2>
                </div>
                <span className="text-[11px] font-black tracking-[0.15em] uppercase text-slate-500">
                  fork-and-remix
                </span>
              </div>

              <HorizontalScrollRail
                label="分享行程卡片"
                viewportClassName="w-full pb-6 -mx-6 px-6"
              >
                  {communityTrips.map((trip) => (
                    <motion.div
                      key={trip.id}
                      className="w-[320px] xs:w-[360px] sm:w-[440px] md:w-[480px] shrink-0 group/trip"
                    >
                      <div
                        className="relative overflow-hidden h-[235px] sm:h-[260px] rounded-[30px] flex flex-col justify-between cursor-pointer border border-slate-150 dark:border-white/10 shadow-md hover:shadow-xl transition-all p-5 text-white"
                      >
                        {/* Cover Image as entire Card Background */}
                        <div className="absolute inset-0 z-0">
                          <img
                            src={trip.cover}
                            alt={trip.title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).onerror = null;
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                            }}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-750 group-hover/trip:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/65 to-slate-950/25" />
                        </div>

                        {/* Top Overlay */}
                        <div className="relative z-10 flex items-start justify-between">
                          <div className="w-fit inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 backdrop-blur-md px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                            <Sparkles size={11} strokeWidth={2.6} className="text-yellow-300" />
                            旅伴明信片
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex gap-1">
                              <span className="rounded-md bg-slate-950/50 text-white border border-white/10 px-2 py-0.5 text-[9px] font-black backdrop-blur-md font-mono">
                                {getIataCode(trip.destination)}
                              </span>
                              <span className="rounded-md bg-slate-950/50 text-sky-300 border border-white/10 px-1.5 py-0.5 text-[8.5px] font-black backdrop-blur-md uppercase tracking-wider font-mono">
                                #{trip.destination || "台北"}
                              </span>
                            </div>
                            <span className="rounded-md bg-emerald-500/85 text-white px-1.5 py-0.5 text-[8.5px] font-black backdrop-blur-md uppercase tracking-wider">
                              💚 {getSafetyStatus(trip.destination)}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Overlay Info & CTA */}
                        <div className="relative z-10 text-left pt-3">
                          <span className="text-[10px] font-black tracking-wider uppercase opacity-80 block mb-1">
                            by {trip.author || "Anonymous"}
                          </span>
                          
                          <h3 className="text-[14.5px] sm:text-[15.5px] font-black tracking-tight drop-shadow-md text-white border-none leading-snug line-clamp-2">
                            {trip.title}
                          </h3>
                          
                          <p className="text-[11px] leading-relaxed font-bold text-slate-200 drop-shadow-sm mt-1 line-clamp-2">
                            先把別人的自駕/地鐵行程當成明信片，喜歡再帶走！已被複製 {trip.forkCount ?? trip.likes ?? 0} 次。
                          </p>

                          <div className="flex gap-2 border-t border-white/10 pt-3.5 mt-3">
                            <button
                              type="button"
                              onClick={(event) => handleCloneTrip(event, trip)}
                              className="w-full flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black transition-all bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white shadow-md active:scale-[0.97]"
                            >
                              <Copy size={11} />
                              複製此行程並 remarK
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </HorizontalScrollRail>
            </div>
          )}

          {/* Featured Destinations Section */}
          <div className="mt-8 md:mt-14 mb-6 md:mb-8 px-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Globe className="text-emerald-500" size={24} />
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  精選目的地指南
                </h2>
              </div>
              <span className="text-[11px] font-black tracking-[0.15em] uppercase text-slate-500 hidden sm:block">
                travel-guide-tw
              </span>
            </div>

            <HorizontalScrollRail
              label="精選目的地指南"
              viewportClassName="w-full pb-6 -mx-6 px-6"
            >
                {FEATURED_DESTINATIONS.map((dest) => {
                  return (
                  <motion.div
                    key={dest.id}
                    className="w-[320px] xs:w-[360px] sm:w-[440px] md:w-[480px] shrink-0 group/dest"
                  >
                    <div
                      className="relative overflow-hidden h-[235px] sm:h-[260px] rounded-[30px] flex flex-col justify-between cursor-pointer border border-slate-150 dark:border-white/10 shadow-md hover:shadow-xl transition-all p-5 text-white"
                    >
                      {/* Full cover background image */}
                      <div className="absolute inset-0 z-0">
                        <img
                          src={dest.image}
                          alt={dest.name}
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).onerror = null;
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                          }}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-750 group-hover/dest:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/65 to-slate-950/25" />
                      </div>

                      {/* Top Overlay details */}
                      <div className="relative z-10 flex items-start justify-between">
                        <div className="w-fit inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 backdrop-blur-md px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                          <Sparkles size={11} strokeWidth={2.6} className="text-emerald-300" />
                          精選指南
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-1">
                            <span className="rounded-md bg-slate-950/50 text-white border border-white/10 px-2 py-0.5 text-[9px] font-black backdrop-blur-md font-mono">
                              {getIataCode(dest.name)}
                            </span>
                            <span className="rounded-md bg-slate-950/50 text-pink-300 border border-white/10 px-1.5 py-0.5 text-[8.5px] font-black backdrop-blur-md uppercase tracking-wider font-mono">
                              #{dest.tags[0] || "漫遊"}
                            </span>
                          </div>
                          <span className="rounded-md bg-emerald-500/85 text-white px-1.5 py-0.5 text-[8.5px] font-black backdrop-blur-md uppercase tracking-wider">
                            💚 {getSafetyStatus(dest.name)}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Overlay content & action */}
                      <div className="relative z-10 text-left pt-3">
                        <div className="flex items-center gap-1.5 drop-shadow-md mb-1">
                          <span className="text-2xl leading-none">{dest.flag}</span>
                          <span className="text-white font-black text-[15px] sm:text-[16px] leading-none">{dest.name} 旅遊攻略手冊</span>
                        </div>
                        
                        <p className="text-[11px] sm:text-[11.5px] leading-relaxed font-bold text-slate-200 drop-shadow-sm mt-1 line-clamp-2">
                          {dest.description}
                        </p>

                        <div className="flex gap-2 border-t border-white/10 pt-3.5 mt-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const g = getCountryGuide(dest.id);
                              if (g) setActiveGuide(g);
                            }}
                            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black transition-all bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md active:scale-[0.97]"
                          >
                            <ExternalLink size={11} />
                            閱讀完整攻略與指南
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  );
                })}
            </HorizontalScrollRail>
          </div>

          {/* Expert Handbooks Section */}
          <div className="mt-8 md:mt-14 mb-6 md:mb-8 px-2">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-fuchsia-500" size={24} />
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                熱門達人行程
              </h2>
            </div>

            <HorizontalScrollRail
              label="熱門達人行程"
              viewportClassName="w-full pb-6 -mx-6 px-6"
            >
                {EXPERT_HANDBOOKS.map((handbook) => {
                  return (
                  <motion.div
                    key={handbook.id}
                    className="w-[320px] xs:w-[360px] sm:w-[440px] md:w-[480px] shrink-0 group/handbook"
                  >
                    <div
                      onClick={() => setActiveHandbook(handbook)}
                      className="relative overflow-hidden h-[235px] sm:h-[260px] rounded-[30px] flex flex-col justify-between cursor-pointer border border-slate-150 dark:border-white/10 shadow-md hover:shadow-xl transition-all p-5 text-white"
                    >
                      {/* Full cover background image */}
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
                          className="h-full w-full object-cover transition-transform duration-750 group-hover/handbook:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/65 to-slate-950/25" />
                      </div>

                      {/* Top Overlay details */}
                      <div className="relative z-10 flex items-start justify-between">
                        <div className="w-fit inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 backdrop-blur-md px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                          <Sparkles size={11} strokeWidth={2.6} className="text-fuchsia-300" />
                          達人行程
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-1">
                            <span className="rounded-md bg-slate-950/50 text-white border border-white/10 px-2 py-0.5 text-[9px] font-black backdrop-blur-md font-mono">
                              {getIataCode(handbook.title)}
                            </span>
                            <span className="rounded-md bg-slate-950/50 text-pink-300 border border-white/10 px-1.5 py-0.5 text-[8.5px] font-black backdrop-blur-md uppercase tracking-wider font-mono">
                              {handbook.days} Days
                            </span>
                          </div>
                          <span className="rounded-md bg-emerald-500/85 text-white px-1.5 py-0.5 text-[8.5px] font-black backdrop-blur-md uppercase tracking-wider">
                            💚 暢遊推薦
                          </span>
                        </div>
                      </div>

                      {/* Bottom Overlay content & action */}
                      <div className="relative z-10 text-left pt-3">
                        <span className="text-[10px] font-black tracking-wider uppercase opacity-80 block mb-1">
                          by {handbook.author}
                        </span>
                        
                        <h3 className="text-[14.5px] sm:text-[15.5px] font-black tracking-tight drop-shadow-md text-white border-none leading-snug line-clamp-2">
                          {handbook.title}
                        </h3>
                        
                        <p className="text-[11px] leading-relaxed font-bold text-slate-200 drop-shadow-sm mt-1 line-clamp-2">
                          最具含金量的行程路線！包含：{handbook.tags.slice(0, 2).map((t) => `#${t}`).join(" ")}，一鍵複製即刻出發。
                        </p>

                        <div className="flex gap-2 border-t border-white/10 pt-3.5 mt-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyExpertItinerary(e, handbook);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black transition-all bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md active:scale-[0.97]"
                          >
                            <Copy size={11} />
                            複製此達人行程
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveHandbook(handbook);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full text-[10px] font-black border border-white/20 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-[0.97] transition-all"
                          >
                            預覽行程
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  );
                })}
            </HorizontalScrollRail>
          </div>

          {/* Subscription Section */}
          <div className="mt-8 md:mt-14 mb-6 md:mb-8 px-2 pt-8 border-t border-slate-200/50 dark:border-white/10 text-left">
            <div className="flex items-center gap-2 mb-2">
              <BellRing size={20} className="text-pink-500 animate-pulse" />
              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                ✉️ 目的地即時快訊 & 優惠促銷訂閱
              </h4>
              <span className="text-[9px] bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Real-time Alerts
              </span>
            </div>
            <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              當航班降價促銷、釋出聯名特惠，或目的地有重要安全/旅遊警示更新時，系統將即時通知您，幫助您聰明規劃、安心起飛！
            </p>

            {/* List of Destinations available for subscriptions */}
            <div className="w-full mb-6">
              <HorizontalScrollRail
                label="目的地訂閱"
                viewportClassName="w-full pb-4 -mx-6 px-6"
                contentClassName="gap-4"
              >
                {[
                  { name: "東京 Tokyo", code: "NRT", image: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=300&q=80", price: "NT$ 9,800起", health: "💚 安全無虞", advisory: "由傳統航空釋出大量淡季特等機票，東京梅雨季氣溫適中！", tagColor: "bg-emerald-50 text-emerald-700 font-extrabold" },
                  { name: "大阪 Osaka", code: "KIX", image: "https://images.unsplash.com/photo-1590253187631-6f9aa4563a57?auto=format&fit=crop&w=300&q=80", price: "NT$ 8,900起", health: "💚 安全無虞", advisory: "廉價航空本週大促銷，週末熱門時段仍有促銷票！", tagColor: "bg-emerald-50 text-emerald-700 font-extrabold" },
                  { name: "台北 Taipei", code: "TPE", image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=300&q=80", price: "本島漫遊", health: "💚 安全無虞", advisory: "梅雨滯留鋒面逼近，下雨行程已由 Jelly AI 為您全天候就緒。", tagColor: "bg-emerald-50 text-emerald-700 font-extrabold" },
                  { name: "倫敦 London", code: "LHR", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=300&q=80", price: "NT$ 24,500起", health: "💛 旅遊須知", advisory: "希斯洛機場本週部分行李分檢系統調整，過海關建议提早排隊。", tagColor: "bg-amber-50 text-amber-700 font-extrabold" },
                ].map((dest) => {
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
                          <span className="text-[10px] font-bold text-pink-300 font-mono">最低 {dest.price}</span>
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
                  最新訂閱情報 & 降價快訊 (Deal Feed Alert)
                </h5>
              </div>

              {subscriptions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                    💡 跨出第一步！訂閱上方任一目的地的推送或電郵快訊後，即可在此解鎖瀏覽專屬的降價促銷、即時機票大賞與目的地旅遊安全警報！
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {[
                    { dest: "東京 Tokyo", type: "deal", tag: "🔥 降價大促銷", text: "星宇航空限時特惠台北-東京 NT$9,800 起，降幅更高達 15%！已為您追蹤！" },
                    { dest: "東京 Tokyo", type: "advisory", tag: "🌧️ 旅遊須知", text: "東京多地進入梅雨季節，出門建議隨身帶傘，可多參考 Jelly AI 推薦的雨天行程！" },
                    { dest: "大阪 Osaka", type: "deal", tag: "🎉 廉航大回饋", text: "樂桃航空萬人促銷重磅來襲！大阪單程近全免未稅快閃 NT$2,200 起！" },
                    { dest: "台北 Taipei", type: "advisory", tag: "🌧️ 降雨警報", text: "台北氣象局發布午後大雨特報，山區潮濕多雨，建議隨意挑選文創室內景點漫步。" },
                    { dest: "倫敦 London", type: "advisory", tag: "✈️ 機場跑道封閉", text: "希斯洛機場(LHR)公告 6/5 行李系統維修，建議國際旅客提早 3 小時抵達辦理登機。" },
                    { dest: "倫敦 London", type: "deal", tag: "💎 商務艙特等艙特惠", text: "長榮航空倫敦直飛航線釋出稀有限量商務特惠，預訂即享 92 折超值特惠！" }
                  ]
                    .filter(alert => subscriptions.some(sub => sub.destination.trim().toLowerCase().startsWith(alert.dest.split(' ')[0].toLowerCase())))
                    .map((alert, idx) => (
                      <div key={idx} className="flex gap-3 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-white/80 dark:border-white/5 shadow-sm">
                        <div className="h-6 w-6 shrink-0 rounded-full bg-pink-100 dark:bg-pink-950/40 text-pink-600 text-[10px] font-black flex items-center justify-center">
                          {alert.type === 'deal' ? '💰' : '⚠️'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-black text-slate-800 dark:text-white">
                              {alert.dest}
                            </span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                              alert.type === 'deal' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {alert.tag}
                            </span>
                          </div>
                          <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300 mt-1 leading-relaxed text-left font-sans">
                            {alert.text}
                          </p>
                        </div>
                      </div>
                    ))}

                  {/* Show total count */}
                  <p className="text-[10px] text-slate-400 font-extrabold text-right mt-2">
                    隨時同步最新 2026 年夏季即時情報
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
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
          title="出發地"
          query={searchForm.from}
          onClose={() => setShowDeparturePicker(false)}
          onSelect={(dest) => applyGuideDestination(dest, "from")}
        />
      )}

      {showDestinationPicker && (
        <LocationPickerPopup
          title="熱門目的地"
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
                  alt={flyingCard.handbook.title || "達人行程預覽"}
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
            航線搜尋熱度分析
          </a>
          <a
            href="/trips/"
            style={{ color: '#94a3b8', fontSize: 11 }}
          >
            目的地旅遊行程
          </a>
        </div>
      </div>
    </motion.div>
  );
}
