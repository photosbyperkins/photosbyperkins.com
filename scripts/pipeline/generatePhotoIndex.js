/**
 * generatePhotoIndex.js
 * Scans the photos directory and produces src/data/photos.json for the website.
 *
 * FOLDER PRIORITY RULES:
 *   For the main gallery ("album") photos:
 *     all direct .jpg files at event root (for older/flat years like 2016-2019)
 *
 *   For "highlights" photos:
 *     We look for folders containing "instagram" or "ig " (Instagram crops).
 *     This recurses one level deep to catch e.g. "5 Social Media/photo Instagram".
 *
 *
 * OUTPUT: src/data/photos.json  – { year: { [eventLabel]: { album, highlights, title, date, description } } }
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifr from 'exifr';

const PHOTOS_DIR = path.join(process.cwd(), 'photos');
const DATA_FILE = path.join(process.cwd(), 'data', 'photos.json');
const MAX_ALBUM_PER_EVENT = Infinity;
const MAX_HIGHLIGHTS_PER_EVENT = Infinity;

// Skip these folders entirely – they are intermediate processing artifacts
const SKIP_DIRS = [
    'original',
    'denoise',
    'sharpen',
    'sharpened',
    'denoise + sharpened',
    'rescued',
    'process improvements',
    'reddit',
    'facebook',
    'fb',
    'personal fb and instagram',
    'photo fb',
];

function isSkipped(dirName) {
    const n = dirName.toLowerCase();
    return SKIP_DIRS.some((s) => n === s || n.startsWith(s + ' '));
}

function isAlbumDir(dirName) {
    const n = dirName.toLowerCase();
    return n.includes('resize') || n.includes('final');
}

function isHighlightDir(dirName) {
    const n = dirName.toLowerCase();
    return n.includes('highlight') || n.includes('hightlight');
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getJpgs(dir) {
    try {
        return fs
            .readdirSync(dir)
            .filter((f) => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg'))
            .map((f) => path.join(dir, f));
    } catch {
        return [];
    }
}

function getJpgsRecursive(dir, maxDepth = 2) {
    if (maxDepth <= 0) return getJpgs(dir);
    let result = getJpgs(dir);
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (e.isDirectory()) {
                result = result.concat(getJpgsRecursive(path.join(dir, e.name), maxDepth - 1));
            }
        }
    } catch {}
    return result;
}

function toWebPath(absPath, isThumb = false) {
    const root = isThumb ? path.join(process.cwd(), 'build', 'thumbnails') : process.cwd();
    const relative = path.relative(root, absPath);
    const prefix = isThumb ? '/thumbnails/' : '/';
    return prefix + relative.split(path.sep).join('/');
}

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}

function normalizeBasename(filename) {
    return filename
        .toLowerCase()
        .replace(/^(_sharpened_|_denoise_)+/, '') // Strip top-level processing prefixes
        .replace(
            /[-_](denoise|denoiseai|focus|motion|standard|web|resize|resized|final|instagram|ig|social|media|crop|large|thumb|thumbnail|copy|merged)/gi,
            ''
        ) // Strip common suffixes
        .replace(/\s+/g, '') // Remove spaces
        .replace(/(_\d+|\(\d+\))$/, '') // Strip trailing (1) or _1
        .replace(/\.[^/.]+$/, ''); // Strip extension
}

async function extractExif(absPath) {
    try {
        const exifData = await exifr.parse(absPath, {
            pick: [
                'DateTimeOriginal',
                'Make',
                'Model',
                'LensModel',
                'FocalLength',
                'FNumber',
                'ExposureTime',
                'ISO',
                'LensInfo',
            ],
        });
        if (!exifData) return null;

        const rawCamera = exifData.Model || exifData.Make;
        const rawLens = exifData.LensModel;

        const cameraModel = rawCamera
            ? rawCamera
                  .replace(/\bZ\s+(\d+|f\b|fc\b)/gi, 'Z$1')
                  .replace(/\bZ(?=\d|f|fc|\b)/gi, 'ℤ')
                  .trim()
            : undefined;

        let lens = rawLens
            ? rawLens
                  .replace(/\b(nikkor|fl|ed|sr|vr|af-s)\b/gi, '')
                  .replace(/leica\s*dg\s*nocticron\s*/gi, '')
                  .replace(/olympus\s*m\./gi, '')
                  .replace(/f\/([\d.]+)E\b/gi, 'f/$1')
                  .replace(/\bZ(?=\d|f|fc|\b)/gi, 'ℤ')
                  .replace(/\.0\s*mm/gi, 'mm')
                  .replace(/\s{2,}/g, ' ')
                  .trim()
            : undefined;

        if (lens && cameraModel && /nikon/i.test(cameraModel) && cameraModel.includes('ℤ') && !lens.includes('ℤ') && !/^F\b/.test(lens)) {
            lens = `F ${lens}`;
        }

        const focalLength = exifData.FocalLength 
            ? `${exifData.FocalLength}mm`.replace(/\.0+mm/gi, 'mm') 
            : undefined;
        const aperture = exifData.FNumber ? `f/${Number(exifData.FNumber).toFixed(1)}` : undefined;

        let shutterSpeed = undefined;
        if (exifData.ExposureTime) {
            if (exifData.ExposureTime < 1) {
                shutterSpeed = `1/${Math.round(1 / exifData.ExposureTime)}s`;
            } else {
                shutterSpeed = `${exifData.ExposureTime}s`;
            }
        }

        const iso = exifData.ISO ? `ISO ${exifData.ISO}` : undefined;

        let isPrime = false;
        if (exifData.LensInfo && Array.isArray(exifData.LensInfo) && exifData.LensInfo.length >= 2) {
            if (exifData.LensInfo[0] === exifData.LensInfo[1] && exifData.LensInfo[0] > 0) isPrime = true;
        } else if (lens && /prime| f\//i.test(lens) && !/\d+-\d+/.test(lens)) {
            // Backup heuristic for prime lenses using strings
            isPrime = true;
        }

        const exifPayload = { cameraModel, lens, focalLength, aperture, shutterSpeed, iso, isPrime };
        Object.keys(exifPayload).forEach((key) => exifPayload[key] === undefined && delete exifPayload[key]);

        const hasVisibleData = Object.keys(exifPayload).some((key) => key !== 'isPrime');

        return {
            DateTimeOriginal: exifData.DateTimeOriginal,
            exif: hasVisibleData ? exifPayload : undefined,
        };
    } catch (e) {
        return null; // File failed or completely empty
    }
}

