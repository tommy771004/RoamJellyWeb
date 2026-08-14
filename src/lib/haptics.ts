declare global {
  interface Window {
    RoamJellyNative?: {
      platform?: string;
      vibrate?: (duration: number) => void;
      /** Present only in app binaries that route to the Taptic Engine. */
      supportsImpactHaptics?: boolean;
      impact?: (style: 'light' | 'selection') => void;
    };
  }
}

/**
 * Collapse a `navigator.vibrate` pattern into a single duration.
 *
 * A pattern alternates buzz/pause/buzz/…, so only the even indices are actual
 * vibration; summing the whole array would turn the pauses into buzz.
 */
function patternToDuration(pattern: number[]): number {
  return pattern.reduce((total, ms, index) => (index % 2 === 0 ? total + ms : total), 0);
}

export function triggerHapticFeedback(pattern: number | number[] = 28) {
  const native = typeof window !== 'undefined' ? window.RoamJellyNative : undefined;
  const duration = Array.isArray(pattern) ? patternToDuration(pattern) : pattern;

  // Prefer the Taptic path wherever the binary offers it. This is a capability
  // check, not a platform check, and that distinction matters: the web app
  // deploys independently of the app binary, so this code will run inside older
  // builds that have no `impact` method. There it falls through instead of
  // hitting the old `vibrate` bridge, which on iOS plays the full system buzz.
  if (typeof native?.impact === 'function' && native.supportsImpactHaptics) {
    // Short taps are selection changes (tab switches, segmented controls);
    // anything longer was authored as a "something happened" nudge.
    native.impact(duration <= 15 ? 'selection' : 'light');
    return;
  }

  // Legacy bridge. Still excluded on iOS: there it lands on RN's
  // `Vibration.vibrate`, which ignores the duration and buzzes for ~400ms.
  if (native?.platform !== 'ios' && typeof native?.vibrate === 'function') {
    native.vibrate(duration);
    return;
  }

  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}
