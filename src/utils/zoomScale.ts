/**
 * Longest edge of the display AVIF the lightbox swaps to (`/avif/`). Must match the
 * `resize({ width: 3840, height: 3840, fit: 'inside' })` call in scripts/pipeline/encodePhotos.ts.
 * The original JPEG is never shown in the lightbox, so zoom can't resolve more detail than this.
 */
export const DISPLAY_MAX_EDGE = 3840;

/** Smallest useful double-tap zoom; below this, zooming barely changes anything. */
export const MIN_DOUBLE_TAP_SCALE = 2;

/**
 * Pixel width of the sharpest source the lightbox will show for a photo: the display AVIF, which is
 * the original scaled to fit inside DISPLAY_MAX_EDGE (never enlarged). Falls back to the currently
 * loaded bitmap's width when the photo has no dimensions.
 */
export function getZoomSourceWidth(naturalWidth: number, photoWidth?: number, photoHeight?: number): number {
    if (!photoWidth || !photoHeight || photoWidth <= 0 || photoHeight <= 0) return naturalWidth;
    const fit = Math.min(1, DISPLAY_MAX_EDGE / Math.max(photoWidth, photoHeight));
    return Math.max(naturalWidth, Math.round(photoWidth * fit));
}

/**
 * Double-tap zoom target. The sharp limit is the scale at which one source pixel covers one device
 * pixel (rendered width × devicePixelRatio). Scaling past it upsamples the bitmap, which looks
 * blurry, especially on DPR-3 phones where CSS pixels are 3 device pixels wide. The target is
 * raised to MIN_DOUBLE_TAP_SCALE when the source is small, but never beyond one source pixel per
 * CSS pixel. Returns 1 when the photo can't be meaningfully zoomed.
 */
export function getDoubleTapScale(sourceWidth: number, renderedWidth: number, devicePixelRatio = 1): number {
    if (!(sourceWidth > 0) || !(renderedWidth > 0)) return 1;
    const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
    const cssLimit = sourceWidth / renderedWidth;
    const sharpLimit = cssLimit / dpr;
    return Math.max(1, Math.min(cssLimit, Math.max(sharpLimit, MIN_DOUBLE_TAP_SCALE)));
}
