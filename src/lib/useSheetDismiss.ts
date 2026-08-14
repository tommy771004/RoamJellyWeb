import type { PointerEvent as ReactPointerEvent } from 'react';
import { useDragControls, useReducedMotion, type PanInfo } from 'motion/react';

/** Drag this far down and the sheet dismisses, as a fraction of the viewport. */
const DISMISS_OFFSET_RATIO = 0.2;
/** …or flick it down faster than this (px/s), however short the drag was. */
const DISMISS_VELOCITY = 500;

/**
 * Interactive dismissal for bottom sheets — the iOS behaviour where a sheet
 * follows your finger and either falls away or springs back when you let go.
 *
 * The drag deliberately does NOT listen on the sheet itself. Every sheet here
 * scrolls internally, and a whole-sheet `drag="y"` turns each scroll gesture
 * into a fight between the scroll and the drag. iOS has the same problem and
 * solves it the same way: on a scrollable sheet the grab handle is the drag
 * surface. Spread `handleProps` on the handle, `sheetProps` on the sheet.
 *
 * Reduced motion returns empty prop objects, which leaves the sheet completely
 * undraggable — the close button is then the only way out, which is the correct
 * degradation rather than a janky one.
 */
export function useSheetDismiss(onDismiss: () => void) {
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
      style: { touchAction: 'none' as const, cursor: 'grab' as const },
    },
  };
}
