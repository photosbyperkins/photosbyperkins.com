import { motion, useInView } from 'framer-motion';
import { Save, Star, Heart, Share2 } from 'lucide-react';
import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useCanShare } from '../../../hooks/useCanShare';
import { useEventAlbum } from '../../../hooks/useEventAlbum';
import { usePortfolioStore } from '../../../store/usePortfolioStore';
import { buildFavoritesShareUrl } from '../../../utils/favoritesUrl';
import { formatTeamName, parseEventTitle, resolvePhotoInput } from '../../../utils/formatters';
import { FeaturedGridIcon } from '../../ui/icons';
import ProgressiveImage from '../../ui/ProgressiveImage';
import VirtualizedAlbumGrid from './VirtualizedAlbumGrid';
import type { EventData, PhotoInput, FavoriteStoreItem } from '../../../types';

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
    const isVisible = inView || (evIdx < 2 && inViewParent) || isSharedEvent || eventName === 'Favorites';

    useEffect(() => {
        if (eventName === 'Favorites') {
            setEv(initialEv);
        }
    }, [initialEv, eventName]);

    const [isZipping, setIsZipping] = useState(false);
    const [zipProgress, setZipProgress] = useState(0);
    const zipWorkerRef = useRef<Worker | null>(null);

    // Terminate the zip worker on unmount to prevent leaks
    useEffect(() => {
        return () => {
            zipWorkerRef.current?.terminate();
        };
    }, []);

    const handleDownloadFavorites = async () => {
        if (isZipping || !ev.album) return;
        setIsZipping(true);
        setZipProgress(0);

        const worker = new Worker(new URL('../../../workers/zipWorker.ts', import.meta.url), { type: 'module' });
        zipWorkerRef.current = worker;

        worker.onmessage = (e) => {
            if (e.data.type === 'progress') {
                setZipProgress(Math.round(e.data.progress));
            } else if (e.data.type === 'done') {
                const { blob, filename } = e.data;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);

                setZipProgress(100);
                setTimeout(() => {
                    setIsZipping(false);
                    setZipProgress(0);
                }, 1500);

                worker.terminate();
                zipWorkerRef.current = null;
            } else if (e.data.type === 'error') {
                console.error('Zip error:', e.data.error);
                setIsZipping(false);
                worker.terminate();
                zipWorkerRef.current = null;
            }
        };

        // Bug 2: use typed albumImages instead of any-cast ev.album
        const urls = albumImages.map((item: PhotoInput) => {
            return typeof item === 'string' ? item : item.original;
        });
        worker.postMessage({ urls, filename: 'Favorites.zip' });
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

    const albumImages: PhotoInput[] = useMemo(() => {
        if (!ev.album) return [];
        return ev.album.map((item: unknown) => resolvePhotoInput(item as FavoriteStoreItem));
    }, [ev.album]);

    // Warm the scrubber sprite into browser cache as soon as album data arrives.
    // The sprite is used for both the lightbox scrubber and ambient blur background.
    useEffect(() => {
        if (albumImages.length === 0) return;
        const first = albumImages[0];
        if (typeof first === 'string' || !first.thumb || first.spriteIndex == null) return;
        const dir = first.thumb.substring(0, first.thumb.lastIndexOf('/'));
        const spriteUrl = `${dir.replace(/^\/thumbnails\//, '/scrubber/')}/sprite.webp?v=${__BUILD_NUMBER__}`;
        const img = new Image();
        img.src = spriteUrl;
    }, [albumImages]);

    const highlightImages: PhotoInput[] = useMemo(() => {
        if (!ev.highlights) return [];
        return ev.highlights.map((item: unknown) => resolvePhotoInput(item as FavoriteStoreItem));
    }, [ev.highlights]);

    useEffect(() => {
        if (isSharedEvent && ev.album && ev.album.length > 0 && sharedPhoto) {
            if (sharedPhoto.photoIndex !== undefined) {
                openLightbox(albumImages, sharedPhoto.photoIndex, eventName, selectedYear);
            }
            setSharedPhoto(null);
        }
    }, [isSharedEvent, ev.album, sharedPhoto, eventName, selectedYear, openLightbox, setSharedPhoto, albumImages]);

    const totalPhotos = ev.photoCount || albumImages.length;

    const featuredPhotos: PhotoInput[] = useMemo(() => {
        let photos: PhotoInput[] = [...highlightImages];

        // Build a Set of album URLs for O(n) lookups instead of O(n²) nested .some()
        const albumUrlSet = new Set(albumImages.map((ai: PhotoInput) => (typeof ai === 'string' ? ai : ai.original)));

        // Filter out highlights that don't exist in the album (orphaned highlights)
        if (photos.length > 0 && albumImages.length > 0) {
            photos = photos.filter((h: PhotoInput) => {
                const hUrl = typeof h === 'string' ? h : h.original;
                return albumUrlSet.has(hUrl);
            });
        }

        if (photos.length === 0) {
            if (albumImages.length > 0) {
                photos = albumImages.slice(0, 10);
            }
        } else {
            if (photos.length < 10) {
                const remaining = 10 - photos.length;
                const featuredUrlSet = new Set(photos.map((f: PhotoInput) => (typeof f === 'string' ? f : f.original)));
                const extras = albumImages
                    .filter((a: PhotoInput) => !featuredUrlSet.has(typeof a === 'string' ? a : a.original))
                    .slice(0, remaining);
                photos = [...photos, ...extras];
            }
        }
        // Sort featured photos sequentially by trailing filename number (e.g. photo_042.jpg → 42)
        photos.sort((a: FavoriteStoreItem, b: FavoriteStoreItem) => {
            const getIndex = (src: FavoriteStoreItem) => {
                const srcInput = typeof src === 'object' && 'photo' in src ? src.photo : src;
                const url = typeof srcInput === 'string' ? srcInput : srcInput.original;
                if (!url) return 0;
                const filename = url.split('/').pop() || '';
                // Match the last numeric group before the extension to avoid prefix digit collisions
                const match = filename.match(/(\d+)\.[^.]+$/);
                return match ? parseInt(match[1], 10) : 0;
            };
            return getIndex(a) - getIndex(b);
        });

        return photos.slice(0, 10);
    }, [albumImages, highlightImages]);

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

    const TitleSideWrapper = ev.wftdaMatch ? 'a' : 'div';
    const titleSideProps = ev.wftdaMatch
        ? {
              href: ev.wftdaMatch.href,
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'portfolio__event-title-side portfolio__event-title-side--link',
              title: 'Official WFTDA Match Details',
          }
        : { className: 'portfolio__event-title-side' };

    const titleBlock = (
        <TitleSideWrapper {...titleSideProps}>
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
                                    {eventName === 'Favorites' ? (
                                        <>
                                            <span style={{ color: 'var(--color-accent)' }}>YOUR&nbsp;</span>
                                            FAVORITES
                                        </>
                                    ) : hasAbbreviation ? (
                                        <>
                                            <span className="portfolio__team-name--full">{team}</span>
                                            <span className="portfolio__team-name--mobile">{formattedTeam}</span>
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
                                        isWin = Number(ev.wftdaMatch.score1) > Number(ev.wftdaMatch.score2);
                                    } else if (
                                        t2.includes(tCurr) ||
                                        tCurr.includes(t2) ||
                                        t2.includes(tRaw) ||
                                        tRaw.includes(t2)
                                    ) {
                                        score = ev.wftdaMatch.score2;
                                        isWin = Number(ev.wftdaMatch.score2) > Number(ev.wftdaMatch.score1);
                                    }
                                } else if (hasLocalScore) {
                                    const originalTeams = mainTitle.split(/\s+(?:vs|versus)\s+/i).map((t) => t.trim());
                                    const isTeam1 = team === originalTeams[0];
                                    score = isTeam1 ? ev.localScore!.team1Score! : ev.localScore!.team2Score!;
                                    const otherScore = isTeam1
                                        ? ev.localScore!.team2Score!
                                        : ev.localScore!.team1Score!;
                                    isWin = Number(score) > Number(otherScore);
                                }
                                return (
                                    <span key={i} className={`portfolio__team-score ${isWin ? 'is-win' : ''}`}>
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
                {titleBlock}

                <div className="portfolio__event-meta">
                    {ev.date && <span className="portfolio__stat-tag">{ev.date}</span>}

                    {ev.zip && !canShare && eventName !== 'Favorites' && (
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

                    {eventName === 'Favorites' && canShare && ev.album && ev.album.length > 0 && (
                        <button
                            className="portfolio__zip-btn"
                            onClick={async () => {
                                const favorites = usePortfolioStore.getState().favorites;
                                const shareUrl = buildFavoritesShareUrl(favorites);
                                try {
                                    await navigator.share({
                                        title: 'My Favorite Photos',
                                        text: `Check out my ${favorites.length} favorite photos!`,
                                        url: shareUrl,
                                    });
                                } catch (err) {
                                    if ((err as Error).name !== 'AbortError') {
                                        console.error('Share failed:', err);
                                    }
                                }
                            }}
                            title="Share Favorites"
                            aria-label="Share Favorites"
                        >
                            <Share2 size={16} />
                        </button>
                    )}

                    {eventName === 'Favorites' && !canShare && ev.album && ev.album.length > 0 && (
                        <button
                            className="portfolio__zip-btn"
                            onClick={handleDownloadFavorites}
                            disabled={isZipping}
                            title="Download Favorites as .zip"
                            style={{
                                cursor: isZipping ? 'wait' : 'pointer',
                                backgroundImage: isZipping
                                    ? 'linear-gradient(to bottom, var(--color-accent) 100%, transparent 100%)'
                                    : 'none',
                                backgroundSize: `100% ${isZipping ? zipProgress : 0}%`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'top center',
                                transition:
                                    'background-size 0.2s ease-out, border-color 0.2s ease-out, color 0.2s ease-out',
                                borderColor: isZipping ? 'var(--color-accent)' : undefined,
                                color: isZipping ? (zipProgress > 50 ? '#fff' : 'var(--color-accent)') : undefined,
                            }}
                        >
                            <Save size={16} />
                        </button>
                    )}

                    {eventName !== 'Favorites' && (
                        <div className="portfolio__segmented-toggle">
                            <button
                                className={`portfolio__segment-btn ${!isGridView ? 'active' : ''}`}
                                onClick={() => setIsGridView((prev) => !prev)}
                                aria-label="Show Featured Photos"
                                aria-pressed={!isGridView}
                                title="Show Featured Photos"
                            >
                                <Star size={16} />
                            </button>
                            <button
                                className={`portfolio__segment-btn ${isGridView ? 'active' : ''}`}
                                onClick={() => setIsGridView((prev) => !prev)}
                                aria-label="Show Full Album"
                                aria-pressed={isGridView}
                                title="Show Full Album"
                            >
                                <FeaturedGridIcon size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {ev.description && <p className="portfolio__event-desc">{ev.description}</p>}

            {isVisible ? (
                <>
                    {eventName === 'Favorites' && (!ev.album || ev.album.length === 0) ? (
                        <div
                            className="portfolio__empty-state"
                            style={{ padding: '3rem 1rem', color: 'var(--color-text-muted)', textAlign: 'center' }}
                        >
                            <Heart size={48} strokeWidth={1} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p
                                style={{
                                    margin: 0,
                                    fontFamily: 'var(--font-condensed)',
                                    fontSize: '1.2rem',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                NO FAVORITES YET
                            </p>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                                Click the heart icon on any photo to add it here.
                            </p>
                        </div>
                    ) : isGridView || eventName === 'Favorites' ? (
                        albumImages.length > 50 && eventName !== 'Favorites' ? (
                            <>
                                <VirtualizedAlbumGrid
                                    photos={albumImages}
                                    eventName={eventName}
                                    selectedYear={selectedYear}
                                    maxExifChars={ev.maxExifChars}
                                    openLightbox={openLightbox}
                                />
                                {loading && <div className="portfolio__loading">Loading photos...</div>}
                                {fetchError && (
                                    <div className="portfolio__error">Error loading photos. Please try refreshing.</div>
                                )}
                            </>
                        ) : (
                            <div className="portfolio__event-grid">
                                {albumImages.map((url: PhotoInput, i) => {
                                    const origUrl = typeof url === 'string' ? url : url.original;
                                    const thumbUrl = typeof url === 'string' ? url : url.thumb || url.original;

                                    const focusX = typeof url === 'string' ? undefined : url.focusX;
                                    const focusY = typeof url === 'string' ? undefined : url.focusY;

                                    return (
                                        <div
                                            key={origUrl}
                                            className="portfolio__grid-item"
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`View ${eventName} photo ${i + 1}`}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    openLightbox(
                                                        albumImages,
                                                        i,
                                                        eventName,
                                                        selectedYear,
                                                        ev.maxExifChars
                                                    );
                                                }
                                            }}
                                        >
                                            <ProgressiveImage
                                                src={thumbUrl}
                                                placeholder={null}
                                                alt={`${eventName} photo ${i + 1}`}
                                                onClick={() =>
                                                    openLightbox(
                                                        albumImages,
                                                        i,
                                                        eventName,
                                                        selectedYear,
                                                        ev.maxExifChars
                                                    )
                                                }
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
                        )
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
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`View ${eventName} featured photo ${i + 1}`}
                                            onClick={() =>
                                                openLightbox(
                                                    albumImages,
                                                    albumIndex !== -1 ? albumIndex : 0,
                                                    eventName,
                                                    selectedYear,
                                                    ev.maxExifChars
                                                )
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    openLightbox(
                                                        albumImages,
                                                        albumIndex !== -1 ? albumIndex : 0,
                                                        eventName,
                                                        selectedYear,
                                                        ev.maxExifChars
                                                    );
                                                }
                                            }}
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
