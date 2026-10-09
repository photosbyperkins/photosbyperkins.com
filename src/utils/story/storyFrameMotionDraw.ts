/**
 * Decorative frame motion: asset preparation and drawing.
 *
 * `prepareFrameMotionAssets` rasterizes a frame (and, for layered recipes, each of its layers) once into
 * canvases trimmed to their visible bounds. `drawFrameMotion` composites them per video frame using the
 * states produced by `sampleFrameMotion` (frameMotion/sample.ts): transforms, clip reveals, glitch slices,
 * wrapped scrolling, a shimmer band and an additive glow. No per-frame SVG rasterization.
 */
import { STORY_WIDTH } from './storyConstants';
import { loadSvgStringImage } from './storyDraw';
import { getFrameMotionRecipe, hash01 } from './frameMotion';
import type { FrameLayerAnim, FrameMotionState, SlideEdge } from './frameMotion';
import { STORY_FRAMES_MAP } from '../../components/sections/Portfolio/storyFrames/frameDefinitions';
import { createSvgString } from '../../components/sections/Portfolio/storyFrames/frames/helper';
import type {
    StoryFrameContext,
    StoryFrameId,
    StoryFrameLayers,
} from '../../components/sections/Portfolio/storyFrames/types';

type Rect = { x: number; y: number; w: number; h: number };

/** One drawable piece of a frame, placed in target pixels. */
export interface FrameLayerAsset {
    id: string;
    source: CanvasImageSource;
    /** Source pixel size of `source` (the region drawn into x / y / w / h). */
    sw: number;
    sh: number;
    x: number;
    y: number;
    w: number;
    h: number;
    pivot: { x: number; y: number };
    clip?: Rect;
}

export interface StoryFrameMotionAssets {
    /** The whole flattened frame (full canvas). */
    whole: FrameLayerAsset;
    /** Layers in draw order, when the frame has a layered recipe and every layer rasterized. */
    layers: FrameLayerAsset[] | null;
    /** Lazily created work canvas for shimmer compositing. */
    scratch: HTMLCanvasElement | null;
}

const TRIM_PAD = 2;

function createCanvas(w: number, h: number): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
}

/** Bounding box of non-transparent pixels, or null when empty / unreadable. */
function alphaBounds(ctx: CanvasRenderingContext2D, w: number, h: number): Rect | null | 'unreadable' {
    let data: Uint8ClampedArray;
    try {
        data = ctx.getImageData(0, 0, w, h).data;
    } catch {
        return 'unreadable';
    }
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y++) {
        const row = y * w * 4;
        for (let x = 0; x < w; x++) {
            if (data[row + x * 4 + 3] > 2) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                maxY = y;
            }
        }
    }
    if (maxX < 0) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Full-canvas asset for an already rasterized image. */
function wholeAsset(img: CanvasImageSource & { width: number; height: number }, W: number, H: number): FrameLayerAsset {
    const canvas = createCanvas(W, H);
    const ctx = canvas?.getContext('2d');
    // A canvas copy makes source-rect drawing (split / glitch) reliable across browsers (SVG images vary)
    if (canvas && ctx) {
        ctx.drawImage(img, 0, 0, W, H);
        return { id: 'whole', source: canvas, sw: W, sh: H, x: 0, y: 0, w: W, h: H, pivot: { x: W / 2, y: H / 2 } };
    }
    const nw = 'naturalWidth' in img ? (img as HTMLImageElement).naturalWidth || W : img.width;
    const nh = 'naturalHeight' in img ? (img as HTMLImageElement).naturalHeight || H : img.height;
    return { id: 'whole', source: img, sw: nw, sh: nh, x: 0, y: 0, w: W, h: H, pivot: { x: W / 2, y: H / 2 } };
}

