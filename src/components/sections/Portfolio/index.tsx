import { useInView } from 'framer-motion';
import { Search } from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { usePortfolioRoute } from '../../../hooks/usePortfolioRoute';
import { usePortfolioData } from '../../../hooks/usePortfolioData';
import { usePortfolioScroll } from '../../../hooks/usePortfolioScroll';
import { usePortfolioSearch } from '../../../hooks/usePortfolioSearch';
import { useStickyHeader } from '../../../hooks/useStickyHeader';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { useAppStore } from '../../../store/useAppStore';
import { buildEventRows, getSeasonHighlights } from '../../../utils/portfolioTransforms';
import { GEAR_REGISTRY } from '../../../data/gearData';
import Recap from '../Recap';
import PortfolioEvent from './PortfolioEvent';
import SharedFavoritesPanel from './SharedFavoritesPanel';
import PortfolioMonthTrack from './PortfolioMonthTrack';
import GearInfoHeader from './GearInfoHeader';
import PortfolioYearNav from './PortfolioYearNav';
import PortfolioSeasonStrip from './PortfolioSeasonStrip';

const LightboxContainer = React.lazy(() => import('./LightboxContainer'));
const GlobalSearchOverlay = React.lazy(() => import('./GlobalSearchOverlay'));

import { useSharedFavorites } from '../../../hooks/useSharedFavorites';
import '../../../styles/_portfolio.scss';

interface PortfolioProps {
    years: string[];
}

export default function Portfolio({ years }: PortfolioProps) {
    const location = useLocation();
    const {
        selectedTab,
        isGearRoute,
        activeRouteSlug,
        initialSearchOpen,
        initialSearchQuery,
    } = usePortfolioRoute({ years });

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

    const {
        totalEvents,
        totalPhotos,
        firstSeenTeam,
        mostSeenTeam,
        cameraGear,
        lensGear,
    } = useMemo(
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

            {!isGlobalSearchOpen && selectedTab !== 'favorites' && (
                <div className="portfolio__global-floating-container">
                    <button
                        className="portfolio__global-floating-search"
                        onClick={() => {
                            ensureIndexesLoaded();
                            setHasEverOpenedSearch(true);
                            setIsGlobalSearchOpen(true);
                        }}
                        aria-label="Open Search"
                    >
                        <Search size={18} strokeWidth={2.5} />
                        <span>Search</span>
                    </button>
                </div>
            )}
        </section>
    );
}
