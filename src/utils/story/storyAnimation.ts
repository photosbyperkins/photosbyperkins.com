/**
 * Animated Story timeline.
 *
 * Pure, deterministic description of how a story animates over time. `sampleStoryTimeline` maps a time
 * `t` (seconds) to a `StoryAnimState`, which `drawStoryScene` (storyRender.ts) applies on top of the
 * user's static design. The final frame is always the static design itself (`FINAL_ANIM_STATE`), so the
 * last video frame matches the still JPEG export exactly.
 *
 * No framer-motion imports here: many unit tests hand-mock 'framer-motion', and this module runs in the
 * export pipeline. Easing curves come from the shared cubic-bezier tokens in ../motion and are evaluated
 * by the local `cubicBezier` below.
 */
import { EASE_IN_OUT, EASE_OUT_EXPO, EASE_OUT_EXPO_STRONG } from '../motion';
import type { NormalizedCrop, StoryRenderConfig } from './storyConstants';
import { calculateNormalizedCrop } from './storyMath';
import { DEFAULT_FRAME_INTENSITY, getFrameMotionRecipe, sampleFrameMotion } from './frameMotion';
import type { FrameMotionState } from './frameMotion';

export type StoryMotionPreset = 'ken-burns' | 'float-in' | 'panel-cascade' | 'static-hold';
/** User-facing preset choice; `auto` resolves per layout via `defaultPresetFor`. */
export type StoryMotionPresetSetting = StoryMotionPreset | 'auto';

export const STORY_VIDEO_FPS = 30;
/** Every animated story is this long (one fixed length keeps the Motion tab simple). */
export const STORY_VIDEO_DURATION = 10;
export const STORY_VIDEO_DURATIONS = [STORY_VIDEO_DURATION] as const;

export interface StoryAnimationSpec {
    preset: StoryMotionPresetSetting;
    /** Always `STORY_VIDEO_DURATION` in the app; kept on the spec for the encoder and tests. */
    durationS: number;
    fps: number;
    /** Decorative frame motion strength 0..1 (0 = static frame). Missing in older saved settings. */
    frameIntensity?: number;
}

export const DEFAULT_STORY_ANIMATION: StoryAnimationSpec = {
    preset: 'static-hold',
    durationS: STORY_VIDEO_DURATION,
    fps: STORY_VIDEO_FPS,
    frameIntensity: DEFAULT_FRAME_INTENSITY,
};

/** Saved settings → current spec (older saves carried a user-chosen duration and no frame intensity). */
export function normalizeStoryAnimation(saved: Partial<StoryAnimationSpec> | null | undefined): StoryAnimationSpec {
    return {
        ...DEFAULT_STORY_ANIMATION,
        ...(saved ?? {}),
        durationS: STORY_VIDEO_DURATION,
        fps: STORY_VIDEO_FPS,
        frameIntensity: resolveFrameIntensity(saved ?? {}),
    };
}

/** Frame motion intensity for a spec, clamped to 0..1 (default when unset). */
export function resolveFrameIntensity(spec: Pick<StoryAnimationSpec, 'frameIntensity'>): number {
    const v = spec.frameIntensity;
    if (typeof v !== 'number' || !Number.isFinite(v)) return DEFAULT_FRAME_INTENSITY;
    return Math.max(0, Math.min(1, v));
}

export interface StoryPanelAnim {
    /** Offset as a fraction of the panel width / height. */
    dx: number;
    dy: number;
    /** Multiplier on the panel's own zoom (>= 1 never samples outside the image). */
    zoomMul: number;
    opacity: number;
    /** Opacity of per-panel details (timestamp pills). */
    detailOpacity: number;
}

/**
 * Animation state for a single frame. Every field is optional; an absent field means "at rest".
 * An empty object is the identity (the static design).
 */
export interface StoryAnimState {
    /** Full-bleed camera override (replaces config.crop for drawing). */
    crop?: NormalizedCrop;
    /** Fade of the photo layer up from black (full-bleed). */
    photoOpacity?: number;
    /** Padded card transform around its centre; dy is a fraction of the frame height. */
    card?: { scale: number; dy: number; opacity: number };
    /** Frosted / solid background scale around the frame centre (padded). */
    background?: { scale: number };
    panels?: StoryPanelAnim[];
    /** Decorative frame motion (entrance + ambient loops); see frameMotion/. */
    frame?: FrameMotionState;
}

export const FINAL_ANIM_STATE: StoryAnimState = Object.freeze({}) as StoryAnimState;

export type StoryLayoutKind = 'full' | 'padded' | 'burst';

