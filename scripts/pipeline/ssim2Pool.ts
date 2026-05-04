// @ts-nocheck
import { fork } from 'child_process';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const SSIM_TMP_DIR = path.join(process.cwd(), 'build', 'ssim_tmp');
if (!fs.existsSync(SSIM_TMP_DIR)) {
    fs.mkdirSync(SSIM_TMP_DIR, { recursive: true });
}

// Unified quality settings across all pipelines
const QUALITY_MAX = 95;
const QUALITY_MIN = 45;
const QUALITY_STEP_SIZE = 1;
export const QUALITY_STEPS = Array.from(
    { length: Math.floor((QUALITY_MAX - QUALITY_MIN) / QUALITY_STEP_SIZE) + 1 },
    (_, i) => QUALITY_MAX - i * QUALITY_STEP_SIZE
);
export const S2_THRESHOLD = 75.0;

// --- Singleton Worker Pool ---
let workers = [];
let idle = [];
let queue = [];
let poolActive = false;

export function initPool(workerCount) {
    if (poolActive) return;
    poolActive = true;
    const count = workerCount ?? Math.max(16, os.cpus().length * 2);
    for (let i = 0; i < count; i++) {
        const w = fork('./scripts/pipeline/ssim2Worker.js');
        w.on('message', (msg) => {
            const { resolve, reject } = w.currentTask;
            w.currentTask = null;
            if (msg.error) reject(new Error(msg.error));
            else resolve(msg.score);
            if (queue.length > 0) {
                const next = queue.shift();
                w.currentTask = next;
                w.send({ img1: next.img1, img2: next.img2 });
            } else {
                idle.push(w);
            }
        });
        w.on('error', (err) => { if (w.currentTask) w.currentTask.reject(err); });
        idle.push(w);
        workers.push(w);
    }
}

export function getScore(img1, img2) {
    return new Promise((resolve, reject) => {
        if (idle.length > 0) {
            const w = idle.pop();
            w.currentTask = { resolve, reject, img1, img2 };
            w.send({ img1, img2 });
        } else {
            queue.push({ resolve, reject, img1, img2 });
        }
    });
}

export function stopPool() {
    for (const w of workers) w.kill();
    workers = [];
    idle = [];
    queue = [];
    poolActive = false;
}

/**
 * Find the lowest WebP quality for a given reference PNG buffer that meets
 * the SSIMULACRA 2 threshold. Returns { quality, buffer }.
 *
 * @param {Buffer} referencePngBuffer - Lossless PNG buffer to compare against
 * @param {string} label - Identifier for temp files (e.g. "recap_2025")
 */
export async function findOptimalQuality(referencePngBuffer: Buffer, label: string) {
    const refPath = path.join(SSIM_TMP_DIR, `s2_ref_${crypto.randomUUID()}.png`);
    await fs.promises.writeFile(refPath, referencePngBuffer);

    let bestQ = QUALITY_STEPS[0];
    let bestBuffer = null;

    // Start from a reasonable midpoint and search outward
    const startIdx = QUALITY_STEPS.indexOf(75);
    const initialQ = startIdx >= 0 ? QUALITY_STEPS[startIdx] : QUALITY_STEPS[Math.floor(QUALITY_STEPS.length / 2)];

    async function evaluate(q) {
        const compBuf = await sharp(referencePngBuffer).webp({ quality: q, effort: 6 }).toBuffer();
        const compPng = path.join(SSIM_TMP_DIR, `s2_comp_${crypto.randomUUID()}.png`);
        await sharp(compBuf).png().toFile(compPng);
        let score = 0;
        let retries = 3;
        while (retries > 0) {
            try {
                score = await getScore(refPath, compPng);
                break;
            } catch (err: any) {
                if (err.message.includes('missing') || err.message.includes('ENOENT')) {
                    retries--;
                    if (retries === 0) throw err;
                    await new Promise(r => setTimeout(r, 500));
                } else {
                    throw err;
                }
            }
        }
        try { fs.unlinkSync(compPng); } catch {}
        return { score, buffer: compBuf };
    }

    const initial = await evaluate(initialQ);
    const startIndex = QUALITY_STEPS.indexOf(initialQ);

    if (initial.score >= S2_THRESHOLD) {
        // Passed — go lower in quality
        bestQ = initialQ;
        bestBuffer = initial.buffer;
        let idx = startIndex + 1;
        while (idx < QUALITY_STEPS.length) {
            const res = await evaluate(QUALITY_STEPS[idx]);
            if (res.score >= S2_THRESHOLD) {
                bestQ = QUALITY_STEPS[idx];
                bestBuffer = res.buffer;
                idx++;
            } else {
                break;
            }
        }
    } else {
        // Failed — go higher in quality
        let idx = startIndex - 1;
        while (idx >= 0) {
            const res = await evaluate(QUALITY_STEPS[idx]);
            if (res.score >= S2_THRESHOLD) {
                bestQ = QUALITY_STEPS[idx];
                bestBuffer = res.buffer;
                break;
            }
            idx--;
        }
        if (!bestBuffer) {
            bestQ = QUALITY_STEPS[0];
            const fb = await evaluate(bestQ);
            bestBuffer = fb.buffer;
        }
    }

    try { fs.unlinkSync(refPath); } catch {}
    return { quality: bestQ, buffer: bestBuffer };
}
