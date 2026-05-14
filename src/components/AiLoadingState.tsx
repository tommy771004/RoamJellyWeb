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
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-white/40 backdrop-blur-3xl z-50">
      {/* Background Pulse Halos */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[800px] max-h-[800px] bg-fuchsia-300/30 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-indigo-300/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '3s', animationDelay: '1s' }} />

      <div className="relative z-10 flex flex-col items-center gap-12">
        <div className="relative">
          <div className="absolute inset-0 bg-fuchsia-400/40 blur-[40px] rounded-full scale-[2] animate-pulse" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-0 border-[3px] border-fuchsia-200 rounded-full scale-[1.2] opacity-50 animate-ping" style={{ animationDuration: '3s' }} />
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
            transition={{ rotate: { duration: 8, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
            className="w-28 h-28 rounded-full bg-white shadow-2xl shadow-fuchsia-500/20 flex items-center justify-center text-fuchsia-500 relative z-10 border border-fuchsia-100"
          >
            <Sparkles size={56} strokeWidth={1.5} className="drop-shadow-sm" />
          </motion.div>
        </div>

        <div className="min-h-[3rem] flex flex-col items-center justify-center px-8 max-w-xs sm:max-w-sm text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
              transition={{ duration: 0.35 }}
              className="text-slate-800 font-black tracking-widest text-xl sm:text-2xl bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-indigo-600 drop-shadow-sm leading-snug"
            >
              <TypewriterMessage text={MESSAGES[msgIndex]} />
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
