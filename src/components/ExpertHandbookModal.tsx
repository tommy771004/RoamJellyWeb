import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, ExternalLink, MapPin, Calendar, Clock, Download } from 'lucide-react';
import { EXPERT_HANDBOOKS } from '../data/expertHandbooks';
import { getModalMotion, getOverlayTransition } from '../lib/motionTokens';

interface ExpertHandbookModalProps {
  open: boolean;
  onClose: () => void;
  handbook: typeof EXPERT_HANDBOOKS[0] | null;
  onCopyPath: (handbook: typeof EXPERT_HANDBOOKS[0]) => void;
}

export default function ExpertHandbookModal({ open, onClose, handbook, onCopyPath }: ExpertHandbookModalProps) {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  const prefersReducedMotion = useReducedMotion();
  const overlayTransition = getOverlayTransition(prefersReducedMotion);
  const modalMotion = getModalMotion(prefersReducedMotion);

  if (!handbook) return null;

  // Group nodes by day
  const groupedNodes = handbook.nodes.reduce((acc, node) => {
    const day = node.day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(node);
    return acc;
  }, {} as Record<number, typeof handbook.nodes>);

  const getIntensityColor = (category?: string) => {
    switch (category) {
      case 'food': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'activity': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'landmark': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'nightlife': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'hotel': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-teal-100 text-teal-700 border-teal-200';
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'food': return '美食';
      case 'activity': return '活動';
      case 'landmark': return '景點';
      case 'nightlife': return '夜生活';
      case 'hotel': return '住宿';
      default: return '其他';
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="ehm-backdrop"
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
            key="ehm-panel"
            initial={modalMotion.initial}
            animate={modalMotion.animate}
            exit={modalMotion.exit}
            transition={modalMotion.transition}
            className="relative flex max-h-modal-dvh w-full flex-col overflow-hidden rounded-t-[30px] border border-white/72 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,250,251,0.96),rgba(241,248,255,0.94))] shadow-[0_28px_64px_rgba(15,23,42,0.16)] sm:max-w-3xl sm:rounded-[36px] md:max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="z-20 flex-shrink-0 border-b border-white/78 bg-white/80 px-5 pb-4 pt-5 backdrop-blur-xl sm:px-7 sm:pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-[18px] border border-white/84 shadow-[0_8px_18px_rgba(15,23,42,0.06)] sm:h-[3.75rem] sm:w-[3.75rem]">
                    <img src={handbook.image} alt={handbook.title} width={64} height={64} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="fluid-title line-clamp-2 font-extrabold text-slate-900 sm:text-[30px]">
                      {handbook.title}
                    </h1>
                    <div className="flex items-center overflow-x-auto scrollbar-hide snap-x gap-x-3 gap-y-1 mt-2">
                       <span className="fluid-caption flex-shrink-0 snap-start rounded-md bg-slate-100 px-2 py-0.5 font-black tracking-[0.04em] text-slate-500">
                         {handbook.author}
                       </span>
                       <span className="fluid-kicker flex-shrink-0 snap-start flex items-center gap-1 font-medium uppercase text-slate-500">
                         <Calendar size={14}/> {handbook.days} 天旅程
                       </span>
                       <span className="fluid-kicker flex-shrink-0 snap-start flex items-center gap-1 font-medium uppercase text-slate-500">
                         <MapPin size={14}/> {handbook.nodes.length} 個行程點
                       </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  aria-label="關閉手帳"
                  className="w-10 h-10 rounded-full bg-slate-100/50 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 flex overflow-x-auto scrollbar-hide snap-x gap-2">
                {handbook.tags.map(tag => (
                   <span key={tag} className="fluid-kicker flex-shrink-0 snap-start rounded-md border border-slate-200 bg-slate-100 px-2 py-1 font-black uppercase text-slate-600 shadow-sm">
                     #{tag}
                   </span>
                ))}
              </div>
            </div>

            {/* Scrollable Intinerary List */}
            <div className="z-10 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3.5 py-5 scrollbar-hide sm:px-7 sm:py-6">
               {Object.entries(groupedNodes).map(([dayStr, nodesArray]) => {
                 const dayNum = parseInt(dayStr, 10);
                 return (
                   <div key={dayStr} className="relative">
                     <div className="mb-4 flex items-center gap-4">
                       <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-gradient-to-br from-sky-500 to-orange-400 text-[17px] font-black text-white shadow-[0_12px_26px_rgba(14,165,233,0.22)]">
                         D{dayNum}
                       </div>
                       <h2 className="text-[18px] font-black tracking-[-0.03em] text-slate-800">第 {dayNum} 天行程</h2>
                       <div className="flex-1 h-px bg-slate-200/60" />
                     </div>

                     <div className="relative ml-5 space-y-3.5 border-l-2 border-slate-200/60 pl-5">
                       {nodesArray.map((node, i) => (
                         <div key={i} className="group relative rounded-[22px] border border-white/86 bg-white/82 p-3.5 shadow-[0_10px_20px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_12px_24px_rgba(15,23,42,0.07)]">
                           {/* Timeline Dot */}
                           <div className="absolute -left-[27px] top-6 w-3 h-3 rounded-full bg-white border-2 border-indigo-400 group-hover:scale-125 transition-transform" />
                           
                           <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start">
                             <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] border border-slate-100 bg-slate-50 text-2xl">
                               {node.emoji || '📍'}
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-start justify-between flex-wrap gap-2">
                                  <h3 className="text-[15px] font-extrabold leading-[1.25] tracking-[-0.02em] text-slate-800 break-words sm:text-[16px]">{node.title}</h3>
                                  <div className="flex gap-2">
                                    <span className={`fluid-kicker rounded-full border px-2 py-0.5 font-black uppercase ${getIntensityColor(node.category)}`}>
                                      {getCategoryLabel(node.category)}
                                    </span>
                                    <span className="fluid-kicker flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-black uppercase text-slate-600">
                                      <Clock size={10} />
                                      {node.time || '10:00'}
                                    </span>
                                  </div>
                               </div>
                               {node.description && (
                                 <p className="fluid-body mt-2 font-medium text-slate-500">
                                   {node.description}
                                 </p>
                               )}
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 );
               })}
            </div>

            {/* Footer */}
            <div className="z-20 flex flex-shrink-0 items-center justify-between border-t border-white/78 bg-white/84 px-5 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] pt-4 backdrop-blur-xl sm:px-7 sm:py-4">
              <p className="fluid-caption font-medium text-slate-500">
                此為達人分享之公開行程，可一鍵匯入為草稿。
              </p>
              <button
                onClick={() => {
                  onCopyPath(handbook);
                  handleClose();
                }}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-orange-400 px-6 py-3 text-[14px] font-black tracking-[0.08em] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_24px_rgba(14,165,233,0.28)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_28px_rgba(14,165,233,0.34)] active:scale-[0.93]"
              >
                <Download size={16} strokeWidth={2.5}/>
                <span className="whitespace-nowrap">一鍵複製行程</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
