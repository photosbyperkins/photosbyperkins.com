import fs from 'fs';
import path from 'path';
import type { EventScore } from '../../src/types.js';

export interface EventTeamMetadata {
    name: string;
    jerseyColorHex?: string | null;
    score?: number | string | null;
}

export interface EventMetadataJson {
    version: 1;
    title?: string;
    date?: string | null;
    description?: string | null;
    isJuniorBout?: boolean;
    teams?: EventTeamMetadata[];
    localScore?: EventScore;
    coverPhoto?: string | null;
    hiddenPhotos?: string[];
}

export interface ResolvedEventMetadata {
    version: 1;
    title: string;
    date: string | null;
    description: string | null;
    isJuniorBout: boolean;
    teams: EventTeamMetadata[];
    localScore: EventScore;
    coverPhoto: string | null;
    hiddenPhotos: Set<string>;
    sourceFile: 'event.json' | 'score.json' | 'inferred';
}

const KNOWN_TEAM_JERSEY_COLORS: Record<string, string> = {
    sacramento: '#4B2E83',
    'sacramento a': '#4B2E83',
    'sacramento b': '#6A4C93',
    'capital maulers': '#4B2E83',
    outlaws: '#1C1C1C',
    'bashing dead': '#2D6A4F',
    faultline: '#D90429',
    carquinez: '#0077B6',
    'bay area': '#F77F00',
    'bay area b': '#F77F00',
    resurrection: '#7209B7',
    'greater seattle': '#008080',
    'penn jersey': '#C1121F',
    'jet city': '#1D3557',
    'rat city': '#2B9348',
    'angel city': '#D4AF37',
    'rose city': '#E63946',
    'santa cruz': '#0096C7',
    'silicon valley': '#3A86FF',
    peninsula: '#FB8500',
    'humboldt': '#386641',
    'sierra regional': '#8D99AE',
};

/**
 * Auto-detects whether an event folder or team list represents a junior roller derby bout
 * (used to automatically skip jersey OCR for minor privacy protection).
 */
export function detectIsJuniorBout(eventFolderName: string, teams: string[] = []): boolean {
    const combined = [eventFolderName, ...teams].join(' ');
    return (
        /\b(?:jr\.?|juniors?|jrda|u1[2-9]|youth|kids)\b/i.test(combined) ||
        /\(\s*jb\s*\)/i.test(combined) ||
        /\bjb\s+vs\.?\b/i.test(combined) ||
        /\bvs\.?\s+.*\bjb\b/i.test(combined)
    );
}

/**
 * Strips leading `MM.DD ` date prefixes and trailing `(JB)` / `(G2)` annotations
 * to extract the two competing team names from an event folder name.
 */
export function parseEventTeamsFromFolder(eventFolderName: string): string[] {
    const withoutDate = eventFolderName.replace(/^\d{1,2}\.\d{1,2}\s+/, '').trim();
    const withoutSuffix = withoutDate.replace(/\s*\((?:JB|Jr\.?|G\d+|Game\s*\d+)\)\s*$/i, '').trim();
    const parts = withoutSuffix.split(/\s+vs\.?\s+/i).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
        return [parts[0], parts.slice(1).join(' vs ')];
    }
    return withoutSuffix ? [withoutSuffix] : [];
}

/**
 * Returns a default jersey hex color for known recurring teams when not explicitly configured.
 */
export function inferTeamJerseyColorHex(teamName: string): string | null {
    const normalized = teamName
        .toLowerCase()
        .replace(/\(\s*jb\s*\)/g, '')
        .replace(/\b(?:jr\.?|juniors?)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (KNOWN_TEAM_JERSEY_COLORS[normalized]) {
        return KNOWN_TEAM_JERSEY_COLORS[normalized];
    }
    for (const [key, hex] of Object.entries(KNOWN_TEAM_JERSEY_COLORS)) {
        if (normalized.includes(key)) {
            return hex;
        }
    }
    return null;
}

function normalizeScoreValue(val: unknown): number | string | null {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') {
        const trimmed = val.trim();
        const asNum = Number(trimmed);
        return Number.isFinite(asNum) ? asNum : trimmed;
    }
    return null;
}

/**
 * Loads `event.json` (with 100% backward-compatible fallback to `score.json` and folder inference).
 */
