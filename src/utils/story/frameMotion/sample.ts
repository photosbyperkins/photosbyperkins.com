/**
 * Frame motion sampler.
 *
 * `sampleFrameMotion` maps a time `t` to per-layer drawing states for a `FrameMotionRecipe`. It is pure
 * and deterministic (seeded randomness only), so the preview and the MP4 encoder agree frame for frame.
 *
 * Looping contract: every ambient effect is a function of a loop phase φ ∈ [0, 1) whose period is fitted
 * so a whole number of loops fits between the ambient start and the video end, and every effect is at
 * rest at φ = 0 and φ = 1. The last video frame therefore equals the static design (the still export).
 */
import type {
    AmbientSpec,
    EntranceSpec,
    FrameLayerAnim,
    FrameMotionRecipe,
    FrameMotionState,
    LayerMotion,
} from './types';

/** Seconds into the video when the frame track starts (matches the overlay choreography). */
export const FRAME_MOTION_START = 0.15;
/** Pause between a layer's entrance and its ambient loops. */
const AMBIENT_GAP = 0.2;
/** Ambient amplitude fade-in after it starts. */
const AMBIENT_RAMP = 0.6;
/** Default user intensity (recipes are tuned for this value). */
export const DEFAULT_FRAME_INTENSITY = 0.6;
/** Below this intensity continuous motion (scroll / spin) is disabled. */
const CONTINUOUS_MIN_INTENSITY = 0.15;

const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
const seg = (t: number, start: number, dur: number) => clamp01(dur <= 0 ? (t >= start ? 1 : 0) : (t - start) / dur);
const lerp = (a: number, b: number, p: number) => a * (1 - p) + b * p;
const easeOutCubic = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(1 - p, 3));
const easeOutExpo = (p: number) => (p >= 1 ? 1 : (1 - Math.pow(2, -10 * p)) / (1 - Math.pow(2, -10)));
const easeOutBack = (p: number, c1 = 1.70158) => {
    if (p >= 1) return 1;
    const c3 = c1 + 1;
    const q = p - 1;
    return 1 + c3 * q * q * q + c1 * q * q;
};
const frac = (v: number) => v - Math.floor(v);

/** Small deterministic hash → [0, 1). */
export function hash01(n: number): number {
    let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13;
    x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
}

const restAnim = (): FrameLayerAnim => ({ opacity: 1, tx: 0, ty: 0, scale: 1, sx: 1, sy: 1, rotate: 0 });

export function isRestAnim(a: FrameLayerAnim): boolean {
    return (
        a.opacity === 1 &&
        a.tx === 0 &&
        a.ty === 0 &&
        a.scale === 1 &&
        a.sx === 1 &&
        a.sy === 1 &&
        a.rotate === 0 &&
        !a.slide &&
        !a.reveal &&
        !a.split &&
        !a.glitch &&
        !a.scroll &&
        !a.shimmer &&
        !a.glow
    );
}

/** Default durations per entrance kind (s). */
const ENTRANCE_DUR: Record<EntranceSpec['kind'], number> = {
    fade: 0.5,
    slide: 0.75,
    pop: 0.5,
    wipe: 0.45,
    type: 0.8,
    slash: 0.18,
    split: 0.75,
    'flicker-on': 0.55,
    'glitch-in': 0.45,
};
const SLASH_SHAKE = 0.2;

/** Seconds (from the frame track start) at which an entrance has fully settled. */
export function entranceEnd(e: EntranceSpec | undefined): number {
    if (!e) return 0;
    const dur = e.dur ?? ENTRANCE_DUR[e.kind];
    return (e.delay ?? 0) + dur + (e.kind === 'slash' ? SLASH_SHAKE : 0);
}

