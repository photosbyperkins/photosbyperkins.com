import { describe, it, expect, vi } from 'vitest';
import {
    FRAME_MOTION,
    FRAME_MOTION_START,
    getFrameMotionRecipe,
    isRestAnim,
    sampleFrameMotion,
    type FrameLayerAnim,
    type FrameMotionRecipe,
} from './index';
import { STORY_FRAMES_MAP } from '../../../components/sections/Portfolio/storyFrames/frameDefinitions';

// The bear's paths are fetched at runtime; give it one so its layer is exercised
vi.mock('../../../components/sections/Portfolio/storyFrames/sacBearLoader', () => ({
    loadSacBearPaths: async () => [{ d: 'M0,0 L40,0 L20,30 Z', type: 'body' }],
}));

const FPS = 30;
const DURATIONS = [10];

/** Max deviation from rest across every animated property. */
function restDistance(a: FrameLayerAnim | undefined): number {
    if (!a) return 0;
    return Math.max(
        Math.abs(1 - a.opacity),
        Math.abs(a.tx) / 20,
        Math.abs(a.ty) / 20,
        Math.abs(1 - a.scale * a.sx * a.sy) * 10,
        Math.abs(a.rotate) / 10,
        a.glow ?? 0,
        a.glitch?.amount ?? 0,
        a.shimmer?.strength ?? 0,
        a.split ?? 0,
        a.slide ? Math.abs(a.slide.amount) : 0,
        a.reveal ? 1 - a.reveal.p : 0
    );
}

