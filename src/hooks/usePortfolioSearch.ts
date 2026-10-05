import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type FuseType from 'fuse.js';
import type { GearMeta } from '../components/sections/Portfolio/GearFilter';
import { getBuildNumber } from '../utils/build';

export interface TeamMeta {
    name: string;
    slug: string;
    count: number;
    isMeta?: boolean;
}

interface UsePortfolioSearchOptions {
    initialSearchQuery?: string;
    initialSearchOpen?: boolean;
    isGearRoute?: boolean;
}

let fuseModulePromise: Promise<typeof import('fuse.js')> | null = null;
function loadFuseModule() {
    if (!fuseModulePromise) {
        fuseModulePromise = import('fuse.js');
    }
    return fuseModulePromise;
}

export function usePortfolioSearch({
    initialSearchQuery = '',
    initialSearchOpen = false,
    isGearRoute = false,
}: UsePortfolioSearchOptions = {}) {
    const [teamIndex, setTeamIndex] = useState<TeamMeta[]>([]);
    const [teamSearchQuery, setTeamSearchQuery] = useState(initialSearchQuery);
    const [isTeamIndexLoading, setIsTeamIndexLoading] = useState(false);
    const hasFetchedTeams = useRef(false);

    const [gearIndex, setGearIndex] = useState<GearMeta[]>([]);
    const [gearSearchQuery, setGearSearchQuery] = useState('');
    const [isGearIndexLoading, setIsGearIndexLoading] = useState(false);
    const hasFetchedGear = useRef(false);

    const [teamFuse, setTeamFuse] = useState<FuseType<TeamMeta> | null>(null);
    const [gearFuse, setGearFuse] = useState<FuseType<GearMeta> | null>(null);

    const fetchTeamIndex = useCallback(() => {
        if (hasFetchedTeams.current) return;
        hasFetchedTeams.current = true;
        setIsTeamIndexLoading(true);
        fetch(`/data/teams/index.json?build=${getBuildNumber()}`)
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch teams index');
                return res.json();
            })
            .then((data: TeamMeta[]) => {
                setTeamIndex(data);
                setIsTeamIndexLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load teams index:', err);
                setIsTeamIndexLoading(false);
            });
    }, []);

    const fetchGearIndex = useCallback(() => {
        if (hasFetchedGear.current) return;
        hasFetchedGear.current = true;
        setIsGearIndexLoading(true);
        fetch(`/data/gear/index.json?build=${getBuildNumber()}`)
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch gear index');
                return res.json();
            })
            .then((data: GearMeta[]) => {
                setGearIndex(data);
                setIsGearIndexLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load gear index:', err);
                setIsGearIndexLoading(false);
            });
    }, []);

    // Prefetch indexes if opened with search open or on a gear route
    useEffect(() => {
        if (initialSearchOpen || isGearRoute) {
            fetchTeamIndex();
            fetchGearIndex();
        }
    }, [initialSearchOpen, isGearRoute, fetchTeamIndex, fetchGearIndex]);

    // Lazily instantiate Fuse for teams when searching
    useEffect(() => {
        if (teamIndex.length === 0) return;
        let isCancelled = false;

        loadFuseModule().then(({ default: Fuse }) => {
            if (!isCancelled) {
                setTeamFuse(
                    new Fuse(teamIndex, {
                        keys: ['name', 'slug'],
                        threshold: 0.3,
                        ignoreLocation: true,
                    })
                );
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [teamIndex]);

    // Lazily instantiate Fuse for gear when searching
    useEffect(() => {
        if (gearIndex.length === 0) return;
        let isCancelled = false;

        loadFuseModule().then(({ default: Fuse }) => {
            if (!isCancelled) {
                setGearFuse(
                    new Fuse(gearIndex, {
                        keys: ['name', 'compactName', 'shortName', 'brand', 'type', 'searchAliases'],
                        threshold: 0.35,
                        ignoreLocation: true,
                    })
                );
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [gearIndex]);

    const filteredTeams = useMemo(() => {
        const query = teamSearchQuery.trim();
        if (!query || !teamFuse) return teamIndex;
        return teamFuse.search(query).map((res) => res.item);
    }, [teamSearchQuery, teamFuse, teamIndex]);

    const filteredGear = useMemo(() => {
        const query = gearSearchQuery.trim();
        if (!query || !gearFuse) return gearIndex;
        return gearFuse.search(query).map((res) => res.item);
    }, [gearSearchQuery, gearFuse, gearIndex]);

    const ensureIndexesLoaded = useCallback(() => {
        fetchTeamIndex();
        fetchGearIndex();
    }, [fetchTeamIndex, fetchGearIndex]);

    return {
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
    };
}
