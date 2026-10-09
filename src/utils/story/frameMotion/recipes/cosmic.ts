import type { FrameMotionRegistry } from './index';
import type { LayerMotion } from '../types';

/** Mirror ball: drops in on its string (spring settle), then a glint sweeps across it. */
const mirrorBall = (delay: number): LayerMotion => ({
    entrance: { kind: 'slide', from: 'top', delay },
    ambient: [{ kind: 'shimmer', strength: 0.55, angle: 45, period: 2.2 }],
});
/** The star atop a ball: lights up once the ball has landed, then twinkles. */
const discoLight = (delay: number, seed: number): LayerMotion => ({
    entrance: { kind: 'pop', delay },
    ambient: [{ kind: 'twinkle', seed, depth: 0.55, scale: 0.12, period: 1.7 }],
});
/** Neon floor curves: ignite with a stutter, then buzz now and then. */
const neonFloor = (delay: number, seed: number): LayerMotion => ({
    entrance: { kind: 'flicker-on', seed, delay, dur: 0.5 },
    ambient: [{ kind: 'flicker', seed, depth: 0.25, glow: 0.3, bursts: 1, period: 3 }],
});
const sparkle = (delay: number, seed: number, period: number): LayerMotion => ({
    entrance: { kind: 'pop', delay },
    ambient: [{ kind: 'twinkle', seed, depth: 0.7, period }],
});
/** A star with its own centre pivot: twinkles with a small size dip. */
const starTwinkle = (seed: number, period: number, depth = 0.5): LayerMotion['ambient'] => [
    { kind: 'twinkle', seed, depth, scale: 0.15, period },
];
/** Scattered dots: opacity-only twinkle, so the group doesn't contract. */
const dotTwinkle = (seed: number, period: number, depth = 0.55): LayerMotion['ambient'] => [
    { kind: 'twinkle', seed, depth, scale: 0, period },
];
/**
 * A puffy cloud: puffs in, then drifts a few px. Clouds cropped by a canvas edge pass a pivot on that edge
 * (set on the layer) and drift along it, so the cut never shows.
 */
const cloudPuff = (delay: number, drift: { dx?: number; dy?: number }, period: number): LayerMotion => ({
    entrance: { kind: 'pop', delay, from: 0.7 },
    ambient: [{ kind: 'drift', ...drift, period }],
});

/** Unicorn mascot: body and face share this exact motion (same pivot), so they move as one piece. */
const mascotBob: NonNullable<LayerMotion['ambient']> = [{ kind: 'drift', dy: 5, period: 3.6 }];
const mascotFloat: LayerMotion = {
    entrance: { kind: 'pop', delay: 0.5, dur: 0.55, from: 0.5 },
    ambient: mascotBob,
};
/** Glamour sparkle: springs in, then a gentle twinkle plus a diagonal glint at twice the twinkle period. */
const glamour = (delay: number, seed: number, period: number): LayerMotion => ({
    entrance: { kind: 'pop', delay, from: 0.4 },
    ambient: [
        { kind: 'twinkle', seed, depth: 0.35, scale: 0.14, period },
        { kind: 'shimmer', strength: 0.5, angle: 45, period: period * 2 },
    ],
});
/**
 * Tarot medallion sunburst: lights up inside its disc, then twinkles (no spin: the 4-fold star needs a 90° step
 * per loop, far too brisk on a short video).
 */
const tarotSun = (delay: number, seed: number): LayerMotion => ({
    entrance: { kind: 'pop', delay },
    ambient: [{ kind: 'twinkle', seed, depth: 0.45, scale: 0.15, period: 2.2 }],
});
/** Tarot filigree bar: opens from its centre, then a soft gold glow breathes. */
const filigree = (delay: number): LayerMotion => ({
    entrance: { kind: 'wipe', edge: 'center', delay, dur: 0.45 },
    ambient: [{ kind: 'pulse', scale: 0, glow: 0.22, period: 3 }],
});
/** A big heart (pivot on itself): springs in, then beats. */
const heartBeat = (delay: number, period: number): LayerMotion => ({
    entrance: { kind: 'pop', delay, from: 0.5 },
    ambient: [{ kind: 'pulse', scale: 0.07, period }],
});
/** Mini sun ray ring (8 rays): pops with its face, then turns 45° per slow loop. */
const miniSunRays = (delay: number): LayerMotion => ({
    entrance: { kind: 'pop', delay },
    ambient: [{ kind: 'spin', deg: 45, period: 8 }],
});

