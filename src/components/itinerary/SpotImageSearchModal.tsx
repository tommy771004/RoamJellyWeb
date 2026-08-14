import React, { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Image as ImageIcon, X, Check, Loader2, Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import { searchSpotImages, SpotImageCandidate, fetchSpotEnrichment } from "../../lib/workflowApi";
import { useTranslation } from "react-i18next";
import { useModalAccessibility } from "../../lib/useModalAccessibility";

interface SpotImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery: string;
  currentImageUrl?: string;
  onSelectImage: (imageUrl: string) => void;
}

export default function SpotImageSearchModal({
  isOpen,
  onClose,
  initialQuery,
  currentImageUrl,
  onSelectImage,
}: SpotImageSearchModalProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<SpotImageCandidate[]>([]);
  const [customUrl, setCustomUrl] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(currentImageUrl || null);
  const titleId = useId();
  const searchInputId = useId();
  const customUrlInputId = useId();

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedUrl(currentImageUrl || null);
      if (initialQuery.trim()) {
        handleSearch(initialQuery);
      }
    }
  }, [isOpen, initialQuery, currentImageUrl]);

  const handleSearch = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    try {
      // Fetch both image search and enrichment candidates
      const [searchRes, enrichRes] = await Promise.all([
        searchSpotImages(q),
        fetchSpotEnrichment(q),
      ]);

      const list: SpotImageCandidate[] = [];
      const seenUrls = new Set<string>();

      const addCandidate = (cand: SpotImageCandidate) => {
        if (cand?.url && !seenUrls.has(cand.url)) {
          seenUrls.add(cand.url);
          list.push(cand);
        }
      };

      if (enrichRes.thumbnail) {
        addCandidate({
          url: enrichRes.thumbnail,
          title: q,
          source: t("image_search.wiki_source"),
          description: enrichRes.description ? enrichRes.description.slice(0, 70) : t("image_search.landmark_description"),
        });
      }

      (enrichRes.candidates || []).forEach(addCandidate);
      (searchRes.candidates || []).forEach(addCandidate);

      setCandidates(list);
    } catch (err) {
      console.error("Image search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const dialogRef = useModalAccessibility(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-md dark-transition"
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 shadow-2xl p-5 sm:p-7 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider mb-2">
                <Sparkles size={13} className="animate-pulse" />
                {t("image_search.badge")}
              </div>
              <h2 id={titleId} className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t("image_search.title")}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {t("image_search.intro", { place: initialQuery })}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("image_search.close")}
              className="p-2.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 ios-press transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="flex items-center gap-2 mb-6"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id={searchInputId}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t("image_search.query")}
                placeholder={t("image_search.query_placeholder")}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/80 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              aria-busy={loading}
              className="px-5 py-3 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              <span>{loading ? t("image_search.searching") : t("image_search.search")}</span>
            </button>
          </form>

          {/* Image Candidate Grid */}
          <div className="min-h-[220px] max-h-[380px] overflow-y-auto pr-1 mb-6">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/80 animate-pulse border border-slate-200/50 dark:border-white/5"
                  />
                ))}
              </div>
            ) : candidates.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {candidates.map((cand, idx) => {
                  const isSelected = selectedUrl === cand.url;
                  return (
                    <button
                      key={`${cand.url}-${idx}`}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={t("image_search.select_candidate", { title: cand.title })}
                      onClick={() => setSelectedUrl(cand.url)}
                      className={`group relative flex flex-col rounded-2xl overflow-hidden border text-left transition-all duration-200 ${
                        isSelected
                          ? "border-indigo-600 ring-2 ring-indigo-500/50 shadow-lg scale-[1.02]"
                          : "border-slate-200/80 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:shadow-md"
                      }`}
                    >
                      <div className="relative w-full h-28 sm:h-32 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={cand.url}
                          alt={cand.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop";
                          }}
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/70 backdrop-blur-md text-[10px] font-black text-white tracking-wide">
                          {cand.source}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800/90 flex-1 flex flex-col justify-between">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                          {cand.title}
                        </div>
                        {cand.description && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {cand.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30">
                <ImageIcon className="mx-auto text-slate-400 mb-2" size={32} />
                <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                  {t("image_search.empty_title", { query })}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  {t("image_search.empty_description")}
                </p>
              </div>
            )}
          </div>

          {/* Custom URL input option */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex flex-col gap-3">
            <label htmlFor={customUrlInputId} className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {t("image_search.custom_url")}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={customUrlInputId}
                type="text"
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value);
                  if (e.target.value.trim()) {
                    setSelectedUrl(e.target.value.trim());
                  }
                }}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden"
              />
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t("image_search.cancel")}
              </button>
              <button
                type="button"
                disabled={!selectedUrl}
                onClick={() => {
                  if (selectedUrl) {
                    onSelectImage(selectedUrl);
                    onClose();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check size={16} />
                <span>{t("image_search.apply")}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
