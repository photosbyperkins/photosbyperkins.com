import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import 'dotenv/config';
import { generatePhotoIndex, matchesTargetEventFilter, slugify } from './pipeline/generatePhotoIndex.js';
import { encodePhotos } from './pipeline/encodePhotos.js';
import { stopPool } from './pipeline/ssim2Pool.js';
import { generateZips } from './pipeline/generateZips.js';
import { chunkData } from './pipeline/chunkData.js';
import { generateScrubber } from './pipeline/generateScrubber.js';
import { generateSocialCards } from './pipeline/generateSocialCards.js';
import { generateSitemap } from './pipeline/generateSitemap.js';
import { generateSharePages } from './pipeline/generateSharePages.js';
import { logger } from './pipeline/logger.js';
import type { EventData, IndexState } from './pipeline/types.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'photos.json');
const DIST_DIR = path.join(process.cwd(), 'dist');

export interface PublishOptions {
    eventFilter: string;
    deploy?: boolean;
    skipMl?: boolean;
    skipClientBuild?: boolean;
}

export interface PublishResult {
    year: string;
    eventLabel: string;
    eventSlug: string;
    photoCount: number;
    albumUrl: string;
    shareUrl: string;
    announcementText: string;
    elapsedSeconds: number;
}

function parseCliArgs(argv: string[]): PublishOptions {
    let eventFilter = '';
    let deploy = false;
    let skipMl = false;
    let skipClientBuild = false;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if ((arg === '--event' || arg === '-e') && argv[i + 1]) {
            eventFilter = argv[++i];
        } else if (arg.startsWith('--event=')) {
            eventFilter = arg.slice('--event='.length);
        } else if (arg === '--deploy') {
            deploy = true;
        } else if (arg === '--skip-ml') {
            skipMl = true;
        } else if (arg === '--skip-client-build') {
            skipClientBuild = true;
        } else if (!arg.startsWith('-') && !eventFilter) {
            eventFilter = arg;
        }
    }

    return { eventFilter, deploy, skipMl, skipClientBuild };
}

function copyIfChanged(src: string, dest: string): boolean {
    if (!fs.existsSync(src)) return false;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const shouldCopy = !fs.existsSync(dest) || fs.statSync(src).size !== fs.statSync(dest).size;
    if (shouldCopy) {
        fs.copyFileSync(src, dest);
        return true;
    }
    return false;
}

function copyEventAssetsToDist(year: string, eventLabel: string, eventSlug: string, eventData: EventData): number {
    let copied = 0;
    const allPhotos = [...(eventData.album || []), ...(eventData.highlights || [])];

    for (const imgObj of allPhotos) {
        if (typeof imgObj === 'string' || !imgObj.source) continue;
        const originalRelative = imgObj.original.startsWith('/') ? imgObj.original.slice(1) : imgObj.original;
        const processedPath = path.join(
            process.cwd(),
            'build',
            'processed',
            originalRelative.replace(/^photos[\\/]/, '')
        );
        if (copyIfChanged(processedPath, path.join(DIST_DIR, originalRelative))) copied++;

        if (imgObj.thumb) {
            const relThumb = imgObj.thumb.startsWith('/') ? imgObj.thumb.slice(1) : imgObj.thumb;
            const srcThumb = relThumb.startsWith('thumbnails/')
                ? path.join(process.cwd(), 'build', relThumb)
                : path.join(process.cwd(), relThumb);
            if (copyIfChanged(srcThumb, path.join(DIST_DIR, relThumb))) copied++;
        }

        const avifRel = originalRelative.replace(/^photos[\\/]/i, '').replace(/\.jpe?g$/i, '.avif');
        if (copyIfChanged(path.join(process.cwd(), 'build', 'avif', avifRel), path.join(DIST_DIR, 'avif', avifRel))) {
            copied++;
        }
    }

    // Copy event zip
    if (eventData.zip) {
        const relZip = eventData.zip.startsWith('/') ? eventData.zip.slice(1) : eventData.zip;
        if (copyIfChanged(path.join(process.cwd(), 'build', relZip), path.join(DIST_DIR, relZip))) copied++;
    }

    // Copy event scrubber sprite(s)
    const scrubberYearDir = path.join(process.cwd(), 'build', 'scrubber', year);
    if (fs.existsSync(scrubberYearDir)) {
        for (const f of fs.readdirSync(scrubberYearDir)) {
            if (f.startsWith(eventSlug) && f.endsWith('.webp')) {
                if (
                    copyIfChanged(
                        path.join(scrubberYearDir, f),
                        path.join(DIST_DIR, 'scrubber', year, f)
                    )
                ) {
                    copied++;
                }
            }
        }
    }

    // Copy updated public/data JSON files + tag sidecar to dist/data
    const dataFilesToSync = [
        path.join('data', 'index.json'),
        path.join('data', 'years', `${year}.json`),
        path.join('data', 'albums', year, `${eventSlug}.json`),
        path.join('data', 'tags', year, `${eventSlug}.json`),
    ];
    for (const relData of dataFilesToSync) {
        const srcData = path.join(process.cwd(), 'public', relData);
        const destData = path.join(DIST_DIR, relData);
        if (fs.existsSync(srcData)) {
            fs.mkdirSync(path.dirname(destData), { recursive: true });
            fs.copyFileSync(srcData, destData);
            copied++;
        }
    }

    // Keep track of eventName for logging
    void eventLabel;
    return copied;
}

