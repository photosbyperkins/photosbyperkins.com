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
});
