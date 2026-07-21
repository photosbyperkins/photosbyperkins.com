import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from './pipeline/logger.js';

// --- Per-step timing telemetry ---
const stepTimes: Record<string, { start: number; end?: number; durationMs?: number }> = {};

function startStep(name: string) {
    stepTimes[name] = { start: Date.now() };
}

function endStep(name: string) {
    if (stepTimes[name]) {
        stepTimes[name].end = Date.now();
        stepTimes[name].durationMs = stepTimes[name].end! - stepTimes[name].start;
    }
}

function saveBuildStats(totalMs: number) {
    const statsPath = path.join(process.cwd(), 'data', 'build_stats.json');
    let history: any[] = [];
    if (fs.existsSync(statsPath)) {
        try { history = JSON.parse(fs.readFileSync(statsPath, 'utf8')); } catch { /* ignore */ }
    }
    const entry = {
        timestamp: new Date().toISOString(),
        totalMs,
        steps: Object.entries(stepTimes).map(([name, t]) => ({
            name,
            durationMs: t.durationMs ?? null,
        })),
    };
    history.push(entry);
    // Keep last 20 builds
    if (history.length > 20) history = history.slice(-20);
    fs.mkdirSync(path.dirname(statsPath), { recursive: true });
    fs.writeFileSync(statsPath, JSON.stringify(history, null, 2));

    // Print a quick summary table
    const rows = entry.steps
        .filter(s => s.durationMs != null)
        .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0));
    logger.header('Build Step Timing Summary');
    for (const row of rows) {
        const secs = ((row.durationMs ?? 0) / 1000).toFixed(1);
        logger.info(`  ${secs.padStart(6)}s  ${row.name}`);
    }
    logger.info(`  Saved to data/build_stats.json`);
}
import { generatePhotoIndex } from './pipeline/generatePhotoIndex.js';
import { encodePhotos } from './pipeline/encodePhotos.js';
import { generateZips } from './pipeline/generateZips.js';
import { chunkData } from './pipeline/chunkData.js';
import { generateRecaps } from './pipeline/generateRecaps.js';
import { generateScrubber } from './pipeline/generateScrubber.js';
import { processAndCopyPhotos } from './pipeline/processAndCopyPhotos.js';
import { generateSocialCards } from './pipeline/generateSocialCards.js';
import { scrapeWftda } from './pipeline/scrapeWftda.js';
import { generateSitemap } from './pipeline/generateSitemap.js';
import { generateSharePages } from './pipeline/generateSharePages.js';
import { initPool, stopPool } from './pipeline/ssim2Pool.js';

function runSync(name: string, command: string) {
    logger.step(`Executing: ${name}`);
    console.log(`   Command: \`${command}\``);
    startStep(name);
    try {
        execSync(command, { stdio: 'inherit', env: process.env });
        endStep(name);
        logger.success(`Completed: ${name}`);
    } catch (error: unknown) {
        endStep(name);
        logger.error(`Build Pipeline Failed at Step: ${name}`, error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

function runAsync(name: string, command: string): Promise<void> {
    return new Promise((resolve, reject) => {
        logger.step(`Starting Background Task: ${name}`);
        startStep(name);
        const [cmd, ...args] = command.split(' ');
        const proc = spawn(cmd, args, { stdio: 'inherit', env: process.env, shell: true });
        proc.on('close', (code) => {
            endStep(name);
            if (code === 0) {
                logger.success(`Completed Background Task: ${name}`);
                resolve();
            } else {
                reject(new Error(`Background Task Failed: ${name} (Code ${code})`));
            }
        });
    });
}



async function main() {
    logger.header('Starting Full Build Pipeline');
    const startTime = Date.now();

    // ---------------------------------------------------------
    // PHASE 1: Setup
    // ---------------------------------------------------------
    runSync('Clean', 'npm run clean');
    runSync('Format', 'npm run format');
    runSync('TypeScript Check', 'npx tsc');

    // ---------------------------------------------------------
    // PHASE 2: In-Memory Pipeline (Indexing & Master Encoding)
    // ---------------------------------------------------------
    startStep('Generate Photo Index');
    let state = await generatePhotoIndex();
    endStep('Generate Photo Index');

    initPool(Math.max(1, Math.floor(os.cpus().length / 2)));
    try {
        startStep('Encode Photos + Favicon + WFTDA (parallel)');
        await Promise.all([
            encodePhotos(state),
            runAsync('Generate Favicon', 'npm run favicon'),
            scrapeWftda(state)
        ]);
        endStep('Encode Photos + Favicon + WFTDA (parallel)');

        // ---------------------------------------------------------
        // PHASE 3: Python Interop
        // ---------------------------------------------------------
        // Python needs to read/write photos.json and access thumbnails.
        logger.step('Serializing state for Python Face Detection...');
        const tempJsonPath = path.join(process.cwd(), 'data', 'photos.json');
        fs.writeFileSync(tempJsonPath, JSON.stringify(state, null, 2));

        runSync('Detect Faces', 'npm run faces');

        logger.step('Deserializing state from Python Face Detection...');
        state = JSON.parse(fs.readFileSync(tempJsonPath, 'utf8'));

        // ---------------------------------------------------------
        // PHASE 4: Data Modifiers & Chunking
        // ---------------------------------------------------------
        startStep('Generate Zips');
        await generateZips(state);
        endStep('Generate Zips');

        // Update temp file once more to persist zip paths for historical fallback, etc.
        fs.writeFileSync(tempJsonPath, JSON.stringify(state, null, 2));

        startStep('Chunk Data');
        const recapDefinitions = await chunkData(state);
        endStep('Chunk Data');

        // ---------------------------------------------------------
        // PHASE 5: Sprites
        // ---------------------------------------------------------
        startStep('Generate Recaps + Scrubber (parallel)');
        await Promise.all([
            generateRecaps(recapDefinitions),
            generateScrubber(state)
        ]);
        endStep('Generate Recaps + Scrubber (parallel)');

        // ---------------------------------------------------------
        // PHASE 6: Process and Copy Photos (Final memory drain)
        // ---------------------------------------------------------
        startStep('Process and Copy Photos');
        await processAndCopyPhotos(state);
        endStep('Process and Copy Photos');

    } finally {
        stopPool();
    }

    // ---------------------------------------------------------
    // PHASE 7: Vite Build & External Outputs
    // ---------------------------------------------------------
    startStep('Social Cards + Vite Build + Sitemap + Share Pages (parallel)');
    await Promise.all([
        generateSocialCards(state),
        runAsync('Vite Build', 'npx vite build'),
        generateSitemap(state),
        generateSharePages(state)
    ]);
    endStep('Social Cards + Vite Build + Sitemap + Share Pages (parallel)');

    const totalMs = Date.now() - startTime;
    const duration = (totalMs / 1000).toFixed(1);
    saveBuildStats(totalMs);
    logger.done(`Build Pipeline Completed Successfully in ${duration}s!`);
}

main();
