export type HapticType = 'tick' | 'tap' | 'success' | 'warning';

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
    tick: 10, // 10ms micro-pulse for pills, tabs, swatches, scrubber steps
    tap: 22, // 22ms distinct tap for item selection, favorite toggles
    success: [15, 45, 25], // Double pulse for download / export completion
    warning: [30, 40, 30], // Action limit or error
};

let lastScrubberHapticTime = 0;
const SCRUBBER_THROTTLE_MS = 60;

/**
 * Triggers lightweight haptic feedback on supported mobile devices (Android / Chrome / PWAs).
 * Gracefully no-ops on iOS Safari, devices without Vibration API, and when prefers-reduced-motion is active.
 */
export const triggerHaptic = (type: HapticType = 'tick'): void => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') return;

    // Respect user's OS-level accessibility preference for reduced motion
    try {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
            return;
        }
    } catch {
        // Ignore matchMedia evaluation errors
    }

    try {
        navigator.vibrate(HAPTIC_PATTERNS[type]);
    } catch {
        // Silently ignore any policy or gesture rejections
    }
};

/**
 * Throttled haptic tick specifically for rapid scrubber / slider movements.
 * Prevents vibration motor queue saturation during continuous gestures.
 */
export const triggerScrubberHaptic = (): void => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - lastScrubberHapticTime < SCRUBBER_THROTTLE_MS) return;
    lastScrubberHapticTime = now;
    triggerHaptic('tick');
};

export const _resetScrubberHapticThrottle = (): void => {
    lastScrubberHapticTime = 0;
};
