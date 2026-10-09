import type { FrameMotionRegistry } from './index';
import type { AmbientSpec, LayerMotion } from '../types';

/** A jammer star: pops in, then breathes about its centre with a soft glow. */
const jammerStar = (delay: number, period: number): LayerMotion => ({
    entrance: { kind: 'pop', delay },
    ambient: [{ kind: 'pulse', scale: 0.08, glow: 0.15, period }],
});
/** A dashed rule: wipes in, then marches by one 16+8 dash period per loop inside its own extent. */
const marchingDash = (delay: number): LayerMotion => ({
    entrance: { kind: 'wipe', edge: 'left', delay, dur: 0.35 },
    ambient: [{ kind: 'scroll', dx: 24, period: 0.6 }],
});
/** Track hashes: tick on row by row (9 rows), then a highlight sweeps down them. */
const trackHashes = (delay: number): LayerMotion => ({
    entrance: { kind: 'type', edge: 'top', steps: 9, delay, dur: 0.45 },
    ambient: [{ kind: 'shimmer', strength: 0.5, angle: 90, period: 2.6 }],
});
/** One referee chevron: its three stripes whip in from their edge one after another, then glint inwards. */
const zebraStripes = (prefix: string, from: 'left' | 'right', delay: number): Record<string, LayerMotion> =>
    Object.fromEntries(
        [0, 1, 2].map((i): [string, LayerMotion] => [
            `${prefix}${i}`,
            {
                entrance: { kind: 'slide', from, delay: delay + i * 0.06, dur: 0.55 },
                ambient: [{ kind: 'shimmer', strength: 0.3, angle: from === 'left' ? 0 : 180, period: 3.4 }],
            },
        ])
    );
/** Helmet cover (jammer star / pivot stripe): pops onto its crest, then breathes with a soft glow. */
const helmetCover = (delay: number, axis: 'both' | 'y'): LayerMotion => ({
    entrance: { kind: 'pop', delay, dur: 0.45 },
    ambient: [{ kind: 'pulse', axis, scale: 0.08, glow: 0.15, period: 1.8 }],
});
/** Ransom-note letter: slapped down onto the scrap. */
const ransomTile = (delay: number): LayerMotion => ({ entrance: { kind: 'pop', from: 0.3, delay, dur: 0.4 } });
/** Spray drip: runs down from the top edge, then oozes (y-only pulse about the top-edge pivot). */
const sprayDrip = (delay: number, dur: number, period: number): LayerMotion => ({
    entrance: { kind: 'wipe', edge: 'top', delay, dur },
    ambient: [{ kind: 'pulse', axis: 'y', scale: 0.04, period }],
});
/** Xerox tear shared by the battle patch and its button (same spec + same start → identical bursts). */
const patchGlitch: AmbientSpec = { kind: 'glitch', seed: 11, amount: 0.45, bursts: 1, period: 3.2 };

