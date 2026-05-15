import { ReactNode } from 'react';
import { isLowPerformanceDevice } from '../lib/performance';

function useGlassClass() {
  const lowPerf = isLowPerformanceDevice();
  return lowPerf
    ? 'bg-white border border-slate-100 shadow-sm rounded-[36px] p-5 relative overflow-hidden transition-all duration-500 dark:bg-slate-900/88 dark:border-white/10 dark:text-slate-100 dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]'
    : 'bg-white/55 backdrop-blur-[40px] backdrop-saturate-[200%] border-[1.5px] border-white/90 shadow-[0_16px_40px_-5px_rgba(255,160,200,0.2),inset_0_2px_10px_rgba(255,255,255,1)] ring-1 ring-white/50 rounded-[36px] p-5 relative overflow-hidden transition-all duration-500 dark:bg-slate-900/60 dark:border-white/10 dark:ring-white/10 dark:text-slate-100 dark:shadow-[0_18px_60px_rgba(0,0,0,0.42)]';
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
      className={`${glassClass.replace('overflow-hidden', '')} active:scale-95 transition-transform hover:bg-white/50 text-left w-full flex flex-col appearance-none ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

GlassCard.Pressable = GlassCardPressable;

export default GlassCard;
