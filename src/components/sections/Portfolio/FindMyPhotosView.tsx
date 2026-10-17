import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFirstEventOffset } from '../../../hooks/useFirstEventOffset';
import { ensureYearEventsLoaded, getCachedYearEvent } from '../../../hooks/usePortfolioData';
import { parseEventTitle } from '../../../utils/formatters';
import { buildEventRows } from '../../../utils/portfolioTransforms';
import { computeViewYears } from '../../../utils/yearTrack';
import {
    extractJerseyNumbersWithCounts,
    fetchFindTeamsIndex,
    fetchTeamFindData,
    groupFindPhotosByEvent,
    resolveTeamFindPhotos,
    scoreJerseyNumberMatch,
    scorePartialJerseyCandidate,
    toPhotoRecordFromFindPhoto,
    type FindTeamsIndex,
    type ResolvedFindPhoto,
    type TeamFindPayload,
} from '../../../utils/findMyPhotos';
import type { EventData } from '../../../types';
import PortfolioEvent from './PortfolioEvent';
import PortfolioMonthTrack from './PortfolioMonthTrack';
import PortfolioYearTrack from './PortfolioYearTrack';
import '../../../styles/_find.scss';

interface FindMyPhotosViewProps {
    initialTeamSlug?: string;
    initialNumberQuery?: string;
    hideTracks?: boolean;
}

