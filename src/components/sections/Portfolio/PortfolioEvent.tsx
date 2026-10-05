import { motion, useInView } from 'framer-motion';
import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useCanShare } from '../../../hooks/useCanShare';
import { useEventAlbum } from '../../../hooks/useEventAlbum';
import { useAppStore } from '../../../store/useAppStore';
import { getPhotoOriginalUrl, parseEventTitle, toPhotoRecord } from '../../../utils/formatters';
import VirtualizedAlbumGrid from './VirtualizedAlbumGrid';
import PortfolioEventTitle from './PortfolioEventTitle';
import { EventActions } from './eventComponents/EventActions';
import { EventHighlights } from './eventComponents/EventHighlights';
import { EventGrid } from './eventComponents/EventGrid';
import { EventEmptyFavorites } from './eventComponents/EventEmptyFavorites';
import { useZipWorker } from '../../../hooks/useZipWorker';
import { scrollToElement } from '../../../utils/scroll';
import {
    filterAlbumByGear,
    computeFeaturedPhotos,
    buildAlbumIndexMap,
    sortTeamsByScore,
} from '../../../utils/eventTransforms';
import type { EventData, PhotoInput, PhotoRecord, FavoriteStoreItem } from '../../../types';
import { withBuild } from '../../../utils/build';

interface PortfolioEventProps {
    eventName: string;
    ev: EventData;
    evIdx: number;
    selectedYear: string;
    inViewParent: boolean;
    activeTeamName?: string;
    activeGearId?: string;
}

