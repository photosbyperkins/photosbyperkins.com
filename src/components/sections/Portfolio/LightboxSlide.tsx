import { motion, useIsPresent, type MotionStyle } from 'framer-motion';
import { forwardRef, useImperativeHandle, memo, useState, useEffect, useCallback } from 'react';
import { useSlideZoom } from '../../../hooks/useSlideZoom';
import { isHiResReady, markHiResReady } from '../../../hooks/useImagePreloader';
import { getPhotoDisplayUrl } from '../../../utils/formatters';
import type { PhotoInput } from '../../../types';
import { withBuild } from '../../../utils/build';

let hasUserInteracted = false;
if (typeof window !== 'undefined') {
    const markInteracted = () => {
        hasUserInteracted = true;
    };
    window.addEventListener('pointerdown', markInteracted, { passive: true, once: true });
    window.addEventListener('keydown', markInteracted, { passive: true, once: true });
}

export interface LightboxSlideHandle {
    toggleZoom: (clientX?: number, clientY?: number) => void;
    resetZoom?: () => void;
}

export interface LightboxSlideProps {
    image: PhotoInput;
    alt: string;
    priority?: boolean;
    deferLoad?: boolean;
    onZoomChange?: (isZoomed: boolean) => void;
    onCanZoomChange?: (canZoom: boolean) => void;
    onLoad?: () => void;
    onSingleClick?: () => void;
}

