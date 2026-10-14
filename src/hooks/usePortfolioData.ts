import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getPhotoDisplayUrl, parseEventTitle, toPhotoRecord } from '../utils/formatters';
import { fetchAlbum, getCachedAlbum } from '../utils/albumData';
import { decodeEventChunk } from '../utils/dataCodec';
import { LRUCache } from '../utils/LRUCache';
import type { YearData, PhotoInput, FavoriteStoreItem, SeasonStats, PhotoRecord } from '../types';
import { getBuildNumber, withBuild } from '../utils/build';

// Module-level cache — persists for the lifetime of the page session with LRU eviction (max 6 seasons).
// Pre-fetched and actively-fetched year data is stored here so that
// switching back to an already-seen year is instant (no network round-trip).
interface CachedYearPayload {
    events: YearData;
    recapCount: number;
    recapEvents: { eventName: string; photoIndex: number }[];
    recapHash?: string;
    nextPart: string | null;
    stats?: SeasonStats;
}
const yearDataCache = new LRUCache<string, CachedYearPayload>(6);

const getCacheKey = (tabSlug: string, isGear: boolean, isTeam: boolean): string =>
    isGear ? `gear:${tabSlug}` : isTeam ? `team:${tabSlug}` : `year:${tabSlug}`;

interface FetchPayload {
    events: YearData;
    recapCount?: number;
    recapEvents?: { eventName: string; photoIndex: number }[];
    recapHash?: string;
    nextPart?: string | null;
    stats?: SeasonStats;
}

const inFlightYearFetches = new Map<string, Promise<FetchPayload>>();

function fetchChunkWithDedup(basePath: string, slug: string): Promise<FetchPayload> {
    const key = `${basePath}/${slug}`;
    const existing = inFlightYearFetches.get(key);
    if (existing) return existing;

    const url = `${basePath}/${slug}.json?build=${getBuildNumber()}`;
    const warmMap =
        typeof window !== 'undefined'
            ? (window as Window & { __WARM_JSON__?: Record<string, Promise<unknown> | undefined> }).__WARM_JSON__
            : undefined;
    const warmEntry = warmMap?.[url];
    let rawPromise: Promise<unknown>;
    if (warmMap && warmEntry !== undefined) {
        rawPromise = warmEntry;
        delete warmMap[url];
    } else {
        rawPromise = fetch(url).then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        });
    }

    const promise = rawPromise
        .then((raw) => decodeEventChunk(raw as Parameters<typeof decodeEventChunk>[0]) as FetchPayload)
        .finally(() => {
            inFlightYearFetches.delete(key);
        });

    inFlightYearFetches.set(key, promise);
    return promise;
}

/** Internal helper for testing to reset the module-level year cache */
export function _clearYearDataCache(): void {
    yearDataCache.clear();
    inFlightYearFetches.clear();
}

/**
 * Starts fetching the initial route's year JSON, album JSON, and target display image
 * in parallel with lazy route component chunks to eliminate multi-hop waterfalls.
 */
