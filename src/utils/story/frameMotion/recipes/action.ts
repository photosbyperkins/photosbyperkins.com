import type { FrameMotionRegistry } from './index';
import type { LayerMotion } from '../types';

const boltFlicker = (seed: number, bursts = 2): LayerMotion['ambient'] => [
    { kind: 'flicker', seed, depth: 0.6, glow: 0.8, bursts, period: 2.6 },
];
const sparkTwinkle = (seed: number): LayerMotion['ambient'] => [{ kind: 'twinkle', seed, depth: 0.7, period: 1.6 }];
/** Scattered ember group: opacity-only twinkle (no scale, which would pull the group together) plus a slow rise. */
const emberGlow = (seed: number, period: number): LayerMotion['ambient'] => [
    { kind: 'twinkle', seed, depth: 0.75, scale: 0, period },
    { kind: 'drift', dy: -4, period: period * 1.8 },
];
/** One flame tongue: reveal from its base edge, then lick (y-only pulse about the base pivot) with a glow. */
const flame = (base: 'bottom' | 'top', delay: number, lick: number, period: number): LayerMotion => ({
    entrance: { kind: 'wipe', edge: base, delay, dur: 0.38 },
    ambient: [{ kind: 'pulse', axis: 'y', scale: lick, glow: 0.12, period }],
});
/**
 * One sonic-boom corner (all three layers pivot on the corner origin): the ring bursts out of the corner,
 * the dashed ring and the shards follow; then all three throb outwards with the same period, staggered so
 * the swell ripples ring → dashes → shards. (No spin on the dashed ring: its arc ends at the canvas edge,
 * where off-canvas dashes were never rasterized, so rotating it would open a gap.)
 */
const shockwave = (corner: string, delay: number): Record<string, LayerMotion> => ({
    [`ring${corner}`]: {
        entrance: { kind: 'pop', from: 0.55, delay, dur: 0.45 },
        ambient: [{ kind: 'pulse', scale: 0.035, glow: 0.12, period: 1.6 }],
    },
    [`dash${corner}`]: {
        entrance: { kind: 'pop', from: 0.7, delay: delay + 0.08, dur: 0.45 },
        ambient: [{ kind: 'pulse', scale: 0.04, period: 1.6 }],
    },
    [`shards${corner}`]: {
        entrance: { kind: 'pop', from: 0.3, delay: delay + 0.14, dur: 0.45 },
        ambient: [{ kind: 'pulse', scale: 0.06, period: 1.6 }],
    },
});
/** Slipstream row: blows in left to right, then light flows along it. */
const slipstream = (delay: number): LayerMotion => ({
    entrance: { kind: 'wipe', edge: 'left', delay, dur: 0.4 },
    ambient: [{ kind: 'shimmer', strength: 0.4, angle: 0, period: 2.8 }],
});
/** Chevron flank: rushes in from its edge, then a highlight pulses inwards (the way the arrows point). */
const chevrons = (from: 'left' | 'right', delay: number): LayerMotion => ({
    entrance: { kind: 'slide', from, delay, dur: 0.6 },
    ambient: [{ kind: 'shimmer', strength: 0.5, angle: from === 'left' ? 0 : 180, period: 1.8 }],
});
/** Edge dash: draws down, then streams downwards by one 24+16 dash period per loop (clipped to its extent). */
const speedDash = (delay: number): LayerMotion => ({
    entrance: { kind: 'wipe', edge: 'top', delay, dur: 0.5 },
    ambient: [{ kind: 'scroll', dy: 40, period: 0.8 }],
});
/** Halftone column: grows in, then a light band rolls along it away from its corner (`angle`). */
const halftoneColumn = (delay: number, angle: number): LayerMotion => ({
    entrance: { kind: 'pop', from: 0.3, delay, dur: 0.4 },
    ambient: [{ kind: 'shimmer', strength: 0.3, angle, period: 3.4 }],
});
/** Speed stripes: slash out of their corner along the stripe angle, then glint along it. */
const speedStripes = (angle: number, delay: number): LayerMotion => ({
    entrance: { kind: 'slash', angle, delay },
    ambient: [{ kind: 'shimmer', strength: 0.35, angle, period: 3.4 }],
});
/** Comic star flash: pops, then twinkles. */
const popStar = (delay: number, seed: number): LayerMotion => ({
    entrance: { kind: 'pop', delay, dur: 0.4 },
    ambient: [{ kind: 'twinkle', seed, depth: 0.5, period: 1.6 }],
});

