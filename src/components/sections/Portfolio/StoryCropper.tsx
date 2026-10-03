import React, { useRef, useState, useCallback, useMemo } from 'react';
import type { NormalizedCrop, BadgeOptions, StoryPhotoFilterId, PaddedStyleOptions } from '../../../utils/storyCanvas';
import {
    calculateNormalizedCrop,
    calculateFitZoom,
    STORY_ASPECT_RATIO,
    getStoryFilterCss,
    hexToRgba,
} from '../../../utils/storyCanvas';
import { StoryBadges } from './StoryBadges';
import type { StoryFrameId, StoryFrameContext } from './storyFrames/types';
import { StoryFrameOverlay } from './storyFrames/StoryFrameOverlay';
import type { ExifData } from '../../../types';

interface StoryCropperProps {
    imageSrc: string;
    fallbackSrc?: string;
    naturalWidth: number;
    naturalHeight: number;
    crop: NormalizedCrop;
    paddedConfig?: PaddedStyleOptions;
    badges?: BadgeOptions;
    theme?: 'dark' | 'light';
    frameId?: StoryFrameId;
    frameColorOverride?: string;
    exif?: ExifData;
    filterId?: StoryPhotoFilterId;
    filterStrength?: number;
    onChange: (crop: NormalizedCrop) => void;
    onImageLoaded?: (width: number, height: number) => void;
}

