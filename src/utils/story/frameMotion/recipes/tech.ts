import type { FrameMotionRegistry } from './index';

/** Tech frames. */
export const TECH_MOTION: FrameMotionRegistry = {
    // #3 impact: a TV graphics package building on: brackets frame the shot, the bugs slide in, the LIVE
    // dot lights and blinks (slow soft fade, ending on), and the lower thirds type on. Everything else holds still.
    'broadcast-live': {
        whole: { entrance: { kind: 'split', dur: 0.6 }, ambient: [{ kind: 'shimmer', strength: 0.35 }] },
        layers: {
            bracketTL: { entrance: { kind: 'wipe', edge: 'tl', dur: 0.32 } },
            bracketTR: { entrance: { kind: 'wipe', edge: 'tr', delay: 0.04, dur: 0.32 } },
            bracketBL: { entrance: { kind: 'wipe', edge: 'bl', delay: 0.08, dur: 0.32 } },
            bracketBR: { entrance: { kind: 'wipe', edge: 'br', delay: 0.12, dur: 0.32 } },
            camPill: { entrance: { kind: 'slide', from: 'left', delay: 0.18 } },
            livePill: {
                entrance: { kind: 'slide', from: 'right', delay: 0.26 },
                ambient: [{ kind: 'shimmer', strength: 0.3, period: 3.5 }],
            },
            liveDot: {
                entrance: { kind: 'flicker-on', seed: 4, delay: 0.85, dur: 0.3 },
                ambient: [{ kind: 'blink', period: 1.6 }],
            },
            lowerL: { entrance: { kind: 'type', edge: 'left', steps: 14, delay: 0.5, dur: 0.45 } },
            lowerR: { entrance: { kind: 'type', edge: 'left', steps: 17, delay: 0.62, dur: 0.5 } },
        },
    },
    // #11 impact: the viewfinder locks on (all four brackets converge on the shot from just outside and
    // settle), REC lights and the readouts type on. Ambient: REC blinks (slow soft fade, ending on), the side
    // crosshairs breathe and the telemetry/status text refreshes with a rare flicker
    'cyber-hud': {
        whole: {
            entrance: { kind: 'split', dur: 0.6 },
            ambient: [{ kind: 'flicker', seed: 2, depth: 0.25, glow: 0.2 }],
        },
        layers: {
            bracketTL: { entrance: { kind: 'pop', from: 1.08, dur: 0.45 } },
            bracketTR: { entrance: { kind: 'pop', from: 1.08, delay: 0.04, dur: 0.45 } },
            bracketBL: { entrance: { kind: 'pop', from: 1.08, delay: 0.08, dur: 0.45 } },
            bracketBR: { entrance: { kind: 'pop', from: 1.08, delay: 0.12, dur: 0.45 } },
            recDot: {
                entrance: { kind: 'flicker-on', seed: 11, delay: 0.3, dur: 0.3 },
                ambient: [{ kind: 'blink', period: 1.6 }],
            },
            recText: { entrance: { kind: 'type', edge: 'left', steps: 6, delay: 0.36, dur: 0.3 } },
            telemetry: {
                entrance: { kind: 'type', edge: 'left', steps: 12, delay: 0.42, dur: 0.4 },
                ambient: [{ kind: 'flicker', seed: 12, depth: 0.35, glow: 0.2, bursts: 1, period: 3.4 }],
            },
            crossL: {
                entrance: { kind: 'pop', delay: 0.5 },
                ambient: [{ kind: 'pulse', scale: 0.12, period: 2 }],
            },
            crossR: {
                entrance: { kind: 'pop', delay: 0.56 },
                ambient: [{ kind: 'pulse', scale: 0.12, period: 2 }],
            },
            readoutL: {
                entrance: { kind: 'type', edge: 'left', steps: 11, delay: 0.62, dur: 0.4 },
                ambient: [{ kind: 'flicker', seed: 13, depth: 0.35, glow: 0.2, bursts: 1, period: 4.4 }],
            },
            readoutR: {
                entrance: { kind: 'type', edge: 'left', steps: 11, delay: 0.7, dur: 0.4 },
                ambient: [{ kind: 'flicker', seed: 14, depth: 0.35, glow: 0.2, bursts: 1, period: 4.4 }],
            },
        },
    },
    // #19 impact: the goggles warm up: the compass tape draws out from its centre and its ticks stutter on,
    // the reticle closes in on the centre, the elevation ladders light rung by rung and the telemetry types
    // on. Ambient: the compass tape pans slowly either side of the fixed lubber tick (whole 50px ticks, ending on
    // the static design) and the ladders / telemetry get rare NVG gain flickers
    'night-vision': {
        whole: {
            entrance: { kind: 'flicker-on', seed: 6 },
            ambient: [{ kind: 'flicker', seed: 6, depth: 0.3, glow: 0.25 }],
        },
        layers: {
            compassLine: { entrance: { kind: 'wipe', edge: 'center', dur: 0.4 } },
            // Both tick halves need identical entrance timing and scroll so their wrapped copies line up
            ticksL: {
                entrance: { kind: 'flicker-on', seed: 61, delay: 0.15, dur: 0.4 },
                ambient: [{ kind: 'scroll', dx: 50, period: 2.8 }],
            },
            ticksR: {
                entrance: { kind: 'flicker-on', seed: 62, delay: 0.15, dur: 0.4 },
                ambient: [{ kind: 'scroll', dx: 50, period: 2.8 }],
            },
            lubber: { entrance: { kind: 'wipe', edge: 'top', delay: 0.3, dur: 0.2 } },
            heading: { entrance: { kind: 'type', edge: 'left', steps: 7, delay: 0.35, dur: 0.35 } },
            reticle: { entrance: { kind: 'pop', from: 1.6, delay: 0.45, dur: 0.5 } },
            ladderL: {
                entrance: { kind: 'type', edge: 'top', steps: 5, delay: 0.3, dur: 0.4 },
                ambient: [{ kind: 'flicker', seed: 63, depth: 0.3, glow: 0.25, bursts: 1, period: 3 }],
            },
            ladderR: {
                entrance: { kind: 'type', edge: 'top', steps: 5, delay: 0.36, dur: 0.4 },
                ambient: [{ kind: 'flicker', seed: 64, depth: 0.3, glow: 0.25, bursts: 1, period: 3 }],
            },
            telemetryL: {
                entrance: { kind: 'type', edge: 'left', steps: 12, delay: 0.6, dur: 0.4 },
                ambient: [{ kind: 'flicker', seed: 65, depth: 0.3, glow: 0.2, bursts: 1, period: 4.4 }],
            },
            telemetryR: {
                entrance: { kind: 'type', edge: 'left', steps: 12, delay: 0.7, dur: 0.4 },
                ambient: [{ kind: 'flicker', seed: 66, depth: 0.3, glow: 0.2, bursts: 1, period: 4.4 }],
            },
        },
    },
    // #32 impact: deliberately quiet: the EVF overlay just sits there like a real viewfinder, and the only
    // motion is the low-battery bar blinking its warning. (No whole-frame fallback motion: a blinking HUD
    // would be far louder than the one blinking bar.)
    'through-the-lens': {
        whole: {},
        layers: {
            afTL: {},
            afTR: {},
            afBL: {},
            afBR: {},
            ladderTop: {},
            ladderMark: {},
            ladderBottom: {},
            bar: {},
            speed: {},
            aperture: {},
            iso: {},
            focal: {},
            info: {},
            batteryShell: {},
            batteryCells: { ambient: [{ kind: 'blink', period: 1.2 }] },
        },
    },
};
