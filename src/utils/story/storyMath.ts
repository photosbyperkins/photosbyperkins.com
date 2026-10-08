import type { FaceBox, FocusSource } from '../../types';
import type { NormalizedCrop, StoryPreset } from './storyConstants';
import { STORY_ASPECT_RATIO } from './storyConstants';

export const BURST_PANEL_ASPECT_RATIO = 27 / 16; // 1.6875 (matches 1080 / (1920 / 3))
export const DUET_PANEL_ASPECT_RATIO = 9 / 8; // 1.125 (matches 1080 / (1920 / 2))

/**
 * Calculates the active default zoom level for a burst panel derived dynamically from the photo's aspect ratio.
 *
 * For standard DSLR/mirrorless 3:2 landscape photos (1.50) in a 27:16 panel (1.6875):
 * - Aspect ratio mismatch = 1.6875 / 1.50 = 1.125
 * - With a 10/9 headroom factor (1.111), this yields 1.25x zoom, giving balanced 20% horizontal
 *   and ~29% vertical panning headroom.
 *
 * For wider images (e.g. 16:9), it yields ~1.17x so height has active vertical pan travel without
 * over-cropping. For narrower images (e.g. 4:3), it yields ~1.41x so width has active horizontal pan travel.
 * Clamped between 1.15 and 2.0 to ensure a clean, comfortable active default across any camera format.
 *
 * @param imgW Source image natural width
 * @param imgH Source image natural height
 * @param panelAspectRatio Target aspect ratio of the panel (defaults to 27 / 16 = 1.6875)
 */
export function calculateDefaultBurstZoom(
    imgW: number,
    imgH: number,
    panelAspectRatio = BURST_PANEL_ASPECT_RATIO
): number {
    if (!imgW || !imgH) return 1.25;
    const imgRatio = imgW / imgH;
    const targetAspect = panelAspectRatio > 0 ? panelAspectRatio : BURST_PANEL_ASPECT_RATIO;

    // Aspect ratio divergence factor relative to panel
    const mismatch = Math.max(targetAspect / imgRatio, imgRatio / targetAspect);

    // Baseline headroom multiplier (1.125 mismatch * 10/9 = 1.25 for 3:2 photos)
    const headroomFactor = 1.25 / 1.125; // 10/9 ≈ 1.1111
    const derived = mismatch * headroomFactor;

    return parseFloat(Math.max(1.15, Math.min(2.0, derived)).toFixed(2));
}

/**
 * Calculates a normalized crop rectangle for a burst story panel centered at (centerX, centerY) with a given zoom.
 * Ensures the crop always completely fills the panel (aspect ratio panelAspectRatio) with zero black bars / letterboxing.
 * Minimum zoom 1.0 corresponds to exact cover fit.
 * Default zoom is derived dynamically from the photo's aspect ratio (1.25x for 3:2 DSLR/mirrorless photos).
 *
 * @param imgW Source image natural width
 * @param imgH Source image natural height
 * @param centerX Normalized horizontal center (0..1)
 * @param centerY Normalized vertical center (0..1)
 * @param zoom Zoom multiplier (1.0..3.5). If omitted, derived from photo aspect ratio.
 * @param panelAspectRatio Target aspect ratio of the panel (defaults to 27 / 16 = 1.6875)
 */
