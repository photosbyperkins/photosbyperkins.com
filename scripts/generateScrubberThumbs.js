import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';

const PHOTOS_DIR = path.join(process.cwd(), 'photos');
const SCRUBBER_DIR = path.join(process.cwd(), 'build', 'scrubber');
const INDEX_FILE = path.join(process.cwd(), 'data', 'photos.json');

const SCRUBBER_WIDTH = 72;
const SCRUBBER_HEIGHT = 48;

async function generateScrubberThumbs() {
    console.log('🎞️  Generating micro-media scrubber thumbs...\n');

    if (!fs.existsSync(SCRUBBER_DIR)) {
        fs.mkdirSync(SCRUBBER_DIR, { recursive: true });
    }

    if (!fs.existsSync(INDEX_FILE)) {
        console.error('Error: photos.json not found. Run "npm run index" first.');
        process.exit(1);
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

                // Source image path
                const sourceRelative = imgObj.source.startsWith('/') ? imgObj.source.slice(1) : imgObj.source;
                const sourcePath = path.join(process.cwd(), sourceRelative);

                // Re-map thumbnail path to scrubber path
                // e.g. /thumbnails/2023/event/photo.webp -> build/scrubber/2023/event/photo.webp
                const thumbRelative = imgObj.thumb.startsWith('/') ? imgObj.thumb.slice(1) : imgObj.thumb;
                const scrubberRelative = thumbRelative.replace(/^thumbnails[\\/]/, 'scrubber/');
                const destPath = path.join(process.cwd(), 'build', scrubberRelative);

                validThumbs.add(destPath);

                if (fs.existsSync(destPath)) {
                    skippedCount++;
                    continue;
                }

                if (!fs.existsSync(sourcePath)) {
                    console.error(`  ❌ Source photo missing: ${sourcePath}`);
                    continue;
                }

                tasks.push(async () => {
                    fs.mkdirSync(path.dirname(destPath), { recursive: true });
                    try {
                        await sharp(sourcePath)
                            .resize({
                                width: SCRUBBER_WIDTH,
                                height: SCRUBBER_HEIGHT,
                                fit: 'cover',
                                position: 'center'
                            })
                            .webp({
                                quality: 60, // Highly compressed for micro-media
                                effort: 6
                            })
                            .toFile(destPath);
                        console.log(`  ✅ Generated Scrubber: ${scrubberRelative}`);
                    } catch (err) {
                        console.error(`  ❌ Failed ${scrubberRelative}:`, err.message);
                    }
                });
            }
        }
    }

    console.log('\n🧹 Cleaning up stale scrubber thumbs...');
    function removeStaleFiles(dir, validSet) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            const fullPath = path.join(dir, e.name);
            if (e.isDirectory()) {
                removeStaleFiles(fullPath, validSet);
                try {
                    fs.rmdirSync(fullPath);
                } catch (e) {} // Remove if empty
            } else {
                if (!validSet.has(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                        console.log(`  🗑️  Removed stale scrubber thumb: ${e.name}`);
                    } catch (err) {}
                }
            }
        }
    }
    removeStaleFiles(SCRUBBER_DIR, validThumbs);

    if (skippedCount > 0) {
        console.log(`⏭️  Skipped ${skippedCount} existing scrubber thumbs.`);
    }

    if (tasks.length > 0) {
        // Use 16 threads max
        const threads = 16;
        console.log(`🚀 Processing ${tasks.length} new scrubber thumbs across ${threads} threads...\n`);
        
        const executing = [];
        for (const task of tasks) {
            const p = Promise.resolve().then(() => task());
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= threads) {
                await Promise.race(executing);
            }
        }
        await Promise.all(executing); // Wait for remaining
        
    } else {
        console.log(`✅ No new scrubber thumbs to generate.`);
    }

    console.log('\n✨ Scrubber thumbs complete!');
}

generateScrubberThumbs().catch(console.error);