/** Mirrors the layout branching in storyRender.ts. */
export function getStoryLayoutKind(config: Pick<StoryRenderConfig, 'mode' | 'crop'>): StoryLayoutKind {
    if (config.mode === 'burst') return 'burst';
    if (config.mode === 'padded') return 'padded';
    const isSolo = config.mode === 'solo' || !config.mode;
    const crop = config.crop;
    if (isSolo && crop && (crop.zoom < 0.999 || crop.width > 1.001 || crop.height > 1.001)) return 'padded';
    return 'full';
}

export function defaultPresetFor(config: Pick<StoryRenderConfig, 'mode' | 'crop'>): StoryMotionPreset {
    const kind = getStoryLayoutKind(config);
    if (kind === 'burst') return 'panel-cascade';
    if (kind === 'padded') return 'float-in';
    return 'ken-burns';
}

export function resolveStoryPreset(
    preset: StoryMotionPresetSetting,
    config: Pick<StoryRenderConfig, 'mode' | 'crop'>
): StoryMotionPreset {
    if (preset === 'auto') return defaultPresetFor(config);
    // Panel cascade needs panels; single-photo layouts get the closest equivalent.
    if (preset === 'panel-cascade' && getStoryLayoutKind(config) !== 'burst') return 'float-in';
    return preset;
}

/**
 * Returns an easing function for a CSS-style cubic-bezier curve (x1, y1, x2, y2).
 * Exact at the endpoints: f(0) === 0 and f(1) === 1.
 */
export function cubicBezier(p: readonly [number, number, number, number]): (t: number) => number {
    const [x1, y1, x2, y2] = p;
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
    const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

    const solveT = (x: number): number => {
        // Newton-Raphson, then bisection fallback for flat slopes
        let t = x;
        for (let i = 0; i < 8; i++) {
            const err = sampleX(t) - x;
            if (Math.abs(err) < 1e-7) return t;
            const d = slopeX(t);
            if (Math.abs(d) < 1e-6) break;
            t -= err / d;
        }
        let lo = 0;
        let hi = 1;
        t = x;
        for (let i = 0; i < 40; i++) {
            const v = sampleX(t);
            if (Math.abs(v - x) < 1e-7) return t;
            if (v < x) lo = t;
            else hi = t;
            t = (lo + hi) / 2;
        }
        return t;
    };

    return (x: number) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        return sampleY(solveT(x));
    };
}

const easeInOut = cubicBezier(EASE_IN_OUT);
const easeOutExpo = cubicBezier(EASE_OUT_EXPO);
const easeOutExpoStrong = cubicBezier(EASE_OUT_EXPO_STRONG);

const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
/** Linear progress of a segment that starts at `start` and lasts `dur` seconds. */
const seg = (t: number, start: number, dur: number) => clamp01(dur <= 0 ? (t >= start ? 1 : 0) : (t - start) / dur);
/** Exact at p === 1 (returns b), unlike a + (b - a) * p. */
const lerp = (a: number, b: number, p: number) => a * (1 - p) + b * p;

/** Burst panel cascade timings (seconds). Slightly slower than the preview's layout switch for video. */
export const PANEL_CASCADE = { start: 0.1, slide: 0.6, stagger: 0.12, detailDelay: 0.5, detailFade: 0.3 } as const;

/** Off-frame offset (fraction of the panel) a cascading panel enters from; matches storyTransitions.panelOffset. */
export function panelEnterOffset(count: 2 | 3, idx: number): { dx: number; dy: number } {
    return count === 2 ? { dx: 0, dy: idx === 0 ? -1.04 : 1.04 } : { dx: idx % 2 === 0 ? -1.02 : 1.02, dy: 0 };
}

export interface StoryTimelineContext {
    /** Natural size of the primary image (needed for the full-bleed camera). */
    imgW?: number;
    imgH?: number;
    /** Primary subject centre in normalised image coordinates (Ken Burns target). */
    subject?: { cx: number; cy: number };
}

const isIdentityPanel = (p: StoryPanelAnim) =>
    p.dx === 0 && p.dy === 0 && p.zoomMul === 1 && p.opacity === 1 && p.detailOpacity === 1;

/** Ken Burns start zoom multiplier (the camera pulls back from here to the user's crop). */
export const KEN_BURNS_ZOOM = 1.15;

/**
 * Samples the story animation at `tS` seconds. At (or after) `spec.durationS` this returns
 * `FINAL_ANIM_STATE`, i.e. the static design.
 */
