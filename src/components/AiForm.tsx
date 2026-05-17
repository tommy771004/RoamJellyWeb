import React, { useEffect, useState } from 'react';
import { MapPin, Minus, Plus, Settings2, Sparkles, ArrowLeft, Loader2, Search, Calendar, Users, Heart, Coffee, Car, DollarSign, Check, Footprints, Baby, Accessibility, PawPrint, UsersRound } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import GlassCard from './GlassCard';
import { LocationPickerPopup } from './LocationPickerPopup';
import { useSearchStore } from '../store/useSearchStore';
import { useKeyboardHeight } from '../lib/useKeyboardHeight';

const COMPANION_OPTIONS = [
  { id: 'solo', label: '獨自行走', icon: Footprints, tone: 'border-sky-100 bg-sky-50 text-sky-600' },
  { id: 'couple', label: '浪漫雙人', icon: Heart, tone: 'border-rose-100 bg-rose-50 text-rose-600' },
  { id: 'family', label: '親子育兒', icon: Baby, tone: 'border-orange-100 bg-orange-50 text-orange-600' },
  { id: 'elderly', label: '帶長輩', icon: Accessibility, tone: 'border-amber-100 bg-amber-50 text-amber-700' },
  { id: 'friends', label: '三五好友', icon: UsersRound, tone: 'border-sky-100 bg-sky-50 text-sky-600' },
  { id: 'pets', label: '毛小孩', icon: PawPrint, tone: 'border-emerald-100 bg-emerald-50 text-emerald-600' },
];

const VIBE_OPTIONS = ['特種兵急行軍', '睡到自然醒', '隨興漫遊', '在地深度文化', '網美打卡秘境', '奢華極致享受', '文青慢活步調', '夜生活狂歡'];
const INTEREST_OPTIONS = ['大自然與絕景', '歷史文化遺產', '購物血拼逛街', '主題遊樂園', '在地特色美食', '戶外刺激冒險', '藝術與博物館', '溫泉桑拿放鬆', '海島水上活動', '特色網美咖啡', '尋訪動漫朝聖'];
const DIETARY_OPTIONS = ['無限制', '純素食', '蛋奶素', '海鮮素', '無麩質', '不吃牛', '不吃海鮮', '清真認證'];
const TRANSPORT_OPTIONS = ['大眾運輸', '自駕租車', '包車導覽', '徒步與腳踏車'];
const BUDGET_OPTIONS = ['背包窮遊', '精打細算小資', '舒適無虞', '奢華尊榮'];
const AI_FORM_ENTRY_PILLS = ['先起草旅程', '再補偏好', '最後回手帳調整'];

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
}

function normalizeProfileList(values?: string[]) {
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
}

