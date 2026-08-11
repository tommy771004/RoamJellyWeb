import React from "react";
import { Heart, PlaneTakeoff } from "lucide-react";
import type { SearchItem } from "../types/workflow";
import AirlineLogo from "./AirlineLogo";
import { useTranslation } from "react-i18next";

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

export default function DestinationCard({
  flight,
  isSaved,
  onPress,
  onImportToTrip,
  onToggleSave,
}: DestinationCardProps) {
    const { t } = useTranslation();
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
        className="flex flex-row items-stretch w-[300px] xs:w-[340px] sm:w-full min-h-[200px] sm:min-h-[220px] overflow-hidden rounded-[26px] border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/65 backdrop-blur-xl shadow-md hover:shadow-xl transition-all duration-300 relative"
      >
        {/* Invisible button overlay to view details */}
        <button
          type="button"
          onClick={onPress}
          className="absolute inset-0 z-0 bg-transparent cursor-pointer"
          aria-label={`查看 ${title} 航班詳情`}
        />

        {/* Left Section: Adaptive Destination image with high contrast */}
        <div className="relative w-32 xs:w-36 sm:w-40 shrink-0 overflow-hidden font-sans">
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
          <div className="absolute left-3 top-3 flex flex-col gap-1.5 flex-wrap z-10">
            <span className="rounded-md bg-slate-950/60 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur-md font-mono tracking-wider">
              {rawArr || "TYO"}
            </span>
            <span className="rounded-md bg-pink-700/90 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur-md whitespace-nowrap">
              {meta.flag} {meta.country}
            </span>
          </div>

          {/* Bottom image overlay with Title and Price */}
          <div className="absolute bottom-3 left-3 right-3 text-white z-10 select-none">
            <h3 className="font-extrabold text-[15px] leading-tight drop-shadow-md truncate">
              {title}
            </h3>
            <span className="text-[10px] sm:text-[11px] font-black text-pink-300 font-mono drop-shadow-sm block mt-0.5 whitespace-nowrap">
              {t('str_cc84e')}{flight.currency} {flight.price.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right Section: Core flight information with high contrast & beautiful symmetry */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3 text-left relative z-10 pointer-events-auto">
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
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-100 dark:border-white/5 backdrop-blur-md transition-all ios-press ${isSaved ? "bg-pink-600 text-white border-none shadow-sm" : "bg-white/80 text-slate-500 hover:bg-white hover:text-pink-500 shadow-sm"}`}
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
              className="flex-1 flex h-8 items-center justify-center gap-1.5 rounded-full bg-slate-900/90 dark:bg-slate-800 hover:bg-slate-800 text-white dark:text-slate-100 px-2.5 text-[10px] font-black uppercase tracking-[0.05em] transition-all ios-press"
            >
              <PlaneTakeoff size={10} strokeWidth={2.5} />
              {t('str_bb9ef')}</button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPress();
              }}
              className="flex-1 h-8 rounded-full bg-gradient-to-r from-rose-700 to-fuchsia-700 px-3 text-[10px] font-black text-white hover:brightness-105 ios-press transition-all flex items-center justify-center"
            >
              Explore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