/**
 * For a given event directory, find:
 *   album      – resized / final / adult images (or flat jpgs if none)
 *   highlights – instagram / ig images
 */
async function processEventDir(eventDir, year, eventSlug) {
    let subdirs;
    try {
        subdirs = fs
            .readdirSync(eventDir, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name);
    } catch {
        return { album: [], highlights: [] };
    }

    // Highlights: look for IG dirs, recurse 1 level into social-media style dirs
    let highlightFiles = [];
    for (const sub of subdirs) {
        if (isHighlightDir(sub)) {
            const subPath = path.join(eventDir, sub);
            // Also recurse one level (e.g. "5 Social Media/photo Instagram")
            let files = getJpgs(subPath);
            if (files.length === 0) {
                files = getJpgsRecursive(subPath, 1);
            }
            highlightFiles = highlightFiles.concat(files);
        }
        // Handle "5 Social Media" -> look inside for instagram subfolder
        if (sub.toLowerCase().includes('social media') || sub.toLowerCase().includes('social')) {
            const subPath = path.join(eventDir, sub);
            try {
                const inner = fs.readdirSync(subPath, { withFileTypes: true });
                for (const ie of inner) {
                    if (ie.isDirectory() && isHighlightDir(ie.name)) {
                        highlightFiles = highlightFiles.concat(getJpgs(path.join(subPath, ie.name)));
                    }
                }
            } catch {}
        }
    }

    // Album: prioritize resized/final subdirs; fall back to flat jpgs at root
    const albumDirs = subdirs.filter((s) => !isSkipped(s) && !isHighlightDir(s) && isAlbumDir(s));
    let albumFiles = [];
    if (albumDirs.length > 0) {
        for (const sub of albumDirs) {
            albumFiles = albumFiles.concat(getJpgsRecursive(path.join(eventDir, sub), 2));
        }
    } else {
        // Flat layout (2016-2019 era) – just grab jpgs directly at event level
        albumFiles = getJpgs(eventDir);
        // Also grab from any non-skipped, non-highlight subdir if flat is empty
        if (albumFiles.length === 0) {
            for (const sub of subdirs) {
                if (!isSkipped(sub) && !isHighlightDir(sub)) {
                    albumFiles = albumFiles.concat(getJpgsRecursive(path.join(eventDir, sub), 2));
                    if (albumFiles.length > 0) break; // just need something
                }
            }
        }
    }

    const mapToThumb = (absPath) => {
        const rel = path.relative(PHOTOS_DIR, absPath);
        const thumbAbs = path.join(process.cwd(), 'build', 'thumbnails', rel);
        return toWebPath(thumbAbs, true);
    };

    // 1. Prepare album entries first
    const albumArr = albumFiles
        .sort((a, b) => a.localeCompare(b))
        .slice(0, MAX_ALBUM_PER_EVENT)
        .map((abs, idx) => {
            const ext = path.extname(abs).toLowerCase();
            const cleanName = `photo_${String(idx + 1).padStart(3, '0')}${ext}`;
            const thumbName = `photo_${String(idx + 1).padStart(3, '0')}.webp`;
            const webOriginal = `/photos/${year}/${eventSlug}/${cleanName}`;
            const webThumb = `/thumbnails/${year}/${eventSlug}/${thumbName}`;

            return {
                source: toWebPath(abs),
                original: webOriginal,
                thumb: webThumb,
                basename: path.basename(abs).toLowerCase(),
                normalized: normalizeBasename(path.basename(abs)),
                absPath: abs,
            };
        });

    let highlightCounter = 1;
    // 2. Identify highlight files that are NOT in the album and add them to albumArr
    highlightFiles.forEach((abs) => {
        const filename = path.basename(abs);
        const norm = normalizeBasename(filename);
        const match = albumArr.find((a) => a.normalized === norm || a.basename === filename.toLowerCase());
        if (!match) {
            const ext = path.extname(abs).toLowerCase();
            const currentCount = String(highlightCounter++).padStart(3, '0');
            const cleanName = `highlight_${currentCount}${ext}`;
            const thumbName = `highlight_${currentCount}.webp`;
            albumArr.push({
                source: toWebPath(abs),
                original: `/photos/${year}/${eventSlug}/${cleanName}`,
                thumb: `/thumbnails/${year}/${eventSlug}/${thumbName}`,
                basename: filename.toLowerCase(),
                normalized: norm,
                absPath: abs,
            });
        }
    });

    // Re-sort albumArr after adding highlights
    albumArr.sort((a, b) => a.basename.localeCompare(b.basename));

    // 3. Map highlight files to album entries by filename
    const highlightsPaths = highlightFiles.map((abs) => {
        const filename = path.basename(abs);
        const norm = normalizeBasename(filename);
        const match = albumArr.find((a) => a.normalized === norm || a.basename === filename.toLowerCase());
        return { source: match.source, original: match.original, thumb: match.thumb };
    });

    // Take random 10 from highlights; fill from album randomly if needed
    const uniqueHighlights = Array.from(new Map(highlightsPaths.map((h) => [h.original, h])).values());
    let finalHighlights = shuffle(uniqueHighlights).slice(0, 10);

    if (finalHighlights.length < 10 && albumArr.length > 0) {
        const albumClean = albumArr.map(({ source, original, thumb }) => ({ source, original, thumb }));
        const remaining = 10 - finalHighlights.length;
        const extras = shuffle(albumClean.filter((a) => !finalHighlights.some((f) => f.original === a.original))).slice(
            0,
            remaining
        );
        finalHighlights = finalHighlights.concat(extras);
    }

    // --- ANALYZE DIMENSIONS AND EXIF, AND SLIGHTLY REORDER ---
    // Analyze photo dimensions to reorder the end of the grid for a flatter masonry bottom.
    // We do not pollute the output JSON with aspect ratio data; we just use it during build.
    const albumWithDims = [];
    let earliestTime = null;

    for (const item of albumArr) {
        let aspectRatio = 1;
        let width = 0;
        let height = 0;
        let exif = undefined;

        try {
            const absPath = item.absPath;
            const meta = await sharp(absPath).metadata();
            width = meta.width || 0;
            height = meta.height || 0;
            aspectRatio = (width || 1) / (height || 1);

            try {
                const extracted = await extractExif(absPath);
                if (extracted) {
                    if (extracted.DateTimeOriginal) {
                        const dt = new Date(extracted.DateTimeOriginal).getTime();
                        if (!earliestTime || dt < earliestTime) earliestTime = dt;
                    }
                    if (extracted.exif) {
                        exif = extracted.exif;
                    }
                }
            } catch (e) {}
        } catch (e) {
            // fallback if file can't be read
        }

        // Overrides (both manual and face-detected) apply universally now
        // because the 31-column Fibonacci grid utilizes 1:1 squares which unconditionally crops 3:2 photos.

        albumWithDims.push({ ...item, aspectRatio, width, height, ...(exif ? { exif } : {}) });
    }

    // To make the masonry grid perfectly even at the bottom, we extract the last few photos (max 15)
    // and sort just that final slice by aspect ratio (ascending, so wide photos come last).
    // CSS multi-columns balance much more cleanly when given smaller height items near the end.
    const reorderCount = Math.min(15, Math.floor(albumWithDims.length * 0.3));
    if (reorderCount > 0) {
        const splitIndex = albumWithDims.length - reorderCount;
        const firstPart = albumWithDims.slice(0, splitIndex);
        const endPart = albumWithDims.slice(splitIndex);

        endPart.sort((a, b) => a.aspectRatio - b.aspectRatio);
        albumWithDims.length = 0;
        albumWithDims.push(...firstPart, ...endPart);
    }

    // Clean up albumArr (remove temporary basenames & aspect ratio)
    const finalAlbum = albumWithDims.map(({ source, original, thumb, width, height, exif }, i) => ({
        source,
        original,
        thumb,
        width,
        height,
        spriteIndex: i,
        ...(exif && { exif }),
    }));

    const mappedHighlights = finalHighlights.map(({ source, original, thumb }) => {
        const match = albumWithDims.find((a) => a.original === original);
        return match
            ? {
                  source,
                  original,
                  thumb,
                  width: match.width,
                  height: match.height,
                  ...(match.exif && { exif: match.exif }),
              }
            : { source, original, thumb };
    });

    return {
        album: finalAlbum,
        highlights: mappedHighlights,
        earliestTime: earliestTime || 0,
    };
}

