import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  CloudRain,
  Check,
  Sparkles,
  Sun,
  Send,
  CheckCircle2,
  Plane,
  Star,
  ExternalLink,
  SlidersHorizontal,
  ArrowDownUp,
  Loader2,
  CalendarDays,
  MapPin,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CreditCard,
  Layers,
  Grid,
} from "lucide-react";
import GlassCard from "./GlassCard";
import EditorialSectionIntro from "./EditorialSectionIntro";
import ExpandableText from "./ExpandableText";
import HorizontalScrollRail from "./HorizontalScrollRail";
import InfoPeekModal, { type InfoPeekContent } from "./InfoPeekModal";
import IconImg from "./ui/IconImg";
import {
  fetchChecklist,
  fetchCollaborators,
  fetchSettlements,
  fetchTripInfo,
  fetchUserTrips,
  fetchWeather,
  clearSettlement,
  shareText,
  submitLedgerExpense,
  updateChecklist,
  fetchSettlementHistory,
  fetchLedgerExpenses,
} from "../lib/workflowApi";
import type {
  TripInfo,
  WeatherData,
  TripSummary,
  ChecklistItem,
  Settlement,
  SettlementHistoryEntry,
  ChecklistCategory,
} from "../types/workflow";
import { AiRateLimitedError, suggestPackingList } from "../lib/openrouterApi";
import { useToolsStore, Expense } from "../store/useToolsStore";
import { useAppStore } from "../store/useAppStore";
import { useHideNavOnScroll } from "../hooks/useHideNavOnScroll";
import { cn } from "../lib/utils";
import { getCurrencyFromDestination } from "../lib/currency";
import { getCurrentSeason, guessCategoryFromItem } from "../lib/checklist";
import { ToolsTabContext, useToolsTabContext, type ExpenseForm, type FormErrors, type ToolsTabState, type ToolsTabActions } from "./tools/toolsTabContext";
import WeatherCard from "./tools/WeatherCard";
import ChecklistSection from "./tools/ChecklistSection";
import LedgerSection from "./tools/LedgerSection";
import SettlementsSection from "./tools/SettlementsSection";
import SettlementHistorySection from "./tools/SettlementHistorySection";


const TOOLS_ENTRY_PILLARS = [
  {
    icon: CloudRain,
    eyebrow: "天氣",
    title: "看天氣與穿搭",
    description: "依據目的地與日期，即時提供天氣資訊。",
    details: [
      "確認目的地與日期，自動帶出當地天氣。",
      "不需跳出 App，一鍵確認出門穿搭條件。",
      "先看天氣再決定當天節奏，行程更順暢。",
    ],
    tone: "pink",
  },
  {
    icon: CheckCircle2,
    eyebrow: "清單",
    title: "待辦清單與行李",
    description: "旅遊清單集中管理，不再四處散落。",
    details: [
      "行李與待辦集中於行程中，不再散落在各處。",
      "可先自行建立，再邀請旅伴一起補充。",
      "方便手機點選，隨時快速勾選確認。",
    ],
    tone: "sky",
  },
  {
    icon: ArrowDownUp,
    eyebrow: "記帳",
    title: "共同分帳與記帳",
    description: "所有帳目與代墊紀錄，跟著行程隨時同步。",
    details: [
      "消費明細與結清紀錄，統一保留在行程內。",
      "所有同行旅伴皆可記帳與同步歷史資訊。",
      "取代繁雜的 Excel 表格，記帳更輕鬆直覺。",
    ],
    tone: "emerald",
  },
] as const;

const TOOLS_CARD_DECOR = [
  {
    shell: "glass-card",
    badge: "border-pink-100 bg-pink-50/95 text-pink-700",
    glow: "bg-pink-200/50",
    note: "提醒即時天氣與穿搭。",
  },
  {
    shell: "glass-card",
    badge: "border-sky-100 bg-sky-50/95 text-sky-700",
    glow: "bg-sky-200/50",
    note: "待辦清單，一目瞭然。",
  },
  {
    shell: "glass-card",
    badge: "border-teal-100 bg-teal-50/95 text-teal-700",
    glow: "bg-teal-200/50",
    note: "代墊與結清，統一管理。",
  },
] as const;

// ── Provider ─────────────────────────────────────────────────────────────────

