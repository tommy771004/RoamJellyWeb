import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IOS_EASE } from '../../lib/motionTokens';

export default function CollapsibleAiNote({ text, label }: { text: string; label: string }) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const disclosureId = useId().replace(/:/g, '');
  const triggerId = `ai-note-${disclosureId}-trigger`;
  const panelId = `ai-note-${disclosureId}-panel`;

  const toggle = () => {
    if (isExpanded && panelRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus();
    }
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="overflow-hidden">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={(event) => {
          event.stopPropagation();
          toggle();
        }}
        className="ios-press mt-3 flex min-h-[44px] w-fit items-center gap-1.5 rounded-full border border-white/40 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30"
      >
        <Lightbulb size={12} aria-hidden="true" className="opacity-70" />
        <span>{isExpanded ? t('disclosure.hide_label', { label }) : t('disclosure.show_label', { label })}</span>
        <ChevronDown size={12} aria-hidden="true" className={`opacity-70 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      {/*
        Previously this panel used the `hidden` attribute, so the note appeared
        and vanished in a single frame while the chevron animated — the two halves
        of one disclosure moving at different speeds. Same height transition as
        FaqSection so every disclosure in the app opens identically.
      */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="panel"
            ref={panelRef}
            id={panelId}
            aria-labelledby={triggerId}
            initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : { duration: 0.28, ease: IOS_EASE }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl border border-white/40 bg-white/50 p-3 text-sm text-slate-700 shadow-inner">
              <p className="text-base leading-6 text-slate-700 whitespace-pre-line text-pretty">
                {text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