describe('frameMotion', () => {
    it('has a recipe for every decorative frame', () => {
        for (const id of Object.keys(STORY_FRAMES_MAP)) {
            if (id === 'none') continue;
            expect(FRAME_MOTION[id as keyof typeof FRAME_MOTION], id).toBeDefined();
        }
        expect(getFrameMotionRecipe('none')).toBeUndefined();
    });

    it('only uses layer recipes for frames that expose layers', () => {
        for (const [id, recipe] of Object.entries(FRAME_MOTION)) {
            if (!recipe?.layers) continue;
            expect(STORY_FRAMES_MAP[id as keyof typeof STORY_FRAMES_MAP]?.getLayers, id).toBeTypeOf('function');
        }
    });

    it('animates every decorative frame in layers', () => {
        for (const [id, def] of Object.entries(STORY_FRAMES_MAP)) {
            if (id === 'none') continue;
            expect(def.getLayers, `${id} exposes layers`).toBeTypeOf('function');
            expect(getFrameMotionRecipe(def.id)?.layers, `${id} has a layer recipe`).toBeDefined();
        }
    });

    it('matches layer ids to recipe keys in every badge context, and the still equals the joined layers', async () => {
        const contexts = [true, false].flatMap((hasAttribution) =>
            [true, false].map((hasScoreboard) => ({ hasAttribution, hasScoreboard }))
        );
        for (const [id, def] of Object.entries(STORY_FRAMES_MAP)) {
            if (!def.getLayers) continue;
            const recipeKeys = Object.keys(getFrameMotionRecipe(def.id)?.layers ?? {});
            expect(recipeKeys.length, `${id} has layers but no layer recipe`).toBeGreaterThan(0);
            const seen = new Set<string>();
            for (const ctx of contexts) {
                const spec = await def.getLayers(undefined, ctx);
                const ids = spec.layers.map((l) => l.id);
                expect(new Set(ids).size, `${id}: duplicate layer ids`).toBe(ids.length);
                for (const layerId of ids) {
                    expect(recipeKeys, `${id}: layer "${layerId}" has no recipe`).toContain(layerId);
                    seen.add(layerId);
                }
                const still = await def.getSvgString(undefined, ctx);
                expect(still, `${id}: still must be the joined layers`).toContain(spec.layers.map((l) => l.svg).join(''));
            }
            for (const key of recipeKeys) expect(seen, `${id}: recipe key "${key}" matches no layer`).toContain(key);
        }
    });

    it('starts hidden for intro frames (or at rest for non-intro) and ends exactly at rest for every recipe', () => {
        for (const [id, recipe] of Object.entries(FRAME_MOTION) as [string, FrameMotionRecipe][]) {
            for (const D of DURATIONS) {
                expect(sampleFrameMotion(recipe, D, D), `${id} @ end`).toBeUndefined();
                // Intro frames hide the frame at start; non-intro frames start directly at rest
                const first = sampleFrameMotion(recipe, 0, D);
                if (recipe.intro && recipe.whole.entrance) {
                    expect(first?.whole?.opacity ?? 1, id).toBeLessThan(0.05);
                } else if (!recipe.intro) {
                    expect(first?.whole?.opacity ?? 1, id).toBe(1);
                }
                // The last video frame is visually the static design
                const last = sampleFrameMotion(recipe, D - 1 / FPS, D);
                expect(restDistance(last?.whole), `${id} whole near end (${D}s)`).toBeLessThan(0.08);
                for (const layer of Object.values(last?.layers ?? {})) {
                    expect(restDistance(layer), `${id} layer near end (${D}s)`).toBeLessThan(0.08);
                }
            }
        }
    });

    it('is deterministic', () => {
        const recipe = FRAME_MOTION['vhs-glitch']!;
        for (let t = 0; t < 8; t += 0.37) {
            expect(sampleFrameMotion(recipe, t, 8)).toEqual(sampleFrameMotion(recipe, t, 8));
        }
    });

    it('turns frame motion off at zero intensity', () => {
        const recipe = FRAME_MOTION['electric-lightning']!;
        for (let t = 0; t < 8; t += 0.5) expect(sampleFrameMotion(recipe, t, 8, 0)).toBeUndefined();
    });

    it('fits ambient loops so they return to rest at the end of the video', () => {
        const recipe: FrameMotionRecipe = {
            whole: { ambient: [{ kind: 'pulse', scale: 0.1, period: 1.7 }, { kind: 'drift', dx: 10, period: 2.3 }] },
        };
        for (const D of DURATIONS) {
            const near = sampleFrameMotion(recipe, D - 0.001, D);
            expect(restDistance(near?.whole)).toBeLessThan(0.01);
            // ...while actually moving mid-video
            const mid = [0.3, 0.5, 0.7].map((f) => restDistance(sampleFrameMotion(recipe, D * f, D)?.whole));
            expect(Math.max(...mid)).toBeGreaterThan(0.05);
        }
    });

    it('scrolls by whole tiles and spins by whole symmetry steps', () => {
        const recipe: FrameMotionRecipe = {
            whole: { ambient: [{ kind: 'scroll', dy: 80, period: 1 }, { kind: 'spin', deg: 45, period: 3 }] },
        };
        const D = 8;
        const near = sampleFrameMotion(recipe, D - 0.0005, D)?.whole;
        const y = near?.scroll?.y ?? 0;
        expect(Math.min(y, 80 - y)).toBeLessThan(0.5);
        const r = near?.rotate ?? 0;
        expect(Math.abs(r)).toBeLessThan(0.1);
        const mid = sampleFrameMotion(recipe, 4, D)?.whole;
        expect(mid?.scroll).toBeDefined();
    });

    it('plays layer entrances in their stagger order for intro frames', () => {
        const recipe: FrameMotionRecipe = {
            intro: true,
            whole: { entrance: { kind: 'fade' } },
            layers: {
                a: { entrance: { kind: 'pop', delay: 0 } },
                b: { entrance: { kind: 'pop', delay: 0.5 } },
            },
        };
        const s = sampleFrameMotion(recipe, FRAME_MOTION_START + 0.3, 10);
        expect(s?.layered).toBe(true);
        expect(s?.layers?.a?.opacity).toBeGreaterThan(0.5);
        expect(s?.layers?.b?.opacity).toBe(0);
    });

    it('treats an untouched state as rest', () => {
        expect(isRestAnim({ opacity: 1, tx: 0, ty: 0, scale: 1, sx: 1, sy: 1, rotate: 0 })).toBe(true);
        expect(isRestAnim({ opacity: 1, tx: 0, ty: 0, scale: 1, sx: 1, sy: 1, rotate: 0, glow: 0.2 })).toBe(false);
    });
});
