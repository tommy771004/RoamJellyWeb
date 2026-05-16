import { ReactNode } from 'react';
import { isLowPerformanceDevice } from '../lib/performance';

function useGlassClass() {
  const lowPerf = isLowPerformanceDevice();
  return lowPerf
    ? 'bg-white border border-slate-100 shadow-sm rounded-[36px] p-5 relative overflow-hidden transition-colors duration-300 dark:bg-slate-900/88 dark:border-white/10 dark:text-slate-100 dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]'
    : 'bg-white/60 backdrop-blur-[44px] backdrop-saturate-[220%] border-[1.5px] border-white/92 shadow-[0_20px_56px_-8px_rgba(220,130,170,0.22),0_4px_16px_rgba(134,77,97,0.06),inset_0_2px_16px_rgba(255,255,255,1)] ring-1 ring-white/60 rounded-[36px] p-5 relative overflow-hidden transition-colors duration-300 dark:bg-slate-900/60 dark:border-white/10 dark:ring-white/10 dark:text-slate-100 dark:shadow-[0_20px_64px_rgba(0,0,0,0.45)]';
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
