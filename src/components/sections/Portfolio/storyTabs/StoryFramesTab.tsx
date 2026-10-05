import React from 'react';
import type {
    StoryFrameColorChoice,
    StoryFrameContext,
    StoryFrameDefinition,
    StoryFrameFilterCategory,
    StoryFrameId,
} from '../storyFrames/types';
import { STORY_FRAME_CATEGORIES } from '../storyFrames/types';
import { STORY_FRAMES_MAP } from '../storyFrames/frameDefinitions';
import { triggerHaptic } from '../../../../utils/haptics';
import { StoryCategoryBar } from './StoryCategoryBar';

interface StoryFramesTabProps {
    activeFrameId: StoryFrameId;
    setActiveFrameId: (id: StoryFrameId) => void;
    selectedFrameCategory: StoryFrameFilterCategory;
    setSelectedFrameCategory: (cat: StoryFrameFilterCategory) => void;
    categoryCounts: Record<string, number>;
    displayedFrames: StoryFrameDefinition[];
    frameColorChoice: StoryFrameColorChoice;
    setFrameColorChoice: (choice: StoryFrameColorChoice) => void;
    frameCustomColor: string;
    setFrameCustomColor: (color: string) => void;
    effectiveFrameColor?: string;
    frameContext?: StoryFrameContext;
    setIsDownloaded: (val: boolean) => void;
}

