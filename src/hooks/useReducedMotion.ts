import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function getInitialState(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
}

/**
 * Returns `true` when the user has enabled "reduce motion" in their OS settings.
 * Reacts to runtime changes (e.g. toggling the setting while the page is open).
 */
export function useReducedMotion(): boolean {
    const [prefersReduced, setPrefersReduced] = useState(getInitialState);

    useEffect(() => {
        const mql = window.matchMedia(QUERY);
        const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    return prefersReduced;
}
