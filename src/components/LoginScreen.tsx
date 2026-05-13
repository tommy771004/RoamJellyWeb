import { useEffect, useState } from 'react';
import { createGuestSession, loginUser, registerUser, setClientAccessToken } from '../lib/workflowApi';
import { pressableSurfaceClass, raisedHoverClass, subtlePressableClass } from '../lib/motionTokens';

interface Props {
  onLogin: (userId: string) => void;
  onCancel?: () => void;
  guestFirst?: boolean;
  contextLabel?: string;
  title?: string;
  description?: string;
  guestCtaLabel?: string;
}

type Mode = 'login' | 'register';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

type GuestPreviewItem = {
  label: string;
  title: string;
  meta: string;
  value: string;
  toneClass: string;
};

const GUEST_PREVIEW_LOOKUP: Record<string, { eyebrow: string; panelLabel: string; items: GuestPreviewItem[] }> = {
  'AI 旅程規劃': {
    eyebrow: '先試排旅程，再決定是否同步帳號',
    panelLabel: 'AI Draft Preview',
    items: [
      { label: 'Prompt', title: '東京 5 天，偏城市散步與咖啡店', meta: 'AI 會先幫你抓節奏、分區與動線。', value: 'Draft', toneClass: 'bg-fuchsia-400/18 text-fuchsia-100 border-fuchsia-300/30' },
      { label: 'Style', title: '慢節奏 / 雨備 / 一人旅行', meta: '先確認方向，再登入保存和微調。', value: '3 tags', toneClass: 'bg-cyan-400/18 text-cyan-100 border-cyan-300/30' },
      { label: 'Output', title: 'Day 1 到 Day 5 的初版行程', meta: '生成後可直接帶去手帳繼續編修。', value: '5 days', toneClass: 'bg-amber-300/18 text-amber-50 border-amber-200/30' },
    ],
  },
  '行程手帳': {
    eyebrow: '先開一份旅程，再決定要不要綁正式帳號',
    panelLabel: 'Trip Notebook Preview',
    items: [
      { label: 'Today', title: 'Day 2 ・ 淺草 -> 上野 -> 神保町', meta: '先試排與拖拉順序，喜歡再保存同步。', value: '3 stops', toneClass: 'bg-sky-400/18 text-sky-100 border-sky-300/30' },
      { label: 'Pocket List', title: '口袋名單 / 旅遊事實 / 航班帶入', meta: '收藏、帶入與 AI 草稿可以先直接試。', value: 'Ready', toneClass: 'bg-emerald-400/18 text-emerald-100 border-emerald-300/30' },
      { label: 'Collab', title: '之後登入即可接手共編與同步', meta: '現在先確認手帳編排是不是順手。', value: 'Sync later', toneClass: 'bg-fuchsia-400/18 text-fuchsia-100 border-fuchsia-300/30' },
    ],
  },
  '旅途工具包': {
    eyebrow: '工具頁先跟旅程綁定，再決定是否登入',
    panelLabel: 'Tools Preview',
    items: [
      { label: 'Weather', title: '東京 24°C ・ 降雨機率 20%', meta: '先看即時天氣與出門條件。', value: 'Live', toneClass: 'bg-sky-400/18 text-sky-100 border-sky-300/30' },
      { label: 'Checklist', title: '行李清單 6 / 9 完成', meta: '打包、提醒與分享可以先試流程。', value: '6/9', toneClass: 'bg-emerald-400/18 text-emerald-100 border-emerald-300/30' },
      { label: 'Split', title: '晚餐與車資已拆帳', meta: '登入後再接手成員與歷史紀錄即可。', value: 'TWD 1,250', toneClass: 'bg-amber-300/18 text-amber-50 border-amber-200/30' },
    ],
  },
  '快速體驗': {
    eyebrow: '不用先註冊，先跑過整個流程',
    panelLabel: 'Quick Preview',
    items: [
      { label: 'Explore', title: '先看首頁搜尋、Demo 與攻略', meta: '確認整體產品方向是不是你要的。', value: 'Start', toneClass: 'bg-fuchsia-400/18 text-fuchsia-100 border-fuchsia-300/30' },
      { label: 'Draft', title: '喜歡再開旅程或請 AI 排行程', meta: '訪客模式先讓你摸到主要功能。', value: 'Flow', toneClass: 'bg-cyan-400/18 text-cyan-100 border-cyan-300/30' },
      { label: 'Save', title: '之後再登入綁定與同步', meta: '不用一開始就進入註冊流程。', value: 'Later', toneClass: 'bg-emerald-400/18 text-emerald-100 border-emerald-300/30' },
    ],
  },
};

