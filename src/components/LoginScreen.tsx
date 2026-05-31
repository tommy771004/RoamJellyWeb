import { useEffect, useState, type ComponentType } from 'react';
import { createGuestSession, loginUser, registerUser, setClientAccessToken } from '../lib/workflowApi';
import { pressableSurfaceClass, subtlePressableClass } from '../lib/motionTokens';
import { ArrowRight, ChevronDown, Compass, LockKeyhole, Luggage, NotebookText, Sparkles } from 'lucide-react';
import InfoPeekModal, { type InfoPeekContent, type InfoPeekTone } from './InfoPeekModal';

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

type PreviewIcon = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

const GUEST_PREVIEW_LOOKUP: Record<string, { eyebrow: string; panelLabel: string; icon: PreviewIcon; items: GuestPreviewItem[] }> = {
  'AI 旅程規劃': {
    eyebrow: '先起草旅程，再決定何時同步帳號',
    panelLabel: 'AI Draft Preview',
    icon: Sparkles,
    items: [
      { label: 'Draft', title: '東京 5 天・城市散步與咖啡店', meta: '建立初步節奏與大綱，細節之後再慢慢補。', value: 'AI First', toneClass: 'border-sky-300/30 bg-sky-400/16 text-sky-100' },
      { label: 'Focus', title: '慢節奏 / 雨備 / 一人旅行', meta: '先確認大方向，隨時可以保存與同步。', value: '3 tags', toneClass: 'border-white/15 bg-white/10 text-slate-100' },
      { label: 'Output', title: '自動生成草稿，彈性調整', meta: '後續能繼續拖拉排序、補上航班或與旅伴共編。', value: 'Editable', toneClass: 'border-orange-300/30 bg-orange-300/16 text-orange-100' },
    ],
  },
  '你的行程': {
    eyebrow: '先接回旅程主線，再決定何時保存同步',
    panelLabel: 'Trip Notebook Preview',
    icon: NotebookText,
    items: [
      { label: 'Notebook', title: 'Day 2 ・ 淺草 -> 上野 -> 神保町', meta: '透過拖拉順序，輕鬆排定流暢的路線。', value: '3 stops', toneClass: 'border-sky-300/30 bg-sky-400/16 text-sky-100' },
      { label: 'Pocket List', title: '旅遊事實與口袋名單', meta: '收藏與 AI 建議，全都集中於同一份行程草稿。', value: 'Ready', toneClass: 'border-emerald-300/30 bg-emerald-400/16 text-emerald-100' },
      { label: 'Collab', title: '跨裝置登入，隨時同步', meta: '先將主線確立，需要跨裝置或共編時再登入雲端。', value: 'Sync later', toneClass: 'border-orange-300/30 bg-orange-300/16 text-orange-100' },
    ],
  },
  '旅途工具包': {
    eyebrow: '先綁一趟旅程，工具包才有完整上下文',
    panelLabel: 'Tools Preview',
    icon: Luggage,
    items: [
      { label: 'Weather', title: '東京 24°C ・ 降雨機率 20%', meta: '掌握即時天氣，輕鬆決定出門穿搭與裝備。', value: 'Live', toneClass: 'border-sky-300/30 bg-sky-400/16 text-sky-100' },
      { label: 'Checklist', title: '行李清單 6 / 9 完成', meta: '快速勾選待辦事項，確保不會遺漏任何物品。', value: '6/9', toneClass: 'border-emerald-300/30 bg-emerald-400/16 text-emerald-100' },
      { label: 'Split', title: '晚餐與車資已拆帳', meta: '隨手紀錄旅伴花費與分帳，事後結算不遺漏。', value: 'TWD 1,250', toneClass: 'border-orange-300/30 bg-orange-300/16 text-orange-100' },
    ],
  },
  '快速體驗': {
    eyebrow: '不用先註冊，先把整條旅程流程跑順',
    panelLabel: 'Quick Preview',
    icon: Compass,
    items: [
      { label: 'Explore', title: '探索各項功能與示範行程', meta: '快速確認是否符合你的旅遊規劃習慣。', value: 'Start', toneClass: 'border-sky-300/30 bg-sky-400/16 text-sky-100' },
      { label: 'Draft', title: '免登入即刻起草', meta: '訪客模式直接體驗行程規劃與旅途工具。', value: 'Flow', toneClass: 'border-white/15 bg-white/10 text-slate-100' },
      { label: 'Save', title: '覺得滿意再綁定保存', meta: '無需馬上註冊，確定好用再登入同步資料。', value: 'Later', toneClass: 'border-orange-300/30 bg-orange-300/16 text-orange-100' },
    ],
  },
};

