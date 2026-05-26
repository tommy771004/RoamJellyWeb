import React, { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleNotesProps {
  text: string;
  label: string;
  icon?: React.ReactNode;
}

export default function CollapsibleNotes({
  text,
  label,
}: CollapsibleNotesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if text is long enough to warrant line clamp/toggle
  const canToggle = text.length > 25 || text.includes("\n");

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  return (
    <motion.div
      layout
      onClick={handleToggle}
      className="editorial-card-soft mt-2 rounded-[22px] px-3.5 py-3 bg-slate-50/50 hover:bg-slate-100/50 border border-slate-100/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] group/notes cursor-pointer ios-press transition-all"
    >
      <div className="flex justify-between items-center mb-1 select-none">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
          <span>{label}</span>
          {canToggle && (
            <span className="text-[8px] font-black text-sky-600 tracking-normal normal-case bg-sky-50 px-1.5 py-[1px] rounded">
              點擊可展開/收起
            </span>
          )}
        </p>
        {canToggle && (
          <span className="text-[10px] sm:text-[11px] font-black text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors">
            {isExpanded ? (
              <>
                收起 <ChevronUp size={11} className="stroke-[3]" />
              </>
            ) : (
              <>
                更多 <ChevronDown size={11} className="stroke-[3]" />
              </>
            )}
          </span>
        )}
      </div>

      <p
        className={`text-[12px] sm:text-[13px] font-medium text-slate-700 tracking-tight leading-[1.68] font-sans whitespace-pre-line text-pretty mt-1 transition-all ${
          isExpanded ? "line-clamp-none" : "line-clamp-1"
        }`}
      >
        {text}
      </p>
    </motion.div>
  );
}
