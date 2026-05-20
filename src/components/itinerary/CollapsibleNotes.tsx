import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { SPRING_SMOOTH } from "../../lib/motionTokens";

interface CollapsibleNotesProps {
  text: string;
  label: string;
  icon?: React.ReactNode;
}

export default function CollapsibleNotes({
  text,
  label,
  icon = <FileText size={12} className="opacity-70" />,
}: CollapsibleNotesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div layout className="overflow-hidden">
      <AnimatePresence mode="popLayout">
        {!isExpanded ? (
          <motion.button
            key="collapsed"
            layout
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 w-fit rounded-full bg-slate-100/80 text-slate-500 text-[11px] font-black tracking-widest uppercase hover:bg-slate-200 transition-colors"
          >
            {icon}
            <span className="translate-y-px">展開 {label}</span>
            <ChevronDown size={12} className="opacity-70" />
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SPRING_SMOOTH}
            className="editorial-card-soft mt-2 rounded-[20px] px-3.5 py-3"
          >
            <div className="flex justify-between items-center mb-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                {label}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 px-2 py-1 -mr-2 bg-slate-100/50 hover:bg-slate-200/50 rounded-[10px] transition-colors"
              >
                收起{" "}
                <ChevronUp size={10} className="inline opacity-70 mb-[1px]" />
              </button>
            </div>
            <p className="text-[13px] sm:text-[14px] font-medium text-slate-700 tracking-tight leading-[1.78] font-sans whitespace-pre-line text-pretty mt-1.5">
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
