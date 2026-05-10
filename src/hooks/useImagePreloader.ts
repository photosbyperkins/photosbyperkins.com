import { useEffect } from 'react';
import type { PhotoInput } from '../types';

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

            // Fire off immediate next/prev directly into the browser network pipeline
            const immediate = allIdxs.slice(0, 2);
            immediate.forEach((idx) => {
                const src = getDisplaySrc(images[idx]);
                if (src) {
                    const img = new Image();
                    img.src = src;
                }
            });

            // Asynchronously trickle-load the rest of the album sequentially
            const queued = allIdxs.slice(2);
            for (const idx of queued) {
                if (isCancelled) break;

                const src = getDisplaySrc(images[idx]);
                if (!src) continue;

                await new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = src;
                });

                // Micro-pause to yield to main UI thread / react rendering
                await new Promise((r) => setTimeout(r, 10));
            }
        };

        preloadAlbum();

        return () => {
            isCancelled = true;
        };
    }, [mainImageLoaded, currentIndex, images, getDisplaySrc]);
}
