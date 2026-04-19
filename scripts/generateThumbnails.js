import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';
import { fork } from 'child_process';

const PHOTOS_DIR = path.join(process.cwd(), 'photos');
const THUMBNAILS_DIR = path.join(process.cwd(), 'build', 'thumbnails');
const METRICS_FILE = path.join(process.cwd(), 'data', 'quality_metrics.json');
const MAX_DIMENSION = 1080;
const QUALITY_MAX = 95;
const QUALITY_MIN = 45;
const QUALITY_STEP_SIZE = 1;
const QUALITY_STEPS = Array.from(
    { length: Math.floor((QUALITY_MAX - QUALITY_MIN) / QUALITY_STEP_SIZE) + 1 },
    (_, i) => QUALITY_MAX - i * QUALITY_STEP_SIZE
);

// Roughly corresponds to Q75 / Perceptually transparent
const S2_THRESHOLD = 75.0;
let globalRecentQuality = QUALITY_STEPS[Math.floor(QUALITY_STEPS.length / 2)];

// ----- WORKER POOL SETUP -----
const WORKER_COUNT = Math.max(16, os.cpus().length * 2);
const workers = [];
const idleWorkers = [];
const taskQueue = [];

function initWorkers() {
    for (let i = 0; i < WORKER_COUNT; i++) {
        const worker = fork('./scripts/ssim2Worker.js');
        worker.on('message', (msg) => {
            const { resolve, reject } = worker.currentTask;
            worker.currentTask = null;
            if (msg.error) reject(new Error(msg.error));
            else resolve(msg.score);

            if (taskQueue.length > 0) {
                const nextTask = taskQueue.shift();
                worker.currentTask = nextTask;
                worker.send({ img1: nextTask.img1, img2: nextTask.img2 });
            } else {
                idleWorkers.push(worker);
            }
        });
        worker.on('error', (err) => {
            if (worker.currentTask) worker.currentTask.reject(err);
        });
        idleWorkers.push(worker);
        workers.push(worker);
    }
}

function stopWorkers() {
    for (const w of workers) {
        w.kill();
    }
}

function getScoreFromPool(img1, img2) {
    return new Promise((resolve, reject) => {
        if (idleWorkers.length > 0) {
            const worker = idleWorkers.pop();
            worker.currentTask = { resolve, reject, img1, img2 };
            worker.send({ img1, img2 });
        } else {
            taskQueue.push({ resolve, reject, img1, img2 });
        }
    });
}
// -----------------------------

async function generateThumbnails() {
    console.log('🖼️  Generating thumbnails with SSIMULACRA 2...\n');
    initWorkers();

    let qualityMap = {};
    if (fs.existsSync(METRICS_FILE)) {
        qualityMap = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
    }

    if (!fs.existsSync(THUMBNAILS_DIR)) {
        fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    }

    const INDEX_FILE = path.join(process.cwd(), 'data', 'photos.json');
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
                        // we can just directly generate the new 1080px thumbnail without evaluating.
                        if (qualityMap[lookupKey]) {
                            const q = qualityMap[lookupKey];
                            await sharp(sourcePath)
                                .resize({
                                    width: MAX_DIMENSION,
                                    height: MAX_DIMENSION,
                                    fit: 'inside',
                                    withoutEnlargement: true,
                                })
                                .webp({
                                    quality: q,
                                    effort: 6,
                                })
                                .toFile(destPath);
                            console.log(`  ⚡ Fast-generated (Q:${q}): ${thumbRelative}`);
                        } else {
                            const finalQuality = await optimizeWithS2(sourcePath, destPath);
                            qualityMap[lookupKey] = finalQuality;
                            console.log(`  ✅ Generated (Q:${finalQuality}): ${thumbRelative}`);
                        }
                    } catch (err) {
                        console.error(`  ❌ Failed ${thumbRelative}:`, err.message);
                    }
                });
            }
        }
    }

    console.log('\n🧹 Cleaning up stale thumbnails from cache...');
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
                        console.log(`  🗑️  Removed stale thumbnail: ${e.name}`);
                    } catch (err) {}
                }
            }
        }
    }
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

    stopWorkers();

    fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
    fs.writeFileSync(METRICS_FILE, JSON.stringify(qualityMap, null, 2));

    console.log('\n✨ Experimental SSIMULACRA 2 complete!');
}

