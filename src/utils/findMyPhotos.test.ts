import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    clearFindMyPhotosCache,
    fetchFindTeamsIndex,
    fetchTeamFindData,
    extractJerseyNumbersWithCounts,
    filterTeamFindPhotos,
    type FindTeamsIndex,
    type TeamFindPayload,
} from './findMyPhotos';

const mockIndex: FindTeamsIndex = {
    v: 1,
    teams: [
        {
            name: 'Sacramento',
            slug: 'sacramento',
            colorHex: '#4B2E83',
            photoCount: 3,
            eventCount: 2,
            topNumbers: ['42', '88'],
        },
    ],
};

const mockTeamPayload: TeamFindPayload = {
    v: 1,
    team: 'Sacramento',
    slug: 'sacramento',
    colorHex: '#4B2E83',
    events: [
        { y: '2025', s: '11-08-sacramento-vs-outlaws', t: '11.08 Sacramento vs Outlaws' },
        { y: '2024', s: '05-10-sacramento-vs-bad', t: '05.10 Sacramento vs BAD' },
    ],
    photos: [
        { e: 0, i: 0, n: ['42'], r: 'jammer', g: ['apex-jump'], b: 1 },
        { e: 0, i: 4, n: ['88'], r: 'pivot', g: ['pack'] },
        { e: 1, i: 2, n: ['42', '12'], r: 'jammer', g: ['jammer-breakaway'], b: 1 },
    ],
};

describe('findMyPhotos static lookup utilities', () => {
    beforeEach(() => {
        clearFindMyPhotosCache();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('extracts and ranks jersey numbers with photo counts', () => {
        const numbers = extractJerseyNumbersWithCounts(mockTeamPayload);
        expect(numbers).toEqual([
            { number: '42', count: 2 },
            { number: '12', count: 1 },
            { number: '88', count: 1 },
        ]);
    });

    it('filters team photos by #Jersey, role, year, and best-in-burst', () => {
        const all = filterTeamFindPhotos(mockTeamPayload);
        expect(all).toHaveLength(3);

        const byNumber = filterTeamFindPhotos(mockTeamPayload, { numberQuery: '#42' });
        expect(byNumber).toHaveLength(2);
        expect(byNumber[0].year).toBe('2025');
        expect(byNumber[1].year).toBe('2024');

        const byRole = filterTeamFindPhotos(mockTeamPayload, { roleFilter: 'pivot' });
        expect(byRole).toHaveLength(1);
        expect(byRole[0].numbers).toEqual(['88']);

        const byYearAndBest = filterTeamFindPhotos(mockTeamPayload, {
            yearFilter: '2024',
            onlyBestInBurst: true,
        });
        expect(byYearAndBest).toHaveLength(1);
        expect(byYearAndBest[0].photoIndex).toBe(2);
    });

    it('fetches and caches /data/find/index.json and /data/find/<slug>.json', async () => {
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockIndex,
            } as Response)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockTeamPayload,
            } as Response);

        const idx = await fetchFindTeamsIndex();
        expect(idx?.teams).toHaveLength(1);
        expect(idx?.teams[0].slug).toBe('sacramento');

        const team = await fetchTeamFindData('sacramento');
        expect(team?.photos).toHaveLength(3);

        // Cached calls should not re-fetch
        await fetchFindTeamsIndex();
        await fetchTeamFindData('sacramento');
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
});
