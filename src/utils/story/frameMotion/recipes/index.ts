/**
 * Frame motion recipes, keyed by frame id.
 *
 * Every decorative frame has a `whole` recipe (applied to the flattened frame image). Frames whose
 * definitions expose `getLayers` may also have a `layers` recipe for bespoke per-element motion; those
 * live in the per-category files next to this one, ordered by animation impact.
 */
import type { StoryFrameId } from '../../../../components/sections/Portfolio/storyFrames/types';
import type { FrameMotionRecipe } from '../types';
import { ACTION_MOTION } from './action';
import { ASCII_MOTION } from './ascii';
import { COSMIC_MOTION } from './cosmic';
import { DERBY_MOTION } from './derby';
import { RETRO_MOTION } from './retro';
import { TECH_MOTION } from './tech';

export type FrameMotionRegistry = Partial<Record<StoryFrameId, FrameMotionRecipe>>;

/** Used for frames without a recipe (e.g. newly added frames). */
export const DEFAULT_FRAME_MOTION: FrameMotionRecipe = {
    whole: { entrance: { kind: 'fade' } },
};

export const FRAME_MOTION: FrameMotionRegistry = {
    ...DERBY_MOTION,
    ...ACTION_MOTION,
    ...RETRO_MOTION,
    ...TECH_MOTION,
    ...COSMIC_MOTION,
    ...ASCII_MOTION,
};

export function getFrameMotionRecipe(frameId: StoryFrameId | undefined): FrameMotionRecipe | undefined {
    if (!frameId || frameId === 'none') return undefined;
    return FRAME_MOTION[frameId] ?? DEFAULT_FRAME_MOTION;
}
