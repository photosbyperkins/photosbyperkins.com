import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

describe('useMediaQuery', () => {
    let listeners: Array<(e: MediaQueryListEvent) => void> = [];
    let currentMatches = false;

    beforeEach(() => {
        listeners = [];
        currentMatches = false;

        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: currentMatches,
            media: query,
            onchange: null,
            addListener: vi.fn((fn) => listeners.push(fn)),
            removeListener: vi.fn((fn) => {
                listeners = listeners.filter((l) => l !== fn);
            }),
            addEventListener: vi.fn((event, fn) => {
                if (event === 'change') listeners.push(fn);
            }),
            removeEventListener: vi.fn((event, fn) => {
                if (event === 'change') {
                    listeners = listeners.filter((l) => l !== fn);
                }
            }),
            dispatchEvent: vi.fn(),
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns initial matching value false when query does not match', () => {
        currentMatches = false;
        const { result } = renderHook(() => useMediaQuery('(max-width: 860px)'));
        expect(result.current).toBe(false);
    });

    it('returns initial matching value true when query matches', () => {
        currentMatches = true;
        const { result } = renderHook(() => useMediaQuery('(max-width: 860px)'));
        expect(result.current).toBe(true);
    });

    it('updates state when media query changes dynamically', () => {
        currentMatches = false;
        const { result } = renderHook(() => useMediaQuery('(max-width: 860px)'));
        expect(result.current).toBe(false);

        act(() => {
            currentMatches = true;
            listeners.forEach((listener) =>
                listener({ matches: true, media: '(max-width: 860px)' } as MediaQueryListEvent)
            );
        });

        expect(result.current).toBe(true);
    });

    it('cleans up event listener on unmount', () => {
        const { unmount } = renderHook(() => useMediaQuery('(max-width: 860px)'));
        expect(listeners.length).toBe(1);

        unmount();
        expect(listeners.length).toBe(0);
    });
});
