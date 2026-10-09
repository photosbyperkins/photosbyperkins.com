import React, { useEffect, useRef, useState } from 'react';
import type { StoryFrameColorChoice } from '../../storyFrames/types';
import { triggerHaptic } from '../../../../../utils/haptics';
import { STORY_POPOVER_ATTR } from '../../storyStudio/panelLayout';

type TintPreset = {
    id: 'signature' | 'white' | 'gold' | 'red' | 'cyan';
    label: string;
    color?: string;
    /** Custom colours that count as this preset (legacy gold shade). */
    aliases?: string[];
};

const TINT_PRESETS: TintPreset[] = [
    { id: 'signature', label: 'Default' },
    { id: 'white', label: 'White', color: '#ffffff' },
    { id: 'gold', label: 'Gold', color: '#f59e0b', aliases: ['#fbbf24'] },
    { id: 'red', label: 'Red', color: '#e60000' },
    { id: 'cyan', label: 'Cyan', color: '#06b6d4' },
];

const matchesPreset = (preset: TintPreset, choice: StoryFrameColorChoice, custom: string) => {
    const customLower = (custom || '').toLowerCase();
    const isCustomMatch = choice === 'custom' && [preset.color, ...(preset.aliases ?? [])].includes(customLower);
    if (preset.id === 'signature') return choice === 'signature';
    if (preset.id === 'cyan') return isCustomMatch; // cyan is stored as a custom colour
    return choice === preset.id || isCustomMatch;
};

interface StoryTintPopoverProps {
    frameColorChoice: StoryFrameColorChoice;
    setFrameColorChoice: (choice: StoryFrameColorChoice) => void;
    frameCustomColor: string;
    setFrameCustomColor: (color: string) => void;
    setIsDownloaded: (val: boolean) => void;
}

/** `[Tint ●]` button showing the current frame colour; opens a small popover of presets + a custom picker. */
export const StoryTintPopover: React.FC<StoryTintPopoverProps> = ({
    frameColorChoice,
    setFrameColorChoice,
    frameCustomColor,
    setFrameCustomColor,
    setIsDownloaded,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handlePointerDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        // Capture phase so Escape closes only the popover (not the sheet or the modal).
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            e.stopImmediatePropagation();
            setIsOpen(false);
            triggerRef.current?.focus({ preventScroll: true });
        };
        document.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isOpen]);

    const isAnyPresetActive = TINT_PRESETS.some((p) => matchesPreset(p, frameColorChoice, frameCustomColor));
    const isCustomPickerActive = frameColorChoice === 'custom' && !isAnyPresetActive;
    const pickerValue =
        frameColorChoice === 'white'
            ? '#ffffff'
            : frameColorChoice === 'gold'
              ? '#f59e0b'
              : frameColorChoice === 'red'
                ? '#e60000'
                : frameColorChoice === 'custom' && frameCustomColor
                  ? frameCustomColor
                  : frameColorChoice === 'signature'
                    ? frameCustomColor || '#ffffff'
                    : '#06b6d4';

    const selectPreset = (preset: TintPreset) => {
        triggerHaptic('tick');
        if (preset.id === 'signature') {
            setFrameColorChoice('signature');
        } else if (preset.id === 'cyan') {
            setFrameColorChoice('custom');
            setFrameCustomColor(preset.color!);
        } else {
            setFrameColorChoice(preset.id);
            setFrameCustomColor(preset.color!);
        }
        setIsDownloaded(false);
    };

    const isSignature = frameColorChoice === 'signature';
    const currentLabel = isSignature
        ? 'Default'
        : (TINT_PRESETS.find((p) => matchesPreset(p, frameColorChoice, frameCustomColor))?.label ?? 'Custom');
    // Name readout in the popover: the hovered / focused swatch, else the current tint
    const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
    const nameReadout = hoveredLabel ?? currentLabel;
    const swatchHoverProps = (label: string) => ({
        onPointerEnter: () => setHoveredLabel(label),
        onPointerLeave: () => setHoveredLabel(null),
        onFocus: () => setHoveredLabel(label),
        onBlur: () => setHoveredLabel(null),
    });

    return (
        <div className="story-tint" ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                className={`story-pill-btn story-tint__trigger ${isOpen ? 'is-open' : ''}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-controls="story-tint-popover"
                aria-label={`Frame tint: ${currentLabel}. Change tint`}
                onClick={() => {
                    triggerHaptic('tick');
                    setIsOpen((v) => !v);
                }}
            >
                <span
                    className={`story-tint__dot ${isSignature ? 'story-tint__dot--default' : ''}`}
                    style={isSignature ? undefined : { backgroundColor: pickerValue }}
                    aria-hidden="true"
                />
                <span>Tint</span>
                <span className="story-tint__current" aria-hidden="true">
                    {currentLabel}
                </span>
            </button>

            {isOpen && (
                <div
                    id="story-tint-popover"
                    className="story-tint__popover"
                    role="group"
                    aria-label="Frame tint"
                    onPointerLeave={() => setHoveredLabel(null)}
                    {...{ [STORY_POPOVER_ATTR]: '' }}
                >
                    <div className="story-tint__swatches">
                        {TINT_PRESETS.map((preset) => {
                            const isSelected = matchesPreset(preset, frameColorChoice, frameCustomColor);
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    className={`story-tint__swatch ${
                                        preset.id === 'signature' ? 'story-tint__swatch--default' : ''
                                    } ${isSelected ? 'is-active' : ''}`}
                                    style={preset.color ? { backgroundColor: preset.color } : undefined}
                                    onClick={() => selectPreset(preset)}
                                    title={preset.label}
                                    aria-label={`Frame tint: ${preset.label}`}
                                    aria-pressed={isSelected}
                                    {...swatchHoverProps(preset.label)}
                                />
                            );
                        })}
                        <span className="story-tint__divider" aria-hidden="true" />
                        <label
                            className={`story-tint__custom ${isCustomPickerActive ? 'is-active' : ''}`}
                            title="Custom colour"
                            {...swatchHoverProps('Custom…')}
                        >
                            <span
                                className={`story-tint__custom-swatch ${
                                    isCustomPickerActive ? '' : 'story-tint__custom-swatch--wheel'
                                }`}
                                style={isCustomPickerActive ? { backgroundColor: pickerValue } : undefined}
                            />
                            {/* Pencil: this swatch opens a colour picker */}
                            <svg className="story-tint__custom-icon" viewBox="0 0 16 16" aria-hidden="true">
                                <path
                                    d="M10.8 2.2l3 3-8.2 8.2H2.6v-3z"
                                    fill="#fff"
                                    stroke="#1a1a22"
                                    strokeWidth="1.2"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <input
                                type="color"
                                value={pickerValue}
                                onChange={(e) => {
                                    setFrameColorChoice('custom');
                                    setFrameCustomColor(e.target.value);
                                    setIsDownloaded(false);
                                }}
                                className="story-tint__custom-input"
                                aria-label="Custom frame tint color"
                            />
                        </label>
                    </div>
                    <span className="story-tint__name" aria-live="polite">
                        {nameReadout}
                    </span>
                </div>
            )}
        </div>
    );
};

export default StoryTintPopover;
