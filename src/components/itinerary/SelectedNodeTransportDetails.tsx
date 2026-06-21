import React, { useState, useEffect, useMemo } from "react";
import { Navigation2, AlertTriangle } from "lucide-react";
import { ItineraryNode } from "../../types/workflow";
import { haversineKm, estimateTransport, formatMinutes } from "../../lib/geoUtils";
import { fetchDirections } from "../../lib/workflowApi";
import { sortNodesForDisplay } from "../../lib/itineraryUtils";
import { extractMinutes } from "../../lib/itineraryText";

interface SelectedNodeTransportDetailsProps {
  selectedNode: ItineraryNode;
  nodes: ItineraryNode[];
}

export default function SelectedNodeTransportDetails({
  selectedNode,
  nodes,
}: SelectedNodeTransportDetailsProps) {
  const [apiDuration, setApiDuration] = useState<number | null>(null);

  const dayNodes = useMemo(
    () => sortNodesForDisplay(nodes.filter((n) => n.day === selectedNode.day)),
    [nodes, selectedNode.day],
  );
  const currentIndex = dayNodes.findIndex(
    (n) => n.node_id === selectedNode.node_id,
  );
  const nextItem =
    currentIndex !== -1 && currentIndex < dayNodes.length - 1
      ? dayNodes[currentIndex + 1]
      : null;

  const km =
    selectedNode.lat && selectedNode.lng && nextItem?.lat && nextItem?.lng
      ? haversineKm(
          selectedNode.lat,
          selectedNode.lng,
          nextItem.lat,
          nextItem.lng,
        )
      : 0;

  useEffect(() => {
    if (
      km > 2 &&
      km <= 300 &&
      selectedNode.lng &&
      selectedNode.lat &&
      nextItem?.lng &&
      nextItem?.lat
    ) {
      fetchDirections(
        selectedNode.lng,
        selectedNode.lat,
        nextItem.lng,
        nextItem.lat,
      ).then((duration) => {
        if (duration) setApiDuration(duration);
      });
    } else {
      setApiDuration(null);
    }
  }, [km, selectedNode.lat, selectedNode.lng, nextItem?.lat, nextItem?.lng]);

  const autoTransport =
    !selectedNode.transport_to_next && km > 0 ? estimateTransport(km) : null;

  const displayTransport = (() => {
    if (selectedNode.transport_to_next) {
      return {
        emoji: "🚇",
        label: selectedNode.transport_to_next,
        minutes: extractMinutes(selectedNode.transport_to_next),
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

  let timeGapMinutes = 0;
  if (selectedNode.time && nextItem?.time) {
    const parseTime = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const t1 = parseTime(selectedNode.time);
    const t2 = parseTime(nextItem.time);
    if (t2 > t1) {
      timeGapMinutes = t2 - t1;
    }
  }

  const hasTransitConflict = Boolean(
    (displayTransport &&
      timeGapMinutes > 0 &&
      displayTransport.minutes > timeGapMinutes) ||
    (displayTransport && displayTransport.minutes > 90 && !displayTransport.isFlight),
  );

  if (!displayTransport) return null;

  return (
    <div
      className={`mt-4 p-4 rounded-[2rem] border border-white shadow-sm flex flex-col gap-3 ${
        hasTransitConflict
          ? "bg-gradient-to-r from-red-50 to-amber-50"
          : "bg-gradient-to-r from-indigo-50 to-blue-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex size-11 items-center justify-center rounded-full bg-white shadow-sm shrink-0 ${
            hasTransitConflict ? "text-red-500" : "text-indigo-500"
          }`}
        >
          <Navigation2 size={16} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col pt-0.5 w-full">
          <span
            className={`text-[11px] font-black uppercase tracking-widest mb-1 ${
              hasTransitConflict ? "text-red-400" : "text-indigo-400"
            }`}
          >
            前往下一站 {nextItem?.title ? `(${nextItem.title})` : ""}
          </span>
          <span
            className={`text-[13px] font-bold flex items-center gap-2 ${
              hasTransitConflict ? "text-red-900" : "text-slate-700"
            }`}
          >
            {displayTransport.emoji} {displayTransport.label}
            {displayTransport.isApi && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-[9px] uppercase ${
                  hasTransitConflict
                    ? "bg-red-200/50 text-red-700"
                    : "bg-indigo-100 text-indigo-700"
                }`}
              >
                API估計
              </span>
            )}
          </span>

          {hasTransitConflict && (
            <div className="mt-2 text-[11px] font-bold text-red-700 bg-red-100/50 p-2.5 rounded-2xl flex items-start gap-2 shadow-sm border border-red-100">
              <AlertTriangle
                size={15}
                className="shrink-0 mt-0.5"
                strokeWidth={2.5}
              />
              <span className="leading-relaxed">
                {displayTransport.minutes > timeGapMinutes && timeGapMinutes > 0
                  ? `預估需 ${formatMinutes(
                      displayTransport.minutes,
                    )}，但距離下一行程 (${
                      nextItem?.time || ""
                    }) 僅剩 ${formatMinutes(timeGapMinutes)}，時間有衝突！`
                  : `預估交通高達 ${formatMinutes(
                      displayTransport.minutes,
                    )}，車程較長，建議調整或留意休息。`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
