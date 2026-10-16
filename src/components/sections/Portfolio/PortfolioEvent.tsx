import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useCanShare } from '../../../hooks/useCanShare';
import { useEventAlbum } from '../../../hooks/useEventAlbum';
import { fetchAlbum, getCachedAlbum } from '../../../utils/albumData';
import { useAppStore } from '../../../store/useAppStore';
import { getPhotoOriginalUrl, parseEventTitle, toPhotoRecord } from '../../../utils/formatters';
import VirtualizedAlbumGrid from './VirtualizedAlbumGrid';
import PortfolioEventTitle from './PortfolioEventTitle';
import { EventActions } from './eventComponents/EventActions';
import { EventHighlights } from './eventComponents/EventHighlights';
import { EventGrid } from './eventComponents/EventGrid';
import { EventEmptyFavorites } from './eventComponents/EventEmptyFavorites';
import { EventTagFilterBar } from './eventComponents/EventTagFilterBar';
import { useEventTags } from '../../../hooks/useEventTags';
import { matchesEventTagFilter, type EventTagFilter } from '../../../utils/tagSidecar';
import { useZipWorker } from '../../../hooks/useZipWorker';
import { scrollToElement } from '../../../utils/scroll';
import { buildFavoritesShareUrl } from '../../../utils/favoritesUrl';
import {
    filterAlbumByGear,
    computeFeaturedPhotos,
    buildAlbumIndexMap,
    sortTeamsByScore,
} from '../../../utils/eventTransforms';
import type { EventData, PhotoInput, PhotoRecord, FavoriteStoreItem, EventScore } from '../../../types';
import { withBuild } from '../../../utils/build';
import { MAX_SPRITE_FRAMES } from './LightboxScrubber';
import { DURATION, fadeUp } from '../../../utils/motion';

interface PortfolioEventProps {
    eventName: string;
    ev: EventData;
    evIdx: number;
    selectedYear: string;
    inViewParent: boolean;
    activeTeamName?: string;
    activeGearId?: string;
    isFavoritesTab?: boolean;
}

const EMPTY_SELECTED_SET = new Set<string>();
const EMPTY_SELECTION_MAP = new Map<string, number>();

