import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SCRUBBER_DIR = path.join(process.cwd(), 'build', 'scrubber');
const INDEX_FILE = path.join(process.cwd(), 'data', 'photos.json');

const FRAME_WIDTH = 72;
const FRAME_HEIGHT = 48;

async function generateScrubberThumbs() {
    console.log('🎞️  Generating scrubber sprite sheets...\n');

    if (!fs.existsSync(SCRUBBER_DIR)) {
        fs.mkdirSync(SCRUBBER_DIR, { recursive: true });
    }

    if (!fs.existsSync(INDEX_FILE)) {
        console.error('Error: photos.json not found. Run "npm run index" first.');
        process.exit(1);
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
                if (typeof imgObj === 'string' || !imgObj.thumb) {
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
                            .webp()
                            .toBuffer()
                    );
                    continue;
                }

                // Use the already-generated thumbnail as source (always exists, ~400px is plenty for 72×48)
                const thumbRelative = imgObj.thumb.startsWith('/') ? imgObj.thumb.slice(1) : imgObj.thumb;
                const thumbPath = path.join(process.cwd(), 'build', thumbRelative);

                if (!fs.existsSync(thumbPath)) {
                    console.error(`  ❌ Thumbnail missing: ${thumbPath}`);
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
                            .webp()
                            .toBuffer()
                    );
                    continue;
                }

                try {
                    const buf = await sharp(thumbPath)
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
                    console.error(`  ❌ Failed to process ${thumbRelative}:`, err.message);
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

            await sharp({
                create: {
                    width: totalWidth,
                    height: FRAME_HEIGHT,
                    channels: 3,
                    background: { r: 0, g: 0, b: 0 },
                },
            })
                .composite(compositeInputs)
                .webp({ quality: 60, effort: 6 })
                .toFile(spritePath);

            const fileSizeKb = (fs.statSync(spritePath).size / 1024).toFixed(1);
            console.log(
                `  ✅ ${spriteRelative}/sprite.webp — ${frameBuffers.length} frames, ${totalWidth}×${FRAME_HEIGHT}px, ${fileSizeKb}KB${failCount > 0 ? ` (${failCount} failed)` : ''}`
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
