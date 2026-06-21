import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, Loader2 } from "lucide-react";
import { ItineraryNode } from "../../types/workflow";
import { submitLedgerExpense } from "../../lib/workflowApi";
import { useAppStore } from "../../store/useAppStore";
import { getOverlayTransition, getModalMotion } from "../../lib/motionTokens";
import { getCurrencyFromDestination } from "../../lib/currency";

interface QuickExpenseModalProps {
  tripId: string;
  destination: string;
  node: ItineraryNode;
  members: string[];
  onClose: () => void;
}

export default function QuickExpenseModal({
  tripId,
  destination,
  node,
  members,
  onClose,
}: QuickExpenseModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const overlayTransition = getOverlayTransition(prefersReducedMotion);
  const modalMotion = getModalMotion(prefersReducedMotion);
  const fallbackMember = members[0] || localStorage.getItem("user_id") || "我";
  const participantList = members.length > 0 ? members : [fallbackMember];
  const [title, setTitle] = useState(node.title);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(
    getCurrencyFromDestination(destination),
  );
  const [payer, setPayer] = useState(participantList[0] || fallbackMember);
  const [splitWith, setSplitWith] = useState<string[]>(participantList);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useAppStore();

  const toggleSplitMember = (member: string) => {
    setSplitWith((prev) => {
      const exists = prev.includes(member);
      if (exists) {
        return prev.filter((item) => item !== member);
      }
      return [...prev, member];
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!title.trim()) {
      showToast("請補上消費名稱。", "warning");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast("金額需為大於 0 的數字。", "warning");
      return;
    }
    if (!payer.trim()) {
      showToast("請選擇代墊人。", "warning");
      return;
    }

    const normalizedSplit = splitWith.includes(payer)
      ? splitWith
      : [...splitWith, payer];
    if (normalizedSplit.length === 0) {
      showToast("至少要有一位分攤成員。", "warning");
      return;
    }

    try {
      setSubmitting(true);
      await submitLedgerExpense(tripId, {
        title: title.trim(),
        amount: numericAmount,
        currency,
        payer,
        splitWith: normalizedSplit,
      });
      showToast(
        `已為 ${node.title} 記下一筆 ${currency} ${numericAmount.toLocaleString()}。`,
        "success",
      );
      onClose();
    } catch {
      showToast("記帳失敗，請稍後再試。", "warning");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-alert flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={overlayTransition}
          className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={modalMotion.initial}
          animate={modalMotion.animate}
          exit={modalMotion.exit}
          transition={modalMotion.transition}
          className="relative w-full max-w-lg rounded-[32px] bg-white/90 dark:bg-slate-950/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl dark:shadow-black/50 z-alert-above overflow-hidden flex flex-col max-h-90dvh"
        >
          <div className="absolute top-0 left-0 h-2 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 z-10" />
          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-8 flex flex-col gap-4 sm:gap-5 pb-12 sm:pb-32 overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500">
                  Quick Expense
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  為景點快速記一筆
                </h3>
                <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                  {node.title}
                  {node.date ? ` ・ ${node.date}` : ""}
                  {node.time ? ` ・ ${node.time}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/15 transition-colors flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                消費名稱
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="outline-none w-full bg-white/40 dark:bg-black/35 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/20 px-4 py-3 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-black/45 focus:bg-white/70 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  金額
                </label>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="例如 980"
                  className="outline-none w-full bg-white/40 dark:bg-black/35 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/20 px-4 py-3 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-black/45 focus:bg-white/70 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                />
              </div>
              <div className="grid grid-cols-1 flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  幣別
                </label>
                <input
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value.toUpperCase())
                  }
                  className="outline-none w-full bg-white/40 dark:bg-black/35 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/20 px-4 py-3 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-black/45 focus:bg-white/70 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                代墊人
              </label>
              <select
                value={payer}
                onChange={(event) => setPayer(event.target.value)}
                className="outline-none w-full bg-white/40 dark:bg-slate-900 border border-white/60 dark:border-white/20 px-4 py-3 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-slate-900/85 focus:bg-white/70 dark:focus:bg-slate-900 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 transition-all rounded-2xl shadow-sm shadow-slate-100/50 dark:shadow-black/50"
              >
                {participantList.map((member) => (
                  <option key={member} value={member} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                    {member}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                參與旅伴
              </label>
              <div className="flex flex-wrap gap-2">
                {participantList.map((member) => {
                  const selected = splitWith.includes(member);
                  return (
                    <button
                      key={member}
                      type="button"
                      onClick={() => toggleSplitMember(member)}
                      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${
                        selected
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-white/10 hover:bg-white dark:hover:bg-white/10"
                      }`}
                    >
                      {member}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 py-4 font-black text-sm uppercase tracking-[0.18em] shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis px-4"
            >
              {submitting && (
                <Loader2 size={16} className="animate-spin shrink-0" />
              )}
              <span className="truncate">
                {submitting ? "送出中..." : "確認記帳"}
              </span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
