import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCanShare } from './useCanShare';

describe('useCanShare', () => {
    const originalNavigator = window.navigator;

    afterEach(() => {
        Object.defineProperty(window, 'navigator', {
            value: originalNavigator,
            writable: true,
            configurable: true,
        });
    });

    it('returns false when navigator.share is undefined', () => {
        Object.defineProperty(window, 'navigator', {
            value: {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                maxTouchPoints: 0,
            },
            writable: true,
            configurable: true,
        });

        const { result } = renderHook(() => useCanShare());
        expect(result.current).toBe(false);
    });

    it('returns true on mobile user agents when navigator.share is present', () => {
        Object.defineProperty(window, 'navigator', {
            value: {
                share: () => Promise.resolve(),
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
                maxTouchPoints: 5,
            },
            writable: true,
            configurable: true,
        });

        const { result } = renderHook(() => useCanShare());
        expect(result.current).toBe(true);
    });

    it('returns true on iPadOS desktop UA when touch points > 1 and share is present', () => {
        Object.defineProperty(window, 'navigator', {
            value: {
                share: () => Promise.resolve(),
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                maxTouchPoints: 5,
            },
            writable: true,
            configurable: true,
        });

        const { result } = renderHook(() => useCanShare());
        expect(result.current).toBe(true);
    });
});
