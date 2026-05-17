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
} from "lucide-react";
import GlassCard from "./GlassCard";
import EditorialSectionIntro from "./EditorialSectionIntro";
import ExpandableText from "./ExpandableText";
import { Input } from "./ui/input";
import { FlightSkeletonCard } from "./SkeletonCard";
import {
  searchOffers,
  SearchServiceUnavailableError,
  SearchTimeoutError,
  fetchHandbooks,
  createTripFact,
  syncItinerary,
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
    description: "從班機與日期起跑，讓整趟旅程先有穩定的時間骨架。",
    details: [
      "先把出發地、目的地與日期定下來，旅程的時間骨架就會比較穩。",
      "還沒決定住宿或景點也沒關係，先把出發與回程節奏固定就好。",
      "後面接 AI 草稿、手帳與工具頁時，都能沿用這個旅程節奏。",
    ],
    tone: "sky",
  },
  {
    icon: Globe,
    eyebrow: "地圖動線",
    title: "把住宿、景點與接送接回同一路線",
    description: "不只看票價，也把後續會用到的旅途資訊收進同一份規劃。",
    details: [
      "先確認住宿會落在哪一區，後續景點與移動線比較不會互相打架。",
      "把機場、住宿、景點與接送當成同一段旅程，而不是分散的待辦。",
      "之後交給旅伴共編時，也比較容易理解整趟路線。",
    ],
    tone: "cyan",
  },
  {
    icon: Sparkles,
    eyebrow: "AI 共編",
    title: "先用 AI 起草，再交給旅伴一起補完",
    description: "先開一趟旅程，再慢慢補上清單、預算與分工，不必一次做完。",
    details: [
      "先請 AI 拉出一版旅程節奏，確認方向對了再慢慢補細節。",
      "旅伴不必一開始就同步上線，等草稿成形後再一起修更有效率。",
      "清單、預算與分工都能後補，主線先成立比較重要。",
    ],
    tone: "orange",
  },
] as const;

const HERO_PILLAR_DECOR = [
  {
    shell:
      "border-sky-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.92))]",
    badge: "border-sky-100 bg-sky-100/90 text-sky-700",
    glow: "bg-sky-200/55",
    note: "先拿到出發節奏，再慢慢補細節。",
  },
  {
    shell:
      "border-cyan-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(236,254,255,0.92))]",
    badge: "border-cyan-100 bg-cyan-50/95 text-cyan-700",
    glow: "bg-cyan-200/50",
    note: "把景點、住宿與移動線串成一張圖。",
  },
  {
    shell:
      "border-orange-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,247,237,0.92))]",
    badge: "border-orange-100 bg-orange-50/95 text-orange-700",
    glow: "bg-orange-200/55",
    note: "先起草一版，再交給旅伴一起玩。",
  },
] as const;

const CARD_STICKER_TONES = [
  "border-sky-100 bg-sky-50/95 text-sky-700",
  "border-orange-100 bg-orange-50/95 text-orange-700",
  "border-emerald-100 bg-emerald-50/95 text-emerald-700",
  "border-pink-100 bg-pink-50/95 text-pink-700",
] as const;

const FEATURED_CARD_DECOR = [
  {
    body:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.94),rgba(255,247,237,0.92))]",
    glow: "bg-sky-200/45",
    cta: "from-sky-500 via-cyan-500 to-orange-400 hover:from-sky-600 hover:via-cyan-500 hover:to-orange-500",
  },
  {
    body:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,237,0.94),rgba(240,253,250,0.92))]",
    glow: "bg-orange-200/45",
    cta: "from-orange-400 via-amber-400 to-emerald-400 hover:from-orange-500 hover:via-amber-400 hover:to-emerald-500",
  },
  {
    body:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,254,255,0.94),rgba(240,249,255,0.92))]",
    glow: "bg-cyan-200/45",
    cta: "from-cyan-500 via-sky-500 to-indigo-500 hover:from-cyan-600 hover:via-sky-500 hover:to-indigo-500",
  },
] as const;

