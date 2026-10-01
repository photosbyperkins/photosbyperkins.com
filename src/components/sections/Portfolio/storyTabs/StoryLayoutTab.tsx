import React from 'react';
import type { NormalizedCrop, PaddedStyleOptions, StoryPreset } from '../../../../utils/storyCanvas';
import { calculateNormalizedCrop } from '../../../../utils/storyCanvas';
import type { BurstMetadata } from '../../../../types';
import type { BurstDividerStyle } from '../../../../store/slices/storySlice';

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
    burstDividerStyle?: BurstDividerStyle;
    setBurstDividerStyle?: (style: BurstDividerStyle) => void;
    burstShowTimeStamps?: boolean;
    setBurstShowTimeStamps?: (show: boolean) => void;
    burstSelectedIndices?: [number, number, number];
    setBurstSelectedIndices?: (indices: [number, number, number]) => void;
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
    burstDividerStyle = 'hairline',
    setBurstDividerStyle,
    burstShowTimeStamps = true,
    setBurstShowTimeStamps,
    burstSelectedIndices = [0, 1, 2],
    setBurstSelectedIndices,
}) => {
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
                                <span>BURST</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* 3-Panel Burst Settings */}
                {activeMode === 'burst' && burst && (
                    <div className="story-export-modal__section">
                        <div className="story-export-modal__padded-settings">
                            <div className="story-export-modal__toggle-row">
                                <span>DIVIDER</span>
                                <div className="portfolio__segmented-toggle story-export-modal__pill-group">
                                    <button
                                        type="button"
                                        className={`story-export-modal__pill ${
                                            burstDividerStyle === 'hairline'
                                                ? 'active story-export-modal__pill--active'
                                                : ''
                                        }`}
                                        onClick={() => {
                                            setBurstDividerStyle?.('hairline');
                                            setIsDownloaded(false);
                                        }}
                                    >
                                        Hairline
                                    </button>
                                    <button
                                        type="button"
                                        className={`story-export-modal__pill ${
                                            burstDividerStyle === 'gutter'
                                                ? 'active story-export-modal__pill--active'
                                                : ''
                                        }`}
                                        onClick={() => {
                                            setBurstDividerStyle?.('gutter');
                                            setIsDownloaded(false);
                                        }}
                                    >
                                        Gutter
                                    </button>
                                    <button
                                        type="button"
                                        className={`story-export-modal__pill ${
                                            burstDividerStyle === 'filmstrip'
                                                ? 'active story-export-modal__pill--active'
                                                : ''
                                        }`}
                                        onClick={() => {
                                            setBurstDividerStyle?.('filmstrip');
                                            setIsDownloaded(false);
                                        }}
                                    >
                                        Filmstrip
                                    </button>
                                </div>
                            </div>

                            <div className="story-export-modal__toggle-row" style={{ marginTop: '0.75rem' }}>
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
                                    <div className="story-export-modal__sublabel" style={{ marginBottom: '0.5rem' }}>
                                        Choose 3 Burst Frames ({burst.total} Captured):
                                    </div>
                                    <div
                                        className="story-export-modal__burst-strip"
                                        style={{
                                            display: 'flex',
                                            gap: '0.5rem',
                                            overflowX: 'auto',
                                            paddingBottom: '0.5rem',
                                        }}
                                    >
                                        {burst.frameSources.map((src, fIdx) => {
                                            const isSelected = burstSelectedIndices.includes(fIdx);
                                            const thumbUrl = burst.frameThumbs?.[fIdx] || src;
                                            const delta = burst.frameDeltas?.[fIdx] ?? fIdx * 0.8;
                                            return (
                                                <button
                                                    key={src}
                                                    type="button"
                                                    style={{
                                                        position: 'relative',
                                                        flexShrink: 0,
                                                        width: '76px',
                                                        height: '52px',
                                                        borderRadius: '6px',
                                                        overflow: 'hidden',
                                                        border: isSelected
                                                            ? '2px solid #f59e0b'
                                                            : '1px solid rgba(255, 255, 255, 0.15)',
                                                        boxShadow: isSelected
                                                            ? '0 0 8px rgba(245, 158, 11, 0.5)'
                                                            : 'none',
                                                        opacity: isSelected ? 1 : 0.6,
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        background: '#0a0a14',
                                                    }}
                                                    onClick={() => {
                                                        if (isSelected) return;
                                                        const newIndices = [...burstSelectedIndices];
                                                        newIndices.shift();
                                                        newIndices.push(fIdx);
                                                        newIndices.sort((a, b) => a - b);
                                                        setBurstSelectedIndices?.(
                                                            newIndices as [number, number, number]
                                                        );
                                                        setIsDownloaded(false);
                                                    }}
                                                    title={`Frame ${fIdx + 1}: +${delta.toFixed(2)}s`}
                                                    aria-label={`Frame ${fIdx + 1}, elapsed time +${delta.toFixed(2)} seconds`}
                                                >
                                                    <img
                                                        src={thumbUrl}
                                                        alt={`Frame ${fIdx + 1}`}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                        }}
                                                        loading="lazy"
                                                    />
                                                    <span
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: '2px',
                                                            right: '2px',
                                                            fontSize: '9px',
                                                            fontWeight: 600,
                                                            background: 'rgba(0, 0, 0, 0.75)',
                                                            color: '#fff',
                                                            padding: '1px 3px',
                                                            borderRadius: '3px',
                                                        }}
                                                    >
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
