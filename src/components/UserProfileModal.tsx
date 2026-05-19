import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Loader2, Sparkles, User, MapPin, Users, Heart, Coffee, Car, DollarSign, Check } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { useAppStore } from '../store/useAppStore';
import { fetchUserPreferences, updateUserAiProfile } from '../lib/workflowApi';
import type { AiPreferenceProfile } from '../types/workflow';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VIBE_OPTIONS = ['特種兵急行軍', '悠閒漫遊', '網美打卡', '文化深度', '美食吃貨', '自然探索'];
const INTEREST_OPTIONS = ['歷史古蹟', '主題樂園', '美術館', '戶外運動', '購物血拼', '無敵海景'];
const DIETARY_OPTIONS = ['無特殊', '蛋奶素', '全素', '不吃牛', '海鮮過敏', '清真'];
const TRANSPORT_OPTIONS = ['大眾運輸', '自駕', '包車', '計程車', '步行優先'];
const BUDGET_OPTIONS = ['小資窮遊', '高CP值', '奢華度假', '預算無上限'];

function PillButton({ label, selected, onClick, accentColor = 'indigo' }: { label: string, selected: boolean, onClick: () => void, accentColor?: string }) {
  // Use a map for dynamic tailwind classes based on accentColor to ensure they compile correctly
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
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 overflow-hidden rounded-[20px] border px-3.5 py-2.5 text-[12px] font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 active:scale-[0.92] sm:rounded-[22px] sm:px-4 sm:text-[13px] ${
        selected 
          ? `${selectedClasses[accentColor] || selectedClasses.indigo} ring-2 ${ringClasses[accentColor] || ringClasses.indigo} ring-offset-1`
          : 'border-white/84 bg-white/82 text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.05)] hover:border-slate-200 hover:bg-slate-50 hover:shadow-[0_10px_20px_rgba(15,23,42,0.07)]'
      }`}
    >
      {selected && (
        <motion.div
           initial={{ scale: 0, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="flex-shrink-0"
        >
          <Check size={14} strokeWidth={3} />
        </motion.div>
      )}
      <span className="whitespace-nowrap">{label}</span>
    </motion.button>
  );
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { showToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState<AiPreferenceProfile>({
    departure: '',
    companions: '',
    vibes: [],
    interests: [],
    dietary: [],
    transport: [],
    budget: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await fetchUserPreferences();
      if (data?.ai_profile) {
        setProfile({
          departure: data.ai_profile.departure || '',
          companions: data.ai_profile.companions || '',
          vibes: Array.isArray(data.ai_profile.vibes) ? data.ai_profile.vibes : [],
          interests: Array.isArray(data.ai_profile.interests) ? data.ai_profile.interests : [],
          dietary: Array.isArray(data.ai_profile.dietary) ? data.ai_profile.dietary : [],
          transport: Array.isArray(data.ai_profile.transport) ? data.ai_profile.transport : [],
          budget: data.ai_profile.budget || '',
        });
      }
    } catch (err) {
      console.error(err);
      showToast('無法讀取偏好設定', 'info');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateUserAiProfile(profile);
      showToast('偏好設定已儲存！AI 將會為您量身打造行程。');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('儲存失敗，請稍後再試', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (key: keyof AiPreferenceProfile, item: string) => {
    setProfile(prev => {
      const arr = prev[key] as string[];
      if (arr.includes(item)) {
        return { ...prev, [key]: arr.filter(x => x !== item) };
      }
      return { ...prev, [key]: [...arr, item] };
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-modal"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: '100%', opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-modal-above flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[30px] border border-white/72 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,250,251,0.96),rgba(241,248,255,0.94))] shadow-[0_24px_60px_rgba(15,23,42,0.16)] md:inset-0 md:m-auto md:h-[85vh] md:max-w-2xl md:rounded-[32px]"
          >
            {/* Header */}
            <div className="z-10 flex shrink-0 items-center justify-between rounded-t-[30px] border-b border-white/78 bg-white/78 px-5 py-4 backdrop-blur-xl sm:px-7 sm:py-5 md:rounded-t-[32px]">
              <div className="flex items-center gap-4">
                <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-sky-500 to-orange-400 text-white shadow-[0_12px_26px_rgba(14,165,233,0.22)]">
                  <Sparkles size={20} className="relative z-10" />
                </div>
                <div>
                  <h2 className="flex items-center gap-2 whitespace-nowrap text-[22px] font-black tracking-[-0.04em] text-slate-800">
                    AI 專屬行程偏好
                  </h2>
                  <p className="mt-0.5 text-[12px] font-medium leading-[1.5] text-slate-500">預設保存，讓 AI 更懂你的旅行風格</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/90 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-600"
                aria-label="關閉"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-5 overflow-y-auto bg-gradient-to-b from-white/46 to-transparent p-4 sm:space-y-6 sm:p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500">
                  <Loader2 size={28} className="animate-spin text-indigo-500 text-opacity-80" />
                  <p className="text-sm font-medium tracking-wide">還原偏好設定中...</p>
                </div>
              ) : (
                <React.Fragment>
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
                    <div className="group flex flex-col gap-3 rounded-[24px] border border-white/86 bg-white/78 p-4 text-left shadow-[0_10px_22px_rgba(15,23,42,0.05)] transition-all focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/20 sm:p-5">
                      <Label className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        <MapPin size={16} className="text-indigo-500 group-focus-within:scale-110 transition-transform" /> 通常出發地
                      </Label>
                      <Input 
                        placeholder="例如：TPE 桃園機場、高雄" 
                        value={profile.departure}
                        onChange={(e) => setProfile(p => ({ ...p, departure: e.target.value }))}
                        className="h-11 rounded-none border-0 bg-slate-50/40 px-0 !text-[14px] font-medium !text-slate-800 placeholder:text-slate-400 shadow-inner focus:bg-white focus:ring-0 focus-visible:ring-0"
                      />
                    </div>
                    
                    <div className="group flex flex-col gap-3 rounded-[24px] border border-white/86 bg-white/78 p-4 text-left shadow-[0_10px_22px_rgba(15,23,42,0.05)] transition-all focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-500/20 sm:p-5">
                      <Label className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        <Users size={16} className="text-rose-500 group-focus-within:scale-110 transition-transform" /> 同行者類型
                      </Label>
                      <Input 
                        placeholder="例如：情侶、親子、朋友群" 
                        value={profile.companions}
                        onChange={(e) => setProfile(p => ({ ...p, companions: e.target.value }))}
                        className="h-11 rounded-none border-0 bg-slate-50/40 px-0 !text-[14px] font-medium !text-slate-800 placeholder:text-slate-400 shadow-inner focus:bg-white focus:ring-0 focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  {/* Vibes */}
                  <div className="space-y-4 rounded-[24px] border border-white/86 bg-white/78 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)] sm:p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2.5 text-[14px] font-black tracking-[-0.02em] text-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-100 bg-amber-50 text-amber-500">
                          <Sparkles size={16} />
                        </div>
                        旅遊節奏 (Vibes)
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">複選</span>
                    </div>
                    <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-1 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
                      {VIBE_OPTIONS.map(vibe => (
                        <div className="shrink-0" key={vibe}>
                          <PillButton
                            label={vibe}
                            accentColor="amber"
                            selected={profile.vibes.includes(vibe)}
                            onClick={() => toggleArrayItem('vibes', vibe)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interests */}
                  <div className="space-y-4 rounded-[24px] border border-white/86 bg-white/78 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)] sm:p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2.5 text-[14px] font-black tracking-[-0.02em] text-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-500">
                          <Heart size={16} />
                        </div>
                        旅遊興趣
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">複選</span>
                    </div>
                    <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-1 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
                      {INTEREST_OPTIONS.map(opt => (
                        <div className="shrink-0" key={opt}>
                          <PillButton
                            label={opt}
                            accentColor="rose"
                            selected={profile.interests.includes(opt)}
                            onClick={() => toggleArrayItem('interests', opt)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transport */}
                  <div className="space-y-4 rounded-[24px] border border-white/86 bg-white/78 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)] sm:p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2.5 text-[14px] font-black tracking-[-0.02em] text-slate-800">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-500">
                          <Car size={16} />
                        </div>
                        交通方式偏好
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">複選</span>
                    </div>
                    <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-1 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
                      {TRANSPORT_OPTIONS.map(opt => (
                        <div className="shrink-0" key={opt}>
                          <PillButton
                            label={opt}
                            accentColor="blue"
                            selected={profile.transport.includes(opt)}
                            onClick={() => toggleArrayItem('transport', opt)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Budget & Diet Row */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-4">
                    {/* Budget */}
                    <div className="space-y-4 rounded-[24px] border border-white/86 bg-white/78 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)] sm:p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2.5 text-[14px] font-black tracking-[-0.02em] text-slate-800">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600">
                            <DollarSign size={16} />
                          </div>
                          預算等級
                        </h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">單選</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        {BUDGET_OPTIONS.map(opt => (
                          <PillButton
                            key={opt}
                            label={opt}
                            accentColor="emerald"
                            selected={profile.budget === opt}
                            onClick={() => setProfile(p => ({ ...p, budget: p.budget === opt ? '' : opt }))}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Diet */}
                    <div className="space-y-4 rounded-[24px] border border-white/86 bg-white/78 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)] sm:p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2.5 text-[14px] font-black tracking-[-0.02em] text-slate-800">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-500">
                            <Coffee size={16} />
                          </div>
                          飲食禁忌
                        </h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">複選</span>
                      </div>
                      <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-1 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
                        {DIETARY_OPTIONS.map(opt => (
                          <div className="shrink-0" key={opt}>
                            <PillButton
                              label={opt}
                              accentColor="indigo"
                              selected={profile.dietary.includes(opt)}
                              onClick={() => toggleArrayItem('dietary', opt)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Padding to allow scrolling past the button */}
                  <div className="h-4"></div>
                </React.Fragment>
              )}
            </div>

            {/* Footer */}
            <div className="z-20 shrink-0 border-t border-white/78 bg-white/84 px-5 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] pt-4 shadow-[0_-10px_24px_rgba(15,23,42,0.04)] sm:px-6 sm:pb-5 sm:pt-4 md:rounded-b-[32px]">
              <Button 
                onClick={handleSave} 
                className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-sky-500 to-orange-400 py-4 text-[14px] font-black tracking-[0.08em] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_10px_22px_rgba(14,165,233,0.24)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:from-sky-600 hover:to-orange-500 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_26px_rgba(14,165,233,0.30)] active:scale-[0.92] sm:text-[15px] whitespace-nowrap"
                disabled={saving || loading}
              >
                <div className="absolute inset-0 bg-white/20 -translate-x-[150%] skew-x-[-15deg] group-hover:translate-x-[150%] transition-transform duration-700 ease-out"></div>
                {saving ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Save size={20} className="relative z-10" />
                )}
                <span className="relative z-10">{saving ? '儲存中...' : '儲存偏好設定'}</span>
              </Button>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}