async function rasterizeLayers(spec: StoryFrameLayers, W: number, H: number): Promise<FrameLayerAsset[] | null> {
    const rs = W / STORY_WIDTH;
    const images = await Promise.all(
        spec.layers.map((l) => loadSvgStringImage(createSvgString((spec.defs ?? '') + l.svg), `Frame layer "${l.id}"`))
    );
    if (images.some((img) => !img)) return null;

    const work = createCanvas(W, H);
    const wctx = work?.getContext('2d', { willReadFrequently: true });
    if (!work || !wctx) return null;

    const out: FrameLayerAsset[] = [];
    spec.layers.forEach((layer, i) => {
        const img = images[i] as HTMLImageElement;
        wctx.clearRect(0, 0, W, H);
        wctx.drawImage(img, 0, 0, W, H);
        const bounds = alphaBounds(wctx, W, H);
        if (bounds === null) return; // empty layer (e.g. context hides it)
        let rect: Rect =
            bounds === 'unreadable'
                ? { x: 0, y: 0, w: W, h: H }
                : {
                      x: Math.max(0, bounds.x - TRIM_PAD),
                      y: Math.max(0, bounds.y - TRIM_PAD),
                      w: 0,
                      h: 0,
                  };
        if (bounds !== 'unreadable') {
            rect = {
                ...rect,
                w: Math.min(W, bounds.x + bounds.w + TRIM_PAD) - rect.x,
                h: Math.min(H, bounds.y + bounds.h + TRIM_PAD) - rect.y,
            };
        }
        const canvas = createCanvas(rect.w, rect.h);
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.drawImage(work, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
        out.push({
            id: layer.id,
            source: canvas,
            sw: rect.w,
            sh: rect.h,
            ...rect,
            pivot: layer.pivot
                ? { x: layer.pivot.x * rs, y: layer.pivot.y * rs }
                : { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 },
            clip: layer.clip
                ? { x: layer.clip.x * rs, y: layer.clip.y * rs, w: layer.clip.w * rs, h: layer.clip.h * rs }
                : undefined,
        });
    });
    // Release the full-size work canvas promptly (mobile memory)
    work.width = 1;
    work.height = 1;
    return out;
}

/**
 * Prepares frame motion assets for animated exports. Null when the frame has no motion recipe or the
 * environment can't build canvases. Layer failures fall back to whole-frame motion.
 */
export async function prepareFrameMotionAssets(
    frameId: StoryFrameId,
    colorOverride: string | undefined,
    context: StoryFrameContext,
    frameImage: HTMLImageElement,
    W: number,
    H: number
): Promise<StoryFrameMotionAssets | null> {
    if (typeof document === 'undefined') return null;
    const recipe = getFrameMotionRecipe(frameId);
    if (!recipe) return null;
    const whole = wholeAsset(frameImage, W, H);
    let layers: FrameLayerAsset[] | null = null;
    const def = STORY_FRAMES_MAP[frameId];
    if (recipe.layers && def?.getLayers) {
        try {
            const spec = await def.getLayers(colorOverride, context);
            layers = await rasterizeLayers(spec, W, H);
        } catch (err) {
            console.warn(`Frame layers for "${frameId}" unavailable; using whole-frame motion:`, err);
            layers = null;
        }
    }
    return { whole, layers, scratch: null };
}

// ---------------------------------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------------------------------

const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);

function slideVector(L: FrameLayerAsset, edge: SlideEdge, W: number, H: number, rs: number) {
    let e = edge;
    if (e === 'auto') {
        const cx = L.x + L.w / 2;
        const cy = L.y + L.h / 2;
        const d = { left: cx, right: W - cx, top: cy, bottom: H - cy };
        e = (Object.keys(d) as (keyof typeof d)[]).reduce((a, b) => (d[b] < d[a] ? b : a));
    }
    const margin = 24 * rs;
    if (e === 'left') return { dx: -(L.x + L.w) - margin, dy: 0 };
    if (e === 'right') return { dx: W - L.x + margin, dy: 0 };
    if (e === 'top') return { dx: 0, dy: -(L.y + L.h) - margin };
    return { dx: 0, dy: H - L.y + margin };
}

const CORNER_ANGLE: Record<string, (w: number, h: number) => number> = {
    tl: (w, h) => Math.atan2(h, w),
    tr: (w, h) => Math.PI - Math.atan2(h, w),
    bl: (w, h) => -Math.atan2(h, w),
    br: (w, h) => Math.PI + Math.atan2(h, w),
};

