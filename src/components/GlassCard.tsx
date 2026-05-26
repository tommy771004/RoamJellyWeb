import { ReactNode } from 'react';
import { isLowPerformanceDevice } from '../lib/performance';

function useGlassClass() {
  const lowPerf = isLowPerformanceDevice();
  return lowPerf
    ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,253,254,0.96))] border border-white/92 shadow-[0_10px_20px_rgba(240,138,173,0.06),0_2px_6px_rgba(15,23,42,0.02)] rounded-[32px] p-5 relative overflow-hidden transition-all duration-500 dark:bg-black/60 dark:border-white/20 dark:text-white dark:shadow-black/50'
    : 'bg-gradient-to-b from-white/60 via-white/45 to-white/35 backdrop-blur-[24px] backdrop-saturate-[190%] border border-white/70 shadow-[0_16px_36px_-12px_rgba(244,114,182,0.1),0_4px_16px_rgba(15,23,42,0.03),inset_0_1.5px_0_rgba(255,255,255,0.85)] ring-1 ring-white/35 rounded-[32px] p-5 relative overflow-hidden transition-all duration-500 dark:bg-gradient-to-b dark:from-slate-900/40 dark:via-slate-950/35 dark:to-black/50 dark:backdrop-blur-[28px] dark:border-white/15 dark:ring-white/10 dark:text-white dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.6)]';
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
      className={`glass-panel ${glassClass.replace('overflow-hidden', '')} ${className} flex flex-col`}
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
      className={`glass-panel ${glassClass.replace('overflow-hidden', '')} ios-press transition-transform hover:bg-white/50 text-left w-full flex flex-col appearance-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

GlassCard.Pressable = GlassCardPressable;

export default GlassCard;
