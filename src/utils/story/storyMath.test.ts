import { describe, it, expect } from 'vitest';
import {
    DUET_PANEL_ASPECT_RATIO,
    calculateDefaultBurstZoom,
    calculateBurstPanelCrop,
    calculateFitZoom,
    calculateNormalizedCrop,
    generateStoryPresets,
} from './storyMath';
import { STORY_ASPECT_RATIO } from './storyConstants';

describe('storyMath', () => {
    describe('calculateDefaultBurstZoom', () => {
        it('returns default 1.25 for invalid/zero dimensions', () => {
            expect(calculateDefaultBurstZoom(0, 0)).toBe(1.25);
            expect(calculateDefaultBurstZoom(1920, 0)).toBe(1.25);
            expect(calculateDefaultBurstZoom(0, 1080)).toBe(1.25);
        });

        it('calculates expected zoom for 3:2 photos (1.50) in 27:16 panel', () => {
            // 3:2 photo: 6000x4000
            const zoom = calculateDefaultBurstZoom(6000, 4000);
            expect(zoom).toBe(1.25);
        });

        it('clamps zoom between 1.15 and 2.0 for extreme aspect ratios', () => {
            // Extreme ultra-wide panorama (10000x500 = 20:1)
            const panoramaZoom = calculateDefaultBurstZoom(10000, 500);
            expect(panoramaZoom).toBe(2.0);

            // Extreme tall portrait (500x10000 = 1:20)
            const tallZoom = calculateDefaultBurstZoom(500, 10000);
            expect(tallZoom).toBe(2.0);

            // Exact match to panel aspect ratio (27 / 16 = 1.6875)
            const exactZoom = calculateDefaultBurstZoom(2700, 1600);
            // mismatch = 1.0, derived = 1.0 * (1.25 / 1.125) = 1.1111 -> clamped to 1.15
            expect(exactZoom).toBe(1.15);
        });

        it('handles custom and invalid panel aspect ratio', () => {
            const duetZoom = calculateDefaultBurstZoom(6000, 4000, DUET_PANEL_ASPECT_RATIO);
            expect(duetZoom).toBeGreaterThanOrEqual(1.15);
            expect(duetZoom).toBeLessThanOrEqual(2.0);

            // Fallback when panelAspectRatio <= 0
            const fallbackZoom = calculateDefaultBurstZoom(6000, 4000, 0);
            expect(fallbackZoom).toBe(1.25);
        });
    });

    describe('calculateBurstPanelCrop', () => {
        it('handles 0 or missing dimensions gracefully with safe fallbacks', () => {
            const crop = calculateBurstPanelCrop(0, 0, 0.5, 0.5);
            expect(crop.width).toBeGreaterThan(0);
            expect(crop.height).toBeGreaterThan(0);
            expect(crop.x).toBeGreaterThanOrEqual(0);
            expect(crop.y).toBeGreaterThanOrEqual(0);
            expect(crop.zoom).toBe(1.25);
        });

        it('calculates crop for landscape 3:2 photo', () => {
            const crop = calculateBurstPanelCrop(6000, 4000, 0.5, 0.5, 1.25);
            expect(crop.zoom).toBe(1.25);
            expect(crop.x).toBeGreaterThanOrEqual(0);
            expect(crop.y).toBeGreaterThanOrEqual(0);
            expect(crop.x + crop.width).toBeLessThanOrEqual(1.0001);
            expect(crop.y + crop.height).toBeLessThanOrEqual(1.0001);
        });

        it('handles extreme panoramic and tall aspect ratios without exceeding bounds', () => {
            // Panorama
            const panoCrop = calculateBurstPanelCrop(10000, 500, 0.8, 0.5);
            expect(panoCrop.x).toBeGreaterThanOrEqual(0);
            expect(panoCrop.y).toBeGreaterThanOrEqual(0);
            expect(panoCrop.x + panoCrop.width).toBeLessThanOrEqual(1.0001);
            expect(panoCrop.y + panoCrop.height).toBeLessThanOrEqual(1.0001);

            // Extreme tall portrait
            const tallCrop = calculateBurstPanelCrop(500, 10000, 0.5, 0.8);
            expect(tallCrop.x).toBeGreaterThanOrEqual(0);
            expect(tallCrop.y).toBeGreaterThanOrEqual(0);
            expect(tallCrop.x + tallCrop.width).toBeLessThanOrEqual(1.0001);
            expect(tallCrop.y + tallCrop.height).toBeLessThanOrEqual(1.0001);
        });

        it('handles NaN or out-of-range center coordinates and zoom', () => {
            const nanCrop = calculateBurstPanelCrop(1920, 1080, NaN, NaN, NaN);
            expect(nanCrop.centerX).toBeCloseTo(0.5, 1);
            expect(nanCrop.centerY).toBeCloseTo(0.5, 1);
            expect(nanCrop.zoom).toBeGreaterThanOrEqual(1.0);

            const outOfBounds = calculateBurstPanelCrop(1920, 1080, -2, 5, 5);
            expect(outOfBounds.zoom).toBe(3.5); // clamped to max 3.5
            expect(outOfBounds.x).toBeGreaterThanOrEqual(0);
            expect(outOfBounds.y).toBeGreaterThanOrEqual(0);
            expect(outOfBounds.x + outOfBounds.width).toBeLessThanOrEqual(1.0001);
            expect(outOfBounds.y + outOfBounds.height).toBeLessThanOrEqual(1.0001);
        });
    });

    describe('calculateFitZoom', () => {
        it('returns cardScale fallback for 0 or missing dimensions', () => {
            expect(calculateFitZoom(0, 0)).toBe(0.92);
            expect(calculateFitZoom(1920, 0, 0.85)).toBe(0.85);
        });

        it('calculates fit zoom for wider-than-story photos', () => {
            // 3:2 landscape is wider than 9:16
            const zoom = calculateFitZoom(6000, 4000, 0.92);
            const expected = parseFloat(((STORY_ASPECT_RATIO / 1.5) * 0.92).toFixed(3));
            expect(zoom).toBe(expected);
        });

        it('calculates fit zoom for narrower-than-story photos', () => {
            // 1:2 portrait is narrower than 9:16 (0.5625)
            const zoom = calculateFitZoom(1000, 2000, 0.92);
            const expected = parseFloat(((0.5 / STORY_ASPECT_RATIO) * 0.92).toFixed(3));
            expect(zoom).toBe(expected);
        });

        it('clamps cardScale between 0.5 and 1.0', () => {
            const minScaleZoom = calculateFitZoom(6000, 4000, 0.1);
            const expectedMin = parseFloat(((STORY_ASPECT_RATIO / 1.5) * 0.5).toFixed(3));
            expect(minScaleZoom).toBe(expectedMin);

            const maxScaleZoom = calculateFitZoom(6000, 4000, 2.0);
            const expectedMax = parseFloat(((STORY_ASPECT_RATIO / 1.5) * 1.0).toFixed(3));
            expect(maxScaleZoom).toBe(expectedMax);
        });
    });

    describe('calculateNormalizedCrop', () => {
        it('calculates standard centered 9:16 crop', () => {
            const crop = calculateNormalizedCrop(6000, 4000, 0.5, 0.5, 1.0);
            expect(crop.zoom).toBe(1.0);
            expect(crop.width).toBeLessThanOrEqual(1.0);
            expect(crop.height).toBe(1.0); // clamped to full image height when wider than 9:16
            expect(crop.x).toBeGreaterThan(0);
            expect(crop.y).toBe(0);
        });

        it('locks center when crop dimension exceeds image dimension (letterbox view)', () => {
            // At zoom=0.5, cropH (8000) exceeds imgH (4000) -> centerY locked to 0.5.
            // cropW (4500) < imgW (6000) -> centerX clamped to [0.375, 0.625].
            const crop = calculateNormalizedCrop(6000, 4000, 0.2, 0.8, 0.5, 0.1);
            expect(crop.centerX).toBe(0.375);
            expect(crop.centerY).toBe(0.5);

            // At zoom=0.3, both cropW (7500) and cropH (13333) exceed image dimensions -> both locked to 0.5.
            const fullLetterbox = calculateNormalizedCrop(6000, 4000, 0.2, 0.8, 0.3, 0.1);
            expect(fullLetterbox.centerX).toBe(0.5);
            expect(fullLetterbox.centerY).toBe(0.5);
        });

        it('clamps center coordinates to keep crop within image bounds when zoomed in', () => {
            // Attempt to crop near top-left corner (0.01, 0.01) with 2x zoom
            const crop = calculateNormalizedCrop(6000, 4000, 0.01, 0.01, 2.0);
            expect(crop.x).toBeGreaterThanOrEqual(0);
            expect(crop.y).toBeGreaterThanOrEqual(0);
            expect(crop.x + crop.width).toBeLessThanOrEqual(1.0001);
            expect(crop.y + crop.height).toBeLessThanOrEqual(1.0001);
        });

        it('handles extreme portrait dimensions', () => {
            const crop = calculateNormalizedCrop(1000, 4000, 0.5, 0.5, 1.0);
            expect(crop.width).toBe(1.0);
            expect(crop.height).toBeLessThanOrEqual(1.0);
        });
    });

    describe('generateStoryPresets', () => {
        it('generates presets for 0 faces detected (no people)', () => {
            const presets = generateStoryPresets({ width: 6000, height: 4000 });
            expect(presets).toHaveLength(3);
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'center', 'closeup']);
            expect(presets.find((p) => p.id === 'center')?.isDefault).toBe(true);
            // Verify sorted by zoom ascending
            expect(presets[0].crop.zoom).toBeLessThanOrEqual(presets[1].crop.zoom);
            expect(presets[1].crop.zoom).toBeLessThanOrEqual(presets[2].crop.zoom);
        });

        it('generates presets for 1 face detected', () => {
            const presets = generateStoryPresets({
                width: 6000,
                height: 4000,
                faces: [{ x: 0.35, y: 0.4, w: 0.1, h: 0.1 }],
            });
            expect(presets).toHaveLength(3);
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'subject', 'closeup']);
            expect(presets.find((p) => p.id === 'subject')?.isDefault).toBe(true);
        });

        it('centres the subject on the face and sizes the close-up from the face height', () => {
            const presets = generateStoryPresets({
                width: 6000,
                height: 4000,
                faces: [{ x: 0.4, y: 0.3, w: 0.04, h: 0.05 }],
            });
            const subject = presets.find((p) => p.id === 'subject')!;
            const closeup = presets.find((p) => p.id === 'closeup')!;
            expect(subject.crop.zoom).toBe(1);
            expect(subject.crop.centerX).toBeCloseTo(0.4);
            // Face fills ~11% of the close-up height: 0.11 / 0.05 = 2.2x
            expect(closeup.crop.zoom).toBeCloseTo(2.2);
            expect(closeup.crop.centerX).toBeCloseTo(0.4);
            // Face sits in the upper part of the close-up
            const faceRelY = (0.3 - closeup.crop.y) / closeup.crop.height;
            expect(faceRelY).toBeGreaterThan(0.2);
            expect(faceRelY).toBeLessThan(0.4);
        });

        it('sizes the close-up from the body box that contains the face', () => {
            const presets = generateStoryPresets({
                width: 6000,
                height: 4000,
                faces: [{ x: 0.5, y: 0.3, w: 0.04, h: 0.05 }],
                subjects: [{ x: 0.5, y: 0.55, w: 0.15, h: 0.6 }],
            });
            const closeup = presets.find((p) => p.id === 'closeup')!;
            // min(0.92 / 0.6, 0.375 / 0.15) = 1.533x — the whole skater fits
            expect(closeup.crop.zoom).toBeCloseTo(0.92 / 0.6);
            expect(closeup.crop.y).toBeLessThan(0.3 - 0.025);
            expect(closeup.crop.y + closeup.crop.height).toBeGreaterThan(0.85);
        });

        it('frames a duo together when both fit a 9:16 crop, with a tighter close-up', () => {
            const presets = generateStoryPresets({
                width: 6000,
                height: 4000,
                faces: [
                    { x: 0.45, y: 0.4, w: 0.05, h: 0.06 },
                    { x: 0.55, y: 0.42, w: 0.05, h: 0.06 },
                ],
            });
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'duo', 'closeup']);
            expect(presets.find((p) => p.id === 'duo')?.isDefault).toBe(true);
            const closeup = presets.find((p) => p.id === 'closeup')!;
            expect(closeup.crop.zoom).toBeGreaterThan(1.2);
            // Both faces stay inside the close-up
            expect(closeup.crop.x).toBeLessThan(0.425);
            expect(closeup.crop.x + closeup.crop.width).toBeGreaterThan(0.575);
        });

        it('defaults to the lead subject when a group is too wide, offering a fit-group view', () => {
            const presets = generateStoryPresets({
                width: 6000,
                height: 4000,
                faces: [
                    { x: 0.2, y: 0.3, w: 0.05, h: 0.06 },
                    { x: 0.5, y: 0.4, w: 0.05, h: 0.06 },
                    { x: 0.8, y: 0.3, w: 0.05, h: 0.06 },
                ],
            });
            expect(presets).toHaveLength(3);
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'pack', 'lead']);
            const lead = presets.find((p) => p.id === 'lead')!;
            expect(lead.isDefault).toBe(true);
            expect(lead.crop.centerX).toBeCloseTo(0.2, 1);
            const pack = presets.find((p) => p.id === 'pack')!;
            expect(pack.crop.zoom).toBeLessThan(1);
            expect(pack.crop.x).toBeLessThanOrEqual(0.136);
            expect(pack.crop.x + pack.crop.width).toBeGreaterThanOrEqual(0.864);
        });

        it('frames the athlete when only a person box was detected', () => {
            const presets = generateStoryPresets({
                width: 6000,
                height: 4000,
                focusX: 0.6,
                focusY: 0.25,
                focusSource: 'person',
                subjects: [{ x: 0.6, y: 0.55, w: 0.12, h: 0.6 }],
            });
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'subject', 'closeup']);
            const closeup = presets.find((p) => p.id === 'closeup')!;
            expect(closeup.crop.zoom).toBeCloseTo(0.85 / 0.6);
            expect(closeup.crop.centerX).toBeCloseTo(0.6);
            expect(closeup.crop.y).toBeLessThan(0.25);
        });

        it('labels saliency focus points as Focus', () => {
            const presets = generateStoryPresets({
                width: 6000,
                height: 4000,
                focusX: 0.7,
                focusY: 0.5,
                focusSource: 'saliency',
            });
            expect(presets.map((p) => p.label)).toEqual(['Padded', 'Focus', 'Close-up']);
            expect(presets.find((p) => p.id === 'subject')?.crop.centerX).toBeCloseTo(0.7);
        });

        it('falls back to focusX/focusY if no faces are provided', () => {
            const presets = generateStoryPresets({
                width: 6000,
                height: 4000,
                focusX: 0.7,
                focusY: 0.3,
            });
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'subject', 'closeup']);
        });

        it('ignores invalid NaN face coordinates', () => {
            const presets = generateStoryPresets({
                width: 6000,
                height: 4000,
                faces: [{ x: NaN, y: NaN }],
            });
            // Should fall back to 0 faces
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'center', 'closeup']);
        });
    });
});
