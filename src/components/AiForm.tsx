import React, { useState } from 'react';
import { MapPin, Minus, Plus, Settings2, Sparkles, ArrowLeft, Loader2, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GlassCard from './GlassCard';
import { TRAVEL_GUIDE_DESTINATIONS, TravelGuideDestination } from '../data/travelGuideDestinations';
import { LocationPickerPopup } from './LocationPickerPopup';

const COMPANION_OPTIONS = [
  { id: 'solo', label: '獨行俠', emoji: '🚶' },
  { id: 'couple', label: '浪漫雙人', emoji: '💑' },
  { id: 'family', label: '親子育兒', emoji: '👨‍👩‍👧‍👦' },
  { id: 'elderly', label: '帶長輩', emoji: '👵' },
  { id: 'friends', label: '三五好友', emoji: '🍻' },
];

const VIBE_OPTIONS = ['特種兵', '睡到自然醒', '隨興漫遊', '在地深度', '網美打卡'];
const INTEREST_OPTIONS = ['大自然', '歷史文化', '購物血拼', '主題樂園', '在地美食', '戶外刺激'];
const DIETARY_OPTIONS = ['無限制', '純素', '蛋奶素', '無麩質', '不吃海鮮'];
const TRANSPORT_OPTIONS = ['大眾運輸', '自駕', '包車', '徒步為主'];
const BUDGET_OPTIONS = ['窮遊', '小資', '舒適', '奢華'];

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
      className={`px-4 py-2 rounded-full text-[14px] font-bold transition-all active:scale-95 ${
        selected 
          ? 'bg-pink-400 text-white shadow-[0_0_15px_rgba(244,114,182,0.5)] border border-pink-300' 
          : 'bg-white/40 backdrop-blur-md text-slate-700 hover:bg-white/60 border border-white/60 shadow-sm'
      }`}
    >
      {label}
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
    <div className="flex flex-col h-full w-full p-6 animate-in slide-in-from-bottom-4 duration-500 pb-32 overflow-y-auto max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="text-[32px] sm:text-[40px] font-black text-slate-800 leading-none tracking-tight mb-3">AI 旅程規劃</h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"> Powered by AI Assistant</p>
          </div>
        </div>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="w-12 h-12 rounded-full bg-white/50 backdrop-blur-xl border border-white flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-white shadow-sm transition-all"
          >
            <ArrowLeft size={24} />
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
            className="grid grid-cols-1 md:grid-cols-2 gap-10"
          >
            <div className="space-y-10">
            <div className="flex flex-col gap-4">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">出發地</label>
              <button 
                onClick={() => setShowDepDropdown(true)}
                className="w-full text-left bg-white/40 backdrop-blur-xl border border-white/60 rounded-[28px] py-6 pl-14 pr-6 text-lg text-slate-800 font-black focus:outline-none focus:ring-4 focus:ring-pink-100 shadow-xl shadow-slate-100/50 transition-all relative group"
              >
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-pink-500 transition-colors" size={20} />
                {formData.departure ? formData.departure : <span className="text-slate-300">例如：台北、高雄...</span>}
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">目的地</label>
              <button 
                onClick={() => setShowDestDropdown(true)}
                className="w-full text-left bg-white/40 backdrop-blur-xl border border-white/60 rounded-[28px] py-6 pl-14 pr-6 text-lg text-slate-800 font-black focus:outline-none focus:ring-4 focus:ring-pink-100 shadow-xl shadow-slate-100/50 transition-all relative group"
              >
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-pink-500 transition-colors" size={20} />
                {formData.destination ? formData.destination : <span className="text-slate-300">例如：日本、曼谷...</span>}
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">預計天數</label>
              <div className="flex items-center gap-10 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-6 w-full shadow-xl shadow-slate-100/50">
                <button 
                  onClick={() => setFormData(p => ({ ...p, days: Math.max(1, p.days - 1) }))}
                  className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg text-slate-600 hover:text-pink-500 hover:bg-pink-50 active:scale-95 transition-all"
                >
                  <Minus size={24} strokeWidth={3} />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-[32px] font-black text-slate-800 tabular-nums">{formData.days}</span>
                  <span className="text-slate-400 font-black text-xs uppercase tracking-widest ml-2">天之旅</span>
                </div>
                <button 
                  onClick={() => setFormData(p => ({ ...p, days: Math.min(30, p.days + 1) }))}
                  className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg text-slate-600 hover:text-pink-500 hover:bg-pink-50 active:scale-95 transition-all"
                >
                  <Plus size={24} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">與誰同行？</label>
            <div className="grid grid-cols-2 gap-4">
              {COMPANION_OPTIONS.map(opt => {
                const isSelected = formData.companions === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFormData(p => ({ ...p, companions: opt.id }))}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[32px] transition-all duration-500 border-2 group ${
                      isSelected 
                        ? 'bg-white shadow-[0_0_15px_rgba(244,114,182,0.4)] border-pink-400 scale-[1.02] z-10' 
                        : 'bg-white/40 border-transparent hover:bg-white/60 shadow-sm'
                    } backdrop-blur-xl`}
                  >
                    <span className="text-4xl filter drop-shadow-sm group-hover:scale-110 transition-transform">{opt.emoji}</span>
                    <span className={`text-[13px] font-black uppercase tracking-widest ${isSelected ? 'text-pink-600' : 'text-slate-500'}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 pt-6">
            <button
              onClick={handleNext}
              disabled={!formData.departure || !formData.destination || !formData.companions}
              className={`w-full py-6 rounded-full font-black text-sm uppercase tracking-[0.2em] text-white flex items-center justify-center gap-3 transition-all ${
                !formData.departure || !formData.destination || !formData.companions
                  ? 'bg-slate-200 opacity-60 cursor-not-allowed'
                  : 'bg-slate-800 shadow-2xl shadow-slate-300 active:scale-95 hover:bg-slate-900'
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
            <div className="flex justify-end mb-[-20px]">
             <button
               onClick={handleSubmit}
               className="text-pink-500 font-bold text-sm tracking-widest hover:text-pink-600 transition-colors bg-white/50 px-4 py-2 rounded-full border border-pink-100 shadow-sm"
             >
               跳過細節，直接交給 AI 🚀
             </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div className="flex flex-col gap-5">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">旅遊節奏</label>
              <div className="flex flex-wrap gap-2">
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

            <div className="flex flex-col gap-5">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">興趣偏好</label>
              <div className="flex flex-wrap gap-2">
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

            <div className="flex flex-col gap-5">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">飲食禁忌</label>
              <div className="flex flex-wrap gap-2">
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

            <div className="flex flex-col gap-5">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">交通方式</label>
              <div className="flex flex-wrap gap-2">
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

            <div className="flex flex-col gap-5">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">預算等級</label>
              <div className="flex flex-wrap gap-2">
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

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleBack}
              className="w-full sm:w-auto px-10 py-5 rounded-full font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all active:scale-95"
            >
              返回修改
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 w-full py-6 rounded-full font-black text-sm text-white flex items-center justify-center gap-3 bg-gradient-to-r from-pink-500 via-fuchsia-600 to-indigo-600 shadow-2xl shadow-pink-200/50 active:scale-95 transition-all uppercase tracking-[0.2em]"
            >
              魔法生成專屬行程
              <Sparkles size={20} />
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
  );
}
