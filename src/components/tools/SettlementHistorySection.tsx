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

export default function SettlementHistorySection({ className }: { className?: string }) {
  const {
    state: { settlementHistory, clearedExpenses },
  } = useToolsTabContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (settlementHistory.length === 0) return null;

  return (
    <section className={cn("flex flex-col mb-12", className)}>
      <div className="flex items-center justify-between px-4 mb-4">
        <h3 className="font-serif text-[18px] text-[#2C302E] font-bold">歷史結清明細</h3>
        <span className="text-[11px] text-slate-500 font-medium">
          {settlementHistory.length} 次結清
        </span>
      </div>
      <div className="flex flex-col gap-3.5 w-full">
        {settlementHistory.map((entry) => {
          const isExpanded = expandedId === entry.clearedAt;
          
          // Match matching cleared expenses that belong to this settlement batch (by calendar date)
          const matchingExpenses = clearedExpenses.filter((exp) => {
            if (!exp.clearedAt) return false;
            try {
              const expKey = new Date(exp.clearedAt).toISOString().slice(0, 10);
              const entryKey = new Date(entry.clearedAt).toISOString().slice(0, 10);
              return expKey === entryKey;
            } catch {
              return false;
            }
          });

          return (
            <div
              key={entry.clearedAt}
              className="p-3.5 sm:p-4 flex flex-col gap-1.5 glass-card dark-transition hover:bg-white/90 dark:hover:bg-slate-800/90 rounded-[24px] shadow-sm cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : entry.clearedAt)}
            >
              <div className="flex items-center gap-4 w-full">
                <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold text-slate-800">
                    {new Date(entry.clearedAt).toLocaleDateString("zh-TW", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    結清
                  </p>
                  <p className="text-[12px] text-slate-500 mt-0.5 font-medium">
                    {entry.count} 筆費用 ・ 涉及 {entry.payers.length} 位旅伴
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 px-1">
                  {Object.entries(entry.currencyTotals ?? {}).map(([cur, amt]) => (
                    <span
                      key={cur}
                      className="text-[13.5px] font-black text-emerald-600 tabular-nums"
                    >
                      {cur} {Math.round(amt).toLocaleString()}
                    </span>
                  ))}
                </div>
                <div className="text-slate-500 dark:text-slate-400 pl-1">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Expansion block */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden w-full"
                    onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking within details
                  >
                    <div className="border-t border-slate-100/80 mt-3 pt-3.5 flex flex-col gap-2">
                      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-1.5 pl-1">
                        此批結清花費項目 ({matchingExpenses.length} 筆)
                      </div>
                      
                      {matchingExpenses.length === 0 ? (
                        <div className="text-slate-500 dark:text-slate-400 text-[12.5px] italic pl-1">
                          無對應花費明細紀錄。
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 p-3 dark-transition">
                          {matchingExpenses.map((exp) => (
                            <div key={exp.id} className="flex items-center justify-between text-[13px] py-1 border-b border-dashed border-slate-100 last:border-0">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-700">{exp.title}</span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                  由 {exp.payer} 支付
                                </span>
                              </div>
                              <span className="font-extrabold text-slate-600 tabular-nums">
                                {exp.currency} {exp.amount.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
