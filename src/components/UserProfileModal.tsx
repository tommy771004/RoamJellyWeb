import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getModalMotion, getOverlayTransition } from '../lib/motionTokens';
import { X, Save, Loader2, Sparkles, User, MapPin, Users, Heart, Coffee, Car, DollarSign, Check, Bell, Trash2 } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { useAppStore } from '../store/useAppStore';
import { fetchUserPreferences, updateUserAiProfile } from '../lib/workflowApi';
import type { AiPreferenceProfile } from '../types/workflow';
import { PulsingIndicator } from './ui/PulsingIndicator';
import { useTranslation } from "react-i18next";

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
  const selectedClasses: Record<string, string> = {
    indigo: 'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-950/80 dark:border-indigo-500/50 dark:text-indigo-300 dark:shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.4),inset_3px_3px_6px_rgba(129,140,248,0.25)]',
    emerald: 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-500/50 dark:text-emerald-300 dark:shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.4),inset_3px_3px_6px_rgba(52,211,153,0.25)]',
    rose: 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950/80 dark:border-rose-500/50 dark:text-rose-300 dark:shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.4),inset_3px_3px_6px_rgba(251,113,133,0.25)]',
    blue: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950/80 dark:border-blue-500/50 dark:text-blue-300 dark:shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.4),inset_3px_3px_6px_rgba(96,165,250,0.25)]',
    amber: 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/80 dark:border-amber-500/50 dark:text-amber-300 dark:shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.4),inset_3px_3px_6px_rgba(251,191,36,0.25)]',
  };

  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 overflow-hidden rounded-[20px] px-3.5 py-2.5 text-[12px] font-bold transition-all duration-[200ms] sm:px-4 sm:text-[13px] border-[3px] ${
        selected 
          ? `${selectedClasses[accentColor] || selectedClasses.indigo} translate-y-[2px] !shadow-[3px_3px_0_rgba(15,23,42,0.08),inset_2px_2px_4px_rgba(0,0,0,0.06)] dark:!shadow-[3px_3px_0_rgba(2,6,23,0.4),inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.08)]`
          : 'clay-btn border-white/80 dark:border-white/20 bg-white/82 text-slate-600 dark:bg-white/5 dark:text-slate-300 hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
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
    const { t } = useTranslation();
  const { showToast, notifications, clearNotifications } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'notifications'>('profile');
  
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
            transition={getOverlayTransition()}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-modal"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: '100%', opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-modal-above flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-white/72 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,250,251,0.96),rgba(241,248,255,0.94))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(9,15,30,0.97),rgba(15,23,42,0.95))] dark:border-white/10 dark:text-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:shadow-black/60 md:inset-0 md:m-auto md:h-[85vh] md:max-w-2xl md:rounded-[32px]"
          >
            {/* Header */}
            <div className="z-10 flex shrink-0 items-center justify-between rounded-t-[32px] border-b border-white/78 bg-white/78 dark:bg-slate-900/90 dark:border-white/10 px-5 py-4 backdrop-blur-xl sm:px-7 sm:py-5 md:rounded-t-[32px]">
              <div className="flex items-center gap-4">
                <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-sky-500 to-orange-400 text-white shadow-[0_12px_26px_rgba(14,165,233,0.22)]">
                  <Sparkles size={20} className="relative z-10" />
                </div>
                <div>
                  <h2 className="flex items-center gap-2 whitespace-nowrap text-[22px] font-black tracking-[-0.04em] text-slate-800 dark:text-slate-100">
                    {t('str_430acce9')}</h2>
                  <p className="mt-0.5 text-[12px] font-medium leading-[1.5] text-slate-500 dark:text-slate-400">{t('str_fc97c44')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/90 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label={t('str_12bb2d')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-white/46 to-transparent">
              {/* iOS-Style Segmented Tab Control */}
              <div className="px-5 pt-4 pb-2 shrink-0 border-b border-slate-100/65 dark:border-slate-800 bg-[rgba(255,255,255,0.4)] dark:bg-slate-900/40 backdrop-blur-md">
                <div className="flex bg-slate-100/90 dark:bg-slate-900 p-1 rounded-[16px] w-full border border-slate-200/40 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('profile')}
                    className={`flex-1 py-2 text-[12px] font-black rounded-[12px] transition-all duration-200 ios-press ${
                      activeSubTab === 'profile'
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {t('str_53d34552')}</button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('notifications')}
                    className={`flex-1 py-2 text-[12px] font-black rounded-[12px] transition-all duration-200 relative ios-press flex items-center justify-center gap-1.5 ${
                      activeSubTab === 'notifications'
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <PulsingIndicator size="sm" />
                    <span>{t('str_48f5b6d7')}</span>
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-black leading-none text-white bg-orange-500 rounded-full border border-white">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {activeSubTab === 'profile' ? (
                  loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500">
                      <Loader2 size={28} className="animate-spin text-indigo-500 text-opacity-80" />
                      <p className="text-sm font-medium tracking-wide">{t('str_308c0529')}</p>
                    </div>
                  ) : (
                    <React.Fragment>
                      {/* Basic Info */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
                        <div className="group flex flex-col gap-3 rounded-3xl border border-white/86 bg-white/78 dark:border-white/10 dark:bg-black/40 p-4 text-left shadow-[0_10px_22px_rgba(15,23,42,0.05)] dark:shadow-black/20 transition-all focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/20 sm:p-5">
                          <Label className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                            <MapPin size={16} className="text-indigo-500 group-focus-within:scale-110 transition-transform" /> {t('str_1abdb590')}</Label>
                          <Input 
                            placeholder={t('str_66b63351')} 
                            value={profile.departure}
                            onChange={(e) => setProfile(p => ({ ...p, departure: e.target.value }))}
                            className="h-11 rounded-2xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg px-4 !text-[14px] font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:bg-white/60 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                          />
                        </div>
                        
                        <div className="group flex flex-col gap-3 rounded-3xl border border-white/86 bg-white/78 dark:border-white/10 dark:bg-black/40 p-4 text-left shadow-[0_10px_22px_rgba(15,23,42,0.05)] dark:shadow-black/20 transition-all focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-500/20 sm:p-5">
                          <Label className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                            <Users size={16} className="text-rose-500 group-focus-within:scale-110 transition-transform" /> {t('str_1fb8300e')}</Label>
                          <Input 
                            placeholder={t('str_69b5daea')} 
                            value={profile.companions}
                            onChange={(e) => setProfile(p => ({ ...p, companions: e.target.value }))}
                            className="h-11 rounded-2xl border border-white/60 dark:border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-md dark:backdrop-blur-lg px-4 !text-[14px] font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:bg-white/60 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                          />
                        </div>
                      </div>

                      {/* Vibes */}
                      <div className="space-y-4 rounded-3xl border border-white/86 bg-white/78 dark:border-white/10 dark:bg-black/40 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)] dark:shadow-black/25 sm:p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="flex items-center gap-2.5 text-[14px] font-black tracking-[-0.02em] text-slate-800 dark:text-slate-200">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-100 bg-amber-50 text-amber-500">
                              <Sparkles size={16} />
                            </div>
                            {t('str_6a6b5398')}</h3>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 dark:bg-slate-800">{t('str_112851')}</span>
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
                      <div className="space-y-4 rounded-3xl border border-white/86 bg-white/78 dark:border-white/10 dark:bg-black/40 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)] dark:shadow-black/25 sm:p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="flex items-center gap-2.5 text-[14px] font-black tracking-[-0.02em] text-slate-800 dark:text-slate-200">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-500">
                              <Heart size={16} />
                            </div>
                            {t('str_3070fa80')}</h3>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 dark:bg-slate-800">{t('str_112851')}</span>
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
                      <div className="space-y-4 rounded-3xl border border-white/86 bg-white/78 dark:border-white/10 dark:bg-black/40 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)] dark:shadow-black/25 sm:p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="flex items-center gap-2.5 text-[14px] font-black tracking-[-0.02em] text-slate-800 dark:text-slate-200">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-500">
                              <Car size={16} />
                            </div>
                            {t('str_502ea8fa')}</h3>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 dark:bg-slate-800">{t('str_112851')}</span>
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
                        <div className="space-y-4 rounded-3xl border border-white/86 bg-white/78 dark:border-white/10 dark:bg-black/40 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)] dark:shadow-black/25 sm:p-5">
                          <div className="flex items-center justify-between">
                            <h3 className="flex items-center gap-2.5 text-[14px] font-black tracking-[-0.02em] text-slate-800 dark:text-slate-200">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600">
                                <DollarSign size={16} />
                              </div>
                              {t('str_46ff0ab8')}</h3>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 dark:bg-slate-800">{t('str_af08a')}</span>
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
                        <div className="space-y-4 rounded-3xl border border-white/86 bg-white/78 dark:border-white/10 dark:bg-black/40 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)] dark:shadow-black/25 sm:p-5">
                          <div className="flex items-center justify-between">
                            <h3 className="flex items-center gap-2.5 text-[14px] font-black tracking-[-0.02em] text-slate-800 dark:text-slate-200">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-500">
                                <Coffee size={16} />
                              </div>
                              {t('str_47d35d58')}</h3>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 dark:bg-slate-800">{t('str_112851')}</span>
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
                      
                      {/* Padding list info */}
                      <div className="h-4"></div>
                    </React.Fragment>
                  )
                ) : (
                  /* notifications subtab view */
                  notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                      <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50 dark:bg-slate-800 text-slate-400 shadow-[0_8px_20px_rgba(15,23,42,0.04)] mb-4">
                        <Bell size={28} className="text-slate-300 dark:text-slate-500" />
                      </div>
                      <h4 className="text-[16px] font-black tracking-[-0.01em] text-slate-700 dark:text-slate-200 mb-1">
                        {t('str_6c962b97')}</h4>
                      <p className="text-[12px] font-medium leading-[1.6] text-slate-400 max-w-xs">
                        {t('str_7ec1ed78')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1 border-b border-slate-100 pb-2 dark:border-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                          {t('str_d08d1')}{notifications.length} {t('str_fc127cd')}</span>
                        <button
                          onClick={clearNotifications}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:text-red-650 transition-colors"
                        >
                          <Trash2 size={13} /> {t('str_33db289e')}</button>
                      </div>
                      <div className="space-y-3">
                        {notifications.map((notif) => {
                          const timeStr = new Date(notif.at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <motion.div
                              key={notif.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="group flex items-start gap-3.5 rounded-[20px] border border-white/80 bg-white/70 dark:border-white/10 dark:bg-black/30 p-4 shadow-[0_6px_14px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-all"
                            >
                              <div className="flex-shrink-0 flex h-9.5 w-9.5 items-center justify-center rounded-[14px] bg-sky-50 dark:bg-sky-950/40 text-sky-500 border border-sky-100/50">
                                <Bell size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-[1.5] break-words text-left">
                                  {notif.text}
                                </p>
                                <span className="mt-1 block text-[10px] font-bold text-slate-400 font-mono text-left">
                                  {timeStr}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="z-20 shrink-0 border-t border-white/78 bg-white/84 px-5 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] pt-4 shadow-[0_-10px_24px_rgba(15,23,42,0.04)] sm:px-6 sm:pb-5 sm:pt-4 md:rounded-b-[32px]">
              {activeSubTab === 'profile' ? (
                <Button 
                  onClick={handleSave} 
                  className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 to-orange-400 py-4 text-[14px] font-black tracking-[0.08em] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_10px_22px_rgba(14,165,233,0.24)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:from-sky-600 hover:to-orange-500 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_26px_rgba(14,165,233,0.30)] ios-press sm:text-[15px] whitespace-nowrap"
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
              ) : (
                <div className="flex gap-3 w-full">
                  {notifications.length > 0 && (
                    <button 
                      onClick={clearNotifications} 
                      className="flex-shrink-0 flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50/40 px-5 text-[14px] font-bold text-red-650 hover:bg-red-55 transition-colors"
                    >
                      <Trash2 size={16} />
                      {t('str_33e0c6e0')}</button>
                  )}
                  <button 
                    onClick={onClose} 
                    className="flex-1 flex h-14 items-center justify-center rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-[14px] font-black tracking-wide shadow-md transition-all duration-200"
                  >
                    {t('str_4661c7ae')}</button>
                </div>
              )}
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
