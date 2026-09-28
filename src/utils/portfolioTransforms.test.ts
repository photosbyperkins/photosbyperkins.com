import { describe, it, expect } from 'vitest';
import { buildEventRows, getSeasonHighlights } from './portfolioTransforms';
import type { EventData, SeasonStats } from '../types';

describe('portfolioTransforms', () => {
    describe('buildEventRows', () => {
        const sampleEvents: [string, EventData][] = [
            ['[2024] 10.22 Championship', { album: [], highlights: [], originalYear: '2024' }],
            ['[2024] 08.15 Bout 2', { album: [], highlights: [], originalYear: '2024' }],
            ['[2023] 11.10 Playoffs', { album: [], highlights: [], originalYear: '2023' }],
        ];

        it('returns standard event rows without dividers when not in multi-year mode', () => {
            const rows = buildEventRows(sampleEvents, '2024', false);
            expect(rows).toHaveLength(3);
            expect(rows.every((r) => r.type === 'event')).toBe(true);
        });

        it('inserts year dividers when year changes in multi-year mode', () => {
            const rows = buildEventRows(sampleEvents, 'team-slug', true);
            expect(rows).toHaveLength(5);
            expect(rows[0]).toEqual({ type: 'divider', year: '2024' });
            expect(rows[1].type).toBe('event');
            expect(rows[2].type).toBe('event');
            expect(rows[3]).toEqual({ type: 'divider', year: '2023' });
            expect(rows[4].type).toBe('event');
        });
    });

    describe('getSeasonHighlights', () => {
        const events: [string, EventData][] = [
            ['Event A', { album: [], highlights: [], photoCount: 50 }],
            ['Event B', { album: [], highlights: [], photoCount: 70 }],
        ];

        it('computes total events and photos from events fallback when stats missing', () => {
            const res = getSeasonHighlights(undefined, events, '2024');
            expect(res.totalEvents).toBe(2);
            expect(res.totalPhotos).toBe(120);
        });

        it('uses stats values when provided', () => {
            const stats: SeasonStats = {
                totalEvents: 10,
                totalPhotos: 1500,
                firstSeenTeams: ['Team Alpha', 'Team Beta'],
                mostSeenTeams: ['Sacramento Roller Derby'],
                mostUsedCameraId: 'nikon-z8',
                mostUsedLensId: 'nikon-135mm-plena',
            };
            const res = getSeasonHighlights(stats, events, '2024');
            expect(res.totalEvents).toBe(10);
            expect(res.totalPhotos).toBe(1500);
            expect(res.firstSeenTeam).toBeDefined();
            expect(res.mostSeenTeam).toBe('Sacramento Roller Derby');
            expect(res.cameraGear?.id).toBe('nikon-z8');
            expect(res.lensGear?.id).toBe('nikon-135mm-plena');
        });
    });
});
