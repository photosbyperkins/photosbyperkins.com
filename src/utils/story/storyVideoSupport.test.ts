import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
    _resetStoryVideoSupportForTesting,
    canExportStoryVideo,
    getStoryVideoSupportSync,
    prefetchStoryVideoSupport,
} from './storyVideoSupport';

describe('storyVideoSupport', () => {
    beforeEach(() => {
        _resetStoryVideoSupportForTesting();
        vi.stubGlobal('VideoEncoder', {
            isConfigSupported: vi.fn(async () => ({ supported: true })),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
        _resetStoryVideoSupportForTesting();
    });

    it('has no synchronous answer until detection settles', async () => {
        expect(getStoryVideoSupportSync()).toBeUndefined();
        const pending = canExportStoryVideo();
        expect(getStoryVideoSupportSync()).toBeUndefined();
        await expect(pending).resolves.toBe('webcodecs');
        expect(getStoryVideoSupportSync()).toBe('webcodecs');
    });

    it('memoises detection', async () => {
        const a = canExportStoryVideo();
        const b = canExportStoryVideo();
        expect(a).toBe(b);
        await a;
        expect(vi.mocked(VideoEncoder.isConfigSupported)).toHaveBeenCalledTimes(1);
    });

    it('reports false when nothing can encode MP4', async () => {
        vi.stubGlobal('VideoEncoder', { isConfigSupported: vi.fn(async () => ({ supported: false })) });
        vi.stubGlobal('MediaRecorder', undefined);
        await expect(canExportStoryVideo()).resolves.toBe(false);
        expect(getStoryVideoSupportSync()).toBe(false);
    });

    it('prefetches once on idle', async () => {
        vi.useFakeTimers();
        const idle = vi.fn((cb: () => void) => {
            setTimeout(cb, 10);
            return 1;
        });
        vi.stubGlobal('requestIdleCallback', idle);
        prefetchStoryVideoSupport();
        expect(getStoryVideoSupportSync()).toBeUndefined();
        await vi.advanceTimersByTimeAsync(20);
        expect(getStoryVideoSupportSync()).toBe('webcodecs');
        prefetchStoryVideoSupport();
        expect(idle).toHaveBeenCalledTimes(1);
    });

    it('can be reset for tests', async () => {
        await canExportStoryVideo();
        _resetStoryVideoSupportForTesting();
        expect(getStoryVideoSupportSync()).toBeUndefined();
    });
});
