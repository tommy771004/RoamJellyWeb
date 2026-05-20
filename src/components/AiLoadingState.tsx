import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Compass, MapPin, Plane, CheckCircle2 } from 'lucide-react';
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

const STEPS = [
  { label: '解鎖靈魂偏好', icon: Compass },
  { label: '挑選老饕景點', icon: MapPin },
  { label: '對齊交通路線', icon: Plane },
  { label: '準備打包出發', icon: CheckCircle2 },
];

function TypewriterMessage({ text }: { text: string }) {
  const { displayed, done } = useTypewriter(text, 30);
  return (
    <span className="relative">
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className={`inline-block w-[3px] h-[1.1em] ml-[2px] align-middle bg-pink-500 shadow-[0_0_8px_rgba(244,114,182,0.8)] ${done ? 'opacity-0' : ''}`}
      />
    </span>
  );
}

export default function AiLoadingState() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const int = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3500);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Map elapsed seconds to step progress: 0-2s = step 0, 3-5s = step 1, 6-8s = step 2, 9s+ = step 3
  const currentStep = elapsed < 3 ? 0 : elapsed < 6 ? 1 : elapsed < 9 ? 2 : 3;

  return (
    <div className="relative z-50 flex h-full w-full flex-1 flex-col items-center justify-center overflow-hidden bg-slate-50/20 dark:bg-slate-950/20 px-4 py-8 backdrop-blur-3xl">
      {/* Organic floating background blobs */}
      <motion.div
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -50, 30, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute left-[5%] top-[15%] h-[280px] w-[280px] rounded-full bg-pink-400/15 blur-[90px] pointer-events-none transform-gpu"
        style={{ willChange: 'transform' }}
      />
      <motion.div
        animate={{
          x: [0, -30, 50, 0],
          y: [0, 40, -40, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute right-[5%] bottom-[15%] h-[320px] w-[320px] rounded-full bg-sky-400/15 blur-[100px] pointer-events-none transform-gpu"
        style={{ willChange: 'transform' }}
      />
      <motion.div
        animate={{
          x: [0, 20, -30, 0],
          y: [0, 30, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute left-[35%] top-[40%] h-[240px] w-[240px] rounded-full bg-purple-400/10 blur-[80px] pointer-events-none transform-gpu"
        style={{ willChange: 'transform' }}
      />

      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center gap-7 rounded-[32px] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 shadow-[0_20px_50px_rgba(244,114,182,0.12),_inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-3xl px-6 py-8 sm:px-8 sm:py-9 transition-all duration-300">
        
        {/* Modern Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center rounded-full border border-pink-200/50 bg-pink-50/60 dark:bg-pink-950/20 dark:border-pink-900/30 px-3.5 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-pink-600 dark:text-pink-400 shadow-sm">
            AI is Crafting
          </span>
          <span className="inline-flex items-center rounded-full border border-sky-200/50 bg-sky-50/60 dark:bg-sky-950/20 dark:border-sky-900/30 px-3.5 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400 shadow-sm">
            Jelly Engine
          </span>
        </div>

        {/* Central Floating Centerpiece with Neon Halos */}
        <div className="relative my-2">
          {/* Neon Pink/Cyan Ambient Glow */}
          <div className="absolute inset-[-20px] rounded-full bg-gradient-to-tr from-pink-500/20 to-sky-500/20 blur-[30px] animate-pulse-glow" />
          
          {/* Animated Outermost Halo */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-12px] rounded-full border border-dashed border-pink-400/40 dark:border-pink-500/20 transform-gpu"
          />

          {/* Animated Inner Halo */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-6px] rounded-full border border-sky-400/40 dark:border-sky-500/20 transform-gpu"
          />

          {/* Glass centerpiece */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border border-white/80 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/80 text-pink-500 shadow-[0_12px_32px_rgba(244,114,182,0.25),_inset_0_1px_2px_rgba(255,255,255,1)] transform-gpu"
            style={{ willChange: 'transform' }}
          >
            <Sparkles size={46} strokeWidth={1.8} className="text-pink-500 fill-pink-500/10 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]" />
          </motion.div>
        </div>

        {/* Stepper Progress UI */}
        <div className="w-full flex justify-between items-center px-2 py-1 bg-white/30 dark:bg-slate-800/30 rounded-2xl border border-white/40 dark:border-white/5 shadow-inner">
          {STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;

            return (
              <div key={idx} className="flex flex-col items-center flex-1 relative">
                {/* Step Circle Indicator */}
                <motion.div
                  animate={isActive ? { scale: [1, 1.1, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                  transition={{ duration: 2, repeat: isActive ? Infinity : 0, ease: "easeInOut" }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-500 z-10 transform-gpu ${
                    isCompleted
                      ? "bg-pink-500 border-pink-400 text-white shadow-[0_0_12px_rgba(244,114,182,0.4)]"
                      : isActive
                      ? "bg-white dark:bg-slate-800 border-pink-400 text-pink-500 shadow-[0_0_10px_rgba(244,114,182,0.3)]"
                      : "bg-slate-100/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} className="animate-fade-in" />
                  ) : (
                    <StepIcon size={14} strokeWidth={isActive ? 2.5 : 2} />
                  )}
                </motion.div>

                {/* Step Line (Connector) */}
                {idx < STEPS.length - 1 && (
                  <div className="absolute left-[calc(50%+16px)] right-[calc(-50%+16px)] top-4 h-[2px] bg-slate-200 dark:bg-slate-800 -z-0">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: isCompleted ? "100%" : "0%" }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="h-full bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.5)]"
                    />
                  </div>
                )}

                {/* Step Label */}
                <span
                  className={`mt-2 text-[8px] font-black tracking-wider whitespace-nowrap transition-colors duration-300 ${
                    isActive
                      ? "text-pink-600 dark:text-pink-400"
                      : isCompleted
                      ? "text-slate-700 dark:text-slate-300"
                      : "text-slate-400 dark:text-slate-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Text descriptions */}
        <div className="space-y-1.5 text-center px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Premium Jelly Planner</p>
          <h2 className="text-balance text-[18px] sm:text-[21px] font-black leading-[1.2] tracking-tight text-slate-800 dark:text-slate-100">
            正在調配最適合您的旅程節奏
          </h2>
          <p className="mx-auto max-w-[28ch] text-[12px] font-medium leading-[1.6] text-slate-500 dark:text-slate-400">
            我們正微調景點密度與行車動線，草稿生成後可任意調整與共編。
          </p>
        </div>

        {/* Typewriter message */}
        <div aria-live="polite" aria-atomic="true" className="flex min-h-[3.2rem] w-full flex-col items-center justify-center px-2 py-2 text-center bg-white/20 dark:bg-slate-900/30 rounded-2xl border border-white/30 dark:border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-r from-pink-500 via-fuchsia-600 to-sky-500 bg-clip-text text-[13px] sm:text-[14px] font-black leading-[1.4] tracking-wide text-transparent drop-shadow-sm break-keep"
            >
              <TypewriterMessage text={MESSAGES[msgIndex]} />
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Tip footer */}
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
          草稿生成後可邀請旅伴即時共編
        </div>
      </div>
    </div>
  );
}
