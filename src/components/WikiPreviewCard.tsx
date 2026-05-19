import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ExternalLink, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { useWikiSearch, WikiInfo } from '../hooks/useWikiSearch';

interface WikiPreviewCardProps {
  query: string;
}

export function WikiPreviewCard({ query }: WikiPreviewCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [wikiData, setWikiData] = useState<WikiInfo | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { searchWiki, loading, error } = useWikiSearch();

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    
    setIsOpen(true);
    if (!hasSearched && !wikiData) {
      // First time opening, perform search
      setHasSearched(true);
      const data = await searchWiki(query);
      if (data) setWikiData(data);
    }
  };

  return (
    <div className="mt-2 w-full">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all bg-white/60 hover:bg-white/90 text-sky-600 border border-sky-200/50 hover:border-sky-300 shadow-sm hover:shadow active:scale-95"
      >
        <BookOpen size={13} strokeWidth={2.5} />
        維基百科介紹
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            className="overflow-hidden"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-[24px] p-4 sm:p-5 border border-sky-100 shadow-[0_12px_24px_-8px_rgba(14,165,233,0.15),inset_0_1px_0_rgba(255,255,255,1)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-sky-50/40 pointer-events-none" />
              <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100/50 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors z-10 active:scale-90"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
              
              <div className="relative z-10">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-3 text-sky-500">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-[11px] font-bold tracking-widest uppercase animate-pulse">載入中...</span>
                  </div>
                ) : error ? (
                  <div className="py-6 text-center text-slate-500 text-sm font-medium">
                    無法取得維基百科資訊
                  </div>
                ) : wikiData ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-4">
                      {wikiData.thumbnail ? (
                        <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-[18px] overflow-hidden bg-slate-100 border border-white shadow-md relative">
                          <img 
                            src={wikiData.thumbnail.source} 
                            alt={wikiData.title}
                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-[18px]" />
                        </div>
                      ) : (
                        <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-[18px] bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 shadow-inner">
                          <ImageIcon size={32} strokeWidth={1.5} />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="text-[16px] xl:text-[18px] font-black text-slate-800 leading-tight mb-1">
                          {wikiData.title}
                        </h4>
                        {wikiData.description && (
                          <div className="text-[12px] font-bold text-sky-600/90 mb-2 line-clamp-1">
                            {wikiData.description}
                          </div>
                        )}
                        <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-4 font-medium tracking-wide">
                          {wikiData.extract}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-3 mt-1 border-t border-slate-200/50">
                      <a 
                        href={wikiData.content_urls.desktop.page}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-sky-50 transition-colors text-[11px] font-black tracking-widest uppercase text-slate-500 hover:text-sky-600 border border-slate-200 hover:border-sky-300 shadow-sm active:scale-95"
                      >
                        <ExternalLink size={13} strokeWidth={2.5} />
                        在維基百科上閱讀完整內容
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-500 text-[12px] font-bold">
                    找不到相關的維基百科條目
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
