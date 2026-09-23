import { describe, it, expect } from 'vitest';
import {
    getEventMonth,
    formatEventElementId,
    computeYearMonths,
} from './monthTrack';
import type { EventData, PhotoInput } from '../types';

describe('monthTrack utilities', () => {
    describe('getEventMonth', () => {
        it('extracts month correctly from standard event titles', () => {
            expect(getEventMonth('09.19 Sacramento Roller Derby Juniors Intergalactic vs San Luis Obispo County Junior Roller Derby')).toBe(9);
            expect(getEventMonth('02.21 Sacramento Roller Derby Kodiak Attack vs Bay Area Derby Bones')).toBe(2);
            expect(getEventMonth('12.05 Championship Bout')).toBe(12);
            expect(getEventMonth('01.15 Opening Scrimmage')).toBe(1);
        });

        it('extracts month from bracketed-year event titles', () => {
            expect(getEventMonth('[2026] 09.19 Matchup')).toBe(9);
            expect(getEventMonth('[2025] 04.11 Bout')).toBe(4);
        });

        it('returns null for titles without MM.DD prefix', () => {
            expect(getEventMonth('Favorites')).toBeNull();
            expect(getEventMonth('All Photos')).toBeNull();
            expect(getEventMonth('99.99 Invalid Month')).toBeNull();
        });
    });

    describe('formatEventElementId', () => {
        it('formats valid DOM element id replacing special characters', () => {
            expect(formatEventElementId('09.19 Team A vs Team B')).toBe('event-09-19-Team-A-vs-Team-B');
            expect(formatEventElementId('02.21 Event (Special Edition)')).toBe('event-02-21-Event--Special-Edition-');
        });
    });

    describe('computeYearMonths', () => {
        it('aggregates event and photo counts per month in DEC -> JAN order', () => {
            const mockEvents: [string, Partial<EventData>][] = [
                ['09.19 Game 1', { photoCount: 100 }],
                ['09.19 Game 2', { photoCount: 50 }],
                ['08.22 Summer Bout', { photoCount: 80 }],
                ['02.21 Season Opener', { photoCount: 120 }],
            ];

            const months = computeYearMonths(mockEvents);

            // Exactly 12 months returned
            expect(months).toHaveLength(12);

            // First entry is DEC, last is JAN
            expect(months[0].num).toBe(12);
            expect(months[0].label).toBe('DEC');
            expect(months[11].num).toBe(1);
            expect(months[11].label).toBe('JAN');

            // September (num: 9) - Peak month with 150 photos out of 350 total
            const sep = months.find((m) => m.num === 9);
            expect(sep).toBeDefined();
            expect(sep?.hasPhotos).toBe(true);
            expect(sep?.eventCount).toBe(2);
            expect(sep?.photoCount).toBe(150);
            expect(sep?.firstEventId).toBe('event-09-19-Game-1');
            expect(sep?.volumeRatio).toBe(1.0);
            expect(sep?.densityLevel).toBe(3);
            expect(sep?.seasonPercent).toBe(43); // 150 / 350 = ~43%

            // August (num: 8) - 80 photos / 150 = 0.53 volume ratio
            const aug = months.find((m) => m.num === 8);
            expect(aug?.hasPhotos).toBe(true);
            expect(aug?.eventCount).toBe(1);
            expect(aug?.photoCount).toBe(80);
            expect(aug?.densityLevel).toBe(2);

            // February (num: 2) - 120 photos / 150 = 0.8 volume ratio
            const feb = months.find((m) => m.num === 2);
            expect(feb?.hasPhotos).toBe(true);
            expect(feb?.eventCount).toBe(1);
            expect(feb?.photoCount).toBe(120);
            expect(feb?.densityLevel).toBe(3);

            // July (num: 7) - Empty off-season month
            const jul = months.find((m) => m.num === 7);
            expect(jul?.hasPhotos).toBe(false);
            expect(jul?.eventCount).toBe(0);
            expect(jul?.photoCount).toBe(0);
            expect(jul?.firstEventId).toBeNull();
            expect(jul?.densityLevel).toBe(0);
            expect(jul?.volumeRatio).toBe(0);
            expect(jul?.seasonPercent).toBe(0);
        });

        it('handles events with album array instead of photoCount', () => {
            const mockEvents: [string, Partial<EventData>][] = [
                ['05.10 Spring Bout', { album: [{} as PhotoInput, {} as PhotoInput, {} as PhotoInput] }],
            ];

            const months = computeYearMonths(mockEvents);
            const may = months.find((m) => m.num === 5);
            expect(may?.hasPhotos).toBe(true);
            expect(may?.eventCount).toBe(1);
            expect(may?.photoCount).toBe(3);
        });

        it('returns all 12 months empty when no events are provided', () => {
            const months = computeYearMonths([]);
            expect(months).toHaveLength(12);
            expect(months.every((m) => !m.hasPhotos)).toBe(true);
        });
    });
});
