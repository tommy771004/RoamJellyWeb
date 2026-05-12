import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MESSAGES = [
  'AI 正在為您規劃...',
  '正在注入您的靈魂偏好...',
  '正在篩選完美景點...',
  '正在為您生成專屬介面...',
];

export default function AiLoadingState() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const int = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2800);
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
        
        <div className="h-10 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
              className="text-slate-800 font-black tracking-widest text-2xl sm:text-3xl bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-indigo-600 drop-shadow-sm"
            >
              {MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
