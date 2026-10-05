import React, { useEffect, useRef, useState } from 'react';
import type { BadgeOptions, StoryPhotoFilterId } from '../../../utils/storyCanvas';
import {
    getStoryFilterCss,
    STORY_ASPECT_RATIO,
    BURST_PANEL_ASPECT_RATIO,
    DUET_PANEL_ASPECT_RATIO,
    calculateBurstPanelCrop,
    calculateDefaultBurstZoom,
} from '../../../utils/storyCanvas';
import { StoryBadges } from './StoryBadges';
import type { StoryFrameId, StoryFrameContext } from './storyFrames/types';
import { StoryFrameOverlay } from './storyFrames/StoryFrameOverlay';
import type { ExifData } from '../../../types';

export interface BurstPanOffset {
    x: number;
    y: number;
    zoom?: number;
}

export interface StoryBurstCropperProps {
    images: (string | null | undefined)[];
    fallbackSrcs?: (string | undefined)[];
    timeStamps?: (number | undefined)[];
    showTimeStamps?: boolean;
    panOffsets: BurstPanOffset[];
    onPanChange: (panelIndex: number, offset: BurstPanOffset) => void;
    badges?: BadgeOptions;
    theme?: 'dark' | 'light';
    frameId?: StoryFrameId;
    frameColorOverride?: string;
    frameContext?: StoryFrameContext;
    exif?: ExifData;
    filterId?: StoryPhotoFilterId;
    filterStrength?: number;
    activeStep?: number;
    onSelectPanel?: (panelIndex: number) => void;
    onSelectEmptyPanel?: (panelIndex: number) => void;
    panelCount?: 2 | 3;
    onBadgesChange?: (badges: BadgeOptions) => void;
}

const DEFAULT_SLOT_NAMES = ['TOP', 'MID', 'BTM'];
const DUET_SLOT_NAMES = ['TOP', 'BTM'];
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 3.5;

interface StoryBurstPanelProps {
    panelIdx: number;
    src?: string | null;
    fallbackSrc?: string;
    slotName: string;
    panelAspect: number;
    pan: BurstPanOffset;
    timeStamp?: number;
    shouldShowTimeStamp: boolean;
    isStepActive: boolean;
    filterCss?: string;
    onPanChange: (panelIndex: number, offset: BurstPanOffset) => void;
    onSelectPanel?: (panelIndex: number) => void;
    onSelectEmptyPanel?: (panelIndex: number) => void;
    onHoverChange?: (panelIndex: number, hovered: boolean) => void;
    onDragChange?: (panelIndex: number, dragging: boolean) => void;
}

