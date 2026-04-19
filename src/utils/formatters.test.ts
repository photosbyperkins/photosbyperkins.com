import { describe, it, expect } from 'vitest';
import { formatTeamName } from './formatters';

describe('formatTeamName', () => {
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
