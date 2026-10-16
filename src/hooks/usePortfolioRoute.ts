import { useState, useEffect, useMemo, useRef } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

interface UsePortfolioRouteOptions {
    years: string[];
}

export interface PortfolioRouteState {
    selectedTab: string;
    isGearRoute: boolean;
    isTeamRoute: boolean;
    isFindRoute: boolean;
    findTeamSlug: string | undefined;
    activeRouteSlug: string | undefined;
    initialSearchOpen: boolean;
    initialSearchQuery: string;
    initialYear: string | undefined | null;
    initialEvent: string | undefined | null;
    initialPhoto: string | undefined | null;
    params: URLSearchParams;
}

export function usePortfolioRoute({ years }: UsePortfolioRouteOptions): PortfolioRouteState {
    const location = useLocation();
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const initialSearchOpen = params.get('search') === 'true' || !!params.get('q');
    const initialSearchQuery = params.get('q') || '';

    // Cache the most recent /portfolio path in state using React render adjustment
    const [lastPortfolioPath, setLastPortfolioPath] = useState(
        location.pathname.startsWith('/portfolio') ? location.pathname : '/portfolio'
    );
    const [prevPathname, setPrevPathname] = useState(location.pathname);

    if (location.pathname !== prevPathname) {
        setPrevPathname(location.pathname);
        if (location.pathname.startsWith('/portfolio')) {
            setLastPortfolioPath(location.pathname);
        }
    }

    const matchPathStr = location.pathname.startsWith('/portfolio') ? location.pathname : lastPortfolioPath;

    const findRootMatch = matchPath('/portfolio/find', matchPathStr);
    const findTeamMatch = matchPath('/portfolio/find/:slug', matchPathStr);
    const isFindRoute = Boolean(findRootMatch || findTeamMatch);
    const findTeamSlug = findTeamMatch?.params.slug;

    const yearMatch = !isFindRoute ? matchPath('/portfolio/:year', matchPathStr) : null;
    const teamMatch = !isFindRoute ? matchPath('/portfolio/team/:slug', matchPathStr) : null;
    const gearMatch = !isFindRoute ? matchPath('/portfolio/gear/:slug', matchPathStr) : null;
    // Deep link: /portfolio/:year/:event/:photo
    const deepLinkMatch = !isFindRoute ? matchPath('/portfolio/:year/:event/:photo', matchPathStr) : null;
    // Event-only deep link: /portfolio/:year/:event (no photo index)
    const eventDeepMatch = !isFindRoute && !deepLinkMatch ? matchPath('/portfolio/:year/:event', matchPathStr) : null;

    const isGearRoute = Boolean(gearMatch);
    const isTeamRoute = !isGearRoute && Boolean(teamMatch);
    const activeRouteSlug =
        (isFindRoute ? 'find' : undefined) ||
        gearMatch?.params.slug ||
        teamMatch?.params.slug ||
        deepLinkMatch?.params.year ||
        eventDeepMatch?.params.year ||
        yearMatch?.params.year;

    const initialYear = activeRouteSlug || params.get('year');
    const initialEvent = deepLinkMatch?.params.event || eventDeepMatch?.params.event || params.get('event');
    const initialPhoto = deepLinkMatch?.params.photo || params.get('photo');

    const selectedTab = useMemo(() => {
        if (isFindRoute) return years[0] || '';
        if (isGearRoute && activeRouteSlug) return activeRouteSlug;
        if (isTeamRoute && activeRouteSlug) return activeRouteSlug;
        if (activeRouteSlug === 'favorites') return 'favorites';
        if (activeRouteSlug && years.includes(activeRouteSlug)) return activeRouteSlug;
        return initialYear && years.includes(initialYear) ? initialYear : years[0] || '';
    }, [isFindRoute, isGearRoute, isTeamRoute, activeRouteSlug, years, initialYear]);

    const setSharedPhoto = useAppStore((state) => state.setSharedPhoto);
    const isEventOnlyDeepLink = Boolean(eventDeepMatch && !initialPhoto);
    const hasValidDeepLink = Boolean(
        !isFindRoute && initialYear && initialEvent && (years.includes(initialYear) || isTeamRoute || isGearRoute)
    );
    const hydratedDeepLinkKeyRef = useRef<string | null>(null);

    // Deep link photo hydration
    useEffect(() => {
        if (hasValidDeepLink && initialEvent) {
            const deepLinkKey = `${initialYear ?? ''}/${initialEvent}/${initialPhoto ?? ''}/${isEventOnlyDeepLink}`;
            if (hydratedDeepLinkKeyRef.current === deepLinkKey) return;
            const rawIndex = initialPhoto ? parseInt(initialPhoto, 10) : undefined;
            const index = rawIndex !== undefined && !isNaN(rawIndex) ? rawIndex : undefined;
            let decodedEvent = initialEvent;
            try {
                decodedEvent = decodeURIComponent(initialEvent);
            } catch {
                // Keep raw string if URI decoding fails
            }
            hydratedDeepLinkKeyRef.current = deepLinkKey;
            const state = useAppStore.getState();
            if (index !== undefined && state.lightbox.isOpen) {
                return;
            }
            const current = state.sharedPhoto;
            if (
                current?.eventName === decodedEvent &&
                current?.photoIndex === index &&
                Boolean(current?.openAlbumGrid) === isEventOnlyDeepLink
            ) {
                return;
            }
            setSharedPhoto(
                isEventOnlyDeepLink
                    ? { eventName: decodedEvent, photoIndex: index, openAlbumGrid: true }
                    : { eventName: decodedEvent, photoIndex: index }
            );
        } else if (hydratedDeepLinkKeyRef.current !== null) {
            hydratedDeepLinkKeyRef.current = null;
            setSharedPhoto(null);
        }
    }, [hasValidDeepLink, initialYear, initialEvent, initialPhoto, isEventOnlyDeepLink, setSharedPhoto]);

    return {
        selectedTab,
        isGearRoute,
        isTeamRoute,
        isFindRoute,
        findTeamSlug,
        activeRouteSlug,
        initialSearchOpen,
        initialSearchQuery,
        initialYear,
        initialEvent,
        initialPhoto,
        params,
    };
}
