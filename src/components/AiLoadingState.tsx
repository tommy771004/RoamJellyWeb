import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTypewriter } from '../lib/useTypewriter';

const MESSAGES = [
  '正在打包行李，替今天塞進剛剛好的節奏...',
  '正在幫你喬靠窗座位，避開太硬的移動路線...',
  '正在請教在地老饕，看哪一站最值得停久一點...',
  '正在注入您的靈魂偏好，篩選完美景點...',
  '正在把交通、景點與休息點排成順手的旅途節拍...',
  '正在為您預訂最舒適的旅遊體驗...',
];

function TypewriterMessage({ text }: { text: string }) {
  const { displayed, done } = useTypewriter(text, 36);
  return (
    <span>
      {displayed}
      <span
        className={`inline-block w-[2px] h-[1em] ml-[1px] align-middle bg-current ${done ? 'opacity-0' : 'animate-pulse'}`}
      />
    </span>
  );
}

export default function AiLoadingState() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const int = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3200);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="relative z-50 flex h-full w-full flex-1 flex-col items-center justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(255,249,251,0.70),rgba(241,248,255,0.72))] px-4 py-8 backdrop-blur-3xl">
      <div className="absolute left-1/2 top-1/2 h-[120vw] max-h-[760px] w-[120vw] max-w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-300/24 blur-[132px] animate-pulse transform-gpu" style={{ animationDuration: '4s', willChange: 'opacity' }} />
      <div className="absolute left-1/3 top-1/3 h-[78vw] max-h-[560px] w-[78vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/20 blur-[96px] animate-pulse transform-gpu" style={{ animationDuration: '3s', animationDelay: '1s', willChange: 'opacity' }} />

      <div className="relative z-10 flex w-full max-w-[460px] flex-col items-center gap-8 rounded-[30px] border border-white/88 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,250,251,0.72),rgba(241,248,255,0.72))] px-5 py-7 shadow-[0_18px_40px_rgba(15,23,42,0.10)] backdrop-blur-[24px] sm:px-7 sm:py-8">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center rounded-full border border-fuchsia-200/80 bg-fuchsia-50/88 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-700">
            AI Is Crafting
          </span>
          <span className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/84 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-700">
            Editable Draft
          </span>
        </div>
        <div className="relative">
          <div className="absolute inset-0 scale-[1.9] rounded-full bg-fuchsia-400/28 blur-[36px] animate-pulse transform-gpu" style={{ animationDuration: '2s', willChange: 'opacity' }} />
          <div className="absolute inset-0 scale-[1.16] rounded-full border-[3px] border-fuchsia-200/70 opacity-50 animate-ping transform-gpu" style={{ animationDuration: '3s', willChange: 'transform, opacity' }} />
          <motion.div
            style={{ willChange: 'transform' }}
            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
            transition={{ rotate: { duration: 8, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
            className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border border-fuchsia-100 bg-white text-fuchsia-500 shadow-[0_16px_34px_rgba(217,70,239,0.18)] sm:h-28 sm:w-28"
          >
            <Sparkles size={52} strokeWidth={1.5} className="drop-shadow-sm sm:size-[56px]" />
          </motion.div>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Premium Jelly Planner</p>
          <h2 className="text-balance text-[20px] font-black leading-[1.12] tracking-[-0.04em] text-slate-900 sm:text-[24px]">
            正在把你的旅程排成更順手的第一版
          </h2>
          <p className="mx-auto max-w-[30ch] text-[13px] font-medium leading-[1.65] text-slate-500 sm:max-w-[34ch]">
            會先整理節奏、交通與停留密度，產出之後還能回手帳再慢慢微調。
          </p>
        </div>

        <div aria-live="polite" aria-atomic="true" className="flex min-h-[3.5rem] max-w-xs flex-col items-center justify-center px-3 text-center sm:max-w-sm">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
              transition={{ duration: 0.35 }}
              className="bg-gradient-to-r from-fuchsia-600 to-sky-600 bg-clip-text text-[18px] font-black leading-[1.35] tracking-[-0.04em] text-transparent drop-shadow-sm sm:text-[22px]"
            >
              <TypewriterMessage text={MESSAGES[msgIndex]} />
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          <span className="h-2 w-2 rounded-full bg-fuchsia-300" />
          <span className="h-2 w-2 rounded-full bg-sky-300" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          草稿完成後可直接回手帳調整
        </div>
      </div>
    </div>
  );
}
