import { useState, useEffect } from 'react';

/**
 * Custom hook that listens to a CSS media query and returns whether it matches.
 *
 * @param query The media query string to match, e.g. '(max-width: 860px)'.
 * @returns boolean indicating if the document matches the media query.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const mql = window.matchMedia(query);
        setMatches(mql.matches);

        const handler = (e: MediaQueryListEvent) => {
            setMatches(e.matches);
        };

        if (mql.addEventListener) {
            mql.addEventListener('change', handler);
            return () => mql.removeEventListener('change', handler);
        } else if ('addListener' in mql) {
            // Deprecated fallback for older environments
            (mql as unknown as { addListener: (h: (e: MediaQueryListEvent) => void) => void }).addListener(handler);
            return () => {
                (mql as unknown as { removeListener: (h: (e: MediaQueryListEvent) => void) => void }).removeListener(
                    handler
                );
            };
        }
    }, [query]);

    return matches;
}