export function calculateBurstPanelCrop(
    imgW: number,
    imgH: number,
    centerX: number,
    centerY: number,
    zoom?: number,
    panelAspectRatio = BURST_PANEL_ASPECT_RATIO
): NormalizedCrop {
    const effectiveZoom =
        typeof zoom === 'number' && !isNaN(zoom) ? zoom : calculateDefaultBurstZoom(imgW, imgH, panelAspectRatio);
    const safeZoom = Math.max(1.0, Math.min(3.5, effectiveZoom));
    const targetAspect = panelAspectRatio > 0 ? panelAspectRatio : BURST_PANEL_ASPECT_RATIO;
    const safeW = imgW || 1920;
    const safeH = imgH || 1080;
    const imgRatio = safeW / safeH;

    let cropW: number;
    let cropH: number;

    if (imgRatio >= targetAspect) {
        // Image is wider than panel (e.g. 16:9 photo in 1.6875 panel, or panoramic)
        cropH = safeH / safeZoom;
        cropW = cropH * targetAspect;
    } else {
        // Image is narrower than panel (e.g. 3:2 landscape photo or 4:3 photo in 1.6875 panel)
        cropW = safeW / safeZoom;
        cropH = cropW / targetAspect;
    }

    // Clamp center coordinates so the crop never samples outside the source image
    const halfW = cropW / 2;
    const halfH = cropH / 2;

    const minX = halfW;
    const maxX = Math.max(minX, safeW - halfW);
    const minY = halfH;
    const maxY = Math.max(minY, safeH - halfH);

    const safeCenterX = Math.max(0, Math.min(1, typeof centerX === 'number' && !isNaN(centerX) ? centerX : 0.5));
    const safeCenterY = Math.max(0, Math.min(1, typeof centerY === 'number' && !isNaN(centerY) ? centerY : 0.5));

    const clampedCenterX = Math.max(minX, Math.min(maxX, safeCenterX * safeW));
    const clampedCenterY = Math.max(minY, Math.min(maxY, safeCenterY * safeH));

    const left = clampedCenterX - halfW;
    const top = clampedCenterY - halfH;

    return {
        x: Math.max(0, Math.min(1, left / safeW)),
        y: Math.max(0, Math.min(1, top / safeH)),
        width: Math.max(0, Math.min(1, cropW / safeW)),
        height: Math.max(0, Math.min(1, cropH / safeH)),
        zoom: safeZoom,
        centerX: clampedCenterX / safeW,
        centerY: clampedCenterY / safeH,
    };
}

/**
 * Calculates the exact zoom level required to fit 100% of the photo inside the 9:16 story frame
 * with the specified card scale (defaults to 0.92 for comfortable glassmorphic letterbox margins).
 *
 * @param imgW Source image natural width
 * @param imgH Source image natural height
 * @param cardScale Fraction of story width (or height) the fitted card occupies (default: 0.92)
 */
export function calculateFitZoom(imgW: number, imgH: number, cardScale = 0.92): number {
    const scale = Math.max(0.5, Math.min(1.0, cardScale));
    if (!imgW || !imgH) return scale;
    const imgRatio = imgW / imgH;
    if (imgRatio >= STORY_ASPECT_RATIO) {
        // Image is wider than 9:16 (e.g. 3:2 landscape) -> width constrains fit
        return parseFloat(((STORY_ASPECT_RATIO / imgRatio) * scale).toFixed(3));
    }
    // Image is narrower than 9:16 -> height constrains fit
    return parseFloat(((imgRatio / STORY_ASPECT_RATIO) * scale).toFixed(3));
}

/**
 * Calculates a normalized 9:16 crop rectangle centered at (centerX, centerY) with a given zoom.
 * Supports continuous zoom from fitZoom (< 1.0, uncropped padded letterbox) to 3.5 (tight action crop).
 * When zoomed out (zoom < 1.0), the crop expands beyond the image bounds and centers the card.
 */
export function calculateNormalizedCrop(
    imgW: number,
    imgH: number,
    centerX: number,
    centerY: number,
    zoom = 1.0,
    minZoom?: number
): NormalizedCrop {
    const safeMinZoom = minZoom !== undefined ? Math.max(0.05, minZoom) : Math.min(1.0, zoom);
    const safeZoom = Math.max(safeMinZoom, Math.min(3.5, zoom));
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

    // Clamp center coordinates so the crop never samples outside the source image when zoom >= 1.0.
    // When zoom < 1.0 (crop exceeds image dimensions), lock to center so the card remains centered.
    const halfW = cropW / 2;
    const halfH = cropH / 2;

    let clampedCenterX: number;
    if (cropW >= imgW) {
        clampedCenterX = imgW / 2;
    } else {
        const minX = halfW;
        const maxX = imgW - halfW;
        clampedCenterX = Math.max(
            minX,
            Math.min(maxX, (typeof centerX === 'number' && !isNaN(centerX) ? centerX : 0.5) * imgW)
        );
    }

    let clampedCenterY: number;
    if (cropH >= imgH) {
        clampedCenterY = imgH / 2;
    } else {
        const minY = halfH;
        const maxY = imgH - halfH;
        clampedCenterY = Math.max(
            minY,
            Math.min(maxY, (typeof centerY === 'number' && !isNaN(centerY) ? centerY : 0.5) * imgH)
        );
    }

    const left = clampedCenterX - halfW;
    const top = clampedCenterY - halfH;

    return {
        x: left / imgW,
        y: top / imgH,
        width: cropW / imgW,
        height: cropH / imgH,
        zoom: safeZoom,
        centerX: clampedCenterX / imgW,
        centerY: clampedCenterY / imgH,
    };
}

