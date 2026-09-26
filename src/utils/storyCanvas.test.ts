import { describe, it, expect, vi } from 'vitest';
import {
    calculateNormalizedCrop,
    generateStoryPresets,
    drawCameraLogoIcon,
    renderStoryToCanvas,
    drawStoryFrameToCanvas,
    STORY_ASPECT_RATIO,
    STORY_PHOTO_FILTERS,
    STORY_PHOTO_FILTERS_MAP,
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

    describe('generateStoryPresets', () => {
        const w = 3840;
        const h = 2560;

        it('generates 0-people presets when no faces exist ordered logically as Left, Center, Right', () => {
            const presets = generateStoryPresets({ width: w, height: h });
            const ids = presets.map((p) => p.id);

            expect(ids).toContain('center');
            expect(ids).toContain('thirds-left');
            expect(ids).toContain('thirds-right');
            expect(ids).toContain('padded-glass');

            const cropPresets = presets.filter((p) => p.mode === 'crop');
            expect(cropPresets.map((p) => p.id)).toEqual(['thirds-left', 'center', 'thirds-right']);
            expect(cropPresets.map((p) => p.label)).toEqual(['Left', 'Center', 'Right']);
            expect(presets.find((p) => p.id === 'center')?.isDefault).toBe(true);
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
        it('has 15 frame definitions including none and 14 thematic designs', () => {
            expect(STORY_FRAME_DEFINITIONS).toHaveLength(15);
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
        });

        it('generates valid SVG strings with and without color override', () => {
            const bear = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'sac-bear');
            expect(bear).toBeDefined();

            const defaultSvg = bear!.getSvgString();
            expect(defaultSvg).toContain('<svg');
            expect(defaultSvg).toContain('viewBox="0 0 1080 1920"');
            expect(defaultSvg).toContain('#f59e0b');

            const customSvg = bear!.getSvgString('#3b82f6');
            expect(customSvg).toContain('#3b82f6');
        });

        it('renders deep space frame with dual-ring planet, shooting comet, and starlight', () => {
            const cosmos = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'intergalactic');
            expect(cosmos).toBeDefined();

            const svg = cosmos!.getSvgString();
            expect(svg).toContain('rotate(-22)');
            expect(svg).toContain('x1="-30" y1="80" x2="220" y2="210"'); // comet trail
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
            expect(svgNoScoreboard).toContain('L130,1820'); // full ground strike
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
            // Positioned elevated above scoreboard
            expect(svgWithExif).toContain('y="1566"');

            // Exposure compensation removed per user request
            expect(svgWithExif).not.toContain('EXP COMP');
            // Top row HUD elements removed per user request
            expect(svgWithExif).not.toContain('AF-C');
            // Center focus point indicator removed per user request
            expect(svgWithExif).not.toContain('width="72" height="72"');

            // When scoreboard is false, bottom telemetry bar docks at 1806
            const svgNoScoreboard = ttl!.getSvgString(undefined, {
                hasScoreboard: false,
                hasAttribution: false,
            });
            expect(svgNoScoreboard).toContain('y="1806"');
        });

        it('filters through-the-lens frame when photo has no EXIF data', () => {
            const filterFrames = (hasExif: boolean) =>
                STORY_FRAME_DEFINITIONS.filter((f) => f.id !== 'through-the-lens' || hasExif);

            const withoutExif = filterFrames(false);
            expect(withoutExif.some((f) => f.id === 'through-the-lens')).toBe(false);
            expect(withoutExif).toHaveLength(14);

            const withExif = filterFrames(true);
            expect(withExif.some((f) => f.id === 'through-the-lens')).toBe(true);
            expect(withExif).toHaveLength(15);
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

        it('dynamically adapts frame layout based on context (badges present vs absent)', () => {
            const bear = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'sac-bear');
            expect(bear).toBeDefined();

            // When scoreboard is present, bear is elevated into the flank
            const bearWithScoreboard = bear!.getSvgString(undefined, { hasScoreboard: true, hasAttribution: true });
            expect(bearWithScoreboard).toContain('translate(750, 1510)');
            // Top racing stripe splits around attribution
            expect(bearWithScoreboard).toContain('x1="140" y1="117" x2="250"');
            expect(bearWithScoreboard).toContain('x1="830" y1="117" x2="940"');

            // When scoreboard is absent, bear descends into the corner
            const bearWithoutScoreboard = bear!.getSvgString(undefined, { hasScoreboard: false, hasAttribution: false });
            expect(bearWithoutScoreboard).toContain('translate(660, 1680)');
            // Top racing stripe spans continuously across
            expect(bearWithoutScoreboard).toContain('x1="140" y1="117" x2="940"');

            // Derby Quads: roller skate elevates when scoreboard is present
            const derby = STORY_FRAME_DEFINITIONS.find((f) => f.id === 'derby-quads');
            expect(derby).toBeDefined();
            const derbyWithScoreboard = derby!.getSvgString(undefined, { hasScoreboard: true });
            expect(derbyWithScoreboard).toContain('translate(50, 1530)');
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
});
