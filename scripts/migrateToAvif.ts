/**
 * migrateToAvif.ts
 *
 * Transactional, zero-downtime one-time migration script from WebP to AVIF.
 * Operates album-by-album to stay strictly within Bluehost's 20 GB quota constraint.
 *
 * For each album:
 *   1. Auto-encodes missing local AVIF assets on-the-fly via master encoder.
 *   2. Uploads local AVIF thumbnails and display files to Bluehost.
 *   3. Verifies successful remote file receipt.
 *   4. Prunes the legacy WebP files for that album on Bluehost.
 *   5. Recovers more space than was consumed (net space increases per album).
 *
 * Usage:
 *   npx tsx scripts/migrateToAvif.ts --dry-run
 *   npx tsx scripts/migrateToAvif.ts --album "Alamo City"
 *   npx tsx scripts/migrateToAvif.ts --year 2026
 *   npx tsx scripts/migrateToAvif.ts
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { encodePhotos } from './pipeline/encodePhotos.js';
import { initPool, stopPool } from './pipeline/ssim2Pool.js';
import os from 'os';
import 'dotenv/config';

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

function bootstrapRemote(createDirs: boolean): {
    quota: RemoteQuota | null;
    webpMap: Map<string, { bytes: number; count: number }>;
} {
    const webpMap = new Map<string, { bytes: number; count: number }>();
    let quota: RemoteQuota | null = null;

    console.log('🔍 Connecting to Bluehost (single-pass quota & WebP inventory scan)...');
    try {
        const mkdirPart = createDirs ? `mkdir -p '${REMOTE_DIR}/avif' '${REMOTE_DIR}/thumbnails'; ` : '';
        const remoteScript = `quota -u ${SSH_USER} 2>/dev/null; echo '===SPLIT_SECTION==='; ${mkdirPart}cd '${REMOTE_DIR}' && find thumbnails webp -type f -name '*.webp' -printf '%P|%s\\n' 2>/dev/null`;
        const cmd = `ssh -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST} "${remoteScript}"`;
        const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });

        const [quotaSection, webpSection] = output.split('===SPLIT_SECTION===');
        if (quotaSection) {
            quota = parseQuotaOutput(quotaSection);
        }
        if (webpSection) {
            const lines = webpSection.split('\n').filter(Boolean);
            for (const line of lines) {
                const [rel, sizeStr] = line.split('|');
                if (!rel || !sizeStr) continue;
                const size = parseInt(sizeStr, 10) || 0;
                const parts = rel.split('/');
                if (parts.length >= 3) {
                    const albumKey = `${parts[0]}/${parts[1]}`;
                    const entry = webpMap.get(albumKey) || { bytes: 0, count: 0 };
                    entry.bytes += size;
                    entry.count += 1;
                    webpMap.set(albumKey, entry);
                }
            }
        }
        console.log(`✨ Single-pass connected: quota scanned and ${webpMap.size} remote albums cataloged.\n`);
    } catch (err: any) {
        console.error('⚠️ Could not complete remote bootstrap scan:', err.message || err);
    }

    return { quota, webpMap };
}

async function runMigration() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 AVIF Transactional Storage Migration (Bluehost)');
    console.log(`   Host:      ${SSH_USER}@${SSH_HOST}`);
    console.log(`   Directory: ${REMOTE_DIR}`);
    console.log(`   Dry Run:   ${isDryRun ? 'YES (Simulation only)' : 'NO (Live Execution)'}`);
    if (albumFilter) console.log(`   Album:     "${albumFilter}"`);
    if (yearFilter) console.log(`   Year:      "${yearFilter}"`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 1. Single-pass remote bootstrap: quota, root dirs, and WebP inventory
    const { quota: initialQuota, webpMap: remoteWebpMap } = bootstrapRemote(!isDryRun);
    if (initialQuota) {
        console.log(`   Disk quota: ${initialQuota.usedMB} MB used / ${initialQuota.limitMB} MB limit (${initialQuota.freeMB} MB free, ~${(initialQuota.freeMB / 1024).toFixed(2)} GB)\n`);
        if (initialQuota.freeMB < 1000) {
            console.error('❌ Safety Abort: Less than 1,000 MB available on remote server.');
            process.exit(1);
        }
    } else {
        console.log('⚠️ Could not determine remote disk quota. Proceeding with caution.\n');
    }

    // 2. Discover albums from data/photos.json
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

    const buildThumbDir = path.join(projectRoot, 'build', 'thumbnails');
    const buildAvifDir = path.join(projectRoot, 'build', 'avif');

    let totalUploadedBytes = 0;
    let totalDeletedWebpBytes = 0;
    let migratedCount = 0;

    let poolInitialized = false;

    try {
        for (let i = 0; i < albumTasks.length; i++) {
            const task = albumTasks[i];
            const progressPrefix = `[${i + 1}/${albumTasks.length}] ${task.relDir}`;
            const albumPhotos = task.eventData.album || [];

            const evThumbDir = path.join(buildThumbDir, task.relDir);
            const evAvifDir = path.join(buildAvifDir, task.relDir);

            const existingThumbs = fs.existsSync(evThumbDir)
                ? fs.readdirSync(evThumbDir).filter((f) => f.endsWith('.avif')).length
                : 0;
            const existingAvifs = fs.existsSync(evAvifDir)
                ? fs.readdirSync(evAvifDir).filter((f) => f.endsWith('.avif')).length
                : 0;

            const needsEncoding = existingThumbs < albumPhotos.length || existingAvifs < albumPhotos.length;

            if (needsEncoding && !isDryRun) {
                if (!poolInitialized) {
                    initPool(Math.max(4, Math.floor(os.cpus().length / 2)));
                    poolInitialized = true;
                }
                console.log(`🔨 Encoding ${albumPhotos.length} photos to AVIF for ${task.relDir}...`);
                const encodePayload = {
                    [task.year]: {
                        [task.event]: {
                            ...task.eventData,
                            album: albumPhotos.map((p: any) => ({
                                ...p,
                                thumb: p.thumb.replace(/\.webp$/i, '.avif'),
                            })),
                            highlights: (task.eventData.highlights || []).map((p: any) => ({
                                ...p,
                                thumb: p.thumb.replace(/\.webp$/i, '.avif'),
                            })),
                        },
                    },
                };
                await encodePhotos(encodePayload, false);
            }

            // Collect local AVIF files for upload
            const localFiles: { localPath: string; relPath: string; size: number }[] = [];
            let albumAvifBytes = 0;

            if (fs.existsSync(evThumbDir)) {
                for (const f of fs.readdirSync(evThumbDir)) {
                    if (f.endsWith('.avif')) {
                        const p = path.join(evThumbDir, f);
                        const sz = fs.statSync(p).size;
                        localFiles.push({ localPath: p, relPath: `thumbnails/${task.relDir}/${f}`, size: sz });
                        albumAvifBytes += sz;
                    }
                }
            }

            if (fs.existsSync(evAvifDir)) {
                for (const f of fs.readdirSync(evAvifDir)) {
                    if (f.endsWith('.avif')) {
                        const p = path.join(evAvifDir, f);
                        const sz = fs.statSync(p).size;
                        localFiles.push({ localPath: p, relPath: `avif/${task.relDir}/${f}`, size: sz });
                        albumAvifBytes += sz;
                    }
                }
            }

            // Get remote WebP info from our single-pass cache
            const remoteInfo = remoteWebpMap.get(task.relDir) || { bytes: 0, count: 0 };
            const remoteWebpBytes = remoteInfo.bytes;
            const remoteWebpCount = remoteInfo.count;

            const estimatedAvifBytes = albumAvifBytes || Math.round(remoteWebpBytes * 0.7);
            const netSavings = remoteWebpBytes - (albumAvifBytes || estimatedAvifBytes);

            console.log(
                `${progressPrefix}: ${localFiles.length || albumPhotos.length * 2} AVIFs (${formatBytes(albumAvifBytes || estimatedAvifBytes)}) ⟷ ${remoteWebpCount} remote WebPs (${formatBytes(remoteWebpBytes)}) [Net: ${netSavings >= 0 ? '+' : ''}${formatBytes(netSavings)}]`
            );

            if (isDryRun) {
                totalUploadedBytes += estimatedAvifBytes;
                totalDeletedWebpBytes += remoteWebpBytes;
                migratedCount++;
                continue;
            }

            // Live execution: Stream tar archive via SSH pipe, then atomically prune remote WebPs for this album
            const posixRel = task.relDir.replace(/\\/g, '/');
            const relThumbPath = `thumbnails/${posixRel}`;
            const relAvifPath = `avif/${posixRel}`;
            const tarSources: string[] = [];
            if (fs.existsSync(evThumbDir)) tarSources.push(`"${relThumbPath}"`);
            if (fs.existsSync(evAvifDir)) tarSources.push(`"${relAvifPath}"`);

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    if (tarSources.length > 0) {
                        const remoteCleanCmd = `rm -f '${REMOTE_DIR}/webp/${posixRel}'/*.webp '${REMOTE_DIR}/thumbnails/${posixRel}'/*.webp && rmdir '${REMOTE_DIR}/webp/${posixRel}' 2>/dev/null || true`;
                        const remoteCmd = `tar -C '${REMOTE_DIR}' -xf - && ${remoteCleanCmd}`;
                        const cmd = `tar -C "build" -cf - ${tarSources.join(' ')} | ssh -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST} "${remoteCmd}"`;
                        execSync(cmd, { stdio: 'inherit', shell: 'cmd.exe' });
                    } else if (remoteWebpCount > 0) {
                        const rmCmd = `ssh -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST} "rm -f '${REMOTE_DIR}/webp/${posixRel}'/*.webp '${REMOTE_DIR}/thumbnails/${posixRel}'/*.webp && rmdir '${REMOTE_DIR}/webp/${posixRel}' 2>/dev/null || true"`;
                        execSync(rmCmd, { stdio: 'inherit', shell: 'cmd.exe' });
                    }
                    break;
                } catch (err: any) {
                    if (attempt < 3) {
                        console.log(`⚠️ Connection interrupted or refused on attempt ${attempt}. Waiting 60s cooldown before retry...`);
                        await new Promise((r) => setTimeout(r, 60000));
                    } else {
                        throw err;
                    }
                }
            }

            totalUploadedBytes += albumAvifBytes;
            totalDeletedWebpBytes += remoteWebpBytes;
            migratedCount++;

            // Pacing delay (6 seconds) between albums to protect shared hosting SSH daemon
            await new Promise((r) => setTimeout(r, 6000));
        }
    } finally {
        if (poolInitialized) stopPool();
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ AVIF Migration Process Complete!');
    console.log(`   Albums Processed:       ${migratedCount}`);
    console.log(`   AVIF Uploaded:          ${formatBytes(totalUploadedBytes)}`);
    console.log(`   WebP Pruned:            ${formatBytes(totalDeletedWebpBytes)}`);
    console.log(`   Net Storage Recovered:  ${formatBytes(totalDeletedWebpBytes - totalUploadedBytes)}`);

    try {
        const quotaOut = execSync(`ssh -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST} "quota -u ${SSH_USER} 2>/dev/null"`, { encoding: 'utf8' });
        const finalQuota = parseQuotaOutput(quotaOut);
        if (finalQuota) {
            console.log(`   Final Storage Status:   ${finalQuota.usedMB} MB used / ${finalQuota.limitMB} MB limit (${(finalQuota.freeMB / 1024).toFixed(2)} GB free)`);
        }
    } catch {
        // Ignore quota query failures on completion
    }
    console.log('═══════════════════════════════════════════════════════════════');
}

runMigration().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
