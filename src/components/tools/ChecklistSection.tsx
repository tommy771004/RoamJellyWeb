import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { CloudRain, Check, Sparkles, Sun, Send, CheckCircle2, Plane, Star, ExternalLink, SlidersHorizontal, ArrowDownUp, Loader2, CalendarDays, MapPin, ArrowRight, ChevronDown, ChevronUp, AlertCircle, CreditCard, Layers, Grid } from "lucide-react";
import GlassCard from "../GlassCard";
import IconImg from "../ui/IconImg";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import { useToolsTabContext } from "./toolsTabContext";
import { useToolsStore } from "../../store/useToolsStore";
import { AiRateLimitedError, suggestPackingList } from "../../lib/openrouterApi";
import { getCurrentSeason, guessCategoryFromItem } from "../../lib/checklist";
import { updateChecklist } from "../../lib/workflowApi";
import type { ChecklistCategory, ChecklistItem } from "../../types/workflow";

export default function ChecklistSection({ className }: { className?: string }) {
  const {
    state: { checklist, tripInfo, members },
    actions,
  } = useToolsTabContext();
  const { isOffline, activeTripId, showToast } = useAppStore();
  const { setChecklist } = useToolsStore();
  const packedCount = checklist.filter((i) => i.checked).length;

  // Local state for customized AI Packing list generator
  const [customDest, setCustomDest] = useState(tripInfo?.destination ?? "");
  const [customSeason, setCustomSeason] = useState(getCurrentSeason());
  const [customPeople, setCustomPeople] = useState(members?.length || 1);
  const [customDays, setCustomDays] = useState(tripInfo?.days || 5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [suggestedItems, setSuggestedItems] = useState<{ text: string; category: ChecklistCategory; selected: boolean }[] | null>(null);

  // Sync inputs with tripInfo and members once loaded
  useEffect(() => {
    if (tripInfo?.destination) {
      setCustomDest(tripInfo.destination);
    }
    if (tripInfo?.days) {
      setCustomDays(tripInfo.days);
    }
  }, [tripInfo]);

  useEffect(() => {
    if (members && members.length > 0) {
      setCustomPeople(members.length);
    }
  }, [members]);

  // Loading indicator step rotation
  useEffect(() => {
    let timer: any;
    if (isGenerating) {
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 4);
      }, 2200);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(timer);
  }, [isGenerating]);

  const loadingMessages = [
    "🔍 正在連線 OpenRouter 觀測目的地的氣象狀況...",
    "🌡️ 正在根據與該季節氣溫條件，評估最適切的服飾規格...",
    "🧑‍💼 正在針對您填寫的參訪人數與天數，挑選推薦備件明細...",
    "📦 正在將物品依證件、盥洗、電子線材進行智慧分箱..."
  ];

  const handleStartAiPacking = async () => {
    if (!customDest.trim()) {
      showToast("請輸入目標目的地", "warning");
      return;
    }
    setIsGenerating(true);
    setSuggestedItems(null);
    try {
      const suggestions = await suggestPackingList(customDest, customSeason, customPeople, customDays);
      const modeled = suggestions.map((text) => ({
        text,
        category: guessCategoryFromItem(text),
        selected: true,
      }));
      setSuggestedItems(modeled);
      showToast(`✨ AI 推薦行李產生成功！共有 ${suggestions.length} 項精選物品。`, "success");
    } catch (err: any) {
      if (err instanceof AiRateLimitedError) {
        showToast(err.message, "warning");
      } else {
        showToast("產生推薦清單失敗，請確認 API Key 是否設定。", "warning");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePreviewSelect = (idx: number) => {
    if (!suggestedItems) return;
    const copied = [...suggestedItems];
    copied[idx].selected = !copied[idx].selected;
    setSuggestedItems(copied);
  };

  const handleImportToTripList = async () => {
    if (!suggestedItems) return;
    const selectedItems = suggestedItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      showToast("請至少選取一項要載入的推薦物品！", "warning");
      return;
    }

    const newItems: ChecklistItem[] = selectedItems.map((item, i) => ({
      id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${i}`,
      text: item.text,
      checked: false,
      category: item.category,
    }));

    const nextChecklist = [...checklist, ...newItems];
    setChecklist(nextChecklist);

    if (activeTripId) {
      void updateChecklist({ trip_id: activeTripId, items: nextChecklist }).catch(() => {
        // non-blocking
      });
    }
    showToast(`✨ 已成功匯入 ${newItems.length} 項行李物品！`, "success");
    setSuggestedItems(null);
  };

  return (
    <section className={cn("font-sans flex flex-col", className)}>
      <div className="flex justify-between items-end mb-4 sm:mb-6 px-1 sm:px-2">
        <h2 className="text-balance text-[26px] sm:text-[28px] font-black text-slate-900">
          旅途清單
        </h2>
        <span className="text-[11px] sm:text-xs uppercase font-black text-sky-700 bg-sky-100/90 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-sky-200 shrink-0 ml-2">
          已整理 {packedCount}/{checklist.length}
        </span>
      </div>

      <GlassCard className="!p-4 sm:!p-6 mb-4 sm:mb-6 glass-panel shadow-md hover:shadow-xl flex-1 flex flex-col h-full overflow-y-auto min-h-[300px]">
        {checklist.length === 0 && (
          <span className="text-sm text-slate-500">
            目前沒有行李項目
          </span>
        )}
        {(() => {
          const CAT_META: Record<string, { label: string; emoji: string }> = {
            documents: { label: "證件", emoji: "passport" },
            electronics: { label: "電子", emoji: "🔌" },
            clothing: { label: "服裝", emoji: "👕" },
            toiletries: { label: "盥洗", emoji: "towel" },
            other: { label: "其他", emoji: "backpack" },
          };
          const ORDER = [
            "documents",
            "electronics",
            "clothing",
            "toiletries",
            "other",
          ];
          const grouped = ORDER.map((cat) => {
            const itemsInCategory = checklist.filter(
              (i: any) => (i.category ?? "other") === cat
            );
            // Sort: unchecked items first, checked items last for physical sliding transitions on check
            const sortedItems = [...itemsInCategory].sort((a, b) => {
              if (a.checked === b.checked) return 0;
              return a.checked ? 1 : -1;
            });
            return {
              cat,
              meta: CAT_META[cat],
              items: sortedItems,
            };
          }).filter((g) => g.items.length > 0);

          return (
            <motion.div layoutRoot className="flex flex-col gap-3">
              {grouped.map(({ cat, meta, items: catItems }) => (
                <motion.div
                  layout
                  key={cat}
                  className="editorial-card-soft mb-3 rounded-[28px] p-4 last:mb-0 shadow-sm border border-slate-100 bg-white/40 backdrop-blur-md"
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 28,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <IconImg value={meta.emoji} size={18} />
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                      {meta.label}
                    </span>
                    <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100/65 px-2 py-0.5 rounded-full">
                      {catItems.filter((i) => i.checked).length}/{catItems.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {catItems.map((item: any) => (
                      <motion.label
                        layout
                        key={item.id}
                        className={`flex items-center gap-4 group p-3.5 min-h-[56px] rounded-3xl border transition-all ${
                          isOffline
                            ? "opacity-50 cursor-not-allowed border-slate-100 bg-slate-50/50"
                            : item.checked
                            ? "cursor-pointer border-slate-100 bg-emerald-50/15 hover:bg-emerald-50/30 text-slate-400 shadow-sm/50"
                            : "cursor-pointer border-slate-100 hover:border-slate-200/80 bg-white/80 dark:bg-slate-900/40 hover:bg-white text-[#2C302E] shadow-sm hover:shadow-md"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          if (!isOffline) actions.toggleCheck(item);
                        }}
                        whileHover={isOffline ? {} : { scale: 1.012, y: -1 }}
                        whileTap={isOffline ? {} : { scale: 0.985 }}
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 24,
                        }}
                      >
                        <div className="relative w-6.5 h-6.5 flex items-center justify-center shrink-0">
                          <input
                            readOnly
                            checked={item.checked}
                            className="peer sr-only"
                            type="checkbox"
                          />
                          <motion.div
                            animate={
                              item.checked
                                ? { scale: [1, 1.25, 1], backgroundColor: "#10b981" }
                                : { scale: 1, backgroundColor: "#f8fafc" }
                            }
                            transition={{
                              type: "spring",
                              stiffness: 700,
                              damping: 22,
                            }}
                            className={`w-full h-full rounded-full border shadow-inner ${
                              item.checked ? "border-emerald-500" : "border-slate-300"
                            }`}
                          />
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            initial={false}
                            animate={
                              item.checked
                                ? { scale: 1, opacity: 1, rotate: [0, 15, 0] }
                                : { scale: 0.5, opacity: 0 }
                            }
                            transition={{
                              type: "spring",
                              stiffness: 800,
                              damping: 18,
                            }}
                          >
                            <Check
                              size={12}
                              className="text-white"
                              strokeWidth={4.5}
                            />
                          </motion.div>
                        </div>
                        <motion.span
                          layout="position"
                          animate={
                            item.checked
                              ? { opacity: 0.5, x: 2 }
                              : { opacity: 1, x: 0 }
                          }
                          className={`text-[15px] font-bold ${
                            item.checked ? "line-through text-slate-400 font-medium" : "text-[#2C302E]"
                          }`}
                        >
                          {item.text}
                        </motion.span>
                      </motion.label>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          );
        })()}
      </GlassCard>

      {/* Brand New Custom AI Packing List Generator Section */}
      <GlassCard className="!p-5 sm:!p-6 mb-4 border-pink-100 bg-pink-50/15 relative overflow-hidden rounded-[2.5rem]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-200/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-200/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-pink-500 animate-pulse" />
          <h3 className="text-lg font-black text-slate-800">AI 推薦行李助手</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Destination & Days */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-pack-dest" className="text-xs font-black text-slate-600">目的地</Label>
            <Input
              id="ai-pack-dest"
              value={customDest}
              onChange={(e) => setCustomDest(e.target.value)}
              placeholder="例如：東京, 首爾"
              className="bg-white/90"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-pack-days" className="text-xs font-black text-slate-600">天數 (天)</Label>
            <Input
              id="ai-pack-days"
              type="number"
              min={1}
              value={customDays}
              onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-white/90"
            />
          </div>

          {/* Season & People */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-pack-season" className="text-xs font-black text-slate-600">預計季節</Label>
            <select
              id="ai-pack-season"
              value={customSeason}
              onChange={(e) => setCustomSeason(e.target.value)}
              className="flex h-11 w-full rounded-xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg text-slate-800 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 shadow-sm shadow-slate-100/50 dark:shadow-black/50 appearance-none cursor-pointer"
            >
              <option value="春季">春季 (3~5月)</option>
              <option value="夏季">夏季 (6~8月)</option>
              <option value="秋季">秋季 (9~11月)</option>
              <option value="冬季">冬季 (12~2月)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-pack-people" className="text-xs font-black text-slate-600">同行人數</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCustomPeople((p) => Math.max(1, p - 1))}
                className="h-11 w-11 rounded-xl shrink-0 border-slate-200 bg-white"
              >
                -
              </Button>
              <Input
                id="ai-pack-people"
                type="number"
                min={1}
                value={customPeople}
                onChange={(e) => setCustomPeople(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-white/95 text-center font-bold h-11"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCustomPeople((p) => p + 1)}
                className="h-11 w-11 rounded-xl shrink-0 border-slate-200 bg-white"
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Generate Button using brand new macaron-gradient */}
        <button
          type="button"
          onClick={handleStartAiPacking}
          disabled={isGenerating || isOffline}
          className="macaron-gradient text-sky-900 font-extrabold text-[14px] leading-none tracking-wide h-12 w-full flex items-center justify-center gap-2 rounded-full shadow-[0_4px_14px_rgba(244,114,182,0.18)] hover:shadow-[0_6px_20px_rgba(244,114,182,0.28)] hover:-translate-y-0.5 ios-press duration-200 transition-all border border-pink-200 cursor-pointer disabled:opacity-50 disabled:-translate-y-0 select-none font-sans"
        >
          <Sparkles size={16} />
          {isGenerating ? "AI 智慧推薦大師正在包裝規劃中..." : "開始產生 AI 推薦清單"}
        </button>

        {/* Animated Loading Steps */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 bg-white/60 rounded-3xl p-4 border border-pink-100 flex flex-col gap-3 font-sans opacity-95"
            >
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="text-pink-500 animate-spin" />
                <span className="text-xs font-black text-pink-600 leading-none">AI Packing Intelligence</span>
              </div>
              <p className="text-xs text-slate-600 font-bold tracking-tight">
                {loadingMessages[loadingStep]}
              </p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full macaron-gradient"
                  initial={{ width: "0%" }}
                  animate={{ width: `${(loadingStep + 1) * 25}%` }}
                  transition={{ duration: 1.5 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggested Items Preview */}
        <AnimatePresence>
          {suggestedItems && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-6 flex flex-col gap-4 bg-white/95 rounded-[28px] p-4 sm:p-5 border border-pink-100 shadow-[0_8px_30px_rgb(244,114,182,0.06)]"
            >
              <div className="flex items-center justify-between border-b border-pink-50 pb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">AI recommendations</span>
                  <span className="text-sm font-black text-slate-800">AI 推薦打包清單</span>
                </div>
                <span className="text-xs font-black text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
                  {suggestedItems.filter((i) => i.selected).length}/{suggestedItems.length} 選用
                </span>
              </div>

              <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                {suggestedItems.map((item, idx) => {
                  const CAT_META: Record<string, { label: string; emoji: string }> = {
                    documents: { label: "證件", emoji: "🛂" },
                    electronics: { label: "電子", emoji: "🔌" },
                    clothing: { label: "服裝", emoji: "👕" },
                    toiletries: { label: "盥洗", emoji: "🧼" },
                    other: { label: "其他", emoji: "🎒" },
                  };
                  const meta = CAT_META[item.category] || CAT_META.other;

                  return (
                    <div
                      key={idx}
                      onClick={() => togglePreviewSelect(idx)}
                      className={`flex items-center gap-3 p-3 rounded-3xl border transition-all cursor-pointer select-none min-h-[50px] ${
                        item.selected
                          ? "border-pink-200 bg-pink-50/20 hover:bg-pink-50/35"
                          : "border-slate-100 bg-transparent opacity-60 hover:opacity-100 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          readOnly
                          className="sr-only"
                        />
                        <div
                          className={`w-full h-full rounded-md border transition-colors flex items-center justify-center ${
                            item.selected ? "bg-fuchsia-600 border-fuchsia-600 text-white" : "bg-white border-slate-300"
                          }`}
                        >
                          {item.selected && <Check size={12} strokeWidth={4} />}
                        </div>
                      </div>

                      <div className="flex flex-col flex-1 min-w-0 font-bold">
                        <span className="text-xs text-[#2C302E] leading-normal break-words">
                          {item.text}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-inner">
                        <span className="text-xs select-none">{meta.emoji}</span>
                        <span className="text-[10px] font-bold text-slate-500 tracking-wider">
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSuggestedItems(null)}
                  className="rounded-full h-11 font-bold text-slate-500 border-slate-200"
                >
                  關閉預覽
                </Button>
                <Button
                  size="sm"
                  onClick={handleImportToTripList}
                  className="macaron-gradient border border-pink-200 text-sky-900 font-extrabold rounded-full h-11 shadow-sm hover:shadow ios-press duration-150"
                >
                  匯入旅途清單
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </section>
  );
}
