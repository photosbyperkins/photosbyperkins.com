import type { FaceBox, FocusSource } from '../types';

/** The subject-detection fields of a photo (see scripts/detectFaces.py). */
export interface SubjectFraming {
    focusX?: number;
    focusY?: number;
    focusSource?: FocusSource;
    faces?: FaceBox[];
}

/**
 * Where the top of the subject's head should sit in a crop, as a fraction of the crop height from
 * the top. ~28% leaves natural headroom while keeping the face in the upper third.
 */
export const HEAD_TOP_AT = 0.28;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Returns the normalised centre for a crop of `cropW` × `cropH` (fractions of the image size) that
 * frames the detected subject with headroom. For face/person sources `focusY` marks the top of the
 * head, so it is placed {@link HEAD_TOP_AT} down the crop rather than dead centre; saliency and
 * unknown sources are centred as-is. Callers are responsible for clamping the crop to the image.
 */
export function subjectCropCenter(photo: SubjectFraming, cropW: number, cropH: number): { x: number; y: number } {
    const fx = isNum(photo.focusX) ? photo.focusX : 0.5;
    const fy = isNum(photo.focusY) ? photo.focusY : 0.5;
    if (photo.focusSource !== 'face' && photo.focusSource !== 'person') return { x: fx, y: fy };

    let x = fx;
    // If every significant face fits comfortably across the crop, centre on the group instead of the lead.
    const boxes = (photo.faces || []).filter((f) => isNum(f.x) && isNum(f.w));
    if (photo.focusSource === 'face' && boxes.length > 1) {
        const minX = Math.min(...boxes.map((f) => f.x - (f.w as number) / 2));
        const maxX = Math.max(...boxes.map((f) => f.x + (f.w as number) / 2));
        if (maxX - minX <= cropW * 0.8) x = (minX + maxX) / 2;
    }
    return { x, y: fy + (0.5 - HEAD_TOP_AT) * cropH };
}

/**
 * Pixel crop rectangle of `cropW` × `cropH` inside an `imgW` × `imgH` image, framed on the subject
 * and clamped to the image bounds.
 */
export function subjectCropRect(
    imgW: number,
    imgH: number,
    cropW: number,
    cropH: number,
    photo: SubjectFraming
): { left: number; top: number; width: number; height: number } {
    const c = subjectCropCenter(photo, cropW / imgW, cropH / imgH);
    const left = Math.max(0, Math.min(imgW - cropW, Math.round(c.x * imgW - cropW / 2)));
    const top = Math.max(0, Math.min(imgH - cropH, Math.round(c.y * imgH - cropH / 2)));
    return { left, top, width: cropW, height: cropH };
}
