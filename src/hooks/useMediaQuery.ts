import { useCallback, useSyncExternalStore } from 'react';

/**
 * Custom hook that listens to a CSS media query and returns whether it matches.
 *
 * @param query The media query string to match, e.g. '(max-width: 860px)'.
 * @returns boolean indicating if the document matches the media query.
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (callback: () => void) => {
            if (typeof window === 'undefined' || !window.matchMedia) {
                return () => {};
            }

            const mql = window.matchMedia(query);
            if (mql.addEventListener) {
                mql.addEventListener('change', callback);
                return () => mql.removeEventListener('change', callback);
            } else if ('addListener' in mql) {
                // Deprecated fallback for older environments
                const legacyMql = mql as unknown as {
                    addListener: (cb: () => void) => void;
                    removeListener: (cb: () => void) => void;
                };
                legacyMql.addListener(callback);
                return () => legacyMql.removeListener(callback);
            }
            return () => {};
        },
        [query]
    );

    const getSnapshot = useCallback(() => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return false;
        }
        return window.matchMedia(query).matches;
    }, [query]);

    const getServerSnapshot = useCallback(() => false, []);

    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
