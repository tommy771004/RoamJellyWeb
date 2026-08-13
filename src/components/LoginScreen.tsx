import { useEffect, useId, useRef, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, PlaneTakeoff, X } from 'lucide-react';
import {
  clearPendingAuthTransaction,
  AuthClientError,
  confirmAccountLink,
  disabledSocialProviders,
  exchangeSocialCallback,
  getSocialProviderAvailability,
  openAuthorizationUrl,
  readPendingAuthTransaction,
  SOCIAL_PROVIDERS,
  startSocialAuth,
} from '../features/auth/authClient';
import OAuthProgressPanel from '../features/auth/components/OAuthProgressPanel';
import SocialLoginButton from '../features/auth/components/SocialLoginButton';
import type { AuthProvider, LoginStatus, PendingAuthTransaction } from '../features/auth/types';
import {
  createGuestSession,
  loginUser,
  requestPasswordReset,
  resetPassword,
  registerUser,
  setClientAccessToken,
} from '../lib/workflowApi';

interface Props {
  onLogin: (userId: string) => void;
  onCancel?: () => void;
  guestFirst?: boolean;
  contextLabel?: string;
  title?: string;
  description?: string;
  guestCtaLabel?: string;
}

type Mode = 'login' | 'register' | 'forgot-password' | 'reset-password';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OAUTH_WAIT_TIMEOUT_MS = 90_000;

function userFacingError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  if (/failed to fetch|network|load failed/i.test(error.message)) {
    return '目前無法連線，請檢查網路後再試一次。';
  }
  return error.message || fallback;
}