const HANDBOOK_CARD_DECOR = [
  {
    body:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(254,242,248,0.94),rgba(240,249,255,0.92))]",
    glow: "bg-pink-200/45",
    badge: "border-pink-100 bg-pink-50/95 text-pink-700",
    cta: "from-pink-500 via-orange-400 to-sky-500 hover:from-pink-600 hover:via-orange-400 hover:to-sky-500",
  },
  {
    body:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,237,0.94),rgba(254,249,195,0.88))]",
    glow: "bg-orange-200/45",
    badge: "border-orange-100 bg-orange-50/95 text-orange-700",
    cta: "from-orange-400 via-amber-400 to-rose-400 hover:from-orange-500 hover:via-amber-400 hover:to-rose-500",
  },
  {
    body:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,254,255,0.94),rgba(240,253,250,0.9))]",
    glow: "bg-cyan-200/45",
    badge: "border-cyan-100 bg-cyan-50/95 text-cyan-700",
    cta: "from-cyan-500 via-sky-500 to-emerald-400 hover:from-cyan-600 hover:via-sky-500 hover:to-emerald-500",
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
        className={`!p-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,252,0.94))] dark:bg-slate-800 border border-white/90 dark:border-slate-700 shadow-[0_8px_24px_rgba(240,138,173,0.08),0_2px_8px_rgba(15,23,42,0.04)] hover:shadow-[0_14px_34px_rgba(240,138,173,0.14),0_4px_12px_rgba(15,23,42,0.06)] flex-1 flex flex-col overflow-hidden rounded-[24px] transition-all duration-200 ${pressableSurfaceClass} ${raisedHoverClass}`}
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.22em]">
                  {flight.provider}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                  flight.details?.stops === 0
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {flight.details?.stops === 0
                  ? "DIRECT"
                  : `${flight.details?.stops} STOP`}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
                Depart
              </span>
            </div>
            <div className="flex flex-col items-end z-10 bg-white/40 dark:bg-transparent backdrop-blur-sm pl-1">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                {flight.details?.arrival}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
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
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
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
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    Arrive
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 px-1">
                <span
                  className={`text-[11px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm whitespace-nowrap ${flight.returnLeg.stops === 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"}`}
                >
                  {flight.returnLeg.stops === 0
                    ? "直飛 DIRECT"
                    : `${flight.returnLeg.stops} 轉 STOP`}
                </span>
                {flight.returnLeg.duration && (
                  <span className="text-[10px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 whitespace-nowrap">
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
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.22em] mb-0.5">
              Estimated Price
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-slate-400">
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
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 shadow-sm hover:shadow"
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
            className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,252,0.94))] dark:bg-slate-800 border border-white/90 dark:border-slate-700 shadow-[0_8px_24px_rgba(240,138,173,0.08),0_2px_8px_rgba(15,23,42,0.04)] hover:shadow-[0_14px_34px_rgba(240,138,173,0.14),0_4px_12px_rgba(15,23,42,0.06)] rounded-[24px] overflow-hidden cursor-pointer transition-shadow duration-200"
            onClick={() => onPress(flight)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPress(flight);
              }
            }}
          >
            <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3.5">
              {/* Left: Airline + Route */}
              <div className="flex-1 flex flex-col gap-3">
                {/* Airline header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AirlineLogo
                      providerName={providerName}
                      className="w-6 h-6 rounded-md text-xs"
                    />
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">
                      {providerName}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                      flight.details?.stops === 0
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {flight.details?.stops === 0
                      ? "直飛"
                      : `${flight.details?.stops} 轉`}
                  </span>
                </div>

                {/* Route times */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex flex-col items-start">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {flight.details?.departure || "--:--"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold tracking-[0.18em] mt-0.5">
                      {(flight.details?.depCode || "TPE")
                        .toUpperCase()
                        .substring(0, 3)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center flex-1 px-4 sm:px-8">
                    <span className="text-[11px] text-slate-400 font-medium mb-1">
                      {flight.details?.duration || "3h 15m"}
                    </span>
                    <div className="w-full relative flex items-center justify-center h-[2px] bg-slate-200 dark:bg-slate-600 rounded-full">
                      <div className="absolute right-0 w-2 h-2 rounded-full border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 translate-x-1" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {flight.details?.arrival || "--:--"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold tracking-[0.18em] mt-0.5">
                      {(flight.details?.arrCode || "TYO")
                        .toUpperCase()
                        .substring(0, 3)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Price + Actions */}
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center sm:min-w-[160px] gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-700 pt-3 sm:pt-0 sm:pl-5">
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">
                    總價
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-slate-400">
                      {flight.currency}
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none tabular-nums">
                      {flight.price.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(e, flight.id);
                    }}
                    aria-label={isSaved ? "取消收藏" : "收藏航班"}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 border ${
                      isSaved
                        ? "bg-pink-50 border-pink-100 text-pink-500"
                        : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-400 hover:text-pink-400 hover:border-pink-200 shadow-sm"
                    }`}
                  >
                    <Heart
                      size={15}
                      fill={isSaved ? "currentColor" : "transparent"}
                      strokeWidth={2.5}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrack(e, flight);
                    }}
                    aria-label={isTracked ? "取消追蹤降價" : "追蹤降價"}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 border ${
                      isTracked
                        ? "bg-slate-900 border-slate-900 text-white shadow-md"
                        : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    {isTracked ? (
                      <BellRing size={15} strokeWidth={2.5} />
                    ) : (
                      <Bell size={15} strokeWidth={2.5} />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImportToTrip(e, flight);
                    }}
                    className="h-10 px-4 rounded-xl flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all active:scale-95 border border-transparent"
                  >
                    <PlaneTakeoff size={14} strokeWidth={2.5} />
                    <span className="text-sm font-bold">帶入</span>
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
    <div className="group/dest h-full min-w-[76vw] snap-center sm:min-w-0">
      <div className="relative h-full min-h-[402px] overflow-hidden rounded-[34px] border border-white/72 bg-white/55 shadow-[0_12px_38px_rgba(15,23,42,0.10)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_64px_rgba(15,23,42,0.16)] sm:min-h-[418px]">
        <img
          src={meta.image}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover object-[center_24%] transition-transform duration-700 group-hover/dest:scale-[1.04] sm:object-center"
          loading="lazy"
        />
        <button
          type="button"
          onClick={onPress}
          className="absolute inset-0"
          aria-label={`查看 ${title} 航班詳情`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-slate-950/58" />
        <div className="absolute inset-x-3.5 bottom-3.5 z-10 rounded-[30px] border border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.58))] p-4 shadow-[0_20px_44px_rgba(15,23,42,0.18)] backdrop-blur-[18px] sm:inset-x-4 sm:bottom-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="mb-2 inline-flex items-center rounded-full bg-white/72 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm sm:text-xs">
                {meta.country} {meta.flag}
              </span>
              <h3 className="text-[28px] font-black leading-none tracking-[-0.04em] text-slate-950 sm:text-[33px]">
                {title}
              </h3>
              <p className="mt-1.5 text-[13px] font-medium leading-[1.42] text-slate-600 line-clamp-2 sm:mt-2 sm:text-[14px]">
                {meta.tagline}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(e);
              }}
              aria-label={isSaved ? "取消收藏目的地" : "收藏目的地"}
              className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/65 backdrop-blur-md transition-all active:scale-90 shadow-sm ${isSaved ? "bg-pink-500 text-white" : "bg-white/85 text-slate-500 hover:bg-white hover:text-pink-500"}`}
            >
              <Heart
                size={15}
                fill={isSaved ? "currentColor" : "transparent"}
                strokeWidth={2}
              />
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/72 px-2.5 py-1.5 text-[11px] font-black text-slate-700 shadow-sm sm:gap-2 sm:px-3 sm:py-2 sm:text-xs whitespace-nowrap">
              <AirlineLogo
                providerName={providerName}
                className="h-5 w-5 rounded-full text-[9px] shrink-0"
              />
              <span className="truncate max-w-[130px]">{providerName}</span>
            </span>
            <span className="inline-flex items-center rounded-full bg-white/72 px-2.5 py-1.5 text-[11px] font-black text-slate-700 shadow-sm sm:px-3 sm:py-2 sm:text-xs whitespace-nowrap">
              {flight.details?.departure || "--:--"} →{" "}
              {flight.details?.arrival || "--:--"}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1.5 text-[11px] font-black shadow-sm sm:px-3 sm:py-2 sm:text-xs whitespace-nowrap ${flight.details?.stops === 0 ? "bg-emerald-50/95 text-emerald-600" : "bg-white/72 text-slate-700"}`}
            >
              {flight.details?.duration || "3h 15m"} · {stopLabel}
            </span>
          </div>

          <div className="mt-[18px] flex items-end justify-between gap-3 sm:mt-5">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                From
              </p>
              <p className="mt-1 text-[21px] font-black leading-none tracking-[-0.035em] text-slate-950 sm:text-[23px] tabular-nums">
                {flight.currency} {flight.price.toLocaleString()}
              </p>
              <p className="mt-1 truncate text-[11px] font-bold text-slate-500 sm:text-xs">
                {routeLabel}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImportToTrip(e);
                }}
                className="flex h-10 items-center gap-1.5 rounded-full bg-slate-900/92 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white transition-all active:scale-95 hover:bg-slate-800 sm:h-auto sm:px-3.5 sm:py-2.5 sm:text-xs sm:tracking-[0.16em]"
              >
                <PlaneTakeoff size={12} strokeWidth={2.5} />
                帶入
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPress();
                }}
                className="h-10 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-4 py-2 text-[11px] font-black text-white shadow-[0_10px_24px_rgba(236,72,153,0.28)] transition-all active:scale-95 hover:brightness-105 sm:h-auto sm:px-[18px] sm:py-2.5 sm:text-[12px]"
              >
                Explore
              </button>
            </div>
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
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&auto=format&fit=crop",
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
      "https://images.unsplash.com/photo-1531365737338-5a6d5e3abe3a?w=600&auto=format&fit=crop",
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
      "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&auto=format&fit=crop",
    description:
      "歐洲心臟，由 26 個州組成。阿爾卑斯山脈、瑞士高原與侏羅山構成壯麗地貌，精緻鐘錶工藝與多語言文化造就獨特魅力。",
    tags: ["阿爾卑斯", "精品", "自然"],
    highlights: ["🏔️ 阿爾卑斯山", "🕰️ 鐘錶工藝", "🧀 起司美食", "🚂 登山列車"],
    guideUrl: "https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/",
  },
];

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
  const [isHeroExpanded, setIsHeroExpanded] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth >= 768
  );
  const [searchProgress, setSearchProgress] = useState(0);
  const [progressMsgIdx, setProgressMsgIdx] = useState(0);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { onScroll } = useHideNavOnScroll();

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

        let TRIP_ID = activeTripId;

        // If no active trip, create a new one first
        if (!TRIP_ID) {
          const newTrip = await createTrip({
            name: handbook.title,
            destination: handbook.tags[0] || "指定地點",
          });
          const newTripId = String(newTrip.id);
          TRIP_ID = newTripId;
          setActiveTripId(newTripId);
        }

        if (!TRIP_ID) {
          throw new Error("trip id missing after clone bootstrap");
        }

        const ensuredTripId = TRIP_ID;

        if (handbook.nodes && handbook.nodes.length) {
          setNodes([]);
          const normalized = handbook.nodes.map(
            (rawNode: any) => ({ ...rawNode, source: "local" }) as any,
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

        showToast(`已成功將 ${handbook.title} 複製到您的手帳！`, "success");
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

  const filteredResults = useMemo(() => {
    if (!hasRoundTripLegMenu) return typeFilteredResults;
    return typeFilteredResults.filter(
      (result) => result.legType === roundTripLegView,
    );
  }, [hasRoundTripLegMenu, roundTripLegView, typeFilteredResults]);

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
    // Initial fetch for recommendations and handbooks
    const loadInitialData = async () => {
      try {
        const seedDate = new Date();
        seedDate.setDate(seedDate.getDate() + 30);
        const seedDateStr = seedDate.toISOString().slice(0, 10);

        const [handbooks, recommendations] = await Promise.all([
          fetchHandbooks(),
          searchOffers({
            from: searchForm.from || "TPE",
            to: searchForm.to || "TYO",
            date: seedDateStr,
          }).catch(() => []),
        ]);
        setCommunityTrips(handbooks);
        if (results.length === 0) setResults(recommendations);
      } catch (e) {
        console.error("Failed to load initial data", e);
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
        `已成功將行程 ${trip.name ?? trip.title ?? ""} 複製到您的手帳！`,
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
    // 根據選好的地方 顯示中文
    updateField(field, destination.place);
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
      showToast("請先開啟一趟旅程，再把航班帶入手帳。", "warning");
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative flex flex-col flex-1 w-full min-h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-tab-safe md:pb-14"
    >
      {/* === HERO SECTION with gradient background === */}
      <div
        className={`relative z-10 w-full pt-10 sm:pt-[72px] ${!isHeroExpanded ? "pb-3" : "pb-10 sm:pb-14"} px-3 sm:px-6 overflow-visible`}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(240,249,255,0.94),rgba(255,250,252,0.98),rgba(255,247,237,0.9))] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/55 via-white/10 to-transparent pointer-events-none" />
        <div className="absolute -top-10 right-6 h-72 w-72 rounded-full bg-sky-200/20 blur-[96px] pointer-events-none" />
        <div className="absolute top-10 left-[-1rem] h-60 w-60 rounded-full bg-pink-200/18 blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-12 right-[18%] h-64 w-64 rounded-full bg-orange-200/24 blur-[92px] pointer-events-none" />

        <div className="relative z-20 mx-auto w-full max-w-[1120px]">
          {/* Hero title */}
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: "easeOut" }}
            className={`relative mx-auto mb-4 max-w-[960px] space-y-3 overflow-hidden rounded-[34px] border border-white/84 bg-[linear-gradient(180deg,rgba(255,255,255,0.64),rgba(255,250,252,0.54),rgba(248,251,255,0.44))] px-4 py-4.5 text-center shadow-[0_16px_34px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[18px] sm:mb-5 sm:space-y-4 sm:px-6 sm:py-6.5${!isHeroExpanded ? " hidden sm:block" : ""}`}
          >
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-200/18 blur-3xl" />
            <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-orange-200/16 blur-3xl" />
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <span className="inline-flex items-center rounded-full border border-white/92 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-sky-700 shadow-[0_6px_14px_rgba(14,165,233,0.07)] backdrop-blur-md">
                Collaborative Trip Planner
              </span>
              <span className="hidden items-center rounded-full border border-white/92 bg-white/84 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-orange-500 shadow-[0_6px_14px_rgba(249,115,22,0.07)] backdrop-blur-md sm:inline-flex">
                Beta
              </span>
            </div>
            <div className="relative space-y-2 sm:space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                Premium Jelly Journey Desk
              </p>
              <h1 className="mx-auto max-w-4xl text-balance text-[28px] font-black tracking-[-0.045em] text-slate-900 sm:text-[42px] md:text-[54px] md:leading-[1.01]">
                把航班、地圖與旅伴分工，收進同一份旅程
              </h1>
              <p className="mx-auto max-w-[40rem] text-pretty text-[14px] leading-[1.75] text-slate-600 sm:text-[15px] sm:leading-[1.82]">
                RoamJelly 先幫你鎖定出發節奏，再把靈感、共編清單和旅途工具串成可執行的旅程，不必在多個 App 之間切換。
              </p>
            </div>
            <div className="mx-auto flex max-w-[620px] flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/70 pt-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:gap-x-5">
              <span>先比價</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>再共編</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>最後接工具包</span>
            </div>

            {isHeroExpanded && (
              <motion.div
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.24, delay: prefersReducedMotion ? 0 : 0.05, ease: "easeOut" }}
                className="flex snap-x gap-2 overflow-x-auto pb-1 text-left sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:pb-0"
              >
                {HERO_STORY_PILLARS.map((pillar, index) => {
                  const Icon = pillar.icon;
                  const decor = HERO_PILLAR_DECOR[index % HERO_PILLAR_DECOR.length];
                  return (
                    <motion.div
                      key={pillar.title}
                      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
                      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.22, delay: prefersReducedMotion ? 0 : 0.08 + index * 0.04, ease: "easeOut" }}
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
                        previewLines={3}
                        minCharacters={88}
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
                          onClick={() =>
                            setActiveStoryInfo({
                              eyebrow: pillar.eyebrow,
                              title: pillar.title,
                              description: pillar.description,
                              details: pillar.details,
                              tone: pillar.tone,
                              icon: Icon,
                            })
                          }
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/92 bg-white/94 px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.96] hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
                        >
                          查看說明
                          <ArrowRight size={12} strokeWidth={2.6} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
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
                      先鎖定這趟旅行的時間骨架，之後再補地圖、景點與共編細節。
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
                <div className="flex flex-col gap-2 rounded-[28px] border border-white/96 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,249,252,0.9),rgba(248,251,255,0.86))] p-2.5 shadow-[0_12px_40px_rgba(14,165,233,0.10),0_3px_12px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-2xl sm:gap-2 sm:rounded-3xl sm:p-3.5 dark:border-slate-700 dark:bg-slate-800/90">
                  {/* FROM / TO row */}
                  <div className="relative grid grid-cols-2">
                    {/* FROM cell */}
                    <div
                      className={`flex flex-col gap-0.5 sm:gap-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-[18px] sm:rounded-2xl cursor-text ${searchFieldSurfaceClass}`}
                      onClick={() => {
                        setShowDeparturePicker(true);
                        setShowDestinationPicker(false);
                        setShowDatePicker(false);
                        setShowReturnDatePicker(false);
                      }}
                    >
                      <span className="text-[11px] font-black tracking-[0.18em] text-slate-500 uppercase">
                        FROM
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

                    {/* Center airplane divider */}
                    <div className="absolute left-1/2 top-1/2 z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700">
                      <PlaneTakeoff
                        size={14}
                        className="text-sky-500"
                        strokeWidth={2.5}
                      />
                    </div>

                    {/* TO cell */}
                    <div
                      className={`flex flex-col gap-0.5 sm:gap-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-[18px] sm:rounded-2xl cursor-text ${searchFieldSurfaceClass}`}
                      onClick={() => {
                        setShowDestinationPicker(true);
                        setShowDeparturePicker(false);
                        setShowDatePicker(false);
                        setShowReturnDatePicker(false);
                      }}
                    >
                      <span className="text-[11px] font-black tracking-[0.18em] text-slate-500 uppercase">
                        TO
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
                      className={`flex flex-col gap-0.5 sm:gap-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-[18px] sm:rounded-2xl cursor-pointer bg-slate-50/60 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 text-left w-full ${searchFieldSurfaceClass}`}
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
                      className={`flex flex-col gap-0.5 sm:gap-1 px-3 py-2.5 sm:px-4 sm:py-3 rounded-[18px] sm:rounded-2xl cursor-pointer border text-left w-full ${
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
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-black tracking-wide shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                      isSearchDisabled || loading || isOffline
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-sky-500 via-sky-500 to-orange-400 text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] hover:from-sky-600 hover:to-orange-500 active:scale-[0.92] hover:-translate-y-1"
                    }`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <SearchIcon size={17} strokeWidth={3} /> 開始規劃這趟旅程
                      </>
                    )}
                  </button>
                  <p className="px-1 pt-1 text-center text-[12px] font-bold leading-5 text-slate-500">
                    先找班機，之後可以再把住宿、接送與分帳慢慢補進來。
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
          <div className="mb-3 space-y-1 sm:mb-3.5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
              把旅程補完整
            </p>
            <p className="text-sm text-slate-600">
              住宿、票券與接送放在同一個研究流程裡，比較不容易漏掉真正會影響行程節奏的細節。
            </p>
          </div>
          <div className="flex flex-row items-center overflow-x-auto hide-scrollbar gap-2.5 snap-x pb-1">
            <a
              href="https://www.agoda.com/partners/partnersearch.aspx?cid=1762106&hl=zh-tw"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 snap-start transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92] hover:-translate-y-1 ${chipPressClass}`}
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
              className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 snap-start transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92] hover:-translate-y-1 ${chipPressClass}`}
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
              className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 snap-start transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92] hover:-translate-y-1 ${chipPressClass}`}
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
                eyebrow="Search To Notebook"
                title="先找航班，再把旅程帶進手帳"
                description="航班比價只是旅程起點。後續可以把結果、模板行程與靈感素材逐步收進同一份規劃。"
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
                    className={`w-11 h-11 flex items-center justify-center rounded-[8px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92] ${viewType === "grid" ? "bg-white shadow-sm text-slate-900 border border-slate-200/50" : "text-slate-500 hover:text-slate-600 hover:-translate-y-0.5"}`}
                    title="卡片檢視"
                    aria-label="卡片檢視"
                    aria-pressed={viewType === "grid"}
                  >
                    <LayoutGrid size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setViewType("table")}
                    className={`w-11 h-11 flex items-center justify-center rounded-[8px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92] ${viewType === "table" ? "bg-white shadow-sm text-slate-900 border border-slate-200/50" : "text-slate-500 hover:text-slate-600 hover:-translate-y-0.5"}`}
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
          </div>

          <div className="relative min-h-[300px]">
            {/* Loading Overlay — Skyscanner-style progress bar */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col items-center pt-20 bg-white/50 backdrop-blur-sm rounded-[24px]"
                >
                  <div className="flex flex-col items-center gap-5 p-7 bg-white/97 shadow-2xl rounded-3xl border border-slate-200/80 w-[88%] max-w-sm">
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
                        <PlaneTakeoff size={20} className="text-[#b35f76]" />
                      </motion.div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest leading-none whitespace-nowrap">
                          {SEARCH_LOADING_MESSAGES[progressMsgIdx]}
                        </span>
                        <span className="text-[11px] font-black text-slate-500 tabular-nums">
                          {Math.round(searchProgress)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#b35f76] via-[#7b5ea7] to-[#2c6956]"
                          animate={{ width: `${searchProgress}%` }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    <p className="text-slate-500 font-medium text-[11px] tracking-wide text-center whitespace-nowrap">
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
                <GlassCard className="bg-[#fff1f2] border-[#fecdd3] flex flex-col">
                  <span className="text-[#be123c] font-bold text-base">
                    果凍精靈迷路了 🥺，請稍後再試試看！
                  </span>
                  <span className="text-[#be123c] mt-2 text-sm">
                    {searchError === "timeout"
                      ? "目前查詢逾時，已先收起錯誤細節。"
                      : "供應商稍忙，請再試一次。"}
                  </span>
                </GlassCard>
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
                            className="h-full min-w-[76vw] snap-center sm:min-w-0"
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
                      className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-xl rounded-3xl border border-white mx-2 shadow-sm"
                    >
                      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-5xl mb-6 grayscale opacity-60">
                        🔍
                      </div>
                      <h3 className="text-xl font-black text-slate-800 mb-2">
                        找不到符合條件的航班
                      </h3>
                      <p className="text-slate-500 font-bold max-w-xs text-center leading-relaxed">
                        請嘗試更換日期或是搜尋其他城市，果凍精靈會繼續為您守候。
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
                        <div className="grid gap-3 md:grid-cols-3">
                          {demoTemplates.map((handbook) => (
                            <button
                              key={handbook.id}
                              type="button"
                              onClick={() => {
                                triggerHapticFeedback([16]);
                                setActiveHandbook(handbook);
                              }}
                              className={`group/demo overflow-hidden rounded-[28px] border border-white/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 text-left shadow-lg shadow-slate-200/40 dark:shadow-black/30 hover:shadow-xl ${cardSurfaceClass}`}
                            >
                              <div className="relative h-36 overflow-hidden">
                                <img
                                  src={handbook.image}
                                  alt={handbook.title}
                                  className="h-full w-full object-cover transition-transform duration-700 group-hover/demo:scale-105"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                                <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-slate-950/45 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                                  Instant Demo
                                </div>
                                <div className="absolute bottom-3 left-3 right-3 text-white">
                                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/75">
                                    {handbook.days} Days
                                  </div>
                                  <div className="mt-1 text-lg font-black leading-tight">
                                    {handbook.title}
                                  </div>
                                </div>
                              </div>
                              <div className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  {handbook.tags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-full bg-slate-100 dark:bg-white/8 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-200"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-800 dark:text-white">
                                  點我預覽
                                  <ArrowRight size={14} />
                                </div>
                              </div>
                            </button>
                          ))}
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

              <div className="w-full overflow-x-auto pb-6 -mx-6 px-6 scrollbar-hide">
                <div className="flex gap-6 min-w-max">
                  {communityTrips.map((trip) => (
                    <motion.div
                      key={trip.id}
                      className="w-[280px] sm:w-[320px] group/trip"
                    >
                      <GlassCard
                        className={`!p-0 overflow-hidden h-full rounded-[30px] border border-white/86 shadow-[0_12px_34px_-8px_rgba(255,160,200,0.14),inset_0_1px_0_rgba(255,255,255,0.96)] hover:shadow-[0_20px_44px_-14px_rgba(255,160,200,0.24)] flex flex-col ${cardSurfaceClass}`}
                      >
                        <div className="relative h-40 overflow-hidden flex-shrink-0 sm:h-44">
                          <img
                            src={trip.cover}
                            alt={trip.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover/trip:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-black tracking-widest uppercase text-white">
                            Public Template
                          </div>
                          <div className="absolute top-3 right-3 rounded-full border border-white/30 bg-slate-950/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
                            fork & remix
                          </div>
                          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-white text-[11px] font-black uppercase tracking-[0.15em] opacity-80">
                                by {trip.author || "Anonymous"}
                              </p>
                              <h3 className="text-white font-black text-xl leading-tight drop-shadow-md line-clamp-2">
                                {trip.title}
                              </h3>
                            </div>
                          </div>
                        </div>

                        <div className="relative overflow-hidden p-4 sm:p-5 flex flex-col flex-1 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(255,247,251,0.95),rgba(244,249,255,0.92))]">
                          <div className="absolute -right-10 -top-10 size-24 rounded-full bg-pink-200/35 blur-3xl" />
                          <div className="relative mb-2.5 w-fit inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm">
                            <Sparkles size={12} strokeWidth={2.6} />
                            旅伴明信片
                          </div>

                          <div className="relative mb-3 rounded-[20px] border border-white/90 bg-white/78 px-3.5 py-2.5 text-[12px] font-bold leading-5 text-slate-600 shadow-sm">
                            先把別人的旅程節奏當成一張明信片，喜歡再複製成自己的出發草稿。
                          </div>

                          <div className="relative flex items-center gap-2 mb-5 flex-wrap">
                            {trip.destination && (
                              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-full">
                                #{trip.destination}
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">
                              已被複製 {trip.forkCount ?? trip.likes ?? 0} 次
                            </span>
                          </div>

                          <button
                            onClick={(event) => handleCloneTrip(event, trip)}
                            className={`mt-auto w-full py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-pink-500 via-orange-400 to-sky-500 text-white font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_10px_20px_rgba(244,114,182,0.18)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_14px_24px_rgba(244,114,182,0.24)] group/btn`}
                          >
                            <Copy
                              size={14}
                              className="transition-transform group-hover/btn:rotate-12"
                            />
                            一鍵複製到我的草稿
                          </button>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </div>
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

            <div className="w-full overflow-x-auto pb-6 -mx-6 px-6 scrollbar-hide">
              <div className="flex gap-6 min-w-max">
                {FEATURED_DESTINATIONS.map((dest, index) => {
                  const decor = FEATURED_CARD_DECOR[index % FEATURED_CARD_DECOR.length];
                  return (
                  <motion.div
                    key={dest.id}
                    className="w-[272px] sm:w-[304px] group/dest"
                  >
                    <GlassCard
                      className={`!p-0 overflow-hidden h-full rounded-[30px] border border-white/86 shadow-[0_12px_34px_-8px_rgba(255,160,200,0.14),inset_0_1px_0_rgba(255,255,255,0.96)] hover:shadow-[0_20px_44px_-14px_rgba(255,160,200,0.24)] flex flex-col ${cardSurfaceClass}`}
                    >
                      {/* Cover Image */}
                      <div className="relative h-40 overflow-hidden flex-shrink-0 sm:h-44">
                        <img
                          src={dest.image}
                          alt={dest.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/dest:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute left-3 top-3 flex items-center gap-2">
                          <span className="rounded-full border border-white/40 bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                            Postcard Pick
                          </span>
                          {dest.tags[0] ? (
                            <span className="hidden rounded-full border border-white/30 bg-slate-950/35 px-2.5 py-1 text-[10px] font-black tracking-[0.16em] text-white/90 backdrop-blur-md sm:inline-flex">
                              {dest.tags[0]}
                            </span>
                          ) : null}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-2">
                          <span className="text-3xl drop-shadow-lg">
                            {dest.flag}
                          </span>
                          <h3 className="text-white font-black text-xl leading-tight drop-shadow-md">
                            {dest.name}
                          </h3>
                        </div>
                        {/* Tag pills on top-right */}
                        <div className="absolute top-3 right-3 hidden flex-col gap-1 items-end sm:flex">
                          {dest.tags.slice(1, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[11px] font-black text-white bg-white/20 backdrop-blur-md border border-white/30 px-2 py-0.5 rounded-full uppercase tracking-wider"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className={`relative overflow-hidden p-4 sm:p-5 flex flex-col flex-1 ${decor.body}`}>
                        <div className={`absolute -right-8 -top-8 size-24 rounded-full blur-2xl ${decor.glow}`} />
                        <div className="relative mb-2.5 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm">
                            <Sparkles size={12} strokeWidth={2.6} />
                            Travel Mood
                          </span>
                          {dest.highlights[0] ? (
                            <span className="text-[11px] font-bold text-slate-500 line-clamp-1">
                              {dest.highlights[0]}
                            </span>
                          ) : null}
                        </div>

                        <ExpandableText
                          text={dest.description}
                          previewLines={3}
                          minCharacters={84}
                          className="relative mb-3"
                          textClassName="text-pretty text-[13px] font-medium leading-[1.68] text-slate-600 sm:text-[13px]"
                          collapsedLabel="看更多靈感"
                          expandedLabel="收起介紹"
                        />

                        <div className="relative flex flex-wrap gap-1.5 sm:gap-2 mb-4">
                          {dest.highlights.slice(0, 3).map((h, highlightIndex) => (
                            <span
                              key={h}
                              className={`text-[11px] font-bold border px-2.5 py-1 rounded-full ${CARD_STICKER_TONES[(index + highlightIndex) % CARD_STICKER_TONES.length]}`}
                            >
                              {h}
                            </span>
                          ))}
                        </div>

                        <button
                          className={`mt-auto w-full py-3 sm:py-3.5 rounded-full bg-gradient-to-r text-white font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_10px_20px_rgba(14,165,233,0.14)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] hover:-translate-y-0.5 group/btn ${decor.cta}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const g = getCountryGuide(dest.id);
                            if (g) setActiveGuide(g);
                          }}
                        >
                          <ExternalLink
                            size={13}
                            className="transition-transform group-hover/btn:translate-x-0.5"
                          />
                          查看完整攻略
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Expert Handbooks Section */}
          <div className="mt-8 md:mt-14 mb-6 md:mb-8 px-2">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-fuchsia-500" size={24} />
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                熱門達人手帳
              </h2>
            </div>

            <div className="w-full overflow-x-auto pb-6 -mx-6 px-6 scrollbar-hide">
              <div className="flex gap-6 min-w-max">
                {EXPERT_HANDBOOKS.map((handbook, index) => {
                  const decor = HANDBOOK_CARD_DECOR[index % HANDBOOK_CARD_DECOR.length];
                  return (
                  <motion.div
                    key={handbook.id}
                    className="w-[286px] sm:w-[320px] group/handbook"
                  >
                    <GlassCard
                      onClick={() => setActiveHandbook(handbook)}
                      className={`!p-0 overflow-hidden h-full rounded-[30px] border border-white/86 shadow-[0_12px_34px_-8px_rgba(255,160,200,0.14),inset_0_1px_0_rgba(255,255,255,0.96)] hover:shadow-[0_20px_44px_-14px_rgba(255,160,200,0.24)] cursor-pointer ${cardSurfaceClass}`}
                    >
                      <div className="relative h-40 overflow-hidden sm:h-44">
                        <img
                          src={handbook.image}
                          alt={handbook.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/handbook:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                        <div className="absolute left-4 top-4 flex items-center gap-2">
                          <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[11px] font-black text-white uppercase tracking-wider border border-white/30">
                            {handbook.days} Days
                          </span>
                          <span className={`hidden rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] sm:inline-flex ${decor.badge}`}>
                            editor's pick
                          </span>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex items-center gap-2">
                            <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[11px] font-black text-white uppercase tracking-wider border border-white/30">
                              {handbook.days} Days
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={`relative overflow-hidden p-4 sm:p-5 flex flex-col flex-1 ${decor.body}`}>
                        <div className={`absolute -right-8 top-0 size-24 rounded-full blur-2xl ${decor.glow}`} />
                        <div className="relative mb-2.5 w-fit inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm">
                          <Sparkles size={12} strokeWidth={2.6} />
                          旅伴草稿
                        </div>
                        <h3 className="text-[18px] sm:text-xl font-black text-slate-800 mb-1 leading-tight">
                          {handbook.title}
                        </h3>
                        <p className="text-[13px] sm:text-sm font-bold text-slate-500 mb-2.5">
                          {handbook.author}
                        </p>

                        <div className="editorial-card-soft mb-3.5 rounded-[20px] px-3.5 py-2.5 text-[12px] font-bold leading-[1.7] text-slate-600">
                          先把這份達人手帳當成旅伴寄來的明信片，再複製成你的出發版本。
                        </div>

                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
                          {handbook.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span
                              key={tag}
                              className={`text-[11px] font-bold border px-2.5 py-1 rounded-full ${CARD_STICKER_TONES[(index + tagIndex) % CARD_STICKER_TONES.length]}`}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={(e) =>
                            handleCopyExpertItinerary(e, handbook)
                          }
                          className={`mt-auto w-full py-3 sm:py-3.5 rounded-full bg-gradient-to-r text-white font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_10px_20px_rgba(244,114,182,0.14)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] hover:-translate-y-0.5 group/btn ${decor.cta}`}
                        >
                          <Copy
                            size={14}
                            className="transition-transform group-hover/btn:rotate-12"
                          />
                          複製行程
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                  );
                })}
              </div>
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
                  alt={flyingCard.handbook.title || "達人手帳預覽"}
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
