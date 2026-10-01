import { describe, it, expect, vi } from 'vitest';
import {
    calculateNormalizedCrop,
    generateStoryPresets,
    drawCameraLogoIcon,
    renderStoryToCanvas,
    drawStoryFrameToCanvas,
    hexToRgba,
    isColorLight,
    getStoryFilterCss,
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
            expect(ids).not.toContain('wide-action');
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
    });
});
