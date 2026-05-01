import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';
import { execSync } from 'child_process';
import { runWithConcurrency, removeStaleFiles } from './utils.js';

const INDEX_FILE = path.join(process.cwd(), 'data', 'photos.json');
const METRICS_FILE = path.join(process.cwd(), 'data', 'quality_metrics.json');
const DIST_DIR = path.join(process.cwd(), 'dist');

async function processPhotos() {
    if (!fs.existsSync(INDEX_FILE)) {
        console.error('Error: photos.json not found. Run "npm run index" first.');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    let qualityMap = {};
    if (fs.existsSync(METRICS_FILE)) {
        qualityMap = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
    }

    const validDestPaths = new Set();
    const tasks = [];
    const copyTasks = [];
    let processingErrors = 0;
    let filesSkipped = 0;
    let filesCopied = 0;
    let copyErrors = 0;

    console.log('📸 Processing and migrating photos to dist...\n');

    for (const year in data) {
        for (const event in data[year]) {
            const eventData = data[year][event];
            const allPhotos = [...(eventData.album || []), ...(eventData.highlights || [])];

            for (const imgObj of allPhotos) {
                if (typeof imgObj === 'string' || !imgObj.source) continue;

                const sourceRelative = imgObj.source.startsWith('/') ? imgObj.source.slice(1) : imgObj.source;
                const sourceOrigPath = path.join(process.cwd(), sourceRelative);

                const originalRelative = imgObj.original.startsWith('/') ? imgObj.original.slice(1) : imgObj.original;

                // Route Original Photos through `.processed` pipeline using the clean alias
                const processedPath = path.join(
                    process.cwd(),
                    'build',
                    'processed',
                    originalRelative.replace(/^photos[\\/]/, '')
                );
                const destOrigPath = path.join(DIST_DIR, originalRelative);

                validDestPaths.add(destOrigPath);

                if (!fs.existsSync(processedPath) && fs.existsSync(sourceOrigPath)) {
                    tasks.push(async () => {
                        fs.mkdirSync(path.dirname(processedPath), { recursive: true });
                        try {
                            const lookupKey = sourceRelative.replace(/\\/g, '/');
                            const q = qualityMap[lookupKey] || 95; // fallback to 95 if proxy wasn't tracked

                            await sharp(sourceOrigPath)
                                .jpeg({
                                    quality: q,
                                    mozjpeg: true,
                                    chromaSubsampling: '4:4:4',
                                    trellisQuantisation: true,
                                    overshootDeringing: true,
                                    optimizeScans: true,
                                })
                                .toFile(processedPath);

                            console.log(`  ✅ Processed (Q:${q}): ${originalRelative}`);
                        } catch (err) {
                            console.error(`  ❌ Failed processing ${sourceRelative}:`, err.message);
                            processingErrors++;
                        }
                    });
                }

                // Stage the pipeline output (or existing cache) for copying
                copyTasks.push({ source: processedPath, dest: destOrigPath });

                // Map Thumbnails, Tinys, and Zips straight to Dist
                const webPathThumb = typeof imgObj === 'string' ? null : imgObj.thumb;
                const webPathTiny = typeof imgObj === 'string' ? null : imgObj.tiny;
                const extraPathsToCopy = [];
                if (webPathThumb) {
                    extraPathsToCopy.push(webPathThumb);
                }
                if (webPathTiny) extraPathsToCopy.push(webPathTiny);

                for (const webPath of extraPathsToCopy) {
                    const relativePath = webPath.startsWith('/') ? webPath.slice(1) : webPath;
                    let sourcePath;
                    if (relativePath.startsWith('thumbnails/')) {
                        sourcePath = path.join(process.cwd(), 'build', relativePath);
                    } else {
                        sourcePath = path.join(process.cwd(), relativePath);
                    }
                    const destPath = path.join(DIST_DIR, relativePath);
                    validDestPaths.add(destPath);
                    copyTasks.push({ source: sourcePath, dest: destPath });
                }

                // Map WebP outputs
                const webpRelativePath = originalRelative.replace(/^photos[\\/]/i, '').replace(/\.jpe?g$/i, '.webp');
                const sourceWebpPath = path.join(process.cwd(), 'build', 'webp', webpRelativePath);
                const destWebpPath = path.join(DIST_DIR, 'webp', webpRelativePath);

                validDestPaths.add(destWebpPath);
                copyTasks.push({ source: sourceWebpPath, dest: destWebpPath });
            }
        }
    }

    // Pass 1: Execute Source Encoding
    if (tasks.length > 0) {
        const threads = Math.max(1, os.cpus().length);
        console.log(`🚀 Encoding ${tasks.length} full-res photos across ${threads} threads...`);

        await runWithConcurrency(tasks, threads);
    } else {
        console.log(`✅ No new original photos to process.`);
    }

    // Pass 1.5: Refresh Zips
    console.log(`\n📦 Triggering Zip archival referencing the new SSIMULACRA payloads...`);
    execSync('npm run zips', { stdio: 'inherit' });

    // Pass 1.75: Queue dynamically generated zips
    const zipsDir = path.join(process.cwd(), 'build', 'zips');
    if (fs.existsSync(zipsDir)) {
        const zipFiles = fs.readdirSync(zipsDir).filter((f) => f.endsWith('.zip'));
        for (const zipFile of zipFiles) {
            const relZipPath = `zips/${zipFile}`;
            const sPath = path.join(process.cwd(), 'build', relZipPath);
            const dPath = path.join(DIST_DIR, relZipPath);
            validDestPaths.add(dPath);
            copyTasks.push({ source: sPath, dest: dPath });
        }
    }

    // Pass 1.8: Queue dynamically generated recaps
    const recapsDir = path.join(process.cwd(), 'build', 'recap');
    if (fs.existsSync(recapsDir)) {
        function queueRecapFiles(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    queueRecapFiles(fullPath);
                } else if (entry.name.endsWith('.webp')) {
                    const relativePath = path.relative(path.join(process.cwd(), 'build'), fullPath);
                    const destPath = path.join(DIST_DIR, relativePath);
                    validDestPaths.add(destPath);
                    copyTasks.push({ source: fullPath, dest: destPath });
                }
            }
        }
        queueRecapFiles(recapsDir);
    }

    // Pass 1.9: Queue scrubber sprite sheets
    const scrubberDir = path.join(process.cwd(), 'build', 'scrubber');
    if (fs.existsSync(scrubberDir)) {
        function queueScrubberFiles(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    queueScrubberFiles(fullPath);
                } else if (entry.name.endsWith('.webp')) {
                    const relativePath = path.relative(path.join(process.cwd(), 'build'), fullPath);
                    const destPath = path.join(DIST_DIR, relativePath);
                    validDestPaths.add(destPath);
                    copyTasks.push({ source: fullPath, dest: destPath });
                }
            }
        }
        queueScrubberFiles(scrubberDir);
    }

    // Pass 2: Transfer Build Payload
    console.log(`\n🚀 Copying ${copyTasks.length} mapped photos and assets to dist...`);
    for (const { source, dest } of copyTasks) {
        try {
            if (fs.existsSync(source)) {
                fs.mkdirSync(path.dirname(dest), { recursive: true });
                const shouldCopy = !fs.existsSync(dest) || fs.statSync(source).size !== fs.statSync(dest).size;
                if (shouldCopy) {
                    fs.copyFileSync(source, dest);
                    filesCopied++;
                } else {
                    filesSkipped++;
                }
            } else {
                console.warn(`  ⚠️  Source photo not found: ${source}`);
                copyErrors++;
            }
        } catch (err) {
            console.error(`  ❌  Failed to copy ${source}:`, err.message);
            copyErrors++;
        }
    }

    // Pass 3: Transfer Public/Extra Static Assets
    const extraFiles = [
        'public/favicon.svg',
        'public/favicon.png',
        'public/apple-touch-icon.png',
        'photos/profile_photo.jpg',
        'photos/sacramento_roller_derby.png',
    ];

    for (const relativePath of extraFiles) {
        const sourcePath = path.join(process.cwd(), relativePath);
        const distPath = relativePath.startsWith('public/')
            ? path.join(DIST_DIR, path.basename(relativePath))
            : path.join(DIST_DIR, relativePath);

        validDestPaths.add(distPath);

        try {
            if (fs.existsSync(sourcePath)) {
                fs.mkdirSync(path.dirname(distPath), { recursive: true });
                const shouldCopy =
                    !fs.existsSync(distPath) || fs.statSync(sourcePath).size !== fs.statSync(distPath).size;
                if (shouldCopy) {
                    fs.copyFileSync(sourcePath, distPath);
                    filesCopied++;
                    console.log(`  ✓  Copied extra file: ${relativePath}`);
                } else {
                    filesSkipped++;
                }
            }
        } catch (err) {
            console.error(`  ❌  Failed to copy extra file ${sourcePath}:`, err.message);
            copyErrors++;
        }
    }

    // Clean up dist obsolete photos.json
    const distPhotosJson = path.join(DIST_DIR, 'data', 'photos.json');
    if (fs.existsSync(distPhotosJson)) {
        fs.unlinkSync(distPhotosJson);
        console.log(`🗑️ Removed monolithic photos.json from dist.`);
    }

    // Clean up obsolete payload content
    console.log('\n🧹 Cleaning up obsolete files in dist payload folders...');
    removeStaleFiles(path.join(DIST_DIR, 'photos'), validDestPaths);
    removeStaleFiles(path.join(DIST_DIR, 'thumbnails'), validDestPaths);
    removeStaleFiles(path.join(DIST_DIR, 'scrubber'), validDestPaths);
    removeStaleFiles(path.join(DIST_DIR, 'recap'), validDestPaths);
    removeStaleFiles(path.join(DIST_DIR, 'zips'), validDestPaths);
    removeStaleFiles(path.join(DIST_DIR, 'webp'), validDestPaths);

    console.log(`\n✨ Successfully copied ${filesCopied} files to ${DIST_DIR} (skipped ${filesSkipped} unchanged)`);
    if (processingErrors > 0 || copyErrors > 0) {
        console.log(`⚠️  Completed with ${processingErrors} encoding errors and ${copyErrors} copy errors.`);
    }
}

processPhotos();
