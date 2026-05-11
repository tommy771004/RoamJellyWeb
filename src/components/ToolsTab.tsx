import React, { createContext, use, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudRain, Check, Sparkles, Sun, Send, CheckCircle2, Plane, Star, ExternalLink, SlidersHorizontal, ArrowDownUp } from 'lucide-react';
import GlassCard from './GlassCard';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
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
} from '../lib/workflowApi';
import type { TripInfo, WeatherData, TripSummary, ChecklistItem, Settlement, SettlementHistoryEntry } from '../types/workflow';
import { suggestPackingList } from '../lib/openrouterApi';
import { useToolsStore, Expense } from '../store/useToolsStore';
import { useAppStore } from '../store/useAppStore';

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return '春季';
  if (month >= 6 && month <= 8) return '夏季';
  if (month >= 9 && month <= 11) return '秋季';
  return '冬季';
}

function getCurrencyFromDestination(destination: string): string {
  if (!destination) return 'TWD';
  const dest = destination.toLowerCase();
  if (dest.includes('日') || dest.includes('tokyo') || dest.includes('osaka')) return 'JPY';
  if (dest.includes('韓') || dest.includes('seoul')) return 'KRW';
  if (dest.includes('泰') || dest.includes('bangkok')) return 'THB';
  if (dest.includes('美') || dest.includes('usa')) return 'USD';
  if (dest.includes('歐') || dest.includes('paris') || dest.includes('london')) return 'EUR';
  return 'TWD';
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
  settlementHistory: SettlementHistoryEntry[];
  expenses: Expense[];
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
  const { checklist, setChecklist, revertCheckItem, settlements, setSettlements, members, setMembers, expenses, addExpense, clearSettlementRecord } =
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
  const [settlementHistory, setSettlementHistory] = useState<SettlementHistoryEntry[]>([]);
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
        const [checklistData, collaboratorsData, weatherData, tripInfoData] = await Promise.all([
          fetchChecklist(tripId),
          fetchCollaborators(tripId),
          fetchWeather(tripInfo?.destination || '您的目的地').catch(() => null),
          fetchTripInfo(tripId).catch(() => null),
        ]);
        if (weatherData) setWeather(weatherData);

        let initialCurrency = 'TWD';
        if (tripInfoData) {
          setTripInfo(tripInfoData);
          initialCurrency = getCurrencyFromDestination(tripInfoData.destination);
        }

        const memberNames = collaboratorsData.map((m: any) => m.name);
        setChecklist(checklistData);
        if (memberNames.length > 0) {
          setMembers(memberNames);
          // Only update initial form state once when we get members
          setForm((prev) => ({ 
            ...prev, 
            payer: memberNames[0], 
            splitWith: memberNames,
            currency: initialCurrency
          }));
        }
      } catch {
        setTip('工具包載入失敗，請稍後重試。');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [tripId, setChecklist, setMembers]);

  const expenseByCurrency = useMemo(
    () =>
      (expenses as Expense[]).reduce((acc: Record<string, number>, exp: Expense) => {
        const cur = exp.currency ?? 'JPY';
        acc[cur] = (acc[cur] ?? 0) + Number(exp.amount || 0);
        return acc;
      }, {} as Record<string, number>),
    [expenses],
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
      const nextChecklist = checklist.map((i: any) => (i.id === item.id ? { ...i, checked: nextChecked } : i));
      setChecklist(nextChecklist);
      void updateChecklist({ trip_id: tripId, items: nextChecklist }).catch(() => {
        revertCheckItem(item.id, item.checked);
        setTip('清單同步失敗，已還原。');
        setTimeout(() => setTip(''), 2000);
      });
    },

    async handleAiPackingList() {
      setAiLoading(true);
      try {
        const suggestions = await suggestPackingList(tripInfo?.destination ?? '目的地', getCurrentSeason());
        const newItems: ChecklistItem[] = suggestions.map((text, i) => ({
          id: `ai_${Date.now()}_${i}`,
          text,
          checked: false,
        }));
        setChecklist([...checklist, ...newItems]);
        showToast(`✨ AI 新增了 ${newItems.length} 項行李建議！`, 'success');
      } catch {
        showToast('AI 功能失敗，請確認 OpenRouter API Key 是否設定。', 'warning');
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
        const expense = {
          id: `exp_${Date.now()}_${Math.random()}`,
          title: form.title,
          amount: Number(form.amount),
          currency: form.currency,
          payer: form.payer,
          splitWith: form.splitWith,
          date: new Date().toISOString()
        };
        addExpense(expense);
        
        if (tripId) {
          await submitLedgerExpense(tripId, expense);
        }

        showToast('分帳已更新，已算出最新應付關係。', 'success');
        setForm((prev) => ({ ...prev, title: '', amount: '', splitWith: members }));
      } catch {
        showToast('分帳送出失敗，請稍後再試。', 'warning');
      } finally {
        setSubmitting(false);
      }
    },

    async sendReminder() {
      const text = settlements.map((item: any) => `${item.from} 需給 ${item.to} ${item.currency} ${item.amount.toLocaleString()}`).join('\n');
      const ok = await shareText(`溫柔提醒：\n${text || '目前沒有待結算項目'}`);
      if (ok) {
         showToast('提醒內容已分享或複製。', 'success');
      } else {
         showToast('提醒發送失敗，請稍後再試。', 'warning');
      }
    },

    async handleClearSettlement(settlement) {
      setClearingId(settlement.id);
      try {
        clearSettlementRecord(settlement.from, settlement.to, settlement.currency);
        if (tripId) {
           await clearSettlement(tripId);
           const [history, fresh] = await Promise.all([
             fetchSettlementHistory(tripId),
             fetchSettlements(tripId),
           ]);
           setSettlementHistory(history);
           if (Array.isArray(fresh)) setSettlements(fresh);
        }
        showToast(`${settlement.from} → ${settlement.to} 已標記結清。`, 'success');
      } catch {
        showToast('結清失敗，請稍後再試。', 'warning');
      } finally {
        setClearingId(null);
      }
    },
  };

  useEffect(() => {
    if (!tripId) return;
    void fetchSettlementHistory(tripId).then(setSettlementHistory).catch(() => {});
  }, [tripId]);

  const state: ToolsTabState = {
    loading,
    tip,
    weather,
    destination: tripInfo?.destination ?? '',
    checklist,
    settlements,
    settlementHistory,
    expenses,
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
  const { state: { weather, destination, loading } } = useToolsTabContext();
  const { isOffline } = useAppStore();
  const Icon = weather && weather.rain_prob >= 50 ? CloudRain : Sun;

  if (!weather && loading) {
    return (
      <GlassCard className="!p-6 sm:!p-8 mb-8 flex flex-col gap-4 animate-pulse">
        <div className="h-5 w-32 bg-slate-200 rounded-full" />
        <div className="h-3 w-24 bg-slate-100 rounded-full" />
        <div className="flex items-end justify-between mt-2">
          <div className="h-8 w-24 bg-fuchsia-100 rounded-full" />
          <div className="h-14 w-16 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-12 w-full bg-slate-100 rounded-xl" />
      </GlassCard>
    );
  }
  
  const getOutfitSuggestion = (temp?: number, rainProb?: number) => {
    if (!temp) return { title: '輕便舒適穿搭', desc: '建議搭飛機時洋蔥式穿搭，並預備舒適好走的鞋子。' };
    let desc = '建議帶件薄外套與好走的鞋。';
    let title = '輕薄層次穿搭';
    if (temp >= 28) { title = '透氣涼爽穿搭'; desc = '建議穿著短袖與透氣材質，注意防曬避暑。'; }
    else if (temp < 28 && temp >= 20) { title = '輕薄層次穿搭'; desc = '建議短袖搭配薄外套，方便應對日夜溫差。'; }
    else if (temp < 20 && temp >= 10) { title = '保暖防風穿搭'; desc = '天氣微涼，建議準備長袖衣物與防風外套。'; }
    else { title = '厚實禦寒穿搭'; desc = '天氣寒冷，請準備保暖大衣、毛衣與圍巾。'; }
    
    if (rainProb && rainProb >= 50) {
      desc += ' 降雨機率高，請務必攜帶雨具出門。';
    }
    return { title, desc };
  };

  const outfit = getOutfitSuggestion(weather?.temp_current, weather?.rain_prob);

  return (
    <GlassCard className="!p-6 sm:!p-8 mb-8 flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-xl group">
      <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-100 rounded-full translate-x-1/3 -translate-y-1/3 opacity-30 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
      <div className="relative z-10">
        <h2 className="font-serif text-3xl text-[#2C302E] mb-1">明天在 {destination || '您的目的地'}</h2>
        <div className="flex flex-col gap-1 mb-6">
          <p className="text-[11px] uppercase tracking-widest text-fuchsia-600/70 font-bold">Local Weather & Outfit</p>
          {isOffline && (
            <span className="text-[10px] text-amber-500 font-bold bg-amber-50 w-fit px-2 py-0.5 rounded-full border border-amber-200">最後更新於 2 小時前</span>
          )}
        </div>
        
        <div className="flex items-end justify-between mb-6">
          <div className="flex bg-fuchsia-50 rounded-full px-4 py-2 items-center gap-2 border border-fuchsia-100/50">
            <Icon size={18} className="text-fuchsia-500" />
            <span className="text-fuchsia-700 font-medium text-sm">{weather && weather.rain_prob >= 50 ? '可能有雨' : '晴朗好天氣'}</span>
          </div>
          <div className="text-[56px] leading-none font-light tracking-tight text-[#2C302E]">
            {weather ? weather.temp_current : '--'}°
          </div>
        </div>

        <div className="bg-fuchsia-50/50 rounded-[24px] p-4 flex items-center gap-4 border border-fuchsia-100/30 mb-6">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-xl shadow-sm shrink-0">
              👗
          </div>
          <div className="flex flex-col">
            <span className="text-[#2C302E] font-bold">{outfit.title}</span>
            <span className="text-slate-500 text-sm font-medium leading-relaxed mt-0.5">{outfit.desc}</span>
          </div>
        </div>

        {weather && weather.daily && weather.daily.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-fuchsia-100/50 pt-4">
            <span className="text-[10px] uppercase tracking-widest text-fuchsia-600/70 font-bold mb-1">14-Day Forecast</span>
            <div className="flex overflow-x-auto pb-4 -mx-2 px-2 gap-3 snap-x hide-scrollbar">
              {weather.daily.map((day: any, idx: number) => {
                const date = new Date(day.date);
                const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
                const isRainy = day.rain_prob >= 50;
                const DayIcon = isRainy ? CloudRain : Sun;
                return (
                  <div key={idx} className="flex flex-col items-center flex-shrink-0 bg-white/60 border border-fuchsia-50 shadow-sm rounded-2xl w-[68px] py-3 snap-center">
                    <span className="text-xs font-bold text-slate-500 mb-2">{idx === 0 ? 'Today' : dayName}</span>
                    <DayIcon size={20} className={isRainy ? 'text-blue-400' : 'text-amber-400'} />
                    <div className="mt-3 flex gap-1 items-baseline font-bold">
                      <span className="text-sm text-slate-700">{day.temp_max}°</span>
                      <span className="text-[10px] text-slate-400">{day.temp_min}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function ChecklistSection() {
  const { state: { checklist, aiLoading }, actions } = useToolsTabContext();
  const { isOffline } = useAppStore();
  const packedCount = checklist.filter((i) => i.checked).length;
  
  return (
    <section className="mb-8 font-sans">
      <div className="flex justify-between items-end mb-4 px-2">
        <h2 className="font-serif text-[28px] text-[#2C302E]">My Suitcase</h2>
        <span className="text-[11px] uppercase tracking-wider font-bold text-fuchsia-600 bg-fuchsia-100/80 px-4 py-1.5 rounded-full border border-fuchsia-200">
          {packedCount}/{checklist.length} Packed
        </span>
      </div>
      
      <GlassCard className="!p-6 mb-4">
        <div className="flex flex-col gap-3">
          {checklist.length === 0 && <span className="text-sm text-slate-400 italic">目前沒有行李項目</span>}
          {checklist.map((item) => (
            <label key={item.id} className={`flex items-center gap-4 group p-2 rounded-2xl transition-colors ${isOffline ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-fuchsia-50/50'}`} onClick={(e) => { e.preventDefault(); if (!isOffline) actions.toggleCheck(item); }}>
              <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                <input readOnly checked={item.checked} className="peer sr-only" type="checkbox"/>
                <div className={`w-full h-full rounded-full border transition-all shadow-sm ${item.checked ? 'bg-fuchsia-500 border-fuchsia-500' : 'border-slate-200 bg-slate-50'}`}></div>
                <Check size={16} className={`text-white absolute transition-opacity ${item.checked ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
              </div>
              <span className={`text-[15px] font-medium transition-all ${item.checked ? 'line-through opacity-40 text-slate-500' : 'text-[#2C302E]'}`}>
                {item.text}
              </span>
            </label>
          ))}
        </div>
      </GlassCard>
      
      <Button
        onClick={() => void actions.handleAiPackingList()}
        disabled={aiLoading || isOffline}
        size="lg"
        className="w-full mt-2 rounded-full h-14 font-bold text-[15px]"
      >
        <Sparkles size={18} className="mr-2" />
        {aiLoading ? 'AI 正在規劃...' : 'Auto-Generate Packing List'}
      </Button>
    </section>
  );
}

function LedgerSection() {
  const { state: { form, errors, members, submitting, expenses }, actions } = useToolsTabContext();
  const { isOffline } = useAppStore();
  return (
    <GlassCard className="!p-6 flex flex-col mb-8 relative overflow-hidden transition-all duration-300">
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-100/40 rounded-full blur-[20px] pointer-events-none" />
      <div className="mb-6 flex flex-col relative z-10 px-2">
        <h3 className="font-serif text-[28px] text-[#2C302E]">Split Bill</h3>
        <span className="text-sm font-bold text-fuchsia-600/70">Recent expenses & calculate.</span>
      </div>

      <div className="flex flex-col gap-y-5 relative z-10">
        
        {/* Recent Expenses List */}
        {expenses && expenses.length > 0 && (
          <div className="flex flex-col gap-3 mb-4 w-full">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-2">最新花費紀錄</span>
            <div className="table-wrapper mt-2">
              <table className="responsive-table">
                <caption className="sr-only">最新花費清單</caption>
                <thead>
                  <tr>
                    <th scope="col">支出項目</th>
                    <th scope="col">代墊人</th>
                    <th scope="col" className="amount">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice().reverse().map(exp => (
                    <tr key={exp.id}>
                      <td data-label="支出項目">
                        <div className="flex flex-col items-end md:items-start">
                          <span className="text-[15px] font-bold text-[#2C302E] truncate">{exp.title}</span>
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
                          <span className="font-black text-fuchsia-500 text-[16px]">{exp.currency} {exp.amount.toLocaleString()}</span>
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expense-title">支出項目</Label>
          <Input
            id="expense-title"
            value={form.title}
            onChange={(e) => {
              actions.updateForm((prev) => ({ ...prev, title: e.target.value }));
              if (errors.title) actions.clearFormError('title');
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
                actions.updateForm((prev) => ({ ...prev, amount: e.target.value.replace(/[^0-9]/g, '') }));
                if (errors.amount) actions.clearFormError('amount');
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
              onChange={(e) => actions.updateForm((prev) => ({ ...prev, currency: e.target.value }))}
              className="w-full flex h-12 rounded-xl border border-outline bg-surface text-on-surface px-3 py-2 text-sm ring-offset-surface outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm appearance-none text-center cursor-pointer transition-colors"
            >
              {['JPY', 'TWD', 'USD', 'EUR', 'KRW', 'THB'].map((cur) => (
                <option key={cur} value={cur}>{cur}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-px w-full bg-slate-100 my-2" />

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-2">誰先墊付</span>
          <div className="flex flex-row flex-wrap gap-2">
            {members.map((member) => (
              <Button
                key={member}
                variant={form.payer === member ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  actions.updateForm((prev) => ({ ...prev, payer: member }));
                  if (errors.payer) actions.clearFormError('payer');
                }}
                className={`rounded-full px-4 py-2 text-[13px] font-bold flex items-center gap-2 transition-all ${
                  form.payer === member ? 'ring-2 ring-primary/50 ring-offset-1 z-10 shadow-md' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${form.payer === member ? 'bg-white text-primary shadow-sm' : 'bg-slate-200 text-slate-500'}`}>
                   {member.charAt(0).toUpperCase()}
                </div>
                <span className="truncate max-w-[150px]">{member}</span>
              </Button>
            ))}
          </div>
          {errors.payer && <span className="text-red-500 font-bold text-[11px] uppercase tracking-wide ml-2">{errors.payer}</span>}
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-2">分攤人員</span>
          <div className="flex flex-row flex-wrap gap-2">
            {members.map((member) => {
              const selected = form.splitWith.includes(member);
              return (
                <Button
                  key={member}
                  variant={selected ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    actions.toggleSplitMember(member);
                    if (errors.splitWith) actions.clearFormError('splitWith');
                  }}
                  className={`rounded-full px-4 py-2 text-[13px] font-bold flex items-center gap-2 transition-all ${
                    selected ? 'shadow-md ring-2 ring-primary/30 ring-offset-1 text-primary' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`relative w-4 h-4 rounded-full shrink-0 border transition-colors flex items-center justify-center ${selected ? 'bg-primary border-primary' : 'bg-slate-100 border-slate-300'}`}>
                    <Check size={10} className={`text-white transition-opacity ${selected ? 'opacity-100' : 'opacity-0'}`} strokeWidth={4} />
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm ${selected ? 'bg-primary/20 text-primary-700' : 'bg-slate-200 text-slate-500'}`}>
                     {member.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate max-w-[150px]">{member}</span>
                </Button>
              );
            })}
          </div>
          {errors.splitWith && <span className="text-red-500 font-bold text-[11px] uppercase tracking-wide ml-2">{errors.splitWith}</span>}
        </div>

        <Button
          onClick={() => void actions.submitExpense()}
          disabled={submitting || isOffline}
          size="lg"
          className="w-full mt-4 py-6 rounded-2xl"
        >
          {submitting ? '計算中...' : '新增花費'}
        </Button>
      </div>
    </GlassCard>
  );
}

function SettlementsSection() {
  const { state: { settlements, expenseByCurrency, clearingId }, actions } = useToolsTabContext();
  const { isOffline } = useAppStore();
  const currencyEntries = Object.entries(expenseByCurrency);
  return (
    <section className="flex flex-col mb-32">
      <div className="flex items-center justify-between px-4 mb-6">
        <h3 className="font-serif text-[26px] text-[#2C302E]">結算清單 (誰應付誰)</h3>
        <div className="flex flex-row flex-wrap justify-end gap-2">
          {currencyEntries.length === 0 ? (
            <span className="text-[12px] font-bold text-slate-400 shrink-0">尚無款項</span>
          ) : (
            currencyEntries.map(([cur, amount]) => (
              <span key={cur} className="text-[11px] font-black text-fuchsia-600 bg-fuchsia-50 px-4 py-2 rounded-full shrink-0 tracking-wider shadow-sm border border-fuchsia-100">
                {cur} {amount.toLocaleString()}
              </span>
            ))
          )}
        </div>
      </div>
      
      <div className="flex flex-col gap-4 w-full">
        {settlements.length === 0 && (
          <GlassCard className="!p-10 flex items-center justify-center">
            <span className="text-slate-400 font-medium italic">都算清囉！ ✨</span>
          </GlassCard>
        )}
        {settlements.length > 0 && (
          <div className="table-wrapper mt-2">
            <table className="responsive-table">
              <caption className="sr-only">結算清單</caption>
              <thead>
                <tr>
                  <th scope="col">付款人</th>
                  <th scope="col">收款人</th>
                  <th scope="col" className="amount">結算金額</th>
                  <th scope="col" className="text-right">動作</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((settlement) => (
                  <tr key={settlement.id}>
                    <td data-label="付款人">
                      <div className="flex justify-end md:justify-start items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-black text-sm">
                          {settlement.from.charAt(0)}
                        </div>
                        <span className="text-[15px] font-bold text-[#2C302E]">{settlement.from}</span>
                      </div>
                    </td>
                    <td data-label="收款人">
                      <div className="flex justify-end md:justify-start">
                        <span className="text-[13px] text-slate-500 font-medium px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                          支付給 <strong className="font-bold text-slate-700">{settlement.to}</strong>
                        </span>
                      </div>
                    </td>
                    <td data-label="結算金額" className="amount">
                      <div className="flex justify-end">
                        <span className="font-black text-fuchsia-500 text-[18px]">{settlement.currency} {settlement.amount.toLocaleString()}</span>
                      </div>
                    </td>
                    <td data-label="動作">
                      <div className="flex flex-row items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void actions.sendReminder()}
                        >
                          <Send size={14} className="opacity-70 mr-1.5" />
                          <span className="text-[11px] font-bold tracking-wide uppercase">提醒</span>
                        </Button>
                        
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => void actions.handleClearSettlement(settlement)}
                          disabled={clearingId === settlement.id || isOffline}
                        >
                          <CheckCircle2 size={14} className="opacity-90 mr-1.5" />
                          <span className="text-[11px] font-bold tracking-wide uppercase">{clearingId === settlement.id ? '處理中' : '結清'}</span>
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
    </section>
  );
}

function SettlementHistorySection() {
  const { state: { settlementHistory } } = useToolsTabContext();
  if (settlementHistory.length === 0) return null;
  return (
    <section className="flex flex-col mb-12">
      <div className="flex items-center justify-between px-4 mb-4">
        <h3 className="font-serif text-[20px] text-[#2C302E]">結清紀錄</h3>
        <span className="text-[11px] text-slate-400 font-medium">{settlementHistory.length} 筆</span>
      </div>
      <div className="flex flex-col gap-3 w-full">
        {settlementHistory.map((entry) => (
          <GlassCard key={entry.clearedAt} className="!p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} className="text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-700">
                {new Date(entry.clearedAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })} 結清
              </p>
              <p className="text-[12px] text-slate-400 mt-0.5">
                {entry.count} 筆費用 ・ 涉及 {entry.payers.length} 位成員
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              {Object.entries(entry.currencyTotals ?? {}).map(([cur, amt]) => (
                <span key={cur} className="text-[13px] font-black text-green-600">
                  {cur} {Math.round(amt).toLocaleString()}
                </span>
              ))}
            </div>
          </GlassCard>
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
    <div className="mb-8 w-full overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex flex-row gap-3 min-w-max">
        {trips.map((trip) => {
          const active = activeTripId === trip.tripId;
          return (
            <button
              key={trip.tripId}
              onClick={() => setActiveTripId(trip.tripId)}
              className={`px-5 py-4 flex flex-col rounded-[24px] border transition-all text-left shadow-sm shrink-0 min-w-[120px] ${
                active 
                  ? 'bg-fuchsia-500 border-fuchsia-500 text-white shadow-fuchsia-200' 
                  : 'bg-white bg-opacity-60 backdrop-blur-md border-white/50 text-slate-500 hover:bg-white hover:text-fuchsia-500'
              }`}
            >
              <span className={`text-[16px] font-bold whitespace-nowrap ${active ? 'text-white' : 'text-[#2C302E]'}`}>
                {trip.name}
              </span>
              <span className={`text-[11px] uppercase tracking-[0.1em] font-black mt-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] ${active ? 'text-white/80' : 'text-slate-400'}`}>
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
  const { activeTripId, setActiveTab } = useAppStore();
  const [flights, setFlights] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [filterMode, setFilterMode] = useState<'best' | 'filters' | 'nonstop'>('best');

  useEffect(() => {
    if (activeTripId) {
      setIsLoadingOffers(true);
      import('../lib/workflowApi').then(({ fetchTripFlights, fetchTripActivities }) => {
        Promise.all([
          fetchTripFlights(activeTripId).then(setFlights).catch(() => {}),
          fetchTripActivities(activeTripId).then(setActivities).catch(() => {})
        ]).finally(() => setIsLoadingOffers(false));
      }).catch(() => setIsLoadingOffers(false));
    }
  }, [activeTripId]);

  const displayedFlights = useMemo(() => {
    let result = [...flights];
    if (filterMode === 'nonstop') {
      result = result.filter(f => f.direct || f.stops === 0);
    } else if (filterMode === 'filters') {
      // Just an example filter, e.g., price < 15000
      result = result.filter(f => f.price < 15000);
    }
    return result;
  }, [flights, filterMode]);

  if (!activeTripId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/30 overflow-y-auto scroll-smooth">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full bg-white/70 backdrop-blur-2xl border border-white rounded-[48px] p-10 md:p-16 shadow-2xl flex flex-col md:flex-row items-center gap-10 md:gap-16 my-auto"
        >
          <div className="w-32 h-32 bg-fuchsia-100 rounded-[40px] flex items-center justify-center text-6xl shadow-inner shrink-0 animate-pulse">
            🧳
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-[32px] md:text-4xl font-black text-slate-800 mb-4 tracking-tight leading-tight">尚未選擇行程專案</h2>
            <p className="text-slate-500 font-bold text-lg mb-10 leading-relaxed">
              旅途工具包（天氣、清單、分帳）需要與特定行程連結，請先選擇或建立一個行程專案。
            </p>
            <button 
              onClick={() => setActiveTab('itinerary')}
              className="w-full md:w-auto px-12 py-5 rounded-[24px] bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3"
            >
              <Sparkles size={20} />
              前往規劃我的行程
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full overflow-y-auto scroll-smooth bg-[#fcfdff] bg-[radial-gradient(circle_at_top_right,rgba(245,208,254,0.4),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(230,255,244,0.3),transparent_50%)] text-[#2C302E] transition-all duration-300">
      <div className="pt-8 pb-32 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 mx-auto flex flex-col w-full max-w-full sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl gap-y-10">
        <TripSelectorBar />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="flex flex-col gap-y-8">
            <WeatherCard />
            <ChecklistSection />
          </div>
          <div className="flex flex-col gap-y-8">
            <LedgerSection />
            <SettlementsSection />
            <SettlementHistorySection />
          </div>
        </div>

        <div className="h-px bg-slate-200/50 my-4" />

        <div className="flex flex-col gap-y-6">
          <div className="flex flex-col gap-2 mb-2 mt-4 relative">
            <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-fuchsia-500 to-purple-600 rounded-full" />
            <h1 className="text-[32px] md:text-4xl font-black text-[#111111] leading-tight tracking-tight">推薦行程與航班</h1>
            <p className="text-[17px] text-slate-500 font-bold tracking-wide">為您的旅程精選的機票與活動票券</p>
          </div>

          {/* Filters */}
          <div className="flex flex-row overflow-x-auto scrollbar-hide gap-3 mb-2 -mx-5 px-5 sm:mx-0 sm:px-0 py-2">
            <button 
              onClick={() => setFilterMode('best')}
              className={`backdrop-blur-md rounded-full px-6 py-3 shadow-sm font-black text-[15px] flex items-center gap-2 shrink-0 transition-all active:scale-95 border ${filterMode === 'best' ? 'bg-fuchsia-100/80 border-fuchsia-200 text-fuchsia-700' : 'bg-white/70 border-white text-[#2C302E] hover:border-fuchsia-200 hover:text-fuchsia-600'} group`}
            >
              <ArrowDownUp size={16} className={filterMode === 'best' ? 'text-fuchsia-500' : 'text-slate-400 group-hover:text-fuchsia-500'} />
              Best Match
            </button>
            <button 
              onClick={() => setFilterMode('filters')}
              className={`backdrop-blur-md rounded-full px-6 py-3 shadow-sm font-black text-[15px] flex items-center gap-2 shrink-0 transition-all active:scale-95 border ${filterMode === 'filters' ? 'bg-fuchsia-100/80 border-fuchsia-200 text-fuchsia-700' : 'bg-white/70 border-white text-[#2C302E] hover:border-fuchsia-200 hover:text-fuchsia-600'} group`}
            >
              <SlidersHorizontal size={16} className={filterMode === 'filters' ? 'text-fuchsia-500' : 'text-slate-400 group-hover:text-fuchsia-500'} />
              Filters
            </button>
            <button 
              onClick={() => setFilterMode('nonstop')}
              className={`backdrop-blur-md rounded-full px-6 py-3 shadow-sm font-black text-[15px] flex items-center gap-2 shrink-0 transition-all active:scale-95 border ${filterMode === 'nonstop' ? 'bg-fuchsia-100/80 border-fuchsia-200 text-fuchsia-700' : 'bg-white/70 border-white text-[#2C302E] hover:border-fuchsia-200 hover:text-fuchsia-600'} group`}
            >
              <Plane size={16} className={filterMode === 'nonstop' ? 'text-fuchsia-500' : 'text-slate-400 group-hover:text-fuchsia-500'} />
              Non-stop
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
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
              <GlassCard key={idx} className="!p-6 flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-fuchsia-50 text-fuchsia-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plane className="w-6 h-6 transform -rotate-45" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[18px] text-[#2C302E]">{flight.airline}</span>
                        <ExternalLink size={14} className="text-slate-300" />
                      </div>
                      <span className="text-[13px] text-slate-400 font-bold tracking-wide">Direct • {flight.duration}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[32px] font-black text-fuchsia-500 leading-none group-hover:scale-105 transition-transform">${flight.price}</span>
                  </div>
                </div>

                <div className="flex flex-col mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="text-[26px] font-black text-[#2C302E] tracking-tight">{flight.depTime}</span>
                      <span className="text-[14px] font-black text-slate-300 uppercase tracking-widest">{flight.depCode}</span>
                    </div>
                    <div className="flex-1 mx-6 flex items-center relative">
                      <div className="h-[2px] bg-slate-100 flex-1"></div>
                      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-fuchsia-400 shadow-sm" />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[26px] font-black text-[#2C302E] tracking-tight">{flight.arrTime}</span>
                      <span className="text-[14px] font-black text-slate-300 uppercase tracking-widest">{flight.arrCode}</span>
                    </div>
                  </div>
                </div>

                <button className="w-full py-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white font-black text-[15px] transition-all active:scale-95 shadow-lg shadow-fuchsia-200">
                  查看航班詳情
                </button>
              </GlassCard>
            ))}

            {/* Klook Cards */}
            {activities.map((item, idx) => (
              <GlassCard key={`klook-${idx}`} className="!p-5 flex flex-row gap-5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group">
                <div className="relative w-[130px] h-full shrink-0 overflow-hidden rounded-[24px]">
                  <img src={item.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.title} />
                </div>
                <div className="flex flex-col flex-1 py-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-lg leading-none">🎡</span>
                    <span className="font-black text-fuchsia-500 text-[11px] uppercase tracking-widest bg-fuchsia-50 px-2 py-1 rounded-md">Klook 精選</span>
                  </div>
                  <h3 className="font-bold text-[#2C302E] leading-snug text-[17px] mb-auto line-clamp-2">{item.title}</h3>
                  
                  <div className="flex items-end justify-between mt-3">
                    <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                      <Star size={14} className="text-amber-500" fill="currentColor" />
                      <span className="text-[13px] font-black text-amber-700">{item.rating}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[24px] font-black text-fuchsia-500 leading-none">${item.price}</span>
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
    </div>
  );
}

