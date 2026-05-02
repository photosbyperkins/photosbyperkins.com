import { TEAM_ABBREVIATIONS } from './constants';
import type { FavoriteStoreItem, PhotoInput } from '../types';
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
        mid = mid.replace(new RegExp(`\\b${f}\\b`, 'g'), abbr);
    }
    mid = mid.replace(/\s+Roller Derby\b/gi, '').trim();

    // Level 2: Short (Aggressive)
    let short = mid;

    // Step 1: Strip generic terms including Round Robin
    short = short
        .replace(/\b(Roller Derby|Derby|All Stars|All-Stars|Juniors|Quad Squad|Round Robin)\b/gi, '')
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

export function parseEventTitle(eventName: string, originalYear?: string, selectedYear?: string) {
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

    return { parsedYear, baseDatePrefix, mainTitle, datePrefix };
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

/** Returns the original (full-res jpg) URL from any FavoriteStoreItem. */
export function getPhotoOriginalUrl(item: FavoriteStoreItem): string {
    const photo = resolvePhotoInput(item);
    return typeof photo === 'string' ? photo : photo.original;
}

/**
 * Returns the WebP display URL used by the lightbox for sharing.
 * Mirrors the transformation in LightboxSlide: /photos/ → /webp/, .jpg → .webp
 */
export function getPhotoDisplayUrl(original: string): string {
    return original.replace(/^(?:\/)?photos\//i, '/webp/').replace(/\.jpe?g$/i, '.webp');
}
