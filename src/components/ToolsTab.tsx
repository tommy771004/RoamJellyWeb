import React, { createContext, use, useEffect, useMemo, useState } from 'react';
import { CloudRain, Droplets, Check, Wallet, SendHorizontal, Sparkles } from 'lucide-react';
import GlassCard from './GlassCard';
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
  type TripSummary,
} from '../lib/workflowApi';
import type { TripInfo, WeatherData } from '../types/workflow';
import { suggestPackingList } from '../lib/geminiApi';
import { useToolsStore } from '../store/useToolsStore';
import { useAppStore } from '../store/useAppStore';
import type { ChecklistItem, Settlement } from '../types/workflow';

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return '春季';
  if (month >= 6 && month <= 8) return '夏季';
  if (month >= 9 && month <= 11) return '秋季';
  return '冬季';
}

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
  destination: string;
  checklist: ChecklistItem[];
  settlements: Settlement[];
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
  handleAiPackingList: () => void;
  updateForm: (updater: (prev: ExpenseForm) => ExpenseForm) => void;
  clearFormError: (field: keyof FormErrors) => void;
  toggleSplitMember: (member: string) => void;
  submitExpense: () => void;
  handleClearSettlement: (settlement: { id: string; from: string; to: string; currency: string }) => void;
  sendReminder: () => void;
}

interface ToolsTabContextValue {
  state: ToolsTabState;
  actions: ToolsTabActions;
}

const ToolsTabContext = createContext<ToolsTabContextValue | null>(null);

