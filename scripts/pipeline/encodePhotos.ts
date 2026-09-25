// Encode Photos Pipeline
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';
import { findOptimalQuality } from './ssim2Pool.js';
import { runWithConcurrency, removeStaleFiles } from './utils.js';
import type { IndexState } from './types.js';
import { logger } from './logger';

const THUMBNAILS_DIR = path.join(process.cwd(), 'build', 'thumbnails');
const AVIF_DIR = path.join(process.cwd(), 'build', 'avif');
const PROCESSED_DIR = path.join(process.cwd(), 'build', 'processed');

const METRICS_FILE = path.join(process.cwd(), 'data', 'quality_metrics.json');
const MAX_DIMENSION = 1080;

export async function encodePhotos(indexData: IndexState, cleanStale = true) {
    logger.header('Master Encoder: Generating AVIF Thumbnails, AVIFs, and Processed JPEGs...');

    let qualityMap: Record<string, number> = {};
    if (fs.existsSync(METRICS_FILE)) {
        try { qualityMap = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8')); } catch { /* ignore */ }
    }

    const validThumbs = new Set<string>();
    const validAvifs = new Set<string>();
    const validProcessed = new Set<string>();

    const tasks: any[] = [];
    let skippedCount = 0;
    const queuedSources = new Set();

    for (const year in indexData) {
        for (const event in indexData[year]) {
            const eventData = indexData[year][event];
            const allPhotos = [...(eventData.album || []), ...(eventData.highlights || [])];

            for (const imgObj of allPhotos) {
                if (typeof imgObj === 'string' || !imgObj.source) continue;

                const sourceRelative = imgObj.source.startsWith('/') ? imgObj.source.slice(1) : imgObj.source;
                
                if (queuedSources.has(sourceRelative)) {
                    continue;
                }
                queuedSources.add(sourceRelative);
                
                const sourcePath = path.join(process.cwd(), sourceRelative);
                
                const thumbRelative = imgObj.thumb.startsWith('/') ? imgObj.thumb.slice(1) : imgObj.thumb;
                const thumbPath = path.join(process.cwd(), 'build', thumbRelative);

                const originalRelative = imgObj.original.startsWith('/') ? imgObj.original.slice(1) : imgObj.original;
                const avifRelative = originalRelative.replace(/^photos[\\/]/i, '').replace(/\.jpe?g$/i, '.avif');
                const avifPath = path.join(process.cwd(), 'build', 'avif', avifRelative);

                const processedRelative = originalRelative.replace(/^photos[\\/]/i, '');
                const processedPath = path.join(process.cwd(), 'build', 'processed', processedRelative);

                validThumbs.add(thumbPath);
                validAvifs.add(avifPath);
                validProcessed.add(processedPath);

                const missingThumb = !fs.existsSync(thumbPath);
                const missingAvif = !fs.existsSync(avifPath);
                const missingProcessed = !fs.existsSync(processedPath);

                if (!missingThumb && !missingAvif && !missingProcessed) {
                    skippedCount++;
                    continue;
                }

                if (!fs.existsSync(sourcePath)) {
                    logger.error(`Source missing: ${sourcePath}`);
                    continue;
                }

                tasks.push(async () => {
                    const lookupKey = sourceRelative.replace(/\\/g, '/');
                    const thumbQ = qualityMap[lookupKey];

                    const tDir = path.dirname(thumbPath);
                    const aDir = path.dirname(avifPath);
                    const pDir = path.dirname(processedPath);

                    try {
                        const pipeline = sharp(sourcePath);
                        const ops = [];

                        // Map WebP quality score to optimal AVIF quality (AVIF Q60 >= WebP Q80 in SSIM2)
                        let avifQ = thumbQ ? Math.max(55, Math.min(75, Math.round(thumbQ - 20))) : undefined;

                        if (missingThumb) {
                            if (!avifQ) {
                                // Must calculate SSIMULACRA 2 for AVIF
                                const refPng = await pipeline.clone().resize({
                                    width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true
                                }).png().toBuffer();
                                
                                const { quality, buffer } = await findOptimalQuality(
                                    refPng,
                                    `thumb_${lookupKey.replace(/[^a-z0-9]/gi, '_')}`,
                                    'avif'
                                );
                                fs.mkdirSync(tDir, { recursive: true });
                                await fs.promises.writeFile(thumbPath, buffer);
                                qualityMap[lookupKey] = quality + 20;
                                avifQ = quality;
                            } else {
                                fs.mkdirSync(tDir, { recursive: true });
                                ops.push(
                                    pipeline.clone().resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
                                        .avif({ quality: avifQ, effort: 4 })
                                        .toFile(thumbPath)
                                );
                            }
                        }

                        if (missingAvif) {
                            // Display AVIF (3840px): AVIF Q58-Q62 achieves SSIM2 >= 78 with dramatic size reductions (-35%) vs WebP Q82
                            const targetAvifQ = Math.max(52, Math.min(62, avifQ ? avifQ - 4 : 58));
                            fs.mkdirSync(aDir, { recursive: true });
                            ops.push(
                                pipeline.clone().resize({ width: 3840, height: 3840, fit: 'inside', withoutEnlargement: true })
                                    .avif({ quality: targetAvifQ, effort: 4 })
                                    .toFile(avifPath)
                            );
                        }

                        if (missingProcessed) {
                            const pQ = thumbQ || 95; // Fallback
                            fs.mkdirSync(pDir, { recursive: true });
                            ops.push(
                                pipeline.clone()
                                    .jpeg({ quality: pQ, mozjpeg: true, chromaSubsampling: '4:4:4', trellisQuantisation: true, overshootDeringing: true, optimizeScans: true })
                                    .toFile(processedPath)
                            );
                        }

                        await Promise.all(ops);
                    } catch (err: unknown) {
                        logger.error(`Failed to encode ${sourceRelative}:`, err instanceof Error ? err.message : String(err));
                    }
                });
            }
        }
    }

    logger.info(`Skipped ${skippedCount} fully encoded photos.`);

    if (tasks.length > 0) {
        const threads = Math.max(16, os.cpus().length);
        logger.step(`Executing ${tasks.length} master encodings across ${threads} threads...`);
        
        let completed = 0;
        const tasksWithProgress = tasks.map(t => async () => {
            await t();
            completed++;
            if (completed % 5 === 0 || completed === tasks.length) {
                logger.info(`   Progress: ${completed} / ${tasks.length} photos encoded...`);
            }
        });

        await runWithConcurrency(tasksWithProgress, threads);
    } else {
        logger.success(`No new photos to encode.`);
    }

    fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
    fs.writeFileSync(METRICS_FILE, JSON.stringify(qualityMap, null, 2));

    if (cleanStale) {
        logger.step('Cleaning up stale cached files...');
        removeStaleFiles(THUMBNAILS_DIR, validThumbs);
        removeStaleFiles(AVIF_DIR, validAvifs);
        removeStaleFiles(PROCESSED_DIR, validProcessed);
    }

    logger.success('Master Encoding complete!');
}

if (process.argv[1] && process.argv[1].includes('encodePhotos')) {
    const { initPool, stopPool } = await import('./ssim2Pool.ts');
    initPool();
    // For standalone, we would need to load the json, but for now we expect orchestration
    import('fs').then(fs => {
        const p = path.join(process.cwd(), 'data', 'photos.json');
        if (fs.existsSync(p)) {
            encodePhotos(JSON.parse(fs.readFileSync(p, 'utf8'))).then(() => stopPool()).catch(console.error);
        }
    })
}
