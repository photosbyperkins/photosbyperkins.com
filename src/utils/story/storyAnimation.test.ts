import { describe, it, expect } from 'vitest';
import {
    cubicBezier,
    defaultPresetFor,
    FINAL_ANIM_STATE,
    getStoryFrameCount,
    getStoryLayoutKind,
    isFinalAnimState,
    panelEnterOffset,
    resolveStoryPreset,
    sampleStoryTimeline,
    STORY_VIDEO_DURATIONS,
    type StoryAnimationSpec,
    type StoryMotionPresetSetting,
} from './storyAnimation';
import { calculateNormalizedCrop, calculateFitZoom } from './storyMath';
import type { StoryRenderConfig } from './storyConstants';
import { EASE_IN_OUT, EASE_OUT_EXPO } from '../motion';

const IMG_W = 6000;
const IMG_H = 4000;

const baseConfig = (overrides: Partial<StoryRenderConfig> = {}): StoryRenderConfig => ({
    mode: 'solo',
    crop: calculateNormalizedCrop(IMG_W, IMG_H, 0.5, 0.5, 1.0),
    padded: { style: 'frosted', cardScale: 0.92, cardCornerRadius: 24, customColor: '#0a0a14' },
    badges: { showScoreboard: true, scoreboardTitle: 'A vs B', teams: ['A', 'B'], showAttribution: true },
    frameId: 'sac-bear',
    ...overrides,
});

const fit = calculateFitZoom(IMG_W, IMG_H, 0.92);
const fullConfig = baseConfig();
const paddedConfig = baseConfig({ crop: calculateNormalizedCrop(IMG_W, IMG_H, 0.5, 0.5, fit, fit) });
const duetConfig = baseConfig({
    mode: 'burst',
    burst: { dividerStyle: 'hairline', showTimeStamps: true, panelCount: 2, timeStamps: [0, 0.4] },
});
const triptychConfig = baseConfig({
    mode: 'burst',
    burst: { dividerStyle: 'gutter', showTimeStamps: false, panelCount: 3 },
});

const ctx = { imgW: IMG_W, imgH: IMG_H, subject: { cx: 0.3, cy: 0.35 } };
const PRESETS: StoryMotionPresetSetting[] = ['auto', 'ken-burns', 'float-in', 'panel-cascade', 'static-hold'];

/**
 * One frame before the end every frame entrance has settled and periodic loops are within a hair of rest.
 * Continuous scrolls may still be mid-tile (they land exactly on a whole tile at the end).
 */
function expectFrameNearRest(frame: ReturnType<typeof sampleStoryTimeline>['frame']): void {
    if (!frame) return;
    const anims = [frame.whole, ...Object.values(frame.layers ?? {})].filter((a) => a !== undefined);
    for (const a of anims) {
        expect(a.slide).toBeUndefined();
        expect(a.reveal).toBeUndefined();
        expect(a.split).toBeUndefined();
        expect(a.glitch).toBeUndefined();
        expect(a.opacity).toBeGreaterThan(0.98);
        expect(Math.abs(a.scale - 1)).toBeLessThan(0.01);
        expect(Math.abs(a.sx - 1)).toBeLessThan(0.01);
        expect(Math.abs(a.sy - 1)).toBeLessThan(0.01);
        expect(Math.abs(a.tx) + Math.abs(a.ty)).toBeLessThan(1);
        expect(a.glow ?? 0).toBeLessThan(0.02);
    }
}
const CONFIGS: [string, StoryRenderConfig][] = [
    ['full', fullConfig],
    ['padded', paddedConfig],
    ['duet', duetConfig],
    ['triptych', triptychConfig],
];

const spec = (preset: StoryMotionPresetSetting, durationS = 10): StoryAnimationSpec => ({ preset, durationS, fps: 30 });

