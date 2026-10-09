import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withBuild } from './build';

describe('build utils', () => {
    const originalBuildNumber = (globalThis as unknown as { __BUILD_NUMBER__?: string }).__BUILD_NUMBER__;

    beforeEach(() => {
        (globalThis as unknown as { __BUILD_NUMBER__?: string }).__BUILD_NUMBER__ = '202610091200';
    });

    afterEach(() => {
        (globalThis as unknown as { __BUILD_NUMBER__?: string }).__BUILD_NUMBER__ = originalBuildNumber;
    });

    it('returns empty string for null/undefined/empty input', () => {
        expect(withBuild('')).toBe('');
        expect(withBuild(null)).toBe('');
        expect(withBuild(undefined)).toBe('');
    });

    it('skips cache-busting for immutable album media', () => {
        expect(withBuild('/photos/2026/event/image.jpg')).toBe('/photos/2026/event/image.jpg');
        expect(withBuild('/thumbnails/2026/event/image.webp')).toBe('/thumbnails/2026/event/image.webp');
        expect(withBuild('/avif/2026/event/image.avif')).toBe('/avif/2026/event/image.avif');
        expect(withBuild('/webp/2026/event/image.webp')).toBe('/webp/2026/event/image.webp');
    });

    it('appends build version query to dynamic non-immutable assets', () => {
        expect(withBuild('/data/years/2026.part1.json')).toBe('/data/years/2026.part1.json?v=202610091200');
        expect(withBuild('/data/albums/2026/event.json?filter=all')).toBe('/data/albums/2026/event.json?filter=all&v=202610091200');
    });

    it('allows scrubber sprites to receive build query when unhashed', () => {
        expect(withBuild('/scrubber/2026/event/sprite.webp')).toBe('/scrubber/2026/event/sprite.webp?v=202610091200');
    });

    it('preserves deterministic content hash query (?h=) for scrubber and recap sprites without double versioning', () => {
        expect(withBuild('/scrubber/2026/event/sprite.webp?h=abc1234567')).toBe('/scrubber/2026/event/sprite.webp?h=abc1234567');
        expect(withBuild('/recap/2026/sprite.webp?h=recap12345')).toBe('/recap/2026/sprite.webp?h=recap12345');
    });

    it('forces versioning on immutable media when force=true', () => {
        expect(withBuild('/photos/2026/event/image.jpg', true)).toBe('/photos/2026/event/image.jpg?v=202610091200');
    });
});
