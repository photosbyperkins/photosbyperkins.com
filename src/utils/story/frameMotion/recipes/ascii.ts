import type { FrameMotionRegistry } from './index';
import type { AmbientSpec, LayerMotion } from '../types';

/** One code-rain column: types in top-down, then scrolls down by one canvas height per `period` seconds. */
const rain = (delay: number, period: number): LayerMotion => ({
    entrance: { kind: 'type', edge: 'top', steps: 16, delay, dur: 0.7 },
    ambient: [{ kind: 'scroll', dy: 1920, period }],
});

/** A line of text typed out left to right, roughly one character per step. */
const typed = (steps: number, delay: number, dur: number, ambient?: AmbientSpec[]): LayerMotion => ({
    entrance: { kind: 'type', edge: 'left', steps, delay, dur },
    ...(ambient ? { ambient } : {}),
});

/** Terminal chrome: a faint, rare phosphor flicker. */
const crt = (seed: number): AmbientSpec[] => [{ kind: 'flicker', seed, depth: 0.15, glow: 0.15, bursts: 1, period: 2.8 }];
/** Terminal side rails: a slow refresh scan band travelling down the screen. */
const scan: AmbientSpec[] = [{ kind: 'shimmer', strength: 0.3, angle: 90, period: 3.4 }];

/** BBS shading row: printed at modem speed, then an ANSI colour-cycle sweep (rows staggered by their delays). */
const bbsRow = (delay: number): LayerMotion =>
    typed(24, delay, 0.35, [{ kind: 'shimmer', strength: 0.4, angle: 0, period: 3.4 }]);
/** BBS side column: printed top-down, then a slow vertical colour sweep. */
const bbsColumn = (delay: number): LayerMotion => ({
    entrance: { kind: 'type', edge: 'top', steps: 26, delay, dur: 0.55 },
    ambient: [{ kind: 'shimmer', strength: 0.35, angle: 90, period: 4.6 }],
});

/** Kaomoji pieces all pop in (bouncy), then each has its own idle. */
const kaoPop = (delay: number) => ({ kind: 'pop', from: 0.4, delay, dur: 0.45 }) as const;
/** Emoticon face: gentle vertical bob. */
const bob = (delay: number, dy: number, period: number): LayerMotion => ({
    entrance: kaoPop(delay),
    ambient: [{ kind: 'drift', dy, period }],
});
/** Heart(s): heartbeat pulse. */
const beat = (delay: number, scale: number, period: number): LayerMotion => ({
    entrance: kaoPop(delay),
    ambient: [{ kind: 'pulse', scale, period }],
});
/** Sparkle glyph: twinkle. */
const sparkle = (delay: number, seed: number): LayerMotion => ({
    entrance: kaoPop(delay),
    ambient: [{ kind: 'twinkle', seed, depth: 0.6, period: 1.6 }],
});

/** Star bucket: fades in, then twinkles as a scattered group (opacity only, no contraction). */
const stars = (delay: number, seed: number, period: number): LayerMotion => ({
    entrance: { kind: 'fade', delay, dur: 0.6 },
    ambient: [{ kind: 'twinkle', seed, depth: 0.5, scale: 0, period }],
});

/** Skate lane markers: draw down, then stream past by one full column (1200px, an exact repeat). */
const lane = (delay: number): LayerMotion => ({
    entrance: { kind: 'type', edge: 'top', steps: 20, delay, dur: 0.55 },
    ambient: [{ kind: 'scroll', dy: 1200, period: 7 }],
});