function applyEntrance(a: FrameLayerAnim, e: EntranceSpec, t: number): void {
    const delay = e.delay ?? 0;
    const dur = e.dur ?? ENTRANCE_DUR[e.kind];
    const p = seg(t, delay, dur);
    if (t < delay) {
        a.opacity = 0;
        return;
    }
    switch (e.kind) {
        case 'fade':
            a.opacity *= easeOutCubic(p);
            break;
        case 'slide': {
            const s = easeOutBack(p, 1.1);
            if (s !== 1) a.slide = { edge: e.from ?? 'auto', amount: 1 - s };
            a.opacity *= clamp01(p * 4);
            break;
        }
        case 'pop': {
            const s = easeOutBack(p, 2.2);
            a.scale *= lerp(e.from ?? 0.6, 1, s);
            a.opacity *= clamp01(p * 3);
            break;
        }
        case 'wipe':
            if (p < 1) a.reveal = { edge: e.edge, p: easeOutCubic(p) };
            break;
        case 'type':
            if (p < 1) a.reveal = { edge: e.edge ?? 'top', p, steps: e.steps ?? 12 };
            break;
        case 'slash': {
            if (p < 1) a.reveal = { edge: 'left', angle: e.angle, p: easeOutCubic(p) };
            const shake = seg(t, delay + dur, SLASH_SHAKE);
            if (p >= 1 && shake < 1) {
                const decay = 1 - shake;
                const w = shake * Math.PI * 7;
                a.tx += Math.sin(w) * 9 * decay;
                a.ty += Math.cos(w * 1.3) * 6 * decay;
            }
            break;
        }
        case 'split': {
            const s = 1 - easeOutExpo(p);
            if (s > 0) a.split = s;
            a.opacity *= clamp01(p * 2.5);
            break;
        }
        case 'flicker-on': {
            if (p < 1) {
                const step = Math.floor(p * 12);
                // Probability of "on" rises through the entrance; deterministic per step
                const on = hash01((e.seed ?? 7) * 131 + step) < 0.25 + p * 0.75;
                a.opacity *= on ? lerp(0.55, 1, p) : 0.06;
                if (on && step % 3 === 0) a.glow = Math.max(a.glow ?? 0, 0.35 * (1 - p));
            }
            break;
        }
        case 'glitch-in': {
            a.opacity *= easeOutCubic(p);
            if (p < 1) a.glitch = { seed: (e.seed ?? 3) * 977 + Math.floor(t * 24), amount: 1 - p };
            break;
        }
    }
}

interface Loop {
    /** Phase in the current loop, [0, 1). */
    phi: number;
    /** Loop index. */
    index: number;
    /** Ramp-in envelope 0..1. */
    env: number;
}

function fitLoop(t: number, start: number, D: number, period: number): Loop | null {
    const T = D - start;
    if (T < 0.3 || t < start) return null;
    const n = Math.max(1, Math.round(T / Math.max(0.1, period)));
    const P = T / n;
    const x = (t - start) / P;
    return { phi: frac(x), index: Math.floor(x), env: clamp01((t - start) / AMBIENT_RAMP) };
}

/**
 * Continuous progress 0..1 over [start, D] with an eased start (constant velocity afterwards), and the
 * whole number of cycles that fit. Used by scroll / spin, which must end on an exact multiple of a tile.
 */
function continuous(t: number, start: number, D: number, period: number): { u: number; n: number } | null {
    const T = D - start;
    if (T < 0.3 || t <= start) return null;
    const n = Math.max(1, Math.round(T / Math.max(0.1, period)));
    const r = Math.min(0.6, T / 2);
    const g = (x: number) => (x < r ? (x * x) / (2 * r) : x - r / 2);
    return { u: Math.min(1, g(Math.min(t - start, T)) / g(T)), n };
}

/** Seeded burst windows inside a loop; returns the burst strength 0..1 at phase φ. */
function burstAt(phi: number, seed: number, loopIndex: number, bursts: number, width: number): number {
    for (let i = 0; i < bursts; i++) {
        const h = hash01(seed * 7919 + loopIndex * 104729 + i * 31);
        const c = 0.15 + h * 0.7;
        const w = width * (0.7 + 0.6 * hash01(seed * 13 + loopIndex * 17 + i));
        if (Math.abs(phi - c) < w / 2) return 1;
    }
    return 0;
}