/** Derby frames. */
export const DERBY_MOTION: FrameMotionRegistry = {
    // #7 impact (team heritage): brackets frame the shot, the stars pop and breathe, the rules wipe in
    // (the dashes then march), and the bear charges in from the right with a gold glint
    'sac-bear': {
        whole: { entrance: { kind: 'split' }, ambient: [{ kind: 'shimmer', strength: 0.45 }] },
        layers: {
            bracketTL: { entrance: { kind: 'wipe', edge: 'tl', dur: 0.3 } },
            bracketTR: { entrance: { kind: 'wipe', edge: 'tr', delay: 0.04, dur: 0.3 } },
            bracketBL: { entrance: { kind: 'wipe', edge: 'bl', delay: 0.08, dur: 0.3 } },
            bracketBR: { entrance: { kind: 'wipe', edge: 'br', delay: 0.12, dur: 0.3 } },
            starL: jammerStar(0.12, 1.8),
            starR: jammerStar(0.2, 1.8),
            topLineL: marchingDash(0.3),
            topLineR: marchingDash(0.34),
            bottomLines: { entrance: { kind: 'wipe', edge: 'left', delay: 0.35, dur: 0.4 } },
            bear: {
                entrance: { kind: 'slide', from: 'right', delay: 0.45 },
                ambient: [{ kind: 'shimmer', strength: 0.45, period: 3 }],
            },
        },
    },
    // #6 impact: jammer stars pop and breathe, the track hashes tick down like a skater passing them,
    // the skate rolls in from the left and idles, the checkered flag slides in and glints
    'derby-quads': {
        whole: { entrance: { kind: 'split' }, ambient: [{ kind: 'shimmer', strength: 0.45 }] },
        layers: {
            starL: jammerStar(0.05, 1.6),
            starR: jammerStar(0.12, 1.6),
            connector: { entrance: { kind: 'wipe', edge: 'left', delay: 0.22, dur: 0.4 } },
            hashesL: trackHashes(0.2),
            hashesR: trackHashes(0.26),
            skate: {
                entrance: { kind: 'slide', from: 'left', delay: 0.45 },
                ambient: [{ kind: 'drift', dx: 6, period: 2 }],
            },
            flag: {
                entrance: { kind: 'slide', from: 'right', delay: 0.55 },
                ambient: [{ kind: 'shimmer', strength: 0.4, period: 2.4 }],
            },
        },
    },
    // #22 impact: the zebra stripes whip in from their edges one by one, the brackets frame the shot, the
    // whistle pops up and blasts (the arcs swell out of the mouthpiece and fade), the penalty clock types on
    'ref-zebra': {
        whole: { entrance: { kind: 'split' }, ambient: [{ kind: 'shimmer', strength: 0.4 }] },
        layers: {
            ...zebraStripes('stripesTL', 'left', 0),
            ...zebraStripes('stripesTR', 'right', 0.04),
            ...zebraStripes('stripesBL', 'left', 0.2),
            ...zebraStripes('stripesBR', 'right', 0.24),
            whistle: { entrance: { kind: 'pop', delay: 0.42, dur: 0.45 } },
            whistleBlast: {
                entrance: { kind: 'wipe', edge: 'left', delay: 0.72, dur: 0.3 },
                ambient: [{ kind: 'twinkle', seed: 41, depth: 0.65, scale: -0.2, period: 1.3 }],
            },
            penalty: { entrance: { kind: 'type', edge: 'left', steps: 12, delay: 0.55, dur: 0.5 } },
            bracketTL: { entrance: { kind: 'wipe', edge: 'tl', delay: 0.3, dur: 0.3 } },
            bracketTR: { entrance: { kind: 'wipe', edge: 'tr', delay: 0.34, dur: 0.3 } },
            bracketBL: { entrance: { kind: 'wipe', edge: 'bl', delay: 0.38, dur: 0.3 } },
            bracketBR: { entrance: { kind: 'wipe', edge: 'br', delay: 0.42, dur: 0.3 } },
        },
    },
    // #21 impact: the gold brackets snap in from the corners, the helmet crests pop and their star / stripe
    // breathe, the badges land, and the track lines march counter-clockwise like the pack
    'bout-day': {
        whole: { entrance: { kind: 'split' }, ambient: [{ kind: 'shimmer', strength: 0.55 }] },
        layers: {
            bracketTL: { entrance: { kind: 'wipe', edge: 'tl', dur: 0.3 } },
            bracketTR: { entrance: { kind: 'wipe', edge: 'tr', delay: 0.04, dur: 0.3 } },
            bracketBL: { entrance: { kind: 'wipe', edge: 'bl', delay: 0.08, dur: 0.3 } },
            bracketBR: { entrance: { kind: 'wipe', edge: 'br', delay: 0.12, dur: 0.3 } },
            innerTL: { entrance: { kind: 'wipe', edge: 'tl', delay: 0.2, dur: 0.25 } },
            innerTR: { entrance: { kind: 'wipe', edge: 'tr', delay: 0.24, dur: 0.25 } },
            crestL: { entrance: { kind: 'pop', delay: 0.25, dur: 0.45 } },
            crestStar: helmetCover(0.35, 'both'),
            crestR: { entrance: { kind: 'pop', delay: 0.3, dur: 0.45 } },
            crestStripe: helmetCover(0.4, 'y'),
            badgeTop: {
                entrance: { kind: 'pop', delay: 0.5, dur: 0.45 },
                ambient: [{ kind: 'shimmer', strength: 0.5, period: 3.2 }],
            },
            badgeBottom: {
                entrance: { kind: 'slide', from: 'bottom', delay: 0.5, dur: 0.6 },
                ambient: [{ kind: 'shimmer', strength: 0.5, period: 3.2 }],
            },
            trackL: {
                entrance: { kind: 'wipe', edge: 'top', delay: 0.3, dur: 0.5 },
                ambient: [{ kind: 'scroll', dy: 40, period: 1 }],
            },
            trackR: {
                entrance: { kind: 'wipe', edge: 'bottom', delay: 0.3, dur: 0.5 },
                ambient: [{ kind: 'scroll', dy: -40, period: 1 }],
            },
        },
    },
    // #14 impact: the zine scrap tears in through xerox glitch, the ransom letters slap down one by one, the
    // spray drips run and keep oozing, the fishnet / tape / patch slide in from their edges, the tally is
    // scratched on and the skull button gets pinned; the patch and button glitch together now and then
    'derby-punk': {
        intro: true,
        whole: {
            entrance: { kind: 'glitch-in', seed: 11 },
            ambient: [{ kind: 'glitch', seed: 11, amount: 0.45, bursts: 1 }],
        },
        layers: {
            scrap: { entrance: { kind: 'glitch-in', seed: 11, dur: 0.45 } },
            tileP: ransomTile(0.3),
            tileU: ransomTile(0.37),
            tileN: ransomTile(0.44),
            tileK: ransomTile(0.51),
            dripBlack1: sprayDrip(0.1, 0.5, 2.6),
            dripBlack2: sprayDrip(0.2, 0.65, 3.6),
            dripRed1: sprayDrip(0.15, 0.55, 3.1),
            dripRed2: sprayDrip(0.28, 0.45, 4.4),
            fishnet: { entrance: { kind: 'slide', from: 'right', delay: 0.35, dur: 0.6 } },
            tally: { entrance: { kind: 'type', edge: 'left', steps: 5, delay: 0.62, dur: 0.4 } },
            crack: { entrance: { kind: 'wipe', edge: 'top', delay: 0.4, dur: 0.5 } },
            tape: { entrance: { kind: 'slide', from: 'left', delay: 0.45, dur: 0.6 } },
            // Patch and button settle at exactly 1.125s (binary-exact sums), so their ambient loops are identical
            // and the glitch bursts tear both as one
            patch: { entrance: { kind: 'slide', from: 'bottom', delay: 0.5, dur: 0.625 }, ambient: [patchGlitch] },
            badge: {
                entrance: { kind: 'pop', from: 0.4, delay: 0.875, dur: 0.25 },
                ambient: [patchGlitch, { kind: 'shimmer', strength: 0.4, angle: 45, period: 2.6 }],
            },
        },
    },
};
