import React, { useState, useEffect, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Reorder, useDragControls } from "motion/react";
import { Calendar, CheckCircle2, Clock, ExternalLink, GripVertical, Image as ImageIcon, Instagram, Link, Loader2, MapPin, Navigation2, Pencil, Plane, RefreshCw, Sparkles, Trash2, X, ZoomIn } from "lucide-react";
import type { ItineraryNode, ItineraryAttachment, FavoriteSpot } from "../../types/workflow";
import { useTypewriter } from "../../lib/useTypewriter";
import GlassCard from "../GlassCard";
import IconImg from "../ui/IconImg";
import { ItinerarySkeletonCard } from "../SkeletonCard";
import { WikiPreviewCard } from "../WikiPreviewCard";
import CollapsibleNotes from "./CollapsibleNotes";
import TransportGapIndicator from "./TransportGapIndicator";
import ManualAddNode from "./ManualAddNode";
import SpotImageSearchModal from "./SpotImageSearchModal";
import { CATEGORY_OPTIONS, EMOJI_OPTIONS, getCategoryMeta, getNodeEmoji, getDateForDay, getDayForDate, buildTimestampFromDateTime } from "../../lib/itineraryUtils";
import { normalizeClockInput } from "../../lib/itineraryText";
import { getFlightRouteSummary } from "../../lib/flightFormat";
import { getTravelFactBookingLabel, getTravelFactRedirectPayload } from "../../lib/travelFact";
import { impactHaptic, selectionHaptic } from "../../lib/haptics";
import { geocodeSpot, fetchSpotEnrichment, regenerateItinerarySpot } from "../../lib/workflowApi";
import { useAppStore } from "../../store/useAppStore";
import { useTripFactsStore } from "../../store/useTripFactsStore";
import { getModalMotion, getOverlayTransition, SPRING_SMOOTH, SPRING_SNAPPY, SPRING_BOUNCY, pressableSurfaceClass, subtlePressableClass, raisedHoverClass } from "../../lib/motionTokens";
import { useModalAccessibility } from "../../lib/useModalAccessibility";
import { useTranslation } from "react-i18next";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

