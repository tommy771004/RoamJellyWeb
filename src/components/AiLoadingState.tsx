import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AiJobState } from '../lib/aiJobApi';

type GenerationState = AiJobState | 'preparing' | 'sync-fallback' | null;

export default function AiLoadingState({ jobState = null }: { jobState?: GenerationState }) {
  const { t } = useTranslation();
  const statusText = jobState === 'queued'
    ? t('ai_loading.queued', '草稿已排入背景工作，正在等待執行。')
    : jobState === 'running'
      ? t('ai_loading.running', 'AI 正在整理路線、停留時間與交通節奏。')
      : jobState === 'sync-fallback'
        ? t('ai_loading.sync_fallback', '背景工作暫時不可用，已切換為即時產生。')
        : t('ai_loading.preparing', '正在建立旅程草稿與安全的背景工作。');

  return (
    <main className="flex h-full w-full items-center justify-center overflow-y-auto bg-[#eef2ed] px-4 py-10 text-[#26342d] dark:bg-[#17221c] dark:text-white">
      <section className="w-full max-w-3xl bg-white/85 p-7 [clip-path:polygon(18px_0,100%_0,100%_calc(100%_-_18px),calc(100%_-_18px)_100%,0_100%,0_18px)] dark:bg-[#243229] sm:p-10">
        <div className="flex items-start gap-4">
          <LoaderCircle className="mt-1 shrink-0 animate-spin text-[#9a452e]" size={25} aria-hidden="true" />
          <div>
            <h1 className="font-heading text-[32px] font-black leading-[1.1] tracking-[-0.035em] text-[#26342d] dark:text-white sm:text-[44px]">
              {t('ai_loading.title', '正在建立可編輯的行程草稿')}
            </h1>
            <p role="status" aria-live="polite" className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#5b675f] dark:text-[#c8d2cb] sm:text-base">
              {statusText}
            </p>
          </div>
        </div>

        <dl className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            [t('ai_loading.stage_request', '建立任務'), t('ai_loading.stage_request_desc', '保留你的目的地與偏好')],
            [t('ai_loading.stage_generate', '生成路線'), t('ai_loading.stage_generate_desc', '整理每天可實際行走的節奏')],
            [t('ai_loading.stage_finish', '完成草稿'), t('ai_loading.stage_finish_desc', '寫回行程並開放逐站調整')],
          ].map(([title, description], index) => {
            const activeIndex = jobState === 'running' || jobState === 'sync-fallback' ? 1 : jobState === 'completed' ? 2 : 0;
            const isActive = index === activeIndex;
            const isComplete = index < activeIndex;
            return (
              <div
                key={title}
                className="min-h-[108px] rounded-[12px] p-4"
                style={{
                  backgroundColor: isActive ? '#26342d' : isComplete ? '#dce5de' : '#eef2ed',
                  color: isActive ? '#ffffff' : isComplete ? '#26342d' : '#657269',
                }}
              >
                <dt className="text-sm font-black">{title}</dt>
                <dd className="mt-2 text-xs font-semibold leading-5" style={{ color: isActive ? '#dce5de' : undefined }}>{description}</dd>
              </div>
            );
          })}
        </dl>

        <p className="mt-6 text-xs font-semibold leading-5 text-[#77827b] dark:text-[#aebbb2]">
          {t('ai_loading.keep_open', '你可以保持此頁開啟。工作完成後會自動顯示草稿。')}
        </p>
      </section>
    </main>
  );
}