const PortfolioEvent = memo(function PortfolioEvent({
    eventName,
    ev: initialEv,
    evIdx,
    selectedYear,
    inViewParent,
    activeTeamName,
    activeGearId,
}: PortfolioEventProps) {
    const canShare = useCanShare();
    const openLightbox = useAppStore((state) => state.openLightbox);
    const sharedPhoto = useAppStore((state) => state.sharedPhoto);
    const setSharedPhoto = useAppStore((state) => state.setSharedPhoto);

    const [ev, setEv] = useState<EventData>(initialEv);
    const [isGridView, setIsGridView] = useState(false);

    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '400px' });

    const toggleGridView = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        setIsGridView((prev: boolean) => !prev);
    }, []);

    const isSharedEvent = sharedPhoto?.eventName === eventName;
    const isVisible = inView || (evIdx < 2 && inViewParent) || isSharedEvent || eventName === 'Favorites';

    useEffect(() => {
        if (eventName === 'Favorites') {
            setEv(initialEv);
        }
    }, [initialEv, eventName]);

    const { isZipping, zipProgress, startZipping } = useZipWorker();

    const handleDownloadFavorites = async () => {
        const sourcePhotos = albumImages.length > 0 ? albumImages : rawAlbumImages;
        if (sourcePhotos.length === 0) return;
        const urls = sourcePhotos
            .map((item: PhotoInput) => getPhotoOriginalUrl(item))
            .filter((u): u is string => Boolean(u));
        if (urls.length === 0) return;
        startZipping(urls, 'Favorites.zip');
    };

    useEffect(() => {
        setIsGridView(false);
    }, [selectedYear]);

    const { loading, fetchError } = useEventAlbum({
        ev,
        isVisible,
        selectedYear,
        eventName,
        setEv,
    });

    const rawAlbumImages: PhotoRecord[] = useMemo(() => {
        if (!ev.album) return [];
        return ev.album.map((item: unknown) => toPhotoRecord(item as FavoriteStoreItem));
    }, [ev.album]);

    const albumImages: PhotoRecord[] = useMemo(() => {
        const effectiveYear = ev.originalYear || selectedYear;
        return filterAlbumByGear(rawAlbumImages, activeGearId, effectiveYear);
    }, [rawAlbumImages, activeGearId, ev.originalYear, selectedYear]);

    const isBatchSelectMode = useAppStore((state) => state.isBatchSelectMode);
    const batchSelectedPhotos = useAppStore((state) => state.batchSelectedPhotos);
    const toggleBatchPhoto = useAppStore((state) => state.toggleBatchPhoto);
    const selectBatchPhotos = useAppStore((state) => state.selectBatchPhotos);
    const registerVisiblePhotos = useAppStore((state) => state.registerVisiblePhotos);
    const unregisterVisiblePhotos = useAppStore((state) => state.unregisterVisiblePhotos);

    const selectedUrls = useMemo(() => {
        const urls = new Set<string>();
        for (const p of batchSelectedPhotos) {
            const u = getPhotoOriginalUrl(p);
            if (u) urls.add(u);
        }
        return urls;
    }, [batchSelectedPhotos]);

    const selectionIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        batchSelectedPhotos.forEach((p, idx) => {
            const u = getPhotoOriginalUrl(p);
            if (u) map.set(u, idx + 1);
        });
        return map;
    }, [batchSelectedPhotos]);

    // Warm the scrubber sprite into browser cache as soon as album data arrives.
    // The sprite is used for both the lightbox scrubber and ambient blur background.
    useEffect(() => {
        if (albumImages.length === 0) return;
        const first = albumImages[0];
        if (!first.thumb || first.spriteIndex == null) return;
        const dir = first.thumb.substring(0, first.thumb.lastIndexOf('/'));
        const spriteUrl = withBuild(`${dir.replace(/^\/thumbnails\//, '/scrubber/')}/sprite.webp`);

        const schedulePreheat =
            typeof window !== 'undefined' && 'requestIdleCallback' in window
                ? (cb: () => void) =>
                      (
                          window as Window & {
                              requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
                          }
                      ).requestIdleCallback(cb, { timeout: 2000 })
                : (cb: () => void) => setTimeout(cb, 200);

        const cancelPreheat =
            typeof window !== 'undefined' && 'cancelIdleCallback' in window
                ? (id: number) =>
                      (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id)
                : (id: number) => clearTimeout(id);

        const handle = schedulePreheat(() => {
            const img = new Image();
            img.src = spriteUrl;
        });

        return () => {
            cancelPreheat(handle as number);
        };
    }, [albumImages]);

    const highlightImages: PhotoRecord[] = useMemo(() => {
        if (!ev.highlights) return [];
        return ev.highlights.map((item: unknown) => toPhotoRecord(item as FavoriteStoreItem));
    }, [ev.highlights]);

    useEffect(() => {
        if (isSharedEvent && ev.album && ev.album.length > 0 && sharedPhoto) {
            // Scroll to the event so it's in view (only if not prevented, e.g. when opening from Recap slices)
            if (!sharedPhoto.preventScroll) {
                const elementId = `event-${eventName.replace(/[^a-zA-Z0-9-]/g, '-')}`;
                scrollToElement(elementId);
            }

            if (
                sharedPhoto.photoIndex !== undefined &&
                !isNaN(sharedPhoto.photoIndex) &&
                albumImages.length > 0
            ) {
                const safeIndex = Math.max(0, Math.min(albumImages.length - 1, sharedPhoto.photoIndex));
                const scorePayload =
                    ev.localScore ||
                    (ev.wftdaMatch
                        ? { team1Score: ev.wftdaMatch.score1, team2Score: ev.wftdaMatch.score2 }
                        : undefined);
                openLightbox(
                    albumImages,
                    safeIndex,
                    eventName,
                    selectedYear,
                    ev.maxExifChars,
                    scorePayload
                );
            }
            setSharedPhoto(null);
        }
    }, [
        isSharedEvent,
        ev.album,
        ev.maxExifChars,
        ev.localScore,
        ev.wftdaMatch,
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
        return computeFeaturedPhotos(albumImages, highlightImages);
    }, [albumImages, highlightImages]);

    const visiblePhotos: FavoriteStoreItem[] = useMemo(() => {
        const list = isGridView || eventName === 'Favorites' ? albumImages : featuredPhotos;
        const effectiveYear = ev.originalYear || selectedYear;
        return list.map((p) => ({
            ...p,
            eventName: eventName === 'Favorites' && p.eventName ? p.eventName : eventName,
            year: eventName === 'Favorites' && p.year ? p.year : effectiveYear,
        }));
    }, [isGridView, eventName, albumImages, featuredPhotos, ev.originalYear, selectedYear]);

    useEffect(() => {
        registerVisiblePhotos(eventName, visiblePhotos);
        return () => {
            unregisterVisiblePhotos(eventName);
        };
    }, [eventName, visiblePhotos, registerVisiblePhotos, unregisterVisiblePhotos]);

    const lastSelectedIdxRef = useRef<number | null>(null);

    const handleToggleSelect = useCallback(
        (photo: PhotoRecord, index: number, isShift?: boolean) => {
            const effectiveYear = ev.originalYear || selectedYear;
            const targetEventName = eventName === 'Favorites' && photo.eventName ? photo.eventName : eventName;
            const targetYear = eventName === 'Favorites' && photo.year ? photo.year : effectiveYear;
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
                            eventName: eventName === 'Favorites' && p.eventName ? p.eventName : eventName,
                            year: eventName === 'Favorites' && p.year ? p.year : effectiveYear,
                        });
                    }
                }
                const currentUrls = new Set(batchSelectedPhotos.map((p) => getPhotoOriginalUrl(p)));
                const newItems = rangeItems.filter((item) => !currentUrls.has(getPhotoOriginalUrl(item)));
                selectBatchPhotos([...batchSelectedPhotos, ...newItems]);
            } else {
                toggleBatchPhoto(storeItem);
            }
            lastSelectedIdxRef.current = index;
        },
        [
            batchSelectedPhotos,
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
        <motion.article
            ref={ref}
            id={`event-${eventName.replace(/[^a-zA-Z0-9-]/g, '-')}`}
            data-event-name={eventName}
            className="portfolio__event"
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
        >
            <div className="portfolio__event-header">
                {titleBlock}

                <EventActions
                    eventName={eventName}
                    date={ev.date}
                    zip={ev.zip}
                    canShare={canShare}
                    selectedYear={selectedYear}
                    hasAlbumPhotos={Boolean(ev.album && ev.album.length > 0)}
                    isZipping={isZipping}
                    zipProgress={zipProgress}
                    onDownloadFavorites={handleDownloadFavorites}
                    isGridView={isGridView}
                    onToggleGridView={toggleGridView}
                />
            </div>
            {ev.description && <p className="portfolio__event-desc">{ev.description}</p>}

            {isVisible ? (
                <>
                    {eventName === 'Favorites' && (!ev.album || ev.album.length === 0) ? (
                        <EventEmptyFavorites />
                    ) : isGridView || eventName === 'Favorites' ? (
                        albumImages.length >
                            (parseInt(import.meta.env.VITE_VIRTUAL_GRID_THRESHOLD || '50', 10) || 50) &&
                        eventName !== 'Favorites' ? (
                            <>
                                <VirtualizedAlbumGrid
                                    photos={albumImages}
                                    eventName={eventName}
                                    selectedYear={selectedYear}
                                    maxExifChars={ev.maxExifChars}
                                    localScore={eventScore}
                                    openLightbox={openLightbox}
                                    isSelectMode={isBatchSelectMode}
                                    selectedUrls={selectedUrls}
                                    selectionIndexMap={selectionIndexMap}
                                    onToggleSelect={handleToggleSelect}
                                />
                                {loading && <div className="portfolio__loading">Loading photos...</div>}
                                {fetchError && (
                                    <div className="portfolio__error">Error loading photos. Please try refreshing.</div>
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
                                openLightbox={openLightbox}
                                isSelectMode={isBatchSelectMode}
                                selectedUrls={selectedUrls}
                                selectionIndexMap={selectionIndexMap}
                                onToggleSelect={handleToggleSelect}
                            />
                        )
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
                            openLightbox={openLightbox}
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
        </motion.article>
    );
});

export default PortfolioEvent;
