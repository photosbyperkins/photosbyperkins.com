import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PhotoInput, PhotoRecord } from '../types';
import { getPhotoDisplayUrl } from '../utils/formatters';
import { withBuild as withBuildUtil } from '../utils/build';

export interface UseStoryImageLoaderOptions {
    photo: PhotoInput;
    isOpen: boolean;
    burstSources?: string[];
}

export function isCrossOriginUrl(url: string): boolean {
    if (typeof window === 'undefined' || !url) return false;
    try {
        const parsed = new URL(url, window.location.href);
        return parsed.origin !== window.location.origin;
    } catch {
        return false;
    }
}

export interface UseStoryImageLoaderReturn {
    photoObj: PhotoRecord;
    originalSrc: string;
    displaySrc: string;
    thumbSrc: string;
    withBuild: (url: string) => string;
    loadedImage: HTMLImageElement | null;
    loadedBurstImages: HTMLImageElement[];
    burstLoading: boolean;
    imageError: boolean;
    isTainted: boolean;
    naturalDimensions: { width: number; height: number };
    setNaturalDimensions: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
}

function loadHtmlImage(
    url: string,
    withBuild: (s: string) => string,
    onTainted?: () => void
): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const display = getPhotoDisplayUrl(url);
        const candidates = [withBuild(display), display, withBuild(url), url].filter(Boolean);

        const tryLoad = (idx: number, useCors: boolean) => {
            if (idx >= candidates.length) {
                reject(new Error(`Failed to load ${url}`));
                return;
            }
            const img = new Image();
            if (useCors) img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (!useCors && isCrossOriginUrl(candidates[idx])) {
                    onTainted?.();
                }
                resolve(img);
            };
            img.onerror = () => {
                if (useCors) tryLoad(idx, false);
                else tryLoad(idx + 1, true);
            };
            img.src = candidates[idx];
            if (img.complete && img.naturalWidth && img.naturalHeight) {
                if (!useCors && isCrossOriginUrl(candidates[idx])) {
                    onTainted?.();
                }
                resolve(img);
            }
        };
        tryLoad(0, true);
    });
}

/**
 * Custom hook to load full/display image into HTMLImageElement with multi-tier fallback and CORS resilience.
 */
export function useStoryImageLoader({
    photo,
    isOpen,
    burstSources,
}: UseStoryImageLoaderOptions): UseStoryImageLoaderReturn {
    const photoObj: PhotoRecord = useMemo(() => {
        return typeof photo === 'string' ? { original: photo, thumb: photo } : photo;
    }, [photo]);

    const originalSrc = photoObj.original || photoObj.src || '';
    const displaySrc = getPhotoDisplayUrl(originalSrc);
    const thumbSrc = photoObj.thumb || '';

    const withBuild = useCallback(
        (url: string) => withBuildUtil(url),
        []
    );

    const burstSourcesKey = isOpen && burstSources && burstSources.length >= 2 ? burstSources.join('|') : '';
    const [prevBurstKey, setPrevBurstKey] = useState(burstSourcesKey);
    const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
    const [loadedBurstImages, setLoadedBurstImages] = useState<HTMLImageElement[]>([]);
    const [burstLoading, setBurstLoading] = useState(() => Boolean(burstSourcesKey));
    const [imageError, setImageError] = useState(false);
    const [isTainted, setIsTainted] = useState(false);
    const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>(() => ({
        width: photoObj.width || 3840,
        height: photoObj.height || 2560,
    }));
    const currentSrcKey = `${isOpen ? 'open' : 'closed'}|${displaySrc}|${originalSrc}`;
    const [prevSrcKey, setPrevSrcKey] = useState(currentSrcKey);

    if (prevSrcKey !== currentSrcKey) {
        setPrevSrcKey(currentSrcKey);
        setIsTainted(false);
        setLoadedImage(null);
        setNaturalDimensions({
            width: photoObj.width || 3840,
            height: photoObj.height || 2560,
        });
    }

    if (prevBurstKey !== burstSourcesKey) {
        setPrevBurstKey(burstSourcesKey);
        if (burstSourcesKey) {
            setBurstLoading(true);
        } else {
            setLoadedBurstImages([]);
            setBurstLoading(false);
        }
    }

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
                if (!useCors && isCrossOriginUrl(targetSrc)) {
                    setIsTainted(true);
                }
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
            if (img.complete && img.naturalWidth && img.naturalHeight) {
                img.onload?.(new Event('load'));
            }
        };

        tryLoad(0, true);

        return () => {
            isCancelled = true;
        };
    }, [isOpen, displaySrc, originalSrc, thumbSrc, photoObj.width, photoObj.height, withBuild]);

    useEffect(() => {
        if (!isOpen || !burstSources || burstSources.length < 2) {
            return;
        }

        let isCancelled = false;

        Promise.allSettled(
            burstSources.map((src) => {
                if (src === originalSrc && loadedImage) {
                    return Promise.resolve(loadedImage);
                }
                return loadHtmlImage(src, withBuild, () => {
                    if (!isCancelled) {
                        setIsTainted(true);
                    }
                });
            })
        )
            .then((results) => {
                if (isCancelled) return;
                const imgs = results.map((r) =>
                    r.status === 'fulfilled' ? r.value : loadedImage || null
                ).filter((img): img is HTMLImageElement => img !== null);
                setLoadedBurstImages(imgs);
                setBurstLoading(false);
            })
            .catch((err) => {
                if (isCancelled) return;
                console.error('Failed to load burst images:', err);
                setBurstLoading(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [isOpen, burstSources, burstSourcesKey, originalSrc, loadedImage, withBuild]);

    return {
        photoObj,
        originalSrc,
        displaySrc,
        thumbSrc,
        withBuild,
        loadedImage,
        loadedBurstImages,
        burstLoading,
        imageError,
        isTainted,
        naturalDimensions,
        setNaturalDimensions,
    };
}
