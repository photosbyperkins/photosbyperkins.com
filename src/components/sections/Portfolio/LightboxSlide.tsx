import { forwardRef, useRef, useState, useCallback, useEffect, useImperativeHandle } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import type { PhotoInput } from '../../../types';

export interface LightboxSlideHandle {
    toggleZoom: (clientX?: number, clientY?: number) => void;
}

declare const __BUILD_NUMBER__: string;

const LightboxSlide = forwardRef<
    LightboxSlideHandle,
    {
        image: PhotoInput;
        alt: string;
        onZoomChange?: (isZoomed: boolean) => void;
        onCanZoomChange?: (canZoom: boolean) => void;
    }
>(function LightboxSlide({ image, alt, onZoomChange, onCanZoomChange }, ref) {
    const limitsRef = useRef<HTMLDivElement>(null);
    const [dragMode, setDragMode] = useState<boolean | 'x' | 'y'>(false);

    const url = image ? (typeof image === 'string' ? image : image.original) : '';
    const displayUrl = url ? url.replace(/^(?:\/)?photos\//i, '/webp/').replace(/\.jpe?g$/i, '.webp') : '';
    const focusX = image && typeof image !== 'string' ? image.focusX : undefined;
    const focusY = image && typeof image !== 'string' ? image.focusY : undefined;

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

    const isAnimatingInRef = useRef(false);

    const checkConstraints = useCallback(
        (targetScale?: number) => {
            const s = targetScale ?? scale.get();
            const img = limitsRef.current?.querySelector('img');
            const container = limitsRef.current;
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
        const img = limitsRef.current?.querySelector('img');
        if (img && img.clientWidth > 0) {
            maxScaleRef.current = Math.max(img.naturalWidth / img.clientWidth, 1);
            checkConstraints();
            if (onCanZoomChange) onCanZoomChange(maxScaleRef.current > 1.05);
        }
    }, [checkConstraints, onCanZoomChange]);

    useEffect(() => {
        // Fire manually if browser loaded image from cache silently
        const img = limitsRef.current?.querySelector('img');
        if (img && img.complete && img.clientWidth > 0) {
            // Need a tiny delay for React layout engine sizing to execute first frame
            setTimeout(calculateMaxScale, 50);
        }
    }, [image, calculateMaxScale]);

    useEffect(() => {
        const handleResize = () => {
            calculateMaxScale();
            animate(scale, 1);
            animate(panX, 0);
            animate(panY, 0);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [calculateMaxScale, panX, panY, scale]);

    useEffect(() => {
        scale.set(1);
        panX.set(0);
        panY.set(0);
        isZoomedInternalRef.current = false;
        if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
        if (onZoomChange) onZoomChange(false);
    }, [image, scale, panX, panY, onZoomChange]);

    const handleTouchStart = (e: React.TouchEvent) => {
         
        lastTouchTimeRef.current = Date.now();
        if (e.touches.length === 1) {
             
            const now = Date.now();
            const touch = e.touches[0];
            if (now - lastTapRef.current.time < 300) {
                const dx = touch.clientX - lastTapRef.current.x;
                const dy = touch.clientY - lastTapRef.current.y;
                if (Math.hypot(dx, dy) < 40) {
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
        if (!isZoomedInternalRef.current && scale.get() <= 1.05) {
            isAnimatingOutRef.current = true;
            setDragMode(false);
            animate(scale, 1, {
                type: 'spring',
                damping: 25,
                stiffness: 300,
                onComplete: () => {
                    isAnimatingOutRef.current = false;
                    checkConstraints(1);
                },
            });
            animate(panX, 0, { type: 'spring', damping: 25, stiffness: 300 });
            animate(panY, 0, { type: 'spring', damping: 25, stiffness: 300 });

            if (onZoomChange) onZoomChange(false);
            isZoomedInternalRef.current = false;

            if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
            releaseTimeoutRef.current = setTimeout(() => {
                // Stabilize track lock if needed, but for now we trust the immediate flip
            }, 300);
        }
    };

    const toggleZoom = useCallback(
        (clientX?: number, clientY?: number) => {
            if (scale.get() > 1.05) {
                isAnimatingOutRef.current = true;
                setDragMode(false);
                animate(scale, 1, {
                    type: 'spring',
                    damping: 25,
                    stiffness: 300,
                    onComplete: () => {
                        isAnimatingOutRef.current = false;
                        checkConstraints(1);
                    },
                });
                animate(panX, 0, { type: 'spring', damping: 25, stiffness: 300 });
                animate(panY, 0, { type: 'spring', damping: 25, stiffness: 300 });

                // Toggle UI icon immediately
                isZoomedInternalRef.current = false;
                if (onZoomChange) onZoomChange(false);

                if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current);
            } else {
                isAnimatingOutRef.current = false;
                isAnimatingInRef.current = true;
                setDragMode(false);

                const s = maxScaleRef.current;
                animate(scale, s, {
                    type: 'spring',
                    damping: 25,
                    stiffness: 300,
                    onComplete: () => {
                        isAnimatingInRef.current = false;
                        checkConstraints(s);
                        setDragMode(true);
                    },
                });

                // Panning logic
                const img = limitsRef.current?.querySelector('img');
                const container = limitsRef.current;
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
                        animate(panX, targetPanX, { type: 'spring', damping: 25, stiffness: 300 });
                        animate(panY, targetPanY, { type: 'spring', damping: 25, stiffness: 300 });
                    }
                }

                // Toggle UI icon immediately
                isZoomedInternalRef.current = true;
                if (onZoomChange) onZoomChange(true);
            }
        },
        [scale, panX, panY, onZoomChange, checkConstraints, focusX, focusY]
    );

    useImperativeHandle(ref, () => ({
        toggleZoom,
    }));

    const handleDoubleClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            // Ignore native double clicks if they immediately follow a handled touch event
            if (Date.now() - lastTouchTimeRef.current < 500) return;

            if (maxScaleRef.current > 1.05) {
                toggleZoom(e.clientX, e.clientY);
            }
        },
        [toggleZoom]
    );

    if (!image) return null;

    return (
        <div
            className="portfolio__lightbox-image-container"
            ref={limitsRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
        >
            <motion.img
                src={`${displayUrl}?v=${__BUILD_NUMBER__}`}
                alt={alt}
                className="portfolio__lightbox-image-full"
                onLoad={calculateMaxScale}
                style={{
                    scale,
                    x: panX,
                    y: panY,
                    objectPosition: `${focusX != null ? focusX * 100 : 50}% ${focusY != null ? focusY * 100 : 50}%`,
                }}
                drag={dragMode}
                dragConstraints={constraints}
                dragElastic={0.1}
                draggable={false}
                key="stable"
            />
        </div>
    );
});

export default LightboxSlide;