export default function LoginScreen({
  onLogin,
  onCancel,
  guestFirst = false,
  contextLabel,
  title,
  description,
  guestCtaLabel,
}: Props) {
  const emailId = useId();
  const passwordId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>(() => window.location.pathname === '/forgot-password' ? 'forgot-password' : window.location.pathname === '/reset-password' ? 'reset-password' : 'login');
  const [email, setEmail] = useState(() => new URLSearchParams(window.location.search).get('email') ?? '');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [status, setStatus] = useState<LoginStatus>('idle');
  const [activeProvider, setActiveProvider] = useState<AuthProvider | null>(null);
  const [pendingAuth, setPendingAuth] = useState<PendingAuthTransaction | null>(() => readPendingAuthTransaction());
  const [oauthTimedOut, setOauthTimedOut] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [linkTicket, setLinkTicket] = useState<string | null>(null);
  const [resetCompleted, setResetCompleted] = useState(false);

  const [providerEnabled, setProviderEnabled] = useState(disabledSocialProviders);
  const isBusy = status !== 'idle' && status !== 'error';
  const isOauthWaiting = status === 'waiting-oauth' && activeProvider && pendingAuth;
  const resolvedGuestCtaLabel = guestCtaLabel || '先用訪客身分體驗';

  useEffect(() => {
    if (!email) emailInputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getSocialProviderAvailability().then((availability) => {
      if (!cancelled) setProviderEnabled(availability);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!isOauthWaiting) return;
    const remaining = Math.max(0, Math.min(OAUTH_WAIT_TIMEOUT_MS, pendingAuth.expiresAt - Date.now()));
    const timeout = window.setTimeout(() => setOauthTimedOut(true), remaining);
    return () => window.clearTimeout(timeout);
  }, [isOauthWaiting, pendingAuth]);

  useEffect(() => {
    if (!isOauthWaiting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelOauth();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOauthWaiting]);

  useEffect(() => {
    const completeCallback = (callbackUrl: string) => {
    setStatus('exchanging-session');
    const pending = readPendingAuthTransaction();
    setPendingAuth(pending);
    setActiveProvider(pending?.provider ?? null);

    void exchangeSocialCallback(callbackUrl, rememberMe)
      .then((session) => {
        const token = session.accessToken || session.access_token;
        if (!token || !session.user?.id) throw new Error('登入服務回應不完整，請重新登入。');
        setClientAccessToken(token);
        window.history.replaceState({}, '', '/');
        setStatus('success');
        onLogin(session.user.id);
      })
      .catch((error) => {
        window.history.replaceState({}, '', '/');
        setStatus('error');
        if (error instanceof AuthClientError && error.code === 'ACCOUNT_LINK_REQUIRED') {
          const ticket = String(error.details?.linkTicket ?? '');
          if (ticket) {
            setLinkTicket(ticket);
            setMode('login');
            setFormError('此電子郵件已有帳號。請用原密碼登入，完成第三方帳號連結。');
            return;
          }
        }
        setFormError(userFacingError(error, '登入驗證失敗，請重新登入。'));
      });
    };
    if (window.location.pathname === '/auth/callback') completeCallback(window.location.href);
  }, [onLogin, rememberMe]);

  const resetMessages = () => {
    setEmailError('');
    setPasswordError('');
    setFormError('');
    setNotice('');
  };

  const validateEmail = (showError = true): boolean => {
    const trimmed = email.trim();
    let nextError = '';
    if (!trimmed) nextError = '請輸入電子郵件。';
    else if (!EMAIL_RE.test(trimmed)) nextError = '電子郵件格式不正確。';
    if (showError) setEmailError(nextError);
    return !nextError;
  };

  const validatePassword = (): boolean => {
    const nextError = !password ? '請輸入密碼。' : password.length < 8 ? '密碼至少需要 8 個字元。' : '';
    setPasswordError(nextError);
    return !nextError;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();
    const emailValid = validateEmail();
    const passwordValid = validatePassword();
    if (!emailValid || !passwordValid) return;
    if (mode === 'register' && password !== confirmPassword) {
      setPasswordError('兩次輸入的密碼不一致。');
      return;
    }

    setStatus('submitting-password');
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const requestId = crypto.randomUUID();
      const result = mode === 'login'
        ? await loginUser(normalizedEmail, password, { rememberMe, requestId })
        : await registerUser(normalizedEmail, password, displayName.trim() || normalizedEmail.split('@')[0]);
      const token = result?.access_token || result?.token;
      if (!token) throw new Error('登入服務回應不完整，請重新登入。');
      setClientAccessToken(token);
      if (linkTicket) {
        await confirmAccountLink(linkTicket);
        setLinkTicket(null);
      }
      setStatus('success');
      onLogin(result?.user?.id || result?.user_id || normalizedEmail);
    } catch (error) {
      setStatus('error');
      setFormError(
        userFacingError(
          error,
          mode === 'login' ? '電子郵件或密碼不正確。' : '目前無法建立帳號，請稍後再試。',
        ),
      );
    }
  };

  const handleSocialLogin = async (provider: AuthProvider) => {
    if (!providerEnabled[provider]) return;
    resetMessages();
    setActiveProvider(provider);
    setOauthTimedOut(false);
    setStatus('starting-oauth');
    try {
      const pending = await startSocialAuth(provider);
      setPendingAuth(pending);
      await openAuthorizationUrl(pending);
      setStatus('waiting-oauth');
    } catch (error) {
      setStatus('error');
      setActiveProvider(null);
      setFormError(userFacingError(error, `${provider} 登入暫時無法使用，請稍後再試。`));
    }
  };

  const cancelOauth = () => {
    clearPendingAuthTransaction();
    setPendingAuth(null);
    setActiveProvider(null);
    setOauthTimedOut(false);
    setStatus('idle');
    setNotice('已取消登入。');
  };

  const handleGuestLogin = async () => {
    resetMessages();
    setStatus('submitting-password');
    try {
      const guest = await createGuestSession(displayName.trim() || undefined);
      setStatus('success');
      onLogin(guest.user_id);
    } catch (error) {
      setStatus('error');
      setFormError(userFacingError(error, '訪客登入失敗，請再試一次。'));
    }
  };

  const submitForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setForgotSubmitted(false);
    setFormError('');
    if (!validateEmail()) return;
    setForgotLoading(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setForgotSubmitted(true);
    } catch (error) {
      setFormError(userFacingError(error, '目前無法寄送重設密碼連結，請稍後再試。'));
    } finally {
      setForgotLoading(false);
    }
  };

  const submitNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!validatePassword()) return;
    if (password !== confirmPassword) { setPasswordError('兩次輸入的密碼不一致。'); return; }
    const token = new URLSearchParams(window.location.search).get('token') ?? '';
    setForgotLoading(true);
    try { await resetPassword(token, password); setResetCompleted(true); }
    catch (error) { setFormError(userFacingError(error, '無法更新密碼，請重新申請重設連結。')); }
    finally { setForgotLoading(false); }
  };

  if (status === 'exchanging-session') {
    return (
      <div className="flex min-h-full w-full flex-1 items-center justify-center bg-slate-50 p-6 dark:bg-slate-950" aria-live="polite">
        <div className="text-center">
          <LoaderCircle className="mx-auto animate-spin text-sky-600" size={30} />
          <p className="mt-4 text-sm font-extrabold text-slate-800 dark:text-white">正在完成登入…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-full w-full flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_18%_14%,rgba(125,211,252,0.38),transparent_34%),radial-gradient(circle_at_84%_22%,rgba(244,114,182,0.25),transparent_32%),linear-gradient(145deg,#f8fafc_0%,#fdf4ff_48%,#eff6ff_100%)] px-4 py-7 text-slate-900 dark:bg-[radial-gradient(circle_at_16%_10%,rgba(14,116,144,0.20),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(157,23,77,0.16),transparent_30%),linear-gradient(145deg,#020617_0%,#111827_55%,#172033_100%)] dark:text-white sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-white/35 blur-3xl dark:bg-sky-500/5" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-12 h-80 w-80 rounded-full bg-pink-100/45 blur-3xl dark:bg-fuchsia-500/5" />

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="關閉登入"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/60 text-slate-600 shadow-sm backdrop-blur-xl transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/35 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
        >
          <X size={18} />
        </button>
      )}

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[420px] items-center justify-center">
        <section className="w-full rounded-[28px] border border-white/75 bg-white/65 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-[28px] backdrop-saturate-150 dark:border-white/12 dark:bg-slate-950/72 sm:p-8">
          <header className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[19px] bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)] dark:bg-white dark:text-slate-950">
              <PlaneTakeoff aria-hidden="true" size={25} strokeWidth={2.4} />
            </div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">RoamJelly</p>
            <h1 className="mt-2 text-[28px] font-black tracking-[-0.045em] text-slate-900 dark:text-white">
              {mode === 'forgot-password' ? '找回帳號' : mode === 'reset-password' ? '設定新密碼' : mode === 'register' ? '建立帳號' : '歡迎回來'}
            </h1>
            <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-600 dark:text-slate-300">
              {mode === 'forgot-password'
                ? '輸入你的電子郵件，我們會協助你找回帳號。'
                : mode === 'reset-password'
                  ? '請設定至少 8 個字元的新密碼。'
                : guestFirst
                  ? description || `${contextLabel || '這項功能'}需要帳號同步；你也可以先用訪客身分體驗。`
                  : '登入後繼續使用。'}
            </p>
          </header>

          {notice && (
            <div role="status" className="mt-5 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-center text-[12px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {notice}
            </div>
          )}

          {isOauthWaiting && activeProvider && pendingAuth ? (
            <div className="mt-6">
              <OAuthProgressPanel
                provider={activeProvider}
                timedOut={oauthTimedOut}
                onReopen={() => { void openAuthorizationUrl(pendingAuth); }}
                onCancel={cancelOauth}
              />
            </div>
          ) : mode === 'reset-password' ? (
            <form className="mt-6 space-y-4" onSubmit={submitNewPassword} noValidate>
              {resetCompleted ? (
                <div>
                  <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-800">密碼已更新，請使用新密碼登入。</p>
                  <button type="button" onClick={() => { window.history.replaceState({}, '', '/'); setMode('login'); setResetCompleted(false); }} className="mt-4 min-h-12 w-full rounded-[15px] bg-slate-900 text-sm font-black text-white">返回登入</button>
                </div>
              ) : (
                <>
                  <label className="block text-[12px] font-extrabold text-slate-700 dark:text-slate-200">新密碼
                    <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-[15px] border border-slate-200 bg-white/75 px-4 text-sm dark:border-white/15 dark:bg-black/20 dark:text-white" />
                  </label>
                  <label className="block text-[12px] font-extrabold text-slate-700 dark:text-slate-200">再次輸入新密碼
                    <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-[15px] border border-slate-200 bg-white/75 px-4 text-sm dark:border-white/15 dark:bg-black/20 dark:text-white" />
                  </label>
                  {passwordError && <p role="alert" className="text-xs font-bold text-rose-600">{passwordError}</p>}
                  {formError && <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{formError}</p>}
                  <button disabled={forgotLoading} type="submit" className="min-h-12 w-full rounded-[15px] bg-slate-900 text-sm font-black text-white disabled:opacity-60">{forgotLoading ? '更新中…' : '更新密碼'}</button>
                </>
              )}
            </form>
          ) : mode === 'forgot-password' ? (
            <form className="mt-6" onSubmit={submitForgotPassword} noValidate>
              <label htmlFor={emailId} className="mb-2 block text-[12px] font-extrabold text-slate-700 dark:text-slate-200">電子郵件</label>
              <div className="relative">
                <Mail aria-hidden="true" size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={emailInputRef}
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); if (emailError) setEmailError(''); }}
                  onBlur={() => validateEmail()}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? `${emailId}-error` : undefined}
                  autoComplete="username"
                  placeholder="name@example.com"
                  className="min-h-12 w-full rounded-[15px] border border-slate-200 bg-white/76 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/25 dark:border-white/14 dark:bg-black/20 dark:text-white"
                />
              </div>
              {emailError && <p id={`${emailId}-error`} className="mt-2 text-[12px] font-bold text-rose-600 dark:text-rose-400">{emailError}</p>}
              {forgotSubmitted && (
                <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-[12px] font-bold leading-5 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/30 dark:text-emerald-200">
                  如果此 Email 已註冊，我們會寄送重設密碼連結。
                </p>
              )}
              {formError && (
                <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/85 px-4 py-3 text-[12px] font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-950/30 dark:text-rose-300">
                  {formError}
                </p>
              )}
              <button disabled={forgotLoading} type="submit" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-slate-900 px-4 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/40 dark:bg-white dark:text-slate-950">
                {forgotLoading && <LoaderCircle aria-hidden="true" size={17} className="animate-spin" />}
                {forgotLoading ? '寄送中…' : '寄送重設連結'}
              </button>
              <button type="button" onClick={() => { setMode('login'); setForgotSubmitted(false); resetMessages(); }} className="mt-3 min-h-10 w-full text-[12px] font-black text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30 dark:text-sky-300">
                返回登入
              </button>
            </form>
          ) : (
            <>
              {SOCIAL_PROVIDERS.some((provider) => providerEnabled[provider]) && (
                <>
                  <div className="mt-6 grid grid-cols-1 gap-2.5 min-[520px]:grid-cols-3">
                    {SOCIAL_PROVIDERS.filter((provider) => providerEnabled[provider]).map((provider) => (
                      <SocialLoginButton
                        key={provider}
                        provider={provider}
                        loading={status === 'starting-oauth' && activeProvider === provider}
                        disabled={isBusy}
                        onClick={() => void handleSocialLogin(provider)}
                      />
                    ))}
                  </div>

                  <div className="my-6 flex items-center gap-3" aria-hidden="true">
                    <div className="h-px flex-1 bg-slate-200/90 dark:bg-white/12" />
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">或</span>
                    <div className="h-px flex-1 bg-slate-200/90 dark:bg-white/12" />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {mode === 'register' && (
                  <div className="mb-4">
                    <label htmlFor="display-name" className="mb-2 block text-[12px] font-extrabold text-slate-700 dark:text-slate-200">顯示名稱</label>
                    <input
                      id="display-name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      autoComplete="name"
                      maxLength={50}
                      placeholder="旅人名稱"
                      className="min-h-12 w-full rounded-[15px] border border-slate-200 bg-white/76 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/25 dark:border-white/14 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor={emailId} className="mb-2 block text-[12px] font-extrabold text-slate-700 dark:text-slate-200">電子郵件</label>
                  <div className="relative">
                    <Mail aria-hidden="true" size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={emailInputRef}
                      id={emailId}
                      type="email"
                      value={email}
                      onChange={(event) => { setEmail(event.target.value); if (emailError) setEmailError(''); }}
                      onBlur={() => validateEmail()}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? `${emailId}-error` : undefined}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="name@example.com"
                      className="min-h-12 w-full rounded-[15px] border border-slate-200 bg-white/76 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition hover:border-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/25 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-rose-400/15 dark:border-white/14 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                  {emailError && <p id={`${emailId}-error`} className="mt-2 text-[12px] font-bold text-rose-600 dark:text-rose-400">{emailError}</p>}
                </div>

                <div className="mb-3">
                  <label htmlFor={passwordId} className="mb-2 block text-[12px] font-extrabold text-slate-700 dark:text-slate-200">密碼</label>
                  <div className="relative">
                    <LockKeyhole aria-hidden="true" size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id={passwordId}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => { setPassword(event.target.value); if (passwordError) setPasswordError(''); }}
                      onKeyUp={(event) => setCapsLockOn(event.getModifierState('CapsLock'))}
                      onKeyDown={(event) => setCapsLockOn(event.getModifierState('CapsLock'))}
                      aria-invalid={Boolean(passwordError)}
                      aria-describedby={passwordError ? `${passwordId}-error` : capsLockOn ? `${passwordId}-caps` : undefined}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="輸入密碼"
                      className="min-h-12 w-full rounded-[15px] border border-slate-200 bg-white/76 py-3 pl-11 pr-12 text-sm font-semibold outline-none transition hover:border-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/25 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-rose-400/15 dark:border-white/14 dark:bg-black/20 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                      className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-900/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30 dark:text-slate-300 dark:hover:bg-white/10"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordError && <p id={`${passwordId}-error`} className="mt-2 text-[12px] font-bold text-rose-600 dark:text-rose-400">{passwordError}</p>}
                  {!passwordError && capsLockOn && <p id={`${passwordId}-caps`} className="mt-2 text-[11px] font-bold text-amber-700 dark:text-amber-300">Caps Lock 已開啟</p>}
                </div>

                {mode === 'register' && (
                  <div className="mb-4">
                    <label htmlFor="confirm-password" className="mb-2 block text-[12px] font-extrabold text-slate-700 dark:text-slate-200">確認密碼</label>
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder="再次輸入密碼"
                      className="min-h-12 w-full rounded-[15px] border border-slate-200 bg-white/76 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/25 dark:border-white/14 dark:bg-black/20 dark:text-white"
                    />
                  </div>
                )}

                {mode === 'login' && (
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-[12px] font-bold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30"
                      />
                      記住我
                    </label>
                    <button type="button" onClick={() => { setMode('forgot-password'); resetMessages(); }} className="min-h-10 text-[12px] font-black text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30 dark:text-sky-300">
                      忘記密碼？
                    </button>
                  </div>
                )}

                {formError && (
                  <div role="alert" aria-live="polite" className="mb-4 rounded-[16px] border border-rose-200 bg-rose-50/85 px-4 py-3 text-[12px] font-bold leading-5 text-rose-700 dark:border-rose-400/20 dark:bg-rose-950/30 dark:text-rose-300">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isBusy}
                  aria-busy={status === 'submitting-password'}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-slate-900 px-4 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/40 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  {status === 'submitting-password' && <LoaderCircle aria-hidden="true" size={17} className="animate-spin" />}
                  {status === 'submitting-password' ? (mode === 'login' ? '登入中…' : '建立中…') : (mode === 'login' ? '登入' : '建立帳號')}
                </button>
              </form>

              <p className="mt-5 text-center text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                {mode === 'login' ? '還沒有帳號？' : '已經有帳號？'}{' '}
                <button
                  type="button"
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); resetMessages(); }}
                  className="font-black text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30 dark:text-sky-300"
                >
                  {mode === 'login' ? '註冊' : '返回登入'}
                </button>
              </p>

              {guestFirst && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleGuestLogin()}
                  className="mt-4 min-h-11 w-full rounded-[14px] border border-slate-200 bg-white/55 px-4 text-[12px] font-black text-slate-700 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  {resolvedGuestCtaLabel}
                </button>
              )}
            </>
          )}

          <p className="mt-6 text-center text-[10px] font-semibold leading-5 text-slate-400 dark:text-slate-500">
            登入即表示你同意服務條款與隱私權政策。系統不會在此裝置儲存你的密碼。
          </p>
        </section>
      </div>
    </main>
  );
}
