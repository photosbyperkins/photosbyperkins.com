import { useRef, useCallback } from 'react';
import type { RefObject } from 'react';

export function usePortfolioScroll(_portfolioRef?: RefObject<HTMLDivElement | null>) {
    const scrollOnNextDataLoadRef = useRef(false);

    const handleDataLoad = useCallback(() => {
        if (scrollOnNextDataLoadRef.current) {
            scrollOnNextDataLoadRef.current = false;
            // Ensure DOM has updated before scrolling to top
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }, 50);
        }
    }, []);

    return { scrollOnNextDataLoadRef, handleDataLoad };
}
