import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, MapPin, Calendar, Clock, Download } from 'lucide-react';
import { EXPERT_HANDBOOKS } from '../data/expertHandbooks';

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
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />

          {/* Modal panel */}
          <motion.div
            key="ehm-panel"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative w-full sm:max-w-3xl md:max-w-4xl bg-[#f8fafc] rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 sm:px-8 pt-6 sm:pt-8 pb-5 z-20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-200">
                    <img src={handbook.image} alt={handbook.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h1 className="font-extrabold text-slate-900 text-2xl sm:text-3xl tracking-tight leading-tight">
                      {handbook.title}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                       <span className="text-slate-500 font-bold text-sm tracking-wide bg-slate-100 px-2 py-0.5 rounded-md">
                         {handbook.author}
                       </span>
                       <span className="text-slate-400 font-medium text-xs tracking-wide flex items-center gap-1">
                         <Calendar size={14}/> {handbook.days} 天旅程
                       </span>
                       <span className="text-slate-400 font-medium text-xs tracking-wide flex items-center gap-1">
                         <MapPin size={14}/> {handbook.nodes.length} 個行程點
                       </span>
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
              <div className="mt-4 flex flex-wrap gap-2">
                {handbook.tags.map(tag => (
                   <span key={tag} className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md shadow-sm">
                     #{tag}
                   </span>
                ))}
              </div>
            </div>

            {/* Scrollable Intinerary List */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 py-6 z-10 scrollbar-hide space-y-8">
               {Object.entries(groupedNodes).map(([dayStr, nodesArray]) => {
                 const dayNum = parseInt(dayStr, 10);
                 return (
                   <div key={dayStr} className="relative">
                     <div className="flex items-center gap-4 mb-4">
                       <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-lg">
                         D{dayNum}
                       </div>
                       <h2 className="text-lg font-black text-slate-800 tracking-tight">第 {dayNum} 天行程</h2>
                       <div className="flex-1 h-px bg-slate-200/60" />
                     </div>

                     <div className="relative pl-5 ml-5 border-l-2 border-slate-200/60 space-y-4">
                       {nodesArray.map((node, i) => (
                         <div key={i} className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow group">
                           {/* Timeline Dot */}
                           <div className="absolute -left-[27px] top-6 w-3 h-3 rounded-full bg-white border-2 border-indigo-400 group-hover:scale-125 transition-transform" />
                           
                           <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start">
                             <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-slate-50 rounded-xl text-2xl border border-slate-100">
                               {node.emoji || '📍'}
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-start justify-between flex-wrap gap-2">
                                  <h3 className="font-extrabold text-slate-800 text-base leading-tight break-words">{node.title}</h3>
                                  <div className="flex gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getIntensityColor(node.category)}`}>
                                      {getCategoryLabel(node.category)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <Clock size={10} />
                                      {node.time || '10:00'}
                                    </span>
                                  </div>
                               </div>
                               {node.description && (
                                 <p className="mt-2 text-[13px] text-slate-500 font-medium leading-relaxed">
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
            <div className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between z-20">
              <p className="text-slate-400 text-[11px] sm:text-xs font-medium">
                此為達人分享之公開行程，可一鍵匯入為草稿。
              </p>
              <button
                onClick={() => {
                  onCopyPath(handbook);
                  handleClose();
                }}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <Download size={16} strokeWidth={2.5}/>
                <span>一鍵複製行程</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
