import { execSync, spawn } from 'child_process';

// Phase 1: Sequential setup (each depends on the previous)
const stepsInit = [
    { name: 'Clean', command: 'npm run clean' },
    { name: 'Format', command: 'npm run format' },
    { name: 'TypeScript Check', command: 'tsc' },
    { name: 'Index Photos', command: 'npm run index' },
];

// Phase 2: Parallel image generation (handled by runImageGeneration)
//   In-process (shared SSIM pool): Thumbnails + Scrubber
//   Separate processes:            WebP, Favicon, WFTDA, Faces

// Phase 3: Sequential data pipeline
const stepsData = [
    { name: 'Chunk Data', command: 'npm run chunk-data' },
];

// Phase 4: Recap sprites (handled by runRecapGeneration)

// Phase 5: These depend on ALL build artifacts but not on each other
const parallelBuildSteps = [
    { name: 'Process & Copy Photos', command: 'node scripts/pipeline/processAndCopyPhotos.js' },
    { name: 'Vite Build', command: 'vite build' },
];

// Phase 6: Post-build (both write to dist/)
const stepsFinal = [
    { name: 'Generate Sitemap', command: 'node scripts/pipeline/generateSitemap.js' },
    { name: 'Generate Share Pages', command: 'node scripts/pipeline/generateSharePages.js' },
];

function runSync(step) {
    console.log(`\n▶️ Executing: ${step.name}`);
    console.log(`   Command: \`${step.command}\``);
    try {
        execSync(step.command, { stdio: 'inherit', env: process.env });
        console.log(`✅ Completed: ${step.name}`);
    } catch (error) {
        console.error(`\n❌ Build Pipeline Failed at Step: ${step.name}`);
        console.error(error.message);
        process.exit(1);
    }
}

function runAsync(step) {
    return new Promise((resolve, reject) => {
        console.log(`\n▶️ Starting Background Task: ${step.name}`);
        const [cmd, ...args] = step.command.split(' ');
        const proc = spawn(cmd, args, { stdio: 'inherit', env: process.env, shell: true });
        proc.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Completed Background Task: ${step.name}`);
                resolve();
            } else {
                reject(new Error(`❌ Background Task Failed: ${step.name} (Code ${code})`));
            }
        });
    });
}

async function runParallel(label, steps) {
    console.log(`\n⚡ ${label}`);
    try {
        await Promise.all(steps.map(runAsync));
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

/**
 * Run Thumbnails + Scrubber in a SINGLE process sharing one SSIM worker pool,
 * alongside WebP, Favicon, WFTDA, and Faces as separate parallel processes.
 */
async function runImageGeneration() {
    console.log('\n⚡ Parallel Phase 1: Image Generation (shared SSIM pool)...');

    const { initPool, stopPool } = await import('./pipeline/ssim2Pool.js');
    const { generateThumbnails } = await import('./pipeline/generateThumbnails.js');
    const { generateScrubberThumbs } = await import('./pipeline/generateScrubberThumbs.js');

    initPool();

    const externalSteps = [
        { name: 'Generate WebP', command: 'npm run webp' },
        { name: 'Generate Favicon', command: 'npm run favicon' },
        { name: 'Scrape WFTDA', command: 'npm run wftda' },
        { name: 'Detect Faces', command: 'npm run faces' },
    ];

    try {
        await Promise.all([
            generateThumbnails(),
            generateScrubberThumbs(),
            ...externalSteps.map(runAsync),
        ]);
    } finally {
        stopPool();
    }
}

/**
 * Run Recap generation in the main process using the shared SSIM pool.
 */
async function runRecapGeneration() {
    console.log('\n⚡ Recap Generation (shared SSIM pool)...');

    const { initPool, stopPool } = await import('./pipeline/ssim2Pool.js');
    const { generateRecaps } = await import('./pipeline/generateRecaps.js');

    initPool();
    try {
        await generateRecaps();
    } finally {
        stopPool();
    }
}

async function main() {
    console.log('\n🚀 Starting Full Build Pipeline\n' + '='.repeat(40));
    const startTime = Date.now();

    for (const step of stepsInit) {
        runSync(step);
    }

    await runImageGeneration();

    for (const step of stepsData) {
        runSync(step);
    }

    await runRecapGeneration();

    await runParallel('Parallel Phase 2: Vite Build + Process & Copy Photos...', parallelBuildSteps);

    for (const step of stepsFinal) {
        runSync(step);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n✨ ' + '='.repeat(37));
    console.log(`🎉 Build Pipeline Completed Successfully in ${duration}s!\n`);
}

main();
