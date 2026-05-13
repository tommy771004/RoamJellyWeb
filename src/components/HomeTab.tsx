import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellRing, Heart, Search as SearchIcon, ChevronLeft, ChevronRight, Calendar, LayoutGrid, List, PlaneTakeoff, Sparkles, ArrowRight, Copy, Globe, ExternalLink, Bed, Ticket, CarFront } from 'lucide-react';
import GlassCard from './GlassCard';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FlightSkeletonCard } from './SkeletonCard';
import { searchOffers, SearchServiceUnavailableError, SearchTimeoutError, fetchHandbooks, createTripFact, syncItinerary } from '../lib/workflowApi';
import { useSearchStore } from '../store/useSearchStore';
import { useAppStore } from '../store/useAppStore';
import { useItineraryStore } from '../store/useItineraryStore';
import type { SearchItem, SyncItineraryPayload } from '../types/workflow';
import {
  TRAVEL_GUIDE_DESTINATIONS,
  TRAVEL_GUIDE_REGIONS,
  TRAVEL_GUIDE_SOURCE_REPO,
  matchTravelDestinations,
  type TravelGuideDestination,
} from '../data/travelGuideDestinations';
import { LocationPickerPopup } from './LocationPickerPopup';
import CountryGuideModal from './CountryGuideModal';
import ExpertHandbookModal from './ExpertHandbookModal';
import { getCountryGuide } from '../data/countryGuideData';
import type { CountryGuide } from '../data/countryGuideData';
import { EXPERT_HANDBOOKS } from '../data/expertHandbooks';
import DatePickerPopup from './DatePickerPopup';
import { triggerHapticFeedback } from '../lib/haptics';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const AIRLINE_CODES: Record<string, string> = {
  'EVA Air': 'BR', '長榮航空': 'BR',
  'China Airlines': 'CI', '中華航空': 'CI',
  'Starlux Airlines': 'JX', '星宇航空': 'JX',
  'Tigerair Taiwan': 'IT', '台灣虎航': 'IT',
  'Peach Aviation': 'MM', '樂桃航空': 'MM',
  'Cathay Pacific': 'CX', '國泰航空': 'CX',
  'Japan Airlines': 'JL', '日本航空': 'JL',
  'All Nippon Airways': 'NH', '全日空': 'NH',
  'Hong Kong Airlines': 'HX', '香港航空': 'HX',
  'Asiana Airlines': 'OZ', '韓亞航空': 'OZ',
  'Korean Air': 'KE', '大韓航空': 'KE',
  'China Eastern Airlines': 'MU', '東方航空': 'MU',
  'China Eastern': 'MU', '中國東方航空': 'MU',
  'Air Macau': 'NX', '澳門航空': 'NX',
  'Scoot': 'TR', '酷航': 'TR',
  'HK Express': 'UO', '香港快運': 'UO',
  // standard OTAs no image
};