/** Clips to the revealed part of a layer (in the current, layer-local transform). */
function clipReveal(ctx: CanvasRenderingContext2D, L: FrameLayerAsset, reveal: NonNullable<FrameLayerAnim['reveal']>) {
    let p = clamp01(reveal.p);
    if (reveal.steps && reveal.steps > 1) p = Math.floor(p * reveal.steps) / reveal.steps;
    const { x, y, w, h } = L;
    ctx.beginPath();
    if (reveal.angle === undefined) {
        switch (reveal.edge) {
            case 'left':
                ctx.rect(x, y, w * p, h);
                ctx.clip();
                return;
            case 'right':
                ctx.rect(x + w * (1 - p), y, w * p, h);
                ctx.clip();
                return;
            case 'top':
                ctx.rect(x, y, w, h * p);
                ctx.clip();
                return;
            case 'bottom':
                ctx.rect(x, y + h * (1 - p), w, h * p);
                ctx.clip();
                return;
            case 'center':
                ctx.arc(x + w / 2, y + h / 2, Math.max(0.01, p * Math.hypot(w, h) * 0.5), 0, Math.PI * 2);
                ctx.clip();
                return;
        }
    }
    // Directional sweep (corners and slashes): a half-plane advancing across the bounding box
    const theta =
        reveal.angle !== undefined ? (reveal.angle * Math.PI) / 180 : (CORNER_ANGLE[reveal.edge]?.(w, h) ?? 0);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const ext = (Math.abs(w * Math.cos(theta)) + Math.abs(h * Math.sin(theta))) / 2;
    const big = Math.hypot(w, h) + 4;
    if (typeof ctx.getTransform === 'function' && typeof ctx.setTransform === 'function') {
        const m = ctx.getTransform();
        ctx.translate(cx, cy);
        ctx.rotate(theta);
        ctx.rect(-ext - 2, -big, p * 2 * ext + 2, big * 2);
        ctx.setTransform(m);
    } else {
        ctx.rect(x, y, w * p, h);
    }
    ctx.clip();
}

function getScratch(fm: StoryFrameMotionAssets, w: number, h: number): HTMLCanvasElement | null {
    const need = { w: Math.ceil(w), h: Math.ceil(h) };
    if (!fm.scratch || fm.scratch.width < need.w || fm.scratch.height < need.h) {
        fm.scratch = createCanvas(Math.max(need.w, fm.scratch?.width ?? 0), Math.max(need.h, fm.scratch?.height ?? 0));
    }
    return fm.scratch;
}

/** Draws the layer into the scratch canvas with a highlight band composited onto its alpha. */
function shimmerSource(
    fm: StoryFrameMotionAssets,
    L: FrameLayerAsset,
    shimmer: NonNullable<FrameLayerAnim['shimmer']>,
    rs: number
): { src: CanvasImageSource; sw: number; sh: number } | null {
    const scratch = getScratch(fm, L.w, L.h);
    const sctx = scratch?.getContext('2d');
    if (!scratch || !sctx || typeof sctx.createLinearGradient !== 'function') return null;
    const w = Math.ceil(L.w);
    const h = Math.ceil(L.h);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = 'source-over';
    sctx.globalAlpha = 1;
    sctx.clearRect(0, 0, w, h);
    sctx.drawImage(L.source, 0, 0, L.sw, L.sh, 0, 0, L.w, L.h);
    const theta = (shimmer.angle * Math.PI) / 180;
    const dx = Math.cos(theta);
    const dy = Math.sin(theta);
    const ext = (Math.abs(L.w * dx) + Math.abs(L.h * dy)) / 2;
    const band = Math.max(40 * rs, Math.hypot(L.w, L.h) * 0.09);
    const c = -ext - band + shimmer.pos * 2 * (ext + band);
    const cx = L.w / 2 + dx * c;
    const cy = L.h / 2 + dy * c;
    const g = sctx.createLinearGradient(cx - dx * band, cy - dy * band, cx + dx * band, cy + dy * band);
    const a = clamp01(shimmer.strength);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.globalCompositeOperation = 'source-atop';
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, w, h);
    sctx.globalCompositeOperation = 'source-over';
    return { src: scratch, sw: L.w, sh: L.h };
}

