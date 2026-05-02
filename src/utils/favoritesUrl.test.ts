import { describe, it, expect } from 'vitest';
import { encodeFavorites, decodeFavoritesHash } from './favoritesUrl';

describe('favoritesUrl', () => {
    describe('decodeFavoritesHash', () => {
        it('decodes legacy v1 hash correctly (basenames)', async () => {
            // Encode "photo_1.jpg,photo_2.jpg" using the old v1 format
            const basenames = ['photo_1.jpg', 'photo_2.jpg'];
            const oldHash = btoa(basenames.join(',')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            const decoded = await decodeFavoritesHash(oldHash);

            expect(decoded.type).toBe('basenames');
            if (decoded.type === 'basenames') {
                expect(decoded.basenames).toEqual(basenames);
            }
        });

        it('handles empty v1 hash correctly', async () => {
            const decoded = await decodeFavoritesHash('');
            expect(decoded.type).toBe('basenames');
            if (decoded.type === 'basenames') {
                expect(decoded.basenames).toEqual([]);
            }
        });

        it('handles invalid legacy hash gracefully', async () => {
            // Provide a malformed base64 string
            const decoded = await decodeFavoritesHash('###invalid_base64###');
            expect(decoded.type).toBe('basenames');
            if (decoded.type === 'basenames') {
                expect(decoded.basenames).toEqual([]);
            }
        });

        it('decodes v2 hash correctly (groups)', async () => {
            const testFavorites = [
                '/photos/2025/0412-team-philippines-headshots/photo_001.jpg',
                '/photos/2025/0412-team-philippines-headshots/photo_002.jpg',
                '/photos/2025/0125-sacramento-roller-derby-bad-habits/photo_015.jpg',
                '/photos/2025/0125-sacramento-roller-derby-bad-habits/highlight_001.jpg',
            ];

            const encoded = await encodeFavorites(testFavorites);

            expect(encoded.startsWith('2.')).toBe(true);

            const decoded = await decodeFavoritesHash(encoded);
            expect(decoded.type).toBe('groups');
            if (decoded.type === 'groups') {
                // Should have 2 groups
                expect(decoded.groups.length).toBe(2);

                // Group 1
                const group1 = decoded.groups.find((g) => g.albumKey === '2025/0412-team-philippines-headshots');
                expect(group1).toBeDefined();
                expect(group1?.photoIds).toEqual(['1', '2']);

                // Group 2
                const group2 = decoded.groups.find(
                    (g) => g.albumKey === '2025/0125-sacramento-roller-derby-bad-habits'
                );
                expect(group2).toBeDefined();
                expect(group2?.photoIds).toEqual(['15', 'highlight_1']);
            }
        });

        it('handles invalid v2 hash gracefully', async () => {
            // Provide a malformed v2 hash (not valid DEFLATE payload)
            const decoded = await decodeFavoritesHash('2.invalid_compressed_data');
            // If decompression fails, it falls back to empty basenames array
            expect(decoded.type).toBe('basenames');
            if (decoded.type === 'basenames') {
                expect(decoded.basenames).toEqual([]);
            }
        });
    });

    describe('encodeFavorites', () => {
        it('encodes favorites correctly into a grouped format', async () => {
            const testFavorites = [
                '/photos/2025/0412-team-philippines-headshots/photo_001.jpg',
                '/photos/2025/0412-team-philippines-headshots/photo_002.jpg',
                '/photos/2025/0125-sacramento-roller-derby-bad-habits/photo_015.jpg',
            ];

            const encoded = await encodeFavorites(testFavorites);
            expect(encoded.startsWith('2.')).toBe(true);

            // Let's decode it to verify it packed the data correctly
            const decoded = await decodeFavoritesHash(encoded);
            expect(decoded.type).toBe('groups');
            if (decoded.type === 'groups') {
                expect(decoded.groups).toEqual([
                    { albumKey: '2025/0412-team-philippines-headshots', photoIds: ['1', '2'] },
                    { albumKey: '2025/0125-sacramento-roller-derby-bad-habits', photoIds: ['15'] },
                ]);
            }
        });

        it('handles fallback for favorites without "/photos/" prefix', async () => {
            // If the URL doesn't follow the normal pattern, it falls back to the basename
            const testFavorites = ['https://example.com/some/other/path/DSC_1234.jpg'];

            const encoded = await encodeFavorites(testFavorites);
            const decoded = await decodeFavoritesHash(encoded);

            expect(decoded.type).toBe('groups');
            if (decoded.type === 'groups') {
                // Key should be "_"
                expect(decoded.groups).toEqual([{ albumKey: '_', photoIds: ['DSC_1234.jpg'] }]);
            }
        });
    });
});
