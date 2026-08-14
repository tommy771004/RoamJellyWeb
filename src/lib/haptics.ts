declare global {
  interface Window {
    RoamJellyNative?: {
      platform?: string;
      vibrate?: (duration: number) => void;
      /** Present only in app binaries that route to the Taptic Engine. */
      supportsImpactHaptics?: boolean;
      impact?: (style: HapticStyle) => void;
    };
  }
}

type HapticStyle = 'light' | 'selection';

/**
 * Collapse a `navigator.vibrate` pattern into a single duration.
 *
 * A pattern alternates buzz/pause/buzz/…, so only the even indices are actual
 * vibration; summing the whole array would turn the pauses into buzz.
 */
function patternToDuration(pattern: number[]): number {
  return pattern.reduce((total, ms, index) => (index % 2 === 0 ? total + ms : total), 0);
}

/**
 * `pattern` is only ever used by the vibration-motor paths. iOS picks its own
 * waveform from the style, so the millisecond values are meaningless there.
 */
function fire(style: HapticStyle, pattern: number | number[]) {
  const native = typeof window !== 'undefined' ? window.RoamJellyNative : undefined;

  if (native?.platform === 'ios') {
    // Taptic path. Gated on the capability flag rather than the platform alone:
    // the web app deploys independently of the app binary, so this runs inside
    // older builds with no `impact` method. There we stay silent rather than
    // fall through to the legacy `vibrate` bridge, which on iOS lands on RN's
    // `Vibration.vibrate` and fires the full ~400ms system buzz.
    if (native.supportsImpactHaptics && typeof native.impact === 'function') {
      native.impact(style);
    }
    return;
  }

  // Android in the native shell keeps its existing duration-based vibration —
  // the Taptic rework was an iOS fix and shouldn't quietly change Android feel.
  if (typeof native?.vibrate === 'function') {
    native.vibrate(Array.isArray(pattern) ? patternToDuration(pattern) : pattern);
    return;
  }

  // Plain web. Passes the pattern through intact, so authored rhythms survive.
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

/**
 * Feedback for a selection changing — switching tab, picking a chip, moving
 * between segments. The lightest tap available.
 */
export function selectionHaptic() {
  fire('selection', 10);
}

/**
 * Feedback for something happening — an item added, a drag landing, an action
 * confirmed. Pass a pattern only when the rhythm itself carries meaning (a
 * double tap for completion, say); it is ignored on iOS.
 */
export function impactHaptic(pattern: number | number[] = 18) {
  fire('light', pattern);
}
