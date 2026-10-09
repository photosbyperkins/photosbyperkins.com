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
    mode: 'solo' | 'crop' | 'padded';
    isDefault?: boolean;
}

export interface PaddedStyleOptions {
    style: 'frosted' | 'solid' | 'glass' | 'custom' | 'noir';
    customColor?: string;
    position?: 'center' | 'elevated'; // Deprecated: always centered
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

export type StoryBadgePosition =
    'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export const DEFAULT_SCOREBOARD_POSITION: StoryBadgePosition = 'bottom-center';
export const DEFAULT_ATTRIBUTION_POSITION: StoryBadgePosition = 'top-center';

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
    scoreboardPosition?: StoryBadgePosition;
    attributionPosition?: StoryBadgePosition;
    isEventAmbiguous?: boolean;
}

export type StoryPhotoFilterId =
    | 'none'
    | 'bw'
    | 'bw-contrast'
    | 'warm'
    | 'vivid'
    | 'matte'
    | 'noir'
    | 'sepia'
    | 'chrome'
    | 'bleach'
    | 'portra'
    | 'cinematic'
    | 'cross-process'
    | 'hard-flash'
    | 'midnight'
    | 'selective-red'
    | 'selective-green'
    | 'selective-blue'
    | 'selective-yellow'
    | 'selective-purple'
    | 'neon'
    | 'duotone';

export type StoryPhotoFilterCategory = 'classic' | 'cinematic' | 'selective' | 'stylized';

export type StoryPhotoFilterTabCategory = 'all' | 'recent' | StoryPhotoFilterCategory;

export interface StoryPhotoFilterCategoryMeta {
    id: StoryPhotoFilterTabCategory;
    label: string;
    description: string;
    group?: 'scope' | 'themes';
}

export const STORY_FILTER_CATEGORIES: StoryPhotoFilterCategoryMeta[] = [
    { id: 'all', label: 'All', description: 'All photo filters', group: 'scope' },
    { id: 'recent', label: 'Recent', description: 'Recently downloaded or shared filters', group: 'scope' },
    { id: 'classic', label: 'Classic', description: 'Monochrome, vintage, and essential tone grades', group: 'themes' },
    { id: 'cinematic', label: 'Cinematic', description: 'Analog film stocks and cinematic color grades', group: 'themes' },
    { id: 'selective', label: 'Pop', description: 'Selective color pop on monochrome backgrounds', group: 'themes' },
    { id: 'stylized', label: 'Stylized', description: 'Neon glow and bold graphic duotones', group: 'themes' },
];