function AirlineLogo({ providerName, className }: { providerName: string, className: string }) {
  const normalizedName = providerName?.trim() || '';
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
  const initial = normalizedName?.charAt(0) || '?';
  return (
    <div className={`${className} bg-slate-900 flex items-center justify-center font-black text-white shadow-sm`}>
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

function FlightCard({ flight, isSaved, isTracked, onPress, onImportToTrip, onToggleSave, onToggleTrack }: FlightCardProps) {
  const providerName = flight.details?.airline || flight.provider;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)} 
      className="block w-full h-full text-left appearance-none cursor-pointer border-none bg-transparent p-0 flex flex-col focus:outline-none group/card"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
    >
      <GlassCard className="!p-0 bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:bg-white flex-1 flex flex-col overflow-hidden rounded-[24px] group-hover/card:-translate-y-1 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]">
        
        {/* Top Section: Airline & Route */}
        <div className="p-4 flex flex-col gap-3">
          {/* Header Row: Airline + Save Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AirlineLogo providerName={providerName} className="w-7 h-7 rounded-lg text-sm" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1 leading-none mb-1">
                  <span className="text-xs font-semibold text-slate-900">{flight.details?.airline || flight.provider}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{flight.provider}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-fuchsia-600 bg-fuchsia-50 px-1 py-[2px] rounded-sm tracking-tight">VERIFIED</span>
                </div>
              </div>
            </div>
            <button
              onClick={onToggleSave}
              className={`w-7 h-7 rounded-full flex justify-center items-center transition-all duration-200 active:scale-90 ${
                isSaved ? 'bg-pink-100 text-pink-600' : 'bg-slate-100/80 text-slate-400 hover:bg-pink-50 hover:text-pink-500'
              }`}
            >
              <Heart
                size={14}
                fill={isSaved ? 'currentColor' : 'transparent'}
                strokeWidth={2.5}
              />
            </button>
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

            <div className="flex flex-col items-start z-10 bg-white/40 backdrop-blur-sm pr-1">
              <span className="text-xl font-black text-slate-900 tracking-tighter leading-none mb-1">
                {flight.details?.departure}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
                Depart
              </span>
            </div>

            <div className="flex flex-col items-end z-10 bg-white/40 backdrop-blur-sm pl-1">
              <span className="text-xl font-black text-slate-900 tracking-tighter leading-none mb-1">
                {flight.details?.arrival}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
                Arrive
              </span>
            </div>
          </div>
          
          {/* Flight Info Badges */}
          <div className="flex items-center gap-2 mt-1 text-slate-500 px-1">
            <div className="flex items-center gap-1">
               <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${flight.details?.stops === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                 {flight.details?.stops === 0 ? '直飛 DIRECT' : `${flight.details?.stops} 轉 STOP`}
               </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tight">{flight.details?.duration || '3h 15m'}</span>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-200/50 bg-slate-50/80"
            >
              <div className="p-4 px-5 text-sm flex flex-col gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Flight Details</span>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Operated by {flight.details?.airline || flight.provider}. This flight takes {flight.details?.duration || '3h 15m'} and offers an excellent travel experience. Please double-check terminal information upon arrival.
                  </p>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Baggage & Extras</span>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Standard fare typically includes one cabin bag. Additional baggage allowance and seat selection may incur extra charges with {flight.provider}.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Separator with cutout effect */}
        <div className="relative flex items-center h-3 w-full">
          <div className="absolute left-[-6px] w-3 h-3 bg-[#FAFAFA] rounded-full border-r border-slate-200/60 shadow-inner" />
          <div className="absolute right-[-6px] w-3 h-3 bg-[#FAFAFA] rounded-full border-l border-slate-200/60 shadow-inner" />
          <div className="w-full border-t border-dashed border-slate-300 mx-2.5" />
        </div>

        {/* Bottom Section: Price & CTA */}
        <div className="p-4 pt-2 bg-gradient-to-b from-transparent to-slate-50/80 flex items-end justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Estimated Price</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-slate-400">{flight.currency}</span>
              <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{flight.price.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleTrack(e); }}
              className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition-all active:scale-95 border ${
                isTracked 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 shadow-sm hover:shadow'
              }`}
            >
              {isTracked ? <BellRing size={14} strokeWidth={2.5} /> : <Bell size={14} strokeWidth={2.5} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onImportToTrip(e); }}
              className="h-8 px-3 rounded-[10px] flex items-center gap-1.5 transition-all active:scale-95 border border-transparent bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg"
            >
              <PlaneTakeoff size={14} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">帶入</span>
            </button>
            {isExpanded && (
              <button
                onClick={(e) => { e.stopPropagation(); onPress(); }}
                className="h-8 px-4 rounded-[10px] bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold transition-transform active:scale-95 shadow-md ml-1"
              >
                <span className="text-[10px] uppercase tracking-widest leading-none">購買</span>
              </button>
            )}
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
  onToggleTrack 
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
    <div className="overflow-x-auto pb-4 w-full">
      <table className="w-full min-w-[600px] border-separate" style={{ borderSpacing: '0 8px' }}>
        <caption className="sr-only">搜尋結果比較表</caption>
        <thead>
          <tr className="[&>th]:font-bold [&>th]:text-slate-400 [&>th]:text-[11px] [&>th]:uppercase [&>th]:tracking-widest [&>th]:pb-3 border-b border-slate-200">
            <th scope="col" className="text-left pl-4 font-sans align-bottom">航空公司</th>
            <th scope="col" className="text-left font-sans align-bottom">航班時間</th>
            <th scope="col" className="text-left font-sans align-bottom">轉機</th>
            <th scope="col" className="text-right font-sans align-bottom">價格 (TWD)</th>
            <th scope="col" className="text-right pr-4 font-sans align-bottom">動作</th>
          </tr>
        </thead>
        <tbody>
          {results.map((flight) => (
            <tr key={flight.id} className="cursor-pointer group/row bg-white hover:bg-slate-50/80 transition-all duration-300 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] rounded-2xl relative" onClick={() => onPress(flight)}>
              <td data-label="航空公司" className="py-4 pl-4 rounded-l-[16px] border-y border-l border-slate-100 group-hover/row:border-slate-200/60 transition-colors">
                <div className="flex items-center gap-3 justify-start">
                  <AirlineLogo providerName={flight.details?.airline || flight.provider} className="w-10 h-10 rounded-[10px] text-lg" />
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-slate-900 text-[13px] font-bold truncate max-w-[140px] leading-tight">{flight.details?.airline || flight.provider}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{flight.provider}</span>
                  </div>
                </div>
              </td>
              <td data-label="航班時間" className="py-4 border-y border-slate-100 group-hover/row:border-slate-200/60 transition-colors">
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-slate-900 font-bold text-[15px]">{flight.details?.departure}</span>
                    <span className="text-slate-300 text-xs">→</span>
                    <span className="text-slate-900 font-bold text-[15px]">{flight.details?.arrival}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{flight.details?.duration || '3h 15m'}</span>
                </div>
              </td>
              <td data-label="轉機" className="py-4 border-y border-slate-100 group-hover/row:border-slate-200/60 transition-colors">
                <div className="flex flex-col items-start">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${flight.details?.stops === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                    {flight.details?.stops === 0 ? '直飛' : `${flight.details?.stops} 轉`}
                  </span>
                </div>
              </td>
              <td data-label="價格 (TWD)" className="amount py-4 border-y border-slate-100 group-hover/row:border-slate-200/60 transition-colors pr-6 text-right">
                <div className="flex flex-col items-end justify-end">
                  <span className="text-xl font-black text-slate-900 tracking-tighter leading-none">{flight.price.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">{flight.currency}</span>
                </div>
              </td>
              <td data-label="操作" className="py-4 pr-4 rounded-r-[16px] border-y border-r border-slate-100 group-hover/row:border-slate-200/60 transition-colors">
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    onClick={(e) => onImportToTrip(e, flight)}
                    className="h-9 px-3 rounded-[10px] flex items-center gap-1 transition-all active:scale-95 border bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shadow-sm"
                  >
                    <PlaneTakeoff size={14} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold tracking-widest hidden sm:inline">帶入</span>
                  </button>
                  <button
                    onClick={(e) => onToggleTrack(e, flight)}
                    className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all active:scale-95 border ${
                      trackedPrices.includes(flight.id) 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    {trackedPrices.includes(flight.id) ? <BellRing size={15} strokeWidth={2.5} /> : <Bell size={15} strokeWidth={2.5} />}
                  </button>
                  <button
                    onClick={(e) => onToggleSave(e, flight.id)}
                    className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all active:scale-95 border ${
                      savedItems.includes(flight.id) 
                        ? 'bg-pink-100 border-pink-100 text-pink-500' 
                        : 'bg-white border-slate-200 text-slate-300 hover:text-pink-400 hover:border-pink-200 shadow-sm'
                    }`}
                  >
                    <Heart size={15} fill={savedItems.includes(flight.id) ? 'currentColor' : 'transparent'} strokeWidth={2.5} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Destination metadata lookup by IATA code
