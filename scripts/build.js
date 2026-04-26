import { execSync, spawn } from 'child_process';

const stepsBefore = [
    { name: 'Clean', command: 'npm run clean' },
    { name: 'Format', command: 'npm run format' },
    { name: 'TypeScript Check', command: 'tsc' },
    { name: 'Index Photos', command: 'npm run index' },
];

const parallelSteps = [
    { name: 'Generate WebP', command: 'npm run webp' },
    { name: 'Generate Thumbnails', command: 'npm run thumbnails' },
];

const stepsAfter = [
    { name: 'Generate Favicon', command: 'npm run favicon' },
    { name: 'Process & Copy Photos', command: 'node scripts/processAndCopyPhotos.js' },
    { name: 'Detect Faces', command: 'npm run faces' },
    { name: 'Scrape WFTDA', command: 'npm run wftda' },
    { name: 'Chunk Data', command: 'npm run chunk-data' },
    { name: 'Generate Recaps', command: 'npm run recaps' },
    { name: 'Vite Build', command: 'vite build' },
    { name: 'Generate Sitemap', command: 'node scripts/generateSitemap.js' },
    { name: 'Generate Share Pages', command: 'node scripts/generateSharePages.js' },
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

async function main() {
    console.log('\n🚀 Starting Full Build Pipeline\n' + '='.repeat(40));
    const startTime = Date.now();

    for (const step of stepsBefore) {
        runSync(step);
    }

    console.log('\n⚡ Starting Parallel Image Generation...');
    try {
        await Promise.all(parallelSteps.map(runAsync));
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

    for (const step of stepsAfter) {
        runSync(step);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n✨ ' + '='.repeat(37));
    console.log(`🎉 Build Pipeline Completed Successfully in ${duration}s!\n`);
}

main();
