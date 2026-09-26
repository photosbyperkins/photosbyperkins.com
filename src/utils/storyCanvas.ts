/**
 * storyCanvas.ts
 *
 * Client-side Canvas rendering engine for Instagram Story & TikTok (9:16) Export.
 * Generates dynamic multi-person prepared crops, custom pan/zoom crops, and
 * glassmorphic "padded" layouts without storing extra files on disk.
 */

import type { FaceBox, ExifData } from '../types';
import { formatTeamName } from './formatters';
import type { StoryFrameId, StoryFrameContext } from '../components/sections/Portfolio/storyFrames/types';
import { STORY_FRAMES_MAP } from '../components/sections/Portfolio/storyFrames/frameDefinitions';

export const STORY_ASPECT_RATIO = 9 / 16; // 0.5625
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export interface NormalizedCrop {
    x: number; // 0..1 (top-left X relative to image width)
    y: number; // 0..1 (top-left Y relative to image height)
    width: number; // 0..1 (crop width relative to image width)
    height: number; // 0..1 (crop height relative to image height)
    zoom: number; // 1.0..3.5
    centerX: number; // 0..1
    centerY: number; // 0..1
}

export interface StoryPreset {
    id: string;
    label: string;
    description: string;
    crop: NormalizedCrop;
    mode: 'crop' | 'padded';
    isDefault?: boolean;
}

export interface PaddedStyleOptions {
    style: 'glass' | 'noir' | 'custom';
    customColor?: string;
    position: 'center' | 'elevated';
    cardScale: number; // 0.8..1.0 (default: 0.92)
    cardCornerRadius: number; // in pixels at 1080x1920 (default: 24)
}

export interface BadgeOptions {
    showScoreboard: boolean;
    scoreboardTitle?: string;
    teams?: string[];
    score1?: string | number | null;
    score2?: string | number | null;
    matchDate?: string;
    showAttribution: boolean;
    attributionText?: string;
    attributionLogoText?: string;
    attributionLogoAccent?: string;
    attributionDomain?: string;
}

/**
 * Draws the camera logo icon with the bold 'P' inside, matching the nav__logo favicon icon.
 */
export function drawCameraLogoIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color = '#ffffff'
): void {
    ctx.save();
    ctx.translate(x, y);
    const s = size / 230;
    ctx.scale(s, s);
    ctx.translate(-200, -70);

    // Camera body (scaled & translated per favicon.svg)
    ctx.save();
    ctx.translate(315, 185);
    ctx.scale(0.65, 0.65);
    ctx.translate(-230, -256);

    ctx.strokeStyle = color;
    ctx.lineWidth = 18;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(120, 146);
    ctx.lineTo(176, 146);
    ctx.lineTo(206, 86);
    ctx.lineTo(306, 86);
    ctx.lineTo(336, 146);
    ctx.lineTo(380, 146);
    ctx.arcTo(400, 146, 400, 166, 20);
    ctx.lineTo(400, 346);
    ctx.arcTo(400, 366, 380, 366, 20);
    ctx.lineTo(80, 366);
    ctx.arcTo(60, 366, 60, 346, 20);
    ctx.lineTo(60, 216);
    ctx.quadraticCurveTo(60, 146, 120, 146);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Bold letter 'P' in lens position
    ctx.fillStyle = color;
    ctx.font = "bold 250px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 325, 240);

    ctx.restore();
}

export type StoryPhotoFilterId = 'none' | 'bw' | 'bw-contrast' | 'warm' | 'vivid' | 'matte' | 'noir' | 'sepia';

export interface StoryPhotoFilter {
    id: StoryPhotoFilterId;
    label: string;
    description: string;
    cssFilter: string;
}

export const STORY_PHOTO_FILTERS: StoryPhotoFilter[] = [
    {
        id: 'none',
        label: 'None',
        description: 'Original unmodified photo colors',
        cssFilter: 'none',
    },
    {
        id: 'bw',
        label: 'B&W',
        description: 'Classic balanced monochrome',
        cssFilter: 'grayscale(100%) contrast(108%)',
    },
    {
        id: 'bw-contrast',
        label: 'B&W Contrast',
        description: 'High contrast black & white with deep blacks',
        cssFilter: 'grayscale(100%) contrast(160%) brightness(95%)',
    },
    {
        id: 'warm',
        label: 'Warm Vintage',
        description: 'Golden hour ambient warmth',
        cssFilter: 'sepia(28%) saturate(120%) contrast(105%) brightness(102%)',
    },
    {
        id: 'vivid',
        label: 'Vivid',
        description: 'Punchy saturated action colors',
        cssFilter: 'contrast(115%) saturate(140%) brightness(102%)',
    },
    {
        id: 'matte',
        label: 'Matte',
        description: 'Soft film faded shadows',
        cssFilter: 'contrast(88%) brightness(108%) saturate(90%)',
    },
    {
        id: 'noir',
        label: 'Moody Noir',
        description: 'Dramatic deep cinematic shadows',
        cssFilter: 'contrast(130%) brightness(90%) saturate(85%)',
    },
    {
        id: 'sepia',
        label: 'Sepia',
        description: 'Antique warm sepia tone',
        cssFilter: 'sepia(75%) contrast(105%) brightness(98%)',
    },
];

