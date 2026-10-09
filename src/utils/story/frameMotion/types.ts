/**
 * Frame motion types.
 *
 * A `FrameMotionRecipe` describes how a decorative story frame animates in an animated story: an
 * entrance (played once) and ambient loops (repeated for the rest of the video). Recipes are pure data;
 * `sampleFrameMotion` (sample.ts) turns them into per-frame `FrameLayerAnim` states that the renderer
 * (storyFrameMotionDraw.ts) applies to the rasterized frame or its layers.
 *
 * Units: distances are px in the 1080 x 1920 design space, times are seconds, angles are degrees.
 */

/** Where a reveal starts. Corner edges reveal along the diagonal; `center` grows an iris outwards. */
export type RevealEdge = 'left' | 'right' | 'top' | 'bottom' | 'tl' | 'tr' | 'bl' | 'br' | 'center';
/** Canvas edge a layer slides in from; `auto` picks the edge nearest the layer's bounding box. */
export type SlideEdge = 'left' | 'right' | 'top' | 'bottom' | 'auto';

interface EntranceTiming {
    /** Seconds after the frame track starts (FRAME_MOTION_START). Default 0. */
    delay?: number;
    /** Seconds. Each kind has its own default. */
    dur?: number;
}

export type EntranceSpec =
    | ({ kind: 'fade' } & EntranceTiming)
    | ({ kind: 'slide'; from?: SlideEdge } & EntranceTiming)
    | ({ kind: 'pop'; from?: number } & EntranceTiming)
    | ({ kind: 'wipe'; edge: RevealEdge } & EntranceTiming)
    /** Stepped row / column reveal for text and ASCII art. */
    | ({ kind: 'type'; edge?: 'top' | 'left' | 'bottom' | 'right'; steps?: number } & EntranceTiming)
    /** Fast directional reveal followed by a short shake. `angle` is the reveal direction (0 = rightwards, 90 = downwards). */
    | ({ kind: 'slash'; angle: number } & EntranceTiming)
    /** Whole frame only: the four quadrants converge from their corners. */
    | ({ kind: 'split' } & EntranceTiming)
    /** Neon ignition: stuttering on/off before settling on. */
    | ({ kind: 'flicker-on'; seed?: number } & EntranceTiming)
    /** Tape engage: fades in through glitch slices. */
    | ({ kind: 'glitch-in'; seed?: number } & EntranceTiming);

interface AmbientTiming {
    /** Nominal loop period (s). The real period is fitted so whole loops end exactly at the video end. */
    period?: number;
}

export type AmbientSpec =
    /** Breathing scale (around the layer pivot) and/or additive glow. */
    | ({ kind: 'pulse'; scale?: number; axis?: 'both' | 'x' | 'y'; glow?: number } & AmbientTiming)
    /** Opacity / scale dip, desynchronised by `seed`. `scale` (default 0.18) is the size dip; use 0 for scattered groups. */
    | ({ kind: 'twinkle'; seed?: number; depth?: number; scale?: number } & AmbientTiming)
    /** Seeded horizontal slice jitter bursts. */
    | ({ kind: 'glitch'; seed?: number; amount?: number; bursts?: number } & AmbientTiming)
    /** Highlight band sweeping across the layer's alpha once per loop. */
    | ({ kind: 'shimmer'; strength?: number; angle?: number } & AmbientTiming)
    /** On / off (REC dot, cursor). */
    | ({ kind: 'blink'; depth?: number } & AmbientTiming)
    /** Irregular brightness bursts with an additive flare (lightning, neon). */
    | ({ kind: 'flicker'; seed?: number; depth?: number; bursts?: number; glow?: number } & AmbientTiming)
    /** Continuous translation by whole tiles (px) per loop; `period` is the seconds per tile. */
    | ({ kind: 'scroll'; dx?: number; dy?: number } & AmbientTiming)
    /** Continuous rotation by `deg` per loop (use 360 / n for n-fold symmetric shapes). */
    | ({ kind: 'spin'; deg: number } & AmbientTiming)
    /** Slow back-and-forth translation (px). */
    | ({ kind: 'drift'; dx?: number; dy?: number } & AmbientTiming);

export interface LayerMotion {
    entrance?: EntranceSpec;
    ambient?: AmbientSpec[];
}

export interface FrameMotionRecipe {
    /**
     * Plays the entrances. Only for frames whose identity is the arrival (lightning strike, claw slash,
     * glitch, code rain). Otherwise the frame is on screen from the first frame and runs its ambient loops;
     * each layer's entrance `delay` still staggers when its loops start.
     */
    intro?: boolean;
    /** Applied to the flattened frame image (always present; also the fallback for layered recipes). */
    whole: LayerMotion;
    /** Per-layer motion, keyed by the layer ids returned by the frame's `getLayers`. */
    layers?: Record<string, LayerMotion>;
}

/** Per-frame drawing state for one layer (or the whole frame). Absent fields mean "at rest". */
export interface FrameLayerAnim {
    opacity: number;
    /** Translation in px @ 1080. */
    tx: number;
    ty: number;
    /** Uniform scale around the pivot, and extra per-axis multipliers. */
    scale: number;
    sx: number;
    sy: number;
    /** Degrees around the pivot. */
    rotate: number;
    /** Remaining slide travel (1 = fully off-canvas, 0 = home; may overshoot slightly below 0). */
    slide?: { edge: SlideEdge; amount: number };
    /** Clip reveal; `p` 0 → hidden, 1 → fully revealed. */
    reveal?: { edge: RevealEdge; p: number; steps?: number; angle?: number };
    /** Whole frame only: remaining quadrant travel (1 → corners, 0 → home). */
    split?: number;
    /** Horizontal slice jitter; `amount` 0..1, slice layout from `seed`. */
    glitch?: { seed: number; amount: number };
    /** Scroll offset (px @ 1080) within one tile; the renderer draws wrapped copies. */
    scroll?: { x: number; y: number; tileX: number; tileY: number };
    /** Shimmer band position (0..1 across the layer) and strength (0..1). */
    shimmer?: { pos: number; strength: number; angle: number };
    /** Additive brightness (0..1). */
    glow?: number;
}

/** Sampled frame motion for one video frame. Layers at rest are omitted. */
export interface FrameMotionState {
    whole?: FrameLayerAnim;
    layers?: Record<string, FrameLayerAnim>;
    /** True when the recipe is layered (the renderer draws layers individually when it has them). */
    layered?: boolean;
}
