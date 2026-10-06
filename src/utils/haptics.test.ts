import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerHaptic, triggerScrubberHaptic } from './haptics';

describe('haptics utility', () => {
    const originalVibrate = navigator.vibrate;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (originalVibrate) {
            navigator.vibrate = originalVibrate;
        } else {
            // @ts-expect-error cleanup mock property
            delete navigator.vibrate;
        }
    });

    it('triggers tick, tap, success, and warning with respective patterns', () => {
        const vibrateMock = vi.fn();
        navigator.vibrate = vibrateMock;

        triggerHaptic('tick');
        expect(vibrateMock).toHaveBeenCalledWith(10);

        triggerHaptic('tap');
        expect(vibrateMock).toHaveBeenCalledWith(22);

        triggerHaptic('success');
        expect(vibrateMock).toHaveBeenCalledWith([15, 45, 25]);

        triggerHaptic('warning');
        expect(vibrateMock).toHaveBeenCalledWith([30, 40, 30]);
    });

    it('defaults to tick when no type is provided', () => {
        const vibrateMock = vi.fn();
        navigator.vibrate = vibrateMock;

        triggerHaptic();
        expect(vibrateMock).toHaveBeenCalledWith(10);
    });

    it('silently no-ops when navigator.vibrate is undefined (e.g. iOS Safari)', () => {
        // @ts-expect-error test undefined vibrate
        delete navigator.vibrate;

        expect(() => triggerHaptic('tap')).not.toThrow();
    });

    it('swallows errors thrown by navigator.vibrate without throwing', () => {
        navigator.vibrate = vi.fn().mockImplementation(() => {
            throw new Error('SecurityError: Not allowed');
        });

        expect(() => triggerHaptic('tap')).not.toThrow();
    });

    it('suppresses vibration when prefers-reduced-motion is active', () => {
        const vibrateMock = vi.fn();
        navigator.vibrate = vibrateMock;

        vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
            matches: query.includes('prefers-reduced-motion'),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        triggerHaptic('tap');
        expect(vibrateMock).not.toHaveBeenCalled();
    });

    it('throttles triggerScrubberHaptic calls within 60ms', () => {
        const vibrateMock = vi.fn();
        navigator.vibrate = vibrateMock;

        let mockTime = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

        triggerScrubberHaptic();
        expect(vibrateMock).toHaveBeenCalledTimes(1);

        // Immediate next call within 20ms (< 60ms) should be throttled
        mockTime = 1020;
        triggerScrubberHaptic();
        expect(vibrateMock).toHaveBeenCalledTimes(1);

        // Call after 70ms (> 60ms) should fire
        mockTime = 1090;
        triggerScrubberHaptic();
        expect(vibrateMock).toHaveBeenCalledTimes(2);
    });
});
