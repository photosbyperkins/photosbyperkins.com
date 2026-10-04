import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAlbum, getCachedAlbum, setCachedAlbum, _clearAlbumCache } from './albumData';
import type { PhotoRecord } from '../types';

describe('albumData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _clearAlbumCache();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fetches album data, caches it, and returns the result', async () => {
        const mockAlbum: PhotoRecord[] = [
            { original: '/photos/2024/match/photo_001.jpg', thumb: '/thumbnails/2024/match/photo_001.avif' },
        ];

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockAlbum,
        } as unknown as Response);

        const result = await fetchAlbum('2024', 'match');
        expect(result).toEqual(mockAlbum);
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        // Subsequent call hits cache without calling fetch
        const cached = await fetchAlbum('2024', 'match');
        expect(cached).toEqual(mockAlbum);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(getCachedAlbum('2024', 'match')).toEqual(mockAlbum);
    });

    it('deduplicates concurrent in-flight requests for the same album', async () => {
        const mockAlbum: PhotoRecord[] = [
            { original: '/photos/2024/match2/photo_001.jpg', thumb: '/thumbnails/2024/match2/photo_001.avif' },
        ];

        let resolveFetch: (data: unknown) => void = () => {};
        const fetchPromise = new Promise((resolve) => {
            resolveFetch = resolve;
        });

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(fetchPromise as unknown as Promise<Response>);

        const req1 = fetchAlbum('2024', 'match2');
        const req2 = fetchAlbum('2024', 'match2');

        resolveFetch({
            ok: true,
            status: 200,
            json: async () => mockAlbum,
        });

        const [res1, res2] = await Promise.all([req1, req2]);
        expect(res1).toEqual(mockAlbum);
        expect(res2).toEqual(mockAlbum);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('handles aborted requests', async () => {
        const controller = new AbortController();
        controller.abort();

        await expect(fetchAlbum('2024', 'aborted-match', controller.signal)).rejects.toThrow();
    });

    it('handles HTTP error without caching failures', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({}),
        } as unknown as Response);

        await expect(fetchAlbum('2024', 'error-match')).rejects.toThrow('Failed to load');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(getCachedAlbum('2024', 'error-match')).toBeUndefined();

        // Retry should call fetch again
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [{ original: '/p1.jpg', thumb: '/t1.avif' }],
        } as unknown as Response);

        const retryResult = await fetchAlbum('2024', 'error-match');
        expect(retryResult).toEqual([{ original: '/p1.jpg', thumb: '/t1.avif' }]);
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('allows manually setting and clearing cache', () => {
        const customAlbum: PhotoRecord[] = [{ original: '/p.jpg', thumb: '/t.avif' }];
        setCachedAlbum('2025', 'custom', customAlbum);
        expect(getCachedAlbum('2025', 'custom')).toEqual(customAlbum);

        _clearAlbumCache();
        expect(getCachedAlbum('2025', 'custom')).toBeUndefined();
    });
});
