/**
 * index.html paints a static copy of the home hero before the bundle runs and
 * removes it the moment React commits the app shell. For that swap to be
 * invisible, the first HomeTab mount must render the title at its resting
 * position, so the entrance motion (tab slide-in, HomeTab rise, title rise)
 * is skipped for that one mount. Later tab switches animate as usual.
 *
 * Read at module evaluation: the overlay exists from HTML parse until React's
 * first shell commit, which is always after this module runs.
 */
export const bootHeroShown =
  typeof document !== 'undefined' && document.getElementById('boot-hero') !== null;

let homeMounted = false;

/** True only for the first HomeTab mount after the static hero was shown. */
export function shouldSkipHomeEntrance(): boolean {
  return bootHeroShown && !homeMounted;
}

export function markHomeMounted(): void {
  homeMounted = true;
}
