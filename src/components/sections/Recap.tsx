import { motion } from 'framer-motion';
import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAppStore } from '../../store/useAppStore';
import { withBuild } from '../../utils/build';
import { useElementSize } from '../../hooks/useElementSize';
import { LRUCache } from '../../utils/LRUCache';
import { fetchAlbum, getCachedAlbum } from '../../utils/albumData';
import { getPhotoOriginalUrl, toPhotoRecord } from '../../utils/formatters';
import { Check } from '../ui/icons';
import type { YearData, PhotoRecord, FavoriteStoreItem } from '../../types';

// Caches the expensive slices computation across remounts.
const slicesComputeCache = new LRUCache<string, number[]>(20);

export interface RecapEventMeta {
    eventName: string;
    photoIndex: number;
}

export interface RecapProps {
    slug: string;
    count: number;
    events?: RecapEventMeta[];
    overlayText?: string;
    isYear?: boolean;
    onRecapLoadComplete?: () => void;
    children?: React.ReactNode;
    yearData?: YearData;
    isSelectMode?: boolean;
    onToggleSelect?: (photo: PhotoRecord, index: number, isShift?: boolean) => void;
    selectedUrls?: Set<string>;
    selectionIndexMap?: Map<string, number>;
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
    photo: PhotoRecord | null;
    isSelectMode: boolean;
    isSelected: boolean;
    selectionNum?: number;
    totalSelectedCount: number;
    onToggleSelect: (photo: PhotoRecord, index: number, isShift?: boolean) => void;
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
    photo,
    isSelectMode,
    isSelected,
    selectionNum,
    totalSelectedCount,
    onToggleSelect,
}: RecapSliceItemProps) {
    const setSharedPhoto = useAppStore((state) => state.setSharedPhoto);

    // Each frame fills the slice exactly — bgSize stretches the sprite so each
    // frame = container width, bgPosition picks the right one via percentage.
    // With fixed 260px height and ~65px slice width, the native 1:4 ratio is preserved.
    const bgPosition = `${totalSlices > 1 ? (sliceIndex / (totalSlices - 1)) * 100 : 0}% 0`;
    const bgSize = `${totalSlices * 100}% 100%`;

    const eventName = events && events[eventIdx]?.eventName ? events[eventIdx].eventName : '';
    const showNumber = selectionNum !== undefined && totalSelectedCount <= 3;

    const ariaLabel = isSelectMode
        ? `${eventName ? eventName + ' ' : ''}photo ${sliceIndex + 1}, ${isSelected ? 'selected' : 'not selected'}`
        : `View recap image ${sliceIndex + 1}`;

    const handleAction = (isShift: boolean) => {
        if (isSelectMode) {
            if (photo) {
                onToggleSelect(photo, idx, isShift);
            }
        } else if (isShift && photo) {
            onToggleSelect(photo, idx, true);
        } else {
            if (events && events[eventIdx]) {
                const meta = events[eventIdx];
                setSharedPhoto({ eventName: meta.eventName, photoIndex: meta.photoIndex, preventScroll: true });
            }
        }
    };

    return (
        <motion.div
            id={`recap-slice-${idx}`}
            layout
            className={`recap__slice${!spriteLoaded ? ' recap__slice--skeleton' : ''}${
                isSelectMode ? ' recap__slice--select-mode' : ''
            }${isSelected ? ' recap__slice--selected' : ''}`}
            role={isSelectMode ? 'checkbox' : 'button'}
            aria-checked={isSelectMode ? isSelected : undefined}
            tabIndex={0}
            aria-label={ariaLabel}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAction(e.shiftKey);
                }
            }}
            onClick={(e) => {
                handleAction(e.shiftKey);
            }}
            initial={reducedMotion ? { opacity: 0 } : { rotateY: -180, opacity: 0 }}
            animate={
                spriteLoaded
                    ? reducedMotion
                        ? { opacity: 1 }
                        : { rotateY: 0, opacity: 1 }
                    : reducedMotion
                      ? { opacity: 0.4 }
                      : { rotateY: -180, opacity: 0.4 }
            }
            transition={reducedMotion ? { duration: 0 } : { duration: 0.8, type: 'spring', bounce: 0.3 }}
        >
            <div
                className="recap__sprite-slice"
                style={
                    spriteLoaded
                        ? {
                              backgroundImage: `url(${withBuild(`/recap/${slug}/sprite.webp`)})`,
                              backgroundPosition: bgPosition,
                              backgroundSize: bgSize,
                          }
                        : {}
                }
            />
            {isSelectMode && (
                <div
                    className={`portfolio__grid-select-badge${
                        isSelected ? ' portfolio__grid-select-badge--active' : ''
                    }`}
                    aria-hidden="true"
                >
                    {isSelected &&
                        (showNumber ? (
                            <span className="portfolio__grid-select-number">{selectionNum}</span>
                        ) : (
                            <Check size={14} strokeWidth={3} />
                        ))}
                </div>
            )}
        </motion.div>
    );
});

