import React from "react";
import { Heart } from "lucide-react";
import type { SearchItem } from "../types/workflow";
import AirlineLogo from "./AirlineLogo";

export default function FlightTable({
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
            className="group relative bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden cursor-pointer shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12)] hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-300"
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
                    className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors border ${
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