describe('storyAnimation', () => {
    describe('cubicBezier', () => {
        it('is exact at the endpoints', () => {
            const ease = cubicBezier(EASE_OUT_EXPO);
            expect(ease(0)).toBe(0);
            expect(ease(1)).toBe(1);
            expect(ease(-1)).toBe(0);
            expect(ease(2)).toBe(1);
        });

        it('matches a linear curve and known ease values', () => {
            const linear = cubicBezier([0, 0, 1, 1]);
            for (const x of [0.1, 0.25, 0.5, 0.9]) expect(linear(x)).toBeCloseTo(x, 5);
            // Symmetric ease-in-out passes through the midpoint
            expect(cubicBezier(EASE_IN_OUT)(0.5)).toBeCloseTo(0.5, 4);
            // Expo-out front-loads progress
            expect(cubicBezier(EASE_OUT_EXPO)(0.25)).toBeGreaterThan(0.6);
        });

        it('is monotonic for the house curves', () => {
            for (const curve of [EASE_IN_OUT, EASE_OUT_EXPO]) {
                const ease = cubicBezier(curve);
                let prev = 0;
                for (let i = 1; i <= 100; i++) {
                    const v = ease(i / 100);
                    expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
                    prev = v;
                }
            }
        });
    });

    describe('layout + preset resolution', () => {
        it('classifies layouts like the renderer', () => {
            expect(getStoryLayoutKind(fullConfig)).toBe('full');
            expect(getStoryLayoutKind(paddedConfig)).toBe('padded');
            expect(getStoryLayoutKind({ ...fullConfig, mode: 'padded' })).toBe('padded');
            expect(getStoryLayoutKind(duetConfig)).toBe('burst');
            expect(getStoryLayoutKind({ ...paddedConfig, mode: 'crop' })).toBe('full');
        });

        it('picks a sensible default preset per layout', () => {
            expect(defaultPresetFor(fullConfig)).toBe('ken-burns');
            expect(defaultPresetFor(paddedConfig)).toBe('float-in');
            expect(defaultPresetFor(triptychConfig)).toBe('panel-cascade');
            expect(resolveStoryPreset('auto', duetConfig)).toBe('panel-cascade');
        });

        it('maps panel-cascade to float-in for single-photo layouts', () => {
            expect(resolveStoryPreset('panel-cascade', fullConfig)).toBe('float-in');
            expect(resolveStoryPreset('panel-cascade', paddedConfig)).toBe('float-in');
            expect(resolveStoryPreset('static-hold', fullConfig)).toBe('static-hold');
        });
    });

    describe('sampleStoryTimeline', () => {
        it.each(CONFIGS)('ends exactly on the static design for every preset (%s)', (_name, config) => {
            for (const preset of PRESETS) {
                for (const d of STORY_VIDEO_DURATIONS) {
                    const end = sampleStoryTimeline(spec(preset, d), config, d, ctx);
                    expect(end).toBe(FINAL_ANIM_STATE);
                    // Past the end stays final
                    expect(sampleStoryTimeline(spec(preset, d), config, d + 1, ctx)).toBe(FINAL_ANIM_STATE);
                    // The frame just before the end is already (deeply) at rest for overlays
                    const nearEnd = sampleStoryTimeline(spec(preset, d), config, d - 1 / 30, ctx);
                    expectFrameNearRest(nearEnd.frame);
                }
            }
        });

        it('renders standard frames at rest at t=0 and animates ambients later', () => {
            const s0 = sampleStoryTimeline(spec('static-hold'), fullConfig, 0, ctx);
            // Non-intro frames (e.g. sac-bear) start directly at rest (visible as static design)
            expect(s0.frame).toBeUndefined();
            // Badges render statically (no animation track)
            expect('scoreboard' in (s0 as Record<string, unknown>)).toBe(false);
            expect('attribution' in (s0 as Record<string, unknown>)).toBe(false);
            // static-hold never moves the camera
            expect(s0.crop).toBeUndefined();
            expect(s0.card).toBeUndefined();
            expect(s0.panels).toBeUndefined();

            // Later in the timeline, ambient animations (pulse, shimmer) are active
            const s1 = sampleStoryTimeline(spec('static-hold'), fullConfig, 1, ctx);
            expect(s1.frame?.layers).toBeDefined();
        });

        it('omits the frame track when no frame is selected', () => {
            const s = sampleStoryTimeline(spec('static-hold'), { ...fullConfig, frameId: 'none' }, 0, ctx);
            expect(s.frame).toBeUndefined();
        });

        it('stylized frames with intro play an entrance reveal', () => {
            const electricConfig = { ...fullConfig, frameId: 'electric-lightning' as const };
            const s0 = sampleStoryTimeline(spec('static-hold'), electricConfig, 0, ctx);
            // electric-lightning has intro: true, so layers start at 0 opacity
            const layers = Object.values(s0.frame?.layers ?? {});
            expect(layers.length).toBeGreaterThan(0);
            expect(layers.some((l) => l.opacity === 0)).toBe(true);
        });

        it('Ken Burns pulls back from a tighter, subject-biased crop that stays inside the image', () => {
            const first = sampleStoryTimeline(spec('ken-burns'), fullConfig, 0, ctx);
            expect(first.crop).toBeDefined();
            expect(first.crop!.zoom).toBeGreaterThan(fullConfig.crop.zoom);
            // Biased toward the subject (left / up of centre)
            expect(first.crop!.centerX).toBeLessThan(fullConfig.crop.centerX);
            for (let t = 0; t < 8; t += 0.25) {
                const c = sampleStoryTimeline(spec('ken-burns'), fullConfig, t, ctx).crop;
                if (!c) continue;
                expect(c.x).toBeGreaterThanOrEqual(-1e-9);
                expect(c.y).toBeGreaterThanOrEqual(-1e-9);
                expect(c.x + c.width).toBeLessThanOrEqual(1 + 1e-9);
                expect(c.y + c.height).toBeLessThanOrEqual(1 + 1e-9);
            }
        });

        it('skips the full-bleed camera when image dimensions are unknown', () => {
            const s = sampleStoryTimeline(spec('ken-burns'), fullConfig, 1);
            expect(s.crop).toBeUndefined();
        });

        it('float-in fades a full-bleed photo up from black', () => {
            const s0 = sampleStoryTimeline(spec('float-in'), fullConfig, 0, ctx);
            expect(s0.photoOpacity).toBe(0);
            const s1 = sampleStoryTimeline(spec('float-in'), fullConfig, 2, ctx);
            expect(s1.photoOpacity).toBeUndefined();
        });

        it('float-in scales the padded card up and fades it in', () => {
            const s = sampleStoryTimeline(spec('float-in'), paddedConfig, 0.1, ctx);
            expect(s.card!.scale).toBeLessThan(1);
            expect(s.card!.opacity).toBeLessThan(1);
            expect(s.background!.scale).toBeGreaterThan(1);
        });

        it('panel-cascade enters duet panels from top and bottom, staggered', () => {
            const s = sampleStoryTimeline(spec('panel-cascade'), duetConfig, 0, ctx);
            expect(s.panels).toHaveLength(2);
            expect(s.panels![0].dy).toBeCloseTo(panelEnterOffset(2, 0).dy, 6);
            expect(s.panels![1].dy).toBeCloseTo(panelEnterOffset(2, 1).dy, 6);
            // Panel 0 starts first, so it has travelled further mid-cascade
            const mid = sampleStoryTimeline(spec('panel-cascade'), duetConfig, 0.25, ctx);
            expect(Math.abs(mid.panels![0].dy)).toBeLessThan(Math.abs(mid.panels![1].dy));
            // Timestamp pills appear only after their panel has landed
            expect(mid.panels![1].detailOpacity).toBe(0);
        });

        it('panel-cascade enters triptych panels from alternating sides', () => {
            const s = sampleStoryTimeline(spec('panel-cascade'), triptychConfig, 0, ctx);
            expect(s.panels!.map((p) => Math.sign(p.dx))).toEqual([-1, 1, -1]);
            expect(s.panels!.every((p) => p.dy === 0)).toBe(true);
        });

        it('isFinalAnimState recognises the identity', () => {
            expect(isFinalAnimState(FINAL_ANIM_STATE)).toBe(true);
            expect(isFinalAnimState({ photoOpacity: 0.5 })).toBe(false);
        });
    });

    describe('getStoryFrameCount', () => {
        it('computes duration × fps', () => {
            expect(getStoryFrameCount(spec('auto', 10))).toBe(300);
            expect(getStoryFrameCount({ preset: 'auto', durationS: 10, fps: 30 })).toBe(300);
        });
    });
});
