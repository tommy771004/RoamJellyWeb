import React, { useState, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, ChevronDown, Clock, MapPin, Pencil, Plus, X } from "lucide-react";
import type { ItineraryNode } from "../../types/workflow";
import IconImg from "../ui/IconImg";
import MapSelectorModal from "../MapSelectorModal";
import { EMOJI_OPTIONS, CATEGORY_OPTIONS, getDateForDay, getDayForDate } from "../../lib/itineraryUtils";
import { getModalMotion, getOverlayTransition } from "../../lib/motionTokens";
import { useTripFactsStore } from "../../store/useTripFactsStore";
import { useModalAccessibility } from "../../lib/useModalAccessibility";
import { useTranslation } from "react-i18next";

export default function ManualAddNode({
  onAdd,
  isOffline,
  day,
  tripStartDate,
  openTrigger,
}: {
  onAdd: (node: Partial<ItineraryNode>) => void;
  isOffline: boolean;
  day: number;
  tripStartDate?: string | null;
  openTrigger?: number;
}) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const dialogRef = useModalAccessibility(() => setIsAdding(false), isAdding);
  const titleId = useId();
  const itemNameId = useId();
  const dateInputId = useId();
  const timeInputId = useId();
  const locationInputId = useId();
  const descriptionInputId = useId();
  const transportInputId = useId();
  const imageUrlInputId = useId();
  const emojiInputId = useId();
  const categoryInputId = useId();
  const factInputId = useId();
  const [title, setTitle] = useState("");
  const [locationName, setLocationName] = useState("");
  const [date, setDate] = useState(getDateForDay(day, tripStartDate) || "");
  const [time, setTime] = useState("10:00");
  const [emoji, setEmoji] = useState("📍");
  const [category, setCategory] = useState("landmark");
  const [description, setDescription] = useState("");
  const [transportToNext, setTransportToNext] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isVisited, setIsVisited] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [linkedFactId, setLinkedFactId] = useState("");
  const facts = useTripFactsStore((s) => s.facts);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [isMapSelectorOpen, setIsMapSelectorOpen] = useState(false);

  useEffect(() => {
    if (!isAdding) {
      setDate(getDateForDay(day, tripStartDate) || "");
    }
  }, [day, tripStartDate, isAdding]);

  useEffect(() => {
    if (openTrigger && !isOffline) {
      setIsAdding(true);
    }
  }, [openTrigger, isOffline]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title,
      day: getDayForDate(date, tripStartDate, day),
      date,
      time,
      emoji,
      category,
      description: [
        locationName ? t("manual_add.location_prefix", { location: locationName }) : "",
        description,
      ]
        .filter(Boolean)
        .join("\n"),
      transport_to_next: transportToNext || undefined,
      image_url: imageUrl || undefined,
      is_visited: isVisited,
      linkedFactId: linkedFactId || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
    });
    setTitle("");
    setLocationName("");
    setCoords(null);
    setDescription("");
    setTransportToNext("");
    setImageUrl("");
    setDate(getDateForDay(day, tripStartDate) || "");
    setTime("10:00");
    setIsVisited(false);
    setLinkedFactId("");
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsAdding(true)}
        disabled={isOffline}
        className="w-full py-8 rounded-[48px] border-2 border-dashed border-slate-200 text-slate-500 font-black text-[15px] uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:border-pink-300 hover:text-pink-400 hover:bg-pink-50/20 transition-all shadow-sm disabled:opacity-30"
      >
        <div className="w-11 h-11 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-500 dark:text-slate-300 group-hover:bg-pink-100 group-hover:text-pink-400 transition-colors">
          <Plus size={20} />
        </div>
        {t("manual_add.add_item")}
      </motion.button>
    );
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-sheet flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={getOverlayTransition()}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setIsAdding(false)}
        />
        <motion.div
          ref={dialogRef}
          initial={getModalMotion().initial}
          animate={getModalMotion().animate}
          exit={getModalMotion().exit}
          transition={getModalMotion().transition}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl z-sheet-above overflow-hidden flex flex-col max-h-90dvh"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400 z-10" />
          <div className="p-5 sm:p-8 overflow-y-auto w-full pb-32">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[20px] bg-pink-50 flex items-center justify-center text-2xl">
                    🗓️
                  </div>
                  <div>
                    <h2 id={titleId} className="text-xl font-black text-slate-800 tracking-tight">
                      {t("manual_add.add_item")}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      {t("manual_add.day", { day: getDayForDate(date, tripStartDate, day) })}{" "}
                      {date ? `• ${date}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  aria-label={t("a11y.close_manual_add")}
                  className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-600 ios-press transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <label htmlFor={itemNameId} className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                  {t("manual_add.item_name")}
                </label>
                <div className="relative group">
                  <Pencil
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300 group-focus-within:text-pink-400 transition-colors"
                    size={18}
                  />
                  <input
                    id={itemNameId}
                    data-autofocus
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("manual_add.item_name_placeholder")}
                    className="w-full rounded-3xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg py-4 pl-12 pr-5 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-500 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <label htmlFor={dateInputId} className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    {t("manual_add.date")}
                  </label>
                  <div className="relative group">
                    <Calendar
                      size={18}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300 group-focus-within:text-pink-400 transition-colors"
                    />
                    <input
                      id={dateInputId}
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-3xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg py-4 pl-12 pr-5 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-500 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label htmlFor={timeInputId} className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    {t("manual_add.time")}
                  </label>
                  <div className="relative group">
                    <Clock
                      size={18}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300 group-focus-within:text-pink-400 transition-colors"
                    />
                    <input
                      id={timeInputId}
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full rounded-3xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg py-4 pl-12 pr-5 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-500 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label htmlFor={locationInputId} className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                  {t("manual_add.location")}
                </label>
                <div className="flex gap-2">
                  <div className="relative group flex-1">
                    <MapPin
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300 group-focus-within:text-pink-400 transition-colors"
                      size={18}
                    />
                    <input
                      id={locationInputId}
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder={t("manual_add.location_placeholder")}
                      className="w-full rounded-3xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg py-4 pl-12 pr-5 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-500 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapSelectorOpen(true)}
                    className="shrink-0 px-4 py-4 rounded-3xl bg-white border border-fuchsia-200 text-fuchsia-600 font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-fuchsia-50 hover:shadow-sm ios-press transition-all"
                  >
                    <MapPin size={16} />
                    {coords ? t("manual_add.coordinates_selected") : t("manual_add.map_select")}
                  </button>
                </div>
              </div>

                  <div className="flex flex-col gap-3">
                <label htmlFor={descriptionInputId} className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                  {t("manual_add.description")}
                </label>
                <textarea
                  id={descriptionInputId}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("manual_add.description_placeholder")}
                  className="w-full rounded-3xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg py-4 px-5 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-500 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50 min-h-[92px] resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <label htmlFor={transportInputId} className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    {t("manual_add.transport")}
                  </label>
                  <input
                    id={transportInputId}
                    value={transportToNext}
                    onChange={(e) => setTransportToNext(e.target.value)}
                    placeholder={t("manual_add.transport_placeholder")}
                    className="w-full rounded-3xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg py-4 px-5 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-500 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label htmlFor={imageUrlInputId} className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    {t("manual_add.image_url")}
                  </label>
                  <input
                    id={imageUrlInputId}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images..."
                    className="w-full rounded-3xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg py-4 px-5 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-500 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <label htmlFor={emojiInputId} className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    {t("manual_add.emoji")}
                  </label>
                  <div className="relative">
                    <button
                      id={emojiInputId}
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      aria-label={t("manual_add.emoji_picker")}
                      aria-expanded={showEmojiPicker}
                      className="w-full py-4 rounded-3xl bg-slate-50/50 border border-slate-100 flex items-center justify-center shadow-sm hover:border-pink-200 transition-all ios-press"
                    >
                      <IconImg value={emoji} size={28} />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-full mt-2 left-0 z-50 p-3 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-y-auto max-h-[160px] w-64 flex flex-wrap gap-2">
                        {EMOJI_OPTIONS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              setEmoji(em);
                              setShowEmojiPicker(false);
                            }}
                            aria-label={t("manual_add.emoji_option", { emoji: em })}
                            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${emoji === em ? "bg-pink-100 scale-110 shadow-sm" : "hover:bg-slate-50"}`}
                          >
                            <IconImg value={em} size={24} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label htmlFor={categoryInputId} className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    {t("manual_add.category")}
                  </label>
                  <div className="relative">
                    <select
                      id={categoryInputId}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-3xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg px-5 py-4 font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-500 transition-all appearance-none shadow-sm shadow-slate-100/50 dark:shadow-black/50 h-full"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {t(`itinerary_category.${opt}`)}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
              </div>

              {facts && facts.length > 0 && (
                <div className="flex flex-col gap-3">
                  <label htmlFor={factInputId} className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2">
                    {t("manual_add.travel_fact")}
                  </label>
                  <div className="relative">
                    <select
                      id={factInputId}
                      value={linkedFactId}
                      onChange={(e) => setLinkedFactId(e.target.value)}
                      className="w-full rounded-3xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg py-4 px-5 font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-500 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50 appearance-none"
                    >
                      <option value="">{t("manual_add.no_related_fact")}</option>
                      {facts.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.title} ({f.factType})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 px-4 py-3 rounded-3xl bg-slate-50/70 border border-slate-100 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={isVisited}
                  onChange={(e) => setIsVisited(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4"
                />
                {t("manual_add.completed")}
              </label>

              <button
                type="submit"
                className="w-full py-5 rounded-3xl bg-slate-900 text-white font-black text-[13px] uppercase tracking-[0.15em] shadow-lg hover:bg-slate-800 ios-press transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Plus size={18} strokeWidth={3} />
                {t("manual_add.submit", { day: getDayForDate(date, tripStartDate, day) })}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
      <MapSelectorModal
        isOpen={isMapSelectorOpen}
        onClose={() => setIsMapSelectorOpen(false)}
        onSelect={(lat, lng) => {
          setCoords({ lat, lng });
          if (!locationName)
            setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }}
      />
    </AnimatePresence>,
    document.body,
  );
}