export default function FindMyPhotosView({
    initialTeamSlug,
    initialNumberQuery = '',
    hideTracks = false,
}: FindMyPhotosViewProps) {
    const [searchParams] = useSearchParams();
    const [teamPayload, setTeamPayload] = useState<TeamFindPayload | null>(null);
    const [findIndexData, setFindIndexData] = useState<FindTeamsIndex | null>(null);
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const [yearMetaVersion, setYearMetaVersion] = useState(0);

    const eventsRef = useRef<HTMLDivElement>(null);
    useFirstEventOffset(eventsRef);

    const paramNum = searchParams.get('num') ?? initialNumberQuery;
    const cleanSearchedNum = paramNum.trim().replace(/^#/, '').toUpperCase();
    const isUnfilteredRoot = !cleanSearchedNum && !initialTeamSlug;
    const loadKey = `${initialTeamSlug || ''}:${isUnfilteredRoot ? 'root' : 'filtered'}`;
    const isLoading = loadedKey !== loadKey;

    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            if (isUnfilteredRoot) {
                const idx = await fetchFindTeamsIndex();
                if (!cancelled) {
                    setFindIndexData(idx);
                    setLoadedKey(loadKey);
                }
                return;
            }

            if (initialTeamSlug) {
                const specific = await fetchTeamFindData(initialTeamSlug);
                if (!cancelled && specific) {
                    setTeamPayload(specific);
                    setLoadedKey(loadKey);
                    return;
                }
            }

            const allPayload = await fetchTeamFindData('all');
            if (!cancelled && allPayload) {
                setTeamPayload(allPayload);
                setLoadedKey(loadKey);
                return;
            }

            const idx = await fetchFindTeamsIndex();
            if (!cancelled && idx) {
                setFindIndexData(idx);
            }
            const fallbackSlug = idx?.teams?.[0]?.slug;
            if (fallbackSlug) {
                const fallbackPayload = await fetchTeamFindData(fallbackSlug);
                if (!cancelled) {
                    setTeamPayload(fallbackPayload);
                    setLoadedKey(loadKey);
                }
            } else if (!cancelled) {
                setTeamPayload(null);
                setLoadedKey(loadKey);
            }
        };

        loadData().catch(() => {
            if (!cancelled) {
                setTeamPayload(null);
                setLoadedKey(loadKey);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [initialTeamSlug, isUnfilteredRoot, loadKey]);

    const resolvedPhotos = useMemo(
        () => resolveTeamFindPhotos(teamPayload),
        [teamPayload]
    );

    const allNumbersWithCounts = useMemo(() => {
        const fromPayload = extractJerseyNumbersWithCounts(teamPayload)
            .filter((entry) => !entry.number.includes('?'))
            .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
        if (fromPayload.length > 0) return fromPayload;

        if (findIndexData?.numberCounts) {
            return Object.entries(findIndexData.numberCounts)
                .map(([num, count]) => ({ number: num.trim().toUpperCase(), count }))
                .filter((entry) => entry.number && !entry.number.includes('?'))
                .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
        }
        return [];
    }, [teamPayload, findIndexData]);

    // Exact photo matches for the active jersey number
    const exactMatchingPhotos = useMemo(() => {
        if (isUnfilteredRoot) return [];
        if (!cleanSearchedNum) return resolvedPhotos;
        const hasWildcard = cleanSearchedNum.includes('?');
        const matched: ResolvedFindPhoto[] = [];

        for (const photo of resolvedPhotos) {
            const isExact = photo.numbers.some((rawNum) => {
                const n = String(rawNum).trim().toUpperCase();
                if (!n) return false;
                if (n === cleanSearchedNum) return true;
                if (hasWildcard && scoreJerseyNumberMatch(n, cleanSearchedNum) > 0) return true;
                if (n.includes('?') && scoreJerseyNumberMatch(n, cleanSearchedNum) >= 2) return true;
                return false;
            });
            if (isExact) {
                matched.push(photo);
            }
        }
        return matched;
    }, [resolvedPhotos, cleanSearchedNum, isUnfilteredRoot]);

    // Possible partial matches when the filtered jersey number has 0 exact results
    const partialMatchPills = useMemo(() => {
        if (!cleanSearchedNum || exactMatchingPhotos.length > 0) return [];
        return allNumbersWithCounts
            .map((entry) => ({
                ...entry,
                score: scorePartialJerseyCandidate(entry.number, cleanSearchedNum),
            }))
            .filter((entry) => entry.score > 0)
            .sort(
                (a, b) =>
                    b.score - a.score ||
                    b.count - a.count ||
                    a.number.localeCompare(b.number, undefined, { numeric: true })
            );
    }, [allNumbersWithCounts, cleanSearchedNum, exactMatchingPhotos.length]);

    const eventGroups = useMemo(
        () => groupFindPhotosByEvent(exactMatchingPhotos),
        [exactMatchingPhotos]
    );

    // Enrich event cards with year metadata (scores, WFTDA matches, descriptions) identically to /portfolio/team/
    useEffect(() => {
        if (eventGroups.length === 0) return;
        const uniqueYears = Array.from(new Set(eventGroups.map((g) => g.year).filter(Boolean)));
        if (uniqueYears.length === 0) return;
        let cancelled = false;

        Promise.allSettled(
            uniqueYears.map((yr) => ensureYearEventsLoaded(yr, () => cancelled))
        ).then(() => {
            if (!cancelled) {
                setYearMetaVersion((v) => v + 1);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [eventGroups]);

    // Build `[eventName, EventData][]` entries matching `/portfolio/team/` structure
    const events: [string, EventData][] = useMemo(() => {
        void yearMetaVersion;
        const seenNames = new Set<string>();
        return eventGroups.map((group) => {
            const albumImages = group.photos.map(toPhotoRecordFromFindPhoto);
            const bestPhotos = group.photos.filter((p) => p.bestInBurst).map(toPhotoRecordFromFindPhoto);
            const otherPhotos = group.photos.filter((p) => !p.bestInBurst).map(toPhotoRecordFromFindPhoto);
            const highlights = [...bestPhotos, ...otherPhotos].slice(0, 5);
            const { datePrefix } = parseEventTitle(group.eventName, group.year, group.year);
            const cachedEvent = getCachedYearEvent(group.year, group.eventName, group.albumSlug);

            let key = group.eventName;
            if (seenNames.has(key)) {
                key = `[${group.year}] ${group.eventName}`;
            }
            seenNames.add(key);

            const ev: EventData = {
                date: cachedEvent?.date ?? datePrefix ?? null,
                originalYear: group.year,
                albumSlug: group.albumSlug,
                photoCount: albumImages.length,
                highlights,
                album: albumImages,
                localScore: cachedEvent?.localScore,
                wftdaMatch: cachedEvent?.wftdaMatch,
                description: cachedEvent?.description ?? null,
                maxExifChars: cachedEvent?.maxExifChars,
                scrubberHash: cachedEvent?.scrubberHash,
                zip: cachedEvent?.zip || `/photos/${group.year}/${group.albumSlug}.zip`,
            };

            return [key, ev];
        });
    }, [eventGroups, yearMetaVersion]);

    const multiYearData = useMemo(() => computeViewYears(events), [events]);

    const eventRows = useMemo(
        () => buildEventRows(events, 'find', multiYearData.length > 1),
        [events, multiYearData.length]
    );

    if (isLoading) {
        return (
            <div className="portfolio__find-my-photos" aria-label="Find My Photos by Jersey Number">
                <div className="portfolio__loading" role="status" aria-live="polite">
                    Loading jersey photos…
                </div>
            </div>
        );
    }

    return (
        <div
            className="portfolio__find-my-photos"
            aria-label="Find My Photos by Jersey Number"
        >
            <div className="sr-only" role="status" aria-live="polite">
                {isUnfilteredRoot
                    ? `${allNumbersWithCounts.length} jersey numbers available`
                    : `Showing ${exactMatchingPhotos.length} matching photo${
                          exactMatchingPhotos.length === 1 ? '' : 's'
                      }${cleanSearchedNum ? ` for #${cleanSearchedNum}` : ''}`}
            </div>

            {isUnfilteredRoot ? (
                <div className="portfolio__team-grid">
                    {allNumbersWithCounts.map((entry, idx) => (
                        <Link
                            key={entry.number}
                            to={`/portfolio/find?num=${encodeURIComponent(entry.number)}`}
                            className="portfolio__team-pill portfolio__jersey-pill"
                            style={{ '--reveal-delay': `${Math.min(idx, 24) * 15}ms` } as React.CSSProperties}
                        >
                            <span className="portfolio__team-name">#{entry.number}</span>
                            <span
                                className="portfolio__team-count"
                                title={`${entry.count.toLocaleString()} ${entry.count === 1 ? 'photo' : 'photos'}`}
                            >
                                {entry.count.toLocaleString()}
                            </span>
                        </Link>
                    ))}
                </div>
            ) : exactMatchingPhotos.length === 0 ? (
                <div className="portfolio__team-grid">
                    {partialMatchPills.length > 0 ? (
                        <>
                            <h3 className="portfolio__team-category-header">
                                Possible Partial Matches for #{cleanSearchedNum}
                            </h3>
                            {partialMatchPills.map((entry, idx) => (
                                <Link
                                    key={entry.number}
                                    to={`/portfolio/find?num=${encodeURIComponent(entry.number)}`}
                                    className="portfolio__team-pill portfolio__jersey-pill"
                                    style={{ '--reveal-delay': `${Math.min(idx, 24) * 15}ms` } as React.CSSProperties}
                                >
                                    <span className="portfolio__team-name">#{entry.number}</span>
                                    <span
                                        className="portfolio__team-count"
                                        title={`${entry.count.toLocaleString()} ${entry.count === 1 ? 'photo' : 'photos'}`}
                                    >
                                        {entry.count.toLocaleString()}
                                    </span>
                                </Link>
                            ))}
                        </>
                    ) : (
                        <div className="portfolio__team-empty">
                            No photos found matching #{cleanSearchedNum}
                        </div>
                    )}
                </div>
            ) : (
                <div className="portfolio__events-wrapper">
                    {!hideTracks &&
                        (multiYearData.length > 1 ? (
                            <PortfolioYearTrack
                                key={`jersey-${cleanSearchedNum || initialTeamSlug || 'all'}`}
                                events={events}
                                title={cleanSearchedNum ? `#${cleanSearchedNum}` : undefined}
                            />
                        ) : multiYearData.length === 1 ? (
                            <PortfolioMonthTrack
                                key={`jersey-${cleanSearchedNum || initialTeamSlug || 'all'}-${multiYearData[0].year}`}
                                events={events}
                                selectedYear={multiYearData[0].year}
                            />
                        ) : null)}

                    <div className="portfolio__events" ref={eventsRef}>
                        {eventRows.map((row) =>
                            row.type === 'divider' ? (
                                <div
                                    key={`divider-${row.year}`}
                                    id={`year-divider-${row.year}`}
                                    className="portfolio__year-divider"
                                    aria-hidden="true"
                                >
                                    <span>{row.year}</span>
                                </div>
                            ) : (
                                <PortfolioEvent
                                    key={`find-${cleanSearchedNum}-${row.ev.originalYear}-${row.eventName}`}
                                    eventName={row.eventName}
                                    ev={row.ev}
                                    evIdx={row.evIdx}
                                    selectedYear={row.ev.originalYear || 'find'}
                                    inViewParent={true}
                                />
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
