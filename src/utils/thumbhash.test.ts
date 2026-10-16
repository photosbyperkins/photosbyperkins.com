import { describe, it, expect } from 'vitest';
import {
    rgbaToThumbHash,
    rgbaToThumbHashBase64,
    thumbHashToRGBA,
    thumbHashToDataURL,
    resolvePlaceholderSrc,
} from './thumbhash';

describe('thumbhash (28-byte binary image placeholder codec)', () => {
    it('encodes an RGBA image to a compact <= 28-byte ThumbHash and decodes back to RGBA', () => {
        const w = 24;
        const h = 16;
        const rgba = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                rgba[idx] = Math.round((x / w) * 220);
                rgba[idx + 1] = Math.round((y / h) * 140);
                rgba[idx + 2] = 90;
                rgba[idx + 3] = 255;
            }
        }

        const hash = rgbaToThumbHash(w, h, rgba);
        expect(hash.byteLength).toBeGreaterThanOrEqual(20);
        expect(hash.byteLength).toBeLessThanOrEqual(28);

        const decoded = thumbHashToRGBA(hash);
        expect(decoded.w).toBeGreaterThan(0);
        expect(decoded.h).toBeGreaterThan(0);
        expect(decoded.rgba.length).toBe(decoded.w * decoded.h * 4);
    });

    it('round-trips base64 ThumbHash to a valid data:image/png;base64 URL', () => {
        const w = 18;
        const h = 12;
        const rgba = new Uint8Array(w * h * 4).fill(180);
        for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;

        const b64 = rgbaToThumbHashBase64(w, h, rgba);
        expect(typeof b64).toBe('string');
        expect(b64.length).toBeLessThanOrEqual(40);

        const dataUrl = thumbHashToDataURL(b64);
        expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);

        // Memoized lookup returns identical string
        expect(thumbHashToDataURL(b64)).toBe(dataUrl);
    });

    it('resolves URL placeholders, data URLs, and ThumbHash strings seamlessly', () => {
        expect(resolvePlaceholderSrc(null)).toBeNull();
        expect(resolvePlaceholderSrc('')).toBeNull();
        expect(resolvePlaceholderSrc('/photos/2025/ev/photo_001.jpg')).toContain('/photos/2025/ev/photo_001.jpg');
        expect(resolvePlaceholderSrc('data:image/webp;base64,AAAA')).toBe('data:image/webp;base64,AAAA');

        const rgba = new Uint8Array(12 * 8 * 4).fill(200);
        const b64 = rgbaToThumbHashBase64(12, 8, rgba);
        const resolved = resolvePlaceholderSrc(b64);
        expect(resolved?.startsWith('data:image/png;base64,')).toBe(true);
    });
});
