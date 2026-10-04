import { P_ADJUSTMENT } from './storyConstants';
import type { StoryPhotoFilterId } from './storyConstants';
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
 * Converts an SVG string to a robust base64 Data URI across all environments.
 * Base64 encoding avoids WebKit/Safari parsing failures on URL-encoded characters and whitespace,
 * while preventing tainted canvas errors that occur when drawing blob: URLs to canvas in Safari.
 */
function svgToDataUri(svg: string): string {
    try {
        if (typeof btoa !== 'undefined' && typeof TextEncoder !== 'undefined') {
            const bytes = new TextEncoder().encode(svg);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return `data:image/svg+xml;base64,${btoa(binary)}`;
        }
    } catch {
        // Fallback to URL-encoded UTF-8 if base64 conversion fails
    }
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
    if (!svgString) return;

    const dataUri = svgToDataUri(svgString);

    await new Promise<void>((resolve) => {
        const img = new Image();
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            if (!settled) {
                settled = true;
                resolve();
            }
        };

        img.onload = async () => {
            try {
                // WebKit / iOS Safari timing workaround:
                // In WebKit, an SVG image's onload event fires when the XML document is loaded,
                // but the internal vector rasterizer has not yet committed pixels to the backing surface.
                // Calling decode() and waiting a microtask/animation frame ensures WebKit rasterization is complete.
                if ('decode' in img) {
                    try {
                        await img.decode();
                    } catch {
                        // decode() might reject on some SVG data in older WebKit, safely continue
                    }
                }
                await new Promise<void>((r) => {
                    if (typeof requestAnimationFrame !== 'undefined') {
                        requestAnimationFrame(() => r());
                    } else {
                        setTimeout(r, 40);
                    }
                });

                if (typeof ctx.drawImage === 'function') {
                    ctx.drawImage(img, 0, 0, targetW, targetH);
                }
            } catch (err) {
                console.warn('Failed to draw story frame to canvas:', err);
            }
            cleanup();
        };

        img.onerror = (e) => {
            console.warn('Failed to load story frame SVG image:', e);
            cleanup();
        };

        img.src = dataUri;

        // Generous safety timeout (3.5s) so mobile devices under CPU throttling don't prematurely abort frame rendering
        timer = setTimeout(() => {
            console.warn(`Story frame "${frameId}" render timed out`);
            cleanup();
        }, 3500);
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

/**
 * Detects whether the current browser natively supports CanvasRenderingContext2D.filter.
 * WebKit / Safari on iOS & macOS does not support ctx.filter on 2D canvas context.
 */
let _supportsFilter: boolean | null = null;

export function supportsCanvasFilter(): boolean {
    if (_supportsFilter !== null) return _supportsFilter;
    if (typeof document === 'undefined') {
        _supportsFilter = false;
        return false;
    }
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx || typeof ctx.filter === 'undefined') {
            _supportsFilter = false;
            return false;
        }
        ctx.filter = 'contrast(150%)';
        _supportsFilter = ctx.filter === 'contrast(150%)';
    } catch {
        _supportsFilter = false;
    }
    return _supportsFilter;
}

export function _setSupportsCanvasFilterForTesting(val: boolean | null): void {
    _supportsFilter = val;
}

/**
 * Applies a story photo filter directly to an ImageData pixel buffer.
 * Provides a pixel-exact fallback for browsers lacking native CanvasRenderingContext2D.filter (Safari / iOS).
 */
