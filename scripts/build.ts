import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from './pipeline/logger.js';
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
    try {
        execSync(command, { stdio: 'inherit', env: process.env });
        logger.success(`Completed: ${name}`);
    } catch (error: any) {
        logger.error(`Build Pipeline Failed at Step: ${name}`, error.message);
        process.exit(1);
    }
}

function runAsync(name: string, command: string): Promise<void> {
    return new Promise((resolve, reject) => {
        logger.step(`Starting Background Task: ${name}`);
        const [cmd, ...args] = command.split(' ');
        const proc = spawn(cmd, args, { stdio: 'inherit', env: process.env, shell: true });
        proc.on('close', (code) => {
            if (code === 0) {
                logger.success(`Completed Background Task: ${name}`);
                resolve();
            } else {
                reject(new Error(`Background Task Failed: ${name} (Code ${code})`));
            }
        });
    });
}

async function runParallel(label: string, steps: {name: string, command: string}[]) {
    logger.header(`Parallel: ${label}`);
    try {
        await Promise.all(steps.map(s => runAsync(s.name, s.command)));
    } catch (error: any) {
        logger.error(`Failed Parallel Step`, error.message);
        process.exit(1);
    }
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
    let state = await generatePhotoIndex();

    initPool(Math.max(1, Math.floor(os.cpus().length / 2)));
    try {
        await Promise.all([
            encodePhotos(state),
            runAsync('Generate Favicon', 'npm run favicon'),
            scrapeWftda(state)
        ]);

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
        await generateZips(state);

        // Update temp file once more to persist zip paths for historical fallback, etc.
        fs.writeFileSync(tempJsonPath, JSON.stringify(state, null, 2));

        const recapDefinitions = await chunkData(state);

        // ---------------------------------------------------------
        // PHASE 5: Sprites
        // ---------------------------------------------------------
        await Promise.all([
            generateRecaps(recapDefinitions),
            generateScrubber(state)
        ]);

        // ---------------------------------------------------------
        // PHASE 6: Process and Copy Photos (Final memory drain)
        // ---------------------------------------------------------
        await processAndCopyPhotos(state);

    } finally {
        stopPool();
    }

    // ---------------------------------------------------------
    // PHASE 7: Vite Build & External Outputs
    // ---------------------------------------------------------
    await Promise.all([
        generateSocialCards(state),
        runAsync('Vite Build', 'npx vite build'),
        generateSitemap(state),
        generateSharePages(state)
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.done(`Build Pipeline Completed Successfully in ${duration}s!`);
}

main();
