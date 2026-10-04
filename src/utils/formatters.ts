import { TEAM_ABBREVIATIONS } from './constants';
import type { FavoriteStoreItem, PhotoInput, PhotoRecord } from '../types';
export function formatTeamName(teamName: string): string {
    return getTeamNameFormats(teamName).mid;
}

export interface TeamNameFormats {
    full: string;
    mid: string;
    short: string;
}

export function getTeamNameFormats(teamName: string): TeamNameFormats {
    const full = teamName;

    // Level 1: Mid
    let mid = teamName;
    for (const [f, abbr] of Object.entries(TEAM_ABBREVIATIONS)) {
        const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        mid = mid.replace(new RegExp(`\\b${escaped}\\b`, 'g'), abbr);
    }
    mid = mid.replace(/\s+Roller Derby\b/gi, '').trim();

    // Level 2: Short (Aggressive)
    let short = mid;

    // Protect short team names (e.g. Arizona Rising) from being aggressively stripped
    if (full.length < 15) {
        return { full, mid, short };
    }

    // Step 1: Strip generic terms including Round Robin
    short = short
        .replace(/\b(Roller Derby|Derby|All Stars|All-Stars|Juniors|Junior|Quad Squad|Round Robin)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    // Step 2: Strip home league abbreviations if followed by a sub-team name
    const words = short.split(' ');
    if (words.length > 1) {
        // Find if the first word is one of the abbreviation values
        const abbrValues = Object.values(TEAM_ABBREVIATIONS).filter(Boolean);
        if (abbrValues.includes(words[0])) {
            short = words.slice(1).join(' ');
        }
    }

    return { full, mid, short };
}

export interface ParsedEventTitle {
    parsedYear?: string;
    baseDatePrefix: string;
    mainTitle: string;
    datePrefix: string;
    teams: string[];
    isVersusMatch: boolean;
}

export function parseEventTitle(eventName: string, originalYear?: string, selectedYear?: string): ParsedEventTitle {
    const titleMatch = eventName.match(/^(?:\[(\d{4})\]\s*)?(\d{2}\.\d{2})\s+(.*)/);
    const parsedYear = titleMatch ? titleMatch[1] : undefined;
    const baseDatePrefix = titleMatch ? titleMatch[2] : '';
    const mainTitle = titleMatch ? titleMatch[3] : eventName;

    let datePrefix = baseDatePrefix;

    if (baseDatePrefix) {
        const [monthStr, dayStr] = baseDatePrefix.split('.');
        const yearStr = parsedYear || originalYear || selectedYear;

        if (yearStr) {
            try {
                const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
                if (!isNaN(dateObj.getTime())) {
                    const options: Intl.DateTimeFormatOptions = {
                        month: '2-digit',
                        day: '2-digit',
                    };

                    const parts = new Intl.DateTimeFormat(undefined, options).formatToParts(dateObj);

                    datePrefix = parts
                        .filter((part) => part.type === 'month' || part.type === 'day')
                        .map((part) => part.value)
                        .join('.');
                }
            } catch (e) {
                console.error('Failed to localize date:', e);
            }
        }
    }

    const teams = mainTitle
        .split(/\s+(?:vs\.?|versus)\s+/i)
        .map((t) => t.trim())
        .filter(Boolean);

    return {
        parsedYear,
        baseDatePrefix,
        mainTitle,
        datePrefix,
        teams,
        isVersusMatch: teams.length >= 2,
    };
}

/**
 * Unwraps a FavoriteStoreItem to its underlying PhotoInput.
 * Centralises the repeated `'photo' in f ? f.photo : f` guard pattern.
 */
export function resolvePhotoInput(item: FavoriteStoreItem): PhotoInput {
    if (item && typeof item === 'object' && 'photo' in item) {
        return item.photo;
    }
    return item as PhotoInput;
}

/**
 * Canonicalizes any FavoriteStoreItem or PhotoInput into a strict PhotoRecord.
 * Ensures downstream components can safely read .original, .thumb, .focusX, etc.
 */
export function toPhotoRecord(item: FavoriteStoreItem): PhotoRecord {
    const photo = resolvePhotoInput(item);
    const itemEventName =
        typeof item === 'object' && item !== null && 'eventName' in item && typeof item.eventName === 'string'
            ? item.eventName
            : undefined;
    const itemYear =
        typeof item === 'object' && item !== null && 'year' in item && typeof item.year === 'string'
            ? item.year
            : undefined;

    if (typeof photo === 'string') {
        return {
            original: photo,
            thumb: photo,
            ...(itemEventName ? { eventName: itemEventName } : {}),
            ...(itemYear ? { year: itemYear } : {}),
        };
    }
    return {
        ...photo,
        ...(itemEventName && !photo.eventName ? { eventName: itemEventName } : {}),
        ...(itemYear && !photo.year ? { year: itemYear } : {}),
    };
}

/** Returns the original (full-res jpg) URL from any FavoriteStoreItem. */
export function getPhotoOriginalUrl(item: FavoriteStoreItem): string {
    const photo = resolvePhotoInput(item);
    return typeof photo === 'string' ? photo : photo.original;
}

/**
 * Returns the AVIF display URL used by the lightbox for rendering and sharing.
 * Mirrors the transformation in LightboxSlide: /photos/ → /avif/, .jpg → .avif
 */
export function getPhotoDisplayUrl(original: string): string {
    return original.replace(/^(?:\/)?photos\//i, '/avif/').replace(/\.jpe?g$/i, '.avif');
}

/**
 * Finds the earliest event in a reverse-chronological event list that features a specific team.
 * Matches by full team slug or exact team substring to prevent false positives from generic words (e.g. "Derby", "Area").
 */
export function findEarliestEventForTeam(events: [string, { albumSlug?: string }][], teamName: string): string | null {
    if (!teamName || !events || events.length === 0) return null;
    const targetSlug = teamName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
    const targetLower = teamName.toLowerCase().trim();

    // Search backwards (events are reverse-chronological) to find the earliest match
    for (let i = events.length - 1; i >= 0; i--) {
        const [eName, eData] = events[i];
        const slug = (eData?.albumSlug || '').toLowerCase();
        const nameLower = eName.toLowerCase();
        if (slug.includes(targetSlug) || nameLower.includes(targetLower)) {
            return eName;
        }
    }
    return null;
}

/**
 * Escapes special XML/SVG characters (<, >, &, ', ") to prevent injection and markup breakage.
 */
export function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '&':
                return '&amp;';
            case "'":
                return '&apos;';
            case '"':
                return '&quot;';
            default:
                return c;
        }
    });
}

/**
 * Sanitizes and normalizes raw EXIF camera model strings for display.
 * e.g., converts "Z5_2" or "NIKON Z5_2" to standardized "Z 5 II" / "NIKON Z 5 II".
 */
export function formatCameraModel(model?: string): string {
    if (!model) return '';
    return model
        .replace(/\bZ5_2\b/g, 'Z 5 II')
        .replace(/(?:^|\b|\s)ℤ5_2\b/g, (match) => match.replace('ℤ5_2', 'ℤ 5 II'));
}

export const normalizeCameraModel = formatCameraModel;
