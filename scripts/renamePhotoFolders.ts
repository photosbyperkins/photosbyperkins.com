/**
 * renamePhotoFolders.js
 * Standardises subfolder names inside every event directory under /photos
 * so the indexer can reliably find album and highlight photos.
 *
 * Rules:
 *  Album folders  → renamed to "resized"
 *    matches: contains("resize") OR matches /^\d+\s*(final|resize)/i
 *  Highlight/IG folders → renamed to "instagram"
 *    matches: starts with "ig " / "ig adults" / "ig juniors"
 *             OR contains "instagram" (already good, just lowercases)
 *  Multiple IG folders  → merged into a single "instagram" folder
 *    When multiple IG dirs exist they're each renamed "instagram_N"
 *    then their files are moved into "instagram" and the temp dirs removed.
 *
 * Skipped entirely (no rename):
 *    original / denoise / sharpen / rescued / process improvements / reddit / facebook
 */

import fs from 'fs';
import path from 'path';


function isTargetAlbumDir(name) {
    const n = name.toLowerCase();
    // numbered resize: "3 resize", "3 resize", "3 resized"
    if (/^\d+\s*resize/i.test(n)) return 'resized';
    if (/^\d+\s*final/i.test(n)) return 'resized';
    // Standalone rename: "resize" or "resized" (just normalise case)
    if (n === 'resized' || n === 'resize') return 'resized';
    if (n === 'final') return 'resized';
    return null;
}

function isTargetIgDir(name) {
    const n = name.toLowerCase().trim();
    if (n === 'instagram' || n === 'ig') return true;
    if (n.startsWith('ig ')) return true;
    if (n.includes('instagram')) return true;
    return false;
}

function isSkipDir(name) {
    const n = name.toLowerCase();
    const skip = [
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
        'headshots',
        'photo fb',
        'personal fb and instagram',
        'photo fb',
        'social media',
        '5 social media',
    ];
    // Numbered original/denoise/sharpen
    if (/^\d+\s*(original|denoise|sharpen|sharpened)/i.test(n)) return true;
    if (/^\d+\s*(a|b|c)\s*(original|denoise|sharpen)/i.test(n)) return true;
    return skip.some((s) => n === s || n === s.replace(/ /g, '_'));
}

function safeRename(oldPath, newPath) {
    if (oldPath === newPath) return;
    if (fs.existsSync(newPath)) {
        console.log(`    ⚠️  Target already exists, skipping: ${path.basename(newPath)}`);
        return;
    }
    fs.renameSync(oldPath, newPath);
    console.log(`    ✅ Renamed: "${path.basename(oldPath)}" → "${path.basename(newPath)}"`);
}

function mergeIntoTarget(srcDir, targetDir) {
    // Move all files from srcDir into targetDir, then remove srcDir
    const files = fs.readdirSync(srcDir);
    for (const f of files) {
        const src = path.join(srcDir, f);
        const dst = path.join(targetDir, f);
        if (fs.existsSync(dst)) {
            // Suffix the filename to avoid collision
            const ext = path.extname(f);
            const base = path.basename(f, ext);
            const newDst = path.join(targetDir, `${base}_merged${ext}`);
            fs.renameSync(src, newDst);
        } else {
            fs.renameSync(src, dst);
        }
    }
    fs.rmdirSync(srcDir);
}

function processEventDir(eventDir) {
    let entries;
    try {
        entries = fs.readdirSync(eventDir, { withFileTypes: true }).filter((e) => e.isDirectory());
    } catch {
        return;
    }

    const igDirs = [];
    const albumDirs = [];

    for (const entry of entries) {
        const name = entry.name;
        const targetAlbum = isTargetAlbumDir(name);

        if (targetAlbum && !isSkipDir(name)) {
            const newName = 'resized';
            if (name !== newName) albumDirs.push({ old: name, new: newName });
        } else if (isTargetIgDir(name)) {
            igDirs.push(name);
        }
    }

    // Handle album rename (only one target expected)
    for (const { old: oldName, new: newName } of albumDirs) {
        const oldPath = path.join(eventDir, oldName);
        const newPath = path.join(eventDir, newName);
        safeRename(oldPath, newPath);
    }

    // Handle IG dirs: if already named "instagram" and only one, nothing to do
    if (igDirs.length === 0) return;
    if (igDirs.length === 1 && igDirs[0].toLowerCase() === 'instagram') return;

    const targetIgPath = path.join(eventDir, 'instagram');

    if (igDirs.length === 1) {
        // Just rename to "instagram"
        const oldPath = path.join(eventDir, igDirs[0]);
        safeRename(oldPath, targetIgPath);
    } else {
        // Multiple IG dirs – ensure target exists then merge all into it
        if (!fs.existsSync(targetIgPath)) {
            fs.mkdirSync(targetIgPath);
        }
        for (const d of igDirs) {
            if (d.toLowerCase() === 'instagram') continue; // skip if it's already the target
            const srcPath = path.join(eventDir, d);
            console.log(`    🔀 Merging "${d}" into "instagram"`);
            mergeIntoTarget(srcPath, targetIgPath);
        }
    }
}

function main() {
    console.log('🔧 Standardising photo subfolder names...\n');
    const years = fs
        .readdirSync(PHOTOS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();

    for (const year of years) {
        const yearPath = path.join(PHOTOS_DIR, year);
        const events = fs
            .readdirSync(yearPath, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name);

        if (events.length === 0) continue;

        console.log(`\n📁 ${year}`);
        for (const event of events) {
            const eventPath = path.join(yearPath, event);
            // Check if this event itself has subdirs (some years are flat)
            const subs = fs.readdirSync(eventPath, { withFileTypes: true }).filter((e) => e.isDirectory());
            if (subs.length === 0) continue;
            console.log(`  📂 ${event}`);
            processEventDir(eventPath);
        }
    }

    console.log('\n✨ Done! Run `npm run index` to rebuild photos.json.');
}

main();