/** Action frames. */
export const ACTION_MOTION: FrameMotionRegistry = {
    // #1 impact: lightning strikes, then crackles for the rest of the video
    'electric-lightning': {
        intro: true,
        whole: {
            entrance: { kind: 'wipe', edge: 'top', dur: 0.4 },
            ambient: [{ kind: 'flicker', seed: 5, depth: 0.55, glow: 0.6 }],
        },
        layers: {
            boltL: { entrance: { kind: 'wipe', edge: 'top', dur: 0.28 }, ambient: boltFlicker(1) },
            boltR: { entrance: { kind: 'wipe', edge: 'top', delay: 0.06, dur: 0.28 }, ambient: boltFlicker(2) },
            bottomBoltL: {
                entrance: { kind: 'wipe', edge: 'top', delay: 0.25, dur: 0.3 },
                ambient: boltFlicker(3, 1),
            },
            bottomBoltR: {
                entrance: { kind: 'wipe', edge: 'top', delay: 0.31, dur: 0.3 },
                ambient: boltFlicker(4, 1),
            },
            pulseL: {
                entrance: { kind: 'wipe', edge: 'top', delay: 0.4, dur: 0.2 },
                ambient: [{ kind: 'flicker', seed: 6, depth: 0.45, glow: 0.4, bursts: 1, period: 2.2 }],
            },
            pulseR: {
                entrance: { kind: 'wipe', edge: 'top', delay: 0.45, dur: 0.2 },
                ambient: [{ kind: 'flicker', seed: 7, depth: 0.45, glow: 0.4, bursts: 1, period: 2.2 }],
            },
            sparkTL: { entrance: { kind: 'pop', delay: 0.45 }, ambient: sparkTwinkle(11) },
            sparkTR: { entrance: { kind: 'pop', delay: 0.5 }, ambient: sparkTwinkle(12) },
            sparkML: { entrance: { kind: 'pop', delay: 0.55 }, ambient: sparkTwinkle(13) },
            sparkMR: { entrance: { kind: 'pop', delay: 0.6 }, ambient: sparkTwinkle(14) },
            groundL: {
                entrance: { kind: 'pop', delay: 0.55 },
                ambient: [{ kind: 'pulse', scale: 0.18, glow: 0.35, period: 1.4 }],
            },
            groundR: {
                entrance: { kind: 'pop', delay: 0.62 },
                ambient: [{ kind: 'pulse', scale: 0.18, glow: 0.35, period: 1.5 }],
            },
        },
    },
    // #2 impact: the top-right rake slashes (down its claws, 106°), then the bottom-left counter rake
    // (rotated 195°, so it rips up and to the right); embers burst out and smoulder
    'claw-marks': {
        intro: true,
        whole: {
            entrance: { kind: 'slash', angle: 110, dur: 0.22 },
            ambient: [{ kind: 'shimmer', strength: 0.35, angle: 110 }],
        },
        layers: {
            rakeTR: {
                entrance: { kind: 'slash', angle: 106, dur: 0.2 },
                ambient: [{ kind: 'shimmer', strength: 0.4, angle: 106, period: 3.2 }],
            },
            embersTRa: { entrance: { kind: 'pop', delay: 0.2 }, ambient: emberGlow(21, 1.3) },
            embersTRb: { entrance: { kind: 'pop', delay: 0.26 }, ambient: emberGlow(22, 1.7) },
            rakeBL: {
                entrance: { kind: 'slash', angle: 285, delay: 0.34, dur: 0.2 },
                ambient: [{ kind: 'shimmer', strength: 0.4, angle: 285, period: 3.2 }],
            },
            embersBLa: { entrance: { kind: 'pop', delay: 0.54 }, ambient: emberGlow(23, 1.5) },
            embersBLb: { entrance: { kind: 'pop', delay: 0.6 }, ambient: emberGlow(24, 1.9) },
        },
    },
    // #8 impact: flames rise from their bases, then lick (y-only pulse about the base edge); the inner
    // tongue breathes faster than the outer so they never move as one block
    'street-flames': {
        whole: {
            entrance: { kind: 'wipe', edge: 'bottom', dur: 0.5 },
            ambient: [{ kind: 'flicker', seed: 9, depth: 0.2, glow: 0.35, bursts: 3 }],
        },
        layers: {
            flameBLOuter: flame('bottom', 0, 0.07, 1.3),
            flameBLInner: flame('bottom', 0.05, 0.11, 0.9),
            flameBROuter: flame('bottom', 0.06, 0.07, 1.4),
            flameBRInner: flame('bottom', 0.11, 0.11, 0.95),
            flameTLOuter: flame('top', 0.22, 0.06, 1.5),
            flameTLInner: flame('top', 0.27, 0.1, 1.05),
            flameTROuter: flame('top', 0.28, 0.06, 1.6),
            flameTRInner: flame('top', 0.33, 0.1, 1.1),
        },
    },
    // #12 impact: each corner booms in turn - the ring bursts out of the corner, the dashed outer ring and the
    // shards follow; then each corner throbs, the swell rippling outwards from ring to dashes to shards
    'sonic-boom': {
        whole: { entrance: { kind: 'split' }, ambient: [{ kind: 'shimmer', strength: 0.4 }] },
        layers: {
            ...shockwave('TL', 0),
            ...shockwave('TR', 0.08),
            ...shockwave('BL', 0.16),
            ...shockwave('BR', 0.24),
        },
    },
    // #13 impact: the slipstreams blow in left to right, the chevrons rush in from their edges and the edge
    // dashes draw down; then the dashes stream past, light pulses inwards along the chevrons
    'speed-demons': {
        whole: { entrance: { kind: 'split', dur: 0.55 }, ambient: [{ kind: 'shimmer', strength: 0.45, angle: 0 }] },
        layers: {
            streamsTop: slipstream(0),
            streamsBottom: slipstream(0.06),
            chevronL1: chevrons('left', 0.12),
            chevronR1: chevrons('right', 0.16),
            chevronL2: chevrons('left', 0.24),
            chevronR2: chevrons('right', 0.28),
            edgeL: speedDash(0.2),
            edgeR: speedDash(0.24),
        },
    },
    // #26 impact: the halftone columns ripple out of each corner, the speed stripes slash in from the corners
    // with a star flash; then a light sweep rolls along the dots and stripes and the stars twinkle
    'pop-art': {
        whole: { entrance: { kind: 'split' }, ambient: [{ kind: 'shimmer', strength: 0.4 }] },
        layers: {
            dotsTR0: halftoneColumn(0, 90),
            dotsTR1: halftoneColumn(0.05, 90),
            dotsTR2: halftoneColumn(0.1, 90),
            dotsTR3: halftoneColumn(0.15, 90),
            stripesTL: speedStripes(32, 0.14),
            starTL: popStar(0.4, 31),
            dotsBL0: halftoneColumn(0.32, 270),
            dotsBL1: halftoneColumn(0.37, 270),
            dotsBL2: halftoneColumn(0.42, 270),
            dotsBL3: halftoneColumn(0.47, 270),
            stripesBR: speedStripes(212, 0.46),
            starBR: popStar(0.72, 32),
        },
    },
};
