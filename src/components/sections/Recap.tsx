import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAppStore } from '../../store/useAppStore';
import { withBuild } from '../../utils/build';
import { useElementSize } from '../../hooks/useElementSize';
import { LRUCache } from '../../utils/LRUCache';
import { getCachedAlbum } from '../../utils/albumData';
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
    hash?: string;
    overlayText?: string;
    isYear?: boolean;
    onRecapLoadComplete?: () => void;
    children?: React.ReactNode;
    yearData?: YearData;
    isSelectMode?: boolean;
    onToggleSelect?: (photo: PhotoRecord, index: number, isShift?: boolean) => void;
    selectedUrls?: Set<string>;
    selectionIndexMap?: Map<string, number>;
    deferLoad?: boolean;
}

interface RecapSliceItemProps {
    sliceIndex: number;
    totalSlices: number;
    idx: number;
    slug: string;
    hash?: string;
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
    hash,
    events,
    eventIdx,
    reducedMotion: _reducedMotion,
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
        <div
            id={`recap-slice-${idx}`}
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
        >
            <div
                className="recap__sprite-slice"
                style={
                    spriteLoaded
                        ? {
                              backgroundImage: `url(${withBuild(`/recap/${slug}/sprite.webp${hash ? `?h=${hash}` : ''}`)})`,
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
        </div>
    );
});

