// @ts-nocheck
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';
import { findOptimalQuality } from './ssim2Pool.js';
import { runWithConcurrency, removeStaleFiles } from './utils.js';
import { RecapDefinitions } from './types';
import { logger } from './logger';

const RECAP_DIR = path.join(process.cwd(), 'build', 'recap');

export async function generateRecaps(definitions: RecapDefinitions): Promise<void> {
    logger.header('Generating precropped recap images...');

    if (!fs.existsSync(RECAP_DIR)) {
        fs.mkdirSync(RECAP_DIR, { recursive: true });
    }

    const validPaths = new Set();

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

    logger.info(`Found ${taskData.length} recap slice tasks to process.`);

    const METRICS_FILE = path.join(process.cwd(), 'data', 'quality_metrics.json');
    let qualityMap = {};
    if (fs.existsSync(METRICS_FILE)) {
        try {
            qualityMap = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
        } catch (e) {
            logger.warn('Could not parse quality_metrics.json, falling back to static quality.');
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

        validPaths.add(destPath);

        if (fs.existsSync(destPath)) {
            skippedCount++;
            return;
        }

        let actualSourcePath = sourcePath;

        if (!fs.existsSync(actualSourcePath)) {
            // Fallback to thumbnail if original is missing
            const thumbRelative = sourceRelative.replace(/^photos[/\\]/, 'thumbnails/').replace(/\.[^/.]+$/, '.webp');
            const thumbPath = path.join(process.cwd(), 'build', thumbRelative);
            
            if (fs.existsSync(thumbPath)) {
                actualSourcePath = thumbPath;
            } else {
                logger.error(`Source missing: ${sourcePath} (and thumbnail fallback)`);
                failedCount++;
                return;
            }
        }

        try {
            fs.mkdirSync(path.dirname(destPath), { recursive: true });

            const metadata = await sharp(actualSourcePath).metadata();
            const { width, height } = metadata;

            const cropRatio = 1 / 4; // width / height
            let cropWidth, cropHeight;

            if (width / height > cropRatio) {
                cropHeight = Math.min(height, Math.max(960, Math.round(height * 0.65)));
                cropWidth = Math.round(cropHeight * cropRatio);
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
                    width: 240,
                    height: 960,
                    withoutEnlargement: true,
                    fit: 'inside',
                })
                .webp({ quality: targetQuality, effort: 6 })
                .toFile(destPath);

            processedCount++;
            // logger.info(`Generated recap slice: ${destRelative}`);
        } catch (err: any) {
            logger.error(`Failed to process ${sourceRelative}:`, err.message);
            failedCount++;
        }
    });

    const threads = Math.max(4, os.cpus().length);
    if (tasks.length > 0) {
        await runWithConcurrency(tasks, threads);
    }

    // --- Sprite Generation with SSIMULACRA 2 quality optimization ---
    logger.step('Compositing recap sprites...');

    let spriteCount = 0;
    for (const [slug, images] of Object.entries(definitions)) {
        if (!Array.isArray(images) || images.length === 0) continue;

        const spriteFile = path.join(RECAP_DIR, slug, 'sprite.webp');
        validPaths.add(spriteFile);

        if (fs.existsSync(spriteFile) && processedCount === 0) {
            // logger.info(`Sprite exists: ${slug}/sprite.webp`);
            continue;
        }

        const slicePaths = [];
        let allExist = true;
        for (let i = 1; i <= images.length; i++) {
            const slicePath = path.join(RECAP_DIR, slug, `photo_${i}.webp`);
            if (!fs.existsSync(slicePath)) { allExist = false; break; }
            slicePaths.push(slicePath);
        }

        if (!allExist || slicePaths.length === 0) {
            logger.warn(`Skipping sprite for ${slug}: missing slices`);
            continue;
        }

        try {
            const firstMeta = await sharp(slicePaths[0]).metadata();
            const sliceWidth = firstMeta.width;
            const sliceHeight = firstMeta.height;
            const totalWidth = sliceWidth * slicePaths.length;

            const compositeInputs = await Promise.all(
                slicePaths.map(async (sp, i) => ({
                    input: await sharp(sp).resize(sliceWidth, sliceHeight, { fit: 'fill' }).png().toBuffer(),
                    left: i * sliceWidth,
                    top: 0,
                }))
            );

            const referenceBuffer = await sharp({
                create: { width: totalWidth, height: sliceHeight, channels: 3, background: { r: 0, g: 0, b: 0 } },
            }).composite(compositeInputs).png().toBuffer();

            const buffer = await sharp(referenceBuffer).webp({ quality: 80, effort: 6 }).toBuffer();
            const quality = 80;

            fs.mkdirSync(path.dirname(spriteFile), { recursive: true });
            await fs.promises.writeFile(spriteFile, buffer);
            const sizeKB = (buffer.length / 1024).toFixed(0);
            logger.info(`Sprite: ${slug}/sprite.webp (Q:${quality}, ${sizeKB} KB, ${slicePaths.length} slices)`);
            spriteCount++;
        } catch (err: any) {
            logger.error(`Failed sprite for ${slug}:`, err.message);
        }
    }

    // Clean up stale recap files
    logger.step('Cleaning up stale recap files...');
    const { removed } = removeStaleFiles(RECAP_DIR, validPaths);
    if (removed > 0) logger.info(`Removed ${removed} stale files.`);

    logger.success('Recap generation complete!');
    logger.substep(`Slices processed: ${processedCount}`);
    logger.substep(`Slices skipped: ${skippedCount}`);
    logger.substep(`Sprites generated: ${spriteCount}`);
    if (failedCount > 0) logger.warn(`Failed: ${failedCount}`);
}

// Allow standalone execution
if (process.argv[1] && process.argv[1].includes('generateRecaps')) {
    const { initPool, stopPool } = await import('./ssim2Pool.ts');
    initPool();
    import('fs').then(fs => {
        const p = path.join(process.cwd(), 'data', 'recap_definitions.json');
        if (fs.existsSync(p)) {
            generateRecaps(JSON.parse(fs.readFileSync(p, 'utf8'))).then(() => stopPool()).catch(console.error);
        }
    })
}
