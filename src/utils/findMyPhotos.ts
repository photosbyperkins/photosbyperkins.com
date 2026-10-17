import type { PhotoRecord, SkaterRole } from '../types';
import { withBuild } from './build';

export interface FindTeamEntry {
    name: string;
    slug: string;
    colorHex?: string | null;
    isMeta?: boolean;
    photoCount: number;
    numberedPhotoCount?: number;
    eventCount: number;
    topNumbers: string[];
    numberCounts?: Record<string, number>;
}

export interface FindTeamsIndex {
    v: 1;
    totalNumberedPhotos?: number;
    topNumbers?: string[];
    numberCounts?: Record<string, number>;
    teams: FindTeamEntry[];
}

export interface FindEventEntry {
    /** Year string (e.g. '2025') */
    y: string;
    /** Album slug (e.g. '11-08-sacramento-vs-outlaws') */
    s: string;
    /** Event display title */
    t: string;
}

export interface FindPhotoWire {
    /** Index into TeamFindPayload.events */
    e: number;
    /** 0-based photo index within the event album */
    i: number;
    /** Photo number when it differs from `i + 1`, or raw filename stem when non-standard */
    p?: number | string;
    /** Detected jersey numbers */
    n?: string[];
    /** Detected skater role */
    r?: SkaterRole;
    /** Matched scene tags */
    g?: string[];
    /** 1 if highest-ranked frame in burst */
    b?: 1;
    /** Normalized subject focusX (0..1) */
    x?: number;
    /** Normalized subject focusY (0..1) */
    y?: number;
    /** Base64 ThumbHash placeholder */
    h?: string;
    /** Image width in pixels */
    w?: number;
    /** Image height in pixels */
    ht?: number;
}

export interface TeamFindPayload {
    v: 1;
    team: string;
    slug: string;
    colorHex?: string | null;
    isMeta?: boolean;
    events: FindEventEntry[];
    photos: FindPhotoWire[];
}

export interface ResolvedFindPhoto {
    year: string;
    albumSlug: string;
    eventName: string;
    photoIndex: number;
    photoNumber?: number | string;
    originalUrl: string;
    thumbUrl: string;
    numbers: string[];
    role?: SkaterRole;
    tags: string[];
    bestInBurst: boolean;
    focusX?: number;
    focusY?: number;
    thumbHash?: string;
    width?: number;
    height?: number;
}

export interface FindEventGroup {
    key: string;
    year: string;
    albumSlug: string;
    eventName: string;
    photos: ResolvedFindPhoto[];
}

export interface FindPhotoFilterOptions {
    numberQuery?: string;
    roleFilter?: 'all' | SkaterRole;
    yearFilter?: string;
    onlyBestInBurst?: boolean;
}

export interface ParsedJerseySearchQuery {
    teamQuery: string;
    numberQuery: string;
}

export interface DirectJerseyTeamMatch {
    team: FindTeamEntry;
    matchedNumber: string;
    photoCount: number;
}

let cachedIndex: FindTeamsIndex | null | undefined;
let inflightIndex: Promise<FindTeamsIndex | null> | null = null;
const teamCache = new Map<string, TeamFindPayload | null>();
const inflightTeam = new Map<string, Promise<TeamFindPayload | null>>();

export function clearFindMyPhotosCache(): void {
    cachedIndex = undefined;
    inflightIndex = null;
    teamCache.clear();
    inflightTeam.clear();
}

export async function fetchFindTeamsIndex(): Promise<FindTeamsIndex | null> {
    if (cachedIndex !== undefined) return cachedIndex;
    if (inflightIndex) return inflightIndex;

    if (
        typeof import.meta !== 'undefined' &&
        import.meta.env?.MODE === 'test' &&
        typeof fetch === 'function' &&
        !('mock' in fetch)
    ) {
        cachedIndex = null;
        return null;
    }

    inflightIndex = fetch(withBuild('/data/find/index.json'))
        .then(async (res) => {
            if (!res.ok) {
                cachedIndex = null;
                return null;
            }
            const json = (await res.json()) as FindTeamsIndex;
            if (!json || json.v !== 1 || !Array.isArray(json.teams)) {
                cachedIndex = null;
                return null;
            }
            cachedIndex = json;
            return json;
        })
        .catch(() => {
            cachedIndex = null;
            return null;
        })
        .finally(() => {
            inflightIndex = null;
        });

    return inflightIndex;
}

