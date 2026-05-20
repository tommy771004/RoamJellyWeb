import React, { createContext, use, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import GlassCard from "./GlassCard";
import EditorialSectionIntro from "./EditorialSectionIntro";
import ExpandableText from "./ExpandableText";
import HorizontalScrollRail from "./HorizontalScrollRail";
import InfoPeekModal, { type InfoPeekContent } from "./InfoPeekModal";
import IconImg from "./ui/IconImg";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
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

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "春季";
  if (month >= 6 && month <= 8) return "夏季";
  if (month >= 9 && month <= 11) return "秋季";
  return "冬季";
}

function getCurrencyFromDestination(destination: string): string {
  if (!destination) return "TWD";
  const dest = destination.toLowerCase();
  if (dest.includes("日") || dest.includes("tokyo") || dest.includes("osaka"))
    return "JPY";
  if (dest.includes("韓") || dest.includes("seoul")) return "KRW";
  if (dest.includes("泰") || dest.includes("bangkok")) return "THB";
  if (dest.includes("美") || dest.includes("usa")) return "USD";
  if (dest.includes("歐") || dest.includes("paris") || dest.includes("london"))
    return "EUR";
  return "TWD";
}

function guessCategoryFromItem(text: string): ChecklistCategory {
  const t = text.toLowerCase();
  if (
    t.includes("護照") ||
    t.includes("簽證") ||
    t.includes("證件") ||
    t.includes("身分證") ||
    t.includes("機票") ||
    t.includes("門票") ||
    t.includes("卡") ||
    t.includes("錢包") ||
    t.includes("外币") ||
    t.includes("日圓") ||
    t.includes("牙刷") || // Wait, toothbrushes are toiletries, but other documents are separate
    t.includes("外幣") ||
    t.includes("保險") ||
    t.includes("憑證") ||
    t.includes("passport") ||
    t.includes("ticket") ||
    t.includes("card") ||
    t.includes("id") ||
    t.includes("cash") ||
    t.includes("money")
  ) {
    return "documents";
  }
  if (
    t.includes("充電") ||
    t.includes("線") ||
    t.includes("插") ||
    t.includes("轉接") ||
    t.includes("手機") ||
    t.includes("相機") ||
    t.includes("行動電源") ||
    t.includes("平板") ||
    t.includes("電腦") ||
    t.includes("耳機") ||
    t.includes("ipad") ||
    t.includes("power bank") ||
    t.includes("charger") ||
    t.includes("adapter") ||
    t.includes("electronics") ||
    t.includes("phone") ||
    t.includes("camera")
  ) {
    return "electronics";
  }
  if (
    t.includes("衣") ||
    t.includes("褲") ||
    t.includes("裙") ||
    t.includes("鞋") ||
    t.includes("襪") ||
    t.includes("帽") ||
    t.includes("外套") ||
    t.includes("內衣") ||
    t.includes("泳") ||
    t.includes("圍巾") ||
    t.includes("手套") ||
    t.includes("墨鏡") ||
    t.includes("太陽眼鏡") ||
    t.includes("clothes") ||
    t.includes("jacket") ||
    t.includes("shoes") ||
    t.includes("socks") ||
    t.includes("hat") ||
    t.includes("swimwear")
  ) {
    return "clothing";
  }
  if (
    t.includes("洗") ||
    t.includes("刷") ||
    t.includes("牙") ||
    t.includes("膏") ||
    t.includes("保養") ||
    t.includes("毛巾") ||
    t.includes("防曬") ||
    t.includes("隱形眼鏡") ||
    t.includes("保濕") ||
    t.includes("化妝") ||
    t.includes("洗面") ||
    t.includes("沐浴") ||
    t.includes("剃鬚") ||
    t.includes("刮鬍") ||
    t.includes("梳") ||
    t.includes("toiletries") ||
    t.includes("towel") ||
    t.includes("sunscreen") ||
    t.includes("shampoo") ||
    t.includes("soap") ||
    t.includes("brush")
  ) {
    return "toiletries";
  }
  return "other";
}

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

interface ExpenseForm {
  title: string;
  amount: string;
  currency: string;
  payer: string;
  splitWith: string[];
}

interface FormErrors {
  title?: string;
  amount?: string;
  payer?: string;
  splitWith?: string;
}

// ── Context interface ────────────────────────────────────────────────────────

interface ToolsTabState {
  loading: boolean;
  tip: string;
  weather: WeatherData | null;
  tripInfo: TripInfo | null;
  destination: string;
  checklist: ChecklistItem[];
  settlements: Settlement[];
  settlementHistory: SettlementHistoryEntry[];
  expenses: Expense[];
  clearedExpenses: Expense[];
  members: string[];
  expenseByCurrency: Record<string, number>;
  form: ExpenseForm;
  errors: FormErrors;
  submitting: boolean;
  aiLoading: boolean;
  clearingId: string | null;
}

