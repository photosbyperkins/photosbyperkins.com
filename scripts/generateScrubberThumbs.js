import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';

const SCRUBBER_DIR = path.join(process.cwd(), 'build', 'scrubber');
const INDEX_FILE = path.join(process.cwd(), 'data', 'photos.json');
const METRICS_FILE = path.join(process.cwd(), 'data', 'quality_metrics.json');

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
        // Image is wider than 3:2 — constrain by height
        cropH = imgHeight;
        cropW = Math.round(imgHeight * TARGET_RATIO);
    } else if (imgRatio < TARGET_RATIO) {
        // Image is taller than 3:2 — constrain by width
        cropW = imgWidth;
        cropH = Math.round(imgWidth / TARGET_RATIO);
    } else {
        // Already 3:2
        return null;
    }

    // Center the crop on the focus point
    let left = Math.round(focusX * imgWidth - cropW / 2);
    let top = Math.round(focusY * imgHeight - cropH / 2);

    // Clamp to image bounds
    left = Math.max(0, Math.min(left, imgWidth - cropW));
    top = Math.max(0, Math.min(top, imgHeight - cropH));

    return { left, top, width: cropW, height: cropH };
}

/**
 * Compute the median of a numeric array.
 */
function median(values) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

async function generateScrubberThumbs() {
    console.log('🎞️  Generating scrubber sprite sheets from originals...\n');

    if (!fs.existsSync(SCRUBBER_DIR)) {
        fs.mkdirSync(SCRUBBER_DIR, { recursive: true });
    }

    if (!fs.existsSync(INDEX_FILE)) {
        console.error('Error: photos.json not found. Run "npm run index" first.');
        process.exit(1);
    }
    const indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));

    // Load SSIMULACRA 2 quality metrics for per-sprite quality targeting
    let qualityMap = {};
    if (fs.existsSync(METRICS_FILE)) {
        try {
            qualityMap = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
        } catch (e) {
            console.error('  ⚠️  Failed to parse quality_metrics.json, using default quality');
        }
    }

    const validSprites = new Set();
    let spritesGenerated = 0;
    let spritesSkipped = 0;

    for (const year in indexData) {
        for (const event in indexData[year]) {
            const eventData = indexData[year][event];
            const allPhotos = [...(eventData.album || [])];

            if (allPhotos.length === 0) continue;

            // Derive the sprite output path from the first photo's thumb path
            const firstThumb = allPhotos[0]?.thumb;
            if (!firstThumb) continue;

            const thumbDir = firstThumb.substring(0, firstThumb.lastIndexOf('/'));
            const spriteRelative = thumbDir.replace(/^\/thumbnails\//, 'scrubber/');
            const spriteDir = path.join(process.cwd(), 'build', spriteRelative);
            const spritePath = path.join(spriteDir, 'sprite.webp');

            validSprites.add(spritePath);

            // Skip if sprite exists and has the correct frame count (width matches 72 × photos)
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
                    // Create a blank frame as placeholder
                    frameBuffers.push(
                        await sharp({
                            create: {
                                width: FRAME_WIDTH,
                                height: FRAME_HEIGHT,
                                channels: 3,
                                background: { r: 30, g: 30, b: 30 },
                            },
                        })
                            .toFormat('raw')
                            .toBuffer()
                    );
                    continue;
                }

                // Resolve original photo path from source (same pattern as generateWebp.js)
                const sourceRelative = imgObj.source.startsWith('/') ? imgObj.source.slice(1) : imgObj.source;
                const sourcePath = path.join(process.cwd(), sourceRelative);

                if (!fs.existsSync(sourcePath)) {
                    console.error(`  ❌ Source photo missing: ${sourcePath}`);
                    failCount++;
                    frameBuffers.push(
                        await sharp({
                            create: {
                                width: FRAME_WIDTH,
                                height: FRAME_HEIGHT,
                                channels: 3,
                                background: { r: 30, g: 30, b: 30 },
                            },
                        })
                            .toFormat('raw')
                            .toBuffer()
                    );
                    continue;
                }

                try {
                    let pipeline = sharp(sourcePath);

                    // Get source dimensions to compute the focus-aware crop
                    const meta = await sharp(sourcePath).metadata();
                    const imgW = meta.width || 0;
                    const imgH = meta.height || 0;

                    if (imgW > 0 && imgH > 0) {
                        const focusX = imgObj.focusX ?? 0.5;
                        const focusY = imgObj.focusY ?? 0.5;
                        const crop = computeFocusCrop(imgW, imgH, focusX, focusY);

                        if (crop) {
                            pipeline = pipeline.extract(crop);
                        }
                    }

                    const buf = await pipeline
                        .resize({
                            width: FRAME_WIDTH,
                            height: FRAME_HEIGHT,
                            fit: 'cover',
                            position: 'center',
                        })
                        .toFormat('raw')
                        .toBuffer();
                    frameBuffers.push(buf);
                } catch (err) {
                    console.error(`  ❌ Failed to process ${sourceRelative}:`, err.message);
                    failCount++;
                    frameBuffers.push(
                        await sharp({
                            create: {
                                width: FRAME_WIDTH,
                                height: FRAME_HEIGHT,
                                channels: 3,
                                background: { r: 30, g: 30, b: 30 },
                            },
                        })
                            .toFormat('raw')
                            .toBuffer()
                    );
                }
            }

            // Composite all frames into a single horizontal strip
            const totalWidth = FRAME_WIDTH * frameBuffers.length;
            const compositeInputs = frameBuffers.map((buf, i) => ({
                input: buf,
                raw: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 3 },
                left: i * FRAME_WIDTH,
                top: 0,
            }));

            fs.mkdirSync(spriteDir, { recursive: true });

            // Determine sprite quality from the median SSIMULACRA 2 Q value of constituent photos
            const qValues = allPhotos
                .filter(img => typeof img !== 'string' && img.source)
                .map(img => {
                    const key = (img.source.startsWith('/') ? img.source.slice(1) : img.source).replace(/\\/g, '/');
                    return qualityMap[key];
                })
                .filter(q => q != null);
            const spriteQuality = median(qValues) ?? 60;

            await sharp({
                create: {
                    width: totalWidth,
                    height: FRAME_HEIGHT,
                    channels: 3,
                    background: { r: 0, g: 0, b: 0 },
                },
            })
                .composite(compositeInputs)
                .webp({ quality: spriteQuality, effort: 6 })
                .toFile(spritePath);

            const fileSizeKb = (fs.statSync(spritePath).size / 1024).toFixed(1);
            console.log(
                `  ✅ ${spriteRelative}/sprite.webp — ${frameBuffers.length} frames, ${totalWidth}×${FRAME_HEIGHT}px, ${fileSizeKb}KB, Q:${spriteQuality}${failCount > 0 ? ` (${failCount} failed)` : ''}`
            );
            spritesGenerated++;
        }
    }

    // Clean up stale sprites
    console.log('\n🧹 Cleaning up stale scrubber sprites...');
    function removeStaleFiles(dir, validSet) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            const fullPath = path.join(dir, e.name);
            if (e.isDirectory()) {
                removeStaleFiles(fullPath, validSet);
                try {
                    fs.rmdirSync(fullPath);
                } catch (_e) {} // Remove if empty
            } else {
                if (!validSet.has(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                        console.log(`  🗑️  Removed stale: ${e.name}`);
                    } catch (_err) {}
                }
            }
        }
    }
    removeStaleFiles(SCRUBBER_DIR, validSprites);

    console.log(`\n⏭️  Skipped ${spritesSkipped} up-to-date sprites.`);
    console.log(`✨ Generated ${spritesGenerated} new sprite sheets.`);
    console.log('🎞️  Scrubber sprite generation complete!');
}

generateScrubberThumbs().catch(console.error);