export async function fetchTeamFindData(teamSlug: string): Promise<TeamFindPayload | null> {
    const cleanSlug = (teamSlug || '').trim().toLowerCase();
    if (!cleanSlug) return null;
    if (teamCache.has(cleanSlug)) return teamCache.get(cleanSlug) ?? null;
    const existing = inflightTeam.get(cleanSlug);
    if (existing) return existing;

    if (
        typeof import.meta !== 'undefined' &&
        import.meta.env?.MODE === 'test' &&
        typeof fetch === 'function' &&
        !('mock' in fetch)
    ) {
        teamCache.set(cleanSlug, null);
        return null;
    }

    const promise = fetch(withBuild(`/data/find/${encodeURIComponent(cleanSlug)}.json`))
        .then(async (res) => {
            if (!res.ok) {
                teamCache.set(cleanSlug, null);
                return null;
            }
            const json = (await res.json()) as TeamFindPayload;
            if (!json || json.v !== 1 || !Array.isArray(json.events) || !Array.isArray(json.photos)) {
                teamCache.set(cleanSlug, null);
                return null;
            }
            teamCache.set(cleanSlug, json);
            return json;
        })
        .catch(() => {
            teamCache.set(cleanSlug, null);
            return null;
        })
        .finally(() => {
            inflightTeam.delete(cleanSlug);
        });

    inflightTeam.set(cleanSlug, promise);
    return promise;
}

function resolvePhotoStem(photoIndex: number, photoNumber?: number | string): string {
    if (typeof photoNumber === 'number' && Number.isFinite(photoNumber)) {
        return `photo_${String(photoNumber).padStart(3, '0')}`;
    }
    if (typeof photoNumber === 'string' && photoNumber.trim()) {
        return photoNumber.trim();
    }
    return `photo_${String(photoIndex + 1).padStart(3, '0')}`;
}

export function resolveTeamFindPhotos(payload: TeamFindPayload | null | undefined): ResolvedFindPhoto[] {
    if (!payload || !Array.isArray(payload.events) || !Array.isArray(payload.photos)) return [];
    const out: ResolvedFindPhoto[] = [];
    for (const p of payload.photos) {
        const ev = payload.events[p.e];
        if (!ev) continue;
        const stem = resolvePhotoStem(p.i, p.p);
        const rawThumb = `/thumbnails/${ev.y}/${ev.s}/${stem}.avif`;
        const rawOriginal = `/photos/${ev.y}/${ev.s}/${stem}.jpg`;
        out.push({
            year: ev.y,
            albumSlug: ev.s,
            eventName: ev.t,
            photoIndex: p.i,
            ...(p.p !== undefined ? { photoNumber: p.p } : {}),
            originalUrl: rawOriginal,
            thumbUrl: withBuild(rawThumb),
            numbers: Array.isArray(p.n) ? p.n : [],
            role: p.r,
            tags: Array.isArray(p.g) ? p.g : [],
            bestInBurst: p.b === 1,
            ...(typeof p.x === 'number' ? { focusX: p.x } : {}),
            ...(typeof p.y === 'number' ? { focusY: p.y } : {}),
            ...(typeof p.h === 'string' && p.h ? { thumbHash: p.h } : {}),
            ...(typeof p.w === 'number' ? { width: p.w } : {}),
            ...(typeof p.ht === 'number' ? { height: p.ht } : {}),
        });
    }
    // Sort reverse-chronologically by year, then eventName descending, then photoIndex ascending
    out.sort((a, b) => {
        if (a.year !== b.year) return b.year.localeCompare(a.year);
        if (a.eventName !== b.eventName) return b.eventName.localeCompare(a.eventName);
        return a.photoIndex - b.photoIndex;
    });
    return out;
}

export function toPhotoRecordFromFindPhoto(item: ResolvedFindPhoto): PhotoRecord {
    const stem = resolvePhotoStem(item.photoIndex, item.photoNumber);
    return {
        original: item.originalUrl,
        thumb: `/thumbnails/${item.year}/${item.albumSlug}/${stem}.avif`,
        eventName: item.eventName,
        year: item.year,
        ...(typeof item.focusX === 'number' ? { focusX: item.focusX } : {}),
        ...(typeof item.focusY === 'number' ? { focusY: item.focusY } : {}),
        ...(item.thumbHash ? { thumbHash: item.thumbHash } : {}),
        ...(typeof item.width === 'number' ? { width: item.width } : {}),
        ...(typeof item.height === 'number' ? { height: item.height } : {}),
    };
}

