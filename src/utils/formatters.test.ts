import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatTeamName } from './formatters';

// Inject a known abbreviation map so tests don't depend on VITE_TEAM_ABBREVIATIONS env.
vi.mock('./constants', () => ({
    TEAM_ABBREVIATIONS: {
        'Sacramento Roller Derby': 'SRD',
        'Rat City Roller Derby': 'RCRD',
        'Bay Area Derby': 'BAD',
        'Carson Junior Victory Rollers': 'Carson Jr. Victory Rollers',
        'Happy Valley Derby Darlins': 'HVDD',
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
        expect(formatTeamName('Seattle Roller Derby')).toBe('Seattle ');
        expect(formatTeamName('Gotham Girls Roller Derby')).toBe('Gotham Girls ');
    });

    it('leaves names unchanged if no rules apply', () => {
        expect(formatTeamName('Rose City Rollers')).toBe('Rose City Rollers');
        expect(formatTeamName('Texas Rollergirls')).toBe('Texas Rollergirls');
    });
});