/** Draws `src` into the layer rect shifted by (ox, oy), cutting horizontal glitch slices when requested. */
function drawSource(
    ctx: CanvasRenderingContext2D,
    L: FrameLayerAsset,
    src: CanvasImageSource,
    sw: number,
    sh: number,
    ox: number,
    oy: number,
    glitch: FrameLayerAnim['glitch'],
    H: number,
    rs: number
) {
    if (!glitch || glitch.amount <= 0) {
        ctx.drawImage(src, 0, 0, sw, sh, L.x + ox, L.y + oy, L.w, L.h);
        return;
    }
    // Slices are laid out in canvas space so every layer of a frame tears along the same lines
    const n = 3 + Math.floor(hash01(glitch.seed) * 4);
    const bands: { y0: number; y1: number; off: number }[] = [];
    for (let i = 0; i < n; i++) {
        const y0 = hash01(glitch.seed * 31 + i * 7) * H;
        const bh = (10 + hash01(glitch.seed * 17 + i * 13) * 80) * rs;
        const off = (hash01(glitch.seed * 11 + i * 3) * 2 - 1) * 44 * rs * glitch.amount;
        bands.push({ y0, y1: y0 + bh, off });
    }
    const top = L.y + oy;
    const bottom = top + L.h;
    const cuts = new Set<number>([top, bottom]);
    for (const b of bands) {
        if (b.y0 > top && b.y0 < bottom) cuts.add(b.y0);
        if (b.y1 > top && b.y1 < bottom) cuts.add(b.y1);
    }
    const ys = [...cuts].sort((a, b) => a - b);
    for (let i = 0; i < ys.length - 1; i++) {
        const ya = ys[i];
        const yb = ys[i + 1];
        if (yb - ya < 0.5) continue;
        const mid = (ya + yb) / 2;
        const band = bands.find((b) => mid >= b.y0 && mid < b.y1);
        const sy = ((ya - top) / L.h) * sh;
        const sH = ((yb - ya) / L.h) * sh;
        ctx.drawImage(src, 0, sy, sw, sH, L.x + ox + (band?.off ?? 0), ya, L.w, yb - ya);
    }
}

