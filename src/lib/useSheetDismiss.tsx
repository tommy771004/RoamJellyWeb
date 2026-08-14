import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useDragControls, useReducedMotion, type PanInfo } from 'motion/react';

/** Drag this far down and the sheet dismisses, as a fraction of the viewport. */
const DISMISS_OFFSET_RATIO = 0.2;
/** …or flick it down faster than this (px/s), however short the drag was. */
const DISMISS_VELOCITY = 500;

/**
 * Props for the element that starts the drag. Empty under reduced motion, which
 * is what makes the sheet undraggable there.
 */
export type SheetHandleProps =
  | Record<string, never>
  | {
      onPointerDown: (event: ReactPointerEvent) => void;
      style: CSSProperties;
    };

/**
 * The pill at the top of a bottom sheet, and the only surface that starts the
 * dismiss drag.
 *
 * Deliberately declared at module level. A component type created inside the
 * hook would be a brand-new type on every render, so React would unmount and
 * remount the handle — and a remount part-way through a gesture drops pointer
 * capture and kills the drag.
 */
export function SheetGrabHandle({
  handleProps,
  className = '',
}: {
  handleProps: SheetHandleProps;
  className?: string;
}) {
  return (
    // The visible pill is 6px tall, so the row is padded out to ~30px to give
    // the gesture something to land on.
    <div {...handleProps} className={`flex shrink-0 justify-center pt-3 pb-2.5 ${className}`}>
      <div className="h-1.5 w-10 rounded-full bg-slate-300/80 dark:bg-white/15" />
    </div>
  );
}

/**
 * Interactive dismissal for bottom sheets — the iOS behaviour where a sheet
 * follows your finger and either falls away or springs back when you let go.
 *
 * The drag deliberately does NOT listen on the sheet itself. Every sheet here
 * scrolls internally, and a whole-sheet `drag="y"` turns each scroll gesture
 * into a fight between the scroll and the drag. iOS has the same problem and
 * solves it the same way: on a scrollable sheet the grab handle is the drag
 * surface. Spread `sheetProps` on the sheet and pass `handleProps` to
 * `SheetGrabHandle`.
 *
 * `onDismiss` may decline to close — a sheet with unsaved edits can warn
 * instead. When it does, the sheet springs back to its constraints on its own.
 *
 * Reduced motion returns empty prop objects, which leaves the sheet completely
 * undraggable — the close button is then the only way out, which is the correct
 * degradation rather than a janky one.
 */
export function useSheetDismiss(onDismiss: () => void): {
  sheetProps: Record<string, unknown>;
  handleProps: SheetHandleProps;
} {
  const dragControls = useDragControls();
  const prefersReducedMotion = useReducedMotion();

  function handleDragEnd(_event: unknown, info: PanInfo) {
    const draggedFarEnough =
      info.offset.y > (typeof window === 'undefined' ? 200 : window.innerHeight * DISMISS_OFFSET_RATIO);
    const flickedDown = info.velocity.y > DISMISS_VELOCITY;
    if (draggedFarEnough || flickedDown) onDismiss();
  }

  if (prefersReducedMotion) {
    return { sheetProps: {}, handleProps: {} };
  }

  return {
    sheetProps: {
      drag: 'y' as const,
      dragControls,
      dragListener: false,
      dragConstraints: { top: 0, bottom: 0 },
      // Asymmetric: the sheet follows a downward pull but barely budges upward,
      // so dragging the wrong way feels like a wall rather than a bug.
      dragElastic: { top: 0, bottom: 0.7 },
      dragMomentum: false,
      onDragEnd: handleDragEnd,
    },
    handleProps: {
      onPointerDown: (event: ReactPointerEvent) => dragControls.start(event),
      // Without this the browser claims the vertical gesture for scrolling
      // before the drag ever starts.
      style: { touchAction: 'none', cursor: 'grab' },
    },
  };
}
