import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { SPRING_SMOOTH } from '../../lib/motionTokens';

export default function CollapsibleAiNote({ text, label }: { text: string; label: string }) {
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
            onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
            className="mt-3 flex items-center gap-1.5 px-4 py-3 min-h-[44px] w-fit rounded-full bg-white/60 text-slate-500 text-[11px] font-black tracking-widest uppercase hover:bg-white/80 transition-colors border border-white/40"
          >
            <Lightbulb size={12} className="opacity-70" />
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
            className="bg-white/50 backdrop-blur-sm text-sm text-slate-700 p-3 rounded-2xl border border-white/40 mt-3 shadow-inner"
          >
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                <Lightbulb size={10} className="opacity-70" /> {label}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 px-3 py-2.5 min-h-[44px] flex items-center justify-center -mr-2 bg-white/50 hover:bg-white/80 rounded-[10px] transition-colors"
              >
                收起 <ChevronUp size={10} className="inline opacity-70 mb-[1px]" />
              </button>
            </div>
            <p className="text-[13px] sm:text-[14px] font-medium text-slate-700 tracking-tight leading-[1.6] font-sans whitespace-pre-line text-pretty mt-1.5">
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
