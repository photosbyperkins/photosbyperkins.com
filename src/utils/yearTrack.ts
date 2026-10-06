import type { EventData } from '../types';
import { parseEventTitle } from './formatters';
import { formatEventElementId } from './monthTrack';

export interface YearTrackData {
    year: string;
    label: string;
    photoCount: number;
    eventCount: number;
    hasPhotos: boolean;
    dividerId: string;
    firstEventId: string | null;
    volumeRatio: number;
    densityLevel: 0 | 1 | 2 | 3;
    totalPercent: number;
}

export function formatYearDividerId(year: string): string {
    return `year-divider-${year.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

/**
 * Aggregates an event list into reverse-chronologically sorted year summaries
 * with photo/event counts, volume ratios, and element anchor IDs.
 */
export function computeViewYears(events: [string, Partial<EventData>][]): YearTrackData[] {
    const map = new Map<
        string,
        { photoCount: number; eventCount: number; firstEventId: string | null }
    >();

    for (const [eventName, ev] of events) {
        const { parsedYear } = parseEventTitle(eventName, ev.originalYear);
        const year = parsedYear || ev.originalYear;
        if (!year) continue;

        let entry = map.get(year);
        if (!entry) {
            entry = { photoCount: 0, eventCount: 0, firstEventId: null };
            map.set(year, entry);
        }

        const count = ev?.photoCount ?? (Array.isArray(ev?.album) ? ev.album.length : 0);
        entry.photoCount += count;
        entry.eventCount += 1;
        if (!entry.firstEventId) {
            entry.firstEventId = formatEventElementId(eventName);
        }
    }

    // Sort years descending (newest to oldest)
    const sortedYears = Array.from(map.keys()).sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numB - numA;
        }
        return b.localeCompare(a);
    });

    let maxPhotoCount = 0;
    let totalPhotoCount = 0;
    for (const data of map.values()) {
        if (data.photoCount > maxPhotoCount) maxPhotoCount = data.photoCount;
        totalPhotoCount += data.photoCount;
    }

    return sortedYears.map((year) => {
        const data = map.get(year)!;
        const volumeRatio = maxPhotoCount > 0 ? data.photoCount / maxPhotoCount : 0;
        let densityLevel: 0 | 1 | 2 | 3 = 0;
        if (data.eventCount > 0) {
            if (volumeRatio >= 0.65) {
                densityLevel = 3;
            } else if (volumeRatio >= 0.3) {
                densityLevel = 2;
            } else {
                densityLevel = 1;
            }
        }
        const totalPercent = totalPhotoCount > 0 ? Math.round((data.photoCount / totalPhotoCount) * 100) : 0;

        return {
            year,
            label: year,
            photoCount: data.photoCount,
            eventCount: data.eventCount,
            hasPhotos: data.eventCount > 0,
            dividerId: formatYearDividerId(year),
            firstEventId: data.firstEventId,
            volumeRatio,
            densityLevel,
            totalPercent,
        };
    });
}

export interface DetectActiveYearParams {
    years: YearTrackData[];
    getRect: (elId: string) => { top: number; bottom: number } | null;
    scrollY: number;
    viewportHeight: number;
    scrollHeight: number;
    viewportAnchorRatio?: number;
    bottomThresholdPx?: number;
}

/**
 * Calculates which year should be active based on current scroll position and section anchors.
 */
export function detectActiveYear({
    years,
    getRect,
    scrollY,
    viewportHeight,
    scrollHeight,
    viewportAnchorRatio = 0.35,
    bottomThresholdPx = 50,
}: DetectActiveYearParams): string | null {
    if (years.length === 0) return null;

    // Top of page clamp: if at or near the very top, always activate the first (newest) year
    if (scrollY <= 10) {
        return years[0].year;
    }

    const maxScrollY = scrollHeight - viewportHeight;
    const remainingScroll = Math.max(0, maxScrollY - scrollY);

    // Bottom of page clamp: if scrolled to bottom, activate the last (oldest) year
    if (maxScrollY <= 0 || remainingScroll <= bottomThresholdPx) {
        return years[years.length - 1].year;
    }

    const viewportAnchor = viewportHeight * viewportAnchorRatio;
    let detectedYear: string | null = null;

    // Iterate in reverse (from oldest bottom year up to newest top year)
    // to find the deepest year divider that has reached its effective trigger point
    for (let i = years.length - 1; i >= 0; i--) {
        const item = years[i];
        const rect = getRect(item.dividerId) || (item.firstEventId ? getRect(item.firstEventId) : null);
        if (!rect) continue;

        const minPossibleTop = rect.top - remainingScroll;
        const trigger = minPossibleTop > viewportAnchor ? minPossibleTop + bottomThresholdPx : viewportAnchor;

        if (rect.top <= trigger) {
            detectedYear = item.year;
            break;
        }
    }

    if (detectedYear === null) {
        detectedYear = years[0].year;
    }

    return detectedYear;
}
