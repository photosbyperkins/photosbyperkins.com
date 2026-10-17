import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    clearFindMyPhotosCache,
    fetchFindTeamsIndex,
    fetchTeamFindData,
    extractJerseyNumbersWithCounts,
    filterTeamFindPhotos,
    toPhotoRecordFromFindPhoto,
    groupFindPhotosByEvent,
    parseJerseySearchQuery,
    findDirectJerseyMatches,
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
            isMeta: true,
            photoCount: 3,
            numberedPhotoCount: 2,
            eventCount: 2,
            topNumbers: ['42', '88'],
            numberCounts: { '42': 2, '88': 1 },
        },
        {
            name: 'Capital City Bruisers',
            slug: 'capital-city-bruisers',
            colorHex: '#1D4ED8',
            isMeta: false,
            photoCount: 4,
            numberedPhotoCount: 2,
            eventCount: 1,
            topNumbers: ['42', '12'],
            numberCounts: { '42': 1, '12': 2 },
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
        { e: 0, i: 0, n: ['42'], r: 'jammer', g: ['apex-jump'], b: 1, x: 0.45, y: 0.32, h: 'abc123', w: 2400, ht: 1600 },
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
        expect(all[0].originalUrl).toBe('/photos/2025/11-08-sacramento-vs-outlaws/photo_001.jpg');
        expect(all[0].focusX).toBe(0.45);
        expect(all[0].focusY).toBe(0.32);
        expect(all[0].thumbHash).toBe('abc123');

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

    it('converts ResolvedFindPhoto to PhotoRecord and groups by bout event', () => {
        const resolved = filterTeamFindPhotos(mockTeamPayload);
        const record = toPhotoRecordFromFindPhoto(resolved[0]);
        expect(record).toMatchObject({
            original: '/photos/2025/11-08-sacramento-vs-outlaws/photo_001.jpg',
            thumb: '/thumbnails/2025/11-08-sacramento-vs-outlaws/photo_001.avif',
            eventName: '11.08 Sacramento vs Outlaws',
            year: '2025',
            focusX: 0.45,
            focusY: 0.32,
            thumbHash: 'abc123',
            width: 2400,
            height: 1600,
        });

        const groups = groupFindPhotosByEvent(resolved);
        expect(groups).toHaveLength(2);
        expect(groups[0].eventName).toBe('11.08 Sacramento vs Outlaws');
        expect(groups[0].photos).toHaveLength(2);
        expect(groups[1].eventName).toBe('05.10 Sacramento vs BAD');
        expect(groups[1].photos).toHaveLength(1);

        // Non-sequential photo number ('p') when filename number differs from i + 1
        const nonSeq = filterTeamFindPhotos({
            v: 1,
            team: 'Sacramento',
            slug: 'sacramento',
            events: [{ y: '2016', s: '0416-sacred-city-disciples-vs-sac-city-rollers', t: '04.16 Sacred City vs Sac City' }],
            photos: [{ e: 0, i: 130, p: 136, n: ['42'] }],
        });
        expect(nonSeq[0].originalUrl).toBe('/photos/2016/0416-sacred-city-disciples-vs-sac-city-rollers/photo_136.jpg');
        expect(toPhotoRecordFromFindPhoto(nonSeq[0]).thumb).toBe(
            '/thumbnails/2016/0416-sacred-city-disciples-vs-sac-city-rollers/photo_136.avif'
        );
    });

    it('parses combined team + #Jersey queries and finds direct matches', () => {
        expect(parseJerseySearchQuery('#42')).toEqual({ teamQuery: '', numberQuery: '42' });
        expect(parseJerseySearchQuery('Bruisers #12')).toEqual({ teamQuery: 'bruisers', numberQuery: '12' });
        expect(parseJerseySearchQuery('Sacramento 42')).toEqual({ teamQuery: 'sacramento', numberQuery: '42' });

        const direct42 = findDirectJerseyMatches(mockIndex.teams, '#42');
        expect(direct42).toHaveLength(2);
        expect(direct42[0].team.slug).toBe('sacramento');
        expect(direct42[0].photoCount).toBe(2);

        const directBruisers12 = findDirectJerseyMatches(mockIndex.teams, 'Bruisers #12');
        expect(directBruisers12).toHaveLength(1);
        expect(directBruisers12[0].team.slug).toBe('capital-city-bruisers');
        expect(directBruisers12[0].matchedNumber).toBe('12');
    });

    it('matches partially cut-off numbers (prefix/suffix occlusion) and ranks exact matches first', () => {
        const partialPayload: TeamFindPayload = {
            v: 1,
            team: 'Sacramento',
            slug: 'sacramento',
            events: [{ y: '2025', s: '11-08-sacramento-vs-outlaws', t: '11.08 Sacramento vs Outlaws' }],
            photos: [
                // Photo 0: arm cut off leading '4' from #428 -> OCR read '28'
                { e: 0, i: 0, n: ['28'], r: 'jammer' },
                // Photo 1: exact #428 read
                { e: 0, i: 1, n: ['428'], r: 'jammer' },
                // Photo 2: jersey fold cut off trailing '8' from #428 -> OCR read '42'
                { e: 0, i: 2, n: ['42'], r: 'jammer' },
                // Photo 3: unrelated #88
                { e: 0, i: 3, n: ['88'], r: 'blocker' },
            ],
        };

        // Searching full #428 surfaces exact #428 first, followed by partial reads #28 and #42
        const matches428 = filterTeamFindPhotos(partialPayload, { numberQuery: '#428' });
        expect(matches428.map((p) => p.photoIndex)).toEqual([1, 0, 2]);

        // Direct team matches also surface partial reads when a 3-digit query is entered
        const direct428 = findDirectJerseyMatches(mockIndex.teams, '#428');
        expect(direct428).toHaveLength(2);
        expect(direct428[0].matchedNumber).toBe('42');

        // Explicit partial numbers ('?' wildcards) also match full number queries
        const explicitPartialPayload: TeamFindPayload = {
            v: 1,
            team: 'Sacramento',
            slug: 'sacramento',
            events: [{ y: '2025', s: '11-08-sacramento-vs-outlaws', t: '11.08 Sacramento vs Outlaws' }],
            photos: [
                { e: 0, i: 0, n: ['42?'], r: 'jammer' },
                { e: 0, i: 1, n: ['?51'], r: 'pivot' },
                { e: 0, i: 2, n: ['4?8'], r: 'blocker' },
                { e: 0, i: 3, n: ['7?'], r: 'jammer' },
            ],
        };
        expect(filterTeamFindPhotos(explicitPartialPayload, { numberQuery: '#428' }).map((p) => p.photoIndex)).toEqual([0, 2]);
        expect(filterTeamFindPhotos(explicitPartialPayload, { numberQuery: '#451' }).map((p) => p.photoIndex)).toEqual([1]);
        expect(filterTeamFindPhotos(explicitPartialPayload, { numberQuery: '#72' }).map((p) => p.photoIndex)).toEqual([3]);
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
        expect(idx?.teams).toHaveLength(2);
        expect(idx?.teams[0].slug).toBe('sacramento');

        const team = await fetchTeamFindData('sacramento');
        expect(team?.photos).toHaveLength(3);

        // Cached calls should not re-fetch
        await fetchFindTeamsIndex();
        await fetchTeamFindData('sacramento');
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
});

