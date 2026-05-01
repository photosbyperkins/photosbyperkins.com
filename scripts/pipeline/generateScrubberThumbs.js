import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { findOptimalQuality } from './ssim2Pool.js';
import { removeStaleFiles } from './utils.js';

const SCRUBBER_DIR = path.join(process.cwd(), 'build', 'scrubber');
const INDEX_FILE = path.join(process.cwd(), 'data', 'photos.json');

const FRAME_WIDTH = 72;
const FRAME_HEIGHT = 48;
const TARGET_RATIO = FRAME_WIDTH / FRAME_HEIGHT; // 1.5 (3:2)

/**
 * Compute a 3:2 crop region centered on (focusX, focusY), clamped to image bounds.
 * Returns { left, top, width, height } for sharp.extract().
 */
function computeFocusCrop(imgWidth, imgHeight, focusX, focusY) {
    const imgRatio = imgWidth / imgHeight;

    let cropW, cropH;
    if (imgRatio > TARGET_RATIO) {
        cropH = imgHeight;
        cropW = Math.round(imgHeight * TARGET_RATIO);
    } else if (imgRatio < TARGET_RATIO) {
        cropW = imgWidth;
        cropH = Math.round(imgWidth / TARGET_RATIO);
    } else {
        return null;
    }

    let left = Math.round(focusX * imgWidth - cropW / 2);
    let top = Math.round(focusY * imgHeight - cropH / 2);

    left = Math.max(0, Math.min(left, imgWidth - cropW));
    top = Math.max(0, Math.min(top, imgHeight - cropH));

    return { left, top, width: cropW, height: cropH };
}

export async function generateScrubberThumbs() {
    console.log('🎞️  Generating scrubber sprite sheets with SSIMULACRA 2...\n');

    if (!fs.existsSync(SCRUBBER_DIR)) {
        fs.mkdirSync(SCRUBBER_DIR, { recursive: true });
    }

    if (!fs.existsSync(INDEX_FILE)) {
        throw new Error('photos.json not found. Run "npm run index" first.');
    }
    const indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));

    const validSprites = new Set();
    let spritesGenerated = 0;
    let spritesSkipped = 0;

    for (const year in indexData) {
        for (const event in indexData[year]) {
            const eventData = indexData[year][event];
            const allPhotos = [...(eventData.album || [])];

            if (allPhotos.length === 0) continue;

            const firstThumb = allPhotos[0]?.thumb;
            if (!firstThumb) continue;

            const thumbDir = firstThumb.substring(0, firstThumb.lastIndexOf('/'));
            const spriteRelative = thumbDir.replace(/^\/thumbnails\//, 'scrubber/');
            const spriteDir = path.join(process.cwd(), 'build', spriteRelative);
            const spritePath = path.join(spriteDir, 'sprite.webp');

            validSprites.add(spritePath);

            // Skip if sprite exists and has the correct frame count
            const expectedWidth = FRAME_WIDTH * allPhotos.length;
            if (fs.existsSync(spritePath)) {
                try {
                    const meta = await sharp(spritePath).metadata();
                    if (meta.width === expectedWidth) {
                        spritesSkipped++;
                        continue;
                    }
                } catch (_e) { /* regenerate on read failure */ }
            }

            // Generate individual frame buffers
            const frameBuffers = [];
            let failCount = 0;

            for (const imgObj of allPhotos) {
                if (typeof imgObj === 'string' || !imgObj.source) {
                    frameBuffers.push(
                        await sharp({
                            create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 3, background: { r: 30, g: 30, b: 30 } },
                        }).toFormat('raw').toBuffer()
                    );
                    continue;
                }

                const sourceRelative = imgObj.source.startsWith('/') ? imgObj.source.slice(1) : imgObj.source;
                const sourcePath = path.join(process.cwd(), sourceRelative);

                if (!fs.existsSync(sourcePath)) {
                    console.error(`  ❌ Source photo missing: ${sourcePath}`);
                    failCount++;
                    frameBuffers.push(
                        await sharp({
                            create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 3, background: { r: 30, g: 30, b: 30 } },
                        }).toFormat('raw').toBuffer()
                    );
                    continue;
                }

                try {
                    let pipeline = sharp(sourcePath);
                    const meta = await sharp(sourcePath).metadata();
                    const imgW = meta.width || 0;
                    const imgH = meta.height || 0;

                    if (imgW > 0 && imgH > 0) {
                        const focusX = imgObj.focusX ?? 0.5;
                        const focusY = imgObj.focusY ?? 0.5;
                        const crop = computeFocusCrop(imgW, imgH, focusX, focusY);
                        if (crop) pipeline = pipeline.extract(crop);
                    }

                    const buf = await pipeline
                        .resize({ width: FRAME_WIDTH, height: FRAME_HEIGHT, fit: 'cover', position: 'center' })
                        .toFormat('raw')
                        .toBuffer();
                    frameBuffers.push(buf);
                } catch (err) {
                    console.error(`  ❌ Failed to process ${sourceRelative}:`, err.message);
                    failCount++;
                    frameBuffers.push(
                        await sharp({
                            create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 3, background: { r: 30, g: 30, b: 30 } },
                        }).toFormat('raw').toBuffer()
                    );
                }
            }

            // Composite all frames into a horizontal strip
            const totalWidth = FRAME_WIDTH * frameBuffers.length;
            const compositeInputs = frameBuffers.map((buf, i) => ({
                input: buf,
                raw: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 3 },
                left: i * FRAME_WIDTH,
                top: 0,
            }));

            fs.mkdirSync(spriteDir, { recursive: true });

            // Create lossless reference and find optimal quality via SSIMULACRA 2
            const referenceBuffer = await sharp({
                create: { width: totalWidth, height: FRAME_HEIGHT, channels: 3, background: { r: 0, g: 0, b: 0 } },
            }).composite(compositeInputs).png().toBuffer();

            const { quality, buffer } = await findOptimalQuality(referenceBuffer, `scrub_${year}_${event.replace(/[^a-z0-9]/gi, '_')}`);

            await fs.promises.writeFile(spritePath, buffer);

            const fileSizeKb = (buffer.length / 1024).toFixed(1);
            console.log(
                `  ✅ ${spriteRelative}/sprite.webp — ${frameBuffers.length} frames, ${totalWidth}×${FRAME_HEIGHT}px, ${fileSizeKb}KB, Q:${quality}${failCount > 0 ? ` (${failCount} failed)` : ''}`
            );
            spritesGenerated++;
        }
    }

    // Clean up stale sprites
    console.log('\n🧹 Cleaning up stale scrubber sprites...');
    removeStaleFiles(SCRUBBER_DIR, validSprites);

    console.log(`\n⏭️  Skipped ${spritesSkipped} up-to-date sprites.`);
    console.log(`✨ Generated ${spritesGenerated} new sprite sheets.`);
    console.log('🎞️  Scrubber sprite generation complete!');
}

// Allow standalone execution
if (process.argv[1] && process.argv[1].includes('generateScrubberThumbs')) {
    const { initPool, stopPool } = await import('./ssim2Pool.js');
    initPool();
    generateScrubberThumbs().then(() => stopPool()).catch(console.error);
}
