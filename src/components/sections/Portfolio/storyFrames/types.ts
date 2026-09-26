import React from 'react';
import type { ExifData } from '../../../../types';

export type StoryFrameId =
    | 'none'
    | 'sac-bear'
    | 'derby-quads'
    | 'claw-marks'
    | 'unicorns'
    | 'intergalactic'
    | 'celestial-moon'
    | 'synthwave'
    | 'film-strip'
    | 'cyber-hud'
    | 'golden-sparkle'
    | 'pop-art'
    | 'street-flames'
    | 'electric-lightning'
    | 'through-the-lens';

export type StoryFrameColorChoice = 'signature' | 'white' | 'gold' | 'red' | 'custom';

export interface StoryFrameContext {
    hasAttribution?: boolean;
    hasScoreboard?: boolean;
    layoutMode?: 'crop' | 'padded';
    exif?: ExifData;
}

export interface StoryFrameDefinition {
    id: StoryFrameId;
    label: string;
    vibe: string;
    signaturePalette: string[];
    renderSvg: (colorOverride?: string, context?: StoryFrameContext) => React.ReactNode;
    getSvgString: (colorOverride?: string, context?: StoryFrameContext) => string;
}