const StoryBurstPanel: React.FC<StoryBurstPanelProps> = ({
    panelIdx,
    src,
    fallbackSrc,
    slotName,
    panelAspect,
    pan,
    timeStamp,
    shouldShowTimeStamp,
    isStepActive,
    filterCss,
    onPanChange,
    onSelectPanel,
    onSelectEmptyPanel,
    onHoverChange,
    onDragChange,
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [imageDim, setImageDim] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });
    const [isDragging, setIsDragging] = useState(false);

    // Fast-path / cached image check when src changes
    useEffect(() => {
        const img = imgRef.current;
        if (img && img.complete && img.naturalWidth && img.naturalHeight) {
            setImageDim((prev) =>
                prev.width === img.naturalWidth && prev.height === img.naturalHeight
                    ? prev
                    : { width: img.naturalWidth, height: img.naturalHeight }
            );
        }
    }, [src]);

    const dragRef = useRef<{ lastX: number; lastY: number } | null>(null);
    const isPinchingRef = useRef<boolean>(false);
    const touchDistRef = useRef<{ startDist: number; startZoom: number } | null>(null);

    const nw = imageDim.width;
    const nh = imageDim.height;
    const defZoom = calculateDefaultBurstZoom(nw, nh, panelAspect);
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pan.zoom ?? defZoom));

    const crop = calculateBurstPanelCrop(nw, nh, pan.x, pan.y, zoom, panelAspect);
    const scaleX = 1 / Math.max(0.001, crop.width);
    const scaleY = 1 / Math.max(0.001, crop.height);
    const translateX = -crop.x * 100;
    const translateY = -crop.y * 100;

    const zoomText = zoom > 1.05 ? ` Zoomed ${zoom.toFixed(1)}x.` : '';
    const panelAria = src
        ? `Panel ${panelIdx + 1} (${slotName}).${zoomText} Drag to pan. Scroll or pinch to zoom. Use arrow keys to nudge.`
        : `Panel ${panelIdx + 1} (${slotName}) is empty. Tap to select photo.`;

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!src || isPinchingRef.current) return;
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
        onDragChange?.(panelIdx, true);
        onSelectPanel?.(panelIdx);
        dragRef.current = { lastX: e.clientX, lastY: e.clientY };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isPinchingRef.current || !isDragging || !dragRef.current) return;
        e.stopPropagation();
        const deltaPxX = e.clientX - dragRef.current.lastX;
        const deltaPxY = e.clientY - dragRef.current.lastY;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
        if (deltaPxX === 0 && deltaPxY === 0) return;

        const el = panelRef.current || (e.currentTarget as HTMLElement);
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const currentAspect = rect.width / rect.height;
        const currentCrop = calculateBurstPanelCrop(nw, nh, pan.x, pan.y, zoom, currentAspect);
        const normDeltaX = -(deltaPxX / rect.width) * currentCrop.width;
        const normDeltaY = -(deltaPxY / rect.height) * currentCrop.height;

        onPanChange(panelIdx, {
            x: Math.max(0, Math.min(1, pan.x + normDeltaX)),
            y: Math.max(0, Math.min(1, pan.y + normDeltaY)),
            zoom: pan.zoom,
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            e.stopPropagation();
            setIsDragging(false);
            onDragChange?.(panelIdx, false);
            try {
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            } catch {
                // Ignore capture release error
            }
            dragRef.current = null;
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!src) return;
        e.preventDefault();
        e.stopPropagation();
        const currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pan.zoom ?? defZoom));
        const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat((currentZoom + zoomDelta).toFixed(2))));
        if (Math.abs(newZoom - currentZoom) > 0.001) {
            onPanChange(panelIdx, { ...pan, zoom: newZoom });
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!src) return;
        if (e.touches.length === 2) {
            e.stopPropagation();
            isPinchingRef.current = true;
            setIsDragging(false);
            dragRef.current = null;
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            touchDistRef.current = {
                startDist: Math.max(1, dist),
                startZoom: pan.zoom ?? defZoom,
            };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!src) return;
        if (e.touches.length === 2 && touchDistRef.current) {
            e.stopPropagation();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const scale = dist / touchDistRef.current.startDist;
            const rawZoom = touchDistRef.current.startZoom * scale;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat(rawZoom.toFixed(2))));
            if (Math.abs(newZoom - (pan.zoom ?? defZoom)) > 0.005) {
                onPanChange(panelIdx, { ...pan, zoom: newZoom });
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length < 2) {
            isPinchingRef.current = false;
            touchDistRef.current = null;
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (!src) return;
        e.stopPropagation();
        const currentZoom = pan.zoom ?? defZoom;
        const targetZoom = currentZoom > defZoom ? 1.0 : 1.8;
        onPanChange(panelIdx, { ...pan, zoom: targetZoom });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!src) return;
        const currentZoom = pan.zoom ?? defZoom;
        const step = e.shiftKey ? 0.1 : 0.03;
        let newX = pan.x;
        let newY = pan.y;
        let newZoom = currentZoom;

        if (e.key === 'ArrowUp') {
            newY = Math.max(0, pan.y - step);
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            newY = Math.min(1, pan.y + step);
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            newX = Math.max(0, pan.x - step);
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            newX = Math.min(1, pan.x + step);
            e.preventDefault();
        } else if (e.key === '+' || e.key === '=' || e.key === 'Add') {
            newZoom = Math.min(MAX_ZOOM, parseFloat((currentZoom + 0.1).toFixed(2)));
            e.preventDefault();
        } else if (e.key === '-' || e.key === '_' || e.key === 'Subtract') {
            newZoom = Math.max(MIN_ZOOM, parseFloat((currentZoom - 0.1).toFixed(2)));
            e.preventDefault();
        } else if (e.key === '0') {
            newZoom = defZoom;
            e.preventDefault();
        } else {
            return;
        }

        onPanChange(panelIdx, { x: newX, y: newY, zoom: newZoom });
    };

    if (!src) {
        return (
            <div
                ref={panelRef}
                className={`story-burst-cropper__panel story-burst-cropper__panel--empty${
                    isStepActive ? ' story-burst-cropper__panel--active-step' : ''
                }`}
                tabIndex={0}
                role="button"
                aria-label={panelAria}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelectEmptyPanel?.(panelIdx);
                    onSelectPanel?.(panelIdx);
                }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectEmptyPanel?.(panelIdx);
                        onSelectPanel?.(panelIdx);
                    }
                }}
            >
                <div className="story-burst-cropper__empty-content">
                    <span className="story-burst-cropper__empty-slot">
                        {panelIdx + 1}. {slotName}
                    </span>
                    <span className="story-burst-cropper__empty-sub">Tap to select photo</span>
                </div>
            </div>
        );
    }

    const dt = timeStamp ?? 0;

    return (
        <div
            ref={panelRef}
            className={`story-burst-cropper__panel story-burst-cropper__panel--has-image${
                isDragging ? ' story-burst-cropper__panel--dragging' : ''
            }${isStepActive ? ' story-burst-cropper__panel--active-step' : ''}`}
            tabIndex={0}
            role="group"
            aria-label={panelAria}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            onPointerEnter={() => onHoverChange?.(panelIdx, true)}
            onPointerLeave={() => onHoverChange?.(panelIdx, false)}
        >
            <div
                className="story-burst-cropper__image-wrapper"
                style={{
                    width: `${scaleX * 100}%`,
                    height: `${scaleY * 100}%`,
                    transform: `translate3d(${translateX}%, ${translateY}%, 0)`,
                }}
            >
                <img
                    ref={imgRef}
                    src={src}
                    alt={`Burst frame ${panelIdx + 1} (${slotName})`}
                    className="story-burst-cropper__image"
                    draggable={false}
                    style={{
                        filter: filterCss,
                    }}
                    onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth && img.naturalHeight) {
                            setImageDim((prev) => {
                                if (prev.width === img.naturalWidth && prev.height === img.naturalHeight) {
                                    return prev;
                                }
                                return {
                                    width: img.naturalWidth,
                                    height: img.naturalHeight,
                                };
                            });
                        }
                    }}
                    onError={(e) => {
                        if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
                            e.currentTarget.src = fallbackSrc;
                        }
                    }}
                />
            </div>

            {/* Rule-of-Thirds Grid Overlay during dragging */}
            <div
                className={`story-burst-cropper__grid${isDragging ? ' story-burst-cropper__grid--visible' : ''}`}
                aria-hidden="true"
            >
                <span className="story-burst-cropper__grid-col story-burst-cropper__grid-col--1" />
                <span className="story-burst-cropper__grid-col story-burst-cropper__grid-col--2" />
                <span className="story-burst-cropper__grid-row story-burst-cropper__grid-row--1" />
                <span className="story-burst-cropper__grid-row story-burst-cropper__grid-row--2" />
            </div>

            {/* Slot name accessible text */}
            <span className="sr-only">{slotName}</span>

            {/* Timestamp Pill */}
            {shouldShowTimeStamp && (
                <div className="story-burst-cropper__timestamp-pill" aria-hidden="true">
                    +{dt === 0 ? '0.00' : dt.toFixed(2)}s
                </div>
            )}
        </div>
    );
};

