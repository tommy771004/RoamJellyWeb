import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
}

export function JellyToast({ toasts, removeToast }: { toasts: ToastProps[], removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-3 pointer-events-none px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', bounce: 0.4, duration: 0.6 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-full shadow-xl shadow-black/5 border backdrop-blur-xl shrink-0 max-w-sm w-full mx-auto ${
              toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white shadow-emerald-500/20' :
              toast.type === 'warning' ? 'bg-amber-500/90 border-amber-400 text-white shadow-amber-500/20' :
              'bg-slate-800/90 border-slate-700 text-white shadow-slate-900/20'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={20} className="shrink-0 text-emerald-100" />}
            {toast.type === 'warning' && <AlertCircle size={20} className="shrink-0 text-amber-100" />}
            {toast.type === 'info' && <Info size={20} className="shrink-0 text-slate-300" />}
            <span className="font-bold text-[14px] tracking-wide flex-1">{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/10 rounded-full transition-colors opacity-70 hover:opacity-100 shrink-0"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