export const StoryCropper: React.FC<StoryCropperProps> = ({
    imageSrc,
    fallbackSrc,
    naturalWidth,
    naturalHeight,
    crop,
    paddedConfig,
    badges,
    theme,
    frameId,
    frameColorOverride,
    exif,
    filterId,
    filterStrength,
    onChange,
    onImageLoaded,
}) => {
    const filterCss = filterId && filterId !== 'none' ? getStoryFilterCss(filterId, filterStrength ?? 1.0) : undefined;

    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [failedSrcs, setFailedSrcs] = useState<Set<string>>(() => new Set());

    const handleImgError = () => {
        if (imageSrc) {
            setFailedSrcs((prev) => new Set(prev).add(imageSrc));
        }
    };

    const currentSrc = failedSrcs.has(imageSrc) && fallbackSrc ? fallbackSrc : imageSrc;

    // Minimum zoom allowed is derived from the fitZoom calculation for this photo
    const minZoom = useMemo(() => {
        return calculateFitZoom(naturalWidth, naturalHeight, paddedConfig?.cardScale || 0.92);
    }, [naturalWidth, naturalHeight, paddedConfig?.cardScale]);

    const isPadded = crop.zoom < 0.999 || crop.width > 1.001 || crop.height > 1.001;

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

        const updated = calculateNormalizedCrop(
            naturalWidth,
            naturalHeight,
            newCenterX,
            newCenterY,
            crop.zoom,
            minZoom
        );
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
            const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
            const newZoom = Math.max(minZoom, Math.min(3.5, crop.zoom + zoomDelta));

            if (newZoom !== crop.zoom) {
                const updated = calculateNormalizedCrop(
                    naturalWidth,
                    naturalHeight,
                    crop.centerX,
                    crop.centerY,
                    newZoom,
                    minZoom
                );
                onChange(updated);
            }
        },
        [crop, naturalWidth, naturalHeight, minZoom, onChange]
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
                const newZoom = Math.max(minZoom, Math.min(3.5, crop.zoom + delta));
                if (newZoom !== crop.zoom) {
                    const updated = calculateNormalizedCrop(
                        naturalWidth,
                        naturalHeight,
                        crop.centerX,
                        crop.centerY,
                        newZoom,
                        minZoom
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

    // Double click to toggle between Fit (minZoom) and Fill (1.0)
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const targetZoom = crop.zoom <= minZoom + 0.05 ? 1.0 : minZoom;
        const updated = calculateNormalizedCrop(
            naturalWidth,
            naturalHeight,
            crop.centerX,
            crop.centerY,
            targetZoom,
            minZoom
        );
        onChange(updated);
    };

    // Keyboard navigation: Arrow keys nudge crop, +/- adjust zoom, 0 resets zoom
    const handleKeyDown = (e: React.KeyboardEvent) => {
        const step = e.shiftKey ? 0.08 : 0.02;
        let newCenterX = crop.centerX;
        let newCenterY = crop.centerY;
        let newZoom = crop.zoom;

        if (e.key === 'ArrowUp') {
            newCenterY = Math.max(0, crop.centerY - step);
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            newCenterY = Math.min(1, crop.centerY + step);
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            newCenterX = Math.max(0, crop.centerX - step);
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            newCenterX = Math.min(1, crop.centerX + step);
            e.preventDefault();
        } else if (e.key === '+' || e.key === '=' || e.key === 'Add') {
            newZoom = Math.min(3.5, parseFloat((crop.zoom + 0.1).toFixed(2)));
            e.preventDefault();
        } else if (e.key === '-' || e.key === '_' || e.key === 'Subtract') {
            newZoom = Math.max(minZoom, parseFloat((crop.zoom - 0.1).toFixed(2)));
            e.preventDefault();
        } else if (e.key === '0') {
            newZoom = minZoom;
            e.preventDefault();
        } else {
            return;
        }

        const updated = calculateNormalizedCrop(
            naturalWidth,
            naturalHeight,
            newCenterX,
            newCenterY,
            newZoom,
            minZoom
        );
        onChange(updated);
    };

    return (
        <div className="story-cropper" onClick={(e) => e.stopPropagation()}>
            <div
                ref={containerRef}
                className={`story-cropper__viewport ${isDragging ? 'story-cropper__viewport--dragging' : ''}`}
                tabIndex={0}
                role="region"
                aria-label="Story interactive cropper. Use arrow keys to pan, plus and minus to zoom."
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onDoubleClick={handleDoubleClick}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                style={{ aspectRatio: `${STORY_ASPECT_RATIO}` }}
            >
                {/* Background Layer (Frosted or Solid) for Padded / Zoomed-out Solo Mode */}
                {isPadded && paddedConfig && (
                    <div className="story-cropper__background-layer" aria-hidden="true">
                        {paddedConfig.style === 'frosted' || paddedConfig.style === 'glass' ? (
                            <>
                                <img
                                    src={currentSrc}
                                    alt=""
                                    className="story-cropper__background-image"
                                    style={{
                                        filter: filterCss
                                            ? `blur(28px) saturate(180%) brightness(0.65) ${filterCss}`
                                            : 'blur(28px) saturate(180%) brightness(0.65)',
                                    }}
                                    draggable={false}
                                    aria-hidden="true"
                                    onError={handleImgError}
                                />
                                <div
                                    className="story-cropper__background-tint"
                                    style={{
                                        backgroundColor: hexToRgba(paddedConfig.customColor || '#0a0a14'),
                                    }}
                                />
                            </>
                        ) : (
                            <div
                                className="story-cropper__background-solid"
                                style={{
                                    backgroundColor: paddedConfig.customColor || '#0a0a14',
                                }}
                            />
                        )}
                    </div>
                )}

                {/* Scaled Image */}
                <div
                    className={`story-cropper__image-wrapper ${
                        isPadded ? 'story-cropper__image-wrapper--padded' : ''
                    }`}
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
                        style={{ filter: filterCss }}
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

                {/* Decorative Frame Overlay */}
                {(() => {
                    const frameContext: StoryFrameContext = {
                        hasScoreboard: Boolean(
                            badges?.showScoreboard && (badges?.scoreboardTitle || badges?.teams?.length)
                        ),
                        hasAttribution: Boolean(badges?.showAttribution),
                        layoutMode: isPadded ? 'padded' : 'solo',
                        exif,
                    };
                    return (
                        <StoryFrameOverlay
                            frameId={frameId || 'none'}
                            colorOverride={frameColorOverride}
                            context={frameContext}
                        />
                    );
                })()}

                {/* Story Badges Overlay */}
                <StoryBadges badges={badges} theme={theme} />
            </div>

            <div className="story-cropper__hint">
                <span>Drag to reposition • Scroll, pinch, or double-click to zoom</span>
            </div>
        </div>
    );
};
