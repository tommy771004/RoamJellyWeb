export function triggerHapticFeedback(pattern: number | number[] = 28) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}