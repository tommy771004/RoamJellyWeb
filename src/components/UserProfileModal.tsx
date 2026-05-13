import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Loader2, Sparkles, User, MapPin, Users, Heart, Coffee, Car, DollarSign } from 'lucide-react';
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

function PillButton({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-[13px] sm:text-sm font-bold transition-all active:scale-[0.98] duration-200 flex items-center justify-center ${
        selected 
          ? 'bg-slate-900 text-white shadow-md border border-transparent' 
          : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
      }`}
    >
      {label}
    </button>
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-slate-50 rounded-t-[32px] shadow-2xl z-50 flex flex-col md:inset-0 md:m-auto md:max-w-2xl md:h-[85vh] md:rounded-[32px] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 bg-white shrink-0 z-10 rounded-t-[32px] shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">AI 專屬行程偏好</h2>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">預設保存，讓 AI 更懂你的旅行風格</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors"
                aria-label="關閉"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
                  <Loader2 size={24} className="animate-spin" />
                  <p className="text-sm font-medium tracking-wide">載入中...</p>
                </div>
              ) : (
                <React.Fragment>
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
                      <Label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-1">
                        <MapPin size={16} className="text-blue-500" /> 通常出發地
                      </Label>
                      <Input 
                        placeholder="例如：TPE 桃園機場、高雄" 
                        value={profile.departure}
                        onChange={(e) => setProfile(p => ({ ...p, departure: e.target.value }))}
                        className="bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-blue-100 h-12 rounded-xl text-[15px]"
                      />
                    </div>
                    
                    <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
                      <Label className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-1">
                        <Users size={16} className="text-orange-500" /> 同行者類型
                      </Label>
                      <Input 
                        placeholder="例如：情侶、親子、朋友群" 
                        value={profile.companions}
                        onChange={(e) => setProfile(p => ({ ...p, companions: e.target.value }))}
                        className="bg-slate-50 border-slate-200 focus:bg-white focus:border-orange-300 focus:ring-orange-100 h-12 rounded-xl text-[15px]"
                      />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/60 p-5 sm:p-6 rounded-2xl shadow-sm space-y-5">
                    {/* Vibes */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-amber-500" /> 旅遊節奏 (Vibes)
                      </h3>
                      <div className="flex flex-wrap gap-2 sm:gap-2.5">
                        {VIBE_OPTIONS.map(vibe => (
                          <PillButton
                            key={vibe}
                            label={vibe}
                            selected={profile.vibes.includes(vibe)}
                            onClick={() => toggleArrayItem('vibes', vibe)}
                          />
                        ))}
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Interests */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-2">
                        <Heart size={16} className="text-rose-500" /> 旅遊興趣
                      </h3>
                      <div className="flex flex-wrap gap-2 sm:gap-2.5">
                        {INTEREST_OPTIONS.map(opt => (
                          <PillButton
                            key={opt}
                            label={opt}
                            selected={profile.interests.includes(opt)}
                            onClick={() => toggleArrayItem('interests', opt)}
                          />
                        ))}
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Transport */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-2">
                        <Car size={16} className="text-blue-500" /> 交通方式偏好
                      </h3>
                      <div className="flex flex-wrap gap-2 sm:gap-2.5">
                        {TRANSPORT_OPTIONS.map(opt => (
                          <PillButton
                            key={opt}
                            label={opt}
                            selected={profile.transport.includes(opt)}
                            onClick={() => toggleArrayItem('transport', opt)}
                          />
                        ))}
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Diet */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-2">
                        <Coffee size={16} className="text-orange-500" /> 飲食禁忌
                      </h3>
                      <div className="flex flex-wrap gap-2 sm:gap-2.5">
                        {DIETARY_OPTIONS.map(opt => (
                          <PillButton
                            key={opt}
                            label={opt}
                            selected={profile.dietary.includes(opt)}
                            onClick={() => toggleArrayItem('dietary', opt)}
                          />
                        ))}
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Budget */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-2">
                        <DollarSign size={16} className="text-teal-600" /> 預算等級 (單選)
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                        {BUDGET_OPTIONS.map(opt => (
                          <PillButton
                            key={opt}
                            label={opt}
                            selected={profile.budget === opt}
                            onClick={() => setProfile(p => ({ ...p, budget: p.budget === opt ? '' : opt }))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-white md:rounded-b-[32px] shrink-0 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <Button 
                onClick={handleSave} 
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl py-4 font-black shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 text-[15px] sm:text-base tracking-widest transition-all"
                disabled={saving || loading}
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {saving ? '儲存中...' : '儲存預設偏好'}
              </Button>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}

