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
      (settlements as any[]).reduce((acc: Record<string, number>, s: any) => {
        const cur = s.currency ?? 'JPY';
        acc[cur] = (acc[cur] ?? 0) + Number(s.amount || 0);
        return acc;
      }, {} as Record<string, number>),
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
    <section className="relative rounded-xl p-md bg-white/40 backdrop-blur-[25px] border-t-2 border-l-2 border-white/70 shadow-[inset_0_2px_15px_rgba(255,255,255,0.9),0_10px_30px_rgba(134,77,97,0.1)] overflow-hidden hover:scale-[1.02] transition-transform duration-300 mb-6">
      {/* Weather decorative background image */}
      <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center mix-blend-overlay" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAaMVziRT6-Y9U5mkXCVUZw2KpRQsTCfpvSynKbpKexuyI4jzIw3aMfRGGGGiVaOsnwy5b7nkS2s-VM2_0W8xSkoTxTx7zSzWI5ryIU3lLPbwGytSoE0VQl2LHSEWGikEAPmaYlqTAJkh11t9yChHX-HkZp6yr8nq-G2_NRJh7LCHQXlssWvPwSAssJ6Rfov_StXR2yr6XW1DQSAWF4Hth2xa8i_Au49qc4bw-N7ICwmliU4EO8DZF58Qme2sAo9KRFA8Gz5LfgpgR_')" }}></div>
      <div className="relative z-10 flex flex-col space-y-md">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-h2 text-h2 text-primary-fixed-dim drop-shadow-sm">Tomorrow</h2>
            <p className="font-label-caps text-label-caps text-on-surface-variant opacity-80 mt-1 uppercase">{destination || 'Destination'}</p>
          </div>
          <div className="text-5xl drop-shadow-md">
            {weather && weather.rain_prob >= 50 ? '🌧️' : '☀️'}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-[56px] font-bold leading-none text-primary drop-shadow-sm font-plus-jakarta">
            {weather ? weather.temp_current : '--'}°
          </div>
          <div className="text-right space-y-1">
            <p className="font-label-caps text-label-caps text-secondary-fixed-dim bg-white/50 px-2 py-1 rounded-full inline-block backdrop-blur-md shadow-sm border border-white/40">
              {weather && weather.rain_prob >= 50 ? 'Bring an umbrella!' : 'Perfect for walking'}
            </p>
          </div>
        </div>
        {/* Outfit Suggestion */}
        <div className="bg-white/60 rounded-lg p-sm backdrop-blur-md border border-white/50 shadow-[inset_0_1px_5px_rgba(255,255,255,0.8)] mt-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-primary-container/50 flex items-center justify-center text-2xl shadow-inner">
                👗
            </div>
            <div>
              <p className="font-body-md text-base font-semibold text-primary">Light layers!</p>
              <p className="font-label-caps text-label-caps text-on-surface-variant">Cardigan & comfy sneakers.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChecklistSection() {
  const { state: { checklist, aiLoading }, actions } = useToolsTabContext();
  const packedCount = checklist.filter((i) => i.checked).length;
  
  return (
    <section className="space-y-md mb-8">
      <div className="flex justify-between items-end">
        <h2 className="font-h2 text-h2 text-primary">My Suitcase</h2>
        <span className="font-label-caps text-label-caps text-on-surface-variant bg-tertiary-container/30 px-3 py-1 rounded-full">
          {packedCount}/{checklist.length} Packed
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-gutter">
        <div className="col-span-2 bg-surface-container-low/50 rounded-xl p-md backdrop-blur-xl border border-white/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.6)]">
          <h3 className="font-label-caps text-label-caps text-tertiary mb-3 flex items-center">
            <span className="material-symbols-outlined text-[16px] mr-1">flight_takeoff</span> ESSENTIALS
          </h3>
          <div className="space-y-sm">
            {checklist.length === 0 && <span className="text-sm text-slate-400">目前沒有行李項目</span>}
            {checklist.map((item) => (
              <label key={item.id} className="flex items-center space-x-3 group cursor-pointer" onClick={(e) => { e.preventDefault(); actions.toggleCheck(item); }}>
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <input readOnly checked={item.checked} className="peer sr-only" type="checkbox"/>
                  <div className={`w-6 h-6 rounded-full border-2 transition-all shadow-sm ${item.checked ? 'bg-primary border-primary' : 'border-primary-container bg-white/50'}`}></div>
                  <span className={`material-symbols-outlined text-[14px] text-white absolute transition-opacity ${item.checked ? 'opacity-100' : 'opacity-0'}`} style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                </div>
                <span className={`font-body-md text-base transition-all ${item.checked ? 'line-through opacity-60 text-on-surface' : 'text-on-surface'}`}>
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <button
        onClick={() => void actions.handleAiPackingList()}
        disabled={aiLoading}
        className="jelly-button w-full mt-4 py-3 rounded-full bg-gradient-to-r from-primary-container to-tertiary-fixed-dim text-on-primary-container font-h2 text-[16px] border border-white/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.8),0_4px_15px_rgba(255,183,206,0.3)] hover:scale-[0.98] active:scale-95 active:blur-[1px] transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined">{aiLoading ? 'hourglass_empty' : 'auto_awesome'}</span>
        <span>{aiLoading ? 'AI is packing...' : 'AI Suggestion'}</span>
      </button>
    </section>
  );
}

function LedgerSection() {
  const { state: { form, errors, members, submitting }, actions } = useToolsTabContext();
  return (
    <section className="jelly-card rounded-xl p-container-padding flex flex-col relative overflow-hidden mb-8">
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary-container/40 rounded-full blur-[30px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-tertiary-container/40 rounded-full blur-[30px] pointer-events-none" />
      <div className="mb-6 flex flex-col relative z-10">
        <h3 className="font-h2 text-h2 text-on-surface-variant z-10">Split Bill</h3>
        <span className="text-sm font-semibold text-primary opacity-80">Add expense & calculate.</span>
      </div>

      <div className="flex flex-col gap-y-4 relative z-10">
        <div className="flex flex-col">
          <input
            value={form.title}
            onChange={(e) => {
              actions.updateForm((prev) => ({ ...prev, title: e.target.value }));
              if (errors.title) actions.clearFormError('title');
            }}
            placeholder="Expense title e.g. Dinner"
            className={`rounded-xl border shadow-sm bg-white/60 backdrop-blur-sm px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary transition-all ${
              errors.title ? 'border-error' : 'border-white/80'
            }`}
          />
          {errors.title ? <span className="text-error font-bold text-xs mt-1.5 ml-2">{errors.title}</span> : null}
        </div>

        <div className="flex flex-col">
          <input
            value={form.amount}
            onChange={(e) => {
              actions.updateForm((prev) => ({ ...prev, amount: e.target.value.replace(/[^0-9]/g, '') }));
              if (errors.amount) actions.clearFormError('amount');
            }}
            placeholder="Amount e.g. 15000"
            inputMode="numeric"
            className={`rounded-xl border shadow-sm bg-white/60 backdrop-blur-sm px-4 py-3 font-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary transition-all ${
              errors.amount ? 'border-error' : 'border-white/80'
            }`}
          />
          {errors.amount ? <span className="text-error font-bold text-xs mt-1.5 ml-2">{errors.amount}</span> : null}
        </div>

        <div className="flex flex-col mt-2">
          <span className="font-label-caps text-label-caps text-on-surface-variant mb-2 ml-1">CURRENCY</span>
          <div className="flex flex-row flex-wrap gap-2">
            {(['JPY', 'TWD', 'USD', 'EUR', 'KRW', 'THB'] as const).map((cur) => (
              <button
                key={cur}
                onClick={() => actions.updateForm((prev) => ({ ...prev, currency: cur }))}
                className={`rounded-[14px] px-4 py-2 border shadow-sm cursor-pointer transition-all active:scale-95 ${
                  form.currency === cur ? 'bg-primary border-primary text-white' : 'bg-white/60 border-white/80 hover:bg-white/80 text-on-surface-variant'
                }`}
              >
                <span className="text-[13px] font-bold">
                  {cur}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-outline-variant/30 my-2" />

        <span className="font-label-caps text-label-caps text-on-surface-variant mt-1 ml-1">PAID BY</span>
        <div className="flex flex-row flex-wrap gap-2">
          {members.map((member) => (
            <button
              key={member}
              onClick={() => {
                actions.updateForm((prev) => ({ ...prev, payer: member }));
                if (errors.payer) actions.clearFormError('payer');
              }}
              className={`rounded-[14px] px-4 py-2 border shadow-sm cursor-pointer transition-all active:scale-95 ${
                form.payer === member ? 'bg-primary border-primary text-white' : 'bg-white/60 border-white/80 hover:bg-white/80 text-on-surface-variant'
              }`}
            >
              <span className="text-[13px] font-bold">
                {member}
              </span>
            </button>
          ))}
        </div>
        {errors.payer ? <span className="text-error font-bold text-xs ml-2 mt-1">{errors.payer}</span> : null}

        <span className="font-label-caps text-label-caps text-on-surface-variant mt-3 ml-1">SPLIT WITH</span>
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
                className={`rounded-[14px] px-4 py-2 border shadow-sm cursor-pointer transition-all active:scale-95 flex items-center ${
                  selected ? 'bg-primary-container border-primary text-on-primary-container' : 'bg-white/60 border-white/80 hover:bg-white/80 text-on-surface-variant'
                }`}
              >
                {selected && <Check size={14} className="mr-1.5" strokeWidth={3} />}
                <span className="text-[13px] font-bold">{member}</span>
              </button>
            );
          })}
        </div>
        {errors.splitWith ? <span className="text-error font-bold text-xs ml-2 mt-1">{errors.splitWith}</span> : null}

        <button
          onClick={() => void actions.submitExpense()}
          disabled={submitting}
          className={`jelly-button ${submitting ? 'opacity-70 cursor-not-allowed' : 'bg-gradient-to-r from-primary-container to-tertiary-container'} rounded-[24px] py-4 flex justify-center mt-6 transition-all`}
        >
          <span className="text-on-primary-container font-h2 text-[16px] tracking-wide">{submitting ? 'Calculating...' : 'Add Expense & Split'}</span>
        </button>
      </div>
    </section>
  );
}

function SettlementsSection() {
  const { state: { settlements, expenseByCurrency, clearingId }, actions } = useToolsTabContext();
  const currencyEntries = Object.entries(expenseByCurrency);
  return (
    <section className="flex flex-col gap-md mt-sm mb-32">
      <div className="flex items-center justify-between px-xs">
        <h3 className="font-h2 text-[20px] text-on-surface">Who owes who</h3>
        <div className="flex flex-row flex-wrap justify-end gap-2">
          {currencyEntries.length === 0 ? (
            <span className="text-[13px] font-bold text-slate-400 w-auto shrink-0">No expenses yet</span>
          ) : (
            currencyEntries.map(([cur, amount]) => (
              <span key={cur} className="font-label-caps text-label-caps text-primary bg-primary-container/30 px-2 py-1 rounded-full w-auto shrink-0">
                {cur} {amount.toLocaleString()}
              </span>
            ))
          )}
        </div>
      </div>
      
      <div className="flex flex-col gap-sm">
        {settlements.length === 0 && (
          <div className="jelly-card rounded-lg p-sm flex items-center justify-center py-8 opacity-60">
            <span className="font-body-md text-on-surface-variant">All settled up!</span>
          </div>
        )}
        {settlements.map((settlement) => (
          <div key={settlement.id} className="jelly-card rounded-lg p-sm flex flex-col md:flex-row md:items-center justify-between gap-y-3 gap-x-2">
            <div className="flex items-center gap-md">
              <div className="w-12 h-12 rounded-full bg-white/50 border-2 border-white/80 shadow-sm flex items-center justify-center text-xl relative">
                💸
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-tertiary-container border-2 border-white rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <p className="font-body-md font-semibold text-on-surface">{settlement.from}</p>
                <p className="font-body-md text-sm text-tertiary">Owes {settlement.to} {settlement.currency} {settlement.amount}</p>
              </div>
            </div>
            
            <div className="flex flex-row items-center gap-2">
              <button
                onClick={() => void actions.sendReminder()}
                className="jelly-button bg-gradient-to-r from-tertiary-container to-secondary-container border border-white rounded-full px-sm py-[6px] flex items-center gap-xs flex-1 md:flex-initial justify-center"
              >
                <span className="material-symbols-outlined text-[16px] text-on-tertiary-container" data-icon="send" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                <span className="font-label-caps text-[10px] text-on-tertiary-container">Nudge</span>
              </button>
              
              <button
                onClick={() => void actions.handleClearSettlement(settlement)}
                disabled={clearingId === settlement.id}
                className="jelly-button bg-gradient-to-r from-primary-container to-primary-fixed border border-white rounded-full px-sm py-[6px] flex items-center gap-xs flex-1 md:flex-initial justify-center"
              >
                <span className="material-symbols-outlined text-[16px] text-on-primary-container" data-icon="check" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                <span className="font-label-caps text-[10px] text-on-primary-container">{clearingId === settlement.id ? '...' : 'Settle'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
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
    <div className="mb-6 -mx-1 w-full overflow-x-auto scrollbar-hide">
      <div className="flex flex-row px-1 min-w-max gap-3">
        {trips.map((trip) => {
          const active = activeTripId === trip.tripId;
          return (
            <button
              key={trip.tripId}
              onClick={() => setActiveTripId(trip.tripId)}
              className={`px-4 py-2 flex flex-col rounded-2xl border cursor-pointer transition-all ${
                active 
                  ? 'bg-primary border-primary text-white scale-105 shadow-[0_4px_15px_rgba(134,77,97,0.3)]' 
                  : 'bg-white/60 border-white hover:bg-white/80 text-on-surface-variant'
              }`}
            >
              <span className={`text-[14px] font-bold ${active ? 'text-white' : 'text-on-surface'}`}>
                {trip.name}
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${active ? 'text-primary-container' : 'text-on-surface-variant/70'}`}>
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
    <div className="pt-2 pb-32 px-container-padding max-w-md mx-auto flex flex-col w-full h-full overflow-y-auto scrollbar-hide">
      <div className="space-y-xs pt-sm mb-6">
        <h1 className="font-h1 text-h1 text-primary">Prep Hub</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Kyoto is calling! Let's get you ready. 🌸</p>
      </div>
      <TripSelectorBar />

      <WeatherCard />

      {loading ? (
        <div className="flex justify-center items-center py-10 font-bold text-fuchsia-500">載入中...</div>
      ) : (
        <>
          <ChecklistSection />
          <LedgerSection />
          <SettlementsSection />
          {tip ? <span className="text-center font-bold text-xs text-slate-500 -mt-24 mb-24 transition-opacity">{tip}</span> : null}
        </>
      )}
    </div>
  );
}
