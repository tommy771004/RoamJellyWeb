import { SPRING_SMOOTH, SPRING_SNAPPY, SPRING_BOUNCY } from '../lib/motionTokens';
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function JellyToast({ toasts, removeToast }: { toasts: ToastProps[], removeToast: (id: string) => void }) {
  const content = (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed left-0 right-0 z-sheet flex w-full flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-3 px-3.5 sm:px-4" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={SPRING_BOUNCY}
            className={`pointer-events-auto flex items-center gap-3 rounded-full border px-5 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 max-w-sm shrink-0 border-white/60 dark:border-white/10 ${
              toast.type === 'success' 
                ? 'bg-[rgba(240,253,244,0.92)] text-emerald-950 border-emerald-200' 
                : toast.type === 'warning' 
                ? 'bg-[rgba(255,247,237,0.92)] text-orange-950 border-orange-200' 
                : 'bg-[rgba(240,249,255,0.92)] text-slate-800 border-sky-200'
            }`}
          >
            {toast.type === 'success' && (
              <div className="p-1 rounded-full shrink-0 flex items-center justify-center bg-emerald-100/80 text-emerald-600">
                <CheckCircle2 size={16} />
              </div>
            )}
            {toast.type === 'warning' && (
               <div className="p-1 rounded-full shrink-0 flex items-center justify-center bg-orange-100/80 text-orange-600">
                 <AlertCircle size={16} />
               </div>
            )}
            {toast.type === 'info' && (
               <div className="p-1 rounded-full shrink-0 flex items-center justify-center bg-sky-100/80 text-sky-600">
                 <Info size={16} />
               </div>
            )}
            <span className="text-[13px] font-bold tracking-tight text-slate-800 leading-none translate-y-px whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] sm:max-w-[240px]">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                onClick={() => {
                  toast.onAction?.();
                  removeToast(toast.id);
                }}
                className="shrink-0 rounded-full bg-slate-900 hover:bg-slate-950 text-white px-3 py-1 text-[11px] font-black tracking-wider uppercase transition-all duration-200 active:scale-95 shadow-sm ml-1"
              >
                {toast.actionLabel}
              </button>
            )}
            <button 
              onClick={() => removeToast(toast.id)}
              aria-label="關閉通知"
              className="p-1.5 hover:bg-slate-200/50 rounded-full transition-all text-slate-400 hover:text-slate-600 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ml-0.5"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
