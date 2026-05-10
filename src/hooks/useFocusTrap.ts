import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, isActive: boolean = true) {
    const previousFocusRef = useRef<Element | null>(null);

    useEffect(() => {
        if (!isActive) return;

        previousFocusRef.current = document.activeElement;

        // Use a small timeout to ensure the container is rendered and focusable
        setTimeout(() => {
            if (containerRef.current) {
                containerRef.current.focus();
            }
        }, 10);

        const handleFocusTrap = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !containerRef.current) return;

            const focusable = containerRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

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
            window.removeEventListener('keydown', handleFocusTrap);
            if (previousFocusRef.current instanceof HTMLElement) {
                previousFocusRef.current.focus();
            }
        };
    }, [containerRef, isActive]);
}
