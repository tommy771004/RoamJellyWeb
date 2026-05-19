import { ReactNode } from 'react';
import { isLowPerformanceDevice } from '../lib/performance';

function useGlassClass() {
  const lowPerf = isLowPerformanceDevice();
  return lowPerf
    ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,251,0.96))] border border-white/90 shadow-[0_12px_24px_rgba(240,138,173,0.08),0_2px_8px_rgba(15,23,42,0.03)] rounded-[32px] p-5 relative overflow-hidden transition-all duration-500 dark:bg-black/60 dark:border-white/20 dark:text-white dark:shadow-black/50'
    : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,250,252,0.75),rgba(250,252,255,0.70))] backdrop-blur-[32px] backdrop-saturate-[150%] border-[1.5px] border-white/92 shadow-[0_14px_32px_-8px_rgba(240,138,173,0.15),0_6px_18px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_8px_20px_rgba(255,255,255,0.3)] ring-1 ring-white/55 rounded-[32px] p-5 relative overflow-hidden transition-all duration-500 dark:bg-black/40 dark:backdrop-blur-xl dark:border-white/20 dark:ring-white/10 dark:text-white dark:shadow-black/50';

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
      className={`${glassClass.replace('overflow-hidden', '')} ${className} group flex flex-col`}
      style={style}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-24 w-24 rounded-full bg-pink-200/30 blur-3xl transition-opacity duration-500 group-hover:opacity-90" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-10 bottom-0 h-20 w-20 rounded-full bg-sky-200/25 blur-3xl opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
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
      className={`${glassClass.replace('overflow-hidden', '')} group active:scale-95 transition-transform hover:bg-white/50 text-left w-full flex flex-col appearance-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${className}`}
      style={style}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-24 w-24 rounded-full bg-pink-200/30 blur-3xl opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-10 bottom-0 h-20 w-20 rounded-full bg-sky-200/25 blur-3xl opacity-70 transition-opacity duration-500 group-hover:opacity-95" />
      {children}
    </button>
  );
}

GlassCard.Pressable = GlassCardPressable;

export default GlassCard;
