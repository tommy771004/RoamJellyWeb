import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

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
    if (typeof window === 'undefined' || window.innerWidth > 1024) return false;
    return Boolean(deferredPrompt) || isIosMobileSafari();
  }, [deferredPrompt, dismissed]);

  if (!showPrompt) return null;

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
    <div className="pointer-events-none fixed bottom-24 left-0 right-0 z-prompt w-full px-3.5 md:px-6">
      <div
        className="pointer-events-auto mx-auto max-w-xl rounded-[28px] border border-white/74 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(30,41,59,0.84),rgba(15,23,42,0.82))] px-4 py-4 text-white shadow-[0_20px_42px_rgba(15,23,42,0.34)]"
        style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-lg shadow-[0_10px_22px_rgba(217,70,239,0.24)]">
            ✨
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-200">加入主畫面</p>
            <p className="mt-1 text-[14px] font-black leading-[1.45] tracking-[-0.02em] text-white">把 RoamJelly 裝成全螢幕旅遊小工具，飛機上也能更快打開。</p>
            <p className="mt-2 text-[12px] leading-[1.6] text-slate-300">
              {deferredPrompt
                ? '安裝後會以接近原生 App 的模式執行，保留離線快取與更沉浸的全螢幕體驗。'
                : '在 Safari 點一下分享，再選「加入主畫面」，就能像 App 一樣從桌面直接打開。'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={() => void handleInstall()}
                  className="rounded-full bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 transition-all hover:-translate-y-0.5"
                >
                  立即安裝
                </button>
              ) : (
                <span className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[11px] font-black tracking-[0.08em] text-white">
                  Safari 分享 → 加入主畫面
                </span>
              )}
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full border border-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                稍後
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