export default function Recap({
    slug,
    count,
    events,
    hash,
    overlayText,
    isYear,
    onRecapLoadComplete,
    children,
    yearData,
    isSelectMode: isSelectModeProp,
    onToggleSelect: onToggleSelectProp,
    selectedUrls: selectedUrlsProp,
    selectionIndexMap: selectionIndexMapProp,
    deferLoad = false,
}: RecapProps) {
    const sectionRef = useRef<HTMLDivElement>(null);
    const { width } = useElementSize(sectionRef);
    const visibleCount = Math.max(6, Math.min(48, Math.floor((width || 65 * 6) / 65)));

    const [spriteLoaded, setSpriteLoaded] = useState(false);
    const [prevSlug, setPrevSlug] = useState(slug);
    const [prevHash, setPrevHash] = useState(hash);
    const reducedMotion = useReducedMotion();

    const isBatchSelectMode = useAppStore((state) => state.isBatchSelectMode);
    const batchSelectedPhotos = useAppStore((state) => state.batchSelectedPhotos);
    const toggleBatchPhoto = useAppStore((state) => state.toggleBatchPhoto);
    const selectBatchPhotos = useAppStore((state) => state.selectBatchPhotos);
    const registerVisiblePhotos = useAppStore((state) => state.registerVisiblePhotos);
    const unregisterVisiblePhotos = useAppStore((state) => state.unregisterVisiblePhotos);

    const effectiveSelectMode = isSelectModeProp !== undefined ? isSelectModeProp : isBatchSelectMode;

    const selectedUrls = useMemo(() => {
        if (!effectiveSelectMode && !selectedUrlsProp) return new Set<string>();
        if (selectedUrlsProp) return selectedUrlsProp;
        const urls = new Set<string>();
        for (const p of batchSelectedPhotos) {
            const u = getPhotoOriginalUrl(p);
            if (u) urls.add(u);
        }
        return urls;
    }, [effectiveSelectMode, selectedUrlsProp, batchSelectedPhotos]);

    const selectionIndexMap = useMemo(() => {
        if (!effectiveSelectMode && !selectionIndexMapProp) return undefined;
        if (selectionIndexMapProp) return selectionIndexMapProp;
        const map = new Map<string, number>();
        batchSelectedPhotos.forEach((p, idx) => {
            const u = getPhotoOriginalUrl(p);
            if (u) map.set(u, idx + 1);
        });
        return map;
    }, [effectiveSelectMode, selectionIndexMapProp, batchSelectedPhotos]);

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
                const cached = getCachedAlbum(year, albumSlug);
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
        [yearData, slug]
    );

    if (slug !== prevSlug || hash !== prevHash) {
        setPrevSlug(slug);
        setPrevHash(hash);
        setSpriteLoaded(false);
    }

    // Preload the sprite image with low network priority so LCP hero images are not starved
    useEffect(() => {
        if (deferLoad || spriteLoaded) return;

        let isCancelled = false;
        const loadSprite = () => {
            if (isCancelled) return;
            const img = new Image();
            if ('fetchPriority' in img) {
                img.fetchPriority = 'low';
            }
            img.decoding = 'async';
            img.onload = () => {
                if (isCancelled) return;
                if (typeof img.decode === 'function') {
                    img.decode()
                        .then(() => {
                            if (!isCancelled) setSpriteLoaded(true);
                        })
                        .catch(() => {
                            if (!isCancelled) setSpriteLoaded(true);
                        });
                } else {
                    setSpriteLoaded(true);
                }
            };
            img.onerror = () => {
                if (!isCancelled) setSpriteLoaded(true); // Fallback: still render
            };
            img.src = withBuild(`/recap/${slug}/sprite.webp${hash ? `?h=${hash}` : ''}`);
        };

        if (typeof window !== 'undefined' && window.scrollY > 300) {
            const onScroll = () => {
                if (window.scrollY <= 300) {
                    window.removeEventListener('scroll', onScroll);
                    loadSprite();
                }
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            return () => {
                isCancelled = true;
                window.removeEventListener('scroll', onScroll);
            };
        }

        loadSprite();
        return () => {
            isCancelled = true;
        };
    }, [slug, hash, deferLoad, spriteLoaded]);

    useEffect(() => {
        if (spriteLoaded && onRecapLoadComplete) {
            onRecapLoadComplete();
        }
    }, [spriteLoaded, onRecapLoadComplete]);

    const slices = useMemo(() => {
        const cacheKey = `${slug}-${hash ?? 'none'}-${visibleCount}-${count}-${events?.length ?? 0}`;
        const cached = slicesComputeCache.get(cacheKey);
        if (cached) return cached;

        let result: number[];

        if (visibleCount >= count) {
            result = Array.from({ length: count }, (_, i) => i + 1);
        } else if (!events || events.length < count) {
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
    }, [slug, hash, visibleCount, count, events]);

    const slicePhotos = useMemo(() => {
        if (!events || slices.length === 0) return [];
        return slices.map((sliceNumber) => {
            const eventIdx = sliceNumber - 1;
            const meta = events[eventIdx];
            return getSlicePhoto(meta);
        });
    }, [slices, events, getSlicePhoto]);

    const visibleRecapPhotos = useMemo(() => {
        if (!effectiveSelectMode) return [];
        return slicePhotos.filter((p): p is PhotoRecord => p !== null && Boolean(p.original));
    }, [effectiveSelectMode, slicePhotos]);

    useEffect(() => {
        if (!effectiveSelectMode) return;
        if (visibleRecapPhotos.length > 0) {
            registerVisiblePhotos('__recap__', visibleRecapPhotos);
        }
        return () => {
            unregisterVisiblePhotos('__recap__');
        };
    }, [effectiveSelectMode, visibleRecapPhotos, registerVisiblePhotos, unregisterVisiblePhotos]);

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
                    const p = slicePhotos[i];
                    if (p && p.original) {
                        rangeItems.push(p);
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
        [onToggleSelectProp, slicePhotos, batchSelectedPhotos, selectBatchPhotos, toggleBatchPhoto]
    );

    useEffect(() => {
        if (slices.length === 0 && onRecapLoadComplete) {
            onRecapLoadComplete();
        }
    }, [slices.length, onRecapLoadComplete]);

    if (slices.length === 0) {
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
                    const photo = slicePhotos[idx] ?? null;
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
                            hash={hash}
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
