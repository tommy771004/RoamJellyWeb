import type { Transition, Variants } from 'motion/react';

// ── Spring Physics ────────────────────────────────────────────────────────────
// spring-motion-tokens: all spring presets as named constants

/** Standard UI transition — smoothly settles with no bounce */
export const SPRING_SMOOTH: Transition = {
  type: 'spring',
  damping: 24,
  stiffness: 260,
  mass: 1,
  bounce: 0,
};

/** Snappy, fast response — great for tabs, pills, layout changes */
export const SPRING_SNAPPY: Transition = {
  type: 'spring',
  damping: 20,
  stiffness: 300,
  mass: 0.8,
  bounce: 0,
};

/** Playful bounce — celebrations, toggles, FAB */
export const SPRING_BOUNCY: Transition = {
  type: 'spring',
  damping: 14,
  stiffness: 250,
  mass: 1,
  bounce: 0.4,
};

/**
 * Card hover lift — low stiffness, gentle float.
 * Use for `.card-lift` hover state driven by JS, not CSS.
 */
export const SPRING_CARD_HOVER: Transition = {
  type: 'spring',
  damping: 28,
  stiffness: 220,
  mass: 0.9,
  bounce: 0,
};

/**
 * Modal / bottom-sheet spring — identical to SPRING_SMOOTH but
 * extracted so it can be tuned independently.
 */
export const SPRING_MODAL: Transition = {
  type: 'spring',
  damping: 26,
  stiffness: 240,
  mass: 1,
  bounce: 0,
};

// ── Easing Curves ─────────────────────────────────────────────────────────────
/** iOS decelerate curve — also registered as --motion-ios-ease in CSS */
export const IOS_EASE = [0.22, 1, 0.36, 1] as const;
/** Slightly over-shooting variant for card/sheet pop-in */
export const JELLY_EASE = [0.28, 1.08, 0.38, 1] as const;
/** CSS string version — safe to pass to `style={{ transition }}` */
export const IOS_EASE_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';

// ── Named Semantic Aliases ─────────────────────────────────────────────────────
export const bottomBarTransition: Transition = SPRING_SNAPPY;
export const layoutIndicatorTransition: Transition = SPRING_SNAPPY;
export const modalSpringTransition: Transition = SPRING_MODAL;
export const sheetSpringTransition: Transition = SPRING_MODAL;

// ── Overlay / Sheet / Modal helpers ──────────────────────────────────────────
export function getOverlayTransition(reduced = false): Transition {
  return reduced ? { duration: 0.16 } : { duration: 0.22, ease: IOS_EASE };
}

export function getSheetMotion(reduced = false) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: '100%', scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: '80%', scale: 0.97 },
    transition: reduced ? { duration: 0.18 } : SPRING_MODAL,
  };
}

export function getModalMotion(reduced = false) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 },
    transition: reduced ? { duration: 0.18 } : SPRING_MODAL,
  };
}

// ── List / Stagger helpers ────────────────────────────────────────────────────

/** Per-item stagger delay (capped at 6 items to avoid long waits) */
export function getListEntranceTransition(index = 0, reduced = false): Transition {
  if (reduced) return { duration: 0.16 };
  return {
    ...SPRING_SMOOTH,
    delay: Math.min(index, 6) * 0.04,
  };
}

/**
 * `motion/react` Variants for a staggered list container.
 *
 * Usage:
 * ```tsx
 * <motion.ul variants={staggerContainerVariants} initial="hidden" animate="show">
 *   {items.map((_, i) => (
 *     <motion.li key={i} variants={staggerItemVariants} />
 *   ))}
 * </motion.ul>
 * ```
 */
export const staggerContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.05,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRING_SMOOTH,
  },
};

// ── Micro-interaction CSS class helpers ──────────────────────────────────────
/** Scale 0.97 on press — use for prominent buttons */
export const pressableSurfaceClass =
  'transform-gpu will-change-transform transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]';

/** Scale 0.985 on press — use for subtle interactive surfaces */
export const subtlePressableClass =
  'transform-gpu will-change-transform transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.985]';

/** Hover lift + shadow — for desktop card interactions */
export const raisedHoverClass =
  'hover:-translate-y-1 hover:shadow-floating transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]';

/** Tab slide variants — used in App.tsx AnimatePresence */
export function getTabVariants(reduced = false): Variants {
  if (reduced) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  return {
    enter: (dir: number) => ({ opacity: 0, scale: 0.984, x: dir * 24 }),
    center: { opacity: 1, scale: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, scale: 0.984, x: dir * -24 }),
  };
}
