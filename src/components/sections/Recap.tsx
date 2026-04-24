import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
declare const __BUILD_NUMBER__: string;

interface RecapProps {
    slug: string;
    count: number;
    overlayText?: string;
    isYear?: boolean;
}

export default function Recap({ slug, count, overlayText, isYear }: RecapProps) {
    // Generate an array of numbers [1, 2, ..., min(count, 24)]
    const slices = Array.from({ length: Math.min(count, 24) }, (_, i) => i + 1);

    const [isMobile, setIsMobile] = useState(false);
    const [visibleCount, setVisibleCount] = useState(24);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 800);
            if (window.innerWidth <= 600) setVisibleCount(8);
            else if (window.innerWidth <= 900) setVisibleCount(12);
            else if (window.innerWidth <= 1200) setVisibleCount(16);
            else setVisibleCount(24);
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
