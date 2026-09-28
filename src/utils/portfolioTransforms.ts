import type { EventData, SeasonStats } from '../types';
import { getGearItem } from '../data/gearData';
import { parseEventTitle } from './formatters';

export type EventRow =
    | { type: 'event'; eventName: string; ev: EventData; evIdx: number }
    | { type: 'divider'; year: string };

/**
 * Builds the visual list of event rows, inserting year divider banners
 * between seasons when browsing multi-year views (teams or gear).
 */
export function buildEventRows(
    events: [string, EventData][],
    selectedTab: string,
    isMultiYearMode: boolean
): EventRow[] {
    if (!isMultiYearMode) {
        return events.map(([eventName, ev], evIdx) => ({
            type: 'event' as const,
            eventName,
            ev,
            evIdx,
        }));
    }

    const rows: EventRow[] = [];
    let lastYear: string | null = null;
    let eventCounter = 0;

    for (const [eventName, ev] of events) {
        const { parsedYear } = parseEventTitle(eventName, ev.originalYear);
        const year = parsedYear || ev.originalYear || selectedTab;
        if (year !== lastYear) {
            if (year) rows.push({ type: 'divider', year });
            lastYear = year ?? null;
        }
        rows.push({ type: 'event', eventName, ev, evIdx: eventCounter++ });
    }

    return rows;
}

/**
 * Computes deterministic season highlight stats (most seen team, first seen team,
 * camera gear, lens gear, total photos and events count).
 */
export function getSeasonHighlights(
    stats: SeasonStats | undefined,
    events: [string, EventData][],
    selectedTab: string
) {
    const totalEvents = stats?.totalEvents || events.length;
    const totalPhotos = stats?.totalPhotos || events.reduce((sum, [, ev]) => sum + (ev.photoCount || 0), 0);

    let firstSeenTeam: string | null = null;
    if (stats?.firstSeenTeams && stats.firstSeenTeams.length > 0) {
        const seed = parseInt(selectedTab) || 42;
        const index = Math.floor(Math.abs(Math.sin(seed) * 10000)) % stats.firstSeenTeams.length;
        firstSeenTeam = stats.firstSeenTeams[index];
    }

    let mostSeenTeam: string | null = null;
    if (stats?.mostSeenTeams && stats.mostSeenTeams.length > 0) {
        const seed = parseInt(selectedTab) || 42;
        const index = Math.floor(Math.abs(Math.sin(seed) * 10000)) % stats.mostSeenTeams.length;
        mostSeenTeam = stats.mostSeenTeams[index];
    }

    const cameraGear = getGearItem(stats?.mostUsedCameraId || stats?.mostUsedCamera, selectedTab, 'camera');
    const lensGear = getGearItem(stats?.mostUsedLensId || stats?.mostUsedLens, selectedTab, 'lens');

    return {
        totalEvents,
        totalPhotos,
        firstSeenTeam,
        mostSeenTeam,
        cameraGear,
        lensGear,
    };
}
