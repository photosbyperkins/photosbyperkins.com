import { describe, it, expect, vi } from 'vitest';
import {
    calculateNormalizedCrop,
    calculateBurstPanelCrop,
    calculateDefaultBurstZoom,
    BURST_PANEL_ASPECT_RATIO,
    DUET_PANEL_ASPECT_RATIO,
    generateStoryPresets,
    drawCameraLogoIcon,
    renderStoryToCanvas,
    drawStoryFrameToCanvas,
    hexToRgba,
    isColorLight,
    getStoryFilterCss,
    applyStoryFilterToImageData,
    drawImageWithStoryFilter,
    supportsCanvasFilter,
    _setSupportsCanvasFilterForTesting,
    STORY_ASPECT_RATIO,
    STORY_PHOTO_FILTERS,
    STORY_PHOTO_FILTERS_MAP,
    P_ADJUSTMENT,
} from './storyCanvas';
import { STORY_FRAME_DEFINITIONS } from '../components/sections/Portfolio/storyFrames/frameDefinitions';

describe('storyCanvas calculations', () => {
    describe('calculateNormalizedCrop', () => {
        it('calculates 9:16 crop for 3:2 landscape image', () => {
            const imgW = 3840;
            const imgH = 2560;
            const crop = calculateNormalizedCrop(imgW, imgH, 0.5, 0.5, 1.0);

            // In landscape, cropH = imgH = 2560
            // cropW = 2560 * (9/16) = 1440
            // Normalized: crop.width = 1440 / 3840 = 0.375
            // crop.height = 2560 / 2560 = 1.0
            expect(crop.width).toBeCloseTo(1440 / 3840, 3);
            expect(crop.height).toBeCloseTo(1.0, 3);

            // Centered horizontally: (3840 - 1440) / 2 = 1200
            // Normalized: 1200 / 3840 = 0.3125
            expect(crop.x).toBeCloseTo(0.3125, 3);
            expect(crop.y).toBeCloseTo(0.0, 3);

            // Effective aspect ratio: (crop.width * imgW) / (crop.height * imgH) == 9/16
            const effectiveRatio = (crop.width * imgW) / (crop.height * imgH);
            expect(effectiveRatio).toBeCloseTo(STORY_ASPECT_RATIO, 4);
        });

        it('calculates 9:16 crop for 2:3 portrait image', () => {
            const imgW = 2560;
            const imgH = 3840;
            const crop = calculateNormalizedCrop(imgW, imgH, 0.5, 0.5, 1.0);

            // 2560 / 3840 = 0.6667 > 0.5625 (9:16), so crop height is still 100% of imgH
            const effectiveRatio = (crop.width * imgW) / (crop.height * imgH);
            expect(effectiveRatio).toBeCloseTo(STORY_ASPECT_RATIO, 4);
            expect(crop.height).toBeCloseTo(1.0, 3);
        });

        it('handles zoom correctly', () => {
            const imgW = 3840;
            const imgH = 2560;
            const zoom = 2.0;
            const crop = calculateNormalizedCrop(imgW, imgH, 0.5, 0.5, zoom);

            // At 2x zoom, crop dimensions should be half
            expect(crop.height).toBeCloseTo(0.5, 3);
            expect(crop.width).toBeCloseTo(1440 / 3840 / 2, 3);

            const effectiveRatio = (crop.width * imgW) / (crop.height * imgH);
            expect(effectiveRatio).toBeCloseTo(STORY_ASPECT_RATIO, 4);
        });

        it('clamps out of bounds coordinates so crop never leaves image', () => {
            const imgW = 3840;
            const imgH = 2560;
            // Far left center
            const cropLeft = calculateNormalizedCrop(imgW, imgH, -0.5, 0.5, 1.0);
            expect(cropLeft.x).toBe(0);

            // Far right center
            const cropRight = calculateNormalizedCrop(imgW, imgH, 1.5, 0.5, 1.0);
            expect(cropRight.x + cropRight.width).toBeCloseTo(1.0, 4);
        });
    });

    describe('calculateBurstPanelCrop', () => {
        it('calculates exact cover crop for 3:2 landscape image at minimum zoom 1.0 (zero letterboxing)', () => {
            const imgW = 3000;
            const imgH = 2000;
            const crop = calculateBurstPanelCrop(imgW, imgH, 0.5, 0.5, 1.0);

            // In 3:2 photo (1.50) into 27:16 panel (1.6875):
            // Width spans 100% of image width: cropW = 3000
            // cropH = 3000 / 1.6875 = 1777.78
            expect(crop.width).toBeCloseTo(1.0, 3);
            expect(crop.height).toBeCloseTo(1777.78 / 2000, 3);
            expect(crop.x).toBeCloseTo(0.0, 3);
            expect(crop.y).toBeCloseTo((2000 - 1777.78) / 2 / 2000, 3);

            // Aspect ratio matches panel aspect ratio exactly
            const effectiveRatio = (crop.width * imgW) / (crop.height * imgH);
            expect(effectiveRatio).toBeCloseTo(BURST_PANEL_ASPECT_RATIO, 4);
        });

        it('provides active pan travel in both X and Y at default zoom 1.25', () => {
            const imgW = 3000;
            const imgH = 2000;
            const crop = calculateBurstPanelCrop(imgW, imgH, 0.5, 0.5, 1.25);

            // At 1.25x zoom, crop dimensions shrink below 1.0, allowing active panning in all directions
            expect(crop.width).toBeCloseTo(0.8, 3);
            expect(crop.height).toBeCloseTo(0.7111, 3);
            expect(crop.zoom).toBe(1.25);

            // Effective aspect ratio is preserved
            const effectiveRatio = (crop.width * imgW) / (crop.height * imgH);
            expect(effectiveRatio).toBeCloseTo(BURST_PANEL_ASPECT_RATIO, 4);
        });

        it('calculates cover crop for 16:9 image at minimum zoom 1.0', () => {
            const imgW = 3840;
            const imgH = 2160;
            const crop = calculateBurstPanelCrop(imgW, imgH, 0.5, 0.5, 1.0);

            // In 16:9 photo (1.778) into 27:16 panel (1.6875):
            // Height spans 100% of image height: cropH = 2160
            // cropW = 2160 * 1.6875 = 3645
            expect(crop.height).toBeCloseTo(1.0, 3);
            expect(crop.width).toBeCloseTo(3645 / 3840, 3);

            const effectiveRatio = (crop.width * imgW) / (crop.height * imgH);
            expect(effectiveRatio).toBeCloseTo(BURST_PANEL_ASPECT_RATIO, 4);
        });

        it('clamps out of bounds coordinates so burst panel crop never leaves image', () => {
            const imgW = 3000;
            const imgH = 2000;

            // Panned beyond top-left
            const cropTopLeft = calculateBurstPanelCrop(imgW, imgH, -0.5, -0.5, 1.25);
            expect(cropTopLeft.x).toBe(0);
            expect(cropTopLeft.y).toBe(0);

            // Panned beyond bottom-right
            const cropBottomRight = calculateBurstPanelCrop(imgW, imgH, 1.5, 1.5, 1.25);
            expect(cropBottomRight.x + cropBottomRight.width).toBeCloseTo(1.0, 4);
            expect(cropBottomRight.y + cropBottomRight.height).toBeCloseTo(1.0, 4);
        });

        it('clamps zoom strictly between minimum 1.0 (fill frame) and maximum 3.5', () => {
            const imgW = 3000;
            const imgH = 2000;

            const underZoom = calculateBurstPanelCrop(imgW, imgH, 0.5, 0.5, 0.2);
            expect(underZoom.zoom).toBe(1.0);

            const overZoom = calculateBurstPanelCrop(imgW, imgH, 0.5, 0.5, 5.0);
            expect(overZoom.zoom).toBe(3.5);
        });

        it('automatically derives default zoom from aspect ratio when zoom is omitted', () => {
            // 3:2 photo -> default zoom 1.25
            const crop32 = calculateBurstPanelCrop(3000, 2000, 0.5, 0.5);
            expect(crop32.zoom).toBe(1.25);

            // 16:9 photo -> default zoom 1.17
            const crop169 = calculateBurstPanelCrop(3840, 2160, 0.5, 0.5);
            expect(crop169.zoom).toBe(1.17);
        });

        it('calculates 9:8 Duet panel crop for 3:2 landscape photos', () => {
            // In 9:8 panel (1.125), 3:2 photo (1.50) is wider than panel
            // At zoom 1.0 (exact cover fit), height fills 100%, width takes 1.125 / 1.5 = 0.75 of source width
            const crop = calculateBurstPanelCrop(3000, 2000, 0.5, 0.5, 1.0, DUET_PANEL_ASPECT_RATIO);
            expect(crop.width).toBeCloseTo(0.75, 2);
            expect(crop.height).toBeCloseTo(1.0, 2);
            expect(crop.x).toBeCloseTo(0.125, 2); // centered: (1 - 0.75) / 2
            expect(crop.y).toBeCloseTo(0, 2);
        });

        it('calculates 9:8 Duet panel crop for 2:3 portrait photos', () => {
            // In 9:8 panel (1.125), 2:3 photo (0.667) is narrower than panel
            // At zoom 1.0, width fills 100%, height takes (2/3) / (9/8) = 16/27 ≈ 0.5926
            const crop = calculateBurstPanelCrop(2000, 3000, 0.5, 0.5, 1.0, DUET_PANEL_ASPECT_RATIO);
            expect(crop.width).toBeCloseTo(1.0, 2);
            expect(crop.height).toBeCloseTo(16 / 27, 2);
            expect(crop.x).toBeCloseTo(0, 2);
            expect(crop.y).toBeCloseTo((1 - 16 / 27) / 2, 2);
        });
    });

    describe('calculateDefaultBurstZoom', () => {
        it('derives precisely 1.25x for standard 3:2 DSLR/mirrorless photos', () => {
            // 3:2 = 1.50 -> 27:16 panel (1.6875) -> 1.125 mismatch * (10/9) = 1.25
            expect(calculateDefaultBurstZoom(3000, 2000)).toBe(1.25);
            expect(calculateDefaultBurstZoom(6000, 4000)).toBe(1.25);
            expect(calculateDefaultBurstZoom(1080, 720)).toBe(1.25);
        });

        it('derives ~1.17x for 16:9 widescreen photos to preserve vertical headroom', () => {
            // 16:9 = 1.778 -> mismatch ~1.0535 * (10/9) = ~1.17
            expect(calculateDefaultBurstZoom(3840, 2160)).toBe(1.17);
            expect(calculateDefaultBurstZoom(1920, 1080)).toBe(1.17);
        });

        it('derives ~1.41x for 4:3 camera formats to preserve horizontal headroom', () => {
            // 4:3 = 1.333 -> mismatch ~1.2656 * (10/9) = ~1.41
            expect(calculateDefaultBurstZoom(4000, 3000)).toBe(1.41);
        });

        it('derives ~1.88x for 1:1 square photos', () => {
            // 1:1 = 1.0 -> mismatch 1.6875 * (10/9) = 1.875 -> 1.88
            expect(calculateDefaultBurstZoom(2000, 2000)).toBe(1.88);
        });

        it('clamps default zoom between 1.15 and 2.0 for extreme aspect ratios', () => {
            // Exact panel match (27:16) has mismatch 1.0 -> 1.111 -> clamped to min 1.15
            expect(calculateDefaultBurstZoom(2700, 1600)).toBe(1.15);

            // Extreme portrait (9:16) has high mismatch -> clamped to max 2.0
            expect(calculateDefaultBurstZoom(1080, 1920)).toBe(2.0);
        });

        it('gracefully falls back to 1.25 when dimensions are missing or zero', () => {
            expect(calculateDefaultBurstZoom(0, 0)).toBe(1.25);
            expect(calculateDefaultBurstZoom(1920, 0)).toBe(1.25);
        });
    });

    describe('generateStoryPresets', () => {
        const w = 3840;
        const h = 2560;

        it('generates 0-people presets sorted from least zoomed in (padded) to most with at most 3 options', () => {
            const presets = generateStoryPresets({ width: w, height: h });
            expect(presets.length).toBeLessThanOrEqual(3);
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'center', 'closeup']);
            expect(presets.map((p) => p.label)).toEqual(['Padded', 'Center', 'Close-up']);
            expect(presets[0].crop.zoom).toBeLessThan(presets[1].crop.zoom);
            expect(presets[1].crop.zoom).toBeLessThan(presets[2].crop.zoom);
            expect(presets.find((p) => p.id === 'center')?.isDefault).toBe(true);
        });

        it('generates solo person presets with at most 3 options sorted by zoom', () => {
            const presets = generateStoryPresets({
                width: w,
                height: h,
                faces: [{ x: 0.4, y: 0.35, w: 0.1, h: 0.15 }],
            });
            expect(presets.length).toBeLessThanOrEqual(3);
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'subject', 'closeup']);
            expect(presets.map((p) => p.label)).toEqual(['Padded', 'Subject', 'Close-up']);
            expect(presets[0].crop.zoom).toBeLessThan(presets[1].crop.zoom);
            expect(presets[1].crop.zoom).toBeLessThan(presets[2].crop.zoom);
            expect(presets.find((p) => p.id === 'subject')?.isDefault).toBe(true);
        });

        it('falls back to focusX and focusY when faces array is absent', () => {
            const presets = generateStoryPresets({
                width: w,
                height: h,
                focusX: 0.45,
                focusY: 0.3,
            });
            expect(presets.length).toBeLessThanOrEqual(3);
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'subject', 'closeup']);
        });

        it('generates duo presets with at most 3 options sorted by zoom', () => {
            const presets = generateStoryPresets({
                width: w,
                height: h,
                faces: [
                    { x: 0.35, y: 0.4, w: 0.08, h: 0.12 },
                    { x: 0.65, y: 0.42, w: 0.09, h: 0.13 },
                ],
            });
            expect(presets.length).toBeLessThanOrEqual(3);
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'duo', 'closeup']);
            expect(presets.map((p) => p.label)).toEqual(['Padded', 'Duo', 'Close-up']);
            expect(presets[0].crop.zoom).toBeLessThan(presets[1].crop.zoom);
            expect(presets[1].crop.zoom).toBeLessThan(presets[2].crop.zoom);
            expect(presets.find((p) => p.id === 'duo')?.isDefault).toBe(true);
        });

        it('generates pack / group presets when 3+ faces exist with at most 3 options sorted by zoom', () => {
            const presets = generateStoryPresets({
                width: w,
                height: h,
                faces: [
                    { x: 0.25, y: 0.4 },
                    { x: 0.5, y: 0.38 },
                    { x: 0.75, y: 0.42 },
                ],
            });
            expect(presets.length).toBeLessThanOrEqual(3);
            expect(presets.map((p) => p.id)).toEqual(['padded-glass', 'pack', 'lead']);
            expect(presets.map((p) => p.label)).toEqual(['Padded', 'Group', 'Lead Focus']);
            expect(presets[0].crop.zoom).toBeLessThan(presets[1].crop.zoom);
            expect(presets[1].crop.zoom).toBeLessThan(presets[2].crop.zoom);
            expect(presets.find((p) => p.id === 'pack')?.isDefault).toBe(true);
        });
    });

    describe('drawCameraLogoIcon', () => {
        it('executes canvas drawing commands for camera icon and letter P', () => {
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                arcTo: vi.fn(),
                quadraticCurveTo: vi.fn(),
                closePath: vi.fn(),
                stroke: vi.fn(),
                fillText: vi.fn(),
                translate: vi.fn(),
                scale: vi.fn(),
                strokeStyle: '',
                fillStyle: '',
                lineWidth: 0,
                lineJoin: '',
                lineCap: '',
                font: '',
                textAlign: '',
                textBaseline: '',
            } as unknown as CanvasRenderingContext2D;

            drawCameraLogoIcon(mockCtx, 100, 200, 24, '#ffffff');

            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.translate).toHaveBeenCalled();
            expect(mockCtx.scale).toHaveBeenCalled();
            expect(mockCtx.beginPath).toHaveBeenCalled();
            expect(mockCtx.stroke).toHaveBeenCalled();
            expect(mockCtx.fillText).toHaveBeenCalledWith('P', 325, 233 + P_ADJUSTMENT);
            expect(mockCtx.restore).toHaveBeenCalled();
        });
    });

    describe('renderStoryToCanvas theme rendering', () => {
        it('renders with light cardTheme correctly using light frosted badge styles', async () => {
            const fillStyles: string[] = [];
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                quadraticCurveTo: vi.fn(),
                arcTo: vi.fn(),
                closePath: vi.fn(),
                stroke: vi.fn(),
                fill: vi.fn(),
                clip: vi.fn(),
                drawImage: vi.fn(),
                fillRect: vi.fn(),
                fillText: vi.fn(),
                measureText: vi.fn().mockReturnValue({ width: 50 }),
                translate: vi.fn(),
                scale: vi.fn(),
                strokeStyle: '',
                set fillStyle(val: string) {
                    fillStyles.push(val);
                },
                get fillStyle() {
                    return fillStyles[fillStyles.length - 1] || '';
                },
                lineWidth: 0,
                lineJoin: '',
                lineCap: '',
                font: '',
                textAlign: '',
                textBaseline: '',
                shadowColor: '',
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                imageSmoothingEnabled: false,
                imageSmoothingQuality: 'low',
            } as unknown as CanvasRenderingContext2D;

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue(mockCtx),
            } as unknown as HTMLCanvasElement;

            const mockImg = {
                width: 3840,
                height: 2560,
                naturalWidth: 3840,
                naturalHeight: 2560,
            } as unknown as HTMLImageElement;

            await renderStoryToCanvas(
                mockImg,
                {
                    mode: 'crop',
                    crop: calculateNormalizedCrop(3840, 2560, 0.5, 0.5, 1.0),
                    padded: { style: 'glass', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
                    badges: {
                        showScoreboard: true,
                        scoreboardTitle: 'Team A vs Team B',
                        teams: ['Team A', 'Team B'],
                        score1: 10,
                        score2: 5,
                        showAttribution: true,
                        attributionLogoText: 'PHOTOS BY',
                        attributionLogoAccent: 'PERKINS',
                        attributionDomain: '@photosbyperkins',
                    },
                    cardTheme: 'light',
                },
                mockCanvas
            );

            // Verify light theme colors were applied
            expect(fillStyles).toContain('rgba(255, 255, 255, 0.88)');
            expect(fillStyles).toContain('#111116');
            expect(fillStyles).toContain('#e60000');
        });

        it('ensures light cardTheme only affects badges and not the frosted background tint', async () => {
            const fillStyles: string[] = [];
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                quadraticCurveTo: vi.fn(),
                arcTo: vi.fn(),
                closePath: vi.fn(),
                stroke: vi.fn(),
                fill: vi.fn(),
                clip: vi.fn(),
                drawImage: vi.fn(),
                fillRect: vi.fn(),
                fillText: vi.fn(),
                measureText: vi.fn().mockReturnValue({ width: 50 }),
                translate: vi.fn(),
                scale: vi.fn(),
                strokeStyle: '',
                set fillStyle(val: string) {
                    fillStyles.push(val);
                },
                get fillStyle() {
                    return fillStyles[fillStyles.length - 1] || '';
                },
                lineWidth: 0,
                lineJoin: '',
                lineCap: '',
                font: '',
                textAlign: '',
                textBaseline: '',
                shadowColor: '',
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                imageSmoothingEnabled: false,
                imageSmoothingQuality: 'low',
            } as unknown as CanvasRenderingContext2D;

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue(mockCtx),
            } as unknown as HTMLCanvasElement;

            const mockImg = {
                width: 3840,
                height: 2560,
                naturalWidth: 3840,
                naturalHeight: 2560,
            } as unknown as HTMLImageElement;

            await renderStoryToCanvas(
                mockImg,
                {
                    mode: 'padded',
                    crop: calculateNormalizedCrop(3840, 2560, 0.5, 0.5, 1.0),
                    padded: { style: 'frosted', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
                    badges: {
                        showScoreboard: true,
                        scoreboardTitle: 'Team A vs Team B',
                        teams: ['Team A', 'Team B'],
                        score1: 10,
                        score2: 5,
                        showAttribution: true,
                    },
                    cardTheme: 'light',
                },
                mockCanvas
            );

            // Frosted background tint must stay dark (#0a0a14 -> rgba(10, 10, 20, 0.5))
            expect(fillStyles).toContain('rgba(10, 10, 20, 0.5)');
            // Must NOT contain light background tint
            expect(fillStyles).not.toContain('rgba(255, 255, 255, 0.4)');

            // Badges MUST still receive light theme
            expect(fillStyles).toContain('rgba(255, 255, 255, 0.88)');
            expect(fillStyles).toContain('#111116');
        });

        it('renders with padded custom background color correctly', async () => {
            const fillStyles: string[] = [];
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                quadraticCurveTo: vi.fn(),
                arcTo: vi.fn(),
                closePath: vi.fn(),
                stroke: vi.fn(),
                fill: vi.fn(),
                clip: vi.fn(),
                drawImage: vi.fn(),
                fillRect: vi.fn(),
                fillText: vi.fn(),
                measureText: vi.fn().mockReturnValue({ width: 50 }),
                translate: vi.fn(),
                scale: vi.fn(),
                strokeStyle: '',
                set fillStyle(val: string) {
                    fillStyles.push(val);
                },
                get fillStyle() {
                    return fillStyles[fillStyles.length - 1] || '';
                },
                lineWidth: 0,
                lineJoin: '',
                lineCap: '',
                font: '',
                textAlign: '',
                textBaseline: '',
                shadowColor: '',
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                imageSmoothingEnabled: false,
                imageSmoothingQuality: 'low',
            } as unknown as CanvasRenderingContext2D;

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue(mockCtx),
            } as unknown as HTMLCanvasElement;

            const mockImg = {
                width: 3840,
                height: 2560,
                naturalWidth: 3840,
                naturalHeight: 2560,
            } as unknown as HTMLImageElement;

            await renderStoryToCanvas(
                mockImg,
                {
                    mode: 'padded',
                    crop: calculateNormalizedCrop(3840, 2560, 0.5, 0.5, 1.0),
                    padded: {
                        style: 'custom',
                        customColor: '#1e293b',
                        position: 'center',
                        cardScale: 0.92,
                        cardCornerRadius: 24,
                    },
                    badges: {
                        showScoreboard: false,
                        showAttribution: false,
                    },
                    cardTheme: 'dark',
                },
                mockCanvas
            );

            expect(fillStyles).toContain('#1e293b');
        });

        it('renders with padded solid background color correctly', async () => {
            const fillStyles: string[] = [];
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                quadraticCurveTo: vi.fn(),
                arcTo: vi.fn(),
                closePath: vi.fn(),
                stroke: vi.fn(),
                fill: vi.fn(),
                clip: vi.fn(),
                drawImage: vi.fn(),
                fillRect: vi.fn(),
                fillText: vi.fn(),
                measureText: vi.fn().mockReturnValue({ width: 50 }),
                translate: vi.fn(),
                scale: vi.fn(),
                strokeStyle: '',
                set fillStyle(val: string) {
                    fillStyles.push(val);
                },
                get fillStyle() {
                    return fillStyles[fillStyles.length - 1] || '';
                },
                lineWidth: 0,
                lineJoin: '',
                lineCap: '',
                font: '',
                textAlign: '',
                textBaseline: '',
                shadowColor: '',
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                imageSmoothingEnabled: false,
                imageSmoothingQuality: 'low',
            } as unknown as CanvasRenderingContext2D;

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue(mockCtx),
            } as unknown as HTMLCanvasElement;

            const mockImg = {
                width: 3840,
                height: 2560,
                naturalWidth: 3840,
                naturalHeight: 2560,
            } as unknown as HTMLImageElement;

            await renderStoryToCanvas(
                mockImg,
                {
                    mode: 'padded',
                    crop: calculateNormalizedCrop(3840, 2560, 0.5, 0.5, 1.0),
                    padded: {
                        style: 'solid',
                        customColor: '#2c1810',
                        position: 'center',
                        cardScale: 0.92,
                        cardCornerRadius: 24,
                    },
                    badges: {
                        showScoreboard: false,
                        showAttribution: false,
                    },
                    cardTheme: 'dark',
                },
                mockCanvas
            );

            expect(fillStyles).toContain('#2c1810');
        });

        it('renders with padded frosted tinted background correctly', async () => {
            const fillStyles: string[] = [];
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                quadraticCurveTo: vi.fn(),
                arcTo: vi.fn(),
                closePath: vi.fn(),
                stroke: vi.fn(),
                fill: vi.fn(),
                clip: vi.fn(),
                drawImage: vi.fn(),
                fillRect: vi.fn(),
                fillText: vi.fn(),
                measureText: vi.fn().mockReturnValue({ width: 50 }),
                translate: vi.fn(),
                scale: vi.fn(),
                strokeStyle: '',
                set fillStyle(val: string) {
                    fillStyles.push(val);
                },
                get fillStyle() {
                    return fillStyles[fillStyles.length - 1] || '';
                },
                lineWidth: 0,
                lineJoin: '',
                lineCap: '',
                font: '',
                textAlign: '',
                textBaseline: '',
                shadowColor: '',
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                imageSmoothingEnabled: false,
                imageSmoothingQuality: 'low',
            } as unknown as CanvasRenderingContext2D;

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue(mockCtx),
            } as unknown as HTMLCanvasElement;

            const mockImg = {
                width: 3840,
                height: 2560,
                naturalWidth: 3840,
                naturalHeight: 2560,
            } as unknown as HTMLImageElement;

            await renderStoryToCanvas(
                mockImg,
                {
                    mode: 'padded',
                    crop: calculateNormalizedCrop(3840, 2560, 0.5, 0.5, 1.0),
                    padded: {
                        style: 'frosted',
                        customColor: '#e60000',
                        position: 'center',
                        cardScale: 0.92,
                        cardCornerRadius: 24,
                    },
                    badges: {
                        showScoreboard: false,
                        showAttribution: false,
                    },
                    cardTheme: 'dark',
                },
                mockCanvas
            );

            expect(fillStyles).toContain('rgba(230, 0, 0, 0.5)');
        });

        it('renders with decorative frame options without throwing', async () => {
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                quadraticCurveTo: vi.fn(),
                arcTo: vi.fn(),
                closePath: vi.fn(),
                stroke: vi.fn(),
                fill: vi.fn(),
                clip: vi.fn(),
                drawImage: vi.fn(),
                fillRect: vi.fn(),
                fillText: vi.fn(),
                measureText: vi.fn().mockReturnValue({ width: 50 }),
                translate: vi.fn(),
                scale: vi.fn(),
                strokeStyle: '',
                fillStyle: '',
                lineWidth: 0,
            } as unknown as CanvasRenderingContext2D;

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue(mockCtx),
            } as unknown as HTMLCanvasElement;

            const mockImg = {
                width: 3840,
                height: 2560,
                naturalWidth: 3840,
                naturalHeight: 2560,
            } as unknown as HTMLImageElement;

            await renderStoryToCanvas(
                mockImg,
                {
                    mode: 'crop',
                    crop: calculateNormalizedCrop(3840, 2560, 0.5, 0.5, 1.0),
                    padded: { style: 'glass', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
                    badges: { showScoreboard: false, showAttribution: false },
                    cardTheme: 'dark',
                    frameId: 'sac-bear',
                    frameColorOverride: '#f59e0b',
                },
                mockCanvas
            );

            expect(mockCtx.drawImage).toHaveBeenCalled();
        });
    });

    describe('storyFrameDefinitions', () => {
        it('has 27 frame definitions including none and 26 thematic designs', () => {
            expect(STORY_FRAME_DEFINITIONS).toHaveLength(27);
            const ids = STORY_FRAME_DEFINITIONS.map((f) => f.id);
            expect(ids).toContain('none');
            expect(ids).toContain('sac-bear');
            expect(ids).toContain('derby-quads');
            expect(ids).toContain('claw-marks');
            expect(ids).toContain('unicorns');
            expect(ids).toContain('intergalactic');
            expect(ids).toContain('celestial-moon');
            expect(ids).toContain('synthwave');
            expect(ids).toContain('film-strip');
            expect(ids).toContain('cyber-hud');
            expect(ids).toContain('golden-sparkle');
            expect(ids).toContain('pop-art');
            expect(ids).toContain('street-flames');
            expect(ids).toContain('electric-lightning');
            expect(ids).toContain('through-the-lens');
            // 12 New Frames
            expect(ids).toContain('ref-zebra');
            expect(ids).toContain('bout-day');
            expect(ids).toContain('derby-punk');
            expect(ids).toContain('sonic-boom');
            expect(ids).toContain('speed-demons');
            expect(ids).toContain('instant-film');
            expect(ids).toContain('vhs-glitch');
            expect(ids).toContain('risograph');
            expect(ids).toContain('broadcast-live');
            expect(ids).toContain('night-vision');
            expect(ids).toContain('roller-disco');
            expect(ids).toContain('mystic-tarot');
        });

        it('assigns valid categories across all 26 thematic frame designs', () => {
            const validCategories = ['derby', 'action', 'retro', 'tech', 'cosmic'];
            for (const frame of STORY_FRAME_DEFINITIONS) {
                if (frame.id === 'none') {
                    expect(frame.category).toBeUndefined();
                } else {
                    expect(validCategories).toContain(frame.category);
                }
            }
        });

        it('renders extended frames with valid SVG strings and color overrides', () => {
            const zebra = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'ref-zebra');
            expect(zebra).toBeDefined();
            expect(zebra!.getSvgString('#ff0000')).toContain('#ff0000');

            const polaroid = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'instant-film');
            expect(polaroid).toBeDefined();
            expect(polaroid!.getSvgString()).toContain('<rect');

            const vhs = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'vhs-glitch');
            expect(vhs).toBeDefined();
            expect(vhs!.getSvgString()).toContain('PLAY');
        });

        it('generates valid SVG strings with and without color override', async () => {
            const bear = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'sac-bear');
            expect(bear).toBeDefined();

            const defaultSvg = await bear!.getSvgString();
            expect(defaultSvg).toContain('<svg');
            expect(defaultSvg).toContain('viewBox="0 0 1080 1920"');
            expect(defaultSvg).toContain('#f59e0b');

            const customSvg = await bear!.getSvgString('#3b82f6');
            expect(customSvg).toContain('#3b82f6');
        });

        it('renders deep space frame with dual-ring planet, shooting comet, and starlight', () => {
            const cosmos = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'intergalactic');
            expect(cosmos).toBeDefined();

            const svg = cosmos!.getSvgString();
            expect(svg).toContain('rotate(-22)');
            expect(svg).toContain('x1="-30" y1="80" x2="200" y2="190"'); // comet trail
            expect(svg).toContain('points="50,420 75,490 35,570 85,660 50,740"'); // constellation
            expect(svg).toContain('#fbbf24'); // gold starlight
        });

        it('renders electric-lightning frame with high-voltage bolts and ground impact sparks', () => {
            const lightning = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'electric-lightning');
            expect(lightning).toBeDefined();

            const svg = lightning!.getSvgString(undefined, { hasScoreboard: true });
            expect(svg).toContain('L140,1470 L95,1520'); // elevated bolt above scoreboard
            expect(svg).toContain('#00f0ff');
            expect(svg).toContain('#3b82f6');
            expect(svg).toContain('#facc15');

            const svgNoScoreboard = lightning!.getSvgString(undefined, { hasScoreboard: false });
            expect(svgNoScoreboard).toContain('L130,1830'); // full ground strike
        });

        it('renders rainbow unicorn frame with flowing mane waves, spiral horn, and cloud base', () => {
            const unicorn = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'unicorns');
            expect(unicorn).toBeDefined();

            const svg = unicorn!.getSvgString(undefined, { hasScoreboard: true });
            expect(svg).toContain('translate(860, 1630) scale(0.92)'); // docked flanking scoreboard
            expect(svg).toContain('#f472b6'); // pink
            expect(svg).toContain('#c084fc'); // purple
            expect(svg).toContain('#38bdf8'); // cyan
            expect(svg).toContain('#facc15'); // yellow/gold
            expect(svg).toContain('points="46,-9 48,2 59,4 48,6 46,17 44,6 33,4 44,2"'); // horn tip magic star

            const svgNoScoreboard = unicorn!.getSvgString(undefined, { hasScoreboard: false });
            expect(svgNoScoreboard).toContain('translate(860, 1660) scale(1.05)'); // lower corner placement
        });

        it('renders pop-art frame with extreme corner halftone matrix and full lower-right speed lines including teal', () => {
            const popArt = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'pop-art');
            expect(popArt).toBeDefined();

            // With scoreboard
            const svgWithSb = popArt!.getSvgString(undefined, { hasScoreboard: true });
            expect(svgWithSb).toContain('translate(970, 0)'); // top-right extreme corner
            expect(svgWithSb).toContain('translate(0, 1750)'); // docked lower-left
            expect(svgWithSb).toContain('x1="1080" y1="1810" x2="1000" y2="1760" stroke="#06b6d4"'); // teal/cyan line

            // Without scoreboard
            const svgNoSb = popArt!.getSvgString(undefined, { hasScoreboard: false });
            expect(svgNoSb).toContain('translate(0, 1800)'); // extreme bottom-left corner
            expect(svgNoSb).toContain('x1="1080" y1="1810" x2="1000" y2="1760" stroke="#06b6d4"'); // teal/cyan line in bottom-right corner
        });

        it('renders through-the-lens frame with real EXIF telemetry on bottom bar', () => {
            const ttl = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'through-the-lens');
            expect(ttl).toBeDefined();

            const svgWithExif = ttl!.getSvgString(undefined, {
                hasScoreboard: true,
                hasAttribution: true,
                exif: {
                    shutterSpeed: '1/4000s',
                    aperture: 'f/1.8',
                    iso: '1600',
                    focalLength: '135mm',
                    cameraModel: 'NIKON Z 8',
                },
            });

            // Contains formatted shutter speed (trailing 's' stripped)
            expect(svgWithExif).toContain('1/4000');
            // Contains formatted aperture ('F' prefix)
            expect(svgWithExif).toContain('F1.8');
            // Contains formatted ISO
            expect(svgWithExif).toContain('ISO 1600');
            // Contains focal length
            expect(svgWithExif).toContain('135mm');
            // Positioned pinned at bottom of frame
            expect(svgWithExif).toContain('y="1820"');

            // Exposure compensation removed per user request
            expect(svgWithExif).not.toContain('EXP COMP');
            // Top row HUD elements removed per user request
            expect(svgWithExif).not.toContain('AF-C');
            // Center focus point indicator removed per user request
            expect(svgWithExif).not.toContain('width="72" height="72"');

            // With attribution, top bracket docks below attribution pill at Y=150
            expect(svgWithExif).toContain('L 110,150');
            // With scoreboard, bottom bracket docks above scoreboard badge at Y=1680
            expect(svgWithExif).toContain('L 110,1680');

            // When scoreboard and attribution are false, bottom bar remains pinned at 1820
            const svgNoScoreboard = ttl!.getSvgString(undefined, {
                hasScoreboard: false,
                hasAttribution: false,
            });
            expect(svgNoScoreboard).toContain('y="1820"');
            // Top bracket docks at Y=90 without attribution
            expect(svgNoScoreboard).toContain('L 110,90');
            // Bottom bracket docks at Y=1780 without scoreboard (above pinned telemetry bar)
            expect(svgNoScoreboard).toContain('L 110,1780');
        });

        it('filters through-the-lens frame when photo has no EXIF data', () => {
            const filterFrames = (hasExif: boolean) =>
                STORY_FRAME_DEFINITIONS.filter((f) => f.id !== 'through-the-lens' || hasExif);

            const withoutExif = filterFrames(false);
            expect(withoutExif.some((f) => f.id === 'through-the-lens')).toBe(false);
            expect(withoutExif).toHaveLength(26);

            const withExif = filterFrames(true);
            expect(withExif.some((f) => f.id === 'through-the-lens')).toBe(true);
            expect(withExif).toHaveLength(27);
        });

        it('drawStoryFrameToCanvas safely resolves for none and invalid frames', async () => {
            const mockCtx = {} as CanvasRenderingContext2D;
            await expect(drawStoryFrameToCanvas(mockCtx, 'none', 1080, 1920)).resolves.toBeUndefined();
            await expect(drawStoryFrameToCanvas(mockCtx, undefined, 1080, 1920)).resolves.toBeUndefined();
            await expect(
                drawStoryFrameToCanvas(mockCtx, 'sac-bear', 1080, 1920, '#ffffff', {
                    hasScoreboard: false,
                    hasAttribution: false,
                })
            ).resolves.toBeUndefined();
        });

        it('dynamically adapts frame layout based on context (badges present vs absent)', async () => {
            const bear = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'sac-bear');
            expect(bear).toBeDefined();

            // When scoreboard is present, bear is elevated into the flank
            const bearWithScoreboard = await bear!.getSvgString(undefined, {
                hasScoreboard: true,
                hasAttribution: true,
            });
            expect(bearWithScoreboard).toContain('translate(760, 1530)');
            // Top racing stripe splits around attribution
            expect(bearWithScoreboard).toContain('x1="140" y1="117" x2="250"');
            expect(bearWithScoreboard).toContain('x1="830" y1="117" x2="940"');

            // When scoreboard is absent, bear descends into the corner
            const bearWithoutScoreboard = await bear!.getSvgString(undefined, {
                hasScoreboard: false,
                hasAttribution: false,
            });
            expect(bearWithoutScoreboard).toContain('translate(680, 1690)');
            // Top racing stripe spans continuously across
            expect(bearWithoutScoreboard).toContain('x1="140" y1="117" x2="940"');

            // Derby Quads: roller skate elevates when scoreboard is present
            const derby = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'derby-quads');
            expect(derby).toBeDefined();
            const derbyWithScoreboard = derby!.getSvgString(undefined, { hasScoreboard: true });
            expect(derbyWithScoreboard).toContain('translate(45, 1660)');
            const derbyWithoutScoreboard = derby!.getSvgString(undefined, { hasScoreboard: false });
            expect(derbyWithoutScoreboard).toContain('translate(60, 1720)');
        });
    });

    describe('Story Photo Filters', () => {
        it('exports exactly 8 photo filters with unique IDs', () => {
            expect(STORY_PHOTO_FILTERS).toHaveLength(8);
            const ids = STORY_PHOTO_FILTERS.map((f) => f.id);
            expect(new Set(ids).size).toBe(8);
            expect(ids).toContain('none');
            expect(ids).toContain('bw');
            expect(ids).toContain('bw-contrast');
            expect(ids).toContain('warm');
            expect(ids).toContain('vivid');
            expect(ids).toContain('matte');
            expect(ids).toContain('noir');
            expect(ids).toContain('sepia');
        });

        it('maps every filter properly in STORY_PHOTO_FILTERS_MAP', () => {
            for (const filter of STORY_PHOTO_FILTERS) {
                expect(STORY_PHOTO_FILTERS_MAP[filter.id]).toEqual(filter);
            }
        });

        it('defines valid CSS filter recipes for every non-none filter', () => {
            for (const filter of STORY_PHOTO_FILTERS) {
                expect(filter.label).toBeTruthy();
                expect(filter.description).toBeTruthy();
                if (filter.id === 'none') {
                    expect(filter.cssFilter).toBe('none');
                } else {
                    expect(filter.cssFilter).not.toBe('none');
                    expect(typeof filter.cssFilter).toBe('string');
                    expect(filter.cssFilter.length).toBeGreaterThan(0);
                }
            }
        });
    });

    describe('hexToRgba', () => {
        it('converts dark hex to rgba with 0.5 alpha', () => {
            expect(hexToRgba('#0a0a14')).toBe('rgba(10, 10, 20, 0.5)');
        });

        it('converts light hex to rgba with 0.4 alpha', () => {
            expect(hexToRgba('#ffffff')).toBe('rgba(255, 255, 255, 0.4)');
        });

        it('converts short 3-char hex properly', () => {
            expect(hexToRgba('#fff')).toBe('rgba(255, 255, 255, 0.4)');
        });

        it('respects customAlpha if provided', () => {
            expect(hexToRgba('#ff0000', 0.8)).toBe('rgba(255, 0, 0, 0.8)');
        });

        it('handles rgba strings directly', () => {
            expect(hexToRgba('rgba(10, 20, 30, 0.5)')).toBe('rgba(10, 20, 30, 0.5)');
        });
    });

    describe('isColorLight', () => {
        it('detects light colors correctly', () => {
            expect(isColorLight('#ffffff')).toBe(true);
            expect(isColorLight('#f59e0b')).toBe(true);
            expect(isColorLight('rgb(255, 255, 255)')).toBe(true);
        });

        it('detects dark colors correctly', () => {
            expect(isColorLight('#0a0a14')).toBe(false);
            expect(isColorLight('#1e293b')).toBe(false);
            expect(isColorLight('#000000')).toBe(false);
            expect(isColorLight('rgb(10, 10, 20)')).toBe(false);
        });
    });

    describe('getStoryFilterCss', () => {
        it('returns none for none filter or zero strength', () => {
            expect(getStoryFilterCss('none', 1.0)).toBe('none');
            expect(getStoryFilterCss('bw', 0)).toBe('none');
        });

        it('returns standard filter string at full 1.0 strength', () => {
            expect(getStoryFilterCss('bw', 1.0)).toBe('grayscale(100%) contrast(108%)');
            expect(getStoryFilterCss('warm', 1.0)).toBe('sepia(28%) saturate(120%) contrast(105%) brightness(102%)');
            expect(getStoryFilterCss('vivid', 1.0)).toBe('contrast(115%) saturate(140%) brightness(102%)');
        });

        it('scales filter parameters proportionally at partial strength', () => {
            expect(getStoryFilterCss('bw', 0.5)).toBe('grayscale(50%) contrast(104%)');
            expect(getStoryFilterCss('bw-contrast', 0.5)).toBe('grayscale(50%) contrast(130%) brightness(98%)');
            expect(getStoryFilterCss('warm', 0.5)).toBe('sepia(14%) saturate(110%) contrast(103%) brightness(101%)');
        });
    });

    describe('renderBurstPanels & 3-Panel Burst Mode', () => {
        const createMockContext = () => {
            const drawCalls: unknown[][] = [];
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                beginPath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                quadraticCurveTo: vi.fn(),
                arcTo: vi.fn(),
                closePath: vi.fn(),
                stroke: vi.fn(),
                fill: vi.fn(),
                clip: vi.fn(),
                drawImage: vi.fn((...args: unknown[]) => drawCalls.push(args)),
                fillRect: vi.fn(),
                strokeRect: vi.fn(),
                fillText: vi.fn(),
                measureText: vi.fn().mockReturnValue({ width: 50 }),
                translate: vi.fn(),
                scale: vi.fn(),
                strokeStyle: '',
                fillStyle: '',
                lineWidth: 0,
                lineJoin: '',
                lineCap: '',
                font: '',
                textAlign: '',
                textBaseline: '',
                shadowColor: '',
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                imageSmoothingEnabled: false,
                imageSmoothingQuality: 'low',
            } as unknown as CanvasRenderingContext2D;

            const mockCanvas = {
                width: 0,
                height: 0,
                getContext: vi.fn().mockReturnValue(mockCtx),
            } as unknown as HTMLCanvasElement;

            return { mockCtx, mockCanvas, drawCalls };
        };

        const createMockImage = (w = 3000, h = 2000) => {
            return {
                width: w,
                height: h,
                naturalWidth: w,
                naturalHeight: h,
            } as unknown as HTMLImageElement;
        };

        it('renders burst story in hairline divider style', async () => {
            const img1 = createMockImage(3000, 2000);
            const img2 = createMockImage(3000, 2000);
            const img3 = createMockImage(3000, 2000);
            const { mockCanvas, drawCalls } = createMockContext();

            await renderStoryToCanvas(
                [img1, img2, img3],
                {
                    mode: 'burst',
                    crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1, centerX: 0.5, centerY: 0.5 },
                    padded: { style: 'frosted', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
                    burst: {
                        dividerStyle: 'hairline',
                        showTimeStamps: true,
                        timeStamps: [0.0, 0.84, 1.42],
                    },
                    badges: {
                        showScoreboard: true,
                        showAttribution: true,
                        teams: ['Team A', 'Team B'],
                    },
                },
                mockCanvas
            );

            expect(mockCanvas.width).toBe(1080);
            expect(mockCanvas.height).toBe(1920);
            expect(drawCalls.length).toBeGreaterThanOrEqual(3);
        });

        it('renders burst story in gutter divider style', async () => {
            const img1 = createMockImage(3000, 2000);
            const img2 = createMockImage(3000, 2000);
            const img3 = createMockImage(3000, 2000);
            const { mockCanvas, drawCalls } = createMockContext();

            await renderStoryToCanvas(
                [img1, img2, img3],
                {
                    mode: 'burst',
                    crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1, centerX: 0.5, centerY: 0.5 },
                    padded: { style: 'frosted', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
                    burst: {
                        dividerStyle: 'gutter',
                        showTimeStamps: true,
                        timeStamps: [0.0, 0.75, 1.5],
                    },
                    badges: {
                        showScoreboard: false,
                        showAttribution: true,
                    },
                },
                mockCanvas
            );

            expect(mockCanvas.width).toBe(1080);
            expect(mockCanvas.height).toBe(1920);
            expect(drawCalls.length).toBeGreaterThanOrEqual(3);
        });

        it('suppresses timestamps when rendering non-burst / curated Duet even if showTimeStamps is true', async () => {
            const img1 = createMockImage(3000, 2000);
            const img2 = createMockImage(3000, 2000);
            const { mockCanvas, mockCtx } = createMockContext();

            await renderStoryToCanvas(
                [img1, img2],
                {
                    mode: 'burst',
                    crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1, centerX: 0.5, centerY: 0.5 },
                    padded: { style: 'frosted', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
                    burst: {
                        dividerStyle: 'hairline',
                        showTimeStamps: true,
                        isTriptych: true,
                        panelCount: 2,
                        timeStamps: [0.0, 0.0],
                    },
                    badges: {
                        showScoreboard: false,
                        showAttribution: false,
                    },
                },
                mockCanvas
            );

            const fillTextCalls = (mockCtx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls;
            const timestampCalls = fillTextCalls.filter(
                (call) => typeof call[0] === 'string' && /^\+\d+\.\d+s$/.test(call[0])
            );
            expect(timestampCalls.length).toBe(0);
        });

        it('draws timestamps when rendering real continuous burst with deltas and showTimeStamps is true', async () => {
            const img1 = createMockImage(3000, 2000);
            const img2 = createMockImage(3000, 2000);
            const { mockCanvas, mockCtx } = createMockContext();

            await renderStoryToCanvas(
                [img1, img2],
                {
                    mode: 'burst',
                    crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1, centerX: 0.5, centerY: 0.5 },
                    padded: { style: 'frosted', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
                    burst: {
                        dividerStyle: 'hairline',
                        showTimeStamps: true,
                        isTriptych: false,
                        panelCount: 2,
                        timeStamps: [0.0, 0.42],
                    },
                    badges: {
                        showScoreboard: false,
                        showAttribution: false,
                    },
                },
                mockCanvas
            );

            const fillTextCalls = (mockCtx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls;
            const timestampCalls = fillTextCalls.filter(
                (call) => typeof call[0] === 'string' && /^\+\d+\.\d+s$/.test(call[0])
            );
            expect(timestampCalls.length).toBe(2);
            expect(timestampCalls[0][0]).toBe('+0.00s');
            expect(timestampCalls[1][0]).toBe('+0.42s');
        });

        it('renders burst story in filmstrip divider style', async () => {
            const img1 = createMockImage(3000, 2000);
            const img2 = createMockImage(3000, 2000);
            const img3 = createMockImage(3000, 2000);
            const { mockCanvas, drawCalls } = createMockContext();

            await renderStoryToCanvas(
                [img1, img2, img3],
                {
                    mode: 'burst',
                    crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1, centerX: 0.5, centerY: 0.5 },
                    padded: { style: 'frosted', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
                    burst: {
                        dividerStyle: 'filmstrip',
                        showTimeStamps: false,
                    },
                    badges: {
                        showScoreboard: false,
                        showAttribution: false,
                    },
                },
                mockCanvas
            );

            expect(mockCanvas.width).toBe(1080);
            expect(mockCanvas.height).toBe(1920);
            expect(drawCalls.length).toBeGreaterThanOrEqual(3);
        });

        it('applies custom panOffsets to burst panel focal crop', async () => {
            const img1 = createMockImage(3000, 1000);
            const img2 = createMockImage(3000, 1000);
            const img3 = createMockImage(3000, 1000);
            const { mockCanvas, drawCalls } = createMockContext();

            await renderStoryToCanvas(
                [img1, img2, img3],
                {
                    mode: 'burst',
                    crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1, centerX: 0.5, centerY: 0.5 },
                    padded: { style: 'frosted', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
                    burst: {
                        dividerStyle: 'hairline',
                        showTimeStamps: false,
                        panOffsets: [
                            { x: 0.0, y: 0.0 }, // Left / top
                            { x: 0.5, y: 0.5 }, // Center
                            { x: 1.0, y: 1.0 }, // Right / bottom
                        ],
                    },
                    badges: {
                        showScoreboard: false,
                        showAttribution: false,
                    },
                },
                mockCanvas
            );

            expect(drawCalls.length).toBeGreaterThanOrEqual(3);
            const panel0Args = drawCalls[0];
            const panel1Args = drawCalls[1];
            const panel2Args = drawCalls[2];

            // sx for panel 0 (panX=0) should be 0
            expect(panel0Args[1]).toBe(0);
            // sx for panel 1 (panX=0.5) should be greater than 0
            expect(panel1Args[1]).toBeGreaterThan(0);
            // sx for panel 2 (panX=1.0) should be greater than panel 1 sx
            expect(panel2Args[1]).toBeGreaterThan(panel1Args[1] as number);
        });

        it('applies zoom in panOffsets to magnify burst panel focal crop', async () => {
            const img1 = createMockImage(3000, 1000);
            const img2 = createMockImage(3000, 1000);
            const img3 = createMockImage(3000, 1000);
            const { mockCanvas, drawCalls } = createMockContext();

            await renderStoryToCanvas(
                [img1, img2, img3],
                {
                    mode: 'burst',
                    crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1, centerX: 0.5, centerY: 0.5 },
                    padded: { style: 'frosted', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
                    burst: {
                        dividerStyle: 'hairline',
                        showTimeStamps: false,
                        panOffsets: [
                            { x: 0.5, y: 0.5, zoom: 1.0 }, // 1.0x zoom
                            { x: 0.5, y: 0.5, zoom: 2.0 }, // 2.0x zoom
                            { x: 0.5, y: 0.5, zoom: 3.0 }, // 3.0x zoom
                        ],
                    },
                    badges: {
                        showScoreboard: false,
                        showAttribution: false,
                    },
                },
                mockCanvas
            );

            expect(drawCalls.length).toBeGreaterThanOrEqual(3);
            const panel0Args = drawCalls[0];
            const panel1Args = drawCalls[1];
            const panel2Args = drawCalls[2];

            const sw0 = panel0Args[3] as number;
            const sw1 = panel1Args[3] as number;
            const sw2 = panel2Args[3] as number;

            // Higher zoom takes a smaller source slice (sw), magnifying the image into the panel
            expect(sw1).toBeLessThan(sw0);
            expect(sw2).toBeLessThan(sw1);
            expect(Math.round(sw0 / sw1)).toBe(2);
        });

        it('renders 2 panels evenly divided by hairline seam in Duet mode', async () => {
            const img1 = createMockImage(3000, 2000);
            const img2 = createMockImage(3000, 2000);
            const { mockCanvas, drawCalls } = createMockContext();

            await renderStoryToCanvas(
                [img1, img2],
                {
                    mode: 'burst',
                    crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1, centerX: 0.5, centerY: 0.5 },
                    padded: { style: 'frosted', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
                    burst: {
                        dividerStyle: 'hairline',
                        showTimeStamps: true,
                        panelCount: 2,
                        timeStamps: [0.0, 0.42],
                    },
                    badges: {
                        showScoreboard: false,
                        showAttribution: false,
                    },
                },
                mockCanvas
            );

            // Should have 2 drawImage calls for the two panels
            expect(drawCalls.length).toBe(2);
            const panel0 = drawCalls[0];
            const panel1 = drawCalls[1];

            // Panel 0 (top): dy = 0
            expect(panel0[6]).toBe(0);
            // Panel 1 (bottom): dy should be ~halfway down (Y = 960 at 1080x1920 with 4px gap)
            expect(panel1[6]).toBeGreaterThan(900);
            expect(panel1[6]).toBeLessThan(1000);
        });
    });

    describe('applyStoryFilterToImageData & drawImageWithStoryFilter', () => {
        const createSampleImageData = (r = 200, g = 100, b = 50, a = 255) => {
            const data = new Uint8ClampedArray([r, g, b, a, 10, 20, 30, 255]);
            return {
                data,
                width: 2,
                height: 1,
            } as ImageData;
        };

        it('leaves pixels unchanged when filterId is none or strength is 0', () => {
            const imgDataNone = createSampleImageData();
            applyStoryFilterToImageData(imgDataNone, 'none', 1.0);
            expect(imgDataNone.data[0]).toBe(200);
            expect(imgDataNone.data[1]).toBe(100);
            expect(imgDataNone.data[2]).toBe(50);
            expect(imgDataNone.data[3]).toBe(255);

            const imgDataZero = createSampleImageData();
            applyStoryFilterToImageData(imgDataZero, 'bw', 0);
            expect(imgDataZero.data[0]).toBe(200);
            expect(imgDataZero.data[1]).toBe(100);
            expect(imgDataZero.data[2]).toBe(50);
        });

        it('transforms pixel to grayscale for bw filter', () => {
            const imgData = createSampleImageData(200, 100, 50);
            applyStoryFilterToImageData(imgData, 'bw', 1.0);

            // r, g, b must be identical (monochrome)
            expect(imgData.data[0]).toBe(imgData.data[1]);
            expect(imgData.data[1]).toBe(imgData.data[2]);
            expect(imgData.data[3]).toBe(255); // alpha preserved
        });

        it('handles bw-contrast filter with deep contrast and slight darkening', () => {
            const imgData = createSampleImageData(200, 100, 50);
            applyStoryFilterToImageData(imgData, 'bw-contrast', 1.0);

            expect(imgData.data[0]).toBe(imgData.data[1]);
            expect(imgData.data[1]).toBe(imgData.data[2]);
        });

        it('applies vintage warm filter with sepia and saturation', () => {
            const imgData = createSampleImageData(120, 120, 120);
            applyStoryFilterToImageData(imgData, 'warm', 1.0);

            // Sepia shifts neutral gray towards warm amber: red > green > blue
            expect(imgData.data[0]).toBeGreaterThan(imgData.data[1]);
            expect(imgData.data[1]).toBeGreaterThan(imgData.data[2]);
        });

        it('applies sepia filter properly', () => {
            const imgData = createSampleImageData(150, 150, 150);
            applyStoryFilterToImageData(imgData, 'sepia', 1.0);

            expect(imgData.data[0]).toBeGreaterThan(imgData.data[1]);
            expect(imgData.data[1]).toBeGreaterThan(imgData.data[2]);
        });

        it('applies vivid, matte, and noir filters without errors', () => {
            for (const filterId of ['vivid', 'matte', 'noir'] as const) {
                const imgData = createSampleImageData(150, 120, 90);
                applyStoryFilterToImageData(imgData, filterId, 1.0);
                expect(imgData.data[0]).toBeGreaterThanOrEqual(0);
                expect(imgData.data[0]).toBeLessThanOrEqual(255);
                expect(imgData.data[3]).toBe(255);
            }
        });

        it('supportsCanvasFilter detects presence of CanvasRenderingContext2D filter', () => {
            _setSupportsCanvasFilterForTesting(null);
            const supported = supportsCanvasFilter();
            expect(typeof supported).toBe('boolean');
        });

        it('drawImageWithStoryFilter uses native ctx.filter when supported', () => {
            _setSupportsCanvasFilterForTesting(true);

            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                drawImage: vi.fn(),
                filter: 'none',
            } as unknown as CanvasRenderingContext2D;

            const mockImg = { width: 100, height: 100 } as HTMLImageElement;
            drawImageWithStoryFilter(
                mockCtx,
                mockImg,
                0,
                0,
                100,
                100,
                0,
                0,
                100,
                100,
                'bw',
                1.0,
                'grayscale(100%) contrast(108%)'
            );

            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.filter).toBe('grayscale(100%) contrast(108%)');
            expect(mockCtx.drawImage).toHaveBeenCalledWith(mockImg, 0, 0, 100, 100, 0, 0, 100, 100);
            expect(mockCtx.restore).toHaveBeenCalled();

            _setSupportsCanvasFilterForTesting(null);
        });

        it('drawImageWithStoryFilter draws directly when filter is none', () => {
            _setSupportsCanvasFilterForTesting(false);

            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                drawImage: vi.fn(),
            } as unknown as CanvasRenderingContext2D;

            const mockImg = { width: 100, height: 100 } as HTMLImageElement;
            drawImageWithStoryFilter(mockCtx, mockImg, 0, 0, 100, 100, 0, 0, 100, 100, 'none', 1.0, 'none');

            expect(mockCtx.save).not.toHaveBeenCalled();
            expect(mockCtx.drawImage).toHaveBeenCalledWith(mockImg, 0, 0, 100, 100, 0, 0, 100, 100);

            _setSupportsCanvasFilterForTesting(null);
        });
    });
});
