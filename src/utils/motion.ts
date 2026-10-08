import type { Transition } from 'framer-motion';

export const EASE_OUT_EXPO = [0.23, 1, 0.32, 1] as const; // already the house curve
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;
/** Story preview panel curve ported from the sizzle reel; intentionally sharper than house. */
export const EASE_OUT_EXPO_STRONG = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
    instant: 0.12,
    press: 0.07,
    fast: 0.18,
    base: 0.3,
    modal: 0.45,
    slow: 0.55,
} as const;

/** Matches the existing layoutId pill springs (StoryLayoutTab, StoryBadgesTab, etc.) */
export const SPRING_SNAPPY: Transition = { type: 'spring', stiffness: 500, damping: 38 };
/** Matches the floating dock */
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 320, damping: 26 };
/** For tiny pops (badges, counters) */
export const SPRING_POP: Transition = { type: 'spring', stiffness: 600, damping: 22, mass: 0.6 };
/** Lightbox swipe pagination */
export const SPRING_SLIDE: Transition = { type: 'spring', stiffness: 450, damping: 40, restDelta: 0.5 };
/** Scrubber track glide settle */
export const SPRING_SETTLE: Transition = { type: 'spring', stiffness: 400, damping: 40 };
/** Zoom pan/scale spring */
export const SPRING_ZOOM: Transition = { type: 'spring', stiffness: 280, damping: 30 };
/** Story mobile bottom sheet */
export const SPRING_SHEET: Transition = { type: 'spring', stiffness: 380, damping: 34 };

export const fadeUp = (
    distance = 8,
    duration: number = DURATION.base
): {
    initial: { opacity: number; y: number };
    animate: { opacity: number; y: number };
    exit: { opacity: number; y: number };
    transition: Transition;
} => ({
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: distance / 2 },
    transition: { duration, ease: EASE_OUT_EXPO },
});
