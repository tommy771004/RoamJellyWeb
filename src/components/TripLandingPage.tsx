import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CircleHelp,
  Loader2,
  MapPin,
  PlaneTakeoff,
  Users,
} from 'lucide-react';
import { Input } from './ui/input';
import {
  createGuestSession,
  fetchTripPreview,
  getStoredToken,
  joinTrip,
} from '../lib/workflowApi';
import { cn } from '../lib/utils';

interface TripPreview {
  trip_id: string;
  name: string;
  destination: string;
  days: number;
}

interface Props {
  tripId: string;
  onJoined: () => void;
}

const JOIN_HIGHLIGHTS = [
  {
    icon: PlaneTakeoff,
    label: '行程加入',
    description: '一鍵加入後，直接接上這趟旅程的共編節奏。',
  },
  {
    icon: CalendarDays,
    label: '共同編輯',
    description: '後續可以一起補完日期、景點與待辦安排。',
  },
  {
    icon: Users,
    label: '旅伴同步',
    description: '天氣、清單與分帳工具都會跟著這趟旅程同步。',
  },
] as const;

export default function TripLandingPage({ tripId, onJoined }: Props) {
  const [tripInfo, setTripInfo] = useState<TripPreview | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [nickname, setNickname] = useState('');
  const prefersReducedMotion = useReducedMotion() ?? false;
  const requiresNickname = !getStoredToken();

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchTripPreview(tripId);
        setTripInfo(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('not found') || msg.includes('404')) {
          setNotFound(true);
        } else {
          setFetchError('無法載入旅程資訊，請稍後再試');
        }
      } finally {
        setFetching(false);
      }
    })();
  }, [tripId]);

  const handleJoin = async () => {
    setJoining(true);
    setJoinError('');
    try {
      if (!getStoredToken()) {
        const trimmed = nickname.trim();
        if (!trimmed) {
          throw new Error('請先輸入暱稱，才能加入旅程');
        }
        await createGuestSession(trimmed);
      }
      await joinTrip(tripId);
      onJoined();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '加入旅程失敗，請再試一次');
      setJoining(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-1 items-center justify-center overflow-hidden bg-slate-50 px-3.5 py-7 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.24),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(253,186,116,0.2),transparent_45%)]" />
      <div className="absolute -top-12 right-[-10%] h-64 w-64 rounded-full bg-sky-200/35 blur-3xl" />
      <div className="absolute bottom-[-12%] left-[-8%] h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />

      {fetching ? (
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: 'easeOut' }}
          className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4 rounded-[28px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.90),rgba(255,250,251,0.80),rgba(241,248,255,0.78))] px-5 py-6 text-center shadow-[0_14px_34px_rgba(14,165,233,0.10)] backdrop-blur-xl sm:px-6 sm:py-7"
          aria-live="polite"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-700">Shared Trip Invite</p>
            <h1 className="text-balance text-[24px] font-black tracking-[-0.04em] text-slate-900">正在同步旅程邀請</h1>
            <p className="text-pretty text-[13px] leading-[1.65] text-slate-600">
              RoamJelly 正在確認這份旅程的目的地、日期與共編權限。
            </p>
          </div>
        </motion.div>
      ) : notFound || fetchError ? (
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: 'easeOut' }}
          className="relative z-10 flex w-full max-w-md flex-col items-center rounded-[30px] border border-white/92 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,250,251,0.84),rgba(241,248,255,0.80))] px-5 py-6 text-center shadow-[0_14px_34px_rgba(15,23,42,0.09)] backdrop-blur-xl sm:px-6 sm:py-8"
        >
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            {notFound ? <CircleHelp size={28} /> : <AlertTriangle size={28} />}
          </div>
          <h1 className="text-balance text-[24px] font-black tracking-[-0.04em] text-slate-900">
            {notFound ? '找不到這份旅程邀請' : '旅程邀請暫時無法載入'}
          </h1>
          <p className="mt-3 max-w-sm text-pretty text-[13px] leading-[1.65] text-slate-600">
            {notFound ? '邀請連結可能已失效，或這趟旅程已停止分享。' : fetchError}
          </p>
          <a
            href="/"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition-colors hover:border-sky-200 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            返回首頁
          </a>
        </motion.div>
      ) : (
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-[440px]"
        >
          <div className="overflow-hidden rounded-[30px] border border-white/92 bg-[linear-gradient(180deg,rgba(255,255,255,0.90),rgba(255,250,251,0.80),rgba(241,248,255,0.78))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-700">
                  Shared Trip Invite
                </span>
                <p className="mt-3 text-[13px] font-bold leading-[1.55] text-slate-500">有人邀請你一起補完這趟旅程</p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-[18px] bg-orange-50 text-orange-500 shadow-[0_8px_18px_rgba(251,146,60,0.10)]">
                <PlaneTakeoff size={20} strokeWidth={2.4} />
              </div>
            </div>

            {tripInfo && (
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <h1 className="text-balance text-[23px] font-black tracking-[-0.045em] text-slate-900 sm:text-[32px]">
                    {tripInfo.name}
                  </h1>
                  <p className="text-pretty text-[13px] leading-[1.65] text-slate-600 sm:text-[14px]">
                    先加入這份旅程，你就可以直接查看目前的行程內容，接著再和旅伴一起補完清單、分帳與地圖動線。
                  </p>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-[22px] border border-white/84 bg-white/78 px-3.5 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                    <div className="flex size-10 items-center justify-center rounded-[14px] bg-sky-50 text-sky-600 shadow-sm">
                      <MapPin size={18} strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">目的地</p>
                      <p className="truncate text-[13px] font-bold text-slate-900 sm:text-[14px]">{tripInfo.destination}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-[22px] border border-white/84 bg-white/78 px-3.5 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                    <div className="flex size-10 items-center justify-center rounded-[14px] bg-orange-50 text-orange-500 shadow-sm">
                      <CalendarDays size={18} strokeWidth={2.4} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">旅程天數</p>
                      <p className="text-[13px] font-bold text-slate-900 sm:text-[14px]">{tripInfo.days} 天行程</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-2.5">
              {JOIN_HIGHLIGHTS.map(({ icon: Icon, label, description }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-[22px] border border-white/84 bg-white/76 px-3.5 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
                >
                  <div className="mt-0.5 flex size-9 items-center justify-center rounded-[14px] bg-sky-50 text-sky-600">
                    <Icon size={16} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[14px] font-black tracking-[-0.02em] text-slate-900">{label}</p>
                    <p className="mt-1 text-pretty text-[13px] leading-[1.55] text-slate-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            {joinError ? (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3" aria-live="polite">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" />
                <p className="text-pretty text-[13px] font-bold leading-5 text-rose-700">{joinError}</p>
              </div>
            ) : null}

            {requiresNickname && (
              <div className="mt-5 space-y-2.5">
                <label htmlFor="trip-guest-nickname" className="block text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  先輸入暱稱，再加入這趟旅程
                </label>
                <Input
                  id="trip-guest-nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例如：小美"
                  name="nickname"
                  autoComplete="nickname"
                  className="h-12 rounded-[20px] border-white/84 bg-white/86 text-[14px] font-bold text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.05)] focus-visible:ring-sky-300"
                  maxLength={32}
                />
              </div>
            )}

            <button
              onClick={() => void handleJoin()}
              disabled={joining}
              className={cn(
                'mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-black tracking-[0.08em] text-white transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92]',
                joining
                  ? 'cursor-not-allowed bg-sky-300 shadow-none'
                  : 'bg-gradient-to-r from-sky-500 to-orange-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_24px_rgba(14,165,233,0.35)] hover:-translate-y-0.5 hover:from-sky-600 hover:to-orange-500 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_28px_rgba(14,165,233,0.45)]',
              )}
            >
              {joining ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  處理中…
                </>
              ) : (
                <>
                  加入這趟旅程
                  <ArrowRight size={16} strokeWidth={2.6} />
                </>
              )}
            </button>

            <p className="mt-3 text-pretty text-[12px] leading-[1.55] text-slate-500">
              加入後即可接上這份旅程的共編內容；如果你是訪客，也不需要先完成完整註冊流程。
            </p>

            <a
              href="/"
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/84 bg-white/74 px-5 py-3 text-[14px] font-black text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92] hover:-translate-y-0.5 hover:border-sky-300/60 hover:text-sky-700 hover:shadow-[0_10px_20px_rgba(14,165,233,0.10)]"
            >
              先回首頁看看
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
