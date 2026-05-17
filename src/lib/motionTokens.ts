import type { Transition } from 'motion/react';

export const IOS_EASE = [0.22, 1, 0.36, 1] as const;
export const JELLY_EASE = [0.34, 1.56, 0.64, 1] as const;

export const bottomBarTransition: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 34,
  mass: 0.92,
};

export const layoutIndicatorTransition: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.9,
};

export const modalSpringTransition: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 34,
  mass: 0.95,
};

export const sheetSpringTransition: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 34,
  mass: 0.92,
};

export function getOverlayTransition(reduced = false): Transition {
  return reduced ? { duration: 0.16 } : { duration: 0.18, ease: IOS_EASE };
}

export function getSheetMotion(reduced = false) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0.98, y: '10%' },
    animate: { opacity: 1, y: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0.98, y: '8%' },
    transition: reduced ? { duration: 0.18 } : sheetSpringTransition,
  };
}

export function getModalMotion(reduced = false) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 32 },
    animate: { opacity: 1, y: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: 18 },
    transition: reduced ? { duration: 0.18 } : modalSpringTransition,
  };
}

export function getListEntranceTransition(index = 0, reduced = false): Transition {
  if (reduced) {
    return { duration: 0.16 };
  }

  return {
    duration: 0.24,
    delay: Math.min(index, 5) * 0.028,
    ease: IOS_EASE,
  };
}

export const pressableSurfaceClass = 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.94]';
export const subtlePressableClass = 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97]';
export const raisedHoverClass = 'hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]';