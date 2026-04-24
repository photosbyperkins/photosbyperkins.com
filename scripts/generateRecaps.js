import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';

const YEARS_DIR = path.join(process.cwd(), 'public', 'data', 'years');
const RECAP_DIR = path.join(process.cwd(), 'build', 'recap');

async function runWithConcurrency(tasks, concurrency) {
    const results = [];
    const executing = [];
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);

        if (concurrency <= tasks.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= concurrency) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(results);
}

async function generateRecaps() {
    console.log('🖼️  Generating precropped recap images...\n');

    if (fs.existsSync(RECAP_DIR)) {
        fs.rmSync(RECAP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(RECAP_DIR, { recursive: true });

    const DEFS_FILE = path.join(process.cwd(), 'data', 'recap_definitions.json');
    if (!fs.existsSync(DEFS_FILE)) {
        console.error('❌ Cannot find recap_definitions.json! Run `npm run chunk-data` first.');
        process.exit(1);
    }

    const definitions = JSON.parse(fs.readFileSync(DEFS_FILE, 'utf8'));
    const taskData = [];

    for (const [slug, images] of Object.entries(definitions)) {
        if (Array.isArray(images)) {
            images.forEach((img, index) => {
                if (img.src) {
                    taskData.push({
                        slug, 
                        index: index + 1,
                        src: img.src,
                        focusX: img.focusX,
                        focusY: img.focusY
                    });
                }
            });
        }
    }

    console.log(`Found ${taskData.length} recap slice tasks to process.`);

    const METRICS_FILE = path.join(process.cwd(), 'data', 'quality_metrics.json');
    let qualityMap = {};
    if (fs.existsSync(METRICS_FILE)) {
        try {
            qualityMap = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
        } catch (e) {
            console.warn('⚠️ Could not parse quality_metrics.json, falling back to static quality.');
        }
    }

    let skippedCount = 0;
    let processedCount = 0;
    let failedCount = 0;

    const tasks = taskData.map((task) => async () => {
        const sourceRelative = task.src.startsWith('/') ? task.src.slice(1) : task.src;
        const sourcePath = path.join(process.cwd(), sourceRelative);

        const destRelative = `recap/${task.slug}/photo_${task.index}.webp`;
        const destPath = path.join(process.cwd(), 'build', destRelative);

        if (fs.existsSync(destPath)) {
            skippedCount++;
            return;
        }

        let actualSourcePath = sourcePath;

        if (!fs.existsSync(actualSourcePath)) {
            // Fallback to thumbnail if original is missing (useful for dev environments without raw photos)
            const thumbRelative = sourceRelative.replace(/^photos[/\\]/, 'thumbnails/').replace(/\.[^/.]+$/, '.webp');
            const thumbPath = path.join(process.cwd(), 'build', thumbRelative);
            
            if (fs.existsSync(thumbPath)) {
                actualSourcePath = thumbPath;
            } else {
                console.error(`  ❌ Source missing: ${sourcePath} (and thumbnail fallback)`);
                failedCount++;
                return;
            }
        }

        try {
            fs.mkdirSync(path.dirname(destPath), { recursive: true });

            const metadata = await sharp(actualSourcePath).metadata();
            const { width, height } = metadata;

            const cropRatio = 1 / 2; // width / height
            let cropWidth, cropHeight;

            if (width / height > cropRatio) {
                cropHeight = height;
                cropWidth = Math.round(height * cropRatio);
            } else {
                cropWidth = width;
                cropHeight = Math.round(width / cropRatio);
            }

            const focusX = task.focusX ?? 0.5;
            const focusY = task.focusY ?? 0.5;

            let left = Math.round(focusX * width - cropWidth / 2);
            let top = Math.round(focusY * height - cropHeight / 2);

            left = Math.max(0, Math.min(width - cropWidth, left));
            top = Math.max(0, Math.min(height - cropHeight, top));

            const lookupKey = sourceRelative.replace(/\\/g, '/');
            const targetQuality = qualityMap[lookupKey] || 80;

            await sharp(actualSourcePath)
                .extract({ left, top, width: cropWidth, height: cropHeight })
                .resize({
                    width: 300,
                    height: 600,
                    withoutEnlargement: true,
                    fit: 'inside', // To ensure it respects original ratios if smaller
                })
                .webp({ quality: targetQuality, effort: 6 })
                .toFile(destPath);

            processedCount++;
            console.log(`  ✅ Generated recap slice: ${destRelative}`);
        } catch (err) {
            console.error(`  ❌ Failed to process ${sourceRelative}:`, err.message);
            failedCount++;
        }
    });

    const threads = Math.max(4, os.cpus().length);
    if (tasks.length > 0) {
        await runWithConcurrency(tasks, threads);
    }

    console.log(`\n✨ Recap generation complete!`);
    console.log(`   Processed: ${processedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    if (failedCount > 0) console.log(`   Failed: ${failedCount}`);
}

generateRecaps();
