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
    | 'through-the-lens'
    | 'ref-zebra'
    | 'bout-day'
    | 'derby-punk'
    | 'sonic-boom'
    | 'speed-demons'
    | 'instant-film'
    | 'vhs-glitch'
    | 'risograph'
    | 'broadcast-live'
    | 'night-vision'
    | 'roller-disco'
    | 'mystic-tarot';

export type StoryFrameCategory = 'derby' | 'action' | 'retro' | 'tech' | 'cosmic';

export interface StoryFrameCategoryMeta {
    id: StoryFrameCategory | 'all';
    label: string;
    vibe: string;
}

export const STORY_FRAME_CATEGORIES: StoryFrameCategoryMeta[] = [
    { id: 'all', label: 'All', vibe: 'All frames' },
    { id: 'derby', label: 'Derby', vibe: 'Skates, California heritage & track culture' },
    { id: 'action', label: 'Action', vibe: 'Impact, lightning, flames & kinetics' },
    { id: 'retro', label: 'Retro', vibe: 'Analog film, VHS, riso & 80s nostalgia' },
    { id: 'tech', label: 'Tech', vibe: 'Viewfinders, live EXIF & broadcast telemetry' },
    { id: 'cosmic', label: 'Cosmic', vibe: 'Celestial, disco, stars & fantasy' },
];

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
    category?: StoryFrameCategory;
    signaturePalette: string[];
    renderSvg: (colorOverride?: string, context?: StoryFrameContext) => React.ReactNode;
    getSvgString: (colorOverride?: string, context?: StoryFrameContext) => string;
}
