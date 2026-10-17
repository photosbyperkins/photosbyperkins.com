import { useInView, motion, AnimatePresence } from 'framer-motion';
import { Search, CheckSquare, Save, Share2 } from '../../ui/icons';
import React, { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { usePortfolioRoute } from '../../../hooks/usePortfolioRoute';
import { getCachedYearEvent, usePortfolioData, warmRouteData } from '../../../hooks/usePortfolioData';
import { usePortfolioScroll } from '../../../hooks/usePortfolioScroll';
import { usePortfolioSearch } from '../../../hooks/usePortfolioSearch';
import { useStickyHeader } from '../../../hooks/useStickyHeader';
import { useFirstEventOffset } from '../../../hooks/useFirstEventOffset';
import { useCanShare } from '../../../hooks/useCanShare';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { useAppStore } from '../../../store/useAppStore';
import { useZipWorker } from '../../../hooks/useZipWorker';
import { buildEventRows, getSeasonHighlights } from '../../../utils/portfolioTransforms';
import { computeFeaturedPhotos } from '../../../utils/eventTransforms';
import { buildFavoritesShareUrl } from '../../../utils/favoritesUrl';
import { getPhotoOriginalUrl, toPhotoRecord } from '../../../utils/formatters';
import { getCachedAlbum } from '../../../utils/albumData';
import { GEAR_REGISTRY } from '../../../data/gearData';
import type { PhotoRecord, FavoriteStoreItem, EventScore } from '../../../types';
import Recap from '../Recap';
import PortfolioEvent from './PortfolioEvent';
import { EventEmptyFavorites } from './eventComponents/EventEmptyFavorites';
import SharedFavoritesPanel from './SharedFavoritesPanel';
import PortfolioMonthTrack from './PortfolioMonthTrack';
import PortfolioYearTrack from './PortfolioYearTrack';
import { computeViewYears } from '../../../utils/yearTrack';
import { DURATION, EASE_IN_OUT, SPRING_POP, SPRING_SOFT } from '../../../utils/motion';
import GearInfoHeader from './GearInfoHeader';
import PortfolioYearNav from './PortfolioYearNav';
import PortfolioSeasonStrip from './PortfolioSeasonStrip';
import { BatchActionBar } from './eventComponents/BatchActionBar';
import { prefetchStoryVideoSupport } from '../../../utils/story/storyVideoSupport';
import ErrorBoundary from '../../ui/ErrorBoundary';

const initialSegments = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean) : [];
const hasInitialDeepLink =
    initialSegments[0] === 'portfolio' &&
    initialSegments.length >= 3 &&
    initialSegments[1] !== 'team' &&
    initialSegments[1] !== 'gear' &&
    initialSegments[1] !== 'find';
const hasInitialPhotoDeepLink = hasInitialDeepLink && initialSegments.length >= 4;
let ResolvedLightboxContainer: React.ComponentType | null = null;
const lightboxContainerImport = hasInitialPhotoDeepLink
    ? import('./LightboxContainer').then((m) => {
          ResolvedLightboxContainer = m.default;
          return m;
      })
    : null;
const LazyLightboxContainer = React.lazy(() =>
    (lightboxContainerImport ?? import('./LightboxContainer')).then((m) => {
        ResolvedLightboxContainer = m.default;
        return m;
    })
);
const GlobalSearchOverlay = React.lazy(() => import('./GlobalSearchOverlay'));
const StoryExportModal = React.lazy(() => import('./StoryExportModal'));
const FindMyPhotosView = React.lazy(() => import('./FindMyPhotosView'));

// eslint-disable-next-line react-refresh/only-export-components
export function warmPortfolioRoute(years: string[]): Promise<unknown> {
    return Promise.all([warmRouteData(years), lightboxContainerImport]);
}

import { useSharedFavorites } from '../../../hooks/useSharedFavorites';

interface PortfolioProps {
    years: string[];
}

const EMPTY_VISIBLE_PHOTOS_MAP: Record<string, FavoriteStoreItem[]> = {};
const EMPTY_BATCH_SELECTED: FavoriteStoreItem[] = [];

