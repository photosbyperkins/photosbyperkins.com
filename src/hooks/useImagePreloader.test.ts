import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImagePreloader } from './useImagePreloader';
import type { PhotoInput } from '../types';

describe('useImagePreloader', () => {
    let createdImages: { src: string; onload: (() => void) | null; onerror: (() => void) | null }[] = [];
    const originalImage = globalThis.Image;

    beforeEach(() => {
        vi.useFakeTimers();
        createdImages = [];
        globalThis.Image = class MockImage {
            private _src = '';
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;

            get src() {
                return this._src;
            }

            set src(val: string) {
                this._src = val;
                createdImages.push(this);
                // Trigger onload in next tick if set
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 0);
            }
        } as unknown as typeof Image;
    });

    afterEach(() => {
        globalThis.Image = originalImage;
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    const mockPhotos: PhotoInput[] = [
        { original: '/photo-0.webp', src: '/photo-0.webp', thumb: '/photo-0.webp', width: 800, height: 600 },
        { original: '/photo-1.webp', src: '/photo-1.webp', thumb: '/photo-1.webp', width: 800, height: 600 },
        { original: '/photo-2.webp', src: '/photo-2.webp', thumb: '/photo-2.webp', width: 800, height: 600 },
        { original: '/photo-3.webp', src: '/photo-3.webp', thumb: '/photo-3.webp', width: 800, height: 600 },
        { original: '/photo-4.webp', src: '/photo-4.webp', thumb: '/photo-4.webp', width: 800, height: 600 },
    ];

    const getDisplaySrc = (photo: PhotoInput) => (typeof photo === 'string' ? photo : photo.src);

    it('does not preload if mainImageLoaded is false', () => {
        renderHook(() =>
            useImagePreloader({
                images: mockPhotos,
                currentIndex: 0,
                mainImageLoaded: false,
                getDisplaySrc,
            })
        );

        expect(createdImages.length).toBe(0);
    });

    it('does not preload if there is only 1 photo', () => {
        renderHook(() =>
            useImagePreloader({
                images: [mockPhotos[0]],
                currentIndex: 0,
                mainImageLoaded: true,
                getDisplaySrc,
            })
        );

        expect(createdImages.length).toBe(0);
    });

    it('immediately preloads closest adjacent photos when mainImageLoaded is true', async () => {
        renderHook(() =>
            useImagePreloader({
                images: mockPhotos,
                currentIndex: 0,
                mainImageLoaded: true,
                getDisplaySrc,
            })
        );

        // Immediate preload loads 2 images (next: index 1, prev: index 4)
        expect(createdImages.length).toBeGreaterThanOrEqual(2);
        const preloadedUrls = createdImages.map((img) => img.src);
        expect(preloadedUrls).toContain('/photo-1.webp');
        expect(preloadedUrls).toContain('/photo-4.webp');
    });

    it('skips preloading if navigator.connection.saveData is enabled', () => {
        const originalNavigator = globalThis.navigator;
        Object.defineProperty(globalThis, 'navigator', {
            value: {
                ...originalNavigator,
                connection: { saveData: true },
            },
            configurable: true,
            writable: true,
        });

        renderHook(() =>
            useImagePreloader({
                images: mockPhotos,
                currentIndex: 0,
                mainImageLoaded: true,
                getDisplaySrc,
            })
        );

        expect(createdImages.length).toBe(0);

        Object.defineProperty(globalThis, 'navigator', {
            value: originalNavigator,
            configurable: true,
            writable: true,
        });
    });

    it('cancels trickle loading on unmount', () => {
        const { unmount } = renderHook(() =>
            useImagePreloader({
                images: mockPhotos,
                currentIndex: 0,
                mainImageLoaded: true,
                getDisplaySrc,
            })
        );

        const countAtUnmount = createdImages.length;
        unmount();

        act(() => {
            vi.advanceTimersByTime(20000);
        });

        expect(createdImages.length).toBe(countAtUnmount);
    });
});