/** ASCII frames. */
export const ASCII_MOTION: FrameMotionRegistry = {
    // #4 impact: columns type in (outer first), then the code rain falls and wraps for the whole video.
    // Two speeds (fitted to whole wraps, so the last frame is the static design) give a little parallax.
    'ascii-matrix': {
        intro: true,
        whole: {
            entrance: { kind: 'type', edge: 'top', steps: 16 },
            ambient: [{ kind: 'flicker', seed: 42, depth: 0.15, glow: 0.3, bursts: 3 }],
        },
        layers: {
            col0: rain(0, 3.5),
            col1: rain(0.1, 5),
            col2: rain(0.2, 3.5),
            col3: rain(0.25, 5),
            col4: rain(0.15, 3.5),
            col5: rain(0.05, 5),
        },
    },
    // #15 boot-up: the window fades on and its chrome types itself out (top bar across, rails down, bottom
    // bar across), then the command types character by character and the status line blinks like a live
    // cursor. Afterwards the chrome holds a faint CRT flicker and the rails carry a slow refresh scan.
    'ascii-terminal': {
        whole: {
            entrance: { kind: 'type', edge: 'top', steps: 14 },
            ambient: [{ kind: 'flicker', seed: 3, depth: 0.15, glow: 0.15 }],
        },
        layers: {
            border: { entrance: { kind: 'fade', dur: 0.4 } },
            barTop: typed(20, 0, 0.4, crt(3)),
            barBottom: typed(20, 0.45, 0.4, crt(4)),
            sideL: { entrance: { kind: 'type', edge: 'top', steps: 24, delay: 0.12, dur: 0.5 }, ambient: scan },
            sideR: { entrance: { kind: 'type', edge: 'top', steps: 24, delay: 0.12, dur: 0.5 }, ambient: scan },
            path: typed(14, 0.3, 0.35),
            prompt: typed(27, 0.55, 0.5),
            status: typed(14, 1.0, 0.22, [{ kind: 'blink', depth: 0.45, period: 1.1 }]),
        },
    },
    // #18 night sky: four scattered star groups fade in one after another, then twinkle out of step
    // (opacity only); the comet streaks on tail-first and hovers forward with a gleam running to its head.
    'ascii-starfield': {
        whole: { entrance: { kind: 'fade', dur: 0.7 }, ambient: [{ kind: 'shimmer', strength: 0.35 }] },
        layers: {
            stars0: stars(0, 31, 1.5),
            stars1: stars(0.12, 32, 2.1),
            stars2: stars(0.24, 33, 2.8),
            stars3: stars(0.36, 34, 3.6),
            comet: {
                entrance: { kind: 'wipe', edge: 'left', delay: 0.5, dur: 0.45 },
                ambient: [
                    { kind: 'drift', dx: 8, dy: -3, period: 4.5 },
                    { kind: 'shimmer', strength: 0.4, angle: 0, period: 2.6 },
                ],
            },
        },
    },
    // #27 rolling in: the skate rolls in from the left and skids to a stop (slide overshoot), its speed
    // lines whoosh in behind it, the track arrows type out in their own directions and the lane markers
    // draw down, then stream past for the rest of the video; the score ticker loads last.
    'ascii-skate': {
        whole: { entrance: { kind: 'type', edge: 'top', steps: 14 }, ambient: [{ kind: 'shimmer', strength: 0.35 }] },
        layers: {
            skate: { entrance: { kind: 'slide', from: 'left', dur: 0.7 }, ambient: [{ kind: 'drift', dx: 4, period: 2.2 }] },
            speed: {
                entrance: { kind: 'wipe', edge: 'left', delay: 0.45, dur: 0.3 },
                ambient: [{ kind: 'drift', dx: 6, period: 1.5 }],
            },
            arrowL: typed(11, 0.1, 0.4, [{ kind: 'shimmer', strength: 0.45, angle: 0, period: 2.4 }]),
            arrowR: {
                entrance: { kind: 'type', edge: 'right', steps: 10, delay: 0.2, dur: 0.4 },
                ambient: [{ kind: 'shimmer', strength: 0.45, angle: 180, period: 2.4 }],
            },
            laneL: lane(0.25),
            laneR: lane(0.3),
            ticker: typed(10, 0.75, 0.4, [{ kind: 'pulse', scale: 0, glow: 0.25, period: 1.6 }]),
        },
    },
    // #28 dial-up: the screen prints like a 14.4k modem: shading rows type across top-down, the side
    // columns print down, CONNECT types out and glows, then the bottom rows; the rows keep an ANSI
    // colour-cycle sweep (staggered, so it ripples) and the columns a slower vertical one.
    'ascii-bbs': {
        whole: { entrance: { kind: 'type', edge: 'top', steps: 16 }, ambient: [{ kind: 'shimmer', strength: 0.4 }] },
        layers: {
            topA: bbsRow(0),
            topB: bbsRow(0.08),
            topC: bbsRow(0.16),
            colL: bbsColumn(0.25),
            colR: bbsColumn(0.25),
            connect: typed(21, 0.55, 0.45, [{ kind: 'pulse', scale: 0.03, glow: 0.3, period: 2.4 }]),
            botC: bbsRow(0.7),
            botB: bbsRow(0.78),
            botA: bbsRow(0.86),
        },
    },
    // #31 candy pop: every emoticon, heart and sparkle pops in on its own, top to bottom zig-zagging
    // between the sides; then faces bob, hearts beat and sparkles twinkle, each on its own clock.
    'ascii-kaomoji': {
        whole: { entrance: { kind: 'type', edge: 'top', steps: 10 } },
        layers: {
            tlFace: bob(0, -6, 2.6),
            trFace: bob(0.05, -6, 3.4),
            tlHearts: beat(0.1, 0.05, 1.3),
            trHearts: beat(0.15, 0.05, 1.8),
            l1: beat(0.2, 0.1, 1.1),
            r1: beat(0.25, 0.1, 1.5),
            l2: sparkle(0.3, 41),
            r2: sparkle(0.35, 42),
            l3: bob(0.4, -4, 3),
            r3: bob(0.45, -4, 4.2),
            l4: beat(0.5, 0.1, 1.4),
            r4: beat(0.55, 0.1, 1.2),
            blFace: bob(0.6, -5, 2.4),
            brFace: bob(0.65, -5, 2),
            blHearts: beat(0.7, 0.05, 1.25),
            brGG: { entrance: kaoPop(0.75), ambient: [{ kind: 'twinkle', seed: 43, depth: 0.4, scale: 0, period: 2.2 }] },
        },
    },
};
