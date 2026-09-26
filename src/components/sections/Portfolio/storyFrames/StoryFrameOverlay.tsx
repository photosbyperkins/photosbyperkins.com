import React from 'react';
import type { StoryFrameId, StoryFrameContext } from './types';
import { STORY_FRAMES_MAP } from './frameDefinitions';

interface StoryFrameOverlayProps {
    frameId: StoryFrameId;
    colorOverride?: string;
    context?: StoryFrameContext;
    className?: string;
}

export const StoryFrameOverlay: React.FC<StoryFrameOverlayProps> = ({ frameId, colorOverride, context, className }) => {
    if (!frameId || frameId === 'none') {
        return null;
    }

    const frameDef = STORY_FRAMES_MAP[frameId];
    if (!frameDef) {
        return null;
    }

    return (
        <svg
            viewBox="0 0 1080 1920"
            className={`story-frame-overlay ${className || ''}`}
            aria-hidden="true"
            preserveAspectRatio="none"
        >
            {frameDef.renderSvg(colorOverride, context)}
        </svg>
    );
};

export default StoryFrameOverlay;
