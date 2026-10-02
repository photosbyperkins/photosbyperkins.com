import { useInView, motion, AnimatePresence } from 'framer-motion';
import { Search, CheckSquare } from 'lucide-react';
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
import { buildFavoritesShareUrl } from '../../../utils/favoritesUrl';
import { getPhotoOriginalUrl, toPhotoRecord } from '../../../utils/formatters';
import { GEAR_REGISTRY } from '../../../data/gearData';
import type { PhotoRecord, FavoriteStoreItem, EventScore } from '../../../types';
import Recap from '../Recap';
import PortfolioEvent from './PortfolioEvent';
import SharedFavoritesPanel from './SharedFavoritesPanel';
import PortfolioMonthTrack from './PortfolioMonthTrack';
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

    const isTeamMode = !years.includes(selectedTab) && !isGearRoute && selectedTab !== 'favorites';
    const isMultiYearMode = (isTeamMode || isGearRoute) && selectedTab !== 'favorites';

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

    const isFavoritesTab = selectedTab === 'favorites';
    const eventRows = useMemo(
        () => buildEventRows(events, selectedTab, isMultiYearMode),
        [events, selectedTab, isMultiYearMode]
    );
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
            } else if (!isGlobalSearchOpen && !isLightboxOpen && selectedTab !== 'favorites') {
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

    const allSelectablePhotos = useMemo(() => {
        const list: FavoriteStoreItem[] = [];
        const seen = new Set<string>();
        for (const [evtName, evtData] of events) {
            const photos = evtData.album && evtData.album.length > 0 ? evtData.album : evtData.highlights || [];
            for (const item of photos) {
                const photoRecord = toPhotoRecord(item as FavoriteStoreItem);
                if (photoRecord.original && !seen.has(photoRecord.original)) {
                    seen.add(photoRecord.original);
                    list.push({
                        ...photoRecord,
                        eventName: evtName,
                        year: evtData.originalYear || selectedTab,
                    });
                }
            }
        }
        return list;
    }, [events, selectedTab]);

    const isAllSelected = allSelectablePhotos.length > 0 && batchSelectedPhotos.length === allSelectablePhotos.length;
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
            const evtName =
                typeof firstItem === 'object' && 'eventName' in firstItem && firstItem.eventName
                    ? firstItem.eventName
                    : 'Story';
            const yearStr =
                typeof firstItem === 'object' && 'year' in firstItem && firstItem.year ? firstItem.year : selectedTab;
            const burstPhoto: PhotoRecord = {
                original: first.original,
                thumb: first.thumb || first.original,
                focusX: first.focusX ?? 0.5,
                focusY: first.focusY ?? 0.45,
                burst: {
                    id: `batch_triptych_${Date.now()}`,
                    index: 0,
                    total: records.length,
                    isTriptych: true,
                    frameSources: records.map((r) => r.original),
                    frameThumbs: records.map((r) => r.thumb || r.original),
                },
            };
            setDirectStoryPhoto(burstPhoto);
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
                    {!isTeamMode && !isGearRoute && !isFavoritesTab && !isGlobalSearchOpen && !isLightboxOpen && (
                        <PortfolioMonthTrack key={selectedTab} events={events} selectedYear={selectedTab} />
                    )}

                    <div className="portfolio__events" ref={stickyRef}>
                        {eventRows.map((row) =>
                            row.type === 'divider' ? (
                                <div key={`divider-${row.year}`} className="portfolio__year-divider" aria-hidden="true">
                                    <span>{row.year}</span>
                                </div>
                            ) : (
                                <PortfolioEvent
                                    key={`${selectedTab}-${row.eventName}`}
                                    eventName={row.eventName}
                                    ev={row.ev}
                                    evIdx={row.evIdx}
                                    selectedYear={selectedTab}
                                    inViewParent={inView}
                                    activeTeamName={activeTeamMeta?.name}
                                    activeGearId={isGearRoute ? activeRouteSlug : undefined}
                                />
                            )
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
                {!isGlobalSearchOpen && !isBatchSelectMode && selectedTab !== 'favorites' && (
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
                                title="Search photos (/)"
                            >
                                <Search size={16} strokeWidth={2} className="portfolio__dock-btn-icon" />
                                <span className="portfolio__dock-btn-text">Search</span>
                                <kbd className="portfolio__dock-btn-kbd" aria-hidden="true">
                                    /
                                </kbd>
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
                                title="Select photos (S)"
                            >
                                <CheckSquare size={16} strokeWidth={2} className="portfolio__dock-btn-icon" />
                                <span className="portfolio__dock-btn-text">Select</span>
                                {batchSelectedPhotos.length > 0 ? (
                                    <span
                                        className="portfolio__dock-badge"
                                        aria-label={`${batchSelectedPhotos.length} selected`}
                                    >
                                        {batchSelectedPhotos.length}
                                    </span>
                                ) : (
                                    <kbd className="portfolio__dock-btn-kbd" aria-hidden="true">
                                        S
                                    </kbd>
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
                        key={`direct-story-${directStoryPhoto.original}`}
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