function formatEventLabel(dirName) {
    // Convert folder names like "03_23 Sacramento Roller Derby Bout I" to human-readable
    return dirName
        .replace(/^(\d{2})[-_](\d{2})\s*/, (_, m, d) => `${m}.${d} `)
        .replace(/^(\d{4}[-_]\d{2})\s*/, '$1 ')
        .replace(/\bSRD\b/g, 'Sacramento Roller Derby')
        .trim();
}

async function main() {
    console.log('📸 Generating photo index...\n');
    const output = {};

    const years = fs
        .readdirSync(PHOTOS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();

    for (const year of years) {
        const yearPath = path.join(PHOTOS_DIR, year);
        const yearEntries = fs.readdirSync(yearPath, { withFileTypes: true });
        const eventDirs = yearEntries.filter((e) => e.isDirectory()).map((e) => e.name);

        output[year] = {};

        if (eventDirs.length === 0) {
            // Year has no subdirs – flat jpgs directly under year
            const flat = getJpgs(yearPath);
            if (flat.length > 0) {
                const flatAlbumWithDims = [];
                for (const [idx, abs] of flat
                    .sort((a, b) => a.localeCompare(b))
                    .slice(0, MAX_ALBUM_PER_EVENT)
                    .entries()) {
                    const ext = path.extname(abs).toLowerCase();
                    const cleanName = `photo_${String(idx + 1).padStart(3, '0')}${ext}`;
                    const thumbName = `photo_${String(idx + 1).padStart(3, '0')}.webp`;
                    let width = 0;
                    let height = 0;
                    let exif = undefined;
                    try {
                        const meta = await sharp(abs).metadata();
                        width = meta.width || 0;
                        height = meta.height || 0;

                        const extracted = await extractExif(abs);
                        if (extracted && extracted.exif) {
                            exif = extracted.exif;
                        }
                    } catch (e) {}
                    flatAlbumWithDims.push({
                        source: toWebPath(abs),
                        original: `/photos/${year}/all-photos/${cleanName}`,
                        thumb: `/thumbnails/${year}/all-photos/${thumbName}`,
                        width,
                        height,
                        spriteIndex: idx,
                        ...(exif && { exif }),
                    });
                }

                output[year]['All Photos'] = {
                    album: flatAlbumWithDims,
                    highlights: [],
                };
            }
        } else {
            for (const eventDir of eventDirs) {
                const eventPath = path.join(yearPath, eventDir);

                const label = formatEventLabel(eventDir);
                const eventSlug = slugify(label);

                const result = await processEventDir(eventPath, year, eventSlug);

                let localScore = null;
                const scoreFile = path.join(eventPath, 'score.json');
                if (fs.existsSync(scoreFile)) {
                    try {
                        localScore = JSON.parse(fs.readFileSync(scoreFile, 'utf8'));
                    } catch (e) {
                        console.error(`  ⚠️  Failed to parse score.json in ${eventDir}`);
                    }
                }

                if (result.album.length > 0 || result.highlights.length > 0) {
                    output[year][label] = {
                        ...result,
                        ...(localScore ? { localScore } : {}),
                        date: null,
                        description: null,
                    };
                } else {
                    console.warn(`  ⚠️  No usable photos found in ${year}/${eventDir}`);
                }
            }
        }

        const evCount = Object.keys(output[year]).length;
        console.log(`  ✅  ${year}: ${evCount} event(s)`);
    }

    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2));
    console.log(`\n✨ Wrote ${DATA_FILE}`);
}

main().catch(console.error);