export function loadEventMetadata(
    eventDir: string,
    eventFolderName: string,
    wftdaMatch?: { team1?: string; team2?: string; score1?: number | string; score2?: number | string } | null
): ResolvedEventMetadata {
    const eventJsonPath = path.join(eventDir, 'event.json');
    const scoreJsonPath = path.join(eventDir, 'score.json');

    let rawEvent: Partial<EventMetadataJson> | null = null;
    let rawScore: Record<string, unknown> | null = null;
    let sourceFile: 'event.json' | 'score.json' | 'inferred' = 'inferred';

    if (fs.existsSync(eventJsonPath)) {
        try {
            rawEvent = JSON.parse(fs.readFileSync(eventJsonPath, 'utf8'));
            sourceFile = 'event.json';
        } catch {
            rawEvent = null;
        }
    }

    if (fs.existsSync(scoreJsonPath)) {
        try {
            rawScore = JSON.parse(fs.readFileSync(scoreJsonPath, 'utf8'));
            if (!rawEvent) sourceFile = 'score.json';
        } catch {
            rawScore = null;
        }
    }

    const parsedNames = parseEventTeamsFromFolder(eventFolderName);
    const defaultTeam1Name = parsedNames[0] || wftdaMatch?.team1 || 'Team 1';
    const defaultTeam2Name = parsedNames[1] || wftdaMatch?.team2 || null;

    // Resolve localScore with priority: event.json localScore -> event.json teams[].score -> score.json -> wftdaMatch
    const team1Score =
        normalizeScoreValue(rawEvent?.localScore?.team1Score) ??
        normalizeScoreValue(rawEvent?.teams?.[0]?.score) ??
        normalizeScoreValue(rawScore?.team1Score) ??
        normalizeScoreValue(wftdaMatch?.score1);

    const team2Score =
        normalizeScoreValue(rawEvent?.localScore?.team2Score) ??
        normalizeScoreValue(rawEvent?.teams?.[1]?.score) ??
        normalizeScoreValue(rawScore?.team2Score) ??
        normalizeScoreValue(wftdaMatch?.score2);

    const localScore: EventScore = {
        team1Score,
        team2Score,
    };

    let teams: EventTeamMetadata[] = [];
    if (Array.isArray(rawEvent?.teams) && rawEvent.teams.length > 0) {
        teams = rawEvent.teams.map((t, idx) => {
            const name = (t?.name || (idx === 0 ? defaultTeam1Name : defaultTeam2Name || `Team ${idx + 1}`)).trim();
            return {
                name,
                jerseyColorHex: t?.jerseyColorHex ?? inferTeamJerseyColorHex(name),
                score: normalizeScoreValue(t?.score) ?? (idx === 0 ? team1Score : idx === 1 ? team2Score : null),
            };
        });
    } else if (defaultTeam2Name) {
        teams = [
            {
                name: defaultTeam1Name,
                jerseyColorHex: inferTeamJerseyColorHex(defaultTeam1Name),
                score: team1Score,
            },
            {
                name: defaultTeam2Name,
                jerseyColorHex: inferTeamJerseyColorHex(defaultTeam2Name),
                score: team2Score,
            },
        ];
    } else if (defaultTeam1Name) {
        teams = [
            {
                name: defaultTeam1Name,
                jerseyColorHex: inferTeamJerseyColorHex(defaultTeam1Name),
                score: team1Score,
            },
        ];
    }

    const isJuniorBout =
        typeof rawEvent?.isJuniorBout === 'boolean'
            ? rawEvent.isJuniorBout
            : detectIsJuniorBout(
                  eventFolderName,
                  teams.map((t) => t.name)
              );

    const hiddenPhotos = new Set<string>(
        Array.isArray(rawEvent?.hiddenPhotos)
            ? rawEvent.hiddenPhotos
                  .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
                  .map((p) => path.basename(p.trim()).toLowerCase())
            : []
    );

    const coverPhoto =
        typeof rawEvent?.coverPhoto === 'string' && rawEvent.coverPhoto.trim().length > 0
            ? rawEvent.coverPhoto.trim()
            : null;

    return {
        version: 1,
        title: typeof rawEvent?.title === 'string' && rawEvent.title.trim() ? rawEvent.title.trim() : eventFolderName,
        date: typeof rawEvent?.date === 'string' && rawEvent.date.trim() ? rawEvent.date.trim() : null,
        description:
            typeof rawEvent?.description === 'string' && rawEvent.description.trim()
                ? rawEvent.description.trim()
                : null,
        isJuniorBout,
        teams,
        localScore,
        coverPhoto,
        hiddenPhotos,
        sourceFile,
    };
}

/**
 * Constructs a clean, serializable `event.json` payload for an event directory.
 */
export function buildEventJsonFromDirectory(
    eventDir: string,
    eventFolderName: string,
    wftdaMatch?: { team1?: string; team2?: string; score1?: number | string; score2?: number | string } | null
): EventMetadataJson {
    const resolved = loadEventMetadata(eventDir, eventFolderName, wftdaMatch);
    return {
        version: 1,
        title: resolved.title,
        ...(resolved.date ? { date: resolved.date } : {}),
        ...(resolved.description ? { description: resolved.description } : {}),
        isJuniorBout: resolved.isJuniorBout,
        teams: resolved.teams,
        localScore: resolved.localScore,
        coverPhoto: resolved.coverPhoto,
        hiddenPhotos: Array.from(resolved.hiddenPhotos),
    };
}
