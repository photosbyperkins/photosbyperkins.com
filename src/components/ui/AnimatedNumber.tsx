import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface AnimatedNumberProps {
    value: number;
    /** Tween duration in seconds. */
    duration?: number;
    format?: (n: number) => string;
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const defaultFormat = (n: number) => n.toLocaleString();

/**
 * Renders `value`, and when it *changes* tweens from what's currently shown to the new value.
 * First mount renders the final value immediately (no count-up from 0), so it is stable for
 * tests, screen readers and slow first paints. Honors prefers-reduced-motion.
 * Intentionally framer-free: a tiny rAF tween keeps it independent of motion mocks/bundles.
 */
export default function AnimatedNumber({ value, duration = 0.9, format = defaultFormat }: AnimatedNumberProps) {
    const reduced = useReducedMotion();
    const [prevValue, setPrevValue] = useState(value);
    const [anim, setAnim] = useState<{ from: number; to: number } | null>(null);
    const [progress, setProgress] = useState(0);

    const shown = anim ? anim.from + (anim.to - anim.from) * easeOutExpo(progress) : value;

    // Adjust state during render (same pattern as ProgressiveImage) so the first frame after a
    // change still shows the previous number instead of flashing the new one.
    if (value !== prevValue) {
        setPrevValue(value);
        if (reduced) {
            setAnim(null);
        } else {
            setAnim({ from: anim ? shown : prevValue, to: value });
            setProgress(0);
        }
    }

    useEffect(() => {
        if (!anim) return;
        let raf = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min(1, (now - start) / (duration * 1000));
            setProgress(p);
            if (p < 1) {
                raf = requestAnimationFrame(tick);
            } else {
                setAnim(null);
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [anim, duration]);

    return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{format(Math.round(shown))}</span>;
}