function ToolsTabProvider({ children }: { children: React.ReactNode }) {
  const {
    checklist,
    setChecklist,
    revertCheckItem,
    settlements,
    setSettlements,
    members,
    setMembers,
    expenses,
    setExpenses,
    addExpense,
    removeExpense,
  } = useToolsStore();
  const { showToast, activeTripId: tripId, userId } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [tip, setTip] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [settlementHistory, setSettlementHistory] = useState<
    SettlementHistoryEntry[]
  >([]);
  const [clearedExpenses, setClearedExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState<ExpenseForm>({
    title: "",
    amount: "",
    currency: "JPY",
    payer: "A",
    splitWith: ["A", "B"],
  });

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      setTripInfo(null);
      setWeather(null);
      setSettlementHistory([]);
      setClearedExpenses([]);
      return;
    }

    const init = async () => {
      try {
        setLoading(true);
        const [
          checklistData,
          collaboratorsData,
          tripInfoData,
          settlementHistoryData,
          ledgerExpensesData,
          clearedExpensesData,
          settlementsData,
        ] = await Promise.all([
          fetchChecklist(tripId),
          fetchCollaborators(tripId),
          fetchTripInfo(tripId).catch(() => null),
          fetchSettlementHistory(tripId).catch(() => []),
          fetchLedgerExpenses(tripId, false).catch(() => []),
          fetchLedgerExpenses(tripId, true).catch(() => []),
          fetchSettlements(tripId).catch(() => []),
        ]);

        let initialCurrency = "TWD";
        if (tripInfoData) {
          setTripInfo(tripInfoData);
          initialCurrency = getCurrencyFromDestination(
            tripInfoData.destination,
          );

          if (tripInfoData.destination) {
            fetchWeather(tripInfoData.destination)
              .then((weatherData) => {
                if (weatherData) setWeather(weatherData);
              })
              .catch(() => null);
          }
        }

        const memberNames = collaboratorsData
          .map((m: any) => m.name)
          .filter(Boolean);
        setChecklist(checklistData);
        setSettlementHistory(settlementHistoryData);
        setExpenses(ledgerExpensesData);
        setClearedExpenses(clearedExpensesData);
        if (Array.isArray(settlementsData)) {
          setSettlements(settlementsData);
        }
        
        if (memberNames.length > 0) {
          setMembers(memberNames);
          // Only update initial form state once when we get members
          setForm((prev) => ({
            ...prev,
            payer: memberNames[0],
            splitWith: memberNames,
            currency: initialCurrency,
          }));
        } else {
          // Robust fallback if there are no registered online collaborators
          const guestName = userId === "demo_user" ? "我" : (userId || "我");
          const fallbackMembers = [guestName, "旅伴 A", "旅伴 B"];
          setMembers(fallbackMembers);
          setForm((prev) => ({
            ...prev,
            payer: fallbackMembers[0],
            splitWith: fallbackMembers,
            currency: initialCurrency,
          }));
        }
      } catch {
        setTip("工具包載入失敗，請稍後重試。");
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [tripId, userId, setChecklist, setMembers, setExpenses, setSettlements, setClearedExpenses]);

  const expenseByCurrency = useMemo(
    () =>
      (expenses as Expense[]).reduce(
        (acc: Record<string, number>, exp: Expense) => {
          const cur = exp.currency ?? "JPY";
          acc[cur] = (acc[cur] ?? 0) + Number(exp.amount || 0);
          return acc;
        },
        {} as Record<string, number>,
      ),
    [expenses],
  );

  const validateForm = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = "請輸入費用名稱";
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0)
      errs.amount = "金額需為大於 0 的數字";
    if (!form.payer.trim()) errs.payer = "請選擇代墊人";
    if (form.splitWith.length === 0) errs.splitWith = "請選擇至少一位分攤者";
    else if (!form.splitWith.includes(form.payer))
      errs.splitWith = "代墊人需包含在分攤名單";
    return errs;
  };

  const actions: ToolsTabActions = {
    toggleCheck(item) {
      const nextChecked = !item.checked;
      const nextChecklist = checklist.map((i: any) =>
        i.id === item.id ? { ...i, checked: nextChecked } : i,
      );
      setChecklist(nextChecklist);
      void updateChecklist({ trip_id: tripId, items: nextChecklist }).catch(
        () => {
          revertCheckItem(item.id, item.checked);
          setTip("清單同步失敗，已還原。");
          setTimeout(() => setTip(""), 2000);
        },
      );
    },

    async handleAiPackingList(customDest?: string, customSeason?: string, customPeople?: number, customDays?: number) {
      setAiLoading(true);
      try {
        const dest = customDest || tripInfo?.destination || "目的地";
        const season = customSeason || getCurrentSeason();
        const people = customPeople || 1;
        const days = customDays || 5;

        const suggestions = await suggestPackingList(
          dest,
          season,
          people,
          days,
        );
        const newItems: ChecklistItem[] = suggestions.map((text, i) => ({
          id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${i}`,
          text,
          checked: false,
          category: guessCategoryFromItem(text),
        }));
        const nextChecklist = [...checklist, ...newItems];
        setChecklist(nextChecklist);
        
        if (tripId) {
          await updateChecklist({ trip_id: tripId, items: nextChecklist }).catch(() => {
            // non-blocking fallback if background api failed
          });
        }
        showToast(`✨ AI 行李推薦新增了 ${newItems.length} 項物品！`, "success");
      } catch (err) {
        if (err instanceof AiRateLimitedError) {
          showToast(err.message, "warning");
        } else {
          showToast(
            "AI 功能失敗，請確認 OpenRouter API Key 是否設定。",
            "warning",
          );
        }
      } finally {
        setAiLoading(false);
      }
    },

    updateForm(updater) {
      setForm(updater);
    },

    clearFormError(field) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },

    toggleSplitMember(member) {
      setForm((prev) => {
        const exists = prev.splitWith.includes(member);
        return {
          ...prev,
          splitWith: exists
            ? prev.splitWith.filter((n) => n !== member)
            : [...prev.splitWith, member],
        };
      });
    },

    async submitExpense() {
      const errs = validateForm();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
      setErrors({});
      let optimisticExpenseId: string | null = null;
      try {
        setSubmitting(true);
        const expense = {
          id: `exp_${Date.now()}_${Math.random()}`,
          title: form.title,
          amount: Number(form.amount),
          currency: form.currency,
          payer: form.payer,
          splitWith: form.splitWith,
          date: new Date().toISOString(),
        };
        optimisticExpenseId = expense.id;
        addExpense(expense);

        if (tripId) {
          const result = await submitLedgerExpense(tripId, expense);
          if (Array.isArray(result?.settlements)) {
            setSettlements(result.settlements);
          }
          const [ledgerData, clearedData] = await Promise.all([
            fetchLedgerExpenses(tripId, false).catch(() => []),
            fetchLedgerExpenses(tripId, true).catch(() => []),
          ]);
          setExpenses(ledgerData);
          setClearedExpenses(clearedData);
        }

        showToast("分帳已更新，已算出最新應付關係。", "success");
        setForm((prev) => ({
          ...prev,
          title: "",
          amount: "",
          splitWith: members,
        }));
      } catch {
        if (optimisticExpenseId) {
          removeExpense(optimisticExpenseId);
        }
        showToast("分帳送出失敗，請稍後再試。", "warning");
      } finally {
        setSubmitting(false);
      }
    },

    async sendReminder() {
      const text = settlements
        .map(
          (item: any) =>
            `${item.from} 需給 ${item.to} ${item.currency} ${item.amount.toLocaleString()}`,
        )
        .join("\n");
      const ok = await shareText(`溫柔提醒：\n${text || "目前沒有待結算項目"}`);
      if (ok) {
        showToast("提醒內容已分享或複製。", "success");
      } else {
        showToast("提醒發送失敗，請稍後再試。", "warning");
      }
    },

    async handleClearSettlement(settlement) {
      setClearingId(settlement.id);
      try {
        if (tripId) {
          await clearSettlement(
            tripId,
            settlement.from,
            settlement.to,
            settlement.currency,
          );
          const [history, fresh, ledgerData, clearedData] = await Promise.all([
            fetchSettlementHistory(tripId).catch(() => []),
            fetchSettlements(tripId).catch(() => []),
            fetchLedgerExpenses(tripId, false).catch(() => []),
            fetchLedgerExpenses(tripId, true).catch(() => []),
          ]);
          setSettlementHistory(history);
          if (Array.isArray(fresh)) setSettlements(fresh);
          setExpenses(ledgerData);
          setClearedExpenses(clearedData);
        }
        showToast(
          `${settlement.from} → ${settlement.to} 已標記結清。`,
          "success",
        );
      } catch {
        showToast("結清失敗，請稍後再試。", "warning");
      } finally {
        setClearingId(null);
      }
    },

    addCustomMember(name) {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (members.includes(trimmed)) {
        showToast("該成員已存在分攤名單中囉！", "warning");
        return;
      }
      setMembers([...members, trimmed]);
      setForm((prev) => ({
        ...prev,
        splitWith: [...prev.splitWith, trimmed],
      }));
      showToast(`已新增自訂旅伴：${trimmed}！`, "success");
    },
  };

  useEffect(() => {
    if (!tripId) return;
    void fetchSettlementHistory(tripId)
      .then(setSettlementHistory)
      .catch(() => {});
  }, [tripId]);

  const state: ToolsTabState = {
    loading,
    tip,
    weather,
    tripInfo,
    destination: tripInfo?.destination ?? "",
    checklist,
    settlements,
    settlementHistory,
    expenses,
    clearedExpenses,
    members,
    expenseByCurrency,
    form,
    errors,
    submitting,
    aiLoading,
    clearingId,
  };

  return (
    <ToolsTabContext value={{ state, actions }}>{children}</ToolsTabContext>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

// ── Trip selector bar ─────────────────────────────────────────────────────────

function TripSelectorBar() {
  const { t } = useTranslation();
  const { activeTripId, setActiveTripId } = useAppStore();
  const [trips, setTrips] = useState<TripSummary[]>([]);

  useEffect(() => {
    void fetchUserTrips()
      .then(setTrips)
      .catch(() => {});
  }, []);

  if (trips.length <= 1) return null;

  return (
    <HorizontalScrollRail
      label={t('str_30177e1a')}
      className="mb-8"
      viewportClassName="w-full py-1 -mx-4 px-4 sm:mx-0 sm:px-0"
      contentClassName="flex flex-row gap-3"
      controlsVisibilityClass="hidden sm:flex"
    >
        {trips.map((trip) => {
          const active = activeTripId === trip.tripId;
          return (
            <button
              key={trip.tripId}
              onClick={() => setActiveTripId(trip.tripId)}
              className={cn(
                "px-5 py-4 flex flex-col rounded-[24px] border transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press text-left shadow-sm shrink-0 min-w-[120px] max-w-[240px] overflow-hidden group",
                active
                  ? "bg-gradient-to-r from-sky-500 to-indigo-500 border-transparent text-white shadow-md shadow-sky-500/20"
                  : "bg-white/80 backdrop-blur-md border-slate-200 text-slate-500 hover:border-sky-300 hover:bg-sky-50/50 hover:shadow-md",
              )}
            >
              <span
                className={cn(
                  "text-[16px] font-bold whitespace-nowrap overflow-hidden text-ellipsis w-full block transition-colors",
                  active ? "text-white" : "text-slate-800 group-hover:text-sky-700",
                )}
              >
                {trip.name}
              </span>
              <span
                className={cn(
                  "text-[11px] uppercase font-black mt-1 whitespace-nowrap overflow-hidden text-ellipsis w-full block",
                  active ? "text-white/80" : "text-slate-500",
                )}
              >
                {trip.destination}
              </span>
            </button>
          );
        })}
    </HorizontalScrollRail>
  );
}

// ── Exported component ────────────────────────────────────────────────────────

export default function ToolsTab() {
    const { t } = useTranslation();
  return (
    <ToolsTabProvider>
      <ToolsTabContent />
    </ToolsTabProvider>
  );
}

import GoogleFormsCard from "./GoogleFormsCard";
import { useTranslation } from "react-i18next";

function ToolsTabContent() {
  const { t } = useTranslation();
  const { activeTripId, setActiveTab, openRedirectModal } = useAppStore();
  const {
    state: { loading, checklist, destination, settlements, tripInfo, weather, tip },
  } = useToolsTabContext();
  const [flights, setFlights] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [filterMode, setFilterMode] = useState<"best" | "cheapest" | "nonstop">(
    "best",
  );
  const [activeInfoCard, setActiveInfoCard] = useState<InfoPeekContent | null>(null);
  const [isPillarsExpanded, setIsPillarsExpanded] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth >= 768
  );
  const [isPreviewExpanded, setIsPreviewExpanded] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth >= 768
  );
  const [isUtilityLayerExpanded, setIsUtilityLayerExpanded] = useState<boolean>(false);
  const { onScroll } = useHideNavOnScroll();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const checkedChecklistCount = checklist.filter((item) => item.checked).length;
  const toolHighlights = [
    {
      icon: CloudRain,
      label: "天氣與穿搭",
      value: destination ? `${destination}${weather ? " 已同步" : " 等待同步"}` : "等待旅程同步",
      description: weather ? "依照日期提供出發前提醒。" : "連上旅程後自動帶出預報。",
    },
    {
      icon: CheckCircle2,
      label: "清單進度",
      value:
        checklist.length > 0
          ? `${checkedChecklistCount}/${checklist.length} 已整理`
          : "尚未建立清單",
      description: "用同一份旅程把待辦與行李收整齊。",
    },
    {
      icon: ArrowDownUp,
      label: "分帳狀態",
      value:
        settlements.length > 0
          ? `${settlements.length} 筆待處理`
          : "目前沒有待結清",
      description: "代墊與提醒會跟著旅程成員同步。",
    },
  ] as const;
  const filterButtonClass = (active: boolean) =>
    cn(
      "rounded-full border px-5 py-3 text-sm font-black shadow-sm transition-colors",
      active
        ? "border-sky-200 bg-sky-100 text-sky-700"
        : "border-slate-200 bg-white/85 text-slate-600 hover:border-sky-200 hover:text-sky-700",
    );

  useEffect(() => {
    if (activeTripId) {
      setIsLoadingOffers(true);
      import("../lib/workflowApi")
        .then(({ fetchTripFlights, fetchTripActivities }) => {
          Promise.all([
            fetchTripFlights(activeTripId)
              .then(setFlights)
              .catch(() => {}),
            fetchTripActivities(activeTripId)
              .then(setActivities)
              .catch(() => {}),
          ]).finally(() => setIsLoadingOffers(false));
        })
        .catch(() => setIsLoadingOffers(false));
    }
  }, [activeTripId]);

  const displayedFlights = useMemo(() => {
    let result = [...flights];
    if (filterMode === "cheapest") {
      result = result.sort((a, b) => a.price - b.price);
    } else if (filterMode === "nonstop") {
      // 直飛優先: Filter direct first, then sort by price
      result = result.sort((a, b) => {
        const aStops = a.direct || a.stops === 0 ? 0 : 1;
        const bStops = b.direct || b.stops === 0 ? 0 : 1;
        if (aStops !== bStops) return aStops - bStops;
        return a.price - b.price;
      });
    } else {
      // 優先推薦: Sort by early departure time as a 'best' recommendation if prices are similar
      result = result.sort((a, b) => {
        const timeA = a.depTime || "23:59";
        const timeB = b.depTime || "23:59";
        return timeA.localeCompare(timeB);
      });
    }
    return result;
  }, [flights, filterMode]);

  if (!activeTripId) {
    return (
      <div className="flex-1 overflow-y-auto bg-transparent px-3 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] scroll-smooth sm:px-6 sm:py-6">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: "easeOut" }}
          className="mx-auto my-auto w-full max-w-5xl overflow-hidden rounded-[32px] glass-panel sm:rounded-[40px] sm:p-8 md:p-10"
        >
          <div className="absolute -left-12 top-8 size-36 rounded-full bg-pink-200/35 blur-3xl" />
          <div className="absolute right-6 top-10 size-32 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div className="space-y-5 text-center md:text-left">
              <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase text-sky-700">
                {t('str_2cfd1593')}</div>
              <div className="space-y-2.5 sm:space-y-3">
                <h2 className="text-balance text-2xl font-black leading-tight text-slate-900 sm:text-[34px] md:text-[40px]">
                  {t('str_3aab8f46')}</h2>
                <p className="text-pretty text-[13px] leading-relaxed text-slate-600 sm:text-base sm:leading-7">
                  {t('str_b0118f4')}</p>
              </div>

              {/* Collapsible pillars — mobile collapsed by default */}
              <div className="rounded-[24px] border border-white/80 bg-white/50 overflow-hidden md:contents">
                <button
                  type="button"
                  onClick={() => setIsPillarsExpanded(v => !v)}
                  className="md:hidden w-full flex items-center justify-between px-4 py-3 text-left"
                  aria-expanded={isPillarsExpanded}
                >
                  <span className="text-[13px] font-black text-slate-700">{t('str_50eb0469')}</span>
                  <ChevronDown
                    size={18}
                    strokeWidth={2.5}
                    className={`text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isPillarsExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                <div className={`grid gap-3 sm:grid-cols-3 ${isPillarsExpanded ? 'p-3 md:p-0' : 'hidden md:grid'}`}>
                  {TOOLS_ENTRY_PILLARS.map(({ icon: Icon, eyebrow, title, description, details, tone }, index) => {
                    const decor = TOOLS_CARD_DECOR[index % TOOLS_CARD_DECOR.length];
                    return (
                    <div
                      key={title}
                      className={`editorial-card relative overflow-hidden rounded-[28px] p-4 text-left ${decor.shell}`}
                    >
                      <div className={`absolute -right-5 -top-5 size-20 rounded-full blur-2xl ${decor.glow}`} />
                      <div className="relative flex items-center justify-between gap-3">
                        <span className={`inline-flex items-center gap-2 rounded-full border bg-white/92 px-2.5 py-1 text-[11px] font-black shadow-sm ${decor.badge}`}>
                          <Icon size={14} strokeWidth={2.5} />
                          {eyebrow}
                        </span>
                        <span className="rounded-full border border-white/80 bg-white/88 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 shadow-sm">
                          0{index + 1}
                        </span>
                      </div>
                      <h3 className="relative mt-3 text-balance text-sm font-black text-slate-900">{title}</h3>
                      <ExpandableText
                        text={description}
                        previewLines={3}
                        minCharacters={72}
                        className="relative mt-2.5"
                        textClassName="text-pretty text-[13px] leading-[1.65] text-slate-600"
                        collapsedLabel={t('str_4252901d')}
                        expandedLabel={t('str_30275972')}
                      />
                      <div className="editorial-divider relative mt-4 flex items-center justify-between gap-3 pt-3">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                          <span className={`inline-flex size-6 items-center justify-center rounded-full border bg-white/90 text-[10px] font-black shadow-sm ${decor.badge}`}>
                            <Icon size={12} strokeWidth={2.6} />
                          </span>
                          <span className="text-pretty">{decor.note}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveInfoCard({
                              eyebrow,
                              title,
                              description,
                              details,
                              tone,
                              icon: Icon,
                            })
                          }
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/90 bg-white/92 px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
                        >
                          {t('str_310a62ea')}<ArrowRight size={12} strokeWidth={2.6} />
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setActiveTab("ai_form")}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-sky-400 to-sky-600 px-6 py-3 text-[14px] font-black text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_24px_rgba(14,165,233,0.35)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press hover:-translate-y-1 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_28px_rgba(14,165,233,0.45)]"
                >
                  <Sparkles size={18} strokeWidth={2.5} />
                  {t('str_2b5ac87f')}</button>
                <button
                  onClick={() => setActiveTab("home")}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200/60 bg-white/70 px-6 py-3 text-[14px] font-black text-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.03)] backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press hover:-translate-y-1 hover:border-sky-300/60 hover:text-sky-700 hover:shadow-[0_8px_20px_rgba(14,165,233,0.12)]"
                >
                  {t('str_4fb330ac')}</button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[30px] border border-slate-900/10 bg-[linear-gradient(180deg,#18314f,#1f2937_38%,#312e81_100%)] shadow-[0_24px_46px_rgba(15,23,42,0.18)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.16),transparent_38%)] pointer-events-none" />
              <button
                type="button"
                onClick={() => setIsPreviewExpanded(v => !v)}
                className="relative w-full flex items-center justify-between gap-3 p-5 text-left"
                aria-expanded={isPreviewExpanded}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/65">Tools Preview</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-sky-300" />
                    <span className="size-2 rounded-full bg-orange-300" />
                    <span className="size-2 rounded-full bg-emerald-300" />
                  </div>
                  <ChevronDown
                    size={16}
                    strokeWidth={2.5}
                    className={`text-white/40 transition-transform duration-200 ${isPreviewExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>
              <div className={`grid gap-3 ${isPreviewExpanded ? 'px-5 pb-5' : 'hidden'}` }>
                {[
                  {
                    icon: MapPin,
                    title: "WEATHER",
                    subtitle: "LIVE",
                    description: "東京 24°C・降雨機率 20%，確認最新天氣與穿搭。",
                    details: [
                      "自動同步行程日期與地點，免重複設定。",
                      "掌握當地天氣，輕鬆決定行程節奏。",
                    ],
                    tone: "sky",
                  },
                  {
                    icon: CalendarDays,
                    title: "CHECKLIST",
                    subtitle: "6/9",
                    description: "行李清單 6/9 完成，確保不遺漏重要物品。",
                    details: [
                      "待辦清單集中管理，可隨時與旅伴協作。",
                      "取代對話紀錄，進度一目瞭然。",
                    ],
                    tone: "emerald",
                  },
                  {
                    icon: ArrowDownUp,
                    title: "SPLIT BILL",
                    subtitle: "JPY",
                    description: "晚餐車資輕鬆拆帳，不需翻找聊天紀錄。",
                    details: [
                      "開銷隨行程記錄，事後結算清楚方便。",
                      "可隨時同步保存，保留完整歷史。",
                    ],
                    tone: "orange",
                  },
                ].map(({ icon: Icon, title, subtitle, description, details, tone }, index) => (
                  <div key={title} className="flex items-start gap-3 rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                    <div className="flex size-11 items-center justify-center rounded-3xl bg-white/12 text-sky-200 shadow-inner">
                      <Icon size={17} strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-black tracking-[0.16em] text-white/80">{title}</h3>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${index === 0 ? 'border-sky-300/30 bg-sky-400/12 text-sky-100' : index === 1 ? 'border-emerald-300/30 bg-emerald-400/12 text-emerald-100' : 'border-orange-300/30 bg-orange-400/12 text-orange-100'}`}>
                          {subtitle}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveInfoCard({
                            eyebrow: `${title} · ${subtitle}`,
                            title,
                            description,
                            details,
                            tone: tone as InfoPeekContent["tone"],
                            icon: Icon,
                          })
                        }
                        className="mt-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black text-white/80 transition-colors hover:bg-white/14 hover:text-white"
                      >
                        {t('str_310a62ea')}<ArrowRight size={12} strokeWidth={2.6} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <InfoPeekModal
          open={!!activeInfoCard}
          content={activeInfoCard}
          onClose={() => setActiveInfoCard(null)}
        />
      </div>
    );
  }

  return (
    <div
      onScroll={onScroll}
      className="flex-1 w-full overflow-y-auto overflow-x-hidden scroll-smooth bg-transparent text-slate-900 transition-colors"
    >
      <div className="pt-4 sm:pt-8 pb-tab-safe px-3.5 sm:px-6 md:px-8 mx-auto flex flex-col w-full max-w-[1120px] gap-y-6 sm:gap-y-10">
        <TripSelectorBar />

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 my-8 rounded-[32px] glass-panel bg-white/50 dark:bg-slate-800/40 min-h-[400px]">
            <Loader2 size={36} strokeWidth={2.5} className="animate-spin text-sky-400 mb-6 drop-shadow-sm" />
            <h3 className="text-xl font-black text-slate-700 dark:text-slate-200 tracking-tight mb-2">
              {t('str_1e9cc754')}</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {tip || "正在同步天氣與分帳清單資料..."}
            </p>
          </div>
        ) : tip ? (
          <div className="flex flex-col items-center justify-center p-12 my-8 rounded-[32px] glass-panel bg-[#fff1f2]/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 min-h-[300px]">
             <AlertCircle className="text-rose-500 mb-4" size={36} />
             <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">{t('str_38fe4bcc')}</h3>
             <p className="text-sm font-bold text-rose-500/90">{tip}</p>
          </div>
        ) : (
        <div className="flex flex-col gap-y-6 sm:gap-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <motion.section
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16, scale: 0.985 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[30px] glass-panel sm:p-5"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.14),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(253,186,116,0.10),transparent_46%)]" />
          <div className="relative flex flex-col gap-2 sm:gap-4">
            <div className="flex items-center justify-between px-3 pt-3 pb-1 sm:px-0 sm:pt-0 sm:pb-0">
              <button
                onClick={() => setIsUtilityLayerExpanded(!isUtilityLayerExpanded)}
                className="group flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-sky-600/70 hover:text-sky-700 transition-colors"
                aria-expanded={isUtilityLayerExpanded}
              >
                Trip Utility Layer
                <div className="flex size-5 items-center justify-center rounded-full bg-sky-500/10 group-hover:bg-sky-500/20 transition-colors text-sky-600">
                  {isUtilityLayerExpanded ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
                </div>
              </button>
              {!isUtilityLayerExpanded && (
                <button
                  onClick={() => setActiveTab("itinerary")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white bg-white/70 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-white hover:text-sky-700"
                >
                  {t('str_28c255d1')}<ArrowRight size={12} strokeWidth={2.6} />
                </button>
              )}
            </div>

            <AnimatePresence initial={false}>
              {isUtilityLayerExpanded && (
                <motion.div
                  initial={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: [0.19, 1, 0.22, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-4 px-3 pb-3 sm:px-0 sm:pb-0">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <EditorialSectionIntro
                        eyebrow=""
                        title={`把天氣、清單與分帳，綁回${destination ? ` ${destination} ` : "這趟"}旅程`}
                        description=""
                        highlights={[
                          {
                            label: "目的地",
                            value: destination || "等待同步",
                          },
                          {
                            label: "清單進度",
                            value: `${checklist.filter((item) => item.checked).length}/${checklist.length || 0}`,
                          },
                          {
                            label: "待結清",
                            value: `${settlements.length} 筆`,
                          },
                        ]}
                      />
                      <button
                        onClick={() => setActiveTab("itinerary")}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/92 bg-white/90 px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition-colors hover:border-sky-200 hover:text-sky-700"
                      >
                        {t('str_28c255d1')}<ArrowRight size={16} strokeWidth={2.6} />
                      </button>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {toolHighlights.map(({ icon: Icon, label, value, description }, index) => {
                        const decor = TOOLS_CARD_DECOR[index % TOOLS_CARD_DECOR.length];
                        return (
                        <div
                          key={label}
                          className={`editorial-card-soft relative overflow-hidden rounded-[22px] px-3.5 py-3 ${decor.shell}`}
                        >
                          <div className={`absolute -right-8 -top-8 size-16 rounded-full opacity-70 blur-2xl ${decor.glow}`} />
                          <div className="relative flex items-center justify-between gap-3">
                            <span className={`inline-flex items-center gap-2 rounded-full border bg-white/92 px-2.5 py-1 text-[11px] font-black shadow-sm ${decor.badge}`}>
                              <Icon size={14} strokeWidth={2.5} />
                              {label}
                            </span>
                            {tripInfo?.name ? (
                              <span className="truncate text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                {tripInfo.name}
                              </span>
                            ) : null}
                          </div>
                          <p className="relative mt-1.5 text-balance text-[14px] font-black tracking-[-0.01em] text-slate-900">{value}</p>
                          <ExpandableText
                            text={description}
                            previewLines={3}
                            minCharacters={72}
                            className="relative mt-1"
                            textClassName="text-pretty text-[13px] leading-[1.64] text-slate-600"
                            collapsedLabel={t('str_1cbb0f1')}
                            expandedLabel={t('str_ccf01')}
                          />
                          <div className="editorial-divider relative mt-2 pt-2 text-[10px] font-bold text-slate-500">
                            <span className="text-pretty line-clamp-2">{decor.note}</span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 xl:gap-8 auto-rows-min">
          {/* Top row */}
          <div className="col-span-1 md:col-span-1 lg:col-span-4 flex flex-col h-full">
            <ChecklistSection className="flex-1 h-full" />
          </div>
          <div className="col-span-1 md:col-span-1 lg:col-span-2 flex flex-col h-full gap-6">
            <WeatherCard className="flex-1" />
            <GoogleFormsCard tripId={activeTripId || undefined} />
          </div>

          {/* Bottom row */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col h-[680px]">
            <LedgerSection className="flex-1 h-full" />
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col h-full gap-6 xl:gap-8">
            <SettlementsSection />
            <SettlementHistorySection />
          </div>
        </div>

        <div className="h-px bg-slate-200/50 my-4" />

        <div className="flex flex-col gap-y-6">
          <EditorialSectionIntro
            eyebrow="For This Trip"
            title={t('str_3e98333e')}
            description=""
            highlights={[
              { label: "航班", value: "補齊移動節奏" },
              { label: "活動", value: "接回每日安排" },
              { label: "工具", value: "維持同一上下文" },
            ]}
            className="mb-2 mt-4"
            titleClassName="text-[24px] sm:text-[32px] md:text-4xl"
            descriptionClassName="text-[14px] sm:text-[16px] leading-6"
          />

          {/* Filters */}
          <div className="flex flex-row overflow-x-auto scrollbar-hide gap-3 mb-2 -mx-5 px-5 sm:mx-0 sm:px-0 py-2">
            <button
              onClick={() => setFilterMode("best")}
              className={cn(filterButtonClass(filterMode === "best"), "group flex shrink-0 items-center gap-2 backdrop-blur-md")}
            >
              <ArrowDownUp
                size={16}
                className={
                  filterMode === "best"
                    ? "text-sky-600"
                    : "text-slate-500 group-hover:text-sky-600"
                }
              />
              {t('str_2622dcdc')}</button>
            <button
              onClick={() => setFilterMode("cheapest")}
              className={cn(filterButtonClass(filterMode === "cheapest"), "group flex shrink-0 items-center gap-2 backdrop-blur-md")}
            >
              <SlidersHorizontal
                size={16}
                className={
                  filterMode === "cheapest"
                    ? "text-sky-600"
                    : "text-slate-500 group-hover:text-sky-600"
                }
              />
              {t('str_2662f1f1')}</button>
            <button
              onClick={() => setFilterMode("nonstop")}
              className={cn(filterButtonClass(filterMode === "nonstop"), "group flex shrink-0 items-center gap-2 backdrop-blur-md")}
            >
              <Plane
                size={16}
                className={
                  filterMode === "nonstop"
                    ? "text-sky-600"
                    : "text-slate-500 group-hover:text-sky-600"
                }
              />
              {t('str_385aa805')}</button>
          </div>

          <div className="grid grid-cols-1 gap-5 pb-6 md:grid-cols-2">
            {isLoadingOffers ? (
              <>
                <GlassCard className="!p-6 flex flex-col h-[280px] animate-pulse">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-3xl"></div>
                      <div className="w-24 h-6 bg-slate-200 rounded-md"></div>
                    </div>
                    <div className="w-20 h-8 bg-slate-200 rounded-md"></div>
                  </div>
                  <div className="flex justify-between items-center mb-8">
                    <div className="w-16 h-8 bg-slate-200 rounded-md"></div>
                    <div className="flex-1 mx-6 h-1 bg-slate-100"></div>
                    <div className="w-16 h-8 bg-slate-200 rounded-md"></div>
                  </div>
                  <div className="w-full h-12 bg-slate-200 rounded-full mt-auto"></div>
                </GlassCard>
                <GlassCard className="!p-5 flex flex-row gap-5 h-[280px] animate-pulse">
                  <div className="w-[130px] h-full bg-slate-200 rounded-[24px]"></div>
                  <div className="flex flex-col flex-1 py-1">
                    <div className="w-24 h-6 bg-slate-200 rounded-md mb-2"></div>
                    <div className="w-full h-12 bg-slate-200 rounded-md mb-auto"></div>
                    <div className="flex justify-between items-end mt-3">
                      <div className="w-12 h-6 bg-slate-200 rounded-md"></div>
                      <div className="w-16 h-8 bg-slate-200 rounded-md"></div>
                    </div>
                  </div>
                </GlassCard>
              </>
            ) : (
              <>
                {/* Flight Cards */}
                {displayedFlights.map((flight, idx) => (
                  <GlassCard
                    key={idx}
                    className="!p-4 sm:!p-4.5 flex flex-col border border-white/92 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    <div className="flex justify-between items-start mb-4.5">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-11 h-11 sm:w-11 sm:h-11 bg-fuchsia-50 text-fuchsia-500 rounded-3xl flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Plane className="w-6 h-6 transform -rotate-45" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[16px] sm:text-[18px] text-[#2C302E]">
                              {flight.airline}
                            </span>
                            <ExternalLink
                              size={14}
                              className="text-slate-500 dark:text-slate-300"
                            />
                          </div>
                          <span className="text-[12px] text-slate-500 dark:text-slate-400 font-bold tracking-[0.14em] uppercase">
                            {flight.direct || flight.stops === 0 ? "Direct" : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`} • {flight.duration}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[26px] sm:text-[32px] font-black text-fuchsia-500 leading-none group-hover:scale-105 transition-transform">
                          ${flight.price}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col mb-4 sm:mb-4.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                          <span className="text-[22px] sm:text-[26px] font-black text-[#2C302E] tracking-tight">
                            {flight.depTime}
                          </span>
                          <span className="text-[11px] sm:text-[12px] font-black text-slate-500 dark:text-slate-320 uppercase tracking-[0.18em]">
                            {flight.depCode}
                          </span>
                        </div>
                        <div className="flex-1 mx-4 sm:mx-6 flex items-center relative">
                          <div className="h-[2px] bg-slate-100 flex-1"></div>
                          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-fuchsia-400 shadow-sm" />
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[22px] sm:text-[26px] font-black text-[#2C302E] tracking-tight">
                            {flight.arrTime}
                          </span>
                          <span className="text-[11px] sm:text-[12px] font-black text-slate-500 dark:text-slate-320 uppercase tracking-[0.18em]">
                            {flight.arrCode}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        openRedirectModal({
                          provider: "Skyscanner",
                          affiliateUrl: flight.affiliateUrl || flight.affiliate_url,
                          itemId: flight.id || `flight-${idx}`,
                          airline: flight.airline,
                          departure: `${flight.depTime} ${flight.depCode}`,
                          arrival: `${flight.arrTime} ${flight.arrCode}`,
                          duration: flight.duration,
                          stops: flight.stops,
                          price: flight.price,
                          currency: flight.currency || "TWD",
                          emoji: "✈️",
                        });
                      }}
                      className="mt-auto w-full py-3.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white font-black text-[14px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ios-press hover:-translate-y-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_8px_16px_rgba(217,70,239,0.20)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_24px_rgba(217,70,239,0.26)]"
                    >
                      {t('str_14655fbb')}</button>
                  </GlassCard>
                ))}

                {/* Klook Cards */}
                {activities.map((item, idx) => (
                  <GlassCard
                    key={`klook-${idx}`}
                    onClick={() => {
                      openRedirectModal({
                        provider: "Klook",
                        affiliateUrl: item.affiliateUrl || "https://www.klook.com/",
                        itemId: `klook-${idx}`,
                        airline: item.title,
                        price: item.price,
                        currency: "TWD",
                        emoji: "🎫",
                      });
                    }}
                    className="!p-3.5 sm:!p-4 flex flex-row gap-3 sm:gap-3 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group border border-white/92 cursor-pointer"
                  >
                    <div className="relative w-[98px] sm:w-[118px] h-full shrink-0 overflow-hidden rounded-[18px] sm:rounded-[22px]">
                      <img
                        src={item.img}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        alt={item.title}
                      />
                    </div>
                    <div className="flex flex-col flex-1 py-1">
                      <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                        <span className="font-black text-fuchsia-500 text-[10px] sm:text-[11px] uppercase tracking-widest bg-fuchsia-50 px-2 py-0.5 sm:py-1 rounded-md">
                          {t('str_7c1ff610')}</span>
                      </div>
                      <h3 className="font-bold text-[#2C302E] leading-snug text-[15px] sm:text-[17px] mb-auto line-clamp-3">
                        {item.title}
                      </h3>

                      <div className="flex items-end justify-between mt-2 sm:mt-3">
                        <div className="flex items-center gap-1 sm:gap-1.5 bg-amber-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg border border-amber-100">
                          <Star
                            size={12}
                            className="text-amber-500 sm:w-3.5 sm:h-3.5"
                            fill="currentColor"
                          />
                          <span className="text-[12px] sm:text-[13px] font-black text-amber-700">
                            {item.rating}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[20px] sm:text-[24px] font-black text-fuchsia-500 leading-none">
                            ${item.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </>
            )}
          </div>
        </div>
        </div>
        )}
        {/* Mobile bottom nav spacer */}
        <div className="h-28 md:hidden shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}
