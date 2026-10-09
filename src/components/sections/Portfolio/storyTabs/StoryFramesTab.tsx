import React, { memo, useMemo } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import type {
    StoryFrameColorChoice,
    StoryFrameContext,
    StoryFrameDefinition,
    StoryFrameId,
} from '../storyFrames/types';
import { STORY_FRAME_CATEGORIES } from '../storyFrames/types';
import { frameContextKey } from '../storyFrames/frameContextKey';
import { triggerHaptic } from '../../../../utils/haptics';
import { SPRING_SNAPPY } from '../../../../utils/motion';
import { StoryOptionsRow } from './shared/StoryOptionsRow';
import { StoryThumb, StoryThumbBrowser } from './shared/StoryThumbBrowser';
import { StoryTintPopover } from './shared/StoryTintPopover';
import { buildThumbSections } from './shared/thumbSections';

interface StoryFramesTabProps {
    activeFrameId: StoryFrameId;
    setActiveFrameId: (id: StoryFrameId) => void;
    /** Every frame available for this photo (including "none"). */
    frames: StoryFrameDefinition[];
    /** Most recently exported frames, newest first. */
    recentFrameIds?: readonly StoryFrameId[];
    frameColorChoice: StoryFrameColorChoice;
    setFrameColorChoice: (choice: StoryFrameColorChoice) => void;
    frameCustomColor: string;
    setFrameCustomColor: (color: string) => void;
    effectiveFrameColor?: string;
    frameContext?: StoryFrameContext;
    setIsDownloaded: (val: boolean) => void;
    isFrameAnimated: boolean;
    setIsFrameAnimated: (val: boolean) => void;
    videoSupported: boolean | null;
    /** Current photo thumbnail, shown under each frame thumb. */
    previewImageUrl?: string;
    /** Desktop hover / keyboard focus preview of a frame on the main preview (`null` to stop previewing). */
    onPreviewFrame?: (id: StoryFrameId | null) => void;
}

const ANIMATE_HINT_ID = 'story-frames-animate-hint';
const FRAME_THEME_CATEGORIES = STORY_FRAME_CATEGORIES.filter((c) => c.group === 'themes').map((c) => ({
    id: c.id,
    label: c.label,
    description: c.vibe,
}));

interface FrameThumbArtProps {
    frame: StoryFrameDefinition;
    color?: string;
    context?: StoryFrameContext;
}

/**
 * Frame artwork for a thumb. Each one is a full inline SVG, so it only re-renders when the frame, tint or
 * the artwork-relevant context changes (not on every hover preview / unrelated studio update).
 */
const FrameThumbArt = memo(
    ({ frame, color, context }: FrameThumbArtProps) => (
        <svg viewBox="0 0 1080 1920" className="story-thumb__overlay" preserveAspectRatio="none">
            {frame.renderSvg(color, context)}
        </svg>
    ),
    (a, b) =>
        a.frame === b.frame && a.color === b.color && frameContextKey(a.context) === frameContextKey(b.context)
);
FrameThumbArt.displayName = 'FrameThumbArt';