export default function Recap({
    slug,
    count,
    events,
    overlayText,
    isYear,
    onRecapLoadComplete,
    children,
    yearData,
    isSelectMode: isSelectModeProp,
    onToggleSelect: onToggleSelectProp,
    selectedUrls: selectedUrlsProp,
    selectionIndexMap: selectionIndexMapProp,
}: RecapProps) {
    const sectionRef = useRef<HTMLDivElement>(null);
    const { width } = useElementSize(sectionRef);
    const visibleCount = Math.max(6, Math.min(48, Math.floor((width || 65 * 6) / 65)));

    const [spriteLoaded, setSpriteLoaded] = useState(false);
    const [prevSlug, setPrevSlug] = useState(slug);
    const reducedMotion = useReducedMotion();

    const isBatchSelectMode = useAppStore((state) => state.isBatchSelectMode);
    const batchSelectedPhotos = useAppStore((state) => state.batchSelectedPhotos);
    const toggleBatchPhoto = useAppStore((state) => state.toggleBatchPhoto);
    const selectBatchPhotos = useAppStore((state) => state.selectBatchPhotos);
    const registerVisiblePhotos = useAppStore((state) => state.registerVisiblePhotos);
    const unregisterVisiblePhotos = useAppStore((state) => state.unregisterVisiblePhotos);

    const effectiveSelectMode = isSelectModeProp !== undefined ? isSelectModeProp : isBatchSelectMode;

    const selectedUrls = useMemo(() => {
        if (selectedUrlsProp) return selectedUrlsProp;
        const urls = new Set<string>();
        for (const p of batchSelectedPhotos) {
            const u = getPhotoOriginalUrl(p);
            if (u) urls.add(u);
        }
        return urls;
    }, [selectedUrlsProp, batchSelectedPhotos]);

    const selectionIndexMap = useMemo(() => {
        if (selectionIndexMapProp) return selectionIndexMapProp;
        const map = new Map<string, number>();
        batchSelectedPhotos.forEach((p, idx) => {
            const u = getPhotoOriginalUrl(p);
            if (u) map.set(u, idx + 1);
        });
        return map;
    }, [selectionIndexMapProp, batchSelectedPhotos]);

    const [loadedAlbums, setLoadedAlbums] = useState<Record<string, PhotoRecord[]>>({});

    useEffect(() => {
        if (!events || !yearData) return;
        const uniqueEvents = Array.from(new Set(events.map((e) => e.eventName)));
        let isCancelled = false;

        uniqueEvents.forEach((eventName) => {
            const evData = yearData[eventName];
            if (!evData || !evData.albumSlug) return;
            const year = evData.originalYear || slug;
            const cacheKey = `${year}/${evData.albumSlug}`;

            if (evData.album && evData.album.length > 0) return;

            const cached = getCachedAlbum(year, evData.albumSlug);
            if (cached) {
                setLoadedAlbums((prev) => (prev[cacheKey] === cached ? prev : { ...prev, [cacheKey]: cached }));
                return;
            }

            fetchAlbum(year, evData.albumSlug)
                .then((album) => {
                    if (!isCancelled) {
                        setLoadedAlbums((prev) => ({ ...prev, [cacheKey]: album }));
                    }
                })
                .catch(() => {
                    // Ignore load errors gracefully
                });
        });

        return () => {
            isCancelled = true;
        };
    }, [events, yearData, slug]);

    const getSlicePhoto = useCallback(
        (meta: RecapEventMeta | undefined): PhotoRecord | null => {
            if (!meta) return null;
            const { eventName, photoIndex } = meta;
            const evData = yearData?.[eventName];
            const year = evData?.originalYear || slug;
            const albumSlug = evData?.albumSlug;

            if (evData?.album && evData.album[photoIndex]) {
                return toPhotoRecord({
                    ...toPhotoRecord(evData.album[photoIndex] as FavoriteStoreItem),
                    eventName,
                    year,
                });
            }

            if (albumSlug) {
                const key = `${year}/${albumSlug}`;
                const cached = loadedAlbums[key] || getCachedAlbum(year, albumSlug);
                if (cached && cached[photoIndex]) {
                    return toPhotoRecord({
                        ...cached[photoIndex],
                        eventName,
                        year,
                    });
                }
            }

            if (albumSlug) {
                const padIndex = String(photoIndex + 1).padStart(3, '0');
                return {
                    original: `/photos/${year}/${albumSlug}/photo_${padIndex}.jpg`,
                    thumb: `/thumbnails/${year}/${albumSlug}/photo_${padIndex}.avif`,
                    eventName,
                    year,
                };
            }

            return null;
        },
        [yearData, slug, loadedAlbums]
    );

    if (slug !== prevSlug) {
        setPrevSlug(slug);
        setSpriteLoaded(false);
    }

    // Preload the sprite image
    useEffect(() => {
        const img = new Image();
        img.onload = () => setSpriteLoaded(true);
        img.onerror = () => setSpriteLoaded(true); // Fallback: still render
        img.src = withBuild(`/recap/${slug}/sprite.webp`);
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

    const visibleRecapPhotos = useMemo(() => {
        if (!events || slices.length === 0) return [];
        const result: FavoriteStoreItem[] = [];
        for (const sliceNumber of slices) {
            const eventIdx = sliceNumber - 1;
            const meta = events[eventIdx];
            const p = getSlicePhoto(meta);
            if (p && p.original) {
                result.push(p);
            }
        }
        return result;
    }, [slices, events, getSlicePhoto]);

    useEffect(() => {
        if (visibleRecapPhotos.length > 0) {
            registerVisiblePhotos('__recap__', visibleRecapPhotos);
        }
        return () => {
            unregisterVisiblePhotos('__recap__');
        };
    }, [visibleRecapPhotos, registerVisiblePhotos, unregisterVisiblePhotos]);

    const lastSelectedIdxRef = useRef<number | null>(null);

    const handleToggleSelect = useCallback(
        (photo: PhotoRecord, index: number, isShift?: boolean) => {
            if (onToggleSelectProp) {
                onToggleSelectProp(photo, index, isShift);
                return;
            }

            if (isShift && lastSelectedIdxRef.current !== null && lastSelectedIdxRef.current !== index) {
                const start = Math.min(lastSelectedIdxRef.current, index);
                const end = Math.max(lastSelectedIdxRef.current, index);
                const rangeItems: FavoriteStoreItem[] = [];

                for (let i = start; i <= end; i++) {
                    const sliceNumber = slices[i];
                    if (sliceNumber !== undefined && events) {
                        const eventIdx = sliceNumber - 1;
                        const meta = events[eventIdx];
                        const p = getSlicePhoto(meta);
                        if (p && p.original) {
                            rangeItems.push(p);
                        }
                    }
                }

                const currentUrls = new Set(batchSelectedPhotos.map((p) => getPhotoOriginalUrl(p)));
                const newItems = rangeItems.filter((item) => !currentUrls.has(getPhotoOriginalUrl(item)));
                selectBatchPhotos([...batchSelectedPhotos, ...newItems]);
            } else {
                toggleBatchPhoto(photo);
            }
            lastSelectedIdxRef.current = index;
        },
        [onToggleSelectProp, slices, events, getSlicePhoto, batchSelectedPhotos, selectBatchPhotos, toggleBatchPhoto]
    );

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
                {slices.map((sliceNumber, idx) => {
                    const eventIdx = sliceNumber - 1;
                    const meta = events ? events[eventIdx] : undefined;
                    const photo = getSlicePhoto(meta);
                    const isSelected = photo?.original ? selectedUrls.has(photo.original) : false;
                    const selectionNum =
                        isSelected && photo?.original && selectionIndexMap
                            ? selectionIndexMap.get(photo.original)
                            : undefined;

                    return (
                        <RecapSliceItem
                            key={`sprite-${slug}-${sliceNumber}`}
                            sliceIndex={sliceNumber - 1}
                            totalSlices={count}
                            idx={idx}
                            slug={slug}
                            events={events}
                            eventIdx={eventIdx}
                            spriteLoaded={spriteLoaded}
                            reducedMotion={reducedMotion}
                            photo={photo}
                            isSelectMode={effectiveSelectMode}
                            isSelected={isSelected}
                            selectionNum={selectionNum}
                            totalSelectedCount={batchSelectedPhotos.length}
                            onToggleSelect={handleToggleSelect}
                        />
                    );
                })}
                {overlayText && (
                    <div className={`recap__overlay-text ${isYear ? 'recap__overlay-text--year' : ''}`}>
                        {overlayText}
                    </div>
                )}
            </div>
            {children && <div className="recap__footer">{children}</div>}
        </section>
    );
}
