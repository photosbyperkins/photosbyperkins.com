import { motion } from 'framer-motion';
import { forwardRef, useImperativeHandle } from 'react';
import { useSlideZoom } from '../../../hooks/useSlideZoom';
import { getPhotoDisplayUrl } from '../../../utils/formatters';
import type { PhotoInput } from '../../../types';

export interface LightboxSlideHandle {
    toggleZoom: (clientX?: number, clientY?: number) => void;
}

declare const __BUILD_NUMBER__: string;

export interface LightboxSlideProps {
    image: PhotoInput;
    alt: string;
    onZoomChange?: (isZoomed: boolean) => void;
    onCanZoomChange?: (canZoom: boolean) => void;
    onLoad?: () => void;
    onSingleClick?: () => void;
}

const LightboxSlide = forwardRef<LightboxSlideHandle, LightboxSlideProps>(function LightboxSlide(
    { image, alt, onZoomChange, onCanZoomChange, onLoad, onSingleClick },
    ref
) {
    const url = image ? (typeof image === 'string' ? image : image.original) : '';
    const displayUrl = url ? getPhotoDisplayUrl(url) : '';
    const focusX = image && typeof image !== 'string' ? image.focusX : undefined;
    const focusY = image && typeof image !== 'string' ? image.focusY : undefined;

    const { containerRef, scale, panX, panY, dragMode, constraints, toggleZoom, handleImageLoad, containerProps } =
        useSlideZoom({
            image,
            focusX,
            focusY,
            onZoomChange,
            onCanZoomChange,
            onSingleClick,
        });

    useImperativeHandle(ref, () => ({
        toggleZoom,
    }));

    if (!image) return null;

    return (
        <div className="portfolio__lightbox-image-container" ref={containerRef} {...containerProps}>
            <motion.img
                src={`${displayUrl}?v=${__BUILD_NUMBER__}`}
                alt={alt}
                className="portfolio__lightbox-image-full"
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
