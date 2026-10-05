import { useState, useEffect, useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

interface UsePortfolioRouteOptions {
    years: string[];
}

export interface PortfolioRouteState {
    selectedTab: string;
    isGearRoute: boolean;
    isTeamRoute: boolean;
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

    const yearMatch = matchPath('/portfolio/:year', matchPathStr);
    const teamMatch = matchPath('/portfolio/team/:slug', matchPathStr);
    const gearMatch = matchPath('/portfolio/gear/:slug', matchPathStr);
    // Deep link: /portfolio/:year/:event/:photo
    const deepLinkMatch = matchPath('/portfolio/:year/:event/:photo', matchPathStr);
    // Event-only deep link: /portfolio/:year/:event (no photo index)
    const eventDeepMatch = !deepLinkMatch ? matchPath('/portfolio/:year/:event', matchPathStr) : null;

    const isGearRoute = Boolean(gearMatch);
    const isTeamRoute = !isGearRoute && Boolean(teamMatch);
    const activeRouteSlug =
        gearMatch?.params.slug ||
        teamMatch?.params.slug ||
        deepLinkMatch?.params.year ||
        eventDeepMatch?.params.year ||
        yearMatch?.params.year;

    const initialYear = activeRouteSlug || params.get('year');
    const initialEvent = deepLinkMatch?.params.event || eventDeepMatch?.params.event || params.get('event');
    const initialPhoto = deepLinkMatch?.params.photo || params.get('photo');

    const selectedTab = useMemo(() => {
        if (isGearRoute && activeRouteSlug) return activeRouteSlug;
        if (isTeamRoute && activeRouteSlug) return activeRouteSlug;
        if (activeRouteSlug === 'favorites') return 'favorites';
        if (activeRouteSlug && years.includes(activeRouteSlug)) return activeRouteSlug;
        return initialYear && years.includes(initialYear) ? initialYear : years[0] || '';
    }, [isGearRoute, isTeamRoute, activeRouteSlug, years, initialYear]);

    const setSharedPhoto = useAppStore((state) => state.setSharedPhoto);

    // Deep link photo hydration
    useEffect(() => {
        if (initialYear && initialEvent && (years.includes(initialYear) || isTeamRoute || isGearRoute)) {
            const rawIndex = initialPhoto ? parseInt(initialPhoto, 10) : undefined;
            const index = rawIndex !== undefined && !isNaN(rawIndex) ? rawIndex : undefined;
            let decodedEvent = initialEvent;
            try {
                decodedEvent = decodeURIComponent(initialEvent);
            } catch {
                // Keep raw string if URI decoding fails
            }
            setSharedPhoto({ eventName: decodedEvent, photoIndex: index });
        }
    }, [initialYear, initialEvent, initialPhoto, years, isTeamRoute, isGearRoute, setSharedPhoto]);

    return {
        selectedTab,
        isGearRoute,
        isTeamRoute,
        activeRouteSlug,
        initialSearchOpen,
        initialSearchQuery,
        initialYear,
        initialEvent,
        initialPhoto,
        params,
    };
}
