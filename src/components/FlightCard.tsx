import React from "react";
import { Heart, PlaneTakeoff, BellRing, Bell } from "lucide-react";
import type { SearchItem } from "../types/workflow";
import { pressableSurfaceClass, raisedHoverClass, subtlePressableClass } from "../lib/motionTokens";
import GlassCard from "./GlassCard";
import AirlineLogo from "./AirlineLogo";
import { useTranslation } from "react-i18next";

export interface FlightCardProps {
  flight: SearchItem;
  isSaved: boolean;
  isTracked: boolean;
  onPress: () => void;
  onImportToTrip: (e: React.MouseEvent) => void;
  onToggleSave: (e: React.MouseEvent) => void;
  onToggleTrack: (e: React.MouseEvent) => void;
}

/** Boarding-pass style flight result card with save / track / import / buy actions. */
export default function FlightCard({
  flight,
  isSaved,
  isTracked,
  onPress,
  onImportToTrip,
  onToggleSave,
  onToggleTrack,
}: FlightCardProps) {
    const { t } = useTranslation();
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
        <div className="p-3.5 sm:p-5 flex flex-col gap-2.5">
          {/* Header: Airline + stop/duration badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AirlineLogo
                providerName={providerName}
                className="w-11 h-11 rounded-lg text-sm"
              />
              <div className="flex flex-col">
                <span className="text-[13px] font-bold tracking-tight text-slate-900 dark:text-white">
                  {flight.details?.airline || flight.provider}
                </span>
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-[0.25em]">
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
                className={`w-11 h-11 rounded-full flex justify-center items-center ${subtlePressableClass} ${
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
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                {flight.details?.departure}
              </span>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-[0.2em] leading-none">
                Depart
              </span>
            </div>
            <div className="flex flex-col items-end z-10 bg-white/40 dark:bg-transparent backdrop-blur-sm pl-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                {flight.details?.arrival}
              </span>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-[0.2em] leading-none">
                Arrive
              </span>
            </div>
          </div>

          {/* Return leg row — roundtrip bundles */}
          {flight.tripType === "roundtrip" && flight.returnLeg && (
            <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[9px] font-black tracking-[0.2em] uppercase text-sky-500 bg-sky-50 px-1.5 py-[2px] rounded-sm whitespace-nowrap">
                  {t('str_afeed')}</span>
              </div>
              <div className="flex items-center justify-between px-0.5 mt-2">
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-[18px] sm:text-[20px] font-black text-slate-900 dark:text-white tracking-tighter leading-none whitespace-nowrap mb-1">
                    {flight.returnLeg.departure}
                  </span>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-[0.2em] leading-none whitespace-nowrap">
                    Depart
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center px-4 relative">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center">
                    <div className="flex-1 border-t border-dashed border-slate-300" />
                  </div>
                  <PlaneTakeoff size={10} className="text-slate-400 z-10 rotate-90" />
                </div>
                <div className="flex flex-col items-end min-w-0">
                  <span className="text-[18px] sm:text-[20px] font-black text-slate-900 dark:text-white tracking-tighter leading-none whitespace-nowrap mb-1">
                    {flight.returnLeg.arrival}
                  </span>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-[0.2em] leading-none whitespace-nowrap">
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
        <div className="p-3.5 pt-1.5 sm:p-5 sm:pt-3 flex items-end justify-between mt-auto">
          <div className="flex flex-col text-left mb-1">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] mb-1">
              Estimated Price
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[14px] font-bold text-slate-500 dark:text-slate-400">
                {flight.currency}
              </span>
              <span className="text-[26px] sm:text-[30px] font-black text-slate-900 dark:text-white tracking-tighter leading-none tabular-nums">
                {flight.price.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleTrack(e);
              }}
              aria-label={isTracked ? "取消追蹤降價" : "追蹤降價"}
              className={`w-[46px] h-[46px] sm:w-[50px] sm:h-[50px] rounded-[14px] flex items-center justify-center border ${subtlePressableClass} ${raisedHoverClass} ${
                isTracked
                  ? "bg-slate-900 border-slate-900 text-white shadow-md"
                  : "bg-white border-slate-200 text-slate-500 dark:text-slate-300 hover:border-slate-300 hover:text-slate-800 shadow-sm hover:shadow"
              }`}
            >
              {isTracked ? (
                <BellRing size={16} strokeWidth={2.5} />
              ) : (
                <Bell size={16} strokeWidth={2.5} />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImportToTrip(e);
              }}
              aria-label={t('str_2c15f56e')}
              className={`h-[46px] sm:h-[50px] px-5 sm:px-6 rounded-[14px] flex items-center gap-1.5 border border-transparent bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg ${subtlePressableClass} ${raisedHoverClass}`}
            >
              <PlaneTakeoff size={15} strokeWidth={2.5} />
              <span className="text-[12px] sm:text-[13px] font-black uppercase tracking-widest hidden sm:inline">
                {t('str_bb9ef')}</span>
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
                {t('str_119f3b')}</span>
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