export const MultiSelectPill: React.FC<{ 
  label: string; 
  selected: boolean; 
  onClick: () => void;
  accentColor?: 'indigo' | 'emerald' | 'rose' | 'blue' | 'amber';
}> = ({ label, selected, onClick, accentColor = 'indigo' }) => {
  const selectedClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-[0_2px_10px_-3px_rgba(99,102,241,0.2)]',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.2)]',
    rose: 'bg-rose-50 border-rose-200 text-rose-700 shadow-[0_2px_10px_-3px_rgba(244,63,94,0.2)]',
    blue: 'bg-blue-50 border-blue-200 text-blue-700 shadow-[0_2px_10px_-3px_rgba(59,130,246,0.2)]',
    amber: 'bg-amber-50 border-amber-200 text-amber-900 shadow-[0_2px_10px_-3px_rgba(245,158,11,0.2)]',
  };

  const ringClasses: Record<string, string> = {
    indigo: 'ring-indigo-500/20',
    emerald: 'ring-emerald-500/20',
    rose: 'ring-rose-500/20',
    blue: 'ring-blue-500/20',
    amber: 'ring-amber-500/20',
  };

  return (
    <button
      onClick={onClick}
      className={`min-h-[44px] px-4 sm:px-5 py-2.5 rounded-2xl text-[14px] sm:text-[15px] font-bold transition-all active:scale-[0.98] duration-200 relative overflow-hidden flex items-center justify-center gap-2 border ${
        selected 
          ? `${selectedClasses[accentColor]} ring-2 ${ringClasses[accentColor]} ring-offset-1 -translate-y-0.5` 
          : 'bg-white/70 backdrop-blur-md text-slate-600 hover:bg-white hover:text-slate-900 border-slate-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300'
      }`}
    >
      {selected && <Check size={16} strokeWidth={3} className="shrink-0" />}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

export default function AiForm({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (data: AiFormData) => void;
  onCancel?: () => void;
}) {
  const { aiProfile, saveAiProfile } = useSearchStore();
  const keyboardHeight = useKeyboardHeight();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [step, setStep] = useState(1);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [showDepDropdown, setShowDepDropdown] = useState(false);
  const [formData, setFormData] = useState<AiFormData>({
    departure: '',
    destination: '',
    days: 5,
    companions: '',
    vibes: [],
    interests: [],
    dietary: [],
    transport: [],
    budget: '',
  });

  useEffect(() => {
    if (!aiProfile) return;

    setFormData((prev) => ({
      ...prev,
      departure: prev.departure || aiProfile.departure || '',
      companions: prev.companions || aiProfile.companions || '',
      vibes: prev.vibes.length ? prev.vibes : normalizeProfileList(aiProfile.vibes),
      interests: prev.interests.length ? prev.interests : normalizeProfileList(aiProfile.interests),
      dietary: prev.dietary.length ? prev.dietary : normalizeProfileList(aiProfile.dietary),
      transport: prev.transport.length ? prev.transport : normalizeProfileList(aiProfile.transport),
      budget: prev.budget || aiProfile.budget || '',
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

  const toggleArrayItem = (field: 'vibes' | 'interests' | 'dietary' | 'transport', item: string) => {
    setFormData(prev => {
      const arr = prev[field];
      if (arr.includes(item)) {
        return { ...prev, [field]: arr.filter(i => i !== item) };
      } else {
        return { ...prev, [field]: [...arr, item] };
      }
    });
  };

  const handleSubmit = () => {
    void saveAiProfile({
      departure: formData.departure,
      companions: formData.companions,
      vibes: formData.vibes,
      interests: formData.interests,
      dietary: formData.dietary,
      transport: formData.transport,
      budget: formData.budget,
    });
    onSubmit(formData);
  };

  const stepOneHint = !formData.departure
    ? '先選擇出發地。'
    : !formData.destination
      ? '再選擇目的地。'
      : !formData.companions
        ? '最後選擇同行者。'
        : '已完成基本資料，下一步可微調節奏、飲食與預算。';

  return (
    <div className="relative flex flex-col h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* Refined Immersive Background for AI Form */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-12%] right-[-8%] h-[72%] w-[72%] rounded-full bg-sky-100/50 blur-[120px]" />
        <div className="absolute bottom-[-12%] left-[-10%] h-[72%] w-[72%] rounded-full bg-orange-100/45 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full px-4 sm:px-8 py-4 sm:py-10 pb-tab-safe max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-4 sm:mb-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                AI Trip Draft
              </span>
              <span className="inline-flex items-center rounded-full border border-orange-200 bg-white/85 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
                2 Steps
              </span>
            </div>
            <div>
              <h2 className="text-balance text-2xl sm:text-4xl font-black text-slate-900 leading-tight tracking-tight mb-1 sm:mb-2">
                先讓 AI 起草一版旅程，再回到手帳慢慢補完
              </h2>
              <p className="max-w-2xl text-pretty text-sm sm:text-base font-bold leading-6 text-slate-600">
                這裡先收斂目的地、天數與偏好，產出可編輯的第一版安排，而不是一次性的靜態結果。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {AI_FORM_ENTRY_PILLS.map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-black text-slate-600 shadow-sm"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
          {onCancel && (
            <button 
              onClick={onCancel}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-sky-700 hover:bg-sky-50 hover:border-sky-200 shadow-sm transition-colors active:scale-95 shrink-0"
              aria-label="取消"
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
            initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.99, y: 8 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.99, y: -8 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: 'easeOut' }}
            className="flex flex-col gap-6 sm:gap-8"
          >
            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Left Column: Route & Dates */}
              <div className="flex flex-col gap-4 sm:gap-6 bg-white/80 backdrop-blur-xl border border-white/90 p-4 sm:p-8 rounded-[2rem] shadow-sm">
                
                {/* Departure */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <MapPin size={16} className="text-sky-500" />
                    出發地
                  </label>
                  <button 
                    onClick={() => setShowDepDropdown(true)}
                    className="w-full text-left bg-white border border-slate-200 hover:border-sky-300 rounded-2xl py-4 px-5 text-base sm:text-lg text-slate-800 font-bold focus:outline-none focus:ring-4 focus:ring-sky-100 shadow-sm transition-colors group flex items-center justify-between min-h-[60px]"
                  >
                    <span className={formData.departure ? "text-slate-800" : "text-slate-500 font-medium"}>
                      {formData.departure || "請選擇出發城市"}
                    </span>
                    {!formData.departure && <Search size={18} className="text-slate-400 group-hover:text-sky-400 transition-colors" />}
                  </button>
                </div>

                {/* Destination */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <MapPin size={16} className="text-orange-500" />
                    目的地
                  </label>
                  <button 
                    onClick={() => setShowDestDropdown(true)}
                    className="w-full text-left bg-white border border-slate-200 hover:border-orange-300 rounded-2xl py-4 px-5 text-base sm:text-lg text-slate-800 font-bold focus:outline-none focus:ring-4 focus:ring-orange-100 shadow-sm transition-colors group flex items-center justify-between min-h-[60px]"
                  >
                    <span className={formData.destination ? "text-slate-800" : "text-slate-500 font-medium"}>
                      {formData.destination || "想去哪裡探索？"}
                    </span>
                    {!formData.destination && <Search size={18} className="text-slate-400 group-hover:text-orange-400 transition-colors" />}
                  </button>
                </div>

                {/* Days */}
                <div className="flex flex-col gap-2.5 pt-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <Calendar size={16} className="text-sky-500" />
                    預計天數
                  </label>
                  <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-2 shadow-sm min-h-[60px]">
                    <button 
                      onClick={() => setFormData(p => ({ ...p, days: Math.max(1, p.days - 1) }))}
                      className="w-12 h-12 shrink-0 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
                    >
                      <Minus size={20} strokeWidth={2.5} />
                    </button>
                    <div className="flex-1 flex items-baseline justify-center gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-slate-800 tabular-nums leading-none tracking-tight">
                        {formData.days}
                      </span>
                      <span className="text-slate-500 font-bold text-sm">天</span>
                    </div>
                    <button 
                      onClick={() => setFormData(p => ({ ...p, days: Math.min(30, p.days + 1) }))}
                      className="w-12 h-12 shrink-0 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
                    >
                      <Plus size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Companions */}
              <div className="flex flex-col gap-4 sm:gap-6 bg-white/80 backdrop-blur-xl border border-white/90 p-4 sm:p-8 rounded-[2rem] shadow-sm">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <Users size={16} className="text-orange-500" />
                  與誰同行？
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 h-full content-start">
                  {COMPANION_OPTIONS.map(opt => {
                    const isSelected = formData.companions === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setFormData(p => ({ ...p, companions: opt.id }))}
                        className={`flex flex-col items-center justify-center gap-2 p-3.5 sm:p-5 rounded-2xl transition-all duration-200 min-h-[88px] sm:min-h-[100px] border-2 group relative overflow-hidden ${
                          isSelected 
                            ? 'bg-slate-900 shadow-md border-slate-900 scale-[1.02] z-10' 
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm active:scale-[0.98]'
                        }`}
                      >
                        <span
                          className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-110 ${
                            isSelected
                              ? 'border-white/15 bg-white/10 text-white'
                              : opt.tone
                          }`}
                        >
                          <Icon size={20} strokeWidth={2.2} />
                        </span>
                        <span className={`text-[13px] font-bold tracking-wide relative z-10 ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Spacer so last field isn't hidden under fixed button on mobile */}
            <div className="sm:hidden w-full shrink-0" style={{ height: keyboardHeight > 0 ? "20px" : "120px" }} />

            {/* Next Button — fixed above keyboard on mobile, static on desktop */}
            <div
              className="fixed bottom-0 left-0 right-0 w-full z-50 sm:static sm:z-auto sm:pt-4 bg-gradient-to-t from-white via-white/95 to-transparent sm:bg-none backdrop-blur-sm sm:backdrop-blur-none"
              style={{
                paddingBottom: keyboardHeight > 0 
                  ? `${keyboardHeight + 16}px` 
                  : 'max(16px, env(safe-area-inset-bottom, 16px))'
              }}
            >
              <div className="max-w-4xl mx-auto px-4 sm:px-0 pt-3 pb-2 sm:pt-0 sm:pb-0">
                <button
                  onClick={handleNext}
                  disabled={!formData.departure || !formData.destination || !formData.companions}
                  className={`w-full h-14 sm:h-16 rounded-2xl font-black text-sm sm:text-base uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-200 shadow-lg sm:shadow-md ${
                    !formData.departure || !formData.destination || !formData.companions
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200 shadow-none'
                      : 'bg-gradient-to-r from-sky-500 to-orange-400 text-white hover:from-sky-600 hover:to-orange-500 active:scale-[0.98] border border-transparent'
                  }`}
                >
                  下一步，設定偏好細節
                  <ArrowLeft className="rotate-180" size={18} />
                </button>
                <p className="mt-2 text-center text-[12px] font-medium leading-5 text-slate-500">
                  {stepOneHint}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.99, y: 8 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.99, y: -8 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: 'easeOut' }}
            className="flex flex-col gap-6 sm:gap-8"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <div>
                <h3 className="text-xl font-black text-slate-900">補充偏好細節</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">這些是選填項目，用來把草稿調得更貼近你的旅程節奏。</p>
              </div>
              <button
                 onClick={handleSubmit}
                 className="text-sky-700 font-bold text-sm tracking-wide hover:text-sky-800 transition-colors bg-sky-50 px-5 py-2.5 rounded-full border border-sky-100 hover:bg-sky-100 active:scale-95 shrink-0 flex items-center gap-2"
               >
                 跳過直接生成
                 <Sparkles size={16} />
               </button>
            </div>

            <div className="flex flex-col gap-6 sm:gap-8 bg-white/80 backdrop-blur-xl border border-white/90 p-5 sm:p-8 rounded-[2rem] shadow-sm relative overflow-hidden">
              
              <div className="flex flex-col gap-3.5">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <Coffee size={16} className="text-amber-600" />
                  旅遊節奏
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {VIBE_OPTIONS.map(vibe => (
                    <MultiSelectPill
                      key={vibe}
                      label={vibe}
                      accentColor="amber"
                      selected={formData.vibes.includes(vibe)}
                      onClick={() => toggleArrayItem('vibes', vibe)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <Heart size={16} className="text-rose-500" />
                  興趣偏好
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {INTEREST_OPTIONS.map(interest => (
                    <MultiSelectPill
                      key={interest}
                      label={interest}
                      accentColor="rose"
                      selected={formData.interests.includes(interest)}
                      onClick={() => toggleArrayItem('interests', interest)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <Settings2 size={16} className="text-emerald-600" />
                  飲食禁忌
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {DIETARY_OPTIONS.map(diet => (
                    <MultiSelectPill
                      key={diet}
                      label={diet}
                      accentColor="indigo"
                      selected={formData.dietary.includes(diet)}
                      onClick={() => toggleArrayItem('dietary', diet)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <Car size={16} className="text-blue-500" />
                  交通方式
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {TRANSPORT_OPTIONS.map(trans => (
                    <MultiSelectPill
                      key={trans}
                      label={trans}
                      accentColor="blue"
                      selected={formData.transport.includes(trans)}
                      onClick={() => toggleArrayItem('transport', trans)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                <label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <DollarSign size={16} className="text-teal-600" />
                  預算等級 (單選)
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {BUDGET_OPTIONS.map(budget => (
                    <MultiSelectPill
                      key={budget}
                      label={budget}
                      accentColor="emerald"
                      selected={formData.budget === budget}
                      onClick={() => setFormData(p => ({ ...p, budget: p.budget === budget ? '' : budget }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Spacer so last field isn't hidden under fixed button on mobile */}
            <div className="sm:hidden w-full shrink-0" style={{ height: keyboardHeight > 0 ? "20px" : "120px" }} />

            {/* Submit buttons — fixed above keyboard on mobile, static on desktop */}
            <div
              className="fixed bottom-0 left-0 right-0 w-full z-50 sm:static sm:z-auto bg-gradient-to-t from-white via-white/95 to-transparent sm:bg-none backdrop-blur-sm sm:backdrop-blur-none"
              style={{
                paddingBottom: keyboardHeight > 0 
                  ? `${keyboardHeight + 16}px`
                  : 'max(16px, env(safe-area-inset-bottom, 16px))'
              }}
            >
              <div className="max-w-4xl mx-auto px-4 sm:px-0 pt-3 pb-2 sm:pt-2 sm:pb-0">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full">
                  <button
                    onClick={handleBack}
                    className="w-full sm:w-auto px-6 h-14 sm:h-16 rounded-2xl font-bold text-[15px] bg-white border border-slate-200 text-slate-600 hover:text-sky-700 hover:bg-sky-50 hover:border-sky-200 shadow-sm transition-colors active:scale-95 shrink-0"
                  >
                    返回
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 w-full h-14 sm:h-16 rounded-2xl font-black text-[15px] sm:text-base text-white flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 to-orange-400 hover:from-sky-600 hover:to-orange-500 shadow-md hover:shadow-lg active:scale-[0.98] transition-all tracking-wide border border-transparent"
                  >
                    生成行程
                    <Sparkles size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showDepDropdown && (
        <LocationPickerPopup 
          title="出發地"
          query={formData.departure}
          onClose={() => setShowDepDropdown(false)}
          onSelect={(dest) => {
            const displayValue = dest.searchAlias ? `${dest.place} (${dest.searchAlias})` : dest.place;
            setFormData(p => ({ ...p, departure: displayValue }));
            setShowDepDropdown(false);
          }}
        />
      )}

      {showDestDropdown && (
        <LocationPickerPopup 
          title="目的地"
          query={formData.destination}
          onClose={() => setShowDestDropdown(false)}
          onSelect={(dest) => {
            const displayValue = dest.searchAlias ? `${dest.place} (${dest.searchAlias})` : dest.place;
            setFormData(p => ({ ...p, destination: displayValue }));
            setShowDestDropdown(false);
          }}
        />
      )}
      </div>
    </div>
  );
}

