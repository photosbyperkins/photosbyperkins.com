/**
 * Global build utilities and asset versioning.
 *
 * Implements intelligent cache-busting:
 * - Immutable album media (/photos/, /thumbnails/, /avif/, /webp/)
 *   are cached for 1 year by browsers/service workers and are not invalidated on every code deploy.
 * - Dynamic data and mutable assets can still append versioning when explicitly needed.
 */

export function getBuildNumber(): string {
    return typeof __BUILD_NUMBER__ !== 'undefined' ? __BUILD_NUMBER__ : '';
}

/**
 * Appends the build query parameter to dynamic assets, while avoiding
 * aggressive cache-busting on immutable photo media.
 *
 * @param url The asset URL to format
 * @param force Whether to force appending the build query even for media files
 */
export function withBuild(url: string | undefined | null, force = false): string {
    if (!url) return '';
    // Skip cache-busting for immutable album media unless explicitly forced
    const isImmutableMedia = /\/(?:photos|thumbnails|avif|webp)\//i.test(url);
    if (isImmutableMedia && !force) {
        return url;
    }
    const build = getBuildNumber();
    if (!build || url.includes('?v=') || url.includes('?build=') || url.includes('?h=') || url.includes('&h=')) {
        return url;
    }
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${build}`;
}

/**
 * Triggers a client-side browser download for a photo URL.
 */
export function triggerPhotoDownload(src: string): void {
    if (!src || typeof document === 'undefined') return;
    const link = document.createElement('a');
    link.href = withBuild(src);
    link.download = src.split('/').pop() || 'photo.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