const getPreviewTone = (toneClass: string): InfoPeekTone => {
  if (toneClass.includes('emerald')) return 'emerald';
  if (toneClass.includes('orange')) return 'orange';
  if (toneClass.includes('pink')) return 'pink';
  if (toneClass.includes('cyan')) return 'cyan';
  return 'sky';
};

const buildPreviewDetails = (context: string, item: GuestPreviewItem): string[] => {
  if (context === '旅途工具包') {
    return [
      item.meta,
      '先用訪客旅程把流程跑順，真的要保存歷史或同步時再接上帳號。',
    ];
  }
  if (context === '你的行程') {
    return [
      item.meta,
      '主線順手之後，再決定要不要同步裝置與保留編修紀錄。',
    ];
  }
  if (context === 'AI 旅程規劃') {
    return [
      item.meta,
      '先讓 AI 起草一版，再看要不要把這份草稿正式保存下來。',
    ];
  }
  return [
    item.meta,
    '先把整條旅程流程摸順，再決定要不要進入註冊與同步。',
  ];
};

export default function LoginScreen({ onLogin, onCancel, guestFirst = false, contextLabel, title, description, guestCtaLabel }: Props) {
  const shouldShowGuestHero = guestFirst || Boolean(title) || Boolean(description);
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState('🐶');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthCardExpanded, setIsAuthCardExpanded] = useState(!shouldShowGuestHero);
  const [isPreviewItemsExpanded, setIsPreviewItemsExpanded] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  );
  const [activePreviewInfo, setActivePreviewInfo] = useState<InfoPeekContent | null>(null);

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
          : await registerUser(trimmedUser, password, displayName.trim() || trimmedUser, avatar);
          
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
  const HeroIcon = previewContent.icon;

  return (
    <div className="relative flex-1 w-full overflow-y-auto overflow-x-hidden bg-gradient-to-tr from-slate-50 via-[#fdfcfd] to-sky-50/50 dark:bg-gradient-to-br dark:from-[#030712] dark:via-slate-950 dark:to-[#0f172a] transition-colors duration-500">
      {onCancel && (
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 z-50 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-slate-900/5 dark:bg-white/10 text-slate-500 dark:text-slate-400 backdrop-blur-md transition-all hover:bg-slate-900/10 dark:hover:bg-white/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      )}
      {/* Drifting backdrop spheres with variable speeds and directions */}
      <div className="pointer-events-none absolute top-[-10%] left-[-15%] h-[36rem] w-[36rem] rounded-full bg-sky-200/35 dark:bg-sky-500/5 blur-[120px] animate-cute-bounce [animation-duration:18s]" />
      <div className="pointer-events-none absolute right-[-10%] top-[10%] h-[30rem] w-[30rem] rounded-full bg-pink-200/40 dark:bg-fuchsia-500/5 blur-[110px] animate-cute-bounce [animation-delay:3s] [animation-duration:22s]" />
      <div className="pointer-events-none absolute bottom-[-15%] left-[15%] h-[28rem] w-[28rem] rounded-full bg-orange-100/35 dark:bg-orange-600/5 blur-[100px] animate-cute-bounce [animation-delay:6s] [animation-duration:26s]" />

      <div className={`relative z-10 mx-auto flex min-h-full w-full max-w-[1040px] flex-col justify-center px-3 pt-5 pb-7 sm:px-6 sm:py-9 ${shouldShowGuestHero ? 'lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-5 lg:items-center' : 'max-w-[430px]'}`}>
        {shouldShowGuestHero && (
          <section className="mb-4 rounded-[32px] glass-panel border border-white/70 dark:border-white/10 p-4 shadow-[0_24px_50px_rgba(15,23,42,0.06)] backdrop-blur-[24px] sm:p-5 lg:mb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[17px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.16)]">
                  <HeroIcon size={20} strokeWidth={2.35} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">RoamJelly</div>
                  <div className="mt-1 text-[17px] font-black tracking-[-0.03em] text-slate-900 dark:text-white">{contextLabel || '快速體驗'}</div>
                </div>
              </div>
              <div className="rounded-full border border-sky-200/80 dark:border-sky-500/20 bg-sky-50/90 dark:bg-sky-950/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                Guest First
              </div>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(135deg,#0b2940_0%,#101827_54%,#5b2c24_100%)] p-4 sm:p-4.5 text-white shadow-[0_15px_34px_rgba(15,23,42,0.18)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_38%)]" />
              <div className="relative">
                <div className="text-[10px] font-black uppercase tracking-[0.26em] text-sky-200/90">
                  {previewContent.eyebrow}
                </div>
                <h1 className="mt-2 text-[23px] sm:text-[27px] leading-[1.08] font-black tracking-[-0.04em] text-balance">
                  {title || '先用訪客身分開始，喜歡再註冊也不遲'}
                </h1>
                <p className="mt-2.5 max-w-[44ch] text-[13px] font-medium leading-[1.68] text-slate-300">
                  {description || '不用先設定正式帳號，先進去看功能、跑流程，覺得順手再把進度留下。'}
                </p>

                                {/* Cute replacement for the old accordion */}
                <div className="mt-5 flex items-center justify-center p-3 sm:p-5 rounded-[22px] border border-white/10 bg-white/5 backdrop-blur-sm">
                  <div className="text-center space-y-2">
                    <p className="text-[14px] sm:text-[15px] font-black tracking-wide text-white">
                      ✨ 點擊體驗，我們直接出發！
                    </p>
                    <p className="text-[12px] opacity-80 text-sky-100 font-medium tracking-wide">
                      (不會留下任何包袱)
                    </p>
                  </div>
                </div>
              </div>

              {guestFirst && (
                  <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                    <button
                      onClick={() => void handleGuestLogin()}
                      disabled={loading}
                      className={`flex w-full items-center justify-center gap-2 clay-btn bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-5 py-3.5 disabled:opacity-70 sm:flex-1 transition-all duration-300 ios-press`}
                    >
                      <span className="text-[13px] font-black tracking-[0.04em]">{resolvedGuestCtaLabel}</span>
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAuthCardExpanded(true)}
                      className={`flex items-center justify-center rounded-[20px] border border-white/12 bg-white/[0.06] px-5 py-3.5 text-white hover:-translate-y-0.5 hover:bg-white/[0.12] sm:flex-1 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ios-press`}
                    >
                      <span className="text-[12px] font-black tracking-[0.06em]">改用帳號同步</span>
                    </button>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">不用密碼就能先試</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">喜歡再綁正式帳號</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">同步與保存留到下一步</span>
                </div>
              </div>
          </section>
        )}

        <div
          className={`rounded-[30px] glass-panel border border-white/70 dark:border-white/10 p-6 shadow-[0_24px_50px_rgba(15,23,42,0.06)] flex flex-col relative overflow-hidden ${shouldShowGuestHero ? '' : 'mt-0'} ${pressableSurfaceClass}`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative z-10 mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {shouldShowGuestHero ? '同步帳號' : '登入 / 註冊'}
              </div>
              <div className="mt-2 text-[24px] font-black tracking-[-0.04em] text-slate-900 dark:text-white">
                {shouldShowGuestHero ? '保存進度與跨裝置同步' : '登入果凍漫遊'}
              </div>
              <div className="mt-2 text-[13px] font-semibold leading-[1.62] text-slate-500 dark:text-slate-400">
                {shouldShowGuestHero ? '需要保存、同步或共編時再登入即可，前面的體驗不用重跑。' : '建立帳號後即可保存旅程、同步裝置與多人共編。'}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-[17px] border border-slate-200/90 dark:border-white/10 bg-slate-50/95 dark:bg-white/10 text-slate-700 dark:text-slate-200 shadow-[0_8px_18px_rgba(15,23,42,0.06)] dark:shadow-none">
              <LockKeyhole size={20} strokeWidth={2.3} />
            </div>
          </div>

          {shouldShowGuestHero ? (
            <button
              type="button"
              onClick={() => setIsAuthCardExpanded((current) => !current)}
              className={`mb-1 flex items-center justify-between rounded-[22px] border border-white/70 dark:border-white/10 bg-white/78 dark:bg-black/20 px-4 py-3.5 text-left hover:bg-white/90 dark:hover:bg-black/30 ${subtlePressableClass}`}
            >
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  已有帳號或想同步進度
                </div>
                <div className="mt-1 text-[14px] font-black tracking-[-0.03em] text-slate-800 dark:text-white">
                  {isAuthCardExpanded ? '收起登入 / 註冊' : '展開登入 / 註冊'}
                </div>
                <div className="mt-1 text-[12px] font-semibold leading-[1.55] text-slate-500 dark:text-slate-400">
                  先逛流程也可以，需要保存再展開登入。
                </div>
              </div>
              <span
                className="ml-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 transition-transform shrink-0 shadow-[0_8px_18px_rgba(15,23,42,0.14)]"
                style={{ transform: isAuthCardExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                <ArrowRight size={16} strokeWidth={2.8} />
              </span>
            </button>
          ) : null}

          {(!shouldShowGuestHero || isAuthCardExpanded) && (
            <>
              {shouldShowGuestHero && (
                <div className="mb-5 mt-4 h-px w-full bg-white/70 dark:bg-white/10" />
              )}

              {/* Mode tabs */}
              <div className="mb-6 flex flex-row rounded-full border border-white/60 dark:border-white/10 bg-white/40 dark:bg-black/30 backdrop-blur-md p-1 shadow-[inset_0_1px_2.5px_rgba(255,255,255,0.4)] dark:shadow-none transition-colors">
                {(['login', 'register'] as Mode[]).map((m) => {
                  const isActive = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className={`flex-1 flex justify-center items-center py-2 rounded-full appearance-none outline-none border-none cursor-pointer transition-all duration-300 ${
                        isActive
                          ? 'bg-white dark:bg-white/12 text-sky-700 dark:text-sky-300 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-none'
                          : 'bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <span className="text-[13px] font-black tracking-[0.08em]">
                        {m === 'login' ? '登入' : '註冊'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Username */}
              <div className="mb-4 flex flex-col">
                <span className="mb-1.5 ml-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">使用者名稱</span>
                <input
                  className="outline-none w-full bg-white/40 dark:bg-black/35 backdrop-blur-md rounded-[20px] border border-white/60 dark:border-white/20 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-black/45 focus:bg-white/70 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-400/60 transition-all px-[18px] py-[13px] text-sm font-bold shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                  placeholder="3–30 個英數字或底線"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>

              {/* Display name and Avatar – register only */}
              {mode === 'register' && (
                <div className="flex flex-col">
                  <div className="mb-4 flex flex-col">
                    <span className="mb-1.5 ml-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">選擇旅伴頭像</span>
                    <div className="flex flex-wrap gap-2 rounded-[20px] border border-white/50 dark:border-white/10 bg-white/30 dark:bg-black/20 p-2 backdrop-blur-sm">
                      {['🐶', '🐱', '🦊', '🐰', '🐼', '🐨', '🐻', '🐯'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setAvatar(emoji)}
                          className={`w-10 h-10 text-2xl flex items-center justify-center rounded-full transition-all ${avatar === emoji ? 'bg-sky-100/80 dark:bg-sky-950/60 ring-2 ring-sky-400 dark:ring-sky-400 scale-110 shadow-sm' : 'hover:bg-white/40 dark:hover:bg-white/5 hover:scale-105'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4 flex flex-col">
                    <span className="mb-1.5 ml-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">暱稱（選填）</span>
                    <input
                      className="outline-none w-full bg-white/40 dark:bg-black/35 backdrop-blur-md rounded-[20px] border border-white/60 dark:border-white/20 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-black/45 focus:bg-white/70 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-400/60 transition-all px-[18px] py-[13px] text-sm font-bold shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                      placeholder="顯示給其他成員的名稱"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoComplete="name"
                      maxLength={50}
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="mb-4 flex flex-col">
                <span className="mb-1.5 ml-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">密碼</span>
                <input
                  type="password"
                  className="outline-none w-full bg-white/40 dark:bg-black/35 backdrop-blur-md rounded-[20px] border border-white/60 dark:border-white/20 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-black/45 focus:bg-white/70 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-400/60 transition-all px-[18px] py-[13px] text-sm font-bold shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                  placeholder="至少 8 個字元"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {/* Confirm password – register only */}
              {mode === 'register' && (
                <div className="mb-4 flex flex-col">
                  <span className="mb-1.5 ml-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">確認密碼</span>
                  <input
                    type="password"
                    className="outline-none w-full bg-white/40 dark:bg-black/35 backdrop-blur-md rounded-[20px] border border-white/60 dark:border-white/20 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 hover:bg-white/60 dark:hover:bg-black/45 focus:bg-white/70 dark:focus:bg-black/45 focus:ring-4 focus:ring-sky-400/30 dark:focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-400/60 transition-all px-[18px] py-[13px] text-sm font-bold shadow-sm shadow-slate-100/50 dark:shadow-black/50"
                    placeholder="再次輸入密碼"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              )}

              {/* Error message */}
              {error ? (
                <div
                  className="mb-4 flex items-center rounded-[18px] border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 px-4 py-3"
                >
                  <span className="text-rose-600 dark:text-rose-400 text-[13px] font-bold">{error}</span>
                </div>
              ) : null}

              {/* Submit */}
              <button
                onClick={() => void handleSubmit()}
                disabled={loading}
                className={`flex justify-center items-center py-3.5 mt-2 clay-btn appearance-none cursor-pointer transition-all duration-300 ios-press focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/45 ${loading ? "bg-sky-300 dark:bg-sky-950 text-white/70" : "bg-gradient-to-r from-sky-400 to-sky-500 hover:opacity-95"}`}
              >
                {loading ? (
                  <span className="text-white font-[800]">處理中…</span>
                ) : (
                  <span className="text-white font-[900] text-sm sm:text-base tracking-[0.06em]">
                    {mode === 'login' ? '登入' : '建立帳號'}
                  </span>
                )}
              </button>

              {!guestFirst && (
                <button
                  onClick={() => void handleGuestLogin()}
                  disabled={loading}
                  className="mt-3 flex w-full justify-center items-center py-3 rounded-[22px] border border-slate-200 dark:border-white/10 appearance-none cursor-pointer transition-all ios-press bg-white/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-white/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/45"
                >
                  <span className="font-[900] text-xs sm:text-sm tracking-[0.05em]">
                    {resolvedGuestCtaLabel}
                  </span>
                </button>
              )}

              {onCancel && (
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="mt-2.5 flex justify-center items-center py-3 rounded-[22px] border-none appearance-none cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all ios-press bg-transparent text-slate-500 dark:text-slate-400"
                >
                  <span className="font-[800] text-sm tracking-[0.05em]">取消</span>
                </button>
              )}
            </>
          )}
        </div>

        <InfoPeekModal
          open={!!activePreviewInfo}
          content={activePreviewInfo}
          onClose={() => setActivePreviewInfo(null)}
        />
      </div>
    </div>
  );
}
