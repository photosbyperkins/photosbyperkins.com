import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';

const METRICS_FILE = path.join(process.cwd(), 'data', 'quality_metrics.json');
const INDEX_FILE = path.join(process.cwd(), 'data', 'photos.json');

async function generateWebp() {
    console.log('🔄 Siphoning master images into dual-architecture WebPs...');

    if (!fs.existsSync(INDEX_FILE)) {
        console.error('Error: photos.json not found. Run "npm run index" first.');
        process.exit(1);
    }

    const indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));

    let qualityMap = {};
    if (fs.existsSync(METRICS_FILE)) {
        try {
            qualityMap = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
        } catch (e) {
            console.error('Failed to parse quality_metrics.json', e);
        }
    }

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

                // Map the output entirely into build/webp/ structured identically
                const originalRelative = imgObj.original.startsWith('/') ? imgObj.original.slice(1) : imgObj.original;
                const webpRelative = originalRelative.replace(/^photos[\\/]/i, '').replace(/\.jpe?g$/i, '.webp');
                const destPath = path.join(process.cwd(), 'build', 'webp', webpRelative);

                if (fs.existsSync(destPath)) {
                    skippedCount++;
                    continue;
                }

                if (!fs.existsSync(sourcePath)) {
                    console.error(`  ❌ Source photo missing for WebP generation: ${sourcePath}`);
                    continue;
                }

                tasks.push(async () => {
                    try {
                        const lookupKey = sourceRelative.replace(/\\/g, '/');
                        const dynamicQ = qualityMap[lookupKey] || 82;

                        fs.mkdirSync(path.dirname(destPath), { recursive: true });

                        await sharp(sourcePath).webp({ quality: dynamicQ, effort: 6 }).toFile(destPath);
                        console.log(`  ✅ Generated WebP (Q:${dynamicQ}): ${webpRelative}`);
                    } catch (err) {
                        console.error(`  ❌ Failed WebP ${sourceRelative}:`, err.message);
                    }
                });
            }
        }
    }

    console.log(`\n  ⏭️  Skipped ${skippedCount} existing WebPs.`);
    if (tasks.length === 0) {
        console.log('  ✨ All tracked images have parallel WebPs.');
        return;
    }

    console.log(`  🚀 Synthesizing ${tasks.length} missing WebPs. This will take CPU time...`);

    const threads = Math.max(16, os.cpus().length * 2);

    for (let i = 0; i < tasks.length; i += threads) {
        const batch = tasks.slice(i, i + threads);
        await Promise.all(batch.map((fn) => fn()));
    }

    console.log('\n✅ WebP Dual-Architecture successfully generated!');
}

generateWebp();
