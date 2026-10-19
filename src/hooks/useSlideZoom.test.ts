import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSlideZoom } from './useSlideZoom';

describe('useSlideZoom', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    const mockImage = {
        original: '/photos/photo1.webp',
        src: '/photos/photo1.webp',
        thumb: '/photos/photo1.webp',
        width: 1200,
        height: 800,
    };

    it('initializes with default values (scale=1, pan=0, dragMode=false)', () => {
        const { result } = renderHook(() =>
            useSlideZoom({
                image: mockImage,
            })
        );

        expect(result.current.scale.get()).toBe(1);
        expect(result.current.panX.get()).toBe(0);
        expect(result.current.panY.get()).toBe(0);
        expect(result.current.dragMode).toBe(false);
        expect(result.current.constraints).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
    });

    it('provides container event handler props', () => {
        const { result } = renderHook(() =>
            useSlideZoom({
                image: mockImage,
            })
        );

        const props = result.current.containerProps;
        expect(typeof props.onTouchStart).toBe('function');
        expect(typeof props.onTouchEnd).toBe('function');
        expect(typeof props.onTouchCancel).toBe('function');
        expect(typeof props.onPointerDown).toBe('function');
        expect(typeof props.onClick).toBe('function');
        expect(typeof props.onDoubleClick).toBe('function');
    });

    it('toggles zoom in and calls onZoomChange(true)', () => {
        const onZoomChange = vi.fn();
        const { result } = renderHook(() =>
            useSlideZoom({
                image: mockImage,
                onZoomChange,
            })
        );

        act(() => {
            result.current.toggleZoom();
        });

        expect(onZoomChange).toHaveBeenCalledWith(true);
    });

    it('toggles zoom out when currently zoomed (> 1.05)', () => {
        const onZoomChange = vi.fn();
        const { result } = renderHook(() =>
            useSlideZoom({
                image: mockImage,
                onZoomChange,
            })
        );

        // Simulate being zoomed in
        act(() => {
            result.current.scale.set(2);
        });

        act(() => {
            result.current.toggleZoom();
        });

        expect(onZoomChange).toHaveBeenCalledWith(false);
    });

    it('resets scale and pan when image prop changes', () => {
        const onZoomChange = vi.fn();
        const { result, rerender } = renderHook(
            ({ img }) =>
                useSlideZoom({
                    image: img,
                    onZoomChange,
                }),
            {
                initialProps: { img: mockImage },
            }
        );

        act(() => {
            result.current.scale.set(2);
            result.current.panX.set(100);
            result.current.panY.set(50);
        });

        // Switch image
        const nextImage = {
            original: '/photos/photo2.webp',
            src: '/photos/photo2.webp',
            thumb: '/photos/photo2.webp',
            width: 800,
            height: 600,
        };

        rerender({ img: nextImage });

        expect(result.current.scale.get()).toBe(1);
        expect(result.current.panX.get()).toBe(0);
        expect(result.current.panY.get()).toBe(0);
        expect(onZoomChange).toHaveBeenCalledWith(false);
    });

    it('invokes onSingleClick after delay if not a double click', () => {
        const onSingleClick = vi.fn();
        const { result } = renderHook(() =>
            useSlideZoom({
                image: mockImage,
                onSingleClick,
            })
        );

        const mockEvent = {
            stopPropagation: vi.fn(),
            clientX: 100,
            clientY: 100,
        } as unknown as React.MouseEvent;

        act(() => {
            result.current.containerProps.onClick(mockEvent);
        });

        expect(onSingleClick).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(onSingleClick).toHaveBeenCalledTimes(1);
    });

    describe('double-tap scale on a high-DPR phone', () => {
        const setSize = (el: HTMLElement, props: Record<string, number>) => {
            for (const [key, value] of Object.entries(props)) {
                Object.defineProperty(el, key, { configurable: true, value });
            }
        };

        const mountIphone = (image: typeof mockImage, naturalWidth: number) => {
            const onCanZoomChange = vi.fn();
            const hook = renderHook(() => useSlideZoom({ image, onCanZoomChange, reducedMotion: true }));
            const container = document.createElement('div');
            const img = document.createElement('img');
            container.appendChild(img);
            // iPhone portrait viewport (390 x 844 CSS px), landscape photo fitted to the width.
            setSize(container, { clientWidth: 390, clientHeight: 844 });
            setSize(img, { clientWidth: 390, clientHeight: 260, naturalWidth });
            hook.result.current.containerRef.current = container;
            act(() => {
                hook.result.current.handleImageLoad();
            });
            return { ...hook, onCanZoomChange };
        };

        beforeEach(() => {
            vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(3);
        });

        it('zooms to 1:1 device pixels of the display AVIF instead of the original width', () => {
            const photo = { ...mockImage, width: 6000, height: 4000 };
            const { result, onCanZoomChange } = mountIphone(photo, 3840);

            expect(onCanZoomChange).toHaveBeenLastCalledWith(true);
            act(() => {
                result.current.toggleZoom();
            });

            // 3840px / (390 CSS px * DPR 3) ≈ 3.28x, not 6000 / 390 ≈ 15.4x.
            expect(result.current.scale.get()).toBeCloseTo(3840 / (390 * 3), 5);
        });

        it('uses the display AVIF size even while the 1080px thumbnail is still shown', () => {
            const photo = { ...mockImage, width: 6000, height: 4000 };
            const { result } = mountIphone(photo, 1080);

            act(() => {
                result.current.toggleZoom();
            });

            expect(result.current.scale.get()).toBeCloseTo(3840 / (390 * 3), 5);
        });

        it('keeps the minimum zoom for small sources and leaves zoomed state settled for re-rasterizing', () => {
            const photo = { ...mockImage, width: 1200, height: 800 };
            const { result } = mountIphone(photo, 1200);

            act(() => {
                result.current.toggleZoom();
            });

            expect(result.current.scale.get()).toBe(2);
            expect(result.current.dragMode).toBe(true);
        });
    });
});
