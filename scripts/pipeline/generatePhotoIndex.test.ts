import { describe, it, expect } from 'vitest';
import path from 'path';
import {
    isSkipped,
    isAlbumDir,
    isHighlightDir,
    slugify,
    normalizeBasename,
    toWebPath,
    shuffle,
    detectBursts,
    loadFacesCache,
    extractFaceData,
    type BurstCandidate,
} from './generatePhotoIndex';

describe('generatePhotoIndex helpers', () => {
    describe('isSkipped', () => {
        it('identifies directories to skip', () => {
            expect(isSkipped('original')).toBe(true);
            expect(isSkipped('original photos')).toBe(true);
            expect(isSkipped('denoise')).toBe(true);
            expect(isSkipped('sharpened')).toBe(true);
            expect(isSkipped('facebook')).toBe(true);
            expect(isSkipped('reddit')).toBe(true);
            expect(isSkipped('2024-03-01 Match')).toBe(false);
            expect(isSkipped('final album')).toBe(false);
        });
    });

    describe('isAlbumDir', () => {
        it('identifies album directory names', () => {
            expect(isAlbumDir('resize')).toBe(true);
            expect(isAlbumDir('Web Resize')).toBe(true);
            expect(isAlbumDir('final')).toBe(true);
            expect(isAlbumDir('raw')).toBe(false);
        });
    });

    describe('isHighlightDir', () => {
        it('identifies highlight directory names', () => {
            expect(isHighlightDir('highlights')).toBe(true);
            expect(isHighlightDir('Event Highlights')).toBe(true);
            expect(isHighlightDir('hightlight')).toBe(true);
            expect(isHighlightDir('album')).toBe(false);
        });
    });

    describe('slugify', () => {
        it('creates url-friendly slugs from strings', () => {
            expect(slugify('2024-03-01 Tigers vs Bears')).toBe('2024-03-01-tigers-vs-bears');
            expect(slugify('Special @# Event! 2023')).toBe('special-event-2023');
            expect(slugify('Multiple   Spaces   Here')).toBe('multiple-spaces-here');
        });
    });

    describe('normalizeBasename', () => {
        it('strips denoised, resized, and processing tags', () => {
            expect(normalizeBasename('_sharpened_IMG_1234_final.jpg')).toBe('img_1234');
            expect(normalizeBasename('IMG_5678_denoise_instagram.jpg')).toBe('img_5678');
            expect(normalizeBasename('Photo_denoise.jpg')).toBe('photo');
            expect(normalizeBasename('Game_99_resize.jpg')).toBe('game_99');
        });
    });

    describe('toWebPath', () => {
        it('formats web path from absolute path', () => {
            const cwd = process.cwd();
            const sampleFile = path.join(cwd, 'photos', '2024', 'game1.jpg');
            const webPath = toWebPath(sampleFile);
            expect(webPath.startsWith('/photos/2024/game1.jpg')).toBe(true);

            const thumbFile = path.join(cwd, 'build', 'thumbnails', 'photos', '2024', 'game1.webp');
            const thumbWebPath = toWebPath(thumbFile, true);
            expect(thumbWebPath.startsWith('/thumbnails/photos/2024/game1.webp')).toBe(true);
        });
    });

    describe('shuffle', () => {
        it('returns an array of identical length and elements', () => {
            const arr = [1, 2, 3, 4, 5];
            const shuffled = shuffle(arr);
            expect(shuffled.length).toBe(arr.length);
            expect(shuffled.sort()).toEqual(arr.sort());
        });
    });

    describe('detectBursts', () => {
        it('detects a 3-photo landscape burst from the same camera within 2.0s', () => {
            const items: BurstCandidate[] = [
                { original: '/p1.jpg', width: 3000, height: 2000, timestampMs: 10000, cameraSerial: 'CAM-123' },
                { original: '/p2.jpg', width: 3000, height: 2000, timestampMs: 10840, cameraSerial: 'CAM-123' },
                { original: '/p3.jpg', width: 3000, height: 2000, timestampMs: 11420, cameraSerial: 'CAM-123' },
            ];

            detectBursts(items, 'test-event', 2.0);

            expect(items[0].burst).toBeDefined();
            expect(items[0].burst?.id).toBe('test-event-burst-1');
            expect(items[0].burst?.index).toBe(0);
            expect(items[0].burst?.total).toBe(3);
            expect(items[0].burst?.deltaSec).toBe(0);
            expect(items[0].burst?.frameSources).toEqual(['/p1.jpg', '/p2.jpg', '/p3.jpg']);

            expect(items[1].burst?.index).toBe(1);
            expect(items[1].burst?.deltaSec).toBe(0.84);

            expect(items[2].burst?.index).toBe(2);
            expect(items[2].burst?.deltaSec).toBe(1.42);
        });

        it('does not group bursts if camera serial numbers differ (multi-body protection)', () => {
            const items: BurstCandidate[] = [
                { original: '/p1.jpg', width: 3000, height: 2000, timestampMs: 10000, cameraSerial: 'CAM-BODY-A' },
                { original: '/p2.jpg', width: 3000, height: 2000, timestampMs: 10500, cameraSerial: 'CAM-BODY-B' },
                { original: '/p3.jpg', width: 3000, height: 2000, timestampMs: 11000, cameraSerial: 'CAM-BODY-A' },
            ];

            detectBursts(items, 'test-event', 2.0);

            expect(items[0].burst).toBeUndefined();
            expect(items[1].burst).toBeUndefined();
            expect(items[2].burst).toBeUndefined();
        });

        it('detects bursts with portrait and mixed arbitrary aspect ratio photos', () => {
            const items: BurstCandidate[] = [
                { original: '/p1.jpg', width: 3000, height: 2000, timestampMs: 10000, cameraSerial: 'CAM-123' },
                { original: '/p2.jpg', width: 2000, height: 3000, timestampMs: 10500, cameraSerial: 'CAM-123' }, // Portrait!
                { original: '/p3.jpg', width: 2000, height: 2000, timestampMs: 11000, cameraSerial: 'CAM-123' }, // Square!
            ];

            detectBursts(items, 'test-event', 2.0);

            expect(items[0].burst).toBeDefined();
            expect(items[0].burst?.id).toBe('test-event-burst-1');
            expect(items[0].burst?.total).toBe(3);
            expect(items[1].burst?.id).toBe('test-event-burst-1');
            expect(items[2].burst?.id).toBe('test-event-burst-1');
        });

        it('detects purely portrait burst sequences', () => {
            const items: BurstCandidate[] = [
                { original: '/p1.jpg', width: 2000, height: 3000, timestampMs: 10000, cameraSerial: 'CAM-123' },
                { original: '/p2.jpg', width: 2000, height: 3000, timestampMs: 10500, cameraSerial: 'CAM-123' },
                { original: '/p3.jpg', width: 2000, height: 3000, timestampMs: 11000, cameraSerial: 'CAM-123' },
            ];

            detectBursts(items, 'portrait-burst', 2.0);

            expect(items[0].burst).toBeDefined();
            expect(items[0].burst?.total).toBe(3);
            expect(items[1].burst?.total).toBe(3);
            expect(items[2].burst?.total).toBe(3);
        });

        it('splits bursts when delta time exceeds threshold', () => {
            const items: BurstCandidate[] = [
                { original: '/p1.jpg', width: 3000, height: 2000, timestampMs: 10000, cameraSerial: 'CAM-123' },
                { original: '/p2.jpg', width: 3000, height: 2000, timestampMs: 10800, cameraSerial: 'CAM-123' },
                { original: '/p3.jpg', width: 3000, height: 2000, timestampMs: 13500, cameraSerial: 'CAM-123' }, // 2.7s gap!
                { original: '/p4.jpg', width: 3000, height: 2000, timestampMs: 14000, cameraSerial: 'CAM-123' },
            ];

            detectBursts(items, 'test-event', 2.0);

            // Group 1 only had 2 photos (p1, p2) -> not a burst
            // Group 2 only had 2 photos (p3, p4) -> not a burst
            expect(items[0].burst).toBeUndefined();
            expect(items[1].burst).toBeUndefined();
            expect(items[2].burst).toBeUndefined();
            expect(items[3].burst).toBeUndefined();
        });

        it('handles bursts with >3 photos and assigns correct metadata', () => {
            const items: BurstCandidate[] = [
                { original: '/p1.jpg', thumb: '/t1.avif', width: 3000, height: 2000, timestampMs: 10000, cameraSerial: 'CAM-123' },
                { original: '/p2.jpg', thumb: '/t2.avif', width: 3000, height: 2000, timestampMs: 10500, cameraSerial: 'CAM-123' },
                { original: '/p3.jpg', thumb: '/t3.avif', width: 3000, height: 2000, timestampMs: 11000, cameraSerial: 'CAM-123' },
                { original: '/p4.jpg', thumb: '/t4.avif', width: 3000, height: 2000, timestampMs: 11500, cameraSerial: 'CAM-123' },
            ];

            detectBursts(items, 'multi-event', 2.0);

            expect(items.every((p) => p.burst?.id === 'multi-event-burst-1')).toBe(true);
            expect(items.every((p) => p.burst?.total === 4)).toBe(true);
            expect(items[3].burst?.index).toBe(3);
            expect(items[3].burst?.deltaSec).toBe(1.5);
            expect(items[0].burst?.frameThumbs).toEqual(['/t1.avif', '/t2.avif', '/t3.avif', '/t4.avif']);
        });
    });

    describe('loadFacesCache and extractFaceData', () => {
        it('returns empty object when cache file does not exist', () => {
            expect(loadFacesCache('/non/existent/path/faces.json')).toEqual({});
        });

        it('returns undefined when thumb or cache is missing', () => {
            expect(extractFaceData('', {})).toBeUndefined();
            expect(extractFaceData('/thumb.avif', {})).toBeUndefined();
        });

        it('extracts face data correctly with full faces array', () => {
            const cache = {
                '/thumbnails/2026/event/photo_001.avif': {
                    x: 0.62,
                    y: 0.15,
                    score: 180.5,
                    recapScore: 4.2,
                    faces: [{ x: 0.62, y: 0.15, w: 0.1, h: 0.1, confidence: 0.9 }],
                },
            };
            const extracted = extractFaceData('/thumbnails/2026/event/photo_001.avif', cache);
            expect(extracted).toEqual({
                focusX: 0.62,
                focusY: 0.15,
                faceScore: 180.5,
                recapScore: 4.2,
                faces: [{ x: 0.62, y: 0.15, w: 0.1, h: 0.1, confidence: 0.9 }],
            });
        });

        it('synthesizes single fallback face when faces array is missing or empty', () => {
            const cache = {
                '/thumbnails/2026/event/photo_002.avif': {
                    x: 0.45,
                    y: 0.25,
                    score: 95.0,
                    recapScore: 1.5,
                },
            };
            const extracted = extractFaceData('/thumbnails/2026/event/photo_002.avif', cache);
            expect(extracted).toEqual({
                focusX: 0.45,
                focusY: 0.25,
                faceScore: 95.0,
                recapScore: 1.5,
                faces: [{ x: 0.45, y: 0.25, confidence: 1.0 }],
            });
        });

        it('supports webp fallback lookup when avif entry is requested', () => {
            const cache = {
                '/thumbnails/2026/event/photo_003.webp': {
                    x: 0.5,
                    y: 0.2,
                    score: 110.0,
                },
            };
            const extracted = extractFaceData('/thumbnails/2026/event/photo_003.avif', cache);
            expect(extracted?.focusX).toBe(0.5);
            expect(extracted?.focusY).toBe(0.2);
            expect(extracted?.faces).toEqual([{ x: 0.5, y: 0.2, confidence: 1.0 }]);
        });
    });
});
