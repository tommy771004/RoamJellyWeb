import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Loader2, CreditCard, Layers, Grid, BarChart3, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import GlassCard from "../GlassCard";
import IconImg from "../ui/IconImg";
import { Input  } from "../ui/input";
import { Label  } from "../ui/label";
import { Button  } from "../ui/button";
import { cn  } from "../../lib/utils";
import { useAppStore  } from "../../store/useAppStore";
import { useToolsTabContext  } from "./toolsTabContext";

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string; keywords: string[] }> = {
  dining: {
    label: "餐飲美食",
    icon: "🍔",
    color: "#f43f5e",
    keywords: ["餐", "飯", "麵", "吃", "食", "咖啡", "茶", "酒", "肉", "冰", "甜點", "宵夜", "點心", "拉麵", "壽司", "燒肉", "水果", "超商", "7-11", "全家", "買菜", "food", "dine", "drink", "coffee", "tea", "cafe", "restaurant", "lunch", "dinner", "breakfast"]
  },
  transport: {
    label: "交通出行",
    icon: "🚆",
    color: "#0284c7",
    keywords: ["車", "捷運", "地鐵", "火車", "高鐵", "新幹線", "機票", "公車", "巴士", "船", "租車", "油錢", "加油", "停車", "計程車", "taxi", "uber", "pass", "悠遊卡", "西瓜卡", "suica", "icoca", "flight", "train", "bus", "subway"]
  },
  lodging: {
    label: "住宿飯店",
    icon: "🏨",
    color: "#6366f1",
    keywords: ["飯店", "酒店", "旅館", "民宿", "住宿", "房", "hotel", "airbnb", "booking", "agoda", "stay", "resort"]
  },
  tickets: {
    label: "景點門票",
    icon: "🎫",
    color: "#10b981",
    keywords: ["門票", "票", "迪士尼", "環球影城", "展覽", "體驗", "溫泉", "樂園", "景點", "纜車", "ticket", "museum", "park", "pass", "entrance", "show", "tour"]
  },
  shopping: {
    label: "購物伴手禮",
    icon: "🛍️",
    color: "#f59e0b",
    keywords: ["購物", "買", "伴手禮", "免稅", "藥妝", "禮物", "百貨", "outlet", "服飾", "紀念品", "雜貨", "shop", "store", "buy", "gift", "duty free"]
  },
  others: {
    label: "其他雜項",
    icon: "💡",
    color: "#64748b",
    keywords: []
  }
};

function classifyExpenseTitle(title: string): string {
  const lower = (title || "").toLowerCase();
  for (const [key, cfg] of Object.entries(CATEGORY_CONFIG)) {
    if (cfg.keywords.some((kw) => lower.includes(kw))) {
      return key;
    }
  }
  return "others";
}

