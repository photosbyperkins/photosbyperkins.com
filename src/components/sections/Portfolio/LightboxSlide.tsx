import { motion, useIsPresent } from 'framer-motion';
import { forwardRef, useImperativeHandle, memo, useState, useEffect, useCallback } from 'react';
import { useSlideZoom } from '../../../hooks/useSlideZoom';
import { getPhotoDisplayUrl } from '../../../utils/formatters';
import type { PhotoInput } from '../../../types';
import { withBuild } from '../../../utils/build';

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

    const handleZoomChange = useCallback(
        (isZoomed: boolean) => {
            if (isZoomed) setZoomRequested(true);
            onZoomChange?.(isZoomed);
        },
        [onZoomChange]
    );

    useEffect(() => {
        if (deferLoad || !avifThumbUrl || !displayUrl || avifThumbUrl === displayUrl || upgradedUrl === displayUrl) {
            return;
        }
        let cancelled = false;
        const delayMs = zoomRequested ? 0 : 2500;
        const timer = setTimeout(() => {
            if (cancelled) return;
            const hiRes = new Image();
            hiRes.decoding = 'async';
            hiRes.src = withBuild(displayUrl);
            const commit = () => {
                if (!cancelled) setUpgradedUrl(displayUrl);
            };
            if (typeof hiRes.decode === 'function') {
                hiRes.decode().then(commit, commit);
            } else {
                hiRes.onload = commit;
            }
        }, delayMs);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [deferLoad, avifThumbUrl, displayUrl, upgradedUrl, zoomRequested]);

    const activeSrc = avifThumbUrl && upgradedUrl !== displayUrl ? avifThumbUrl : displayUrl;

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
                    className="portfolio__lightbox-image-full"
                    fetchPriority={priority ? 'high' : 'low'}
                    decoding="async"
                    onLoad={() => {
                        handleImageLoad();
                        if (onLoad) onLoad();
                    }}
                    style={{
                        scale,
                        x: panX,
                        y: panY,
                        objectPosition: `${focusX != null ? focusX * 100 : 50}% ${focusY != null ? focusY * 100 : 50}%`,
                    }}
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