function drawLayer(
    ctx: CanvasRenderingContext2D,
    fm: StoryFrameMotionAssets,
    L: FrameLayerAsset,
    a: FrameLayerAnim | undefined,
    W: number,
    H: number,
    rs: number
) {
    if (!a) {
        if (L.clip) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(L.clip.x, L.clip.y, L.clip.w, L.clip.h);
            ctx.clip();
            ctx.drawImage(L.source, 0, 0, L.sw, L.sh, L.x, L.y, L.w, L.h);
            ctx.restore();
            return;
        }
        ctx.drawImage(L.source, 0, 0, L.sw, L.sh, L.x, L.y, L.w, L.h);
        return;
    }
    const opacity = clamp01(a.opacity);
    if (opacity <= 0.002) return;

    ctx.save();
    const baseAlpha = ctx.globalAlpha * opacity;
    ctx.globalAlpha = baseAlpha;

    let ox = a.tx * rs;
    let oy = a.ty * rs;
    if (a.slide) {
        const v = slideVector(L, a.slide.edge, W, H, rs);
        ox += v.dx * a.slide.amount;
        oy += v.dy * a.slide.amount;
    }
    const sx = a.scale * a.sx;
    const sy = a.scale * a.sy;
    if (ox || oy || sx !== 1 || sy !== 1 || a.rotate) {
        ctx.translate(L.pivot.x + ox, L.pivot.y + oy);
        if (a.rotate) ctx.rotate((a.rotate * Math.PI) / 180);
        ctx.scale(sx, sy);
        ctx.translate(-L.pivot.x, -L.pivot.y);
    }

    const clip = L.clip ?? (a.scroll ? { x: L.x, y: L.y, w: L.w, h: L.h } : undefined);
    if (clip) {
        ctx.beginPath();
        ctx.rect(clip.x, clip.y, clip.w, clip.h);
        ctx.clip();
    }
    if (a.reveal) clipReveal(ctx, L, a.reveal);

    let src: CanvasImageSource = L.source;
    let sw = L.sw;
    let sh = L.sh;
    if (a.shimmer && a.shimmer.strength > 0) {
        const s = shimmerSource(fm, L, a.shimmer, rs);
        if (s) ({ src, sw, sh } = s);
    }

    const paint = () => {
        if (a.split && a.split > 0) {
            // Quadrants converge on the layer centre
            const cx = L.w / 2;
            const cy = L.h / 2;
            const tx = a.split * L.w * 0.22;
            const ty = a.split * L.h * 0.12;
            const quads: [number, number, number, number, number, number][] = [
                [0, 0, cx, cy, -tx, -ty],
                [cx, 0, L.w - cx, cy, tx, -ty],
                [0, cy, cx, L.h - cy, -tx, ty],
                [cx, cy, L.w - cx, L.h - cy, tx, ty],
            ];
            const kx = sw / L.w;
            const ky = sh / L.h;
            for (const [qx, qy, qw, qh, dx, dy] of quads) {
                ctx.drawImage(src, qx * kx, qy * ky, qw * kx, qh * ky, L.x + qx + dx, L.y + qy + dy, qw, qh);
            }
            return;
        }
        if (a.scroll && clip) {
            // Banded copies: the primary copy (offset s) fills the clip past start + s, the wrapped copy (s - tile)
            // only the strip before it. No pixel is painted twice, so semi-transparent patterns keep their opacity.
            // Assumes the pattern is periodic across the clip (the scroll contract). Splits snap to whole px.
            const bands = (s: number, tile: number, start: number, size: number): [number, number, number][] => {
                if (!tile) return [[0, start, size]];
                const split = Math.round(start + s * rs);
                return [
                    [s, split, start + size - split],
                    [s - tile, start, split - start],
                ];
            };
            for (const [x, bx, bw] of bands(a.scroll.x, a.scroll.tileX, clip.x, clip.w)) {
                for (const [y, by, bh] of bands(a.scroll.y, a.scroll.tileY, clip.y, clip.h)) {
                    if (bw <= 0 || bh <= 0) continue;
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(bx, by, bw, bh);
                    ctx.clip();
                    drawSource(ctx, L, src, sw, sh, x * rs, y * rs, a.glitch, H, rs);
                    ctx.restore();
                }
            }
            return;
        }
        drawSource(ctx, L, src, sw, sh, 0, 0, a.glitch, H, rs);
    };

    paint();
    if (a.glow && a.glow > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = baseAlpha * clamp01(a.glow);
        paint();
    }
    ctx.restore();
}

/**
 * Draws the decorative frame for one animated video frame. Layered recipes use the rasterized layers
 * when available; otherwise the whole frame takes the recipe's `whole` motion.
 */
export function drawFrameMotion(
    ctx: CanvasRenderingContext2D,
    fm: StoryFrameMotionAssets,
    state: FrameMotionState,
    W: number,
    H: number
): void {
    const rs = W / STORY_WIDTH;
    if (state.layered && fm.layers) {
        for (const layer of fm.layers) drawLayer(ctx, fm, layer, state.layers?.[layer.id], W, H, rs);
        return;
    }
    drawLayer(ctx, fm, fm.whole, state.whole, W, H, rs);
}

/** Whole-frame motion without prepared assets (draws straight from the frame image). */
export function drawFrameMotionFallback(
    ctx: CanvasRenderingContext2D,
    frameImage: HTMLImageElement,
    state: FrameMotionState,
    W: number,
    H: number
): void {
    const fm: StoryFrameMotionAssets = {
        whole: {
            id: 'whole',
            source: frameImage,
            sw: frameImage.naturalWidth || W,
            sh: frameImage.naturalHeight || H,
            x: 0,
            y: 0,
            w: W,
            h: H,
            pivot: { x: W / 2, y: H / 2 },
        },
        layers: null,
        scratch: null,
    };
    drawLayer(ctx, fm, fm.whole, state.whole, W, H, W / STORY_WIDTH);
}