export const StoryFramesTab: React.FC<StoryFramesTabProps> = ({
    activeFrameId,
    setActiveFrameId,
    selectedFrameCategory,
    setSelectedFrameCategory,
    categoryCounts,
    displayedFrames,
    frameColorChoice,
    setFrameColorChoice,
    frameCustomColor,
    setFrameCustomColor,
    effectiveFrameColor,
    frameContext,
    setIsDownloaded,
}) => {
    return (
        <div className="story-export-modal__tab-content story-export-modal__tab-content--frames">
            <div className="story-export-modal__section story-export-modal__section--frames">
                <div className="story-export-modal__accordion-header story-export-modal__frames-header">
                    <div className="story-export-modal__accordion-title">
                        <span className="story-export-modal__section-heading">FRAME</span>
                        <span className="story-export-modal__frame-current-badge">
                            {STORY_FRAMES_MAP[activeFrameId]?.label || 'None'}
                        </span>
                    </div>

                    {/* Frame Tint Color Picker & Quick Swatches (Right-Aligned in Header) */}
                    {activeFrameId !== 'none' && (
                        <div className="story-export-modal__frames-header-tint">
                            <div className="story-export-modal__quick-swatches">
                                {[
                                    { id: 'signature', label: 'Default', isDefault: true, color: undefined },
                                    { id: 'white', label: 'White', isDefault: false, color: '#ffffff' },
                                    { id: 'gold', label: 'Gold', isDefault: false, color: '#f59e0b' },
                                    { id: 'red', label: 'Red', isDefault: false, color: '#e60000' },
                                    { id: 'cyan', label: 'Cyan', isDefault: false, color: '#06b6d4' },
                                ].map((preset) => {
                                    const isSelected =
                                        preset.id === 'signature'
                                            ? frameColorChoice === 'signature'
                                            : preset.id === 'white'
                                              ? frameColorChoice === 'white' ||
                                                (frameColorChoice === 'custom' &&
                                                    frameCustomColor.toLowerCase() === '#ffffff')
                                              : preset.id === 'gold'
                                                ? frameColorChoice === 'gold' ||
                                                  (frameColorChoice === 'custom' &&
                                                      (frameCustomColor.toLowerCase() === '#f59e0b' ||
                                                          frameCustomColor.toLowerCase() === '#fbbf24'))
                                                : preset.id === 'red'
                                                  ? frameColorChoice === 'red' ||
                                                    (frameColorChoice === 'custom' &&
                                                        frameCustomColor.toLowerCase() === '#e60000')
                                                  : frameColorChoice === 'custom' &&
                                                    frameCustomColor.toLowerCase() === '#06b6d4';

                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            className={`story-export-modal__quick-swatch ${
                                                preset.isDefault ? 'story-export-modal__quick-swatch--default' : ''
                                            } ${isSelected ? 'is-active' : ''}`}
                                            style={preset.color ? { backgroundColor: preset.color } : undefined}
                                            onClick={() => {
                                                triggerHaptic('tick');
                                                if (preset.id === 'signature') {
                                                    setFrameColorChoice('signature');
                                                } else if (preset.id === 'white') {
                                                    setFrameColorChoice('white');
                                                    setFrameCustomColor('#ffffff');
                                                } else if (preset.id === 'gold') {
                                                    setFrameColorChoice('gold');
                                                    setFrameCustomColor('#f59e0b');
                                                } else if (preset.id === 'red') {
                                                    setFrameColorChoice('red');
                                                    setFrameCustomColor('#e60000');
                                                } else {
                                                    setFrameColorChoice('custom');
                                                    setFrameCustomColor('#06b6d4');
                                                }
                                                setIsDownloaded(false);
                                            }}
                                            title={preset.label}
                                            aria-label={`Frame tint: ${preset.label}`}
                                        />
                                    );
                                })}
                            </div>
                            {(() => {
                                const isAnyPresetActive =
                                    frameColorChoice === 'signature' ||
                                    frameColorChoice === 'white' ||
                                    frameColorChoice === 'gold' ||
                                    frameColorChoice === 'red' ||
                                    (frameColorChoice === 'custom' &&
                                        ['#ffffff', '#f59e0b', '#fbbf24', '#e60000', '#06b6d4'].includes(
                                            (frameCustomColor || '').toLowerCase()
                                        ));
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
                                              : '#06b6d4';

                                return (
                                    <label
                                        className={`story-export-modal__color-picker ${
                                            isCustomPickerActive ? 'is-active' : ''
                                        }`}
                                        title="Choose custom frame tint color"
                                    >
                                        <span
                                            className="story-export-modal__color-swatch"
                                            style={{
                                                backgroundColor:
                                                    frameColorChoice === 'signature'
                                                        ? frameCustomColor || '#ffffff'
                                                        : pickerValue,
                                            }}
                                        />
                                        <input
                                            type="color"
                                            value={
                                                frameColorChoice === 'signature'
                                                    ? frameCustomColor || '#ffffff'
                                                    : pickerValue
                                            }
                                            onChange={(e) => {
                                                setFrameColorChoice('custom');
                                                setFrameCustomColor(e.target.value);
                                                setIsDownloaded(false);
                                            }}
                                            className="story-export-modal__color-input"
                                            aria-label="Custom frame tint color"
                                        />
                                    </label>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Category Filter Pills: scope row (All / Recent) above the theme categories */}
                <StoryCategoryBar<StoryFrameFilterCategory>
                    categories={STORY_FRAME_CATEGORIES}
                    selectedCategory={selectedFrameCategory}
                    onSelectCategory={setSelectedFrameCategory}
                    categoryCounts={categoryCounts}
                    ariaLabel="Frame categories"
                    controlsId="story-export-frames-grid"
                />

                <div id="story-export-frames-grid" className="story-export-modal__frames-grid">
                    {displayedFrames.map((frame) => {
                        const isSelected = activeFrameId === frame.id;
                        return (
                            <button
                                key={frame.id}
                                type="button"
                                className={`story-export-modal__frame-card ${
                                    isSelected ? 'story-export-modal__frame-card--active' : ''
                                }`}
                                onClick={() => {
                                    triggerHaptic('tap');
                                    setActiveFrameId(frame.id);
                                    setIsDownloaded(false);
                                }}
                                title={frame.vibe}
                            >
                                <div className="story-export-modal__frame-thumb">
                                    {frame.id === 'none' ? (
                                        <div className="story-export-modal__frame-none-icon">⊘</div>
                                    ) : (
                                        <svg
                                            viewBox="0 0 1080 1920"
                                            className="story-export-modal__frame-thumb-svg"
                                            preserveAspectRatio="none"
                                        >
                                            {frame.renderSvg(effectiveFrameColor, frameContext)}
                                        </svg>
                                    )}
                                </div>
                                <span className="story-export-modal__frame-name">{frame.label}</span>
                            </button>
                        );
                    })}
                </div>

                {selectedFrameCategory === 'recent' && (categoryCounts['recent'] ?? 0) === 0 && (
                    <div className="story-export-modal__empty-recent-hint">
                        Frames you download or export will appear here for quick access.
                    </div>
                )}
            </div>
        </div>
    );
};
