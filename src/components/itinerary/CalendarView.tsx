import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Sparkles,
  Link,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { ItineraryNode, TravelFact } from "../../types/workflow";
import { useTripFactsStore } from "../../store/useTripFactsStore";
import { useAppStore } from "../../store/useAppStore";
import { sortNodesForDisplay, getNodeEmoji } from "../../lib/itineraryUtils";
import { openNativeMap } from "../../lib/workflowApi";
import IconImg from "../ui/IconImg";
import GlassCard from "../GlassCard";
import SelectedNodeTransportDetails from "./SelectedNodeTransportDetails";
import { getModalMotion } from "../../lib/motionTokens";

interface CalendarViewProps {
  nodes: ItineraryNode[];
  tripStartDate?: string;
}

function getTravelFactBookingLabel(fact?: TravelFact | null) {
  if (!fact?.metadata?.bookingUrl) return null;
  return fact.factType.includes("flight") ? "前往預訂" : "查看價格";
}

function getTravelFactRedirectPayload(fact?: TravelFact | null) {
  const bookingUrl = fact?.metadata?.bookingUrl?.trim();
  if (!fact || !bookingUrl) return null;

  return {
    provider: fact.metadata?.provider || fact.metadata?.airline || fact.title,
    affiliateUrl: bookingUrl,
    itemId: fact.id,
    airline: fact.metadata?.airline || fact.metadata?.provider || fact.title,
    departure: fact.metadata?.depCode || "出發",
    arrival: fact.metadata?.arrCode || fact.locationName || "目的地",
    price:
      typeof fact.metadata?.price === "number"
        ? fact.metadata.price
        : undefined,
    currency: fact.metadata?.currency,
    emoji: fact.factType.includes("flight") ? "✈️" : "🏨",
  };
}

