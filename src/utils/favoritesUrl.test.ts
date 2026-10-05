import { describe, it, expect, vi } from 'vitest';
import { encodeFavorites, decodeFavoritesHash } from './favoritesUrl';

describe('favoritesUrl', () => {
    describe('decodeFavoritesHash', () => {
        it('decodes legacy v1 hash correctly (basenames)', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            // Encode "photo_1.jpg,photo_2.jpg" using the old v1 format
            const basenames = ['photo_1.jpg', 'photo_2.jpg'];
            const oldHash = btoa(basenames.join(',')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            const decoded = await decodeFavoritesHash(oldHash);
            expect(decoded).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith('Unsupported or legacy favorites hash format');
            warnSpy.mockRestore();
        });

        it('handles empty v1 hash correctly', async () => {
            const decoded = await decodeFavoritesHash('');
            expect(decoded).toEqual([]);
        });

        it('handles invalid legacy hash gracefully', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            // Provide a malformed base64 string
            const decoded = await decodeFavoritesHash('###invalid_base64###');
            expect(decoded).toEqual([]);
            expect(warnSpy).toHaveBeenCalledWith('Unsupported or legacy favorites hash format');
            warnSpy.mockRestore();
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
            // Should have 2 groups
            expect(decoded.length).toBe(2);

            // Group 1
            const group1 = decoded.find((g) => g.albumKey === '2025/0412-team-philippines-headshots');
            expect(group1).toBeDefined();
            expect(group1?.photoIds).toEqual(['1', '2']);

            // Group 2
            const group2 = decoded.find((g) => g.albumKey === '2025/0125-sacramento-roller-derby-bad-habits');
            expect(group2).toBeDefined();
            expect(group2?.photoIds).toEqual(['15', 'highlight_1']);
        });

        it('handles invalid v2 hash gracefully', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            // Provide a malformed v2 hash (not valid DEFLATE payload)
            const decoded = await decodeFavoritesHash('2.invalid_compressed_data');
            // If decompression fails, it falls back to empty array
            expect(decoded).toEqual([]);
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });
        it('handles corrupt Base64 characters in v2 hash gracefully', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const decoded = await decodeFavoritesHash('2.@@invalid-base64-characters@@');
            expect(decoded).toEqual([]);
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        it('ignores malformed segments without colon or empty photoIds in v2 payload', async () => {
            // Encode a grouped string containing malformed segments like "no_colon_segment;valid/album:1,2;empty/photos:"
            const malformedGrouped = 'no_colon_segment;valid/album:1,2;empty/photos:';
            const raw = new TextEncoder().encode(malformedGrouped);
            const cs = new CompressionStream('deflate-raw');
            const writer = cs.writable.getWriter();
            writer.write(raw).catch(() => {});
            writer.close().catch(() => {});
            const reader = cs.readable.getReader();
            const chunks: Uint8Array[] = [];
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            const total = chunks.reduce((acc, c) => acc + c.length, 0);
            const comp = new Uint8Array(total);
            let offset = 0;
            for (const c of chunks) {
                comp.set(c, offset);
                offset += c.length;
            }

            let binary = '';
            for (let i = 0; i < comp.length; i++) {
                binary += String.fromCharCode(comp[i]);
            }
            const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const hash = `2.${b64}`;

            const decoded = await decodeFavoritesHash(hash);
            expect(decoded).toEqual([{ albumKey: 'valid/album', photoIds: ['1', '2'] }]);
        });
    });

    describe('photoStem', () => {
        it('strips extensions and normalizes photo and highlight numbering', async () => {
            const { photoStem } = await import('./favoritesUrl');
            expect(photoStem('')).toBe('');
            expect(photoStem('photo_001.jpg')).toBe('1');
            expect(photoStem('photo_042.webp')).toBe('42');
            expect(photoStem('photo_100.avif')).toBe('100');
            expect(photoStem('highlight_005.jpeg')).toBe('highlight_5');
            expect(photoStem('custom_name.png')).toBe('custom_name.png');
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
            expect(decoded).toEqual([
                { albumKey: '2025/0412-team-philippines-headshots', photoIds: ['1', '2'] },
                { albumKey: '2025/0125-sacramento-roller-derby-bad-habits', photoIds: ['15'] },
            ]);
        });

        it('handles fallback for favorites without "/photos/" prefix', async () => {
            // If the URL doesn't follow the normal pattern, it falls back to the basename
            const testFavorites = ['https://example.com/some/other/path/DSC_1234.jpg'];

            const encoded = await encodeFavorites(testFavorites);
            const decoded = await decodeFavoritesHash(encoded);

            // Key should be "_"
            expect(decoded).toEqual([{ albumKey: '_', photoIds: ['DSC_1234.jpg'] }]);
        });
    });
});
