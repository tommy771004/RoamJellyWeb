import { useEffect, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { AiJobState } from '../lib/aiJobApi';
import { IOS_EASE } from '../lib/motionTokens';

type GenerationState = AiJobState | 'preparing' | 'sync-fallback' | null;

/** Seconds since the component mounted, ticking once a second. */
function useElapsedSeconds(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return seconds;
}

/**
 * Wait screen while the AI drafts an itinerary (usually 20–60s on the free
 * models). Shows which stage is running, how long it has been, and — once the
 * wait gets long — that this is normal, so a slow answer never reads as a
 * frozen page.
 */
export default function AiLoadingState({ jobState = null }: { jobState?: GenerationState }) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const elapsed = useElapsedSeconds();

  const statusText = jobState === 'queued'
    ? t('ai_loading.queued', '草稿已排入背景工作，正在等待執行。')
    : jobState === 'running'
      ? t('ai_loading.running', 'AI 正在整理路線、停留時間與交通節奏。')
      : jobState === 'sync-fallback'
        ? t('ai_loading.sync_fallback', '背景工作暫時不可用，已切換為即時產生。')
        : t('ai_loading.preparing', '正在建立旅程草稿與安全的背景工作。');

  const patienceText = elapsed >= 45
    ? t('ai_loading.patience_long', '模型正在排隊，比平常久一些；完成後會自動顯示，不需要重新送出。')
    : elapsed >= 20
      ? t('ai_loading.patience', '通常需要 20–60 秒，請稍候。')
      : null;

  const activeIndex = jobState === 'running' || jobState === 'sync-fallback' ? 1 : jobState === 'completed' ? 2 : 0;
  const stages = [
    [t('ai_loading.stage_request', '建立任務'), t('ai_loading.stage_request_desc', '保留你的目的地與偏好')],
    [t('ai_loading.stage_generate', '生成路線'), t('ai_loading.stage_generate_desc', '整理每天可實際行走的節奏')],
    [t('ai_loading.stage_finish', '完成草稿'), t('ai_loading.stage_finish_desc', '寫回行程並開放逐站調整')],
  ];

  return (
    <main className="flex h-full w-full items-center justify-center overflow-y-auto bg-[#eef2ed] px-4 py-10 text-[#26342d] dark:bg-[#17221c] dark:text-white">
      <motion.section
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0.16 : 0.36, ease: IOS_EASE }}
        className="w-full max-w-3xl bg-white/85 p-7 [clip-path:polygon(18px_0,100%_0,100%_calc(100%_-_18px),calc(100%_-_18px)_100%,0_100%,0_18px)] dark:bg-[#243229] sm:p-10"
      >
        <div className="flex items-start gap-4">
          <LoaderCircle className="mt-1 shrink-0 animate-spin text-[#9a452e] dark:text-[#d59a85]" size={25} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-[32px] font-black leading-[1.1] tracking-[-0.035em] text-[#26342d] dark:text-white sm:text-[44px]">
              {t('ai_loading.title', '正在建立可編輯的行程草稿')}
            </h1>
            <p role="status" aria-live="polite" className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#5b675f] dark:text-[#c8d2cb] sm:text-base">
              {statusText}
            </p>
          </div>
          <span
            className="mt-2 flex-none rounded-full bg-[#eef2ed] px-2.5 py-1 text-xs font-black tabular-nums text-[#5b675f] dark:bg-white/10 dark:text-[#c8d2cb]"
            aria-label={t('ai_loading.elapsed', { defaultValue: '已等待 {{seconds}} 秒', seconds: elapsed })}
          >
            {elapsed}s
          </span>
        </div>

        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          {stages.map(([title, description], index) => {
            const isActive = index === activeIndex;
            const isComplete = index < activeIndex;
            return (
              <li
                key={title}
                aria-current={isActive ? 'step' : undefined}
                className={`relative min-h-[108px] overflow-hidden rounded-[12px] p-4 transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive
                    ? 'bg-[#26342d] text-white dark:bg-[#d59a85] dark:text-[#1d2620]'
                    : isComplete
                      ? 'bg-[#dce5de] text-[#26342d] dark:bg-[#2f4136] dark:text-white'
                      : 'bg-[#eef2ed] text-[#657269] dark:bg-white/5 dark:text-[#9fb0a5]'
                }`}
              >
                <p className="flex items-center gap-1.5 text-sm font-black">
                  {isComplete && (
                    <motion.span
                      initial={prefersReducedMotion ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                      className="inline-flex"
                      aria-hidden="true"
                    >
                      <Check size={15} strokeWidth={3} />
                    </motion.span>
                  )}
                  {title}
                </p>
                <p className={`mt-2 text-xs font-semibold leading-5 ${isActive ? 'opacity-85' : ''}`}>{description}</p>
                {/* The running stage carries a moving bar, so it is visibly alive
                    even when the status text has not changed for a while. */}
                {isActive && !prefersReducedMotion && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-[3px] w-1/3 rounded-full bg-white/70 dark:bg-[#1d2620]/50"
                    initial={{ x: '-100%' }}
                    animate={{ x: '300%' }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </li>
            );
          })}
        </ol>

        <p className="mt-6 min-h-5 text-xs font-semibold leading-5 text-[#77827b] dark:text-[#aebbb2]">
          {patienceText ?? t('ai_loading.keep_open', '你可以保持此頁開啟。工作完成後會自動顯示草稿。')}
        </p>
      </motion.section>
    </main>
  );
}