export default function CalendarView({
  nodes,
  tripStartDate,
}: CalendarViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Calculate start date
  const start = tripStartDate ? new Date(tripStartDate) : new Date();

  // Get nodes mapped by date string (YYYY-MM-DD local)
  const nodesByDate: Record<string, ItineraryNode[]> = {};

  nodes.forEach((node) => {
    // calculate date
    let d = new Date(start);
    if (node.date) {
      d = new Date(node.date);
    } else {
      d.setDate(d.getDate() + (node.day - 1));
    }
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!nodesByDate[dateStr]) nodesByDate[dateStr] = [];
    nodesByDate[dateStr].push(node);
  });

  const allDates = Object.keys(nodesByDate).sort();
  let viewMonth = start.getMonth();
  let viewYear = start.getFullYear();
  if (allDates.length > 0) {
    const firstDate = new Date(allDates[0]);
    viewMonth = firstDate.getMonth();
    viewYear = firstDate.getFullYear();
  }

  const [currentMonth, setCurrentMonth] = useState(
    new Date(viewYear, viewMonth, 1),
  );

  // build calendar grid
  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const selectedNode = nodes.find((n) => n.node_id === selectedNodeId);
  const facts = useTripFactsStore((s) => s.facts);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[75vh]">
      {/* Main calendar grid */}
      <div
        className={`flex-1 flex flex-col glass-card !p-0 overflow-hidden border-2 border-white/60 shadow-xl ${
          selectedNodeId ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-pink-100 bg-white/40">
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() - 1,
                  1,
                ),
              )
            }
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-pink-500 shadow-sm hover:bg-pink-50 hover:scale-105 transition-all"
            title="上個月"
            aria-label="上個月"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-black text-slate-700 tracking-widest">
            {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
          </h2>
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1,
                  1,
                ),
              )
            }
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-pink-500 shadow-sm hover:bg-pink-50 hover:scale-105 transition-all"
            title="下個月"
            aria-label="下個月"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-pink-100/50 flex-1 overflow-y-auto">
          {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
            <div
              key={d}
              className="bg-white/70 backdrop-blur-md text-center py-3 text-xs font-black text-pink-400 capitalize tracking-widest sticky top-0 z-10 shadow-sm"
            >
              {d}
            </div>
          ))}
          {days.map((d, i) => {
            if (!d)
              return (
                <div key={`empty-${i}`} className="bg-white/40 min-h-[120px]" />
              );
            const dateStr = `${d.getFullYear()}-${String(
              d.getMonth() + 1,
            ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const dayNodes = sortNodesForDisplay(nodesByDate[dateStr] || []);

            const isToday = new Date().toDateString() === d.toDateString();

            return (
              <div
                key={dateStr}
                className={`bg-white/80 backdrop-blur-sm min-h-[120px] p-2 flex flex-col transition-colors border-t border-transparent hover:border-pink-200 ${
                  isToday ? "bg-pink-50/80 ring-2 ring-pink-300 inset-0" : ""
                }`}
              >
                <span
                  className={`text-sm font-black mb-2 px-1 ${
                    isToday ? "text-pink-600" : "text-slate-500"
                  }`}
                >
                  {d.getDate()}
                </span>
                <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar flex-1 pb-1">
                  {dayNodes.map((node) => (
                    <button
                      key={node.node_id}
                      onClick={() => setSelectedNodeId(node.node_id)}
                      className={`text-left px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all border border-transparent flex gap-1.5 shadow-sm ios-press ${
                        selectedNodeId === node.node_id
                          ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-pink-200/50 scale-105"
                          : "bg-white text-slate-600 hover:border-pink-200 hover:shadow-md"
                      }`}
                    >
                      <div className="flex flex-col w-full min-w-0">
                        <div className="flex items-center gap-1 w-full min-w-0">
                          <IconImg
                             value={getNodeEmoji(node)}
                             size={16}
                             className="shrink-0"
                          />
                          <span className="truncate flex-1">{node.title}</span>
                        </div>
                        {node.time && (
                          <span
                            className={`text-[9px] mt-0.5 tracking-wider ${
                              selectedNodeId === node.node_id
                                ? "text-white/80"
                                : "text-slate-500"
                            }`}
                          >
                            {node.time}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar details */}
      {selectedNodeId && selectedNode && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-4 h-full relative z-20"
        >
          <GlassCard className="!p-4 flex items-center justify-between border-2 border-white/60 flex-shrink-0">
            <span className="font-black text-sm text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={16} className="text-pink-400" /> 詳細內容
            </span>
            <button
              onClick={() => setSelectedNodeId(null)}
              aria-label="關閉詳細內容"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-slate-600 transition-colors shadow-sm cursor-pointer border border-slate-200/50"
            >
              <X size={16} strokeWidth={3} />
            </button>
          </GlassCard>

          <GlassCard className="!p-6 flex flex-col gap-5 overflow-y-auto no-scrollbar border-2 border-white/60 flex-1 relative">
            {selectedNode.image_url && (
              <div className="w-full h-48 bg-slate-100 rounded-[2rem] overflow-hidden shadow-inner border border-white relative group">
                <img
                  src={selectedNode.image_url}
                  alt="spot"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="flex items-start gap-4 mt-2">
              <div className="w-14 h-14 shrink-0 rounded-[1.5rem] bg-gradient-to-br from-pink-50 to-fuchsia-50 flex items-center justify-center border border-white shadow-md shadow-pink-100/50">
                <IconImg value={getNodeEmoji(selectedNode)} size={32} />
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-black text-xl text-slate-800 leading-tight mb-2">
                  {selectedNode.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedNode.time && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-black text-slate-500 uppercase tracking-[0.1em] border border-white shadow-sm whitespace-nowrap">
                      <Clock size={12} strokeWidth={3} /> {selectedNode.time}
                    </div>
                  )}
                  {selectedNode.lat && selectedNode.lng && (
                    <button
                      onClick={() =>
                        openNativeMap(
                          Number(selectedNode.lat!),
                          Number(selectedNode.lng!),
                          selectedNode.title,
                        )
                      }
                      title="開始導航"
                      aria-label="開始導航"
                      className="inline-flex size-11 items-center justify-center p-[2px] bg-blue-500 hover:bg-blue-600 rounded-full shadow-sm text-sm shrink-0"
                    >
                      🧭
                    </button>
                  )}
                </div>
              </div>
            </div>

            {selectedNode.description && (
              <div className="relative mt-2">
                <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-400 to-fuchsia-400 rounded-full opacity-50" />
                <p className="text-[13px] text-slate-600 leading-relaxed font-medium pl-3 whitespace-pre-wrap font-sans">
                  {selectedNode.description}
                </p>
              </div>
            )}

            <SelectedNodeTransportDetails
              selectedNode={selectedNode}
              nodes={nodes}
            />

            {selectedNode.linkedFactId &&
              facts.find((f: any) => f.id === selectedNode.linkedFactId) && (
                <div className="mt-4 p-4 rounded-[1.5rem] bg-gradient-to-br from-cyan-50 to-blue-50/50 border border-white shadow-sm flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 p-4 opacity-10 text-6xl pointer-events-none">
                    ✨
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-cyan-500 shadow-sm shrink-0 relative z-10">
                      <Link size={14} className="text-slate-500" />
                    </div>
                    <span className="text-[11px] font-black text-cyan-600 uppercase tracking-widest">
                      關聯的 Travel Fact
                    </span>
                  </div>

                  {(() => {
                    const fact = facts.find(
                      (f: any) => f.id === selectedNode.linkedFactId,
                    ) as TravelFact | undefined;
                    if (!fact) return null;
                    const redirectPayload = getTravelFactRedirectPayload(fact);
                    const bookingLabel = getTravelFactBookingLabel(fact);
                    return (
                      <div className="flex flex-col gap-2 relative z-10 pl-1">
                        <span className="text-sm font-bold text-slate-800 font-sans">
                          {fact.title}
                        </span>

                        {(fact.startAt || fact.endAt) && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Clock size={14} className="text-slate-500" />
                            <span>
                              {fact.startAt || "--"}{" "}
                              {fact.endAt ? `至 ${fact.endAt}` : ""}
                            </span>
                          </div>
                        )}

                        {fact.locationName && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <MapPin size={14} className="text-slate-500" />
                            <span>{fact.locationName}</span>
                          </div>
                        )}

                        {fact.referenceCode && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded bg-white">
                              訂單編號
                            </span>
                            <span className="font-mono">
                              {fact.referenceCode}
                            </span>
                          </div>
                        )}

                        {fact.metadata &&
                          Object.keys(fact.metadata).length > 0 && (
                            <div className="mt-1 pt-2 border-t border-cyan-100/50 grid grid-cols-2 gap-2">
                              {fact.metadata.airline && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    航空公司
                                  </span>
                                  <span className="text-xs text-slate-700 font-bold font-sans">
                                    {fact.metadata.airline}
                                  </span>
                                </div>
                              )}
                              {fact.metadata.flightNumber && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    航班編號
                                  </span>
                                  <span className="text-xs text-slate-700 font-bold font-mono">
                                    {fact.metadata.flightNumber}
                                  </span>
                                </div>
                              )}
                              {fact.metadata.checkInTime && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    入住時間
                                  </span>
                                  <span className="text-xs text-slate-700 font-bold font-sans">
                                    {fact.metadata.checkInTime}
                                  </span>
                                </div>
                              )}
                              {fact.metadata.checkOutTime && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    退房時間
                                  </span>
                                  <span className="text-xs text-slate-700 font-bold font-sans">
                                    {fact.metadata.checkOutTime}
                                  </span>
                                </div>
                              )}
                              {fact.metadata.address && (
                                <div className="flex flex-col col-span-2">
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    地址
                                  </span>
                                  <span className="text-xs text-slate-700 font-bold font-sans">
                                    {fact.metadata.address}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        {redirectPayload && bookingLabel && (
                          <button
                            type="button"
                            onClick={() =>
                              useAppStore
                                .getState()
                                .openRedirectModal(redirectPayload)
                            }
                            className="mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-cyan-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-md"
                          >
                            <ExternalLink size={14} strokeWidth={3} />
                            <span>{bookingLabel}</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