interface ToolsTabActions {
  toggleCheck: (item: ChecklistItem) => void;
  handleAiPackingList: (customDest?: string, customSeason?: string, customPeople?: number, customDays?: number) => void;
  updateForm: (updater: (prev: ExpenseForm) => ExpenseForm) => void;
  clearFormError: (field: keyof FormErrors) => void;
  toggleSplitMember: (member: string) => void;
  submitExpense: () => void;
  handleClearSettlement: (settlement: {
    id: string;
    from: string;
    to: string;
    currency: string;
  }) => void;
  sendReminder: () => void;
  addCustomMember: (name: string) => void;
}

interface ToolsTabContextValue {
  state: ToolsTabState;
  actions: ToolsTabActions;
}

const ToolsTabContext = createContext<ToolsTabContextValue | null>(null);

function useToolsTabContext() {
  const ctx = use(ToolsTabContext);
  if (!ctx)
    throw new Error("useToolsTabContext must be used inside ToolsTabProvider");
  return ctx;
}

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
            const weatherData = await fetchWeather(
              tripInfoData.destination,
            ).catch(() => null);
            if (weatherData) setWeather(weatherData);
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

function WeatherCard() {
  const {
    state: { weather, destination, loading, tripInfo },
  } = useToolsTabContext();
  const { isOffline } = useAppStore();

  const getWeatherDescription = (code?: number) => {
    if (code === undefined) return "未知天氣";
    if (code === 0) return "晴朗";
    if (code === 1) return "晴時多雲";
    if (code === 2) return "多雲";
    if (code === 3) return "陰天";
    if (code === 45 || code === 48) return "起霧";
    if (code >= 51 && code <= 55) return "毛毛雨";
    if (code === 56 || code === 57) return "冰雨";
    if (code === 61 || code === 80) return "小雨";
    if (code === 63 || code === 81) return "中雨";
    if (code === 65 || code === 82) return "大雨";
    if (code === 66 || code === 67) return "結冰雨";
    if (code === 71 || code === 73 || code === 75 || code === 85 || code === 86)
      return "下雪";
    if (code === 77) return "冰霰";
    if (code >= 95 && code <= 99) return "雷雨";
    return "多雲";
  };

  // Determine target weather data from trip start date
  let targetWeather = null;
  let isCurrentDay = true;
  let targetDateString = "今天";

  if (weather) {
    const dailyForecast = weather.daily ?? [];
    targetWeather = {
      temp_current: weather.temp_current,
      temp_max: weather.temp_max,
      temp_min: weather.temp_min,
      rain_prob: weather.rain_prob,
      weather_code: weather.weather_code,
    };
    if (tripInfo?.startDate && dailyForecast.length > 0) {
      const start = new Date(tripInfo.startDate);
      if (!isNaN(start.getTime())) {
        const match = dailyForecast.find((d: any) => {
          const dDate = new Date(d.date);
          return (
            dDate.getTime() === start.getTime() || d.date === tripInfo.startDate
          );
        });
        if (match) {
          isCurrentDay = new Date().toDateString() === start.toDateString();
          targetDateString = isCurrentDay
            ? "今天"
            : `${start.getMonth() + 1}/${start.getDate()}`;
          targetWeather = {
            temp_current: isCurrentDay
              ? weather.temp_current
              : Math.round((match.temp_max + match.temp_min) / 2),
            temp_max: match.temp_max,
            temp_min: match.temp_min,
            rain_prob: match.rain_prob,
            weather_code: match.weather_code,
          };
        } else if (start.getTime() > new Date().getTime()) {
          targetDateString = `${start.getMonth() + 1}/${start.getDate()} (無預報)`;
          targetWeather = null; // Too far in the future
        }
      }
    }
  }

  const Icon = targetWeather && targetWeather.rain_prob >= 50 ? CloudRain : Sun;

  if (!weather && loading) {
    return (
      <GlassCard className="!p-6 sm:!p-8 mb-8 flex flex-col gap-4 animate-pulse">
        <div className="h-5 w-32 bg-slate-200 rounded-full" />
        <div className="h-3 w-24 bg-slate-100 rounded-full" />
        <div className="flex items-end justify-between mt-2">
          <div className="h-8 w-24 bg-sky-100 rounded-full" />
          <div className="h-14 w-16 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-12 w-full bg-slate-100 rounded-xl" />
      </GlassCard>
    );
  }

  const getOutfitSuggestion = (temp?: number, rainProb?: number) => {
    if (temp == null)
      return {
        title: "輕便舒適穿搭",
        desc: "建議搭飛機時洋蔥式穿搭，並預備舒適好走的鞋子。",
      };
    let desc = "建議帶件薄外套與好走的鞋。";
    let title = "輕薄層次穿搭";
    if (temp >= 28) {
      title = "透氣涼爽穿搭";
      desc = "建議穿著短袖與透氣材質，注意防曬避暑。";
    } else if (temp < 28 && temp >= 20) {
      title = "輕薄層次穿搭";
      desc = "建議短袖搭配薄外套，方便應對日夜溫差。";
    } else if (temp < 20 && temp >= 10) {
      title = "保暖防風穿搭";
      desc = "天氣微涼，建議準備長袖衣物與防風外套。";
    } else {
      title = "厚實禦寒穿搭";
      desc = "天氣寒冷，請準備保暖大衣、毛衣與圍巾。";
    }

    if (rainProb && rainProb >= 50) {
      desc += " 降雨機率高，請務必攜帶雨具出門。";
    }
    return { title, desc };
  };

  const outfit = getOutfitSuggestion(
    targetWeather?.temp_current,
    targetWeather?.rain_prob,
  );
  const weatherText = targetWeather
    ? getWeatherDescription(targetWeather.weather_code)
    : weather
      ? "無該日期的預報"
      : "未能取得天氣資料";

  return (
    <GlassCard className="!p-5 sm:!p-8 mb-6 sm:mb-8 flex flex-col relative overflow-hidden transition-all duration-200 hover:shadow-lg group glass-panel border-white/80">
      <div className="absolute -top-10 -right-10 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-sky-200/35 blur-[36px] pointer-events-none group-hover:scale-105 transition-transform duration-200" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-orange-200/25 blur-[28px] pointer-events-none group-hover:scale-105 transition-transform duration-200" />
      <div className="absolute top-5 left-5 flex gap-2 opacity-90">
        <span className="size-2 rounded-full bg-sky-300" />
        <span className="size-2 rounded-full bg-orange-300" />
        <span className="size-2 rounded-full bg-emerald-300" />
      </div>

      <div className="relative z-10">
        <div className="mb-5 flex flex-wrap items-center gap-2 pt-4 sm:pt-0">
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-white/82 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-sky-700 shadow-sm">
            天氣明信片
          </span>
          {destination ? (
            <span className="inline-flex items-center rounded-full border border-orange-100 bg-orange-50/90 px-3 py-1 text-[11px] font-black text-orange-700 shadow-sm">
              {destination}
            </span>
          ) : null}
        </div>
        <h2 className="text-balance text-[26px] sm:text-3xl font-black text-slate-900 mb-1 leading-tight">
          {targetDateString}在 {destination || "您的目的地"}
        </h2>
        <div className="flex flex-col gap-1 mb-5 sm:mb-6">
          <p className="text-[11px] sm:text-xs uppercase text-sky-700 font-black">
            當地氣象與穿搭建議
          </p>
          {isOffline && (
            <span className="text-[9px] sm:text-xs text-amber-600 font-bold bg-amber-50 w-fit px-2.5 py-0.5 rounded-full border border-amber-200 shadow-sm mt-1">
              最後更新於 2 小時前
            </span>
          )}
        </div>

        <div className="flex items-center sm:items-end justify-between mb-5 sm:mb-6 glass-panel p-4 sm:p-5 rounded-[28px] sm:rounded-[36px] border border-white/70 shadow-[0_8px_20px_rgba(244,114,182,0.1)]">
          <div className="flex flex-col gap-3">
            <div className="flex bg-white/80 backdrop-blur-md rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 items-center gap-2 border border-slate-100 shadow-sm w-fit">
              <Icon
                size={16}
                className="text-sky-500 sm:w-[18px] sm:h-[18px]"
                strokeWidth={2.5}
              />
              <span className="text-slate-700 font-black text-xs sm:text-sm">
                {weatherText}
              </span>
            </div>
            {targetWeather && (
              <span className="text-slate-500 font-bold text-[11px] sm:text-xs tracking-wider pl-1 flex items-center gap-2">
                <span>最高 {targetWeather.temp_max ?? "--"}°</span>
                <span className="opacity-50">|</span>
                <span>最低 {targetWeather.temp_min ?? "--"}°</span>
                <span className="opacity-50">|</span>
                <span>降雨 {targetWeather.rain_prob}%</span>
              </span>
            )}
          </div>
          <div className="flex flex-col items-end rounded-[28px] border border-white/80 bg-white/78 px-4 py-3 shadow-[0_4px_16px_rgba(244,114,182,0.08)]">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-350">
              today vibe
            </span>
            <div className="text-[48px] sm:text-[56px] leading-none font-black tracking-tighter text-slate-800 drop-shadow-sm flex items-start gap-1 whitespace-nowrap">
              {targetWeather?.temp_current != null
                ? targetWeather.temp_current
                : "--"}
              <span className="text-2xl mt-2 font-bold text-slate-500">°</span>
            </div>
          </div>
        </div>

        <div className="glass-panel backdrop-blur-md rounded-[28px] sm:rounded-[36px] p-4 flex items-center gap-4 border border-white/70 shadow-[0_8px_20px_rgba(14,165,233,0.12)] mb-5 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-2xl bg-white/86 flex items-center justify-center text-sky-600 shadow-inner border border-white shrink-0 group-hover:-translate-y-0.5 transition-transform duration-200">
            <Sparkles size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-800 font-black text-sm">
              {outfit.title}
            </span>
            <span className="text-slate-500 text-[11px] sm:text-sm font-bold leading-snug mt-0.5">
              {outfit.desc}
            </span>
          </div>
        </div>

        {weather && weather.daily && weather.daily.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-sky-100/80 pt-4">
            <span className="text-[11px] uppercase text-sky-700 font-bold mb-1">
              14-Day Forecast
            </span>
            <HorizontalScrollRail
              label="天氣預報"
              viewportClassName="pb-4 -mx-2 px-2"
              contentClassName="gap-3"
              controlsVisibilityClass="flex"
            >
              {weather.daily.map((day: any, idx: number) => {
                const date = new Date(day.date);
                const dayName = new Intl.DateTimeFormat("en-US", {
                  weekday: "short",
                }).format(date);
                const isRainy = day.rain_prob >= 50;
                const DayIcon = isRainy ? CloudRain : Sun;
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center flex-shrink-0 glass-panel shadow-sm rounded-2xl w-[72px] py-3 snap-center"
                  >
                    <span className="text-xs font-bold text-slate-500 mb-2">
                      {idx === 0 ? "Today" : dayName}
                    </span>
                    <DayIcon
                      size={20}
                      className={isRainy ? "text-blue-400" : "text-amber-400"}
                    />
                    <div className="mt-3 flex gap-1 items-baseline font-bold">
                      <span className="text-sm text-slate-700">
                        {day.temp_max}°
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {day.temp_min}°
                      </span>
                    </div>
                  </div>
                );
              })}
            </HorizontalScrollRail>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function ChecklistSection() {
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
    <section className="mb-8 font-sans">
      <div className="flex justify-between items-end mb-4 sm:mb-6 px-1 sm:px-2">
        <h2 className="text-balance text-[26px] sm:text-[28px] font-black text-slate-900">
          旅途清單
        </h2>
        <span className="text-[11px] sm:text-xs uppercase font-black text-sky-700 bg-sky-100/90 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-sky-200">
          已整理 {packedCount}/{checklist.length}
        </span>
      </div>

      <GlassCard className="!p-4 sm:!p-6 mb-4 sm:mb-6 glass-panel">
        {checklist.length === 0 && (
          <span className="text-sm text-slate-500 italic">
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
          const grouped = ORDER.map((cat) => ({
            cat,
            meta: CAT_META[cat],
            items: checklist.filter(
              (i: any) => (i.category ?? "other") === cat,
            ),
          })).filter((g) => g.items.length > 0);
          return grouped.map(({ cat, meta, items: catItems }) => (
            <div key={cat} className="editorial-card-soft mb-4 rounded-[32px] p-3.5 sm:p-5 last:mb-0 shadow-[0_8px_24px_rgba(244,114,182,0.06)] hover:shadow-[0_12px_28px_rgba(244,114,182,0.12)] transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <IconImg value={meta.emoji} size={18} />
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  {meta.label}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {catItems.map((item: any) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-4 group p-3 min-h-[52px] rounded-2xl transition-colors ${isOffline ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-white/80"}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!isOffline) actions.toggleCheck(item);
                    }}
                  >
                    <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                      <input
                        readOnly
                        checked={item.checked}
                        className="peer sr-only"
                        type="checkbox"
                      />
                      <motion.div
                        animate={
                          item.checked
                            ? { scale: [1, 1.2, 1], backgroundColor: "#a855f7" }
                            : { scale: 1, backgroundColor: "#f8fafc" }
                        }
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 28,
                          duration: 0.3,
                        }}
                        className={`w-full h-full rounded-full border shadow-sm ${item.checked ? "border-fuchsia-500" : "border-slate-200"}`}
                      />
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        initial={false}
                        animate={
                          item.checked
                            ? { scale: 1, opacity: 1 }
                            : { scale: 0.5, opacity: 0 }
                        }
                        transition={{
                          type: "spring",
                          stiffness: 600,
                          damping: 30,
                        }}
                      >
                        <Check
                          size={14}
                          className="text-white"
                          strokeWidth={3}
                        />
                      </motion.div>
                    </div>
                    <motion.span
                      animate={
                        item.checked
                          ? { opacity: 0.4, x: 0 }
                          : { opacity: 1, x: 0 }
                      }
                      transition={{ duration: 0.2 }}
                      className={`text-[15px] font-medium ${item.checked ? "line-through text-slate-500" : "text-[#2C302E]"}`}
                    >
                      {item.text}
                    </motion.span>
                  </label>
                ))}
              </div>
            </div>
          ));
        })()}
      </GlassCard>

      {/* Brand New Custom AI Packing List Generator Section */}
      <GlassCard className="!p-5 sm:!p-6 mb-4 border-pink-100 bg-pink-50/15 relative overflow-hidden rounded-[2.5rem]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-200/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-200/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-pink-500 animate-pulse" />
          <h3 className="text-lg font-black text-slate-800">AI 推薦行李助手</h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 bg-pink-50 border border-pink-100 px-2.5 py-1 rounded-full ml-auto">
            Smart Packing Assistant
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-5 leading-relaxed font-semibold">
          依據目的地、季節和同行人數，AI 能客製產生一份合適的打包必備行李，幫您省去行前煩惱。
        </p>

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
              className="flex h-11 w-full rounded-xl border border-outline bg-white/90 text-on-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm appearance-none cursor-pointer"
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
          className="macaron-gradient text-sky-900 font-extrabold text-[14px] leading-none tracking-wide h-12 w-full flex items-center justify-center gap-2 rounded-full shadow-[0_4px_14px_rgba(244,114,182,0.18)] hover:shadow-[0_6px_20px_rgba(244,114,182,0.28)] hover:-translate-y-0.5 active:scale-95 duration-200 transition-all border border-pink-200 cursor-pointer disabled:opacity-50 disabled:-translate-y-0 select-none font-sans"
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
              className="mt-4 bg-white/60 rounded-2xl p-4 border border-pink-100 flex flex-col gap-3 font-sans opacity-95"
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
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-350 font-mono">AI recommendations</span>
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
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none min-h-[50px] ${
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
                            item.selected ? "bg-fuchsia-500 border-fuchsia-500 text-white" : "bg-white border-slate-300"
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
                  className="macaron-gradient border border-pink-200 text-sky-900 font-extrabold rounded-full h-11 shadow-sm hover:shadow active:scale-95 duration-150"
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

function LedgerSection() {
  const {
    state: { form, errors, members, submitting, expenses },
    actions,
  } = useToolsTabContext();
  const { isOffline } = useAppStore();
  const [newMemberName, setNewMemberName] = useState("");

  const handleAddMember = () => {
    const name = newMemberName.trim();
    if (!name) return;
    actions.addCustomMember(name);
    setNewMemberName("");
  };
  return (
    <GlassCard className="!p-6 flex flex-col mb-8 relative overflow-hidden transition-all duration-300 glass-panel">
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-pink-100/45 rounded-full blur-[24px] pointer-events-none" />
      <div className="absolute -bottom-12 -right-8 w-36 h-36 bg-sky-100/35 rounded-full blur-[28px] pointer-events-none" />
      <div className="mb-6 flex items-start justify-between gap-4 relative z-10 px-2">
        <div>
          <span className="inline-flex items-center rounded-full border border-pink-100 bg-white/88 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-pink-700 shadow-sm">
            Trip Split
          </span>
          <h3 className="mt-3 text-balance text-[26px] sm:text-[28px] font-black text-slate-900">
            把代墊、分攤與提醒收成同一張旅伴帳單
          </h3>
          <span className="mt-2 block text-sm font-bold text-slate-500">
            先記錄最新花費，再讓結算跟著這趟旅程慢慢收斂。
          </span>
        </div>
        <div className="shrink-0 rounded-[28px] border border-white/80 bg-white/82 px-4 py-3 text-right shadow-[0_4px_16px_rgba(244,114,182,0.08)]">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-350">本趟摘要</div>
          <div className="mt-1 text-lg font-black text-slate-900">{expenses.length} 筆</div>
          <div className="text-[12px] font-bold text-slate-500">{members.length || 0} 位旅伴</div>
        </div>
      </div>

      <div className="flex flex-col gap-y-5 relative z-10">
        {/* Recent Expenses List */}
        {expenses && expenses.length > 0 && (
          <div className="flex flex-col gap-3 mb-4 w-full rounded-[32px] border border-white/90 bg-white/78 p-4 shadow-[0_8px_24px_rgba(244,114,182,0.08)] hover:shadow-[0_12px_28px_rgba(244,114,182,0.12)] transition-shadow">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-2">
              最新花費紀錄
            </span>
            <div className="table-wrapper mt-2">
              <table className="responsive-table">
                <caption className="sr-only">最新花費清單</caption>
                <thead>
                  <tr>
                    <th scope="col">支出項目</th>
                    <th scope="col">代墊人</th>
                    <th scope="col" className="amount">
                      金額
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses
                    .slice()
                    .reverse()
                    .map((exp) => (
                      <tr key={exp.id}>
                        <td data-label="支出項目">
                          <div className="flex flex-col items-end md:items-start">
                            <span className="text-[15px] font-bold text-[#2C302E] truncate">
                              {exp.title}
                            </span>
                          </div>
                        </td>
                        <td data-label="代墊人">
                          <div className="flex justify-end md:justify-start">
                            <span className="text-[12px] font-bold tracking-wide flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              {exp.payer}
                            </span>
                          </div>
                        </td>
                        <td data-label="金額" className="amount">
                          <div className="flex flex-col items-end">
                            <span className="font-black text-fuchsia-500 text-[16px] tabular-nums">
                              {exp.currency} {exp.amount.toLocaleString()}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="h-px w-full bg-slate-100 my-2" />
          </div>
        )}

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
              className="w-full flex h-12 rounded-xl border border-outline bg-surface text-on-surface px-3 py-2 text-sm ring-offset-surface outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm appearance-none text-center cursor-pointer transition-colors"
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
          <Label htmlFor="custom-member-input" className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-350 ml-2">
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
                className="h-10 text-[13px] rounded-full border-slate-200/80 px-4 bg-slate-50/50 focus:bg-white"
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

        <Button
          onClick={() => void actions.submitExpense()}
          disabled={submitting || isOffline}
          size="lg"
          className="w-full mt-4 py-6 rounded-[24px] flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis px-4 bg-gradient-to-r from-pink-500 via-orange-400 to-sky-500 text-white shadow-[0_14px_30px_rgba(244,114,182,0.20)] hover:opacity-95"
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

function SettlementsSection() {
  const {
    state: { settlements, expenseByCurrency, clearingId },
    actions,
  } = useToolsTabContext();
  const { isOffline } = useAppStore();
  const currencyEntries = Object.entries(expenseByCurrency);
  return (
    <section className="flex flex-col mb-16 sm:mb-32">
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

      <GlassCard className="!p-4 sm:!p-6 glass-panel">
      <div className="flex flex-col gap-4 w-full">
        {settlements.length === 0 && (
          <div className="editorial-card-soft flex flex-col items-center justify-center text-center rounded-[32px] p-12 bg-gradient-to-tr from-emerald-500/5 via-teal-500/5 to-white/90 border border-emerald-100/60 shadow-[inset_0_1px_1px_rgba(255,255,255,1)]">
            <div className="relative mb-4 flex items-center justify-center">
              <div className="absolute inset-x-0 size-16 bg-emerald-100 animate-ping rounded-full opacity-25 pointer-events-none" />
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
        {settlements.length > 0 && (
          <div className="editorial-card-soft table-wrapper mt-2 overflow-hidden rounded-[32px] sm:rounded-[36px] p-2 sm:p-3 shadow-[0_8px_24px_rgba(244,114,182,0.06)] hover:shadow-[0_12px_28px_rgba(244,114,182,0.1)] transition-shadow">
            <table className="responsive-table">
              <caption className="sr-only">結算清單</caption>
              <thead>
                <tr>
                  <th scope="col">付款人</th>
                  <th scope="col">收款人</th>
                  <th scope="col" className="amount">
                    結算金額
                  </th>
                  <th scope="col" className="text-right">
                    動作
                  </th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((settlement) => (
                  <tr key={settlement.id}>
                    <td data-label="付款人">
                      <div className="flex justify-end md:justify-start items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-black text-sm">
                          {settlement.from?.charAt(0) || "?"}
                        </div>
                        <span className="text-[15px] font-bold text-[#2C302E]">
                          {settlement.from}
                        </span>
                      </div>
                    </td>
                    <td data-label="收款人">
                      <div className="flex justify-end md:justify-start">
                        <span className="text-[13px] text-slate-500 font-medium px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                          支付給{" "}
                          <strong className="font-bold text-slate-700">
                            {settlement.to}
                          </strong>
                        </span>
                      </div>
                    </td>
                    <td data-label="結算金額" className="amount">
                      <div className="flex justify-end">
                        <span className="font-black text-fuchsia-500 text-[18px] tabular-nums">
                          {settlement.currency}{" "}
                          {settlement.amount.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td data-label="動作">
                      <div className="flex flex-row items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] px-4"
                          onClick={() => void actions.sendReminder()}
                        >
                          <Send size={14} className="opacity-70 mr-1.5" />
                          <span className="text-[11px] font-bold tracking-wide uppercase">
                            提醒
                          </span>
                        </Button>

                        <Button
                          variant="default"
                          size="sm"
                          className="min-h-[44px] px-4"
                          onClick={() =>
                            void actions.handleClearSettlement(settlement)
                          }
                          disabled={clearingId === settlement.id || isOffline}
                        >
                          <CheckCircle2
                            size={14}
                            className="opacity-90 mr-1.5"
                          />
                          <span className="text-[11px] font-bold tracking-wide uppercase">
                            {clearingId === settlement.id ? "處理中" : "結清"}
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </GlassCard>
    </section>
  );
}

function SettlementHistorySection() {
  const {
    state: { settlementHistory, clearedExpenses },
  } = useToolsTabContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (settlementHistory.length === 0) return null;

  return (
    <section className="flex flex-col mb-12 transform-gpu">
      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
          <h3 className="font-serif text-[18px] text-[#2C302E] font-bold">歷史結清明細</h3>
        </div>
        <span className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
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
            <GlassCard
              key={entry.clearedAt}
              className={`!p-5 flex flex-col gap-1.5 transition-all duration-300 cursor-pointer rounded-[24px] border ${
                isExpanded 
                  ? 'bg-white/95 border-emerald-200/60 shadow-[0_16px_32px_rgba(16,185,129,0.08)] ring-1 ring-emerald-500/10' 
                  : 'bg-white/50 border-white/60 shadow-[0_8px_20px_rgba(0,0,0,0.02)] hover:bg-white/80 hover:shadow-[0_12px_24px_rgba(16,185,129,0.04)] hover:scale-[1.005]'
              }`}
              onClick={() => setExpandedId(isExpanded ? null : entry.clearedAt)}
            >
              <div className="flex items-center gap-4 w-full">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 transform-gpu ${
                  isExpanded 
                    ? 'bg-emerald-500 scale-110 rotate-[360deg] shadow-[0_4px_12px_rgba(16,185,129,0.3)] text-white' 
                    : 'bg-emerald-50 border border-emerald-100 text-emerald-500'
                }`}>
                  <CheckCircle2 size={18} className={isExpanded ? 'text-white' : 'text-emerald-500'} />
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
                <div className="text-slate-400 pl-1 shrink-0">
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-emerald-500 font-bold' : ''}`}
                  />
                </div>
              </div>

              {/* Expansion block */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      type: "spring",
                      damping: 28,
                      stiffness: 200,
                      mass: 0.8,
                    }}
                    className="overflow-hidden w-full"
                    onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking within details
                  >
                    <div className="border-t border-slate-100/80 mt-4 pt-4 flex flex-col gap-2">
                      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 mb-2 pl-1">
                        此批結清花費項目 ({matchingExpenses.length} 筆)
                      </div>
                      
                      {matchingExpenses.length === 0 ? (
                        <div className="text-slate-400 text-[12.5px] italic pl-1">
                          無對應花費明細紀錄。
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5 rounded-2xl bg-slate-50/70 border border-slate-100/80 p-4 shadow-inner">
                          {matchingExpenses.map((exp) => (
                            <div key={exp.id} className="flex items-center justify-between text-[13px] py-2 px-3 rounded-xl bg-white/40 border border-white/50 shadow-[0_2px_6px_rgba(0,0,0,0.01)] hover:bg-white/60 transition-all duration-200">
                              <div className="flex flex-col min-w-0">
                                <span className="font-extrabold text-slate-700 truncate">{exp.title}</span>
                                <span className="text-[11px] text-slate-400 mt-0.5 font-semibold flex items-center gap-1">
                                  <span>由</span>
                                  <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md font-bold text-[10px]">{exp.payer}</span>
                                  <span>支付</span>
                                </span>
                              </div>
                              <span className="font-black text-slate-700 bg-white/80 border border-slate-100/60 px-2 py-0.5 rounded-lg text-xs tabular-nums">
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
            </GlassCard>
          );
        })}
      </div>
    </section>
  );
}

// ── Trip selector bar ─────────────────────────────────────────────────────────

function TripSelectorBar() {
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
      label="旅程切換"
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
                "px-5 py-4 flex flex-col rounded-[24px] border transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] text-left shadow-sm shrink-0 min-w-[120px] max-w-[240px] overflow-hidden group",
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
  return (
    <ToolsTabProvider>
      <ToolsTabContent />
    </ToolsTabProvider>
  );
}

function ToolsTabContent() {
  const { activeTripId, setActiveTab } = useAppStore();
  const {
    state: { loading, checklist, destination, settlements, tripInfo, weather, tip },
  } = useToolsTabContext();
  const [flights, setFlights] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [filterMode, setFilterMode] = useState<"best" | "filters" | "nonstop">(
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
    if (filterMode === "nonstop") {
      result = result.filter((f) => f.direct || f.stops === 0);
    } else if (filterMode === "filters") {
      // Just an example filter, e.g., price < 15000
      result = result.filter((f) => f.price < 15000);
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
                旅程工具包
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                <h2 className="text-balance text-2xl font-black leading-tight text-slate-900 sm:text-[34px] md:text-[40px]">
                  請先選擇或建立行程
                </h2>
                <p className="text-pretty text-[13px] leading-relaxed text-slate-600 sm:text-base sm:leading-7">
                  工具包與特定行程綁定。選擇行程後即可查看天氣、管理清單與紀錄分帳。
                </p>
              </div>

              {/* Collapsible pillars — mobile collapsed by default */}
              <div className="rounded-[24px] border border-white/80 bg-white/50 overflow-hidden md:contents">
                <button
                  type="button"
                  onClick={() => setIsPillarsExpanded(v => !v)}
                  className="md:hidden w-full flex items-center justify-between px-4 py-3 text-left"
                  aria-expanded={isPillarsExpanded}
                >
                  <span className="text-[13px] font-black text-slate-700">功能說明（3 項）</span>
                  <ChevronDown
                    size={18}
                    strokeWidth={2.5}
                    className={`text-slate-500 dark:text-slate-350 transition-transform duration-200 ${isPillarsExpanded ? 'rotate-180' : ''}`}
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
                        <span className="rounded-full border border-white/80 bg-white/88 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-350 shadow-sm">
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
                        collapsedLabel="看更多內容"
                        expandedLabel="收起重點"
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
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/90 bg-white/92 px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md"
                        >
                          查看說明
                          <ArrowRight size={12} strokeWidth={2.6} />
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
                  className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-sky-400 to-sky-600 px-6 py-3 text-[14px] font-black text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_24px_rgba(14,165,233,0.35)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] hover:-translate-y-1 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_28px_rgba(14,165,233,0.45)]"
                >
                  <Sparkles size={18} strokeWidth={2.5} />
                  直接交給 AI 開始規劃
                </button>
                <button
                  onClick={() => setActiveTab("home")}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-slate-200/60 bg-white/70 px-6 py-3 text-[14px] font-black text-slate-700 shadow-[0_4px_16px_rgba(0,0,0,0.03)] backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] hover:-translate-y-1 hover:border-sky-300/60 hover:text-sky-700 hover:shadow-[0_8px_20px_rgba(14,165,233,0.12)]"
                >
                  先回首頁看流程
                </button>
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
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-white/12 text-sky-200 shadow-inner">
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
                        查看說明
                        <ArrowRight size={12} strokeWidth={2.6} />
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
      className="flex-1 w-full overflow-y-auto scroll-smooth bg-transparent text-slate-900 transition-colors"
    >
      <div className="pt-4 sm:pt-8 pb-tab-safe px-3.5 sm:px-6 md:px-8 mx-auto flex flex-col w-full max-w-[1120px] gap-y-6 sm:gap-y-10">
        <TripSelectorBar />

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 my-8 rounded-[32px] glass-panel bg-white/50 dark:bg-slate-800/40 min-h-[400px]">
            <Loader2 size={36} strokeWidth={2.5} className="animate-spin text-sky-400 mb-6 drop-shadow-sm" />
            <h3 className="text-xl font-black text-slate-700 dark:text-slate-200 tracking-tight mb-2">
              正在載入旅程工具包
            </h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {tip || "正在同步天氣與分帳清單資料..."}
            </p>
          </div>
        ) : tip ? (
          <div className="flex flex-col items-center justify-center p-12 my-8 rounded-[32px] glass-panel bg-[#fff1f2]/80 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 min-h-[300px]">
             <AlertCircle className="text-rose-500 mb-4" size={36} />
             <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">載入發生錯誤</h3>
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
                  回到行程 <ArrowRight size={12} strokeWidth={2.6} />
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
                        回到行程
                        <ArrowRight size={16} strokeWidth={2.6} />
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
                              <span className="truncate text-[11px] font-bold text-slate-550 dark:text-slate-300">
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
                            collapsedLabel="看更多"
                            expandedLabel="收起"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          <div className="flex flex-col gap-y-6">
            <WeatherCard />
            <ChecklistSection />
          </div>
          <div className="flex flex-col gap-y-6">
            <LedgerSection />
            <SettlementsSection />
            <SettlementHistorySection />
          </div>
        </div>

        <div className="h-px bg-slate-200/50 my-4" />

        <div className="flex flex-col gap-y-6">
          <EditorialSectionIntro
            eyebrow="For This Trip"
            title="把延伸選項接回這趟旅程"
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
              優先推薦
            </button>
            <button
              onClick={() => setFilterMode("filters")}
              className={cn(filterButtonClass(filterMode === "filters"), "group flex shrink-0 items-center gap-2 backdrop-blur-md")}
            >
              <SlidersHorizontal
                size={16}
                className={
                  filterMode === "filters"
                    ? "text-sky-600"
                    : "text-slate-500 group-hover:text-sky-600"
                }
              />
              快速篩選
            </button>
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
              直飛優先
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 pb-6 md:grid-cols-2">
            {isLoadingOffers ? (
              <>
                <GlassCard className="!p-6 flex flex-col h-[280px] animate-pulse">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
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
                        <div className="w-10 h-10 sm:w-11 sm:h-11 bg-fuchsia-50 text-fuchsia-500 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
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
                          <span className="text-[12px] text-slate-500 dark:text-slate-350 font-bold tracking-[0.14em] uppercase">
                            Direct • {flight.duration}
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

                    <button className="mt-auto w-full py-3.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white font-black text-[14px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] hover:-translate-y-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_8px_16px_rgba(217,70,239,0.20)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_24px_rgba(217,70,239,0.26)]">
                      查看航班詳情
                    </button>
                  </GlassCard>
                ))}

                {/* Klook Cards */}
                {activities.map((item, idx) => (
                  <GlassCard
                    key={`klook-${idx}`}
                    className="!p-3.5 sm:!p-4 flex flex-row gap-3 sm:gap-3 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group border border-white/92"
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
                          Klook 精選
                        </span>
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
