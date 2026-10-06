import { useInView, motion, AnimatePresence } from 'framer-motion';
import { Search, CheckSquare } from '../../ui/icons';
import React, { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { usePortfolioRoute } from '../../../hooks/usePortfolioRoute';
import { usePortfolioData } from '../../../hooks/usePortfolioData';
import { usePortfolioScroll } from '../../../hooks/usePortfolioScroll';
import { usePortfolioSearch } from '../../../hooks/usePortfolioSearch';
import { useStickyHeader } from '../../../hooks/useStickyHeader';
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
import GearInfoHeader from './GearInfoHeader';
import PortfolioYearNav from './PortfolioYearNav';
import PortfolioSeasonStrip from './PortfolioSeasonStrip';
import { BatchActionBar } from './eventComponents/BatchActionBar';

const LightboxContainer = React.lazy(() => import('./LightboxContainer'));
const GlobalSearchOverlay = React.lazy(() => import('./GlobalSearchOverlay'));
const StoryExportModal = React.lazy(() => import('./StoryExportModal'));

import { useSharedFavorites } from '../../../hooks/useSharedFavorites';
import '../../../styles/_portfolio.scss';

interface PortfolioProps {
    years: string[];
}

export default function Portfolio({ years }: PortfolioProps) {
    const location = useLocation();
    const { selectedTab, isGearRoute, activeRouteSlug, initialSearchOpen, initialSearchQuery } = usePortfolioRoute({
        years,
    });

    const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(initialSearchOpen);
    const [hasEverOpenedSearch, setHasEverOpenedSearch] = useState(initialSearchOpen);

    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setIsGlobalSearchOpen(false);
    }, [location.pathname]);

    useBodyScrollLock(isGlobalSearchOpen);

    const isLightboxOpen = useAppStore((state) => state.lightbox.isOpen);
    const isBatchSelectMode = useAppStore((state) => state.isBatchSelectMode);
    const setIsBatchSelectMode = useAppStore((state) => state.setIsBatchSelectMode);
    const batchSelectedPhotos = useAppStore((state) => state.batchSelectedPhotos);
    const selectBatchPhotos = useAppStore((state) => state.selectBatchPhotos);
    const clearBatchSelection = useAppStore((state) => state.clearBatchSelection);
    const visiblePhotosMap = useAppStore((state) => state.visiblePhotosMap);
    const clearVisiblePhotos = useAppStore((state) => state.clearVisiblePhotos);
    const favorites = useAppStore((state) => state.favorites);
    const addFavorites = useAppStore((state) => state.addFavorites);
    const removeFavorites = useAppStore((state) => state.removeFavorites);

    const {
        teamIndex,
        gearIndex,
        isTeamIndexLoading,
        isGearIndexLoading,
        teamSearchQuery,
        setTeamSearchQuery,
        gearSearchQuery,
        setGearSearchQuery,
        filteredTeams,
        filteredGear,
        ensureIndexesLoaded,
    } = usePortfolioSearch({
        initialSearchQuery,
        initialSearchOpen,
        isGearRoute,
    });

    const { stickyRef, sentinelRef } = useStickyHeader();

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
            scrollOnNextDataLoadRef.current = true;
            prevRouteHash.current = currentRouteHash;
        }
    }, [activeRouteSlug, scrollOnNextDataLoadRef, setTeamSearchQuery, setGearSearchQuery]);

    const { sharedFavorites, clearSharedFavorites } = useSharedFavorites();

    const { yearData, recapCount, recapEvents, stats, setIsRecapLoaded, prefetchTab } = usePortfolioData({
        selectedTab,
        years,
        onDataLoadAction: handleDataLoad,
        isGearMode: isGearRoute,
    });

    const events = Object.entries(yearData);

    const isFavoritesTab = selectedTab === 'favorites';
    const isTeamMode = !years.includes(selectedTab) && !isGearRoute && !isFavoritesTab;
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
            prefetchTab={prefetchTab}
        />
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            if (isBatchSelectMode) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsBatchSelectMode(false);
                }
            } else if (!isGlobalSearchOpen && !isLightboxOpen) {
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
    }, [isBatchSelectMode, setIsBatchSelectMode, isGlobalSearchOpen, isLightboxOpen, selectedTab, ensureIndexesLoaded]);

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
        const list: FavoriteStoreItem[] = [];
        const seen = new Set<string>();

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
    }, [events, visiblePhotosMap, selectedTab, recapCount, isTeamMode, isGearRoute]);

    const isAllSelected = useMemo(() => {
        if (allSelectablePhotos.length === 0) return false;
        const selectedUrls = new Set(batchSelectedPhotos.map((p) => getPhotoOriginalUrl(p)).filter(Boolean));
        return allSelectablePhotos.every((p) => {
            const url = getPhotoOriginalUrl(p);
            return Boolean(url && selectedUrls.has(url));
        });
    }, [allSelectablePhotos, batchSelectedPhotos]);

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
            const matchedEvent = yearData[evtName];
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
            const frameScores = frameEvents.map((ev) => {
                const matched = ev ? yearData[ev] : undefined;
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
                {recapCount > 0 && !isTeamMode && !isGearRoute && (
                    <div className="portfolio__recap-section">
                        <Recap
                            slug={selectedTab}
                            count={recapCount}
                            events={recapEvents}
                            overlayText={selectedTab}
                            isYear={true}
                            onRecapLoadComplete={() => setIsRecapLoaded(true)}
                            yearData={yearData}
                        >
                            {stats && (
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
                            )}
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

                <div className="portfolio__events-wrapper">
                    {!isGlobalSearchOpen && !isLightboxOpen && (
                        !isMultiYearMode ? (
                            <PortfolioMonthTrack key={selectedTab} events={events} selectedYear={selectedTab} />
                        ) : multiYearData.length > 1 ? (
                            <PortfolioYearTrack
                                key={selectedTab}
                                events={events}
                                title={activeTeamMeta?.name || currentGearItem?.name || (isFavoritesTab ? 'Favorites' : undefined)}
                            />
                        ) : multiYearData.length === 1 ? (
                            <PortfolioMonthTrack
                                key={`${selectedTab}-${multiYearData[0].year}`}
                                events={events}
                                selectedYear={multiYearData[0].year}
                            />
                        ) : null
                    )}

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
            </div>

            <Suspense fallback={null}>
                {hasEverOpenedSearch && (
                    <GlobalSearchOverlay
                        isOpen={isGlobalSearchOpen}
                        onClose={() => {
                            setIsGlobalSearchOpen(false);
                            setTeamSearchQuery('');
                            setGearSearchQuery('');
                        }}
                        teamSearchQuery={teamSearchQuery}
                        setTeamSearchQuery={setTeamSearchQuery}
                        filteredTeams={filteredTeams}
                        isTeamIndexLoading={isTeamIndexLoading}
                        gearSearchQuery={gearSearchQuery}
                        setGearSearchQuery={setGearSearchQuery}
                        filteredGear={filteredGear}
                        isGearIndexLoading={isGearIndexLoading}
                    />
                )}
            </Suspense>

            <Suspense fallback={null}>
                <LightboxContainer />
            </Suspense>

            <AnimatePresence mode="wait">
                {!isGlobalSearchOpen && !isBatchSelectMode && !isNearFooter && (
                    <motion.div
                        key="portfolio-floating-dock"
                        className="portfolio__floating-dock"
                        initial={{ x: '-50%', y: 80, opacity: 0 }}
                        animate={{ x: '-50%', y: 0, opacity: 1 }}
                        exit={{ x: '-50%', y: 80, opacity: 0 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
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
                                    batchSelectedPhotos.length > 0 ? 'portfolio__dock-btn--has-selection' : ''
                                }`}
                                onClick={() => {
                                    setIsBatchSelectMode(true);
                                }}
                                aria-label="Select Photos"
                                title="Select photos"
                            >
                                <CheckSquare size={16} strokeWidth={2} className="portfolio__dock-btn-icon" />
                                <span className="portfolio__dock-btn-text">Select</span>
                                {batchSelectedPhotos.length > 0 && (
                                    <span
                                        className="portfolio__dock-badge"
                                        aria-label={`${batchSelectedPhotos.length} selected`}
                                    >
                                        {batchSelectedPhotos.length}
                                    </span>
                                )}
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
            )}
        </section>
    );
}
