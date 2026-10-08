import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

export interface UseFocusTrapOptions {
    /**
     * Restore focus to the previously focused element when the trap deactivates.
     * Pass `false` while another dialog (e.g. a nested overlay) takes over focus: the trap then
     * *pauses* instead of releasing, keeping its original return target for when it finally closes.
     */
    restoreFocus?: boolean;
}

export function useFocusTrap(
    containerRef: RefObject<HTMLElement | null>,
    isActive: boolean = true,
    initialFocusRef?: RefObject<HTMLElement | null>,
    options?: UseFocusTrapOptions
) {
    const previousFocusRef = useRef<Element | null>(null);
    const isPausedRef = useRef(false);
    const restoreFocus = options?.restoreFocus ?? true;

    // Read at cleanup time. A captured value would be stale: when isActive and restoreFocus flip
    // together, the cleanup that runs belongs to the previous render. Layout effects commit before
    // passive-effect cleanups, so the ref is current by then.
    const restoreFocusRef = useRef(restoreFocus);
    useLayoutEffect(() => {
        restoreFocusRef.current = restoreFocus;
    }, [restoreFocus]);

    useEffect(() => {
        if (!isActive) return;

        const isResuming = isPausedRef.current;
        isPausedRef.current = false;
        // Keep the original return target when resuming after a nested dialog closed.
        if (!isResuming || !previousFocusRef.current) {
            previousFocusRef.current = document.activeElement;
        }

        // Use a small timeout to ensure the target element is rendered and focusable
        const timer = setTimeout(() => {
            // When resuming, the nested dialog has already returned focus inside us; don't steal it.
            if (isResuming && containerRef.current?.contains(document.activeElement)) return;

            if (initialFocusRef?.current) {
                initialFocusRef.current.focus();
            } else if (containerRef.current) {
                const autoFocusEl = containerRef.current.querySelector<HTMLElement>(
                    '[autofocus], input:not([disabled]), button:not([disabled])'
                );
                if (autoFocusEl) {
                    autoFocusEl.focus();
                } else {
                    containerRef.current.focus();
                }
            }
        }, 10);

        const handleFocusTrap = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !containerRef.current) return;

            const focusable = Array.from(
                containerRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');

            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            const isInside = containerRef.current.contains(document.activeElement);
            if (!isInside) {
                e.preventDefault();
                first.focus();
                return;
            }

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', handleFocusTrap);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleFocusTrap);
            if (!restoreFocusRef.current) {
                isPausedRef.current = true;
                return;
            }
            if (previousFocusRef.current instanceof HTMLElement) {
                previousFocusRef.current.focus();
            }
            previousFocusRef.current = null;
        };
    }, [containerRef, isActive, initialFocusRef]);

    // Declared after the trap effect so its cleanup runs last on unmount. If the owner unmounts while
    // paused (e.g. lightbox closed while Story Maker is open), still hand focus back to the original element.
    useEffect(() => {
        return () => {
            if (isPausedRef.current && previousFocusRef.current instanceof HTMLElement) {
                previousFocusRef.current.focus();
            }
        };
    }, []);
}
