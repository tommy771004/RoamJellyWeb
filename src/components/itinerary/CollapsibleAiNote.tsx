import { useId, useRef, useState } from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function CollapsibleAiNote({ text, label }: { text: string; label: string }) {
  const { t } = useTranslation();
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
        className="mt-3 flex min-h-[44px] w-fit items-center gap-1.5 rounded-full border border-white/40 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30"
      >
        <Lightbulb size={12} aria-hidden="true" className="opacity-70" />
        <span>{isExpanded ? t('disclosure.hide_label', { label }) : t('disclosure.show_label', { label })}</span>
        <ChevronDown size={12} aria-hidden="true" className={`opacity-70 transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      <div
        ref={panelRef}
        id={panelId}
        aria-labelledby={triggerId}
        hidden={!isExpanded}
        className="mt-3 rounded-2xl border border-white/40 bg-white/50 p-3 text-sm text-slate-700 shadow-inner"
      >
        <p className="text-base leading-6 text-slate-700 whitespace-pre-line text-pretty">
          {text}
        </p>
      </div>
    </div>
  );
}
