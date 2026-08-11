import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import type { ItineraryNode } from "../../types/workflow";
import { haversineKm, estimateTransport, formatMinutes, checkUnrealisticTravelTime } from "../../lib/geoUtils";
import { extractMinutes } from "../../lib/itineraryText";
import { fetchDirections } from "../../lib/workflowApi";

export default function TransportGapIndicator({
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

  const unrealisticCheck = checkUnrealisticTravelTime(item, nextItem, timeGapMinutes);

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
  const hasWarning = hasTransitConflict || isTooLong || unrealisticCheck.isUnrealistic;
  const showBadge = timeGapStr || displayTransport || unrealisticCheck.isUnrealistic;

  return showBadge ? (
    <div className="flex justify-start sm:pl-[70px] pl-[50px] lg:pl-[80px] my-2 relative z-0">
      <div className="w-[3px] min-h-[2rem] sm:min-h-[2.5rem] bg-gradient-to-b from-slate-200 to-slate-200" />
      <div className="flex flex-col justify-center ml-4 sm:ml-5 -mt-2 sm:-mt-1 gap-1.5">
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
          {unrealisticCheck.isUnrealistic && (
            <span
              className={`px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest border shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 ${
                unrealisticCheck.severity === 'error'
                  ? "bg-rose-500 text-white border-rose-600 animate-bounce"
                  : "bg-amber-500 text-white border-amber-600"
              }`}
            >
              <AlertTriangle size={13} className="shrink-0" />
              <span>不合理交通警告</span>
            </span>
          )}
          {!unrealisticCheck.isUnrealistic && hasTransitConflict && (
            <span className="px-3.5 py-1.5 bg-amber-50/90 rounded-full text-[11px] sm:text-xs font-black text-amber-600 uppercase tracking-widest border border-amber-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
              <span>⚠️</span>
              行程太緊湊
            </span>
          )}
          {!unrealisticCheck.isUnrealistic && isTooLong && !hasTransitConflict && (
            <span className="px-3.5 py-1.5 bg-rose-50/90 rounded-full text-[11px] sm:text-xs font-black text-rose-500 uppercase tracking-widest border border-rose-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
              <span>🚨</span>
              交通時間過長
            </span>
          )}
        </div>

        {/* Detailed warning message if unrealistic */}
        {unrealisticCheck.isUnrealistic && unrealisticCheck.message && (
          <div className="text-[11px] font-bold text-rose-800 dark:text-rose-200 bg-rose-50/90 dark:bg-rose-900/40 border border-rose-200/80 dark:border-rose-800/60 p-2.5 rounded-2xl flex items-start gap-2 shadow-xs max-w-md">
            <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <span>{unrealisticCheck.message}</span>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="flex justify-start sm:pl-[70px] pl-[50px] lg:pl-[80px] my-1 relative z-0">
      <div className="w-[3px] h-8 sm:h-10 bg-gradient-to-b from-slate-200 to-slate-200" />
    </div>
  );
}

