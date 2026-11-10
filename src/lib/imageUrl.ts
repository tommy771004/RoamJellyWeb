/**
 * Responsive sizing for remote images.
 *
 * The same Unsplash URL feeds both large covers and small thumbnails (data is
 * stored at w=800), so sizing happens at the render site: each <img> asks for
 * the widths it actually displays. Only images.unsplash.com URLs are rewritten
 * (its Imgix API honours w / q / auto=format); anything else passes through.
 */

const UNSPLASH_HOST = 'images.unsplash.com';
const DEFAULT_QUALITY = 60;

function parseUnsplash(url: string | null | undefined): URL | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname === UNSPLASH_HOST ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Returns the URL resized to `width` pixels (non-Unsplash URLs unchanged).
 * `aspect` (height / width) crops to the slot's shape, so an `object-cover`
 * slot taller than the photo is still fully covered instead of upscaled.
 */
export function sizedImageUrl(url: string, width: number, quality = DEFAULT_QUALITY, aspect?: number): string {
  const parsed = parseUnsplash(url);
  if (!parsed) return url;
  parsed.searchParams.set('w', String(Math.round(width)));
  if (aspect && aspect > 0) parsed.searchParams.set('h', String(Math.round(width * aspect)));
  else parsed.searchParams.delete('h');
  parsed.searchParams.set('q', String(quality));
  parsed.searchParams.set('auto', 'format');
  if (aspect && aspect > 0) parsed.searchParams.set('fit', 'crop');
  else if (!parsed.searchParams.has('fit')) parsed.searchParams.set('fit', 'crop');
  return parsed.toString();
}

/**
 * `src` / `srcSet` props for an <img> whose rendered width is described by `sizes`.
 * `widths` are the candidate pixel widths; the smallest is used as `src`.
 * `aspect` (height / width of the slot) is passed through to `sizedImageUrl`.
 * Non-Unsplash URLs get only `src`, since their server ignores width params.
 */
export function responsiveImageProps(
  url: string,
  widths: readonly number[],
  sizes: string,
  aspect?: number,
): { src: string; srcSet?: string; sizes?: string } {
  if (!parseUnsplash(url) || widths.length === 0) return { src: url };
  const sorted = [...widths].sort((a, b) => a - b);
  return {
    src: sizedImageUrl(url, sorted[0], DEFAULT_QUALITY, aspect),
    srcSet: sorted.map((w) => `${sizedImageUrl(url, w, DEFAULT_QUALITY, aspect)} ${w}w`).join(', '),
    sizes,
  };
}
