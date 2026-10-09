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
    | 'mystic-tarot'
    | 'hearts'
    | 'rainbows'
    | 'sol'
    | 'ascii-terminal'
    | 'ascii-matrix'
    | 'ascii-bbs'
    | 'ascii-kaomoji'
    | 'ascii-starfield'
    | 'ascii-skate';

export type StoryFrameCategory = 'derby' | 'action' | 'retro' | 'tech' | 'cosmic' | 'ascii';

export type StoryFrameFilterCategory = StoryFrameCategory | 'all' | 'recent';

export interface StoryFrameCategoryMeta {
    id: StoryFrameFilterCategory;
    label: string;
    vibe: string;
    group?: 'scope' | 'themes';
}

export const STORY_FRAME_CATEGORIES: StoryFrameCategoryMeta[] = [
    { id: 'all', label: 'All', vibe: 'All frames', group: 'scope' },
    { id: 'recent', label: 'Recent', vibe: 'Recently downloaded or shared frames', group: 'scope' },
    { id: 'derby', label: 'Derby', vibe: 'Skates, California heritage & track culture', group: 'themes' },
    { id: 'action', label: 'Action', vibe: 'Impact, lightning, flames & kinetics', group: 'themes' },
    { id: 'retro', label: 'Retro', vibe: 'Analog film, VHS, riso & 80s nostalgia', group: 'themes' },
    { id: 'tech', label: 'Tech', vibe: 'Viewfinders, live EXIF & broadcast telemetry', group: 'themes' },
    { id: 'cosmic', label: 'Cosmic', vibe: 'Celestial, disco, stars & fantasy', group: 'themes' },
    { id: 'ascii', label: 'ASCII', vibe: 'Terminal glyphs, ANSI colour & text-mode art', group: 'themes' },
];

export type StoryFrameColorChoice = 'signature' | 'white' | 'gold' | 'red' | 'custom';

export interface StoryFrameContext {
    hasAttribution?: boolean;
    hasScoreboard?: boolean;
    layoutMode?: 'solo' | 'crop' | 'padded' | 'burst';
    exif?: ExifData;
}

/** One independently animatable group of a frame, as inner SVG markup in the 1080x1920 space. */
export interface StoryFrameLayer {
    /** Matches a key in the frame's motion recipe (`frameMotion/recipes`). */
    id: string;
    svg: string;
    /** Scale / rotation origin in design px (defaults to the layer's bounding-box centre). */
    pivot?: { x: number; y: number };
    /** Clip rectangle in design px (e.g. the visible extent of a scrolling pattern). */
    clip?: { x: number; y: number; w: number; h: number };
}

export interface StoryFrameLayers {
    /** Shared `<defs>…</defs>` markup, prepended to every layer and to the flattened frame. */
    defs?: string;
    /** Bottom-to-top draw order; joined in order they must reproduce the static frame. */
    layers: StoryFrameLayer[];
}

export interface StoryFrameDefinition {
    id: StoryFrameId;
    label: string;
    vibe: string;
    category?: StoryFrameCategory;
    signaturePalette: string[];
    renderSvg: (colorOverride?: string, context?: StoryFrameContext) => React.ReactNode;
    getSvgString: (colorOverride?: string, context?: StoryFrameContext) => string | Promise<string>;
    /** Optional layer split used by animated story exports. */
    getLayers?: (colorOverride?: string, context?: StoryFrameContext) => StoryFrameLayers | Promise<StoryFrameLayers>;
}

export interface BearPathDef {
    type: 'body' | 'accent' | 'highlight';
    d: string;
}