export default function LedgerSection({ className }: { className?: string }) {
  const {
    state: { form, errors, members, submitting, expenses },
    actions,
  } = useToolsTabContext();
  const { isOffline } = useAppStore();
  const [newMemberName, setNewMemberName] = useState("");
  const [walletViewMode, setWalletViewMode] = useState<"deck" | "grid">("deck");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const availableCurrencies = useMemo(() => {
    if (!expenses || expenses.length === 0) return ["JPY"];
    return Array.from(new Set(expenses.map((e) => e.currency || "JPY")));
  }, [expenses]);

  const [selectedCurrencyChart, setSelectedCurrencyChart] = useState<string>("JPY");

  useEffect(() => {
    if (availableCurrencies.length > 0 && !availableCurrencies.includes(selectedCurrencyChart)) {
      setSelectedCurrencyChart(availableCurrencies[0]);
    }
  }, [availableCurrencies, selectedCurrencyChart]);

  const categoryChartData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    
    const currExpenses = expenses.filter((e) => (e.currency || "JPY") === selectedCurrencyChart);
    const categoryTotals: Record<string, number> = {
      dining: 0,
      transport: 0,
      lodging: 0,
      tickets: 0,
      shopping: 0,
      others: 0,
    };

    currExpenses.forEach((exp) => {
      const cat = classifyExpenseTitle(exp.title);
      const amt = parseFloat(exp.amount.toString()) || 0;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    });

    const grandTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    return Object.entries(CATEGORY_CONFIG)
      .map(([key, cfg]) => {
        const amount = categoryTotals[key] || 0;
        const percentage = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
        return {
          key,
          label: cfg.label,
          icon: cfg.icon,
          name: `${cfg.icon} ${cfg.label}`,
          amount,
          percentage,
          color: cfg.color,
        };
      })
      .filter((item) => item.amount > 0 || grandTotal === 0);
  }, [expenses, selectedCurrencyChart]);

  const handleAddMember = () => {
    const name = newMemberName.trim();
    if (!name) return;
    actions.addCustomMember(name);
    setNewMemberName("");
  };

  const getCardStyle = (currency: string) => {
    switch (currency) {
      case "JPY":
        return {
          bg: "bg-gradient-to-br from-[#f43f5e] via-[#e11d48] to-[#9f1239] text-white shadow-[0_12px_24px_rgba(244,63,94,0.15)]",
          accent: "text-rose-300",
          glow: "bg-rose-400/20 shadow-inner",
          chip: "from-amber-200 via-rose-300 to-amber-500",
          brand: "🌸 Sakura Gold",
        };
      case "USD":
        return {
          bg: "bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#020617] text-white border border-[#334155] shadow-[0_12px_24px_rgba(15,23,42,0.25)]",
          accent: "text-slate-400",
          glow: "bg-slate-400/10 shadow-inner",
          chip: "from-slate-100 via-slate-300 to-slate-500",
          brand: "💎 Platinum Reserve",
        };
      case "TWD":
        return {
          bg: "bg-gradient-to-br from-[#0d9488] via-[#0f766e] to-[#134e4a] text-teal-100 shadow-[0_12px_24px_rgba(13,148,136,0.15)]",
          accent: "text-teal-300",
          glow: "bg-teal-400/20 shadow-inner",
          chip: "from-amber-200 via-teal-300 to-amber-500",
          brand: "🍃 Emerald Jade",
        };
      case "EUR":
        return {
          bg: "bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#1e1b4b] text-indigo-100 shadow-[0_12px_24px_rgba(79,70,229,0.15)]",
          accent: "text-indigo-300",
          glow: "bg-indigo-400/20 shadow-inner",
          chip: "from-amber-200 via-indigo-300 to-amber-500",
          brand: "🇪🇺 Royal Twilight",
        };
      case "KRW":
        return {
          bg: "bg-gradient-to-br from-[#0b132b] via-[#1c2541] to-[#3a506b] text-sky-100 shadow-[0_12px_24px_rgba(28,37,65,0.15)]",
          accent: "text-sky-300",
          glow: "bg-cyan-500/10 shadow-inner",
          chip: "from-amber-100 via-sky-300 to-amber-500",
          brand: "🇰🇷 Cardinal Navy",
        };
      case "THB":
        return {
          bg: "bg-gradient-to-br from-[#ea580c] via-[#c2410c] to-[#7c2d12] text-orange-100 shadow-[0_12px_24px_rgba(234,88,12,0.15)]",
          accent: "text-orange-300",
          glow: "bg-orange-400/25 shadow-inner",
          chip: "from-amber-100 via-orange-200 to-amber-400",
          brand: "⛱️ Sunset Bronze",
        };
      default:
        return {
          bg: "bg-gradient-to-br from-[#0284c7] via-[#0369a1] to-[#0c4a6e] text-sky-100 shadow-[0_12px_24px_rgba(2,132,199,0.15)]",
          accent: "text-sky-300",
          glow: "bg-sky-400/25 shadow-inner",
          chip: "from-amber-100 via-sky-300 to-amber-500",
          brand: "✈️ RoamJelly Global",
        };
    }
  };

  return (
    <GlassCard className={cn("!p-4 sm:!p-6 flex flex-col relative overflow-hidden transition-all duration-300 glass-panel shadow-md hover:shadow-xl", className)}>
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-pink-100/45 rounded-full blur-[24px] pointer-events-none" />
      <div className="absolute -bottom-12 -right-8 w-36 h-36 bg-sky-100/35 rounded-full blur-[28px] pointer-events-none" />
      <div className="mb-6 flex items-start justify-between gap-4 relative z-10 px-2">
        <div>
          <span className="inline-flex items-center rounded-full border border-pink-100 dark:border-pink-900/50 bg-white/88 dark:bg-pink-950/40 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-pink-700 dark:text-pink-300 shadow-sm dark-transition">
            Trip Split
          </span>
          <h3 className="mt-3 text-balance text-[26px] sm:text-[28px] font-black text-slate-900 dark:text-white dark-transition">
            記帳與分帳
          </h3>
        </div>
        <div className="shrink-0 rounded-[28px] border border-white/80 dark:border-white/10 bg-white/82 dark:bg-slate-900/60 px-4 py-3 text-right shadow-sm dark-transition">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">本趟摘要</div>
          <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{expenses.length} 筆</div>
          <div className="text-[12px] font-bold text-slate-500 dark:text-slate-400">{members.length || 0} 位旅伴</div>
        </div>
      </div>

      <div className="flex-grow flex-1 overflow-y-auto no-scrollbar flex flex-col gap-y-5 relative z-10 pr-0.5 sm:pr-1.5 pb-2">
        {/* Recent Expenses List as Interactive Wallet */}
        {expenses && expenses.length > 0 && (
          <div className="flex flex-col gap-4 mb-4 w-full rounded-[32px] border border-white/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/50 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all dark-transition">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                <CreditCard size={13} className="text-pink-500 animate-pulse" />
                最新旅伴分帳卡包
              </span>
              
              {/* Toggle layout mode */}
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-full border border-slate-200/50 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setWalletViewMode("deck")}
                  className={`flex items-center gap-1 px-3 py-1 text-[11px] font-extrabold rounded-full transition-all ${
                    walletViewMode === "deck"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Layers size={11} />
                  卡包
                </button>
                <button
                  type="button"
                  onClick={() => setWalletViewMode("grid")}
                  className={`flex items-center gap-1 px-3 py-1 text-[11px] font-extrabold rounded-full transition-all ${
                    walletViewMode === "grid"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Grid size={11} />
                  格狀
                </button>
              </div>
            </div>

            {/* Deck view mode */}
            {walletViewMode === "deck" && (
              <div className="relative pt-2 pb-14 w-full flex flex-col items-center">
                <div className="relative w-full max-w-[340px] sm:max-w-md h-[210px] sm:h-[235px] my-3">
                  {expenses
                    .slice()
                    .reverse()
                    .slice(0, 4) // Show up to 4 stacked cards
                    .map((exp, idx, arr) => {
                      const total = arr.length;
                      const offset = total - 1 - idx; // Top-most (latest) is 0
                      const cardStyle = getCardStyle(exp.currency);
                      const isSelected = selectedCardId === exp.id || (selectedCardId === null && offset === 0);
                      
                      const scale = 1 - offset * 0.04;
                      const translateY = offset * 14;
                      const rotate = isSelected ? 0 : (offset % 2 === 0 ? 2 : -2) * offset;
                      
                      return (
                        <motion.div
                          key={exp.id}
                          layoutId={`card-${exp.id}`}
                          className={`absolute inset-x-0 mx-auto w-full max-w-[340px] aspect-[1.58/1] rounded-[24px] p-4 sm:p-5 shadow-lg select-none cursor-pointer flex flex-col justify-between overflow-hidden transition-all duration-300 ${cardStyle.bg}`}
                          style={{
                            zIndex: 10 + idx,
                            transformOrigin: "bottom center",
                          }}
                          animate={{
                            scale,
                            y: translateY,
                            rotate,
                          }}
                          whileHover={{
                            scale: scale * 1.03,
                            y: translateY - 12,
                            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                            zIndex: 50,
                          }}
                          whileTap={{ scale: scale * 0.98 }}
                          onClick={() => setSelectedCardId(exp.id)}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 24,
                          }}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/12 pointer-events-none mix-blend-overlay ${cardStyle.glow}`} />
                          
                          <div className="flex items-center justify-between w-full relative z-10">
                            <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-[0.16em] ${cardStyle.accent}`}>
                              {cardStyle.brand}
                            </span>
                            <div className="flex items-center gap-1.5 opacity-80">
                              <span className="text-[9px] font-black tracking-widest uppercase py-0.5 px-2 bg-white/15 rounded-full border border-white/10 text-white">
                                {exp.currency} PAY
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3.5 w-full relative z-10 my-1">
                            {/* EMV gold smart chip */}
                            <div className={`w-8 h-5.5 bg-gradient-to-br ${cardStyle.chip} rounded-[5px] relative overflow-hidden border border-amber-500/20 shadow-sm shrink-0`}>
                              <div className="absolute inset-0 opacity-15 border-r border-b border-black"></div>
                              <div className="absolute top-1/2 left-0 right-0 h-[10%] bg-black/10"></div>
                              <div className="absolute left-1/2 top-0 bottom-0 w-[10%] bg-black/10"></div>
                            </div>
                            <h4 className="text-[16px] sm:text-[18px] font-black tracking-tight truncate leading-tight drop-shadow-sm flex-1 text-white">
                              {exp.title}
                            </h4>
                          </div>

                          <div className="relative z-10 flex flex-col gap-1 w-full">
                            <div className="text-[14px] sm:text-[16px] font-mono tracking-[0.2em] font-extrabold tabular-nums opacity-95 text-white">
                              {exp.currency} •••• {parseFloat(exp.amount.toString()).toLocaleString()}
                            </div>
                            
                            <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                              <span className={cardStyle.accent}>
                                HOLDER / <span className="text-white font-extrabold ml-1">{exp.payer}</span>
                              </span>
                              <span className={`${cardStyle.accent} flex items-center gap-1`}>
                                SPLIT / <span className="bg-white/12 px-1.5 py-0.5 rounded text-white font-mono font-bold leading-none">{exp.splitWith?.length || 1} PAX</span>
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
                
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-slate-100/90 border border-slate-200 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-500 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899]"></span>
                  果凍漫遊卡包 • 點擊切換檢視卡
                </div>
              </div>
            )}

            {/* Grid display mode */}
            {walletViewMode === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {expenses
                  .slice()
                  .reverse()
                  .map((exp) => {
                    const cardStyle = getCardStyle(exp.currency);
                    const isSelected = selectedCardId === exp.id;
                    return (
                      <motion.div
                        key={exp.id}
                        layoutId={`card-${exp.id}`}
                        className={`w-full aspect-[1.58/1] rounded-[24px] p-4 sm:p-5 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between overflow-hidden relative group/card transition-all ${cardStyle.bg}`}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedCardId(isSelected ? null : exp.id)}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/12 pointer-events-none mix-blend-overlay ${cardStyle.glow}`} />

                        <div className="flex items-center justify-between w-full relative z-10">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.16em] ${cardStyle.accent}`}>
                            {cardStyle.brand}
                          </span>
                          <span className="text-[9px] font-black tracking-widest uppercase py-0.5 px-2 bg-white/15 rounded-full border border-white/10 text-white">
                            {exp.currency} PAY
                          </span>
                        </div>

                        <div className="flex items-center gap-3 w-full relative z-10 my-1">
                          <div className={`w-8 h-5.5 bg-gradient-to-br ${cardStyle.chip} rounded-[5px] relative overflow-hidden border border-amber-500/20 shadow-sm shrink-0`}>
                            <div className="absolute inset-0 opacity-15 border-r border-b border-black"></div>
                          </div>
                          <h4 className="text-[15px] sm:text-[16px] font-black tracking-tight truncate leading-tight text-white flex-1">
                            {exp.title}
                          </h4>
                        </div>

                        <div className="relative z-10 flex flex-col gap-1 w-full">
                          <div className="text-[13px] sm:text-[14px] font-mono tracking-[0.18em] font-extrabold tabular-nums opacity-95 text-white">
                            {exp.currency} •••• {parseFloat(exp.amount.toString()).toLocaleString()}
                          </div>
                          
                          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                            <span className={cardStyle.accent}>
                              Holder / <span className="text-white font-extrabold ml-1">{exp.payer}</span>
                            </span>
                            <span className={`${cardStyle.accent} flex items-center gap-1`}>
                              Split / <span className="bg-white/12 px-1 rounded text-white font-mono font-bold leading-none">{exp.splitWith?.length || 1} PAX</span>
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}

            {/* Expandable Active Card Details */}
            <AnimatePresence>
              {(() => {
                const activeCard = expenses.find((e) => e.id === selectedCardId) || expenses[expenses.length - 1];
                if (!activeCard) return null;
                return (
                  <motion.div
                    key={`detail-${activeCard.id}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-slate-100 pt-3 mt-1"
                  >
                    <div className="bg-slate-50/70 rounded-3xl p-4 border border-slate-100 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[9px] font-black text-slate-400 tracking-widest leading-none">正在檢視</div>
                          <h5 className="text-[14px] sm:text-[15px] font-black text-slate-800 mt-1 flex items-center gap-1.5 flex-wrap">
                            {activeCard.title}
                            <span className="text-[11px] font-bold font-mono text-pink-600 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full">
                              {activeCard.currency} {parseFloat(activeCard.amount.toString()).toLocaleString()}
                            </span>
                          </h5>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">代墊付款</span>
                          <span className="text-xs font-extrabold text-[#2C302E] bg-white shadow-sm border border-slate-200 px-2.5 py-1 rounded-full inline-block mt-1">
                            👑 {activeCard.payer}
                          </span>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200/50 my-0.5" />

                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          共同分攤對象 ({activeCard.splitWith?.length || 0} 位旅伴)
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activeCard.splitWith && activeCard.splitWith.map((p) => (
                            <div
                              key={p}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold shadow-sm transition-all ${
                                p === activeCard.payer
                                  ? "bg-amber-50/90 border-amber-200 text-amber-700"
                                  : "bg-white border-slate-200 text-slate-600"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${p === activeCard.payer ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                              {p}
                              {p === activeCard.payer && (
                                <span className="text-[9px] font-black bg-amber-500/15 text-amber-600 px-1 rounded-full scale-90">Payer</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            <div className="h-px w-full bg-slate-100 dark:bg-white/10 my-1" />
          </div>
        )}

        {/* 費用類別分佈分析 (Recharts Bar Chart) */}
        <div className="flex flex-col gap-4 mb-4 w-full rounded-[32px] border border-white/90 dark:border-white/10 bg-white/70 dark:bg-slate-900/50 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all dark-transition">
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
            <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5 leading-none">
              <BarChart3 size={15} className="text-indigo-500 animate-pulse" />
              費用類別分佈 (Recharts 分析圖表)
            </span>

            {/* Currency selector tabs for chart */}
            {availableCurrencies.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-full border border-slate-200/60 dark:border-white/10">
                {availableCurrencies.map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setSelectedCurrencyChart(cur)}
                    className={`px-2.5 py-0.5 text-[10px] font-black rounded-full transition-all ${
                      selectedCurrencyChart === cur
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            )}
          </div>

          {expenses && expenses.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="w-full h-56 sm:h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 12, right: 10, left: -15, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.18)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }}
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99, 102, 241, 0.08)', radius: 8 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 text-white border border-white/20 px-3.5 py-2.5 rounded-2xl text-xs font-bold shadow-2xl backdrop-blur-md">
                              <div className="flex items-center gap-1.5 text-pink-300 font-black">
                                <span>{data.icon}</span>
                                <span>{data.label}</span>
                              </div>
                              <div className="text-base font-black text-white mt-1 font-mono">
                                {selectedCurrencyChart} {data.amount.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-300 font-bold mt-0.5">
                                佔整體費用比例：<span className="text-emerald-400 font-black">{data.percentage}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="amount" radius={[10, 10, 0, 0]} maxBarSize={48}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category Pills Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-white/10">
                {categoryChartData.map((cat) => (
                  <div
                    key={cat.key}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
                        {cat.icon} {cat.label}
                      </span>
                    </div>
                    <div className="text-right shrink-0 font-mono font-black text-slate-900 dark:text-white pl-1">
                      {cat.amount > 0 ? (
                        <>
                          <span>{selectedCurrencyChart} {cat.amount.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-sans block font-semibold">({cat.percentage}%)</span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-sans text-[11px] font-medium">$0</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-bold border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
              <p>尚未記錄任何花費，新增下方支出後將在此呈現 Recharts 類別分佈條形圖。</p>
            </div>
          )}
        </div>

        {/* Add Expense Form */}
        <motion.div
          animate={Object.keys(errors).length > 0 ? { x: [-4, 4, -4, 4, 0] } : {}}
          transition={{ type: "spring", stiffness: 350, damping: 10 }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-title">支出項目</Label>
          <Input
            id="expense-title"
            value={form.title}
            onChange={(e) => {
              actions.updateForm((prev) => ({
                ...prev,
                title: e.target.value,
              }));
              if (errors.title) actions.clearFormError("title");
            }}
            placeholder="項目名稱 (例如：晚餐)"
            error={errors.title}
          />
        </div>

        <div className="flex flex-row gap-3">
          <div className="flex flex-col gap-1.5 flex-[2]">
            <Label htmlFor="expense-amount">金額</Label>
            <Input
              id="expense-amount"
              value={form.amount}
              onChange={(e) => {
                actions.updateForm((prev) => ({
                  ...prev,
                  amount: e.target.value.replace(/[^0-9]/g, ""),
                }));
                if (errors.amount) actions.clearFormError("amount");
              }}
              placeholder="金額 (例如: 1500)"
              inputMode="numeric"
              error={errors.amount}
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1 max-w-[100px]">
            <Label htmlFor="expense-currency">幣別</Label>
            <select
              id="expense-currency"
              value={form.currency}
              onChange={(e) =>
                actions.updateForm((prev) => ({
                  ...prev,
                  currency: e.target.value,
                }))
              }
              className="w-full flex h-12 rounded-xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg text-slate-800 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 shadow-sm shadow-slate-100/50 dark:shadow-black/50 appearance-none text-center cursor-pointer transition-all"
            >
              {["JPY", "TWD", "USD", "EUR", "KRW", "THB"].map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-px w-full bg-slate-100 my-2" />

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-2">
            誰先墊付
          </span>
          <div className="flex flex-row flex-wrap gap-2">
            {members.map((member) => (
              <Button
                key={member}
                variant={form.payer === member ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  actions.updateForm((prev) => ({ ...prev, payer: member }));
                  if (errors.payer) actions.clearFormError("payer");
                }}
                className={`rounded-full px-4 py-2 text-[13px] font-bold flex items-center gap-2 transition-all ${
                  form.payer === member
                    ? "ring-2 ring-primary/50 ring-offset-1 z-10 shadow-md"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${form.payer === member ? "bg-white text-primary shadow-sm" : "bg-slate-200 text-slate-500"}`}
                >
                  {member?.charAt(0).toUpperCase() || "?"}
                </div>
                <span className="truncate max-w-[150px]">{member}</span>
              </Button>
            ))}
          </div>
          {errors.payer && (
            <span className="text-red-500 font-bold text-[11px] uppercase tracking-wide ml-2">
              {errors.payer}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-2">
            分攤人員
          </span>
          <div className="flex flex-row flex-wrap gap-2">
            {members.map((member) => {
              const selected = form.splitWith.includes(member);
              return (
                <Button
                  key={member}
                  variant={selected ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    actions.toggleSplitMember(member);
                    if (errors.splitWith) actions.clearFormError("splitWith");
                  }}
                  className={`rounded-full px-4 py-2 text-[13px] font-bold flex items-center gap-2 transition-all ${
                    selected
                      ? "shadow-md ring-2 ring-primary/30 ring-offset-1 text-primary"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <div
                    className={`relative w-4 h-4 rounded-full shrink-0 border transition-colors flex items-center justify-center ${selected ? "bg-primary border-primary" : "bg-slate-100 border-slate-300"}`}
                  >
                    <Check
                      size={10}
                      className={`text-white transition-opacity ${selected ? "opacity-100" : "opacity-0"}`}
                      strokeWidth={4}
                    />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm ${selected ? "bg-primary/20 text-primary-700" : "bg-slate-200 text-slate-500"}`}
                  >
                    {member?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <span className="truncate max-w-[150px]">{member}</span>
                </Button>
              );
            })}
          </div>
          {errors.splitWith && (
            <span className="text-red-500 font-bold text-[11px] uppercase tracking-wide ml-2">
              {errors.splitWith}
            </span>
          )}
        </div>

        {/* 快速新增自訂伴侶 / 分攤成員 */}
        <div className="border-t border-dashed border-slate-100 my-2 pt-3 flex flex-col gap-1.5">
          <Label htmlFor="custom-member-input" className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-2">
            ➕ 快速新增自訂旅伴 / 分攤人
          </Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="custom-member-input"
                placeholder="輸入姓名 (例如: 小明、媽媽)"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                className="h-11 rounded-full border-slate-200/80 px-4 bg-slate-50/50 focus:bg-white"
              />
            </div>
            <Button
              type="button"
              onClick={handleAddMember}
              variant="outline"
              className="h-10 rounded-full px-4 text-[12px] font-black border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shrink-0 text-slate-600 hover:text-slate-800"
            >
              <span>+ 新增成員</span>
            </Button>
          </div>
        </div>
        </motion.div>
      </div>

      <div className="mt-3 relative z-10 shrink-0">
        <Button
          onClick={() => void actions.submitExpense()}
          disabled={submitting || isOffline}
          size="lg"
          className="w-full py-6 rounded-[24px] flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis px-4 bg-gradient-to-r from-pink-500 via-orange-400 to-sky-500 text-white shadow-[0_14px_30px_rgba(244,114,182,0.20)] hover:opacity-95"
        >
          {submitting && (
            <Loader2 size={16} className="animate-spin shrink-0" />
          )}
          <span className="truncate">
            {submitting ? "計算中..." : "新增花費"}
          </span>
        </Button>
      </div>
    </GlassCard>
  );
}
