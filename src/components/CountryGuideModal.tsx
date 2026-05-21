import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, ExternalLink, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import type { CountryGuide, GuidePlace, AreaColor } from '../data/countryGuideData';
import { getModalMotion, getOverlayTransition } from '../lib/motionTokens';

// ─── Color helpers ────────────────────────────────────────────────────────────

const AREA_COLORS: Record<AreaColor, { badge: string; dot: string; text: string; line: string; cardHover: string }> = {
  sky:     { badge: 'bg-sky-50 text-sky-700 border-sky-200',         dot: 'bg-sky-400',     text: 'text-sky-600',     line: 'bg-sky-100',     cardHover: 'hover:border-sky-200/60' },
  teal:    { badge: 'bg-teal-50 text-teal-700 border-teal-200',      dot: 'bg-teal-400',    text: 'text-teal-600',    line: 'bg-teal-100',    cardHover: 'hover:border-teal-200/60' },
  indigo:  { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',dot: 'bg-indigo-400',  text: 'text-indigo-600',  line: 'bg-indigo-100',  cardHover: 'hover:border-indigo-200/60' },
  orange:  { badge: 'bg-orange-50 text-orange-700 border-orange-200',dot: 'bg-orange-400',  text: 'text-orange-600',  line: 'bg-orange-100',  cardHover: 'hover:border-orange-200/60' },
  rose:    { badge: 'bg-rose-50 text-rose-700 border-rose-200',      dot: 'bg-rose-400',    text: 'text-rose-600',    line: 'bg-rose-100',    cardHover: 'hover:border-rose-200/60' },
  violet:  { badge: 'bg-violet-50 text-violet-700 border-violet-200',dot: 'bg-violet-400',  text: 'text-violet-600',  line: 'bg-violet-100',  cardHover: 'hover:border-violet-200/60' },
  emerald: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',dot:'bg-emerald-400',text:'text-emerald-600', line: 'bg-emerald-100', cardHover: 'hover:border-emerald-200/60' },
  amber:   { badge: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400',   text: 'text-amber-600',   line: 'bg-amber-100',   cardHover: 'hover:border-amber-200/60' },
  blue:    { badge: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-400',    text: 'text-blue-600',    line: 'bg-blue-100',    cardHover: 'hover:border-blue-200/60' },
  purple:  { badge: 'bg-purple-50 text-purple-700 border-purple-200',dot: 'bg-purple-400',  text: 'text-purple-600',  line: 'bg-purple-100',  cardHover: 'hover:border-purple-200/60' },
  cyan:    { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',      dot: 'bg-cyan-400',    text: 'text-cyan-600',    line: 'bg-cyan-100',    cardHover: 'hover:border-cyan-200/60' },
  lime:    { badge: 'bg-lime-50 text-lime-700 border-lime-200',      dot: 'bg-lime-400',    text: 'text-lime-600',    line: 'bg-lime-100',    cardHover: 'hover:border-lime-200/60' },
  fuchsia: { badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',dot:'bg-fuchsia-400',text:'text-fuchsia-600',line:'bg-fuchsia-100', cardHover: 'hover:border-fuchsia-200/60' },
  slate:   { badge: 'bg-slate-100 text-slate-600 border-slate-200',  dot: 'bg-slate-400',   text: 'text-slate-500',   line: 'bg-slate-100',   cardHover: 'hover:border-slate-300/60' },
};

// ─── Area filter tabs ─────────────────────────────────────────────────────────

function AreaTabs({ areas, active, onChange }: { areas: string[]; active: string; onChange: (a: string) => void }) {
  return (
    <div className="relative -mx-5 sm:-mx-7">
      <div className="absolute left-0 top-0 bottom-0 z-10 w-5 sm:w-7 bg-gradient-to-r from-white/90 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 z-10 w-5 sm:w-7 bg-gradient-to-l from-white/90 to-transparent pointer-events-none" />
      
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 pb-1 pt-1 sm:px-7 touch-pan-x snap-x">
        {areas.map((area) => (
          <button
            key={area}
            onClick={() => onChange(area)}
            className={`fluid-caption relative snap-start flex-shrink-0 rounded-full px-4 py-2 font-black transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] ${
              active === area
                ? 'text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)]'
                : 'border border-white/84 bg-white/74 text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.05)] hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            {active === area && (
              <motion.div
                layoutId="areaTabIndicator"
                className="absolute inset-0 bg-slate-900 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 tracking-wide whitespace-nowrap">{area}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Expandable place card ────────────────────────────────────────────────────

function PlaceCard({ place, index }: { place: GuidePlace; index: number }) {
  const [open, setOpen] = useState(false);
  const colors = AREA_COLORS[place.areaColor];
  const previewItems = place.sections[0]?.items.slice(0, 3) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 350, damping: 25 }}
    >
      {/* ── Card shell ── */}
      <div 
        className={`group overflow-hidden rounded-[22px] border border-white/88 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,250,251,0.84),rgba(241,248,255,0.80))] shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition-all duration-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.09)] ${colors.cardHover}`}
      >

        {/* Top row: area badge + emoji */}
        <div className="flex items-start justify-between px-5 pt-5 pb-2">
          <span className={`fluid-kicker rounded-full border px-3 py-1 font-black uppercase ${colors.badge} shadow-sm backdrop-blur-sm bg-white/60`}>
            {place.areaLabel}
          </span>
          <span className="text-3xl transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">{place.emoji}</span>
        </div>

        {/* Region name + intro */}
        <div className="px-5 pb-3">
          <h3 className="fluid-title font-black text-slate-900 group-hover:text-slate-800 transition-colors">{place.name}</h3>
          <p className="fluid-body mt-1.5 line-clamp-3 text-slate-500 font-medium">{place.intro}</p>
        </div>

        {/* Preview chips */}
        {previewItems.length > 0 && (
          <div className="px-5 pb-4 flex overflow-x-auto scrollbar-hide gap-2 snap-x">
            {previewItems.map((item) => (
              <span key={item} className="fluid-kicker flex-shrink-0 snap-start max-w-[180px] truncate rounded-[10px] border border-slate-100 bg-slate-50 px-2.5 py-1 font-medium uppercase tracking-[0.08em] text-slate-500 transition-colors group-hover:bg-slate-100/50">
                {item}
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="mx-5 border-t border-slate-100" />

        {/* Footer: tags + buttons */}
        <div className="flex items-center justify-between px-5 py-3.5 gap-3 bg-slate-50/50">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide min-w-0 flex-1 snap-x">
            {place.tags.slice(0, 3).map((tag) => (
              <span key={tag} className={`fluid-kicker flex-shrink-0 snap-start rounded-md border bg-white px-2 py-0.5 font-black uppercase ${colors.text} ${colors.badge.split(' ').find(c => c.startsWith('border-'))} shadow-sm`}>#{tag}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {place.guideUrl !== '#' && (
              <a
                href={place.guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all shadow-sm group-hover:shadow"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              className={`fluid-caption flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-black transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] shadow-sm whitespace-nowrap ${
                open
                  ? 'bg-slate-200/80 text-slate-800 hover:bg-slate-300'
                  : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
              }`}
            >
              <span className="whitespace-nowrap">{open ? '收起' : '探索'}</span>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} />
              </motion.div>
            </button>
          </div>
        </div>

        {/* ── Accordion detail panel ── */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="overflow-hidden bg-slate-50/78"
            >
              <div className="border-t border-slate-100" />
              <div className="px-5 py-5 space-y-0">
                {/* Vertical timeline */}
                <div className="relative">
                  {/* Connecting line */}
                  <div className={`absolute left-[11px] top-4 bottom-4 w-0.5 ${colors.line} rounded-full`} />

                  {place.sections.map((section) => (
                    <div key={section.title} className="relative flex gap-4 mb-6 last:mb-0 group/section">
                      {/* Dot */}
                      <div className={`relative z-10 w-6 h-6 rounded-full ${colors.dot} flex-shrink-0 flex items-center justify-center mt-0.5 shadow-md ring-4 ring-white transition-transform group-hover/section:scale-110`}>
                        <span className="text-[11px] leading-none">{section.emoji}</span>
                      </div>

                      {/* Section content */}
                      <div className="flex-1 min-w-0 pb-1">
                        {/* Section header */}
                        <div className="bg-white rounded-[14px] px-3.5 py-2.5 mb-2.5 border border-slate-100 shadow-sm">
                          <span className="font-bold text-slate-800 text-[13px]">{section.title}</span>
                        </div>
                        {/* Items */}
                        <div className="space-y-2 px-1">
                          {section.items.map((item) => (
                            <div key={item} className="flex items-start gap-2.5 group/item">
                              <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0 mt-[7px] opacity-70 group-hover/item:opacity-100 transition-opacity`} />
                              <p className="text-[13px] text-slate-600 leading-relaxed font-medium">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tags */}
                <div className="mt-2 flex overflow-x-auto scrollbar-hide snap-x gap-2 border-t border-slate-200/60 pt-4">
                  {place.tags.map((tag) => (
                    <span key={tag} className="fluid-kicker flex-shrink-0 snap-start rounded-full border border-slate-200 bg-white px-2.5 py-1 font-black uppercase text-slate-500 shadow-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface CountryGuideModalProps {
  open: boolean;
  onClose: () => void;
  guide: CountryGuide;
}

export default function CountryGuideModal({ open, onClose, guide }: CountryGuideModalProps) {
  const [activeArea, setActiveArea] = useState('全部');
  const prefersReducedMotion = useReducedMotion();
  const overlayTransition = getOverlayTransition(prefersReducedMotion);
  const modalMotion = getModalMotion(prefersReducedMotion);

  const handleClose = useCallback(() => {
    setActiveArea('全部');
    onClose();
  }, [onClose]);

  const areas = ['全部', ...Array.from(new Set(guide.places.map((p) => p.areaLabel)))];

  const filtered =
    activeArea === '全部'
      ? guide.places
      : guide.places.filter((p) => p.areaLabel === activeArea);

  const infoCards = filtered.filter((p) => p.type === 'info');
  const regionCards = filtered.filter((p) => p.type !== 'info');

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="cgm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={overlayTransition}
          className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />

          {/* Modal panel */}
          <motion.div
            key="cgm-panel"
            initial={modalMotion.initial}
            animate={modalMotion.animate}
            exit={modalMotion.exit}
            transition={modalMotion.transition}
            className="relative flex max-h-modal-dvh w-full flex-col overflow-hidden rounded-t-[32px] border border-white/72 dark:border-white/10 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,250,251,0.96),rgba(241,248,255,0.94))] dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.98),rgba(15,23,42,0.96),rgba(2,6,23,0.94))] shadow-[0_28px_64px_rgba(15,23,42,0.16)] dark:shadow-[0_28px_64px_rgba(0,0,0,0.6)] sm:max-w-4xl sm:rounded-[32px] md:max-w-5xl outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — fixed */}
            <div className="z-20 flex-shrink-0 border-b border-white/78 bg-white/80 px-5 pb-4 pt-5 backdrop-blur-xl sm:px-7 sm:pt-7">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-5xl drop-shadow-sm">{guide.flag}</span>
                  <div>
                    <h1 className="fluid-title font-extrabold text-slate-900 sm:text-3xl">
                      {guide.name}
                      <span className="ml-2 text-[0.82em] font-medium text-slate-500">攻略</span>
                    </h1>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500">
                         <MapPin size={11} strokeWidth={2.5}/>
                      </div>
                      <p className="fluid-kicker font-medium uppercase text-slate-500">
                        travel-guide-tw · 共 {guide.places.length} 個地區
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full bg-slate-100/50 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="fluid-copy mt-4 max-w-3xl font-medium text-slate-600">{guide.intro}</p>
              <div className="mt-5 border-t border-slate-100 pt-3">
                <AreaTabs areas={areas} active={activeArea} onChange={setActiveArea} />
              </div>
            </div>

            {/* Scrollable card list */}
            <div className="z-10 flex-1 overflow-y-auto overscroll-contain px-3.5 py-5 scrollbar-hide sm:px-7 sm:py-6">
              {infoCards.length > 0 && (
                <div className="mb-6">
                  {activeArea === '全部' && (
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="fluid-kicker whitespace-nowrap px-1 font-black uppercase text-slate-800">基本資訊</h2>
                      <div className="flex-1 h-px bg-slate-200/60" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {infoCards.map((place, i) => (
                      <PlaceCard key={place.id} place={place} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {regionCards.length > 0 && (
                <div>
                  {activeArea === '全部' && infoCards.length > 0 && (
                    <div className="flex items-center gap-3 mt-4 mb-4">
                      <h2 className="fluid-kicker whitespace-nowrap px-1 font-black uppercase text-slate-800">各地區指南</h2>
                      <div className="flex-1 h-px bg-slate-200/60" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {regionCards.map((place, i) => (
                      <PlaceCard key={place.id} place={place} index={infoCards.length + i} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer — fixed */}
            <div className="z-20 flex flex-shrink-0 items-center justify-between border-t border-white/78 bg-white/84 px-5 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] pt-4 backdrop-blur-xl sm:px-7 sm:pb-4">
              <p className="fluid-caption font-medium text-slate-500">
                內容來源：travel-guide-tw.github.io · CC BY-NC 4.0
              </p>
              <a
                href={guide.guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="fluid-caption flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 font-black text-slate-700 transition-colors hover:bg-slate-200 hover:text-slate-900 whitespace-nowrap"
              >
                <ExternalLink size={13} strokeWidth={2.5} />
                查看全站
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
