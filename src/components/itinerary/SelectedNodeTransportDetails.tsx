import React, { useState, useEffect, useMemo } from "react";
import { Navigation2, AlertTriangle } from "lucide-react";
import { ItineraryNode } from "../../types/workflow";
import { haversineKm, estimateTransport, checkUnrealisticTravelTime, UnrealisticTravelCheckResult } from "../../lib/geoUtils";
import { fetchDirections } from "../../lib/workflowApi";
import { sortNodesForDisplay } from "../../lib/itineraryUtils";
import { extractMinutes } from "../../lib/itineraryText";
import { useTranslation } from "react-i18next";

interface SelectedNodeTransportDetailsProps {
  selectedNode: ItineraryNode;
  nodes: ItineraryNode[];
}

export default function SelectedNodeTransportDetails({
  selectedNode,
  nodes,
}: SelectedNodeTransportDetailsProps) {
  const { t } = useTranslation();
  const [apiDuration, setApiDuration] = useState<number | null>(null);
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return hours > 0
      ? remainingMinutes > 0
        ? t("itinerary_day.duration_hours", { hours, minutes: remainingMinutes })
        : t("itinerary_day.duration_hours_only", { hours })
      : t("itinerary_day.duration_minutes", { minutes: remainingMinutes });
  };
  const getTransportLabel = (minutes: number, isFlight = false) => {
    if (isFlight) return t("transport.estimated_flight", { duration: formatDuration(minutes) });
    if (minutes <= 10) return t("transport.estimated_walk", { duration: formatDuration(minutes) });
    if (minutes <= 25) return t("transport.estimated_public", { duration: formatDuration(minutes) });
    return t("transport.estimated_drive", { duration: formatDuration(minutes) });
  };

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

  const unrealisticCheck: UnrealisticTravelCheckResult = nextItem
    ? checkUnrealisticTravelTime(selectedNode, nextItem, timeGapMinutes)
    : { isUnrealistic: false, distanceKm: 0, estimatedMinutes: 0 };


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
          label: t("transport.estimated_drive", { duration: formatDuration(apiDuration) }),
          minutes: apiDuration,
          isApi: true,
          isFlight: false,
        };
      }
      return { ...autoTransport, label: getTransportLabel(autoTransport.minutes, autoTransport.isFlight), isApi: false };
    }
    return null;
  })();

  const hasTransitConflict = Boolean(
    (displayTransport &&
      timeGapMinutes > 0 &&
      displayTransport.minutes > timeGapMinutes) ||
    (displayTransport && displayTransport.minutes > 90 && !displayTransport.isFlight) ||
    unrealisticCheck.isUnrealistic
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
            {nextItem?.title ? t("transport.to_next", { title: nextItem.title }) : ""}
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
                {t("transport.api_estimate")}
              </span>
            )}
          </span>

          {unrealisticCheck.isUnrealistic && unrealisticCheck.message ? (
            <div className="mt-2 text-[11px] font-bold text-red-700 bg-red-100/50 p-2.5 rounded-2xl flex items-start gap-2 shadow-sm border border-red-100">
              <AlertTriangle
                size={15}
                className="shrink-0 mt-0.5"
                strokeWidth={2.5}
              />
              <span className="leading-relaxed">
                {unrealisticCheck.reason === "impossible_speed"
                  ? unrealisticCheck.requiredSpeedKmH && unrealisticCheck.requiredSpeedKmH > 900
                    ? t("transport.impossible_flight", { distance: Math.round(unrealisticCheck.distanceKm), available: formatDuration(unrealisticCheck.availableMinutes ?? 0) })
                    : t("transport.impossible_ground", { distance: unrealisticCheck.distanceKm, available: formatDuration(unrealisticCheck.availableMinutes ?? 0), speed: unrealisticCheck.requiredSpeedKmH ?? 0 })
                  : unrealisticCheck.reason === "insufficient_time"
                    ? t("transport.insufficient_time", { estimated: formatDuration(unrealisticCheck.estimatedMinutes), available: formatDuration(unrealisticCheck.availableMinutes ?? 0) })
                    : t("transport.excessive_distance", { distance: Math.round(unrealisticCheck.distanceKm) })}
              </span>
            </div>
          ) : hasTransitConflict && (
            <div className="mt-2 text-[11px] font-bold text-red-700 bg-red-100/50 p-2.5 rounded-2xl flex items-start gap-2 shadow-sm border border-red-100">
              <AlertTriangle
                size={15}
                className="shrink-0 mt-0.5"
                strokeWidth={2.5}
              />
              <span className="leading-relaxed">
                {displayTransport.minutes > timeGapMinutes && timeGapMinutes > 0
                  ? t("transport.conflict_time", { duration: formatDuration(displayTransport.minutes), nextTime: nextItem?.time || "", available: formatDuration(timeGapMinutes) })
                  : t("transport.conflict_long", { duration: formatDuration(displayTransport.minutes) })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
