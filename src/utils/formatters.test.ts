import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatTeamName, getTeamNameFormats, getPhotoDisplayUrl, findEarliestEventForTeam } from './formatters';

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
        expect(formatTeamName('Rose City Rollers')).toBe('Rose City Rollers');
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
