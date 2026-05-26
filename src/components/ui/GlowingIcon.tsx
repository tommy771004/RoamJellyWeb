import React from 'react';
import { LucideIcon } from 'lucide-react';

interface GlowingIconProps {
  icon: LucideIcon;
  glowColor: string;
  iconColor?: string;
  size?: number;
  className?: string;
}

export function GlowingIcon({
  icon: Icon,
  glowColor,
  iconColor = "text-slate-800 dark:text-slate-100",
  size = 24,
  className = ""
}: GlowingIconProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* 沉浸式發光背光 (Blurred glowing aura) */}
      <div 
        className={`absolute inset-0 ${glowColor} opacity-[0.35] dark:opacity-[0.45] blur-[6px] rounded-full scale-[1.35] transition-all duration-300 mix-blend-multiply dark:mix-blend-screen`}
        aria-hidden="true" 
      />
      {/* 主體線條 Icon (Crisp line icon on top) */}
      <Icon 
        size={size} 
        strokeWidth={1.5} 
        className={`relative z-10 ${iconColor} drop-shadow-sm`} 
      />
    </div>
  );
}