export function applyStoryFilterToImageData(imageData: ImageData, filterId: StoryPhotoFilterId, strength = 1.0): void {
    if (!filterId || filterId === 'none' || strength <= 0) return;
    const clamped = Math.max(0, Math.min(1, strength));

    const { data } = imageData;
    const len = data.length;

    switch (filterId) {
        case 'bw': {
            // CSS: grayscale(100% * clamped) contrast(100% + 8% * clamped)
            const gAmount = clamped;
            const c = 1 + 0.08 * clamped;
            for (let i = 0; i < len; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Grayscale (Rec. 709 weights)
                const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                const gr = r + (gray - r) * gAmount;
                const gg = g + (gray - g) * gAmount;
                const gb = b + (gray - b) * gAmount;

                // Contrast
                data[i] = (gr - 128) * c + 128;
                data[i + 1] = (gg - 128) * c + 128;
                data[i + 2] = (gb - 128) * c + 128;
            }
            break;
        }

        case 'bw-contrast': {
            // CSS: grayscale(100% * clamped) contrast(100% + 60% * clamped) brightness(100% - 5% * clamped)
            const gAmount = clamped;
            const c = 1 + 0.6 * clamped;
            const br = 1 - 0.05 * clamped;
            for (let i = 0; i < len; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Grayscale
                const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                const gr = r + (gray - r) * gAmount;
                const gg = g + (gray - g) * gAmount;
                const gb = b + (gray - b) * gAmount;

                // Contrast + Brightness
                data[i] = ((gr - 128) * c + 128) * br;
                data[i + 1] = ((gg - 128) * c + 128) * br;
                data[i + 2] = ((gb - 128) * c + 128) * br;
            }
            break;
        }

        case 'warm': {
            // CSS: sepia(28% * clamped) saturate(100% + 20% * clamped) contrast(100% + 5% * clamped) brightness(100% + 2% * clamped)
            const sAmount = 0.28 * clamped;
            const sat = 1 + 0.2 * clamped;
            const c = 1 + 0.05 * clamped;
            const br = 1 + 0.02 * clamped;
            for (let i = 0; i < len; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];

                // Sepia (W3C standard matrix)
                const sr = 0.393 * r + 0.769 * g + 0.189 * b;
                const sg = 0.349 * r + 0.686 * g + 0.168 * b;
                const sb = 0.272 * r + 0.534 * g + 0.131 * b;
                r = r + (sr - r) * sAmount;
                g = g + (sg - g) * sAmount;
                b = b + (sb - b) * sAmount;

                // Saturate
                const gray = 0.213 * r + 0.715 * g + 0.072 * b;
                r = gray + (r - gray) * sat;
                g = gray + (g - gray) * sat;
                b = gray + (b - gray) * sat;

                // Contrast + Brightness
                data[i] = ((r - 128) * c + 128) * br;
                data[i + 1] = ((g - 128) * c + 128) * br;
                data[i + 2] = ((b - 128) * c + 128) * br;
            }
            break;
        }

        case 'vivid': {
            // CSS: contrast(100% + 15% * clamped) saturate(100% + 40% * clamped) brightness(100% + 2% * clamped)
            const c = 1 + 0.15 * clamped;
            const sat = 1 + 0.4 * clamped;
            const br = 1 + 0.02 * clamped;
            for (let i = 0; i < len; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];

                // Contrast
                r = (r - 128) * c + 128;
                g = (g - 128) * c + 128;
                b = (b - 128) * c + 128;

                // Saturate
                const gray = 0.213 * r + 0.715 * g + 0.072 * b;
                r = gray + (r - gray) * sat;
                g = gray + (g - gray) * sat;
                b = gray + (b - gray) * sat;

                // Brightness
                data[i] = r * br;
                data[i + 1] = g * br;
                data[i + 2] = b * br;
            }
            break;
        }

        case 'matte': {
            // CSS: contrast(100% - 12% * clamped) brightness(100% + 8% * clamped) saturate(100% - 10% * clamped)
            const c = 1 - 0.12 * clamped;
            const br = 1 + 0.08 * clamped;
            const sat = 1 - 0.1 * clamped;
            for (let i = 0; i < len; i += 4) {
                // Contrast + Brightness
                const r = ((data[i] - 128) * c + 128) * br;
                const g = ((data[i + 1] - 128) * c + 128) * br;
                const b = ((data[i + 2] - 128) * c + 128) * br;

                // Saturate
                const gray = 0.213 * r + 0.715 * g + 0.072 * b;
                data[i] = gray + (r - gray) * sat;
                data[i + 1] = gray + (g - gray) * sat;
                data[i + 2] = gray + (b - gray) * sat;
            }
            break;
        }

        case 'noir': {
            // CSS: contrast(100% + 30% * clamped) brightness(100% - 10% * clamped) saturate(100% - 15% * clamped)
            const c = 1 + 0.3 * clamped;
            const br = 1 - 0.1 * clamped;
            const sat = 1 - 0.15 * clamped;
            for (let i = 0; i < len; i += 4) {
                // Contrast + Brightness
                const r = ((data[i] - 128) * c + 128) * br;
                const g = ((data[i + 1] - 128) * c + 128) * br;
                const b = ((data[i + 2] - 128) * c + 128) * br;

                // Saturate
                const gray = 0.213 * r + 0.715 * g + 0.072 * b;
                data[i] = gray + (r - gray) * sat;
                data[i + 1] = gray + (g - gray) * sat;
                data[i + 2] = gray + (b - gray) * sat;
            }
            break;
        }

        case 'sepia': {
            // CSS: sepia(75% * clamped) contrast(100% + 5% * clamped) brightness(100% - 2% * clamped)
            const sAmount = 0.75 * clamped;
            const c = 1 + 0.05 * clamped;
            const br = 1 - 0.02 * clamped;
            for (let i = 0; i < len; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];

                // Sepia
                const sr = 0.393 * r + 0.769 * g + 0.189 * b;
                const sg = 0.349 * r + 0.686 * g + 0.168 * b;
                const sb = 0.272 * r + 0.534 * g + 0.131 * b;
                r = r + (sr - r) * sAmount;
                g = g + (sg - g) * sAmount;
                b = b + (sb - b) * sAmount;

                // Contrast + Brightness
                data[i] = ((r - 128) * c + 128) * br;
                data[i + 1] = ((g - 128) * c + 128) * br;
                data[i + 2] = ((b - 128) * c + 128) * br;
            }
            break;
        }

        case 'selective-red':
        case 'selective-green':
        case 'selective-blue':
        case 'selective-yellow':
        case 'selective-purple': {
            const target = filterId.replace('selective-', '') as 'red' | 'green' | 'blue' | 'yellow' | 'purple';
            for (let i = 0; i < len; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Luminance (Rec. 709 weights)
                const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

                // Color isolation via HSL hue distance
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const delta = max - min;
                let match = 0;

                // Ignore near-neutral pixels and very dark shadows to prevent noise
                if (delta >= 18 && max > 30) {
                    const sat = delta / max;
                    let h = 0;
                    if (max === r) {
                        h = ((g - b) / delta) % 6;
                    } else if (max === g) {
                        h = (b - r) / delta + 2;
                    } else {
                        h = (r - g) / delta + 4;
                    }
                    h = h * 60;
                    if (h < 0) h += 360;

                    if (target === 'red') {
                        // Tight hue window around 0 deg (rejects skin tones at H >= 16 deg)
                        const dist = Math.min(h, 360 - h);
                        if (dist <= 10 && sat >= 0.3) {
                            match = 1;
                        } else if (dist <= 16 && sat >= 0.25) {
                            match = (1 - (dist - 10) / 6) * Math.min(1, (sat - 0.22) / 0.08);
                        }
                    } else if (target === 'green') {
                        // Hue centered around 120 deg
                        const dist = Math.abs(h - 120);
                        if (dist <= 35 && sat >= 0.18) {
                            match = 1;
                        } else if (dist <= 50 && sat >= 0.14) {
                            match = (1 - (dist - 35) / 15) * Math.min(1, (sat - 0.12) / 0.06);
                        }
                    } else if (target === 'blue') {
                        // Blue: Hue centered around 220 deg (covers rich cyan/royal blue/navy)
                        const dist = Math.abs(h - 220);
                        if (dist <= 35 && sat >= 0.18) {
                            match = 1;
                        } else if (dist <= 50 && sat >= 0.14) {
                            match = (1 - (dist - 35) / 15) * Math.min(1, (sat - 0.12) / 0.06);
                        }
                    } else if (target === 'yellow') {
                        // Yellow: Hue centered around 54 deg (covers gold, yellow jerseys, jammer stars)
                        const dist = Math.abs(h - 54);
                        if (dist <= 14 && sat >= 0.28) {
                            match = 1;
                        } else if (dist <= 24 && sat >= 0.22) {
                            match = (1 - (dist - 14) / 10) * Math.min(1, (sat - 0.18) / 0.08);
                        }
                    } else if (target === 'purple') {
                        // Purple / Magenta: Hue centered around 295 deg (covers purple jerseys, violet, hot pink)
                        const dist = Math.abs(h - 295);
                        if (dist <= 25 && sat >= 0.2) {
                            match = 1;
                        } else if (dist <= 40 && sat >= 0.15) {
                            match = (1 - (dist - 25) / 15) * Math.min(1, (sat - 0.12) / 0.06);
                        }
                    }
                }

                // If match = 1, keep full color.
                // If match = 0, desaturate according to clamped strength (strength 1 = 100% grayscale; strength 0.5 = 50% color).
                const keepRatio = Math.max(0, Math.min(1, match + (1 - match) * (1 - clamped)));
                data[i] = Math.round(gray + (r - gray) * keepRatio);
                data[i + 1] = Math.round(gray + (g - gray) * keepRatio);
                data[i + 2] = Math.round(gray + (b - gray) * keepRatio);
            }
            break;
        }

        case 'chrome': {
            // Vivid 90s action sports slide film
            const c = 1 + 0.28 * clamped;
            const sat = 1 + 0.45 * clamped;
            const br = 1 - 0.02 * clamped;
            for (let i = 0; i < len; i += 4) {
                const r = ((data[i] - 128) * c + 128) * br;
                const g = ((data[i + 1] - 128) * c + 128) * br;
                const b = ((data[i + 2] - 128) * c + 128) * br;
                const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                data[i] = Math.max(0, Math.min(255, Math.round(gray + (r - gray) * sat)));
                data[i + 1] = Math.max(0, Math.min(255, Math.round(gray + (g - gray) * sat)));
                data[i + 2] = Math.max(0, Math.min(255, Math.round(gray + (b - gray) * sat)));
            }
            break;
        }

        case 'bleach': {
            // Gritty high contrast with desaturated midtones
            const c = 1 + 0.35 * clamped;
            const sat = 1 - 0.65 * clamped;
            const br = 1 + 0.02 * clamped;
            for (let i = 0; i < len; i += 4) {
                const r = ((data[i] - 128) * c + 128) * br;
                const g = ((data[i + 1] - 128) * c + 128) * br;
                const b = ((data[i + 2] - 128) * c + 128) * br;
                const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                data[i] = Math.max(0, Math.min(255, Math.round(gray + (r - gray) * sat)));
                data[i + 1] = Math.max(0, Math.min(255, Math.round(gray + (g - gray) * sat)));
                data[i + 2] = Math.max(0, Math.min(255, Math.round(gray + (b - gray) * sat)));
            }
            break;
        }

        case 'portra': {
            // Soft portrait warmth with creamy highlights
            const c = 1 - 0.06 * clamped;
            const br = 1 + 0.05 * clamped;
            const sat = 1 + 0.08 * clamped;
            const sAmount = 0.18 * clamped;
            for (let i = 0; i < len; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];
                const sr = 0.393 * r + 0.769 * g + 0.189 * b;
                const sg = 0.349 * r + 0.686 * g + 0.168 * b;
                const sb = 0.272 * r + 0.534 * g + 0.131 * b;
                r = r + (sr - r) * sAmount;
                g = g + (sg - g) * sAmount;
                b = b + (sb - b) * sAmount;
                const cr = ((r - 128) * c + 128) * br;
                const cg = ((g - 128) * c + 128) * br;
                const cb = ((b - 128) * c + 128) * br;
                const gray = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
                data[i] = Math.max(0, Math.min(255, Math.round(gray + (cr - gray) * sat)));
                data[i + 1] = Math.max(0, Math.min(255, Math.round(gray + (cg - gray) * sat)));
                data[i + 2] = Math.max(0, Math.min(255, Math.round(gray + (cb - gray) * sat)));
            }
            break;
        }

        case 'cinematic': {
            // Hollywood Teal & Orange Split Toning
            const c = 1 + 0.15 * clamped;
            const sat = 1 + 0.2 * clamped;
            for (let i = 0; i < len; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];
                const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                if (lum < 0.5) {
                    const shadowWeight = (0.5 - lum) * 2 * clamped;
                    r -= 20 * shadowWeight;
                    g += 10 * shadowWeight;
                    b += 30 * shadowWeight;
                } else {
                    const hlWeight = (lum - 0.5) * 2 * clamped;
                    r += 30 * hlWeight;
                    g += 12 * hlWeight;
                    b -= 18 * hlWeight;
                }
                const cr = (r - 128) * c + 128;
                const cg = (g - 128) * c + 128;
                const cb = (b - 128) * c + 128;
                const gray = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
                data[i] = Math.max(0, Math.min(255, Math.round(gray + (cr - gray) * sat)));
                data[i + 1] = Math.max(0, Math.min(255, Math.round(gray + (cg - gray) * sat)));
                data[i + 2] = Math.max(0, Math.min(255, Math.round(gray + (cb - gray) * sat)));
            }
            break;
        }

        case 'hard-flash': {
            // Direct flash skate zine look
            const c = 1 + 0.4 * clamped;
            const br = 1 + 0.15 * clamped;
            const sat = 1 + 0.1 * clamped;
            for (let i = 0; i < len; i += 4) {
                const r = ((data[i] - 128) * c + 128) * br;
                const g = ((data[i + 1] - 128) * c + 128) * br;
                const b = ((data[i + 2] - 128) * c + 128) * br;
                const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                data[i] = Math.max(0, Math.min(255, Math.round(gray + (r - gray) * sat)));
                data[i + 1] = Math.max(0, Math.min(255, Math.round(gray + (g - gray) * sat)));
                data[i + 2] = Math.max(0, Math.min(255, Math.round(gray + (b - gray) * sat)));
            }
            break;
        }

        case 'midnight': {
            // Cool sapphire night cast
            const c = 1 + 0.15 * clamped;
            const br = 1 - 0.08 * clamped;
            const coolShift = 30 * clamped;
            for (let i = 0; i < len; i += 4) {
                const r = ((data[i] - 128) * c + 128) * br - coolShift * 0.4;
                const g = ((data[i + 1] - 128) * c + 128) * br;
                const b = ((data[i + 2] - 128) * c + 128) * br + coolShift;
                data[i] = Math.max(0, Math.min(255, Math.round(r)));
                data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
                data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
            }
            break;
        }

        case 'cross-process': {
            // X-Pro cross processed film
            const c = 1 + 0.25 * clamped;
            const sat = 1 + 0.3 * clamped;
            for (let i = 0; i < len; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];
                const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                if (lum < 0.5) {
                    const w = (0.5 - lum) * 2 * clamped;
                    r -= 15 * w;
                    g += 20 * w;
                    b += 5 * w;
                } else {
                    const w = (lum - 0.5) * 2 * clamped;
                    r += 25 * w;
                    g += 10 * w;
                    b -= 20 * w;
                }
                const cr = (r - 128) * c + 128;
                const cg = (g - 128) * c + 128;
                const cb = (b - 128) * c + 128;
                const gray = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
                data[i] = Math.max(0, Math.min(255, Math.round(gray + (cr - gray) * sat)));
                data[i + 1] = Math.max(0, Math.min(255, Math.round(gray + (cg - gray) * sat)));
                data[i + 2] = Math.max(0, Math.min(255, Math.round(gray + (cb - gray) * sat)));
            }
            break;
        }

        case 'neon': {
            // Cyberpunk magenta & cyan drift
            const c = 1 + 0.3 * clamped;
            const sat = 1 + 0.5 * clamped;
            for (let i = 0; i < len; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];
                const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                if (lum < 0.5) {
                    const w = (0.5 - lum) * 2 * clamped;
                    r -= 25 * w;
                    g += 15 * w;
                    b += 40 * w;
                } else {
                    const w = (lum - 0.5) * 2 * clamped;
                    r += 45 * w;
                    g -= 15 * w;
                    b += 30 * w;
                }
                const cr = (r - 128) * c + 128;
                const cg = (g - 128) * c + 128;
                const cb = (b - 128) * c + 128;
                const gray = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
                data[i] = Math.max(0, Math.min(255, Math.round(gray + (cr - gray) * sat)));
                data[i + 1] = Math.max(0, Math.min(255, Math.round(gray + (cg - gray) * sat)));
                data[i + 2] = Math.max(0, Math.min(255, Math.round(gray + (cb - gray) * sat)));
            }
            break;
        }

        case 'duotone': {
            // High-impact match poster: deep navy shadows and crimson highlights
            for (let i = 0; i < len; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const t = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                const duoR = 15 + 225 * t;
                const duoG = 20 + 15 * t;
                const duoB = 55 - 10 * t;
                data[i] = Math.max(0, Math.min(255, Math.round(r + (duoR - r) * clamped)));
                data[i + 1] = Math.max(0, Math.min(255, Math.round(g + (duoG - g) * clamped)));
                data[i + 2] = Math.max(0, Math.min(255, Math.round(b + (duoB - b) * clamped)));
            }
            break;
        }

        default:
            break;
    }
}

