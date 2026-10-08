import { useMotionValue, animate, type MotionValue } from 'framer-motion';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { useReducedMotion } from './useReducedMotion';
import { SPRING_ZOOM } from '../utils/motion';
import type { PhotoInput } from '../types';

export interface UseSlideZoomOptions {
    image: PhotoInput;
    focusX?: number;
    focusY?: number;
    onZoomChange?: (isZoomed: boolean) => void;
    onCanZoomChange?: (canZoom: boolean) => void;
    onSingleClick?: () => void;
    reducedMotion?: boolean;
}

export interface UseSlideZoomReturn {
    containerRef: React.RefObject<HTMLDivElement | null>;
    scale: MotionValue<number>;
    panX: MotionValue<number>;
    panY: MotionValue<number>;
    dragMode: boolean | 'x' | 'y';
    constraints: { left: number; right: number; top: number; bottom: number };
    toggleZoom: (clientX?: number, clientY?: number) => void;
    handleImageLoad: () => void;
    containerProps: {
        onTouchStart: (e: React.TouchEvent) => void;
        onTouchEnd: () => void;
        onTouchCancel: () => void;
        onPointerDown: (e: React.PointerEvent) => void;
        onClick: (e: React.MouseEvent) => void;
        onDoubleClick: (e: React.MouseEvent) => void;
    };
}

