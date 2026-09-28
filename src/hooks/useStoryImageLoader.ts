import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PhotoInput, PhotoRecord } from '../types';
import { getPhotoDisplayUrl } from '../utils/formatters';

declare const __BUILD_NUMBER__: string;

export interface UseStoryImageLoaderOptions {
    photo: PhotoInput;
    isOpen: boolean;
}

export interface UseStoryImageLoaderReturn {
    photoObj: PhotoRecord;
    originalSrc: string;
    displaySrc: string;
    thumbSrc: string;
    withBuild: (url: string) => string;
    loadedImage: HTMLImageElement | null;
    imageError: boolean;
    naturalDimensions: { width: number; height: number };
    setNaturalDimensions: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
}

/**
 * Custom hook to load full/display image into HTMLImageElement with multi-tier fallback and CORS resilience.
 */
export function useStoryImageLoader({ photo, isOpen }: UseStoryImageLoaderOptions): UseStoryImageLoaderReturn {
    const photoObj: PhotoRecord = useMemo(() => {
        return typeof photo === 'string' ? { original: photo, thumb: photo } : photo;
    }, [photo]);

    const originalSrc = photoObj.original || photoObj.src || '';
    const displaySrc = getPhotoDisplayUrl(originalSrc);
    const thumbSrc = photoObj.thumb || '';

    const buildQuery = typeof __BUILD_NUMBER__ !== 'undefined' ? `?v=${__BUILD_NUMBER__}` : '';
    const withBuild = useCallback(
        (url: string) => {
            if (!url) return '';
            return url.includes('?v=') ? url : `${url}${buildQuery}`;
        },
        [buildQuery]
    );

    const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
    const [imageError, setImageError] = useState(false);
    const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>(() => ({
        width: photoObj.width || 3840,
        height: photoObj.height || 2560,
    }));

    useEffect(() => {
        if (!isOpen || !displaySrc) return;

        let isCancelled = false;
        const candidateSources = [
            withBuild(displaySrc),
            displaySrc,
            withBuild(originalSrc),
            originalSrc,
            withBuild(thumbSrc),
            thumbSrc,
        ].filter(Boolean);

        const tryLoad = (srcIdx: number, useCors: boolean) => {
            if (isCancelled || srcIdx >= candidateSources.length) {
                if (!isCancelled) setImageError(true);
                return;
            }

            const targetSrc = candidateSources[srcIdx];
            const img = new Image();
            if (useCors) {
                img.crossOrigin = 'anonymous';
            }

            img.onload = () => {
                if (isCancelled) return;
                setLoadedImage(img);
                setNaturalDimensions({
                    width: img.naturalWidth || photoObj.width || 3840,
                    height: img.naturalHeight || photoObj.height || 2560,
                });
                setImageError(false);
            };

            img.onerror = () => {
                if (isCancelled) return;
                if (useCors) {
                    // Try the same URL without crossOrigin (in case server lacks CORS headers)
                    tryLoad(srcIdx, false);
                } else {
                    // Try the next candidate source with crossOrigin
                    tryLoad(srcIdx + 1, true);
                }
            };

            img.src = targetSrc;
        };

        tryLoad(0, true);

        return () => {
            isCancelled = true;
        };
    }, [isOpen, displaySrc, originalSrc, thumbSrc, photoObj.width, photoObj.height, withBuild]);

    return {
        photoObj,
        originalSrc,
        displaySrc,
        thumbSrc,
        withBuild,
        loadedImage,
        imageError,
        naturalDimensions,
        setNaturalDimensions,
    };
}