async function optimizeWithS2(inputPath, outputPath) {
    const threadId = Math.random().toString(36).substring(7);
    const tempBase = path.join(os.tmpdir(), `s2_base_${threadId}.png`);

    // 1. Resize base image to MAX_DIMENSION losslessly
    const baseImage = sharp(inputPath).resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
    });
    await baseImage.png().toFile(tempBase);

    async function evaluate(q) {
        const tComp = path.join(os.tmpdir(), `s2_comp_${threadId}_${q}.png`);
        const buf = await baseImage
            .webp({
                quality: q,
                effort: 6,
            })
            .toBuffer();
        await sharp(buf).png().toFile(tComp);
        const score = await getScoreFromPool(tempBase, tComp);
        fs.unlinkSync(tComp);
        return { score, buffer: buf };
    }

    let startIndex = QUALITY_STEPS.indexOf(globalRecentQuality);
    if (startIndex === -1) startIndex = 0;

    let bestQuality = QUALITY_STEPS[0];
    let bestBuffer = null;

    let initial = await evaluate(QUALITY_STEPS[startIndex]);

    if (initial.score >= S2_THRESHOLD) {
        // It passed! Go lower in quality (higher index array)
        bestQuality = QUALITY_STEPS[startIndex];
        bestBuffer = initial.buffer;
        let currIdx = startIndex + 1;
        while (currIdx < QUALITY_STEPS.length) {
            const nextQ = QUALITY_STEPS[currIdx];
            const nextRes = await evaluate(nextQ);
            if (nextRes.score >= S2_THRESHOLD) {
                bestQuality = nextQ;
                bestBuffer = nextRes.buffer;
                currIdx++;
            } else {
                break; // previous one was the lowest passing
            }
        }
    } else {
        // It failed! Go higher in quality (lower index array)
        let currIdx = startIndex - 1;
        while (currIdx >= 0) {
            const nextQ = QUALITY_STEPS[currIdx];
            const nextRes = await evaluate(nextQ);
            if (nextRes.score >= S2_THRESHOLD) {
                bestQuality = nextQ;
                bestBuffer = nextRes.buffer;
                break; // found the first passing quality
            }
            currIdx--;
        }
        if (!bestBuffer) {
            bestQuality = QUALITY_STEPS[0];
            const fb = await evaluate(bestQuality);
            bestBuffer = fb.buffer;
        }
    }

    globalRecentQuality = bestQuality;

    try {
        fs.unlinkSync(tempBase);
    } catch {}

    await fs.promises.writeFile(outputPath, bestBuffer);
    return bestQuality;
}

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

function getJpgs(dir) {
    try {
        return fs
            .readdirSync(dir)
            .filter((f) => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg'))
            .map((f) => path.join(dir, f));
    } catch {
        return [];
    }
}

function getJpgsRecursive(dir, maxDepth = 2) {
    if (maxDepth <= 0) return getJpgs(dir);
    let result = getJpgs(dir);
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (e.isDirectory() && !isSkipped(e.name)) {
                result = result.concat(getJpgsRecursive(path.join(dir, e.name), maxDepth - 1));
            }
        }
    } catch {}
    return result;
}

const SKIP_DIRS = [
    'original',
    'denoise',
    'sharpen',
    'sharpened',
    'denoise + sharpened',
    'rescued',
    'process improvements',
    'reddit',
    'facebook',
    'fb',
    'personal fb and instagram',
    'photo fb',
];

function isSkipped(dirName) {
    const n = dirName.toLowerCase();
    return SKIP_DIRS.some((s) => n === s || n.startsWith(s + ' '));
}

generateThumbnails();
