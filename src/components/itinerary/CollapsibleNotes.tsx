import React, { useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CollapsibleNotesProps {
  text: string;
  label: string;
  icon?: React.ReactNode;
}

export default function CollapsibleNotes({
  text,
  label,
}: CollapsibleNotesProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const disclosureId = useId().replace(/:/g, "");
  const triggerId = `note-${disclosureId}-trigger`;
  const panelId = `note-${disclosureId}-panel`;

  // Check if text is long enough to warrant line clamp/toggle
  const canToggle = text.length > 25 || text.includes("\n");

  const handleToggle = () => {
    if (isExpanded && panelRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus();
    }
    setIsExpanded((prev) => !prev);
  };

  return (
    <motion.div
      layout
      className="editorial-card-soft mt-2 rounded-[22px] bg-slate-50/50 border border-slate-100/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]"
    >
      {canToggle ? (
        <>
          <button
            ref={triggerRef}
            id={triggerId}
            type="button"
            aria-expanded={isExpanded}
            aria-controls={panelId}
            onClick={(event) => {
              event.stopPropagation();
              handleToggle();
            }}
            className="w-full rounded-[22px] px-3.5 py-3 text-left hover:bg-slate-100/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</span>
              <span className="text-[10px] sm:text-[11px] font-black text-sky-600 flex shrink-0 items-center gap-1">
                {isExpanded ? t("disclosure.collapse") : t("disclosure.more")}
                {isExpanded ? <ChevronUp size={11} aria-hidden="true" className="stroke-[3]" /> : <ChevronDown size={11} aria-hidden="true" className="stroke-[3]" />}
              </span>
            </span>
            {!isExpanded && (
              <span className="mt-1 block line-clamp-1 text-[12px] sm:text-[13px] font-medium leading-[1.68] text-slate-700">
                {text}
              </span>
            )}
          </button>
          <div ref={panelRef} id={panelId} aria-labelledby={triggerId} hidden={!isExpanded} className="px-3.5 pb-3">
            <p className="text-[12px] sm:text-[13px] font-medium text-slate-700 tracking-tight leading-[1.68] font-sans whitespace-pre-line text-pretty">
              {text}
            </p>
          </div>
        </>
      ) : (
        <p className="px-3.5 py-3 text-[12px] sm:text-[13px] font-medium text-slate-700 tracking-tight leading-[1.68] font-sans whitespace-pre-line text-pretty">
          {text}
        </p>
      )}
    </motion.div>
  );
}
