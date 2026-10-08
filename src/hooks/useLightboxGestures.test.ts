import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLightboxGestures } from './useLightboxGestures';
import type { PanInfo } from 'framer-motion';

describe('useLightboxGestures', () => {
    const mockImages = [
        { original: '/photos/p1.jpg', thumb: '/photos/t1.jpg' },
        { original: '/photos/p2.jpg', thumb: '/photos/t2.jpg' },
        { original: '/photos/p3.jpg', thumb: '/photos/t3.jpg' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes motion values and animation state', () => {
        const { result } = renderHook(() =>
            useLightboxGestures({
                images: mockImages,
                index: 0,
                windowWidth: 1000,
                reducedMotion: true,
                isFavorite: false,
                checkIfFavorite: () => false,
                getThumbSrc: () => undefined,
                onSetIndex: vi.fn(),
            })
        );

        expect(result.current.x.get()).toBe(0);
        expect(result.current.isAnimating).toBe(false);
        expect(result.current.maxDist).toBeGreaterThan(0);
    });

    it('paginates forward to next index and resets x', async () => {
        const onSetIndex = vi.fn();
        const onZoomReset = vi.fn();

        const { result } = renderHook(() =>
            useLightboxGestures({
                images: mockImages,
                index: 0,
                windowWidth: 1000,
                reducedMotion: true,
                isFavorite: false,
                checkIfFavorite: () => false,
                getThumbSrc: () => undefined,
                onSetIndex,
                onZoomReset,
            })
        );

        act(() => {
            void result.current.paginate(1);
        });

        await waitFor(() => {
            expect(onZoomReset).toHaveBeenCalledTimes(1);
            expect(onSetIndex).toHaveBeenCalledWith(1);
            expect(result.current.x.get()).toBe(0);
            expect(result.current.isAnimating).toBe(false);
        });
    });

    it('paginates backward with circular wrapping to last index', async () => {
        const onSetIndex = vi.fn();

        const { result } = renderHook(() =>
            useLightboxGestures({
                images: mockImages,
                index: 0,
                windowWidth: 1000,
                reducedMotion: true,
                isFavorite: false,
                checkIfFavorite: () => false,
                getThumbSrc: () => undefined,
                onSetIndex,
            })
        );

        act(() => {
            void result.current.paginate(-1);
        });

        await waitFor(() => {
            expect(onSetIndex).toHaveBeenCalledWith(2);
            expect(result.current.x.get()).toBe(0);
        });
    });

    it('triggers paginate(1) on negative drag offset beyond threshold', async () => {
        const onSetIndex = vi.fn();

        const { result } = renderHook(() =>
            useLightboxGestures({
                images: mockImages,
                index: 1,
                windowWidth: 1000,
                reducedMotion: true,
                isFavorite: false,
                checkIfFavorite: () => false,
                getThumbSrc: () => undefined,
                onSetIndex,
            })
        );

        const panInfo = { offset: { x: -140, y: 0 }, velocity: { x: 0, y: 0 } } as unknown as PanInfo;
        act(() => {
            result.current.onDragEnd(new MouseEvent('pointerup'), panInfo);
        });

        await waitFor(() => {
            expect(onSetIndex).toHaveBeenCalledWith(2);
        });
    });

    it('triggers paginate(-1) on positive drag offset beyond threshold', async () => {
        const onSetIndex = vi.fn();

        const { result } = renderHook(() =>
            useLightboxGestures({
                images: mockImages,
                index: 1,
                windowWidth: 1000,
                reducedMotion: true,
                isFavorite: false,
                checkIfFavorite: () => false,
                getThumbSrc: () => undefined,
                onSetIndex,
            })
        );

        const panInfo = { offset: { x: 140, y: 0 }, velocity: { x: 0, y: 0 } } as unknown as PanInfo;
        act(() => {
            result.current.onDragEnd(new MouseEvent('pointerup'), panInfo);
        });

        await waitFor(() => {
            expect(onSetIndex).toHaveBeenCalledWith(0);
        });
    });

    it('snaps back to 0 on sub-threshold drag offset without paginating', () => {
        const onSetIndex = vi.fn();

        const { result } = renderHook(() =>
            useLightboxGestures({
                images: mockImages,
                index: 1,
                windowWidth: 1000,
                reducedMotion: true,
                isFavorite: false,
                checkIfFavorite: () => false,
                getThumbSrc: () => undefined,
                onSetIndex,
            })
        );

        const panInfo = { offset: { x: 20, y: 0 }, velocity: { x: 50, y: 0 } } as unknown as PanInfo;
        act(() => {
            result.current.onDragEnd(new MouseEvent('pointerup'), panInfo);
        });

        expect(onSetIndex).not.toHaveBeenCalled();
        expect(result.current.x.get()).toBe(0);
    });

    it('computes maxDist sufficiently large to cover visible viewport and margins (>= 25)', () => {
        const { result } = renderHook(() =>
            useLightboxGestures({
                images: mockImages,
                index: 0,
                windowWidth: 1200,
                reducedMotion: true,
                isFavorite: false,
                checkIfFavorite: () => false,
                getThumbSrc: () => undefined,
                onSetIndex: vi.fn(),
            })
        );

        // half-visible (ceil(600/72)+2 = 11) + drag range (ceil(1200/72)+2 = 19) = 30 slices
        expect(result.current.maxDist).toBeGreaterThanOrEqual(25);
    });

    it.each([320, 375, 768, 1200, 1920, 3840])(
        'keeps the viewport covered at the scrubber drag limit (windowWidth=%i)',
        (windowWidth) => {
            const { result } = renderHook(() =>
                useLightboxGestures({
                    images: mockImages,
                    index: 0,
                    windowWidth,
                    reducedMotion: true,
                    isFavorite: false,
                    checkIfFavorite: () => false,
                    getThumbSrc: () => undefined,
                    onSetIndex: vi.fn(),
                })
            );

            const { maxDist, scrubMaxDrag } = result.current;
            expect(scrubMaxDrag).toBeGreaterThan(0);
            // At full drag, the rendered slices on the far side must still reach the viewport edge.
            expect(scrubMaxDrag + windowWidth / 2 + 36).toBeLessThanOrEqual(maxDist * 72);
        }
    );
});
