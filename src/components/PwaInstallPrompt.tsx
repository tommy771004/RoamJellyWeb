import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { getModalMotion, getOverlayTransition } from '../lib/motionTokens';
import { X } from 'lucide-react';
import { isStandaloneDisplayMode, isIosMobileSafari } from '../lib/pwa';
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'roamjelly-pwa-install-dismissed';

export default function PwaInstallPrompt() {
    const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isDelayedVisible, setIsDelayedVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check both localStorage and sessionStorage to be safer in different Safari modes
    const isDismissed = window.localStorage.getItem(DISMISS_KEY) === 'true' || 
                       window.sessionStorage.getItem(DISMISS_KEY) === 'true';
    setDismissed(isDismissed);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    // Add a delay before showing the prompt to ensure the user is engaged and not immediately annoyed
    const timer = setTimeout(() => {
      setIsDelayedVisible(true);
    }, 6000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      clearTimeout(timer);
    };
  }, []);

  const showPrompt = useMemo(() => {
    if (dismissed || !isDelayedVisible || isStandaloneDisplayMode()) return false;
    if (typeof window === 'undefined' || window.innerWidth > 1024) return false;
    // Do not automatically show the fake prompt on iOS Safari as it annoys users.
    // We only rely on actual PWA deferred prompts now.
    return Boolean(deferredPrompt);
  }, [deferredPrompt, dismissed, isDelayedVisible]);

  if (!showPrompt) return null;

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, 'true');
      window.sessionStorage.setItem(DISMISS_KEY, 'true');
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      dismiss();
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    setDeferredPrompt(null);
    dismiss();
  };

  const content = (
    <div className="pointer-events-none fixed bottom-24 left-0 right-0 z-prompt flex w-full justify-center px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="pointer-events-auto relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[32px] border border-white/20 bg-slate-900/90 p-5 text-white shadow-[0_24px_48px_rgba(15,23,42,0.4)] backdrop-blur-2xl"
      >
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white ios-press transition-colors"
          aria-label={t('str_12bb2d')}
        >
          <X size={14} strokeWidth={3} />
        </button>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-rose-400 text-xl shadow-lg shadow-pink-500/20">
              ✨
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-fuchsia-300">{t('str_4d758a13')}</p>
              <p className="mt-0.5 text-lg font-black tracking-tight text-white leading-tight">{t('str_f819e1b')}</p>
            </div>
          </div>
          
          <p className="text-[13px] font-medium leading-relaxed text-slate-300">
            {deferredPrompt
              ? '安裝後支援全螢幕顯示與離線模式，讓規劃行程更沉浸、更像原生 App。'
              : '點選 Safari 下方的分（分享），再選「加入主畫面」，就能像 App 一樣從桌面開啟。'}
          </p>

          <div className="flex items-center gap-2">
            {deferredPrompt ? (
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="flex-1 rounded-2xl bg-white py-3 text-sm font-black uppercase tracking-wider text-slate-900 transition-all ios-press"
              >
                {t('str_39166e7c')}</button>
            ) : (
              <div className="flex-1 rounded-2xl border border-white/15 bg-white/10 py-3 text-center text-[12px] font-black text-fuchsia-100">
                {t('str_1e46a5dc')}</div>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="px-4 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              {t('str_f271f')}</button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
