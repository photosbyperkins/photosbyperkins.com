/**
 * migrateMetadata.ts
 *
 * Section 5.4 Embedded Copyright & IPTC Metadata Injection Migration Tool.
 * Injects EXIF (Artist, Copyright, ImageDescription), IPTC, XMP Rights, and
 * Creative Commons licensing into processed JPEGs and display AVIFs, then streams
 * them to Bluehost to overwrite remote files in place with zero quota spikes.
 *
 * Usage:
 *   npx tsx scripts/migrateMetadata.ts --dry-run
 *   npx tsx scripts/migrateMetadata.ts --year 2026
 *   npx tsx scripts/migrateMetadata.ts --album "Sacred City"
 *   npx tsx scripts/migrateMetadata.ts --type photos
 *   npx tsx scripts/migrateMetadata.ts --type all
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import os from 'os';
import 'dotenv/config';
import { applyPhotoMetadata } from './pipeline/metadataInjection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const SSH_USER = process.env.DEPLOY_SSH_USER;
const SSH_HOST = process.env.DEPLOY_SSH_HOST;
const REMOTE_DIR = process.env.DEPLOY_REMOTE_DIR;

if (!SSH_USER || !SSH_HOST || !REMOTE_DIR) {
    console.error('❌ Missing deploy configuration in .env (DEPLOY_SSH_USER, DEPLOY_SSH_HOST, DEPLOY_REMOTE_DIR).');
    process.exit(1);
}

// Command-line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const albumFilterIdx = args.indexOf('--album');
const albumFilter = albumFilterIdx !== -1 ? args[albumFilterIdx + 1] : null;
const yearFilterIdx = args.indexOf('--year');
const yearFilter = yearFilterIdx !== -1 ? args[yearFilterIdx + 1] : null;
const typeFilterIdx = args.indexOf('--type');
const targetType = typeFilterIdx !== -1 ? args[typeFilterIdx + 1]?.toLowerCase() : 'all';

const doPhotos = targetType === 'photos' || targetType === 'all';
const doAvif = targetType === 'avif' || targetType === 'all';

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const sign = bytes < 0 ? '-' : '';
    const absBytes = Math.abs(bytes);
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(absBytes) / Math.log(k)));
    return `${sign}${(absBytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

interface RemoteQuota {
    usedMB: number;
    limitMB: number;
    freeMB: number;
}

function parseQuotaOutput(output: string): RemoteQuota | null {
    let matched: RemoteQuota | null = null;
    for (const line of output.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts[0]?.startsWith('/dev/') && parseInt(parts[2], 10) > 0) {
            const usedKb = parseInt(parts[1], 10);
            const limitKb = parseInt(parts[2], 10);
            if (usedKb > 1024) {
                const usedMB = Math.round(usedKb / 1024);
                const limitMB = Math.round(limitKb / 1024);
                matched = { usedMB, limitMB, freeMB: limitMB - usedMB };
            }
        }
    }
    return matched;
}

function checkRemoteQuota(): RemoteQuota | null {
    try {
        const output = execSync(
            `ssh -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST} "quota -u ${SSH_USER} 2>/dev/null"`,
            { encoding: 'utf8' }
        );
        return parseQuotaOutput(output);
    } catch {
        return null;
    }
}

async function runMetadataMigration() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🏷️  Embedded Copyright & IPTC Metadata Migration Tool');
    console.log(`   Host:      ${SSH_USER}@${SSH_HOST}`);
    console.log(`   Directory: ${REMOTE_DIR}`);
    console.log(`   Target:    ${targetType.toUpperCase()} (Photos: ${doPhotos ? 'YES' : 'NO'}, AVIF: ${doAvif ? 'YES' : 'NO'})`);
    console.log(`   Dry Run:   ${isDryRun ? 'YES (Simulation only)' : 'NO (Live Execution)'}`);
    if (albumFilter) console.log(`   Album:     "${albumFilter}"`);
    if (yearFilter) console.log(`   Year:      "${yearFilter}"`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const initialQuota = checkRemoteQuota();
    if (initialQuota) {
        console.log(`📊 Remote Disk Quota: ${initialQuota.usedMB} MB used / ${initialQuota.limitMB} MB limit (${initialQuota.freeMB} MB free, ~${(initialQuota.freeMB / 1024).toFixed(2)} GB)\n`);
        if (initialQuota.freeMB < 500) {
            console.error('❌ Safety Abort: Less than 500 MB available on remote server.');
            process.exit(1);
        }
    } else {
        console.log('⚠️ Could not query remote disk quota. Proceeding with caution.\n');
    }

    const photosJsonPath = path.join(projectRoot, 'data', 'photos.json');
    if (!fs.existsSync(photosJsonPath)) {
        console.error('❌ data/photos.json not found.');
        process.exit(1);
    }
    const photosData = JSON.parse(fs.readFileSync(photosJsonPath, 'utf8'));

    const albumTasks: {
        year: string;
        event: string;
        eventData: any;
        relDir: string;
    }[] = [];

    for (const year in photosData) {
        if (yearFilter && year !== yearFilter) continue;
        for (const eventName in photosData[year]) {
            if (albumFilter && !eventName.toLowerCase().includes(albumFilter.toLowerCase())) continue;
            const evData = photosData[year][eventName];
            const albumPhotos = evData.album || [];
            if (albumPhotos.length === 0) continue;

            const firstThumb = albumPhotos[0]?.thumb || '';
            const parts = firstThumb.replace(/^\/?thumbnails\//, '').split('/');
            const relDir = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : `${year}/${eventName}`;

            albumTasks.push({
                year,
                event: eventName,
                eventData: evData,
                relDir,
            });
        }
    }

    console.log(`📦 Discovered ${albumTasks.length} albums to process.\n`);

    const buildProcessedDir = path.join(projectRoot, 'build', 'processed');
    const buildAvifDir = path.join(projectRoot, 'build', 'avif');

    let totalPhotosProcessed = 0;
    let totalBytesStreamed = 0;
    const cpuCount = Math.max(2, Math.floor(os.cpus().length / 2));

    for (let i = 0; i < albumTasks.length; i++) {
        const task = albumTasks[i];
        const progressPrefix = `[${i + 1}/${albumTasks.length}] ${task.relDir}`;
        const albumPhotos = task.eventData.album || [];
        const posixRel = task.relDir.replace(/\\/g, '/');

        const evProcessedDir = path.join(buildProcessedDir, task.relDir);
        const evAvifDir = path.join(buildAvifDir, task.relDir);

        if (doPhotos) fs.mkdirSync(evProcessedDir, { recursive: true });
        if (doAvif) fs.mkdirSync(evAvifDir, { recursive: true });

        console.log(`${progressPrefix}: Processing ${albumPhotos.length} photos (${targetType})...`);

        if (!isDryRun) {
            // Process photos with concurrency pool
            const queue = [...albumPhotos];
            const workers: Promise<void>[] = [];

            for (let w = 0; w < cpuCount; w++) {
                workers.push(
                    (async () => {
                        while (queue.length > 0) {
                            const photo = queue.shift();
                            if (!photo) break;

                            const origRel = (photo.original || '').replace(/^(\/)?photos[\\/]/i, '');
                            const sourceRel = (photo.source || '').replace(/^\//, '');
                            const sourcePath = path.join(projectRoot, sourceRel);

                            const cleanName = path.basename(origRel);
                            const cleanBaseName = cleanName.replace(/\.[^.]+$/, '');

                            const destJpegPath = path.join(evProcessedDir, cleanName);
                            const destAvifPath = path.join(evAvifDir, `${cleanBaseName}.avif`);

                            // Select highest quality source available
                            let inputPath = sourcePath;
                            if (!fs.existsSync(inputPath) && fs.existsSync(destJpegPath)) {
                                inputPath = destJpegPath;
                            }

                            if (!fs.existsSync(inputPath)) {
                                continue;
                            }

                            try {
                                const metaOptions = {
                                    year: task.year,
                                    title: task.eventData.title || task.event,
                                };

                                if (doPhotos) {
                                    const pipeline = sharp(inputPath);
                                    const withMeta = applyPhotoMetadata(pipeline, metaOptions);
                                    await withMeta
                                        .jpeg({
                                            quality: 90,
                                            mozjpeg: true,
                                            chromaSubsampling: '4:2:0',
                                            trellisQuantisation: true,
                                            overshootDeringing: true,
                                            optimizeScans: true,
                                        })
                                        .toFile(destJpegPath);
                                }

                                if (doAvif) {
                                    const pipeline = sharp(inputPath);
                                    const withMeta = applyPhotoMetadata(
                                        pipeline.resize({ width: 3840, height: 3840, fit: 'inside', withoutEnlargement: true }),
                                        metaOptions
                                    );
                                    await withMeta
                                        .avif({ quality: 58, effort: 4 })
                                        .toFile(destAvifPath);
                                }
                            } catch (err: any) {
                                console.error(`  ⚠️ Error processing ${cleanName}:`, err.message || err);
                            }
                        }
                    })()
                );
            }

            await Promise.all(workers);
        }

        // Measure local sizes for reporting and streaming
        let albumBytes = 0;
        if (doPhotos && fs.existsSync(evProcessedDir)) {
            for (const f of fs.readdirSync(evProcessedDir)) {
                if (f.endsWith('.jpg') || f.endsWith('.jpeg')) {
                    albumBytes += fs.statSync(path.join(evProcessedDir, f)).size;
                }
            }
        }
        if (doAvif && fs.existsSync(evAvifDir)) {
            for (const f of fs.readdirSync(evAvifDir)) {
                if (f.endsWith('.avif')) {
                    albumBytes += fs.statSync(path.join(evAvifDir, f)).size;
                }
            }
        }

        console.log(`  ✨ ${albumPhotos.length} photos ready (${formatBytes(albumBytes)})`);

        if (isDryRun) {
            totalPhotosProcessed += albumPhotos.length;
            totalBytesStreamed += albumBytes;
            continue;
        }

        // Live Execution: Stream updated files to Bluehost in a single atomic SSH pipe
        const tarSources: string[] = [];
        if (doPhotos && fs.existsSync(evProcessedDir)) tarSources.push(`"processed/${posixRel}"`);
        if (doAvif && fs.existsSync(evAvifDir)) tarSources.push(`"avif/${posixRel}"`);

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                if (tarSources.length > 0) {
                    const remoteCmd = `tar -C '${REMOTE_DIR}' --transform 's|^processed/|photos/|' -xf -`;
                    const cmd = `tar -C "build" -cf - ${tarSources.join(' ')} | ssh -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST} "${remoteCmd}"`;
                    execSync(cmd, { stdio: 'inherit', shell: 'cmd.exe' });
                }
                break;
            } catch (err: any) {
                if (attempt < 3) {
                    console.log(`  ⚠️ Connection interrupted on attempt ${attempt}. Waiting 60s cooldown...`);
                    await new Promise((r) => setTimeout(r, 60000));
                } else {
                    throw err;
                }
            }
        }

        totalPhotosProcessed += albumPhotos.length;
        totalBytesStreamed += albumBytes;

        // Pacing delay between albums
        await new Promise((r) => setTimeout(r, 6000));
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Metadata Migration Complete!');
    console.log(`   Albums Migrated:        ${albumTasks.length}`);
    console.log(`   Photos Processed:       ${totalPhotosProcessed}`);
    console.log(`   Total Data Streamed:    ${formatBytes(totalBytesStreamed)}`);

    const finalQuota = checkRemoteQuota();
    if (finalQuota) {
        console.log(`   Final Storage Status:   ${finalQuota.usedMB} MB used / ${finalQuota.limitMB} MB limit (${(finalQuota.freeMB / 1024).toFixed(2)} GB free)`);
    }
    console.log('═══════════════════════════════════════════════════════════════');
}

runMetadataMigration().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
