import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollSpy } from './useScrollSpy';

describe('useScrollSpy', () => {
    let mockObserverCallback: (entries: IntersectionObserverEntry[]) => void;
    let observeMock: ReturnType<typeof vi.fn>;
    let disconnectMock: ReturnType<typeof vi.fn>;
    let originalIntersectionObserver: typeof IntersectionObserver;

    beforeEach(() => {
        vi.useFakeTimers();
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
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        window.IntersectionObserver = originalIntersectionObserver;
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('observes section elements that are present in the DOM', () => {
        const sec1 = document.createElement('div');
        sec1.id = 'section-1';
        const sec2 = document.createElement('div');
        sec2.id = 'section-2';
        document.body.appendChild(sec1);
        document.body.appendChild(sec2);

        const onSectionChange = vi.fn();
        renderHook(() => useScrollSpy(['section-1', 'section-2'], onSectionChange));

        expect(observeMock).toHaveBeenCalledWith(sec1);
        expect(observeMock).toHaveBeenCalledWith(sec2);
    });

    it('calls onSectionChange when an entry is intersecting', () => {
        const sec1 = document.createElement('div');
        sec1.id = 'section-1';
        document.body.appendChild(sec1);

        const onSectionChange = vi.fn();
        renderHook(() => useScrollSpy(['section-1'], onSectionChange));

        act(() => {
            mockObserverCallback([
                {
                    isIntersecting: true,
                    target: sec1,
                } as unknown as IntersectionObserverEntry,
            ]);
        });

        expect(onSectionChange).toHaveBeenCalledWith('section-1');
    });

    it('ignores non-intersecting entries', () => {
        const sec1 = document.createElement('div');
        sec1.id = 'section-1';
        document.body.appendChild(sec1);

        const onSectionChange = vi.fn();
        renderHook(() => useScrollSpy(['section-1'], onSectionChange));

        act(() => {
            mockObserverCallback([
                {
                    isIntersecting: false,
                    target: sec1,
                } as unknown as IntersectionObserverEntry,
            ]);
        });

        expect(onSectionChange).not.toHaveBeenCalled();
    });

    it('polls via interval when some sections are initially missing from DOM', () => {
        const onSectionChange = vi.fn();
        renderHook(() => useScrollSpy(['section-delayed'], onSectionChange));

        expect(observeMock).not.toHaveBeenCalled();

        // Delayed DOM insertion
        const delayedSec = document.createElement('div');
        delayedSec.id = 'section-delayed';
        document.body.appendChild(delayedSec);

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(observeMock).toHaveBeenCalledWith(delayedSec);
    });

    it('disconnects observer and cleans up polling interval on unmount', () => {
        const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
        const onSectionChange = vi.fn();
        const { unmount } = renderHook(() => useScrollSpy(['missing-sec'], onSectionChange));

        unmount();

        expect(disconnectMock).toHaveBeenCalled();
        expect(clearIntervalSpy).toHaveBeenCalled();
    });
});