export function groupFindPhotosByEvent(photos: ResolvedFindPhoto[]): FindEventGroup[] {
    const groups = new Map<string, FindEventGroup>();
    for (const p of photos) {
        const key = `${p.year}/${p.albumSlug}`;
        let group = groups.get(key);
        if (!group) {
            group = {
                key,
                year: p.year,
                albumSlug: p.albumSlug,
                eventName: p.eventName,
                photos: [],
            };
            groups.set(key, group);
        }
        group.photos.push(p);
    }
    return Array.from(groups.values());
}

export function extractJerseyNumbersWithCounts(
    payload: TeamFindPayload | null | undefined
): Array<{ number: string; count: number }> {
    if (!payload || !Array.isArray(payload.photos)) return [];
    const counts = new Map<string, number>();
    for (const p of payload.photos) {
        for (const n of p.n || []) {
            const clean = String(n).trim().toUpperCase();
            if (!clean) continue;
            counts.set(clean, (counts.get(clean) || 0) + 1);
        }
    }
    return Array.from(counts.entries())
        .map(([number, count]) => ({ number, count }))
        .sort((a, b) => b.count - a.count || a.number.localeCompare(b.number, undefined, { numeric: true }));
}

/**
 * Scores a detected jersey number against a user's search query:
 * - `3`: Exact match (`"428"` === `"428"`)
 * - `2`: Prefix match (`"428"` starts with `"42"`)
 * - `1`: Partial-occlusion match:
 *        - Skater searches a 3-4 character number (`"428"`) and OCR captured a 2+ character
 *          prefix/suffix (`"42"` or `"28"`) because an arm or jersey fold cut off an edge digit
 *        - Or photo has a 3-4 character number (`"428"`) and user searched a 2+ character suffix (`"28"`)
 * - `0`: No match
 */