export function useSlideZoom({
    image,
    focusX,
    focusY,
    onZoomChange,
    onCanZoomChange,
    onSingleClick,
    reducedMotion,
}: UseSlideZoomOptions): UseSlideZoomReturn {
    const isReducedMotion = useReducedMotion();
    const reduced = reducedMotion ?? isReducedMotion;
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [dragMode, setDragMode] = useState<boolean | 'x' | 'y'>(false);

    const panX = useMotionValue(0);
    const panY = useMotionValue(0);
    const scale = useMotionValue(1);

    const [constraints, setConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

    const maxScaleRef = useRef<number>(1);
    const isZoomedInternalRef = useRef(false);
    const isAnimatingOutRef = useRef(false);
    const releaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
    const lastTouchTimeRef = useRef<number>(0);
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const lastDoubleTapTimeRef = useRef<number>(0);

    const isAnimatingInRef = useRef(false);

    const animateTo = useCallback(
        (mv: MotionValue<number>, target: number, onComplete?: () => void) => {
            if (reduced) {
                mv.set(target);
                onComplete?.();
            } else {
                animate(mv, target, onComplete ? { ...SPRING_ZOOM, onComplete } : SPRING_ZOOM);
            }
        },
        [reduced]
    );

    const checkConstraints = useCallback(
        (targetScale?: number) => {
            const s = targetScale ?? scale.get();
            const img = containerRef.current?.querySelector('img');
            const container = containerRef.current;
            if (!img || !container) return;

            const cw = container.clientWidth;
            const ch = container.clientHeight;
            const iw = img.clientWidth * s;
            const ih = img.clientHeight * s;

            setConstraints({
                left: Math.min(0, (cw - iw) / 2),
                right: Math.max(0, (iw - cw) / 2),
                top: Math.min(0, (ch - ih) / 2),
                bottom: Math.max(0, (ih - ch) / 2),
            });
        },
        [scale]
    );

    useEffect(() => {
        const unsub = scale.on('change', () => {
            const currentScale = scale.get();
            const isNowZoomed = currentScale > 1.01;

            if (isNowZoomed && !isZoomedInternalRef.current && !isAnimatingOutRef.current) {
                isZoomedInternalRef.current = true;
                if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
                if (onZoomChange) onZoomChange(true);
            }
        });
        return unsub;
    }, [scale, onZoomChange]);

    const calculateMaxScale = useCallback(() => {
        const img = containerRef.current?.querySelector('img');
        if (img && img.clientWidth > 0) {
            maxScaleRef.current = Math.max(img.naturalWidth / img.clientWidth, 1);
            checkConstraints();
            if (onCanZoomChange) onCanZoomChange(maxScaleRef.current > 1.05);
        }
    }, [checkConstraints, onCanZoomChange]);

    useEffect(() => {
        // Fire manually if browser loaded image from cache silently
        const img = containerRef.current?.querySelector('img');
        if (img && img.complete && img.clientWidth > 0) {
            // Need a tiny delay for React layout engine sizing to execute first frame
            const timer = setTimeout(calculateMaxScale, 50);
            return () => clearTimeout(timer);
        }
    }, [image, calculateMaxScale]);

    const handleResize = useCallback(() => {
        calculateMaxScale();
        if (scale.get() > 1.05 || isZoomedInternalRef.current) {
            isAnimatingOutRef.current = true;
            setDragMode(false);
            animateTo(scale, 1, () => {
                isAnimatingOutRef.current = false;
                checkConstraints(1);
            });
            animateTo(panX, 0);
            animateTo(panY, 0);

            isZoomedInternalRef.current = false;
            if (onZoomChange) onZoomChange(false);
            if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
        }
    }, [animateTo, calculateMaxScale, checkConstraints, onZoomChange, scale]);

    const debouncedResize = useDebounce(handleResize, 150);

    useEffect(() => {
        window.addEventListener('resize', debouncedResize);
        return () => window.removeEventListener('resize', debouncedResize);
    }, [debouncedResize]);

    useEffect(() => {
        scale.set(1);
        panX.set(0);
        panY.set(0);
        isZoomedInternalRef.current = false;
        if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
        if (onZoomChange) onZoomChange(false);
    }, [image, scale, panX, panY, onZoomChange]);

    const toggleZoom = useCallback(
        (clientX?: number, clientY?: number) => {
            if (scale.get() > 1.05) {
                isAnimatingOutRef.current = true;
                setDragMode(false);
                animateTo(scale, 1, () => {
                    isAnimatingOutRef.current = false;
                    checkConstraints(1);
                });
                animateTo(panX, 0);
                animateTo(panY, 0);

                // Toggle UI icon immediately
                isZoomedInternalRef.current = false;
                if (onZoomChange) onZoomChange(false);

                if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
            } else {
                isAnimatingOutRef.current = false;
                isAnimatingInRef.current = true;
                setDragMode(false);

                const s = maxScaleRef.current;
                animateTo(scale, s, () => {
                    isAnimatingInRef.current = false;
                    checkConstraints(s);
                    setDragMode(true);
                });

                // Panning logic
                const img = containerRef.current?.querySelector('img');
                const container = containerRef.current;
                if (img && container) {
                    const cw = container.clientWidth;
                    const ch = container.clientHeight;
                    const iw = img.clientWidth * s;
                    const ih = img.clientHeight * s;

                    const maxX = Math.max(0, (iw - cw) / 2);
                    const maxY = Math.max(0, (ih - ch) / 2);

                    let targetPanX: number;
                    let targetPanY: number;

                    if (clientX != null && clientY != null) {
                        const rect = container.getBoundingClientRect();
                        const tapX = clientX - rect.left;
                        const tapY = clientY - rect.top;
                        const centerX = cw / 2;
                        const centerY = ch / 2;
                        const panDistX = -(tapX - centerX) * (s - 1);
                        const panDistY = -(tapY - centerY) * (s - 1);
                        targetPanX = Math.max(-maxX, Math.min(panDistX, maxX));
                        targetPanY = Math.max(-maxY, Math.min(panDistY, maxY));
                    } else {
                        const panDistX = focusX != null ? iw / 2 - iw * focusX : 0;
                        const panDistY = focusY != null ? ih / 2 - ih * focusY : ih / 6;
                        targetPanX = Math.max(-maxX, Math.min(panDistX, maxX));
                        targetPanY = Math.max(-maxY, Math.min(panDistY, maxY));
                    }

                    if (targetPanX !== 0 || targetPanY !== 0) {
                        animateTo(panX, targetPanX);
                        animateTo(panY, targetPanY);
                    }
                }

                // Toggle UI icon immediately
                isZoomedInternalRef.current = true;
                if (onZoomChange) onZoomChange(true);
            }
        },
        [scale, panX, panY, onZoomChange, checkConstraints, focusX, focusY]
    );

    const handleTouchStart = (e: React.TouchEvent) => {
        lastTouchTimeRef.current = Date.now();
        if (e.touches.length === 1) {
            const now = Date.now();
            const touch = e.touches[0];
            if (now - lastTapRef.current.time < 300) {
                const dx = touch.clientX - lastTapRef.current.x;
                const dy = touch.clientY - lastTapRef.current.y;
                if (Math.hypot(dx, dy) < 40) {
                    lastDoubleTapTimeRef.current = Date.now();
                    if (clickTimeoutRef.current) {
                        clearTimeout(clickTimeoutRef.current);
                        clickTimeoutRef.current = null;
                    }
                    if (maxScaleRef.current > 1.05) {
                        e.preventDefault();
                        toggleZoom(touch.clientX, touch.clientY);
                    }
                    lastTapRef.current.time = 0;
                }
            } else {
                lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
            }
        }
    };

    const handleTouchEnd = () => {
        if (scale.get() === 1 && panX.get() === 0 && panY.get() === 0) {
            return;
        }
        if (!isZoomedInternalRef.current && scale.get() <= 1.05) {
            isAnimatingOutRef.current = true;
            setDragMode(false);
            animateTo(scale, 1, () => {
                isAnimatingOutRef.current = false;
                checkConstraints(1);
            });
            animateTo(panX, 0);
            animateTo(panY, 0);

            if (onZoomChange) onZoomChange(false);
            isZoomedInternalRef.current = false;

            if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        pointerDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    };

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();

            if (Date.now() - lastDoubleTapTimeRef.current < 500) return;

            if (pointerDownRef.current) {
                const dx = Math.abs(e.clientX - pointerDownRef.current.x);
                const dy = Math.abs(e.clientY - pointerDownRef.current.y);
                const dt = Date.now() - pointerDownRef.current.time;
                if (dx > 10 || dy > 10 || dt > 500) return;
            }

            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
            } else {
                clickTimeoutRef.current = setTimeout(() => {
                    clickTimeoutRef.current = null;
                    if (onSingleClick) onSingleClick();
                }, 300);
            }
        },
        [onSingleClick]
    );

    const handleDoubleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
            }
            // Ignore native double clicks if they immediately follow a handled touch event
            if (Date.now() - lastTouchTimeRef.current < 500) return;

            if (maxScaleRef.current > 1.05) {
                toggleZoom(e.clientX, e.clientY);
            }
        },
        [toggleZoom]
    );

    return {
        containerRef,
        scale,
        panX,
        panY,
        dragMode,
        constraints,
        toggleZoom,
        handleImageLoad: calculateMaxScale,
        containerProps: {
            onTouchStart: handleTouchStart,
            onTouchEnd: handleTouchEnd,
            onTouchCancel: handleTouchEnd,
            onPointerDown: handlePointerDown,
            onClick: handleClick,
            onDoubleClick: handleDoubleClick,
        },
    };
}
