import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { findOptimalQuality } from './ssim2Pool.js';
import { runWithConcurrency, removeStaleFiles } from './utils.js';

const THUMBNAILS_DIR = path.join(process.cwd(), 'build', 'thumbnails');
const METRICS_FILE = path.join(process.cwd(), 'data', 'quality_metrics.json');
const MAX_DIMENSION = 800;

export async function generateThumbnails() {
    console.log('🖼️  Generating thumbnails with SSIMULACRA 2...\n');

    let qualityMap = {};
    if (fs.existsSync(METRICS_FILE)) {
        qualityMap = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
    }

    if (!fs.existsSync(THUMBNAILS_DIR)) {
        fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    }

    const INDEX_FILE = path.join(process.cwd(), 'data', 'photos.json');
    if (!fs.existsSync(INDEX_FILE)) {
        throw new Error('photos.json not found. Run "npm run index" first.');
    }
    const indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));

    const validThumbs = new Set();
    const tasks = [];
    let skippedCount = 0;

    for (const year in indexData) {
        for (const event in indexData[year]) {
            const eventData = indexData[year][event];
            const allPhotos = [...(eventData.album || []), ...(eventData.highlights || [])];

            for (const imgObj of allPhotos) {
                if (typeof imgObj === 'string' || !imgObj.source) continue;

                const sourceRelative = imgObj.source.startsWith('/') ? imgObj.source.slice(1) : imgObj.source;
                const sourcePath = path.join(process.cwd(), sourceRelative);

                const thumbRelative = imgObj.thumb.startsWith('/') ? imgObj.thumb.slice(1) : imgObj.thumb;
                const destPath = path.join(process.cwd(), 'build', thumbRelative);

                validThumbs.add(destPath);

                if (fs.existsSync(destPath)) {
                    skippedCount++;
                    continue;
                }

                if (!fs.existsSync(sourcePath)) {
                    console.error(`  ❌ Source photo missing for thumbnail generation: ${sourcePath}`);
                    continue;
                }

                tasks.push(async () => {
                    fs.mkdirSync(path.dirname(destPath), { recursive: true });
                    try {
                        const lookupKey = sourceRelative.replace(/\\/g, '/');

                        // Fast-path: if we already calculated the S2 threshold previously,
                        // we can just directly generate the thumbnail without evaluating.
                        if (qualityMap[lookupKey]) {
                            const q = qualityMap[lookupKey];
                            await sharp(sourcePath)
                                .resize({
                                    width: MAX_DIMENSION,
                                    height: MAX_DIMENSION,
                                    fit: 'inside',
                                    withoutEnlargement: true,
                                })
                                .webp({ quality: q, effort: 6 })
                                .toFile(destPath);
                            console.log(`  ⏭️ Cached (Q:${q}): ${thumbRelative}`);
                        } else {
                            const referencePng = await sharp(sourcePath)
                                .resize({
                                    width: MAX_DIMENSION,
                                    height: MAX_DIMENSION,
                                    fit: 'inside',
                                    withoutEnlargement: true,
                                })
                                .png()
                                .toBuffer();

                            const { quality, buffer } = await findOptimalQuality(
                                referencePng,
                                `thumb_${lookupKey.replace(/[^a-z0-9]/gi, '_')}`
                            );

                            await fs.promises.writeFile(destPath, buffer);
                            qualityMap[lookupKey] = quality;
                            console.log(`  ✅ Generated (Q:${quality}): ${thumbRelative}`);
                        }
                    } catch (err) {
                        console.error(`  ❌ Failed ${thumbRelative}:`, err.message);
                    }
                });
            }
        }
    }

    console.log('\n🧹 Cleaning up stale thumbnails from cache...');
    removeStaleFiles(THUMBNAILS_DIR, validThumbs);

    if (skippedCount > 0) {
        console.log(`⏭️  Skipped ${skippedCount} existing thumbnails.`);
    }

    if (tasks.length > 0) {
        const threads = 16;
        console.log(`🚀 Processing ${tasks.length} new thumbnails across ${threads} threads...\n`);
        await runWithConcurrency(tasks, threads);
    } else {
        console.log(`✅ No new thumbnails to generate.`);
    }

    fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
    fs.writeFileSync(METRICS_FILE, JSON.stringify(qualityMap, null, 2));

    console.log('\n✨ Thumbnail generation complete!');
}

// Allow standalone execution
if (process.argv[1] && process.argv[1].includes('generateThumbnails')) {
    const { initPool, stopPool } = await import('./ssim2Pool.js');
    initPool();
    generateThumbnails().then(() => stopPool()).catch(console.error);
}
