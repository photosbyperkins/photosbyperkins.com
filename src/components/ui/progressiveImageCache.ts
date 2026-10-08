/**
 * Module-level record of image sources that have already finished loading.
 * Lets remounted ProgressiveImage instances skip the shimmer/fade for cached images.
 * Kept separate from the component so React Fast Refresh can hot-reload it cleanly.
 */
export const loadedSrcs = new Set<string>();

export const clearLoadedSrcs = () => loadedSrcs.clear();