export function warmRouteData(years: string[]): Promise<void> {
    if (typeof window === 'undefined' || years.length === 0) return Promise.resolve();
    const segments = window.location.pathname.split('/').filter(Boolean);
    let targetYear = years[0];
    let eventSlug: string | undefined;
    let photoIdx: number | undefined;

    if (segments[0] === 'portfolio') {
        if (segments[1] === 'team' && segments[2]) {
            const slug = decodeURIComponent(segments[2]);
            const cacheKey = getCacheKey(slug, false, true);
            if (!yearDataCache.has(cacheKey)) {
                return fetchChunkWithDedup('/data/teams', slug)
                    .then((data) => {
                        if (!yearDataCache.has(cacheKey)) {
                            yearDataCache.set(cacheKey, {
                                events: data.events,
                                recapCount: data.recapCount || 0,
                                recapEvents: data.recapEvents || [],
                                recapHash: data.recapHash,
                                nextPart: data.nextPart ?? null,
                                stats: data.stats,
                            });
                        }
                    })
                    .catch(() => {});
            }
            return Promise.resolve();
        }
        if (segments[1] === 'gear' && segments[2]) {
            const slug = decodeURIComponent(segments[2]);
            const cacheKey = getCacheKey(slug, true, false);
            if (!yearDataCache.has(cacheKey)) {
                return fetchChunkWithDedup('/data/gear', slug)
                    .then((data) => {
                        if (!yearDataCache.has(cacheKey)) {
                            yearDataCache.set(cacheKey, {
                                events: data.events,
                                recapCount: data.recapCount || 0,
                                recapEvents: data.recapEvents || [],
                                recapHash: data.recapHash,
                                nextPart: data.nextPart ?? null,
                                stats: data.stats,
                            });
                        }
                    })
                    .catch(() => {});
            }
            return Promise.resolve();
        }
        if (segments[1] === 'favorites') return Promise.resolve();
        if (segments[1] && years.includes(segments[1])) {
            targetYear = segments[1];
        }
        if (segments[2]) {
            eventSlug = decodeURIComponent(segments[2]);
        }
        if (segments[3] !== undefined) {
            const parsed = parseInt(segments[3], 10);
            if (!isNaN(parsed)) photoIdx = parsed;
        }
    }

    const cacheKey = getCacheKey(targetYear, false, false);
    const yearPromise = yearDataCache.has(cacheKey)
        ? Promise.resolve(yearDataCache.get(cacheKey)!)
        : fetchChunkWithDedup('/data/years', targetYear).then((data) => {
              const payload: CachedYearPayload = {
                  events: data.events,
                  recapCount: data.recapCount || 0,
                  recapEvents: data.recapEvents || [],
                  recapHash: data.recapHash,
                  nextPart: data.nextPart ?? null,
                  stats: data.stats,
              };
              if (!yearDataCache.has(cacheKey)) {
                  yearDataCache.set(cacheKey, payload);
              }
              return payload;
          });

    const albumPromise =
        eventSlug && /^[a-z0-9-]+$/.test(eventSlug)
            ? fetchAlbum(targetYear, eventSlug).then((album) => {
                  if (
                      photoIdx !== undefined &&
                      album.length > 0 &&
                      !document.querySelector('link[rel="preload"][as="image"]')
                  ) {
                      const safeIdx = Math.max(0, Math.min(album.length - 1, photoIdx));
                      const photo = album[safeIdx];
                      const initialSrc =
                          photo?.thumb && photo.thumb.endsWith('.avif')
                              ? photo.thumb
                              : photo?.original
                                ? getPhotoDisplayUrl(photo.original)
                                : '';
                      if (initialSrc) {
                          const img = new Image();
                          if ('fetchPriority' in img) {
                              img.fetchPriority = 'high';
                          }
                          img.decoding = 'async';
                          img.src = withBuild(initialSrc);
                      }
                  }
                  return album;
              })
            : Promise.resolve(null);

    return Promise.all([yearPromise, albumPromise])
        .then(([yearPayload, album]) => {
            if (photoIdx !== undefined && eventSlug && yearPayload?.events && album && album.length > 0) {
                const matched = Object.entries(yearPayload.events).find(
                    ([name, ev]) => name === eventSlug || ev.albumSlug === eventSlug
                );
                if (matched) {
                    const [matchedName, ev] = matched;
                    const safeIdx = Math.max(0, Math.min(album.length - 1, photoIdx));
                    const scorePayload =
                        ev.localScore ||
                        (ev.wftdaMatch
                            ? { team1Score: ev.wftdaMatch.score1, team2Score: ev.wftdaMatch.score2 }
                            : undefined);
                    const state = useAppStore.getState();
                    if (!state.lightbox.isOpen) {
                        state.openLightbox(
                            album,
                            safeIdx,
                            matchedName,
                            targetYear,
                            ev.maxExifChars,
                            scorePayload,
                            ev.scrubberHash
                        );
                        state.setSharedPhoto(null);
                    }
                }
            }
        })
        .catch(() => {});
}

let requestIdCounter = 0;

interface UsePortfolioDataOptions {
    selectedTab: string;
    years: string[];
    onDataLoadAction?: () => void;
    isGearMode?: boolean;
}

