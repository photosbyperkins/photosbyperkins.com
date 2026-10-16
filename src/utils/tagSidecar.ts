import type { EventTagSidecar, PhotoTagEntry } from '../types';

export type EventTagFilter =
    | 'all'
    | 'role:jammer'
    | 'role:pivot'
    | 'role:ref'
    | 'role:spectator'
    | 'action'
    | 'has-number'
    | 'best-burst'
    | `number:${string}`
    | `tag:${string}`
    | `team:${0 | 1}`;

const ACTION_TAGS = new Set([
    'apex-jump',
    'big-hit',
    'fall',
    'jammer-breakaway',
    'star-pass',
    'celebration',
]);

const sidecarCache = new Map<string, EventTagSidecar | null>();
const inflightRequests = new Map<string, Promise<EventTagSidecar | null>>();

function makeSidecarKey(year: string, albumSlug: string): string {
    return `${year.trim()}/${albumSlug.trim()}`;
}

export function getCachedEventTagSidecar(year?: string, albumSlug?: string): EventTagSidecar | null | undefined {
    if (!year || !albumSlug) return undefined;
    return sidecarCache.get(makeSidecarKey(year, albumSlug));
}

export function clearEventTagSidecarCache(): void {
    sidecarCache.clear();
    inflightRequests.clear();
}

export function slugifyEventName(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}

export async function fetchEventTagSidecar(year?: string, albumSlug?: string): Promise<EventTagSidecar | null> {
    if (!year || !albumSlug) return null;
    const key = makeSidecarKey(year, albumSlug);
    if (sidecarCache.has(key)) {
        return sidecarCache.get(key) ?? null;
    }
    const existing = inflightRequests.get(key);
    if (existing) return existing;

    if (
        typeof import.meta !== 'undefined' &&
        import.meta.env?.MODE === 'test' &&
        typeof fetch === 'function' &&
        !('mock' in fetch)
    ) {
        sidecarCache.set(key, null);
        return null;
    }

    const url = `/data/tags/${encodeURIComponent(year)}/${encodeURIComponent(albumSlug)}.json`;
    const promise = fetch(url)
        .then(async (res) => {
            if (!res.ok) {
                sidecarCache.set(key, null);
                return null;
            }
            const json = (await res.json()) as EventTagSidecar;
            if (!json || json.v !== 1 || typeof json.photos !== 'object') {
                sidecarCache.set(key, null);
                return null;
            }
            sidecarCache.set(key, json);
            return json;
        })
        .catch(() => {
            sidecarCache.set(key, null);
            return null;
        })
        .finally(() => {
            inflightRequests.delete(key);
        });

    inflightRequests.set(key, promise);
    return promise;
}

export function getPhotoTagEntry(
    sidecar: EventTagSidecar | null | undefined,
    photoIndex: number
): PhotoTagEntry | null {
    if (!sidecar || !sidecar.photos) return null;
    return sidecar.photos[String(photoIndex)] || null;
}

export function getPhotoSceneTags(sidecar: EventTagSidecar | null | undefined, photoIndex: number): string[] {
    const entry = getPhotoTagEntry(sidecar, photoIndex);
    if (!entry || !Array.isArray(entry.t) || !Array.isArray(sidecar?.vocab)) return [];
    return entry.t
        .map((idx) => sidecar!.vocab[idx])
        .filter((t): t is string => typeof t === 'string' && t.length > 0);
}

