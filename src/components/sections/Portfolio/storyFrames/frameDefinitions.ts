import type { StoryFrameDefinition, StoryFrameId } from './types';
import { NONE_FRAME } from './frames/noneFrame';
import { DERBY_FRAMES } from './frames/derbyFrames';
import { ACTION_FRAMES } from './frames/actionFrames';
import { RETRO_FRAMES } from './frames/retroFrames';
import { TECH_FRAMES } from './frames/techFrames';
import { COSMIC_FRAMES } from './frames/cosmicFrames';

export { createSvgString } from './frames/helper';
export { loadSacBearPaths } from './sacBearLoader';
export { NONE_FRAME } from './frames/noneFrame';
export { DERBY_FRAMES } from './frames/derbyFrames';
export { ACTION_FRAMES } from './frames/actionFrames';
export { RETRO_FRAMES } from './frames/retroFrames';
export { TECH_FRAMES } from './frames/techFrames';
export { COSMIC_FRAMES } from './frames/cosmicFrames';

/**
 * Complete list of 27 declarative story frames aggregated across category modules.
 */
export const STORY_FRAME_DEFINITIONS: StoryFrameDefinition[] = [
    NONE_FRAME,
    ...DERBY_FRAMES,
    ...ACTION_FRAMES,
    ...RETRO_FRAMES,
    ...TECH_FRAMES,
    ...COSMIC_FRAMES,
];

export const ALL_STORY_FRAME_DEFINITIONS = STORY_FRAME_DEFINITIONS;

/**
 * Fast O(1) map for frame lookup by StoryFrameId.
 */
export const STORY_FRAMES_MAP: Record<StoryFrameId, StoryFrameDefinition> = STORY_FRAME_DEFINITIONS.reduce(
    (acc, def) => {
        acc[def.id] = def;
        return acc;
    },
    {} as Record<StoryFrameId, StoryFrameDefinition>
);
