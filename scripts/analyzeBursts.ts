import fs from 'fs';
import path from 'path';
import exifr from 'exifr';

interface PhotoMeta {
    source: string;
    width: number;
    height: number;
    isLandscape: boolean;
    timestampMs: number | null;
    cameraSerial: string;
    cameraModel: string;
    focalLength?: number;
    albumName: string;
    year: string;
}

export interface BurstGroup {
    albumName: string;
    year: string;
    cameraSerial: string;
    cameraModel: string;
    photos: PhotoMeta[];
    durationSec: number;
}

async function runBurstAnalysis() {
    console.log('🔍 Starting comprehensive Burst Analysis across all 10,000+ photos...\n');
    const startOverall = Date.now();

    const dataPath = path.join(process.cwd(), 'data', 'photos.json');
    if (!fs.existsSync(dataPath)) {
        console.error('❌ data/photos.json not found!');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Thresholds to test: 1.0s, 1.5s, 2.0s, 2.5s
    const THRESHOLDS = [1.0, 1.5, 2.0, 2.5];

    let totalAlbums = 0;
    let totalPhotosScanned = 0;
    let totalLandscapePhotos = 0;
    let missingFiles = 0;

    // We will collect parsed metadata per album
    const albumPhotoMap: Map<string, PhotoMeta[]> = new Map();

    for (const year of Object.keys(data)) {
        for (const eventName of Object.keys(data[year])) {
            totalAlbums++;
            const albumPhotos = data[year][eventName].album || [];
            const parsedList: PhotoMeta[] = [];

            for (const p of albumPhotos) {
                totalPhotosScanned++;
                const isLandscape = (p.width || 0) >= (p.height || 0);
                if (isLandscape) totalLandscapePhotos++;

                // Resolve real disk path
                const rel = p.source.replace(/^\//, '');
                const filePath = path.join(process.cwd(), rel);

                if (!fs.existsSync(filePath)) {
                    missingFiles++;
                    continue;
                }

                try {
                    const tags = await exifr.parse(filePath, {
                        pick: [
                            'DateTimeOriginal',
                            'SubSecTimeOriginal',
                            'SubSecTime',
                            'SerialNumber',
                            'BodySerialNumber',
                            'Model',
                            'FocalLength',
                        ],
                    });

                    let timestampMs: number | null = null;
                    if (tags?.DateTimeOriginal) {
                        const baseTime = new Date(tags.DateTimeOriginal).getTime();
                        let subsec = 0;
                        const subsecStr = tags.SubSecTimeOriginal || tags.SubSecTime;
                        if (subsecStr) {
                            subsec = parseFloat(`0.${subsecStr}`) * 1000;
                        }
                        timestampMs = baseTime + subsec;
                    }

                    const cameraSerial = (tags?.SerialNumber || tags?.BodySerialNumber || tags?.Model || 'UNKNOWN').trim();
                    const cameraModel = (tags?.Model || 'Unknown').trim();
                    const focalLength = tags?.FocalLength;

                    parsedList.push({
                        source: p.source,
                        width: p.width || 0,
                        height: p.height || 0,
                        isLandscape,
                        timestampMs,
                        cameraSerial,
                        cameraModel,
                        focalLength,
                        albumName: eventName,
                        year,
                    });
                } catch {
                    // Ignore corrupted EXIF
                }
            }

            albumPhotoMap.set(`${year} - ${eventName}`, parsedList);
        }
    }

    const parseDuration = ((Date.now() - startOverall) / 1000).toFixed(1);
    console.log(`✅ Parsed EXIF for ${totalPhotosScanned} photos across ${totalAlbums} albums in ${parseDuration}s.`);
    console.log(`   • Landscape photos: ${totalLandscapePhotos} / ${totalPhotosScanned} (${((totalLandscapePhotos / totalPhotosScanned) * 100).toFixed(1)}%)`);
    if (missingFiles > 0) {
        console.log(`   • Files skipped (not on disk): ${missingFiles}`);
    }
    console.log('');

    // Now evaluate burst grouping for each delta threshold
    for (const maxDeltaSec of THRESHOLDS) {
        let totalBurstGroups = 0;
        let photosInBursts = 0;
        const burstSizeDist: Record<number, number> = {};
        const yearStats: Record<string, { totalBursts: number; burstPhotos: number }> = {};
        const cameraStats: Record<string, { totalBursts: number; burstPhotos: number }> = {};

        for (const [_albumKey, photos] of albumPhotoMap.entries()) {
            // Group consecutive photos where:
            // 1. isLandscape is true
            // 2. cameraSerial matches previous
            // 3. time delta <= maxDeltaSec
            let currentBurst: PhotoMeta[] = [];

            function flushBurst() {
                if (currentBurst.length >= 3) {
                    totalBurstGroups++;
                    const count = currentBurst.length;
                    photosInBursts += count;
                    burstSizeDist[count] = (burstSizeDist[count] || 0) + 1;

                    const y = currentBurst[0].year;
                    if (!yearStats[y]) yearStats[y] = { totalBursts: 0, burstPhotos: 0 };
                    yearStats[y].totalBursts++;
                    yearStats[y].burstPhotos += count;

                    const cam = currentBurst[0].cameraModel;
                    if (!cameraStats[cam]) cameraStats[cam] = { totalBursts: 0, burstPhotos: 0 };
                    cameraStats[cam].totalBursts++;
                    cameraStats[cam].burstPhotos += count;
                }
                currentBurst = [];
            }

            for (let i = 0; i < photos.length; i++) {
                const current = photos[i];

                if (current.timestampMs === null) {
                    flushBurst();
                    continue;
                }

                if (currentBurst.length === 0) {
                    currentBurst.push(current);
                } else {
                    const prev = currentBurst[currentBurst.length - 1];
                    const sameCamera = current.cameraSerial === prev.cameraSerial;
                    const deltaSec = (current.timestampMs - prev.timestampMs!) / 1000;

                    // Condition: Same camera and time delta between 0 and maxDeltaSec
                    if (sameCamera && deltaSec >= 0 && deltaSec <= maxDeltaSec) {
                        currentBurst.push(current);
                    } else {
                        flushBurst();
                        currentBurst.push(current);
                    }
                }
            }
            flushBurst();
        }

        const pctOfAll = ((photosInBursts / totalPhotosScanned) * 100).toFixed(1);
        const pctOfLandscape = ((photosInBursts / totalLandscapePhotos) * 100).toFixed(1);

        console.log(`========================================================================`);
        console.log(`⚡ THRESHOLD: Δt ≤ ${maxDeltaSec.toFixed(1)}s (Consecutive Landscape + Same Camera)`);
        console.log(`========================================================================`);
        console.log(`• Total 3+ Photo Bursts:       ${totalBurstGroups.toLocaleString()} burst sequences`);
        console.log(`• Photos in 3+ Bursts:         ${photosInBursts.toLocaleString()} photos`);
        console.log(`• % of Total Library:          ${pctOfAll}% of all photos`);
        console.log(`• % of Landscape Photos:       ${pctOfLandscape}% of all landscape photos`);

        // Burst size breakdown
        const sizes = Object.keys(burstSizeDist).map(Number).sort((a, b) => a - b);
        const sizeSummary = sizes.map(s => `${s}-shots: ${burstSizeDist[s]}`).slice(0, 6).join(' | ');
        console.log(`• Burst Lengths:               ${sizeSummary}${sizes.length > 6 ? ' ...' : ''}`);

        // Camera breakdown
        const topCameras = Object.entries(cameraStats)
            .sort((a, b) => b[1].burstPhotos - a[1].burstPhotos)
            .slice(0, 3)
            .map(([cam, st]) => `${cam}: ${st.totalBursts} bursts (${st.burstPhotos} photos)`)
            .join('; ');
        console.log(`• Top Cameras:                 ${topCameras}`);

        // Year breakdown
        const yearSummary = Object.keys(yearStats)
            .sort()
            .map(y => `${y}: ${yearStats[y].totalBursts} bursts (${yearStats[y].burstPhotos}p)`)
            .join(' | ');
        console.log(`• By Year:                     ${yearSummary}\n`);
    }

    console.log(`⏱️  Total analysis completed in ${((Date.now() - startOverall) / 1000).toFixed(1)}s.\n`);
}

runBurstAnalysis().catch(err => {
    console.error('Analysis failed:', err);
    process.exit(1);
});