export const STORY_PHOTO_FILTERS_MAP = Object.fromEntries(STORY_PHOTO_FILTERS.map((f) => [f.id, f])) as Record<
    StoryPhotoFilterId,
    StoryPhotoFilter
>;

export interface StoryRenderConfig {
    mode: 'crop' | 'padded';
    crop: NormalizedCrop;
    padded: PaddedStyleOptions;
    badges: BadgeOptions;
    resolution?: '1080x1920' | '1440x2560' | '2160x3840';
    cardTheme?: 'dark' | 'light';
    frameId?: StoryFrameId;
    frameColorOverride?: string;
    exif?: ExifData;
    filterId?: StoryPhotoFilterId;
}

/**
 * Calculates a normalized 9:16 crop rectangle centered at (centerX, centerY) with a given zoom.
 */
export function calculateNormalizedCrop(
    imgW: number,
    imgH: number,
    centerX: number,
    centerY: number,
    zoom = 1.0
): NormalizedCrop {
    const safeZoom = Math.max(1.0, Math.min(3.5, zoom));
    const imgRatio = imgW / imgH;

    let cropW: number;
    let cropH: number;

    if (imgRatio >= STORY_ASPECT_RATIO) {
        // Image is wider than 9:16 (e.g. 3:2 landscape or 1:1 square)
        cropH = imgH / safeZoom;
        cropW = cropH * STORY_ASPECT_RATIO;
    } else {
        // Image is narrower than 9:16
        cropW = imgW / safeZoom;
        cropH = cropW / STORY_ASPECT_RATIO;
    }

    // Clamp center coordinates so the crop never samples outside the source image
    const halfW = cropW / 2;
    const halfH = cropH / 2;

    const minX = halfW;
    const maxX = imgW - halfW;
    const minY = halfH;
    const maxY = imgH - halfH;

    const clampedCenterX = Math.max(minX, Math.min(maxX, centerX * imgW));
    const clampedCenterY = Math.max(minY, Math.min(maxY, centerY * imgH));

    const left = clampedCenterX - halfW;
    const top = clampedCenterY - halfH;

    return {
        x: Math.max(0, Math.min(1, left / imgW)),
        y: Math.max(0, Math.min(1, top / imgH)),
        width: Math.max(0, Math.min(1, cropW / imgW)),
        height: Math.max(0, Math.min(1, cropH / imgH)),
        zoom: safeZoom,
        centerX: clampedCenterX / imgW,
        centerY: clampedCenterY / imgH,
    };
}

/**
 * Generates context-aware 9:16 crop presets based on the number and positions of detected people.
 */