export interface StoryPhotoFilter {
    id: StoryPhotoFilterId;
    label: string;
    description: string;
    cssFilter: string;
    category?: StoryPhotoFilterCategory;
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
        label: 'Mono',
        description: 'Classic balanced monochrome',
        cssFilter: 'grayscale(100%) contrast(108%)',
        category: 'classic',
    },
    {
        id: 'bw-contrast',
        label: 'Hi-Con Mono',
        description: 'High contrast black & white with deep blacks',
        cssFilter: 'grayscale(100%) contrast(160%) brightness(95%)',
        category: 'classic',
    },
    {
        id: 'warm',
        label: 'Vintage',
        description: 'Golden hour ambient warmth',
        cssFilter: 'sepia(28%) saturate(120%) contrast(105%) brightness(102%)',
        category: 'classic',
    },
    {
        id: 'vivid',
        label: 'Vivid',
        description: 'Punchy saturated action colors',
        cssFilter: 'contrast(115%) saturate(140%) brightness(102%)',
        category: 'classic',
    },
    {
        id: 'matte',
        label: 'Matte',
        description: 'Soft film faded shadows',
        cssFilter: 'contrast(88%) brightness(108%) saturate(90%)',
        category: 'classic',
    },
    {
        id: 'noir',
        label: 'Noir',
        description: 'Dramatic deep cinematic shadows',
        cssFilter: 'contrast(130%) brightness(90%) saturate(85%)',
        category: 'classic',
    },
    {
        id: 'sepia',
        label: 'Sepia',
        description: 'Antique warm sepia tone',
        cssFilter: 'sepia(75%) contrast(105%) brightness(98%)',
        category: 'classic',
    },
    {
        id: 'chrome',
        label: 'Chrome',
        description: 'Vivid 90s action sports slide film with punchy contrast',
        cssFilter: 'contrast(128%) saturate(145%) brightness(98%)',
        category: 'cinematic',
    },
    {
        id: 'bleach',
        label: 'Bleach',
        description: 'Gritty silver-rich high contrast with muted colors',
        cssFilter: 'contrast(135%) saturate(35%) brightness(102%)',
        category: 'cinematic',
    },
    {
        id: 'portra',
        label: 'Portra',
        description: 'Soft pastel warmth and flattering skin tones',
        cssFilter: 'contrast(94%) brightness(105%) saturate(108%) sepia(18%)',
        category: 'cinematic',
    },
    {
        id: 'cinematic',
        label: 'Teal & Orange',
        description: 'Hollywood split-toning with warm skin tones and teal shadows',
        cssFilter: 'url(#story-filter-cinematic-swatch)',
        category: 'cinematic',
    },
    {
        id: 'cross-process',
        label: 'X-Pro',
        description: 'Cross-processed film with greenish shadows and golden highlights',
        cssFilter: 'contrast(125%) saturate(130%) sepia(30%) hue-rotate(50deg)',
        category: 'cinematic',
    },
    {
        id: 'hard-flash',
        label: 'Hard Flash',
        description: 'Direct flash skate zine look with blown specular pop',
        cssFilter: 'contrast(140%) brightness(115%) saturate(110%)',
        category: 'cinematic',
    },
    {
        id: 'midnight',
        label: 'Midnight',
        description: 'Deep cool cobalt shadows and twilight arena mood',
        cssFilter: 'contrast(115%) brightness(92%) saturate(95%) hue-rotate(190deg) sepia(22%)',
        category: 'cinematic',
    },
    {
        id: 'selective-red',
        label: 'Red Pop',
        description: 'Isolate vibrant red tones and desaturate background',
        cssFilter: 'url(#story-filter-selective-red-swatch)',
        category: 'selective',
    },
    {
        id: 'selective-green',
        label: 'Green Pop',
        description: 'Isolate vibrant green tones and desaturate background',
        cssFilter: 'url(#story-filter-selective-green-swatch)',
        category: 'selective',
    },
    {
        id: 'selective-blue',
        label: 'Blue Pop',
        description: 'Isolate vibrant blue tones and desaturate background',
        cssFilter: 'url(#story-filter-selective-blue-swatch)',
        category: 'selective',
    },
    {
        id: 'selective-yellow',
        label: 'Yellow Pop',
        description: 'Isolate vibrant yellow & gold tones and desaturate background',
        cssFilter: 'url(#story-filter-selective-yellow-swatch)',
        category: 'selective',
    },
    {
        id: 'selective-purple',
        label: 'Purple Pop',
        description: 'Isolate vibrant purple & magenta tones and desaturate background',
        cssFilter: 'url(#story-filter-selective-purple-swatch)',
        category: 'selective',
    },
    {
        id: 'neon',
        label: 'Neon',
        description: 'Electric magenta and cyan roller rink vibe',
        cssFilter: 'url(#story-filter-neon-swatch)',
        category: 'stylized',
    },
    {
        id: 'duotone',
        label: 'Duotone',
        description: 'High-impact crimson and navy match poster treatment',
        cssFilter: 'url(#story-filter-duotone-swatch)',
        category: 'stylized',
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
    if (filterId === 'selective-red') return 'url(#story-filter-selective-red)';
    if (filterId === 'selective-green') return 'url(#story-filter-selective-green)';
    if (filterId === 'selective-blue') return 'url(#story-filter-selective-blue)';
    if (filterId === 'selective-yellow') return 'url(#story-filter-selective-yellow)';
    if (filterId === 'selective-purple') return 'url(#story-filter-selective-purple)';
    if (filterId === 'cinematic') return 'url(#story-filter-cinematic)';
    if (filterId === 'neon') return 'url(#story-filter-neon)';
    if (filterId === 'duotone') return 'url(#story-filter-duotone)';
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
        case 'chrome':
            return `contrast(${Math.round(100 + 28 * clamped)}%) saturate(${Math.round(100 + 45 * clamped)}%) brightness(${Math.round(100 - 2 * clamped)}%)`;
        case 'bleach':
            return `contrast(${Math.round(100 + 35 * clamped)}%) saturate(${Math.round(100 - 65 * clamped)}%) brightness(${Math.round(100 + 2 * clamped)}%)`;
        case 'portra':
            return `contrast(${Math.round(100 - 6 * clamped)}%) brightness(${Math.round(100 + 5 * clamped)}%) saturate(${Math.round(100 + 8 * clamped)}%) sepia(${Math.round(18 * clamped)}%)`;
        case 'cross-process':
            return `contrast(${Math.round(100 + 25 * clamped)}%) saturate(${Math.round(100 + 30 * clamped)}%) sepia(${Math.round(30 * clamped)}%) hue-rotate(${Math.round(50 * clamped)}deg)`;
        case 'hard-flash':
            return `contrast(${Math.round(100 + 40 * clamped)}%) brightness(${Math.round(100 + 15 * clamped)}%) saturate(${Math.round(100 + 10 * clamped)}%)`;
        case 'midnight':
            return `contrast(${Math.round(100 + 15 * clamped)}%) brightness(${Math.round(100 - 8 * clamped)}%) saturate(${Math.round(100 - 5 * clamped)}%) hue-rotate(${Math.round(190 * clamped)}deg) sepia(${Math.round(22 * clamped)}%)`;
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
    mode: 'solo' | 'crop' | 'padded' | 'burst';
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
