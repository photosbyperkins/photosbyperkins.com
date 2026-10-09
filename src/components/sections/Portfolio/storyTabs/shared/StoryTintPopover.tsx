import React from 'react';
import type { StoryFrameColorChoice } from '../../storyFrames/types';
import { StoryColorPopover, type StoryColorPreset } from './StoryColorPopover';

type TintPreset = StoryColorPreset & {
    id: 'signature' | 'white' | 'gold' | 'red' | 'cyan';
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
    const activePreset = TINT_PRESETS.find((p) => matchesPreset(p, frameColorChoice, frameCustomColor));
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

    const selectPreset = (preset: StoryColorPreset) => {
        const tint = preset as TintPreset;
        if (tint.id === 'signature') {
            setFrameColorChoice('signature');
        } else if (tint.id === 'cyan') {
            setFrameColorChoice('custom');
            setFrameCustomColor(tint.color!);
        } else {
            setFrameColorChoice(tint.id);
            setFrameCustomColor(tint.color!);
        }
        setIsDownloaded(false);
    };

    return (
        <StoryColorPopover
            popoverId="story-tint-popover"
            triggerText="Tint"
            ariaNoun="Frame tint"
            customAriaLabel="Custom frame tint color"
            presets={TINT_PRESETS}
            activePresetId={activePreset?.id ?? null}
            currentColor={pickerValue}
            onSelectPreset={selectPreset}
            onCustomColor={(color) => {
                setFrameColorChoice('custom');
                setFrameCustomColor(color);
                setIsDownloaded(false);
            }}
        />
    );
};

export default StoryTintPopover;
