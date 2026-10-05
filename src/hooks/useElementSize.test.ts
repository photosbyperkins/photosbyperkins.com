import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useElementSize } from './useElementSize';
import type { RefObject } from 'react';

describe('useElementSize', () => {
    let mockObserverCallback: (entries: ResizeObserverEntry[]) => void;
    let observeMock: ReturnType<typeof vi.fn>;
    let disconnectMock: ReturnType<typeof vi.fn>;
    let originalResizeObserver: typeof ResizeObserver;
    let originalRAF: typeof requestAnimationFrame;
    let originalCAF: typeof cancelAnimationFrame;

    beforeEach(() => {
        observeMock = vi.fn();
        disconnectMock = vi.fn();

        originalResizeObserver = window.ResizeObserver;
        window.ResizeObserver = class MockResizeObserver {
            constructor(callback: ResizeObserverCallback) {
                mockObserverCallback = callback as unknown as (entries: ResizeObserverEntry[]) => void;
            }
            observe = observeMock;
            unobserve = vi.fn();
            disconnect = disconnectMock;
        } as unknown as typeof ResizeObserver;

        originalRAF = window.requestAnimationFrame;
        originalCAF = window.cancelAnimationFrame;
        window.requestAnimationFrame = vi.fn((cb) => {
            cb(performance.now());
            return 1;
        });
        window.cancelAnimationFrame = vi.fn();
    });

    afterEach(() => {
        window.ResizeObserver = originalResizeObserver;
        window.requestAnimationFrame = originalRAF;
        window.cancelAnimationFrame = originalCAF;
        vi.restoreAllMocks();
    });

    it('returns 0,0 when ref is null', () => {
        const ref: RefObject<HTMLElement | null> = { current: null };
        const { result } = renderHook(() => useElementSize(ref));

        expect(result.current).toEqual({ width: 0, height: 0 });
        expect(observeMock).not.toHaveBeenCalled();
    });

    it('initializes size from offsetWidth and offsetHeight and observes element', () => {
        const div = document.createElement('div');
        Object.defineProperty(div, 'offsetWidth', { value: 320, configurable: true });
        Object.defineProperty(div, 'offsetHeight', { value: 240, configurable: true });

        const ref: RefObject<HTMLElement | null> = { current: div };
        const { result } = renderHook(() => useElementSize(ref));

        expect(result.current).toEqual({ width: 320, height: 240 });
        expect(observeMock).toHaveBeenCalledWith(div);
    });

    it('updates size when ResizeObserver triggers with contentBoxSize', () => {
        const div = document.createElement('div');
        const ref: RefObject<HTMLElement | null> = { current: div };
        const { result } = renderHook(() => useElementSize(ref));

        act(() => {
            mockObserverCallback([
                {
                    contentBoxSize: [{ inlineSize: 640, blockSize: 480 }],
                    contentRect: { width: 640, height: 480 } as DOMRectReadOnly,
                } as unknown as ResizeObserverEntry,
            ]);
        });

        expect(result.current).toEqual({ width: 640, height: 480 });
    });

    it('falls back to contentRect when contentBoxSize is absent', () => {
        const div = document.createElement('div');
        const ref: RefObject<HTMLElement | null> = { current: div };
        const { result } = renderHook(() => useElementSize(ref));

        act(() => {
            mockObserverCallback([
                {
                    contentBoxSize: undefined,
                    contentRect: { width: 500, height: 300 } as DOMRectReadOnly,
                } as unknown as ResizeObserverEntry,
            ]);
        });

        expect(result.current).toEqual({ width: 500, height: 300 });
    });

    it('disconnects observer and cancels animation frame on unmount', () => {
        const div = document.createElement('div');
        const ref: RefObject<HTMLElement | null> = { current: div };
        const { unmount } = renderHook(() => useElementSize(ref));

        unmount();

        expect(disconnectMock).toHaveBeenCalled();
        expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });
});