/**
 * Draws an image (or cropped image region) to a canvas context, applying the selected photo filter.
 * Uses hardware-accelerated ctx.filter when supported by the browser (Chrome, Firefox, Edge).
 * Seamlessly falls back to an offscreen buffer with pixel-exact color grading on browsers
 * that lack CanvasRenderingContext2D.filter (Safari / WebKit on iOS and macOS).
 */
export function drawImageWithStoryFilter(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement | HTMLCanvasElement,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    filterId?: StoryPhotoFilterId,
    filterStrength = 1.0,
    filterCss = ''
): void {
    const hasFilter = Boolean(filterId && filterId !== 'none' && filterStrength > 0);

    // Fast path: no filter active
    if (!hasFilter) {
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
        return;
    }

    const isSvgFilter = Boolean(
        filterId &&
        (filterId.startsWith('selective-') || filterId === 'cinematic' || filterId === 'neon' || filterId === 'duotone')
    );

    // Path 1: Native hardware-accelerated canvas filter (Chrome, Firefox, Edge)
    // Note: SVG url(#...) filters cannot be reliably applied via ctx.filter
    // across all canvas contexts without tainting or cross-origin restrictions, so we bypass to Path 2.
    if (supportsCanvasFilter() && !isSvgFilter) {
        ctx.save();
        if (filterCss) {
            ctx.filter = filterCss;
        }
        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
        ctx.restore();
        return;
    }

    // Path 2: WebKit / Safari iOS fallback:
    // Render to an offscreen buffer canvas, apply pixel-exact color grading, and blit to destination ctx.
    // Blitting through ctx.drawImage preserves any active clipping paths (such as card rounded corners).
    if (typeof document !== 'undefined') {
        try {
            const bufW = Math.max(1, Math.round(dw));
            const bufH = Math.max(1, Math.round(dh));
            const buffer = document.createElement('canvas');
            buffer.width = bufW;
            buffer.height = bufH;
            const bCtx = buffer.getContext('2d', { willReadFrequently: true });

            if (bCtx && typeof bCtx.getImageData === 'function' && typeof bCtx.putImageData === 'function') {
                bCtx.drawImage(img, sx, sy, sw, sh, 0, 0, bufW, bufH);
                const imgData = bCtx.getImageData(0, 0, bufW, bufH);
                applyStoryFilterToImageData(imgData, filterId!, filterStrength);
                bCtx.putImageData(imgData, 0, 0);
                ctx.drawImage(buffer, dx, dy, dw, dh);
                return;
            }
        } catch (err) {
            console.warn('Fallback story filter processing failed, drawing standard image:', err);
        }
    }

    // Path 3: Graceful fallback if DOM or offscreen context is not available
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
