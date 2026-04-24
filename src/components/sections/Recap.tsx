import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
declare const __BUILD_NUMBER__: string;

interface RecapProps {
    slug: string;
    count: number;
    events?: string[];
    overlayText?: string;
    isYear?: boolean;
}

export default function Recap({ slug, count, events, overlayText, isYear }: RecapProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [visibleCount, setVisibleCount] = useState(48);

    // Generate an array of numbers [1, 2, ..., min(count, visibleCount)]
    const slices = Array.from({ length: Math.min(count, visibleCount) }, (_, i) => i + 1);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 800);
            const w = window.innerWidth;
            if (w <= 600) setVisibleCount(8);
            else if (w <= 900) setVisibleCount(12);
            else if (w <= 1200) setVisibleCount(16);
            else if (w <= 1600) setVisibleCount(24);
            else if (w <= 2400) setVisibleCount(32);
            else setVisibleCount(48);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (slices.length === 0) return null;

    return (
        <section className="recap" id="recap" style={{ '--total-slices': slices.length } as React.CSSProperties}>
            <div className="recap__grid">
                {slices.map((sliceNumber, idx) => {
                    const recapSrc = `/recap/${slug}/photo_${sliceNumber}.webp`;

                    return (
                        <motion.div
                            id={`recap-slice-${idx}`}
                            layout
                            key={recapSrc}
                            className="recap__slice"
                            aria-label={`View recap image ${sliceNumber}`}
                            onClick={() => {
                                if (events && events[idx]) {
                                    const eventElement = document.getElementById(
                                        `event-${(events[idx] || '').replace(/[^a-zA-Z0-9-]/g, '-')}`
                                    );
                                    if (eventElement) {
                                        eventElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                                    }
                                }
                            }}
                        >
                            <img
                                src={`${recapSrc}?v=${__BUILD_NUMBER__}`}
                                alt={`Recap Image ${idx + 1}`}
                                className="recap__img"
                                loading={idx < 12 ? 'eager' : 'lazy'}
                                fetchPriority={idx < 12 ? 'high' : 'auto'}
                            />
                        </motion.div>
                    );
                })}
                {overlayText && (
                    <div className={`recap__overlay-text ${isYear ? 'recap__overlay-text--year' : ''}`}>
                        {overlayText}
                    </div>
                )}
            </div>
        </section>
    );
}
