import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { removeStaleFiles } from './utils.js';
import { IndexState } from './types.js';
import { logger } from './logger.js';
const DIST_DIR = path.join(process.cwd(), 'dist');

export async function processAndCopyPhotos(data: IndexState) {

    const validDestPaths = new Set<string>();
    const copyTasks: { source: string; dest: string }[] = [];
    let processingErrors = 0;
    let filesSkipped = 0;
    let filesCopied = 0;
    let copyErrors = 0;

    logger.header('Processing and migrating photos to dist...');

    for (const year in data) {
        for (const event in data[year]) {
            const eventData = data[year][event];
            const allPhotos = [...(eventData.album || []), ...(eventData.highlights || [])];

            for (const imgObj of allPhotos) {
                if (typeof imgObj === 'string' || !imgObj.source) continue;

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


                // Stage the pipeline output (or existing cache) for copying
                copyTasks.push({ source: processedPath, dest: destOrigPath });

                // Map Thumbnails, Tinys, and Zips straight to Dist
                const webPathThumb = typeof imgObj === 'string' ? null : imgObj.thumb;
                const webPathTiny = typeof imgObj === 'string' ? null : imgObj.tiny;
                const extraPathsToCopy: string[] = [];
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



    // Note: Zips are generated earlier in the pipeline

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
        function queueRecapFiles(dir: string) {
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
        function queueScrubberFiles(dir: string) {
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
    logger.step(`Copying ${copyTasks.length} mapped photos and assets to dist...`);
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
                logger.warn(`Source photo not found: ${source}`);
                copyErrors++;
            }
        } catch (err: any) {
            logger.error(`Failed to copy ${source}:`, err.message);
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
                    // logger.info(`Copied extra file: ${relativePath}`);
                } else {
                    filesSkipped++;
                }
            }
        } catch (err: any) {
            logger.error(`Failed to copy extra file ${sourcePath}:`, err.message);
            copyErrors++;
        }
    }

    // Clean up dist obsolete photos.json
    const distPhotosJson = path.join(DIST_DIR, 'data', 'photos.json');
    if (fs.existsSync(distPhotosJson)) {
        fs.unlinkSync(distPhotosJson);
        logger.info(`Removed monolithic photos.json from dist.`);
    }

    // Clean up obsolete payload content
    logger.step('Cleaning up obsolete files in dist payload folders...');
    removeStaleFiles(path.join(DIST_DIR, 'photos'), validDestPaths);
    removeStaleFiles(path.join(DIST_DIR, 'thumbnails'), validDestPaths);
    removeStaleFiles(path.join(DIST_DIR, 'scrubber'), validDestPaths);
    removeStaleFiles(path.join(DIST_DIR, 'recap'), validDestPaths);
    removeStaleFiles(path.join(DIST_DIR, 'zips'), validDestPaths);
    removeStaleFiles(path.join(DIST_DIR, 'webp'), validDestPaths);

    logger.success(`Successfully copied ${filesCopied} files to ${DIST_DIR} (skipped ${filesSkipped} unchanged)`);
    if (processingErrors > 0 || copyErrors > 0) {
        logger.warn(`Completed with ${processingErrors} encoding errors and ${copyErrors} copy errors.`);
    }
}

if (process.argv[1] && process.argv[1].includes('processAndCopyPhotos')) {
    import('fs').then(fs => {
        const p = path.join(process.cwd(), 'data', 'photos.json');
        if (fs.existsSync(p)) {
            processAndCopyPhotos(JSON.parse(fs.readFileSync(p, 'utf8'))).catch(console.error);
        }
    })
}