const PortfolioEvent = memo(function PortfolioEvent({
    eventName,
    ev: initialEv,
    evIdx,
    selectedYear,
    inViewParent,
    activeTeamName,
    activeGearId,
    isFavoritesTab,
}: PortfolioEventProps) {
    const canShare = useCanShare();
    const openLightbox = useAppStore((state) => state.openLightbox);
    const isLightboxOpen = useAppStore((state) => state.lightbox.isOpen);
    const sharedPhoto = useAppStore((state) => state.sharedPhoto);
    const setSharedPhoto = useAppStore((state) => state.setSharedPhoto);

    const [ev, setEv] = useState<EventData>(() => {
        if ((!initialEv.album || initialEv.album.length === 0) && initialEv.albumSlug) {
            const cached = getCachedAlbum(initialEv.originalYear || selectedYear, initialEv.albumSlug);
            if (cached) return { ...initialEv, album: cached };
        }
        return initialEv;
    });

    const isSharedEvent =
        sharedPhoto?.eventName === eventName ||
        (Boolean(ev.albumSlug) && sharedPhoto?.eventName === ev.albumSlug);

    const [isGridView, setIsGridView] = useState(() => Boolean(isSharedEvent && sharedPhoto?.openAlbumGrid));
    const [hasInteracted, setHasInteracted] = useState(false);

    const ref = useRef<HTMLElement>(null);
    const inView = useInView(ref, { once: true, margin: '400px' });

    const toggleGridView = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        setIsGridView((prev: boolean) => !prev);
    }, []);

    void inViewParent;
    const isPhotoDeepLinkActive =
        isLightboxOpen || Boolean(sharedPhoto && sharedPhoto.photoIndex !== undefined && !isNaN(sharedPhoto.photoIndex));
    const hasOtherTargetEvent = Boolean(sharedPhoto?.eventName && !isSharedEvent);

    const [suppressedByDeepLink, setSuppressedByDeepLink] = useState(hasOtherTargetEvent);
    if (hasOtherTargetEvent && !suppressedByDeepLink) {
        setSuppressedByDeepLink(true);
    }

    useEffect(() => {
        if (!suppressedByDeepLink || typeof window === 'undefined') return;
        const onUserScroll = () => setSuppressedByDeepLink(false);
        window.addEventListener('wheel', onUserScroll, { passive: true, once: true });
        window.addEventListener('touchmove', onUserScroll, { passive: true, once: true });
        window.addEventListener('keydown', onUserScroll, { passive: true, once: true });
        return () => {
            window.removeEventListener('wheel', onUserScroll);
            window.removeEventListener('touchmove', onUserScroll);
            window.removeEventListener('keydown', onUserScroll);
        };
    }, [suppressedByDeepLink]);

    const rawIsVisible =
        !isPhotoDeepLinkActive &&
        !hasOtherTargetEvent &&
        (Boolean(isSharedEvent) ||
            eventName === 'Favorites' ||
            (!suppressedByDeepLink && (inView || evIdx === 0)));

    const [hasBeenVisible, setHasBeenVisible] = useState(rawIsVisible);
    const [prevVisibleYear, setPrevVisibleYear] = useState(selectedYear);
    if (selectedYear !== prevVisibleYear) {
        setPrevVisibleYear(selectedYear);
        setSuppressedByDeepLink(hasOtherTargetEvent);
        setHasBeenVisible(rawIsVisible);
    } else if (rawIsVisible && !hasBeenVisible) {
        setHasBeenVisible(true);
    }

    const isVisible = hasBeenVisible;
    const shouldFetchAlbum =
        Boolean(isSharedEvent) ||
        (isVisible &&
            (isGridView ||
                Boolean(activeGearId) ||
                Boolean(isFavoritesTab) ||
                eventName === 'Favorites' ||
                !ev.highlights ||
                ev.highlights.length === 0 ||
                hasInteracted));

    useEffect(() => {
        if ((!initialEv.album || initialEv.album.length === 0) && initialEv.albumSlug) {
            const cached = getCachedAlbum(initialEv.originalYear || selectedYear, initialEv.albumSlug);
            if (cached) {
                setEv({ ...initialEv, album: cached });
                return;
            }
        }
        setEv(initialEv);
    }, [initialEv, selectedYear]);

    const { isZipping, zipProgress, startZipping } = useZipWorker();

    const handleDownloadFavorites = async () => {
        const sourcePhotos = albumImages.length > 0 ? albumImages : rawAlbumImages;
        if (sourcePhotos.length === 0) return;
        const urls = sourcePhotos
            .map((item: PhotoInput) => getPhotoOriginalUrl(item))
            .filter((u): u is string => Boolean(u));
        if (urls.length === 0) return;
        const zipName = ev.albumSlug
            ? `${ev.albumSlug}-favorites.zip`
            : eventName !== 'Favorites'
              ? `${eventName.replace(/[^a-zA-Z0-9_-]/g, '_')}-favorites.zip`
              : 'Favorites.zip';
        startZipping(urls, zipName);
    };

    const prevSelectedYearRef = useRef(selectedYear);
    useEffect(() => {
        if (prevSelectedYearRef.current !== selectedYear) {
            prevSelectedYearRef.current = selectedYear;
            setIsGridView(Boolean(isSharedEvent && sharedPhoto?.openAlbumGrid));
            setHasInteracted(false);
        }
    }, [selectedYear, isSharedEvent, sharedPhoto]);

    const { loading, fetchError } = useEventAlbum({
        ev,
        isVisible: shouldFetchAlbum,
        selectedYear,
        eventName,
        setEv,
    });

    const [activeTagFilter, setActiveTagFilter] = useState<EventTagFilter>('all');
    const effectiveEventYear = ev.originalYear || selectedYear;
    const { sidecar: tagSidecar } = useEventTags(
        effectiveEventYear,
        ev.albumSlug,
        Boolean(isGridView && eventName !== 'Favorites')
    );

    const rawAlbumImages: PhotoRecord[] = useMemo(() => {
        if (!ev.album) return [];
        return ev.album.map((item: unknown) => toPhotoRecord(item as FavoriteStoreItem));
    }, [ev.album]);

    const gearFilteredAlbumImages: PhotoRecord[] = useMemo(() => {
        const effectiveYear = ev.originalYear || selectedYear;
        return filterAlbumByGear(rawAlbumImages, activeGearId, effectiveYear);
    }, [rawAlbumImages, activeGearId, ev.originalYear, selectedYear]);

    const albumImages: PhotoRecord[] = useMemo(() => {
        if (activeTagFilter === 'all' || !tagSidecar) return gearFilteredAlbumImages;
        return gearFilteredAlbumImages.filter((item, idx) => {
            const origIdx = typeof item.spriteIndex === 'number' ? item.spriteIndex : idx;
            return matchesEventTagFilter(tagSidecar, origIdx, activeTagFilter);
        });
    }, [gearFilteredAlbumImages, activeTagFilter, tagSidecar]);

    const handleShareEventFavorites = useCallback(async () => {
        const sourcePhotos = albumImages.length > 0 ? albumImages : rawAlbumImages;
        if (sourcePhotos.length === 0) return;
        try {
            const shareUrl = await buildFavoritesShareUrl(sourcePhotos as FavoriteStoreItem[]);
            const title = `${eventName} Favorites`;
            const text = `Check out my favorite photos from ${eventName}!`;
            if (navigator.share) {
                await navigator.share({
                    title,
                    text,
                    url: shareUrl,
                });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Share event favorites failed:', err);
            }
        }
    }, [albumImages, rawAlbumImages, eventName]);

    const highlightImages: PhotoRecord[] = useMemo(() => {
        if (!ev.highlights) return [];
        return ev.highlights.map((item: unknown) => toPhotoRecord(item as FavoriteStoreItem));
    }, [ev.highlights]);

    const isBatchSelectMode = useAppStore((state) => state.isBatchSelectMode);
    const batchSelectedPhotos = useAppStore((state) =>
        state.isBatchSelectMode ? state.batchSelectedPhotos : undefined
    );
    const toggleBatchPhoto = useAppStore((state) => state.toggleBatchPhoto);
    const selectBatchPhotos = useAppStore((state) => state.selectBatchPhotos);
    const registerVisiblePhotos = useAppStore((state) => state.registerVisiblePhotos);
    const unregisterVisiblePhotos = useAppStore((state) => state.unregisterVisiblePhotos);

    const eventPhotosSet = useMemo(() => {
        if (!isBatchSelectMode) return EMPTY_SELECTED_SET;
        const set = new Set<string>();
        for (const p of albumImages) {
            const u = getPhotoOriginalUrl(p);
            if (u) set.add(u);
        }
        for (const p of highlightImages) {
            const u = getPhotoOriginalUrl(p);
            if (u) set.add(u);
        }
        return set;
    }, [isBatchSelectMode, albumImages, highlightImages]);

    const selectedUrls = useMemo(() => {
        if (!isBatchSelectMode || !batchSelectedPhotos) return undefined;
        let hasAny = false;
        for (const p of batchSelectedPhotos) {
            const u = getPhotoOriginalUrl(p);
            if (u && eventPhotosSet.has(u)) {
                hasAny = true;
                break;
            }
        }
        if (!hasAny) return EMPTY_SELECTED_SET;

        const urls = new Set<string>();
        for (const p of batchSelectedPhotos) {
            const u = getPhotoOriginalUrl(p);
            if (u && eventPhotosSet.has(u)) urls.add(u);
        }
        return urls;
    }, [isBatchSelectMode, batchSelectedPhotos, eventPhotosSet]);

    const selectionIndexMap = useMemo(() => {
        if (!isBatchSelectMode || !batchSelectedPhotos) return undefined;
        if (selectedUrls === EMPTY_SELECTED_SET) return EMPTY_SELECTION_MAP;

        const map = new Map<string, number>();
        batchSelectedPhotos.forEach((p, idx) => {
            const u = getPhotoOriginalUrl(p);
            if (u) map.set(u, idx + 1);
        });
        return map;
    }, [isBatchSelectMode, batchSelectedPhotos, selectedUrls]);

    // Warm the scrubber sprite into browser cache only after user interacts with this event card
    useEffect(() => {
        if (!hasInteracted || albumImages.length === 0 || albumImages.length > MAX_SPRITE_FRAMES) return;
        const first = albumImages[0];
        if (!first.thumb || first.spriteIndex == null) return;
        const dir = first.thumb.substring(0, first.thumb.lastIndexOf('/'));
        const hash = ev.scrubberHash || (typeof first === 'object' ? first.scrubberHash : undefined);
        const spriteUrl = withBuild(`${dir.replace(/^\/thumbnails\//, '/scrubber/')}/sprite.webp${hash ? `?h=${hash}` : ''}`);

        const isSaveData =
            typeof navigator !== 'undefined' &&
            Boolean((navigator as { connection?: { saveData?: boolean } }).connection?.saveData);
        if (isSaveData) return;

        const img = new Image();
        if ('fetchPriority' in img) {
            img.fetchPriority = 'low';
        }
        img.decoding = 'async';
        img.src = spriteUrl;
    }, [hasInteracted, albumImages, ev.scrubberHash]);

    useEffect(() => {
        if (isSharedEvent && ev.album && ev.album.length > 0 && sharedPhoto) {
            if (sharedPhoto.openAlbumGrid) {
                setIsGridView(true);
            }

            // Scroll to the event so it's in view (only if not prevented, e.g. when opening from Recap slices)
            if (!sharedPhoto.preventScroll) {
                const elementId = `event-${eventName.replace(/[^a-zA-Z0-9-]/g, '-')}`;
                scrollToElement(elementId, { behavior: 'instant' });
            }

            if (sharedPhoto.photoIndex !== undefined && !isNaN(sharedPhoto.photoIndex) && albumImages.length > 0) {
                const safeIndex = Math.max(0, Math.min(albumImages.length - 1, sharedPhoto.photoIndex));
                const scorePayload =
                    ev.localScore ||
                    (ev.wftdaMatch
                        ? { team1Score: ev.wftdaMatch.score1, team2Score: ev.wftdaMatch.score2 }
                        : undefined);
                openLightbox(albumImages, safeIndex, eventName, selectedYear, ev.maxExifChars, scorePayload, ev.scrubberHash);
            }
            setSharedPhoto(null);
        }
    }, [
        isSharedEvent,
        ev.album,
        ev.maxExifChars,
        ev.localScore,
        ev.wftdaMatch,
        ev.scrubberHash,
        sharedPhoto,
        eventName,
        selectedYear,
        openLightbox,
        setSharedPhoto,
        albumImages,
    ]);

    const totalPhotos = ev.photoCount || albumImages.length;

    // Pre-compute a O(1) map from original URL → album index.
    // Replaces the repeated O(n) findIndex call inside featuredPhotos.map.
    const albumIndexMap = useMemo(() => {
        return buildAlbumIndexMap(albumImages);
    }, [albumImages]);

    const featuredPhotos: PhotoRecord[] = useMemo(() => {
        if (isFavoritesTab) {
            return albumImages;
        }
        return computeFeaturedPhotos(albumImages, highlightImages);
    }, [albumImages, highlightImages, isFavoritesTab]);

    const handleOpenLightbox = useCallback(
        (
            album: PhotoRecord[],
            index: number,
            eName: string,
            year: string,
            maxExif?: number,
            score?: EventScore
        ) => {
            if (album.length > 0) {
                openLightbox(album, index, eName, year, maxExif, score, ev.scrubberHash);
                return;
            }
            const clickedPhoto = featuredPhotos[index] || featuredPhotos[0];
            const initialList = featuredPhotos.length > 0 ? featuredPhotos : album;
            const initialIdx = clickedPhoto ? Math.max(0, initialList.indexOf(clickedPhoto)) : 0;
            openLightbox(initialList, initialIdx, eName, year, maxExif, score, ev.scrubberHash);
            if (ev.albumSlug) {
                const loadYear = ev.originalYear || year;
                fetchAlbum(loadYear, ev.albumSlug)
                    .then((albumData) => {
                        setEv((prev) => ({ ...prev, album: albumData }));
                        const filtered = filterAlbumByGear(albumData, activeGearId, loadYear);
                        const targetUrl = clickedPhoto?.original;
                        const fullIdx = targetUrl ? filtered.findIndex((p) => p.original === targetUrl) : 0;
                        const lb = useAppStore.getState().lightbox;
                        if (lb.isOpen && lb.eventName === eName) {
                            openLightbox(
                                filtered,
                                fullIdx !== -1 ? fullIdx : 0,
                                eName,
                                year,
                                maxExif,
                                score,
                                ev.scrubberHash
                            );
                        }
                    })
                    .catch(() => {});
            }
        },
        [openLightbox, ev.scrubberHash, ev.albumSlug, ev.originalYear, activeGearId, featuredPhotos]
    );

    const visiblePhotos: FavoriteStoreItem[] = useMemo(() => {
        if (!isBatchSelectMode) return [];
        const list = isGridView || eventName === 'Favorites' || isFavoritesTab ? albumImages : featuredPhotos;
        const effectiveYear = ev.originalYear || selectedYear;
        return list.map((p) => ({
            ...p,
            eventName: p.eventName || eventName,
            year: p.year || effectiveYear,
        }));
    }, [isBatchSelectMode, isGridView, eventName, isFavoritesTab, albumImages, featuredPhotos, ev.originalYear, selectedYear]);

    useEffect(() => {
        if (!isBatchSelectMode) return;
        registerVisiblePhotos(eventName, visiblePhotos);
        return () => {
            unregisterVisiblePhotos(eventName);
        };
    }, [isBatchSelectMode, eventName, visiblePhotos, registerVisiblePhotos, unregisterVisiblePhotos]);

    const lastSelectedIdxRef = useRef<number | null>(null);

    useEffect(() => {
        lastSelectedIdxRef.current = null;
    }, [isGridView, isBatchSelectMode]);

    const handleToggleSelect = useCallback(
        (photo: PhotoRecord, index: number, isShift?: boolean) => {
            const effectiveYear = ev.originalYear || selectedYear;
            const targetEventName = photo.eventName || eventName;
            const targetYear = photo.year || effectiveYear;
            const storeItem: FavoriteStoreItem = {
                ...photo,
                eventName: targetEventName,
                year: targetYear,
            };

            if (isShift && lastSelectedIdxRef.current !== null && lastSelectedIdxRef.current !== index) {
                const targetList = isGridView ? albumImages : featuredPhotos;
                const start = Math.min(lastSelectedIdxRef.current, index);
                const end = Math.max(lastSelectedIdxRef.current, index);
                const rangeItems: FavoriteStoreItem[] = [];
                for (let i = start; i <= end; i++) {
                    const p = targetList[i];
                    if (p && p.original) {
                        rangeItems.push({
                            ...p,
                            eventName: p.eventName || eventName,
                            year: p.year || effectiveYear,
                        });
                    }
                }
                const currentBatch = useAppStore.getState().batchSelectedPhotos || [];
                const currentUrls = new Set(currentBatch.map((p) => getPhotoOriginalUrl(p)));
                const newItems = rangeItems.filter((item) => !currentUrls.has(getPhotoOriginalUrl(item)));
                selectBatchPhotos([...currentBatch, ...newItems]);
            } else {
                toggleBatchPhoto(storeItem);
            }
            lastSelectedIdxRef.current = index;
        },
        [
            ev.originalYear,
            selectedYear,
            eventName,
            isGridView,
            albumImages,
            featuredPhotos,
            selectBatchPhotos,
            toggleBatchPhoto,
        ]
    );

    // Parsing title logic
    const { mainTitle, datePrefix, teams: baseTeams } = parseEventTitle(eventName, ev.originalYear, selectedYear);

    const { finalTeams, shouldShowScores } = useMemo(() => {
        return sortTeamsByScore(baseTeams, ev.wftdaMatch, ev.localScore, activeTeamName);
    }, [baseTeams, ev.wftdaMatch, ev.localScore, activeTeamName]);

    const eventScore =
        ev.localScore ||
        (ev.wftdaMatch ? { team1Score: ev.wftdaMatch.score1, team2Score: ev.wftdaMatch.score2 } : undefined);

    const titleBlock = (
        <PortfolioEventTitle
            eventName={eventName}
            ev={ev}
            datePrefix={datePrefix}
            finalTeams={finalTeams}
            shouldShowScores={shouldShowScores}
            mainTitle={mainTitle}
        />
    );

    return (
        <article
            ref={ref}
            id={`event-${eventName.replace(/[^a-zA-Z0-9-]/g, '-')}`}
            data-event-name={eventName}
            className="portfolio__event"
            onPointerEnter={!hasInteracted ? () => setHasInteracted(true) : undefined}
            onFocus={!hasInteracted ? () => setHasInteracted(true) : undefined}
            onTouchStart={!hasInteracted ? () => setHasInteracted(true) : undefined}
        >
            {eventName !== 'Favorites' && (
                <div className="portfolio__event-header">
                    {titleBlock}

                    <EventActions
                        eventName={eventName}
                        zip={ev.zip}
                        canShare={canShare}
                        selectedYear={selectedYear}
                        hasAlbumPhotos={Boolean(ev.album && ev.album.length > 0)}
                        isZipping={isZipping}
                        zipProgress={zipProgress}
                        onDownloadFavorites={handleDownloadFavorites}
                        onShareFavorites={isFavoritesTab ? handleShareEventFavorites : undefined}
                        isGridView={isGridView}
                        onToggleGridView={toggleGridView}
                        isFavoritesTab={isFavoritesTab}
                    />
                </div>
            )}
            {ev.description && (
                <p className="portfolio__event-desc">
                    {ev.description}
                </p>
            )}

            <div>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={isGridView ? 'grid' : 'highlights'}
                        {...fadeUp(6, DURATION.fast)}
                        exit={{ opacity: 0, transition: { duration: DURATION.instant } }}
                    >
                        {isVisible ? (
                            <>
                                {eventName === 'Favorites' && (!ev.album || ev.album.length === 0) ? (
                                    <EventEmptyFavorites />
                                ) : isGridView || eventName === 'Favorites' ? (
                                    <>
                                        {eventName !== 'Favorites' && (
                                            <EventTagFilterBar
                                                sidecar={tagSidecar}
                                                totalPhotos={gearFilteredAlbumImages.length}
                                                activeFilter={activeTagFilter}
                                                onSelectFilter={setActiveTagFilter}
                                                filteredCount={albumImages.length}
                                            />
                                        )}
                                        {albumImages.length >
                                            (parseInt(import.meta.env.VITE_VIRTUAL_GRID_THRESHOLD || '50', 10) || 50) &&
                                        eventName !== 'Favorites' ? (
                                            <>
                                                <VirtualizedAlbumGrid
                                                    photos={albumImages}
                                                    eventName={eventName}
                                                    selectedYear={selectedYear}
                                                    maxExifChars={ev.maxExifChars}
                                                    localScore={eventScore}
                                                    openLightbox={handleOpenLightbox}
                                                    isSelectMode={isBatchSelectMode}
                                                    selectedUrls={selectedUrls}
                                                    selectionIndexMap={selectionIndexMap}
                                                    onToggleSelect={handleToggleSelect}
                                                />
                                                {loading && <div className="portfolio__loading">Loading photos...</div>}
                                                {fetchError && (
                                                    <div className="portfolio__error">
                                                        Error loading photos. Please try refreshing.
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <EventGrid
                                                albumImages={albumImages}
                                                eventName={eventName}
                                                selectedYear={selectedYear}
                                                maxExifChars={ev.maxExifChars}
                                                eventScore={eventScore}
                                                loading={loading}
                                                fetchError={fetchError}
                                                openLightbox={handleOpenLightbox}
                                                isSelectMode={isBatchSelectMode}
                                                selectedUrls={selectedUrls}
                                                selectionIndexMap={selectionIndexMap}
                                                onToggleSelect={handleToggleSelect}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <EventHighlights
                                        featuredPhotos={featuredPhotos}
                                        albumImages={albumImages}
                                        albumIndexMap={albumIndexMap}
                                        eventName={eventName}
                                        selectedYear={selectedYear}
                                        totalPhotos={totalPhotos}
                                        maxExifChars={ev.maxExifChars}
                                        eventScore={eventScore}
                                        evIdx={evIdx}
                                        loading={loading}
                                        fetchError={fetchError}
                                        openLightbox={handleOpenLightbox}
                                        isSelectMode={isBatchSelectMode}
                                        selectedUrls={selectedUrls}
                                        selectionIndexMap={selectionIndexMap}
                                        onToggleSelect={handleToggleSelect}
                                    />
                                )}
                            </>
                        ) : (
                            <div
                                className="portfolio__event-placeholder portfolio__event-placeholder--featured"
                                aria-hidden="true"
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </article>
    );
});

export default PortfolioEvent;
