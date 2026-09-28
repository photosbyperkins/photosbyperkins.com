import React from 'react';
import type {
    StoryFrameCategory,
    StoryFrameColorChoice,
    StoryFrameContext,
    StoryFrameDefinition,
    StoryFrameId,
} from '../storyFrames/types';
import { STORY_FRAME_CATEGORIES } from '../storyFrames/types';
import { STORY_FRAMES_MAP } from '../storyFrames/frameDefinitions';

interface StoryFramesTabProps {
    activeFrameId: StoryFrameId;
    setActiveFrameId: (id: StoryFrameId) => void;
    selectedFrameCategory: StoryFrameCategory | 'all';
    setSelectedFrameCategory: (cat: StoryFrameCategory | 'all') => void;
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
                </div>

                {/* Category Filter Pills Bar */}
                <div className="story-export-modal__category-bar" role="tablist" aria-label="Frame categories">
                    {STORY_FRAME_CATEGORIES.map((cat) => {
                        const isCatActive = selectedFrameCategory === cat.id;
                        const count = categoryCounts[cat.id] ?? 0;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                role="tab"
                                aria-selected={isCatActive}
                                className={`story-export-modal__category-pill ${
                                    isCatActive ? 'story-export-modal__category-pill--active' : ''
                                }`}
                                onClick={() => setSelectedFrameCategory(cat.id)}
                                title={cat.vibe}
                            >
                                <span>{cat.label}</span>
                                <span className="story-export-modal__category-count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="story-export-modal__frames-grid">
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

                {/* Minimal Color / Tint Override Bar (Shown when a frame is active) */}
                {activeFrameId !== 'none' && (
                    <div className="story-export-modal__frame-tint-row">
                        <div className="story-export-modal__tint-header">
                            <span className="story-export-modal__sublabel">Frame Tint</span>
                        </div>
                        <div className="portfolio__segmented-toggle story-export-modal__pill-group">
                            {(
                                [
                                    { id: 'signature', label: 'Default' },
                                    { id: 'white', label: 'White' },
                                    { id: 'gold', label: 'Gold' },
                                    { id: 'red', label: 'Red' },
                                    { id: 'custom', label: 'Custom' },
                                ] as const
                            ).map((choice) => {
                                const isSelected = frameColorChoice === choice.id;
                                return (
                                    <button
                                        key={choice.id}
                                        type="button"
                                        className={`story-export-modal__pill ${
                                            isSelected ? 'active story-export-modal__pill--active' : ''
                                        }`}
                                        onClick={() => {
                                            setFrameColorChoice(choice.id);
                                            setIsDownloaded(false);
                                        }}
                                    >
                                        {choice.label}
                                    </button>
                                );
                            })}
                        </div>

                        {frameColorChoice === 'custom' && (
                            <div className="story-export-modal__custom-color-row">
                                <div className="story-export-modal__quick-swatches">
                                    {['#ffffff', '#fbbf24', '#06b6d4', '#c084fc'].map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`story-export-modal__quick-swatch ${
                                                frameCustomColor.toLowerCase() === color.toLowerCase()
                                                    ? 'is-active'
                                                    : ''
                                            }`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => {
                                                setFrameCustomColor(color);
                                                setIsDownloaded(false);
                                            }}
                                            title={color}
                                            aria-label={`Select frame tint color ${color}`}
                                        />
                                    ))}
                                </div>
                                <label
                                    className="story-export-modal__color-picker"
                                    title="Choose custom frame tint color"
                                >
                                    <span
                                        className="story-export-modal__color-swatch"
                                        style={{
                                            backgroundColor: frameCustomColor || '#ffffff',
                                        }}
                                    />
                                    <input
                                        type="color"
                                        value={frameCustomColor || '#ffffff'}
                                        onChange={(e) => {
                                            setFrameCustomColor(e.target.value);
                                            setIsDownloaded(false);
                                        }}
                                        className="story-export-modal__color-input"
                                        aria-label="Custom frame tint color"
                                    />
                                </label>
                                <span className="story-export-modal__hex-code">
                                    {(frameCustomColor || '#ffffff').toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
