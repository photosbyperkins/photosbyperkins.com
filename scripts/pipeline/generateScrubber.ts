import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';
import { runWithConcurrency, removeStaleFiles } from './utils.js';
import { IndexState, PhotoObject } from './types';
import { logger } from './logger.js';

const SCRUBBER_DIR = path.join(process.cwd(), 'build', 'scrubber');
const FRAME_WIDTH = 72;
const FRAME_HEIGHT = 48;
const TARGET_RATIO = FRAME_WIDTH / FRAME_HEIGHT;

function computeFocusCrop(imgWidth: number, imgHeight: number, focusX: number, focusY: number) {
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

export async function generateScrubber(indexData: IndexState) {
    logger.header('Generating Scrubber Sprites...');

    const validSprites = new Set<string>();
    const tasks: (() => Promise<void>)[] = [];
    
    let skippedCount = 0;
    let spriteCount = 0;

    for (const year in indexData) {
        for (const event in indexData[year]) {
            const eventData = indexData[year][event];
            const albumPhotos = eventData.album || [];
            
            if (albumPhotos.length === 0) continue;
            
            const firstThumb = albumPhotos[0]?.thumb;
            if (!firstThumb) continue;
            
            const thumbDir = firstThumb.substring(0, firstThumb.lastIndexOf('/'));
            const spriteRelative = thumbDir.replace(/^\/?thumbnails\//, 'scrubber/');
            const spritePath = path.join(process.cwd(), 'build', spriteRelative, 'sprite.webp');
            
            validSprites.add(spritePath);
            
            const expectedWidth = FRAME_WIDTH * albumPhotos.length;
            let missingScrubberSprite = false;
            
            if (!fs.existsSync(spritePath)) {
                missingScrubberSprite = true;
            } else {
                try {
                    // Try to read via sharp to check if valid and width is expected
                    // Reading without await in sync logic doesn't work, so just check later or stat
                    // But we can check sync if we use stats maybe? No, let's just push a task and inside we await sharp
                    missingScrubberSprite = true; // We'll double check inside the task to be safe and concurrent
                } catch { missingScrubberSprite = true; }
            }

            tasks.push(async () => {
                if (fs.existsSync(spritePath)) {
                    try {
                        const meta = await sharp(spritePath).metadata();
                        if (meta.width === expectedWidth) {
                            skippedCount++;
                            return;
                        }
                    } catch {}
                }

                try {
                    const finalBuffers: Buffer[] = [];
                    let failCount = 0;

                    for (const imgObj of albumPhotos) {
                        if (typeof imgObj === 'string') continue;
                        
                        const thumbRelative = imgObj.thumb.startsWith('/') ? imgObj.thumb.slice(1) : imgObj.thumb;
                        const thumbPath = path.join(process.cwd(), 'build', thumbRelative);
                        
                        let buf: Buffer | null = null;
                        
                        if (fs.existsSync(thumbPath)) {
                            const pipeline = sharp(thumbPath);
                            const meta = await pipeline.metadata();
                            
                            const imgW = meta.width || imgObj.width;
                            const imgH = meta.height || imgObj.height;
                            
                            if (imgW && imgH) {
                                const crop = computeFocusCrop(imgW, imgH, imgObj.focusX ?? 0.5, imgObj.focusY ?? 0.5);
                                let scrubberPipe = pipeline.clone();
                                if (crop) scrubberPipe = scrubberPipe.extract(crop);
                                
                                buf = await scrubberPipe
                                    .resize({ width: FRAME_WIDTH, height: FRAME_HEIGHT, fit: 'cover', position: 'center' })
                                    .toFormat('raw')
                                    .toBuffer();
                            }
                        }
                        
                        if (buf) {
                            finalBuffers.push(buf);
                        } else {
                            failCount++;
                            const fallbackBuffer = await sharp({
                                create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 3, background: { r: 30, g: 30, b: 30 } },
                            }).toFormat('raw').toBuffer();
                            finalBuffers.push(fallbackBuffer);
                        }
                    }

                    const totalWidth = FRAME_WIDTH * finalBuffers.length;
                    const compositeInputs = finalBuffers.map((buf, i) => ({
                        input: buf,
                        raw: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 3 as const },
                        left: i * FRAME_WIDTH,
                        top: 0,
                    }));
                    
                    fs.mkdirSync(path.dirname(spritePath), { recursive: true });
                    
                    const referenceBuffer = await sharp({
                        create: { width: totalWidth, height: FRAME_HEIGHT, channels: 3, background: { r: 0, g: 0, b: 0 } },
                    }).composite(compositeInputs).png().toBuffer();

                    const buffer = await sharp(referenceBuffer).webp({ quality: 80, effort: 6 }).toBuffer();
                    await fs.promises.writeFile(spritePath, buffer);
                    spriteCount++;
                    // logger.success(`Sprite: ${path.basename(spritePath)} (80, ${finalBuffers.length} frames)${failCount > 0 ? ` (${failCount} missing frames filled with blank)` : ''}`);
                } catch (err: any) {
                    logger.error(`Failed scrubber sprite for ${event}:`, err.message);
                }
            });
        }
    }

    if (tasks.length > 0) {
        const threads = Math.max(4, os.cpus().length);
        logger.step(`Processing ${tasks.length} scrubber sprites across ${threads} threads...`);
        await runWithConcurrency(tasks, threads);
    }
    
    logger.step('Cleaning up stale scrubber files...');
    removeStaleFiles(SCRUBBER_DIR, validSprites);

    logger.success('Scrubber generation complete!');
    logger.substep(`Sprites generated: ${spriteCount}`);
    logger.substep(`Sprites skipped: ${skippedCount}`);
}

if (process.argv[1] && process.argv[1].includes('generateScrubber')) {
    import('fs').then(fs => {
        const p = path.join(process.cwd(), 'data', 'photos.json');
        if (fs.existsSync(p)) {
            generateScrubber(JSON.parse(fs.readFileSync(p, 'utf8'))).catch(console.error);
        }
    });
}
