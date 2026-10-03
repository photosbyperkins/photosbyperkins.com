import type { ExifData } from '../../types';
import type { StoryFrameId } from '../../components/sections/Portfolio/storyFrames/types';

export const STORY_ASPECT_RATIO = 9 / 16; // 0.5625
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
export const P_ADJUSTMENT = -6;

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
    style: 'frosted' | 'solid' | 'glass' | 'custom' | 'noir';
    customColor?: string;
    position: 'center' | 'elevated';
    cardScale: number; // 0.8..1.0 (default: 0.92)
    cardCornerRadius: number; // in pixels at 1080x1920 (default: 24)
}

/**
 * Converts a hex or rgb color string into an rgba string with the specified or calculated opacity.
 * Used for translucent frosted glass overlay tints.
 */
export function hexToRgba(hexOrRgb: string, customAlpha?: number): string {
    const trimmed = (hexOrRgb || '').trim();
    if (trimmed.startsWith('rgba')) {
        return trimmed;
    }
    if (trimmed.startsWith('rgb')) {
        const m = trimmed.match(/\d+/g);
        if (m && m.length >= 3) {
            const r = parseInt(m[0], 10);
            const g = parseInt(m[1], 10);
            const b = parseInt(m[2], 10);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const alpha = customAlpha !== undefined ? customAlpha : luminance > 0.7 ? 0.4 : 0.5;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }
    let hex = trimmed.replace('#', '');
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((c) => c + c)
            .join('');
    }
    if (hex.length === 6) {
        const num = parseInt(hex, 16);
        if (!isNaN(num)) {
            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const alpha = customAlpha !== undefined ? customAlpha : luminance > 0.7 ? 0.4 : 0.5;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }
    return `rgba(10, 10, 18, ${customAlpha ?? 0.5})`;
}

/**
 * Determines whether a color is light or dark based on standard perceived luminance.
 */
export function isColorLight(hexOrRgb: string): boolean {
    const trimmed = (hexOrRgb || '').trim();
    if (trimmed.startsWith('rgb')) {
        const m = trimmed.match(/\d+/g);
        if (m && m.length >= 3) {
            const r = parseInt(m[0], 10);
            const g = parseInt(m[1], 10);
            const b = parseInt(m[2], 10);
            return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
        }
    }
    let hex = trimmed.replace('#', '');
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((c) => c + c)
            .join('');
    }
    if (hex.length === 6) {
        const num = parseInt(hex, 16);
        if (!isNaN(num)) {
            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;
            return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
        }
    }
    return false;
}

export interface BadgeOptions {
    showScoreboard: boolean;
    showScores?: boolean;
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
        label: 'B&W+',
        description: 'High contrast black & white with deep blacks',
        cssFilter: 'grayscale(100%) contrast(160%) brightness(95%)',
    },
    {
        id: 'warm',
        label: 'Vintage',
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
        label: 'Noir',
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

/**
 * Calculates CSS filter string for a given filter and strength level (0..1).
 */
export function getStoryFilterCss(filterId: StoryPhotoFilterId, strength = 1.0): string {
    if (!filterId || filterId === 'none' || strength <= 0) return 'none';
    const clamped = Math.max(0, Math.min(1, strength));
    if (clamped >= 0.99) {
        return STORY_PHOTO_FILTERS_MAP[filterId]?.cssFilter || 'none';
    }
    switch (filterId) {
        case 'bw':
            return `grayscale(${Math.round(100 * clamped)}%) contrast(${Math.round(100 + 8 * clamped)}%)`;
        case 'bw-contrast':
            return `grayscale(${Math.round(100 * clamped)}%) contrast(${Math.round(100 + 60 * clamped)}%) brightness(${Math.round(100 - 5 * clamped)}%)`;
        case 'warm':
            return `sepia(${Math.round(28 * clamped)}%) saturate(${Math.round(100 + 20 * clamped)}%) contrast(${Math.round(100 + 5 * clamped)}%) brightness(${Math.round(100 + 2 * clamped)}%)`;
        case 'vivid':
            return `contrast(${Math.round(100 + 15 * clamped)}%) saturate(${Math.round(100 + 40 * clamped)}%) brightness(${Math.round(100 + 2 * clamped)}%)`;
        case 'matte':
            return `contrast(${Math.round(100 - 12 * clamped)}%) brightness(${Math.round(100 + 8 * clamped)}%) saturate(${Math.round(100 - 10 * clamped)}%)`;
        case 'noir':
            return `contrast(${Math.round(100 + 30 * clamped)}%) brightness(${Math.round(100 - 10 * clamped)}%) saturate(${Math.round(100 - 15 * clamped)}%)`;
        case 'sepia':
            return `sepia(${Math.round(75 * clamped)}%) contrast(${Math.round(100 + 5 * clamped)}%) brightness(${Math.round(100 - 2 * clamped)}%)`;
        default:
            return 'none';
    }
}

export type BurstDividerStyle = 'hairline' | 'gutter' | 'filmstrip';

export interface BurstStoryOptions {
    dividerStyle: BurstDividerStyle;
    showTimeStamps: boolean;
    panelCount?: 2 | 3;
    isTriptych?: boolean;
    timeStamps?: number[]; // [0.0, 0.84, 1.42] seconds elapsed
    focusYList?: number[]; // vertical focal centers per panel (defaults to 0.5)
    panOffsets?: { x: number; y: number; zoom?: number }[]; // per-panel 2D pan and zoom (normalized 0..1, zoom 1..3.5)
}

export interface StoryRenderConfig {
    mode: 'crop' | 'padded' | 'burst';
    crop: NormalizedCrop;
    padded: PaddedStyleOptions;
    burst?: BurstStoryOptions;
    badges: BadgeOptions;
    resolution?: '1080x1920' | '1440x2560' | '2160x3840';
    cardTheme?: 'dark' | 'light';
    badgeTheme?: 'dark' | 'light';
    frameId?: StoryFrameId;
    frameColorOverride?: string;
    exif?: ExifData;
    filterId?: StoryPhotoFilterId;
    filterStrength?: number;
}