/** Like `burstAt`, but a smooth bell (0 → 1 → 0) across each window instead of a hard on/off gate. */
function smoothBurstAt(phi: number, seed: number, loopIndex: number, bursts: number, width: number): number {
    let v = 0;
    for (let i = 0; i < bursts; i++) {
        const h = hash01(seed * 7919 + loopIndex * 104729 + i * 31);
        const c = 0.15 + h * 0.7;
        const w = width * (0.7 + 0.6 * hash01(seed * 13 + loopIndex * 17 + i));
        const d = Math.abs(phi - c) / (w / 2);
        if (d < 1) v = Math.max(v, 0.5 + 0.5 * Math.cos(Math.PI * d));
    }
    return v;
}

/**
 * Calm caps for the "electric" ambients. The live editor loops these continuously, so hard strobes and
 * big glitch jumps read as the frame flashing; keep them as soft accents.
 */
const FLICKER_DEPTH_SCALE = 0.45;
const FLICKER_GLOW_SCALE = 0.5;
const GLITCH_AMOUNT_SCALE = 0.5;
const GLITCH_JITTER_PX = 4;

const DEFAULT_PERIOD: Record<AmbientSpec['kind'], number> = {
    pulse: 2.4,
    twinkle: 1.8,
    glitch: 3.2,
    shimmer: 3.4,
    blink: 1.6,
    flicker: 2.8,
    scroll: 2.0,
    spin: 6,
    drift: 4.5,
};

function applyAmbient(a: FrameLayerAnim, s: AmbientSpec, t: number, start: number, D: number, k: number): void {
    const period = s.period ?? DEFAULT_PERIOD[s.kind];

    if (s.kind === 'scroll' || s.kind === 'spin') {
        if (k * DEFAULT_FRAME_INTENSITY < CONTINUOUS_MIN_INTENSITY) return;
        const c = continuous(t, start, D, period);
        if (!c) return;
        if (s.kind === 'spin') {
            // Symmetric shapes: wrap to the nearest symmetry step so "almost a full step" reads as almost rest
            let r = (c.n * s.deg * c.u) % s.deg;
            if (r > s.deg / 2) r -= s.deg;
            if (r !== 0) a.rotate += r;
            return;
        }
        const tileX = Math.abs(s.dx ?? 0);
        const tileY = Math.abs(s.dy ?? 0);
        const wrap = (v: number, tile: number) => (tile > 0 ? ((v % tile) + tile) % tile : 0);
        const x = wrap(c.n * (s.dx ?? 0) * c.u, tileX);
        const y = wrap(c.n * (s.dy ?? 0) * c.u, tileY);
        if (x !== 0 || y !== 0) a.scroll = { x, y, tileX, tileY };
        return;
    }

    // Seeded variety: twinkles get their own period and start offset so neighbours desynchronise
    const seed = 'seed' in s && s.seed !== undefined ? s.seed : 1;
    let p = period;
    let st = start;
    if (s.kind === 'twinkle') {
        p = period * (0.75 + 0.5 * hash01(seed * 53));
        st = start + hash01(seed * 97) * 0.5;
    }
    const loop = fitLoop(t, st, D, p);
    if (!loop) return;
    const A = k * loop.env;
    if (A <= 0) return;
    const { phi } = loop;
    const bell = 0.5 - 0.5 * Math.cos(2 * Math.PI * phi);

    switch (s.kind) {
        case 'pulse': {
            const amp = (s.scale ?? 0.05) * A * bell;
            if (s.axis === 'x') a.sx *= 1 + amp;
            else if (s.axis === 'y') a.sy *= 1 + amp;
            else a.scale *= 1 + amp;
            if (s.glow) a.glow = (a.glow ?? 0) + s.glow * A * bell;
            break;
        }
        case 'twinkle': {
            const w = bell * bell;
            a.opacity *= clamp01(1 - (s.depth ?? 0.65) * Math.min(1.4, A) * w);
            a.scale *= 1 - (s.scale ?? 0.18) * Math.min(1.4, A) * w;
            break;
        }
        case 'glitch': {
            const b = burstAt(phi, seed, loop.index, s.bursts ?? 1, 0.06);
            if (b > 0) {
                a.glitch = {
                    seed: seed * 977 + Math.floor(t * 24),
                    amount: Math.min(1, (s.amount ?? 0.7) * GLITCH_AMOUNT_SCALE * A),
                };
                a.tx += (hash01(Math.floor(t * 30) + seed) - 0.5) * GLITCH_JITTER_PX * A;
            }
            break;
        }
        case 'shimmer': {
            if (phi >= 0.1 && phi < 0.6) {
                a.shimmer = {
                    pos: (phi - 0.1) / 0.5,
                    strength: Math.min(1, (s.strength ?? 0.5) * A),
                    angle: s.angle ?? 60,
                };
            }
            break;
        }
        case 'blink': {
            // Soft fade out and back in (no hard on/off cut)
            if (phi >= 0.5 && phi < 0.9) {
                const dip = Math.sin((Math.PI * (phi - 0.5)) / 0.4);
                a.opacity *= clamp01(1 - (s.depth ?? 1) * Math.min(1, A) * dip * dip);
            }
            break;
        }
        case 'flicker': {
            // A smooth brightness dip with a glow swell across each burst window (no frame-rate strobe)
            const b = smoothBurstAt(phi, seed, loop.index, s.bursts ?? 2, 0.09);
            if (b > 0) {
                const amp = Math.min(1.4, A) * b;
                a.opacity *= clamp01(1 - (s.depth ?? 0.6) * FLICKER_DEPTH_SCALE * amp);
                a.glow = (a.glow ?? 0) + (s.glow ?? 0.5) * FLICKER_GLOW_SCALE * amp;
            }
            break;
        }
        case 'drift': {
            const w = Math.sin(2 * Math.PI * phi) * A;
            a.tx += (s.dx ?? 0) * w;
            a.ty += (s.dy ?? 0) * w;
            break;
        }
    }
}

