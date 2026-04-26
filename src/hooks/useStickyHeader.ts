import { useEffect, useState, useRef } from 'react';

export function useStickyHeader() {
    const [isSticky, setIsSticky] = useState(false);
    const stickyRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                const past = !entry.isIntersecting && entry.boundingClientRect.top <= 48;
                setIsSticky(past);

                if (past) {
                    document.body.classList.add('has-stuck-portfolio');
                    if (stickyRef.current) {
                        document.documentElement.style.setProperty(
                            '--portfolio-stuck-height',
                            `${stickyRef.current.offsetHeight}px`
                        );
                    }
                } else {
                    document.body.classList.remove('has-stuck-portfolio');
                    document.documentElement.style.removeProperty('--portfolio-stuck-height');
                }
            },
            {
                threshold: [0],
                rootMargin: '-48px 0px 0px 0px',
            }
        );

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Keep height synced if window resizes or sticky content changes
    useEffect(() => {
        if (isSticky && stickyRef.current) {
            document.documentElement.style.setProperty(
                '--portfolio-stuck-height',
                `${stickyRef.current.offsetHeight}px`
            );
        }
    }, [isSticky]);

    return { isSticky, setIsSticky, stickyRef, sentinelRef };
}
