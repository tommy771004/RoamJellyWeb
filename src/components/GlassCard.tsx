import { ReactNode } from 'react';
import { isLowPerformanceDevice } from '../lib/performance';

function useGlassClass() {
  const lowPerf = isLowPerformanceDevice();
  return lowPerf
    ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,251,0.96))] border border-white/90 shadow-[0_14px_30px_rgba(240,138,173,0.10),0_3px_10px_rgba(15,23,42,0.04)] rounded-[34px] p-5 relative overflow-hidden transition-colors duration-300 dark:bg-slate-900/90 dark:border-white/10 dark:text-slate-100 dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]'
    : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.80),rgba(255,248,251,0.70),rgba(248,251,255,0.64))] backdrop-blur-[36px] backdrop-saturate-[190%] border-[1.5px] border-white/92 shadow-[0_18px_44px_-12px_rgba(240,138,173,0.20),0_8px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_10px_24px_rgba(255,255,255,0.42)] ring-1 ring-white/55 rounded-[34px] p-5 relative overflow-hidden transition-colors duration-300 dark:bg-slate-900/62 dark:border-white/10 dark:ring-white/10 dark:text-slate-100 dark:shadow-[0_20px_64px_rgba(0,0,0,0.45)]';
}

import React from 'react';

interface GlassCardProps {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  [key: string]: any;
}

function GlassCard({ children, className = '', style: propsStyle, ...restProps }: GlassCardProps) {
  const glassClass = useGlassClass();
  
  const style: React.CSSProperties = {
    ...propsStyle,
    overflow: className.includes('overflow-visible') ? (propsStyle?.overflow) : 'hidden'
  };
  
  return (
    <div
      {...restProps}
      className={`${glassClass.replace('overflow-hidden', '')} ${className} flex flex-col`}
      style={style}
    >
      {children}
    </div>
  );
}

interface GlassCardPressableProps {
  onPress: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  [key: string]: any;
}

function GlassCardPressable({ children, className = '', onPress, style: propsStyle, onClick, ...restProps }: GlassCardPressableProps) {
  const glassClass = useGlassClass();
  
  const style: React.CSSProperties = {
    ...propsStyle,
    overflow: className.includes('overflow-visible') ? (propsStyle?.overflow) : 'hidden'
  };

  return (
    <button
      {...restProps}
      onClick={(e) => {
        onPress(e);
        onClick?.(e);
      }}
      className={`${glassClass.replace('overflow-hidden', '')} active:scale-95 transition-transform hover:bg-white/50 text-left w-full flex flex-col appearance-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

GlassCard.Pressable = GlassCardPressable;

export default GlassCard;
