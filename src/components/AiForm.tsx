import React, { useState } from 'react';
import { MapPin, Minus, Plus, Settings2, Sparkles, ArrowLeft, Loader2, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GlassCard from './GlassCard';
import { TRAVEL_GUIDE_DESTINATIONS, TravelGuideDestination } from '../data/travelGuideDestinations';
import { LocationPickerPopup } from './LocationPickerPopup';

const COMPANION_OPTIONS = [
  { id: 'solo', label: '獨自行走', emoji: '🚶' },
  { id: 'couple', label: '浪漫雙人', emoji: '💑' },
  { id: 'family', label: '親子育兒', emoji: '👨‍👩‍👧‍👦' },
  { id: 'elderly', label: '帶長輩', emoji: '👵' },
  { id: 'friends', label: '三五好友', emoji: '🍻' },
  { id: 'pets', label: '毛小孩', emoji: '🐕' },
];

const VIBE_OPTIONS = ['特種兵急行軍', '睡到自然醒', '隨興漫遊', '在地深度文化', '網美打卡秘境', '奢華極致享受', '文青慢活步調', '夜生活狂歡'];
const INTEREST_OPTIONS = ['大自然與絕景', '歷史文化遺產', '購物血拼逛街', '主題遊樂園', '在地特色美食', '戶外刺激冒險', '藝術與博物館', '溫泉桑拿放鬆', '海島水上活動', '特色網美咖啡', '尋訪動漫朝聖'];
const DIETARY_OPTIONS = ['無限制', '純素食', '蛋奶素', '海鮮素', '無麩質', '不吃牛', '不吃海鮮', '清真認證'];
const TRANSPORT_OPTIONS = ['大眾運輸', '自駕租車', '包車導覽', '徒步與腳踏車'];
const BUDGET_OPTIONS = ['背包窮遊', '精打細算小資', '舒適無虞', '奢華尊榮'];

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

export const MultiSelectPill: React.FC<{ 
  label: string; 
  selected: boolean; 
  onClick: () => void;
}> = ({ label, selected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-[20px] text-[13px] sm:text-[15px] font-bold transition-all active:scale-95 duration-300 relative overflow-hidden ${
        selected 
          ? 'bg-fuchsia-500 text-white shadow-[0_4px_20px_rgba(217,70,239,0.4)] border border-fuchsia-400 -translate-y-0.5' 
          : 'bg-white/60 backdrop-blur-md text-slate-600 hover:bg-white hover:text-fuchsia-600 border border-white/80 shadow-sm hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {selected && <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />}
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
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
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
    onSubmit(formData);
  };

  return (
    <div className="relative flex flex-col h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* Immersive Background for AI Form */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden fixed">
         <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-fuchsia-300/20 blur-[120px] rounded-full mix-blend-multiply animate-pulse" style={{ animationDuration: '4s' }} />
         <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-indigo-300/20 blur-[120px] rounded-full mix-blend-multiply animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
         <div className="absolute top-[30%] left-[20%] w-[50%] h-[50%] bg-pink-200/20 blur-[100px] rounded-full mix-blend-multiply animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
         <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full p-6 sm:p-8 md:p-10 animate-in slide-in-from-bottom-12 duration-700 pb-32 max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8 sm:mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 leading-none tracking-tight mb-3">AI 旅程規劃</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
              <p className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]"> Powered by AI Assistant</p>
            </div>
          </div>
          {onCancel && (
            <button 
              onClick={onCancel}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/60 backdrop-blur-xl border border-white flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white shadow-sm transition-all hover:scale-105 active:scale-95"
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
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12"
          >
            <div className="space-y-8 sm:space-y-10">
            <div className="flex flex-col gap-3 sm:gap-4">
              <label className="text-[11px] sm:text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2 shadow-sm text-shadow-sm">出發地</label>
              <button 
                onClick={() => setShowDepDropdown(true)}
                className="w-full text-left bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[28px] sm:rounded-[32px] py-5 sm:py-6 pl-14 pr-6 text-lg sm:text-xl text-slate-800 font-black focus:outline-none focus:ring-4 focus:ring-fuchsia-200 shadow-xl shadow-slate-200/50 hover:shadow-fuchsia-500/10 hover:-translate-y-1 hover:bg-white/80 transition-all duration-300 relative group"
              >
                <MapPin className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-fuchsia-500 transition-colors duration-300" size={22} />
                {formData.departure ? formData.departure : <span className="text-slate-400 font-semibold">例如：台北、高雄...</span>}
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4">
              <label className="text-[11px] sm:text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2 shadow-sm text-shadow-sm">目的地</label>
              <button 
                onClick={() => setShowDestDropdown(true)}
                className="w-full text-left bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[28px] sm:rounded-[32px] py-5 sm:py-6 pl-14 pr-6 text-lg sm:text-xl text-slate-800 font-black focus:outline-none focus:ring-4 focus:ring-fuchsia-200 shadow-xl shadow-slate-200/50 hover:shadow-fuchsia-500/10 hover:-translate-y-1 hover:bg-white/80 transition-all duration-300 relative group"
              >
                <MapPin className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-fuchsia-500 transition-colors duration-300" size={22} />
                {formData.destination ? formData.destination : <span className="text-slate-400 font-semibold">例如：日本、曼谷...</span>}
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4">
              <label className="text-[11px] sm:text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2 shadow-sm text-shadow-sm">預計天數</label>
              <div className="flex items-center gap-6 sm:gap-10 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 w-full shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-fuchsia-500/10 hover:-translate-y-1 hover:bg-white/80">
                <button 
                  onClick={() => setFormData(p => ({ ...p, days: Math.max(1, p.days - 1) }))}
                  className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-white flex items-center justify-center shadow-md text-slate-600 hover:text-fuchsia-500 hover:bg-fuchsia-50 active:scale-95 transition-all"
                >
                  <Minus size={20} className="sm:w-6 sm:h-6" strokeWidth={3} />
                </button>
                <div className="flex-1 flex items-baseline justify-center gap-2">
                  <span className="text-4xl sm:text-[44px] font-black text-slate-800 tabular-nums leading-none tracking-tighter">{formData.days}</span>
                  <span className="text-slate-500 font-black text-xs sm:text-sm uppercase tracking-widest">天之旅</span>
                </div>
                <button 
                  onClick={() => setFormData(p => ({ ...p, days: Math.min(30, p.days + 1) }))}
                  className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-white flex items-center justify-center shadow-md text-slate-600 hover:text-fuchsia-500 hover:bg-fuchsia-50 active:scale-95 transition-all"
                >
                  <Plus size={20} className="sm:w-6 sm:h-6" strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <label className="text-[11px] sm:text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2 shadow-sm text-shadow-sm">與誰同行？</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {COMPANION_OPTIONS.map(opt => {
                const isSelected = formData.companions === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFormData(p => ({ ...p, companions: opt.id }))}
                    className={`flex flex-col items-center justify-center gap-3 p-6 sm:p-8 rounded-[28px] transition-all duration-300 border-2 group relative overflow-hidden backdrop-blur-2xl ${
                      isSelected 
                        ? 'bg-white shadow-[0_8px_30px_rgba(232,121,249,0.3)] border-fuchsia-400 scale-[1.02] z-10' 
                        : 'bg-white/50 border-white/80 hover:bg-white/80 shadow-md hover:shadow-xl hover:border-fuchsia-200 hover:-translate-y-1'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-100/50 to-transparent pointer-events-none" />
                    )}
                    <span className="text-[40px] sm:text-[48px] filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300 origin-bottom">{opt.emoji}</span>
                    <span className={`text-xs sm:text-sm font-black uppercase tracking-widest relative z-10 ${isSelected ? 'text-fuchsia-600' : 'text-slate-600'}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 pt-4 sm:pt-12 sticky bottom-6 sm:static z-[100]">
            <button
              onClick={handleNext}
              disabled={!formData.departure || !formData.destination || !formData.companions}
              className={`w-full py-5 sm:py-6 rounded-[28px] sm:rounded-[32px] font-black text-sm sm:text-base uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_-10px_40px_rgba(255,255,255,0.8)] sm:shadow-none ${
                !formData.departure || !formData.destination || !formData.companions
                  ? 'bg-white/90 backdrop-blur-xl text-slate-400 border border-white opacity-90 cursor-not-allowed'
                  : 'bg-slate-900 border border-white/20 text-white shadow-2xl shadow-slate-900/40 hover:shadow-fuchsia-500/20 active:scale-95 hover:bg-slate-800 hover:-translate-y-1'
              }`}
            >
              下一步，微調細節
              <ArrowLeft className="rotate-180" size={20} />
            </button>
          </div>
        </motion.div>
      )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-10"
          >
            <div className="flex justify-end mb-[-20px] relative z-20">
             <button
               onClick={handleSubmit}
               className="text-fuchsia-600 font-bold text-xs sm:text-sm tracking-widest hover:text-fuchsia-700 transition-colors bg-white/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-fuchsia-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95"
             >
               跳過細節，直接交給 AI ✨
             </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 bg-white/40 backdrop-blur-xl border border-white/60 p-6 sm:p-10 rounded-[32px] sm:rounded-[2.5rem] shadow-xl shadow-slate-200/40 relative overflow-hidden">
            <div className="flex flex-col gap-4 sm:gap-5">
              <label className="text-[11px] sm:text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2 shadow-sm text-shadow-sm">旅遊節奏</label>
              <div className="flex flex-wrap gap-2.5">
                {VIBE_OPTIONS.map(vibe => (
                  <MultiSelectPill
                    key={vibe}
                    label={vibe}
                    selected={formData.vibes.includes(vibe)}
                    onClick={() => toggleArrayItem('vibes', vibe)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:gap-5">
              <label className="text-[11px] sm:text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2 shadow-sm text-shadow-sm">興趣偏好</label>
              <div className="flex flex-wrap gap-2.5">
                {INTEREST_OPTIONS.map(interest => (
                  <MultiSelectPill
                    key={interest}
                    label={interest}
                    selected={formData.interests.includes(interest)}
                    onClick={() => toggleArrayItem('interests', interest)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:gap-5">
              <label className="text-[11px] sm:text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2 shadow-sm text-shadow-sm">飲食禁忌</label>
              <div className="flex flex-wrap gap-2.5">
                {DIETARY_OPTIONS.map(diet => (
                  <MultiSelectPill
                    key={diet}
                    label={diet}
                    selected={formData.dietary.includes(diet)}
                    onClick={() => toggleArrayItem('dietary', diet)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:gap-5">
              <label className="text-[11px] sm:text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2 shadow-sm text-shadow-sm">交通方式</label>
              <div className="flex flex-wrap gap-2.5">
                {TRANSPORT_OPTIONS.map(trans => (
                  <MultiSelectPill
                    key={trans}
                    label={trans}
                    selected={formData.transport.includes(trans)}
                    onClick={() => toggleArrayItem('transport', trans)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:gap-5 sm:col-span-2">
              <label className="text-[11px] sm:text-xs font-black uppercase text-slate-500 tracking-[0.2em] px-2 shadow-sm text-shadow-sm">預算等級</label>
              <div className="flex flex-wrap gap-2.5">
                {BUDGET_OPTIONS.map(budget => (
                  <MultiSelectPill
                    key={budget}
                    label={budget}
                    selected={formData.budget === budget}
                    onClick={() => setFormData(p => ({ ...p, budget: p.budget === budget ? '' : budget }))}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 sm:pt-8 w-full sticky sm:static bottom-6 z-[100]">
            <button
              onClick={handleBack}
              className="w-full sm:w-1/3 py-5 sm:py-6 rounded-[28px] sm:rounded-[32px] font-black text-xs sm:text-sm uppercase tracking-widest bg-white/90 backdrop-blur-xl border border-white text-slate-500 hover:text-slate-700 hover:bg-white shadow-[0_-10px_40px_rgba(255,255,255,0.8)] sm:shadow-none hover:shadow-md transition-all active:scale-95"
            >
              返回修改
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 w-full py-5 sm:py-6 rounded-[28px] sm:rounded-[32px] font-black text-sm sm:text-base text-white flex items-center justify-center gap-3 bg-gradient-to-r from-pink-500 via-fuchsia-600 to-indigo-600 shadow-2xl shadow-pink-500/30 hover:shadow-pink-500/50 hover:bg-gradient-to-r hover:from-pink-400 hover:via-fuchsia-500 hover:to-indigo-500 active:scale-95 transition-all uppercase tracking-[0.2em] hover:-translate-y-1 border border-white/20"
            >
              魔法生成專屬行程
              <Sparkles size={20} className="sm:w-6 sm:h-6" />
            </button>
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
