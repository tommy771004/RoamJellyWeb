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
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed left-0 right-0 z-sheet flex w-full flex-col items-center gap-3 px-3.5 sm:px-4" style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', bounce: 0.6, duration: 0.7 }}
            className={`pointer-events-auto mx-auto flex w-fit justify-center max-w-sm shrink-0 items-center gap-3 rounded-[28px] border px-4 py-3.5 shadow-lg backdrop-blur-2xl ${
              toast.type === 'success' ? 'border-emerald-300/40 bg-[linear-gradient(180deg,rgba(16,185,129,0.95),rgba(5,150,105,0.92))] text-white' :
              toast.type === 'warning' ? 'border-orange-300/40 bg-[linear-gradient(180deg,rgba(249,115,22,0.95),rgba(234,88,12,0.92))] text-white' :
              'border-slate-400/40 bg-[linear-gradient(180deg,rgba(71,85,105,0.96),rgba(30,41,59,0.92))] text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={20} className="shrink-0 text-emerald-100" />}
            {toast.type === 'warning' && <AlertCircle size={20} className="shrink-0 text-amber-100" />}
            {toast.type === 'info' && <Info size={20} className="shrink-0 text-slate-400" />}
            <span className="fluid-copy min-w-0 text-center whitespace-nowrap overflow-hidden text-ellipsis font-bold tracking-[0.02em]">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                onClick={() => {
                  toast.onAction?.();
                  removeToast(toast.id);
                }}
                className="fluid-kicker shrink-0 rounded-full border border-white/20 bg-black/10 px-3 py-1 font-black uppercase transition-colors hover:bg-black/20"
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
