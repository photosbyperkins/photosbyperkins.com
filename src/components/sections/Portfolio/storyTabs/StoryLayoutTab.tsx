import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, TriptychReverse } from '../../../ui/icons';
import { SPRING_SNAPPY } from '../../../../utils/motion';
import type { NormalizedCrop, PaddedStyleOptions, StoryPreset } from '../../../../utils/storyCanvas';
import { calculateFitZoom, calculateNormalizedCrop } from '../../../../utils/storyCanvas';
import { isFrameValidForWizardStep } from '../../../../utils/story';
import type { BurstMetadata } from '../../../../types';
import { StoryColorPopover, type StoryColorPreset } from './shared/StoryColorPopover';

const DEFAULT_BACKGROUND = '#0a0a14';

const BACKGROUND_PRESETS: StoryColorPreset[] = [
    { id: 'ink', label: 'Ink', color: DEFAULT_BACKGROUND },
    { id: 'white', label: 'White', color: '#ffffff' },
    { id: 'gold', label: 'Gold', color: '#f59e0b' },
    { id: 'red', label: 'Red', color: '#e60000' },
    { id: 'cyan', label: 'Cyan', color: '#06b6d4' },
];

interface StoryLayoutTabProps {
    activeMode: 'solo' | 'crop' | 'padded' | 'burst';
    setActiveMode: (mode: 'solo' | 'crop' | 'padded' | 'burst') => void;
    selectedPresetId: string;
    setSelectedPresetId: (id: string) => void;
    presets: StoryPreset[];
    onSelectPreset: (preset: StoryPreset) => void;
    activeCrop?: NormalizedCrop;
    onCropChange?: (crop: NormalizedCrop) => void;
    naturalDimensions: { width: number; height: number };
    paddedConfig: PaddedStyleOptions;
    setPaddedConfig: React.Dispatch<React.SetStateAction<PaddedStyleOptions>>;
    setIsDownloaded: (val: boolean) => void;
    burst?: BurstMetadata;
    burstShowTimeStamps?: boolean;
    setBurstShowTimeStamps?: (show: boolean) => void;
    burstSelectedIndices?: (number | null)[];
    setBurstSelectedIndices?: (indices: (number | null)[]) => void;
    activePhotoIndex?: number;
    onSelectPhotoIndex?: (idx: number) => void;
    defaultFocusX?: number;
    defaultFocusY?: number;
    panelCount?: 2 | 3;
    burstPanelCount?: 2 | 3;
    setBurstPanelCount?: (count: 2 | 3) => void;
    burstActiveStep?: number;
    setBurstActiveStep?: (step: number) => void;
    burstPanOffsets?: { x: number; y: number; zoom?: number }[];
    onBurstPanChange?: (panelIdx: number, offset: { x: number; y: number; zoom?: number }) => void;
}

