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

declare const __BUILD_NUMBER__: string;

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
        if (!ev.album) return;
        const urls = albumImages
            .map((item: PhotoInput) => getPhotoOriginalUrl(item))
            .filter((u): u is string => u !== undefined);
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

    // Warm the scrubber sprite into browser cache as soon as album data arrives.
    // The sprite is used for both the lightbox scrubber and ambient blur background.
    useEffect(() => {
        if (albumImages.length === 0) return;
        const first = albumImages[0];
        if (!first.thumb || first.spriteIndex == null) return;
        const dir = first.thumb.substring(0, first.thumb.lastIndexOf('/'));
        const spriteUrl = `${dir.replace(/^\/thumbnails\//, '/scrubber/')}/sprite.webp?v=${__BUILD_NUMBER__}`;
        const img = new Image();
        img.src = spriteUrl;
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

            if (sharedPhoto.photoIndex !== undefined) {
                const scorePayload =
                    ev.localScore ||
                    (ev.wftdaMatch
                        ? { team1Score: ev.wftdaMatch.score1, team2Score: ev.wftdaMatch.score2 }
                        : undefined);
                openLightbox(
                    albumImages,
                    sharedPhoto.photoIndex,
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
