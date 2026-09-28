import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('calls the debounced callback after the specified delay', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebounce(callback, 200));

        act(() => {
            result.current('hello');
        });

        expect(callback).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(199);
        });
        expect(callback).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('hello');
    });

    it('resets timer when called multiple times within delay window', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebounce(callback, 200));

        act(() => {
            result.current('first');
        });

        act(() => {
            vi.advanceTimersByTime(100);
            result.current('second');
        });

        act(() => {
            vi.advanceTimersByTime(100);
            result.current('third');
        });

        expect(callback).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('third');
    });

    it('uses the latest callback reference', () => {
        let count = 0;
        const fn1 = vi.fn(() => count);
        const { result, rerender } = renderHook(
            ({ cb }) => useDebounce(cb, 100),
            { initialProps: { cb: fn1 } }
        );

        act(() => {
            result.current();
        });

        count = 42;
        const fn2 = vi.fn(() => count);
        rerender({ cb: fn2 });

        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(fn1).not.toHaveBeenCalled();
        expect(fn2).toHaveBeenCalledTimes(1);
        expect(fn2).toHaveReturnedWith(42);
    });

    it('cancels pending execution on unmount', () => {
        const callback = vi.fn();
        const { result, unmount } = renderHook(() => useDebounce(callback, 200));

        act(() => {
            result.current('unmounted');
        });

        unmount();

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(callback).not.toHaveBeenCalled();
    });
});
