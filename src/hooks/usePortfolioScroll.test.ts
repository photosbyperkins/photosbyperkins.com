import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePortfolioScroll } from './usePortfolioScroll';

describe('usePortfolioScroll', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.scrollTo = vi.fn();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('initializes with scrollOnNextDataLoadRef.current = false', () => {
        const { result } = renderHook(() => usePortfolioScroll());
        expect(result.current.scrollOnNextDataLoadRef.current).toBe(false);
    });

    it('does not scroll when handleDataLoad is called with scrollOnNextDataLoadRef false', () => {
        const { result } = renderHook(() => usePortfolioScroll());

        act(() => {
            result.current.handleDataLoad();
            vi.advanceTimersByTime(100);
        });

        expect(window.scrollTo).not.toHaveBeenCalled();
    });

    it('scrolls to top when handleDataLoad is called with scrollOnNextDataLoadRef true', () => {
        const { result } = renderHook(() => usePortfolioScroll());

        result.current.scrollOnNextDataLoadRef.current = true;

        act(() => {
            result.current.handleDataLoad();
        });

        expect(result.current.scrollOnNextDataLoadRef.current).toBe(false);

        act(() => {
            vi.advanceTimersByTime(50);
        });

        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    });
});
