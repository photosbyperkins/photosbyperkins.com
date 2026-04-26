import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { usePortfolioStore } from '../../store/usePortfolioStore';
import { useDebounce } from '../../hooks/useDebounce';
declare const __BUILD_NUMBER__: string;

interface RecapEventMeta {
    eventName: string;
    photoIndex: number;
}

interface RecapProps {
    slug: string;
    count: number;
    events?: RecapEventMeta[];
    overlayText?: string;
    isYear?: boolean;
    onRecapLoadComplete?: () => void;
}
interface RecapSliceItemProps {
    sliceNumber: number;
    idx: number;
    slug: string;
    events?: RecapEventMeta[];
    eventIdx: number;
    onLoad?: () => void;
}

const RecapSliceItem = ({ sliceNumber, idx, slug, events, eventIdx, onLoad }: RecapSliceItemProps) => {
    const recapSrc = `/recap/${slug}/photo_${sliceNumber}.webp`;
    const [isLoaded, setIsLoaded] = useState(false);
    const setSharedPhoto = usePortfolioStore((state) => state.setSharedPhoto);

    return (
        <motion.div
            id={`recap-slice-${idx}`}
            layout
            className="recap__slice"
            aria-label={`View recap image ${sliceNumber}`}
            onClick={() => {
                if (events && events[eventIdx]) {
                    const meta = events[eventIdx];
                    setSharedPhoto({ eventName: meta.eventName, photoIndex: meta.photoIndex });
                }
            }}
            initial={{ rotateY: -180, opacity: 0 }}
            animate={isLoaded ? { rotateY: 0, opacity: 1 } : { rotateY: -180, opacity: 0 }}
            transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
        >
            <img
                src={`${recapSrc}?v=${__BUILD_NUMBER__}`}
                alt={`Recap Image ${idx + 1}`}
                className="recap__img"
                loading="lazy"
                onLoad={() => {
                    setIsLoaded(true);
                    if (onLoad) onLoad();
                }}
            />
        </motion.div>
    );
};

export default function Recap({ slug, count, events, overlayText, isYear, onRecapLoadComplete }: RecapProps) {
    const [visibleCount, setVisibleCount] = useState(48);
    const [loadedCount, setLoadedCount] = useState(0);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoadedCount(0);
    }, [slug]);

    const slices = useMemo(() => {
        if (visibleCount >= count) {
            return Array.from({ length: count }, (_, i) => i + 1);
        }

        if (!events || events.length === 0) {
            const indices = [];
            for (let i = 0; i < visibleCount; i++) {
                indices.push(Math.round((i * (count - 1)) / (visibleCount - 1)));
            }
            return indices.map((idx) => idx + 1);
        }

        const groups: number[][] = [];
        let currentEvent = events[0].eventName;
        let currentGroup: number[] = [0];

        for (let i = 1; i < count; i++) {
            if (events[i].eventName !== currentEvent) {
                groups.push(currentGroup);
                currentGroup = [i];
                currentEvent = events[i].eventName;
            } else {
                currentGroup.push(i);
            }
        }
        groups.push(currentGroup);

        const idealGroupIndices = [];
        for (let i = 0; i < visibleCount; i++) {
            idealGroupIndices.push(Math.round((i * (groups.length - 1)) / (visibleCount - 1)));
        }

        const groupPickCounts = new Array(groups.length).fill(0);
        idealGroupIndices.forEach((gIdx) => groupPickCounts[gIdx]++);

        const finalIndices: number[] = [];
        for (let g = 0; g < groups.length; g++) {
            const group = groups[g];
            let picks = groupPickCounts[g];
            if (picks === 0) continue;

            if (picks > group.length) picks = group.length;

            if (picks === 1) {
                if (g === 0) finalIndices.push(group[0]);
                else if (g === groups.length - 1) finalIndices.push(group[group.length - 1]);
                else finalIndices.push(group[Math.floor(group.length / 2)]);
            } else {
                for (let i = 0; i < picks; i++) {
                    const idxInGroup = Math.round((i * (group.length - 1)) / (picks - 1));
                    finalIndices.push(group[idxInGroup]);
                }
            }
        }

        if (finalIndices.length < visibleCount) {
            const unselected = Array.from({ length: count }, (_, i) => i).filter((i) => !finalIndices.includes(i));
            const needed = visibleCount - finalIndices.length;
            for (let i = 0; i < needed; i++) {
                if (unselected.length > 0) {
                    const pickIndex = Math.floor((i * unselected.length) / needed);
                    const pick = unselected[pickIndex];
                    finalIndices.push(pick);
                    unselected.splice(pickIndex, 1);
                }
            }
        }

        finalIndices.sort((a, b) => a - b);
        return finalIndices.map((idx) => idx + 1);
    }, [visibleCount, count, events]);

    const checkMobile = useCallback(() => {
        const w = window.innerWidth;
        // Target roughly 65px per slice for maximum granularity, clamped between 6 and 48
        const calculatedSlices = Math.floor(w / 65);
        setVisibleCount(Math.max(6, Math.min(48, calculatedSlices)));
    }, []);

    const debouncedCheckMobile = useDebounce(checkMobile, 150);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        checkMobile();
        window.addEventListener('resize', debouncedCheckMobile);
        return () => window.removeEventListener('resize', debouncedCheckMobile);
    }, [checkMobile, debouncedCheckMobile]);

    useEffect(() => {
        if (slices.length > 0 && loadedCount >= slices.length) {
            if (onRecapLoadComplete) onRecapLoadComplete();
        }
    }, [loadedCount, slices.length, onRecapLoadComplete]);

    if (slices.length === 0) {
        if (onRecapLoadComplete) onRecapLoadComplete(); // Signal completion immediately if nothing to load
        return null;
    }

    return (
        <section className="recap" id="recap" style={{ '--total-slices': slices.length } as React.CSSProperties}>
            <div className="recap__grid">
                {slices.map((sliceNumber, idx) => (
                    <RecapSliceItem
                        key={`/recap/${slug}/photo_${sliceNumber}.webp`}
                        sliceNumber={sliceNumber}
                        idx={idx}
                        slug={slug}
                        events={events}
                        eventIdx={sliceNumber - 1}
                        onLoad={() => setLoadedCount((prev) => prev + 1)}
                    />
                ))}
                {overlayText && (
                    <div className={`recap__overlay-text ${isYear ? 'recap__overlay-text--year' : ''}`}>
                        {overlayText}
                    </div>
                )}
            </div>
        </section>
    );
}