/** Axis-aligned rectangle in frame units (pixels, cqw, etc. — callers choose). */
export interface CardRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Per-corner radii in CSS / canvas `roundRect` order: [top-left, top-right, bottom-right, bottom-left]. */
export type CornerRadii = [number, number, number, number];

/**
 * Maps a solo-mode normalized crop to the photo card's rectangle inside a frame of `frameW × frameH`.
 * The crop window always fills the frame, so the full image (the card) is scaled by 1/crop size and
 * offset by the crop origin. Mirrors the StoryCropper preview transform exactly.
 */
export function getCardRectFromCrop(
    crop: Pick<NormalizedCrop, 'x' | 'y' | 'width' | 'height'>,
    frameW: number,
    frameH: number
): CardRect {
    const cw = Math.max(0.001, crop.width);
    const ch = Math.max(0.001, crop.height);
    const width = frameW / cw;
    const height = frameH / ch;
    return { x: -crop.x * width, y: -crop.y * height, width, height };
}

/**
 * Dynamic per-corner radii for a rounded photo card inside a frame.
 *
 * Each corner's radius is limited by the inset gap between the card and the frame along both of its
 * adjacent edges: a full `baseRadius` when the card sits comfortably inside the frame, shrinking
 * linearly to 0 as either edge approaches the frame edge, and 0 when that edge touches or bleeds
 * past it. This avoids half-clipped rounded corners at intermediate pan / zoom positions.
 *
 * All inputs and outputs share the same units.
 */
export function calculateCardCornerRadii(
    card: CardRect,
    frameW: number,
    frameH: number,
    baseRadius: number
): CornerRadii {
    const base = Math.max(0, baseRadius);
    const gapL = card.x;
    const gapT = card.y;
    const gapR = frameW - (card.x + card.width);
    const gapB = frameH - (card.y + card.height);
    const corner = (h: number, v: number) => Math.max(0, Math.min(base, h, v));
    return [corner(gapL, gapT), corner(gapR, gapT), corner(gapR, gapB), corner(gapL, gapB)];
}

