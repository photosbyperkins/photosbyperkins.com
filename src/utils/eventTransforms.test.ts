import { describe, it, expect } from 'vitest';
import { filterAlbumByGear, computeFeaturedPhotos, buildAlbumIndexMap, sortTeamsByScore } from './eventTransforms';
import type { PhotoRecord, WftdaMatch, EventScore } from '../types';

describe('eventTransforms', () => {
    describe('filterAlbumByGear', () => {
        const samplePhotos: PhotoRecord[] = [
            {
                original: '/photos/1.jpg',
                thumb: '/photos/1_thumb.jpg',
                exif: { cameraModel: 'NIKON Z 8', gearLensId: 'nikon-135mm-plena' },
            },
            {
                original: '/photos/2.jpg',
                thumb: '/photos/2_thumb.jpg',
                exif: { cameraModel: 'NIKON D850', gearLensId: 'nikon-85mm-18g' },
            },
            {
                original: '/photos/3.jpg',
                thumb: '/photos/3_thumb.jpg',
                exif: { cameraModel: 'NIKON Z 8', gearLensId: 'nikon-85mm-18g' },
            },
            {
                original: '/photos/4.jpg',
                thumb: '/photos/4_thumb.jpg',
            },
        ];

        it('returns all photos when activeGearId is undefined', () => {
            const result = filterAlbumByGear(samplePhotos, undefined, '2024');
            expect(result).toEqual(samplePhotos);
        });

        it('filters correctly by camera ID', () => {
            const result = filterAlbumByGear(samplePhotos, 'nikon-z8', '2024');
            expect(result).toHaveLength(2);
            expect(result.map((p) => p.original)).toEqual(['/photos/1.jpg', '/photos/3.jpg']);
        });

        it('filters correctly by lens ID', () => {
            const result = filterAlbumByGear(samplePhotos, 'nikon-85mm-18g', '2024');
            expect(result).toHaveLength(2);
            expect(result.map((p) => p.original)).toEqual(['/photos/2.jpg', '/photos/3.jpg']);
        });
    });

    describe('computeFeaturedPhotos', () => {
        const album: PhotoRecord[] = [
            { original: '/photos/match_001.jpg', thumb: '/photos/match_001_t.jpg' },
            { original: '/photos/match_002.jpg', thumb: '/photos/match_002_t.jpg' },
            { original: '/photos/match_003.jpg', thumb: '/photos/match_003_t.jpg' },
            { original: '/photos/match_004.jpg', thumb: '/photos/match_004_t.jpg' },
            { original: '/photos/match_005.jpg', thumb: '/photos/match_005_t.jpg' },
            { original: '/photos/match_006.jpg', thumb: '/photos/match_006_t.jpg' },
        ];

        it('falls back to first N album photos when highlights are empty', () => {
            const featured = computeFeaturedPhotos(album, [], 5);
            expect(featured).toHaveLength(5);
            expect(featured[0].original).toBe('/photos/match_001.jpg');
            expect(featured[4].original).toBe('/photos/match_005.jpg');
        });

        it('filters orphaned highlights not present in album and fills remainder', () => {
            const highlights: PhotoRecord[] = [
                { original: '/photos/orphaned_999.jpg', thumb: '/t.jpg' },
                { original: '/photos/match_003.jpg', thumb: '/t3.jpg' },
            ];

            const featured = computeFeaturedPhotos(album, highlights, 5);
            expect(featured).toHaveLength(5);
            expect(featured.some((p) => p.original === '/photos/orphaned_999.jpg')).toBe(false);
            expect(featured.some((p) => p.original === '/photos/match_003.jpg')).toBe(true);
        });

        it('sorts highlights and extras sequentially by numeric sequence in filename', () => {
            const highlights: PhotoRecord[] = [
                { original: '/photos/match_005.jpg', thumb: '/t5.jpg' },
                { original: '/photos/match_002.jpg', thumb: '/t2.jpg' },
            ];

            const featured = computeFeaturedPhotos(album, highlights, 4);
            expect(featured).toHaveLength(4);
            // Highlights 2 and 5 come first, then extras 1 and 3 are filled in
            expect(featured[0].original).toBe('/photos/match_002.jpg');
            expect(featured[1].original).toBe('/photos/match_005.jpg');
        });

        it('merges full album metadata including EXIF into highlight photos', () => {
            const albumWithExif: PhotoRecord[] = [
                {
                    original: '/photos/match_001.jpg',
                    thumb: '/photos/match_001_t.jpg',
                    width: 3072,
                    height: 2048,
                    exif: {
                        cameraModel: 'NIKON Z 8',
                        lens: '135mm Plena',
                    },
                },
            ];
            const highlightWithoutExif: PhotoRecord[] = [
                {
                    original: '/photos/match_001.jpg',
                    thumb: '/photos/match_001_t.jpg',
                },
            ];

            const featured = computeFeaturedPhotos(albumWithExif, highlightWithoutExif, 1);
            expect(featured).toHaveLength(1);
            expect(featured[0].exif).toEqual({
                cameraModel: 'NIKON Z 8',
                lens: '135mm Plena',
            });
            expect(featured[0].width).toBe(3072);
            expect(featured[0].height).toBe(2048);
        });
    });

    describe('buildAlbumIndexMap', () => {
        it('creates accurate O(1) map from URL to index', () => {
            const album: PhotoRecord[] = [
                { original: '/a.jpg', thumb: '/a_t.jpg' },
                { original: '/b.jpg', thumb: '/b_t.jpg' },
            ];
            const map = buildAlbumIndexMap(album);
            expect(map.get('/a.jpg')).toBe(0);
            expect(map.get('/b.jpg')).toBe(1);
            expect(map.get('/c.jpg')).toBeUndefined();
        });
    });

    describe('sortTeamsByScore', () => {
        const teams = ['Sacramento Roller Derby', 'Bay Area Derby'];

        it('returns teams in order when no scores exist', () => {
            const { finalTeams, shouldShowScores } = sortTeamsByScore(teams);
            expect(finalTeams).toEqual(teams);
            expect(shouldShowScores).toBe(false);
        });

        it('sorts winner first when WFTDA scores exist', () => {
            const wftdaMatch: WftdaMatch = {
                href: 'https://wftda.com/stats',
                team1: 'Sacramento Roller Derby',
                team2: 'Bay Area Derby',
                score1: 120,
                score2: 185,
            };

            const { finalTeams, shouldShowScores } = sortTeamsByScore(teams, wftdaMatch);
            expect(shouldShowScores).toBe(true);
            expect(finalTeams[0]).toBe('Bay Area Derby');
            expect(finalTeams[1]).toBe('Sacramento Roller Derby');
        });

        it('sorts winner first when localScore exists', () => {
            const localScore: EventScore = {
                team1Score: 210,
                team2Score: 95,
            };

            const { finalTeams, shouldShowScores } = sortTeamsByScore(teams, undefined, localScore);
            expect(shouldShowScores).toBe(true);
            expect(finalTeams[0]).toBe('Sacramento Roller Derby');
            expect(finalTeams[1]).toBe('Bay Area Derby');
        });

        it('prioritizes activeTeamName when matching terms', () => {
            const { finalTeams } = sortTeamsByScore(teams, undefined, undefined, 'Bay Area');
            expect(finalTeams[0]).toBe('Bay Area Derby');
            expect(finalTeams[1]).toBe('Sacramento Roller Derby');
        });
    });
});
