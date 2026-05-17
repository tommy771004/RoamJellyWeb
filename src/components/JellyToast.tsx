import React, { useEffect } from 'react';
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
    <div aria-live="polite" aria-atomic="false" className="fixed left-0 right-0 w-full z-sheet flex flex-col items-center gap-3 pointer-events-none px-4" style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', bounce: 0.6, duration: 0.7 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-[28px] shadow-[0_16px_40px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.2)] border backdrop-blur-2xl shrink-0 max-w-sm w-full mx-auto ${
              toast.type === 'success' ? 'bg-emerald-500/85 border-emerald-400/40 text-white shadow-emerald-500/25' :
              toast.type === 'warning' ? 'bg-orange-500/85 border-orange-400/40 text-white shadow-orange-500/25' :
              'bg-slate-800/85 border-slate-600/50 text-white shadow-slate-900/30'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={20} className="shrink-0 text-emerald-100" />}
            {toast.type === 'warning' && <AlertCircle size={20} className="shrink-0 text-amber-100" />}
            {toast.type === 'info' && <Info size={20} className="shrink-0 text-slate-400" />}
            <span className="font-bold text-[14px] tracking-wide flex-1">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                onClick={() => {
                  toast.onAction?.();
                  removeToast(toast.id);
                }}
                className="px-3 py-1 rounded-full border border-white/20 bg-black/10 text-[12px] font-black tracking-widest uppercase hover:bg-black/20 transition-colors shrink-0"
              >
                {toast.actionLabel}
              </button>
            )}
            <button 
              onClick={() => removeToast(toast.id)}
              aria-label="關閉通知"
              className="p-1 hover:bg-black/10 rounded-full transition-colors opacity-70 hover:opacity-100 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