/** A detection box in normalised image coordinates (centre + size). */
interface SubjectBox {
    cx: number;
    cy: number;
    w: number;
    h: number;
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Assumed face size for legacy point-only faces (no w/h), whose `y` is the face top. */
const LEGACY_FACE_SIZE = 0.06;

function toSubjectBox(f: FaceBox | undefined, pointIsTop: boolean): SubjectBox | null {
    if (!f || !isFiniteNum(f.x) || !isFiniteNum(f.y)) return null;
    if (isFiniteNum(f.w) && isFiniteNum(f.h) && f.w > 0 && f.h > 0) {
        return { cx: f.x, cy: f.y, w: f.w, h: f.h };
    }
    const s = LEGACY_FACE_SIZE;
    return { cx: f.x, cy: pointIsTop ? f.y + s / 2 : f.y, w: s, h: s };
}

/** Normalised size of the 9:16 story crop at a given zoom (fractions of image width/height). */
function storyCropSize(imgW: number, imgH: number, zoom: number): { cw: number; ch: number } {
    const ratio = imgW > 0 && imgH > 0 ? imgW / imgH : 1.5;
    if (ratio >= STORY_ASPECT_RATIO) {
        const ch = 1 / zoom;
        return { cw: (ch * STORY_ASPECT_RATIO) / ratio, ch };
    }
    const cw = 1 / zoom;
    return { cw, ch: (cw * ratio) / STORY_ASPECT_RATIO };
}

/**
 * Generates context-aware 9:16 framing presets sorted from least zoomed in (padded) to most zoomed in.
 * Guaranteed to have at most 3 options.
 *
 * Uses detector output from scripts/detectFaces.py: `faces` and `subjects` are centre+size boxes with
 * the primary subject first; `focusSource` says whether the focus point came from a face, a person
 * (body) box or a saliency map. Point-only faces (legacy data) are treated as a face top.
 */
export function generateStoryPresets(options: {
    width: number;
    height: number;
    focusX?: number;
    focusY?: number;
    faces?: FaceBox[];
    subjects?: FaceBox[];
    focusSource?: FocusSource;
}): StoryPreset[] {
    const { width: w, height: h, focusX, focusY, focusSource } = options;
    const presets: StoryPreset[] = [];
    const crop = (cx: number, cy: number, zoom: number, minZoom?: number) =>
        calculateNormalizedCrop(w, h, cx, cy, zoom, minZoom);
    const { cw: cw1, ch: ch1 } = storyCropSize(w, h, 1);
    /** Crop centre Y that places `y` at fraction `at` from the top of a crop of height `ch`. */
    const anchorY = (y: number, at: number, ch: number) => y + (0.5 - at) * ch;

    const faces = (options.faces || []).map((f) => toSubjectBox(f, true)).filter((b): b is SubjectBox => !!b);
    const subjects = (options.subjects || [])
        .filter((s) => isFiniteNum(s?.w) && isFiniteNum(s?.h))
        .map((s) => toSubjectBox(s, false))
        .filter((b): b is SubjectBox => !!b);
    const hasFocus = isFiniteNum(focusX) && isFiniteNum(focusY);

    // --- ALWAYS OPTION 1: Least zoomed in (Padded letterbox view) ---
    const fitZoom = calculateFitZoom(w, h, 0.92);
    presets.push({
        id: 'padded-glass',
        label: 'Padded',
        description: 'Full uncropped image with letterbox background',
        crop: crop(0.5, 0.5, fitZoom, fitZoom),
        mode: 'solo',
    });

    /** Solo framing for one face: subject at 1×, close-up sized from its body box or face size. */
    const soloFacePresets = (face: SubjectBox, id: string, label: string, description: string) => {
        const main: StoryPreset = {
            id,
            label,
            description,
            crop: crop(face.cx, anchorY(face.cy, 0.35, ch1), 1.0),
            mode: 'solo',
        };
        const body = subjects.find(
            (s) => Math.abs(face.cx - s.cx) <= s.w / 2 && face.cy >= s.cy - s.h / 2 && face.cy <= s.cy
        );
        let zoom: number;
        let cx: number;
        let cy: number;
        if (body) {
            zoom = clamp(Math.min((0.92 * ch1) / body.h, cw1 / body.w), 1.15, 2.5);
            const { cw, ch } = storyCropSize(w, h, zoom);
            // Centre on the body, but keep the face in the middle 60% (outstretched arms widen the box)
            cx = clamp(body.cx, face.cx - 0.3 * cw, face.cx + 0.3 * cw);
            // ...and never crop off the top of the head.
            cy = Math.min(body.cy, face.cy - face.h / 2 - 0.05 * ch + ch / 2);
        } else {
            zoom = clamp((0.11 * ch1) / face.h, 1.15, 2.5);
            cx = face.cx;
            cy = anchorY(face.cy, 0.3, storyCropSize(w, h, zoom).ch);
        }
        const closeup: StoryPreset = {
            id: 'closeup',
            label: 'Close-up',
            description: body ? 'Tight framing on the athlete' : 'Tight framing on the face',
            crop: crop(cx, cy, zoom),
            mode: 'solo',
        };
        return [main, closeup];
    };

    if (faces.length >= 2) {
        // --- Duo / Group: frame the faces' bounding box with breathing room ---
        const isDuo = faces.length === 2;
        const groupId = isDuo ? 'duo' : 'pack';
        const groupLabel = isDuo ? 'Duo' : 'Group';
        const avgW = faces.reduce((s, f) => s + f.w, 0) / faces.length;
        const avgH = faces.reduce((s, f) => s + f.h, 0) / faces.length;
        const minX = Math.min(...faces.map((f) => f.cx - f.w / 2)) - avgW * 0.8;
        const maxX = Math.max(...faces.map((f) => f.cx + f.w / 2)) + avgW * 0.8;
        const minY = Math.min(...faces.map((f) => f.cy - f.h / 2)) - avgH * 0.8;
        const maxY = Math.max(...faces.map((f) => f.cy + f.h / 2)) + avgH * 0.8;
        const reqW = maxX - minX;
        const reqH = maxY - minY;
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        // Zoom at which the padded group exactly fills the crop (>1 means it fits at 1× with room to spare)
        const groupZoom = Math.min(cw1 / reqW, ch1 / reqH);
        const groupDescription = isDuo ? 'Frames both subjects together' : 'Frames all subjects together';
        const [lead, leadCloseup] = soloFacePresets(faces[0], 'lead', 'Lead', 'Framed on the primary subject');

        if (groupZoom >= 1) {
            presets.push({
                id: groupId,
                label: groupLabel,
                description: groupDescription,
                crop: crop(midX, anchorY(midY, 0.4, ch1), 1.0),
                mode: 'solo',
                isDefault: true,
            });
            if (groupZoom >= 1.2) {
                const zoom = Math.min(groupZoom, 2.2);
                presets.push({
                    id: 'closeup',
                    label: 'Close-up',
                    description: 'Tighter framing on the group',
                    crop: crop(midX, anchorY(midY, 0.4, storyCropSize(w, h, zoom).ch), zoom),
                    mode: 'solo',
                });
            } else {
                presets.push({ ...leadCloseup, id: 'lead', label: 'Lead', description: lead.description });
            }
        } else {
            // The group can't fit a 9:16 crop: default to the primary subject (unless the group nearly
            // fits, e.g. a posed line-up), and offer a zoomed-out (letterboxed) view that keeps everyone in
            // frame when it's meaningfully tighter than Padded.
            const fitGroupZoom = Math.max(fitZoom, groupZoom);
            const showGroup = fitGroupZoom - fitZoom >= 0.06;
            const preferGroup = showGroup && fitGroupZoom >= 0.85;
            presets.push(preferGroup ? lead : { ...lead, isDefault: true });
            if (showGroup) {
                presets.push({
                    id: groupId,
                    label: groupLabel,
                    description: groupDescription,
                    crop: crop(midX, midY, fitGroupZoom, fitZoom),
                    mode: 'solo',
                    ...(preferGroup ? { isDefault: true } : {}),
                });
            } else {
                presets.push(leadCloseup);
            }
        }
    } else if (faces.length === 1) {
        // --- Solo face ---
        const [main, closeup] = soloFacePresets(
            faces[0],
            'subject',
            'Subject',
            'Framed on skater with natural headroom'
        );
        presets.push({ ...main, isDefault: true }, closeup);
    } else if (subjects.length > 0 && focusSource !== 'saliency') {
        // --- Person detected but no usable face (helmets, backs, motion blur) ---
        const s = subjects[0];
        presets.push({
            id: 'subject',
            label: 'Subject',
            description: 'Framed on the athlete',
            crop: crop(s.cx, anchorY(s.cy - s.h / 2, 0.1, ch1), 1.0),
            mode: 'solo',
            isDefault: true,
        });
        const zoom = clamp(Math.min((0.85 * ch1) / s.h, cw1 / s.w), 1.1, 2.2);
        presets.push({
            id: 'closeup',
            label: 'Close-up',
            description: 'Tight framing on the athlete',
            crop: crop(s.cx, anchorY(s.cy - s.h / 2, 0.08, storyCropSize(w, h, zoom).ch), zoom),
            mode: 'solo',
        });
    } else if (hasFocus && focusSource === 'saliency') {
        // --- No people: frame the most salient, in-focus region ---
        presets.push({
            id: 'subject',
            label: 'Focus',
            description: 'Framed on the sharpest detail',
            crop: crop(focusX, focusY, 1.0),
            mode: 'solo',
            isDefault: true,
        });
        presets.push({
            id: 'closeup',
            label: 'Close-up',
            description: 'Dynamic 1.35x zoom on the detail',
            crop: crop(focusX, focusY, 1.35),
            mode: 'solo',
        });
    } else if (hasFocus) {
        // --- Legacy focus point (or person focus without boxes): treat it as a face top ---
        const [main, closeup] = soloFacePresets(
            { cx: focusX, cy: focusY + LEGACY_FACE_SIZE / 2, w: LEGACY_FACE_SIZE, h: LEGACY_FACE_SIZE },
            'subject',
            'Subject',
            'Framed on skater with natural headroom'
        );
        presets.push({ ...main, isDefault: true }, closeup);
    } else {
        // --- Nothing detected ---
        presets.push({
            id: 'center',
            label: 'Center',
            description: 'Balanced center composition',
            crop: crop(0.5, 0.5, 1.0),
            mode: 'solo',
            isDefault: true,
        });
        presets.push({
            id: 'closeup',
            label: 'Close-up',
            description: 'Dynamic 1.35x zoom on center action',
            crop: crop(0.5, 0.5, 1.35),
            mode: 'solo',
        });
    }

    // Guaranteed sort: least zoomed in (padded) to most zoomed in, and at most 3 options
    return presets.sort((a, b) => a.crop.zoom - b.crop.zoom).slice(0, 3);
}
