import React, { useState } from 'react';
import { MapPin, Minus, Plus, Settings2, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import GlassCard from './GlassCard';

const COMPANION_OPTIONS = [
  { id: 'solo', label: '獨行俠', emoji: '🚶' },
  { id: 'couple', label: '浪漫雙人', emoji: '💑' },
  { id: 'family', label: '親子育兒', emoji: '👨‍👩‍👧‍👦' },
  { id: 'elderly', label: '帶長輩', emoji: 's🧓' },
  { id: 'friends', label: '三五好友', emoji: '🍻' },
];

const VIBE_OPTIONS = ['特種兵', '睡到自然醒', '隨興漫遊', '在地深度', '網美打卡'];
const INTEREST_OPTIONS = ['大自然', '歷史文化', '購物血拼', '主題樂園', '在地美食', '戶外刺激'];
const DIETARY_OPTIONS = ['無限制', '純素', '蛋奶素', '無麩質', '不吃海鮮'];

export interface AiFormData {
  destination: string;
  days: number;
  companions: string;
  vibes: string[];
  interests: string[];
  dietary: string[];
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

export default function AiForm({ onSubmit }: { onSubmit: (data: AiFormData) => void }) {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<AiFormData>({
    destination: '',
    days: 5,
    companions: '',
    vibes: [],
    interests: [],
    dietary: []
  });

  const handleNext = () => {
    if (formData.destination && formData.companions) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const toggleArrayItem = (field: 'vibes' | 'interests' | 'dietary', item: string) => {
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
    console.log('Final Form Data:', JSON.stringify(formData, null, 2));
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      onSubmit(formData);
    }, 3000);
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full p-8 animate-in fade-in duration-500 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 bg-fuchsia-400/30 rounded-full blur-[60px] animate-pulse" />
        </div>
        
        <GlassCard className="!rounded-full p-8 mb-8 relative z-10 flex items-center justify-center">
          <Loader2 size={48} className="text-fuchsia-500 animate-spin" />
        </GlassCard>
        
        <h2 className="text-2xl font-black bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent mb-4 text-center z-10">
          AI 正在為您客製專屬行程...
        </h2>
        <p className="text-slate-600 font-medium text-center z-10 animate-pulse">
          正在為您篩選 {formData.destination} 的完美景點
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full p-6 animate-in slide-in-from-bottom-4 duration-500 pb-32 overflow-y-auto">
      {step === 1 && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
          <div>
            <h2 className="text-[28px] font-black text-slate-800 mb-2 font-serif tracking-tight">想去哪裡？</h2>
            <p className="text-slate-500 text-[14px]">告訴我們您的夢想目的地與天數。</p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="font-bold text-slate-700 text-[15px]">目的地</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="例如：東京、京都、曼谷" 
                value={formData.destination}
                onChange={e => setFormData(p => ({ ...p, destination: e.target.value }))}
                className="w-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl py-4 pl-12 pr-6 text-[16px] text-slate-800 font-bold placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-fuchsia-400/50 shadow-sm transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="font-bold text-slate-700 text-[15px]">預計天數</label>
            <div className="flex items-center gap-6 bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl p-4 w-fit shadow-sm">
              <button 
                onClick={() => setFormData(p => ({ ...p, days: Math.max(1, p.days - 1) }))}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-600 hover:text-fuchsia-500 hover:bg-fuchsia-50 active:scale-95 transition-all"
              >
                <Minus size={20} />
              </button>
              <span className="text-[20px] font-black w-12 text-center text-slate-800">{formData.days} 天</span>
              <button 
                onClick={() => setFormData(p => ({ ...p, days: Math.max(1, p.days + 1) }))}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-600 hover:text-fuchsia-500 hover:bg-fuchsia-50 active:scale-95 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="font-bold text-slate-700 text-[15px]">與誰同行？</label>
            <div className="grid grid-cols-2 gap-3">
              {COMPANION_OPTIONS.map(opt => {
                const isSelected = formData.companions === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFormData(p => ({ ...p, companions: opt.id }))}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-300 ${
                      isSelected 
                        ? 'bg-white/80 border border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.3)] scale-[1.02]' 
                        : 'bg-white/40 border border-white/60 hover:bg-white/60 shadow-sm'
                    } backdrop-blur-xl`}
                  >
                    <span className="text-3xl filter drop-shadow-sm">{opt.emoji}</span>
                    <span className={`text-[14px] font-bold ${isSelected ? 'text-fuchsia-600' : 'text-slate-600'}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={!formData.destination || !formData.companions}
            className={`mt-4 py-4 rounded-full font-bold text-[16px] text-white flex items-center justify-center gap-2 transition-all ${
              !formData.destination || !formData.companions
                ? 'bg-slate-300 opacity-60 cursor-not-allowed'
                : 'bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-[0_8px_20px_rgba(217,70,239,0.4)] active:scale-95 hover:shadow-[0_12px_25px_rgba(217,70,239,0.5)]'
            }`}
          >
            下一步，微調細節
            <Settings2 size={18} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-sm text-slate-600 hover:bg-white/80 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-[24px] font-black text-slate-800 font-serif tracking-tight">靈魂細節選填</h2>
              <p className="text-slate-500 text-[13px]">自由多選，也可直接跳過</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="font-bold text-slate-700 text-[15px]">旅遊節奏</label>
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

          <div className="flex flex-col gap-3">
            <label className="font-bold text-slate-700 text-[15px]">興趣偏好</label>
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

          <div className="flex flex-col gap-3">
            <label className="font-bold text-slate-700 text-[15px]">飲食禁忌</label>
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

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              className="flex-1 py-4 rounded-full font-bold text-[15px] bg-white/50 hover:bg-white/80 text-slate-600 border border-white/60 shadow-sm backdrop-blur-md transition-all active:scale-95 text-center"
            >
              跳過，直接生成
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-4 rounded-full font-bold text-[15px] text-white flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-500 to-purple-600 shadow-[0_8px_20px_rgba(217,70,239,0.4)] active:scale-95 hover:shadow-[0_12px_25px_rgba(217,70,239,0.5)] transition-all"
            >
              魔法生成
              <Sparkles size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
