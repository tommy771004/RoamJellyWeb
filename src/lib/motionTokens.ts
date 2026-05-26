import type { Transition } from 'motion/react';

// Priority 1: Spring Physics (spring-motion-tokens)
export const SPRING_SMOOTH: Transition = {
  type: 'spring',
  damping: 24,
  stiffness: 260,
  mass: 1,
  bounce: 0,
};

export const SPRING_SNAPPY: Transition = {
  type: 'spring',
  damping: 20,
  stiffness: 300,
  mass: 0.8,
  bounce: 0,
};

export const SPRING_BOUNCY: Transition = {
  type: 'spring',
  damping: 14,
  stiffness: 250,
  mass: 1,
  bounce: 0.4,
};

export const IOS_EASE = [0.22, 1, 0.36, 1] as const;
export const JELLY_EASE = [0.28, 1.08, 0.38, 1] as const;

export const bottomBarTransition: Transition = SPRING_SNAPPY;
export const layoutIndicatorTransition: Transition = SPRING_SNAPPY;
export const modalSpringTransition: Transition = SPRING_SMOOTH;
export const sheetSpringTransition: Transition = SPRING_SMOOTH;

export function getOverlayTransition(reduced = false): Transition {
  return reduced ? { duration: 0.16 } : { duration: 0.25, ease: IOS_EASE };
}

export function getSheetMotion(reduced = false) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: '100%', scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: '100%', scale: 0.95 },
    transition: reduced ? { duration: 0.18 } : SPRING_SMOOTH,
  };
}

export function getModalMotion(reduced = false) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 },
    transition: reduced ? { duration: 0.18 } : { duration: 0.35, ease: "easeOut" as const },
  };
}

export function getListEntranceTransition(index = 0, reduced = false): Transition {
  if (reduced) {
    return { duration: 0.16 };
  }

  return {
    ...SPRING_SMOOTH,
    delay: Math.min(index, 6) * 0.04,
  };
}

// Priority 5: Micro-interactions (micro-button-press-scale down to 0.97/0.985)
export const pressableSurfaceClass = 'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]';
export const subtlePressableClass = 'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985]';
export const raisedHoverClass = 'hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]';
