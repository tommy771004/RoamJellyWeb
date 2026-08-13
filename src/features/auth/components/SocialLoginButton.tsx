import { FaApple } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';
import { SiLine } from 'react-icons/si';
import { LoaderCircle } from 'lucide-react';
import type { AuthProvider } from '../types';

const LABELS: Record<AuthProvider, string> = {
  apple: 'Apple',
  google: 'Google',
  line: 'LINE',
};

interface Props {
  provider: AuthProvider;
  loading?: boolean;
  disabled?: boolean;
  onClick(): void;
}

function ProviderIcon({ provider }: { provider: AuthProvider }) {
  if (provider === 'apple') return <FaApple aria-hidden="true" size={19} />;
  if (provider === 'google') return <FcGoogle aria-hidden="true" size={19} />;
  return <SiLine aria-hidden="true" size={20} className="text-[#06c755]" />;
}

export default function SocialLoginButton({ provider, loading = false, disabled = false, onClick }: Props) {
  const providerLabel = LABELS[provider];
  return (
    <button
      type="button"
      aria-label={`使用 ${providerLabel} 繼續`}
      aria-busy={loading}
      disabled={disabled}
      onClick={onClick}
      className="group flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[14px] border border-slate-200/90 bg-white/78 px-3 text-[13px] font-extrabold text-slate-800 shadow-[0_5px_14px_rgba(15,23,42,0.05)] transition-[background-color,border-color,box-shadow,transform] hover:border-slate-300 hover:bg-white active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/12 dark:bg-white/[0.08] dark:text-white dark:hover:border-white/20 dark:hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/35"
    >
      {loading ? <LoaderCircle aria-hidden="true" size={18} className="animate-spin" /> : <ProviderIcon provider={provider} />}
      <span className="min-[520px]:hidden">使用 {providerLabel} 繼續</span>
      <span className="hidden min-[520px]:inline">{providerLabel}</span>
    </button>
  );
}
