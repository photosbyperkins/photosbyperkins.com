import { getPhotoOriginalUrl } from '../utils/formatters';
import type { FavoriteStoreItem } from '../types';
/**
 * Base64url encoding: replaces +/= with URL-safe characters.
 */
function toBase64Url(str: string): string {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return atob(base64);
}

/**
 * Encode favorites into a compact URL-safe string.
 * Extracts the basename (e.g. "DSC_1234.jpg") from each original URL,
 * joins with commas, then base64url-encodes.
 */
export function encodeFavorites(favorites: FavoriteStoreItem[]): string {
    const basenames = favorites.map((fav) => {
        const original = getPhotoOriginalUrl(fav);
        return original.split('/').pop() || original;
    });
    return toBase64Url(basenames.join(','));
}

/**
 * Decode a favorites hash string back into an array of basenames.
 */
export function decodeFavoritesHash(hash: string): string[] {
    try {
        const decoded = fromBase64Url(hash);
        return decoded.split(',').filter(Boolean);
    } catch {
        console.error('Failed to decode favorites hash');
        return [];
    }
}

/**
 * Build the full shareable favorites URL.
 */
export function buildFavoritesShareUrl(favorites: FavoriteStoreItem[]): string {
    const encoded = encodeFavorites(favorites);
    return `${window.location.origin}/portfolio/favorites#photos=${encoded}`;
}