function sampleLayer(m: LayerMotion, t: number, D: number, k: number, intro: boolean): FrameLayerAnim | undefined {
    const a = restAnim();
    const tt = t - FRAME_MOTION_START;
    if (intro && m.entrance) applyEntrance(a, m.entrance, tt);
    if (m.ambient?.length) {
        // Without an intro the layer is already on screen: its entrance delay only staggers the loops
        const offset = !m.entrance ? 0 : intro ? entranceEnd(m.entrance) + AMBIENT_GAP : (m.entrance.delay ?? 0);
        const start = FRAME_MOTION_START + offset;
        for (const s of m.ambient) applyAmbient(a, s, t, start, D, k);
    }
    return isRestAnim(a) ? undefined : a;
}

/**
 * Samples a frame motion recipe at `t` seconds of a `D`-second video.
 * `intensity` (0..1) scales ambient amplitudes; 0 disables frame motion entirely (static frame).
 * Returns undefined when everything is at rest.
 */
export function sampleFrameMotion(
    recipe: FrameMotionRecipe | undefined,
    t: number,
    D: number,
    intensity: number = DEFAULT_FRAME_INTENSITY
): FrameMotionState | undefined {
    if (!recipe || !(intensity > 0) || !(t < D)) return undefined;
    const k = Math.min(1, intensity) / DEFAULT_FRAME_INTENSITY;
    const intro = recipe.intro === true;
    const state: FrameMotionState = {};
    const whole = sampleLayer(recipe.whole, t, D, k, intro);
    if (whole) state.whole = whole;
    if (recipe.layers) {
        state.layered = true;
        const layers: Record<string, FrameLayerAnim> = {};
        let any = false;
        for (const id of Object.keys(recipe.layers)) {
            const l = sampleLayer(recipe.layers[id], t, D, k, intro);
            if (l) {
                layers[id] = l;
                any = true;
            }
        }
        if (any) state.layers = layers;
    }
    if (!state.whole && !state.layers) return undefined;
    return state;
}
