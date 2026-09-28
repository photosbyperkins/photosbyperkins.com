import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSharedFavorites } from './useSharedFavorites';
import * as favoritesUrl from '../utils/favoritesUrl';

vi.mock('../utils/favoritesUrl', () => ({
    decodeFavoritesHash: vi.fn(),
}));

describe('useSharedFavorites', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        window.location.hash = '';
    });

    it('returns undefined if hash does not start with #photos=', () => {
        window.location.hash = '#portfolio';
        const { result } = renderHook(() => useSharedFavorites());
        expect(result.current.sharedFavorites).toBeUndefined();
    });

    it('resolves shared photos when hash is valid', async () => {
        window.location.hash = '#photos=test-hash';

        vi.mocked(favoritesUrl.decodeFavoritesHash).mockResolvedValue([
            { albumKey: '2024/derby-game', photoIds: ['1'] },
        ]);

        const mockAlbumData = [
            { original: '/photos/2024/derby/photo_001.jpg', thumb: '/photos/2024/derby/photo_001_thumb.webp' },
            { original: '/photos/2024/derby/photo_002.jpg', thumb: '/photos/2024/derby/photo_002_thumb.webp' },
        ];

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockAlbumData,
        } as Response);

        const { result } = renderHook(() => useSharedFavorites());

        await waitFor(() => {
            expect(result.current.sharedFavorites).toBeDefined();
        });

        expect(result.current.sharedFavorites?.length).toBe(1);
        expect((result.current.sharedFavorites?.[0] as { original: string }).original).toBe(
            '/photos/2024/derby/photo_001.jpg'
        );

        // Test clearSharedFavorites
        act(() => {
            result.current.clearSharedFavorites();
        });

        expect(result.current.sharedFavorites).toBeUndefined();
    });
});
