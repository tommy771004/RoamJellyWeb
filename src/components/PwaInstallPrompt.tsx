import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'roamjelly-pwa-install-dismissed';

function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosMobileSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && /safari/.test(ua) && !/crios|fxios/.test(ua);
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === 'true');

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const showPrompt = useMemo(() => {
    if (dismissed || isStandaloneDisplayMode()) return false;
    // On Desktop, prompt is usually more subtle or handled by browser, but we provide it for consistency if it's there
    if (typeof window === 'undefined' || window.innerWidth > 1024) return false;
    return Boolean(deferredPrompt) || isIosMobileSafari();
  }, [deferredPrompt, dismissed]);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, 'true');
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
    <AnimatePresence>
      {showPrompt && (
        <div className="pointer-events-none fixed bottom-24 left-0 right-0 z-prompt w-full px-3.5 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="pointer-events-auto mx-auto max-w-xl rounded-[28px] border border-white/74 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(30,41,59,0.88),rgba(15,23,42,0.86))] px-5 py-5 text-white shadow-[0_20px_42px_rgba(15,23,42,0.42)]"
            style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-xl shadow-[0_10px_22px_rgba(217,70,239,0.24)]">
                ✨
              </div>
              <div className="min-w-0 flex-1">
                <p className="fluid-kicker font-black uppercase text-fuchsia-200">加入主畫面</p>
                <p className="fluid-copy mt-1 font-black tracking-[-0.02em] text-white">把 RoamJelly 裝成全螢幕旅遊小工具。</p>
                <p className="fluid-body mt-2 text-slate-300 leading-relaxed">
                  {deferredPrompt
                    ? '安裝後會以接近原生 App 的模式執行，保留離線快取與更沉浸的全螢幕體驗。'
                    : '在 Safari 點一下分享，再選「加入主畫面」，就能像 App 一樣從桌面直接打開。'}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  {deferredPrompt ? (
                    <button
                      type="button"
                      onClick={() => void handleInstall()}
                      className="fluid-kicker min-h-[44px] rounded-full bg-white px-5 py-2 font-black uppercase text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      立即安裝
                    </button>
                  ) : (
                    <span className="fluid-kicker flex min-h-[44px] items-center rounded-full border border-white/15 bg-white/8 px-5 py-2 font-black text-white">
                      Safari 分享 → 加入主畫面
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={dismiss}
                    className="fluid-kicker min-h-[44px] rounded-full border border-white/10 px-5 py-2 font-black uppercase text-slate-300 transition-colors hover:border-white/20 hover:text-white active:scale-95"
                  >
                    稍後
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
