import React, { useState } from 'react';
import type { NormalizedCrop, PaddedStyleOptions, StoryPreset } from '../../../../utils/storyCanvas';
import { calculateNormalizedCrop } from '../../../../utils/storyCanvas';
import { isFrameValidForWizardStep } from '../../../../utils/story';
import type { BurstMetadata } from '../../../../types';

interface StoryLayoutTabProps {
    activeMode: 'crop' | 'padded' | 'burst';
    setActiveMode: (mode: 'crop' | 'padded' | 'burst') => void;
    selectedPresetId: string;
    setSelectedPresetId: (id: string) => void;
    presets: StoryPreset[];
    onSelectPreset: (preset: StoryPreset) => void;
    activeCrop: NormalizedCrop;
    onCropChange: (crop: NormalizedCrop) => void;
    naturalDimensions: { width: number; height: number };
    paddedConfig: PaddedStyleOptions;
    setPaddedConfig: React.Dispatch<React.SetStateAction<PaddedStyleOptions>>;
    setIsDownloaded: (val: boolean) => void;
    burst?: BurstMetadata;
    burstShowTimeStamps?: boolean;
    setBurstShowTimeStamps?: (show: boolean) => void;
    burstSelectedIndices?: (number | null)[];
    setBurstSelectedIndices?: (indices: (number | null)[]) => void;
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
}) => {
    // Normalize slots to a 3-element tuple [slot0, slot1, slot2]
    const slots: (number | null)[] = [
        burstSelectedIndices[0] ?? null,
        burstSelectedIndices[1] ?? null,
        burstSelectedIndices[2] ?? null,
    ];

    // Wizard step: 0 = TOP, 1 = MID, 2 = BTM
    const [activeStep, setActiveStep] = useState<number>(() => {
        if (burstSelectedIndices[0] === null || burstSelectedIndices[0] === undefined) return 0;
        if (burstSelectedIndices[1] === null || burstSelectedIndices[1] === undefined) return 1;
        if (burstSelectedIndices[2] === null || burstSelectedIndices[2] === undefined) return 2;
        return 0;
    });

    const slotNames = ['TOP', 'MID', 'BTM'];
    const totalFrames = burst?.total || burst?.frameSources?.length || 6;

    const handleBurstFrameClick = (fIdx: number) => {
        // If clicking a frame already assigned to another slot, switch activeStep to that slot
        const existingSlot = slots.indexOf(fIdx);
        if (existingSlot !== -1 && existingSlot !== activeStep) {
            setActiveStep(existingSlot);
            return;
        }

        if (!setBurstSelectedIndices) return;

        // If clicking the frame currently assigned to the activeStep, deselect it
        if (slots[activeStep] === fIdx) {
            const next = [...slots];
            next[activeStep] = null;
            // Downstream invalidation:
            if (activeStep === 0) {
                next[1] = null;
                next[2] = null;
            } else if (activeStep === 1) {
                next[2] = null;
            }
            setBurstSelectedIndices(next);
            setIsDownloaded(false);
            return;
        }

        // Check validity for current wizard step
        const isValid = isFrameValidForWizardStep(fIdx, activeStep, slots, totalFrames);
        if (!isValid) return;

        setIsDownloaded(false);
        const next = [...slots];

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
        if (activeStep === sIdx && slots[sIdx] !== null) {
            // Tapping the currently active step pill clears this slot and downstream slots
            const next = [...slots];
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
            setBurstSelectedIndices?.(next);
            setIsDownloaded(false);
            return;
        }

        // When switching to another step:
        // You cannot jump to MID if TOP is null
        if (sIdx === 1 && slots[0] === null) {
            setActiveStep(0);
            return;
        }
        // You cannot jump to BTM if TOP or MID is null
        if (sIdx === 2 && (slots[0] === null || slots[1] === null)) {
            setActiveStep(slots[0] === null ? 0 : 1);
            return;
        }
        setActiveStep(sIdx);
    };

    const validCount = slots.filter((idx) => idx !== null && idx >= 0).length;
    const neededFrames = Math.max(0, 3 - validCount);
    const feedbackText =
        neededFrames > 0 ? `Pick ${neededFrames} frame${neededFrames === 1 ? '' : 's'}` : '3 frames selected';

    return (
        <div className="story-export-modal__tab-content story-export-modal__tab-content--layout">
            {/* Mode Toggle: Smart Crop vs Padded Glass vs 3-Panel Burst */}
            <div className="story-export-modal__section">
                <div className="story-export-modal__top-row">
                    <div className="portfolio__segmented-toggle story-export-modal__segmented-control">
                        <button
                            className={`story-export-modal__seg-btn ${
                                activeMode === 'crop' ? 'active story-export-modal__seg-btn--active' : ''
                            }`}
                            onClick={() => {
                                setActiveMode('crop');
                                setIsDownloaded(false);
                            }}
                        >
                            <span>9:16 Crop</span>
                        </button>
                        <button
                            className={`story-export-modal__seg-btn ${
                                activeMode === 'padded' ? 'active story-export-modal__seg-btn--active' : ''
                            }`}
                            onClick={() => {
                                setActiveMode('padded');
                                setSelectedPresetId('padded-glass');
                                setIsDownloaded(false);
                            }}
                        >
                            <span>Padded</span>
                        </button>
                        {burst && (
                            <button
                                className={`story-export-modal__seg-btn story-export-modal__seg-btn--burst ${
                                    activeMode === 'burst' ? 'active story-export-modal__seg-btn--active' : ''
                                }`}
                                onClick={() => {
                                    setActiveMode('burst');
                                    setIsDownloaded(false);
                                }}
                            >
                                <span>{burst.isTriptych ? 'Triptych' : 'BURST'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* 3-Panel Burst / Triptych Settings */}
                {activeMode === 'burst' && burst && !burst.isTriptych && (
                    <div className="story-export-modal__section">
                        <div className="story-export-modal__padded-settings">
                            <div className="story-export-modal__toggle-row">
                                <span>+Δt</span>
                                <div className="portfolio__segmented-toggle story-export-modal__pill-group">
                                    <button
                                        type="button"
                                        className={`story-export-modal__pill ${
                                            burstShowTimeStamps ? 'active story-export-modal__pill--active' : ''
                                        }`}
                                        onClick={() => {
                                            setBurstShowTimeStamps?.(true);
                                            setIsDownloaded(false);
                                        }}
                                    >
                                        Show
                                    </button>
                                    <button
                                        type="button"
                                        className={`story-export-modal__pill ${
                                            !burstShowTimeStamps ? 'active story-export-modal__pill--active' : ''
                                        }`}
                                        onClick={() => {
                                            setBurstShowTimeStamps?.(false);
                                            setIsDownloaded(false);
                                        }}
                                    >
                                        Hide
                                    </button>
                                </div>
                            </div>

                            {burst.total > 3 && (
                                <div className="story-export-modal__burst-selector" style={{ marginTop: '1rem' }}>
                                    <div
                                        className="story-export-modal__toggle-row"
                                        style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}
                                    >
                                        <span>Burst Frames</span>
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
                                    </div>

                                    {/* Sequential Wizard Segmented Step Picker */}
                                    <div
                                        className="portfolio__segmented-toggle story-export-modal__pill-group story-export-modal__burst-slot-group"
                                        role="group"
                                        aria-label="Burst Wizard Steps"
                                    >
                                        {[0, 1, 2].map((sIdx) => {
                                            const assignedFrame = slots[sIdx];
                                            const isStepActive = activeStep === sIdx;
                                            const valText = assignedFrame !== null ? `F${assignedFrame + 1}` : 'Empty';
                                            return (
                                                <button
                                                    key={sIdx}
                                                    type="button"
                                                    className={`story-export-modal__pill story-export-modal__burst-slot-pill ${
                                                        isStepActive ? 'active story-export-modal__pill--active' : ''
                                                    }`}
                                                    onClick={() => handleSlotClick(sIdx)}
                                                    aria-label={`Step ${sIdx + 1} (${slotNames[sIdx]}): ${
                                                        assignedFrame !== null ? `Frame ${assignedFrame + 1}` : 'Empty'
                                                    }${isStepActive ? ' (Active)' : ''}`}
                                                    aria-pressed={isStepActive}
                                                >
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

                                    <div className="story-export-modal__burst-strip">
                                        {burst.frameSources.map((src, fIdx) => {
                                            const assignedSlot = slots.indexOf(fIdx);
                                            const isSelected = assignedSlot !== -1;
                                            const isTargeted = assignedSlot === activeStep;
                                            const isValidForStep = isFrameValidForWizardStep(
                                                fIdx,
                                                activeStep,
                                                slots,
                                                totalFrames
                                            );
                                            const isDisabled = !isSelected && !isValidForStep;
                                            const thumbUrl = burst.frameThumbs?.[fIdx] || src;
                                            const delta = burst.frameDeltas?.[fIdx] ?? fIdx * 0.8;

                                            let ariaLabel = `Frame ${fIdx + 1}, elapsed time +${delta.toFixed(2)} seconds.`;
                                            if (isSelected) {
                                                ariaLabel += ` Assigned to ${slotNames[assignedSlot]} panel${
                                                    isTargeted ? ' (Active)' : ''
                                                }. Tap to select.`;
                                            } else if (isDisabled) {
                                                ariaLabel += ` Unavailable for ${slotNames[activeStep]} panel (sequential order enforced).`;
                                            } else {
                                                ariaLabel += ` Tap to assign to ${slotNames[activeStep]} panel.`;
                                            }

                                            return (
                                                <button
                                                    key={src}
                                                    type="button"
                                                    className={`story-export-modal__burst-thumb${
                                                        isSelected ? ' story-export-modal__burst-thumb--selected' : ''
                                                    }${isTargeted ? ' story-export-modal__burst-thumb--targeted' : ''}${
                                                        isDisabled ? ' story-export-modal__burst-thumb--disabled' : ''
                                                    }`}
                                                    onClick={() => handleBurstFrameClick(fIdx)}
                                                    disabled={isDisabled}
                                                    title={`Frame ${fIdx + 1}: +${delta.toFixed(2)}s${
                                                        isSelected
                                                            ? ` (${slotNames[assignedSlot]})`
                                                            : isDisabled
                                                              ? ' (Disabled)'
                                                              : ''
                                                    }`}
                                                    aria-label={ariaLabel}
                                                >
                                                    <img src={thumbUrl} alt={`Frame ${fIdx + 1}`} loading="lazy" />
                                                    {isSelected ? (
                                                        <span className="story-export-modal__burst-thumb-slot">
                                                            {slotNames[assignedSlot]}
                                                        </span>
                                                    ) : (
                                                        <span className="story-export-modal__burst-thumb-idx">
                                                            F{fIdx + 1}
                                                        </span>
                                                    )}
                                                    <span className="story-export-modal__burst-thumb-badge">
                                                        +{delta.toFixed(2)}s
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Prepared Crop Presets (N-Way Segmented Toggle) */}
                {activeMode === 'crop' && (
                    <div className="story-export-modal__section">
                        <div
                            className="portfolio__segmented-toggle story-export-modal__presets-grid"
                            role="group"
                            aria-label="Framing presets"
                        >
                            {presets
                                .filter((p) => p.mode === 'crop')
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
                                            aria-label={`Framing preset: ${preset.label}`}
                                        >
                                            <span>{preset.label}</span>
                                        </button>
                                    );
                                })}
                        </div>

                        {/* Zoom Level Control */}
                        <div className="story-export-modal__zoom-control">
                            <div className="story-export-modal__zoom-header">
                                <span className="story-export-modal__sublabel">Crop Zoom</span>
                                <span className="story-export-modal__zoom-value">{activeCrop.zoom.toFixed(2)}x</span>
                            </div>
                            <input
                                type="range"
                                min="1.0"
                                max="3.0"
                                step="0.05"
                                value={activeCrop.zoom}
                                onChange={(e) => {
                                    let newZoom = parseFloat(e.target.value);
                                    const snapPoints = [1.0, 1.5, 2.0, 2.5, 3.0];
                                    for (const sp of snapPoints) {
                                        if (Math.abs(newZoom - sp) <= 0.08) {
                                            newZoom = sp;
                                            break;
                                        }
                                    }
                                    const updated = calculateNormalizedCrop(
                                        naturalDimensions.width,
                                        naturalDimensions.height,
                                        activeCrop.centerX,
                                        activeCrop.centerY,
                                        newZoom
                                    );
                                    onCropChange(updated);
                                }}
                                className="story-export-modal__slider"
                                aria-label="Crop Zoom Level"
                            />
                            <div className="story-export-modal__zoom-ticks" role="group" aria-label="Zoom snap points">
                                {[1.0, 1.5, 2.0, 2.5, 3.0].map((pt) => {
                                    const isActive = Math.abs(activeCrop.zoom - pt) < 0.04;
                                    const fraction = (pt - 1.0) / (3.0 - 1.0);
                                    return (
                                        <button
                                            key={pt}
                                            type="button"
                                            className={`story-export-modal__zoom-tick ${
                                                isActive ? 'story-export-modal__zoom-tick--active' : ''
                                            }`}
                                            style={{
                                                left: `calc(9px + ${fraction} * (100% - 18px))`,
                                            }}
                                            onClick={() => {
                                                const updated = calculateNormalizedCrop(
                                                    naturalDimensions.width,
                                                    naturalDimensions.height,
                                                    activeCrop.centerX,
                                                    activeCrop.centerY,
                                                    pt
                                                );
                                                onCropChange(updated);
                                            }}
                                            aria-label={`Snap zoom to ${pt.toFixed(1)}x`}
                                        >
                                            <span className="story-export-modal__zoom-tick-mark" />
                                            <span className="story-export-modal__zoom-tick-label">
                                                {pt.toFixed(1)}x
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Padded Mode Settings */}
                {activeMode === 'padded' && (
                    <div className="story-export-modal__section">
                        <div className="story-export-modal__padded-settings">
                            <div className="story-export-modal__toggle-row">
                                <span>Background</span>
                                <div className="portfolio__segmented-toggle story-export-modal__pill-group">
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
                                    >
                                        Frosted
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
                                    >
                                        Solid
                                    </button>
                                </div>
                            </div>

                            <div className="story-export-modal__custom-color-row">
                                <div className="story-export-modal__quick-swatches">
                                    {['#0a0a14', '#1e293b', '#2c1810', '#ffffff', '#f59e0b', '#e60000'].map((color) => {
                                        const currentColor = (paddedConfig.customColor || '#0a0a14').toLowerCase();
                                        const isSelected = currentColor === color.toLowerCase();
                                        return (
                                            <button
                                                key={color}
                                                type="button"
                                                className={`story-export-modal__quick-swatch ${
                                                    isSelected ? 'is-active' : ''
                                                }`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => {
                                                    setPaddedConfig((prev) => ({
                                                        ...prev,
                                                        customColor: color,
                                                    }));
                                                    setIsDownloaded(false);
                                                }}
                                                title={color}
                                                aria-label={`Select background color ${color}`}
                                            />
                                        );
                                    })}
                                </div>
                                <label
                                    className="story-export-modal__color-picker"
                                    title={
                                        paddedConfig.style === 'solid' || paddedConfig.style === 'custom'
                                            ? 'Choose solid background color'
                                            : 'Choose frosted tint color'
                                    }
                                >
                                    <span
                                        className="story-export-modal__color-swatch"
                                        style={{
                                            backgroundColor: paddedConfig.customColor || '#0a0a14',
                                        }}
                                    />
                                    <input
                                        type="color"
                                        value={paddedConfig.customColor || '#0a0a14'}
                                        onChange={(e) => {
                                            setPaddedConfig((prev) => ({
                                                ...prev,
                                                customColor: e.target.value,
                                            }));
                                            setIsDownloaded(false);
                                        }}
                                        className="story-export-modal__color-input"
                                        aria-label={
                                            paddedConfig.style === 'solid' || paddedConfig.style === 'custom'
                                                ? 'Solid background color'
                                                : 'Frosted tint color'
                                        }
                                    />
                                </label>
                                <span className="story-export-modal__hex-code">
                                    {(paddedConfig.customColor || '#0a0a14').toUpperCase()}
                                </span>
                            </div>

                            <div className="story-export-modal__toggle-row">
                                <span>Position</span>
                                <div className="portfolio__segmented-toggle story-export-modal__pill-group">
                                    <button
                                        type="button"
                                        className={`story-export-modal__pill ${
                                            paddedConfig.position === 'center'
                                                ? 'active story-export-modal__pill--active'
                                                : ''
                                        }`}
                                        onClick={() => {
                                            setPaddedConfig((prev) => ({
                                                ...prev,
                                                position: 'center',
                                            }));
                                            setIsDownloaded(false);
                                        }}
                                    >
                                        Centered
                                    </button>
                                    <button
                                        type="button"
                                        className={`story-export-modal__pill ${
                                            paddedConfig.position === 'elevated'
                                                ? 'active story-export-modal__pill--active'
                                                : ''
                                        }`}
                                        onClick={() => {
                                            setPaddedConfig((prev) => ({
                                                ...prev,
                                                position: 'elevated',
                                            }));
                                            setIsDownloaded(false);
                                        }}
                                    >
                                        Elevated
                                    </button>
                                </div>
                            </div>

                            <div className="story-export-modal__zoom-header">
                                <span className="story-export-modal__sublabel">Photo Scale</span>
                                <span className="story-export-modal__zoom-value">
                                    {Math.round(paddedConfig.cardScale * 100)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0.80"
                                max="1"
                                step="0.02"
                                value={paddedConfig.cardScale}
                                onChange={(e) => {
                                    const scale = parseFloat(e.target.value);
                                    setPaddedConfig((prev) => ({ ...prev, cardScale: scale }));
                                    setIsDownloaded(false);
                                }}
                                className="story-export-modal__slider"
                                aria-label="Photo Card Scale"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
