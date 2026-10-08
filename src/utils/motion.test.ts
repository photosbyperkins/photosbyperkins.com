import { describe, it, expect } from 'vitest';
import { EASE_OUT_EXPO, EASE_IN_OUT, EASE_IN, EASE_OUT_EXPO_STRONG, DURATION, SPRING_SLIDE, fadeUp } from './motion';

describe('motion tokens', () => {
    it('defines cubic-bezier curves with four control values', () => {
        expect(EASE_OUT_EXPO).toHaveLength(4);
        expect(EASE_IN_OUT).toHaveLength(4);
        expect(EASE_IN).toHaveLength(4);
        expect(EASE_OUT_EXPO_STRONG).toHaveLength(4);
    });

    it('orders durations ascending', () => {
        expect(DURATION.press).toBeLessThan(DURATION.instant);
        expect(DURATION.instant).toBeLessThan(DURATION.fast);
        expect(DURATION.fast).toBeLessThan(DURATION.base);
        expect(DURATION.base).toBeLessThan(DURATION.modal);
        expect(DURATION.modal).toBeLessThan(DURATION.slow);
    });

    it('defines expected springs', () => {
        expect(SPRING_SLIDE).toMatchObject({ type: 'spring', stiffness: 450 });
    });

    it('fadeUp builds a short, decelerating entrance with a gentler exit', () => {
        const f = fadeUp(10, 0.2);
        expect(f.initial).toEqual({ opacity: 0, y: 10 });
        expect(f.animate).toEqual({ opacity: 1, y: 0 });
        expect(f.exit.y).toBe(5);
        expect(f.transition).toMatchObject({ duration: 0.2 });
    });
});