export function generateStoryPresets(options: {
    width: number;
    height: number;
    focusX?: number;
    focusY?: number;
    faces?: FaceBox[];
}): StoryPreset[] {
    const { width: w, height: h, focusX, focusY, faces } = options;
    const presets: StoryPreset[] = [];

    // Filter valid faces
    const validFaces = (faces || []).filter(
        (f) => typeof f.x === 'number' && typeof f.y === 'number' && !isNaN(f.x) && !isNaN(f.y)
    );

    // Fallback: If no faces array but focusX/focusY exists, treat as 1 face
    const effectiveFaces: Array<{ x: number; y: number; w?: number; h?: number }> =
        validFaces.length > 0 ? validFaces : focusX != null && focusY != null ? [{ x: focusX, y: focusY }] : [];

    const numPeople = effectiveFaces.length;

    // --- CASE 0: No People Detected ---
    if (numPeople === 0) {
        presets.push({
            id: 'thirds-left',
            label: 'Left',
            description: 'Frames left side of action',
            crop: calculateNormalizedCrop(w, h, 0.33, 0.5, 1.0),
            mode: 'crop',
        });
        presets.push({
            id: 'center',
            label: 'Center',
            description: 'Balanced center composition',
            crop: calculateNormalizedCrop(w, h, 0.5, 0.5, 1.0),
            mode: 'crop',
            isDefault: true,
        });
        presets.push({
            id: 'thirds-right',
            label: 'Right',
            description: 'Frames right side of action',
            crop: calculateNormalizedCrop(w, h, 0.67, 0.5, 1.0),
            mode: 'crop',
        });
    }

    // --- CASE 1: Solo Person Detected ---
    else if (numPeople === 1) {
        const p1 = effectiveFaces[0];
        // Headroom compensation: shift slightly up so head has natural headroom
        const headAdjustedY = Math.max(0.15, p1.y - 0.06);

        presets.push({
            id: 'subject',
            label: 'Subject Focus',
            description: 'Framed on skater with natural headroom',
            crop: calculateNormalizedCrop(w, h, p1.x, headAdjustedY, 1.0),
            mode: 'crop',
            isDefault: true,
        });
        presets.push({
            id: 'closeup',
            label: 'Close-up Action',
            description: 'Dynamic 1.35x zoom on athlete',
            crop: calculateNormalizedCrop(w, h, p1.x, Math.max(0.12, p1.y - 0.03), 1.35),
            mode: 'crop',
        });
        presets.push({
            id: 'wide-action',
            label: 'Wide Context',
            description: 'Subject with track environment',
            crop: calculateNormalizedCrop(w, h, p1.x, 0.5, 1.0),
            mode: 'crop',
        });
    }

    // --- CASE 2: Two People Detected (e.g. Jammer vs Blocker) ---
    else if (numPeople === 2) {
        const [f1, f2] = effectiveFaces;
        const minX = Math.min(f1.x, f2.x);
        const maxX = Math.max(f1.x, f2.x);
        const midX = (minX + maxX) / 2;
        const midY = (f1.y + f2.y) / 2;
        const headAdjustedY = Math.max(0.15, midY - 0.06);

        presets.push({
            id: 'duo',
            label: 'Duo Focus',
            description: 'Frames both subjects together',
            crop: calculateNormalizedCrop(w, h, midX, headAdjustedY, 1.0),
            mode: 'crop',
            isDefault: true,
        });

        // Individual subject focus
        presets.push({
            id: 'person-1',
            label: 'Left Focus',
            description: 'Focus on left subject',
            crop: calculateNormalizedCrop(w, h, f1.x, Math.max(0.15, f1.y - 0.06), 1.15),
            mode: 'crop',
        });
        presets.push({
            id: 'person-2',
            label: 'Right Focus',
            description: 'Focus on right subject',
            crop: calculateNormalizedCrop(w, h, f2.x, Math.max(0.15, f2.y - 0.06), 1.15),
            mode: 'crop',
        });
    }

    // --- CASE 3: Three or More People ---
    else {
        // Group centroid
        const avgX = effectiveFaces.reduce((sum, f) => sum + f.x, 0) / numPeople;
        const avgY = effectiveFaces.reduce((sum, f) => sum + f.y, 0) / numPeople;

        presets.push({
            id: 'pack',
            label: 'Group Action',
            description: 'Frames all subjects in the frame',
            crop: calculateNormalizedCrop(w, h, avgX, Math.max(0.18, avgY - 0.05), 1.0),
            mode: 'crop',
            isDefault: true,
        });

        // Primary Subject
        const primary = effectiveFaces[0];
        presets.push({
            id: 'primary',
            label: 'Lead Focus',
            description: 'Focus on primary action subject',
            crop: calculateNormalizedCrop(w, h, primary.x, Math.max(0.15, primary.y - 0.06), 1.2),
            mode: 'crop',
        });

        // Add buttons for individual detected persons (up to 4)
        for (let i = 0; i < Math.min(4, effectiveFaces.length); i++) {
            const p = effectiveFaces[i];
            presets.push({
                id: `person-${i + 1}`,
                label: `Subject ${i + 1}`,
                description: `Focus on subject ${i + 1}`,
                crop: calculateNormalizedCrop(w, h, p.x, Math.max(0.15, p.y - 0.06), 1.2),
                mode: 'crop',
            });
        }
    }

    // --- ALWAYS PRESENT: Glassmorphic Padded Mode Preset ---
    presets.push({
        id: 'padded-glass',
        label: 'Padded',
        description: '100% full uncropped image with frosted blur',
        crop: calculateNormalizedCrop(w, h, 0.5, 0.5, 1.0),
        mode: 'padded',
    });

    return presets;
}

