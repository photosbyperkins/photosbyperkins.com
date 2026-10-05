import { useState, useCallback, useMemo } from 'react';
import { useMotionValue, useTransform, animate, type PanInfo, type MotionValue } from 'framer-motion';
import type { PhotoInput } from '../types';
import { triggerHaptic } from '../utils/haptics';

export interface UseLightboxGesturesOptions {
    images: PhotoInput[];
    index: number;
    windowWidth: number;
    reducedMotion: boolean;
    spriteUrl?: string | null;
    isFavorite: boolean;
    checkIfFavorite: (photo: PhotoInput) => boolean;
    getThumbSrc: (photo: PhotoInput) => string | undefined;
    onSetIndex: (idx: number) => void;
    onZoomReset?: () => void;
}

export interface UseLightboxGesturesReturn {
    x: MotionValue<number>;
    isAnimating: boolean;
    maxDist: number;
    currentOpacity: MotionValue<number>;
    prevOpacity: MotionValue<number>;
    nextOpacity: MotionValue<number>;
    trackX: MotionValue<number>;
    thumbOpacity0: MotionValue<number>;
    thumbOpacityPrev: MotionValue<number>;
    thumbOpacityNext: MotionValue<number>;
    filledHeartOpacity: MotionValue<number>;
    emptyHeartOpacity: MotionValue<number>;
    filledHeartScale: MotionValue<number>;
    paginate: (direction: number) => Promise<void>;
    onDragEnd: (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
}

export function useLightboxGestures({
    images,
    index,
    windowWidth,
    reducedMotion,
    spriteUrl,
    isFavorite,
    checkIfFavorite,
    getThumbSrc,
    onSetIndex,
    onZoomReset,
}: UseLightboxGesturesOptions): UseLightboxGesturesReturn {
    const x = useMotionValue(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const currentOpacity = useTransform(x, [-windowWidth, 0, windowWidth], [0, 1, 0]);
    const prevOpacity = useTransform(x, [0, windowWidth], [0, 1]);
    const nextOpacity = useTransform(x, [-windowWidth, 0], [1, 0]);

    // Map the horizontal swipe down to a 72px physical tracking shift
    const dragShift = useTransform(x, [-windowWidth, 0, windowWidth], [-72, 0, 72]);

    // Slices needed to cover the physical drag range (±10,000px) plus viewport margins so the track
    // never runs out of thumbnails and wraps around seamlessly during long scrubber drags.
    const maxDragPixels = 10000 + (windowWidth || 1200) / 2;
    const minVisibleSlices = Math.max(5, Math.ceil((windowWidth || 1200) / 72) + 8);
    const maxDist = Math.max(Math.floor(minVisibleSlices / 2), Math.ceil(maxDragPixels / 72));

    // The center slice (offset 0) is at position maxDist in the rendered array.
    // Its center is at (maxDist * 72 + 36) from the track's left edge.
    const trackX = useTransform(dragShift, (shift) => windowWidth / 2 - (maxDist * 72 + 36) + shift);

    // Drive scrubber thumb opacities from drag progress
    const thumbOpacity0 = useTransform(x, [-windowWidth, 0, windowWidth], [0.5, 1, 0.5]);
    const thumbOpacityPrev = useTransform(x, [0, windowWidth], [0.5, 1]);
    const thumbOpacityNext = useTransform(x, [-windowWidth, 0], [1, 0.5]);

    // Drive the playhead heart crossfade from drag progress
    const prevPhoto = useMemo(() => images[(index - 1 + images.length) % images.length], [images, index]);
    const nextPhoto = useMemo(() => images[(index + 1) % images.length], [images, index]);
    const isPrevFavorite = useMemo(() => checkIfFavorite(prevPhoto), [checkIfFavorite, prevPhoto]);
    const isNextFavorite = useMemo(() => checkIfFavorite(nextPhoto), [checkIfFavorite, nextPhoto]);

    const filledHeartOpacity = useTransform(x, (latest) => {
        const progress = Math.min(1, Math.abs(latest) / windowWidth);
        const current = isFavorite ? 1 : 0;
        if (latest > 0) {
            // Dragging right → going to previous
            const target = isPrevFavorite ? 1 : 0;
            return current + (target - current) * progress;
        } else if (latest < 0) {
            // Dragging left → going to next
            const target = isNextFavorite ? 1 : 0;
            return current + (target - current) * progress;
        }
        return current;
    });

    const emptyHeartOpacity = useTransform(filledHeartOpacity, (v) => 1 - v);
    const filledHeartScale = useTransform(filledHeartOpacity, (v) => 0.8 + v * 0.2);

    const paginate = useCallback(
        async (newDirection: number) => {
            if (isAnimating) return;
            setIsAnimating(true);
            onZoomReset?.();
            triggerHaptic('tick');

            const nextIndex = (index + newDirection + images.length) % images.length;

            // Animate the track
            if (reducedMotion) {
                x.set(newDirection > 0 ? -windowWidth : windowWidth);
            } else {
                await animate(x, newDirection > 0 ? -windowWidth : windowWidth, {
                    type: 'spring',
                    stiffness: 450,
                    damping: 40,
                    restDelta: 0.5,
                });
            }

            // Preload the ambient thumbnail for the destination photo to avoid flash
            // (skip when using sprite — it's already fully loaded)
            if (!spriteUrl) {
                const nextThumbSrc = getThumbSrc(images[nextIndex]);
                if (nextThumbSrc) {
                    await new Promise<void>((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                        img.src = nextThumbSrc;
                        setTimeout(resolve, 200);
                    });
                }
            }

            // Update index and reset position
            onSetIndex(nextIndex);
            x.stop();
            x.set(0);
            setIsAnimating(false);
        },
        [isAnimating, index, images, x, onSetIndex, spriteUrl, getThumbSrc, reducedMotion, windowWidth, onZoomReset]
    );

    const onDragEnd = useCallback(
        (_e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
            const swipeThreshold = 50;
            if (offset.x < -swipeThreshold || velocity.x < -500) {
                paginate(1);
            } else if (offset.x > swipeThreshold || velocity.x > 500) {
                paginate(-1);
            } else {
                // Snap back to center
                animate(x, 0, { type: 'spring', stiffness: 450, damping: 40 });
            }
        },
        [paginate, x]
    );

    return {
        x,
        isAnimating,
        maxDist,
        currentOpacity,
        prevOpacity,
        nextOpacity,
        trackX,
        thumbOpacity0,
        thumbOpacityPrev,
        thumbOpacityNext,
        filledHeartOpacity,
        emptyHeartOpacity,
        filledHeartScale,
        paginate,
        onDragEnd,
    };
}
