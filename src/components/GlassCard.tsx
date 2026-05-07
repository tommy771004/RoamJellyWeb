import { ReactNode } from 'react';
import { isLowPerformanceDevice } from '../lib/performance';

function useGlassClass() {
  const lowPerf = isLowPerformanceDevice();
  return lowPerf
    ? 'bg-white border border-slate-100 shadow-sm rounded-[32px] p-5 relative overflow-hidden'
    : 'bg-white/60 backdrop-blur-3xl border border-white/60 shadow-[0_8px_40px_rgb(0,0,0,0.08)] ring-1 ring-white/50 rounded-[32px] p-5 relative overflow-hidden';
}

import React from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

function GlassCard({ children, className = '' }: GlassCardProps) {
  const glassClass = useGlassClass();
  // Check if overflow-visible is provided in className to avoid forcing overflow hidden via style
  const style: React.CSSProperties = className.includes('overflow-visible') ? {} : { overflow: 'hidden' };
  
  return (
    <div
      className={`${glassClass.replace('overflow-hidden', '')} ${className} flex flex-col`}
      style={style}
    >
      {children}
    </div>
  );
}

interface GlassCardPressableProps extends GlassCardProps {
  onPress: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

function GlassCardPressable({ children, className = '', onPress }: GlassCardPressableProps) {
  const glassClass = useGlassClass();
  const style: React.CSSProperties = className.includes('overflow-visible') ? {} : { overflow: 'hidden' };

  return (
    <button
      onClick={onPress}
      className={`${glassClass.replace('overflow-hidden', '')} active:scale-95 transition-transform hover:bg-white/50 text-left w-full flex flex-col appearance-none ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

GlassCard.Pressable = GlassCardPressable;

export default GlassCard;
