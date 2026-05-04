import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();

const pathsToClean = [
    'build', // Build cache (thumbnails, webp, processed, etc)
    'dist',  // Vite output
    '.eslintcache',
    'node_modules/.vite',
    'node_modules/.cache',
    'data/.faces_cache.json',
    'data/quality_metrics.json'
];

console.log('🧹 Clearing build caches...');

for (const p of pathsToClean) {
    const fullPath = path.join(ROOT, p);
    if (fs.existsSync(fullPath)) {
        console.log(`   Removing: ${p}`);
        fs.rmSync(fullPath, { recursive: true, force: true });
    }
}

console.log('\n⏱️ Starting timed build...\n');
const startTime = Date.now();

try {
    // Run the full build pipeline
    execSync('npm run build', { stdio: 'inherit', env: process.env });
} catch {
    console.error('\n❌ Build failed during benchmark.');
    process.exit(1);
}

const durationMs = Date.now() - startTime;
const durationSec = (durationMs / 1000).toFixed(2);

console.log(`\n✅ Build completed in ${durationSec}s`);

const resultsFile = path.join(ROOT, '.benchmark_results.json');
let results = [];
if (fs.existsSync(resultsFile)) {
    try {
        results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    } catch {
        console.warn('⚠️ Could not parse existing results file, starting fresh.');
    }
}

results.push({
    timestamp: new Date().toISOString(),
    durationMs: durationMs,
    durationSec: parseFloat(durationSec)
});

fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
console.log(`💾 Benchmark result saved to .benchmark_results.json`);