export default function Portfolio({ years }: PortfolioProps) {
    const location = useLocation();
    const canShare = useCanShare();
    const {
        selectedTab,
        isGearRoute,
        isFindRoute,
        findTeamSlug,
        activeRouteSlug,
        initialSearchOpen,
        initialSearchQuery,
        params,
    } = usePortfolioRoute({
        years,
    });

    const initialJerseyParam = params.get('jersey') || '';
    const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(initialSearchOpen);
    const [hasEverOpenedSearch, setHasEverOpenedSearch] = useState(initialSearchOpen);

    // Know whether Animated Story (MP4) export works before Story Maker opens (idle-time, memoised)
    useEffect(() => {
        prefetchStoryVideoSupport();
    }, []);

    useBodyScrollLock(isGlobalSearchOpen);

    const isLightboxOpen = useAppStore((state) => state.lightbox.isOpen);
    const sharedPhoto = useAppStore((state) => state.sharedPhoto);
    const isBatchSelectMode = useAppStore((state) => state.isBatchSelectMode);
    const setIsBatchSelectMode = useAppStore((state) => state.setIsBatchSelectMode);
    const batchSelectedCount = useAppStore((state) => state.batchSelectedPhotos.length);
    const batchSelectedPhotos = useAppStore((state) =>
        state.isBatchSelectMode ? state.batchSelectedPhotos : EMPTY_BATCH_SELECTED
    );
    const selectBatchPhotos = useAppStore((state) => state.selectBatchPhotos);
    const clearBatchSelection = useAppStore((state) => state.clearBatchSelection);
    const visiblePhotosMap = useAppStore((state) =>
        state.isBatchSelectMode ? state.visiblePhotosMap : EMPTY_VISIBLE_PHOTOS_MAP
    );
    const clearVisiblePhotos = useAppStore((state) => state.clearVisiblePhotos);
    const favorites = useAppStore((state) => state.favorites);
    const addFavorites = useAppStore((state) => state.addFavorites);
    const removeFavorites = useAppStore((state) => state.removeFavorites);
    const hasPhotoTarget = Boolean(
        sharedPhoto && sharedPhoto.photoIndex !== undefined && !isNaN(sharedPhoto.photoIndex)
    );
    const [hasOpenedLightbox, setHasOpenedLightbox] = useState(() => isLightboxOpen || hasPhotoTarget);
    if ((isLightboxOpen || hasPhotoTarget) && !hasOpenedLightbox) {
        setHasOpenedLightbox(true);
    }

    const {
        teamIndex,
        gearIndex,
        findIndex,
        isTeamIndexLoading,
        isGearIndexLoading,
        isFindIndexLoading,
        teamSearchQuery,
        setTeamSearchQuery,
        gearSearchQuery,
        setGearSearchQuery,
        jerseySearchQuery,
        setJerseySearchQuery,
        filteredTeams,
        filteredGear,
        ensureIndexesLoaded,
    } = usePortfolioSearch({
        initialSearchQuery,
        initialJerseyQuery: initialJerseyParam ? `#${initialJerseyParam.replace(/^#/, '')}` : '',
        initialSearchOpen,
        isGearRoute,
        isFindRoute,
    });

    const shouldOpenJerseyModal =
        Boolean(params.get('jersey')) || (isFindRoute && !params.get('num') && !findTeamSlug);
    const locationRouteKey = `${location.pathname}${location.search}`;
    const [prevLocationRouteKey, setPrevLocationRouteKey] = useState(locationRouteKey);
    if (locationRouteKey !== prevLocationRouteKey) {
        setPrevLocationRouteKey(locationRouteKey);
        if (shouldOpenJerseyModal) {
            setHasEverOpenedSearch(true);
            setIsGlobalSearchOpen(true);
            const nextNum = params.get('jersey');
            setJerseySearchQuery(nextNum ? `#${nextNum.replace(/^#/, '')}` : '');
        } else {
            setIsGlobalSearchOpen(false);
        }
    }

    useEffect(() => {
        if (shouldOpenJerseyModal) {
            ensureIndexesLoaded();
        }
    }, [shouldOpenJerseyModal, ensureIndexesLoaded]);

    const { stickyRef, sentinelRef } = useStickyHeader();
    useFirstEventOffset(stickyRef);

    const portfolioRef = useRef<HTMLDivElement>(null);
    const inView = useInView(portfolioRef, { once: true, margin: '-60px' });

    const { scrollOnNextDataLoadRef, handleDataLoad } = usePortfolioScroll(portfolioRef);

    // Track route changes in an effect to safely mutate refs (React Compiler strict mode)
    const prevRouteHash = useRef(activeRouteSlug || '');
    useEffect(() => {
        const currentRouteHash = activeRouteSlug || '';
        if (prevRouteHash.current !== currentRouteHash) {
            setTeamSearchQuery('');
            setGearSearchQuery('');
            if (!isFindRoute) {
                setJerseySearchQuery('');
            }
            scrollOnNextDataLoadRef.current = true;
            prevRouteHash.current = currentRouteHash;
        }
    }, [
        activeRouteSlug,
        isFindRoute,
        scrollOnNextDataLoadRef,
        setTeamSearchQuery,
        setGearSearchQuery,
        setJerseySearchQuery,
    ]);

    const { sharedFavorites, clearSharedFavorites } = useSharedFavorites();

    const { yearData, recapCount, recapEvents, recapHash, stats, setIsRecapLoaded, prefetchTab } = usePortfolioData({
        selectedTab,
        years,
        onDataLoadAction: handleDataLoad,
        isGearMode: isGearRoute,
    });

    const events = useMemo(() => Object.entries(yearData), [yearData]);

    const isFavoritesTab = selectedTab === 'favorites';
    const isTeamMode = !years.includes(selectedTab) && !isGearRoute && !isFavoritesTab && !isFindRoute;
    const isMultiYearMode = isTeamMode || isGearRoute || isFavoritesTab;

    const currentGearItem = useMemo(() => {
        if (!isGearRoute || !activeRouteSlug) return null;
        return GEAR_REGISTRY[activeRouteSlug] || null;
    }, [isGearRoute, activeRouteSlug]);

    const activeGearMeta = useMemo(() => {
        if (!isGearRoute || !activeRouteSlug) return null;
        return gearIndex.find((g) => g.id === activeRouteSlug) || null;
    }, [isGearRoute, activeRouteSlug, gearIndex]);

    const { totalEvents, totalPhotos, firstSeenTeam, mostSeenTeam, cameraGear, lensGear } = useMemo(
        () => getSeasonHighlights(stats, events, selectedTab),
        [stats, events, selectedTab]
    );

    const eventRows = useMemo(
        () => buildEventRows(events, selectedTab, isMultiYearMode),
        [events, selectedTab, isMultiYearMode]
    );

    const multiYearData = useMemo(() => {
        if (!isMultiYearMode) return [];
        return computeViewYears(events);
    }, [isMultiYearMode, events]);

    const activeTeamMeta = isTeamMode ? teamIndex.find((t) => t.slug === selectedTab) || null : null;

    const navPortalTarget = typeof document !== 'undefined' ? document.getElementById('nav-extension-portal') : null;

    const yearsSelectorContent = (
        <PortfolioYearNav
            years={years}
            selectedTab={selectedTab}
            isGearRoute={isGearRoute}
            currentGearItem={currentGearItem}
            isTeamMode={isTeamMode}
            activeTeamMeta={activeTeamMeta}
            isFindRoute={isFindRoute}
            activeJerseyNumber={params.get('num') || ''}
            prefetchTab={prefetchTab}
        />
    );

    const [isRecapReady, setIsRecapReady] = useState(false);
    useEffect(() => {
        if (isLightboxOpen || Boolean(sharedPhoto) || isRecapReady) return;
        if (hasInitialDeepLink && typeof window !== 'undefined') {
            const enable = () => setIsRecapReady(true);
            window.addEventListener('wheel', enable, { passive: true, once: true });
            window.addEventListener('touchmove', enable, { passive: true, once: true });
            window.addEventListener('pointerdown', enable, { passive: true, once: true });
            window.addEventListener('keydown', enable, { passive: true, once: true });
            return () => {
                window.removeEventListener('wheel', enable);
                window.removeEventListener('touchmove', enable);
                window.removeEventListener('pointerdown', enable);
                window.removeEventListener('keydown', enable);
            };
        }
        const timer = setTimeout(() => setIsRecapReady(true), 450);
        return () => clearTimeout(timer);
    }, [isLightboxOpen, sharedPhoto, isRecapReady]);

    const handleRecapLoadComplete = useCallback(() => {
        setIsRecapLoaded(true);
    }, [setIsRecapLoaded]);

    const seasonStrip = useMemo(() => {
        if (!stats) return null;
        return (
            <PortfolioSeasonStrip
                stats={stats}
                totalEvents={totalEvents}
                totalPhotos={totalPhotos}
                firstSeenTeam={firstSeenTeam}
                mostSeenTeam={mostSeenTeam}
                cameraGear={cameraGear}
                lensGear={lensGear}
                events={events}
            />
        );
    }, [stats, totalEvents, totalPhotos, firstSeenTeam, mostSeenTeam, cameraGear, lensGear, events]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            const storeState = useAppStore.getState();
            const isAnyModalOpen =
                isGlobalSearchOpen ||
                isLightboxOpen ||
                Boolean(sharedFavorites?.length) ||
                storeState.isAboutOpen ||
                storeState.isAiPolicyOpen ||
                storeState.isCodeLicenseOpen ||
                storeState.isPhotoLicenseOpen ||
                Boolean(storeState.activeGear) ||
                Boolean(storeState.iframeUrl) ||
                document.querySelector('.story-export-modal') !== null;

            if (isAnyModalOpen) {
                return;
            }

            if (isBatchSelectMode) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsBatchSelectMode(false);
                }
            } else {
                if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    ensureIndexesLoaded();
                    setHasEverOpenedSearch(true);
                    setIsGlobalSearchOpen(true);
                } else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    setIsBatchSelectMode(true);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isBatchSelectMode, setIsBatchSelectMode, isGlobalSearchOpen, isLightboxOpen, sharedFavorites, selectedTab, ensureIndexesLoaded]);

    const [isNearFooter, setIsNearFooter] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let ticking = false;
        const checkFooterOverlap = () => {
            if (window.scrollY < 200) {
                setIsNearFooter(false);
                ticking = false;
                return;
            }

            const footer = document.querySelector('footer');
            if (!footer) {
                setIsNearFooter(false);
                ticking = false;
                return;
            }

            const footerRect = footer.getBoundingClientRect();
            const isOverlap = footerRect.top < window.innerHeight - 16;
            setIsNearFooter(isOverlap);
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(checkFooterOverlap);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        checkFooterOverlap();

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [events.length]);

    const prevTabRef = useRef(selectedTab);
    useEffect(() => {
        if (prevTabRef.current !== selectedTab) {
            prevTabRef.current = selectedTab;
            clearVisiblePhotos();
        }
    }, [selectedTab, clearVisiblePhotos]);

    const allSelectablePhotos = useMemo(() => {
        if (!isBatchSelectMode) return [];
        const list: FavoriteStoreItem[] = [];
        const seen = new Set<string>();

        if (isFindRoute) {
            for (const photos of Object.values(visiblePhotosMap)) {
                for (const item of photos) {
                    const photoRecord = toPhotoRecord(item);
                    if (photoRecord.original && !seen.has(photoRecord.original)) {
                        seen.add(photoRecord.original);
                        list.push(item);
                    }
                }
            }
            return list;
        }

        // Include visible recap photos when recap is active
        const recapPhotos = visiblePhotosMap['__recap__'];
        if (recapPhotos && recapCount > 0 && !isTeamMode && !isGearRoute) {
            for (const item of recapPhotos) {
                const photoRecord = toPhotoRecord(item);
                if (photoRecord.original && !seen.has(photoRecord.original)) {
                    seen.add(photoRecord.original);
                    list.push(item);
                }
            }
        }

        for (const [evtName, evtData] of events) {
            const registered = visiblePhotosMap[evtName];
            const year = evtData.originalYear || selectedTab;
            const cachedAlbum = evtData.albumSlug ? getCachedAlbum(year, evtData.albumSlug) : undefined;
            const fullAlbum = evtData.album && evtData.album.length > 0 ? evtData.album : cachedAlbum;
            const photos: FavoriteStoreItem[] =
                registered ??
                (fullAlbum && fullAlbum.length > 0
                    ? fullAlbum.map((item) => {
                          const p = toPhotoRecord(item as FavoriteStoreItem);
                          return {
                              ...p,
                              eventName: evtName,
                              year,
                          };
                      })
                    : computeFeaturedPhotos(
                          (fullAlbum || []).map((p) => toPhotoRecord(p as FavoriteStoreItem)),
                          (evtData.highlights || []).map((h) => toPhotoRecord(h as FavoriteStoreItem))
                      ).map((p) => ({
                          ...p,
                          eventName: evtName,
                          year,
                      })));

            for (const item of photos) {
                const photoRecord = toPhotoRecord(item);
                if (photoRecord.original && !seen.has(photoRecord.original)) {
                    seen.add(photoRecord.original);
                    list.push(item);
                }
            }
        }
        return list;
    }, [isBatchSelectMode, isFindRoute, events, visiblePhotosMap, selectedTab, recapCount, isTeamMode, isGearRoute]);

    const isAllSelected = useMemo(() => {
        if (!isBatchSelectMode || allSelectablePhotos.length === 0) return false;
        const selectedUrls = new Set(batchSelectedPhotos.map((p) => getPhotoOriginalUrl(p)).filter(Boolean));
        return allSelectablePhotos.every((p) => {
            const url = getPhotoOriginalUrl(p);
            return Boolean(url && selectedUrls.has(url));
        });
    }, [isBatchSelectMode, allSelectablePhotos, batchSelectedPhotos]);

    const handleSelectAll = useCallback(() => {
        selectBatchPhotos(allSelectablePhotos);
    }, [allSelectablePhotos, selectBatchPhotos]);

    const isAllFavorited = useMemo(() => {
        if (batchSelectedPhotos.length === 0) return false;
        const favUrls = new Set(favorites.map((f) => getPhotoOriginalUrl(f)).filter(Boolean));
        return batchSelectedPhotos.every((p) => {
            const url = getPhotoOriginalUrl(p);
            return url && favUrls.has(url);
        });
    }, [batchSelectedPhotos, favorites]);

    const handleBatchFavorite = useCallback(() => {
        if (isAllFavorited) {
            removeFavorites(batchSelectedPhotos);
        } else {
            addFavorites(batchSelectedPhotos);
        }
    }, [isAllFavorited, batchSelectedPhotos, removeFavorites, addFavorites]);

    const { isZipping, zipProgress, startZipping } = useZipWorker();

    const handleBatchDownloadZip = useCallback(() => {
        if (batchSelectedPhotos.length === 0) return;
        const urls = batchSelectedPhotos.map((p) => getPhotoOriginalUrl(p)).filter((u): u is string => Boolean(u));
        if (urls.length === 0) return;
        const zipName = `photos_selected_${selectedTab}.zip`;
        startZipping(urls, zipName);
    }, [batchSelectedPhotos, selectedTab, startZipping]);

    const handleBatchShare = useCallback(async () => {
        if (batchSelectedPhotos.length === 0) return;
        try {
            const shareUrl = await buildFavoritesShareUrl(batchSelectedPhotos);
            if (navigator.share) {
                await navigator.share({
                    title: 'Selected Photos',
                    text: `Check out ${batchSelectedPhotos.length} selected photos!`,
                    url: shareUrl,
                });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Batch share failed:', err);
            }
        }
    }, [batchSelectedPhotos]);

    const handleDownloadAllFavorites = useCallback(() => {
        if (favorites.length === 0) return;
        const urls = favorites.map((item) => getPhotoOriginalUrl(item)).filter((u): u is string => Boolean(u));
        if (urls.length === 0) return;
        startZipping(urls, 'Favorites.zip');
    }, [favorites, startZipping]);

    const handleShareAllFavorites = useCallback(async () => {
        if (favorites.length === 0) return;
        try {
            const shareUrl = await buildFavoritesShareUrl(favorites);
            if (navigator.share) {
                await navigator.share({
                    title: 'My Favorite Photos',
                    text: `Check out my ${favorites.length} favorite photos!`,
                    url: shareUrl,
                });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('Share favorites failed:', err);
            }
        }
    }, [favorites]);

    const [directStoryPhoto, setDirectStoryPhoto] = useState<PhotoRecord | null>(null);
    const [directStoryEventName, setDirectStoryEventName] = useState<string>('');
    const [directStoryYear, setDirectStoryYear] = useState<string>('');
    const [directStoryScore, setDirectStoryScore] = useState<EventScore | undefined>(undefined);
    const [isDirectStoryOpen, setIsDirectStoryOpen] = useState(false);

    const handleBatchStory = useCallback(() => {
        if (batchSelectedPhotos.length === 1) {
            const item = batchSelectedPhotos[0];
            const p = toPhotoRecord(item);
            const evtName =
                typeof item === 'object' && 'eventName' in item && item.eventName ? item.eventName : 'Story';
            const yearStr = typeof item === 'object' && 'year' in item && item.year ? item.year : selectedTab;
            setDirectStoryPhoto(p);
            setDirectStoryEventName(evtName);
            setDirectStoryYear(yearStr);
            const matchedEvent = yearData[evtName] ?? getCachedYearEvent(yearStr, evtName);
            const scorePayload =
                matchedEvent?.localScore ||
                (matchedEvent?.wftdaMatch
                    ? { team1Score: matchedEvent.wftdaMatch.score1, team2Score: matchedEvent.wftdaMatch.score2 }
                    : undefined);
            setDirectStoryScore(scorePayload);
            setIsDirectStoryOpen(true);
        } else if (batchSelectedPhotos.length >= 2) {
            const firstItem = batchSelectedPhotos[0];
            const first = toPhotoRecord(firstItem);
            const records = batchSelectedPhotos.map((item) => toPhotoRecord(item));
            const frameEvents = records.map((r, i) => {
                const item = batchSelectedPhotos[i];
                return (
                    r.eventName ||
                    (typeof item === 'object' && item && 'eventName' in item && typeof item.eventName === 'string'
                        ? item.eventName
                        : undefined) ||
                    'Story'
                );
            });
            const frameYears = records.map((r, i) => {
                const item = batchSelectedPhotos[i];
                return (
                    r.year ||
                    (typeof item === 'object' && item && 'year' in item && typeof item.year === 'string'
                        ? item.year
                        : undefined) ||
                    selectedTab
                );
            });
            const frameScores = frameEvents.map((ev, i) => {
                const yr = frameYears[i] || selectedTab;
                const matched = ev ? (yearData[ev] ?? getCachedYearEvent(yr, ev)) : undefined;
                return (
                    matched?.localScore ||
                    (matched?.wftdaMatch
                        ? { team1Score: matched.wftdaMatch.score1, team2Score: matched.wftdaMatch.score2 }
                        : undefined)
                );
            });
            const evtName = frameEvents[0] || 'Story';
            const yearStr = frameYears[0] || selectedTab;
            const burstPhoto: PhotoRecord = {
                original: first.original,
                thumb: first.thumb || first.original,
                focusX: first.focusX ?? 0.5,
                focusY: first.focusY ?? 0.45,
                width: first.width,
                height: first.height,
                burst: {
                    id: records.length === 2 ? `batch_duet_${Date.now()}` : `batch_triptych_${Date.now()}`,
                    index: 0,
                    total: records.length,
                    isTriptych: true,
                    ...(records.length === 2 ? { isDuet: true } : {}),
                    frameSources: records.map((r) => r.original),
                    frameThumbs: records.map((r) => r.thumb || r.original),
                    frameFocusX: records.map((r) => r.focusX),
                    frameFocusY: records.map((r) => r.focusY),
                    frameWidths: records.map((r) => r.width),
                    frameHeights: records.map((r) => r.height),
                    frameEvents,
                    frameEventNames: frameEvents,
                    frameYears,
                    frameScores,
                },
            };
            setDirectStoryPhoto(burstPhoto);
            setDirectStoryEventName(evtName);
            setDirectStoryYear(yearStr);
            const scorePayload = frameScores[0];
            setDirectStoryScore(scorePayload);
            setIsDirectStoryOpen(true);
        }
    }, [
        batchSelectedPhotos,
        selectedTab,
        yearData,
        setDirectStoryPhoto,
        setDirectStoryEventName,
        setDirectStoryYear,
        setDirectStoryScore,
        setIsDirectStoryOpen,
    ]);

    return (
        <section className="portfolio" id="portfolio" ref={portfolioRef}>
            <div className="container">
                {recapCount > 0 && !isTeamMode && !isGearRoute && !isFindRoute && (
                    <div className="portfolio__recap-section">
                        <Recap
                            slug={selectedTab}
                            count={recapCount}
                            events={recapEvents}
                            hash={recapHash}
                            overlayText={selectedTab}
                            isYear={true}
                            onRecapLoadComplete={handleRecapLoadComplete}
                            yearData={yearData}
                            deferLoad={!isRecapReady || isLightboxOpen || Boolean(sharedPhoto)}
                        >
                            {seasonStrip}
                        </Recap>
                    </div>
                )}
                <div ref={sentinelRef} style={{ height: '1px' }} aria-hidden="true" />

                {navPortalTarget && createPortal(yearsSelectorContent, navPortalTarget)}

                {sharedFavorites && sharedFavorites.length > 0 && (
                    <SharedFavoritesPanel photos={sharedFavorites} onClose={clearSharedFavorites} />
                )}

                {isGearRoute && currentGearItem && (
                    <GearInfoHeader
                        gear={currentGearItem}
                        totalPhotos={activeGearMeta?.photoCount || totalPhotos}
                        totalEvents={activeGearMeta?.eventCount || events.length}
                    />
                )}

                {isFindRoute ? (
                    <ErrorBoundary name="FindMyPhotosView" variant="section">
                        <Suspense
                            fallback={
                                <div className="portfolio__loading" role="status" aria-live="polite">
                                    Loading jersey photos…
                                </div>
                            }
                        >
                            <FindMyPhotosView
                                initialTeamSlug={findTeamSlug}
                                initialNumberQuery={params.get('num') || ''}
                                hideTracks={isGlobalSearchOpen || isLightboxOpen}
                            />
                        </Suspense>
                    </ErrorBoundary>
                ) : (
                    <div className="portfolio__events-wrapper">
                        {!isGlobalSearchOpen &&
                            !isLightboxOpen &&
                            (!isMultiYearMode ? (
                                <PortfolioMonthTrack key={selectedTab} events={events} selectedYear={selectedTab} />
                            ) : multiYearData.length > 1 ? (
                                <PortfolioYearTrack
                                    key={selectedTab}
                                    events={events}
                                    title={
                                        activeTeamMeta?.name ||
                                        currentGearItem?.name ||
                                        (isFavoritesTab ? 'Favorites' : undefined)
                                    }
                                />
                            ) : multiYearData.length === 1 ? (
                                <PortfolioMonthTrack
                                    key={`${selectedTab}-${multiYearData[0].year}`}
                                    events={events}
                                    selectedYear={multiYearData[0].year}
                                />
                            ) : null)}

                        <div className="portfolio__events" ref={stickyRef}>
                            {isFavoritesTab && favorites.length === 0 ? (
                                <EventEmptyFavorites />
                            ) : (
                                <>
                                    {isFavoritesTab && (
                                        <div className="portfolio__favorites-header">
                                            <div className="portfolio__event-teams">
                                                <h2>
                                                    <span style={{ color: 'var(--color-accent)' }}>YOUR&nbsp;</span>
                                                    FAVORITES
                                                </h2>
                                            </div>
                                            <div className="portfolio__event-meta">
                                                {!canShare && (
                                                    <button
                                                        type="button"
                                                        className="portfolio__zip-btn"
                                                        onClick={handleDownloadAllFavorites}
                                                        disabled={isZipping}
                                                        title="Download All Original Photos (.zip)"
                                                        aria-label="Download All Original Photos (.zip)"
                                                        style={{
                                                            cursor: isZipping ? 'wait' : 'pointer',
                                                            ['--p' as string]: isZipping ? `${zipProgress / 100}` : 0,
                                                            borderColor: isZipping ? 'var(--color-accent)' : undefined,
                                                            color: isZipping
                                                                ? zipProgress > 50
                                                                    ? '#fff'
                                                                    : 'var(--color-accent)'
                                                                : undefined,
                                                        }}
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                )}
                                                {canShare && (
                                                    <button
                                                        type="button"
                                                        className="portfolio__zip-btn"
                                                        onClick={handleShareAllFavorites}
                                                        title="Share Favorites"
                                                        aria-label="Share Favorites"
                                                    >
                                                        <Share2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {eventRows.map((row) =>
                                        row.type === 'divider' ? (
                                            <div
                                                key={`divider-${row.year}`}
                                                id={`year-divider-${row.year}`}
                                                className="portfolio__year-divider"
                                                aria-hidden="true"
                                            >
                                                <span>{row.year}</span>
                                            </div>
                                        ) : (
                                            <PortfolioEvent
                                                key={`${selectedTab}-${row.eventName}`}
                                                eventName={row.eventName}
                                                ev={row.ev}
                                                evIdx={row.evIdx}
                                                selectedYear={
                                                    isMultiYearMode && row.ev.originalYear
                                                        ? row.ev.originalYear
                                                        : selectedTab
                                                }
                                                inViewParent={inView}
                                                activeTeamName={activeTeamMeta?.name}
                                                activeGearId={isGearRoute ? activeRouteSlug : undefined}
                                                isFavoritesTab={isFavoritesTab}
                                            />
                                        )
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <ErrorBoundary
                name="GlobalSearchOverlay"
                variant="overlay"
                resetKeys={[isGlobalSearchOpen]}
                onDismiss={() => {
                    setIsGlobalSearchOpen(false);
                    setTeamSearchQuery('');
                    setGearSearchQuery('');
                    setJerseySearchQuery('');
                }}
            >
                <Suspense fallback={null}>
                    {hasEverOpenedSearch && (
                        <GlobalSearchOverlay
                            isOpen={isGlobalSearchOpen}
                            onClose={() => {
                                setIsGlobalSearchOpen(false);
                                setTeamSearchQuery('');
                                setGearSearchQuery('');
                                setJerseySearchQuery('');
                            }}
                            teamSearchQuery={teamSearchQuery}
                            setTeamSearchQuery={setTeamSearchQuery}
                            filteredTeams={filteredTeams}
                            isTeamIndexLoading={isTeamIndexLoading}
                            gearSearchQuery={gearSearchQuery}
                            setGearSearchQuery={setGearSearchQuery}
                            filteredGear={filteredGear}
                            isGearIndexLoading={isGearIndexLoading}
                            jerseySearchQuery={jerseySearchQuery}
                            setJerseySearchQuery={setJerseySearchQuery}
                            findTeams={findIndex}
                            isFindIndexLoading={isFindIndexLoading}
                            initialTab={isFindRoute || Boolean(params.get('jersey')) ? 'jersey' : 'teams'}
                            initialTeamSlug={findTeamSlug}
                        />
                    )}
                </Suspense>
            </ErrorBoundary>

            {hasOpenedLightbox && (
                <ErrorBoundary
                    name="Lightbox"
                    variant="overlay"
                    resetKeys={[isLightboxOpen]}
                    onDismiss={() => useAppStore.getState().closeLightbox()}
                >
                    <Suspense fallback={null}>
                        {ResolvedLightboxContainer ? <ResolvedLightboxContainer /> : <LazyLightboxContainer />}
                    </Suspense>
                </ErrorBoundary>
            )}

            <AnimatePresence>
                {!isGlobalSearchOpen && !isBatchSelectMode && !isNearFooter && (
                    <motion.div
                        key="portfolio-floating-dock"
                        className="portfolio__floating-dock"
                        initial={{ x: '-50%', y: 24, opacity: 0 }}
                        animate={{ x: '-50%', y: 0, opacity: 1 }}
                        exit={{
                            x: '-50%',
                            y: 16,
                            opacity: 0,
                            transition: { duration: DURATION.fast, ease: EASE_IN_OUT },
                        }}
                        transition={SPRING_SOFT}
                        role="toolbar"
                        aria-label="Photo browsing actions"
                    >
                        <div className="portfolio__floating-dock-inner">
                            <button
                                type="button"
                                className="portfolio__dock-btn portfolio__dock-btn--search portfolio__global-floating-search"
                                onClick={() => {
                                    ensureIndexesLoaded();
                                    setHasEverOpenedSearch(true);
                                    setIsGlobalSearchOpen(true);
                                }}
                                aria-label="Open Search"
                                title="Search photos"
                            >
                                <Search size={16} strokeWidth={2} className="portfolio__dock-btn-icon" />
                                <span className="portfolio__dock-btn-text">Search</span>
                            </button>

                            <span className="portfolio__dock-divider" aria-hidden="true" />

                            <button
                                type="button"
                                className={`portfolio__dock-btn portfolio__dock-btn--select portfolio__global-floating-select ${
                                    batchSelectedCount > 0 ? 'portfolio__dock-btn--has-selection' : ''
                                }`}
                                onClick={() => {
                                    setIsBatchSelectMode(true);
                                }}
                                aria-label="Select Photos"
                                title="Select photos"
                            >
                                <CheckSquare size={16} strokeWidth={2} className="portfolio__dock-btn-icon" />
                                <span className="portfolio__dock-btn-text">Select</span>
                                <AnimatePresence initial={false}>
                                    {batchSelectedCount > 0 && (
                                        <motion.span
                                            key="dock-badge"
                                            className="portfolio__dock-badge"
                                            aria-label={`${batchSelectedCount} selected`}
                                            initial={{ scale: 0.4, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.4, opacity: 0, transition: { duration: DURATION.fast } }}
                                            transition={SPRING_POP}
                                        >
                                            <span key={batchSelectedCount} className="portfolio__dock-badge-count">
                                                {batchSelectedCount}
                                            </span>
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    </motion.div>
                )}

                {isBatchSelectMode && (
                    <BatchActionBar
                        key="portfolio-batch-bar"
                        isVisible={isBatchSelectMode}
                        selectedCount={batchSelectedPhotos.length}
                        totalCount={allSelectablePhotos.length}
                        isAllSelected={isAllSelected}
                        onSelectAll={handleSelectAll}
                        onDeselectAll={clearBatchSelection}
                        onFavoriteAll={handleBatchFavorite}
                        isAllFavorited={isAllFavorited}
                        onDownloadZip={handleBatchDownloadZip}
                        isZipping={isZipping}
                        zipProgress={zipProgress}
                        onShare={handleBatchShare}
                        onDone={() => setIsBatchSelectMode(false)}
                        onStory={handleBatchStory}
                    />
                )}
            </AnimatePresence>

            {isDirectStoryOpen && directStoryPhoto && (
                <ErrorBoundary
                    name="StoryExportModal"
                    variant="overlay"
                    resetKeys={[directStoryPhoto.burst?.id || directStoryPhoto.original]}
                    onDismiss={() => {
                        setIsDirectStoryOpen(false);
                        setDirectStoryPhoto(null);
                    }}
                >
                    <Suspense fallback={null}>
                        <StoryExportModal
                            key={`direct-story-${directStoryPhoto.burst?.id || directStoryPhoto.original}`}
                            isOpen={isDirectStoryOpen}
                            onClose={() => {
                                setIsDirectStoryOpen(false);
                                setDirectStoryPhoto(null);
                            }}
                            photo={directStoryPhoto}
                            eventName={directStoryEventName}
                            year={directStoryYear}
                            localScore={directStoryScore}
                        />
                    </Suspense>
                </ErrorBoundary>
            )}
        </section>
    );
}
