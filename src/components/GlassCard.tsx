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
  return (
    <div
      className={`${glassClass} ${className} flex flex-col`}
      style={{ overflow: 'hidden' }}
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
  return (
    <button
      onClick={onPress}
      className={`${glassClass} active:scale-95 transition-transform hover:bg-white/50 text-left w-full flex flex-col appearance-none ${className}`}
      style={{ overflow: 'hidden' }}
    >
      {children}
    </button>
  );
}

GlassCard.Pressable = GlassCardPressable;

export default GlassCard;