function useToolsTabContext() {
  const ctx = use(ToolsTabContext);
  if (!ctx) throw new Error('useToolsTabContext must be used inside ToolsTabProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

function ToolsTabProvider({ children }: { children: React.ReactNode }) {
  const { checklist, setChecklist, revertCheckItem, settlements, setSettlements, members, setMembers } =
    useToolsStore();
  const { showToast, activeTripId: tripId } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [tip, setTip] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [form, setForm] = useState<ExpenseForm>({
    title: '',
    amount: '',
    currency: 'JPY',
    payer: 'A',
    splitWith: ['A', 'B'],
  });

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [checklistData, settlementsData, collaboratorsData, weatherData, tripInfoData] = await Promise.all([
          fetchChecklist(tripId),
          fetchSettlements(tripId),
          fetchCollaborators(tripId),
          fetchWeather().catch(() => null),
          fetchTripInfo(tripId).catch(() => null),
        ]);
        if (weatherData) setWeather(weatherData);
        if (tripInfoData) setTripInfo(tripInfoData);
        const memberNames = collaboratorsData.map((m) => m.name);
        setChecklist(checklistData);
        setSettlements(settlementsData);
        if (memberNames.length > 0) {
          setMembers(memberNames);
          setForm((prev) => ({ ...prev, payer: memberNames[0], splitWith: memberNames }));
        }
      } catch {
        setTip('工具包載入失敗，請稍後重試。');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [tripId, setChecklist, setSettlements, setMembers]);

  const expenseByCurrency = useMemo(
    () =>
      settlements.reduce<Record<string, number>>((acc, s) => {
        const cur = s.currency ?? 'JPY';
        acc[cur] = (acc[cur] ?? 0) + Number(s.amount || 0);
        return acc;
      }, {}),
    [settlements],
  );

  const validateForm = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.title.trim()) errs.title = '請輸入費用名稱';
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) errs.amount = '金額需為大於 0 的數字';
    if (!form.payer.trim()) errs.payer = '請選擇代墊人';
    if (form.splitWith.length === 0) errs.splitWith = '請選擇至少一位分攤者';
    else if (!form.splitWith.includes(form.payer)) errs.splitWith = '代墊人需包含在分攤名單';
    return errs;
  };

  const actions: ToolsTabActions = {
    toggleCheck(item) {
      const nextChecked = !item.checked;
      setChecklist(checklist.map((i) => (i.id === item.id ? { ...i, checked: nextChecked } : i)));
      void updateChecklist(item.id, nextChecked).catch(() => {
        revertCheckItem(item.id, item.checked);
        setTip('清單同步失敗，已還原。');
        setTimeout(() => setTip(''), 2000);
      });
    },

    async handleAiPackingList() {
      setAiLoading(true);
      try {
        const suggestions = await suggestPackingList(tripInfo?.destination ?? '東京', getCurrentSeason());
        const newItems: ChecklistItem[] = suggestions.map((text, i) => ({
          id: `ai_${Date.now()}_${i}`,
          text,
          checked: false,
        }));
        setChecklist([...checklist, ...newItems]);
        showToast(`✨ AI 新增了 ${newItems.length} 項行李建議！`);
      } catch {
        showToast('AI 功能失敗，請確認 Gemini API Key 是否設定。');
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
        return { ...prev, splitWith: exists ? prev.splitWith.filter((n) => n !== member) : [...prev.splitWith, member] };
      });
    },

    async submitExpense() {
      const errs = validateForm();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
      setErrors({});
      try {
        setSubmitting(true);
        const result = await submitLedgerExpense({
          trip_id: tripId,
          title: form.title,
          amount: Number(form.amount),
          currency: form.currency,
          payer: form.payer,
          split_with: form.splitWith,
        });
        setSettlements(result);
        setTip('分帳已更新，已算出最新應付關係。');
        setForm((prev) => ({ ...prev, title: '', amount: '' }));
        setTimeout(() => setTip(''), 2200);
      } catch {
        showToast('分帳送出失敗，請稍後再試。');
      } finally {
        setSubmitting(false);
      }
    },

    async sendReminder() {
      const text = settlements.map((item) => `${item.from} 需給 ${item.to} ${item.currency} ${item.amount.toLocaleString()}`).join('\n');
      const ok = await shareText(`溫柔提醒：\n${text || '目前沒有待結算項目'}`);
      setTip(ok ? '提醒內容已分享或複製。' : '提醒發送失敗，請稍後再試。');
      setTimeout(() => setTip(''), 2200);
    },

    async handleClearSettlement(settlement) {
      setClearingId(settlement.id);
      try {
        const updated = await clearSettlement(tripId, settlement.from, settlement.to, settlement.currency);
        setSettlements(updated);
        setTip(`${settlement.from} → ${settlement.to} 已標記結清。`);
        setTimeout(() => setTip(''), 2200);
      } catch {
        showToast('結清失敗，請稍後再試。');
      } finally {
        setClearingId(null);
      }
    },
  };

  const state: ToolsTabState = {
    loading,
    tip,
    weather,
    destination: tripInfo?.destination ?? '',
    checklist,
    settlements,
    members,
    expenseByCurrency,
    form,
    errors,
    submitting,
    aiLoading,
    clearingId,
  };

  return (
    <ToolsTabContext value={{ state, actions }}>
      {children}
    </ToolsTabContext>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WeatherCard() {
  const { state: { weather, destination } } = useToolsTabContext();
  return (
    <GlassCard className="bg-[#e0f2fe] border-[#bae6fd] mb-6">
      <div className="flex flex-row justify-between items-start z-10">
        <div className="flex flex-col flex-1 mr-4">
          <span className="text-xl font-bold text-blue-900 drop-shadow-sm">{`${destination || '目的地'}・今日天氣`}</span>
          {weather ? (
            <>
              <div className="flex flex-row items-end mt-1 mb-1">
                <span className="text-4xl font-black text-blue-900">{weather.temp_current}°</span>
                <span className="text-sm font-semibold text-blue-600 mb-1 ml-2">
                  {weather.temp_min}° / {weather.temp_max}°C
                </span>
              </div>
              {/* 色溫條：藍(冷)→橙(熱)，0°C~40°C */}
              <div className="relative h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#bfdbfe' }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: 'linear-gradient(to right, #93c5fd, #fbbf24, #f97316)',
                    width: '100%',
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/80"
                  style={{ left: `${Math.min(100, (weather.temp_min / 40) * 100)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-700/60"
                  style={{ left: `${Math.min(100, (weather.temp_max / 40) * 100)}%` }}
                />
              </div>
              <div className="flex flex-row items-center bg-white/50 rounded-xl p-2 border border-white gap-x-1 w-fit">
                <Droplets size={14} color="#3b82f6" />
                <span className="text-sm font-bold text-blue-800 flex items-center">
                  降雨 {weather.rain_prob}%
                  {weather.rain_prob >= 50 ? '　☂️ 記得帶傘！' : '　☀️ 天氣不錯'}
                </span>
              </div>
            </>
          ) : (
            <span className="text-sm font-medium text-blue-700 mt-1">載入中...</span>
          )}
        </div>
        <CloudRain size={52} color="#60a5fa" />
      </div>
    </GlassCard>
  );
}

function ChecklistSection() {
  const { state: { checklist, aiLoading }, actions } = useToolsTabContext();
  return (
    <GlassCard className="!p-6 mb-6">
      <div className="flex flex-row items-center justify-between mb-5">
        <div className="flex flex-row items-center">
          <span className="text-xl">✅</span>
          <span className="text-xl font-bold text-slate-800 ml-2">核心行李清單</span>
        </div>
        <button
          onClick={() => void actions.handleAiPackingList()}
          disabled={aiLoading}
          className={`flex flex-row items-center px-3 py-2 rounded-full cursor-pointer appearance-none ${aiLoading ? 'bg-violet-200 cursor-not-allowed border-violet-200' : 'bg-violet-100 border border-violet-200 hover:bg-violet-200'}`}
        >
          <Sparkles size={13} color="#7c3aed" />
          <span className="ml-1 text-xs font-bold text-violet-700">
            {aiLoading ? '規劃中...' : 'AI 幫我想'}
          </span>
        </button>
      </div>
      <div className="flex flex-col gap-y-4">
        {checklist.map((item) => (
          <button
            key={item.id}
            onClick={() => actions.toggleCheck(item)}
            className="flex flex-row items-center bg-white/30 p-3 rounded-2xl border border-transparent appearance-none cursor-pointer text-left hover:bg-white/50 transition-colors"
          >
            <div
              className={`w-7 h-7 rounded-lg flex justify-center items-center ${
                item.checked ? 'bg-[#34d399]' : 'bg-white border-2 border-slate-300'
              }`}
            >
              {item.checked ? <Check size={16} color="white" /> : null}
            </div>
            <span
              className={`ml-4 text-base font-bold ${
                item.checked ? 'text-slate-400 line-through' : 'text-slate-700'
              }`}
            >
              {item.text}
            </span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

function LedgerSection() {
  const { state: { form, errors, members, submitting }, actions } = useToolsTabContext();
  return (
    <GlassCard className="bg-[#fce7f3] border-[#fbcfe8] mb-6 !p-6 flex flex-col">
      <div className="mb-4 flex flex-col">
        <div className="flex flex-row items-center mb-1">
          <Wallet size={24} color="#ec4899" />
          <span className="text-xl font-bold text-pink-900 ml-2">溫柔分帳本</span>
        </div>
        <span className="text-sm text-pink-600">新增一筆費用後會立即回算「誰要給誰」。</span>
      </div>

      <div className="flex flex-col gap-y-3">
        <div className="flex flex-col">
          <input
            value={form.title}
            onChange={(e) => {
              actions.updateForm((prev) => ({ ...prev, title: e.target.value }));
              if (errors.title) actions.clearFormError('title');
            }}
            placeholder="費用名稱，例如：和牛晚餐"
            className={`rounded-2xl border bg-white/85 px-4 py-3 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-pink-300 ${
              errors.title ? 'border-red-300' : 'border-white'
            }`}
          />
          {errors.title ? <span className="text-red-400 text-xs mt-1 ml-1">{errors.title}</span> : null}
        </div>

        <div className="flex flex-col">
          <input
            value={form.amount}
            onChange={(e) => {
              actions.updateForm((prev) => ({ ...prev, amount: e.target.value.replace(/[^0-9]/g, '') }));
              if (errors.amount) actions.clearFormError('amount');
            }}
            placeholder="金額，例如：15000"
            inputMode="numeric"
            className={`rounded-2xl border bg-white/85 px-4 py-3 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-pink-300 ${
              errors.amount ? 'border-red-300' : 'border-white'
            }`}
          />
          {errors.amount ? <span className="text-red-400 text-xs mt-1 ml-1">{errors.amount}</span> : null}
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-bold text-pink-700 mb-1">幣別</span>
          <div className="flex flex-row flex-wrap gap-2">
            {(['JPY', 'TWD', 'USD', 'EUR', 'KRW', 'THB'] as const).map((cur) => (
              <button
                key={cur}
                onClick={() => actions.updateForm((prev) => ({ ...prev, currency: cur }))}
                className={`rounded-full px-3 py-2 border cursor-pointer appearance-none ${
                  form.currency === cur ? 'bg-purple-500 border-purple-500 hover:bg-purple-600' : 'bg-white/80 border-white hover:bg-white'
                }`}
              >
                <span className={`text-sm font-bold ${form.currency === cur ? 'text-white' : 'text-slate-700'}`}>
                  {cur}
                </span>
              </button>
            ))}
          </div>
        </div>

        <span className="text-sm font-bold text-pink-700 mt-1">代墊人</span>
        <div className="flex flex-row flex-wrap gap-2">
          {members.map((member) => (
            <button
              key={member}
              onClick={() => {
                actions.updateForm((prev) => ({ ...prev, payer: member }));
                if (errors.payer) actions.clearFormError('payer');
              }}
              className={`rounded-full px-3 py-2 border cursor-pointer appearance-none ${
                form.payer === member ? 'bg-pink-500 border-pink-500 hover:bg-pink-600' : 'bg-white/80 border-white hover:bg-white'
              }`}
            >
              <span className={`text-sm font-bold ${form.payer === member ? 'text-white' : 'text-slate-700'}`}>
                {member}
              </span>
            </button>
          ))}
        </div>
        {errors.payer ? <span className="text-red-400 text-xs ml-1">{errors.payer}</span> : null}

        <span className="text-sm font-bold text-pink-700 mt-1">分攤者</span>
        <div className="flex flex-row flex-wrap gap-2">
          {members.map((member) => {
            const selected = form.splitWith.includes(member);
            return (
              <button
                key={member}
                onClick={() => {
                  actions.toggleSplitMember(member);
                  if (errors.splitWith) actions.clearFormError('splitWith');
                }}
                className={`rounded-full px-3 py-2 border cursor-pointer appearance-none transition-colors ${
                  selected ? 'bg-pink-200 border-pink-300 hover:bg-pink-300' : 'bg-white/80 border-white hover:bg-white'
                }`}
              >
                <span className="text-sm font-bold text-slate-700">{selected ? '✓ ' : ''}{member}</span>
              </button>
            );
          })}
        </div>
        {errors.splitWith ? <span className="text-red-400 text-xs ml-1">{errors.splitWith}</span> : null}

        <button
          onClick={() => void actions.submitExpense()}
          disabled={submitting}
          className={`${submitting ? 'bg-pink-300 cursor-not-allowed' : 'bg-pink-500 hover:bg-pink-600'} rounded-2xl py-3 flex justify-center mt-2 border-none appearance-none cursor-pointer transition-colors`}
        >
          <span className="text-white font-black text-base">{submitting ? '計算中...' : '新增費用並重算'}</span>
        </button>
      </div>
    </GlassCard>
  );
}

function SettlementsSection() {
  const { state: { settlements, expenseByCurrency, clearingId }, actions } = useToolsTabContext();
  const currencyEntries = Object.entries(expenseByCurrency);
  return (
    <GlassCard className="bg-white/60 border-white mb-32 flex flex-col">
      <div className="flex flex-row items-center justify-between mb-3 flex-wrap gap-y-1">
        <span className="text-lg font-bold text-slate-800 w-auto text-nowrap mr-2">最新結算</span>
        <div className="flex flex-row flex-wrap justify-end gap-2">
          {currencyEntries.length === 0 ? (
            <span className="text-sm font-semibold text-slate-400 w-auto shrink-0">尚無費用</span>
          ) : (
            currencyEntries.map(([cur, amount]) => (
              <span key={cur} className="text-sm font-extrabold text-pink-600 w-auto shrink-0">
                {cur} {amount.toLocaleString()}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-y-3 mb-4">
        {settlements.map((settlement) => (
          <div
            key={settlement.id}
            className="bg-white/90 rounded-2xl p-4 flex flex-row justify-between items-center border border-white/80"
          >
            <div className="flex flex-row items-center">
              <span className="text-2xl">💸</span>
              <div className="flex flex-row items-center ml-3">
                <span className="font-extrabold text-slate-800 text-lg">{settlement.from}</span>
                <span className="text-xs mx-2 font-semibold text-pink-500">應付</span>
                <span className="font-extrabold text-slate-800 text-lg">{settlement.to}</span>
              </div>
            </div>
            <div className="flex flex-row items-center">
              <span className="font-black text-xl text-pink-600">{settlement.amount}</span>
              <span className="text-xs font-semibold text-slate-500 ml-1">{settlement.currency}</span>
              <button
                onClick={() => void actions.handleClearSettlement(settlement)}
                disabled={clearingId === settlement.id}
                className="bg-emerald-100 border border-emerald-300 rounded-xl px-3 py-1 ml-2 flex justify-center items-center cursor-pointer appearance-none hover:bg-emerald-200 transition-colors"
                style={{ width: "50px", height: "30px" }}
              >
                {clearingId === settlement.id ? (
                  <span className="text-emerald-700 font-bold text-sm">...</span>
                ) : (
                  <span className="text-emerald-700 font-bold text-sm">結清</span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => void actions.sendReminder()}
        className="bg-[#9333ea] hover:bg-[#7e22ce] rounded-2xl py-3 flex flex-row items-center justify-center border-none appearance-none cursor-pointer transition-colors"
      >
        <SendHorizontal size={16} color="white" />
        <span className="text-white font-extrabold ml-2 text-base">溫柔提醒</span>
      </button>
    </GlassCard>
  );
}

// ── Trip selector bar ─────────────────────────────────────────────────────────

function TripSelectorBar() {
  const { activeTripId, setActiveTripId } = useAppStore();
  const [trips, setTrips] = useState<TripSummary[]>([]);

  useEffect(() => {
    void fetchUserTrips().then(setTrips).catch(() => {});
  }, []);

  if (trips.length <= 1) return null;

  return (
    <div
      className="mb-5 -mx-1 w-full overflow-x-auto"
    >
      <div className="flex flex-row px-1 min-w-max">
        {trips.map((trip) => {
          const active = activeTripId === trip.tripId;
          return (
            <button
              key={trip.tripId}
              onClick={() => setActiveTripId(trip.tripId)}
              className={`mr-2 px-4 py-2 flex flex-col rounded-2xl border cursor-pointer appearance-none text-left transition-colors ${
                active ? 'bg-violet-600 border-violet-600 hover:bg-violet-700 text-white' : 'bg-white/70 border-white hover:bg-white text-slate-700'
              }`}
            >
              <span className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-700'}`}>
                {trip.name}
              </span>
              <span className={`text-xs ${active ? 'text-violet-200' : 'text-slate-500'}`}>
                {trip.destination}
              </span>
            </button>
          );
        })}
      </div>
    </div>
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
  const { state: { loading, tip } } = useToolsTabContext();
  return (
    <div className="p-6 md:p-8 pt-12 md:pt-16 max-w-2xl mx-auto flex flex-col w-full h-full overflow-y-auto">
      <h1 className="text-3xl font-extrabold text-slate-800 drop-shadow-sm mb-2">旅途工具包</h1>
      <p className="text-sm text-slate-600 mb-4">分帳、清單與提醒都在這裡一次處理。</p>
      <TripSelectorBar />

      <WeatherCard />

      {loading ? (
        <div className="flex justify-center items-center py-10 text-[#f472b6]">載入中...</div>
      ) : (
        <>
          <ChecklistSection />
          <LedgerSection />
          <SettlementsSection />
          {tip ? <span className="text-center text-xs text-slate-500 -mt-24 mb-24">{tip}</span> : null}
        </>
      )}
    </div>
  );
}
