import type { FaceBox } from '../../types';
import type { NormalizedCrop, StoryPreset } from './storyConstants';
import { STORY_ASPECT_RATIO } from './storyConstants';

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
