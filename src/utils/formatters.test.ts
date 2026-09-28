import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    formatTeamName,
    getTeamNameFormats,
    getPhotoDisplayUrl,
    findEarliestEventForTeam,
    parseEventTitle,
    escapeXml,
    formatCameraModel,
} from './formatters';

// Inject a known abbreviation map so tests don't depend on VITE_TEAM_ABBREVIATIONS env.
vi.mock('./constants', () => ({
    TEAM_ABBREVIATIONS: {
        'Sacramento Roller Derby': 'SRD',
        'Rat City Roller Derby': 'RCRD',
        'Bay Area Derby': 'BAD',
        'Carson Junior Victory Rollers': 'Carson Jr. Victory Rollers',
        'Happy Valley Derby Darlins': 'HVDD',
        'San Luis Obispo County Junior Roller Derby': 'SLOCO Juniors',
        'San Luis Obispo County Roller Derby': 'SLOCO',
        'Rose City Rollers': 'RCR',
        'Rose City': 'RCR',
        'California Derby Galaxy': 'CDG',
        'Sacred City Roller Derby': 'SCRD',
        'Sacred City': 'SCRD',
        Juarez: 'Juárez',
        Headshots: '',
    },
}));

describe('formatTeamName', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('abbreviates known teams properly', () => {
        expect(formatTeamName('Sacramento Roller Derby')).toBe('SRD');
        expect(formatTeamName('Rat City Roller Derby')).toBe('RCRD');
        expect(formatTeamName('Bay Area Derby')).toBe('BAD');
        expect(formatTeamName('Carson Junior Victory Rollers')).toBe('Carson Jr. Victory Rollers');
        expect(formatTeamName('Happy Valley Derby Darlins')).toBe('HVDD');
        expect(formatTeamName('Juarez')).toBe('Juárez');
        expect(formatTeamName('Headshots')).toBe('');
    });

    it('strips "Roller Derby" from names that are not fully abbreviated', () => {
        expect(formatTeamName('Seattle Roller Derby')).toBe('Seattle');
        expect(formatTeamName('Gotham Girls Roller Derby')).toBe('Gotham Girls');
    });

    it('leaves names unchanged if no rules apply', () => {
        expect(formatTeamName('Gotham Rollergirls')).toBe('Gotham Rollergirls');
        expect(formatTeamName('Texas Rollergirls')).toBe('Texas Rollergirls');
    });
});

describe('getTeamNameFormats', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('returns progressive truncation formats properly', () => {
        const formats = getTeamNameFormats('Sacramento Roller Derby Capital Maulstars');
        expect(formats.full).toBe('Sacramento Roller Derby Capital Maulstars');
        expect(formats.mid).toBe('SRD Capital Maulstars');
        expect(formats.short).toBe('Capital Maulstars');
    });

    it('preserves short names consistently due to length guards', () => {
        const formats = getTeamNameFormats('SRD Team');
        expect(formats.full).toBe('SRD Team');
        expect(formats.mid).toBe('SRD Team');
        expect(formats.short).toBe('SRD Team'); // SRD Team is < 15 chars so it skips aggressive truncation
    });

    it('preserves generic abbreviation if it is the only word left', () => {
        const formats = getTeamNameFormats('SRD Round Robin');
        expect(formats.full).toBe('SRD Round Robin');
        expect(formats.mid).toBe('SRD Round Robin');
        expect(formats.short).toBe('SRD');
    });

    it('does not over-truncate single word teams', () => {
        const formats = getTeamNameFormats('Juarez All Stars');
        expect(formats.full).toBe('Juarez All Stars');
        expect(formats.mid).toBe('Juárez All Stars');
        expect(formats.short).toBe('Juárez');
    });

    it('formats San Luis Obispo County Junior Roller Derby correctly with SLOCO short mode', () => {
        const formats = getTeamNameFormats('San Luis Obispo County Junior Roller Derby');
        expect(formats.full).toBe('San Luis Obispo County Junior Roller Derby');
        expect(formats.mid).toBe('SLOCO Juniors');
        expect(formats.short).toBe('SLOCO');
    });

    it('formats Rose City High Rollers to High Rollers in short mode', () => {
        const formats = getTeamNameFormats('Rose City High Rollers');
        expect(formats.full).toBe('Rose City High Rollers');
        expect(formats.mid).toBe('RCR High Rollers');
        expect(formats.short).toBe('High Rollers');
    });

    it('formats California Derby Galaxy Big Bang to Big Bang in short mode', () => {
        const formats = getTeamNameFormats('California Derby Galaxy Big Bang');
        expect(formats.full).toBe('California Derby Galaxy Big Bang');
        expect(formats.mid).toBe('CDG Big Bang');
        expect(formats.short).toBe('Big Bang');
    });

    it('formats Sacred City Disciples to Disciples in short mode', () => {
        const formats = getTeamNameFormats('Sacred City Disciples');
        expect(formats.full).toBe('Sacred City Disciples');
        expect(formats.mid).toBe('SCRD Disciples');
        expect(formats.short).toBe('Disciples');
    });
});