/**
 * Draws rounded rectangle path on canvas (with polyfill for older browsers).
 */
export function drawRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
    } else {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }
}

/**
 * Renders an SVG decorative frame onto a canvas context.
 */
export async function drawStoryFrameToCanvas(
    ctx: CanvasRenderingContext2D,
    frameId: StoryFrameId | undefined,
    targetW: number,
    targetH: number,
    colorOverride?: string,
    context?: StoryFrameContext
): Promise<void> {
    if (!frameId || frameId === 'none') return;
    const def = STORY_FRAMES_MAP[frameId];
    if (!def) return;

    if (typeof Image === 'undefined') return;

    const svgString = def.getSvgString(colorOverride, context);
    const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

    await new Promise<void>((resolve) => {
        const img = new Image();
        let settled = false;
        const cleanup = () => {
            if (!settled) {
                settled = true;
                resolve();
            }
        };

        img.onload = () => {
            try {
                ctx.drawImage(img, 0, 0, targetW, targetH);
            } catch {
                // Ignore draw error
            }
            cleanup();
        };
        img.onerror = () => {
            cleanup();
        };
        img.src = dataUri;

        // Safety timeout so export is never hung
        setTimeout(cleanup, 350);
    });
}

function boxBlur1D(
    src: Uint8ClampedArray,
    dst: Uint8ClampedArray,
    w: number,
    h: number,
    r: number,
    isHorizontal: boolean
) {
    const div = 2 * r + 1;
    if (isHorizontal) {
        for (let y = 0; y < h; y++) {
            const rowOffset = y * w * 4;
            let sumR = 0;
            let sumG = 0;
            let sumB = 0;
            const firstR = src[rowOffset];
            const firstG = src[rowOffset + 1];
            const firstB = src[rowOffset + 2];
            sumR = firstR * (r + 1);
            sumG = firstG * (r + 1);
            sumB = firstB * (r + 1);
            for (let i = 1; i <= r; i++) {
                const idx = rowOffset + Math.min(w - 1, i) * 4;
                sumR += src[idx];
                sumG += src[idx + 1];
                sumB += src[idx + 2];
            }
            for (let x = 0; x < w; x++) {
                const outIdx = rowOffset + x * 4;
                dst[outIdx] = Math.round(sumR / div);
                dst[outIdx + 1] = Math.round(sumG / div);
                dst[outIdx + 2] = Math.round(sumB / div);
                dst[outIdx + 3] = 255;
                const inIdx = rowOffset + Math.min(w - 1, x + r + 1) * 4;
                const outOldIdx = rowOffset + Math.max(0, x - r) * 4;
                sumR += src[inIdx] - src[outOldIdx];
                sumG += src[inIdx + 1] - src[outOldIdx + 1];
                sumB += src[inIdx + 2] - src[outOldIdx + 2];
            }
        }
    } else {
        for (let x = 0; x < w; x++) {
            const colOffset = x * 4;
            const stride = w * 4;
            const firstR = src[colOffset];
            const firstG = src[colOffset + 1];
            const firstB = src[colOffset + 2];
            let sumR = firstR * (r + 1);
            let sumG = firstG * (r + 1);
            let sumB = firstB * (r + 1);
            for (let i = 1; i <= r; i++) {
                const idx = Math.min(h - 1, i) * stride + colOffset;
                sumR += src[idx];
                sumG += src[idx + 1];
                sumB += src[idx + 2];
            }
            for (let y = 0; y < h; y++) {
                const outIdx = y * stride + colOffset;
                dst[outIdx] = Math.round(sumR / div);
                dst[outIdx + 1] = Math.round(sumG / div);
                dst[outIdx + 2] = Math.round(sumB / div);
                dst[outIdx + 3] = 255;
                const inIdx = Math.min(h - 1, y + r + 1) * stride + colOffset;
                const outOldIdx = Math.max(0, y - r) * stride + colOffset;
                sumR += src[inIdx] - src[outOldIdx];
                sumG += src[inIdx + 1] - src[outOldIdx + 1];
                sumB += src[inIdx + 2] - src[outOldIdx + 2];
            }
        }
    }
}

