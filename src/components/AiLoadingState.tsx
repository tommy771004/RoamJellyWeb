import React, { useState, useEffect } from 'react';
import { Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MESSAGES = [
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
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative bg-slate-50 overflow-hidden">
      {/* Background Pulse Halos */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-pink-300/30 rounded-full blur-3xl animate-pulse delay-75" />
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] bg-indigo-300/20 rounded-full blur-3xl animate-pulse" />
      
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-400/30 blur-2xl rounded-full scale-150" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center text-indigo-500 relative z-10 border border-indigo-100"
          >
            <Compass size={48} strokeWidth={1.5} />
          </motion.div>
        </div>
        
        <div className="h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-slate-600 font-medium tracking-wider text-lg"
            >
              {MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
