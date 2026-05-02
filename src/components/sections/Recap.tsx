import { motion } from 'framer-motion';
import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { usePortfolioStore } from '../../store/usePortfolioStore';

declare const __BUILD_NUMBER__: string;

// Caches the expensive slices computation across remounts.
const slicesComputeCache = new Map<string, number[]>();

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
    sliceIndex: number;
    totalSlices: number;
    idx: number;
    slug: string;
    events?: RecapEventMeta[];
    eventIdx: number;
    reducedMotion?: boolean;
    spriteLoaded: boolean;
}

const RecapSliceItem = memo(function RecapSliceItem({
    sliceIndex,
    totalSlices,
    idx,
    slug,
    events,
    eventIdx,
    reducedMotion,
    spriteLoaded,
}: RecapSliceItemProps) {
    const setSharedPhoto = usePortfolioStore((state) => state.setSharedPhoto);

    // Each frame fills the slice exactly — bgSize stretches the sprite so each
    // frame = container width, bgPosition picks the right one via percentage.
    // With fixed 260px height and ~65px slice width, the native 1:4 ratio is preserved.
    const bgPosition = `${totalSlices > 1 ? (sliceIndex / (totalSlices - 1)) * 100 : 0}% 0`;
    const bgSize = `${totalSlices * 100}% 100%`;

    return (
        <motion.div
            id={`recap-slice-${idx}`}
            layout
            className="recap__slice"
            aria-label={`View recap image ${sliceIndex + 1}`}
            onClick={() => {
                if (events && events[eventIdx]) {
                    const meta = events[eventIdx];
                    setSharedPhoto({ eventName: meta.eventName, photoIndex: meta.photoIndex });
                }
            }}
            initial={reducedMotion ? { opacity: 0 } : { rotateY: -180, opacity: 0 }}
            animate={
                spriteLoaded
                    ? reducedMotion
                        ? { opacity: 1 }
                        : { rotateY: 0, opacity: 1 }
                    : reducedMotion
                      ? { opacity: 0 }
                      : { rotateY: -180, opacity: 0 }
            }
            transition={reducedMotion ? { duration: 0 } : { duration: 0.8, type: 'spring', bounce: 0.3 }}
        >
            <div
                className="recap__sprite-slice"
                style={{
                    backgroundImage: `url(/recap/${slug}/sprite.webp?v=${__BUILD_NUMBER__})`,
                    backgroundPosition: bgPosition,
                    backgroundSize: bgSize,
                }}
            />
        </motion.div>
    );
});

export default function Recap({ slug, count, events, overlayText, isYear, onRecapLoadComplete }: RecapProps) {
    const [visibleCount, setVisibleCount] = useState(48);
    const [spriteLoaded, setSpriteLoaded] = useState(false);
    const reducedMotion = useReducedMotion();

    // Preload the sprite image
    useEffect(() => {
        setSpriteLoaded(false);
        const img = new Image();
        img.onload = () => setSpriteLoaded(true);
        img.onerror = () => setSpriteLoaded(true); // Fallback: still render
        img.src = `/recap/${slug}/sprite.webp?v=${__BUILD_NUMBER__}`;
    }, [slug]);

    useEffect(() => {
        if (spriteLoaded && onRecapLoadComplete) {
            onRecapLoadComplete();
        }
    }, [spriteLoaded, onRecapLoadComplete]);

    const slices = useMemo(() => {
        const cacheKey = `${slug}-${visibleCount}-${count}`;
        const cached = slicesComputeCache.get(cacheKey);
        if (cached) return cached;

        let result: number[];

        if (visibleCount >= count) {
            result = Array.from({ length: count }, (_, i) => i + 1);
        } else if (!events || events.length === 0) {
            const indices = [];
            for (let i = 0; i < visibleCount; i++) {
                indices.push(Math.round((i * (count - 1)) / (visibleCount - 1)));
            }
            result = indices.map((idx) => idx + 1);
        } else {
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
            result = finalIndices.map((idx) => idx + 1);
        }

        slicesComputeCache.set(cacheKey, result);
        return result;
    }, [slug, visibleCount, count, events]);

    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;

        const updateSliceCount = (width: number) => {
            const calculatedSlices = Math.floor(width / 65);
            setVisibleCount(Math.max(6, Math.min(48, calculatedSlices)));
        };

        // Initial calculation
        updateSliceCount(el.offsetWidth);

        let rafId = 0;
        const observer = new ResizeObserver((entries) => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                for (const entry of entries) {
                    const w = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
                    updateSliceCount(w);
                }
            });
        });
        observer.observe(el);
        return () => {
            cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, []);

    if (slices.length === 0) {
        if (onRecapLoadComplete) onRecapLoadComplete(); // Signal completion immediately if nothing to load
        return null;
    }

    return (
        <section
            className="recap"
            id="recap"
            ref={sectionRef}
            style={{ '--total-slices': slices.length } as React.CSSProperties}
        >
            <div className="recap__grid">
                {slices.map((sliceNumber, idx) => (
                    <RecapSliceItem
                        key={`sprite-${slug}-${sliceNumber}`}
                        sliceIndex={sliceNumber - 1}
                        totalSlices={count}
                        idx={idx}
                        slug={slug}
                        events={events}
                        eventIdx={sliceNumber - 1}
                        spriteLoaded={spriteLoaded}
                        reducedMotion={reducedMotion}
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