export function buildAnnouncementSnippet(
    year: string,
    eventLabel: string,
    eventSlug: string,
    eventData: EventData
): { albumUrl: string; shareUrl: string; announcementText: string } {
    const rawDomain = (process.env.VITE_SITE_DOMAIN || 'photosbyperkins.com')
        .replace(/^https?:\/\//i, '')
        .replace(/\/+$/, '');
    const baseUrl = `https://${rawDomain}`;
    const albumUrl = `${baseUrl}/portfolio/${encodeURIComponent(year)}/${encodeURIComponent(eventSlug)}`;
    const shareUrl = `${baseUrl}/share/${encodeURIComponent(year)}/${encodeURIComponent(eventLabel)}`;
    const photoCount = eventData.album?.length || eventData.photoCount || 0;

    let scoreLine = '';
    const ls = eventData.localScore as { team1Score?: number | string | null; team2Score?: number | string | null } | undefined;
    if (ls && ls.team1Score !== null && ls.team1Score !== undefined && ls.team2Score !== null && ls.team2Score !== undefined) {
        const t1 = eventData.teams?.[0]?.name || 'Team 1';
        const t2 = eventData.teams?.[1]?.name || 'Team 2';
        scoreLine = `Final Score: ${t1} ${ls.team1Score} — ${t2} ${ls.team2Score}\n`;
    }

    const announcementText = [
        `🛼 **New Bout Gallery Live: ${eventLabel} (${year})**`,
        scoreLine ? scoreLine.trim() : null,
        `📸 ${photoCount} high-res action photos ready to view, filter by role/number, and download:`,
        `🔗 Gallery: ${albumUrl}`,
        `🖼️ OpenGraph Share Link: ${shareUrl}`,
    ]
        .filter(Boolean)
        .join('\n');

    return { albumUrl, shareUrl, announcementText };
}

function deltaDeployEvent(year: string, eventLabel: string, eventSlug: string, eventData: EventData) {
    const sshUser = process.env.DEPLOY_SSH_USER;
    const sshHost = process.env.DEPLOY_SSH_HOST;
    const remoteRoot = process.env.DEPLOY_REMOTE_PATH;

    if (!sshUser || !sshHost || !remoteRoot) {
        logger.warn('Skipping --deploy: DEPLOY_SSH_USER, DEPLOY_SSH_HOST, or DEPLOY_REMOTE_PATH not set in .env');
        return;
    }

    const remoteTarget = `${sshUser}@${sshHost}:${remoteRoot.replace(/\/+$/, '')}`;
    logger.header(`Delta deploying ${year}/${eventSlug} to ${remoteTarget}...`);

    const pathsToSync = [
        { local: path.join(DIST_DIR, 'photos', year, eventSlug), remote: `photos/${year}/` },
        { local: path.join(DIST_DIR, 'thumbnails', year, eventSlug), remote: `thumbnails/${year}/` },
        { local: path.join(DIST_DIR, 'avif', year, eventSlug), remote: `avif/${year}/` },
        { local: path.join(DIST_DIR, 'data', 'albums', year, `${eventSlug}.json`), remote: `data/albums/${year}/` },
        { local: path.join(DIST_DIR, 'data', 'tags', year, `${eventSlug}.json`), remote: `data/tags/${year}/` },
        { local: path.join(DIST_DIR, 'data', 'years', `${year}.json`), remote: `data/years/` },
        { local: path.join(DIST_DIR, 'data', 'index.json'), remote: `data/` },
    ];

    if (eventData.zip) {
        const relZip = eventData.zip.startsWith('/') ? eventData.zip.slice(1) : eventData.zip;
        pathsToSync.push({ local: path.join(DIST_DIR, relZip), remote: 'zips/' });
    }

    for (const item of pathsToSync) {
        if (!fs.existsSync(item.local)) continue;
        const isDir = fs.statSync(item.local).isDirectory();
        const args = isDir
            ? ['-r', item.local, `${remoteTarget}/${item.remote}`]
            : [item.local, `${remoteTarget}/${item.remote}`];
        execFileSync('scp', args, { stdio: 'inherit' });
    }
    logger.success(`Delta deploy complete for ${year}/${eventLabel}!`);
}

export async function publishSingleEvent(options: PublishOptions): Promise<PublishResult> {
    const startTime = Date.now();
    if (!options.eventFilter) {
        throw new Error('Usage: npm run publish -- --event "<year>/<event folder>" [--deploy]');
    }

    logger.header(`🚀 Incremental Single-Event Publish: ${options.eventFilter}`);

    // Step 1: Incrementally update photo index for the target event
    const indexData = await generatePhotoIndex(options.eventFilter);

    // Locate the matched event in indexData
    let matchedYear = '';
    let matchedLabel = '';
    let matchedSlug = '';

    for (const year of Object.keys(indexData)) {
        for (const label of Object.keys(indexData[year])) {
            const slug = slugify(label);
            if (matchesTargetEventFilter(options.eventFilter, year, label, label, slug)) {
                matchedYear = year;
                matchedLabel = label;
                matchedSlug = slug;
                break;
            }
        }
        if (matchedYear) break;
    }

    if (!matchedYear || !matchedLabel) {
        throw new Error(`Could not find any event matching "${options.eventFilter}" in photos/`);
    }

    const singleEventSlice: IndexState = {
        [matchedYear]: {
            [matchedLabel]: indexData[matchedYear][matchedLabel],
        },
    };

    // Step 2: Encode AVIF thumbnails, AVIF originals, and processed JPEGs ONLY for this event
    await encodePhotos(singleEventSlice, false);
    stopPool();

    // Persist updated data/photos.json so ML runner and downstream steps see the latest event
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(indexData, null, 2));

    // Step 3: Run ML pipeline for this event (updates faces.json + exports /public/data/tags/<year>/<slug>.json)
    if (!options.skipMl) {
        logger.header(`Running ML pipeline for ${matchedYear}/${matchedLabel}...`);
        const mlRes = spawnSync(
            'python',
            ['scripts/ml/run.py', '--event', `${matchedYear}/${matchedSlug}`],
            { stdio: 'inherit', cwd: process.cwd() }
        );
        if (mlRes.status !== 0) {
            logger.warn('Python ML runner returned non-zero status; continuing with existing ML cache.');
        } else {
            // Re-apply updated faces/burst rankings to this event
            const refreshed = await generatePhotoIndex(options.eventFilter);
            indexData[matchedYear][matchedLabel] = refreshed[matchedYear][matchedLabel];
            singleEventSlice[matchedYear][matchedLabel] = indexData[matchedYear][matchedLabel];
            fs.writeFileSync(DATA_FILE, JSON.stringify(indexData, null, 2));
        }
    }

    // Step 4: Generate zip, chunks, scrubber sprite, social card, sitemap, and share page
    await generateZips(indexData);
    await chunkData(indexData);
    await generateScrubber(indexData);
    fs.writeFileSync(DATA_FILE, JSON.stringify(indexData, null, 2));

    const eventData = indexData[matchedYear][matchedLabel];
    const copiedCount = copyEventAssetsToDist(matchedYear, matchedLabel, matchedSlug, eventData);
    logger.info(`Synced ${copiedCount} event files to dist/`);

    await generateSocialCards(singleEventSlice);
    await generateSitemap(indexData);
    await generateSharePages(singleEventSlice);

    if (!options.skipClientBuild && !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
        logger.step('dist/index.html missing — running vite build...');
        execFileSync('npx', ['vite', 'build'], { stdio: 'inherit', shell: true });
    }

    if (options.deploy) {
        deltaDeployEvent(matchedYear, matchedLabel, matchedSlug, eventData);
    }

    const elapsedSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
    const { albumUrl, shareUrl, announcementText } = buildAnnouncementSnippet(
        matchedYear,
        matchedLabel,
        matchedSlug,
        eventData
    );

    logger.header(`✅ Published ${matchedYear}/${matchedLabel} in ${elapsedSeconds}s!`);
    console.log('\n📋 Ready-to-paste Discord / Slack / Instagram Announcement:\n');
    console.log('------------------------------------------------------------');
    console.log(announcementText);
    console.log('------------------------------------------------------------\n');

    return {
        year: matchedYear,
        eventLabel: matchedLabel,
        eventSlug: matchedSlug,
        photoCount: eventData.album?.length || 0,
        albumUrl,
        shareUrl,
        announcementText,
        elapsedSeconds,
    };
}

if (process.argv[1] && process.argv[1].includes('publishEvent')) {
    const opts = parseCliArgs(process.argv.slice(2));
    publishSingleEvent(opts).catch((err) => {
        logger.error('Single-event publish failed:', err instanceof Error ? err.message : String(err));
        process.exit(1);
    });
}
