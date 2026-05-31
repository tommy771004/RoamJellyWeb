import React from 'react';

interface PulsingIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PulsingIndicator({ className = '', size = 'md' }: PulsingIndicatorProps) {
  const sizeClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2.5 w-2.5',
    lg: 'h-3.5 w-3.5',
  };

  const ringClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2.5 w-2.5',
    lg: 'h-3.5 w-3.5',
  };

  return (
    <span className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <span className={`animate-ping absolute inline-flex rounded-full bg-emerald-400 dark:bg-emerald-500 opacity-75 ${ringClasses[size]}`} />
      <span className={`relative inline-flex rounded-full bg-emerald-500 border border-white dark:border-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.8)] ${sizeClasses[size]}`} />
    </span>
  );
}
