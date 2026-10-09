/**
 * Story render assets: everything expensive that a story frame needs, prepared once.
 *
 * `prepareStoryAssets` does the async / per-pixel work (fonts, filter baking, frosted background blur,
 * decorative frame rasterization) so `drawStoryScene` (storyRender.ts) can stay synchronous and cheap.
 * The still JPEG export prepares and draws once; the animated MP4 export prepares once and draws every
 * video frame from the same assets.
 */
import { STORY_HEIGHT, STORY_WIDTH, getStoryFilterCss } from './storyConstants';
import type { StoryRenderConfig } from './storyConstants';
import {
    applyFastBlurAndAdjust,
    applyStoryFilterToImageData,
    drawImageWithStoryFilter,
    loadStoryFrameImage,
} from './storyDraw';
import { getStoryLayoutKind } from './storyAnimation';
import { prepareFrameMotionAssets } from './storyFrameMotionDraw';
import type { StoryFrameMotionAssets } from './storyFrameMotionDraw';
import type { StoryFrameContext } from '../../components/sections/Portfolio/storyFrames/types';

export type StoryImageSource = HTMLImageElement | HTMLCanvasElement;
export type StoryImageInput = StoryImageSource | (StoryImageSource | null | undefined)[];

export interface StoryAssets {
    targetW: number;
    targetH: number;
    /** Images used to draw photo content (filter already applied when `filterBaked`). */
    images: (StoryImageSource | null | undefined)[];
    /** Original, unfiltered images (used by effects that apply their own grading, e.g. backgrounds). */
    rawImages: (StoryImageSource | null | undefined)[];
    /** True when the photo filter has been baked into `images`, so drawing must not re-apply it. */
    filterBaked: boolean;
    /** Pre-blurred, graded small canvas for the frosted / glass padded background (null → CSS-filter fallback). */
    frostedBackground: HTMLCanvasElement | null;
    /** Rasterized decorative frame (null when none / failed). */
    frameImage: HTMLImageElement | null;
    /** Frame motion pieces for animated exports (only with `frameLayers: true`). */
    frameMotion?: StoryFrameMotionAssets | null;
}

export interface PrepareStoryAssetsOptions {
    /** Override the target size (defaults to `config.resolution`). */
    targetW?: number;
    targetH?: number;
    /**
     * Pre-apply the photo filter once into offscreen copies of the source images. Required for animated
     * exports: the per-pixel filter path (Safari, SVG-style filters) is far too slow to run every frame.
     */
    bakeFilter?: boolean;
    /** Longest edge for baked source copies (default 4096). */
    maxBakedEdge?: number;
    /** Prepare decorative frame motion assets (animated exports). */
    frameLayers?: boolean;
}

/** Pixel size for a story resolution setting. */
export function getStoryTargetSize(resolution?: StoryRenderConfig['resolution']): { targetW: number; targetH: number } {
    if (resolution === '1440x2560') return { targetW: 1440, targetH: 2560 };
    if (resolution === '2160x3840') return { targetW: 2160, targetH: 3840 };
    return { targetW: STORY_WIDTH, targetH: STORY_HEIGHT };
}

export const getImageNaturalSize = (img: StoryImageSource): { w: number; h: number } => ({
    w: 'naturalWidth' in img ? img.naturalWidth : img.width,
    h: 'naturalHeight' in img ? img.naturalHeight : img.height,
});

export function getStoryFrameContext(config: StoryRenderConfig): StoryFrameContext {
    return {
        hasScoreboard: Boolean(
            !config.badges.isEventAmbiguous &&
            config.badges.showScoreboard &&
            (config.badges.scoreboardTitle || config.badges.teams?.length)
        ),
        hasAttribution: Boolean(config.badges.showAttribution),
        layoutMode: config.mode,
        exif: config.exif,
    };
}

const hasActiveFilter = (config: StoryRenderConfig) =>
    Boolean(config.filterId && config.filterId !== 'none' && (config.filterStrength ?? 1.0) > 0);

/**
 * Builds the tiny blurred + graded canvas used behind padded cards (frosted / glass styles).
 * Returns null when the pixel path is unavailable; the caller then falls back to a CSS blur filter.
 */
