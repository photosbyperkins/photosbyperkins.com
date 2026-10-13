import { useState, useCallback, useMemo, useRef } from 'react';
import { useMotionValue, useTransform, animate, type PanInfo, type MotionValue } from 'framer-motion';
import type { PhotoInput } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { SPRING_SLIDE } from '../utils/motion';

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
    /** Max horizontal drag (px) for the scrubber; always leaves maxDist slices covering the viewport. */
    scrubMaxDrag: number;
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
    paginate: (direction: number, velocity?: number) => Promise<void>;
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
    const isAnimatingRef = useRef(false);

    // Slices needed so the track never shows empty slots: half the viewport is
    // visible on each side of the playhead, and the scrubber can be dragged up to
    // scrubMaxDrag in either direction on top of that.
    const vw = windowWidth || 1200;

    const currentOpacity = useTransform(x, [-vw, 0, vw], [0, 1, 0]);
    const prevOpacity = useTransform(x, [0, vw], [0, 1]);
    const nextOpacity = useTransform(x, [-vw, 0], [1, 0]);

    // Map the horizontal swipe down to a 72px physical tracking shift
    const dragShift = useTransform(x, [-vw, 0, vw], [-72, 0, 72]);

    const halfVisibleSlices = Math.ceil(vw / 2 / 72) + 2;
    const scrubDragSlices = Math.ceil(vw / 72) + 2;
    const maxDist = halfVisibleSlices + scrubDragSlices;
    const scrubMaxDrag = scrubDragSlices * 72;

    // The center slice (offset 0) is at position maxDist in the rendered array.
    // Its center is at (maxDist * 72 + 36) from the track's left edge.
    const trackX = useTransform(dragShift, (shift) => vw / 2 - (maxDist * 72 + 36) + shift);

    // Drive scrubber thumb opacities from drag progress
    const thumbOpacity0 = useTransform(x, [-vw, 0, vw], [0.5, 1, 0.5]);
    const thumbOpacityPrev = useTransform(x, [0, vw], [0.5, 1]);
    const thumbOpacityNext = useTransform(x, [-vw, 0], [1, 0.5]);

    // Drive the playhead heart crossfade from drag progress
    const prevPhoto = useMemo(() => images[(index - 1 + images.length) % images.length], [images, index]);
    const nextPhoto = useMemo(() => images[(index + 1) % images.length], [images, index]);
    const isPrevFavorite = useMemo(() => checkIfFavorite(prevPhoto), [checkIfFavorite, prevPhoto]);
    const isNextFavorite = useMemo(() => checkIfFavorite(nextPhoto), [checkIfFavorite, nextPhoto]);

    const filledHeartOpacity = useTransform(x, (latest) => {
        const progress = Math.min(1, Math.abs(latest) / vw);
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
        async (newDirection: number, velocity: number = 0) => {
            if (isAnimatingRef.current || images.length === 0) return;
            isAnimatingRef.current = true;
            setIsAnimating(true);
            onZoomReset?.();
            triggerHaptic('tick');

            try {
                const nextIndex = (index + newDirection + images.length) % images.length;

                // Animate the track
                if (reducedMotion) {
                    x.set(newDirection > 0 ? -vw : vw);
                } else {
                    await animate(x, newDirection > 0 ? -vw : vw, {
                        ...SPRING_SLIDE,
                        velocity,
                    });
                }

                // Preload the ambient thumbnail for the destination photo to avoid flash
                // (skip when using sprite — it's already fully loaded)
                if (!spriteUrl) {
                    const nextThumbSrc = getThumbSrc(images[nextIndex]);
                    if (nextThumbSrc) {
                        await new Promise<void>((resolve) => {
                            let timer: ReturnType<typeof setTimeout> | null = null;
                            const done = () => {
                                if (timer !== null) clearTimeout(timer);
                                resolve();
                            };
                            const img = new Image();
                            img.onload = done;
                            img.onerror = done;
                            img.src = nextThumbSrc;
                            timer = setTimeout(done, 200);
                        });
                    }
                }

                // Update index and reset position
                onSetIndex(nextIndex);
                x.stop();
                x.set(0);
            } finally {
                isAnimatingRef.current = false;
                setIsAnimating(false);
            }
        },
        [index, images, x, onSetIndex, spriteUrl, getThumbSrc, reducedMotion, vw, onZoomReset]
    );

    const onDragEnd = useCallback(
        (_e: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
            const proj = offset.x + velocity.x * 0.2;
            const t = Math.min(120, vw * 0.2);
            if (proj < -t) {
                paginate(1, velocity.x);
            } else if (proj > t) {
                paginate(-1, velocity.x);
            } else {
                // Snap back to center
                if (reducedMotion) {
                    x.set(0);
                } else {
                    animate(x, 0, { ...SPRING_SLIDE, velocity: velocity.x });
                }
            }
        },
        [paginate, x, vw, reducedMotion]
    );

    return {
        x,
        isAnimating,
        maxDist,
        scrubMaxDrag,
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
