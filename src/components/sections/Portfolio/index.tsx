import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useInView, AnimatePresence, motion } from 'framer-motion';
import { matchPath, useLocation, Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { formatTeamName } from '../../../utils/formatters';
import PortfolioEvent from './PortfolioEvent';
import Lightbox from './Lightbox';
import TeamFilter from './TeamFilter';
import Recap from '../Recap';
import { usePortfolioStore } from '../../../store/usePortfolioStore';
import type { YearData } from '../../../types';
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

    const isTeamRoute = !!teamMatch;
    const activeRouteSlug = teamMatch?.params.slug || yearMatch?.params.year;

    // Moved URLSearchParams to the top to initialize search state
    const initialYear = activeRouteSlug || params?.get('year');
    const initialEvent = params?.get('event');
    const initialPhoto = params?.get('photo');

    const setSharedPhoto = usePortfolioStore((state) => state.setSharedPhoto);
    const lightbox = usePortfolioStore((state) => state.lightbox);
    const closeLightbox = usePortfolioStore((state) => state.closeLightbox);
    const setLightboxIndex = usePortfolioStore((state) => state.setLightboxIndex);

    const selectedTab = (() => {
        if (isTeamRoute && activeRouteSlug) return activeRouteSlug;
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

    const [isSticky, setIsSticky] = useState(false);

    const scrollOnNextDataLoad = useRef(false);

    // Track route changes in an effect to safely mutate refs (React Compiler strict mode)
    const prevRouteHash = useRef(activeRouteSlug || '');
    useEffect(() => {
        const currentRouteHash = activeRouteSlug || '';
        if (prevRouteHash.current !== currentRouteHash) {
            setTeamSearchQuery('');
            if (isSticky) {
                scrollOnNextDataLoad.current = true;
            }
            prevRouteHash.current = currentRouteHash;
        }
    }, [activeRouteSlug, isSticky]);

    useEffect(() => {
        if (initialYear && initialEvent && (years.includes(initialYear) || isTeamRoute)) {
            const index = initialPhoto ? parseInt(initialPhoto, 10) : undefined;
            setSharedPhoto({ eventName: decodeURIComponent(initialEvent), photoIndex: index });
        }
    }, [initialYear, initialEvent, initialPhoto, years, isTeamRoute, setSharedPhoto]);

    const stickyRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const endSentinelRef = useRef<HTMLDivElement>(null);
    const portfolioRef = useRef<HTMLDivElement>(null);
    const inView = useInView(portfolioRef, { once: true, margin: '-60px' });

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                const past = !entry.isIntersecting && entry.boundingClientRect.top <= 48;
                setIsSticky(past);
                if (past) {
                    document.body.classList.add('has-stuck-portfolio');
                    if (stickyRef.current) {
                        document.documentElement.style.setProperty(
                            '--portfolio-stuck-height',
                            `${stickyRef.current.offsetHeight}px`
                        );
                    }
                } else {
                    document.body.classList.remove('has-stuck-portfolio');
                    document.documentElement.style.removeProperty('--portfolio-stuck-height');
                }
            },
            {
                threshold: [0],
                rootMargin: '-48px 0px 0px 0px',
            }
        );

        if (sentinelRef.current) observer.observe(sentinelRef.current);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        if (isSticky && stickyRef.current) {
            document.documentElement.style.setProperty(
                '--portfolio-stuck-height',
                `${stickyRef.current.offsetHeight}px`
            );
        }
    }, [isSticky, selectedTab, teamSearchQuery]);

    const [yearData, setYearData] = useState<YearData>({});
    const [recapCount, setRecapCount] = useState<number>(0);
    const [recapEvents, setRecapEvents] = useState<{ eventName: string; photoIndex: number }[]>([]);

    const activeRequestRef = useRef<number>(0);

    const getForTab = useCallback(async (tabSlug: string, setData: boolean, isTeamMode: boolean) => {
        const basePath = isTeamMode ? `/data/teams` : `/data/years`;

        const requestToken = Date.now();
        if (setData) {
            activeRequestRef.current = requestToken;
        }

        const fetchPart = (slug: string, accumulate: boolean) => {
            fetch(`${basePath}/${slug}.json?build=${__BUILD_NUMBER__}`)
                .then((res) => res.json())
                .then((data) => {
                    if (setData) {
                        if (activeRequestRef.current !== requestToken) return; // Tab switched, abort

                        setYearData((prev) => (accumulate ? { ...prev, ...data.events } : data.events));

                        if (!accumulate) {
                            setRecapCount(data.recapCount || 0);
                            setRecapEvents(data.recapEvents || []);

                            if (scrollOnNextDataLoad.current) {
                                scrollOnNextDataLoad.current = false;
                                setTimeout(() => portfolioRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                            }
                        }

                        if (data.nextPart) {
                            setTimeout(() => {
                                if (activeRequestRef.current === requestToken) {
                                    fetchPart(data.nextPart, true);
                                }
                            }, 300);
                        }
                    }
                })
                .catch((err) => console.error(`Failed to load data for ${slug}:`, err));
        };

        fetchPart(tabSlug, false);
    }, []);

    useEffect(() => {
        if (!selectedTab) return;
        const isTeamMode = !years.includes(selectedTab);
        getForTab(selectedTab, true, isTeamMode);
    }, [selectedTab, years, getForTab]);

    useEffect(() => {
        years.forEach((year, i) => {
            if (i > 0) getForTab(year, false, false);
        });
    }, [years, getForTab]);

    const events = Object.entries(yearData).reverse();

    const isTeamMode = !years.includes(selectedTab);
    const activeTeamMeta = isTeamMode ? teamIndex.find((t) => t.slug === selectedTab) : null;

    const filteredTeams = teamIndex.filter((team) => {
        const displayName = formatTeamName(team.name).toLowerCase();
        const rawName = team.name.toLowerCase();
        const searchTerms = teamSearchQuery.toLowerCase().split(/\s+/).filter(Boolean);

        if (searchTerms.length === 0) return true;

        return searchTerms.every((term) => rawName.includes(term) || displayName.includes(term));
    });

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
                years.map((y, index) => (
                    <Link
                        key={y}
                        to={`/portfolio/${y}`}
                        className={`${y === selectedTab ? 'active' : ''} ${index === 0 && !isTeamRoute && selectedTab === y ? 'is-current' : ''} ${index === 0 ? 'is-first' : ''}`}
                        onClick={(e) => {
                            if (y === selectedTab && isSticky) {
                                e.preventDefault();
                                portfolioRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                    >
                        <span className="portfolio__year-full">{y}</span>
                        <span className="portfolio__year-short">{y.slice(-2)}</span>
                    </Link>
                ))
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
                        />
                    </div>
                )}
                <div ref={sentinelRef} style={{ height: '1px' }} aria-hidden="true" />

                {navPortalTarget && createPortal(yearsSelectorContent, navPortalTarget)}

                <div className="portfolio__events">
                    {/* Team header pill moved to navigation scale */}
                    {events.map(([eventName, ev], evIdx) => (
                        <PortfolioEvent
                            key={`${selectedTab}-${eventName}`}
                            eventName={eventName}
                            ev={ev}
                            evIdx={evIdx}
                            selectedYear={selectedTab}
                            inViewParent={inView}
                            activeTeamName={activeTeamMeta?.name}
                        />
                    ))}
                </div>
            </div>

            <div ref={endSentinelRef} style={{ height: '1px' }} aria-hidden="true" />

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

            <AnimatePresence>
                {lightbox.isOpen && (
                    <Lightbox
                        images={lightbox.images}
                        index={lightbox.index}
                        year={lightbox.year}
                        eventName={lightbox.eventName}
                        onClose={closeLightbox}
                        onSetIndex={setLightboxIndex}
                    />
                )}
            </AnimatePresence>

            {!isGlobalSearchOpen && (
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
