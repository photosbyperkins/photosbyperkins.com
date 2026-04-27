import { useState, useRef, useCallback, useEffect } from 'react';
import type { YearData, PhotoInput, FavoriteStoreItem } from '../types';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { parseEventTitle } from '../utils/formatters';

interface FetchPayload {
    events: YearData;
    recapCount?: number;
    recapEvents?: { eventName: string; photoIndex: number }[];
    nextPart?: string | null;
}

declare const __BUILD_NUMBER__: string;

interface UsePortfolioDataOptions {
    selectedTab: string;
    years: string[];
    onDataLoadAction?: () => void;
}

export function usePortfolioData({ selectedTab, years, onDataLoadAction }: UsePortfolioDataOptions) {
    const [yearData, setYearData] = useState<YearData>({});
    const [recapCount, setRecapCount] = useState<number>(0);
    const [recapEvents, setRecapEvents] = useState<{ eventName: string; photoIndex: number }[]>([]);

    // Performance locking mechanism to pause background loading while Recap loads
    const [isRecapLoaded, setIsRecapLoaded] = useState(true);
    const [pendingNextPart, setPendingNextPart] = useState<string | null>(null);

    const activeRequestRef = useRef<number>(0);

    const favorites = usePortfolioStore((state) => state.favorites);
    const isLightboxOpen = usePortfolioStore((state) => state.lightbox.isOpen);
    const [displayFavorites, setDisplayFavorites] = useState(favorites);

    useEffect(() => {
        if (!isLightboxOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDisplayFavorites(favorites);
        }
    }, [favorites, isLightboxOpen]);

    useEffect(() => {
        if (selectedTab === 'favorites') {
            const sortedFavorites = [...displayFavorites].sort((a: FavoriteStoreItem, b: FavoriteStoreItem) => {
                const getTimestamp = (item: FavoriteStoreItem) => {
                    if (!item || typeof item !== 'object' || !('eventName' in item)) return 0;
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

            setYearData({
                Favorites: {
                    album: sortedFavorites as unknown as PhotoInput[],
                    highlights: [],
                    date: null,
                },
            });
            setRecapCount(0);
            setRecapEvents([]);
            setIsRecapLoaded(true);
        }
    }, [selectedTab, displayFavorites]);

    const getForTab = useCallback(
        async (tabSlug: string, setData: boolean, isTeamMode: boolean) => {
            if (tabSlug === 'favorites') return;

            const basePath = isTeamMode ? `/data/teams` : `/data/years`;
            const requestToken = Date.now();

            if (setData) {
                activeRequestRef.current = requestToken;
                setPendingNextPart(null);
                setIsRecapLoaded(false); // Lock background fetching
            }

            const fetchPart = (slug: string, accumulate: boolean) => {
                fetch(`${basePath}/${slug}.json?build=${__BUILD_NUMBER__}`)
                    .then((res) => res.json())
                    .then((json) => {
                        const data = json as FetchPayload;
                        if (setData) {
                            if (activeRequestRef.current !== requestToken) return; // Tab switched, abort

                            setYearData((prev) => (accumulate ? { ...prev, ...data.events } : data.events));

                            if (!accumulate) {
                                setRecapCount(data.recapCount || 0);
                                setRecapEvents(data.recapEvents || []);

                                // If there is no recap, unlock background fetching immediately
                                if ((data.recapCount || 0) === 0 || isTeamMode) {
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
                        }
                    })
                    .catch((err) => console.error(`Failed to load data for ${slug}:`, err));
            };

            fetchPart(tabSlug, false);
        },
        [onDataLoadAction]
    );

    // Handle trickling next parts only when Recap allows it
    useEffect(() => {
        if (!pendingNextPart || !isRecapLoaded || !selectedTab) return;

        const isTeamMode = !years.includes(selectedTab);
        const basePath = isTeamMode ? `/data/teams` : `/data/years`;
        const requestToken = activeRequestRef.current;
        const targetPart = pendingNextPart;

        const timer = setTimeout(() => {
            fetch(`${basePath}/${targetPart}.json?build=${__BUILD_NUMBER__}`)
                .then((res) => res.json())
                .then((json) => {
                    const data = json as FetchPayload;
                    if (activeRequestRef.current !== requestToken) return;

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
    }, [pendingNextPart, isRecapLoaded, selectedTab, years]);

    // Initial load for active tab
    useEffect(() => {
        if (!selectedTab) return;
        const isTeamMode = !years.includes(selectedTab);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        getForTab(selectedTab, true, isTeamMode);
    }, [selectedTab, years, getForTab]);

    // Pre-fetch other years, paused until Recap finishes
    useEffect(() => {
        if (!isRecapLoaded) return;
        years.forEach((year, i) => {
            if (i > 0) getForTab(year, false, false);
        });
    }, [years, getForTab, isRecapLoaded]);

    return {
        yearData,
        recapCount,
        recapEvents,
        setIsRecapLoaded,
    };
}
