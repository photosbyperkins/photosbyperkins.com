/**
 * Frame motion: animated decorative frames for animated story exports.
 * Pure (no DOM, no framer-motion); drawing lives in ../storyFrameMotionDraw.ts.
 */
export * from './types';
export {
    DEFAULT_FRAME_INTENSITY,
    FRAME_MOTION_START,
    entranceEnd,
    hash01,
    isRestAnim,
    sampleFrameMotion,
} from './sample';
export { DEFAULT_FRAME_MOTION, FRAME_MOTION, getFrameMotionRecipe } from './recipes';
export type { FrameMotionRegistry } from './recipes';
