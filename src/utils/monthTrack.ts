import type { EventData } from '../types';

export interface MonthConfig {
    num: number;
    label: string;
    fullName: string;
}

/**
 * Ordered DEC -> JAN matching the portfolio's reverse-chronological scroll direction.
 */
export const MONTH_DEFINITIONS: MonthConfig[] = [
    { num: 12, label: 'DEC', fullName: 'December' },
    { num: 11, label: 'NOV', fullName: 'November' },
    { num: 10, label: 'OCT', fullName: 'October' },
    { num: 9, label: 'SEP', fullName: 'September' },
    { num: 8, label: 'AUG', fullName: 'August' },
    { num: 7, label: 'JUL', fullName: 'July' },
    { num: 6, label: 'JUN', fullName: 'June' },
    { num: 5, label: 'MAY', fullName: 'May' },
    { num: 4, label: 'APR', fullName: 'April' },
    { num: 3, label: 'MAR', fullName: 'March' },
    { num: 2, label: 'FEB', fullName: 'February' },
    { num: 1, label: 'JAN', fullName: 'January' },
];

export interface MonthData extends MonthConfig {
    photoCount: number;
    eventCount: number;
    hasPhotos: boolean;
    firstEventId: string | null;
    /** Relative photo volume ratio (0 to 1) compared to peak month */
    volumeRatio: number;
    /** Density level: 0 = empty, 1 = light (<=33%), 2 = moderate (<=66%), 3 = peak (>66%) */
    densityLevel: 0 | 1 | 2 | 3;
    /** Share of annual photos as a percentage integer (0 - 100) */
    seasonPercent: number;
}

/**
 * Extracts month number (1-12) from an event title (e.g. "09.19 ...").
 */
export function getEventMonth(eventName: string): number | null {
    const match = eventName.match(/^(?:\[\d{4}\]\s*)?(\d{2})\./);
    if (match) {
        const m = parseInt(match[1], 10);
        if (m >= 1 && m <= 12) return m;
    }
    return null;
}

/**
 * Standardizes DOM id generation for an event element anchor.
 */
export function formatEventElementId(eventName: string): string {
    return `event-${eventName.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

/**
 * Aggregates annual event list into 12 month entries with photo/event counts, volume ratios, and target anchor IDs.
 */
export function computeYearMonths(events: [string, Partial<EventData>][]): MonthData[] {
    const map = new Map<number, { photoCount: number; eventCount: number; firstEventId: string | null }>();

    for (let i = 1; i <= 12; i++) {
        map.set(i, { photoCount: 0, eventCount: 0, firstEventId: null });
    }

    for (const [eventName, ev] of events) {
        const m = getEventMonth(eventName);
        if (!m) continue;
        const entry = map.get(m)!;
        const count = ev?.photoCount ?? (Array.isArray(ev?.album) ? ev.album.length : 0);
        entry.photoCount += count;
        entry.eventCount += 1;
        if (!entry.firstEventId) {
            entry.firstEventId = formatEventElementId(eventName);
        }
    }

    let maxPhotoCount = 0;
    let totalPhotoCount = 0;
    for (const data of map.values()) {
        if (data.photoCount > maxPhotoCount) maxPhotoCount = data.photoCount;
        totalPhotoCount += data.photoCount;
    }

    return MONTH_DEFINITIONS.map((def) => {
        const data = map.get(def.num)!;
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
        const seasonPercent = totalPhotoCount > 0 ? Math.round((data.photoCount / totalPhotoCount) * 100) : 0;

        return {
            ...def,
            photoCount: data.photoCount,
            eventCount: data.eventCount,
            hasPhotos: data.eventCount > 0,
            firstEventId: data.firstEventId,
            volumeRatio,
            densityLevel,
            seasonPercent,
        };
    });
}
