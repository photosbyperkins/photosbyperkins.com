import { useEffect } from 'react';
import type { PhotoInput } from '../types';

const MAX_READY_CACHE_ENTRIES = 250;
const hiResReadyCache = new Set<string>();

export function markHiResReady(src: string): void {
    if (!src) return;
    if (hiResReadyCache.size >= MAX_READY_CACHE_ENTRIES && !hiResReadyCache.has(src)) {
        const oldest = hiResReadyCache.values().next().value;
        if (oldest !== undefined) hiResReadyCache.delete(oldest);
    }
    hiResReadyCache.add(src);
}

export function isHiResReady(src: string): boolean {
    if (!src) return false;
    if (hiResReadyCache.has(src)) return true;
    if (typeof Image !== 'undefined') {
        const probe = new Image();
        probe.src = src;
        if (probe.complete && probe.naturalWidth > 0) {
            markHiResReady(src);
            return true;
        }
    }
    return false;
}

export function clearHiResReadyCache(): void {
    hiResReadyCache.clear();
}

interface UseImagePreloaderProps {
    images: PhotoInput[];
    currentIndex: number;
    mainImageLoaded: boolean;
    getDisplaySrc: (photo: PhotoInput) => string | undefined;
}

export function useImagePreloader({ images, currentIndex, mainImageLoaded, getDisplaySrc }: UseImagePreloaderProps) {
    useEffect(() => {
        if (!mainImageLoaded) return; // Wait for the high-res image the user is staring at to finish loading FIRST!

        let isCancelled = false;
        const total = images.length;

        const preloadAlbum = async () => {
            if (total <= 1) return;

            // Sort all indices by distance from current index
            const allIdxs: number[] = [];
            for (let i = 0; i < total; i++) {
                if (i !== currentIndex) allIdxs.push(i);
            }

            allIdxs.sort((a, b) => {
                const distA = Math.min((a - currentIndex + total) % total, (currentIndex - a + total) % total);
                const distB = Math.min((b - currentIndex + total) % total, (currentIndex - b + total) % total);
                if (distA === distB) {
                    // Tie-breaker: prioritize forward images
                    const isAForward = (a - currentIndex + total) % total === distA;
                    return isAForward ? -1 : 1;
                }
                return distA - distB;
            });

            const isSaveData =
                typeof navigator !== 'undefined' &&
                Boolean((navigator as { connection?: { saveData?: boolean } }).connection?.saveData);
            if (isSaveData) return;

            // Fire off immediate next/prev directly into the browser network pipeline and pre-decode
            const immediate = allIdxs.slice(0, 2);
            immediate.forEach((idx) => {
                const src = getDisplaySrc(images[idx]);
                if (src && !hiResReadyCache.has(src)) {
                    const img = new Image();
                    if ('fetchPriority' in img) {
                        img.fetchPriority = 'low';
                    }
                    img.decoding = 'async';
                    img.onload = () => {
                        if (typeof img.decode === 'function') {
                            img.decode().then(
                                () => markHiResReady(src),
                                () => markHiResReady(src)
                            );
                        } else {
                            markHiResReady(src);
                        }
                    };
                    img.src = src;
                }
            });

            // Wait briefly for immediate neighbours and UI animations to settle before trickling outer radius
            await new Promise((r) => setTimeout(r, 400));
            if (isCancelled) return;

            // Asynchronously trickle-load the nearest photos (capped to prevent bandwidth/memory exhaustion)
            const MAX_PRELOAD_RADIUS = 6;
            const queued = allIdxs.slice(2, 2 + MAX_PRELOAD_RADIUS);
            for (const idx of queued) {
                if (isCancelled) break;

                const src = getDisplaySrc(images[idx]);
                if (!src || hiResReadyCache.has(src)) continue;

                await new Promise<void>((resolve) => {
                    const img = new Image();
                    if ('fetchPriority' in img) {
                        img.fetchPriority = 'low';
                    }
                    img.decoding = 'async';
                    const timer = setTimeout(() => {
                        img.onload = null;
                        img.onerror = null;
                        resolve();
                    }, 8000);
                    img.onload = () => {
                        clearTimeout(timer);
                        if (typeof img.decode === 'function') {
                            img.decode().then(
                                () => {
                                    markHiResReady(src);
                                    resolve();
                                },
                                () => {
                                    markHiResReady(src);
                                    resolve();
                                }
                            );
                        } else {
                            markHiResReady(src);
                            resolve();
                        }
                    };
                    img.onerror = () => {
                        clearTimeout(timer);
                        resolve();
                    };
                    img.src = src;
                });

                // Pause to yield to main UI thread / network
                await new Promise((r) => setTimeout(r, 100));
            }
        };

        preloadAlbum();

        return () => {
            isCancelled = true;
        };
    }, [mainImageLoaded, currentIndex, images, getDisplaySrc]);
}