export function usePortfolioData({
    selectedTab,
    years,
    onDataLoadAction,
    isGearMode = false,
}: UsePortfolioDataOptions) {
    const initialIsTeam = Boolean(selectedTab && selectedTab !== 'favorites' && !years.includes(selectedTab) && !isGearMode);
    const initialCached =
        selectedTab && selectedTab !== 'favorites'
            ? yearDataCache.get(getCacheKey(selectedTab, isGearMode, initialIsTeam))
            : undefined;

    const [yearData, setYearData] = useState<YearData>(() => initialCached?.events ?? {});
    const [recapCount, setRecapCount] = useState<number>(() => initialCached?.recapCount ?? 0);
    const [recapEvents, setRecapEvents] = useState<{ eventName: string; photoIndex: number }[]>(
        () => initialCached?.recapEvents ?? []
    );
    const [recapHash, setRecapHash] = useState<string | undefined>(() => initialCached?.recapHash);
    const [stats, setStats] = useState<SeasonStats | undefined>(() => initialCached?.stats);

    // Performance locking mechanism to pause background loading while Recap loads
    const [isRecapLoaded, setIsRecapLoaded] = useState(true);
    const [pendingNextPart, setPendingNextPart] = useState<string | null>(() => initialCached?.nextPart ?? null);

    const activeRequestRef = useRef<number>(0);

    const favorites = useAppStore((state) => state.favorites);
    const isLightboxOpen = useAppStore((state) => state.lightbox.isOpen);
    const sharedPhoto = useAppStore((state) => state.sharedPhoto);

    // Freeze favorites snapshot when lightbox is open so background list doesn't shift
    const [prevIsLightboxOpen, setPrevIsLightboxOpen] = useState(isLightboxOpen);
    const [frozenFavorites, setFrozenFavorites] = useState(favorites);

    if (isLightboxOpen !== prevIsLightboxOpen) {
        setPrevIsLightboxOpen(isLightboxOpen);
        if (isLightboxOpen) {
            setFrozenFavorites(favorites);
        }
    }

    const displayFavorites = isLightboxOpen ? frozenFavorites : favorites;

    const isFavoritesTab = selectedTab === 'favorites';
    const [albumEnrichVersion, setAlbumEnrichVersion] = useState(0);
    const [yearDataEnrichVersion, setYearDataEnrichVersion] = useState(0);

    // Fetch uncached albums for EXIF enrichment
    useEffect(() => {
        if (!isFavoritesTab || displayFavorites.length === 0) return;
        const albumsToFetch = new Set<string>();

        for (const item of displayFavorites) {
            const record = toPhotoRecord(item);
            if (!record.exif && record.original) {
                const match = record.original.match(/\/photos\/(\d{4})\/([^/]+)\//);
                if (match) {
                    const year = match[1];
                    const slug = match[2];
                    if (!getCachedAlbum(year, slug)) {
                        albumsToFetch.add(`${year}/${slug}`);
                    }
                }
            }
        }

        if (albumsToFetch.size === 0) return;
        let isCancelled = false;

        Promise.allSettled(
            Array.from(albumsToFetch).map((key) => {
                const [year, slug] = key.split('/');
                return fetchAlbum(year, slug);
            })
        ).then(() => {
            if (!isCancelled) {
                setAlbumEnrichVersion((v) => v + 1);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [isFavoritesTab, displayFavorites]);

    // Ensure year data is loaded for any years present in favorites so events have complete metadata (scores, zip, etc.)
    useEffect(() => {
        if (!isFavoritesTab || displayFavorites.length === 0) return;
        const yearsToFetch = new Set<string>();

        for (const item of displayFavorites) {
            const record = toPhotoRecord(item);
            let year =
                record.year ||
                (typeof item === 'object' && item && 'year' in item ? (item.year as string) : undefined);
            if (!year && record.original) {
                const match = record.original.match(/\/photos\/(\d{4})\//);
                if (match) year = match[1];
            }
            if (year && years.includes(year)) {
                const cached = yearDataCache.get(`year:${year}`);
                if (!cached || cached.nextPart) {
                    yearsToFetch.add(year);
                }
            }
        }

        if (yearsToFetch.size === 0) return;
        let isCancelled = false;

        const fetchCompleteYear = async (y: string) => {
            const cacheKey = `year:${y}`;
            const existing = yearDataCache.get(cacheKey);
            const accumulatedEvents: YearData = existing ? { ...existing.events } : {};
            let firstPayload: FetchPayload | null = existing
                ? {
                      events: existing.events,
                      recapCount: existing.recapCount,
                      recapEvents: existing.recapEvents,
                      recapHash: existing.recapHash,
                      nextPart: existing.nextPart,
                      stats: existing.stats,
                  }
                : null;
            let currentPart: string | null = existing ? existing.nextPart : y;

            while (currentPart && !isCancelled) {
                const res = await fetch(`/data/years/${currentPart}.json?build=${getBuildNumber()}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const payload = decodeEventChunk(json) as FetchPayload;
                if (!firstPayload) firstPayload = payload;
                Object.assign(accumulatedEvents, payload.events);
                currentPart = payload.nextPart ?? null;
            }

            if (firstPayload && !isCancelled) {
                yearDataCache.set(cacheKey, {
                    events: accumulatedEvents,
                    recapCount: firstPayload.recapCount || 0,
                    recapEvents: firstPayload.recapEvents || [],
                    recapHash: firstPayload.recapHash,
                    nextPart: null,
                    stats: firstPayload.stats,
                });
            }
        };

        Promise.allSettled(Array.from(yearsToFetch).map((y) => fetchCompleteYear(y))).then(() => {
            if (!isCancelled) {
                setYearDataEnrichVersion((v) => v + 1);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [isFavoritesTab, displayFavorites, years]);

    // Derive favorites yearData during render: always organized by event and year reverse-chronologically
    const favoritesYearData: YearData = useMemo((): YearData => {
        if (!isFavoritesTab) return {};
        void albumEnrichVersion;
        void yearDataEnrichVersion;

        const enrichPhotoRecordWithExif = (record: PhotoRecord): PhotoRecord => {
            if (record.exif || !record.original) return record;
            const match = record.original.match(/\/photos\/(\d{4})\/([^/]+)\//);
            if (match) {
                const cached = getCachedAlbum(match[1], match[2]);
                const found = cached?.find((p) => p.original === record.original);
                if (found?.exif) {
                    return {
                        ...record,
                        exif: found.exif,
                        width: record.width ?? found.width,
                        height: record.height ?? found.height,
                        burst: record.burst ?? found.burst,
                    };
                }
            }
            return record;
        };

        const getFavoriteEventInfo = (item: FavoriteStoreItem, record: PhotoRecord) => {
            let year =
                record.year ||
                (typeof item === 'object' && item && 'year' in item ? (item.year as string) : undefined);
            let eventName =
                record.eventName ||
                (typeof item === 'object' && item && 'eventName' in item
                    ? (item.eventName as string)
                    : undefined);

            let slugFromOriginal: string | undefined;
            if (record.original) {
                const match = record.original.match(/\/photos\/(\d{4})\/([^/]+)\//);
                if (match) {
                    if (!year) year = match[1];
                    slugFromOriginal = match[2];
                    if (!eventName || eventName === 'Favorites') {
                        eventName = match[2];
                    }
                }
            }

            if (year && slugFromOriginal) {
                const eventsInYear = yearDataCache.get(`year:${year}`)?.events;
                if (eventsInYear) {
                    const matched = Object.entries(eventsInYear).find(
                        ([, ev]) => ev.albumSlug === slugFromOriginal
                    );
                    if (matched) {
                        eventName = matched[0];
                    }
                }
            }

            if (eventName && (!year || year === 'favorites')) {
                const parsed = parseEventTitle(eventName, year);
                if (parsed.parsedYear) {
                    year = parsed.parsedYear;
                }
            }

            return {
                eventName: eventName || 'Other Favorites',
                year: year || 'Other',
                albumSlug: slugFromOriginal,
            };
        };

        interface EventGroup {
            eventName: string;
            year: string;
            photos: PhotoInput[];
            timestamp: number;
            albumSlug?: string;
        }

        const groupsMap = new Map<string, EventGroup>();

        for (const item of displayFavorites) {
            const record = enrichPhotoRecordWithExif(toPhotoRecord(item));
            const { eventName, year, albumSlug } = getFavoriteEventInfo(item, record);
            const key = `${year}___${eventName}`;

            let group = groupsMap.get(key);
            if (!group) {
                const { baseDatePrefix, parsedYear } = parseEventTitle(eventName, year);
                const effectiveYear = parsedYear || year || '2000';
                let timestamp = 0;
                if (baseDatePrefix) {
                    const [month, day] = baseDatePrefix.split('.');
                    const parsedMonth = parseInt(month, 10);
                    const parsedDay = parseInt(day, 10);
                    const numYear = parseInt(effectiveYear, 10);
                    if (!isNaN(parsedMonth) && !isNaN(parsedDay) && !isNaN(numYear)) {
                        timestamp = new Date(numYear, parsedMonth - 1, parsedDay).getTime();
                    }
                }
                if (!timestamp) {
                    const numYear = parseInt(effectiveYear, 10);
                    timestamp = isNaN(numYear) ? 0 : new Date(numYear, 0, 1).getTime();
                }

                group = {
                    eventName,
                    year: effectiveYear,
                    photos: [],
                    timestamp,
                    albumSlug,
                };
                groupsMap.set(key, group);
            }
            group.photos.push(record);
        }

        const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => b.timestamp - a.timestamp);

        const byEventData: YearData = {};
        for (const group of sortedGroups) {
            let key = group.eventName;
            if (byEventData[key]) {
                key = `${group.eventName} (${group.year})`;
            }
            const eventsInYear = yearDataCache.get(`year:${group.year}`)?.events;
            let cachedEvent = eventsInYear ? eventsInYear[group.eventName] : undefined;
            if (!cachedEvent && eventsInYear) {
                const cleanName = group.eventName.replace(/^\[\d{4}\]\s*/, '');
                cachedEvent = eventsInYear[cleanName] || eventsInYear[`[${group.year}] ${cleanName}`];
                if (!cachedEvent && group.albumSlug) {
                    const found = Object.values(eventsInYear).find((ev) => ev.albumSlug === group.albumSlug);
                    if (found) cachedEvent = found;
                }
            }

            const albumSlug = group.albumSlug || cachedEvent?.albumSlug;
            const zip = cachedEvent?.zip || (albumSlug ? `/photos/${group.year}/${albumSlug}.zip` : undefined);

            byEventData[key] = {
                album: group.photos,
                highlights: cachedEvent?.highlights || [],
                originalYear: group.year,
                date: cachedEvent?.date ?? null,
                localScore: cachedEvent?.localScore,
                wftdaMatch: cachedEvent?.wftdaMatch,
                description: cachedEvent?.description ?? null,
                maxExifChars: cachedEvent?.maxExifChars,
                photoCount: group.photos.length,
                albumSlug,
                zip,
            };
        }

        return byEventData;
    }, [isFavoritesTab, displayFavorites, albumEnrichVersion, yearDataEnrichVersion]);

    const prevTabRef = useRef(selectedTab);
    useEffect(() => {
        if (selectedTab === 'favorites' && prevTabRef.current !== 'favorites') {
            onDataLoadAction?.();
        }
        prevTabRef.current = selectedTab;
    }, [selectedTab, onDataLoadAction]);

    const getForTab = useCallback(
        (tabSlug: string, setData: boolean, isTeamMode: boolean) => {
            if (tabSlug === 'favorites') return;

            const basePath = isGearMode ? `/data/gear` : isTeamMode ? `/data/teams` : `/data/years`;
            const cacheKey = getCacheKey(tabSlug, isGearMode, isTeamMode);
            const requestToken = ++requestIdCounter;

            if (setData) {
                activeRequestRef.current = requestToken;
                setPendingNextPart(null);

                // Serve from cache instantly if available — no network needed.
                const cached = yearDataCache.get(cacheKey);
                if (cached) {
                    setYearData(cached.events);
                    setRecapCount(cached.recapCount);
                    setRecapEvents(cached.recapEvents);
                    setRecapHash(cached.recapHash);
                    setStats(cached.stats);
                    setIsRecapLoaded(true);
                    if (cached.nextPart) setPendingNextPart(cached.nextPart);
                    if (onDataLoadAction) onDataLoadAction();
                    return;
                }

                setIsRecapLoaded(false); // Lock background fetching
            }

            const fetchPart = (slug: string, accumulate: boolean, retryCount = 0) => {
                fetchChunkWithDedup(basePath, slug)
                    .then((data) => {
                        if (setData) {
                            if (activeRequestRef.current !== requestToken) return; // Tab switched, abort

                            setYearData((prev) => (accumulate ? { ...prev, ...data.events } : data.events));

                            if (!accumulate) {
                                setRecapCount(data.recapCount || 0);
                                setRecapEvents(data.recapEvents || []);
                                setRecapHash(data.recapHash);
                                setStats(data.stats);

                                // Store first-part result so future switches are instant.
                                yearDataCache.set(cacheKey, {
                                    events: data.events,
                                    recapCount: data.recapCount || 0,
                                    recapEvents: data.recapEvents || [],
                                    recapHash: data.recapHash,
                                    nextPart: data.nextPart ?? null,
                                    stats: data.stats,
                                });

                                // If there is no recap, unlock background fetching immediately
                                if ((data.recapCount || 0) === 0 || isTeamMode || isGearMode) {
                                    setIsRecapLoaded(true);
                                }

                                if (onDataLoadAction) {
                                    onDataLoadAction();
                                }
                            }

                            if (data.nextPart) {
                                setPendingNextPart(data.nextPart);
                            } else {
                                setPendingNextPart(null);
                            }
                        } else if (!accumulate) {
                            // Pre-fetch path: populate cache so the next foreground switch is instant.
                            if (!yearDataCache.has(cacheKey)) {
                                yearDataCache.set(cacheKey, {
                                    events: data.events,
                                    recapCount: data.recapCount || 0,
                                    recapEvents: data.recapEvents || [],
                                    recapHash: data.recapHash,
                                    nextPart: data.nextPart ?? null,
                                    stats: data.stats,
                                });
                            }
                        }
                    })
                    .catch((err) => {
                        console.error(`Failed to load data for ${slug}:`, err);
                        if (setData && retryCount < 1 && activeRequestRef.current === requestToken) {
                            setTimeout(() => {
                                if (activeRequestRef.current === requestToken) {
                                    fetchPart(slug, accumulate, retryCount + 1);
                                }
                            }, 1000);
                        } else if (setData) {
                            setIsRecapLoaded(true);
                        }
                    });
            };

            fetchPart(tabSlug, false);
        },
        [onDataLoadAction, isGearMode]
    );

    const [hasUserScrolled, setHasUserScrolled] = useState(
        () => typeof window !== 'undefined' && window.scrollY > 1800
    );
    const [prevScrolledTab, setPrevScrolledTab] = useState(selectedTab);
    if (selectedTab !== prevScrolledTab) {
        setPrevScrolledTab(selectedTab);
        setHasUserScrolled(typeof window !== 'undefined' && window.scrollY > 1800);
    }

    useEffect(() => {
        if (!pendingNextPart || hasUserScrolled || typeof window === 'undefined') return;

        const markScrolled = () => setHasUserScrolled(true);
        const onScroll = () => {
            if (window.scrollY > 1800) {
                setHasUserScrolled(true);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (['ArrowDown', 'PageDown', 'End', ' '].includes(e.key)) {
                setHasUserScrolled(true);
            }
        };

        window.addEventListener('wheel', markScrolled, { passive: true, once: true });
        window.addEventListener('touchmove', markScrolled, { passive: true, once: true });
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('keydown', onKeyDown, { passive: true });

        return () => {
            window.removeEventListener('wheel', markScrolled);
            window.removeEventListener('touchmove', markScrolled);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [pendingNextPart, hasUserScrolled]);

    const needsPartForSharedEvent = useMemo(() => {
        if (!sharedPhoto?.eventName) return false;
        const entries = Object.entries(yearData);
        if (entries.length === 0) return false;
        return !entries.some(
            ([name, ev]) => name === sharedPhoto.eventName || ev.albumSlug === sharedPhoto.eventName
        );
    }, [sharedPhoto, yearData]);

    // Handle trickling next parts when user scrolls or when searching for a deep-linked event
    useEffect(() => {
        if (!pendingNextPart || !selectedTab || (!hasUserScrolled && !needsPartForSharedEvent)) return;
        if (!needsPartForSharedEvent && (!isRecapLoaded || isLightboxOpen)) return;

        const isTeamMode = !years.includes(selectedTab) && !isGearMode;
        const basePath = isGearMode ? `/data/gear` : isTeamMode ? `/data/teams` : `/data/years`;
        const cacheKey = getCacheKey(selectedTab, isGearMode, isTeamMode);
        const requestToken = activeRequestRef.current;
        const targetPart = pendingNextPart;

        const timer = setTimeout(() => {
            fetchChunkWithDedup(basePath, targetPart)
                .then((data) => {
                    if (activeRequestRef.current !== requestToken) return;

                    const existing = yearDataCache.get(cacheKey);
                    if (existing) {
                        existing.events = { ...existing.events, ...data.events };
                        existing.nextPart = data.nextPart ?? null;
                        yearDataCache.set(cacheKey, existing);
                    }

                    setYearData((prev) => ({ ...prev, ...data.events }));

                    if (data.nextPart) {
                        setPendingNextPart(data.nextPart);
                    } else {
                        setPendingNextPart(null);
                    }
                })
                .catch((err) => console.error(`Failed to load trickle data for ${targetPart}:`, err));
        }, needsPartForSharedEvent ? 50 : 200);

        return () => clearTimeout(timer);
    }, [
        pendingNextPart,
        isRecapLoaded,
        selectedTab,
        years,
        isGearMode,
        hasUserScrolled,
        needsPartForSharedEvent,
        isLightboxOpen,
    ]);

    // Initial load for active tab
    useEffect(() => {
        if (!selectedTab) return;
        const isTeamMode = !years.includes(selectedTab) && !isGearMode;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        getForTab(selectedTab, true, isTeamMode);
    }, [selectedTab, years, getForTab, isGearMode]);

    const prefetchTab = useCallback(
        (tabSlug: string) => {
            if (!tabSlug || tabSlug === 'favorites') return;
            const isTeamMode = !years.includes(tabSlug) && !isGearMode;
            const cacheKey = getCacheKey(tabSlug, isGearMode, isTeamMode);
            if (yearDataCache.has(cacheKey)) return;
            getForTab(tabSlug, false, isTeamMode);
        },
        [getForTab, years, isGearMode]
    );

    // Gently pre-fetch the chronologically older season (years[currentIdx + 1]) after 10s of idle time
    useEffect(() => {
        if (!isRecapLoaded || isLightboxOpen || isGearMode || years.length < 2) return;
        const currentIdx = years.indexOf(selectedTab);
        const nextYearToWarm = currentIdx >= 0 && currentIdx + 1 < years.length ? years[currentIdx + 1] : null;
        if (!nextYearToWarm) return;

        const timer = setTimeout(() => {
            prefetchTab(nextYearToWarm);
        }, 10000);

        return () => clearTimeout(timer);
    }, [selectedTab, years, isRecapLoaded, isLightboxOpen, isGearMode, prefetchTab]);

    return {
        yearData: isFavoritesTab ? favoritesYearData : yearData,
        recapCount: isFavoritesTab ? 0 : recapCount,
        recapEvents: isFavoritesTab ? [] : recapEvents,
        recapHash: isFavoritesTab ? undefined : recapHash,
        stats: isFavoritesTab ? undefined : stats,
        setIsRecapLoaded,
        prefetchTab,
    };
}