describe('getPhotoDisplayUrl', () => {
    it('transforms /photos/ path with .jpg to /avif/ path with .avif', () => {
        expect(getPhotoDisplayUrl('/photos/2026/event/photo_001.jpg')).toBe('/avif/2026/event/photo_001.avif');
        expect(getPhotoDisplayUrl('photos/2026/event/photo_001.jpeg')).toBe('/avif/2026/event/photo_001.avif');
        expect(getPhotoDisplayUrl('/photos/2024/championships/photo_042.JPG')).toBe(
            '/avif/2024/championships/photo_042.avif'
        );
    });
});

describe('findEarliestEventForTeam', () => {
    // Reverse-chronological list of events as received from yearData
    const sample2026Events: [string, { albumSlug?: string }][] = [
        [
            '09.19 Sacramento Roller Derby Kodiak Attack vs Motherlode Area Derby',
            { albumSlug: '0919-sacramento-roller-derby-kodiak-attack-vs-motherlode-area-derby' },
        ],
        [
            '05.07 Sacramento Roller Derby Bruin Trouble vs Floodwater Roller Derby',
            { albumSlug: '0507-sacramento-roller-derby-bruin-trouble-vs-floodwater-roller-derby' },
        ],
        [
            '03.07 Sacramento Roller Derby Bruin Trouble vs North Bay Derby',
            { albumSlug: '0307-sacramento-roller-derby-bruin-trouble-vs-north-bay-derby' },
        ],
        [
            '02.21 Sacramento Roller Derby Juniors Beastie Bears vs Outlaw Roller Derby Bandits',
            { albumSlug: '0221-sacramento-roller-derby-juniors-beastie-bears-vs-outlaw-roller-derby-bandits' },
        ],
        [
            '02.21 Sacramento Roller Derby Kodiak Attack vs Bay Area Derby Bones',
            { albumSlug: '0221-sacramento-roller-derby-kodiak-attack-vs-bay-area-derby-bones' },
        ],
    ];

    it('matches Motherlode Area Derby correctly without false positive on Bay Area Derby Bones', () => {
        const result = findEarliestEventForTeam(sample2026Events, 'Motherlode Area Derby');
        expect(result).toBe('09.19 Sacramento Roller Derby Kodiak Attack vs Motherlode Area Derby');
    });

    it('matches Floodwater Roller Derby without false positive on Outlaw Roller Derby Bandits', () => {
        const result = findEarliestEventForTeam(sample2026Events, 'Floodwater Roller Derby');
        expect(result).toBe('05.07 Sacramento Roller Derby Bruin Trouble vs Floodwater Roller Derby');
    });

    it('matches North Bay Derby without false positive on Bay Area Derby Bones', () => {
        const result = findEarliestEventForTeam(sample2026Events, 'North Bay Derby');
        expect(result).toBe('03.07 Sacramento Roller Derby Bruin Trouble vs North Bay Derby');
    });

    it('matches Bay Area Derby Bones when specifically requested', () => {
        const result = findEarliestEventForTeam(sample2026Events, 'Bay Area Derby Bones');
        expect(result).toBe('02.21 Sacramento Roller Derby Kodiak Attack vs Bay Area Derby Bones');
    });

    it('returns null if team is not found or inputs are empty', () => {
        expect(findEarliestEventForTeam(sample2026Events, 'Nonexistent Team')).toBeNull();
        expect(findEarliestEventForTeam([], 'Motherlode Area Derby')).toBeNull();
        expect(findEarliestEventForTeam(sample2026Events, '')).toBeNull();
    });
});

