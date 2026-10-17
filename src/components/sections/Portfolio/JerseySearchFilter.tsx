import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    fetchFindTeamsIndex,
    parseJerseySearchQuery,
    scoreJerseyNumberMatch,
    scorePartialJerseyCandidate,
    type FindTeamEntry,
    type FindTeamsIndex,
} from '../../../utils/findMyPhotos';
import '../../../styles/_find.scss';

interface JerseySearchFilterProps {
    jerseySearchQuery: string;
    setJerseySearchQuery?: (query: string) => void;
    findTeams?: FindTeamEntry[];
    isFindIndexLoading?: boolean;
    initialTeamSlug?: string;
    onBack?: () => void;
}

export default function JerseySearchFilter({
    jerseySearchQuery,
    findTeams = [],
    isFindIndexLoading = false,
    onBack,
}: JerseySearchFilterProps) {
    const [findIndexData, setFindIndexData] = useState<FindTeamsIndex | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchFindTeamsIndex()
            .then((data) => {
                if (!cancelled && data) {
                    setFindIndexData(data);
                }
            })
            .catch(() => {
                // Ignore
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const parsedQuery = useMemo(
        () => parseJerseySearchQuery(jerseySearchQuery),
        [jerseySearchQuery]
    );

    const effectiveNumberQuery = useMemo(() => {
        if (parsedQuery.numberQuery) return parsedQuery.numberQuery;
        return jerseySearchQuery.trim().replace(/^#/, '').toUpperCase();
    }, [parsedQuery.numberQuery, jerseySearchQuery]);

    // Extract all jersey numbers and their counts from index.json (or fallback to findTeams)
    const allJerseyPills = useMemo(() => {
        const combined = new Map<string, number>();

        if (findIndexData?.numberCounts) {
            for (const [rawNum, count] of Object.entries(findIndexData.numberCounts)) {
                const num = rawNum.trim().toUpperCase();
                if (!num || num.includes('?')) continue;
                combined.set(num, count);
            }
        }

        const teamsSource = findTeams.length > 0 ? findTeams : findIndexData?.teams || [];
        if (combined.size === 0 && teamsSource.length > 0) {
            for (const team of teamsSource) {
                if (team.numberCounts) {
                    for (const [rawNum, count] of Object.entries(team.numberCounts)) {
                        const num = rawNum.trim().toUpperCase();
                        if (!num || num.includes('?')) continue;
                        combined.set(num, Math.max(combined.get(num) ?? 0, count));
                    }
                } else {
                    for (const rawNum of team.topNumbers) {
                        const num = rawNum.trim().toUpperCase();
                        if (!num || num.includes('?')) continue;
                        combined.set(num, Math.max(combined.get(num) ?? 0, 1));
                    }
                }
            }
        }

        return Array.from(combined.entries())
            .map(([number, count]) => ({ number, count }))
            .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    }, [findIndexData, findTeams]);

    // Exact matches for the typed jersey number
    const exactMatchPills = useMemo(() => {
        if (!effectiveNumberQuery) return allJerseyPills;
        const hasWildcard = effectiveNumberQuery.includes('?');
        return allJerseyPills.filter((entry) => {
            if (entry.number === effectiveNumberQuery) return true;
            if (hasWildcard && scoreJerseyNumberMatch(entry.number, effectiveNumberQuery) > 0) {
                return true;
            }
            return false;
        });
    }, [allJerseyPills, effectiveNumberQuery]);

    // Possible partial matches if the filtered jersey number has no exact match
    const partialMatchPills = useMemo(() => {
        if (!effectiveNumberQuery || exactMatchPills.length > 0) return [];
        return allJerseyPills
            .map((entry) => ({
                ...entry,
                score: scorePartialJerseyCandidate(entry.number, effectiveNumberQuery),
            }))
            .filter((entry) => entry.score > 0)
            .sort(
                (a, b) =>
                    b.score - a.score ||
                    b.count - a.count ||
                    a.number.localeCompare(b.number, undefined, { numeric: true })
            );
    }, [allJerseyPills, effectiveNumberQuery, exactMatchPills.length]);

    const handleNavigate = () => {
        onBack?.();
        window.scrollTo({ top: 0, behavior: 'instant' });
    };

    const renderJerseyPill = (entry: { number: string; count: number }, idx: number) => (
        <Link
            key={entry.number}
            to={`/portfolio/find?num=${encodeURIComponent(entry.number)}`}
            className="portfolio__team-pill portfolio__jersey-pill"
            style={{ '--reveal-delay': `${Math.min(idx, 24) * 15}ms` } as React.CSSProperties}
            onClick={handleNavigate}
        >
            <span className="portfolio__team-name">#{entry.number}</span>
            <span
                className="portfolio__team-count"
                title={`${entry.count.toLocaleString()} ${entry.count === 1 ? 'photo' : 'photos'}`}
            >
                {entry.count.toLocaleString()}
            </span>
        </Link>
    );

    if (isFindIndexLoading && allJerseyPills.length === 0) {
        return (
            <div className="portfolio__team-search portfolio__jersey-search">
                <div className="portfolio__loading container">Loading jersey numbers...</div>
            </div>
        );
    }

    return (
        <div className="portfolio__team-search portfolio__jersey-search">
            <div className="sr-only" role="status" aria-live="polite">
                {effectiveNumberQuery
                    ? exactMatchPills.length > 0
                        ? `${exactMatchPills.length} ${exactMatchPills.length === 1 ? 'jersey number' : 'jersey numbers'} found`
                        : partialMatchPills.length > 0
                          ? `No exact match for #${effectiveNumberQuery}. Showing ${partialMatchPills.length} possible partial matches.`
                          : `No jersey numbers found matching ${jerseySearchQuery}`
                    : ''}
            </div>
            <div className="portfolio__team-grid container">
                {exactMatchPills.length > 0 ? (
                    exactMatchPills.map(renderJerseyPill)
                ) : partialMatchPills.length > 0 ? (
                    <>
                        <h3 className="portfolio__team-category-header">
                            Possible Partial Matches for #{effectiveNumberQuery}
                        </h3>
                        {partialMatchPills.map(renderJerseyPill)}
                    </>
                ) : (
                    <div className="portfolio__team-empty">
                        No jersey numbers found matching &ldquo;{jerseySearchQuery}&rdquo;
                    </div>
                )}
            </div>
        </div>
    );
}


