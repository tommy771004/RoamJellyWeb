import { useEffect, useMemo, useState } from 'react';

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

  return (
    <div className="fixed inset-x-0 bottom-24 z-[90] px-4 md:px-6 pointer-events-none">
      <div className="mx-auto max-w-xl rounded-[28px] border border-white/20 bg-slate-950/88 px-5 py-4 text-white shadow-2xl shadow-slate-950/40 backdrop-blur-2xl pointer-events-auto dark:border-white/10 dark:bg-slate-950/92">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-xl shadow-lg shadow-fuchsia-500/20">
            ✨
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-200">加入主畫面</p>
            <p className="mt-1 text-sm font-bold text-white">把 RoamJelly 裝成全螢幕旅遊小工具，飛機上也能更快打開。</p>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-300">
              {deferredPrompt
                ? '安裝後會以接近原生 App 的模式執行，保留離線快取與更沉浸的全螢幕體驗。'
                : '在 Safari 點一下分享，再選「加入主畫面」，就能像 App 一樣從桌面直接打開。'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={() => void handleInstall()}
                  className="rounded-full bg-white px-4 py-2 text-[12px] font-black uppercase tracking-[0.16em] text-slate-900 transition-all hover:-translate-y-0.5"
                >
                  立即安裝
                </button>
              ) : (
                <span className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[12px] font-black tracking-[0.08em] text-white">
                  Safari 分享 → 加入主畫面
                </span>
              )}
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full border border-white/10 px-4 py-2 text-[12px] font-black uppercase tracking-[0.16em] text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                稍後
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}