const LightboxSlide = memo(
    forwardRef<LightboxSlideHandle, LightboxSlideProps>(function LightboxSlide(
        { image, alt, priority = false, deferLoad = false, onZoomChange, onCanZoomChange, onLoad, onSingleClick },
        ref
    ) {
    const isPresent = useIsPresent();
    const url = image ? (typeof image === 'string' ? image : image.original) : '';
    const displayUrl = url ? getPhotoDisplayUrl(url) : '';
    const fullDisplaySrc = displayUrl ? withBuild(displayUrl) : '';
    const avifThumbUrl =
        image && typeof image !== 'string' && image.thumb && image.thumb.endsWith('.avif') ? image.thumb : '';
    const imgWidth = image && typeof image !== 'string' ? image.width : undefined;
    const imgHeight = image && typeof image !== 'string' ? image.height : undefined;
    const focusX = image && typeof image !== 'string' ? image.focusX : undefined;
    const focusY = image && typeof image !== 'string' ? image.focusY : undefined;
    // Zoom onto the centre of the primary face when known (focusY marks the top of the head).
    const primaryFace = image && typeof image !== 'string' ? image.faces?.[0] : undefined;
    const zoomFocusX = primaryFace?.h != null ? primaryFace.x : focusX;
    const zoomFocusY = primaryFace?.h != null ? primaryFace.y : focusY;

    const [upgradedUrl, setUpgradedUrl] = useState<string | null>(null);
    const [zoomRequested, setZoomRequested] = useState(false);
    const [naturalDims, setNaturalDims] = useState<{ url: string; w: number; h: number } | null>(null);

    const isDisplayCached = Boolean(
        fullDisplaySrc && (upgradedUrl === displayUrl || isHiResReady(fullDisplaySrc))
    );

    const handleZoomChange = useCallback(
        (isZoomed: boolean) => {
            if (isZoomed) setZoomRequested(true);
            onZoomChange?.(isZoomed);
        },
        [onZoomChange]
    );

    useEffect(() => {
        if (deferLoad || !avifThumbUrl || !displayUrl || avifThumbUrl === displayUrl || isDisplayCached) {
            return;
        }
        let cancelled = false;
        const isColdBootDeepLink =
            !hasUserInteracted &&
            !zoomRequested &&
            typeof performance !== 'undefined' &&
            typeof performance.now === 'function' &&
            performance.now() < 2500;
        const delayMs = isColdBootDeepLink ? 2500 : 0;

        const startUpgrade = () => {
            if (cancelled) return;
            const hiRes = new Image();
            if ('fetchPriority' in hiRes) {
                hiRes.fetchPriority = priority ? 'high' : 'low';
            }
            hiRes.decoding = 'async';
            hiRes.src = fullDisplaySrc;
            const commit = () => {
                markHiResReady(fullDisplaySrc);
                if (!cancelled) setUpgradedUrl(displayUrl);
            };
            if (typeof hiRes.decode === 'function') {
                hiRes.decode().then(commit, commit);
            } else {
                hiRes.onload = commit;
            }
        };

        if (delayMs === 0) {
            startUpgrade();
            return () => {
                cancelled = true;
            };
        }

        const timer = setTimeout(startUpgrade, delayMs);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [deferLoad, avifThumbUrl, displayUrl, fullDisplaySrc, isDisplayCached, priority, zoomRequested]);

    const activeSrc = avifThumbUrl && !isDisplayCached ? avifThumbUrl : displayUrl;
    const hasExplicitDims = Boolean(imgWidth && imgHeight && imgWidth > 0 && imgHeight > 0);
    const fallbackDims = !hasExplicitDims && naturalDims?.url === url ? naturalDims : null;
    const aspectW = hasExplicitDims ? imgWidth! : fallbackDims ? fallbackDims.w : 3;
    const aspectH = hasExplicitDims ? imgHeight! : fallbackDims ? fallbackDims.h : 2;
    const fitWidthVh = Number(((aspectW / aspectH) * 100).toFixed(4));
    const fitHeightVw = Number(((aspectH / aspectW) * 100).toFixed(4));

    const { containerRef, scale, panX, panY, dragMode, constraints, toggleZoom, resetZoom, handleImageLoad, containerProps } =
        useSlideZoom({
            image,
            focusX: zoomFocusX,
            focusY: zoomFocusY,
            onZoomChange: handleZoomChange,
            onCanZoomChange,
            onSingleClick,
        });

    useImperativeHandle(ref, () => ({
        toggleZoom,
        resetZoom,
    }));

    if (!image) return null;

    return (
        <div className="portfolio__lightbox-image-container" ref={containerRef} {...containerProps}>
            {!deferLoad && (
                <motion.img
                    src={withBuild(activeSrc)}
                    alt={alt}
                    width={imgWidth}
                    height={imgHeight}
                    className={`portfolio__lightbox-image-full${dragMode ? ' is-zoomed' : ''}`}
                    fetchPriority={priority ? 'high' : 'low'}
                    decoding="async"
                    onLoad={(e) => {
                        const el = e.currentTarget;
                        if (!hasExplicitDims && el.naturalWidth > 0 && el.naturalHeight > 0) {
                            setNaturalDims((prev) =>
                                prev && prev.url === url && prev.w === el.naturalWidth && prev.h === el.naturalHeight
                                    ? prev
                                    : { url, w: el.naturalWidth, h: el.naturalHeight }
                            );
                        }
                        handleImageLoad();
                        if (onLoad) onLoad();
                    }}
                    style={
                        {
                            '--lightbox-img-w': `min(100%, ${fitWidthVh}vh)`,
                            '--lightbox-img-h': `min(100%, ${fitHeightVw}vw)`,
                            width: `min(100%, ${fitWidthVh}vh)`,
                            height: `min(100%, ${fitHeightVw}vw)`,
                            scale,
                            x: panX,
                            y: panY,
                            objectPosition: `${focusX != null ? focusX * 100 : 50}% ${focusY != null ? focusY * 100 : 50}%`,
                        } as MotionStyle
                    }
                    drag={isPresent ? dragMode : false}
                    dragConstraints={constraints}
                    dragElastic={0.1}
                    dragTransition={{ power: 0.25, timeConstant: 220, bounceStiffness: 400, bounceDamping: 40 }}
                    draggable={false}
                    key="stable"
                />
            )}
        </div>
    );
}));

export default LightboxSlide;
