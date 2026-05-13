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
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col md:inset-0 md:m-auto md:max-w-lg md:h-[85vh] md:rounded-3xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
                  <User size={18} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">AI 行程偏好設定</h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
                  <Loader2 size={24} className="animate-spin" />
                  <p className="text-sm">載入中...</p>
                </div>
              ) : (
                <React.Fragment>
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <MapPin size={16} className="text-pink-500" /> 基本習慣
                    </h3>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">通常出發地</Label>
                      <Input 
                        placeholder="例如：TPE 桃園機場" 
                        value={profile.departure}
                        onChange={(e) => setProfile(p => ({ ...p, departure: e.target.value }))}
                        className="bg-slate-50"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">同行者類型</Label>
                      <Input 
                        placeholder="例如：情侶、親子、朋友群" 
                        value={profile.companions}
                        onChange={(e) => setProfile(p => ({ ...p, companions: e.target.value }))}
                        className="bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Vibes */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Sparkles size={16} className="text-amber-500" /> 旅遊節奏 (Vibes)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {VIBE_OPTIONS.map(vibe => {
                        const isSelected = profile.vibes.includes(vibe);
                        return (
                          <button
                            key={vibe}
                            onClick={() => toggleArrayItem('vibes', vibe)}
                            className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all border ${
                              isSelected 
                                ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {vibe}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interests */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Heart size={16} className="text-rose-500" /> 旅遊興趣
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {INTEREST_OPTIONS.map(opt => {
                        const isSelected = profile.interests.includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleArrayItem('interests', opt)}
                            className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all border ${
                              isSelected 
                                ? 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transport */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Car size={16} className="text-blue-500" /> 交通方式偏好
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {TRANSPORT_OPTIONS.map(opt => {
                        const isSelected = profile.transport.includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleArrayItem('transport', opt)}
                            className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all border ${
                              isSelected 
                                ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Budget & Diet */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                        <DollarSign size={16} className="text-green-500" /> 預算等級
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {BUDGET_OPTIONS.map(opt => {
                          const isSelected = profile.budget === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => setProfile(p => ({ ...p, budget: opt }))}
                              className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-all border ${
                                isSelected 
                                  ? 'bg-green-100 text-green-700 border-green-200 shadow-sm' 
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4 pb-8">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                        <Coffee size={16} className="text-orange-500" /> 飲食禁忌
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {DIETARY_OPTIONS.map(opt => {
                          const isSelected = profile.dietary.includes(opt);
                          return (
                            <button
                              key={opt}
                              onClick={() => toggleArrayItem('dietary', opt)}
                              className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all border ${
                                isSelected 
                                  ? 'bg-orange-100 text-orange-700 border-orange-200 shadow-sm' 
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </React.Fragment>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-white md:rounded-b-3xl">
              <Button 
                onClick={handleSave} 
                className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-xl py-6 font-bold shadow-pink flex items-center justify-center gap-2"
                disabled={saving || loading}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                儲存偏好設定
              </Button>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
