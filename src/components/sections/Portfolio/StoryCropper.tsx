import React, { useRef, useState, useCallback } from 'react';
import type { NormalizedCrop, BadgeOptions } from '../../../utils/storyCanvas';
import { calculateNormalizedCrop, STORY_ASPECT_RATIO } from '../../../utils/storyCanvas';
import { StoryBadges } from './StoryBadges';

interface StoryCropperProps {
    imageSrc: string;
    fallbackSrc?: string;
    naturalWidth: number;
    naturalHeight: number;
    crop: NormalizedCrop;
    badges?: BadgeOptions;
    theme?: 'dark' | 'light';
    onChange: (crop: NormalizedCrop) => void;
    onImageLoaded?: (width: number, height: number) => void;
}

export const StoryCropper: React.FC<StoryCropperProps> = ({
    imageSrc,
    fallbackSrc,
    naturalWidth,
    naturalHeight,
    crop,
    badges,
    theme,
    onChange,
    onImageLoaded,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [failedSrcs, setFailedSrcs] = useState<Set<string>>(() => new Set());

    const handleImgError = () => {
        if (imageSrc) {
            setFailedSrcs((prev) => new Set(prev).add(imageSrc));
        }
    };

    const currentSrc = failedSrcs.has(imageSrc) && fallbackSrc ? fallbackSrc : imageSrc;

    const dragStartRef = useRef<{ mouseX: number; mouseY: number; startCenterX: number; startCenterY: number } | null>(
        null
    );

    // Track touch distance for pinch-to-zoom
    const touchDistanceRef = useRef<number | null>(null);

    // Compute transformation matrix for preview image inside 9:16 container
    // Percentage translation in CSS is relative to the image-wrapper's own dimensions.
    // Since width and height already scale the image so crop.width/crop.height fill 100% of the viewport,
    // translating by -crop.x * 100% and -crop.y * 100% shifts the crop region precisely to (0, 0).
    const scaleX = 1 / Math.max(0.001, crop.width);
    const scaleY = 1 / Math.max(0.001, crop.height);
    const translateX = -crop.x * 100;
    const translateY = -crop.y * 100;

    // Handle mouse / touch drag pan
    const handlePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            startCenterX: crop.centerX,
            startCenterY: crop.centerY,
        };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !dragStartRef.current || !containerRef.current) return;
        e.stopPropagation();

        const rect = containerRef.current.getBoundingClientRect();
        const deltaPxX = e.clientX - dragStartRef.current.mouseX;
        const deltaPxY = e.clientY - dragStartRef.current.mouseY;

        // In 9:16 container, crop.width corresponds to rect.width in pixels
        const normDeltaX = -(deltaPxX / rect.width) * crop.width;
        const normDeltaY = -(deltaPxY / rect.height) * crop.height;

        const newCenterX = dragStartRef.current.startCenterX + normDeltaX;
        const newCenterY = dragStartRef.current.startCenterY + normDeltaY;

        const updated = calculateNormalizedCrop(naturalWidth, naturalHeight, newCenterX, newCenterY, crop.zoom);
        onChange(updated);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        e.stopPropagation();
        setIsDragging(false);
        try {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            // Ignore pointer capture errors
        }
        dragStartRef.current = null;
    };

    // Handle wheel zoom
    const handleWheel = useCallback(
        (e: React.WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
            const newZoom = Math.max(1.0, Math.min(3.5, crop.zoom + zoomDelta));

            if (newZoom !== crop.zoom) {
                const updated = calculateNormalizedCrop(
                    naturalWidth,
                    naturalHeight,
                    crop.centerX,
                    crop.centerY,
                    newZoom
                );
                onChange(updated);
            }
        },
        [crop, naturalWidth, naturalHeight, onChange]
    );

    // Touch pinch-to-zoom support
    const handleTouchMove = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);

            if (touchDistanceRef.current != null) {
                const delta = (dist - touchDistanceRef.current) * 0.005;
                const newZoom = Math.max(1.0, Math.min(3.5, crop.zoom + delta));
                if (newZoom !== crop.zoom) {
                    const updated = calculateNormalizedCrop(
                        naturalWidth,
                        naturalHeight,
                        crop.centerX,
                        crop.centerY,
                        newZoom
                    );
                    onChange(updated);
                }
            }
            touchDistanceRef.current = dist;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.stopPropagation();
        touchDistanceRef.current = null;
    };

    return (
        <div className="story-cropper" onClick={(e) => e.stopPropagation()}>
            <div
                ref={containerRef}
                className={`story-cropper__viewport ${isDragging ? 'story-cropper__viewport--dragging' : ''}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={(e) => e.stopPropagation()}
                style={{ aspectRatio: `${STORY_ASPECT_RATIO}` }}
            >
                {/* Scaled Image */}
                <div
                    className="story-cropper__image-wrapper"
                    style={{
                        width: `${scaleX * 100}%`,
                        height: `${scaleY * 100}%`,
                        transform: `translate(${translateX}%, ${translateY}%)`,
                    }}
                >
                    <img
                        src={currentSrc}
                        alt="Crop target"
                        className="story-cropper__image"
                        draggable={false}
                        onError={handleImgError}
                        onLoad={(e) => {
                            const img = e.currentTarget;
                            if (img.naturalWidth && img.naturalHeight && onImageLoaded) {
                                onImageLoaded(img.naturalWidth, img.naturalHeight);
                            }
                        }}
                    />
                </div>

                {/* Rule of Thirds Grid overlay */}
                <div
                    className={`story-cropper__grid ${isDragging ? 'story-cropper__grid--visible' : ''}`}
                    aria-hidden="true"
                >
                    <div className="story-cropper__grid-col" />
                    <div className="story-cropper__grid-col" />
                    <div className="story-cropper__grid-row" />
                    <div className="story-cropper__grid-row" />
                </div>

                {/* Subtle Edge Vignette */}
                <div className="story-cropper__vignette" />

                {/* Story Badges Overlay */}
                <StoryBadges badges={badges} theme={theme} />
            </div>

            <div className="story-cropper__hint">
                <span>Drag to reposition • Scroll or pinch to zoom</span>
            </div>
        </div>
    );
};
