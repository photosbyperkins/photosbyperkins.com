import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { motion, useInView } from 'framer-motion';
import { Save, Star } from 'lucide-react';
import ProgressiveImage from '../../ui/ProgressiveImage';
import { FeaturedGridIcon } from '../../ui/icons';
import { usePortfolioStore } from '../../../store/usePortfolioStore';
import { formatTeamName, parseEventTitle } from '../../../utils/formatters';
import { useCanShare } from '../../../hooks/useCanShare';
import { useEventAlbum } from '../../../hooks/useEventAlbum';
import type { EventData, PhotoInput } from '../../../types';

declare const __BUILD_NUMBER__: string;

interface PortfolioEventProps {
    eventName: string;
    ev: EventData;
    evIdx: number;
    selectedYear: string;
    inViewParent: boolean;
    activeTeamName?: string;
}

const PortfolioEvent = memo(function PortfolioEvent({
    eventName,
    ev: initialEv,
    evIdx,
    selectedYear,
    inViewParent,
    activeTeamName,
}: PortfolioEventProps) {
    const canShare = useCanShare();
    const openLightbox = usePortfolioStore((state) => state.openLightbox);
    const sharedPhoto = usePortfolioStore((state) => state.sharedPhoto);
    const setSharedPhoto = usePortfolioStore((state) => state.setSharedPhoto);

    const [ev, setEv] = useState<EventData>(initialEv);
    const [isGridView, setIsGridView] = useState(false);

    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '400px' });

    const isSharedEvent = sharedPhoto?.eventName === eventName;
    const isVisible = inView || (evIdx < 2 && inViewParent) || isSharedEvent;

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

    const albumImages: PhotoInput[] = useMemo(() => {
        return ev.album || [];
    }, [ev.album]);

    useEffect(() => {
        if (isSharedEvent && ev.album && ev.album.length > 0 && sharedPhoto) {
            if (sharedPhoto.photoIndex !== undefined) {
                openLightbox(albumImages, sharedPhoto.photoIndex, eventName, selectedYear);
            }
            setSharedPhoto(null);
        }
    }, [isSharedEvent, ev.album, sharedPhoto, eventName, selectedYear, openLightbox, setSharedPhoto, albumImages]);

    const totalPhotos = ev.photoCount || (ev.album ? ev.album.length : 0);
    const albumObj = ev.album || [];
    let featuredPhotos: PhotoInput[] = ev.highlights || [];

    // Filter out highlights that don't exist in the album (orphaned highlights)
    if (featuredPhotos.length > 0 && albumImages.length > 0) {
        featuredPhotos = featuredPhotos.filter((h: PhotoInput) => {
            const hUrl = typeof h === 'string' ? h : h.original;
            return albumImages.some((ai: PhotoInput) => (typeof ai === 'string' ? ai : ai.original) === hUrl);
        });
    }

    if (featuredPhotos.length === 0) {
        if (ev.album && ev.album.length > 0) {
            featuredPhotos = ev.album.slice(0, 10);
        }
    } else {
        if (featuredPhotos.length < 10) {
            const remaining = 10 - featuredPhotos.length;
            const extras = albumObj
                .filter((a: PhotoInput) => {
                    const url = typeof a === 'string' ? a : a.original;
                    return !featuredPhotos.some((f: PhotoInput) => (typeof f === 'string' ? f : f.original) === url);
                })
                .slice(0, remaining);
            featuredPhotos = [...featuredPhotos, ...extras];
        }
    }
    featuredPhotos = featuredPhotos.slice(0, 10);

    // Sort featured photos sequentially by index
    featuredPhotos.sort((a, b) => {
        const getIndex = (src: PhotoInput) => {
            const url = typeof src === 'string' ? src : src.original;
            const filename = url.split('/').pop() || '';
            const match = filename.match(/(\d+)(?!.*\d)/);
            return match ? parseInt(match[0], 10) : 0;
        };
        return getIndex(a) - getIndex(b);
    });

    // Parsing title logic
    const { mainTitle, datePrefix } = parseEventTitle(eventName, ev.originalYear, selectedYear);
    // Split by vs/versus first
    const baseTeams = mainTitle
        .split(/\s+(?:vs|versus)\s+/i)
        .map((t) => t.trim())
        .filter(Boolean);

    let activeSortedTeams = baseTeams;
    if (activeTeamName) {
        const activeTerms = activeTeamName.toLowerCase().split(/\s+/).filter(Boolean);
        activeSortedTeams = [...baseTeams].sort((a, b) => {
            const aRaw = a.toLowerCase();
            const bRaw = b.toLowerCase();
            const aDisplay = formatTeamName(a).toLowerCase();
            const bDisplay = formatTeamName(b).toLowerCase();

            const aScore = activeTerms.filter((term) => aRaw.includes(term) || aDisplay.includes(term)).length;
            const bScore = activeTerms.filter((term) => bRaw.includes(term) || bDisplay.includes(term)).length;

            return bScore - aScore;
        });
    }

    const hasLocalScore = ev.localScore && ev.localScore.team1Score !== null && ev.localScore.team2Score !== null;
    const shouldShowScores = activeSortedTeams.length > 1 && (ev.wftdaMatch || hasLocalScore);

    const finalTeams = shouldShowScores
        ? [...activeSortedTeams].sort((a, b) => {
              const getExpectedScore = (tm: string) => {
                  if (ev.wftdaMatch) {
                      const t1 = ev.wftdaMatch.team1.toLowerCase();
                      const t2 = ev.wftdaMatch.team2.toLowerCase();
                      const tCurr = formatTeamName(tm).toLowerCase();
                      const tRaw = tm.toLowerCase();

                      if (t1.includes(tCurr) || tCurr.includes(t1) || t1.includes(tRaw) || tRaw.includes(t1)) {
                          return Number(ev.wftdaMatch.score1) || -1;
                      }
                      if (t2.includes(tCurr) || tCurr.includes(t2) || t2.includes(tRaw) || tRaw.includes(t2)) {
                          return Number(ev.wftdaMatch.score2) || -1;
                      }
                      return -1;
                  } else if (hasLocalScore) {
                      const originalTeams = mainTitle.split(/\s+(?:vs|versus)\s+/i).map((t) => t.trim());
                      if (tm === originalTeams[0]) return Number(ev.localScore!.team1Score) || -1;
                      if (tm === originalTeams[1]) return Number(ev.localScore!.team2Score) || -1;
                      return -1;
                  }
                  return -1;
              };

              return getExpectedScore(b) - getExpectedScore(a);
          })
        : activeSortedTeams;

    return (
        <motion.article
            ref={ref}
            id={`event-${eventName.replace(/[^a-zA-Z0-9-]/g, '-')}`}
            className="portfolio__event"
            initial={{ opacity: 0, y: 20 }}
            animate={inViewParent ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: Math.min(evIdx * 0.05, 0.5) }} // Cap delay
            style={{ minHeight: isVisible ? 'auto' : '350px' }}
        >
            <div className="portfolio__event-header">
                {(() => {
                    const TitleSideWrapper = ev.wftdaMatch ? 'a' : 'div';
                    const wrapperProps = ev.wftdaMatch
                        ? {
                              href: ev.wftdaMatch.href,
                              target: '_blank',
                              rel: 'noopener noreferrer',
                              className: 'portfolio__event-title-side portfolio__event-title-side--link',
                              title: 'Official WFTDA Match Details',
                          }
                        : {
                              className: 'portfolio__event-title-side',
                          };

                    return (
                        <TitleSideWrapper {...wrapperProps}>
                            {datePrefix && <div className="portfolio__event-date">{datePrefix}</div>}
                            <div className="portfolio__event-title-stack">
                                {ev.wftdaMatch && (
                                    <div className="portfolio__wftda-badge" title="Official WFTDA Match Details">
                                        <span>WFTDA</span>
                                    </div>
                                )}
                                <div className="portfolio__event-teams-row">
                                    <div className="portfolio__event-teams">
                                        {finalTeams.map((team, i) => {
                                            const formattedTeam = formatTeamName(team);
                                            const hasAbbreviation = formattedTeam !== team;

                                            return (
                                                <h3 key={i}>
                                                    {hasAbbreviation ? (
                                                        <>
                                                            <span className="portfolio__team-name--full">{team}</span>
                                                            <span className="portfolio__team-name--mobile">
                                                                {formattedTeam}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>{team}</>
                                                    )}
                                                </h3>
                                            );
                                        })}
                                    </div>
                                    {shouldShowScores && (
                                        <div className="portfolio__event-scores">
                                            {finalTeams.map((team, i) => {
                                                let score: number | string = '-';
                                                let isWin = false;

                                                if (ev.wftdaMatch) {
                                                    const t1 = ev.wftdaMatch.team1.toLowerCase();
                                                    const t2 = ev.wftdaMatch.team2.toLowerCase();
                                                    const tCurr = formatTeamName(team).toLowerCase();
                                                    const tRaw = team.toLowerCase();

                                                    if (
                                                        t1.includes(tCurr) ||
                                                        tCurr.includes(t1) ||
                                                        t1.includes(tRaw) ||
                                                        tRaw.includes(t1)
                                                    ) {
                                                        score = ev.wftdaMatch.score1;
                                                        isWin =
                                                            Number(ev.wftdaMatch.score1) > Number(ev.wftdaMatch.score2);
                                                    } else if (
                                                        t2.includes(tCurr) ||
                                                        tCurr.includes(t2) ||
                                                        t2.includes(tRaw) ||
                                                        tRaw.includes(t2)
                                                    ) {
                                                        score = ev.wftdaMatch.score2;
                                                        isWin =
                                                            Number(ev.wftdaMatch.score2) > Number(ev.wftdaMatch.score1);
                                                    }
                                                } else if (hasLocalScore) {
                                                    const originalTeams = mainTitle
                                                        .split(/\s+(?:vs|versus)\s+/i)
                                                        .map((t) => t.trim());
                                                    const isTeam1 = team === originalTeams[0];
                                                    score = isTeam1
                                                        ? ev.localScore!.team1Score!
                                                        : ev.localScore!.team2Score!;
                                                    const otherScore = isTeam1
                                                        ? ev.localScore!.team2Score!
                                                        : ev.localScore!.team1Score!;
                                                    isWin = Number(score) > Number(otherScore);
                                                }

                                                return (
                                                    <span
                                                        key={i}
                                                        className={`portfolio__team-score ${isWin ? 'is-win' : ''}`}
                                                    >
                                                        {score}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TitleSideWrapper>
                    );
                })()}

                <div className="portfolio__event-meta">
                    {ev.date && <span className="portfolio__stat-tag">{ev.date}</span>}

                    {ev.zip && !canShare && (
                        <a
                            href={`${ev.zip}?v=${__BUILD_NUMBER__}`}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="portfolio__zip-btn"
                            title="Download All Original Photos (.zip)"
                        >
                            <Save size={16} />
                        </a>
                    )}

                    <div className="portfolio__segmented-toggle">
                        <button
                            className={`portfolio__segment-btn ${!isGridView ? 'active' : ''}`}
                            onClick={() => setIsGridView((prev) => !prev)}
                            aria-label="Show Featured Photos"
                            title="Show Featured Photos"
                        >
                            <Star size={16} />
                        </button>
                        <button
                            className={`portfolio__segment-btn ${isGridView ? 'active' : ''}`}
                            onClick={() => setIsGridView((prev) => !prev)}
                            aria-label="Show Full Album"
                            title="Show Full Album"
                        >
                            <FeaturedGridIcon size={16} />
                        </button>
                    </div>
                </div>
            </div>
            {ev.description && <p className="portfolio__event-desc">{ev.description}</p>}

            {isVisible ? (
                <>
                    {isGridView ? (
                        <div className="portfolio__event-grid">
                            {(ev.album || []).map((url: PhotoInput, i) => {
                                const origUrl = typeof url === 'string' ? url : url.original;
                                const thumbUrl = typeof url === 'string' ? url : url.thumb || url.original;

                                const focusX = typeof url === 'string' ? undefined : url.focusX;
                                const focusY = typeof url === 'string' ? undefined : url.focusY;

                                return (
                                    <div key={origUrl} className="portfolio__grid-item">
                                        <ProgressiveImage
                                            src={thumbUrl}
                                            placeholder={null}
                                            alt={`${eventName} photo ${i + 1}`}
                                            onClick={() => openLightbox(albumImages, i, eventName, selectedYear)}
                                            objectPosition={
                                                focusX != null && focusY != null
                                                    ? `${focusX * 100}% ${focusY * 100}%`
                                                    : 'center'
                                            }
                                        />
                                    </div>
                                );
                            })}
                            {loading && <div className="portfolio__loading">Loading photos...</div>}
                            {fetchError && (
                                <div className="portfolio__error">Error loading photos. Please try refreshing.</div>
                            )}
                        </div>
                    ) : (
                        <div className="portfolio__event-featured">
                            {featuredPhotos.length > 0 ? (
                                featuredPhotos.map((url, i) => {
                                    const isDesktopLast = i === 9;
                                    const isMobileLast = i === 4;
                                    const origUrl = typeof url === 'string' ? url : url.original;
                                    const thumbUrl = typeof url === 'string' ? url : url.thumb || url.original;
                                    const albumIndex = albumImages.findIndex(
                                        (ai: PhotoInput) => (typeof ai === 'string' ? ai : ai.original) === origUrl
                                    );

                                    const focusX = typeof url === 'string' ? undefined : url.focusX;
                                    const focusY = typeof url === 'string' ? undefined : url.focusY;

                                    return (
                                        <div
                                            key={origUrl}
                                            className={`portfolio__featured-item ${isDesktopLast && totalPhotos > 10 ? 'has-overlay-desktop' : ''} ${isMobileLast && totalPhotos > 5 ? 'has-overlay-mobile' : ''}`}
                                            onClick={() =>
                                                openLightbox(
                                                    albumImages,
                                                    albumIndex !== -1 ? albumIndex : 0,
                                                    eventName,
                                                    selectedYear
                                                )
                                            }
                                        >
                                            <ProgressiveImage
                                                src={thumbUrl}
                                                placeholder={null}
                                                alt={`${eventName} featured photo ${i + 1}`}
                                                objectPosition={
                                                    focusX != null && focusY != null
                                                        ? `${focusX * 100}% ${focusY * 100}%`
                                                        : 'center'
                                                }
                                            />
                                            {isDesktopLast && totalPhotos > 10 && (
                                                <div className="portfolio__featured-overlay portfolio__featured-overlay--desktop">
                                                    <span>+{totalPhotos - 10}</span>
                                                </div>
                                            )}
                                            {isMobileLast && totalPhotos > 5 && (
                                                <div className="portfolio__featured-overlay portfolio__featured-overlay--mobile">
                                                    <span>+{totalPhotos - 5}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="portfolio__event-placeholder portfolio__event-placeholder--featured">
                                    {loading ? 'Loading photos...' : fetchError ? 'Error loading photos' : ''}
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="portfolio__event-placeholder portfolio__event-placeholder--full"></div>
            )}
        </motion.article>
    );
});

export default PortfolioEvent;
