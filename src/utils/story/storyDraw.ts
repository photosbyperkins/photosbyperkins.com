import { P_ADJUSTMENT } from './storyConstants';
import type { StoryFrameId, StoryFrameContext } from '../../components/sections/Portfolio/storyFrames/types';
import { STORY_FRAMES_MAP } from '../../components/sections/Portfolio/storyFrames/frameDefinitions';

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
    // custom adjustment to center the 'P' in the lens circle
    ctx.fillText('P', 325, 233 + P_ADJUSTMENT);

    ctx.restore();
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

    const svgString = await def.getSvgString(colorOverride, context);
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

export function boxBlur1D(
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
            const firstR = src[rowOffset];
            const firstG = src[rowOffset + 1];
            const firstB = src[rowOffset + 2];
            let sumR = firstR * (r + 1);
            let sumG = firstG * (r + 1);
            let sumB = firstB * (r + 1);
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

export function applyFastBlurAndAdjust(
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