export const StoryBurstCropper: React.FC<StoryBurstCropperProps> = ({
    images,
    fallbackSrcs,
    timeStamps,
    showTimeStamps = true,
    panOffsets,
    onPanChange,
    badges,
    theme,
    frameId,
    frameColorOverride,
    frameContext,
    exif: _exif,
    filterId,
    filterStrength,
    activeStep,
    onSelectPanel,
    onSelectEmptyPanel,
    panelCount,
    onBadgesChange,
}) => {
    const count: 2 | 3 = panelCount ?? (images.length === 2 ? 2 : 3);
    const slotNames = count === 2 ? DUET_SLOT_NAMES : DEFAULT_SLOT_NAMES;
    const panelAspect = count === 2 ? DUET_PANEL_ASPECT_RATIO : BURST_PANEL_ASPECT_RATIO;
    const panelIndices = count === 2 ? [0, 1] : [0, 1, 2];

    const [draggingPanelIdx, setDraggingPanelIdx] = useState<number | null>(null);
    const [hoveredPanelIdx, setHoveredPanelIdx] = useState<number | null>(null);

    const filterCss = filterId && filterId !== 'none' ? getStoryFilterCss(filterId, filterStrength ?? 1.0) : undefined;

    const hasValidDeltas = Boolean(
        timeStamps && timeStamps.length > 0 && timeStamps.some((t) => t !== undefined && t > 0)
    );
    const shouldShowTimeStamps = Boolean(showTimeStamps && hasValidDeltas);

    return (
        <div className="story-burst-cropper-container story-cropper" onClick={(e) => e.stopPropagation()}>
            <div
                className="story-burst-cropper"
                data-panels={count}
                style={{
                    aspectRatio: `${STORY_ASPECT_RATIO}`,
                }}
                role="region"
                aria-label={count === 2 ? '2-Panel Duet Interactive Cropper' : '3-Panel Burst Interactive Cropper'}
            >
                <div className="story-burst-cropper__panels">
                    {panelIndices.map((panelIdx) => {
                        const slotName = slotNames[panelIdx];
                        const defZoom = calculateDefaultBurstZoom(1920, 1080, panelAspect);
                        const pan = panOffsets[panelIdx] || { x: 0.5, y: 0.45, zoom: defZoom };

                        return (
                            <StoryBurstPanel
                                key={panelIdx}
                                panelIdx={panelIdx}
                                src={images[panelIdx]}
                                fallbackSrc={fallbackSrcs?.[panelIdx]}
                                slotName={slotName}
                                panelAspect={panelAspect}
                                pan={pan}
                                timeStamp={timeStamps?.[panelIdx]}
                                shouldShowTimeStamp={shouldShowTimeStamps}
                                isStepActive={activeStep === panelIdx}
                                filterCss={filterCss}
                                onPanChange={onPanChange}
                                onSelectPanel={onSelectPanel}
                                onSelectEmptyPanel={onSelectEmptyPanel}
                                onDragChange={(idx, dragging) => setDraggingPanelIdx(dragging ? idx : null)}
                                onHoverChange={(idx, hovered) => setHoveredPanelIdx(hovered ? idx : null)}
                            />
                        );
                    })}
                </div>

                {/* Decorative Frame Overlay */}
                <StoryFrameOverlay
                    frameId={frameId || 'none'}
                    colorOverride={frameColorOverride}
                    context={frameContext}
                />

                {/* Slot Pills Layer (rendered on top of decorative frame overlay) */}
                <div className="story-burst-cropper__slot-pills-layer" aria-hidden="true">
                    {panelIndices.map((panelIdx) => {
                        const slotName = slotNames[panelIdx];
                        const src = images[panelIdx];
                        if (!src) {
                            return <div key={panelIdx} className="story-burst-cropper__slot-pill-anchor" />;
                        }
                        const defZoom = calculateDefaultBurstZoom(1920, 1080, panelAspect);
                        const pan = panOffsets[panelIdx] || { x: 0.5, y: 0.45, zoom: defZoom };
                        const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pan.zoom ?? defZoom));
                        const isDragging = draggingPanelIdx === panelIdx;
                        const isHovered = hoveredPanelIdx === panelIdx;

                        return (
                            <div key={panelIdx} className="story-burst-cropper__slot-pill-anchor">
                                <div
                                    className={`story-burst-cropper__slot-pill${
                                        isDragging ? ' story-burst-cropper__slot-pill--dragging' : ''
                                    }${isHovered ? ' story-burst-cropper__slot-pill--hovered' : ''}`}
                                >
                                    <span className="story-burst-cropper__slot-name">{slotName}</span>
                                    {zoom > 1.05 && (
                                        <span className="story-burst-cropper__zoom-pill">{zoom.toFixed(1)}x</span>
                                    )}
                                    <span className="story-burst-cropper__pan-hint">Pan/Zoom</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Badges Layer */}
                <StoryBadges badges={badges} theme={theme} onBadgesChange={onBadgesChange} />
            </div>

            <div className="story-cropper__hint">
                <span>
                    {count === 2
                        ? 'Tap panel to select • Drag to reposition • Scroll, pinch, or double-click to zoom'
                        : 'Tap panel to select • Drag to reposition • Scroll, pinch, or double-click to zoom'}
                </span>
            </div>
        </div>
    );
};
