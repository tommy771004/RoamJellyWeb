import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Trash2 } from "lucide-react";
import type { FavoriteSpot } from "../../types/workflow";
import IconImg from "../ui/IconImg";
import { triggerHapticFeedback } from "../../lib/haptics";
import { fetchSpotEnrichment } from "../../lib/workflowApi";

export default function DraggableFavoriteSpot({
  spot,
  selectedDay,
  isOffline,
  onAdd,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  spot: FavoriteSpot;
  selectedDay: number;
  isOffline: boolean;
  onAdd: (spot: FavoriteSpot, day: number) => void;
  onDelete: (id: string) => void | Promise<void>;
  onDragStart?: (spot: FavoriteSpot) => void;
  onDragEnd?: () => void;
  key?: string;
}) {
  const [enrichment, setEnrichment] = useState<{
    description?: string;
    wiki_url?: string;
    thumbnail?: string;
  }>({});

  useEffect(() => {
    let cancelled = false;
    fetchSpotEnrichment(spot.title).then((data) => {
      if (!cancelled) setEnrichment(data);
    });
    return () => {
      cancelled = true;
    };
  }, [spot.title]);

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      draggable={!isOffline}
      onDragStart={(event: any) => {
        if (isOffline) return;
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", spot.id);
        triggerHapticFeedback([14]);
        onDragStart?.(spot);
      }}
      onDragEnd={() => {
        triggerHapticFeedback([10, 32, 12]);
        onDragEnd?.();
      }}
      className="group relative flex flex-col gap-2 p-3 bg-white/40 backdrop-blur-xl border border-white/60 sm:border sm:border-white/60 rounded-[20px] shadow-sm hover:shadow-xl transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[14px] bg-white flex items-center justify-center text-xl shadow-sm border border-slate-100/50 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
            {enrichment.thumbnail ? (
              <img
                src={enrichment.thumbnail}
                alt={spot.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <IconImg value={spot.emoji} size={20} />
            )}
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-[13px] leading-tight">
              {spot.title}
            </h4>
            <p className="text-[11px] font-black text-slate-500 mt-0.5 uppercase tracking-[0.1em]">
              口袋名單
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAdd(spot, selectedDay)}
            disabled={isOffline}
            className="w-11 h-11 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg ios-press transition-all hover:bg-slate-900"
            title="加入今天"
            aria-label={`將 ${spot.title} 加入 Day ${selectedDay}`}
          >
            <Plus size={16} strokeWidth={3} />
          </button>
          <button
            onClick={() => onDelete(spot.id)}
            aria-label={`刪除收藏「${spot.title}」`}
            className="w-11 h-11 rounded-full bg-white/50 text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {enrichment.description && (
        <div className="flex flex-col gap-1 pl-12">
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
            {enrichment.description}
          </p>
          {enrichment.wiki_url && (
            <a
              href={enrichment.wiki_url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-fuchsia-500 hover:underline"
            >
              維基百科 →
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}