/** Cosmic frames. */
export const COSMIC_MOTION: FrameMotionRegistry = {
    // #10 impact: the mirror balls drop in on their strings and glint (no spin: the latitude lines read as
    // a 3D sphere and the string would rotate), their stars light up, the floor neon ignites and buzzes,
    // and the sparkles pop and twinkle
    'roller-disco': {
        whole: { entrance: { kind: 'flicker-on', seed: 8 }, ambient: [{ kind: 'shimmer', strength: 0.45 }] },
        layers: {
            ballL: mirrorBall(0.08),
            discoStarL: discoLight(0.7, 41),
            ballR: mirrorBall(0.16),
            discoStarR: discoLight(0.78, 42),
            floorL: neonFloor(0.3, 43),
            floorR: neonFloor(0.38, 44),
            sparkle1: sparkle(0.5, 45, 1.5),
            sparkle2: sparkle(0.57, 46, 1.8),
            sparkle3: sparkle(0.64, 47, 1.65),
            sparkle4: sparkle(0.71, 48, 1.95),
        },
    },
    // #16 impact: the four glamour sparkles pop in clockwise from the top-left, then twinkle out of step and
    // each catches a diamond glint
    'golden-sparkle': {
        whole: { entrance: { kind: 'split' }, ambient: [{ kind: 'shimmer', strength: 0.55 }] },
        layers: {
            sparkleTL: glamour(0.05, 81, 1.8),
            sparkleTR: glamour(0.17, 82, 2.1),
            sparkleBR: glamour(0.29, 83, 1.9),
            sparkleBL: glamour(0.41, 84, 2.3),
        },
    },
    // #17 impact: the glow warms up and breathes, the rays radiate out from the sun (iris) and breathe (the
    // corner crops them, so they never shrink or spin), the face springs in and its shine glints, the
    // sparkles pop and twinkle, and the mini suns pop with their ray rings slowly turning
    sol: {
        whole: { entrance: { kind: 'fade', dur: 0.7 }, ambient: [{ kind: 'shimmer', strength: 0.4 }] },
        layers: {
            glow: { entrance: { kind: 'fade', dur: 0.9 }, ambient: [{ kind: 'pulse', scale: 0.06, period: 3.4 }] },
            rays: {
                entrance: { kind: 'wipe', edge: 'center', delay: 0.1, dur: 0.55 },
                ambient: [{ kind: 'pulse', scale: 0.04, period: 2.4 }],
            },
            face: {
                entrance: { kind: 'pop', delay: 0.2, from: 0.6 },
                ambient: [{ kind: 'shimmer', strength: 0.25, angle: 45, period: 4.4 }],
            },
            spark1: sparkle(0.45, 101, 1.7),
            spark2: sparkle(0.52, 102, 1.5),
            spark3: sparkle(0.59, 103, 1.9),
            spark4: sparkle(0.49, 104, 1.6),
            spark5: sparkle(0.56, 105, 2),
            dots: { entrance: { kind: 'fade', delay: 0.6 }, ambient: dotTwinkle(106, 1.4) },
            sparkTL: sparkle(0.35, 107, 1.8),
            sparkTL2: sparkle(0.42, 108, 1.6),
            miniRaysL: miniSunRays(0.6),
            miniFaceL: { entrance: { kind: 'pop', delay: 0.6 } },
            miniRaysR: miniSunRays(0.68),
            miniFaceR: { entrance: { kind: 'pop', delay: 0.68 } },
            sparkBL: sparkle(0.8, 109, 1.7),
            sparkBR: sparkle(0.86, 110, 1.9),
        },
    },
    // #20 impact: each top cluster's big heart pops and then beats, its small hearts spring out of it and
    // float, the side hearts drift in from their edges and bob, the bottom hearts pop and beat slower, and
    // the sparkles pop and twinkle
    hearts: {
        whole: { entrance: { kind: 'split' }, ambient: [{ kind: 'shimmer', strength: 0.4 }] },
        layers: {
            beatTL: heartBeat(0.05, 1.1),
            heartsTL: {
                entrance: { kind: 'pop', delay: 0.22, from: 0.3 },
                ambient: [{ kind: 'drift', dy: -4, period: 3.4 }],
            },
            sparklesTL: { entrance: { kind: 'pop', delay: 0.4 }, ambient: dotTwinkle(91, 1.5, 0.7) },
            beatTR: heartBeat(0.12, 1.1),
            heartsTR: {
                entrance: { kind: 'pop', delay: 0.29, from: 0.3 },
                ambient: [{ kind: 'drift', dy: -4, period: 4 }],
            },
            sparklesTR: { entrance: { kind: 'pop', delay: 0.47 }, ambient: dotTwinkle(92, 1.7, 0.7) },
            sideL: {
                entrance: { kind: 'slide', from: 'left', delay: 0.3 },
                ambient: [{ kind: 'drift', dy: -6, period: 4.4 }],
            },
            sideR: {
                entrance: { kind: 'slide', from: 'right', delay: 0.38 },
                ambient: [{ kind: 'drift', dy: 6, period: 5.4 }],
            },
            sideSparkles: { entrance: { kind: 'pop', delay: 0.65 }, ambient: dotTwinkle(93, 1.6, 0.7) },
            bottomL: heartBeat(0.45, 1.7),
            bottomR: heartBeat(0.53, 1.7),
            bottomSparkles: { entrance: { kind: 'pop', delay: 0.75 }, ambient: dotTwinkle(94, 1.8, 0.7) },
        },
    },
    // #24 impact: the halo glows up and breathes (a pulse only ever grows, so its edge-cropped rim never
    // shows a cut), the moon fades in and catches a slow glint, the orbit traces down the flank, the phase
    // track types in glyph by glyph with light passing down it, and the star dust pops and twinkles
    'celestial-moon': {
        whole: { entrance: { kind: 'fade', dur: 0.8 }, ambient: [{ kind: 'shimmer', strength: 0.35 }] },
        layers: {
            halo: { entrance: { kind: 'fade', dur: 1 }, ambient: [{ kind: 'pulse', scale: 0.06, period: 3.6 }] },
            moon: {
                entrance: { kind: 'fade', delay: 0.1, dur: 0.7 },
                ambient: [{ kind: 'shimmer', strength: 0.3, angle: 35, period: 4.2 }],
            },
            orbit: { entrance: { kind: 'wipe', edge: 'top', delay: 0.35, dur: 0.6 } },
            track: {
                entrance: { kind: 'type', edge: 'top', steps: 8, delay: 0.4, dur: 0.75 },
                ambient: [{ kind: 'shimmer', strength: 0.35, angle: 90, period: 3.8 }],
            },
            dust1: sparkle(0.55, 71, 1.7),
            dust2: sparkle(0.62, 72, 2),
            dust3: sparkle(0.69, 73, 1.6),
            dust4: sparkle(0.76, 74, 1.9),
            dust5: sparkle(0.83, 75, 2.2),
            dots: { entrance: { kind: 'fade', delay: 0.6 }, ambient: dotTwinkle(76, 1.5) },
        },
    },
    // #25 impact: the ringed planet glides in and floats, the comet streaks in to its head and a glint runs
    // down its tail, the orbit arc traces in, the flank stars pop and twinkle, the constellation types down
    // point by point (its points twinkle), the moon pops and floats and the starburst pops and twinkles
    intergalactic: {
        whole: { entrance: { kind: 'fade', dur: 0.7 }, ambient: [{ kind: 'drift', dy: 6 }] },
        layers: {
            planet: {
                entrance: { kind: 'slide', from: 'right', dur: 0.8 },
                ambient: [{ kind: 'drift', dy: 6, period: 6.5 }],
            },
            comet: {
                entrance: { kind: 'wipe', edge: 'left', delay: 0.2, dur: 0.35 },
                ambient: [{ kind: 'shimmer', strength: 0.55, angle: 26, period: 2.8 }],
            },
            orbit: { entrance: { kind: 'wipe', edge: 'left', delay: 0.3, dur: 0.5 } },
            starL: { entrance: { kind: 'pop', delay: 0.45 }, ambient: starTwinkle(51, 1.7, 0.6) },
            starR: { entrance: { kind: 'pop', delay: 0.55 }, ambient: starTwinkle(52, 2.2, 0.6) },
            constellationLine: { entrance: { kind: 'type', edge: 'top', steps: 5, delay: 0.5, dur: 0.6 } },
            constellationStars: {
                entrance: { kind: 'type', edge: 'top', steps: 5, delay: 0.5, dur: 0.6 },
                ambient: dotTwinkle(53, 1.5, 0.5),
            },
            moon: { entrance: { kind: 'pop', delay: 0.65 }, ambient: [{ kind: 'drift', dy: -4, period: 4.8 }] },
            burstStar: { entrance: { kind: 'pop', delay: 0.75 }, ambient: starTwinkle(55, 2.4, 0.45) },
            burstDots: { entrance: { kind: 'pop', delay: 0.85 }, ambient: dotTwinkle(54, 1.6) },
        },
    },
    // #29 impact: each corner rainbow springs out of its corner (pivot on the corner, so the cropped bands
    // never show a cut) and sheens outward, its end clouds puff out from the canvas edges and drift along
    // them, the sun pops and glows with its rays slowly turning, and the loose clouds puff in and float
    rainbows: {
        whole: { entrance: { kind: 'split' }, ambient: [{ kind: 'shimmer', strength: 0.4 }] },
        layers: {
            arcTL: {
                entrance: { kind: 'pop', from: 0.5, dur: 0.6 },
                ambient: [{ kind: 'shimmer', strength: 0.35, angle: 45, period: 3.6 }],
            },
            cloudTLTop: cloudPuff(0.35, { dx: 5 }, 5),
            cloudTLSide: cloudPuff(0.42, { dy: 5 }, 7),
            sunDisc: {
                entrance: { kind: 'pop', delay: 0.2 },
                ambient: [{ kind: 'pulse', scale: 0.05, glow: 0.15, period: 2.6 }],
            },
            // 10 rays: a 36° turn per loop
            sunRays: { entrance: { kind: 'pop', delay: 0.28 }, ambient: [{ kind: 'spin', deg: 36, period: 7 }] },
            arcBR: {
                entrance: { kind: 'pop', delay: 0.15, from: 0.5, dur: 0.6 },
                ambient: [{ kind: 'shimmer', strength: 0.35, angle: 225, period: 3.6 }],
            },
            cloudBRBottom: cloudPuff(0.5, { dx: -5 }, 6),
            cloudBRSide: cloudPuff(0.57, { dy: -5 }, 8),
            cloudBL: cloudPuff(0.62, { dx: 6 }, 4.5),
            cloudSideL: cloudPuff(0.68, { dx: 6 }, 5.5),
            cloudSideR: cloudPuff(0.74, { dx: -6 }, 6.5),
        },
    },
    // #30 impact: the rainbow arch forms from both ends (corner sweep) and sheens, its clouds and the dream
    // cloud puff in and drift, the dream star pops and twinkles, the unicorn springs up from its cloud and
    // bobs, and its horn tip sparkles (riding the same bob)
    unicorns: {
        whole: { entrance: { kind: 'split' }, ambient: [{ kind: 'shimmer', strength: 0.45 }] },
        layers: {
            arch: {
                entrance: { kind: 'wipe', edge: 'tl', dur: 0.55 },
                ambient: [{ kind: 'shimmer', strength: 0.4, angle: 45, period: 3.4 }],
            },
            archCloudTop: cloudPuff(0.3, { dx: 5 }, 5),
            archCloudLeft: cloudPuff(0.4, { dy: 5 }, 6.5),
            dreamCloud: cloudPuff(0.15, { dx: -5 }, 5.8),
            dreamStar: { entrance: { kind: 'pop', delay: 0.35 }, ambient: starTwinkle(61, 1.9) },
            unicorn: mascotFloat,
            hornSparkle: {
                // Lights up once the mascot's spring has settled (it would sit off the horn during the
                // overshoot); it rides the same bob, 0.2 s out of phase (under 2 px)
                entrance: { kind: 'pop', delay: 0.95, dur: 0.3 },
                ambient: [{ kind: 'twinkle', seed: 62, depth: 0.55, scale: 0.2, period: 1.4 }, ...mascotBob],
            },
            unicornFace: mascotFloat,
        },
    },
    // #33 impact: the card border draws on corner to corner (outer from the top-left, the dashed inner from
    // the bottom-right) and a gold glint sweeps it; the corner medallions pop clockwise and their sunbursts
    // light up and twinkle; the top / bottom filigree opens from its centre and glows
    'mystic-tarot': {
        whole: { entrance: { kind: 'split', dur: 0.8 }, ambient: [{ kind: 'shimmer', strength: 0.5 }] },
        layers: {
            border: {
                entrance: { kind: 'wipe', edge: 'tl', dur: 0.7 },
                ambient: [{ kind: 'shimmer', strength: 0.4, angle: 60, period: 4.2 }],
            },
            borderDash: { entrance: { kind: 'wipe', edge: 'br', delay: 0.1, dur: 0.7 } },
            discTL: { entrance: { kind: 'pop', delay: 0.4 } },
            sunTL: tarotSun(0.48, 121),
            discTR: { entrance: { kind: 'pop', delay: 0.5 } },
            sunTR: tarotSun(0.58, 122),
            discBR: { entrance: { kind: 'pop', delay: 0.6 } },
            sunBR: tarotSun(0.68, 123),
            discBL: { entrance: { kind: 'pop', delay: 0.7 } },
            sunBL: tarotSun(0.78, 124),
            ornamentTop: filigree(0.55),
            ornamentBottom: filigree(0.65),
        },
    },
};
