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
    <div className="relative -mx-6 sm:-mx-8">
      <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2 pt-1 px-6 sm:px-8 touch-pan-x snap-x">
        {areas.map((area) => (
          <button
            key={area}
            onClick={() => onChange(area)}
            className={`relative flex-shrink-0 text-[13px] font-bold px-5 py-2 rounded-full transition-all duration-300 snap-start ${
              active === area
                ? 'text-white shadow-md shadow-slate-900/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 bg-slate-50/50 border border-slate-200/80 shadow-sm'
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
        className={`bg-white rounded-[20px] border border-slate-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 overflow-hidden group ${colors.cardHover}`}
      >

        {/* Top row: area badge + emoji */}
        <div className="flex items-start justify-between px-5 pt-5 pb-2">
          <span className={`text-[11px] font-bold tracking-wide px-3 py-1 rounded-full border ${colors.badge} shadow-sm backdrop-blur-sm bg-white/50`}>
            {place.areaLabel}
          </span>
          <span className="text-3xl transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">{place.emoji}</span>
        </div>

        {/* Region name + intro */}
        <div className="px-5 pb-3">
          <h3 className="text-[22px] font-black text-slate-900 tracking-tight leading-tight group-hover:text-slate-800 transition-colors">{place.name}</h3>
          <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2 font-medium">{place.intro}</p>
        </div>

        {/* Preview chips */}
        {previewItems.length > 0 && (
          <div className="px-5 pb-4 flex flex-wrap gap-2">
            {previewItems.map((item) => (
              <span key={item} className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-[10px] max-w-[180px] truncate transition-colors group-hover:bg-slate-100/50">
                {item}
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="mx-5 border-t border-slate-100" />

        {/* Footer: tags + buttons */}
        <div className="flex items-center justify-between px-5 py-3.5 gap-3 bg-slate-50/50">
          <div className="flex gap-2 flex-wrap min-w-0 flex-1">
            {place.tags.slice(0, 3).map((tag) => (
              <span key={tag} className={`text-[11px] font-bold ${colors.text} bg-white px-2 py-0.5 rounded-md border ${colors.badge.split(' ').find(c => c.startsWith('border-'))} shadow-sm`}>#{tag}</span>
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap ${
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
              className="overflow-hidden bg-slate-50/80"
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
                <div className="flex flex-wrap gap-2 pt-4 mt-2 border-t border-slate-200/60">
                  {place.tags.map((tag) => (
                    <span key={tag} className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
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
            className="relative w-full sm:max-w-4xl md:max-w-5xl bg-[#f8fafc] rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden max-h-modal-dvh"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — fixed */}
            <div className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 sm:px-8 pt-6 sm:pt-8 pb-4 z-20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-5xl drop-shadow-sm">{guide.flag}</span>
                  <div>
                    <h1 className="font-extrabold text-slate-900 text-2xl sm:text-3xl tracking-tight leading-tight">
                      {guide.name}
                      <span className="font-medium text-slate-500 ml-2 text-xl sm:text-2xl">攻略</span>
                    </h1>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500">
                         <MapPin size={11} strokeWidth={2.5}/>
                      </div>
                      <p className="text-slate-500 font-medium text-xs tracking-wide">
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
              <p className="mt-4 text-[13.5px] text-slate-600 leading-relaxed font-medium max-w-3xl">{guide.intro}</p>
              <div className="mt-5 border-t border-slate-100 pt-3">
                <AreaTabs areas={areas} active={activeArea} onChange={setActiveArea} />
              </div>
            </div>

            {/* Scrollable card list */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 py-6 z-10 scrollbar-hide">
              {infoCards.length > 0 && (
                <div className="mb-6">
                  {activeArea === '全部' && (
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest px-1 whitespace-nowrap">基本資訊</h2>
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
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest px-1 whitespace-nowrap">各地區指南</h2>
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
            <div className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 px-6 sm:px-8 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] sm:pb-4 flex items-center justify-between z-20">
              <p className="text-slate-500 text-xs font-medium">
                內容來源：travel-guide-tw.github.io · CC BY-NC 4.0
              </p>
              <a
                href={guide.guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-slate-700 hover:text-slate-900 text-[13px] font-bold transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full whitespace-nowrap"
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
