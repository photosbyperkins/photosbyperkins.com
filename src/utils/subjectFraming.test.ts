import { describe, it, expect } from 'vitest';
import { HEAD_TOP_AT, subjectCropCenter, subjectCropRect, sliceCacheKey, FRAMING_VERSION } from './subjectFraming';

describe('subjectFraming', () => {
    it('centres saliency and unknown focus points as-is', () => {
        expect(subjectCropCenter({ focusX: 0.3, focusY: 0.6, focusSource: 'saliency' }, 0.5, 0.5)).toEqual({
            x: 0.3,
            y: 0.6,
        });
        expect(subjectCropCenter({ focusX: 0.3, focusY: 0.6 }, 0.5, 0.5)).toEqual({ x: 0.3, y: 0.6 });
        expect(subjectCropCenter({}, 0.5, 0.5)).toEqual({ x: 0.5, y: 0.5 });
    });

    it('places the top of the head HEAD_TOP_AT down the crop for faces and people', () => {
        const c = subjectCropCenter({ focusX: 0.4, focusY: 0.2, focusSource: 'face' }, 0.3, 0.5);
        expect(c.x).toBeCloseTo(0.4);
        // crop top = c.y - 0.25 → head top sits HEAD_TOP_AT of the way down
        expect((0.2 - (c.y - 0.25)) / 0.5).toBeCloseTo(HEAD_TOP_AT);
        expect(subjectCropCenter({ focusX: 0.4, focusY: 0.2, focusSource: 'person' }, 0.3, 0.5).y).toBeCloseTo(c.y);
    });

    it('centres on a small group of faces when they fit across the crop', () => {
        const photo = {
            focusX: 0.45,
            focusY: 0.3,
            focusSource: 'face' as const,
            faces: [
                { x: 0.45, y: 0.33, w: 0.04, h: 0.05 },
                { x: 0.55, y: 0.35, w: 0.04, h: 0.05 },
            ],
        };
        expect(subjectCropCenter(photo, 0.5, 0.5).x).toBeCloseTo(0.5);
        // Too wide for a narrow crop: stay on the lead face
        expect(subjectCropCenter(photo, 0.1, 0.5).x).toBeCloseTo(0.45);
    });

    it('clamps the pixel crop rectangle to the image', () => {
        expect(subjectCropRect(3000, 2000, 1000, 1000, { focusX: 0.98, focusY: 0.01, focusSource: 'face' })).toEqual({
            left: 2000,
            top: 0,
            width: 1000,
            height: 1000,
        });
        const mid = subjectCropRect(3000, 2000, 1000, 1000, { focusX: 0.5, focusY: 0.5, focusSource: 'saliency' });
        expect(mid).toEqual({ left: 1000, top: 500, width: 1000, height: 1000 });
    });

    describe('sliceCacheKey', () => {
        it('includes framing version and headroom constant in cache key', () => {
            const key = sliceCacheKey('photos/photo1.jpg', { focusX: 0.5, focusY: 0.3 });
            expect(key).toContain(`v${FRAMING_VERSION}|h${HEAD_TOP_AT}`);
        });

        it('alters cache key when subject data changes', () => {
            const base = sliceCacheKey('photos/photo1.jpg', { focusX: 0.5, focusY: 0.3 });
            const shifted = sliceCacheKey('photos/photo1.jpg', { focusX: 0.6, focusY: 0.3 });
            const faceSource = sliceCacheKey('photos/photo1.jpg', {
                focusX: 0.5,
                focusY: 0.3,
                focusSource: 'face',
                faces: [{ x: 0.5, y: 0.3, w: 0.1, h: 0.1 }],
            });

            expect(base).not.toEqual(shifted);
            expect(base).not.toEqual(faceSource);
        });
    });
});
