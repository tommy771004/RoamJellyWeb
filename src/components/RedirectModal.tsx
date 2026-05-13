import { motion, useReducedMotion } from 'motion/react';
import { Store, Plane, Clock, Heart, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
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
  emoji, 
  onClose, 
  onConfirm,
  onSave 
}: RedirectModalProps) {
  const airlineInitial = (airline || provider || '?').charAt(0).toUpperCase();
  const prefersReducedMotion = useReducedMotion();
  const overlayTransition = getOverlayTransition(prefersReducedMotion);
  const modalMotion = getModalMotion(prefersReducedMotion);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={overlayTransition}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/56 backdrop-blur-[8px]"
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
          {/* Liquid Glow Effect */}
          <div className="absolute -inset-1 rounded-[42px] bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-400 blur-[20px] opacity-[0.12]"></div>
          
          <GlassCard className="relative items-center !p-0 border border-white/42 shadow-[0_20px_56px_rgba(15,23,42,0.16)] bg-white/70 backdrop-blur-[26px] rounded-t-[34px] rounded-b-[28px] sm:rounded-[40px] overflow-hidden">
            <div className="flex justify-center pt-2 sm:hidden bg-white/36">
              <div className="h-1.5 w-10 rounded-full bg-slate-300/80" />
            </div>
            {/* Header / Airline Logo Section */}
            <div className="w-full bg-gradient-to-br from-slate-50 to-white/30 p-8 border-b border-white/40 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm text-2xl font-black text-fuchsia-500">
                  {airlineInitial}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Airline / Provider</span>
                  <span className="text-xl font-black text-slate-800 leading-none">{airline || provider}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 mb-1">
                  <ShieldCheck size={12} strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">Verified</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{provider}</span>
              </div>
            </div>

            <div className="p-8 w-full flex flex-col">
              {/* Flight Route Visual */}
              <div className="flex items-center justify-between mb-8 px-2 relative">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-[2px] bg-slate-100 z-0"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center mb-2 shadow-sm">
                    <MapPin size={18} className="text-slate-400" />
                  </div>
                  <span className="text-2xl font-black text-slate-800 tracking-tight">{departure}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Departure</span>
                </div>

                <div className="relative z-10 flex flex-col items-center flex-1 mx-4">
                   <div className="bg-fuchsia-50 text-fuchsia-500 p-2 rounded-full mb-1">
                     <Plane size={18} strokeWidth={3} />
                   </div>
                   <div className="flex flex-col items-center">
                     <span className="text-[13px] font-black text-slate-700 whitespace-nowrap">{duration || '3h 30m'}</span>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {stops === 0 ? 'Direct' : `${stops} Stop${stops! > 1 ? 's' : ''}`}
                     </span>
                   </div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center mb-2 shadow-sm">
                    <MapPin size={18} className="text-fuchsia-400" />
                  </div>
                  <span className="text-2xl font-black text-slate-800 tracking-tight">{arrival}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Arrival</span>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="bg-slate-50/50 rounded-3xl p-6 mb-8 border border-white/50 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Total Estimated Price</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-slate-400">{currency}</span>
                    <span className="text-3xl font-black text-slate-800 decoration-fuchsia-400/30 underline decoration-4 underline-offset-2">{price?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-2xl shadow-sm">
                  {emoji || '✨'}
                </div>
              </div>

              <div className="flex flex-col space-y-4 w-full">
                <button
                  onClick={onConfirm}
                  className={`group relative w-full py-5 rounded-2xl bg-slate-900 border-none shadow-2xl shadow-slate-200 flex items-center justify-center overflow-hidden hover:bg-slate-800 ${subtlePressableClass}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="font-black text-white text-[18px] tracking-wide relative z-10 flex items-center gap-3">
                    立即前往預訂 <ArrowRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                
                <div className="flex gap-4">
                  <button
                    onClick={onSave}
                    className={`flex-1 py-4.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center gap-2.5 hover:bg-pink-50 hover:border-pink-200 group ${subtlePressableClass}`}
                  >
                    <Heart size={20} className="text-pink-400 group-hover:text-pink-500 group-hover:fill-pink-500 transition-all" />
                    <span className="font-bold text-slate-600 group-hover:text-pink-600 text-[15px]">收藏方案</span>
                  </button>
                  <button
                    onClick={onClose}
                    className={`flex-1 py-4.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 ${subtlePressableClass}`}
                  >
                    <span className="font-bold text-slate-500 text-[15px]">暫時關閉</span>
                  </button>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
                <Clock size={14} />
                <span className="text-[11px] font-bold tracking-wide">價格與位子變動快速，建議及早確認</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </motion.div>
    </motion.div>
  );
}