function applyFastBlurAndAdjust(
    imageData: ImageData,
    radius: number,
    saturation: number = 1.8,
    brightness: number = 0.65
) {
    const { width: w, height: h, data } = imageData;
    const len = w * h;

    // Apply color grading (saturation + brightness)
    for (let i = 0; i < len; i++) {
        const idx = i * 4;
        let r = data[idx];
        let g = data[idx + 1];
        let b = data[idx + 2];

        // Saturation adjustment
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * saturation;
        g = gray + (g - gray) * saturation;
        b = gray + (b - gray) * saturation;

        // Brightness & clamp
        data[idx] = Math.min(255, Math.max(0, Math.round(r * brightness)));
        data[idx + 1] = Math.min(255, Math.max(0, Math.round(g * brightness)));
        data[idx + 2] = Math.min(255, Math.max(0, Math.round(b * brightness)));
        data[idx + 3] = 255;
    }

    // Fast 3-pass Box Blur (horizontal + vertical) approximating Gaussian bokeh
    const target = new Uint8ClampedArray(data.length);
    for (let pass = 0; pass < 3; pass++) {
        boxBlur1D(data, target, w, h, radius, true);
        boxBlur1D(target, data, w, h, radius, false);
    }
}

/**
 * Renders the story image onto an HTML5 Canvas.
 */
