import { useInView, AnimatePresence, motion } from 'framer-motion';
import Fuse from 'fuse.js';
import { Search, X, Heart } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { matchPath, useLocation, Link } from 'react-router-dom';
import { usePortfolioData } from '../../../hooks/usePortfolioData';
import { usePortfolioScroll } from '../../../hooks/usePortfolioScroll';
import { useStickyHeader } from '../../../hooks/useStickyHeader';
import { usePortfolioStore } from '../../../store/usePortfolioStore';
import { decodeFavoritesHash } from '../../../utils/favoritesUrl';
import { formatTeamName, parseEventTitle } from '../../../utils/formatters';
import Recap from '../Recap';
import LightboxContainer from './LightboxContainer';
import PortfolioEvent from './PortfolioEvent';
import SharedFavoritesPanel from './SharedFavoritesPanel';
import TeamFilter from './TeamFilter';
import type { PhotoInput } from '../../../types';
import '../../../styles/_portfolio.scss';

declare const __BUILD_NUMBER__: string;

interface PortfolioProps {
    years: string[];
}

interface TeamMeta {
    name: string;
    slug: string;
    count: number;
}

export default function Portfolio({ years }: PortfolioProps) {
    const location = useLocation();
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const initialSearchOpen = params?.get('search') === 'true' || !!params?.get('q');
    const initialSearchQuery = params?.get('q') || '';

    const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(initialSearchOpen);

    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setIsGlobalSearchOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (isGlobalSearchOpen) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '8px';
        } else {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        return () => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
    }, [isGlobalSearchOpen]);

    const [lastPortfolioPath, setLastPortfolioPath] = useState(location.pathname);

    useEffect(() => {
        if (location.pathname.startsWith('/portfolio')) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLastPortfolioPath(location.pathname);
        }
    }, [location.pathname]);

    const matchPathStr = location.pathname.startsWith('/portfolio') ? location.pathname : lastPortfolioPath;

    const yearMatch = matchPath('/portfolio/:year', matchPathStr);
    const teamMatch = matchPath('/portfolio/team/:slug', matchPathStr);
    // Deep link: /portfolio/:year/:event/:photo
    const deepLinkMatch = matchPath('/portfolio/:year/:event/:photo', matchPathStr);
    // Event-only deep link: /portfolio/:year/:event (no photo index)
    const eventDeepMatch = !deepLinkMatch ? matchPath('/portfolio/:year/:event', matchPathStr) : null;

    const isTeamRoute = !!teamMatch;
    const activeRouteSlug =
        teamMatch?.params.slug || deepLinkMatch?.params.year || eventDeepMatch?.params.year || yearMatch?.params.year;

    // Moved URLSearchParams to the top to initialize search state
    const initialYear = activeRouteSlug || params?.get('year');
    // Deep link event/photo take priority over query params
    const initialEvent = deepLinkMatch?.params.event || eventDeepMatch?.params.event || params?.get('event');
    const initialPhoto = deepLinkMatch?.params.photo || params?.get('photo');

    const setSharedPhoto = usePortfolioStore((state) => state.setSharedPhoto);

    const selectedTab = (() => {
        if (isTeamRoute && activeRouteSlug) return activeRouteSlug;
        if (activeRouteSlug === 'favorites') return 'favorites';
        if (activeRouteSlug && years.includes(activeRouteSlug)) return activeRouteSlug;
        return initialYear && years.includes(initialYear) ? initialYear : years[0] || '';
    })();

    const [teamIndex, setTeamIndex] = useState<TeamMeta[]>([]);
    const [teamSearchQuery, setTeamSearchQuery] = useState(initialSearchQuery);
    const hasFetchedTeams = useRef(false);

    const fetchTeamIndex = useCallback(() => {
        if (hasFetchedTeams.current) return;
        hasFetchedTeams.current = true;
        fetch(`/data/teams/index.json?build=${__BUILD_NUMBER__}`)
            .then((res) => res.json())
            .then((data) => setTeamIndex(data))
            .catch((err) => console.error('Failed to load teams index:', err));
    }, []);

    useEffect(() => {
        if (initialSearchOpen) {
            // Trigger team fetch automatically if search is opened from URL parsing
            fetchTeamIndex();
        }
    }, [initialSearchOpen, fetchTeamIndex]);

    const { isSticky, stickyRef, sentinelRef } = useStickyHeader();

    const portfolioRef = useRef<HTMLDivElement>(null);
    const inView = useInView(portfolioRef, { once: true, margin: '-60px' });

    const { scrollOnNextDataLoadRef, handleDataLoad } = usePortfolioScroll(portfolioRef);

    // Track route changes in an effect to safely mutate refs (React Compiler strict mode)
    const prevRouteHash = useRef(activeRouteSlug || '');
    useEffect(() => {
        const currentRouteHash = activeRouteSlug || '';
        if (prevRouteHash.current !== currentRouteHash) {
            setTeamSearchQuery('');
            if (isSticky) {
                scrollOnNextDataLoadRef.current = true;
            }
            prevRouteHash.current = currentRouteHash;
        }
    }, [activeRouteSlug, isSticky, scrollOnNextDataLoadRef]);

    useEffect(() => {
        if (initialYear && initialEvent && (years.includes(initialYear) || isTeamRoute)) {
            const index = initialPhoto ? parseInt(initialPhoto, 10) : undefined;
            setSharedPhoto({ eventName: decodeURIComponent(initialEvent), photoIndex: index });
        }
    }, [initialYear, initialEvent, initialPhoto, years, isTeamRoute, setSharedPhoto]);

    // Shared favorites: detect #photos=... hash in the URL (works on any tab)
    const [sharedFavorites, setSharedFavorites] = useState<PhotoInput[] | undefined>(undefined);

    useEffect(() => {
        const hash = window.location.hash;
        if (!hash.startsWith('#photos=')) return;

        const encoded = hash.slice('#photos='.length);
        const basenames = decodeFavoritesHash(encoded);
        if (basenames.length === 0) return;

        // Resolve basenames → PhotoInput by scanning the chunked album files.
        // Flow: index.json → each year JSON → each album JSON → match basenames.
        (async () => {
            try {
                const indexRes = await fetch(`/data/index.json?build=${__BUILD_NUMBER__}`);
                if (!indexRes.ok) return;
                const indexData: { years: string[] } = await indexRes.json();

                const basenameSet = new Set(basenames);
                const resolved: PhotoInput[] = [];

                for (const year of indexData.years) {
                    if (basenameSet.size === 0) break;

                    const yearRes = await fetch(`/data/years/${year}.json?build=${__BUILD_NUMBER__}`);
                    if (!yearRes.ok) continue;
                    const yearPayload = await yearRes.json();
                    const events = yearPayload.events || {};

                    for (const [, ev] of Object.entries(events) as [string, { albumSlug?: string }][]) {
                        if (basenameSet.size === 0) break;
                        if (!ev.albumSlug) continue;

                        const albumRes = await fetch(
                            `/data/albums/${year}/${ev.albumSlug}.json?build=${__BUILD_NUMBER__}`
                        );
                        if (!albumRes.ok) continue;
                        const album: PhotoInput[] = await albumRes.json();

                        for (const photo of album) {
                            const original = typeof photo === 'string' ? photo : photo.original;
                            const basename = original.split('/').pop() || '';
                            if (basenameSet.has(basename)) {
                                resolved.push(photo);
                                basenameSet.delete(basename);
                                if (basenameSet.size === 0) break;
                            }
                        }
                    }
                }

                if (resolved.length > 0) {
                    setSharedFavorites(resolved);
                }
            } catch (err) {
                console.error('Failed to resolve shared favorites:', err);
            }
        })();
    }, []);

    const { yearData, recapCount, recapEvents, setIsRecapLoaded } = usePortfolioData({
        selectedTab,
        years,
        onDataLoadAction: handleDataLoad,
    });

    const events = Object.entries(yearData);

    const isTeamMode = !years.includes(selectedTab);

    // In team mode, build a list of rows: either an event entry or a year-divider string.
    type EventRow =
        | { type: 'event'; eventName: string; ev: (typeof yearData)[string]; evIdx: number }
        | { type: 'divider'; year: string };
    const isFavoritesTab = selectedTab === 'favorites';
    const eventRows =
        isTeamMode && !isFavoritesTab
            ? (() => {
                  const rows: EventRow[] = [];
                  let lastYear: string | null = null;
                  let eventCounter = 0;
                  for (const [eventName, ev] of events) {
                      const { parsedYear } = parseEventTitle(eventName, ev.originalYear);
                      const year = parsedYear || ev.originalYear || selectedTab;
                      if (year !== lastYear) {
                          if (year) rows.push({ type: 'divider', year });
                          lastYear = year ?? null;
                      }
                      rows.push({ type: 'event', eventName, ev, evIdx: eventCounter++ });
                  }
                  return rows;
              })()
            : events.map(([eventName, ev], evIdx) => ({ type: 'event' as const, eventName, ev, evIdx }));
    const activeTeamMeta = isTeamMode ? teamIndex.find((t) => t.slug === selectedTab) : null;

    const fuse = useMemo(
        () =>
            new Fuse(teamIndex, {
                keys: ['name', 'slug'],
                threshold: 0.3,
                ignoreLocation: true,
            }),
        [teamIndex]
    );

    const filteredTeams = useMemo(() => {
        if (!teamSearchQuery.trim()) return teamIndex;
        return fuse.search(teamSearchQuery).map((result) => result.item);
    }, [fuse, teamIndex, teamSearchQuery]);

    const navPortalTarget = typeof document !== 'undefined' ? document.getElementById('nav-extension-portal') : null;

    const yearsSelectorContent = (
        <nav className="portfolio__years" aria-label="Year Navigation">
            {isTeamMode && activeTeamMeta ? (
                <Link
                    to="/portfolio"
                    className="portfolio__active-filter active"
                    aria-label={`Remove filter for ${activeTeamMeta.name}`}
                    title={`Remove filter for ${activeTeamMeta.name}`}
                >
                    <span>{formatTeamName(activeTeamMeta.name)}</span>
                    <span className="portfolio__team-clear-icon" aria-hidden="true">
                        <X size={15} strokeWidth={3} />
                    </span>
                </Link>
            ) : (
                <>
                    {years.map((y) => (
                        <Link
                            key={y}
                            to={`/portfolio/${y}`}
                            className={`${y === selectedTab ? 'active' : ''}`}
                            onClick={(e) => {
                                if (y === selectedTab && isSticky) {
                                    e.preventDefault();
                                    portfolioRef.current?.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                        >
                            <span className="portfolio__year-full" style={{ transform: 'translateY(1px)' }}>
                                {y}
                            </span>
                            <span className="portfolio__year-short" style={{ transform: 'translateY(1px)' }}>
                                {y.slice(-2)}
                            </span>
                        </Link>
                    ))}
                    <Link
                        to="/portfolio/favorites"
                        className={`${selectedTab === 'favorites' ? 'active' : ''}`}
                        onClick={(e) => {
                            if (selectedTab === 'favorites' && isSticky) {
                                e.preventDefault();
                                portfolioRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                        title="Favorites"
                        aria-label="Favorites"
                    >
                        <span className="portfolio__year-full">
                            <Heart
                                size={16}
                                fill={selectedTab === 'favorites' ? 'currentColor' : 'none'}
                                style={{
                                    color: selectedTab === 'favorites' ? 'var(--color-accent)' : 'inherit',
                                    transform: 'translateY(3px)',
                                }}
                            />
                        </span>
                        <span className="portfolio__year-short">
                            <Heart
                                size={16}
                                fill={selectedTab === 'favorites' ? 'currentColor' : 'none'}
                                style={{
                                    color: selectedTab === 'favorites' ? 'var(--color-accent)' : 'inherit',
                                    transform: 'translateY(3px)',
                                }}
                            />
                        </span>
                    </Link>
                </>
            )}
        </nav>
    );

    return (
        <section className="portfolio" id="portfolio" ref={portfolioRef}>
            <div className="container">
                {recapCount > 0 && !isTeamMode && (
                    <div className="portfolio__recap-section">
                        <Recap
                            slug={selectedTab}
                            count={recapCount}
                            events={recapEvents}
                            overlayText={selectedTab}
                            isYear={true}
                            onRecapLoadComplete={() => setIsRecapLoaded(true)}
                        />
                    </div>
                )}
                <div ref={sentinelRef} style={{ height: '1px' }} aria-hidden="true" />

                {navPortalTarget && createPortal(yearsSelectorContent, navPortalTarget)}

                {sharedFavorites && sharedFavorites.length > 0 && (
                    <SharedFavoritesPanel
                        photos={sharedFavorites}
                        onClose={() => {
                            setSharedFavorites(undefined);
                            window.history.replaceState(null, '', window.location.pathname);
                        }}
                    />
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
                            />
                        )
                    )}
                </div>
            </div>

            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {isGlobalSearchOpen && (
                            <motion.div
                                className="portfolio__global-search-overlay"
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            >
                                <div className="portfolio__global-search-content">
                                    <TeamFilter
                                        teamSearchQuery={teamSearchQuery}
                                        setTeamSearchQuery={setTeamSearchQuery}
                                        filteredTeams={filteredTeams}
                                        teamIndexLoading={teamIndex.length === 0}
                                        onBack={() => {
                                            setIsGlobalSearchOpen(false);
                                            setTeamSearchQuery('');
                                        }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}

            <LightboxContainer />

            {!isGlobalSearchOpen && selectedTab !== 'favorites' && (
                <div className="portfolio__global-floating-container">
                    <button
                        className="portfolio__global-floating-search"
                        onClick={() => {
                            fetchTeamIndex();
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
