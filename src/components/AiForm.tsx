import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from "react";
import {
  MapPin,
  Minus,
  Plus,
  Settings2,
  Sparkles,
  ArrowLeft,
  Search,
  Calendar,
  Users,
  Heart,
  Coffee,
  Car,
  DollarSign,
  Check,
  Footprints,
  Baby,
  Accessibility,
  PawPrint,
  UsersRound,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { LocationPickerPopup } from "./LocationPickerPopup";
import { useSearchStore } from "../store/useSearchStore";
import { useKeyboardHeight } from "../lib/useKeyboardHeight";
import { normalizeProfileList } from "../lib/arrays";

const COMPANION_OPTIONS = [
  {
    id: "solo",
    label: "獨自行走",
    icon: Footprints,
    tone: "border-sky-100 bg-sky-50 text-sky-600",
  },
  {
    id: "couple",
    label: "浪漫雙人",
    icon: Heart,
    tone: "border-rose-100 bg-rose-50 text-rose-600",
  },
  {
    id: "family",
    label: "親子育兒",
    icon: Baby,
    tone: "border-orange-100 bg-orange-50 text-orange-600",
  },
  {
    id: "elderly",
    label: "帶長輩",
    icon: Accessibility,
    tone: "border-amber-100 bg-amber-50 text-amber-700",
  },
  {
    id: "friends",
    label: "三五好友",
    icon: UsersRound,
    tone: "border-sky-100 bg-sky-50 text-sky-600",
  },
  {
    id: "pets",
    label: "毛小孩",
    icon: PawPrint,
    tone: "border-emerald-100 bg-emerald-50 text-emerald-600",
  },
];

const VIBE_OPTIONS = [
  "特種兵急行軍",
  "睡到自然醒",
  "隨興漫遊",
  "在地深度文化",
  "網美打卡秘境",
  "奢華極致享受",
  "文青慢活步調",
  "夜生活狂歡",
];
const INTEREST_OPTIONS = [
  "大自然與絕景",
  "歷史文化遺產",
  "購物血拼逛街",
  "主題遊樂園",
  "在地特色美食",
  "戶外刺激冒險",
  "藝術與博物館",
  "溫泉桑拿放鬆",
  "海島水上活動",
  "特色網美咖啡",
  "尋訪動漫朝聖",
];
const DIETARY_OPTIONS = [
  "無限制",
  "純素食",
  "蛋奶素",
  "海鮮素",
  "無麩質",
  "不吃牛",
  "不吃海鮮",
  "清真認證",
];
const TRANSPORT_OPTIONS = ["大眾運輸", "自駕租車", "包車導覽", "徒步與腳踏車"];
const BUDGET_OPTIONS = ["背包窮遊", "精打細算小資", "舒適無虞", "奢華尊榮"];
const PACE_OPTIONS = ["緊湊特種兵", "適中", "悠閒慢活"];
const ACCOMMODATION_OPTIONS = [
  "青旅",
  "商務旅館",
  "星級飯店",
  "特色民宿",
  "包棟/Villa",
];
const AI_FORM_ENTRY_PILLS = ["先起草行程", "再補偏好", "最後回行程調整"];

export interface AiFormData {
  departure: string;
  destination: string;
  days: number;
  companions: string;
  vibes: string[];
  interests: string[];
  dietary: string[];
  transport: string[];
  budget: string;
  pace: string;
  accommodation: string[];
}

export const MultiSelectPill: React.FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
  accentColor?: "indigo" | "emerald" | "rose" | "blue" | "amber";
}> = ({ label, selected, onClick, accentColor = "indigo" }) => {
    const { t } = useTranslation();
  const selectedClasses: Record<string, string> = {
    indigo: "bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-950/80 dark:border-indigo-500/50 dark:text-indigo-300 dark:shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.4),inset_3px_3px_6px_rgba(129,140,248,0.25)]",
    emerald: "bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-500/50 dark:text-emerald-300 dark:shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.4),inset_3px_3px_6px_rgba(52,211,153,0.25)]",
    rose: "bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950/80 dark:border-rose-500/50 dark:text-rose-300 dark:shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.4),inset_3px_3px_6px_rgba(251,113,133,0.25)]",
    blue: "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950/80 dark:border-blue-500/50 dark:text-blue-300 dark:shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.4),inset_3px_3px_6px_rgba(96,165,250,0.25)]",
    amber: "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/80 dark:border-amber-500/50 dark:text-amber-300 dark:shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.4),inset_3px_3px_6px_rgba(251,191,36,0.25)]",
  };

  const ringClasses: Record<string, string> = {
    indigo: "ring-indigo-500/20",
    emerald: "ring-emerald-500/20",
    rose: "ring-rose-500/20",
    blue: "ring-blue-500/20",
    amber: "ring-amber-500/20",
  };

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-[44px] px-3.5 sm:px-4.5 py-2.5 rounded-[20px] text-sm font-semibold tracking-normal transition-all duration-[200ms] relative overflow-hidden flex items-center justify-center gap-2 ${
        selected
          ? `${selectedClasses[accentColor]} translate-y-[2px] !shadow-[3px_3px_0_rgba(15,23,42,0.08),inset_2px_2px_4px_rgba(0,0,0,0.06)] dark:!shadow-[3px_3px_0_rgba(2,6,23,0.4),inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.08)] border-[3px]`
          : "clay-btn bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-white/80 dark:border-white/20"
      }`}
    >
      {selected && <Check size={16} strokeWidth={3} aria-hidden="true" className="shrink-0" />}
      <span className="relative z-10">{t('ai_preferences_options.' + label, label)}</span>
    </button>
  );
};

export default function AiForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
}: {
  onSubmit: (data: AiFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  errorMessage?: string;
}) {
  const { t } = useTranslation();
  const { aiProfile, saveAiProfile } = useSearchStore();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const keyboardHeight = useKeyboardHeight();
  const [step, setStep] = useState(1);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [showDepDropdown, setShowDepDropdown] = useState(false);
  const [formData, setFormData] = useState<AiFormData>({
    departure: "",
    destination: "",
    days: 5,
    companions: "",
    vibes: [],
    interests: [],
    dietary: [],
    transport: [],
    budget: "",
    pace: "",
    accommodation: [],
  });

  useEffect(() => {
    if (!aiProfile) return;

    setFormData((prev) => ({
      ...prev,
      departure: prev.departure || aiProfile.departure || "",
      companions: prev.companions || aiProfile.companions || "",
      vibes: prev.vibes.length
        ? prev.vibes
        : normalizeProfileList(aiProfile.vibes),
      interests: prev.interests.length
        ? prev.interests
        : normalizeProfileList(aiProfile.interests),
      dietary: prev.dietary.length
        ? prev.dietary
        : normalizeProfileList(aiProfile.dietary),
      transport: prev.transport.length
        ? prev.transport
        : normalizeProfileList(aiProfile.transport),
      budget: prev.budget || aiProfile.budget || "",
      pace: prev.pace || aiProfile.pace || "",
      accommodation: prev.accommodation.length
        ? prev.accommodation
        : normalizeProfileList(aiProfile.accommodation),
    }));
  }, [aiProfile]);

  const handleNext = () => {
    if (formData.departure && formData.destination && formData.companions) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const toggleArrayItem = (
    field: "vibes" | "interests" | "dietary" | "transport" | "accommodation",
    item: string,
  ) => {
    setFormData((prev) => {
      const arr = prev[field];
      if (arr.includes(item)) {
        return { ...prev, [field]: arr.filter((i) => i !== item) };
      } else {
        return { ...prev, [field]: [...arr, item] };
      }
    });
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    void saveAiProfile({
      departure: formData.departure,
      companions: formData.companions,
      vibes: formData.vibes,
      interests: formData.interests,
      dietary: formData.dietary,
      transport: formData.transport,
      budget: formData.budget,
      pace: formData.pace,
      accommodation: formData.accommodation,
    });
    onSubmit(formData);
  };

  const stepOneHint = !formData.departure
    ? t("step_hint.departure", "先選擇出發地。")
    : !formData.destination
      ? t("step_hint.destination", "再選擇目的地。")
      : !formData.companions
        ? t("step_hint.companions", "最後選擇同行者。")
        : t("step_hint.ready", "已完成基本資料，下一步可微調節奏、飲食與預算。");

  return (
    <div className="relative flex flex-col h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* Refined Immersive Background for AI Form */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-white">
        <div className="absolute top-[-12%] right-[-8%] h-[72%] w-[72%] rounded-full bg-pink-100/50 blur-[120px]" />
        <div className="absolute bottom-[-12%] left-[-10%] h-[72%] w-[72%] rounded-full bg-teal-100/45 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full px-3.5 sm:px-8 py-4 sm:py-10 pb-tab-safe max-w-4xl mx-auto">
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-9">
          <div className="space-y-2.5">

            <div>
              <h2 className="mb-1 text-balance text-[21px] sm:text-[33px] font-black leading-[1.08] tracking-[-0.045em] text-slate-900 sm:mb-2 font-heading">
                {t('ai_plan_first')}
              </h2>
            </div>
            {isSubmitting && (
              <p role="status" aria-live="polite" className="max-w-xl text-sm font-medium leading-6 text-sky-700">
                {t("ai_form.generating_status")}
              </p>
            )}
            {errorMessage && (
              <p role="alert" className="max-w-xl text-sm font-medium leading-6 text-red-700">
                {errorMessage}
              </p>
            )}
            <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2 pb-1 -mx-3.5 px-3.5 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
              {AI_FORM_ENTRY_PILLS.map((pill) => (
                <span
                  key={pill}
                  className="shrink-0 inline-flex items-center rounded-full border border-white/84 bg-white/84 px-3 py-1 text-xs font-semibold tracking-normal text-slate-600 shadow-[0_8px_16px_rgba(15,23,42,0.05)]"
                >
                  {t('ai_preferences_options.' + pill, pill)}
                </span>
              ))}
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/84 bg-white/88 text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-colors ios-press hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 sm:h-11 sm:w-11"
              aria-label={t('str_a9472')}
            >
              <ArrowLeft size={20} className="sm:hidden" />
              <ArrowLeft size={24} className="hidden sm:block" />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 0, scale: 0.99, y: 8 }
              }
              animate={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 1, scale: 1, y: 0 }
              }
              exit={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 0, scale: 0.99, y: -8 }
              }
              transition={{
                duration: prefersReducedMotion ? 0 : 0.22,
                ease: "easeOut",
              }}
              className="flex flex-col gap-5 sm:gap-7"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-5">
                {/* Left Column: Route & Dates */}
                <div className="flex flex-col gap-4 p-4 shadow-card hover:shadow-floating transition-shadow duration-300 glass-panel !rounded-[28px] sm:gap-5 sm:p-6">
                  {/* Departure */}
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center gap-2 text-sm font-semibold tracking-normal text-slate-600">
                      <MapPin size={16} className="text-sky-500" />
                      {t('str_1426bae')}</label>
                    <button
                      onClick={() => setShowDepDropdown(true)}
                      className="group flex min-h-[56px] w-full items-center justify-between rounded-[32px] border border-white/84 bg-white/86 px-4 py-3.5 text-left text-[15px] font-bold text-slate-800 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-colors hover:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100 sm:text-base"
                    >
                      <span
                        className={
                          formData.departure
                            ? "text-slate-800"
                            : "text-slate-500 font-medium"
                        }
                      >
                        {formData.departure || t('str_dep_placeholder', '請選擇出發城市')}
                      </span>
                      {!formData.departure && (
                        <Search
                          size={18}
                          className="text-slate-400 group-hover:text-sky-400 transition-colors"
                        />
                      )}
                    </button>
                  </div>

                  {/* Interactive Swap Button */}
                  <div className="flex justify-center -my-3 select-none relative z-10">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((p) => ({
                          ...p,
                          departure: p.destination,
                          destination: p.departure,
                        }));
                      }}
                      title={t('str_7dc97fb6')}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/94 text-sky-500 hover:text-sky-600 shadow-md transition-all hover:scale-110 ios-press cursor-pointer group"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                        stroke="currentColor"
                        className="h-4 w-4 transform transition-transform group-hover:rotate-180 duration-300"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h18M3 12h18M3 16.5h18" stroke="none" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-3.75-3.75m0 0l-3.75 3.75m3.75-3.75V15.75M4.5 15.75l3.75 3.75m0 0l3.75-3.75m-3.75 3.75V8.25" />
                      </svg>
                    </button>
                  </div>

                  {/* Destination */}
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center gap-2 text-sm font-semibold tracking-normal text-slate-600">
                      <MapPin size={16} className="text-orange-500" />
                      {t('str_1cd249a')}</label>
                    <button
                      onClick={() => setShowDestDropdown(true)}
                      className="group flex min-h-[56px] w-full items-center justify-between rounded-[32px] border border-white/84 bg-white/86 px-4 py-3.5 text-left text-[15px] font-bold text-slate-800 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-colors hover:border-orange-300 focus:outline-none focus:ring-4 focus:ring-orange-100 sm:text-base"
                    >
                      <span
                        className={
                          formData.destination
                            ? "text-slate-800"
                            : "text-slate-500 font-medium"
                        }
                      >
                        {formData.destination || t('str_dest_placeholder', '想去哪裡探索？')}
                      </span>
                      {!formData.destination && (
                        <Search
                          size={18}
                          className="text-slate-400 group-hover:text-orange-400 transition-colors"
                        />
                      )}
                    </button>
                  </div>

                  {/* Days */}
                  <div className="flex flex-col gap-2.5 pt-1">
                    <label className="flex items-center gap-2 text-sm font-semibold tracking-normal text-slate-600">
                      <Calendar size={16} className="text-sky-500" />
                      {t('str_47310767')}</label>
                    <div className="flex min-h-[56px] items-center justify-between rounded-[32px] border border-white/84 bg-white/86 p-2 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                      <button
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            days: Math.max(1, p.days - 1),
                          }))
                        }
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-slate-50 text-slate-600 transition-all ios-press hover:bg-slate-100"
                      >
                        <Minus size={20} strokeWidth={2.5} />
                      </button>
                      <div className="flex-1 flex items-baseline justify-center gap-1.5">
                        <span className="text-[30px] sm:text-[38px] font-black text-slate-800 tabular-nums leading-none tracking-[-0.05em]">
                          {formData.days}
                        </span>
                        <span className="text-slate-500 font-bold text-sm">
                          {t('str_5929')}</span>
                      </div>
                      <button
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            days: Math.min(30, p.days + 1),
                          }))
                        }
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-slate-50 text-slate-600 transition-all ios-press hover:bg-slate-100"
                      >
                        <Plus size={20} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Companions */}
                <div className="flex flex-col gap-4 p-4 shadow-card hover:shadow-floating transition-shadow duration-300 glass-panel !rounded-[28px] sm:gap-5 sm:p-6">
                  <label className="flex items-center gap-2 text-sm font-semibold tracking-normal text-slate-600">
                    <Users size={16} className="text-orange-500" />
                    {t('str_68aa5f36')}</label>
                  <div className="grid h-full grid-cols-2 content-start gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                    {COMPANION_OPTIONS.map((opt) => {
                      const isSelected = formData.companions === opt.id;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          onClick={() =>
                            setFormData((p) => ({ ...p, companions: opt.id }))
                          }
                          className={`group relative flex min-h-[84px] flex-col items-center justify-center gap-2 overflow-hidden rounded-[32px] border p-2.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press sm:min-h-[96px] sm:rounded-[36px] sm:p-4 ${
                            isSelected
                              ? "z-10 -translate-y-0.5 border-slate-900 bg-slate-900 shadow-[0_14px_28px_rgba(15,23,42,0.14)]"
                              : "border-white/84 bg-white/86 shadow-[0_8px_18px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-[16px] border transition-transform duration-300 group-hover:scale-110 sm:h-11 sm:w-11 ${
                              isSelected
                                ? "border-white/15 bg-white/10 text-white"
                                : opt.tone
                            }`}
                          >
                            <Icon size={20} strokeWidth={2.2} />
                          </span>
                          <span
                            className={`relative z-10 text-[12px] font-bold tracking-[0.04em] ${isSelected ? "text-white" : "text-slate-600"}`}
                          >
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Spacer so last field isn't hidden under sticky button */}
              <div className="w-full shrink-0 h-[40px] sm:h-[60px]" />

              {/* Next Button — sticky on mobile, static on desktop */}
              <div
                className="sticky bottom-0 left-0 right-0 w-full z-40 mt-auto pointer-events-none transition-all duration-300"
                style={{
                  paddingBottom: keyboardHeight > 0 
                    ? `${keyboardHeight + 16}px`
                    : "calc(32px + env(safe-area-inset-bottom, 24px))",
                }}
              >
                <div className="mx-auto max-w-4xl px-3.5 pt-3 pb-2 sm:px-0 sm:pt-0 sm:pb-0 pointer-events-auto flex justify-center">
                  <button
                    onClick={handleNext}
                    disabled={
                      !formData.departure ||
                      !formData.destination ||
                      !formData.companions
                    }
                    className={`flex h-14 w-full items-center justify-center gap-3 rounded-full text-sm font-semibold tracking-normal transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:h-[3.8rem] sm:shadow-md ${
                      !formData.departure ||
                      !formData.destination ||
                      !formData.companions
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200 shadow-none"
                        : "border border-transparent bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_20px_rgba(244,63,94,0.3)] hover:-translate-y-0.5 hover:from-pink-500 hover:to-orange-500 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_28px_rgba(244,63,94,0.4)] ios-press"
                    }`}
                  >
                    {t('str_62dffff9')}<ArrowLeft className="rotate-180" size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 0, scale: 0.99, y: 8 }
              }
              animate={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 1, scale: 1, y: 0 }
              }
              exit={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 0, scale: 0.99, y: -8 }
              }
              transition={{
                duration: prefersReducedMotion ? 0 : 0.22,
                ease: "easeOut",
              }}
              className="flex flex-col gap-5 sm:gap-7"
            >
              <div className="mb-1 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-[22px] font-black tracking-[-0.04em] text-slate-900 font-heading">
                    {t('str_10e3e9')}<span className="text-sky-600">{t('str_25e12c1e')}</span>
                  </h3>
                  <p className="mt-1 text-[13px] font-medium leading-[1.6] text-slate-500">
                    {t('str_7632b257')}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-semibold tracking-normal text-sky-700 transition-colors hover:bg-sky-100 hover:text-sky-800 ios-press"
                >
                  {t('str_63143efd')}<Sparkles size={16} />
                </button>
              </div>

              <div className="relative flex flex-col gap-5 p-4 transition-shadow duration-300 shadow-card hover:shadow-floating glass-panel !rounded-[40px] sm:gap-6 sm:p-6">
                <div className="flex flex-col gap-3.5">
                  <label className="flex items-center gap-2 text-sm font-semibold tracking-normal text-slate-600">
                    <Coffee size={16} className="text-amber-600" />
                    {t('str_30700374')}</label>
                  <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-1 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
                    {VIBE_OPTIONS.map((vibe) => (
                      <div className="shrink-0" key={vibe}>
                        <MultiSelectPill
                          label={vibe}
                          accentColor="amber"
                          selected={formData.vibes.includes(vibe)}
                          onClick={() => toggleArrayItem("vibes", vibe)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3.5">
                  <label className="flex items-center gap-2 text-sm font-semibold tracking-normal text-slate-600">
                    <Heart size={16} className="text-rose-500" />
                    {t('str_3d39a4e9')}</label>
                  <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-1 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
                    {INTEREST_OPTIONS.map((interest) => (
                      <div className="shrink-0" key={interest}>
                        <MultiSelectPill
                          label={interest}
                          accentColor="rose"
                          selected={formData.interests.includes(interest)}
                          onClick={() => toggleArrayItem("interests", interest)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3.5">
                  <label className="flex items-center gap-2 text-sm font-semibold tracking-normal text-slate-600">
                    <Settings2 size={16} className="text-emerald-600" />
                    {t('str_47d35d58')}</label>
                  <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-1 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
                    {DIETARY_OPTIONS.map((diet) => (
                      <div className="shrink-0" key={diet}>
                        <MultiSelectPill
                          label={diet}
                          accentColor="indigo"
                          selected={formData.dietary.includes(diet)}
                          onClick={() => toggleArrayItem("dietary", diet)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3.5">
                  <label className="flex items-center gap-2 text-sm font-semibold tracking-normal text-slate-600">
                    <Car size={16} className="text-blue-500" />
                    {t('str_25e920ec')}</label>
                  <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-1 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
                    {TRANSPORT_OPTIONS.map((trans) => (
                      <div className="shrink-0" key={trans}>
                        <MultiSelectPill
                          label={trans}
                          accentColor="blue"
                          selected={formData.transport.includes(trans)}
                          onClick={() => toggleArrayItem("transport", trans)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3.5">
                  <label className="flex items-center gap-2 text-sm font-semibold tracking-normal text-slate-600">
                    <DollarSign size={16} className="text-teal-600" />
                    {t('str_7204d7e1')}</label>
                  <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-1 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
                    {BUDGET_OPTIONS.map((budget) => (
                      <div className="shrink-0" key={budget}>
                        <MultiSelectPill
                          label={budget}
                          accentColor="emerald"
                          selected={formData.budget === budget}
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              budget: p.budget === budget ? "" : budget,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3.5">
                  <label className="flex items-center gap-2 text-sm font-semibold tracking-normal text-slate-600">
                    <Footprints size={16} className="text-sky-600" />
                    {t('str_4cdcffe')}</label>
                  <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-1 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
                    {PACE_OPTIONS.map((pace) => (
                      <div className="shrink-0" key={pace}>
                        <MultiSelectPill
                          label={pace}
                          accentColor="blue"
                          selected={formData.pace === pace}
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              pace: p.pace === pace ? "" : pace,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3.5">
                  <label className="flex items-center gap-2 text-sm font-semibold tracking-normal text-slate-600">
                    <MapPin size={16} className="text-rose-600" />
                    {t('str_256fb55e')}</label>
                  <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-1 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
                    {ACCOMMODATION_OPTIONS.map((accommodation) => (
                      <div className="shrink-0" key={accommodation}>
                        <MultiSelectPill
                          label={accommodation}
                          accentColor="rose"
                          selected={formData.accommodation.includes(
                            accommodation,
                          )}
                          onClick={() =>
                            toggleArrayItem("accommodation", accommodation)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit buttons — aligned directly under preferences glass-panel, no sticky wrapper, heavily padded below */}
              <div className="w-full mt-6 pb-24">
                <div className="mx-auto max-w-4xl px-1 sm:px-0">
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={isSubmitting}
                      className="h-14 w-full shrink-0 rounded-2xl border border-white/84 bg-white/86 px-6 text-[14px] font-bold text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 ios-press sm:h-[3.8rem] sm:w-auto"
                    >
                      {t('str_11c18a')}</button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                      className="group flex h-14 w-full flex-1 items-center justify-center gap-3 clay-btn bg-gradient-to-r from-sky-400 to-blue-500 text-sm font-semibold tracking-normal text-white ios-press sm:h-[3.8rem]"
                    >
                      {isSubmitting ? t("ai_form.generating_button") : t('str_36be9bd0')}<Sparkles
                        size={20}
                        className="group-hover:animate-cute-bounce"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showDepDropdown && (
          <LocationPickerPopup
            title={t('str_1426bae')}
            query={formData.departure}
            onClose={() => setShowDepDropdown(false)}
            onSelect={(dest) => {
              const displayValue = dest.searchAlias
                ? `${dest.place} (${dest.searchAlias})`
                : dest.place;
              setFormData((p) => ({ ...p, departure: displayValue }));
              setShowDepDropdown(false);
            }}
          />
        )}

        {showDestDropdown && (
          <LocationPickerPopup
            title={t('str_1cd249a')}
            query={formData.destination}
            onClose={() => setShowDestDropdown(false)}
            onSelect={(dest) => {
              const displayValue = dest.searchAlias
                ? `${dest.place} (${dest.searchAlias})`
                : dest.place;
              setFormData((p) => ({ ...p, destination: displayValue }));
              setShowDestDropdown(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