export const StoryLayoutTab: React.FC<StoryLayoutTabProps> = ({
    activeMode,
    setActiveMode,
    selectedPresetId,
    setSelectedPresetId,
    presets,
    onSelectPreset,
    activeCrop,
    onCropChange,
    naturalDimensions,
    paddedConfig,
    setPaddedConfig,
    setIsDownloaded,
    burst,
    burstShowTimeStamps = true,
    setBurstShowTimeStamps,
    burstSelectedIndices = [0, 1, 2],
    setBurstSelectedIndices,
    activePhotoIndex = 0,
    onSelectPhotoIndex,
    defaultFocusX,
    defaultFocusY,
    panelCount,
    burstPanelCount,
    setBurstPanelCount,
    burstActiveStep,
    setBurstActiveStep,
    burstPanOffsets,
    onBurstPanChange,
}) => {
    const isSoloMode = activeMode !== 'burst';
    const fitZoom = calculateFitZoom(naturalDimensions.width, naturalDimensions.height, paddedConfig.cardScale || 0.92);

    const setBackgroundColor = (color: string) => {
        setPaddedConfig((prev) => ({ ...prev, customColor: color }));
        setIsDownloaded(false);
    };

    const handleZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        if (onCropChange && activeCrop) {
            const updated = calculateNormalizedCrop(
                naturalDimensions.width,
                naturalDimensions.height,
                activeCrop.centerX,
                activeCrop.centerY,
                newZoom,
                fitZoom
            );
            onCropChange(updated);
            setSelectedPresetId('custom');
            setIsDownloaded(false);
        }
    };

    const effectivePanelCount: 2 | 3 = burstPanelCount ?? panelCount ?? (burst?.total === 2 || burst?.isDuet ? 2 : 3);
    const isDuetLayout = effectivePanelCount === 2;
    const slotNames = isDuetLayout ? ['TOP', 'BTM'] : ['TOP', 'MID', 'BTM'];
    const isMultiPhoto = Boolean(burst?.isTriptych || !burst?.frameDeltas);
    const enforceOrdering = Boolean(!isMultiPhoto && burstShowTimeStamps);

    // Normalize slots to a tuple matching panel count
    const slots: (number | null)[] = useMemo(
        () =>
            isDuetLayout
                ? [burstSelectedIndices[0] ?? null, burstSelectedIndices[1] ?? null]
                : [burstSelectedIndices[0] ?? null, burstSelectedIndices[1] ?? null, burstSelectedIndices[2] ?? null],
        [isDuetLayout, burstSelectedIndices]
    );

    const isSwapDisabled = Boolean(enforceOrdering || slots[0] === null || slots[1] === null);

    const handleBurstZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        if (onBurstPanChange) {
            const currentPan = burstPanOffsets?.[activeStep] || { x: 0.5, y: 0.45, zoom: 1.0 };
            onBurstPanChange(activeStep, {
                ...currentPan,
                zoom: newZoom,
            });
            setIsDownloaded(false);
        }
    };

    // Wizard step: 0 = TOP, 1 = MID (or BTM in duet), 2 = BTM
    const [internalActiveStep, setInternalActiveStep] = useState<number>(() => {
        if (burstSelectedIndices[0] === null || burstSelectedIndices[0] === undefined) return 0;
        if (burstSelectedIndices[1] === null || burstSelectedIndices[1] === undefined) return 1;
        if (!isDuetLayout && (burstSelectedIndices[2] === null || burstSelectedIndices[2] === undefined)) return 2;
        return 0;
    });

    const activeStep = burstActiveStep !== undefined ? burstActiveStep : internalActiveStep;
    const setActiveStep = setBurstActiveStep || setInternalActiveStep;

    const totalFrames = burst?.total || burst?.frameSources?.length || (isDuetLayout ? 2 : 6);
    const isFrameSelectorSuppressed = Boolean(
        !isMultiPhoto && burstShowTimeStamps && totalFrames === effectivePanelCount
    );

    // Active elapsed time delta (+Δt) span calculation
    const activeTimeDeltaText = (() => {
        if (!burstShowTimeStamps || isMultiPhoto || !burst?.frameDeltas) return null;
        const assigned = slots.filter((idx): idx is number => idx !== null && idx !== undefined);
        if (assigned.length < 2) return null;
        const minIdx = Math.min(...assigned);
        const maxIdx = Math.max(...assigned);
        const t0 = burst.frameDeltas[minIdx];
        const t1 = burst.frameDeltas[maxIdx];
        if (t0 === undefined || t1 === undefined) return null;
        return `+${Math.abs(t1 - t0).toFixed(2)}s`;
    })();

    const canReverseTriptych = Boolean(
        !isDuetLayout && !enforceOrdering && slots[0] !== null && slots[1] !== null && slots[2] !== null
    );

    // If available frames match panel count with +Δt shown, auto-select the exact chronological frames [0, 1] or [0, 1, 2]
    useEffect(() => {
        if (!isFrameSelectorSuppressed || !setBurstSelectedIndices) return;

        const expected = effectivePanelCount === 2 ? [0, 1] : [0, 1, 2];
        const isMatching = slots.length === expected.length && slots.every((val, i) => val === expected[i]);
        if (!isMatching) {
            setBurstSelectedIndices(expected);
        }
    }, [isFrameSelectorSuppressed, effectivePanelCount, slots, setBurstSelectedIndices]);

    // Automatically sort existing chosen frames in chronological order (top frame first) whenever +Δt is enabled
    useEffect(() => {
        if (!enforceOrdering || !setBurstSelectedIndices) return;

        const assigned = slots.filter((idx): idx is number => idx !== null && idx !== undefined);
        if (assigned.length <= 1) return;

        let isOutOfOrder = false;
        for (let i = 0; i < slots.length - 1; i++) {
            const curr = slots[i];
            const next = slots[i + 1];
            if (curr !== null && next !== null && curr >= next) {
                isOutOfOrder = true;
                break;
            }
        }

        if (isOutOfOrder) {
            const uniqueSorted = Array.from(new Set(assigned)).sort((a, b) => a - b);
            const nextSlots: (number | null)[] = isDuetLayout
                ? [uniqueSorted[0] ?? null, uniqueSorted[1] ?? null]
                : [uniqueSorted[0] ?? null, uniqueSorted[1] ?? null, uniqueSorted[2] ?? null];

            const isDifferent = nextSlots.some((val, i) => val !== slots[i]);
            if (isDifferent) {
                setBurstSelectedIndices(nextSlots);
            }
        }
    }, [enforceOrdering, slots, isDuetLayout, setBurstSelectedIndices]);

    const handleToggleTimeStamps = (show: boolean) => {
        setBurstShowTimeStamps?.(show);
        setIsDownloaded(false);

        if (show && setBurstSelectedIndices) {
            if (!burst?.isTriptych && totalFrames === effectivePanelCount) {
                setBurstSelectedIndices(effectivePanelCount === 2 ? [0, 1] : [0, 1, 2]);
                return;
            }

            const assigned = slots.filter((idx): idx is number => idx !== null && idx !== undefined);
            if (assigned.length > 0) {
                const uniqueSorted = Array.from(new Set(assigned)).sort((a, b) => a - b);
                const nextSlots: (number | null)[] = isDuetLayout
                    ? [uniqueSorted[0] ?? null, uniqueSorted[1] ?? null]
                    : [uniqueSorted[0] ?? null, uniqueSorted[1] ?? null, uniqueSorted[2] ?? null];
                setBurstSelectedIndices(nextSlots);

                const firstEmpty = nextSlots.findIndex((s) => s === null);
                if (firstEmpty !== -1) {
                    setActiveStep(firstEmpty);
                }
            }
        }
    };

    const handleSwapSlots = () => {
        if (!setBurstSelectedIndices || enforceOrdering || slots[0] === null || slots[1] === null) return;
        setBurstSelectedIndices([slots[1], slots[0]]);
        setIsDownloaded(false);
    };

    const handleReverseTriptychSlots = () => {
        if (
            !setBurstSelectedIndices ||
            !canReverseTriptych ||
            slots[0] === null ||
            slots[1] === null ||
            slots[2] === null
        )
            return;
        setBurstSelectedIndices([slots[2], slots[1], slots[0]]);
        setIsDownloaded(false);
    };

    const handleBurstFrameClick = (fIdx: number) => {
        // If clicking a frame already assigned to another slot:
        const existingSlot = slots.indexOf(fIdx);
        if (existingSlot !== -1 && existingSlot !== activeStep) {
            if (!enforceOrdering) {
                if (!setBurstSelectedIndices) return;
                const next = [...slots];
                const currentActiveVal = next[activeStep];
                next[activeStep] = fIdx;
                next[existingSlot] = currentActiveVal;
                setBurstSelectedIndices(next);
                setIsDownloaded(false);
                return;
            }
            setActiveStep(existingSlot);
            return;
        }

        if (!setBurstSelectedIndices) return;

        // If clicking the frame currently assigned to the activeStep, deselect it
        if (slots[activeStep] === fIdx) {
            const next = [...slots];
            next[activeStep] = null;
            if (enforceOrdering) {
                // Downstream invalidation when ordering is enforced:
                if (activeStep === 0) {
                    next[1] = null;
                    if (!isDuetLayout) next[2] = null;
                } else if (activeStep === 1 && !isDuetLayout) {
                    next[2] = null;
                }
            }
            setBurstSelectedIndices(next);
            setIsDownloaded(false);
            return;
        }

        // Check validity for current wizard step
        const isValid = isFrameValidForWizardStep(
            fIdx,
            activeStep,
            slots,
            totalFrames,
            burst?.isTriptych,
            effectivePanelCount,
            enforceOrdering
        );
        if (!isValid) return;

        setIsDownloaded(false);
        const next = [...slots];

        if (!enforceOrdering) {
            next[activeStep] = fIdx;
            setBurstSelectedIndices(next);
            // Auto-advance wizard to next empty slot if any
            const nextEmpty = next.findIndex((s) => s === null);
            if (nextEmpty !== -1) {
                setActiveStep(nextEmpty);
            }
            return;
        }

        // Chronological ordering is enforced (+Δt is enabled on continuous burst)
        if (isDuetLayout) {
            next[activeStep] = fIdx;
            if (activeStep === 0) {
                if (next[1] !== null && next[1] <= fIdx) {
                    next[1] = null;
                }
                if (next[1] === null) {
                    setActiveStep(1);
                }
            }
            setBurstSelectedIndices(next);
            return;
        }

        if (activeStep === 0) {
            next[0] = fIdx;
            // Downstream invalidation: if mid was <= new top, clear mid and btm
            if (next[1] !== null && next[1] <= fIdx) {
                next[1] = null;
                next[2] = null;
            } else if (next[2] !== null && next[1] !== null && next[2] <= next[1]) {
                next[2] = null;
            }
            setBurstSelectedIndices(next);
            // Auto-advance wizard
            if (next[1] === null) {
                setActiveStep(1);
            } else if (next[2] === null) {
                setActiveStep(2);
            }
            return;
        }

        if (activeStep === 1) {
            next[1] = fIdx;
            // Downstream invalidation: if btm was <= new mid, clear btm
            if (next[2] !== null && next[2] <= fIdx) {
                next[2] = null;
            }
            setBurstSelectedIndices(next);
            // Auto-advance wizard
            if (next[2] === null) {
                setActiveStep(2);
            }
            return;
        }

        if (activeStep === 2) {
            next[2] = fIdx;
            setBurstSelectedIndices(next);
            return;
        }
    };

    const handleSlotClick = (sIdx: number) => {
        if (totalFrames === 2 && isDuetLayout) {
            if (slots[sIdx] === null) {
                const otherIdx = sIdx === 0 ? 1 : 0;
                const otherVal = slots[otherIdx];
                const missing = otherVal === 0 ? 1 : 0;
                const next = [...slots];
                next[sIdx] = missing;
                setBurstSelectedIndices?.(next);
                setIsDownloaded(false);
            }
            setActiveStep(sIdx);
            return;
        }

        if (activeStep === sIdx && slots[sIdx] !== null) {
            // Tapping the currently active step pill clears this slot (and downstream slots if ordering is enforced)
            const next = [...slots];
            if (!enforceOrdering) {
                next[sIdx] = null;
            } else if (isDuetLayout) {
                if (sIdx === 0) {
                    next[0] = null;
                    next[1] = null;
                } else if (sIdx === 1) {
                    next[1] = null;
                }
            } else {
                if (sIdx === 0) {
                    next[0] = null;
                    next[1] = null;
                    next[2] = null;
                } else if (sIdx === 1) {
                    next[1] = null;
                    next[2] = null;
                } else if (sIdx === 2) {
                    next[2] = null;
                }
            }
            setBurstSelectedIndices?.(next);
            setIsDownloaded(false);
            return;
        }

        // When switching to another step:
        if (enforceOrdering) {
            // You cannot jump to BTM/MID if TOP is null
            if (sIdx >= 1 && slots[0] === null) {
                setActiveStep(0);
                return;
            }
            // In 3-panel mode, you cannot jump to BTM if MID is null
            if (!isDuetLayout && sIdx === 2 && slots[1] === null) {
                setActiveStep(1);
                return;
            }
        }
        setActiveStep(sIdx);
    };

    const validCount = slots.filter((idx) => idx !== null && idx >= 0).length;
    const neededFrames = Math.max(0, effectivePanelCount - validCount);
    const feedbackText =
        neededFrames > 0
            ? burst?.isTriptych
                ? `Pick ${neededFrames} photo${neededFrames === 1 ? '' : 's'}`
                : `Pick ${neededFrames} frame${neededFrames === 1 ? '' : 's'}`
            : burst?.isTriptych
              ? `${effectivePanelCount} photos selected`
              : `${effectivePanelCount} frames selected`;

    return (
        <div className="story-export-modal__tab-content story-export-modal__tab-content--layout">
            {/* Mode Toggle: SOLO vs Duet vs Triptych (shown when photo is a burst with >= 2 photos) */}
            <div className="story-export-modal__section">
                {burst && burst.total >= 2 && (
                    <div className="story-export-modal__top-row" style={{ marginBottom: '0.75rem' }}>
                        <div
                            className="portfolio__segmented-toggle story-export-modal__segmented-control"
                            role="group"
                            aria-label="Story layout mode"
                        >
                            <button
                                type="button"
                                className={`story-export-modal__seg-btn ${
                                    isSoloMode ? 'active story-export-modal__seg-btn--active' : ''
                                }`}
                                onClick={() => {
                                    setActiveMode('solo');
                                    setIsDownloaded(false);
                                }}
                                aria-pressed={isSoloMode}
                            >
                                {isSoloMode && (
                                    <motion.span
                                        className="portfolio__segment-pill"
                                        layoutId="storyLayoutModePill"
                                        transition={SPRING_SNAPPY}
                                    />
                                )}
                                <span>Solo</span>
                            </button>
                            <button
                                type="button"
                                className={`story-export-modal__seg-btn story-export-modal__seg-btn--burst ${
                                    activeMode === 'burst' && effectivePanelCount === 2
                                        ? 'active story-export-modal__seg-btn--active'
                                        : ''
                                }`}
                                onClick={() => {
                                    setActiveMode('burst');
                                    setBurstPanelCount?.(2);
                                    if (!burst?.isTriptych && burstShowTimeStamps && totalFrames === 2) {
                                        setBurstSelectedIndices?.([0, 1]);
                                    }
                                    setIsDownloaded(false);
                                }}
                                aria-pressed={activeMode === 'burst' && effectivePanelCount === 2}
                            >
                                {activeMode === 'burst' && effectivePanelCount === 2 && (
                                    <motion.span
                                        className="portfolio__segment-pill"
                                        layoutId="storyLayoutModePill"
                                        transition={SPRING_SNAPPY}
                                    />
                                )}
                                <span>Duet</span>
                            </button>
                            {burst.total >= 3 && (
                                <button
                                    type="button"
                                    className={`story-export-modal__seg-btn story-export-modal__seg-btn--burst ${
                                        activeMode === 'burst' && effectivePanelCount === 3
                                            ? 'active story-export-modal__seg-btn--active'
                                            : ''
                                    }`}
                                    onClick={() => {
                                        setActiveMode('burst');
                                        setBurstPanelCount?.(3);
                                        if (!burst?.isTriptych && burstShowTimeStamps && totalFrames === 3) {
                                            setBurstSelectedIndices?.([0, 1, 2]);
                                        }
                                        setIsDownloaded(false);
                                    }}
                                    aria-pressed={activeMode === 'burst' && effectivePanelCount === 3}
                                >
                                    {activeMode === 'burst' && effectivePanelCount === 3 && (
                                        <motion.span
                                            className="portfolio__segment-pill"
                                            layoutId="storyLayoutModePill"
                                            transition={SPRING_SNAPPY}
                                        />
                                    )}
                                    <span>Triptych</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Single-Photo Mode Selector (Crop / Padded when multiple photos are selected) */}
                {activeMode !== 'burst' && burst && burst.frameSources && burst.frameSources.length > 1 && (
                    <div className="story-export-modal__section">
                        <div className="story-export-modal__padded-settings">
                            <div
                                className="story-export-modal__toggle-row"
                                style={{ marginTop: 0, marginBottom: '0.5rem' }}
                            >
                                <span>{burst.isTriptych ? 'Selected Photo' : 'Selected Frame'}</span>
                                <span
                                    className="story-export-modal__hint-tag"
                                    style={{
                                        color: 'var(--color-text-dim)',
                                        fontWeight: 500,
                                    }}
                                >
                                    {burst.isTriptych
                                        ? `Photo ${activePhotoIndex + 1} of ${burst.frameSources.length}`
                                        : `Frame ${activePhotoIndex + 1} of ${burst.frameSources.length}`}
                                </span>
                            </div>

                            <div className="story-export-modal__burst-selector" style={{ marginTop: 0 }}>
                                <div
                                    className="story-export-modal__burst-strip"
                                    role="group"
                                    aria-label="Photo Selector"
                                >
                                    {burst.frameSources.map((src, fIdx) => {
                                        const isSelected = fIdx === activePhotoIndex;
                                        const thumbUrl = burst.frameThumbs?.[fIdx] || src;
                                        const delta = burst.frameDeltas?.[fIdx] ?? fIdx * 0.8;
                                        const labelPrefix = burst.isTriptych ? 'P' : 'F';
                                        const photoLabel = `${labelPrefix}${fIdx + 1}`;
                                        const fullTitle = burst.isTriptych ? `Photo ${fIdx + 1}` : `Frame ${fIdx + 1}`;

                                        const ariaLabel = burst.isTriptych
                                            ? `${fullTitle}.${isSelected ? ' (Selected)' : ''} Tap to select.`
                                            : `${fullTitle}, elapsed time +${delta.toFixed(2)} seconds.${
                                                  isSelected ? ' (Selected)' : ''
                                              } Tap to select.`;

                                        const titleText = burst.isTriptych
                                            ? `${fullTitle}${isSelected ? ' (Selected)' : ''}`
                                            : `${fullTitle}: +${delta.toFixed(2)}s${isSelected ? ' (Selected)' : ''}`;

                                        const fx =
                                            burst?.frameFocusX?.[fIdx] ??
                                            (fIdx === activePhotoIndex ? defaultFocusX : undefined) ??
                                            defaultFocusX;
                                        const fy =
                                            burst?.frameFocusY?.[fIdx] ??
                                            (fIdx === activePhotoIndex ? defaultFocusY : undefined) ??
                                            defaultFocusY;
                                        const objectPosition =
                                            fx != null && fy != null ? `${fx * 100}% ${fy * 100}%` : undefined;

                                        return (
                                            <button
                                                key={src}
                                                type="button"
                                                className={`story-export-modal__burst-thumb${
                                                    isSelected
                                                        ? ' story-export-modal__burst-thumb--selected story-export-modal__burst-thumb--targeted'
                                                        : ''
                                                }`}
                                                style={
                                                    objectPosition
                                                        ? ({ '--thumb-focus': objectPosition } as React.CSSProperties)
                                                        : undefined
                                                }
                                                onClick={() => onSelectPhotoIndex?.(fIdx)}
                                                title={titleText}
                                                aria-label={ariaLabel}
                                                aria-pressed={isSelected}
                                            >
                                                <img
                                                    src={thumbUrl}
                                                    alt={fullTitle}
                                                    loading="lazy"
                                                    style={objectPosition ? { objectPosition } : undefined}
                                                />
                                                {isSelected ? (
                                                    <span className="story-export-modal__burst-thumb-slot">
                                                        {photoLabel}
                                                    </span>
                                                ) : (
                                                    <span className="story-export-modal__burst-thumb-idx">
                                                        {photoLabel}
                                                    </span>
                                                )}
                                                {!burst.isTriptych && (
                                                    <span className="story-export-modal__burst-thumb-badge">
                                                        +{delta.toFixed(2)}s
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Multi-Panel Burst / Triptych / Duet Settings */}
                {activeMode === 'burst' && burst && burst.total >= 2 && (
                    <div className="story-export-modal__section">
                        <div className="story-export-modal__padded-settings">
                            <div
                                className="story-export-modal__toggle-row story-export-modal__slot-header"
                                style={{ marginTop: 0, marginBottom: isFrameSelectorSuppressed ? 0 : '0.5rem' }}
                            >
                                <div className="story-export-modal__label-with-badge">
                                    <span>
                                        {burst.isTriptych
                                            ? isDuetLayout
                                                ? 'Duet Photos'
                                                : 'Triptych Photos'
                                            : isDuetLayout
                                              ? 'Duet Frames'
                                              : 'Burst Frames'}
                                    </span>
                                    {!isMultiPhoto && <span>+Δt</span>}
                                    {burstShowTimeStamps && activeTimeDeltaText && (
                                        <span
                                            className="story-export-modal__delta-badge"
                                            data-testid="burst-delta-badge"
                                        >
                                            ({activeTimeDeltaText})
                                        </span>
                                    )}
                                    {!isFrameSelectorSuppressed && (
                                        <span
                                            className="story-export-modal__hint-tag"
                                            style={{
                                                color:
                                                    neededFrames > 0
                                                        ? 'var(--color-accent, #f59e0b)'
                                                        : 'var(--color-text-dim)',
                                                fontWeight: neededFrames > 0 ? 700 : 500,
                                            }}
                                        >
                                            {feedbackText}
                                        </span>
                                    )}
                                </div>
                                <div className="story-export-modal__slot-header-actions">
                                    {!isMultiPhoto && (
                                        <div
                                            className="portfolio__segmented-toggle story-export-modal__pill-group story-export-modal__pill-group--inline"
                                            role="group"
                                            aria-label="Show timestamp"
                                        >
                                            <button
                                                type="button"
                                                className={`story-export-modal__pill ${
                                                    burstShowTimeStamps ? 'active story-export-modal__pill--active' : ''
                                                }`}
                                                onClick={() => handleToggleTimeStamps(true)}
                                                aria-pressed={Boolean(burstShowTimeStamps)}
                                            >
                                                {burstShowTimeStamps && (
                                                    <motion.span
                                                        className="portfolio__segment-pill"
                                                        layoutId="storyBurstTimestampsPill"
                                                        transition={SPRING_SNAPPY}
                                                    />
                                                )}
                                                <span>Show</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`story-export-modal__pill ${
                                                    !burstShowTimeStamps
                                                        ? 'active story-export-modal__pill--active'
                                                        : ''
                                                }`}
                                                onClick={() => handleToggleTimeStamps(false)}
                                                aria-pressed={!burstShowTimeStamps}
                                            >
                                                {!burstShowTimeStamps && (
                                                    <motion.span
                                                        className="portfolio__segment-pill"
                                                        layoutId="storyBurstTimestampsPill"
                                                        transition={SPRING_SNAPPY}
                                                    />
                                                )}
                                                <span>Hide</span>
                                            </button>
                                        </div>
                                    )}
                                    {isDuetLayout && (
                                        <button
                                            type="button"
                                            className={`story-export-modal__reverse-btn story-export-modal__swap-pill ${
                                                isSwapDisabled ? 'story-export-modal__swap-pill--disabled' : ''
                                            }`}
                                            onClick={handleSwapSlots}
                                            disabled={isSwapDisabled}
                                            title={isSwapDisabled ? undefined : 'Swap Top and Bottom photos'}
                                            aria-label="Swap Top and Bottom photos"
                                            aria-disabled={isSwapDisabled}
                                            tabIndex={isSwapDisabled ? -1 : 0}
                                        >
                                            <ArrowLeftRight size={13} />
                                            <span>Swap</span>
                                        </button>
                                    )}
                                    {canReverseTriptych && (
                                        <button
                                            type="button"
                                            className="story-export-modal__reverse-btn"
                                            onClick={handleReverseTriptychSlots}
                                            title="Reverse frame sequence (invert top and bottom)"
                                            aria-label="Reverse frame sequence"
                                        >
                                            <TriptychReverse size={13} />
                                            <span>Reverse</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {!isFrameSelectorSuppressed && (
                                <div className="story-export-modal__burst-selector" style={{ marginTop: '0.5rem' }}>
                                    {/* Sequential Wizard / Triptych / Duet Segmented Step Picker */}
                                    <div
                                        className="portfolio__segmented-toggle story-export-modal__pill-group story-export-modal__burst-slot-group"
                                        role="group"
                                        aria-label={
                                            burst.isTriptych
                                                ? isDuetLayout
                                                    ? 'Duet Photo Slots'
                                                    : 'Triptych Photo Slots'
                                                : isDuetLayout
                                                  ? 'Duet Frame Slots'
                                                  : 'Burst Wizard Steps'
                                        }
                                    >
                                        {(isDuetLayout ? [0, 1] : [0, 1, 2]).map((sIdx) => {
                                            const assignedFrame = slots[sIdx];
                                            const isStepActive = activeStep === sIdx;
                                            const valPrefix = burst.isTriptych ? 'P' : 'F';
                                            const valText =
                                                assignedFrame !== null ? `${valPrefix}${assignedFrame + 1}` : 'Empty';
                                            return (
                                                <button
                                                    key={sIdx}
                                                    type="button"
                                                    className={`story-export-modal__pill story-export-modal__burst-slot-pill ${
                                                        isStepActive ? 'active story-export-modal__pill--active' : ''
                                                    }`}
                                                    onClick={() => handleSlotClick(sIdx)}
                                                    aria-label={`Step ${sIdx + 1} (${slotNames[sIdx]}): ${
                                                        assignedFrame !== null
                                                            ? `${burst.isTriptych ? 'Photo' : 'Frame'} ${
                                                                  assignedFrame + 1
                                                              }`
                                                            : 'Empty'
                                                    }${isStepActive ? ' (Active)' : ''}`}
                                                    aria-pressed={isStepActive}
                                                >
                                                    {isStepActive && (
                                                        <motion.span
                                                            className="portfolio__segment-pill"
                                                            layoutId="storyBurstWizardStepPill"
                                                            transition={SPRING_SNAPPY}
                                                        />
                                                    )}
                                                    <span className="story-export-modal__burst-slot-name">
                                                        {sIdx + 1}. {slotNames[sIdx]}
                                                    </span>
                                                    <span className="story-export-modal__burst-slot-val">
                                                        {valText}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Active Panel Framing & Zoom Slider */}
                                    {slots[activeStep] !== null && burstPanOffsets && (
                                        <div className="story-export-modal__framing-header story-export-modal__framing-header--burst">
                                            <span className="story-export-modal__sublabel">
                                                {slotNames[activeStep]} Framing
                                            </span>
                                            <div className="story-export-modal__framing-zoom">
                                                <span className="story-export-modal__framing-zoom-label">Zoom</span>
                                                <input
                                                    type="range"
                                                    min="1.0"
                                                    max="3.0"
                                                    step="0.01"
                                                    value={burstPanOffsets[activeStep]?.zoom ?? 1.0}
                                                    onChange={handleBurstZoomSliderChange}
                                                    className="story-export-modal__slider story-export-modal__slider--inline"
                                                    aria-label={`${slotNames[activeStep]} Panel Zoom`}
                                                />
                                                <span className="story-export-modal__zoom-value">
                                                    {(burstPanOffsets[activeStep]?.zoom ?? 1.0) <= 1.01
                                                        ? '1.0x'
                                                        : `${(burstPanOffsets[activeStep]?.zoom ?? 1.0).toFixed(2)}x`}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {!(totalFrames === 2 && isDuetLayout) && (
                                        <div className="story-export-modal__burst-strip">
                                            {burst.frameSources.map((src, fIdx) => {
                                                const assignedSlot = slots.indexOf(fIdx);
                                                const isSelected = assignedSlot !== -1;
                                                const isTargeted = assignedSlot === activeStep;
                                                const isValidForStep = isFrameValidForWizardStep(
                                                    fIdx,
                                                    activeStep,
                                                    slots,
                                                    totalFrames,
                                                    burst.isTriptych,
                                                    effectivePanelCount,
                                                    enforceOrdering
                                                );
                                                const isDisabled = !isSelected && !isValidForStep;
                                                const thumbUrl = burst.frameThumbs?.[fIdx] || src;
                                                const delta = burst.frameDeltas?.[fIdx] ?? fIdx * 0.8;

                                                let ariaLabel = burst.isTriptych
                                                    ? `Photo ${fIdx + 1}.`
                                                    : `Frame ${fIdx + 1}, elapsed time +${delta.toFixed(2)} seconds.`;
                                                if (isSelected) {
                                                    ariaLabel += ` Assigned to ${slotNames[assignedSlot]} panel${
                                                        isTargeted ? ' (Active)' : ''
                                                    }. Tap to select.`;
                                                } else if (isDisabled) {
                                                    ariaLabel += burst.isTriptych
                                                        ? ' Already assigned to another panel.'
                                                        : ` Unavailable for ${slotNames[activeStep]} panel (sequential order enforced).`;
                                                } else {
                                                    ariaLabel += ` Tap to assign to ${slotNames[activeStep]} panel.`;
                                                }

                                                const titleText = burst.isTriptych
                                                    ? `Photo ${fIdx + 1}${
                                                          isSelected
                                                              ? ` (${slotNames[assignedSlot]})`
                                                              : isDisabled
                                                                ? ' (Assigned)'
                                                                : ''
                                                      }`
                                                    : `Frame ${fIdx + 1}: +${delta.toFixed(2)}s${
                                                          isSelected
                                                              ? ` (${slotNames[assignedSlot]})`
                                                              : isDisabled
                                                                ? ' (Disabled)'
                                                                : ''
                                                      }`;

                                                const fx = burst?.frameFocusX?.[fIdx] ?? defaultFocusX;
                                                const fy = burst?.frameFocusY?.[fIdx] ?? defaultFocusY;
                                                const objectPosition =
                                                    fx != null && fy != null ? `${fx * 100}% ${fy * 100}%` : undefined;

                                                return (
                                                    <button
                                                        key={src}
                                                        type="button"
                                                        className={`story-export-modal__burst-thumb${
                                                            isSelected
                                                                ? ' story-export-modal__burst-thumb--selected'
                                                                : ''
                                                        }${isTargeted ? ' story-export-modal__burst-thumb--targeted' : ''}${
                                                            isDisabled
                                                                ? ' story-export-modal__burst-thumb--disabled'
                                                                : ''
                                                        }`}
                                                        style={
                                                            objectPosition
                                                                ? ({
                                                                      '--thumb-focus': objectPosition,
                                                                  } as React.CSSProperties)
                                                                : undefined
                                                        }
                                                        onClick={() => handleBurstFrameClick(fIdx)}
                                                        disabled={isDisabled}
                                                        title={titleText}
                                                        aria-label={ariaLabel}
                                                    >
                                                        <img
                                                            src={thumbUrl}
                                                            alt={
                                                                burst.isTriptych
                                                                    ? `Photo ${fIdx + 1}`
                                                                    : `Frame ${fIdx + 1}`
                                                            }
                                                            loading="lazy"
                                                            style={objectPosition ? { objectPosition } : undefined}
                                                        />
                                                        {isSelected ? (
                                                            <span className="story-export-modal__burst-thumb-slot">
                                                                {slotNames[assignedSlot]}
                                                            </span>
                                                        ) : (
                                                            <span className="story-export-modal__burst-thumb-idx">
                                                                {burst.isTriptych ? `P${fIdx + 1}` : `F${fIdx + 1}`}
                                                            </span>
                                                        )}
                                                        {!burst.isTriptych && (
                                                            <span className="story-export-modal__burst-thumb-badge">
                                                                +{delta.toFixed(2)}s
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Framing & Presets Section (for Solo Mode) */}
                {isSoloMode && (
                    <div className="story-export-modal__section">
                        <div className="story-export-modal__framing-header">
                            <span className="story-export-modal__sublabel">Framing</span>
                            <div className="story-export-modal__framing-zoom">
                                <span className="story-export-modal__framing-zoom-label">Zoom</span>
                                <input
                                    type="range"
                                    min={fitZoom}
                                    max="3.5"
                                    step="0.01"
                                    value={activeCrop?.zoom ?? 1.0}
                                    onChange={handleZoomSliderChange}
                                    className="story-export-modal__slider story-export-modal__slider--inline"
                                    aria-label="Photo Zoom"
                                />
                                <span className="story-export-modal__zoom-value">
                                    {Math.abs((activeCrop?.zoom ?? 1.0) - fitZoom) < 0.02
                                        ? 'Fit'
                                        : Math.abs((activeCrop?.zoom ?? 1.0) - 1.0) < 0.02
                                          ? 'Fill'
                                          : `${(activeCrop?.zoom ?? 1.0).toFixed(2)}x`}
                                </span>
                            </div>
                        </div>

                        {/* Framing Options (at most 3 options, sorted from least zoomed in (padded) to most) */}
                        <div
                            className="portfolio__segmented-toggle story-export-modal__presets-grid"
                            role="group"
                            aria-label="Framing presets"
                        >
                            {presets
                                .filter((p) => p.mode === 'solo' || p.mode === 'crop')
                                .map((preset) => {
                                    const isSelected = selectedPresetId === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            className={`story-export-modal__preset-pill ${
                                                isSelected ? 'active story-export-modal__preset-pill--active' : ''
                                            }`}
                                            onClick={() => onSelectPreset(preset)}
                                            title={preset.description}
                                            aria-label={preset.label}
                                            aria-pressed={isSelected}
                                        >
                                            {isSelected && (
                                                <motion.span
                                                    className="portfolio__segment-pill"
                                                    layoutId="storyPresetPill"
                                                    transition={SPRING_SNAPPY}
                                                />
                                            )}
                                            <span>{preset.label}</span>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {/* Background Settings (for Solo Mode) */}
                {isSoloMode && (
                    <div className="story-export-modal__section">
                        <div className="story-export-modal__padded-settings">
                            {/* Row 1: "Background" label on the left, colour pill + popover on the right (same picker as Frame tint) */}
                            <div className="story-export-modal__toggle-row story-export-modal__background-header">
                                <div className="story-export-modal__label-with-badge">
                                    <span>Background</span>
                                </div>

                                <div className="story-export-modal__background-header-tint">
                                    <StoryColorPopover
                                        popoverId="story-bg-color-popover"
                                        triggerText="Color"
                                        ariaNoun="Background color"
                                        customAriaLabel={
                                            paddedConfig.style === 'solid' || paddedConfig.style === 'custom'
                                                ? 'Solid background color'
                                                : 'Frosted tint color'
                                        }
                                        presets={BACKGROUND_PRESETS}
                                        activePresetId={
                                            BACKGROUND_PRESETS.find(
                                                (p) =>
                                                    p.color === (paddedConfig.customColor || DEFAULT_BACKGROUND).toLowerCase()
                                            )?.id ?? null
                                        }
                                        currentColor={paddedConfig.customColor || DEFAULT_BACKGROUND}
                                        onSelectPreset={(preset) => setBackgroundColor(preset.color!)}
                                        onCustomColor={setBackgroundColor}
                                        align="end"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Frosted | Solid segmented toggle */}
                            <div
                                className="portfolio__segmented-toggle story-export-modal__pill-group story-export-modal__pill-group--full"
                                role="group"
                                aria-label="Background style"
                            >
                                <button
                                    type="button"
                                    className={`story-export-modal__pill ${
                                        paddedConfig.style === 'frosted' || paddedConfig.style === 'glass'
                                            ? 'active story-export-modal__pill--active'
                                            : ''
                                    }`}
                                    onClick={() => {
                                        setPaddedConfig((prev) => ({ ...prev, style: 'frosted' }));
                                        setIsDownloaded(false);
                                    }}
                                    aria-pressed={paddedConfig.style === 'frosted' || paddedConfig.style === 'glass'}
                                >
                                    {(paddedConfig.style === 'frosted' || paddedConfig.style === 'glass') && (
                                        <motion.span
                                            className="portfolio__segment-pill"
                                            layoutId="storyPaddedStylePill"
                                            transition={SPRING_SNAPPY}
                                        />
                                    )}
                                    <span>Frosted</span>
                                </button>
                                <button
                                    type="button"
                                    className={`story-export-modal__pill ${
                                        paddedConfig.style === 'solid' || paddedConfig.style === 'custom'
                                            ? 'active story-export-modal__pill--active'
                                            : ''
                                    }`}
                                    onClick={() => {
                                        setPaddedConfig((prev) => ({ ...prev, style: 'solid' }));
                                        setIsDownloaded(false);
                                    }}
                                    aria-pressed={paddedConfig.style === 'solid' || paddedConfig.style === 'custom'}
                                >
                                    {(paddedConfig.style === 'solid' || paddedConfig.style === 'custom') && (
                                        <motion.span
                                            className="portfolio__segment-pill"
                                            layoutId="storyPaddedStylePill"
                                            transition={SPRING_SNAPPY}
                                        />
                                    )}
                                    <span>Solid</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
