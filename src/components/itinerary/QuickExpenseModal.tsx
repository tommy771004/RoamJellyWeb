import React, { useId, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, Loader2 } from "lucide-react";
import { ItineraryNode } from "../../types/workflow";
import { submitLedgerExpense } from "../../lib/workflowApi";
import { useAppStore } from "../../store/useAppStore";
import { getOverlayTransition, getModalMotion } from "../../lib/motionTokens";
import { getCurrencyFromDestination } from "../../lib/currency";
import { useModalAccessibility } from "../../lib/useModalAccessibility";
import { useTranslation } from "react-i18next";

interface QuickExpenseModalProps {
  tripId: string;
  destination: string;
  node: ItineraryNode;
  members: string[];
  onClose: () => void;
}

type QuickExpenseField = "title" | "amount" | "payer" | "splitWith";

export default function QuickExpenseModal({
  tripId,
  destination,
  node,
  members,
  onClose,
}: QuickExpenseModalProps) {
  const { t } = useTranslation();
  const dialogRef = useModalAccessibility(onClose);
  const idPrefix = useId().replace(/:/g, "");
  const titleId = `quick-expense-${idPrefix}-title`;
  const expenseNameId = `quick-expense-${idPrefix}-name`;
  const amountId = `quick-expense-${idPrefix}-amount`;
  const currencyId = `quick-expense-${idPrefix}-currency`;
  const payerId = `quick-expense-${idPrefix}-payer`;
  const prefersReducedMotion = useReducedMotion();
  const overlayTransition = getOverlayTransition(prefersReducedMotion);
  const modalMotion = getModalMotion(prefersReducedMotion);
  const fallbackMember = members[0] || localStorage.getItem("user_id") || t("quick_expense.me");
  const participantList = members.length > 0 ? members : [fallbackMember];
  const [title, setTitle] = useState(node.title);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(
    getCurrencyFromDestination(destination),
  );
  const [payer, setPayer] = useState(participantList[0] || fallbackMember);
  const [splitWith, setSplitWith] = useState<string[]>(participantList);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<QuickExpenseField, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const { showToast } = useAppStore();

  const clearError = (field: QuickExpenseField) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const toggleSplitMember = (member: string) => {
    clearError("splitWith");
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
    const nextErrors: Partial<Record<QuickExpenseField, string>> = {};
    if (!title.trim()) {
      nextErrors.title = t("quick_expense.name_required");
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = t("quick_expense.amount_invalid");
    }
    if (!payer.trim()) {
      nextErrors.payer = t("quick_expense.payer_required");
    }

    const normalizedSplit = splitWith.includes(payer)
      ? splitWith
      : [...splitWith, payer];
    if (normalizedSplit.length === 0) {
      nextErrors.splitWith = t("quick_expense.participants_required");
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setErrors({});
      setSubmitError("");
      setSubmitting(true);
      await submitLedgerExpense(tripId, {
        title: title.trim(),
        amount: numericAmount,
        currency,
        payer,
        splitWith: normalizedSplit,
      });
      showToast(
        t("quick_expense.success", {
          title: node.title,
          currency,
          amount: numericAmount.toLocaleString(),
        }),
        "success",
      );
      onClose();
    } catch {
      setSubmitError(t("quick_expense.submit_failed"));
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
          ref={dialogRef}
          initial={modalMotion.initial}
          animate={modalMotion.animate}
          exit={modalMotion.exit}
          transition={modalMotion.transition}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
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
                  {t("quick_expense.title")}
                </p>
                <h3 id={titleId} className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
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
                aria-label={t("a11y.close_quick_expense")}
                className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/15 ios-press transition-colors flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {submitError ? (
              <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                {submitError}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <label htmlFor={expenseNameId} className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t("quick_expense.name")}
              </label>
              <input
                id={expenseNameId}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clearError("title");
                }}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? `${expenseNameId}-error` : undefined}
                className="outline-none w-full bg-white/40 dark:bg-black/35 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/20 px-4 py-3 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-black/45 focus:bg-white/70 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
              />
              {errors.title ? <p id={`${expenseNameId}-error`} role="alert" className="text-sm text-rose-700 dark:text-rose-200">{errors.title}</p> : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor={amountId} className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {t("quick_expense.amount")}
                </label>
                <input
                  id={amountId}
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    clearError("amount");
                  }}
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={errors.amount ? `${amountId}-error` : undefined}
                  placeholder={t("quick_expense.amount_placeholder")}
                  className="outline-none w-full bg-white/40 dark:bg-black/35 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/20 px-4 py-3 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-black/45 focus:bg-white/70 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                />
                {errors.amount ? <p id={`${amountId}-error`} role="alert" className="text-sm text-rose-700 dark:text-rose-200">{errors.amount}</p> : null}
              </div>
              <div className="grid grid-cols-1 flex flex-col gap-2">
                <label htmlFor={currencyId} className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {t("quick_expense.currency")}
                </label>
                <input
                  id={currencyId}
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value.toUpperCase())
                  }
                  className="outline-none w-full bg-white/40 dark:bg-black/35 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/20 px-4 py-3 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-black/45 focus:bg-white/70 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={payerId} className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t("quick_expense.payer")}
              </label>
              <select
                id={payerId}
                value={payer}
                onChange={(event) => {
                  setPayer(event.target.value);
                  clearError("payer");
                }}
                aria-invalid={Boolean(errors.payer)}
                aria-describedby={errors.payer ? `${payerId}-error` : undefined}
                className="outline-none w-full bg-white/40 dark:bg-slate-900 border border-white/60 dark:border-white/20 px-4 py-3 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-slate-900/85 focus:bg-white/70 dark:focus:bg-slate-900 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 transition-all rounded-2xl shadow-sm shadow-slate-100/50 dark:shadow-black/50"
              >
                {participantList.map((member) => (
                  <option key={member} value={member} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                    {member}
                  </option>
                ))}
              </select>
              {errors.payer ? <p id={`${payerId}-error`} role="alert" className="text-sm text-rose-700 dark:text-rose-200">{errors.payer}</p> : null}
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t("quick_expense.participants")}
              </legend>
              <div aria-describedby={errors.splitWith ? `quick-expense-${idPrefix}-participants-error` : undefined} className="flex flex-wrap gap-2">
                {participantList.map((member) => {
                  const selected = splitWith.includes(member);
                  return (
                    <button
                      key={member}
                      type="button"
                      aria-pressed={selected}
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
              {errors.splitWith ? <p id={`quick-expense-${idPrefix}-participants-error`} role="alert" className="text-sm text-rose-700 dark:text-rose-200">{errors.splitWith}</p> : null}
            </fieldset>

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="w-full mt-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 py-4 font-black text-sm uppercase tracking-[0.18em] shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis px-4"
            >
              {submitting && (
                <Loader2 size={16} className="animate-spin shrink-0" />
              )}
              <span className="truncate">
                {submitting ? t("quick_expense.submitting") : t("quick_expense.submit")}
              </span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