export const StoryFramesTab: React.FC<StoryFramesTabProps> = ({
    activeFrameId,
    setActiveFrameId,
    frames,
    recentFrameIds,
    frameColorChoice,
    setFrameColorChoice,
    frameCustomColor,
    setFrameCustomColor,
    effectiveFrameColor,
    frameContext,
    setIsDownloaded,
    isFrameAnimated,
    setIsFrameAnimated,
    videoSupported,
    previewImageUrl,
    onPreviewFrame,
}) => {
    const animateDisabledReason =
        activeFrameId === 'none'
            ? 'Pick a frame to animate'
            : videoSupported === false
              ? 'Video export isn’t supported in this browser'
              : null;
    const isAnimateOn = isFrameAnimated && !animateDisabledReason;

    const sections = useMemo(
        () =>
            buildThumbSections({
                items: frames,
                getId: (f) => f.id,
                getCategory: (f) => f.category,
                categories: FRAME_THEME_CATEGORIES,
                recentIds: recentFrameIds,
            }),
        [frames, recentFrameIds]
    );

    const setAnimated = (on: boolean) => {
        if (on === isFrameAnimated) return;
        triggerHaptic('tick');
        setIsFrameAnimated(on);
    };

    // Segmented Off / On, matching the Show / Hide toggles on the Badges tab
    const animateToggle = (
        <div className="story-animate-toggle">
            <span className="story-animate-toggle__label" id="story-frames-animate-label">
                Animate
            </span>
            <LayoutGroup id="storyAnimateToggle">
                <div
                    className={`portfolio__segmented-toggle story-export-modal__scores-toggle story-animate-toggle__control ${
                        animateDisabledReason ? 'is-disabled' : ''
                    }`}
                    role="group"
                    aria-labelledby="story-frames-animate-label"
                    aria-describedby={animateDisabledReason ? ANIMATE_HINT_ID : undefined}
                    title={isAnimateOn ? 'Downloads as a video' : undefined}
                >
                    {[false, true].map((on) => {
                        const isActive = isAnimateOn === on;
                        return (
                            <button
                                key={on ? 'on' : 'off'}
                                type="button"
                                className={`story-export-modal__scores-btn ${
                                    isActive ? 'active story-export-modal__scores-btn--active' : ''
                                }`}
                                aria-pressed={isActive}
                                disabled={Boolean(animateDisabledReason)}
                                onClick={() => setAnimated(on)}
                            >
                                {isActive && (
                                    <motion.span
                                        className="portfolio__segment-pill"
                                        layoutId="storyAnimateTogglePill"
                                        transition={SPRING_SNAPPY}
                                    />
                                )}
                                <span>{on ? 'On' : 'Off'}</span>
                            </button>
                        );
                    })}
                </div>
            </LayoutGroup>
        </div>
    );

    return (
        <div className="story-export-modal__tab-content story-tab story-tab--browser story-tab--frames">
            <StoryOptionsRow
                start={
                    <>
                        {activeFrameId !== 'none' && (
                            <StoryTintPopover
                                frameColorChoice={frameColorChoice}
                                setFrameColorChoice={setFrameColorChoice}
                                frameCustomColor={frameCustomColor}
                                setFrameCustomColor={setFrameCustomColor}
                                setIsDownloaded={setIsDownloaded}
                            />
                        )}
                        {animateDisabledReason && (
                            <span id={ANIMATE_HINT_ID} className="story-options-row__hint">
                                {animateDisabledReason}
                            </span>
                        )}
                    </>
                }
                end={animateToggle}
            />

            <StoryThumbBrowser
                id="story-export-frames-grid"
                ariaLabel="Frames"
                sections={sections}
                getKey={(frame) => frame.id}
                selectedKey={activeFrameId}
                onPreview={onPreviewFrame ? (key) => onPreviewFrame(key as StoryFrameId | null) : undefined}
                renderThumb={(frame, isSelected) => (
                    <StoryThumb
                        thumbKey={frame.id}
                        label={frame.label}
                        isSelected={isSelected}
                        title={frame.vibe}
                        className="story-thumb--frame"
                        onSelect={() => {
                            triggerHaptic('tap');
                            setActiveFrameId(frame.id);
                            setIsDownloaded(false);
                        }}
                    >
                        {previewImageUrl && (
                            <img
                                src={previewImageUrl}
                                alt=""
                                className="story-thumb__photo"
                                loading="lazy"
                                decoding="async"
                            />
                        )}
                        {frame.id === 'none' ? (
                            <span className="story-thumb__none" aria-hidden="true">
                                ⊘
                            </span>
                        ) : (
                            <FrameThumbArt frame={frame} color={effectiveFrameColor} context={frameContext} />
                        )}
                    </StoryThumb>
                )}
            />
        </div>
    );
};
