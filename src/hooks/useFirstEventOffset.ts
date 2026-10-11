import { useLayoutEffect, useEffect, useRef, type RefObject } from 'react';

// SSR-safe layout effect: runs synchronously before browser paint on the client to avoid flash
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Publishes the distance from the top of the events list to its first event card as
 * `--first-event-offset` on the list's parent (`.portfolio__events-wrapper`).
 *
 * The sticky month/year tracks use it as their initial top margin so they line up with
 * the first event even when a favorites header or year divider precedes it.
 */
export function useFirstEventOffset(containerRef: RefObject<HTMLElement | null>, selector = '.portfolio__event') {
    const prevOffsetRef = useRef<number | null>(null);

    useIsomorphicLayoutEffect(() => {
        const container = containerRef.current;
        const wrapper = container?.parentElement;
        if (!container || !wrapper) return;

        let frame = 0;
        const update = () => {
            frame = 0;
            const first = container.querySelector<HTMLElement>(selector);
            // Bounding client rect difference is robust against container-type queries,
            // flex alignments, and offsetParent variations.
            const offset = first
                ? Math.max(0, Math.round(first.getBoundingClientRect().top - container.getBoundingClientRect().top))
                : 0;

            if (prevOffsetRef.current !== offset) {
                prevOffsetRef.current = offset;
                wrapper.style.setProperty('--first-event-offset', `${offset}px`);
            }
        };

        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        // Run synchronously before paint so the track doesn't visually flash at 0px
        update();

        // Observe container box changes, DOM children additions/removals, and viewport resizes
        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
        resizeObserver?.observe(container);
        const mutationObserver = new MutationObserver(schedule);
        mutationObserver.observe(container, { childList: true, subtree: false });

        window.addEventListener('resize', schedule, { passive: true });

        return () => {
            if (frame) cancelAnimationFrame(frame);
            resizeObserver?.disconnect();
            mutationObserver.disconnect();
            window.removeEventListener('resize', schedule);
            wrapper.style.removeProperty('--first-event-offset');
            prevOffsetRef.current = null;
        };
    }, [containerRef, selector]);
}
