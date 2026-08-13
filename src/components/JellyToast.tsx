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
  success: { Icon: CheckCircle2, color: 'text-[#355948]' },
  warning: { Icon: AlertCircle, color: 'text-[#a44932]' },
  info: { Icon: Info, color: 'text-[#5b655f]' },
};

const TOAST_STYLES = {
  success: 'bg-[#eef4ef] text-[#21342b]',
  warning: 'bg-[#f6eee9] text-[#562d22]',
  info: 'bg-[#f1f3ef] text-[#27332d]',
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
          const { Icon, color } = TOAST_ICONS[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 1, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 1, x: 24 }}
              transition={SPRING_SNAPPY}
              className={`pointer-events-auto flex w-full max-w-md shrink-0 items-start gap-3 rounded-lg px-4 py-3 shadow-[0_5px_12px_rgba(47,61,53,0.12)] ${TOAST_STYLES[toast.type]}`}
            >
              <Icon aria-hidden="true" className={`mt-0.5 shrink-0 ${color}`} size={18} />
              <span className="min-w-0 flex-1 text-[13px] font-bold leading-5">
                {toast.message}
              </span>
              {toast.actionLabel && toast.onAction && (
                <button
                  onClick={() => {
                    toast.onAction?.();
                    removeToast(toast.id);
                  }}
                  className="min-h-11 shrink-0 rounded-md bg-[#23372e] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[#314a3f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a44932] focus-visible:ring-offset-2"
                >
                  {toast.actionLabel}
                </button>
              )}
              <button
                onClick={() => removeToast(toast.id)}
                aria-label={t('str_46628ef8')}
                className="-my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-md text-current opacity-60 transition-colors hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a44932] focus-visible:ring-offset-2"
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
