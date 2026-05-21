import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

export type GenerationStep = 'init' | 'flight' | 'itinerary' | 'optimize' | 'done';

interface StepDetail {
  label: string;
  description: string;
  icon: string;
}

const GENERATION_STEPS: Record<GenerationStep, StepDetail> = {
  init: { label: '解析偏好', description: '正在分析您的出發地、目的地與日期需求...', icon: '🧠' },
  flight: { label: '航班與交通對接', description: '正在搜尋最佳飛航選擇與即時票價快訊...', icon: '✈️' },
  itinerary: { label: '編排每日景點', description: '正在為您打包經典地標與晴雨備案路線...', icon: '📍' },
  optimize: { label: '流暢度優化', description: '正在計算景點間車程，柔化視覺卡片介面...', icon: '✨' },
  done: { label: '行程已就緒', description: '果凍漫遊 AI 已為您準備好完美旅程！', icon: '🍓' }
};

interface AIProgressModalProps {
  currentStep: GenerationStep;
  progress: number; // 0 ~ 100
  isOpen: boolean;
}

export const AIProgressModal: React.FC<AIProgressModalProps> = ({ currentStep, progress, isOpen }) => {
  if (!isOpen) return null;

  const stepKeys: GenerationStep[] = ['init', 'flight', 'itinerary', 'optimize'];
  const currentStepInfo = GENERATION_STEPS[currentStep];

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
        {/* 毛玻璃卡片主體 */}
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="w-full max-w-md mx-4 p-6 sm:p-8 rounded-[36px] bg-white/80 dark:bg-slate-900/80 border border-white/60 dark:border-slate-800/40 shadow-[0_24px_56px_rgba(15,23,42,0.16)] text-center backdrop-blur-[32px]"
        >
          {/* 動態 Icon 動畫 */}
          <motion.div 
            key={currentStep}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl mb-4 animate-bounce drop-shadow-lg"
          >
            {currentStepInfo.icon}
          </motion.div>
          
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
            {currentStepInfo.label}
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 px-4 leading-relaxed h-10">
            {currentStepInfo.description}
          </p>

          {/* 總進度條 */}
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-8 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-fuchsia-400 via-pink-400 to-orange-400 transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            >
               <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          {/* 階段性節點視覺呈現 */}
          <div className="flex justify-between items-center relative px-2 sm:px-6">
            {/* 背景橫線 */}
            <div className="absolute top-3.5 left-8 right-8 sm:left-12 sm:right-12 h-[2px] bg-slate-100 dark:bg-slate-800 -z-10" />
            
            {stepKeys.map((step, index) => {
              const stepIndex = stepKeys.indexOf(currentStep);
              const isCompleted = index < stepIndex || currentStep === 'done';
              const isActive = index === stepIndex && currentStep !== 'done';

              return (
                <div key={step} className="flex flex-col items-center flex-1 relative z-10">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[13px] sm:text-base font-black transition-all duration-500 ${
                    isCompleted ? 'bg-fuchsia-50 border border-fuchsia-200 shadow-sm' :
                    isActive ? 'bg-white ring-4 ring-pink-100 dark:ring-pink-900/40 scale-[1.3] shadow-xl shadow-pink-200/50 border-2 border-pink-400 relative z-20' :
                    'bg-slate-50 dark:bg-slate-800/50 opacity-40 grayscale border border-slate-200 dark:border-slate-700'
                  }`}>
                    <span className={isActive ? 'animate-pulse' : ''}>{GENERATION_STEPS[step].icon}</span>
                    {isCompleted && (
                       <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-fuchsia-500 rounded-full border border-white flex items-center justify-center text-[8px] sm:text-[10px] text-white shadow-sm">✓</div>
                    )}
                  </div>
                  <span className={`text-[10px] sm:text-xs mt-3 sm:mt-3.5 tracking-wider uppercase transition-all duration-300 ${
                    isActive ? 'text-fuchsia-600 font-black scale-[1.15] drop-shadow-sm' : isCompleted ? 'text-slate-600 dark:text-slate-300 font-bold' : 'text-slate-400 font-medium'
                  }`}>
                    {GENERATION_STEPS[step].label.substring(0, 2)}
                  </span>
                </div>
              );
            })}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