const DEST_META: Record<string, { name: string; country: string; flag: string; tagline: string; image: string }> = {
  NRT: { name: 'Tokyo', country: 'Japan', flag: '🇯🇵', tagline: 'Where tradition meets the future', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop' },
  TYO: { name: 'Tokyo', country: 'Japan', flag: '🇯🇵', tagline: 'Where tradition meets the future', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop' },
  HND: { name: 'Tokyo', country: 'Japan', flag: '🇯🇵', tagline: 'Where tradition meets the future', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop' },
  KIX: { name: 'Osaka', country: 'Japan', flag: '🇯🇵', tagline: 'Street food capital of Japan', image: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=600&auto=format&fit=crop' },
  OSA: { name: 'Osaka', country: 'Japan', flag: '🇯🇵', tagline: 'Street food capital of Japan', image: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=600&auto=format&fit=crop' },
  ITM: { name: 'Osaka', country: 'Japan', flag: '🇯🇵', tagline: 'Street food capital of Japan', image: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=600&auto=format&fit=crop' },
  FUK: { name: 'Fukuoka', country: 'Japan', flag: '🇯🇵', tagline: 'Ramen city by the sea', image: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=600&auto=format&fit=crop' },
  OKA: { name: 'Okinawa', country: 'Japan', flag: '🇯🇵', tagline: 'Tropical paradise of East Asia', image: 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=600&auto=format&fit=crop' },
  CTS: { name: 'Hokkaido', country: 'Japan', flag: '🇯🇵', tagline: 'Fresh seafood and winter wonderland', image: 'https://images.unsplash.com/photo-1553031977-03959cc47ac4?w=600&auto=format&fit=crop' },
  CDG: { name: 'Paris', country: 'France', flag: '🇫🇷', tagline: 'City of Love and Light', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&auto=format&fit=crop' },
  LHR: { name: 'London', country: 'UK', flag: '🇬🇧', tagline: 'Royal history meets modern culture', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&auto=format&fit=crop' },
  JFK: { name: 'New York', country: 'USA', flag: '🇺🇸', tagline: 'The city that never sleeps', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&auto=format&fit=crop' },
  SIN: { name: 'Singapore', country: 'Singapore', flag: '🇸🇬', tagline: 'Garden city of Asia', image: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=600&auto=format&fit=crop' },
  BKK: { name: 'Bangkok', country: 'Thailand', flag: '🇹🇭', tagline: 'City of temples and street food', image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&auto=format&fit=crop' },
  HKG: { name: 'Hong Kong', country: 'HK', flag: '🇭🇰', tagline: 'East meets West harbour city', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop' },
  ICN: { name: 'Seoul', country: 'Korea', flag: '🇰🇷', tagline: 'K-culture and street food paradise', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&auto=format&fit=crop' },
  SEL: { name: 'Seoul', country: 'Korea', flag: '🇰🇷', tagline: 'K-culture and street food paradise', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&auto=format&fit=crop' },
  TPE: { name: 'Taipei', country: 'Taiwan', flag: '🇹🇼', tagline: 'Night markets and mountain getaways', image: 'https://images.unsplash.com/photo-1541243440-2e0abf7e0de4?w=600&auto=format&fit=crop' },
  DPS: { name: 'Bali', country: 'Indonesia', flag: '🇮🇩', tagline: 'Island of Gods and surf', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&auto=format&fit=crop' },
  SYD: { name: 'Sydney', country: 'Australia', flag: '🇦🇺', tagline: 'Harbour city and beach life', image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&auto=format&fit=crop' },
  AMS: { name: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱', tagline: 'Canals, tulips and freedom', image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5702?w=600&auto=format&fit=crop' },
  BCN: { name: 'Barcelona', country: 'Spain', flag: '🇪🇸', tagline: 'Gaudí\'s city by the sea', image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&auto=format&fit=crop' },
};

const DEST_META_FALLBACK = { name: 'Unknown', country: '', flag: '✈️', tagline: 'A world waiting to be explored', image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&auto=format&fit=crop' };

interface DestinationCardProps {
  flight: SearchItem;
  isSaved: boolean;
  onPress: () => void;
  onImportToTrip: (e: React.MouseEvent) => void;
  onToggleSave: (e: React.MouseEvent) => void;
}

function DestinationCard({ flight, isSaved, onPress, onImportToTrip, onToggleSave }: DestinationCardProps) {
  const providerName = flight.details?.airline || flight.provider;
  const rawDep = (flight.details?.depCode || '').toUpperCase().substring(0, 3);
  const rawArr = (flight.details?.arrCode || '').toUpperCase().substring(0, 3);
  const meta = DEST_META[rawArr] ?? DEST_META_FALLBACK;
  const title = meta.name !== 'Unknown' ? meta.name : (flight.title || rawArr || 'Destination');
  const routeLabel = [rawDep || 'TPE', rawArr || 'TYO'].filter(Boolean).join(' → ');
  const stopLabel = flight.details?.stops === 0 ? '直飛' : `${flight.details?.stops ?? 1} 轉`;

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
              <span className="mb-2 inline-flex items-center rounded-full bg-white/72 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm sm:text-[10px]">
                {meta.country} {meta.flag}
              </span>
              <h3 className="text-[28px] font-black leading-none tracking-[-0.04em] text-slate-950 sm:text-[33px]">{title}</h3>
              <p className="mt-1.5 text-[13px] font-medium leading-[1.42] text-slate-600 line-clamp-2 sm:mt-2 sm:text-[14px]">{meta.tagline}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSave(e); }}
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/65 backdrop-blur-md transition-all active:scale-90 shadow-sm sm:h-11 sm:w-11 ${isSaved ? 'bg-pink-500 text-white' : 'bg-white/85 text-slate-500 hover:bg-white hover:text-pink-500'}`}
            >
              <Heart size={15} fill={isSaved ? 'currentColor' : 'transparent'} strokeWidth={2} />
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/72 px-2.5 py-1.5 text-[10px] font-black text-slate-700 shadow-sm sm:gap-2 sm:px-3 sm:py-2 sm:text-[11px]">
              <AirlineLogo providerName={providerName} className="h-5 w-5 rounded-full text-[9px]" />
              <span className="truncate max-w-[130px]">{providerName}</span>
            </span>
            <span className="inline-flex items-center rounded-full bg-white/72 px-2.5 py-1.5 text-[10px] font-black text-slate-700 shadow-sm sm:px-3 sm:py-2 sm:text-[11px]">
              {flight.details?.departure || '--:--'} → {flight.details?.arrival || '--:--'}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1.5 text-[10px] font-black shadow-sm sm:px-3 sm:py-2 sm:text-[11px] ${flight.details?.stops === 0 ? 'bg-emerald-50/95 text-emerald-600' : 'bg-white/72 text-slate-700'}`}>
              {flight.details?.duration || '3h 15m'} · {stopLabel}
            </span>
          </div>

          <div className="mt-[18px] flex items-end justify-between gap-3 sm:mt-5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">From</p>
              <p className="mt-1 text-[21px] font-black leading-none tracking-[-0.035em] text-slate-950 sm:text-[23px]">
                {flight.currency} {flight.price.toLocaleString()}
              </p>
              <p className="mt-1 truncate text-[10px] font-bold text-slate-500 sm:text-[11px]">{routeLabel}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onImportToTrip(e); }}
                className="flex h-10 items-center gap-1.5 rounded-full bg-slate-900/92 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white transition-all active:scale-95 hover:bg-slate-800 sm:h-auto sm:px-3.5 sm:py-2.5 sm:text-[11px] sm:tracking-[0.16em]"
              >
                <PlaneTakeoff size={12} strokeWidth={2.5} />
                帶入
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onPress(); }}
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
    id: 'jp',
    name: '日本',
    flag: '🇯🇵',
    image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&auto=format&fit=crop',
    description: '東亞島國，以獨特文化、精緻料理與多彩自然景觀聞名。從千年古剎到繁華都會，橫跨北海道到九州八大地域，每個角落都值得深度探索。',
    tags: ['文化', '美食', '自然'],
    highlights: ['🗾 八大地域', '🌸 賞花勝地', '🍜 料理天堂', '🚅 JR 周遊券'],
    guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/',
  },
  {
    id: 'np',
    name: '尼泊爾',
    flag: '🇳🇵',
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&auto=format&fit=crop',
    description: '喜馬拉雅山脈的故鄉，擁有世界最高峰聖母峰。融合豐富宗教文化與壯麗高山景觀，是登山健行與靈性旅行的聖地。',
    tags: ['登山', '文化', '冒險'],
    highlights: ['🏔️ 世界屋脊', '🕌 加德滿都', '🥾 健行天堂', '🌿 自然生態'],
    guideUrl: 'https://travel-guide-tw.github.io/%E5%B0%BC%E6%B3%8A%E7%88%BE/',
  },
  {
    id: 'no',
    name: '挪威',
    flag: '🇳🇴',
    image: 'https://images.unsplash.com/photo-1531365737338-5a6d5e3abe3a?w=600&auto=format&fit=crop',
    description: '北歐峽灣之國，壯闊的極光與冰川雕刻的峽灣地貌令人嘆為觀止。特羅姆瑟是追尋極光的最佳基地，峽灣巡遊更是一生必訪體驗。',
    tags: ['極光', '峽灣', '自然'],
    highlights: ['🌌 北極光', '🏔️ 峽灣奇景', '❄️ 特羅姆瑟', '🦌 馴鹿體驗'],
    guideUrl: 'https://travel-guide-tw.github.io/%E6%8C%AA%E5%A8%81/',
  },
  {
    id: 'ch',
    name: '瑞士',
    flag: '🇨🇭',
    image: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=600&auto=format&fit=crop',
    description: '歐洲心臟，由 26 個州組成。阿爾卑斯山脈、瑞士高原與侏羅山構成壯麗地貌，精緻鐘錶工藝與多語言文化造就獨特魅力。',
    tags: ['阿爾卑斯', '精品', '自然'],
    highlights: ['🏔️ 阿爾卑斯山', '🕰️ 鐘錶工藝', '🧀 起司美食', '🚂 登山列車'],
    guideUrl: 'https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/',
  },
];

export default function HomeTab({ onRequireLogin, isLoggedIn }: { onRequireLogin?: () => void; isLoggedIn?: boolean }) {
  const { searchForm, updateField, results, setResults, loading, setLoading, searchError, setSearchError, savedItems, toggleSave, trackedPrices, toggleTrack } =
    useSearchStore();
  const { openRedirectModal, isOffline, showToast, setActiveTab, activeTripId } = useAppStore();

  const [dateError, setDateError] = useState<string | null>(null);
  const [showDeparturePicker, setShowDeparturePicker] = useState<boolean>(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const [flyingCard, setFlyingCard] = useState<{ id: number; startX: number; startY: number; width: number; height: number; handbook?: any } | null>(null);
  const [activeGuide, setActiveGuide] = useState<CountryGuide | null>(null);
  const [activeHandbook, setActiveHandbook] = useState<typeof EXPERT_HANDBOOKS[0] | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleCopyExpertItinerary = (e: React.MouseEvent | undefined, handbook: typeof EXPERT_HANDBOOKS[0]) => {
    e?.stopPropagation?.();
    
    if (!isLoggedIn) {
      if (onRequireLogin) {
        onRequireLogin();
      } else {
        showToast('請先登入後再進行此操作', 'warning');
      }
      return;
    }

    // Get card position for animation start
    const cardElement = e?.currentTarget ? (e.currentTarget as HTMLElement).closest('.group\\/handbook') : null;
    const rect = cardElement ? cardElement.getBoundingClientRect() : e?.currentTarget ? (e.currentTarget as HTMLElement).getBoundingClientRect() : { left: window.innerWidth / 2 - 140, top: window.innerHeight / 2 - 80, width: 280, height: 160 };
    setFlyingCard({
      id: Date.now(),
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      width: rect.width || 320,
      height: rect.height || 380,
      handbook
    });

    // Reset animation after it finishes
    setTimeout(async () => {
      setFlyingCard(null);
      
      try {
        const { useItineraryStore } = await import('../store/useItineraryStore');
        const { useAppStore } = await import('../store/useAppStore');
        const { syncItinerary, createTrip } = await import('../lib/workflowApi');
        const { setNodes, addNode } = useItineraryStore.getState();
        const { activeTripId, setActiveTripId, setActiveTab } = useAppStore.getState();
        
        let TRIP_ID = activeTripId;

        // If no active trip, create a new one first
        if (!TRIP_ID) {
          const newTrip = await createTrip({ 
            name: handbook.title, 
            destination: handbook.tags[0] || '指定地點'
          });
          const newTripId = String(newTrip.id);
          TRIP_ID = newTripId;
          setActiveTripId(newTripId);
        }

        if (!TRIP_ID) {
          throw new Error('trip id missing after clone bootstrap');
        }

        const ensuredTripId = TRIP_ID;

        if (handbook.nodes && handbook.nodes.length) {
          setNodes([]);
          const syncedNodes: any[] = [];
          for (const rawNode of handbook.nodes) {
             const normalized = { ...rawNode, source: 'local' } as any;
             addNode(normalized);
             const payload = { trip_id: ensuredTripId, action: 'add_node', payload: normalized } as any;
             try {
               await syncItinerary(payload);
               syncedNodes.push(normalized);
             } catch {
               setNodes(syncedNodes);
               throw new Error('clone sync failed');
             }
          }
        }

        showToast(`已成功將 ${handbook.title} 複製到您的手帳！`, 'success');
        setActiveTab('itinerary');
      } catch (err) {
        showToast('複製行程失敗', 'warning');
      }
    }, 1200); // 1.2s to match animation duration
  };

  const [communityTrips, setCommunityTrips] = useState<any[]>([]);
  const [viewType, setViewType] = useState<'grid' | 'table'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'flight' | 'ticket' | 'other'>('all');

  const filteredResults = useMemo(() => {
    if (filterType === 'all') return results;
    return results.filter(r => r.type === filterType);
  }, [results, filterType]);

  const demoTemplates = useMemo(() => EXPERT_HANDBOOKS.slice(0, 3), []);

  const resolveCurrentTripId = () =>
    activeTripId ||
    (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('trip_id') : '');

  useEffect(() => {
    // Initial fetch for recommendations and handbooks
    const loadInitialData = async () => {
      try {
        const seedDate = new Date();
        seedDate.setDate(seedDate.getDate() + 30);
        const seedDateStr = seedDate.toISOString().slice(0, 10);

        const [handbooks, recommendations] = await Promise.all([
          fetchHandbooks(),
          searchOffers({ from: searchForm.from || 'TPE', to: searchForm.to || 'TYO', date: seedDateStr }).catch(() => [])
        ]);
        setCommunityTrips(handbooks);
        if (results.length === 0) setResults(recommendations);
      } catch (e) {
        console.error('Failed to load initial data', e);
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
    const cardElement = (e.currentTarget as HTMLElement).closest('.group\\/trip') || (e.currentTarget as HTMLElement);
    const rect = cardElement.getBoundingClientRect();
    setFlyingCard({
      id: Date.now(),
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      width: rect.width || 320,
      height: rect.height || 200,
      handbook: trip
    });

    try {
      const { getStoredToken } = await import('../lib/workflowApi');
      const token = getStoredToken();
      const res = await fetch(`/api/trips/${trip.id}/clone`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      showToast(`已成功將行程 ${trip.name ?? trip.title ?? ''} 複製到您的手帳！`, 'success');
      
      // Navigate to the newly cloned trip
      setTimeout(() => {
        useAppStore.getState().setActiveTripId(data.data.new_trip_id);
        setActiveTab('itinerary');
      }, 800);
    } catch {
      showToast('複製失敗', 'warning');
    }
  };


  const applyGuideDestination = (destination: TravelGuideDestination, field: 'from' | 'to') => {
    // 根據選好的地方 顯示中文
    updateField(field, destination.place);
    if (field === 'from') setShowDeparturePicker(false);
    if (field === 'to') setShowDestinationPicker(false);
  };

  const selectDate = (dateStr: string) => {
    updateField('date', dateStr);
    setShowDatePicker(false);
    if (dateError) setDateError(null);
  };

  const isSearchDisabled = useMemo(
    () => !searchForm.from.trim() || !searchForm.to.trim() || !searchForm.date.trim(),
    [searchForm],
  );

  const searchBlockReason = useMemo(() => {
    if (isOffline) return '目前離線中，恢復連線後才能查詢即時票價。';
    if (!searchForm.from.trim()) return '先填寫出發地。';
    if (!searchForm.to.trim()) return '再補上目的地。';
    if (!searchForm.date.trim()) return '最後選擇去程日期。';
    return null;
  }, [isOffline, searchForm.date, searchForm.from, searchForm.to]);

  const handleSearch = async () => {
    if (!DATE_REGEX.test(searchForm.date.trim())) {
      setDateError('日期格式需為 YYYY-MM-DD，例如 2025-08-01');
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
        setSearchError('timeout');
      } else if (error instanceof SearchServiceUnavailableError) {
        setSearchError('service');
      } else {
        setSearchError('service');
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toHHMM = (s: string | undefined) => s?.match(/\d{1,2}:\d{2}/)?.[0] ?? '09:00';

  const handleImportFlight = async (flight: SearchItem) => {
    if (!isLoggedIn && onRequireLogin) {
      onRequireLogin();
      return;
    }

    const tripId = resolveCurrentTripId();
    if (!tripId) {
      showToast('請先開啟一趟旅程，再把航班帶入手帳。', 'warning');
      return;
    }

    try {
      const depCode = searchForm.from?.trim() || flight.details?.depCode || 'TPE';
      const arrCode = searchForm.to?.trim() || flight.details?.arrCode || 'NRT';
      const factDate = searchForm.date?.trim() || new Date().toISOString().slice(0, 10);
      const newFact = await createTripFact(tripId, {
        factType: 'flight_outbound',
        source: 'imported_search',
        title: `${flight.details?.airline || flight.provider} ${depCode} → ${arrCode}`,
        startAt: `${factDate}T${toHHMM(flight.details?.departure)}:00.000Z`,
        endAt: `${factDate}T${toHHMM(flight.details?.arrival) || '13:00'}:00.000Z`,
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
        action: 'add_node',
        payload: {
           node_id: `node_flight_${Date.now()}`,
           day: 1,
           date: factDate,
           time: toHHMM(flight.details?.departure),
           title: `${flight.details?.airline || flight.provider} 航班`,
           emoji: '✈️',
           category: 'flight',
           description: `航班代號: ${flight.details?.flightNumber || '未知'}\n預定金額: ${flight.currency} ${flight.price}\n來源: ${flight.provider}`,
           linkedFactId: newFact?.id,
           source: 'remote'
        },
      };
      // Update local store immediately so the node appears in the UI
      useItineraryStore.getState().addNode(payload.payload);
      
      try {
        await syncItinerary(payload);
      } catch {
        useItineraryStore.getState().removeNode(payload.payload.node_id);
        throw new Error('flight import sync failed');
      }

      showToast(`已把 ${flight.provider} 航班帶入旅程錨點。`, 'success');
      setTimeout(() => {
        useAppStore.getState().setActiveTab('itinerary');
      }, 500);
    } catch {
      showToast('帶入旅程失敗，請稍後再試。', 'warning');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative flex flex-col flex-1 w-full min-h-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* === HERO SECTION with gradient background === */}
      <div className="relative z-10 w-full pt-14 sm:pt-[72px] pb-12 sm:pb-14 px-4 sm:px-6 overflow-visible">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-200/90 via-pink-100 to-sky-200/80 pointer-events-none" />
        <div className="absolute -top-10 right-10 w-72 h-72 bg-rose-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-0 w-72 h-72 bg-sky-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-20 max-w-[980px] mx-auto w-full">
          {/* Hero title */}
          <div className="text-center mb-5 sm:mb-6">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-2.5">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight">AI 智慧行程規劃</h1>
              <span className="px-2.5 py-1 rounded-full bg-white/60 border border-pink-200 text-pink-600 text-[10px] sm:text-[11px] font-black uppercase tracking-wider backdrop-blur-sm">BETA</span>
            </div>
            <p className="text-slate-600/90 text-sm sm:text-base">輸入目的地，秒速生成專屬客製化旅航計畫</p>
          </div>

          {/* === SEARCH FORM === */}
          <div className={`relative z-20 transition-opacity duration-300 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
            {/* Mobile layout: vertical stacked fields */}
            <div className="relative z-20 md:hidden rounded-[34px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.32))] p-5 shadow-[0_18px_44px_rgba(156,63,89,0.10)] backdrop-blur-[24px]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search-from-m" className="px-1 text-[11px] font-black tracking-[0.18em] text-slate-500/80 uppercase cursor-text">出發從哪裡</Label>
                  <div
                    className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-[rgba(255,255,255,0.52)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_22px_rgba(255,255,255,0.20)] backdrop-blur-[18px]"
                    onClick={() => { setShowDeparturePicker(true); setShowDestinationPicker(false); setShowDatePicker(false); }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-[rgba(255,255,255,0.52)] shadow-sm backdrop-blur-md">
                      <PlaneTakeoff size={17} className="text-[#b35f76]" />
                    </div>
                    <input
                      id="search-from-m"
                      className="bg-transparent border-none p-0 text-[18px] font-black text-slate-900 placeholder:text-slate-500/60 w-full outline-none leading-none"
                      value={searchForm.from}
                      onFocus={() => { setShowDeparturePicker(true); setShowDestinationPicker(false); setShowDatePicker(false); }}
                      onChange={(e) => updateField('from', e.target.value)}
                      placeholder="台北 TPE"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-to-m" className="px-1 text-[11px] font-black tracking-[0.18em] text-slate-500/80 uppercase cursor-text">飛往目的地</Label>
                  <div
                    className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-[rgba(255,255,255,0.52)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_22px_rgba(255,255,255,0.20)] backdrop-blur-[18px]"
                    onClick={() => { setShowDestinationPicker(true); setShowDeparturePicker(false); setShowDatePicker(false); }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-[rgba(255,255,255,0.52)] shadow-sm backdrop-blur-md">
                      <Globe size={17} className="text-[#2c6956]" />
                    </div>
                    <input
                      id="search-to-m"
                      className="bg-transparent border-none p-0 text-[18px] font-black text-slate-900 placeholder:text-slate-500/60 w-full outline-none leading-none"
                      value={searchForm.to}
                      onFocus={() => { setShowDestinationPicker(true); setShowDeparturePicker(false); setShowDatePicker(false); }}
                      onChange={(e) => updateField('to', e.target.value)}
                      placeholder="東京 NRT"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="px-1 text-[11px] font-black tracking-[0.18em] text-slate-500/80 uppercase">去程日期</span>
                  <div
                    className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-[rgba(255,255,255,0.52)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_22px_rgba(255,255,255,0.20)] backdrop-blur-[18px]"
                    onClick={() => { setShowDatePicker(!showDatePicker); setShowDeparturePicker(false); setShowDestinationPicker(false); }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-[rgba(255,255,255,0.52)] shadow-sm backdrop-blur-md">
                      <Calendar size={17} className={showDatePicker ? 'text-[#2c6956]' : 'text-[#3a637c]'} />
                    </div>
                    <span className={`text-[18px] font-black leading-none ${!searchForm.date ? 'text-slate-500/60' : 'text-slate-900'}`}>
                      {searchForm.date || '選擇日期'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between gap-4">
                <span className="flex-1 text-[12px] font-bold text-slate-500/85 leading-relaxed">
                  {dateError || searchBlockReason || ''}
                </span>
                <button
                  onClick={() => void handleSearch()}
                  disabled={isSearchDisabled || loading || isOffline}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border transition-all active:scale-95 ${
                    isSearchDisabled || loading || isOffline
                      ? 'border-white/70 bg-white/55 text-slate-300 cursor-not-allowed'
                      : 'border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,240,244,0.72))] text-slate-900 shadow-[0_12px_24px_rgba(156,63,89,0.14)] hover:-translate-y-0.5'
                  }`}
                >
                  {loading ? <div className="w-4 h-4 border-2 border-slate-300/40 border-t-slate-800 rounded-full animate-spin" /> : <SearchIcon size={18} strokeWidth={3} />}
                </button>
              </div>
            </div>

            {/* Desktop layout: horizontal pill */}
            <div className="relative z-20 hidden md:flex items-center justify-center gap-[14px] pt-2">
              <div className="flex-1 max-w-[648px] rounded-full border border-white/85 bg-[rgba(255,255,255,0.42)] px-[9px] py-[9px] shadow-[0_16px_44px_rgba(255,255,255,0.22),0_18px_36px_rgba(156,63,89,0.08)] backdrop-blur-[20px]">
                <div className="flex items-stretch rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08))]">
                  <div
                    className="relative flex-1 flex items-center gap-2.5 px-5 py-[13px] rounded-full transition-colors cursor-text hover:bg-white/28"
                    onClick={() => { setShowDeparturePicker(true); setShowDestinationPicker(false); setShowDatePicker(false); }}
                  >
                    <PlaneTakeoff size={17} className="text-[#b35f76] shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <Label htmlFor="search-from-d" className="text-[8px] font-black tracking-[0.18em] text-slate-500/80 uppercase mb-0.5 cursor-text">出發從哪裡</Label>
                      <input
                        id="search-from-d"
                        className="bg-transparent border-none p-0 text-[14px] font-black text-slate-900 placeholder:text-slate-500/65 w-full outline-none leading-none"
                        value={searchForm.from}
                        onFocus={() => { setShowDeparturePicker(true); setShowDestinationPicker(false); setShowDatePicker(false); }}
                        onChange={(e) => updateField('from', e.target.value)}
                        placeholder="台北 TPE"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="w-px bg-white/55 self-stretch my-3" />
                  <div
                    className="relative flex-1 flex items-center gap-2.5 px-5 py-[13px] transition-colors cursor-text hover:bg-white/28"
                    onClick={() => { setShowDestinationPicker(true); setShowDeparturePicker(false); setShowDatePicker(false); }}
                  >
                    <Globe size={17} className="text-[#2c6956] shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <Label htmlFor="search-to-d" className="text-[8px] font-black tracking-[0.18em] text-slate-500/80 uppercase mb-0.5 cursor-text">飛往目的地</Label>
                      <input
                        id="search-to-d"
                        className="bg-transparent border-none p-0 text-[14px] font-black text-slate-900 placeholder:text-slate-500/65 w-full outline-none leading-none"
                        value={searchForm.to}
                        onFocus={() => { setShowDestinationPicker(true); setShowDeparturePicker(false); setShowDatePicker(false); }}
                        onChange={(e) => updateField('to', e.target.value)}
                        placeholder="東京 NRT"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="w-px bg-white/55 self-stretch my-3" />
                  <div
                    className={`flex items-center gap-2.5 px-5 py-[13px] cursor-pointer transition-colors rounded-full ${showDatePicker ? 'bg-white/36' : 'hover:bg-white/28'}`}
                    onClick={() => { setShowDatePicker(!showDatePicker); setShowDeparturePicker(false); setShowDestinationPicker(false); }}
                  >
                    <Calendar size={17} className={showDatePicker ? 'text-[#2c6956]' : 'text-[#3a637c]'} />
                    <div className="flex flex-col min-w-0 w-[144px]">
                      <span className="text-[8px] font-black tracking-[0.18em] text-slate-500/80 uppercase mb-0.5">去程日期</span>
                      <span className={`text-[14px] font-black truncate leading-none ${!searchForm.date ? 'text-slate-500/65' : 'text-slate-900'}`}>
                        {searchForm.date || '選擇日期'}
                      </span>
                    </div>
                  </div>
                </div>
                {(dateError || (!dateError && searchBlockReason)) && (
                  <div className="text-[11px] text-slate-500 font-bold px-6 pt-2 pb-1.5">{dateError || searchBlockReason}</div>
                )}
              </div>
              <button
                onClick={() => void handleSearch()}
                disabled={isSearchDisabled || loading || isOffline}
                title={isOffline ? '請連線網路以進行機票比價' : ''}
                className={`w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                  isSearchDisabled || loading || isOffline
                    ? 'bg-white/55 text-slate-300 cursor-not-allowed border border-white/70'
                    : 'bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-[0_16px_30px_rgba(236,72,153,0.28)] hover:shadow-[0_18px_34px_rgba(249,115,22,0.30)] hover:-translate-y-0.5'
                }`}
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <SearchIcon size={20} strokeWidth={3} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* === CONTENT BELOW HERO === */}
      <div className="relative z-0 flex-1 flex flex-col px-4 sm:px-6 bg-gradient-to-b from-white/80 to-slate-50/60">
        {/* Quick External Links */}
        <div className="max-w-3xl mx-auto w-full pt-3 sm:pt-4 pb-1 sm:pb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 mb-3 sm:mb-3.5">旅途中也常用</p>
          <div className="flex flex-row items-center overflow-x-auto hide-scrollbar gap-2.5 snap-x pb-1">
            <a href="https://www.agoda.com/partners/partnersearch.aspx?cid=1762106&hl=zh-tw" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-all group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 snap-start">
              <Bed size={17} className="text-[#B92A8E] group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              <span className="font-bold text-[13px] tracking-wide">找住宿</span>
            </a>
            <a href="https://www.kkday.com/zh-tw?cid=4480" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-all group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 snap-start">
              <Ticket size={15} className="text-[#F18400] group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              <span className="font-bold text-[13px] tracking-wide">門票 & 觀光行程</span>
            </a>
            <a href="https://www.kkday.com/zh-tw/product/productlist?page=1&keyword=%E6%A9%9F%E5%A0%B4%E6%8E%A5%E9%80%81&cid=4480" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-all group bg-white/70 hover:bg-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-sm border border-slate-200/50 shrink-0 snap-start">
              <div className="relative text-[#EC4899] group-hover:scale-110 transition-transform">
                <CarFront size={17} strokeWidth={2.5} />
                <PlaneTakeoff size={9} strokeWidth={3} className="absolute -top-1 -left-1" />
              </div>
              <span className="font-bold text-[13px] tracking-wide">機場接送</span>
            </a>
          </div>
        </div>

        <div className="pt-5 sm:pt-7 pb-16 md:pb-32 flex flex-col flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6 md:mb-7">
            <div className="flex flex-col items-start gap-1.5 md:gap-1">
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                 <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter leading-none flex items-baseline gap-2 sm:gap-3">
                   探索航班與活動
                   {searchForm.date && (
                     <span className="text-lg sm:text-xl text-slate-400 font-bold tracking-tight">
                       {searchForm.date.replace(/-/g, '/')}
                     </span>
                   )}
                 </h2>
                 {filteredResults.length > 0 && (
                   <span className="px-2 py-0.5 bg-slate-900 text-white rounded-[6px] text-[10px] font-black tracking-widest uppercase shadow-sm">
                     {filteredResults.length} 個結果
                   </span>
                 )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Explore Travels</p>
            </div>
            {results.length > 0 && (
              <div className="flex flex-row flex-wrap items-center gap-2 justify-end">
                <div className="flex items-center bg-white/70 backdrop-blur-md p-1 rounded-[10px] shadow-sm border border-slate-200/60 relative overflow-x-auto hide-scrollbar max-w-full">
                  {(['all', 'flight', 'ticket', 'other'] as const).map((type) => (
                    <button 
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`relative px-2.5 py-1.5 rounded-[8px] text-[10px] font-black tracking-widest uppercase transition-colors duration-300 z-10 whitespace-nowrap ${filterType === type ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                    >
                      {filterType === type && (
                        <motion.div
                          layoutId="filterTypeIndicator"
                          className="absolute inset-0 bg-white rounded-[8px] -z-10 shadow-sm border border-slate-200"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      {type === 'all' ? '全部' : type === 'flight' ? '機票' : type === 'ticket' ? '票券' : '其他'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative min-h-[300px]">
            {/* Loading Overlay */}
            <AnimatePresence>
              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col items-center pt-24 bg-white/40 rounded-[24px]"
                >
                  <div className="flex flex-col items-center space-y-4 p-8 bg-white/95 shadow-2xl rounded-3xl border border-slate-200/80">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin shadow-sm" />
                    <div className="text-center">
                      <p className="text-slate-800 font-black text-sm tracking-widest uppercase mb-1">正在即時爬取航班資訊...</p>
                      <p className="text-slate-500 font-medium text-xs tracking-wider">這可能會需要一些時間，請稍候</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List & Content Container */}
            <div className={`transition-opacity duration-300 ${loading ? 'opacity-30 pointer-events-none' : ''}`}>
              {searchError && !loading ? (
                <GlassCard className="bg-[#fff1f2] border-[#fecdd3] flex flex-col">
                  <span className="text-[#be123c] font-bold text-base">果凍精靈迷路了 🥺，請稍後再試試看！</span>
                  <span className="text-[#be123c] mt-2 text-sm">
                    {searchError === 'timeout' ? '目前查詢逾時，已先收起錯誤細節。' : '供應商稍忙，請再試一次。'}
                  </span>
                </GlassCard>
              ) : (
                <AnimatePresence mode="wait">
                  {filteredResults.length > 0 ? (
                    viewType === 'grid' ? (
                      <motion.div 
                        key="grid-view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-3 overflow-x-auto px-1 pr-7 pb-2 snap-x snap-mandatory hide-scrollbar sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pr-0 sm:pb-0 lg:grid-cols-3"
                      >
                        {filteredResults.map((flight, index) => (
                          <motion.div
                            key={flight.id}
                            initial={{ opacity: 0, y: 24, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: index * 0.05, type: 'spring', bounce: 0.35 }}
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
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
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
                            const isCurrentlyTracked = trackedPrices.includes(flight.id);
                            toggleTrack(flight.id);
                            showToast(
                              !isCurrentlyTracked
                                ? `✨ 已開啟 ${flight.provider} 的降價提醒！`
                                : `🔕 已關閉降價提醒`
                            );
                          }}
                        />
                      </motion.div>
                    )
                  ) : hasSearched && !loading ? (
                    <motion.div
                      key="no-results"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-20 bg-white/40 backdrop-blur-xl rounded-3xl border border-white mx-2 shadow-sm"
                    >
                      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-5xl mb-6 grayscale opacity-60">
                        🔍
                      </div>
                      <h3 className="text-xl font-black text-slate-800 mb-2">找不到符合條件的航班</h3>
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
                      className="flex flex-col items-center justify-center py-14 sm:py-18 px-6 mx-2 bg-gradient-to-br from-white/70 to-slate-50/60 dark:from-slate-900/80 dark:to-slate-950/80 backdrop-blur-xl rounded-[40px] border border-white/60 dark:border-white/10 shadow-sm relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-fuchsia-100 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-orange-100 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>

                      <div className="relative z-10 w-full max-w-5xl mb-10">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                          <div>
                            <p className="text-[10px] font-black tracking-[0.24em] uppercase text-fuchsia-500">Demo Preview</p>
                            <h4 className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">先看別人排好的旅程，立刻進入狀況</h4>
                          </div>
                          <p className="text-[12px] font-bold text-slate-500 dark:text-slate-300">免登入、免等待，直接預覽完整節奏與景點安排。</p>
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
                              className="group/demo overflow-hidden rounded-[28px] border border-white/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 text-left shadow-lg shadow-slate-200/40 dark:shadow-black/30 transition-all hover:-translate-y-1 hover:shadow-xl"
                            >
                              <div className="relative h-36 overflow-hidden">
                                <img src={handbook.image} alt={handbook.title} className="h-full w-full object-cover transition-transform duration-700 group-hover/demo:scale-105" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                                <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-slate-950/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                                  Instant Demo
                                </div>
                                <div className="absolute bottom-3 left-3 right-3 text-white">
                                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75">{handbook.days} Days</div>
                                  <div className="mt-1 text-lg font-black leading-tight">{handbook.title}</div>
                                </div>
                              </div>
                              <div className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  {handbook.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="rounded-full bg-slate-100 dark:bg-white/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-200">
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
                           <PlaneTakeoff className="text-slate-900" size={32} strokeWidth={2.5} />
                         </div>
                         <div className="absolute -inset-4 border-2 border-dashed border-slate-200 rounded-full animate-[spin_15s_linear_infinite] opacity-50"></div>
                      </div>
                      
                       <h3 className="text-2xl sm:text-[32px] font-black text-slate-900 dark:text-white mb-4 tracking-tight text-center leading-tight">
                        輸入出發地、目的地與日期，找出最聰明的飛航選擇。
                      </h3>
                      
                      <div className="flex flex-wrap gap-2 justify-center mb-4">
                         {['東京 NRT', '大阪 KIX', '倫敦 LHR', '紐約 JFK'].map((city, idx) => (
                           <button 
                             key={city}
                             onClick={() => {
                               updateField('to', city);
                               setShowDestinationPicker(false);
                             }}
                             className="px-4 py-2 bg-white hover:bg-slate-900 hover:text-white text-slate-600 rounded-full text-xs font-black tracking-widest border border-slate-200 hover:border-slate-900 transition-all shadow-sm duration-300"
                           >
                             {city}
                           </button>
                         ))}
                      </div>
                    </motion.div>
                  ) : loading ? (
                    <motion.div key="skeleton" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {[0, 1, 2, 3, 4, 5].map((i) => <FlightSkeletonCard key={i} />)}
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
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">公開模板大廳</h2>
                </div>
                <span className="text-[10px] font-black tracking-[0.15em] uppercase text-slate-400">fork-and-remix</span>
              </div>

              <div className="w-full overflow-x-auto pb-6 -mx-6 px-6 scrollbar-hide">
                <div className="flex gap-6 min-w-max">
                  {communityTrips.map((trip) => (
                    <motion.div
                      key={trip.id}
                      whileHover={{ y: -6 }}
                      className="w-[280px] sm:w-[320px] group/trip"
                    >
                      <GlassCard className="!p-0 overflow-hidden h-full rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all flex flex-col">
                        <div className="relative h-44 overflow-hidden flex-shrink-0">
                          <img
                            src={trip.cover}
                            alt={trip.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover/trip:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] font-black tracking-widest uppercase text-white">
                            Public Template
                          </div>
                          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-white text-[10px] font-black uppercase tracking-[0.15em] opacity-80">by {trip.author || 'Anonymous'}</p>
                              <h3 className="text-white font-black text-xl leading-tight drop-shadow-md line-clamp-2">{trip.title}</h3>
                            </div>
                          </div>
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex items-center gap-2 mb-5 flex-wrap">
                            {trip.destination && (
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl">
                                #{trip.destination}
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-xl">
                              已被複製 {trip.forkCount ?? trip.likes ?? 0} 次
                            </span>
                          </div>

                          <button
                            onClick={(event) => handleCloneTrip(event, trip)}
                            className="mt-auto w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-sky-600 active:scale-95 group/btn"
                          >
                            <Copy size={14} className="transition-transform group-hover/btn:rotate-12" />
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
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">精選目的地指南</h2>
              </div>
              <span className="text-[10px] font-black tracking-[0.15em] uppercase text-slate-400 hidden sm:block">travel-guide-tw</span>
            </div>

            <div className="w-full overflow-x-auto pb-6 -mx-6 px-6 scrollbar-hide">
              <div className="flex gap-6 min-w-max">
                {FEATURED_DESTINATIONS.map((dest) => (
                  <motion.div
                    key={dest.id}
                    whileHover={{ y: -6 }}
                    className="w-[260px] sm:w-[300px] group/dest"
                  >
                    <GlassCard className="!p-0 overflow-hidden h-full rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all flex flex-col">
                      {/* Cover Image */}
                      <div className="relative h-44 overflow-hidden flex-shrink-0">
                        <img
                          src={dest.image}
                          alt={dest.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/dest:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-2">
                          <span className="text-3xl drop-shadow-lg">{dest.flag}</span>
                          <h3 className="text-white font-black text-xl leading-tight drop-shadow-md">{dest.name}</h3>
                        </div>
                        {/* Tag pills on top-right */}
                        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                          {dest.tags.map((tag) => (
                            <span key={tag} className="text-[10px] font-black text-white bg-white/20 backdrop-blur-md border border-white/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 flex flex-col flex-1">
                        <p className="text-[13px] text-slate-600 font-medium mb-4 leading-relaxed line-clamp-3">
                          {dest.description}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {dest.highlights.map((h) => (
                            <span key={h} className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl">
                              {h}
                            </span>
                          ))}
                        </div>

                        <button
                          className="mt-auto w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-emerald-600 active:scale-95 group/btn"
                          onClick={(e) => { e.stopPropagation(); const g = getCountryGuide(dest.id); if (g) setActiveGuide(g); }}
                        >
                          <ExternalLink size={13} className="transition-transform group-hover/btn:translate-x-0.5" />
                          查看完整攻略
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Expert Handbooks Section */}
          <div className="mt-8 md:mt-14 mb-6 md:mb-8 px-2">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-fuchsia-500" size={24} />
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">熱門達人手帳</h2>
            </div>
            
            <div className="w-full overflow-x-auto pb-6 -mx-6 px-6 scrollbar-hide">
              <div className="flex gap-6 min-w-max">
                {EXPERT_HANDBOOKS.map((handbook) => (
                  <motion.div
                    key={handbook.id}
                    whileHover={{ y: -5 }}
                    className="w-[280px] sm:w-[320px] group/handbook"
                  >
                    <GlassCard onClick={() => setActiveHandbook(handbook)} className="!p-0 overflow-hidden h-full rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all cursor-pointer">
                      <div className="relative h-44 overflow-hidden">
                        <img
                          src={handbook.image}
                          alt={handbook.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/handbook:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex items-center gap-2">
                            <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-wider border border-white/30">
                              {handbook.days} Days
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <h3 className="text-xl font-black text-slate-800 mb-1 leading-tight">{handbook.title}</h3>
                        <p className="text-sm font-bold text-slate-400 mb-4">{handbook.author}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-6">
                          {handbook.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        
                        <button
                          onClick={(e) => handleCopyExpertItinerary(e, handbook)}
                          className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-slate-800 active:scale-95 group/btn"
                        >
                          <Copy size={14} className="transition-transform group-hover/btn:rotate-12" />
                          複製行程
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeGuide && (
        <CountryGuideModal open={!!activeGuide} guide={activeGuide} onClose={() => setActiveGuide(null)} />
      )}

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
          onSelect={(dest) => applyGuideDestination(dest, 'from')}
        />
      )}

      {showDestinationPicker && (
        <LocationPickerPopup 
          title="熱門目的地"
          query={searchForm.to}
          onClose={() => setShowDestinationPicker(false)}
          onSelect={(dest) => applyGuideDestination(dest, 'to')}
        />
      )}

      {showDatePicker && (
        <DatePickerPopup 
          selectedDate={searchForm.date}
          onSelect={selectDate}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* Animation Overlay for Flying Card */}
      <AnimatePresence>
        {flyingCard && (
          <motion.div
            key={flyingCard.id}
            initial={{ 
              position: 'fixed',
              top: flyingCard.startY,
              left: flyingCard.startX,
              width: flyingCard.width,
              height: flyingCard.height,
              opacity: 1,
              scale: 1,
              zIndex: 9999,
              borderRadius: '24px',
              backgroundColor: 'white',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              x: '-50%',
              y: '-50%'
            }}
            animate={{ 
              top: [flyingCard.startY, flyingCard.startY - 100, window.innerHeight - 40],
              left: [flyingCard.startX, flyingCard.startX + (window.innerWidth / 2 - flyingCard.startX) * 0.5, window.innerWidth / 2],
              width: [flyingCard.width, 160, 20],
              height: [flyingCard.height, 100, 20],
              scale: [1, 1.05, 0.1],
              opacity: [1, 1, 0],
              rotate: [0, -10, -360]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
              times: [0, 0.4, 1]
            }}
          >
            {flyingCard.handbook ? (
              <div className="w-full h-full flex flex-col pointer-events-none">
                <img 
                  src={flyingCard.handbook.image || flyingCard.handbook.coverImage} 
                  alt="" 
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
    </motion.div>
  );
}
