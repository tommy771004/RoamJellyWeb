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
      className={`relative px-3.5 sm:px-4 py-2.5 rounded-[20px] sm:rounded-[24px] text-[13px] sm:text-[14px] font-bold transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 active:scale-[0.92] flex items-center justify-center gap-2 border overflow-hidden ${
        selected 
          ? `${selectedClasses[accentColor] || selectedClasses.indigo} ring-2 ${ringClasses[accentColor] || ringClasses.indigo} ring-offset-1`
          : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
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
            className="fixed bottom-0 left-0 right-0 z-modal-above w-full max-h-[90vh] bg-[#f8fafc] rounded-t-[32px] shadow-2xl flex flex-col md:inset-0 md:m-auto md:max-w-2xl md:h-[85vh] md:rounded-[32px] border border-slate-200/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 bg-white/80 backdrop-blur-xl shrink-0 z-10 rounded-t-[32px] border-b border-slate-100/80">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                  <Sparkles size={22} className="relative z-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 whitespace-nowrap">
                    AI 專屬行程偏好
                  </h2>
                  <p className="text-[13px] font-medium text-slate-500 mt-0.5">預設保存，讓 AI 更懂你的旅行風格</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                aria-label="關閉"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 sm:space-y-8 bg-gradient-to-b from-white/50 to-transparent">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500">
                  <Loader2 size={28} className="animate-spin text-indigo-500 text-opacity-80" />
                  <p className="text-sm font-medium tracking-wide">還原偏好設定中...</p>
                </div>
              ) : (
                <React.Fragment>
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div className="bg-white border text-left border-slate-200 p-5 rounded-[20px] shadow-sm flex flex-col gap-3 group focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300 transition-all">
                      <Label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2 mb-1">
                        <MapPin size={16} className="text-indigo-500 group-focus-within:scale-110 transition-transform" /> 通常出發地
                      </Label>
                      <Input 
                        placeholder="例如：TPE 桃園機場、高雄" 
                        value={profile.departure}
                        onChange={(e) => setProfile(p => ({ ...p, departure: e.target.value }))}
                        className="bg-slate-50/50 border-0 shadow-inner focus:bg-white focus:ring-0 focus-visible:ring-0 h-11 px-0 !text-slate-800 text-[15px] placeholder:text-slate-400 font-medium rounded-none"
                      />
                    </div>
                    
                    <div className="bg-white border text-left border-slate-200 p-5 rounded-[20px] shadow-sm flex flex-col gap-3 group focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-300 transition-all">
                      <Label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2 mb-1">
                        <Users size={16} className="text-rose-500 group-focus-within:scale-110 transition-transform" /> 同行者類型
                      </Label>
                      <Input 
                        placeholder="例如：情侶、親子、朋友群" 
                        value={profile.companions}
                        onChange={(e) => setProfile(p => ({ ...p, companions: e.target.value }))}
                        className="bg-slate-50/50 border-0 shadow-inner focus:bg-white focus:ring-0 focus-visible:ring-0 h-11 px-0 !text-slate-800 text-[15px] placeholder:text-slate-400 font-medium rounded-none"
                      />
                    </div>
                  </div>

                  {/* Vibes */}
                  <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-[24px] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                          <Sparkles size={16} />
                        </div>
                        旅遊節奏 (Vibes)
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">複選</span>
                    </div>
                    <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-2 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
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
                  <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-[24px] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
                          <Heart size={16} />
                        </div>
                        旅遊興趣
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">複選</span>
                    </div>
                    <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-2 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
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
                  <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-[24px] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                          <Car size={16} />
                        </div>
                        交通方式偏好
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">複選</span>
                    </div>
                    <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-2 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {/* Budget */}
                    <div className="bg-white border border-slate-200 p-5 rounded-[24px] shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                            <DollarSign size={16} />
                          </div>
                          預算等級
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">單選</span>
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
                    <div className="bg-white border border-slate-200 p-5 rounded-[24px] shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100">
                            <Coffee size={16} />
                          </div>
                          飲食禁忌
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">複選</span>
                      </div>
                      <div className="flex overflow-x-auto hide-scrollbar scrollbar-hide gap-2.5 pt-1 pb-2 -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0 sm:pb-0">
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
            <div className="p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] sm:pb-5 border-t border-slate-100 bg-white md:rounded-b-[32px] shrink-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] px-6">
              <Button 
                onClick={handleSave} 
                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full py-4 font-bold shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.92] hover:-translate-y-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center gap-2 text-[15px] sm:text-base tracking-wide overflow-hidden relative group whitespace-nowrap"
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

