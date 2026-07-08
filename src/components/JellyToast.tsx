import { SPRING_SNAPPY } from '../lib/motionTokens';
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useTranslation } from "react-i18next";

export type ToastType = 'success' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const TOAST_ICONS = {
  success: { Icon: CheckCircle2, bg: 'bg-emerald-100/80', color: 'text-emerald-600' },
  warning: { Icon: AlertCircle,  bg: 'bg-orange-100/80',  color: 'text-orange-600'  },
  info:    { Icon: Info,         bg: 'bg-sky-100/80',     color: 'text-sky-600'     },
};

const TOAST_STYLES = {
  success: 'bg-[rgba(240,253,244,0.92)] border-emerald-200/70 text-emerald-950',
  warning: 'bg-[rgba(255,247,237,0.92)] border-orange-200/70  text-orange-950',
  info:    'bg-[rgba(240,249,255,0.92)] border-sky-200/70     text-slate-800',
};

export function JellyToast({ toasts, removeToast }: { toasts: ToastProps[], removeToast: (id: string) => void }) {
  const { t } = useTranslation();
  const content = (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed left-0 right-0 z-sheet flex w-full flex-col items-center gap-2 px-3.5 sm:px-4"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <AnimatePresence mode="sync">
        {toasts.map((toast) => {
          const { Icon, bg, color } = TOAST_ICONS[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.94 }}
              transition={SPRING_SNAPPY}
              className={`pointer-events-auto flex items-center gap-3 rounded-full border px-5 py-3 max-w-sm shrink-0 shadow-[0_8px_32px_rgba(15,23,42,0.10)] backdrop-blur-2xl backdrop-saturate-[180%] ${TOAST_STYLES[toast.type]}`}
            >
              <div className={`p-1 rounded-full shrink-0 flex items-center justify-center ${bg} ${color}`}>
                <Icon size={16} />
              </div>
              <span className="text-[13px] font-bold tracking-tight text-slate-800 leading-none translate-y-px whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] sm:max-w-[260px]">
                {toast.message}
              </span>
              {toast.actionLabel && toast.onAction && (
                <button
                  onClick={() => {
                    toast.onAction?.();
                    removeToast(toast.id);
                  }}
                  className="shrink-0 rounded-full bg-slate-900 hover:bg-slate-950 text-white px-3 py-1 text-[11px] font-black tracking-wider uppercase ios-press shadow-sm ml-1"
                >
                  {toast.actionLabel}
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                aria-label={t('str_46628ef8')}
                className="p-1.5 hover:bg-slate-200/60 rounded-full ios-press text-slate-400 hover:text-slate-600 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ml-0.5"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