export function matchesEventTagFilter(
    sidecar: EventTagSidecar | null | undefined,
    photoIndex: number,
    filter: EventTagFilter
): boolean {
    if (filter === 'all' || !sidecar) return true;
    const entry = getPhotoTagEntry(sidecar, photoIndex);
    if (!entry) return false;

    if (filter === 'role:jammer') {
        return entry.r === 'jammer';
    }
    if (filter === 'role:pivot') {
        return entry.r === 'pivot';
    }
    if (filter === 'role:ref') {
        return entry.r === 'ref';
    }
    if (filter === 'role:spectator') {
        return entry.r === 'spectator';
    }
    if (filter === 'best-burst') {
        return entry.b === 1;
    }
    if (filter === 'has-number') {
        return Array.isArray(entry.n) && entry.n.length > 0;
    }
    if (filter.startsWith('number:')) {
        const target = filter.slice('number:'.length).trim().toUpperCase();
        return Array.isArray(entry.n) && entry.n.some((num) => num.toUpperCase() === target);
    }
    if (filter === 'team:0') {
        return entry.tm === 0;
    }
    if (filter === 'team:1') {
        return entry.tm === 1;
    }
    const sceneTags = getPhotoSceneTags(sidecar, photoIndex);
    if (filter === 'action') {
        return (
            entry.r === 'jammer' ||
            entry.r === 'pivot' ||
            sceneTags.some((t) => ACTION_TAGS.has(t))
        );
    }
    if (filter.startsWith('tag:')) {
        const targetTag = filter.slice('tag:'.length);
        return sceneTags.includes(targetTag);
    }
    return true;
}

export interface AvailableEventPill {
    filter: EventTagFilter;
    label: string;
    count: number;
    colorHex?: string | null;
}

export function computeAvailableEventPills(
    sidecar: EventTagSidecar | null | undefined,
    totalPhotos: number
): AvailableEventPill[] {
    if (!sidecar || !sidecar.photos || totalPhotos <= 0) return [];

    const entries = Object.values(sidecar.photos);
    if (entries.length === 0) return [];

    const pills: AvailableEventPill[] = [
        { filter: 'all', label: 'All Photos', count: totalPhotos },
    ];

    let jammerCount = 0;
    let pivotCount = 0;
    let actionCount = 0;
    let numberCount = 0;
    let team0Count = 0;
    let team1Count = 0;
    const tagCounts = new Map<string, number>();

    for (let i = 0; i < totalPhotos; i++) {
        const entry = getPhotoTagEntry(sidecar, i);
        if (!entry) continue;
        if (entry.r === 'jammer') jammerCount++;
        if (entry.r === 'pivot') pivotCount++;
        if (Array.isArray(entry.n) && entry.n.length > 0) numberCount++;
        if (entry.tm === 0) team0Count++;
        if (entry.tm === 1) team1Count++;
        if (matchesEventTagFilter(sidecar, i, 'action')) actionCount++;

        for (const tag of getPhotoSceneTags(sidecar, i)) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
    }

    if (jammerCount > 0) {
        pills.push({ filter: 'role:jammer', label: '★ Jammer', count: jammerCount });
    }
    if (pivotCount > 0) {
        pills.push({ filter: 'role:pivot', label: '⚡ Pivot', count: pivotCount });
    }
    if (actionCount > 0) {
        pills.push({ filter: 'action', label: '🔥 Action', count: actionCount });
    }
    if (numberCount > 0) {
        pills.push({ filter: 'has-number', label: '# Jersey Numbers', count: numberCount });
    }

    if (Array.isArray(sidecar.teams) && sidecar.teams.length >= 2) {
        if (team0Count > 0 && sidecar.teams[0]?.name) {
            pills.push({
                filter: 'team:0',
                label: sidecar.teams[0].name,
                count: team0Count,
                colorHex: sidecar.teams[0].jerseyColorHex,
            });
        }
        if (team1Count > 0 && sidecar.teams[1]?.name) {
            pills.push({
                filter: 'team:1',
                label: sidecar.teams[1].name,
                count: team1Count,
                colorHex: sidecar.teams[1].jerseyColorHex,
            });
        }
    }

    const prettyTagLabels: Record<string, string> = {
        'apex-jump': 'Apex Jump',
        'big-hit': 'Big Hit',
        fall: 'Fall',
        pack: 'Pack',
        'jammer-breakaway': 'Breakaway',
        'star-pass': 'Star Pass',
        celebration: 'Celebration',
        huddle: 'Huddle',
        bench: 'Bench',
        referee: 'Referee',
        crowd: 'Crowd',
        portrait: 'Portrait',
        'team-photo': 'Team Photo',
    };

    const sortedTags = Array.from(tagCounts.entries())
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    for (const [tag, count] of sortedTags) {
        pills.push({
            filter: `tag:${tag}`,
            label: prettyTagLabels[tag] || tag,
            count,
        });
    }

    return pills.length > 1 ? pills : [];
}