describe('parseEventTitle', () => {
    it('correctly parses teams and detects versus match', () => {
        const parsed = parseEventTitle('05.10 Sacramento Roller Derby vs Bay Area Derby', '2026');
        expect(parsed.baseDatePrefix).toBe('05.10');
        expect(parsed.mainTitle).toBe('Sacramento Roller Derby vs Bay Area Derby');
        expect(parsed.teams).toEqual(['Sacramento Roller Derby', 'Bay Area Derby']);
        expect(parsed.isVersusMatch).toBe(true);
    });

    it('handles "versus" and "vs." case-insensitively', () => {
        const parsed = parseEventTitle('03.14 Team Alpha versus Team Beta', '2026');
        expect(parsed.teams).toEqual(['Team Alpha', 'Team Beta']);
        expect(parsed.isVersusMatch).toBe(true);

        const parsedDot = parseEventTitle('03.14 Team Alpha vs. Team Beta', '2026');
        expect(parsedDot.teams).toEqual(['Team Alpha', 'Team Beta']);
        expect(parsedDot.isVersusMatch).toBe(true);
    });

    it('identifies non-versus events cleanly', () => {
        const parsed = parseEventTitle('04.01 Annual League Headshots', '2026');
        expect(parsed.baseDatePrefix).toBe('04.01');
        expect(parsed.mainTitle).toBe('Annual League Headshots');
        expect(parsed.teams).toEqual(['Annual League Headshots']);
        expect(parsed.isVersusMatch).toBe(false);
    });

    it('handles bracketed year prefix correctly', () => {
        const parsed = parseEventTitle('[2025] 11.20 Team A vs Team B');
        expect(parsed.parsedYear).toBe('2025');
        expect(parsed.baseDatePrefix).toBe('11.20');
        expect(parsed.teams).toEqual(['Team A', 'Team B']);
        expect(parsed.isVersusMatch).toBe(true);
    });
});

describe('escapeXml', () => {
    it('escapes basic xml entities', () => {
        expect(escapeXml('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        );
        expect(escapeXml("Tom & Jerry's")).toBe('Tom &amp; Jerry&apos;s');
    });

    it('returns empty string when given empty string', () => {
        expect(escapeXml('')).toBe('');
    });

    it('returns original string when no special characters present', () => {
        expect(escapeXml('1/3200 sec F2.8 ISO 1600 70mm')).toBe('1/3200 sec F2.8 ISO 1600 70mm');
    });
});

describe('formatCameraModel', () => {
    it('normalizes Z5_2 to Z 5 II', () => {
        expect(formatCameraModel('Z5_2')).toBe('Z 5 II');
        expect(formatCameraModel('NIKON Z5_2')).toBe('NIKON Z 5 II');
        expect(formatCameraModel('NIKON ℤ5_2')).toBe('NIKON ℤ 5 II');
    });

    it('preserves standard camera models unchanged', () => {
        expect(formatCameraModel('NIKON ℤ8')).toBe('NIKON ℤ8');
        expect(formatCameraModel('NIKON D850')).toBe('NIKON D850');
        expect(formatCameraModel('Panasonic Lumix DMC-GH4')).toBe('Panasonic Lumix DMC-GH4');
    });

    it('handles empty or undefined inputs safely', () => {
        expect(formatCameraModel('')).toBe('');
        expect(formatCameraModel(undefined)).toBe('');
    });
});