export default function LoginScreen({ onLogin, onCancel, guestFirst = false, contextLabel, title, description, guestCtaLabel }: Props) {
  const shouldShowGuestHero = guestFirst || Boolean(title) || Boolean(description);
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthCardExpanded, setIsAuthCardExpanded] = useState(!shouldShowGuestHero);

  useEffect(() => {
    setIsAuthCardExpanded(!shouldShowGuestHero);
  }, [shouldShowGuestHero]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setIsAuthCardExpanded(true);
  };

  const handleSubmit = async () => {
    setError('');
    setIsAuthCardExpanded(true);
    const trimmedUser = username.trim();

    if (!trimmedUser || !password) {
      setError('請輸入使用者名稱和密碼');
      return;
    }
    if (!USERNAME_RE.test(trimmedUser)) {
      setError('使用者名稱需為 3–30 個英數字或底線');
      return;
    }
    if (password.length < 8) {
      setError('密碼至少需要 8 個字元');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await loginUser(trimmedUser, password)
          : await registerUser(trimmedUser, password, displayName.trim() || trimmedUser);
          
      const token = result?.access_token || result?.token;
      if (!token) throw new Error('Token missing in response');
      const userId = result?.user?.id || result?.user_id || trimmedUser;
      
      setClientAccessToken(token);
      onLogin(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤，請再試一次');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const guest = await createGuestSession(displayName.trim() || username.trim() || undefined);
      onLogin(guest.user_id);
    } catch (err) {
      setIsAuthCardExpanded(true);
      setError(err instanceof Error ? err.message : '訪客登入失敗，請再試一次');
    } finally {
      setLoading(false);
    }
  };

  const resolvedGuestCtaLabel = guestCtaLabel || '先用訪客身分體驗';
  const previewContent = GUEST_PREVIEW_LOOKUP[contextLabel || '快速體驗'] || GUEST_PREVIEW_LOOKUP['快速體驗'];

  return (
    <div
      className="flex-1 min-h-[100dvh] w-screen jelly-bg dark:bg-gradient-to-br dark:from-indigo-950 dark:via-purple-900 dark:to-slate-900 relative overflow-y-auto overflow-x-hidden transition-colors duration-500"
    >
      <div className="absolute top-[-8%] left-[-10%] h-[32rem] w-[32rem] rounded-full bg-fuchsia-300/18 blur-[96px] pointer-events-none" />
      <div className="absolute right-[-8%] top-[8%] h-[26rem] w-[26rem] rounded-full bg-cyan-300/18 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[18%] h-[24rem] w-[24rem] rounded-full bg-purple-300/14 blur-[84px] pointer-events-none" />

      <div className={`relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1040px] flex-col justify-center px-5 py-8 sm:px-6 sm:py-10 ${shouldShowGuestHero ? 'lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-5 lg:items-center' : 'max-w-[430px]'}`}>
        {shouldShowGuestHero && (
          <section className="mb-4 rounded-[34px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.52))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.10)] backdrop-blur-[18px] sm:p-6 lg:mb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-900 text-xl text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
                  ✈️
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">RoamJelly</div>
                  <div className="mt-1 text-[18px] font-black tracking-tight text-slate-900">{contextLabel || '快速體驗'}</div>
                </div>
              </div>
              <div className="rounded-full border border-slate-200/70 bg-white/75 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                Guest Preview
              </div>
            </div>

            <div className="mt-5 rounded-[28px] bg-slate-950/90 p-5 text-white shadow-[0_18px_44px_rgba(15,23,42,0.20)] border border-white/10">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-300">
                {previewContent.eyebrow}
              </div>
              <h1 className="mt-2 text-[28px] leading-tight font-black tracking-tight">
                {title || '先用訪客身分開始，喜歡再註冊也不遲'}
              </h1>
              <p className="mt-3 max-w-[48ch] text-[13px] font-semibold leading-relaxed text-slate-300">
                {description || '不用先設定正式帳號，先進去看功能、跑流程，覺得順手再把進度留下。'}
              </p>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]">
                <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="ml-auto text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{previewContent.panelLabel}</span>
                </div>
                <div className="space-y-3 p-4">
                  {previewContent.items.map((item) => (
                    <div key={`${item.label}-${item.title}`} className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{item.label}</div>
                          <div className="mt-1 text-[15px] font-black tracking-tight text-white">{item.title}</div>
                          <div className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-300">{item.meta}</div>
                        </div>
                        <div className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${item.toneClass}`}>
                          {item.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {guestFirst && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => void handleGuestLogin()}
                    disabled={loading}
                    className={`flex w-full items-center justify-center rounded-[22px] border-none bg-white px-5 py-4 text-slate-900 hover:bg-fuchsia-50 disabled:opacity-70 sm:flex-1 ${subtlePressableClass}`}
                  >
                    <span className="text-[14px] font-black tracking-[0.04em]">{resolvedGuestCtaLabel}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAuthCardExpanded(true)}
                    className={`flex items-center justify-center rounded-[22px] border border-white/12 bg-white/[0.06] px-5 py-4 text-white hover:bg-white/[0.11] sm:flex-1 ${subtlePressableClass}`}
                  >
                    <span className="text-[13px] font-black tracking-[0.04em]">改用帳號同步</span>
                  </button>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">不用密碼就能先試</span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">喜歡再綁正式帳號</span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">同步與保存留到下一步</span>
              </div>
            </div>
          </section>
        )}

        <div
          className={`rounded-[32px] border border-white/60 bg-white/70 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-[18px] flex flex-col relative overflow-hidden ${shouldShowGuestHero ? '' : 'mt-0'} ${pressableSurfaceClass}`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),transparent)]" />
          <div className="relative z-10 mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                {shouldShowGuestHero ? '同步帳號' : '登入 / 註冊'}
              </div>
              <div className="mt-2 text-[26px] font-black tracking-tight text-slate-900">
                {shouldShowGuestHero ? '保存進度與跨裝置同步' : '登入果凍漫遊'}
              </div>
              <div className="mt-2 text-[13px] font-semibold leading-relaxed text-slate-500">
                {shouldShowGuestHero ? '需要保存、同步或共編時再登入即可，前面的體驗不用重跑。' : '建立帳號後即可保存旅程、同步裝置與多人共編。'}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/70 bg-white/80 text-xl shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
              🔐
            </div>
          </div>

          {shouldShowGuestHero ? (
            <button
              type="button"
              onClick={() => setIsAuthCardExpanded((current) => !current)}
              className={`mb-1 flex items-center justify-between rounded-[24px] border border-white/70 bg-white/75 px-4 py-4 text-left hover:bg-white/90 ${subtlePressableClass}`}
            >
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  已有帳號或想同步進度
                </div>
                <div className="mt-1 text-[15px] font-black tracking-tight text-slate-800">
                  {isAuthCardExpanded ? '收起登入 / 註冊' : '展開登入 / 註冊'}
                </div>
                <div className="mt-1 text-[12px] font-semibold text-slate-500">
                  先逛流程也可以，需要保存再展開登入。
                </div>
              </div>
              <span
                className="ml-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white transition-transform"
                style={{ transform: isAuthCardExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                v
              </span>
            </button>
          ) : null}

          {(!shouldShowGuestHero || isAuthCardExpanded) && (
            <>
              {shouldShowGuestHero && (
                <div className="mb-5 mt-4 h-px w-full bg-white/70" />
              )}

              {/* Mode tabs */}
              <div
                className="flex flex-row mb-8 rounded-full p-1.5 shadow-inner"
                style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
              >
                {(['login', 'register'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    style={{
                      flex: 1,
                      paddingTop: 10, paddingBottom: 10,
                      borderRadius: 9999,
                      backgroundColor: mode === m ? '#ffffff' : 'transparent',
                      boxShadow: mode === m ? '0 4px 12px rgba(0, 0, 0, 0.05), border 1px solid rgba(255,255,255,0.8)' : 'none',
                      alignItems: 'center',
                      outline: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    className="flex justify-center appearance-none"
                  >
                    <span
                      style={{
                        fontWeight: mode === m ? '800' : '600',
                        color: mode === m ? '#d946ef' : '#94a3b8',
                        fontSize: 14,
                        letterSpacing: '0.05em'
                      }}
                    >
                      {m === 'login' ? '登入' : '註冊'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Username */}
              <div className="mb-4 flex flex-col">
                <span className="text-[13px] font-black tracking-widest text-slate-500 mb-1.5 ml-1 uppercase">使用者名稱</span>
                <input
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.9)',
                    borderRadius: 20,
                    paddingInline: 20,
                    paddingBlock: 14,
                    color: '#1e293b',
                    fontSize: 15,
                    fontWeight: '700'
                  }}
                  className="outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/50 transition-all shadow-sm"
                  placeholder="3–30 個英數字或底線"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>

              {/* Display name – register only */}
              {mode === 'register' && (
                <div className="mb-4 flex flex-col">
                  <span className="text-[13px] font-black tracking-widest text-slate-500 mb-1.5 ml-1 uppercase">暱稱（選填）</span>
                  <input
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.9)',
                      borderRadius: 20,
                      paddingInline: 20,
                      paddingBlock: 14,
                      color: '#1e293b',
                      fontSize: 15,
                      fontWeight: '700'
                    }}
                    className="outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/50 transition-all shadow-sm"
                    placeholder="顯示給其他成員的名稱"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              )}

              {/* Password */}
              <div className="mb-4 flex flex-col">
                <span className="text-[13px] font-black tracking-widest text-slate-500 mb-1.5 ml-1 uppercase">密碼</span>
                <input
                  type="password"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.9)',
                    borderRadius: 20,
                    paddingInline: 20,
                    paddingBlock: 14,
                    color: '#1e293b',
                    fontSize: 15,
                    fontWeight: '700'
                  }}
                  className="outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/50 transition-all shadow-sm"
                  placeholder="至少 8 個字元"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Confirm password – register only */}
              {mode === 'register' && (
                <div className="mb-4 flex flex-col">
                  <span className="text-[13px] font-black tracking-widest text-slate-500 mb-1.5 ml-1 uppercase">確認密碼</span>
                  <input
                    type="password"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.9)',
                      borderRadius: 20,
                      paddingInline: 20,
                      paddingBlock: 14,
                      color: '#1e293b',
                      fontSize: 15,
                      fontWeight: '700'
                    }}
                    className="outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/50 transition-all shadow-sm"
                    placeholder="再次輸入密碼"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}

              {/* Error message */}
              {error ? (
                <div
                  className="mb-4 px-4 py-3 rounded-xl flex items-center bg-rose-50/80 border border-rose-200"
                >
                  <span className="text-rose-600 text-[13px] font-bold">{error}</span>
                </div>
              ) : null}

              {/* Submit */}
              <button
                onClick={() => void handleSubmit()}
                disabled={loading}
                className={`flex justify-center border-none appearance-none cursor-pointer outline-none transition-all active:scale-95 shadow-[0_8px_16px_rgb(217,70,239,0.25)] ${loading ? 'bg-fuchsia-300 shadow-none' : 'bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:opacity-90'}`}
                style={{
                  paddingTop: 16, paddingBottom: 16,
                  borderRadius: 24,
                  alignItems: 'center',
                  marginTop: 8
                }}
              >
                {loading ? (
                  <span style={{ color: 'white', fontWeight: '800' }}>處理中...</span>
                ) : (
                  <span style={{ color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: '0.05em' }}>
                    {mode === 'login' ? '登入' : '建立帳號'}
                  </span>
                )}
              </button>

              {!guestFirst && (
                <button
                  onClick={() => void handleGuestLogin()}
                  disabled={loading}
                  className="flex justify-center border appearance-none cursor-pointer outline-none transition-all active:scale-95 w-full bg-white/70 border-slate-200 hover:bg-white mt-3"
                  style={{
                    paddingTop: 14,
                    paddingBottom: 14,
                    borderRadius: 24,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#475569', fontWeight: '900', fontSize: 14, letterSpacing: '0.04em' }}>
                    {resolvedGuestCtaLabel}
                  </span>
                </button>
              )}

              {onCancel && (
                <button
                  onClick={onCancel}
                  disabled={loading}
                  style={{
                    marginTop: 12,
                    paddingTop: 14, paddingBottom: 14,
                    borderRadius: 24,
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                  }}
                  className="flex justify-center border-none appearance-none cursor-pointer outline-none hover:bg-black/5 transition-all active:scale-95"
                >
                  <span style={{ color: '#64748b', fontWeight: '800', fontSize: 14, letterSpacing: '0.05em' }}>取消</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