export function sampleStoryTimeline(
    spec: StoryAnimationSpec,
    config: StoryRenderConfig,
    tS: number,
    ctx: StoryTimelineContext = {}
): StoryAnimState {
    const D = Math.max(0.5, spec.durationS || 0);
    if (!(tS < D)) return FINAL_ANIM_STATE;
    const t = Math.max(0, tS);

    const preset = resolveStoryPreset(spec.preset, config);
    const kind = getStoryLayoutKind(config);
    const state: StoryAnimState = {};

    // --- Decorative frame (shared by every preset; badges never animate, they sit in the design) ---
    if (config.frameId && config.frameId !== 'none') {
        const frame = sampleFrameMotion(getFrameMotionRecipe(config.frameId), t, D, resolveFrameIntensity(spec));
        if (frame) state.frame = frame;
    }

    if (preset === 'static-hold') return state;

    const whole = easeInOut(seg(t, 0, D));
    const crop = config.crop;

    if (kind === 'full') {
        if (!crop || !ctx.imgW || !ctx.imgH) return state;
        const baseZoom = crop.zoom || 1;
        if (preset === 'ken-burns') {
            if (whole < 1) {
                const target = ctx.subject ?? { cx: crop.centerX, cy: crop.centerY };
                const startCx = lerp(crop.centerX, target.cx, 0.5);
                const startCy = lerp(crop.centerY, target.cy, 0.5);
                const zoom = lerp(Math.min(3.5, baseZoom * KEN_BURNS_ZOOM), baseZoom, whole);
                state.crop = calculateNormalizedCrop(
                    ctx.imgW,
                    ctx.imgH,
                    lerp(startCx, crop.centerX, whole),
                    lerp(startCy, crop.centerY, whole),
                    zoom
                );
            }
        } else {
            // float-in: fade up from black while the camera settles
            const fade = easeOutExpo(seg(t, 0, 0.8));
            if (fade < 1) state.photoOpacity = fade;
            const settle = easeOutExpo(seg(t, 0, 1.6));
            if (settle < 1) {
                state.crop = calculateNormalizedCrop(
                    ctx.imgW,
                    ctx.imgH,
                    crop.centerX,
                    crop.centerY,
                    lerp(Math.min(3.5, baseZoom * 1.08), baseZoom, settle)
                );
            }
        }
        return state;
    }

    if (kind === 'padded') {
        if (preset === 'ken-burns') {
            if (whole < 1) {
                state.card = { scale: lerp(1.05, 1, whole), dy: 0, opacity: 1 };
                state.background = { scale: lerp(1.08, 1, whole) };
            }
        } else {
            const p = easeOutExpo(seg(t, 0.05, 0.7));
            if (p < 1) state.card = { scale: lerp(0.94, 1, p), dy: lerp(0.03, 0, p), opacity: p };
            if (whole < 1) state.background = { scale: lerp(1.06, 1, whole) };
        }
        return state;
    }

    // --- Burst (duet / triptych) ---
    const count: 2 | 3 = config.burst?.panelCount === 2 ? 2 : 3;
    const panels: StoryPanelAnim[] = [];
    for (let i = 0; i < count; i++) {
        const start = PANEL_CASCADE.start + i * PANEL_CASCADE.stagger;
        const detailOpacity = seg(t, start + PANEL_CASCADE.detailDelay, PANEL_CASCADE.detailFade);
        if (preset === 'panel-cascade') {
            const p = easeOutExpoStrong(seg(t, start, PANEL_CASCADE.slide));
            const off = panelEnterOffset(count, i);
            panels.push({
                dx: lerp(off.dx, 0, p),
                dy: lerp(off.dy, 0, p),
                zoomMul: lerp(1.05, 1, whole),
                opacity: 1,
                detailOpacity,
            });
        } else if (preset === 'float-in') {
            const p = easeOutExpo(seg(t, start, 0.7));
            panels.push({ dx: 0, dy: lerp(0.06, 0, p), zoomMul: 1, opacity: p, detailOpacity });
        } else {
            // ken-burns
            panels.push({ dx: 0, dy: 0, zoomMul: lerp(1.08, 1, whole), opacity: 1, detailOpacity: 1 });
        }
    }
    if (!panels.every(isIdentityPanel)) state.panels = panels;
    return state;
}

/** True when a state is (deeply) at rest. */
export function isFinalAnimState(state: StoryAnimState): boolean {
    return Object.keys(state).length === 0;
}

/** Number of frames for a spec (at least 1). */
export function getStoryFrameCount(spec: StoryAnimationSpec): number {
    return Math.max(1, Math.round(Math.max(0.5, spec.durationS) * (spec.fps || STORY_VIDEO_FPS)));
}
