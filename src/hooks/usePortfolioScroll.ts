import { useRef, useCallback } from 'react';

export function usePortfolioScroll(portfolioRef: React.RefObject<HTMLDivElement | null>) {
    const scrollOnNextDataLoadRef = useRef(false);

    const handleDataLoad = useCallback(() => {
        if (scrollOnNextDataLoadRef.current) {
            scrollOnNextDataLoadRef.current = false;
            // Add a small delay to ensure DOM has updated with new data before scrolling
            setTimeout(() => {
                if (portfolioRef.current) {
                    portfolioRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
    }, [portfolioRef]);

    return { scrollOnNextDataLoadRef, handleDataLoad };
}