export function buildFrostedBackground(
    img: StoryImageSource,
    config: StoryRenderConfig,
    targetW: number,
    targetH: number
): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const { w: naturalW, h: naturalH } = getImageNaturalSize(img);
    if (!naturalW || !naturalH) return null;
    try {
        const sw = 64;
        const sh = Math.round(64 * (targetH / targetW));
        const smallCanvas = document.createElement('canvas');
        smallCanvas.width = sw;
        smallCanvas.height = sh;
        const sCtx = smallCanvas.getContext('2d', { willReadFrequently: true });
        if (!sCtx || typeof sCtx.getImageData !== 'function') return null;
        const sScale = Math.max(sw / naturalW, sh / naturalH);
        const sW = naturalW * sScale;
        const sH = naturalH * sScale;
        const sX = (sw - sW) / 2;
        const sY = (sh - sH) / 2;
        sCtx.drawImage(img, sX, sY, sW, sH);

        const imgData = sCtx.getImageData(0, 0, sw, sh);
        if (config.filterId && config.filterId !== 'none') {
            applyStoryFilterToImageData(imgData, config.filterId, config.filterStrength ?? 1.0);
        }
        applyFastBlurAndAdjust(imgData, 4, 1.8, 0.65);
        sCtx.putImageData(imgData, 0, 0);
        return smallCanvas;
    } catch {
        return null;
    }
}

/** Draws a filtered copy of `img` into a new canvas (longest edge capped at `maxEdge`). */
function bakeFilteredImage(
    img: StoryImageSource,
    config: StoryRenderConfig,
    maxEdge: number
): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const { w, h } = getImageNaturalSize(img);
    if (!w || !h) return null;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const bw = Math.max(1, Math.round(w * scale));
    const bh = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = bw;
    canvas.height = bh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const filterCss = config.filterId ? getStoryFilterCss(config.filterId, config.filterStrength ?? 1.0) : '';
    drawImageWithStoryFilter(
        ctx,
        img,
        0,
        0,
        w,
        h,
        0,
        0,
        bw,
        bh,
        config.filterId,
        config.filterStrength ?? 1.0,
        filterCss
    );
    return canvas;
}

/**
 * Prepares all assets needed to draw a story. Resolves to null when there is nothing drawable
 * (no image for a non-burst story, or an image without dimensions).
 */
export async function prepareStoryAssets(
    img: StoryImageInput,
    config: StoryRenderConfig,
    options: PrepareStoryAssetsOptions = {}
): Promise<StoryAssets | null> {
    // Ensure all custom web fonts (e.g. Outfit, Barlow Condensed) are fully loaded before rasterization
    if (typeof document !== 'undefined' && 'fonts' in document && document.fonts?.ready) {
        try {
            await document.fonts.ready;
        } catch {
            // Ignore font loading errors, proceed with fallback fonts
        }
    }

    const size = getStoryTargetSize(config.resolution);
    const targetW = options.targetW ?? size.targetW;
    const targetH = options.targetH ?? size.targetH;

    const rawImages: (StoryImageSource | null | undefined)[] = Array.isArray(img) ? img : [img];
    const primary = rawImages.find((i): i is StoryImageSource => Boolean(i));
    if (!primary && config.mode !== 'burst') return null;
    if (primary) {
        const { w, h } = getImageNaturalSize(primary);
        if (!w || !h) return null;
    }

    const layout = getStoryLayoutKind(config);
    const isFrosted = config.padded?.style === 'frosted' || config.padded?.style === 'glass';
    const frostedBackground =
        primary && layout === 'padded' && isFrosted ? buildFrostedBackground(primary, config, targetW, targetH) : null;

    const frameContext = getStoryFrameContext(config);
    const frameImage =
        config.frameId && config.frameId !== 'none'
            ? await loadStoryFrameImage(config.frameId, config.frameColorOverride, frameContext)
            : null;
    const frameMotion =
        options.frameLayers && frameImage && config.frameId
            ? await prepareFrameMotionAssets(
                  config.frameId,
                  config.frameColorOverride,
                  frameContext,
                  frameImage,
                  targetW,
                  targetH
              )
            : null;

    let images = rawImages;
    let filterBaked = false;
    if (options.bakeFilter && hasActiveFilter(config)) {
        const maxEdge = options.maxBakedEdge ?? 4096;
        const baked = rawImages.map((i) => (i ? bakeFilteredImage(i, config, maxEdge) : i));
        if (baked.every((b, idx) => (rawImages[idx] ? Boolean(b) : true))) {
            images = baked;
            filterBaked = true;
        }
    }

    return { targetW, targetH, images, rawImages, filterBaked, frostedBackground, frameImage, frameMotion };
}
