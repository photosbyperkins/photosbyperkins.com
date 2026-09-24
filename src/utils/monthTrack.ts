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

export interface DetectActiveMonthParams {
    events: [string, any][];
    getRect: (elId: string) => { top: number; bottom: number } | null;
    scrollY: number;
    viewportHeight: number;
    scrollHeight: number;
    viewportAnchorRatio?: number;
    bottomThresholdPx?: number;
}

/**
 * Calculates which month should be active based on current scroll position and event layout.
 * Accurately handles edge cases such as tall viewports where the earliest month at the
 * bottom of the page physically cannot scroll up to the standard viewport trigger anchor.
 */
export function detectActiveMonth({
    events,
    getRect,
    scrollY,
    viewportHeight,
    scrollHeight,
    viewportAnchorRatio = 0.35,
    bottomThresholdPx = 50,
}: DetectActiveMonthParams): number | null {
    if (events.length === 0) return null;

    // Top of page clamp: if at or near the very top, always activate the first (latest) event
    if (scrollY <= 10) {
        return getEventMonth(events[0][0]);
    }

    const maxScrollY = scrollHeight - viewportHeight;
    const remainingScroll = Math.max(0, maxScrollY - scrollY);

    // Bottom of page clamp: if scrolled to (or within threshold of) the bottom of the page,
    // activate the last (earliest) event
    if (maxScrollY <= 0 || remainingScroll <= bottomThresholdPx) {
        return getEventMonth(events[events.length - 1][0]);
    }

    const viewportAnchor = viewportHeight * viewportAnchorRatio;
    let detectedMonth: number | null = null;

    // Iterate in reverse (from latest-in-season/earliest-in-year bottom event up to top)
    // to find the deepest event that has reached its effective trigger point
    for (let i = events.length - 1; i >= 0; i--) {
        const [eventName] = events[i];
        const elId = formatEventElementId(eventName);
        const rect = getRect(elId);
        if (!rect) continue;

        // Compute the minimum possible rect.top this element could ever reach
        // if scrolled all the way to maxScrollY.
        const minPossibleTop = rect.top - remainingScroll;

        // If this element physically cannot reach viewportAnchor in this viewport,
        // adjust its trigger point to when it gets within lead-in buffer of its maximum scroll position.
        const trigger = minPossibleTop > viewportAnchor ? minPossibleTop + bottomThresholdPx : viewportAnchor;

        if (rect.top <= trigger) {
            const m = getEventMonth(eventName);
            if (m) {
                detectedMonth = m;
                break;
            }
        }
    }

    // Fallback if no element reached trigger point (e.g. above first event)
    if (detectedMonth === null) {
        const firstElId = formatEventElementId(events[0][0]);
        const firstRect = getRect(firstElId);
        if (firstRect && firstRect.top > viewportAnchor) {
            detectedMonth = getEventMonth(events[0][0]);
        } else {
            detectedMonth = getEventMonth(events[events.length - 1][0]);
        }
    }

    return detectedMonth;
}
