import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';

describe('useReducedMotion', () => {
    let listeners: ((e: MediaQueryListEvent) => void)[] = [];

    afterEach(() => {
        listeners = [];
        vi.restoreAllMocks();
    });

    function mockMatchMedia(matches: boolean) {
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
                listeners.push(handler);
            }),
            removeEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
                listeners = listeners.filter((h) => h !== handler);
            }),
            dispatchEvent: vi.fn(),
        }));
    }

    it('returns false when prefers-reduced-motion is false', () => {
        mockMatchMedia(false);
        const { result } = renderHook(() => useReducedMotion());
        expect(result.current).toBe(false);
    });

    it('returns true when prefers-reduced-motion is true', () => {
        mockMatchMedia(true);
        const { result } = renderHook(() => useReducedMotion());
        expect(result.current).toBe(true);
    });

    it('updates state when media query change event fires', () => {
        mockMatchMedia(false);
        const { result } = renderHook(() => useReducedMotion());
        expect(result.current).toBe(false);

        act(() => {
            listeners.forEach((fn) => fn({ matches: true } as MediaQueryListEvent));
        });

        expect(result.current).toBe(true);
    });
});
