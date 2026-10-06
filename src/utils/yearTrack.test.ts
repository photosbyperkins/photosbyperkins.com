import { describe, it, expect } from 'vitest';
import { computeViewYears, formatYearDividerId, detectActiveYear, type YearTrackData } from './yearTrack';
import type { EventData } from '../types';

describe('yearTrack utility', () => {
    describe('formatYearDividerId', () => {
        it('formats year divider id predictably', () => {
            expect(formatYearDividerId('2024')).toBe('year-divider-2024');
            expect(formatYearDividerId('2020')).toBe('year-divider-2020');
        });
    });

    describe('computeViewYears', () => {
        it('returns empty array when no events provided', () => {
            expect(computeViewYears([])).toEqual([]);
        });

        it('aggregates multi-year events sorted descending by year', () => {
            const sampleEvents: [string, Partial<EventData>][] = [
                ['03.15 vs Team A', { originalYear: '2024', photoCount: 50 }],
                ['04.20 vs Team B', { originalYear: '2024', photoCount: 50 }],
                ['09.10 vs Team C', { originalYear: '2020', photoCount: 100 }],
                ['06.01 vs Team D', { originalYear: '2026', photoCount: 25 }],
            ];

            const result = computeViewYears(sampleEvents);

            // Should be sorted 2026, 2024, 2020
            expect(result.map((y) => y.year)).toEqual(['2026', '2024', '2020']);

            // 2026
            expect(result[0]).toMatchObject({
                year: '2026',
                label: '2026',
                photoCount: 25,
                eventCount: 1,
                hasPhotos: true,
                dividerId: 'year-divider-2026',
                firstEventId: 'event-06-01-vs-Team-D',
                volumeRatio: 0.25,
                densityLevel: 1,
                totalPercent: 11, // 25 / 225 = ~11%
            });

            // 2024
            expect(result[1]).toMatchObject({
                year: '2024',
                label: '2024',
                photoCount: 100,
                eventCount: 2,
                hasPhotos: true,
                dividerId: 'year-divider-2024',
                firstEventId: 'event-03-15-vs-Team-A',
                volumeRatio: 1, // peak year is 2024 & 2020 (100)
                densityLevel: 3,
                totalPercent: 44, // 100 / 225 = ~44%
            });

            // 2020
            expect(result[2]).toMatchObject({
                year: '2020',
                label: '2020',
                photoCount: 100,
                eventCount: 1,
                hasPhotos: true,
                dividerId: 'year-divider-2020',
                firstEventId: 'event-09-10-vs-Team-C',
                volumeRatio: 1,
                densityLevel: 3,
                totalPercent: 44,
            });
        });

        it('parses year from event title prefix if originalYear is missing', () => {
            const events: [string, Partial<EventData>][] = [
                ['[2019] 05.12 vs Rivals', { photoCount: 80 }],
            ];

            const result = computeViewYears(events);
            expect(result.length).toBe(1);
            expect(result[0].year).toBe('2019');
            expect(result[0].dividerId).toBe('year-divider-2019');
        });
    });

    describe('detectActiveYear', () => {
        const mockYears: YearTrackData[] = [
            {
                year: '2026',
                label: '2026',
                photoCount: 50,
                eventCount: 1,
                hasPhotos: true,
                dividerId: 'year-divider-2026',
                firstEventId: 'event-match-1',
                volumeRatio: 0.5,
                densityLevel: 2,
                totalPercent: 33,
            },
            {
                year: '2024',
                label: '2024',
                photoCount: 100,
                eventCount: 2,
                hasPhotos: true,
                dividerId: 'year-divider-2024',
                firstEventId: 'event-match-2',
                volumeRatio: 1,
                densityLevel: 3,
                totalPercent: 67,
            },
        ];

        it('returns null if years list is empty', () => {
            expect(
                detectActiveYear({
                    years: [],
                    getRect: () => null,
                    scrollY: 0,
                    viewportHeight: 800,
                    scrollHeight: 2000,
                })
            ).toBeNull();
        });

        it('activates first (newest) year at top of page', () => {
            const detected = detectActiveYear({
                years: mockYears,
                getRect: () => null,
                scrollY: 5,
                viewportHeight: 800,
                scrollHeight: 2000,
            });
            expect(detected).toBe('2026');
        });

        it('activates last (oldest) year at bottom of page', () => {
            const detected = detectActiveYear({
                years: mockYears,
                getRect: () => null,
                scrollY: 1180,
                viewportHeight: 800,
                scrollHeight: 2000,
                bottomThresholdPx: 50,
            });
            expect(detected).toBe('2024');
        });

        it('activates year based on scroll position trigger point', () => {
            const rects: Record<string, { top: number; bottom: number }> = {
                'year-divider-2026': { top: -200, bottom: -180 },
                'year-divider-2024': { top: 150, bottom: 170 }, // <= viewportAnchor (800 * 0.35 = 280)
            };

            const detected = detectActiveYear({
                years: mockYears,
                getRect: (id) => rects[id] || null,
                scrollY: 500,
                viewportHeight: 800,
                scrollHeight: 3000,
            });
            expect(detected).toBe('2024');
        });
    });
});
