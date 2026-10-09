import type { FrameMotionRegistry } from './index';
import type { LayerMotion } from '../types';

/** One VHS on-screen-display block: types on left to right, then glitches once in a while. */
const osd = (delay: number, seed: number): LayerMotion => ({
    entrance: { kind: 'type', edge: 'left', steps: 8, delay, dur: 0.3 },
    ambient: [{ kind: 'glitch', seed, amount: 0.55, bursts: 1, period: 2.8 }],
});

/** Retro frames. */
export const RETRO_MOTION: FrameMotionRegistry = {
    // #5 impact: tape engages (tracking glitches in), the OSD types on corner by corner, REC blinks, the
    // tracking lines roll down the screen and each OSD block hiccups with its own rare glitch burst
    'vhs-glitch': {
        intro: true,
        whole: {
            entrance: { kind: 'glitch-in', seed: 4 },
            ambient: [{ kind: 'glitch', seed: 4, amount: 0.7, bursts: 2 }],
        },
        layers: {
            osdTL: osd(0.12, 31),
            recDot: {
                entrance: { kind: 'flicker-on', seed: 5, delay: 0.3, dur: 0.3 },
                ambient: [{ kind: 'blink', period: 1.6 }],
            },
            osdTR: osd(0.2, 32),
            osdBL: osd(0.28, 33),
            osdBR: osd(0.36, 34),
            tracking: {
                entrance: { kind: 'glitch-in', seed: 6, dur: 0.4 },
                ambient: [{ kind: 'scroll', dy: 1920, period: 3 }],
            },
        },
    },
    // #9 impact: the rails slide in, the sprockets run through the gate (whole 80px holes per loop, so the
    // video ends on the static design) and the edge labels type on
    'film-strip': {
        whole: {
            entrance: { kind: 'split', dur: 0.6 },
            ambient: [{ kind: 'flicker', seed: 21, depth: 0.12, glow: 0.12, bursts: 3 }],
        },
        layers: {
            railL: { entrance: { kind: 'slide', from: 'left', dur: 0.5 } },
            railR: { entrance: { kind: 'slide', from: 'right', dur: 0.5 } },
            sprockets: {
                entrance: { kind: 'wipe', edge: 'top', delay: 0.15, dur: 0.45 },
                ambient: [{ kind: 'scroll', dy: 80, period: 0.5 }],
            },
            labels: { entrance: { kind: 'type', edge: 'bottom', steps: 12, delay: 0.4, dur: 0.5 } },
        },
    },
    // #23 impact: the horizon lasers extend from the centre, the grid rays shoot down from the vanishing
    // point and the side rails draw down; the triangles ignite like neon. Ambient: a light pulse runs down
    // the grid towards the viewer and down the rails, and the triangles breathe a soft glow
    synthwave: {
        whole: { entrance: { kind: 'wipe', edge: 'bottom' }, ambient: [{ kind: 'shimmer', strength: 0.45 }] },
        layers: {
            horizon: { entrance: { kind: 'wipe', edge: 'center', dur: 0.5 } },
            grid: {
                entrance: { kind: 'wipe', edge: 'top', delay: 0.15, dur: 0.4 },
                ambient: [{ kind: 'shimmer', strength: 0.45, angle: 90, period: 2.4 }],
            },
            railL: {
                entrance: { kind: 'wipe', edge: 'top', delay: 0.2, dur: 0.7 },
                ambient: [{ kind: 'shimmer', strength: 0.55, angle: 90, period: 3.6 }],
            },
            railR: {
                entrance: { kind: 'wipe', edge: 'top', delay: 0.26, dur: 0.7 },
                ambient: [{ kind: 'shimmer', strength: 0.55, angle: 90, period: 3.6 }],
            },
            triL: {
                entrance: { kind: 'flicker-on', seed: 23, delay: 0.4, dur: 0.5 },
                ambient: [{ kind: 'pulse', scale: 0.04, glow: 0.22, period: 2.4 }],
            },
            triR: {
                entrance: { kind: 'flicker-on', seed: 24, delay: 0.5, dur: 0.5 },
                ambient: [{ kind: 'pulse', scale: 0.04, glow: 0.22, period: 2.4 }],
            },
        },
    },
    // #34 impact: a print run: the registration crosses pop on corner by corner, the ink swatches print
    // swatch by swatch, then the cyan plate lands and the pink plate lands on top. Ambient: the two plates
    // wobble against each other (misregistration); everything else holds still
    risograph: {
        whole: { entrance: { kind: 'wipe', edge: 'tl', dur: 0.6 } },
        layers: {
            markTL: { entrance: { kind: 'pop', delay: 0 } },
            markTR: { entrance: { kind: 'pop', delay: 0.06 } },
            markBR: { entrance: { kind: 'pop', delay: 0.12 } },
            markBL: { entrance: { kind: 'pop', delay: 0.18 } },
            barL: { entrance: { kind: 'type', edge: 'top', steps: 4, delay: 0.25, dur: 0.4 } },
            barR: { entrance: { kind: 'type', edge: 'top', steps: 4, delay: 0.32, dur: 0.4 } },
            plateC: {
                entrance: { kind: 'wipe', edge: 'tl', delay: 0.3, dur: 0.55 },
                ambient: [{ kind: 'drift', dx: 2.5, dy: 1.5, period: 3.6 }],
            },
            plateP: {
                entrance: { kind: 'wipe', edge: 'tl', delay: 0.42, dur: 0.55 },
                ambient: [{ kind: 'drift', dx: -2.5, dy: -1.5, period: 3.6 }],
            },
        },
    },
    // #35 impact: the print develops (border fades up), the chin rule draws across, the mounting tabs
    // press onto the corners clockwise and the signature line is drawn. Ambient: one faint gloss glint
    // across the print per loop
    'instant-film': {
        whole: { entrance: { kind: 'fade', dur: 0.6 } },
        layers: {
            border: {
                entrance: { kind: 'fade', dur: 0.7 },
                ambient: [{ kind: 'shimmer', strength: 0.3, angle: 60, period: 4.5 }],
            },
            chin: { entrance: { kind: 'wipe', edge: 'left', delay: 0.3, dur: 0.4 } },
            tabTL: { entrance: { kind: 'pop', from: 0.4, delay: 0.4, dur: 0.4 } },
            tabTR: { entrance: { kind: 'pop', from: 0.4, delay: 0.48, dur: 0.4 } },
            tabBR: { entrance: { kind: 'pop', from: 0.4, delay: 0.56, dur: 0.4 } },
            tabBL: { entrance: { kind: 'pop', from: 0.4, delay: 0.64, dur: 0.4 } },
            sign: { entrance: { kind: 'wipe', edge: 'left', delay: 0.8, dur: 0.4 } },
        },
    },
};
