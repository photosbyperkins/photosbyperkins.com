import { describe, it, expect, vi } from 'vitest';
import { calculateNormalizedCrop, generateStoryPresets, drawCameraLogoIcon, renderStoryToCanvas, STORY_ASPECT_RATIO } from './storyCanvas';

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

    describe('generateStoryPresets', () => {
        const w = 3840;
        const h = 2560;

        it('generates 0-people presets when no faces exist', () => {
            const presets = generateStoryPresets({ width: w, height: h });
            const ids = presets.map((p) => p.id);

            expect(ids).toContain('center');
            expect(ids).toContain('thirds-left');
            expect(ids).toContain('thirds-right');
            expect(ids).toContain('padded-glass');
        });

        it('generates solo person presets when 1 face exists', () => {
            const presets = generateStoryPresets({
                width: w,
                height: h,
                faces: [{ x: 0.4, y: 0.35, w: 0.1, h: 0.15 }],
            });
            const ids = presets.map((p) => p.id);

            expect(ids).toContain('subject');
            expect(ids).toContain('closeup');
            expect(ids).toContain('wide-action');
            expect(ids).toContain('padded-glass');
        });

        it('falls back to focusX and focusY when faces array is absent', () => {
            const presets = generateStoryPresets({
                width: w,
                height: h,
                focusX: 0.45,
                focusY: 0.3,
            });
            const ids = presets.map((p) => p.id);

            expect(ids).toContain('subject');
            expect(ids).toContain('closeup');
            expect(ids).toContain('padded-glass');
        });

        it('generates duo presets when 2 faces exist', () => {
            const presets = generateStoryPresets({
                width: w,
                height: h,
                faces: [
                    { x: 0.35, y: 0.4, w: 0.08, h: 0.12 },
                    { x: 0.65, y: 0.42, w: 0.09, h: 0.13 },
                ],
            });
            const ids = presets.map((p) => p.id);

            expect(ids).toContain('duo');
            expect(ids).toContain('person-1');
            expect(ids).toContain('person-2');
            expect(ids).toContain('padded-glass');
        });

        it('generates pack / group presets when 3+ faces exist', () => {
            const presets = generateStoryPresets({
                width: w,
                height: h,
                faces: [
                    { x: 0.25, y: 0.4 },
                    { x: 0.5, y: 0.38 },
                    { x: 0.75, y: 0.42 },
                ],
            });
            const ids = presets.map((p) => p.id);

            expect(ids).toContain('pack');
            expect(ids).toContain('primary');
            expect(ids).toContain('person-1');
            expect(ids).toContain('person-2');
            expect(ids).toContain('person-3');
            expect(ids).toContain('padded-glass');
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
            expect(mockCtx.fillText).toHaveBeenCalledWith('P', 325, 240);
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
                    padded: { style: 'custom', customColor: '#1e293b', position: 'center', cardScale: 0.92, cardCornerRadius: 24 },
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
    });
});
