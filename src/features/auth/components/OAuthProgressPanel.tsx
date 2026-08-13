import { ExternalLink, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { FaApple } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import { SiLine } from 'react-icons/si';
import type { AuthProvider } from '../types';

const PROVIDER_LABELS: Record<AuthProvider, string> = {
  apple: 'Apple',
  google: 'Google',
  line: 'LINE',
};

function ProviderIcon({ provider }: { provider: AuthProvider }) {
  if (provider === 'apple') return <FaApple aria-hidden="true" size={24} />;
  if (provider === 'google') return <FcGoogle aria-hidden="true" size={24} />;
  return <SiLine aria-hidden="true" size={25} className="text-[#06c755]" />;
}

interface Props {
  provider: AuthProvider;
  timedOut: boolean;
  onReopen(): void;
  onCancel(): void;
}

export default function OAuthProgressPanel({ provider, timedOut, onReopen, onCancel }: Props) {
  const label = PROVIDER_LABELS[provider];
  return (
    <section
      aria-live="polite"
      aria-label={`${label} 登入進度`}
      className="rounded-[22px] border border-sky-200/80 bg-sky-50/85 p-5 text-center dark:border-sky-400/20 dark:bg-sky-950/35"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white">
        <ProviderIcon provider={provider} />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-[15px] font-black text-slate-900 dark:text-white">
        {!timedOut && <LoaderCircle aria-hidden="true" size={17} className="animate-spin text-sky-600" />}
        {timedOut ? '尚未完成登入' : `正在等待 ${label} 登入完成…`}
      </div>
      <p className="mt-2 text-[12px] font-semibold leading-6 text-slate-600 dark:text-slate-300">
        {timedOut ? '你可以重新開啟登入頁面，或返回登入。' : '已在瀏覽器開啟登入頁面。完成授權後請回到這裡。'}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onReopen}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3 text-[12px] font-black text-sky-800 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/35 dark:border-sky-400/20 dark:bg-white/10 dark:text-sky-200"
        >
          {timedOut ? <RotateCcw size={15} /> : <ExternalLink size={15} />}
          重新開啟瀏覽器
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-[12px] font-black text-slate-600 transition-colors hover:bg-slate-900/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <X size={15} />
          {timedOut ? '返回登入' : '取消'}
        </button>
      </div>
    </section>
  );
}
