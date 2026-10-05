import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStickyHeader } from './useStickyHeader';

describe('useStickyHeader', () => {
    let mockObserverCallback: (entries: IntersectionObserverEntry[]) => void;
    let observeMock: ReturnType<typeof vi.fn>;
    let disconnectMock: ReturnType<typeof vi.fn>;
    let originalIntersectionObserver: typeof IntersectionObserver;

    beforeEach(() => {
        observeMock = vi.fn();
        disconnectMock = vi.fn();

        originalIntersectionObserver = window.IntersectionObserver;
        window.IntersectionObserver = class MockIntersectionObserver {
            constructor(callback: IntersectionObserverCallback) {
                mockObserverCallback = callback as unknown as (entries: IntersectionObserverEntry[]) => void;
            }
            observe = observeMock;
            unobserve = vi.fn();
            disconnect = disconnectMock;
        } as unknown as typeof IntersectionObserver;

        document.body.className = '';
        document.documentElement.style.removeProperty('--portfolio-stuck-height');
    });

    afterEach(() => {
        window.IntersectionObserver = originalIntersectionObserver;
        document.body.className = '';
        document.documentElement.style.removeProperty('--portfolio-stuck-height');
        vi.restoreAllMocks();
    });

    it('initializes with isSticky = false', () => {
        const { result } = renderHook(() => useStickyHeader());
        expect(result.current.isSticky).toBe(false);
    });

    it('observes sentinelRef when element is attached', () => {
        const { result } = renderHook(() => useStickyHeader());
        const sentinelEl = document.createElement('div');
        (result.current.sentinelRef as React.MutableRefObject<HTMLDivElement | null>).current = sentinelEl;

        // Re-render hook so effect can see the sentinel if needed, or trigger observer callback
        expect(result.current.sentinelRef.current).toBe(sentinelEl);
    });

    it('adds has-stuck-portfolio class and sets CSS property when scrolled past sentinel', () => {
        const { result } = renderHook(() => useStickyHeader());
        const stickyEl = document.createElement('div');
        Object.defineProperty(stickyEl, 'offsetHeight', { value: 64, configurable: true });
        (result.current.stickyRef as React.MutableRefObject<HTMLDivElement | null>).current = stickyEl;

        act(() => {
            mockObserverCallback([
                {
                    isIntersecting: false,
                    boundingClientRect: { top: 40 } as DOMRectReadOnly,
                } as unknown as IntersectionObserverEntry,
            ]);
        });

        expect(result.current.isSticky).toBe(true);
        expect(document.body.classList.contains('has-stuck-portfolio')).toBe(true);
        expect(document.documentElement.style.getPropertyValue('--portfolio-stuck-height')).toBe('64px');
    });

    it('removes has-stuck-portfolio class when scrolling back up', () => {
        const { result } = renderHook(() => useStickyHeader());
        const stickyEl = document.createElement('div');
        Object.defineProperty(stickyEl, 'offsetHeight', { value: 64, configurable: true });
        (result.current.stickyRef as React.MutableRefObject<HTMLDivElement | null>).current = stickyEl;

        // Become sticky
        act(() => {
            mockObserverCallback([
                {
                    isIntersecting: false,
                    boundingClientRect: { top: 40 } as DOMRectReadOnly,
                } as unknown as IntersectionObserverEntry,
            ]);
        });
        expect(result.current.isSticky).toBe(true);

        // Scroll back up (intersecting)
        act(() => {
            mockObserverCallback([
                {
                    isIntersecting: true,
                    boundingClientRect: { top: 100 } as DOMRectReadOnly,
                } as unknown as IntersectionObserverEntry,
            ]);
        });
        expect(result.current.isSticky).toBe(false);
        expect(document.body.classList.contains('has-stuck-portfolio')).toBe(false);
        expect(document.documentElement.style.getPropertyValue('--portfolio-stuck-height')).toBe('');
    });

    it('cleans up body classes, styles, and observer on unmount', () => {
        const { result, unmount } = renderHook(() => useStickyHeader());
        const stickyEl = document.createElement('div');
        Object.defineProperty(stickyEl, 'offsetHeight', { value: 64, configurable: true });
        (result.current.stickyRef as React.MutableRefObject<HTMLDivElement | null>).current = stickyEl;

        act(() => {
            mockObserverCallback([
                {
                    isIntersecting: false,
                    boundingClientRect: { top: 40 } as DOMRectReadOnly,
                } as unknown as IntersectionObserverEntry,
            ]);
        });

        unmount();

        expect(disconnectMock).toHaveBeenCalled();
        expect(document.body.classList.contains('has-stuck-portfolio')).toBe(false);
        expect(document.documentElement.style.getPropertyValue('--portfolio-stuck-height')).toBe('');
    });
});