const ItineraryListItem = React.memo(
  function ItineraryListItemBase({
    item,
    idx,
    onDelete,
    onUpdate,
    isOffline,
    tripId,
    destination,
    tripStartDate,
    previousItem,
    nextItem,
    isRecentlySynced,
    onQuickExpense,
    onEditingChange,
    collaboratingLock,
    onPreviewImage,
    onRequireLogin,
  }: {
    item: ItineraryNode;
    idx: number;
    onDelete: (node_id: string) => void;
    onUpdate: (node: ItineraryNode) => void;
    isOffline: boolean;
    tripId: string;
    destination: string;
    tripStartDate?: string | null;
    previousItem?: ItineraryNode;
    nextItem?: ItineraryNode;
    isRecentlySynced?: boolean;
    onQuickExpense?: (node: ItineraryNode) => void;
    onEditingChange?: (nodeId: string, day: number, isEditing: boolean) => void;
    collaboratingLock?: { userName: string; day: number };
    onPreviewImage?: (url: string) => void;
    onRequireLogin?: (itemName?: string) => void;
    key?: string;
  }) {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [isTitleExpanded, setIsTitleExpanded] = useState(false);
    const [editTitle, setEditTitle] = useState(item.title);
    const [editDate, setEditDate] = useState(
      item.date || getDateForDay(item.day, tripStartDate) || "",
    );
    const [editTime, setEditTime] = useState(item.time);
    const [editEmoji, setEditEmoji] = useState(getNodeEmoji(item));
    const [editDescription, setEditDescription] = useState(
      item.description || item.notes || "",
    );
    const [editTransport, setEditTransport] = useState(
      item.transport_to_next || "",
    );
    const [editImageUrl, setEditImageUrl] = useState(item.image_url || "");
    const [editAttachments, setEditAttachments] = useState<
      ItineraryAttachment[]
    >(item.attachments || []);
    const [editLinkedFactId, setEditLinkedFactId] = useState(
      item.linkedFactId || "",
    );
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showImageSearchModal, setShowImageSearchModal] = useState(false);
    const editorTitleId = useId();
    const editorPlaceId = useId();
    const editorDateId = useId();
    const editorTimeId = useId();
    const editorImageUrlId = useId();
    const editorDescriptionId = useId();
    const editorFactId = useId();

    const closeEditor = () => {
      setIsEditing(false);
      onEditingChange?.(item.node_id, item.day, false);
    };
    const editorDialogRef = useModalAccessibility(closeEditor, isEditing);

    const facts = useTripFactsStore((s) => s.facts);
    const linkedFact = item.linkedFactId
      ? facts.find((fact) => fact.id === item.linkedFactId)
      : undefined;
    const linkedFactRedirect = getTravelFactRedirectPayload(linkedFact);
    const linkedFactBookingLabel = getTravelFactBookingLabel(linkedFact);
    const detailCopy = item.description || item.notes || "";
    const isFlightCard = item.category === "flight";
    const isHotelCard =
      item.category === "hotel" || item.category === "accommodation";
    const isAnchorCard = isFlightCard || isHotelCard;
    const flightRoute = isFlightCard
      ? getFlightRouteSummary(item, linkedFact)
      : null;

    useEffect(() => {
      setEditTitle(item.title);
      setEditDate(item.date || getDateForDay(item.day, tripStartDate) || "");
      setEditTime(item.time);
      setEditEmoji(getNodeEmoji(item));
      setEditDescription(item.description || item.notes || "");
      setEditTransport(item.transport_to_next || "");
      setEditImageUrl(item.image_url || "");
      setEditAttachments(item.attachments || []);
      setEditLinkedFactId(item.linkedFactId || "");
      setIsTitleExpanded(false);
    }, [item, tripStartDate]);

    const handleAttachmentUpload = async (
      event: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      const uploaded = await Promise.all(
        files.map(async (file) => ({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type || "application/octet-stream",
          url: await readFileAsDataUrl(file),
        })),
      );

      setEditAttachments((prev) => [...prev, ...uploaded]);
      event.target.value = "";
    };

    const removeAttachment = (attachmentId: string) => {
      setEditAttachments((prev) =>
        prev.filter((attachment) => attachment.id !== attachmentId),
      );
    };

    useEffect(() => {
      if (collaboratingLock && isEditing) {
        setIsEditing(false);
        useAppStore
          .getState()
          .showToast(
            t("itinerary_feedback.lock_acquired", { name: collaboratingLock.userName }),
            "warning",
          );
      }
    }, [collaboratingLock, isEditing, t]);

    const handleSave = () => {
      onUpdate({
        ...item,
        day: getDayForDate(editDate, tripStartDate, item.day),
        date: editDate || undefined,
        time: normalizeClockInput(editTime),
        title: editTitle,
        emoji: editEmoji,
        description: editDescription,
        transport_to_next: editTransport || undefined,
        image_url: editImageUrl,
        attachments: editAttachments,
        linkedFactId: editLinkedFactId || undefined,
        timestamp:
          buildTimestampFromDateTime(editDate, normalizeClockInput(editTime)) ??
          item.timestamp,
      });
      setIsEditing(false);
      onEditingChange?.(
        item.node_id,
        getDayForDate(editDate, tripStartDate, item.day),
        false,
      );
    };

    const openEditor = () => {
      const isGuestAuth = useAppStore.getState().userId?.startsWith("guest_") || !useAppStore.getState().userId;
      if (collaboratingLock && !isEditing) {
        useAppStore
          .getState()
          .showToast(t("itinerary_feedback.lock_editing", { name: collaboratingLock.userName }), "warning");
        return;
      }
      if (isGuestAuth) {
        if (onRequireLogin) {
          onRequireLogin(item.title);
        } else {
          useAppStore.getState().showToast(t("itinerary_feedback.view_only"), "warning");
          window.dispatchEvent(new CustomEvent('request-login'));
        }
        return;
      }
      if (!isOffline && !isEditing) {
        setIsEditing(true);
        onEditingChange?.(item.node_id, item.day, true);
      }
    };

    const [isNavigating, setIsNavigating] = useState(false);

    const handleNavigate = async (e: React.MouseEvent) => {
      e.stopPropagation();
      let lat = item.lat;
      let lng = item.lng;

      if (!lat || !lng) {
        setIsNavigating(true);
        try {
          const coords = await geocodeSpot(item.title, destination);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
            // Optimistically update
            onUpdate({ ...item, lat, lng });
          }
        } finally {
          setIsNavigating(false);
        }
      }

      if (!lat || !lng) {
        useAppStore.getState().showToast(t("itinerary_feedback.coordinates_unavailable"), "warning");
        return;
      }

      impactHaptic([18]);
      window.dispatchEvent(
        new CustomEvent("open-map", {
          detail: { lat, lng, title: item.title },
        })
      );
    };

    const handleShareToIGStory = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (collaboratingLock) return;

      const shortDest = destination ? destination.split(",")[0].trim() : t("itinerary_feedback.share_destination_fallback");
      const safeTitle = item.title.trim().replace(/\s+/g, "");
      const tags = t("itinerary_feedback.share_tags", { destination: shortDest, title: safeTitle });
      const imageSection = item.image_url
        ? t("itinerary_feedback.share_image_section", { url: item.image_url })
        : "";
      const text = t("itinerary_feedback.share_text", { title: item.title, imageSection, tags });

      if (navigator.share) {
        try {
          await navigator.share({
            title: `${item.title} - ${shortDest}`,
            text: text,
          });
        } catch (err) {
          console.error("Share failed:", err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          useAppStore
            .getState()
            .showToast?.(
              t("itinerary_feedback.share_copied"),
              "success",
            );
        } catch (err) {
          useAppStore.getState().showToast?.(t("itinerary_feedback.share_failed"), "warning");
        }
      }
    };

    const handleRegenerate = async () => {
      if (!tripId || !destination) return;
      setRegenerating(true);
      try {
        const travelFactsContext = facts
          .map((fact) => `[ID: ${fact.id}] ${fact.factType} - ${fact.title}`)
          .join("\n");
        const newNode = await regenerateItinerarySpot({
          trip_id: tripId,
          node_id: item.node_id,
          destination: destination,
          day: item.day,
          current_date: item.date || getDateForDay(item.day, tripStartDate),
          current_time: item.time,
          current_title: item.title,
          current_category: item.category,
          notes: item.description || item.notes,
          preserve_time_window: true,
          previous_node: previousItem
            ? {
                time: previousItem.time,
                title: previousItem.title,
                category: previousItem.category,
              }
            : undefined,
          next_node: nextItem
            ? {
                time: nextItem.time,
                title: nextItem.title,
                category: nextItem.category,
              }
            : undefined,
          travel_facts_context: travelFactsContext,
        });
        const { ai_note, intensity, ...restNode } = newNode as any;

        let finalImageUrl = restNode.image_url;
        if (!finalImageUrl && restNode.title) {
          try {
            const enrich = await fetchSpotEnrichment(restNode.title);
            if (enrich?.thumbnail) finalImageUrl = enrich.thumbnail;
          } catch (e) {}
        }

        onUpdate({
          ...item,
          ...restNode,
          image_url: finalImageUrl,
          time: restNode.time || item.time,
          date: item.date,
          day: item.day,
          sort_order: item.sort_order,
          ai_note: ai_note || undefined,
          intensity: intensity || undefined,
          description: ai_note || restNode.description,
          timestamp:
            buildTimestampFromDateTime(item.date, restNode.time || item.time) ??
            item.timestamp,
        });

        useAppStore.getState().showToast?.(t("itinerary_feedback.regenerated"), "success");
      } catch (err) {
        console.error("Regenerate failed:", err);
        useAppStore.getState().showToast?.(t("itinerary_feedback.regenerate_failed"), "warning");
      } finally {
        setRegenerating(false);
      }
    };

    const meta = getCategoryMeta(item.category);

    return (
      <div className="relative flex items-stretch group w-full pl-[22px] sm:pl-10 lg:pl-12">
        {/* Timeline Thread */}
        <div className="absolute left-[11px] sm:left-[17px] lg:left-[21px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-fuchsia-300/40 via-pink-300/20 to-transparent group-last:bottom-auto group-last:h-12 pointer-events-none" />
        <div
          className={`absolute left-[5px] sm:left-2 lg:left-3 top-6 sm:top-7 w-[14px] h-[14px] sm:w-[20px] sm:h-[20px] rounded-full border-[3px] border-white/94 backdrop-blur-md shadow-[0_4px_12px_rgba(244,63,94,0.15)] z-20 transition-all duration-500 group-hover:scale-130 ${item.linkedFactId ? "bg-gradient-to-br from-sky-400 to-blue-500 ring-4 ring-sky-200/50 shadow-[0_0_12px_rgba(14,165,233,0.6)]" : "bg-gradient-to-br from-pink-400 to-fuchsia-400 hover:from-pink-500 hover:to-fuchsia-500 hover:shadow-md"}`}
        />

        {/* Content Card */}
        {collaboratingLock && (
          <div className="absolute -inset-1 rounded-[40px] bg-gradient-to-r from-fuchsia-400 to-purple-400 opacity-20 blur-md z-0 animate-pulse pointer-events-none" />
        )}
        <div
          onClick={(e) => {
            if (
              !isOffline &&
              !collaboratingLock &&
              (e.target as HTMLElement).tagName !== "INPUT" &&
              (e.target as HTMLElement).tagName !== "BUTTON" &&
              (e.target as HTMLElement).tagName !== "A"
            ) {
              openEditor();
            }
          }}
          className={`flex-1 p-4 sm:p-5 rounded-[32px] sm:rounded-[40px] cursor-pointer transition-[transform,shadow,background,colors] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ios-press hover:scale-[1.01] relative z-10 w-full transform-gpu ${collaboratingLock ? "ring-2 ring-fuchsia-400/60 scale-[0.98]" : ""} ${isRecentlySynced ? "ring-2 ring-emerald-300/80 shadow-[0_0_12px_rgba(16,185,129,0.2)]" : ""} ${item.linkedFactId ? "ring-2 ring-sky-300/40 border-sky-200/50" : ""} ${isFlightCard ? "bg-slate-900/95 backdrop-blur-2xl text-white border border-slate-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)]" : isHotelCard ? "bg-gradient-to-br from-indigo-900/95 to-indigo-800/95 backdrop-blur-2xl text-indigo-50 border border-indigo-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(49,46,129,0.25)] hover:shadow-[0_12px_30px_rgba(49,46,129,0.35)]" : "bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_24px_rgba(15,23,42,0.05),0_2px_8px_rgba(15,23,42,0.02)] hover:border-sky-100 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_34px_rgba(15,23,42,0.08),0_4px_12px_rgba(14,165,233,0.08)]"}`}
        >
          {item.linkedFactId && (
            <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-sky-600 text-white shadow-sm ring-2 ring-white z-20">
              <Link size={10} strokeWidth={3} />
            </div>
          )}
          <div className="flex flex-col gap-2 sm:gap-3 w-full">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold tracking-normal ${isFlightCard ? "text-slate-300" : isHotelCard ? "text-indigo-200" : "text-slate-500 dark:text-slate-400"}`}>
                  {isFlightCard ? t("itinerary_card.transit") : isHotelCard ? t("itinerary_card.stay") : t("itinerary_card.day_note")}
                </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full inline-block ${item.source === "remote" ? "bg-emerald-500" : "bg-amber-500"}`}
                  />
                  
              </div>
            </div>
            <div className="flex flex-row items-start gap-2 sm:gap-2.5">
              <div
                className={`relative w-6 h-6 sm:w-8 sm:h-8 mt-0.5 shrink-0 rounded-[10px] sm:rounded-[12px] flex items-center justify-center text-sm sm:text-base shadow-inner border border-slate-100/50 transition-all group-hover:scale-105 group-hover:rotate-3 duration-700 ${item.category === "flight" ? "bg-gradient-to-br from-indigo-50 to-blue-50" : "bg-white/95"}`}
              >
                <span className="filter drop-shadow-sm select-none transition-transform group-hover:scale-110">
                  <IconImg value={getNodeEmoji(item)} size={16} />
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {isFlightCard && flightRoute && (
                  <div className="mb-1.5 w-full">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold tracking-normal text-slate-500">
                          {t("itinerary_card.departure")}
                        </div>
                        <div className="truncate text-lg font-black leading-none sm:text-xl">
                          {flightRoute.from}
                        </div>
                      </div>
                      <div className="flex-1 min-w-[72px] px-2">
                        <div className="flex items-center gap-2 text-slate-500">
                          <div className="h-px flex-1 border-t border-dashed border-slate-600" />
                          <Plane
                            size={14}
                            className="shrink-0 text-fuchsia-400"
                          />
                          <div className="h-px flex-1 border-t border-dashed border-slate-600" />
                        </div>
                        <div className="mt-1 text-center text-xs font-medium tracking-normal text-slate-500 truncate">
                          {flightRoute.flightNumber}
                        </div>
                      </div>
                      <div className="min-w-0 text-right">
                        <div className="text-sm font-semibold tracking-normal text-slate-500">
                          {t("itinerary_card.arrival")}
                        </div>
                        <div className="truncate text-lg font-black leading-none sm:text-xl">
                          {flightRoute.to}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isHotelCard && (
                  <div className="mb-1.5 w-full">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold tracking-normal text-indigo-400">
                          {t("itinerary_card.tonight_stay")}
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTitleExpanded(!isTitleExpanded);
                          }}
                          className={`text-lg font-black leading-tight sm:text-xl cursor-pointer hover:text-indigo-300 transition-colors ${
                            isTitleExpanded ? "line-clamp-none whitespace-normal" : "truncate"
                          }`}
                        >
                          {item.title}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold tracking-normal text-indigo-100">
                        {t("itinerary_card.rest_anchor")}
                      </span>
                    </div>
                  </div>
                )}
                {!isAnchorCard && (
                  <h3
                    title={item.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTitleExpanded(!isTitleExpanded);
                    }}
                    className={`mb-0.5 text-[15px] font-black leading-[1.28] tracking-[-0.025em] text-slate-900 font-sans sm:text-[16px] cursor-pointer hover:text-sky-600 transition-colors ${
                      isTitleExpanded ? "line-clamp-none" : "line-clamp-2 sm:line-clamp-3"
                    }`}
                  >
                    {item.title}
                  </h3>
                )}
                {isAnchorCard && (
                  <p
                    className={`mb-1 text-xs font-semibold tracking-normal ${isFlightCard ? "text-slate-500" : "text-indigo-400/80"}`}
                  >
                    {isFlightCard ? t("itinerary_card.transport_anchor") : t("itinerary_card.tonight_stay")}
                  </p>
                )}

                <div
                  className={`mt-1.5 flex flex-wrap items-center gap-1.5 rounded-[18px] px-2.5 py-2 ${isFlightCard || isHotelCard ? "bg-white/6" : "bg-slate-50/80 border border-slate-100 shadow-inner"}`}
                >
                  <div className="relative">
                    <div className="relative flex">
                      <div
                        className={`px-2 py-1 rounded-full text-lg font-semibold tabular-nums tracking-normal flex items-center gap-1 transition-colors border ${isFlightCard ? "bg-slate-700 hover:bg-slate-700 border-slate-600 text-white" : isHotelCard ? "bg-indigo-800 hover:bg-indigo-700 border-indigo-700 text-white" : "bg-slate-800 hover:bg-slate-700 text-white border-slate-900"} relative z-0`}
                      >
                        <Clock size={11} className="sm:w-[13px] sm:h-[13px]" />
                        {item.time || t("itinerary_card.time_unset")}
                      </div>
                      {!isOffline && !collaboratingLock && (
                        <input
                          type="time"
                          value={item.time || ""}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const val = e.target.value;
                            onUpdate({
                              ...item,
                              time: val,
                              timestamp:
                                buildTimestampFromDateTime(item.date, val) ??
                                item.timestamp,
                            });
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 block"
                        />
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-pink-50 text-xs font-semibold tracking-normal text-pink-700 border border-pink-100/70">
                    {t(`itinerary_category.${meta.key}`)}
                  </span>
                  
                  {linkedFact && (
                    <span className="px-2 py-1 rounded-full bg-cyan-50 text-xs font-semibold tracking-normal text-cyan-600 border border-cyan-100/50 flex items-center gap-1">
                      <Link size={11} className="sm:w-[13px] sm:h-[13px]" />
                      {t("itinerary_card.linked_fact", { title: linkedFact.title })}
                    </span>
                  )}
                  {collaboratingLock && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-fuchsia-100 text-xs font-semibold tracking-normal text-fuchsia-700 border border-fuchsia-200 shadow-sm shadow-fuchsia-200/50"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 shadow-[0_0_6px_#d946ef] inline-block" />
                      {t("itinerary_card.editing_by", { name: collaboratingLock.userName })}
                    </motion.span>
                  )}
                  {isRecentlySynced && (
                    <motion.span
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-xs font-semibold tracking-normal text-emerald-700 border border-emerald-200 shadow-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      {t("itinerary_card.just_synced")}
                    </motion.span>
                  )}
                  {item.title.includes("Cebu") && (
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-50 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] text-rose-600 border border-rose-100 flex items-center gap-0.5">
                      📌 {t("itinerary_card.must_see")}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={
                      item.is_visited ? t("itinerary_card.mark_unvisited") : t("itinerary_card.mark_visited")
                    }
                    onClick={() =>
                      onUpdate({ ...item, is_visited: !item.is_visited })
                    }
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full text-xs font-semibold tracking-normal transition-all border ${item.is_visited ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                  >
                    {item.is_visited ? (
                      <CheckCircle2 size={13} className="text-emerald-500" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
                    )}
                    {item.is_visited ? t("itinerary_card.visited") : t("itinerary_card.not_visited")}
                  </button>
                  {item.category === "flight" && (
                    <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] text-indigo-500 flex items-center gap-1 animate-pulse">
                      <div className="w-1 h-1 rounded-full bg-indigo-500" />
                      {t("itinerary_card.confirmed")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-200/70 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <button
                  type="button"
                  aria-label={t("itinerary_card.navigate", { title: item.title })}
                  title={t("itinerary_card.navigate", { title: item.title })}
                  onClick={handleNavigate}
                  disabled={isNavigating}
                  className="w-11 h-11 sm:w-11 sm:h-11 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 hover:bg-sky-100 hover:shadow-md transition-[transform,shadow,background-color] ios-press disabled:opacity-50"
                >
                  {isNavigating ? (
                    <Loader2
                      size={14}
                      className="animate-spin sm:w-4 sm:h-4 w-3.5 h-3.5"
                    />
                  ) : (
                    <span className="text-sm sm:text-lg">🧭</span>
                  )}
                </button>

                {!isOffline && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (collaboratingLock) return;
                        openEditor();
                      }}
                      disabled={Boolean(collaboratingLock)}
                      className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:border-slate-300 hover:shadow-md transition-[transform,shadow,background-color] ios-press disabled:opacity-40 disabled:cursor-not-allowed"
                      title={t("itinerary_card.edit")}
                      aria-label={t("itinerary_card.edit")}
                    >
                      <Pencil
                        size={14}
                        strokeWidth={2.75}
                        className="sm:w-4 sm:h-4 w-3.5 h-3.5"
                      />
                    </button>
                    {onQuickExpense && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (collaboratingLock) return;
                          onQuickExpense(item);
                        }}
                        disabled={Boolean(collaboratingLock)}
                        className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 hover:shadow-md transition-[transform,shadow,background-color] ios-press disabled:opacity-40 disabled:cursor-not-allowed"
                        title={t("itinerary_card.quick_expense")}
                        aria-label={t("itinerary_card.quick_expense")}
                      >
                        <span className="text-sm sm:text-lg">💸</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (collaboratingLock) return;
                        void handleRegenerate();
                      }}
                      disabled={Boolean(collaboratingLock) || regenerating}
                      className="w-11 h-11 rounded-full bg-gradient-to-tr from-fuchsia-600/10 via-pink-500/5 to-white/90 border border-fuchsia-200/80 flex items-center justify-center text-fuchsia-700 hover:from-fuchsia-700 hover:to-pink-600 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-fuchsia-200/40 transition-all duration-300 ios-press disabled:opacity-40 disabled:cursor-not-allowed transform-gpu animate-none"
                      title={t("itinerary_card.regenerate")}
                      aria-label={t("itinerary_card.regenerate")}
                    >
                      {regenerating ? (
                        <Loader2
                          size={14}
                          className="animate-spin sm:w-4 sm:h-4 w-3.5 h-3.5"
                        />
                      ) : (
                        <RefreshCw
                          size={14}
                          strokeWidth={2.75}
                          className="sm:w-4 sm:h-4 w-3.5 h-3.5"
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleShareToIGStory}
                      disabled={Boolean(collaboratingLock)}
                      className="w-11 h-11 rounded-full bg-pink-50 border border-orange-200 flex items-center justify-center text-pink-600 hover:opacity-80 hover:shadow-md transition-[transform,shadow,background-color] ios-press disabled:opacity-40 disabled:cursor-not-allowed"
                      title={t("itinerary_card.share")}
                      aria-label={t("itinerary_card.share")}
                    >
                      <Instagram
                        size={14}
                        strokeWidth={2.75}
                        className="sm:w-4 sm:h-4 w-3.5 h-3.5"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (collaboratingLock) return;
                        onDelete(item.node_id);
                      }}
                      disabled={Boolean(collaboratingLock)}
                      className="w-11 h-11 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 hover:bg-rose-100 hover:shadow-md transition-[transform,shadow,background-color] ios-press disabled:opacity-40 disabled:cursor-not-allowed"
                      title={t("itinerary_card.delete")}
                      aria-label={t("itinerary_card.delete")}
                    >
                      <Trash2
                        size={14}
                        strokeWidth={2.75}
                        className="sm:w-4 sm:h-4 w-3.5 h-3.5"
                      />
                    </button>
                  </>
                )}
              </div>

              {item.image_url ? (
                <div className="relative mb-2 sm:mb-2.5 rounded-[12px] sm:rounded-[16px] overflow-hidden shadow-md group/img bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    aria-label={t("itinerary_card.preview_image", { title: item.title })}
                    className="p-0 w-full h-24 sm:h-32 md:h-40 relative cursor-pointer block text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewImage && onPreviewImage(item.image_url!);
                    }}
                  >
                    <img
                      src={item.image_url}
                      alt={item.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).onerror = null;
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                      }}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 transform-gpu"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <ZoomIn
                        className="text-white drop-shadow-md"
                        size={28}
                        strokeWidth={2}
                      />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!collaboratingLock) setShowImageSearchModal(true);
                    }}
                    disabled={Boolean(collaboratingLock)}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-slate-900/80 hover:bg-slate-900 backdrop-blur-md text-white text-[10px] font-black tracking-wide flex items-center gap-1 shadow-md transition-all hover:scale-105 active:scale-95 z-10 disabled:opacity-40"
                    title={t("itinerary_card.replace_image")}
                    aria-label={t("itinerary_card.replace_image")}
                  >
                    <Sparkles size={11} className="text-amber-300 animate-pulse" />
                    <span>{t("itinerary_card.change_image")}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 sm:p-2.5 mb-2 sm:mb-2.5 rounded-[12px] bg-slate-50/80 dark:bg-slate-900/40 border border-dashed border-slate-200/90 dark:border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={14} className="text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t("itinerary_card.no_image")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!collaboratingLock) setShowImageSearchModal(true);
                    }}
                    disabled={Boolean(collaboratingLock)}
                    className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 text-[10px] font-black flex items-center gap-1 transition-all shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-40"
                    title={t("itinerary_card.search_image_title")}
                    aria-label={t("itinerary_card.search_image_title")}
                  >
                    <Sparkles size={11} className="text-indigo-500 animate-pulse" />
                    <span>{t("itinerary_card.search_image")}</span>
                  </button>
                </div>
              )}

              {item.attachments && item.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 sm:mb-2.5">
                  {item.attachments.map((attachment) => {
                    const isImage = attachment.type.startsWith("image/");
                    return (
                      <button
                        key={attachment.id}
                        type="button"
                        onClick={() =>
                          window.open(
                            attachment.url,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className={`rounded-[14px] border border-slate-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all ${isImage ? "p-1" : "px-3 py-2 text-left"}`}
                      >
                        {isImage ? (
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-[10px]"
                          />
                        ) : (
                          <span className="text-[11px] font-black text-slate-700 whitespace-nowrap">
                            📄 {attachment.name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {item.transport_to_next && (
                <div className="inline-flex items-center gap-1 mb-2 sm:mb-2.5 px-2.5 py-1 rounded-full bg-slate-800 text-sm font-semibold text-white tracking-normal shadow-sm shadow-slate-200">
                  <Navigation2
                    size={10}
                    strokeWidth={3}
                    className="text-indigo-400"
                  />
                  <span className="opacity-60 mr-1">{t("itinerary_card.move")}:</span>
                  {item.transport_to_next}
                </div>
              )}

              {detailCopy ? (
                <CollapsibleNotes text={detailCopy} label={t("itinerary_card.notes")} />
              ) : (
                <div className="editorial-card-soft mt-2 rounded-[20px] px-3.5 py-3">
                  <p className="mb-1 text-xs font-semibold tracking-normal text-slate-500 dark:text-slate-400">
                    {t("itinerary_card.notes")}
                  </p>
                  <p className="text-sm font-medium text-slate-500 opacity-80 transition-opacity leading-6">
                    {t("itinerary_card.empty_notes")}
                  </p>
                </div>
              )}

              {/* Wikipedia Preview */}
              {["landmark", "nature", "activity"].includes(
                item.category || "",
              ) && <WikiPreviewCard query={item.title} />}

              {item.title.includes("Cebu") && (
                <div className="mt-3 p-3 rounded-xl bg-orange-50/60 border border-orange-100/80 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-orange-700 uppercase">
                    <MapPin size={12} />
                    Cebu 必去景點
                  </div>
                  <div className="text-[12px] font-bold text-slate-700 leading-relaxed pl-1">
                    1. 麥哲倫十字架 Magellan's Cross
                    <br />
                    2. 聖嬰大教堂 Basilica Minore del Santo Niño
                    <br />
                    3. 宿霧道觀 Cebu Taoist Temple
                    <br />
                    4. 莉亞神殿 Temple of Leah
                    <br />
                    5. 聖佩德羅堡 Fort San Pedro
                  </div>
                </div>
              )}

              {linkedFact && (
                <div className="mt-2 p-2 rounded-xl bg-sky-50/50 border border-sky-100 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-500">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-sky-700 uppercase tracking-widest">
                    <Link size={10} />
                    <span>{t("itinerary_card.related_fact")}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-700">
                    {linkedFact.title}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {linkedFact.factType.includes("flight") && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Plane size={10} className="text-slate-500" />
                        <span>
                          {linkedFact.metadata?.flightNumber || "FLIGHT"}
                        </span>
                      </div>
                    )}
                    {linkedFact.metadata?.address && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <MapPin size={10} className="text-slate-500" />
                        <span
                          title={String(linkedFact.metadata?.address)}
                          className="max-w-[210px] break-words"
                        >
                          {linkedFact.metadata?.address}
                        </span>
                      </div>
                    )}
                    {linkedFact.startAt && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Clock size={10} className="text-slate-500" />
                        <span>{linkedFact.startAt}</span>
                      </div>
                    )}
                  </div>
                  {linkedFactRedirect && linkedFactBookingLabel && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        useAppStore
                          .getState()
                          .openRedirectModal(linkedFactRedirect);
                      }}
                      className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-sky-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:shadow-md"
                    >
                      <ExternalLink size={11} strokeWidth={3} />
                      <span>{linkedFactBookingLabel}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {!isOffline && (
              <div className="hidden">
                {/* Elements moved into the card footer */}
              </div>
            )}
          </div>
        </div>

        {isEditing &&
          createPortal(
            <AnimatePresence>
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md"
                  onClick={closeEditor}
                />
                {/* Modal Content */}
                <motion.div
                  ref={editorDialogRef}
                  layoutId={`modal-${item.node_id}`}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={editorTitleId}
                  tabIndex={-1}
                  className="relative w-[calc(100vw-2rem)] md:w-full min-w-[300px] sm:min-w-[480px] max-w-lg max-h-[85vh] overflow-y-auto hide-scrollbar bg-white/95 dark:bg-slate-950/80 backdrop-blur-3xl rounded-[32px] sm:rounded-[36px] shadow-2xl dark:shadow-black/55 border border-white/50 dark:border-white/10 flex flex-col pointer-events-auto"
                >
                  {/* Header */}
                  <div className="sticky top-0 z-20 bg-white/60 dark:bg-slate-950/70 backdrop-blur-xl border-b border-white dark:border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between dark-transition">
                    <h2 id={editorTitleId} className="text-lg sm:text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                      <div className="relative">
                        <button
                          type="button"
                          aria-label={t("itinerary_editor.choose_emoji")}
                          aria-expanded={showEmojiPicker}
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="w-11 h-11 flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/10 hover:bg-pink-50 dark:hover:bg-pink-950/30 rounded-[12px] transition-colors"
                        >
                          <IconImg value={editEmoji} size={20} />
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute top-12 left-0 p-3 bg-white/95 dark:bg-slate-900 rounded-3xl shadow-2xl border border-white dark:border-white/10 flex flex-wrap gap-2 w-48 animate-in zoom-in-95 duration-200 z-50">
                            {EMOJI_OPTIONS.map((e) => (
                              <button
                                key={e}
                                type="button"
                                aria-label={t("itinerary_editor.emoji_option", { emoji: e })}
                                onClick={() => {
                                  setEditEmoji(e);
                                  setShowEmojiPicker(false);
                                }}
                                className="w-11 h-11 flex items-center justify-center hover:bg-pink-50 dark:hover:bg-pink-950/30 rounded-[8px] transition-colors"
                              >
                                <IconImg value={e} size={24} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {t("itinerary_editor.title")}
                    </h2>
                    <button
                      type="button"
                      onClick={closeEditor}
                      aria-label={t("itinerary_editor.close")}
                      className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100/80 dark:bg-white/10 hover:text-rose-500 text-slate-500 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/55 ios-press transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Body (Form) */}
                  <div className="p-4 sm:p-6 pb-6 sm:pb-8 w-full flex-shrink-0 min-w-0">
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex flex-col gap-2">
                        <label htmlFor={editorPlaceId} className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                          {t("itinerary_editor.place")}
                        </label>
                        <input
                          id={editorPlaceId}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder={t("itinerary_editor.place_placeholder")}
                          className="outline-none w-full text-lg font-black text-slate-900 dark:text-slate-100 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-3xl px-5 py-2.5 hover:bg-white/80 dark:hover:bg-black/50 focus:bg-white/95 dark:focus:bg-black/60 focus:ring-2 focus:ring-pink-500/30 transition-all font-sans"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                          <label htmlFor={editorDateId} className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                            {t("itinerary_editor.date")}
                          </label>
                          <input
                            id={editorDateId}
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="outline-none w-full text-sm font-black text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-3xl px-4 py-2 hover:bg-white/80 dark:hover:bg-black/50 focus:bg-white/95 dark:focus:bg-black/60 focus:ring-2 focus:ring-pink-500/30 transition-all text-left flex items-center justify-between"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label htmlFor={editorTimeId} className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                            {t("itinerary_editor.time")}
                          </label>
                          <input
                            id={editorTimeId}
                            type="time"
                            inputMode="numeric"
                            step={300}
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="outline-none w-full text-sm font-black text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-3xl px-4 py-2 hover:bg-white/80 dark:hover:bg-black/50 focus:bg-white/95 dark:focus:bg-black/60 focus:ring-2 focus:ring-pink-500/30 transition-all text-left flex items-center justify-between"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label htmlFor={editorImageUrlId} className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                          {t("itinerary_editor.image_url")}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id={editorImageUrlId}
                            type="text"
                            value={editImageUrl}
                            onChange={(e) => setEditImageUrl(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                            className="outline-none flex-1 text-xs font-mono text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl px-4 py-2.5 hover:bg-white/80 dark:hover:bg-black/50 focus:bg-white/95 dark:focus:bg-black/60 focus:ring-2 focus:ring-pink-500/30 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowImageSearchModal(true)}
                            className="px-3.5 py-2.5 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-black shrink-0 flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <Sparkles size={13} />
                            <span>{t("itinerary_editor.search_image")}</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label htmlFor={editorDescriptionId} className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
                          {t("itinerary_editor.description")}
                        </label>
                        <textarea
                          id={editorDescriptionId}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder={t("itinerary_editor.description_placeholder")}
                          rows={5}
                          className="outline-none w-full text-sm font-bold text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-black/40 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-3xl px-5 py-3 hover:bg-white/80 dark:hover:bg-black/50 focus:bg-white/95 dark:focus:bg-black/60 focus:ring-2 focus:ring-pink-500/30 transition-all min-h-[140px] resize-y"
                        />
                      </div>
                      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20 px-4 py-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            {t("itinerary_editor.attachments")}
                          </span>
                          <label className="px-3 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-[11px] font-black uppercase tracking-widest cursor-pointer hover:opacity-95 ios-press transition-colors">
                            {t("itinerary_editor.upload")}
                            <input
                              type="file"
                              accept="image/*,.pdf,application/pdf"
                              multiple
                              className="hidden"
                              onChange={handleAttachmentUpload}
                            />
                          </label>
                        </div>
                        {editAttachments.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {editAttachments.map((attachment) => {
                              const isImage =
                                attachment.type.startsWith("image/");
                              return (
                                <div
                                  key={attachment.id}
                                  className="relative group/attachment rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-black/30 shadow-sm overflow-hidden"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      window.open(
                                        attachment.url,
                                        "_blank",
                                        "noopener,noreferrer",
                                      )
                                    }
                                    className={`flex items-center gap-2 ${isImage ? "p-1" : "px-3 py-2"} text-left`}
                                  >
                                    {isImage ? (
                                      <img
                                        src={attachment.url}
                                        alt={attachment.name}
                                        className="w-20 h-20 object-cover rounded-[12px]"
                                      />
                                    ) : (
                                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                        📄 {attachment.name}
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={t("itinerary_editor.remove_attachment", { name: attachment.name })}
                                    title={t("itinerary_editor.remove_attachment", { name: attachment.name })}
                                    onClick={() =>
                                      removeAttachment(attachment.id)
                                    }
                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 dark:bg-slate-800 text-slate-500 hover:text-rose-500 shadow-sm opacity-0 group-hover/attachment:opacity-100 transition-opacity flex items-center justify-center"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {t("itinerary_editor.no_attachments")}
                          </p>
                        )}
                      </div>
                      {facts && facts.length > 0 && (
                        <select
                          id={editorFactId}
                          aria-label={t("itinerary_editor.related_fact")}
                          value={editLinkedFactId}
                          onChange={(e) => setEditLinkedFactId(e.target.value)}
                          className="outline-none w-full text-sm font-bold text-slate-700 dark:text-slate-100 bg-white/70 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl px-4 py-2 focus:ring-2 focus:ring-pink-500/30 transition-all shadow-sm"
                        >
                          <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">{t("itinerary_editor.no_related_fact")}</option>
                          {facts.map((f) => (
                            <option key={f.id} value={f.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                              {f.title} ({f.factType})
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={handleSave}
                          className="px-6 py-2 rounded-full bg-gradient-to-r from-pink-700 to-rose-700 text-white text-[11px] font-black uppercase tracking-widest shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_12px_rgba(244,63,94,0.3)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_20px_rgba(244,63,94,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press"
                        >
                          {t("itinerary_editor.save")}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(false);
                            onEditingChange?.(item.node_id, item.day, false);
                          }}
                          className="px-6 py-2 rounded-full bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-200 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press"
                        >
                          {t("itinerary_editor.cancel")}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </AnimatePresence>,
            document.body,
          )}

        <SpotImageSearchModal
          isOpen={showImageSearchModal}
          onClose={() => setShowImageSearchModal(false)}
          initialQuery={item.title}
          currentImageUrl={item.image_url}
          onSelectImage={(selectedUrl) => {
            setEditImageUrl(selectedUrl);
            onUpdate({
              ...item,
              image_url: selectedUrl,
            });
            useAppStore.getState().showToast(t("itinerary_feedback.image_replaced", { title: item.title }), "success");
          }}
        />
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.item === next.item &&
      prev.collaboratingLock === next.collaboratingLock &&
      prev.isRecentlySynced === next.isRecentlySynced
    );
  },
);

const ReorderableItineraryItem = ({
  item,
  idx,
  items,
  nextItem,
  timeGapMinutes,
  timeGapStr,
  onDelete,
  onUpdate,
  onQuickExpense,
  isOffline,
  tripId,
  destination,
  tripStartDate,
  recentlySyncedNodeIds,
  onEditingChange,
  nodeEditingLocks,
  onPreviewImage,
  onRequireLogin,
}: {
  item: ItineraryNode;
  idx: number;
  items: ItineraryNode[];
  nextItem?: ItineraryNode;
  timeGapMinutes: number;
  timeGapStr: string;
  onDelete: (node_id: string) => void;
  onUpdate: (node: ItineraryNode) => void;
  onQuickExpense?: (node: ItineraryNode) => void;
  isOffline: boolean;
  tripId: string;
  destination: string;
  tripStartDate?: string | null;
  recentlySyncedNodeIds?: string[];
  onEditingChange?: (nodeId: string, day: number, isEditing: boolean) => void;
  nodeEditingLocks?: Record<string, { userName: string; day: number }>;
  onPreviewImage?: (url: string) => void;
  onRequireLogin?: (itemName?: string) => void;
}) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragControls={dragControls}
      dragListener={false}
      layout="position"
      initial={{ opacity: 0, y: 18, x: -10, scale: 0.98, height: 0, overflow: "hidden" }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1, height: "auto", transitionEnd: { overflow: "visible" } }}
      exit={{ opacity: 0, y: -12, x: 8, scale: 0.95, height: 0, overflow: "hidden", transition: { duration: 0.2 } }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 28,
        mass: 0.8,
        delay: Math.min(idx * 0.04, 0.3),
      }}
      onDragStart={() => selectionHaptic()}
      onDragEnd={() => impactHaptic([10, 32, 12])}
      className="flex flex-col w-full relative group/reorder"
    >
      <ItineraryListItem
        item={item}
        idx={idx}
        previousItem={idx > 0 ? items[idx - 1] : undefined}
        nextItem={nextItem}
        onDelete={onDelete}
        onUpdate={onUpdate}
        onQuickExpense={onQuickExpense}
        isOffline={isOffline}
        tripId={tripId}
        destination={destination}
        tripStartDate={tripStartDate}
        isRecentlySynced={recentlySyncedNodeIds?.includes(item.node_id)}
        onEditingChange={onEditingChange}
        collaboratingLock={nodeEditingLocks?.[item.node_id]}
        onPreviewImage={onPreviewImage}
        onRequireLogin={onRequireLogin}
      />

      {/* Drag handle for mobile/explicit drag */}
      <div
        className="absolute left-[-24px] sm:left-[-35px] top-1/2 -translate-y-1/2 opacity-60 sm:opacity-0 group-hover/reorder:opacity-100 transition-opacity p-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg shadow-none hover:shadow-sm z-20 md:touch-none touch-pan-x"
        style={{
          minHeight: "44px",
          minWidth: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onPointerDown={(event) => {
          dragControls.start(event);
        }}
      >
        <GripVertical size={20} className="sm:w-[20px] sm:h-[20px]" />
      </div>

      {nextItem && (
        <TransportGapIndicator
          item={item}
          nextItem={nextItem}
          timeGapMinutes={timeGapMinutes}
          timeGapStr={timeGapStr}
        />
      )}
    </Reorder.Item>
  );
};

export default function ItineraryList({
  items,
  day,
  onDelete,
  onUpdate,
  onReorder,
  onManualAdd,
  onOptimizeRoute,
  onQuickExpense,
  draggingFavorite,
  favoriteSuggestions,
  onFavoriteDrop,
  onAskAiForDay,
  onRandomizeFromFavorites,
  isOffline,
  aiLoading,
  isDayLoading,
  tripId,
  destination,
  tripStartDate,
  weather,
  recentlySyncedNodeIds,
  onEditingChange,
  nodeEditingLocks,
  onPreviewImage,
  onRequireLogin,
}: {
  items: ItineraryNode[];
  day: number;
  onDelete: (node_id: string) => void;
  onUpdate: (node: ItineraryNode) => void;
  onReorder: (newOrder: ItineraryNode[]) => void;
  onManualAdd: (node: Partial<ItineraryNode>) => void;
  onOptimizeRoute?: () => void;
  onQuickExpense?: (node: ItineraryNode) => void;
  draggingFavorite?: FavoriteSpot | null;
  favoriteSuggestions?: FavoriteSpot[];
  onFavoriteDrop?: (spot: FavoriteSpot, day: number) => void;
  onAskAiForDay?: () => void;
  onRandomizeFromFavorites?: () => void;
  isOffline: boolean;
  aiLoading: boolean;
  isDayLoading?: boolean;
  tripId: string;
  destination: string;
  tripStartDate?: string | null;
  weather?: any;
  recentlySyncedNodeIds?: string[];
  onEditingChange?: (nodeId: string, day: number, isEditing: boolean) => void;
  nodeEditingLocks?: Record<string, { userName: string; day: number }>;
  onPreviewImage?: (url: string) => void;
  onRequireLogin?: (itemName?: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [isFavoriteDragOver, setIsFavoriteDragOver] = useState(false);
  const [manualAddTrigger, setManualAddTrigger] = useState(0);
  const [aiQuoteIndex, setAiQuoteIndex] = useState(0);
  const [batchImageFetching, setBatchImageFetching] = useState(false);
  const itineraryDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" }),
    [i18n.language],
  );

  const handleBatchFetchSpotImages = async () => {
    if (batchImageFetching || !items || items.length === 0) return;
    setBatchImageFetching(true);
    useAppStore.getState().showToast(t("itinerary_day.batch_images_searching"), "info");

    let fetchedCount = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.image_url && item.title) {
        try {
          const res = await fetchSpotEnrichment(item.title);
          if (res.thumbnail) {
            onUpdate({ ...item, image_url: res.thumbnail });
            fetchedCount++;
          }
        } catch { /* ignore */ }
      }
    }

    setBatchImageFetching(false);
    if (fetchedCount > 0) {
      useAppStore.getState().showToast(t("itinerary_day.batch_images_completed", { count: fetchedCount }), "success");
    } else {
      useAppStore.getState().showToast(t("itinerary_day.batch_images_no_changes"), "info");
    }
  };
  const aiLoadingQuotes = [
    t("itinerary_day.quote_1"),
    t("itinerary_day.quote_2"),
    t("itinerary_day.quote_3"),
    t("itinerary_day.quote_4"),
    t("itinerary_day.quote_5"),
    t("itinerary_day.quote_6"),
    t("itinerary_day.quote_7"),
  ];
  const { displayed: aiQuoteDisplayed, done: aiQuoteDone } = useTypewriter(
    aiLoadingQuotes[aiQuoteIndex],
    40,
  );

  useEffect(() => {
    if (!draggingFavorite) {
      setIsFavoriteDragOver(false);
    }
  }, [draggingFavorite]);

  useEffect(() => {
    if (!aiLoading) {
      setAiQuoteIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setAiQuoteIndex((prev) => (prev + 1) % aiLoadingQuotes.length);
    }, 1600);

    return () => {
      window.clearInterval(timer);
    };
  }, [aiLoading, aiLoadingQuotes.length]);

  const getDailyWeather = () => {
    if (!weather || !weather.length) return null;
    // Assuming weather is a 14-day array, pick the one matching (day - 1)
    const dayWeather = weather[day - 1] ?? null;
    if (!dayWeather) return null;
    return dayWeather;
  };

  const dayWeather = getDailyWeather();
  const canDropFavorite = Boolean(
    draggingFavorite && !isOffline && onFavoriteDrop,
  );

  return (
    <div
      className={`flex flex-col gap-4 sm:gap-6 sm:mt-6 mt-2 min-h-[400px] rounded-[36px] transition-all ${isFavoriteDragOver ? "bg-fuchsia-50/30 ring-2 ring-fuchsia-300/60 ring-offset-4 ring-offset-transparent" : ""}`}
      onDragOver={(event) => {
        if (!canDropFavorite) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        if (!isFavoriteDragOver) setIsFavoriteDragOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFavoriteDragOver(false);
        }
      }}
      onDrop={(event) => {
        if (!canDropFavorite || !draggingFavorite) return;
        event.preventDefault();
        onFavoriteDrop?.(draggingFavorite, day);
        setIsFavoriteDragOver(false);
      }}
    >
      <AnimatePresence>
        {isFavoriteDragOver && draggingFavorite && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-2 sm:mx-0 rounded-[28px] border-2 border-dashed border-fuchsia-300 bg-white/80 px-5 py-4 text-center shadow-lg shadow-fuchsia-100/50"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-500">
              {t("itinerary_day.drop_title", { day })}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-700">
              {t("itinerary_day.drop_description", { title: draggingFavorite.title })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ─── 天氣預報跑馬燈及今日日期 ─── */}
      <div className="-mt-8 sm:-mt-14 mb-4 sm:mb-6 ml-6 sm:ml-10 relative z-15 flex flex-col gap-2.5 max-w-full overflow-hidden">
        {/* 天氣預報跑馬燈 */}
        {Array.isArray(weather) && weather.length > 0 && (
          <div className="relative flex items-center w-[280px] sm:w-[360px] md:w-[420px] h-[52px] bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-[20px] shadow-sm overflow-hidden select-none group transition-all duration-300 hover:shadow-md">
            {/* 左側漸變遮罩 */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/90 to-transparent z-10 pointer-events-none" />
            {/* 右側漸變遮罩 */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/90 to-transparent z-10 pointer-events-none" />
            
            <div className="flex min-w-max overflow-hidden">
              {/* 跑馬燈主體 - 第一組 */}
              <div className="flex gap-4 px-4 animate-marquee shrink-0">
                {weather.map((wVal: any, idx: number) => {
                  const rainProb = wVal.rain_prob ?? 0;
                  const emoji = rainProb > 50 ? "🌧️" : rainProb > 20 ? "⛅" : "☀️";
                  const isCurrentSelectedDay = idx === (day - 1);
                  return (
                    <div 
                      key={`marq1-${idx}`} 
                      className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] font-black tracking-wide border transition-all ${isCurrentSelectedDay ? "bg-fuchsia-500/10 border-fuchsia-300/60 text-fuchsia-700 shadow-sm shadow-fuchsia-100/50 scale-105" : "bg-slate-50/40 border-slate-100 text-slate-600"}`}
                    >
                      <span>{emoji}</span>
                      <span className="font-bold">D{idx + 1}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">|</span>
                      <span>{wVal.temp_min}°-{wVal.temp_max}°</span>
                      <span className="text-blue-400 font-bold ml-0.5">{rainProb}%</span>
                    </div>
                  );
                })}
              </div>
              {/* 跑馬燈主體 - 第二組 (無縫銜接) */}
              <div className="flex gap-4 px-4 animate-marquee shrink-0" aria-hidden="true">
                {weather.map((wVal: any, idx: number) => {
                  const rainProb = wVal.rain_prob ?? 0;
                  const emoji = rainProb > 50 ? "🌧️" : rainProb > 20 ? "⛅" : "☀️";
                  const isCurrentSelectedDay = idx === (day - 1);
                  return (
                    <div 
                      key={`marq2-${idx}`} 
                      className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] font-black tracking-wide border transition-all ${isCurrentSelectedDay ? "bg-fuchsia-500/10 border-fuchsia-300/60 text-fuchsia-700 shadow-sm shadow-fuchsia-100/50 scale-105" : "bg-slate-50/40 border-slate-100 text-slate-600"}`}
                    >
                      <span>{emoji}</span>
                      <span className="font-bold">D{idx + 1}</span>
                      <span className="text-slate-500 dark:text-slate-355 font-medium">|</span>
                      <span>{wVal.temp_min}°-{wVal.temp_max}°</span>
                      <span className="text-blue-400 font-bold ml-0.5">{rainProb}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 當天日期顯示在天氣預報卡片底下 */}
        {(() => {
          const rawDate = (tripStartDate && day) ? getDateForDay(day, tripStartDate) : null;
          const formattedDate = rawDate
            ? itineraryDateFormatter.format(new Date(`${rawDate}T12:00:00`))
            : null;
          return (
            <div className="flex items-center justify-between gap-2 pl-2 pr-4 flex-wrap">
              {formattedDate && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/60 backdrop-blur-md border border-slate-200/40 rounded-full shadow-sm text-[11px] font-black tracking-widest text-slate-600 uppercase">
                  <Calendar size={12} className="text-pink-400" />
                  <span>{formattedDate}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 mx-0.5" />
                  <span className="text-pink-500">{t("itinerary_day.day", { day })}</span>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleBatchFetchSpotImages}
                  disabled={isOffline || batchImageFetching || items.length === 0}
                  aria-busy={batchImageFetching}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-slate-200/80 dark:border-white/10 rounded-full shadow-2xs hover:shadow text-[11px] font-black tracking-wide transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title={t("itinerary_day.batch_images_title")}
                >
                  {batchImageFetching ? (
                    <Loader2 size={13} className="animate-spin text-indigo-600" />
                  ) : (
                    <Sparkles size={13} className="text-indigo-500 animate-pulse" />
                  )}
                  <span>{t("itinerary_day.batch_images")}</span>
                </button>
                {batchImageFetching && (
                  <p role="status" aria-live="polite" className="w-full text-sm font-medium text-indigo-700">
                    {t("itinerary_day.batch_images_searching")}
                  </p>
                )}
                {onOptimizeRoute && items.length >= 2 && (
                  <button
                    type="button"
                    onClick={onOptimizeRoute}
                    disabled={isOffline}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-fuchsia-700 to-indigo-700 hover:from-fuchsia-800 hover:to-indigo-800 text-white rounded-full shadow-md hover:shadow-lg text-[11px] font-black tracking-wide transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    title={t("itinerary_day.optimize_title")}
                  >
                    <Navigation2 size={13} className="rotate-45" />
                    <span>{t("itinerary_day.optimize")}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {isDayLoading && (
        <div className="flex flex-col gap-5 mt-4">
          <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Loader2 size={16} className="animate-spin text-fuchsia-600" />
            {t("itinerary_feedback.day_loading", { day })}
          </p>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`day-loading-${i}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
            >
              <ItinerarySkeletonCard />
            </motion.div>
          ))}
        </div>
      )}

      {!isDayLoading && items.length === 0 && !aiLoading && (
        <GlassCard className="!p-10 sm:!p-16 !rounded-[32px] sm:!rounded-[48px] border border-white/70 bg-gradient-to-b from-white/80 to-pink-50/55 flex flex-col items-center justify-center text-center backdrop-blur-2xl shadow-sm hover:shadow-xl transition-shadow duration-700 mx-2 sm:mx-0">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-[28px] sm:rounded-[40px] bg-gradient-to-br from-fuchsia-100 to-indigo-100 flex items-center justify-center text-4xl sm:text-6xl mb-6 sm:mb-8 shadow-xl shadow-fuchsia-200/40 border border-white hover:rotate-3 hover:scale-105 transition-all duration-300">
            🏝️
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 sm:mb-3 tracking-tight">
            {t("itinerary_day.empty_title")}
          </h3>
          <p className="text-slate-600 font-bold max-w-[360px] leading-relaxed text-[12px] tracking-[0.06em] px-4 text-center">
            {t("itinerary_day.empty_description")}
          </p>
          <div className="mt-8 flex w-full max-w-[340px] flex-col gap-3.5 sm:gap-4">
            <button
              type="button"
              onClick={() => onAskAiForDay?.()}
              disabled={isOffline}
              className="w-full rounded-[32px] bg-gradient-to-r from-fuchsia-700 to-indigo-700 px-5 py-4 sm:py-5 text-[15px] sm:text-[16px] font-black tracking-widest text-white shadow-[0_8px_20px_rgba(192,38,211,0.25)] transition-[transform,shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(192,38,211,0.35)] ios-press disabled:opacity-40 flex justify-center items-center gap-2 whitespace-nowrap transform-gpu"
            >
              ✨ {t("itinerary_day.ask_ai")}
            </button>
            <button
              type="button"
              onClick={() => onRandomizeFromFavorites?.()}
              disabled={isOffline || !favoriteSuggestions?.length}
              className="w-full rounded-[32px] bg-gradient-to-r from-sky-700 to-blue-700 px-5 py-4 sm:py-5 text-[15px] sm:text-[16px] font-black tracking-widest text-white shadow-[0_8px_20px_rgba(14,165,233,0.25)] transition-[transform,shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(14,165,233,0.35)] ios-press disabled:opacity-40 flex justify-center items-center gap-2 whitespace-nowrap transform-gpu"
            >
              📌 {t("itinerary_day.choose_favorites")}
            </button>
            <button
              type="button"
              onClick={() => setManualAddTrigger((prev) => prev + 1)}
              disabled={isOffline}
              className="w-full rounded-[32px] bg-gradient-to-r from-emerald-700 to-teal-700 px-5 py-4 sm:py-5 text-[15px] sm:text-[16px] font-black tracking-widest text-white shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-[transform,shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(16,185,129,0.35)] ios-press disabled:opacity-40 flex justify-center items-center gap-2 whitespace-nowrap transform-gpu"
            >
              ➕ {t("itinerary_day.add_manually")}
            </button>
          </div>
        </GlassCard>
      )}

      {aiLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col gap-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-indigo-100 bg-white/90 px-5 py-4 shadow-lg shadow-indigo-100/50"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sr-only">
              {t("itinerary_day.ai_planning_status", { day })}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-700 to-indigo-700 text-xl text-white shadow-lg shadow-fuchsia-200/50">
                ✨
              </div>
              <div className="min-w-0" aria-hidden="true">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-500">
                  {t("itinerary_day.ai_planning")}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {aiQuoteDisplayed}
                  <span
                    className={`inline-block w-[1.5px] h-[0.9em] ml-[1px] align-middle bg-indigo-400 ${aiQuoteDone ? "opacity-0" : "animate-pulse"}`}
                  />
                </p>
              </div>
            </div>
          </motion.div>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
            >
              <ItinerarySkeletonCard />
            </motion.div>
          ))}
        </motion.div>
      )}

      <Reorder.Group
        axis="y"
        values={items}
        onReorder={onReorder}
        className="flex flex-col gap-4 sm:gap-5"
      >
        <AnimatePresence key={`day-presence-${day}`} initial={true} mode="popLayout">
          {items.map((item: ItineraryNode, idx: number) => {
            const nextItem = items[idx + 1];
            let timeGapStr = "";
            let timeGapMinutes = 0;

            if (nextItem && item.time && nextItem.time) {
              const currentParts = item.time.split(":").map(Number);
              const nextParts = nextItem.time.split(":").map(Number);
              if (currentParts.length === 2 && nextParts.length === 2) {
                const currentMins = currentParts[0] * 60 + currentParts[1];
                const nextMins = nextParts[0] * 60 + nextParts[1];
                const diff = nextMins - currentMins;
                if (diff > 0) {
                  timeGapMinutes = diff;
                  const h = Math.floor(diff / 60);
                  const m = diff % 60;
                  timeGapStr =
                    h > 0
                      ? m > 0
                        ? t("itinerary_day.duration_hours", { hours: h, minutes: m })
                        : t("itinerary_day.duration_hours_only", { hours: h })
                      : t("itinerary_day.duration_minutes", { minutes: m });
                }
              }
            }
            return (
              <ReorderableItineraryItem
                key={item.node_id}
                item={item}
                idx={idx}
                items={items}
                nextItem={nextItem}
                timeGapMinutes={timeGapMinutes}
                timeGapStr={timeGapStr}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onQuickExpense={onQuickExpense}
                isOffline={isOffline}
                tripId={tripId}
                destination={destination}
                tripStartDate={tripStartDate}
                recentlySyncedNodeIds={recentlySyncedNodeIds}
                onEditingChange={onEditingChange}
                nodeEditingLocks={nodeEditingLocks}
                onPreviewImage={onPreviewImage}
                onRequireLogin={onRequireLogin}
              />
            );
          })}
        </AnimatePresence>
      </Reorder.Group>

      {/* Manual Add Node UI */}
      <ManualAddNode
        onAdd={onManualAdd}
        isOffline={isOffline}
        day={day}
        tripStartDate={tripStartDate}
        openTrigger={manualAddTrigger}
      />
    </div>
  );
}
