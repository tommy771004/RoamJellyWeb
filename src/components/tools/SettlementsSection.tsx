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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, Cell } from "recharts";
import { getCurrencyFromDestination } from "../../lib/currency";
import type { Settlement } from "../../types/workflow";

export default function SettlementsSection({ className }: { className?: string }) {
  const {
    state: { settlements, expenseByCurrency, expenses, clearingId },
    actions,
  } = useToolsTabContext();
  const { isOffline } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const currencyEntries = Object.entries(expenseByCurrency);

  // Group settlements by currency
  const settlementsByCurrency = useMemo(() => {
    const groups: Record<string, Settlement[]> = {};
    for (const s of settlements) {
      if (!groups[s.currency]) {
        groups[s.currency] = [];
      }
      groups[s.currency].push(s);
    }
    return groups;
  }, [settlements]);

  const currencyKeys = Object.keys(settlementsByCurrency);
  const [activeCurrencyIdx, setActiveCurrencyIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeCurrencyIdx >= currencyKeys.length) {
      setActiveCurrencyIdx(Math.max(0, currencyKeys.length - 1));
    }
  }, [currencyKeys.length, activeCurrencyIdx]);

  // Helper for computing member totals and debt breakdown
  const getMemberStats = (member: string, currency: string) => {
    const filtered = expenses.filter((e) => e.currency === currency && !e.clearedAt);
    let totalPaid = 0;
    let totalShare = 0;
    filtered.forEach((e) => {
      if (e.payer === member) {
        totalPaid += Number(e.amount || 0);
      }
      if (e.splitWith && e.splitWith.includes(member)) {
        totalShare += Number(e.amount || 0) / (e.splitWith.length || 1);
      }
    });
    return {
      paid: totalPaid,
      share: Math.round(totalShare),
      net: Math.round(totalPaid - totalShare),
    };
  };

  // Retrieve direct transactions contributing to the settlement
  const getContributingExpenses = (fromMember: string, toMember: string, currency: string) => {
    return expenses.filter(
      (e) =>
        e.currency === currency &&
        !e.clearedAt &&
        ((e.payer === toMember && e.splitWith?.includes(fromMember)) ||
          (e.payer === fromMember && e.splitWith?.includes(toMember))),
    );
  };

  return (
    <section className={cn("flex flex-col", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 sm:px-4 mb-4 sm:mb-6 gap-3">
        <h3 className="font-serif text-[24px] sm:text-[26px] text-[#2C302E]">
          結算清單 (誰應付誰)
        </h3>
        <div className="flex flex-row flex-wrap sm:justify-end gap-2 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
          {currencyEntries.length === 0 ? (
            <span className="text-[12px] font-bold text-slate-500 shrink-0">
              尚無款項
            </span>
          ) : (
            currencyEntries.map(([cur, amount]) => (
              <span
                key={cur}
                className="text-[11.5px] font-mono font-black text-slate-800 bg-white border border-slate-200/80 px-4 py-2 rounded-full shrink-0 tracking-wider shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
              >
                {cur} {amount.toLocaleString()}
              </span>
            ))
          )}
        </div>
      </div>

      <GlassCard className="!p-4 sm:!p-6 glass-panel shadow-md hover:shadow-xl">
        <div className="flex flex-col gap-6 w-full">
          {settlements.length === 0 && (
            <div className="editorial-card-soft flex flex-col items-center justify-center text-center rounded-[32px] p-12 bg-gradient-to-tr from-emerald-500/5 via-teal-500/5 to-white/90 border border-emerald-100/60 shadow-[inset_0_1px_1px_rgba(255,255,255,1)]">
              <div className="relative mb-4 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.1, 0.25] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-x-0 size-16 bg-emerald-100 rounded-full pointer-events-none"
                />
                <div className="size-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 drop-shadow-sm">
                  <CheckCircle2 size={28} strokeWidth={2.5} />
                </div>
              </div>
              <h4 className="text-base font-black text-slate-900 tracking-tight">款項已全部結清！</h4>
              <p className="text-[12px] font-bold text-slate-500 max-w-[280px] mt-1.5 leading-relaxed">
                太棒了！所有旅途花費或拆帳細項均已兩清，目前無任何未清款項。
              </p>
            </div>
          )}

          {settlements.length > 0 &&
            Object.entries(settlementsByCurrency).map(([currency, currencySettlements], idx) => {
              if (isMobile && idx !== activeCurrencyIdx) return null;

              const memberNames = new Set<string>();
              expenses.filter(e => e.currency === currency && !e.clearedAt).forEach(e => {
                memberNames.add(e.payer);
                if (e.splitWith) e.splitWith.forEach(m => memberNames.add(m));
              });
              const chartData = Array.from(memberNames).map(member => {
                const stats = getMemberStats(member, currency);
                return { name: member, balance: stats.net };
              }).sort((a, b) => b.balance - a.balance);

              return (
              <div key={currency} className="flex flex-col gap-3">
                {/* Visual Currency Chart */}
                <motion.div 
                  className="w-full h-[220px] mb-8 mt-4 editorial-card-soft rounded-3xl p-4 overflow-hidden relative cursor-grab active:cursor-grabbing"
                  drag={isMobile ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  dragDirectionLock
                  onDragEnd={(e, info) => {
                    if (!isMobile) return;
                    if (info.offset.x < -30 && activeCurrencyIdx < currencyKeys.length - 1) {
                      setActiveCurrencyIdx(prev => prev + 1);
                    } else if (info.offset.x > 30 && activeCurrencyIdx > 0) {
                      setActiveCurrencyIdx(prev => prev - 1);
                    }
                  }}
                >
                  <div className="flex justify-between items-center mb-2 px-1">
                    <h4 className="text-sm font-black text-slate-800 font-display">{currency} Balance Overview</h4>
                    {isMobile && currencyKeys.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        {currencyKeys.map((_, i) => (
                          <span key={i} className={`h-1.5 rounded-full transition-all ${i === activeCurrencyIdx ? 'w-3 bg-slate-700' : 'w-1.5 bg-slate-200'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                    >
                      {!isMobile && <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148, 163, 184, 0.2)" />}
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 13, fontWeight: 'bold'}} width={65} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.4)'}} contentStyle={{borderRadius: '16px', border: 'none', background: 'rgba(15,23,42,0.9)', color: '#fff'}} />
                      <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={isMobile ? 1 : 2} />
                      <Bar dataKey="balance" radius={[0, 6, 6, 0]}>
                        {
                          chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.balance > 0 ? '#10b981' : '#f43f5e'} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Visual Currency Banner/Header */}
                <div className="flex items-center gap-2 mb-1 px-1 mt-2 first:mt-0">
                  <span className="w-1.5 h-3.5 rounded bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.3)] shrink-0" />
                  <span className="font-mono font-black text-xs text-slate-600 uppercase tracking-widest">
                    {currency} 幣別結算匯總 ({currencySettlements.length} 筆)
                  </span>
                </div>

                <div className="flex flex-col gap-3.5 border-b border-dashed border-slate-200/50 pb-5 last:border-0 last:pb-0">
                  {currencySettlements.map((settlement) => {
                    const isExpanded = expandedId === settlement.id;
                    const fromStats = getMemberStats(settlement.from, settlement.currency);
                    const toStats = getMemberStats(settlement.to, settlement.currency);
                    const contributing = getContributingExpenses(
                      settlement.from,
                      settlement.to,
                      settlement.currency,
                    );

                    // Check if sum of direct transactions matches the simplified settlement amount
                    let directSum = 0;
                    contributing.forEach((exp) => {
                      const share = Number(exp.amount || 0) / (exp.splitWith?.length || 1);
                      if (exp.payer === settlement.to) {
                        directSum += share;
                      } else if (exp.payer === settlement.from) {
                        directSum -= share;
                      }
                    });

                    const isDirectSumMatch = Math.abs(directSum - settlement.amount) < 1.1;

                    return (
                      <div
                        key={settlement.id}
                        className="editorial-card-soft rounded-[28px] border border-slate-100 bg-white/50 backdrop-blur-md p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-3 group"
                      >
                        {/* Summary Header */}
                        <div
                          className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                          onClick={() => setExpandedId(isExpanded ? null : settlement.id)}
                        >
                          {/* Left: Transfer Pair */}
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Debtor */}
                            <div className="flex items-center gap-2">
                              <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200/40 flex items-center justify-center text-slate-600 font-black text-sm shadow-sm">
                                {settlement.from?.charAt(0) || "?"}
                              </div>
                              <span className="text-[14px] sm:text-[15px] font-bold text-slate-800">
                                {settlement.from}
                              </span>
                            </div>

                            {/* Arrow Indicator */}
                            <div className="flex items-center justify-center text-fuchsia-500 mx-1 shrink-0 bg-fuchsia-5/60 p-1.5 rounded-full border border-fuchsia-100/30">
                              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                            </div>

                            {/* Creditor */}
                            <div className="flex items-center gap-2">
                              <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100/40 flex items-center justify-center text-emerald-600 font-black text-sm shadow-sm">
                                {settlement.to?.charAt(0) || "?"}
                              </div>
                              <span className="text-[13px] text-slate-500 font-medium px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100">
                                支付給{" "}
                                <strong className="font-bold text-slate-700">
                                  {settlement.to}
                                </strong>
                              </span>
                            </div>
                          </div>

                          {/* Right: Amount & Actions */}
                          <div className="flex items-center justify-between md:justify-end gap-3.5 w-full md:w-auto shrink-0 border-t border-slate-100 md:border-transparent pt-3 md:pt-0">
                            <div className="flex flex-col items-start md:items-end">
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                應付金額
                              </span>
                              <span className="font-black text-fuchsia-500 text-[18px] sm:text-[20px] tabular-nums leading-none mt-1">
                                {settlement.currency}{" "}
                                {settlement.amount.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 rounded-xl border-slate-200"
                                onClick={() => actions.sendReminder()}
                              >
                                <Send size={12} className="opacity-70 mr-1" />
                                <span className="text-[10px] font-black">提醒</span>
                              </Button>

                              <Button
                                variant="default"
                                size="sm"
                                className="h-9 px-3 rounded-xl bg-slate-900 border border-slate-950 text-white hover:bg-slate-900"
                                onClick={() =>
                                  void actions.handleClearSettlement(settlement)
                                }
                                disabled={clearingId === settlement.id || isOffline}
                              >
                                <CheckCircle2 size={12} className="opacity-90 mr-1" />
                                <span className="text-[10px] font-black">
                                  {clearingId === settlement.id ? "處理中" : "結清"}
                                </span>
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Interactive toggle link */}
                        <div
                          className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer select-none w-fit px-1.5 py-0.5 rounded-lg bg-slate-50/50 hover:bg-slate-50 border border-transparent hover:border-slate-100/50"
                          onClick={() => setExpandedId(isExpanded ? null : settlement.id)}
                        >
                          <span>{isExpanded ? "隱藏詳細拆帳過程" : "展開查看拆帳細節與算法"}</span>
                          {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </div>

                        {/* Expandable breakdown panel */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden w-full border-t border-slate-200/60 mt-2"
                            >
                              <div className="pt-3.5 flex flex-col gap-4">
                                {/* 1. Contributing direct transactions */}
                                <div className="flex flex-col gap-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Sparkles size={11} className="text-fuchsia-500 animate-pulse" />
                                    直接關聯花費項目 ({contributing.length} 筆)
                                  </span>

                                  {contributing.length === 0 ? (
                                    <p className="text-[12px] text-slate-400 px-2">
                                      雙方在此幣別無直接墊付/對拆之花費（此項目為簡化債務所產生的結算額）。
                                    </p>
                                  ) : (
                                    <div className="flex flex-col gap-2.5 bg-slate-50/40 p-3 rounded-3xl border border-slate-200/35">
                                      {contributing.map((exp) => {
                                        const totalSplitters = exp.splitWith?.length || 1;
                                        const shareAmount = Number(exp.amount || 0) / totalSplitters;
                                        const isDebtIncrease = exp.payer === settlement.to; // to paid, from split => from owes to (+ share)

                                        return (
                                          <div
                                            key={exp.id}
                                            className="flex items-center justify-between gap-4 text-xs"
                                          >
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                              <span className="font-bold text-[#2C302E] truncate">
                                                {exp.title}
                                              </span>
                                              <span className="text-[11px] text-slate-500 font-medium">
                                                {exp.payer} 墊付 {exp.currency} {exp.amount.toLocaleString()} ・ {totalSplitters} 人分攤
                                              </span>
                                            </div>
                                            <span
                                              className={`font-mono font-bold tabular-nums shrink-0 px-2 py-0.5 rounded-md ${
                                                isDebtIncrease
                                                  ? "text-rose-600 bg-rose-50 border border-rose-100/30"
                                                  : "text-emerald-600 bg-emerald-50 border border-emerald-100/30"
                                              }`}
                                            >
                                              {isDebtIncrease ? "+" : "-"}
                                              {Math.round(shareAmount).toLocaleString()}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Debt simplification tip (if sums don't match) */}
                                {!isDirectSumMatch && (
                                  <div className="flex items-start gap-1.5 p-3 rounded-3xl bg-amber-50/50 border border-amber-100/50 text-amber-700/90 text-xs leading-relaxed">
                                    <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-600" />
                                    <div>
                                      此債務經果凍漫遊已<strong>自動簡化 (Debt Simplification)</strong>優化。此金額已整合其他旅伴之應收帳款，因此最終付款金額非單純直接花費之和，能大幅減少所有成員轉帳次數！
                                    </div>
                                  </div>
                                )}

                                {/* 2. Personal math balances */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-1">
                                  {/* Debtor Info */}
                                  <div className="bg-slate-50/60 p-3.5 rounded-3xl border border-slate-200/35 flex flex-col gap-1">
                                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">
                                      付款人財務狀況 ・ {settlement.from}
                                    </span>
                                    <div className="flex flex-col gap-1 text-xs font-bold text-slate-600 mt-1">
                                      <div className="flex justify-between">
                                        <span>總共代墊付款:</span>
                                        <span className="font-mono text-[#2C302E]">
                                          {currency} {fromStats.paid.toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>個人應付份額:</span>
                                        <span className="font-mono text-rose-600">
                                          {currency} {fromStats.share.toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="h-px bg-slate-200/60 my-1" />
                                      <div className="flex justify-between font-extrabold text-[#2C302E]">
                                        <span>淨額應付:</span>
                                        <span className="font-mono text-fuchsia-600">
                                          {currency} {Math.abs(fromStats.net).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Creditor Info */}
                                  <div className="bg-slate-50/60 p-3.5 rounded-3xl border border-slate-200/35 flex flex-col gap-1">
                                    <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">
                                      收款人財務狀況 ・ {settlement.to}
                                    </span>
                                    <div className="flex flex-col gap-1 text-xs font-bold text-slate-600 mt-1">
                                      <div className="flex justify-between">
                                        <span>總共代墊付款:</span>
                                        <span className="font-mono text-emerald-600">
                                          {currency} {toStats.paid.toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>個人應付份額:</span>
                                        <span className="font-mono text-[#2C302E]">
                                          {currency} {toStats.share.toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="h-px bg-slate-200/60 my-1" />
                                      <div className="flex justify-between font-extrabold text-[#2C302E]">
                                        <span>淨額應收:</span>
                                        <span className="font-mono text-emerald-600">
                                          {currency} {Math.abs(toStats.net).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </section>
  );
}
