import { ReactNode } from 'react';
import { isLowPerformanceDevice } from '../lib/performance';

function useGlassClass() {
  const lowPerf = isLowPerformanceDevice();
  return lowPerf
    ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,253,254,0.96))] border border-white/92 shadow-[0_10px_20px_rgba(240,138,173,0.06),0_2px_6px_rgba(15,23,42,0.02)] rounded-[32px] p-5 relative overflow-hidden transition-all duration-500 dark:bg-black/60 dark:border-white/20 dark:text-white dark:shadow-black/50'
    : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.90),rgba(255,252,254,0.82),rgba(250,252,255,0.78))] backdrop-blur-[24px] backdrop-saturate-[160%] border-[1.2px] border-white/94 shadow-[0_12px_28px_-10px_rgba(240,138,173,0.12),0_4px_12px_rgba(15,23,42,0.03),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_4px_12px_rgba(255,255,255,0.25)] ring-1 ring-white/45 rounded-[32px] p-5 relative overflow-hidden transition-all duration-500 dark:bg-black/40 dark:backdrop-blur-xl dark:border-white/15 dark:ring-white/10 dark:text-white dark:shadow-black/50';

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
      className={`glass-panel ${glassClass.replace('overflow-hidden', '')} active:scale-[0.97] transition-transform hover:bg-white/50 text-left w-full flex flex-col appearance-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

GlassCard.Pressable = GlassCardPressable;

export default GlassCard;
