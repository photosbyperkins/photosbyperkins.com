import React, { useEffect, useRef, useState } from 'react';
import { triggerHaptic } from '../../../../../utils/haptics';
import { STORY_POPOVER_ATTR } from '../../storyStudio/panelLayout';

export type StoryColorPreset = {
    id: string;
    label: string;
    /** Swatch colour. Omit for a "default" preset rendered as a signature gradient. */
    color?: string;
};

interface StoryColorPopoverProps {
    /** DOM id of the popover (the trigger's aria-controls). */
    popoverId: string;
    /** Short trigger text, e.g. "Tint" or "Color". */
    triggerText: string;
    /** Accessible noun, e.g. "Frame tint" or "Background color". */
    ariaNoun: string;
    /** Accessible label of the custom colour input. */
    customAriaLabel: string;
    presets: StoryColorPreset[];
    /** Id of the active preset, or null when a custom colour is in use. */
    activePresetId: string | null;
    /** Colour shown in the trigger dot / custom swatch and seeded into the native picker. */
    currentColor: string;
    onSelectPreset: (preset: StoryColorPreset) => void;
    onCustomColor: (color: string) => void;
    /** Anchor the popover to the trigger's right edge (for triggers on the right of a row). */
    align?: 'start' | 'end';
}

/** `[Tint ● Gold]`-style pill that opens a small popover of colour presets + a custom picker. */
export const StoryColorPopover: React.FC<StoryColorPopoverProps> = ({
    popoverId,
    triggerText,
    ariaNoun,
    customAriaLabel,
    presets,
    activePresetId,
    currentColor,
    onSelectPreset,
    onCustomColor,
    align = 'start',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
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
        // Capture phase: the modal shell stops pointerdown propagation, so a bubbling listener would never fire.
        document.addEventListener('pointerdown', handlePointerDown, true);
        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isOpen]);

    const activePreset = activePresetId ? presets.find((p) => p.id === activePresetId) : undefined;
    const isCustomActive = !activePreset;
    const isDefaultDot = Boolean(activePreset && !activePreset.color);
    const currentLabel = activePreset?.label ?? 'Custom';
    // Name readout in the popover: the hovered / focused swatch, else the current colour
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
                aria-controls={popoverId}
                aria-label={`${ariaNoun}: ${currentLabel}. Change ${triggerText.toLowerCase()}`}
                onClick={() => {
                    triggerHaptic('tick');
                    setIsOpen((v) => !v);
                }}
            >
                <span
                    className={`story-tint__dot ${isDefaultDot ? 'story-tint__dot--default' : ''}`}
                    style={isDefaultDot ? undefined : { backgroundColor: currentColor }}
                    aria-hidden="true"
                />
                <span>{triggerText}</span>
                <span className="story-tint__current" aria-hidden="true">
                    {currentLabel}
                </span>
            </button>

            {isOpen && (
                <div
                    id={popoverId}
                    className={`story-tint__popover ${align === 'end' ? 'story-tint__popover--end' : ''}`}
                    role="group"
                    aria-label={ariaNoun}
                    onPointerLeave={() => setHoveredLabel(null)}
                    {...{ [STORY_POPOVER_ATTR]: '' }}
                >
                    <div className="story-tint__swatches">
                        {presets.map((preset) => {
                            const isSelected = preset.id === activePreset?.id;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    className={`story-tint__swatch ${preset.color ? '' : 'story-tint__swatch--default'} ${
                                        isSelected ? 'is-active' : ''
                                    }`}
                                    style={preset.color ? { backgroundColor: preset.color } : undefined}
                                    onClick={() => {
                                        triggerHaptic('tick');
                                        onSelectPreset(preset);
                                    }}
                                    title={preset.label}
                                    aria-label={`${ariaNoun}: ${preset.label}`}
                                    aria-pressed={isSelected}
                                    {...swatchHoverProps(preset.label)}
                                />
                            );
                        })}
                        <span className="story-tint__divider" aria-hidden="true" />
                        <label
                            className={`story-tint__custom ${isCustomActive ? 'is-active' : ''}`}
                            title="Custom colour"
                            {...swatchHoverProps('Custom…')}
                        >
                            <span
                                className={`story-tint__custom-swatch ${
                                    isCustomActive ? '' : 'story-tint__custom-swatch--wheel'
                                }`}
                                style={isCustomActive ? { backgroundColor: currentColor } : undefined}
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
                                value={currentColor}
                                onChange={(e) => onCustomColor(e.target.value)}
                                className="story-tint__custom-input"
                                aria-label={customAriaLabel}
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

export default StoryColorPopover;
