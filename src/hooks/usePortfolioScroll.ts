import { useRef, useCallback } from 'react';
import { scrollToElement } from '../utils/scroll';

export function usePortfolioScroll(portfolioRef: React.RefObject<HTMLDivElement | null>) {
    const scrollOnNextDataLoadRef = useRef(false);

    const handleDataLoad = useCallback(() => {
        if (scrollOnNextDataLoadRef.current) {
            scrollOnNextDataLoadRef.current = false;
            // Ensure DOM has updated before scrolling to top
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'instant' });
            }, 50);
        }
    }, [portfolioRef]);

    return { scrollOnNextDataLoadRef, handleDataLoad };
}
