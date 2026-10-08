import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
    FRAME_WIDTH,
    FRAME_HEIGHT,
    SCRUBBER_COLUMNS,
    TARGET_RATIO,
    MAX_WEBP_DIMENSION,
    MAX_GPU_TEXTURE_DIMENSION,
    MAX_SPRITE_ROWS,
    MAX_SPRITE_FRAMES,
    computeFocusCrop,
} from './generateScrubber';

describe('generateScrubber pipeline configuration & safeguards', () => {
    it('configures 2x retina frame dimensions with 3:2 aspect ratio', () => {
        expect(FRAME_WIDTH).toBe(144);
        expect(FRAME_HEIGHT).toBe(96);
        expect(TARGET_RATIO).toBe(1.5);
    });

    it('enforces GPU and WebP dimension limits in column layout', () => {
        const fullRowWidth = FRAME_WIDTH * SCRUBBER_COLUMNS;
        // Must stay under mobile GPU texture limit (8192px)
        expect(fullRowWidth).toBeLessThanOrEqual(MAX_GPU_TEXTURE_DIMENSION);
        // Must stay strictly under WebP specification limit (16383px)
        expect(fullRowWidth).toBeLessThanOrEqual(MAX_WEBP_DIMENSION);
        expect(fullRowWidth).toBe(7200);
    });

    it('calculates safe max sprite frames to prevent texture dimension overflow', () => {
        expect(MAX_SPRITE_ROWS).toBe(Math.floor(MAX_GPU_TEXTURE_DIMENSION / FRAME_HEIGHT));
        expect(MAX_SPRITE_ROWS).toBe(85);
        expect(MAX_SPRITE_FRAMES).toBe(50 * 85);
        expect(MAX_SPRITE_FRAMES).toBe(4250);

        // Even with max safe frames, max height must stay <= 8192px
        const maxHeight = MAX_SPRITE_ROWS * FRAME_HEIGHT;
        expect(maxHeight).toBeLessThanOrEqual(MAX_GPU_TEXTURE_DIMENSION);
    });

    describe('computeFocusCrop', () => {
        it('returns null when image matches target 3:2 ratio exactly', () => {
            const crop = computeFocusCrop(3000, 2000, 0.5, 0.5);
            expect(crop).toBeNull();
        });

        it('crops width when image is wider than 3:2 (e.g. 16:9)', () => {
            // 1600x900 -> ratio is 1.777 > 1.5
            // cropH = 900, cropW = round(900 * 1.5) = 1350
            const crop = computeFocusCrop(1600, 900, 0.5, 0.5);
            expect(crop).not.toBeNull();
            expect(crop?.width).toBe(1350);
            expect(crop?.height).toBe(900);
            // Center crop: left = 800 - 675 = 125
            expect(crop?.left).toBe(125);
            expect(crop?.top).toBe(0);
        });

        it('crops height when image is taller than 3:2 (e.g. 1:1 square or 2:3 portrait)', () => {
            // 1000x1000 -> ratio is 1.0 < 1.5
            // cropW = 1000, cropH = round(1000 / 1.5) = 667
            const crop = computeFocusCrop(1000, 1000, 0.5, 0.2);
            expect(crop).not.toBeNull();
            expect(crop?.width).toBe(1000);
            expect(crop?.height).toBe(667);
            // FocusY = 0.2 -> center at 200, top = 200 - 333.5 = -133 clamped to 0
            expect(crop?.top).toBe(0);
        });

        it('clamps crop bounds cleanly at image boundaries', () => {
            // Focus at extreme right (focusX = 1.0)
            const cropRight = computeFocusCrop(1600, 900, 1.0, 0.5);
            expect(cropRight).not.toBeNull();
            expect(cropRight?.left).toBe(1600 - 1350); // 250

            // Focus at extreme left (focusX = 0.0)
            const cropLeft = computeFocusCrop(1600, 900, 0.0, 0.5);
            expect(cropLeft).not.toBeNull();
            expect(cropLeft?.left).toBe(0);
        });
    });

    describe('Sharp 2x Sprite Compositing', () => {
        it('composites 2x retina frames into valid WebP sprite', async () => {
            const frameCount = 3;
            const cols = Math.min(frameCount, SCRUBBER_COLUMNS);
            const rows = Math.ceil(frameCount / SCRUBBER_COLUMNS);
            const totalWidth = FRAME_WIDTH * cols;
            const totalHeight = FRAME_HEIGHT * rows;

            const frames = await Promise.all(
                Array.from({ length: frameCount }).map((_, i) =>
                    sharp({
                        create: {
                            width: FRAME_WIDTH,
                            height: FRAME_HEIGHT,
                            channels: 3,
                            background: { r: 50 * i, g: 100, b: 150 },
                        },
                    })
                        .toFormat('raw')
                        .toBuffer()
                )
            );

            const compositeInputs = frames.map((buf, i) => ({
                input: buf,
                raw: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 3 as const },
                left: (i % SCRUBBER_COLUMNS) * FRAME_WIDTH,
                top: Math.floor(i / SCRUBBER_COLUMNS) * FRAME_HEIGHT,
            }));

            const referenceBuffer = await sharp({
                create: { width: totalWidth, height: totalHeight, channels: 3, background: { r: 0, g: 0, b: 0 } },
            })
                .composite(compositeInputs)
                .png()
                .toBuffer();

            const spriteBuffer = await sharp(referenceBuffer).webp({ quality: 80, effort: 6 }).toBuffer();
            const meta = await sharp(spriteBuffer).metadata();

            expect(meta.format).toBe('webp');
            expect(meta.width).toBe(FRAME_WIDTH * frameCount); // 144 * 3 = 432
            expect(meta.height).toBe(FRAME_HEIGHT); // 96
        });
    });
});
