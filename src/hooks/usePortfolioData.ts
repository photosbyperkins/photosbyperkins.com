import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { parseEventTitle, toPhotoRecord } from '../utils/formatters';
import { fetchAlbum, getCachedAlbum } from '../utils/albumData';
import { LRUCache } from '../utils/LRUCache';
import type { YearData, PhotoInput, FavoriteStoreItem, SeasonStats, PhotoRecord } from '../types';

// Module-level cache — persists for the lifetime of the page session with LRU eviction (max 6 seasons).
// Pre-fetched and actively-fetched year data is stored here so that
// switching back to an already-seen year is instant (no network round-trip).
interface CachedYearPayload {
    events: YearData;
    recapCount: number;
    recapEvents: { eventName: string; photoIndex: number }[];
    nextPart: string | null;
    stats?: SeasonStats;
}
const yearDataCache = new LRUCache<string, CachedYearPayload>(6);

/** Internal helper for testing to reset the module-level year cache */
export function _clearYearDataCache(): void {
    yearDataCache.clear();
}

interface FetchPayload {
    events: YearData;
    recapCount?: number;
    recapEvents?: { eventName: string; photoIndex: number }[];
    nextPart?: string | null;
    stats?: SeasonStats;
}

import { getBuildNumber } from '../utils/build';

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
    const [yearData, setYearData] = useState<YearData>({});
    const [recapCount, setRecapCount] = useState<number>(0);
    const [recapEvents, setRecapEvents] = useState<{ eventName: string; photoIndex: number }[]>([]);
    const [stats, setStats] = useState<SeasonStats | undefined>();

    // Performance locking mechanism to pause background loading while Recap loads
    const [isRecapLoaded, setIsRecapLoaded] = useState(true);
    const [pendingNextPart, setPendingNextPart] = useState<string | null>(null);

    const activeRequestRef = useRef<number>(0);

    const favorites = useAppStore((state) => state.favorites);
    const isLightboxOpen = useAppStore((state) => state.lightbox.isOpen);

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

    // Derive favorites yearData during render instead of cascading useEffect setState
    const favoritesYearData: YearData = useMemo((): YearData => {
        if (!isFavoritesTab) return {};
        void albumEnrichVersion;
        const sorted = [...displayFavorites].sort((a: FavoriteStoreItem, b: FavoriteStoreItem) => {
            const getTimestamp = (item: FavoriteStoreItem) => {
                if (!item || typeof item !== 'object' || !('eventName' in item) || !item.eventName) return 0;
                const { baseDatePrefix, parsedYear } = parseEventTitle(item.eventName, item.year);
                const year = parsedYear || item.year || '2000';
                if (baseDatePrefix) {
                    const [month, day] = baseDatePrefix.split('.');
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
                }
                return new Date(parseInt(year), 0, 1).getTime();
            };
            return getTimestamp(b) - getTimestamp(a);
        });

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

        const enrichedAlbum: PhotoInput[] = sorted.map((item) => enrichPhotoRecordWithExif(toPhotoRecord(item)));

        return {
            Favorites: {
                album: enrichedAlbum,
                highlights: [],
                date: null,
            },
        };
    }, [isFavoritesTab, displayFavorites, albumEnrichVersion]);

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
            const requestToken = ++requestIdCounter;

            if (setData) {
                activeRequestRef.current = requestToken;
                setPendingNextPart(null);

                // Serve from cache instantly if available — no network needed.
                const cached = yearDataCache.get(tabSlug);
                if (cached) {
                    setYearData(cached.events);
                    setRecapCount(cached.recapCount);
                    setRecapEvents(cached.recapEvents);
                    setStats(cached.stats);
                    setIsRecapLoaded(true);
                    if (cached.nextPart) setPendingNextPart(cached.nextPart);
                    if (onDataLoadAction) onDataLoadAction();
                    return;
                }

                setIsRecapLoaded(false); // Lock background fetching
            }

            const fetchPart = (slug: string, accumulate: boolean, retryCount = 0) => {
                fetch(`${basePath}/${slug}.json?build=${getBuildNumber()}`)
                    .then((res) => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.json();
                    })
                    .then((json) => {
                        const data = json as FetchPayload;
                        if (setData) {
                            if (activeRequestRef.current !== requestToken) return; // Tab switched, abort

                            setYearData((prev) => (accumulate ? { ...prev, ...data.events } : data.events));

                            if (!accumulate) {
                                setRecapCount(data.recapCount || 0);
                                setRecapEvents(data.recapEvents || []);
                                setStats(data.stats);

                                // Store first-part result so future switches are instant.
                                yearDataCache.set(tabSlug, {
                                    events: data.events,
                                    recapCount: data.recapCount || 0,
                                    recapEvents: data.recapEvents || [],
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
                            if (!yearDataCache.has(tabSlug)) {
                                yearDataCache.set(tabSlug, {
                                    events: data.events,
                                    recapCount: data.recapCount || 0,
                                    recapEvents: data.recapEvents || [],
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

    // Handle trickling next parts only when Recap allows it
    useEffect(() => {
        if (!pendingNextPart || !isRecapLoaded || !selectedTab) return;

        const isTeamMode = !years.includes(selectedTab) && !isGearMode;
        const basePath = isGearMode ? `/data/gear` : isTeamMode ? `/data/teams` : `/data/years`;
        const requestToken = activeRequestRef.current;
        const targetPart = pendingNextPart;

        const timer = setTimeout(() => {
            fetch(`${basePath}/${targetPart}.json?build=${getBuildNumber()}`)
                .then((res) => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
                .then((json) => {
                    const data = json as FetchPayload;
                    if (activeRequestRef.current !== requestToken) return;

                    const existing = yearDataCache.get(selectedTab);
                    if (existing) {
                        existing.events = { ...existing.events, ...data.events };
                        existing.nextPart = data.nextPart ?? null;
                        yearDataCache.set(selectedTab, existing);
                    }

                    setYearData((prev) => ({ ...prev, ...data.events }));

                    if (data.nextPart) {
                        setPendingNextPart(data.nextPart);
                    } else {
                        setPendingNextPart(null);
                    }
                })
                .catch((err) => console.error(`Failed to load trickle data for ${targetPart}:`, err));
        }, 300);

        return () => clearTimeout(timer);
    }, [pendingNextPart, isRecapLoaded, selectedTab, years, isGearMode]);

    // Initial load for active tab
    useEffect(() => {
        if (!selectedTab) return;
        const isTeamMode = !years.includes(selectedTab) && !isGearMode;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        getForTab(selectedTab, true, isTeamMode);
    }, [selectedTab, years, getForTab, isGearMode]);

    const prefetchTab = useCallback(
        (tabSlug: string) => {
            if (!tabSlug || tabSlug === 'favorites' || yearDataCache.has(tabSlug)) return;
            const isTeamMode = !years.includes(tabSlug) && !isGearMode;
            getForTab(tabSlug, false, isTeamMode);
        },
        [getForTab, years, isGearMode]
    );

    // Gently pre-fetch the chronologically older season (years[currentIdx + 1]) after 3s of idle time
    useEffect(() => {
        if (!isRecapLoaded || isGearMode || years.length < 2) return;
        const currentIdx = years.indexOf(selectedTab);
        const nextYearToWarm = currentIdx >= 0 && currentIdx + 1 < years.length ? years[currentIdx + 1] : null;
        if (!nextYearToWarm) return;

        const timer = setTimeout(() => {
            prefetchTab(nextYearToWarm);
        }, 3000);

        return () => clearTimeout(timer);
    }, [selectedTab, years, isRecapLoaded, isGearMode, prefetchTab]);

    return {
        yearData: isFavoritesTab ? favoritesYearData : yearData,
        recapCount: isFavoritesTab ? 0 : recapCount,
        recapEvents: isFavoritesTab ? [] : recapEvents,
        stats: isFavoritesTab ? undefined : stats,
        setIsRecapLoaded,
        prefetchTab,
    };
}