export async function renderStoryToCanvas(
    img: HTMLImageElement | HTMLCanvasElement,
    config: StoryRenderConfig,
    targetCanvas?: HTMLCanvasElement
): Promise<HTMLCanvasElement> {
    const canvas = targetCanvas || document.createElement('canvas');

    // Parse target resolution
    let targetW = STORY_WIDTH;
    let targetH = STORY_HEIGHT;
    if (config.resolution === '1440x2560') {
        targetW = 1440;
        targetH = 2560;
    } else if (config.resolution === '2160x3840') {
        targetW = 2160;
        targetH = 3840;
    }

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D canvas context');

    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const naturalW = 'naturalWidth' in img ? img.naturalWidth : img.width;
    const naturalH = 'naturalHeight' in img ? img.naturalHeight : img.height;

    if (!naturalW || !naturalH) {
        return canvas;
    }

    // Resolve optional photo filter
    const activeFilter = config.filterId ? STORY_PHOTO_FILTERS_MAP[config.filterId] : undefined;
    const filterCss = activeFilter && activeFilter.id !== 'none' ? activeFilter.cssFilter : '';

    // ==========================================
    // 1. RENDER MODE: CROP (9:16)
    // ==========================================
    if (config.mode === 'crop') {
        const { crop } = config;
        const sx = crop.x * naturalW;
        const sy = crop.y * naturalH;
        const sw = crop.width * naturalW;
        const sh = crop.height * naturalH;

        ctx.save();
        if (filterCss && 'filter' in ctx) {
            ctx.filter = filterCss;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
        ctx.restore();
    }
    // ==========================================
    // 2. RENDER MODE: PADDED (GLASSMORPHIC)
    // ==========================================
    else {
        const { padded } = config;
        const scale = padded.cardScale || 0.92;
        const cornerRadius = (padded.cardCornerRadius || 24) * (targetW / STORY_WIDTH);

        // --- A. Background Rendering ---
        if (padded.style === 'glass') {
            // Draw scaled background image
            const bgScale = Math.max(targetW / naturalW, targetH / naturalH);
            const bgW = naturalW * bgScale;
            const bgH = naturalH * bgScale;
            const bgX = (targetW - bgW) / 2;
            const bgY = (targetH - bgH) / 2;

            let blurred = false;
            if (typeof document !== 'undefined') {
                try {
                    const sw = 64;
                    const sh = Math.round(64 * (targetH / targetW));
                    const smallCanvas = document.createElement('canvas');
                    smallCanvas.width = sw;
                    smallCanvas.height = sh;
                    const sCtx = smallCanvas.getContext('2d', { willReadFrequently: true });
                    if (sCtx && typeof sCtx.getImageData === 'function') {
                        if (filterCss && 'filter' in sCtx) {
                            try {
                                sCtx.filter = filterCss;
                            } catch {
                                /* ignore */
                            }
                        }
                        const sScale = Math.max(sw / naturalW, sh / naturalH);
                        const sW = naturalW * sScale;
                        const sH = naturalH * sScale;
                        const sX = (sw - sW) / 2;
                        const sY = (sh - sH) / 2;
                        sCtx.drawImage(img, sX, sY, sW, sH);

                        const imgData = sCtx.getImageData(0, 0, sw, sh);
                        applyFastBlurAndAdjust(imgData, 4, 1.8, 0.65);
                        sCtx.putImageData(imgData, 0, 0);

                        ctx.save();
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(smallCanvas, 0, 0, targetW, targetH);
                        ctx.restore();
                        blurred = true;
                    }
                } catch {
                    blurred = false;
                }
            }

            if (!blurred) {
                ctx.save();
                if ('filter' in ctx) {
                    const blurEffect = `blur(${Math.round(48 * (targetW / STORY_WIDTH))}px) saturate(180%) brightness(0.65)`;
                    ctx.filter = filterCss ? `${blurEffect} ${filterCss}` : blurEffect;
                }
                ctx.drawImage(img, bgX, bgY, bgW, bgH);
                ctx.restore();
            }

            // Frosted glass overlay tint
            ctx.fillStyle = config.cardTheme === 'light' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(10, 10, 18, 0.45)';
            ctx.fillRect(0, 0, targetW, targetH);
        } else if (padded.style === 'custom') {
            // Solid custom background color
            ctx.fillStyle = padded.customColor || '#0a0a14';
            ctx.fillRect(0, 0, targetW, targetH);
        } else {
            // Minimal Noir Dark Background (default fallback)
            const grad = ctx.createLinearGradient(0, 0, 0, targetH);
            grad.addColorStop(0, '#0a0a0f');
            grad.addColorStop(0.5, '#0f0f18');
            grad.addColorStop(1, '#08080c');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, targetW, targetH);
        }

        // --- B. Foreground Card Rendering ---
        const imgRatio = naturalW / naturalH;
        let cardW = targetW * scale;
        let cardH = cardW / imgRatio;

        // If card exceeds 85% of vertical space, constrain by height
        const maxCardH = targetH * 0.82;
        if (cardH > maxCardH) {
            cardH = maxCardH;
            cardW = cardH * imgRatio;
        }

        const cardX = (targetW - cardW) / 2;
        const cardY =
            padded.position === 'elevated'
                ? (targetH - cardH) * 0.42 // slightly elevated to avoid Instagram Story reply bar
                : (targetH - cardH) / 2;

        const effectiveRadius = cardX <= 2 ? 0 : cornerRadius;

        // Render Drop Shadow
        ctx.save();
        ctx.shadowColor = config.cardTheme === 'light' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = Math.round(40 * (targetW / STORY_WIDTH));
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.round(18 * (targetW / STORY_WIDTH));

        drawRoundRect(ctx, cardX, cardY, cardW, cardH, effectiveRadius);
        ctx.fillStyle = config.cardTheme === 'light' ? '#ffffff' : '#0a0a0f';
        ctx.fill();
        ctx.restore();

        // Render Clipped Photo Card
        ctx.save();
        drawRoundRect(ctx, cardX, cardY, cardW, cardH, effectiveRadius);
        ctx.clip();
        if (filterCss && 'filter' in ctx) {
            ctx.filter = filterCss;
        }
        ctx.drawImage(img, cardX, cardY, cardW, cardH);
        ctx.filter = 'none';

        // Subtle 1px Glass Border
        ctx.strokeStyle = config.cardTheme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = Math.max(1.5, 2 * (targetW / STORY_WIDTH));
        ctx.stroke();
        ctx.restore();
    }

    // ==========================================
    // 2.5. RENDER OPTIONAL DECORATIVE FRAME
    // ==========================================
    if (config.frameId && config.frameId !== 'none') {
        const frameContext: StoryFrameContext = {
            hasScoreboard: Boolean(
                config.badges.showScoreboard && (config.badges.scoreboardTitle || config.badges.teams?.length)
            ),
            hasAttribution: Boolean(config.badges.showAttribution),
            layoutMode: config.mode,
            exif: config.exif,
        };
        await drawStoryFrameToCanvas(ctx, config.frameId, targetW, targetH, config.frameColorOverride, frameContext);
    }

    // ==========================================
    // 3. RENDER OPTIONAL STORY BADGES
    // ==========================================
    const { badges } = config;
    const resScale = targetW / STORY_WIDTH;

    // --- Scoreboard Badge (portfolio__event-header style) ---
    if (badges.showScoreboard && (badges.scoreboardTitle || badges.teams?.length)) {
        const cardPadH = Math.round(36 * resScale);
        const cardRadius = Math.round(24 * resScale);

        const hasTeams = badges.teams && badges.teams.length >= 2;
        const dateText = badges.matchDate || '';

        // Typography settings
        const dateFontSize = Math.round(80 * resScale);
        const dateFont = `600 ${dateFontSize}px "Barlow Condensed", "Arial Narrow", sans-serif`;

        const teamFontSize = Math.round(38 * resScale);
        const teamFont = `700 ${teamFontSize}px "Barlow Condensed", "Arial Narrow", sans-serif`;

        const scoreFontSize = Math.round(40 * resScale);
        const scoreFont = `700 ${scoreFontSize}px "Barlow Condensed", "Arial Narrow", sans-serif`;

        // Measure Date
        let dateW = 0;
        if (dateText) {
            ctx.font = dateFont;
            dateW = ctx.measureText(dateText).width;
        }

        // Measure Teams and Scores
        let teamsW: number;
        let t1Name = '';
        let t2Name = '';
        let s1Str = '';
        let s2Str = '';
        let t1Win = false;
        let t2Win = false;

        if (hasTeams) {
            t1Name = formatTeamName(badges.teams![0]).toUpperCase();
            t2Name = formatTeamName(badges.teams![1]).toUpperCase();
            s1Str = badges.score1 != null ? `${badges.score1}` : '';
            s2Str = badges.score2 != null ? `${badges.score2}` : '';

            if (s1Str && s2Str) {
                const num1 = Number(s1Str);
                const num2 = Number(s2Str);
                if (!isNaN(num1) && !isNaN(num2)) {
                    t1Win = num1 > num2;
                    t2Win = num2 > num1;
                }
            }

            ctx.font = teamFont;
            const t1W = ctx.measureText(t1Name).width;
            const t2W = ctx.measureText(t2Name).width;

            ctx.font = scoreFont;
            const s1W = s1Str ? ctx.measureText(s1Str).width + 30 * resScale : 0;
            const s2W = s2Str ? ctx.measureText(s2Str).width + 30 * resScale : 0;

            const row1W = t1W + s1W;
            const row2W = t2W + s2W;
            teamsW = Math.max(row1W, row2W);
        } else {
            const singleTitle = (badges.scoreboardTitle || badges.teams?.[0] || '').toUpperCase();
            ctx.font = teamFont;
            teamsW = ctx.measureText(singleTitle).width;
        }

        // Divider spacing
        const dividerGap = Math.round(26 * resScale);
        const dividerW = dateW > 0 ? 2 * resScale : 0;

        // Total card dimensions (positioned at bottom center)
        const contentW = dateW + (dateW > 0 ? dividerGap * 2 + dividerW : 0) + teamsW;
        const cardW = contentW + cardPadH * 2;
        const cardH = Math.round(132 * resScale);
        const cardX = (targetW - cardW) / 2;
        const badgeY = targetH - cardH - Math.round(105 * resScale);

        const isLight = config.cardTheme === 'light';

        // Draw Card Background (Frosted Glass)
        ctx.save();
        ctx.shadowColor = isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = Math.round(30 * resScale);
        ctx.shadowOffsetY = Math.round(12 * resScale);

        drawRoundRect(ctx, cardX, badgeY, cardW, cardH, cardRadius);
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(10, 10, 16, 0.86)';
        ctx.fill();

        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = Math.max(1.5, 2 * resScale);
        ctx.stroke();
        ctx.restore();

        // Draw Date Prefix
        let currX = cardX + cardPadH;
        const centerY = badgeY + cardH / 2;

        if (dateW > 0) {
            ctx.save();
            ctx.font = dateFont;
            ctx.fillStyle = '#e60000'; // Brand accent red
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(dateText, currX, centerY + 2 * resScale);
            ctx.restore();

            currX += dateW + dividerGap;

            // Draw Vertical Divider
            ctx.save();
            ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = Math.max(1.5, 2 * resScale);
            const divH = Math.round(80 * resScale);
            ctx.beginPath();
            ctx.moveTo(currX, centerY - divH / 2);
            ctx.lineTo(currX, centerY + divH / 2);
            ctx.stroke();
            ctx.restore();

            currX += dividerGap;
        }

        // Draw Stacked Teams
        if (hasTeams) {
            const rowSpacing = Math.round(26 * resScale);
            const row1Y = centerY - rowSpacing;
            const row2Y = centerY + rowSpacing;

            // Row 1: Team 1
            ctx.save();
            ctx.font = teamFont;
            ctx.fillStyle = isLight ? '#111116' : '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(t1Name, currX, row1Y);

            if (s1Str) {
                ctx.font = scoreFont;
                ctx.fillStyle = t1Win
                    ? isLight
                        ? '#111116'
                        : '#ffffff'
                    : isLight
                      ? 'rgba(0, 0, 0, 0.45)'
                      : 'rgba(255, 255, 255, 0.5)';
                ctx.textAlign = 'right';
                ctx.fillText(s1Str, currX + teamsW, row1Y);
            }

            // Row 2: Team 2
            ctx.font = teamFont;
            ctx.fillStyle = isLight ? '#111116' : '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(t2Name, currX, row2Y);

            if (s2Str) {
                ctx.font = scoreFont;
                ctx.fillStyle = t2Win
                    ? isLight
                        ? '#111116'
                        : '#ffffff'
                    : isLight
                      ? 'rgba(0, 0, 0, 0.45)'
                      : 'rgba(255, 255, 255, 0.5)';
                ctx.textAlign = 'right';
                ctx.fillText(s2Str, currX + teamsW, row2Y);
            }
            ctx.restore();
        } else {
            const singleTitle = (badges.scoreboardTitle || badges.teams?.[0] || '').toUpperCase();
            ctx.save();
            ctx.font = teamFont;
            ctx.fillStyle = isLight ? '#111116' : '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(singleTitle, currX, centerY);
            ctx.restore();
        }
    }

    // --- Attribution Badge (nav__logo style) ---
    if (badges.showAttribution) {
        const isLight = config.cardTheme === 'light';
        const pillH = Math.round(86 * resScale);
        const pillR = pillH / 2;
        const attrY = Math.round(105 * resScale);
        const iconSize = Math.round(42 * resScale);
        const gap = Math.round(16 * resScale);
        const padH = Math.round(36 * resScale);

        const logoText = (badges.attributionLogoText || 'PHOTOS BY').toUpperCase();
        const logoAccent = (badges.attributionLogoAccent || 'PERKINS').toUpperCase();
        const domainText = badges.attributionDomain ? `${badges.attributionDomain}` : '';

        const textFont = `300 ${Math.round(36 * resScale)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
        const accentFont = `300 ${Math.round(36 * resScale)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
        const domainFont = `400 ${Math.round(26 * resScale)}px "Outfit", system-ui, sans-serif`;

        // Measure widths
        ctx.font = textFont;
        const textW = ctx.measureText(logoText + ' ').width;

        ctx.font = accentFont;
        const accentW = ctx.measureText(logoAccent).width;

        let domainW = 0;
        if (domainText) {
            ctx.font = domainFont;
            domainW = ctx.measureText(' ' + domainText).width;
        }

        const contentW = iconSize + gap + textW + accentW + (domainW > 0 ? domainW : 0);
        const pillW = contentW + padH * 2;
        const pillX = (targetW - pillW) / 2;

        // Draw pill background (frosted glass)
        ctx.save();
        ctx.shadowColor = isLight ? 'rgba(0, 0, 0, 0.18)' : 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = Math.round(16 * resScale);
        ctx.shadowOffsetY = Math.round(6 * resScale);

        drawRoundRect(ctx, pillX, attrY, pillW, pillH, pillR);
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(10, 10, 16, 0.84)';
        ctx.fill();

        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = Math.max(1.2, 1.5 * resScale);
        ctx.stroke();
        ctx.restore();

        // Draw camera logo icon
        const centerY = attrY + pillH / 2;
        let curX = pillX + padH;

        drawCameraLogoIcon(ctx, curX, centerY - iconSize / 2, iconSize, isLight ? '#111116' : '#ffffff');
        curX += iconSize + gap;

        // Draw 'PHOTOS BY '
        ctx.save();
        ctx.font = textFont;
        ctx.fillStyle = isLight ? '#111116' : '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(logoText + ' ', curX, centerY);
        curX += textW;

        // Draw 'PERKINS' (Accent red)
        ctx.font = accentFont;
        ctx.fillStyle = '#e60000';
        ctx.fillText(logoAccent, curX, centerY);
        curX += accentW;

        // Draw ' • @photosbyperkins'
        if (domainText) {
            ctx.font = domainFont;
            ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.65)';
            ctx.fillText(' ' + domainText, curX, centerY);
        }
        ctx.restore();
    }

    return canvas;
}

/**
 * Exports the canvas as a JPEG Blob ready for download or navigator.share.
 */
export async function renderStoryToBlob(
    img: HTMLImageElement | HTMLCanvasElement,
    config: StoryRenderConfig
): Promise<Blob> {
    const canvas = await renderStoryToCanvas(img, config);
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to generate image blob'));
            },
            'image/jpeg',
            0.95
        );
    });
}
