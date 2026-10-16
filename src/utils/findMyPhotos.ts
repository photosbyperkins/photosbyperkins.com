import type { SkaterRole } from '../types';
import { withBuild } from './build';

export interface FindTeamEntry {
    name: string;
    slug: string;
    colorHex?: string | null;
    photoCount: number;
    eventCount: number;
    topNumbers: string[];
}

export interface FindTeamsIndex {
    v: 1;
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
    /** Detected jersey numbers */
    n?: string[];
    /** Detected skater role */
    r?: SkaterRole;
    /** Matched scene tags */
    g?: string[];
    /** 1 if highest-ranked frame in burst */
    b?: 1;
}

export interface TeamFindPayload {
    v: 1;
    team: string;
    slug: string;
    colorHex?: string | null;
    events: FindEventEntry[];
    photos: FindPhotoWire[];
}

export interface ResolvedFindPhoto {
    year: string;
    albumSlug: string;
    eventName: string;
    photoIndex: number;
    thumbUrl: string;
    numbers: string[];
    role?: SkaterRole;
    tags: string[];
    bestInBurst: boolean;
}

export interface FindPhotoFilterOptions {
    numberQuery?: string;
    roleFilter?: 'all' | SkaterRole;
    yearFilter?: string;
    onlyBestInBurst?: boolean;
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

export function resolveTeamFindPhotos(payload: TeamFindPayload | null | undefined): ResolvedFindPhoto[] {
    if (!payload || !Array.isArray(payload.events) || !Array.isArray(payload.photos)) return [];
    const out: ResolvedFindPhoto[] = [];
    for (const p of payload.photos) {
        const ev = payload.events[p.e];
        if (!ev) continue;
        const padNum = `photo_${String(p.i + 1).padStart(3, '0')}.avif`;
        out.push({
            year: ev.y,
            albumSlug: ev.s,
            eventName: ev.t,
            photoIndex: p.i,
            thumbUrl: withBuild(`/thumbnails/${ev.y}/${ev.s}/${padNum}`),
            numbers: Array.isArray(p.n) ? p.n : [],
            role: p.r,
            tags: Array.isArray(p.g) ? p.g : [],
            bestInBurst: p.b === 1,
        });
    }
    return out;
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

export function filterTeamFindPhotos(
    payload: TeamFindPayload | null | undefined,
    options: FindPhotoFilterOptions = {}
): ResolvedFindPhoto[] {
    const resolved = resolveTeamFindPhotos(payload);
    const numQuery = (options.numberQuery || '').replace(/^#/, '').trim().toUpperCase();
    const roleFilter = options.roleFilter && options.roleFilter !== 'all' ? options.roleFilter : null;
    const yearFilter = options.yearFilter && options.yearFilter !== 'all' ? options.yearFilter.trim() : null;
    const onlyBest = Boolean(options.onlyBestInBurst);

    return resolved.filter((photo) => {
        if (numQuery) {
            const matchesNum = photo.numbers.some((n) => {
                const upper = n.toUpperCase();
                return upper === numQuery || upper.startsWith(numQuery);
            });
            if (!matchesNum) return false;
        }
        if (roleFilter && photo.role !== roleFilter) {
            return false;
        }
        if (yearFilter && photo.year !== yearFilter) {
            return false;
        }
        if (onlyBest && !photo.bestInBurst) {
            return false;
        }
        return true;
    });
}
