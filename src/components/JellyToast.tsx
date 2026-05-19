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
  if (!toasts || toasts.length === 0) return null;

  const content = (
    <div 
      aria-live="polite" 
      aria-atomic="false" 
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-sheet flex w-full flex-col items-center justify-end gap-3 px-3.5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:px-4"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
            className={`pointer-events-auto mx-auto flex w-full max-w-sm shrink-0 items-center gap-3 rounded-[24px] border px-4 py-3.5 shadow-[0_14px_28px_rgba(15,23,42,0.14),inset_0_1px_1px_rgba(255,255,255,0.16)] backdrop-blur-2xl ${
              toast.type === 'success' ? 'border-emerald-300/36 bg-[linear-gradient(180deg,rgba(16,185,129,0.92),rgba(5,150,105,0.88))] text-white' :
              toast.type === 'warning' ? 'border-orange-300/36 bg-[linear-gradient(180deg,rgba(249,115,22,0.92),rgba(234,88,12,0.88))] text-white' :
              'border-slate-500/40 bg-[linear-gradient(180deg,rgba(30,41,59,0.92),rgba(15,23,42,0.88))] text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={20} className="shrink-0 text-emerald-100" />}
            {toast.type === 'warning' && <AlertCircle size={20} className="shrink-0 text-amber-100" />}
            {toast.type === 'info' && <Info size={20} className="shrink-0 text-slate-400" />}
            <span className="fluid-copy min-w-0 flex-1 break-words font-bold tracking-[0.02em]">{toast.message}</span>
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
