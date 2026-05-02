import { getPhotoOriginalUrl } from '../utils/formatters';
import type { FavoriteStoreItem } from '../types';

// ── Version prefix ──────────────────────────────────────────────────
// v2 URLs use a grouped album:numbers format + DEFLATE compression.
// Legacy (v1) URLs are bare basenames base64url-encoded, no prefix.
const V2_PREFIX = '2.';

// ── Base64url helpers ───────────────────────────────────────────────

function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// ── DEFLATE helpers (browser-native CompressionStream) ──────────────

async function deflate(data: Uint8Array): Promise<Uint8Array> {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(data.slice()).catch(() => {});
    writer.close().catch(() => {});

    const reader = cs.readable.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(data.slice()).catch(() => {});
    writer.close().catch(() => {});

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}

// ── Encoding (v2) ───────────────────────────────────────────────────

/**
 * Encode favorites into a grouped, DEFLATE-compressed, URL-safe string.
 *
 * Format (before compression):
 *   year/albumSlug:num1,num2,...;year/albumSlug:num3,num4,...
 *
 * Example:
 *   2025/0412-team-philippines-headshots:1,3,highlight_7;2025/0125-sac...:1,15
 *
 * This eliminates the basename collision problem (photo_001.jpg exists
 * in every album) by grouping photo basenames under their album.
 * The .jpg extension is stripped since all photos share it.
 */
export async function encodeFavorites(favorites: FavoriteStoreItem[]): Promise<string> {
    // Group by year/albumSlug
    const byAlbum = new Map<string, string[]>();

    for (const fav of favorites) {
        const original = getPhotoOriginalUrl(fav);
        // "/photos/2025/0412-slug/photo_001.jpg" → parts = ["", "photos", "2025", "0412-slug", "photo_001.jpg"]
        const parts = original.split('/');
        // Find the /photos/ prefix and extract year/slug/filename
        const photosIdx = parts.indexOf('photos');
        if (photosIdx === -1 || photosIdx + 3 >= parts.length) {
            // Fallback: use basename directly
            const basename = parts[parts.length - 1];
            const key = '_';
            if (!byAlbum.has(key)) byAlbum.set(key, []);
            byAlbum.get(key)!.push(basename);
            continue;
        }
        const year = parts[photosIdx + 1];
        const slug = parts[photosIdx + 2];
        const filename = parts[photosIdx + 3];
        const key = `${year}/${slug}`;

        if (!byAlbum.has(key)) byAlbum.set(key, []);

        // Strip .jpg extension and leading zeros from numeric suffix for compactness
        // e.g. "photo_001.jpg" → "1", "highlight_002.jpg" → "highlight_2"
        const stem = filename
            .replace(/\.jpe?g$/i, '')
            .replace(/^photo_0*(\d+)$/, (_, num: string) => num)
            .replace(/_(0*)(\d+)$/, (_, _zeros: string, num: string) => '_' + parseInt(_zeros + num));
        byAlbum.get(key)!.push(stem);
    }

    // Build grouped string: "year/slug:n1,n2;year/slug:n3,n4"
    const grouped = Array.from(byAlbum.entries())
        .map(([key, nums]) => `${key}:${nums.join(',')}`)
        .join(';');

    const raw = new TextEncoder().encode(grouped);
    const compressed = await deflate(raw);
    return V2_PREFIX + toBase64Url(compressed);
}

/**
 * Build the full shareable favorites URL (async due to compression).
 */
export async function buildFavoritesShareUrl(favorites: FavoriteStoreItem[]): Promise<string> {
    const encoded = await encodeFavorites(favorites);
    return `${window.location.origin}/portfolio/favorites#photos=${encoded}`;
}

// ── Decoding ────────────────────────────────────────────────────────

/**
 * A decoded v2 entry: album key + photo numbers/filenames.
 */
export interface AlbumPhotoGroup {
    /** e.g. "2025/0412-team-philippines-headshots" */
    albumKey: string;
    /** Photo identifiers — either numeric strings ("1","15") or full filenames */
    photoIds: string[];
}

/**
 * Decode a v2 hash → array of album photo groups.
 */
async function decodeV2Hash(hash: string): Promise<AlbumPhotoGroup[]> {
    const payload = hash.slice(V2_PREFIX.length);
    const compressed = fromBase64Url(payload);
    const raw = await inflate(compressed);
    const grouped = new TextDecoder().decode(raw);

    // Parse "year/slug:n1,n2;year/slug:n3,n4"
    return grouped
        .split(';')
        .filter(Boolean)
        .map((segment) => {
            const colonIdx = segment.lastIndexOf(':');
            if (colonIdx === -1) return null;
            const albumKey = segment.slice(0, colonIdx);
            const photoIds = segment
                .slice(colonIdx + 1)
                .split(',')
                .filter(Boolean);
            return { albumKey, photoIds };
        })
        .filter((g): g is AlbumPhotoGroup => g !== null && g.photoIds.length > 0);
}

/**
 * Decode a legacy v1 hash → array of bare basenames.
 */
function decodeV1Hash(hash: string): string[] {
    try {
        const bytes = fromBase64Url(hash);
        const decoded = new TextDecoder().decode(bytes);
        return decoded.split(',').filter(Boolean);
    } catch {
        console.error('Failed to decode legacy favorites hash');
        return [];
    }
}

/**
 * Result of decoding a favorites hash.
 * - v2: `type: 'groups'` with album-grouped photo references (direct resolution)
 * - v1: `type: 'basenames'` with bare filenames (needs full album scanning)
 */
export type DecodedFavorites =
    | { type: 'groups'; groups: AlbumPhotoGroup[] }
    | { type: 'basenames'; basenames: string[] };

/**
 * Decode a favorites hash string, auto-detecting format version.
 */
export async function decodeFavoritesHash(hash: string): Promise<DecodedFavorites> {
    if (hash.startsWith(V2_PREFIX)) {
        try {
            const groups = await decodeV2Hash(hash);
            return { type: 'groups', groups };
        } catch (err) {
            console.error('Failed to decode v2 favorites hash:', err);
            return { type: 'basenames', basenames: [] };
        }
    }

    // Legacy v1 format
    const basenames = decodeV1Hash(hash);
    return { type: 'basenames', basenames };
}