export function scoreJerseyNumberMatch(detectedNumber: string, queryNumber: string): number {
    const upper = (detectedNumber || '').trim().toUpperCase();
    const q = (queryNumber || '').replace(/^#/, '').replace(/\?+/g, '').trim().toUpperCase();
    if (!upper || !q) return 0;
    if (upper === q) return 3;

    // Handle explicit partial numbers marked with '?' (e.g. "42?", "?51", "4?1", "7?")
    if (upper.includes('?')) {
        const core = upper.replace(/\?+/g, '');
        if (!core) return 0;
        if (core === q) return 2;
        if (q.length > core.length) {
            if (upper.startsWith('?') && !upper.endsWith('?') && !upper.slice(1).includes('?')) {
                return q.endsWith(core) ? 1 : 0;
            }
            if (!upper.startsWith('?') && !upper.endsWith('?') && upper.includes('?')) {
                const escapedParts = upper.split('?').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                const re = new RegExp(`^${escapedParts.join('[0-9A-Z]+')}$`);
                return re.test(q) ? 1 : 0;
            }
            if (q.startsWith(core) || q.endsWith(core) || q.includes(core)) {
                return 1;
            }
        }
        return core.startsWith(q) ? 1 : 0;
    }

    if (upper.startsWith(q)) return 2;
    if (q.length >= 3 && upper.length >= 2 && (q.startsWith(upper) || q.endsWith(upper))) {
        return 1;
    }
    if (upper.length >= 3 && q.length >= 2 && upper.endsWith(q)) {
        return 1;
    }
    return 0;
}

/**
 * Computes a partial-match relevance score when no exact jersey number match exists.
 */
export function scorePartialJerseyCandidate(cand: string, query: string): number {
    const c = cand.trim().replace(/^#/, '').toUpperCase();
    const q = query.trim().replace(/^#/, '').toUpperCase();
    if (!c || !q) return 0;

    const baseTier = scoreJerseyNumberMatch(c, q);
    if (baseTier > 0) return baseTier * 30;

    // Reverse substring match (e.g. searching "315" suggests "#31" and "#15")
    if (q.length >= 2 && c.length >= 1 && q.includes(c)) {
        return 55;
    }

    // 1-digit difference for same-length numbers (e.g. "49" -> "48", "40")
    if (c.length === q.length && c.length >= 2) {
        let diffs = 0;
        for (let i = 0; i < c.length; i++) {
            if (c[i] !== q[i]) diffs++;
        }
        if (diffs === 1) return 45;
    }

    return 0;
}

export function filterTeamFindPhotos(
    payload: TeamFindPayload | null | undefined,
    options: FindPhotoFilterOptions = {}
): ResolvedFindPhoto[] {
    const resolved = resolveTeamFindPhotos(payload);
    const numQuery = (options.numberQuery || '').replace(/^#/, '').trim().toUpperCase();
    const roleFilter = options.roleFilter && options.roleFilter !== 'all' ? options.roleFilter : null;
    const yearFilter = options.yearFilter && options.yearFilter !== 'all' ? options.yearFilter.trim() : null;
    const onlyBest = Boolean(options.onlyBestInBurst);

    const scored: Array<{ photo: ResolvedFindPhoto; tier: number }> = [];
    for (const photo of resolved) {
        let bestTier = 3;
        if (numQuery) {
            bestTier = 0;
            for (const n of photo.numbers) {
                const t = scoreJerseyNumberMatch(n, numQuery);
                if (t > bestTier) bestTier = t;
            }
            if (bestTier === 0) continue;
        }
        if (roleFilter && photo.role !== roleFilter) {
            continue;
        }
        if (yearFilter && photo.year !== yearFilter) {
            continue;
        }
        if (onlyBest && !photo.bestInBurst) {
            continue;
        }
        scored.push({ photo, tier: bestTier });
    }

    if (numQuery) {
        scored.sort((a, b) => b.tier - a.tier);
    }
    return scored.map((entry) => entry.photo);
}

/**
 * Parses a combined search query like `"#42"`, `"42"`, `"Sacramento #42"`, or `"Bruin 88"`
 * into `{ teamQuery, numberQuery }`.
 */
export function parseJerseySearchQuery(rawQuery: string): ParsedJerseySearchQuery {
    const trimmed = (rawQuery || '').trim();
    if (!trimmed) return { teamQuery: '', numberQuery: '' };

    // Pure `#42` or `42`
    const pureNumberMatch = trimmed.match(/^#?(\d{1,4}[A-Za-z]?|[A-Za-z]\d{1,3})$/);
    if (pureNumberMatch) {
        return { teamQuery: '', numberQuery: pureNumberMatch[1].toUpperCase() };
    }

    // Trailing or leading `#42` / `42` with team text, e.g. `Sacramento #42` or `#42 Sacramento`
    const trailingMatch = trimmed.match(/^(.*?)\s+#?(\d{1,4}[A-Za-z]?)$/);
    if (trailingMatch && trailingMatch[1].trim()) {
        return {
            teamQuery: trailingMatch[1].trim().toLowerCase(),
            numberQuery: trailingMatch[2].toUpperCase(),
        };
    }

    const leadingMatch = trimmed.match(/^#?(\d{1,4}[A-Za-z]?)\s+(.+)$/);
    if (leadingMatch && leadingMatch[2].trim()) {
        return {
            teamQuery: leadingMatch[2].trim().toLowerCase(),
            numberQuery: leadingMatch[1].toUpperCase(),
        };
    }

    return { teamQuery: trimmed.replace(/^#/, '').trim().toLowerCase(), numberQuery: '' };
}

/**
 * Finds direct `(team, #Jersey)` matches across `FindTeamsIndex` for the `#Jersey` Global Search tab.
 */
export function findDirectJerseyMatches(
    teams: FindTeamEntry[],
    rawQuery: string
): DirectJerseyTeamMatch[] {
    const { teamQuery, numberQuery } = parseJerseySearchQuery(rawQuery);
    if (!numberQuery) return [];
    const teamLower = teamQuery.toLowerCase();

    const matches: Array<DirectJerseyTeamMatch & { tier: number }> = [];
    for (const team of teams) {
        if (
            teamLower &&
            !team.name.toLowerCase().includes(teamLower) &&
            !team.slug.toLowerCase().includes(teamLower)
        ) {
            continue;
        }

        const countsMap = team.numberCounts || {};
        const candidates = team.topNumbers || [];
        for (const num of candidates) {
            const upper = num.toUpperCase();
            const tier = scoreJerseyNumberMatch(upper, numberQuery);
            if (tier > 0) {
                matches.push({
                    team,
                    matchedNumber: upper,
                    photoCount: countsMap[num] ?? countsMap[upper] ?? 1,
                    tier,
                });
            }
        }
    }

    return matches
        .sort((a, b) => {
            if (a.tier !== b.tier) return b.tier - a.tier;
            if (Boolean(a.team.isMeta) !== Boolean(b.team.isMeta)) return a.team.isMeta ? -1 : 1;
            return b.photoCount - a.photoCount || a.team.name.localeCompare(b.team.name);
        })
        .map(({ team, matchedNumber, photoCount }) => ({ team, matchedNumber, photoCount }));
}
