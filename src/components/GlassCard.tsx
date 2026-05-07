import { ReactNode } from 'react';
import { isLowPerformanceDevice } from '../lib/performance';

function useGlassClass() {
  const lowPerf = isLowPerformanceDevice();
  return lowPerf
    ? 'bg-white/85 border border-white/70 shadow rounded-3xl p-5'
    : 'bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg rounded-3xl p-5';
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
