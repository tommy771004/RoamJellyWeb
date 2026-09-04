import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from "react";
import {
  MapPin,
  Minus,
  Plus,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownUp,
  Search,
  Calendar,
  Users,
  Check,
  Baby,
  Accessibility,
  PawPrint,
  UsersRound,
  Footprints,
  Heart,
} from "lucide-react";

import { LocationPickerPopup } from "./LocationPickerPopup";
import { useSearchStore } from "../store/useSearchStore";
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
  "奢華享受",
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
  void accentColor;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`relative flex min-h-11 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 sm:px-4 ${
        selected
          ? "bg-[#26342d] text-white"
          : "bg-[#e8ede7] text-[#435047] hover:bg-[#dce4dc]"
      }`}
    >
      {selected && <Check size={16} strokeWidth={3} aria-hidden="true" className="shrink-0" />}
      <span>{t('ai_preferences_options.' + label, label)}</span>
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
    <div className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-[#eef2ed] text-[#26342d] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pb-28 pt-5 sm:px-8 sm:pb-20 sm:pt-10">
        <header className="mb-6 flex items-start justify-between gap-5 sm:mb-9">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-semibold text-[#7d4b3b]">
              {t("ai_form.step_progress", "第 {{step}} 步，共 2 步", { step })}
            </p>
            <h2 className="text-balance font-heading text-[30px] font-black leading-[1.08] tracking-[-0.035em] text-[#26342d] sm:text-[46px]">
              {t("ai_plan_first", "先定方向，再讓 AI 排出可走的行程")}
            </h2>
            <p className="mt-3 w-full text-sm font-medium leading-6 text-[#5b675f] sm:max-w-[36rem] sm:text-base">
              {step === 1
                ? stepOneHint
                : t("ai_form.preference_intro", "偏好可以留白。AI 會先完成草稿，你仍能回到行程裡逐項調整。")}
            </p>
            {isSubmitting && (
              <p role="status" aria-live="polite" className="mt-3 text-sm font-bold text-[#7d4b3b]">
                {t("ai_form.generating_status")}
              </p>
            )}
            {errorMessage && (
              <p role="alert" className="mt-3 max-w-xl rounded-xl bg-[#f8ded8] px-4 py-3 text-sm font-bold leading-6 text-[#7f2e22]">
                {errorMessage}
              </p>
            )}
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex h-11 w-11 shrink-0 items-center justify-center text-[#526159] transition-colors hover:text-[#9a452e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
              aria-label={t("str_a9472")}
            >
              <ArrowLeft size={23} />
            </button>
          )}
        </header>

        {step === 1 && (
          <div className="space-y-5">
            <section className="grid gap-8 bg-white/80 p-6 [clip-path:polygon(18px_0,100%_0,100%_calc(100%_-_18px),calc(100%_-_18px)_100%,0_100%,0_18px)] sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
              <div>
                <div className="mb-5 flex items-center gap-2 text-sm font-bold text-[#4d5b52]">
                  <MapPin size={17} className="text-[#a3472b]" />
                  <span>{t("ai_form.route_title", "這趟旅程從哪裡開始？")}</span>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowDepDropdown(true)}
                    className="group flex min-h-[64px] w-full items-center justify-between rounded-2xl bg-[#f0f3ef] px-5 py-3 text-left transition-colors hover:bg-[#e6ebe5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
                  >
                    <span>
                      <span className="block text-xs font-bold text-[#7b877f]">{t("str_1426bae")}</span>
                      <span className={`mt-1 block text-base font-bold ${formData.departure ? "text-[#26342d]" : "text-[#657269]"}`}>
                        {formData.departure || t("str_dep_placeholder", "請選擇出發城市")}
                      </span>
                    </span>
                    <Search size={19} className="shrink-0 text-[#7d4b3b]" />
                  </button>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setFormData((current) => ({
                        ...current,
                        departure: current.destination,
                        destination: current.departure,
                      }))}
                      aria-label={t("str_7dc97fb6")}
                      title={t("str_7dc97fb6")}
                      className="flex h-11 w-11 items-center justify-center text-[#9a452e] transition-colors hover:text-[#26342d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
                    >
                      <ArrowDownUp size={19} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDestDropdown(true)}
                    className="group flex min-h-[64px] w-full items-center justify-between rounded-2xl bg-[#f0f3ef] px-5 py-3 text-left transition-colors hover:bg-[#e6ebe5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
                  >
                    <span>
                      <span className="block text-xs font-bold text-[#7b877f]">{t("str_1cd249a")}</span>
                      <span className={`mt-1 block text-base font-bold ${formData.destination ? "text-[#26342d]" : "text-[#657269]"}`}>
                        {formData.destination || t("str_dest_placeholder", "想去哪裡探索？")}
                      </span>
                    </span>
                    <Search size={19} className="shrink-0 text-[#7d4b3b]" />
                  </button>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#4d5b52]">
                    <Calendar size={17} className="text-[#a3472b]" />
                    <span>{t("str_47310767")}</span>
                  </div>
                  <div className="flex min-h-[64px] items-center justify-between rounded-2xl bg-[#f0f3ef] p-2">
                    <button
                      type="button"
                      aria-label={t("ai_form.decrease_days", "減少一天")}
                      onClick={() => setFormData((current) => ({ ...current, days: Math.max(1, current.days - 1) }))}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-[#526159] transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
                    >
                      <Minus size={20} />
                    </button>
                    <output className="flex items-baseline gap-2" aria-live="polite">
                      <span className="text-[34px] font-black leading-none tabular-nums text-[#26342d]">{formData.days}</span>
                      <span className="text-sm font-bold text-[#657269]">{t("str_5929")}</span>
                    </output>
                    <button
                      type="button"
                      aria-label={t("ai_form.increase_days", "增加一天")}
                      onClick={() => setFormData((current) => ({ ...current, days: Math.min(30, current.days + 1) }))}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-[#526159] transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-5 flex items-center gap-2 text-sm font-bold text-[#4d5b52]">
                  <Users size={17} className="text-[#a3472b]" />
                  <span>{t("str_68aa5f36")}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {COMPANION_OPTIONS.map((option) => {
                    const selected = formData.companions === option.id;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setFormData((current) => ({ ...current, companions: option.id }))}
                        className={`flex min-h-[76px] items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20 ${
                          selected
                            ? "bg-[#26342d] text-white"
                            : "bg-[#f0f3ef] text-[#435047] hover:bg-[#e2e8e1]"
                        }`}
                      >
                        <Icon size={21} strokeWidth={2} className="shrink-0" />
                        <span className="text-sm font-bold leading-5">{t(`ai_preferences_options.${option.label}`, option.label)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
              <p id="ai-form-next-hint" className="text-sm font-medium leading-6 text-[#5b675f]">{stepOneHint}</p>
              <button
                type="button"
                onClick={handleNext}
                aria-describedby="ai-form-next-hint"
                disabled={!formData.departure || !formData.destination || !formData.companions}
                className="flex min-h-14 items-center justify-center gap-3 bg-[#26342d] px-7 text-sm font-bold text-white [clip-path:polygon(0_0,calc(100%_-_14px)_0,100%_14px,100%_100%,14px_100%,0_calc(100%_-_14px))] transition-colors hover:bg-[#394a40] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/25 disabled:cursor-not-allowed disabled:bg-[#c9d0ca] disabled:text-[#66736a] sm:min-w-[260px]"
              >
                {t("str_62dffff9")}
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <section className="bg-white/80 p-6 [clip-path:polygon(18px_0,100%_0,100%_calc(100%_-_18px),calc(100%_-_18px)_100%,0_100%,0_18px)] sm:p-8">
              <div className="grid gap-x-10 gap-y-7 lg:grid-cols-2">
                {[
                  [t("str_30700374"), VIBE_OPTIONS, formData.vibes, (value: string) => toggleArrayItem("vibes", value)],
                  [t("str_3d39a4e9"), INTEREST_OPTIONS, formData.interests, (value: string) => toggleArrayItem("interests", value)],
                  [t("str_47d35d58"), DIETARY_OPTIONS, formData.dietary, (value: string) => toggleArrayItem("dietary", value)],
                  [t("str_25e920ec"), TRANSPORT_OPTIONS, formData.transport, (value: string) => toggleArrayItem("transport", value)],
                  [t("str_7204d7e1"), BUDGET_OPTIONS, formData.budget ? [formData.budget] : [], (value: string) => setFormData((current) => ({ ...current, budget: current.budget === value ? "" : value }))],
                  [t("str_4cdcffe"), PACE_OPTIONS, formData.pace ? [formData.pace] : [], (value: string) => setFormData((current) => ({ ...current, pace: current.pace === value ? "" : value }))],
                  [t("str_256fb55e"), ACCOMMODATION_OPTIONS, formData.accommodation, (value: string) => toggleArrayItem("accommodation", value)],
                ].map(([title, options, selectedOptions, onToggle]) => (
                  <fieldset key={String(title)} className="min-w-0">
                    <legend className="mb-3 text-sm font-bold text-[#4d5b52]">{String(title)}</legend>
                    <div className="flex flex-wrap gap-2">
                      {(options as string[]).map((option) => (
                        <MultiSelectPill
                          key={option}
                          label={option}
                          selected={(selectedOptions as string[]).includes(option)}
                          onClick={() => (onToggle as (value: string) => void)(option)}
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="min-h-14 px-6 text-sm font-bold text-[#526159] transition-colors hover:text-[#9a452e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
              >
                {t("str_11c18a")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="flex min-h-14 items-center justify-center gap-3 bg-[#9a452e] px-8 text-sm font-bold text-white [clip-path:polygon(0_0,calc(100%_-_14px)_0,100%_14px,100%_100%,14px_100%,0_calc(100%_-_14px))] transition-colors hover:bg-[#7d3826] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/25 disabled:cursor-wait disabled:bg-[#b9a59e] sm:min-w-[280px]"
              >
                {isSubmitting ? t("ai_form.generating_button") : t("str_36be9bd0")}
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>
        )}

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
