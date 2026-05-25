import { motion, useReducedMotion } from 'motion/react';
import { Plane, Clock, Heart, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import GlassCard from './GlassCard';
import { getModalMotion, getOverlayTransition, subtlePressableClass } from '../lib/motionTokens';

interface RedirectModalProps {
  provider: string;
  airline?: string;
  departure?: string;
  arrival?: string;
  duration?: string;
  stops?: number;
  price?: number;
  currency?: string;
  emoji?: string;
  onClose: () => void;
  onConfirm: () => void;
  onSave?: () => void;
}

export default function RedirectModal({ 
  provider, 
  airline, 
  departure, 
  arrival, 
  duration,
  stops,
  price, 
  currency, 
  onClose,
  onConfirm,
  onSave 
}: RedirectModalProps) {
  const airlineInitial = (airline || provider || '?').charAt(0).toUpperCase();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const overlayTransition = getOverlayTransition(prefersReducedMotion);
  const modalMotion = getModalMotion(prefersReducedMotion);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={overlayTransition}
      className="fixed inset-0 z-modal flex items-center justify-center p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] sm:pb-4 bg-slate-900/52 backdrop-blur-[8px]"
      onClick={onClose}
    >
      <motion.div
        initial={modalMotion.initial}
        animate={modalMotion.animate}
        exit={modalMotion.exit}
        transition={modalMotion.transition}
        className="w-full max-w-[520px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <div className="absolute -inset-1 rounded-[40px] bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300 blur-[18px] opacity-[0.1]"></div>
          
          <GlassCard className="relative items-center !p-0 border border-white/48 shadow-[0_18px_44px_rgba(15,23,42,0.15)] bg-white/72 backdrop-blur-[26px] rounded-t-[32px] rounded-b-[26px] sm:rounded-[38px] overflow-hidden">
            <div className="flex justify-center pt-1.5 sm:hidden bg-white/36">
              <div className="h-1.5 w-9 rounded-full bg-slate-300/78" />
            </div>
            <div className="w-full bg-gradient-to-br from-slate-50/96 to-white/40 px-5 py-5 sm:px-7 sm:py-6 border-b border-white/44 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-[20px] flex items-center justify-center border border-slate-100 shadow-[0_8px_18px_rgba(15,23,42,0.06)] text-[22px] font-black text-fuchsia-500">
                  {airlineInitial}
                </div>
                <div className="flex flex-col">
                  <span className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] leading-none text-slate-500">航空公司與平台</span>
                  <span className="text-[18px] sm:text-[20px] font-black tracking-[-0.03em] text-slate-800 leading-none">{airline || provider}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="mb-1 flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-emerald-500">
                  <ShieldCheck size={12} strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase tracking-[0.08em]">官方驗證</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{provider}</span>
              </div>
            </div>

            <div className="w-full p-5 sm:p-7 flex flex-col">
              <div className="relative mb-6 flex items-center justify-between px-1 sm:px-2">
                <div className="absolute left-1/2 top-1/2 z-0 h-[2px] w-[30%] -translate-x-1/2 -translate-y-1/2 bg-slate-100"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="mb-2 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-slate-100 bg-white shadow-sm">
                    <MapPin size={17} className="text-slate-500" />
                  </div>
                  <span className="text-[24px] sm:text-[26px] font-black tracking-[-0.04em] text-slate-800">{departure}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">出發城市</span>
                </div>

                <div className="relative z-10 mx-3 flex flex-1 flex-col items-center sm:mx-4">
                   <div className="mb-1 rounded-full bg-fuchsia-50 p-2 text-fuchsia-500">
                     <Plane size={17} strokeWidth={3} />
                   </div>
                   <div className="flex flex-col items-center">
                     <span className="whitespace-nowrap text-[12px] font-black text-slate-700 sm:text-[13px]">{duration || '3h 30m'}</span>
                     <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      {stops === 0 ? '直飛' : `轉機 ${stops} 次`}
                     </span>
                   </div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="mb-2 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-slate-100 bg-white shadow-sm">
                    <MapPin size={17} className="text-fuchsia-400" />
                  </div>
                  <span className="text-[24px] sm:text-[26px] font-black tracking-[-0.04em] text-slate-800">{arrival}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">抵達城市</span>
                </div>
              </div>

              <div className="mb-6 flex flex-col gap-3 rounded-[24px] border border-white/88 bg-white/86 p-4 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500">機票票價 (1名成人)</span>
                  <span className="text-[13px] font-bold tabular-nums text-slate-700">
                    {currency} {price ? Math.round(price * 0.85).toLocaleString() : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500">
                    預估稅項與手續費
                  </span>
                  <span className="text-[13px] font-bold tabular-nums text-slate-700">
                    {currency} {price ? Math.round(price * 0.15).toLocaleString() : '--'}
                  </span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-slate-900">總計金額</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[13px] font-bold text-violet-400">{currency}</span>
                    <span className="text-[26px] font-black tracking-[-0.04em] text-violet-600 tabular-nums">
                      {price ? price.toLocaleString() : '--'}
                    </span>
                  </div>
                </div>
                <p className="-mt-1 text-[10px] text-slate-500">* 費用僅供參考，以訂票頁面為準</p>
              </div>

              <div className="flex w-full flex-col space-y-3.5">
                <button
                  onClick={onConfirm}
                  className={`group relative flex w-full items-center justify-center overflow-hidden rounded-[22px] border-none bg-slate-900 py-4 shadow-[0_16px_28px_rgba(15,23,42,0.16)] hover:bg-slate-800 ${subtlePressableClass}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10 flex items-center gap-2.5 whitespace-nowrap text-[16px] font-black tracking-[0.04em] text-white">
                    立即前往預訂 <ArrowRight size={18} strokeWidth={3} className="shrink-0 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={onSave}
                    className={`group flex flex-1 items-center justify-center gap-2 rounded-[20px] border border-slate-200 bg-white py-3.5 shadow-sm whitespace-nowrap hover:border-pink-200 hover:bg-pink-50 ${subtlePressableClass}`}
                  >
                    <Heart size={18} className="shrink-0 text-pink-400 transition-all group-hover:fill-pink-500 group-hover:text-pink-500" />
                    <span className="text-[14px] font-bold text-slate-600 group-hover:text-pink-600">收藏方案</span>
                  </button>
                  <button
                    onClick={onClose}
                    className={`flex-1 rounded-[20px] border border-slate-100 bg-slate-50 py-3.5 whitespace-nowrap hover:bg-slate-100 ${subtlePressableClass}`}
                  >
                    <span className="text-[14px] font-bold text-slate-500">暫時關閉</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap text-slate-500">
                <Clock size={14} className="shrink-0" />
                <span className="truncate text-[10px] font-bold tracking-[0.08em]">價格與位子變動快速，建議及早確認</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </motion.div>
    </motion.div>
  );
}
