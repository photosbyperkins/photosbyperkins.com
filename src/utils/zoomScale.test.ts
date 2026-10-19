import { describe, it, expect } from 'vitest';
import { DISPLAY_MAX_EDGE, MIN_DOUBLE_TAP_SCALE, getDoubleTapScale, getZoomSourceWidth } from './zoomScale';

describe('getZoomSourceWidth', () => {
    it('caps a large landscape original at the display AVIF long edge', () => {
        expect(getZoomSourceWidth(1080, 6000, 4000)).toBe(DISPLAY_MAX_EDGE);
    });

    it('scales a portrait original so its long edge fits the display AVIF', () => {
        expect(getZoomSourceWidth(720, 4000, 6000)).toBe(2560);
    });

    it('never enlarges originals smaller than the display AVIF', () => {
        expect(getZoomSourceWidth(1080, 2000, 1333)).toBe(2000);
    });

    it('falls back to the loaded bitmap when the photo has no dimensions', () => {
        expect(getZoomSourceWidth(1080)).toBe(1080);
        expect(getZoomSourceWidth(1080, 0, 0)).toBe(1080);
    });

    it('prefers the loaded bitmap when it is larger than the metadata implies', () => {
        expect(getZoomSourceWidth(3000, 2000, 1333)).toBe(3000);
    });
});

describe('getDoubleTapScale', () => {
    it('caps zoom at one source pixel per device pixel on a DPR-3 phone', () => {
        // iPhone portrait: 3840px display AVIF rendered 390 CSS px wide = 1170 device px.
        const s = getDoubleTapScale(3840, 390, 3);
        expect(s).toBeCloseTo(3840 / 1170, 5);
        // Image pixels stay at least 1:1 with device pixels.
        expect(3840 / (390 * s * 3)).toBeGreaterThanOrEqual(1 - 1e-9);
    });

    it('allows deeper zoom on DPR-1 screens, still capped at 1:1', () => {
        expect(getDoubleTapScale(3840, 1200, 1)).toBeCloseTo(3.2, 5);
    });

    it('raises the target to the minimum zoom when the sharp limit is lower', () => {
        // 1920px source on a DPR-2 laptop: the sharp limit is 1.2x, which is barely a zoom.
        expect(getDoubleTapScale(1920, 800, 2)).toBe(MIN_DOUBLE_TAP_SCALE);
    });

    it('never zooms past one source pixel per CSS pixel', () => {
        expect(getDoubleTapScale(600, 400, 3)).toBe(1.5);
    });

    it('returns 1 when the source is no larger than the rendered size', () => {
        expect(getDoubleTapScale(390, 390, 3)).toBe(1);
        expect(getDoubleTapScale(300, 390, 1)).toBe(1);
    });

    it('treats a missing or invalid devicePixelRatio as 1', () => {
        expect(getDoubleTapScale(3840, 1200, 0)).toBeCloseTo(3.2, 5);
        expect(getDoubleTapScale(3840, 1200, Number.NaN)).toBeCloseTo(3.2, 5);
    });

    it('returns 1 for unmeasured layouts', () => {
        expect(getDoubleTapScale(3840, 0, 3)).toBe(1);
        expect(getDoubleTapScale(0, 390, 3)).toBe(1);
    });
});
