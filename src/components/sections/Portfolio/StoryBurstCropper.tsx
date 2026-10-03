import React, { useRef, useState } from 'react';
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
    panelCount?: 2 | 3;
}

const DEFAULT_SLOT_NAMES = ['TOP', 'MID', 'BTM'];
const DUET_SLOT_NAMES = ['TOP', 'BTM'];
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 3.5;

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
    panelCount,
}) => {
    const count: 2 | 3 = panelCount ?? (images.length === 2 ? 2 : 3);
    const slotNames = count === 2 ? DUET_SLOT_NAMES : DEFAULT_SLOT_NAMES;
    const panelAspect = count === 2 ? DUET_PANEL_ASPECT_RATIO : BURST_PANEL_ASPECT_RATIO;
    const panelIndices = count === 2 ? [0, 1] : [0, 1, 2];

    const filterCss = filterId && filterId !== 'none' ? getStoryFilterCss(filterId, filterStrength ?? 1.0) : undefined;

    const panelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
    const [imageDims, setImageDims] = useState<{ width: number; height: number }[]>([
        { width: 1920, height: 1080 },
        { width: 1920, height: 1080 },
        { width: 1920, height: 1080 },
    ]);

    const [draggingPanel, setDraggingPanel] = useState<number | null>(null);

    // Incremental pointer drag tracking (prevents sticky boundaries / pan locks)
    const dragRef = useRef<{
        panelIdx: number;
        lastX: number;
        lastY: number;
    } | null>(null);

    // Pinch-to-zoom tracking flag & distance reference
    const isPinchingRef = useRef<boolean>(false);
    const touchDistRef = useRef<{
        panelIdx: number;
        startDist: number;
        startZoom: number;
    } | null>(null);

    // ==========================================
    // POINTER EVENTS: Smooth 1:1 Drag Panning
    // ==========================================
    const handlePointerDown = (panelIdx: number, e: React.PointerEvent) => {
        if (!images[panelIdx]) return;
        if (isPinchingRef.current) return;

        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDraggingPanel(panelIdx);
        onSelectPanel?.(panelIdx);

        dragRef.current = {
            panelIdx,
            lastX: e.clientX,
            lastY: e.clientY,
        };
    };

    const handlePointerMove = (panelIdx: number, e: React.PointerEvent) => {
        if (isPinchingRef.current) return;
        if (draggingPanel !== panelIdx || !dragRef.current) return;
        e.stopPropagation();

        const deltaPxX = e.clientX - dragRef.current.lastX;
        const deltaPxY = e.clientY - dragRef.current.lastY;

        // Update stored pointer position immediately for incremental tracking
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;

        if (deltaPxX === 0 && deltaPxY === 0) return;

        const panelEl = panelRefs.current[panelIdx];
        if (!panelEl) return;
        const rect = panelEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const nw = imageDims[panelIdx]?.width || 1920;
        const nh = imageDims[panelIdx]?.height || 1080;
        const panelAspect = rect.width / rect.height;
        const defZoom = calculateDefaultBurstZoom(nw, nh, panelAspect);
        const currentPan = panOffsets[panelIdx] || { x: 0.5, y: 0.45, zoom: defZoom };
        const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentPan.zoom ?? defZoom));

        const currentCrop = calculateBurstPanelCrop(nw, nh, currentPan.x, currentPan.y, zoom, panelAspect);

        // Normalize delta across the panel width and height
        const normDeltaX = -(deltaPxX / rect.width) * currentCrop.width;
        const normDeltaY = -(deltaPxY / rect.height) * currentCrop.height;

        const nextPanX = Math.max(0, Math.min(1, currentPan.x + normDeltaX));
        const nextPanY = Math.max(0, Math.min(1, currentPan.y + normDeltaY));

        onPanChange(panelIdx, {
            x: nextPanX,
            y: nextPanY,
            zoom: currentPan.zoom,
        });
    };

    const handlePointerUp = (panelIdx: number, e: React.PointerEvent) => {
        if (draggingPanel === panelIdx) {
            e.stopPropagation();
            setDraggingPanel(null);
            try {
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            } catch {
                // Ignore capture release error
            }
            dragRef.current = null;
        }
    };

    // ==========================================
    // WHEEL EVENT: Scroll-to-Zoom
    // ==========================================
    const handleWheel = (panelIdx: number, e: React.WheelEvent) => {
        if (!images[panelIdx]) return;
        e.preventDefault();
        e.stopPropagation();

        const nw = imageDims[panelIdx]?.width || 1920;
        const nh = imageDims[panelIdx]?.height || 1080;
        const defZoom = calculateDefaultBurstZoom(nw, nh, panelAspect);
        const currentPan = panOffsets[panelIdx] || { x: 0.5, y: 0.45, zoom: defZoom };
        const currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentPan.zoom ?? defZoom));
        const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat((currentZoom + zoomDelta).toFixed(2))));

        if (Math.abs(newZoom - currentZoom) > 0.001) {
            onPanChange(panelIdx, {
                ...currentPan,
                zoom: newZoom,
            });
        }
    };

    // ==========================================
    // TOUCH EVENTS: 2-Finger Pinch-to-Zoom
    // ==========================================
    const handleTouchStart = (panelIdx: number, e: React.TouchEvent) => {
        if (!images[panelIdx]) return;
        if (e.touches.length === 2) {
            e.stopPropagation();
            isPinchingRef.current = true;
            setDraggingPanel(null);
            dragRef.current = null;

            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const nw = imageDims[panelIdx]?.width || 1920;
            const nh = imageDims[panelIdx]?.height || 1080;
            const defZoom = calculateDefaultBurstZoom(nw, nh, panelAspect);
            const currentPan = panOffsets[panelIdx] || { x: 0.5, y: 0.45, zoom: defZoom };
            touchDistRef.current = {
                panelIdx,
                startDist: Math.max(1, dist),
                startZoom: currentPan.zoom ?? defZoom,
            };
        }
    };

    const handleTouchMove = (panelIdx: number, e: React.TouchEvent) => {
        if (!images[panelIdx]) return;
        if (e.touches.length === 2 && touchDistRef.current && touchDistRef.current.panelIdx === panelIdx) {
            e.stopPropagation();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const scale = dist / touchDistRef.current.startDist;
            const rawZoom = touchDistRef.current.startZoom * scale;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat(rawZoom.toFixed(2))));

            const nw = imageDims[panelIdx]?.width || 1920;
            const nh = imageDims[panelIdx]?.height || 1080;
            const defZoom = calculateDefaultBurstZoom(nw, nh, panelAspect);
            const currentPan = panOffsets[panelIdx] || { x: 0.5, y: 0.45, zoom: defZoom };
            if (Math.abs(newZoom - (currentPan.zoom ?? defZoom)) > 0.005) {
                onPanChange(panelIdx, {
                    ...currentPan,
                    zoom: newZoom,
                });
            }
        }
    };

    const handleTouchEnd = (panelIdx: number, e: React.TouchEvent) => {
        if (e.touches.length < 2) {
            isPinchingRef.current = false;
            touchDistRef.current = null;
        }
    };

    // ==========================================
    // DOUBLE CLICK: Quick Zoom Toggle (1.0x <-> 1.8x)
    // ==========================================
    const handleDoubleClick = (panelIdx: number, e: React.MouseEvent) => {
        if (!images[panelIdx]) return;
        e.stopPropagation();
        const nw = imageDims[panelIdx]?.width || 1920;
        const nh = imageDims[panelIdx]?.height || 1080;
        const defZoom = calculateDefaultBurstZoom(nw, nh, panelAspect);
        const currentPan = panOffsets[panelIdx] || { x: 0.5, y: 0.45, zoom: defZoom };
        const currentZoom = currentPan.zoom ?? defZoom;
        const targetZoom = currentZoom > defZoom ? 1.0 : 1.8;

        onPanChange(panelIdx, {
            ...currentPan,
            zoom: targetZoom,
        });
    };

    // ==========================================
    // KEYBOARD NAVIGATION: Nudge and Zoom
    // ==========================================
    const handleKeyDown = (panelIdx: number, e: React.KeyboardEvent) => {
        if (!images[panelIdx]) return;
        const nw = imageDims[panelIdx]?.width || 1920;
        const nh = imageDims[panelIdx]?.height || 1080;
        const defZoom = calculateDefaultBurstZoom(nw, nh, panelAspect);
        const currentPan = panOffsets[panelIdx] || { x: 0.5, y: 0.45, zoom: defZoom };
        const currentZoom = currentPan.zoom ?? defZoom;
        const step = e.shiftKey ? 0.1 : 0.03;
        let newX = currentPan.x;
        let newY = currentPan.y;
        let newZoom = currentZoom;

        if (e.key === 'ArrowUp') {
            newY = Math.max(0, currentPan.y - step);
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            newY = Math.min(1, currentPan.y + step);
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            newX = Math.max(0, currentPan.x - step);
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            newX = Math.min(1, currentPan.x + step);
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

        onPanChange(panelIdx, {
            x: newX,
            y: newY,
            zoom: newZoom,
        });
    };

    return (
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
                {(() => {
                    const hasValidDeltas = Boolean(
                        timeStamps && timeStamps.length > 0 && timeStamps.some((t) => t !== undefined && t > 0)
                    );
                    const shouldShowTimeStamps = Boolean(showTimeStamps && hasValidDeltas);
                    return panelIndices.map((panelIdx) => {
                        const src = images[panelIdx];
                        const nw = imageDims[panelIdx]?.width || 1920;
                        const nh = imageDims[panelIdx]?.height || 1080;
                        const defZoom = calculateDefaultBurstZoom(nw, nh, panelAspect);
                        const pan = panOffsets[panelIdx] || { x: 0.5, y: 0.45, zoom: defZoom };
                        const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pan.zoom ?? defZoom));
                        const dt = timeStamps?.[panelIdx] ?? 0;
                        const slotName = slotNames[panelIdx];
                        const isDraggingThis = draggingPanel === panelIdx;
                        const isStepActive = activeStep === panelIdx;

                    const crop = calculateBurstPanelCrop(nw, nh, pan.x, pan.y, zoom, panelAspect);

                    const scaleX = 1 / Math.max(0.001, crop.width);
                    const scaleY = 1 / Math.max(0.001, crop.height);
                    const translateX = -crop.x * 100;
                    const translateY = -crop.y * 100;

                    const zoomText = zoom > 1.05 ? ` Zoomed ${zoom.toFixed(1)}x.` : '';
                    const panelAria = src
                        ? `Panel ${panelIdx + 1} (${slotName}).${zoomText} Drag to pan. Scroll or pinch to zoom. Use arrow keys to nudge.`
                        : `Panel ${panelIdx + 1} (${slotName}) is empty. Select frame below.`;

                    return (
                        <div
                            key={panelIdx}
                            ref={(el) => {
                                panelRefs.current[panelIdx] = el;
                            }}
                            className={`story-burst-cropper__panel${
                                src ? ' story-burst-cropper__panel--has-image' : ' story-burst-cropper__panel--empty'
                            }${isDraggingThis ? ' story-burst-cropper__panel--dragging' : ''}${
                                isStepActive ? ' story-burst-cropper__panel--active-step' : ''
                            }`}
                            tabIndex={src ? 0 : -1}
                            role="group"
                            aria-label={panelAria}
                            onPointerDown={(e) => handlePointerDown(panelIdx, e)}
                            onPointerMove={(e) => handlePointerMove(panelIdx, e)}
                            onPointerUp={(e) => handlePointerUp(panelIdx, e)}
                            onPointerCancel={(e) => handlePointerUp(panelIdx, e)}
                            onWheel={(e) => handleWheel(panelIdx, e)}
                            onTouchStart={(e) => handleTouchStart(panelIdx, e)}
                            onTouchMove={(e) => handleTouchMove(panelIdx, e)}
                            onTouchEnd={(e) => handleTouchEnd(panelIdx, e)}
                            onTouchCancel={(e) => handleTouchEnd(panelIdx, e)}
                            onDoubleClick={(e) => handleDoubleClick(panelIdx, e)}
                            onKeyDown={(e) => handleKeyDown(panelIdx, e)}
                        >
                            {src ? (
                                <>
                                    <div
                                        className="story-burst-cropper__image-wrapper"
                                        style={{
                                            width: `${scaleX * 100}%`,
                                            height: `${scaleY * 100}%`,
                                            transform: `translate3d(${translateX}%, ${translateY}%, 0)`,
                                        }}
                                    >
                                        <img
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
                                                    setImageDims((prev) => {
                                                        const cur = prev[panelIdx];
                                                        if (
                                                            cur &&
                                                            cur.width === img.naturalWidth &&
                                                            cur.height === img.naturalHeight
                                                        ) {
                                                            return prev;
                                                        }
                                                        const next = [...prev];
                                                        next[panelIdx] = {
                                                            width: img.naturalWidth,
                                                            height: img.naturalHeight,
                                                        };
                                                        return next;
                                                    });
                                                }
                                            }}
                                            onError={(e) => {
                                                const fallback = fallbackSrcs?.[panelIdx];
                                                if (fallback && e.currentTarget.src !== fallback) {
                                                    e.currentTarget.src = fallback;
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Rule-of-Thirds Grid Overlay during dragging */}
                                    <div
                                        className={`story-burst-cropper__grid${
                                            isDraggingThis ? ' story-burst-cropper__grid--visible' : ''
                                        }`}
                                        aria-hidden="true"
                                    >
                                        <span className="story-burst-cropper__grid-col story-burst-cropper__grid-col--1" />
                                        <span className="story-burst-cropper__grid-col story-burst-cropper__grid-col--2" />
                                        <span className="story-burst-cropper__grid-row story-burst-cropper__grid-row--1" />
                                        <span className="story-burst-cropper__grid-row story-burst-cropper__grid-row--2" />
                                    </div>

                                    {/* Slot badge indicator */}
                                    <div className="story-burst-cropper__slot-pill" aria-hidden="true">
                                        <span className="story-burst-cropper__slot-name">{slotName}</span>
                                        {zoom > 1.05 && (
                                            <span className="story-burst-cropper__zoom-pill">{zoom.toFixed(1)}x</span>
                                        )}
                                        <span className="story-burst-cropper__pan-hint">Pan/Zoom</span>
                                    </div>

                                    {/* Timestamp Pill */}
                                    {shouldShowTimeStamps && (
                                        <div className="story-burst-cropper__timestamp-pill" aria-hidden="true">
                                            +{dt === 0 ? '0.00' : dt.toFixed(2)}s
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="story-burst-cropper__empty-content">
                                    <span className="story-burst-cropper__empty-slot">
                                        {panelIdx + 1}. {slotName}
                                    </span>
                                    <span className="story-burst-cropper__empty-sub">Tap below to select</span>
                                </div>
                            )}
                        </div>
                    );
                });
                })()}
            </div>

            {/* Decorative Frame Overlay */}
            <StoryFrameOverlay frameId={frameId || 'none'} colorOverride={frameColorOverride} context={frameContext} />

            {/* Badges Layer */}
            <StoryBadges badges={badges} theme={theme} />
        </div>
    );
};
