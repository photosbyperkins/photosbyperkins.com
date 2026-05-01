import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const PHOTOS_DIR = path.join(process.cwd(), 'photos');
const ZIPS_DIR = path.join(process.cwd(), 'build', 'zips');
const DATA_FILE = path.join(process.cwd(), 'data', 'photos.json');

// Ensure zips directory exists without nuking it
function ensureZipsDir() {
    if (!fs.existsSync(ZIPS_DIR)) {
        fs.mkdirSync(ZIPS_DIR, { recursive: true });
    }
}

function createZipArchive(sourceFiles, outputPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 0 }, // Photos are already compressed, store only to save CPU
        });

        output.on('close', () => {
            console.log(
                `  📦 Generated: ${path.basename(outputPath)} (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`
            );
            resolve();
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        for (const fileObj of sourceFiles) {
            const webPathOrig = typeof fileObj === 'string' ? fileObj : fileObj.original || undefined;
            if (!webPathOrig) continue;

            const relativePath = webPathOrig.startsWith('/') ? webPathOrig.slice(1) : webPathOrig;
            const processedRelative = relativePath.replace(/^photos[\\/]/, '');
            const fullPath = path.join(process.cwd(), 'build', 'processed', processedRelative);

            const sourceRelative = fileObj.source
                ? fileObj.source.startsWith('/')
                    ? fileObj.source.slice(1)
                    : fileObj.source
                : relativePath;
            const sourcePathOrig = path.join(process.cwd(), sourceRelative);

            const targetPath = fs.existsSync(fullPath) ? fullPath : sourcePathOrig;

            if (fs.existsSync(targetPath)) {
                archive.file(targetPath, { name: path.basename(relativePath) });
            } else {
                console.warn(`    ⚠️ Warning: File not found for zip: ${targetPath}`);
            }
        }

        archive.finalize();
    });
}

async function main() {
    console.log('🗜️  Generating album zips for all years...\n');

    if (!fs.existsSync(DATA_FILE)) {
        console.error('❌ Cannot find photos.json! Run `npm run index` first.');
        process.exit(1);
    }

    ensureZipsDir();
    const validZips = new Set();

    const indexData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

    // Find all numeric years
    const years = Object.keys(indexData)
        .filter((y) => !isNaN(parseInt(y, 10)))
        .sort((a, b) => b.localeCompare(a)); // Descending order

    if (years.length === 0) {
        console.log('No valid year folders found in photos.json');
        return;
    }

    console.log(`📅 Found ${years.length} years to process: ${years.join(', ')}\n`);

    for (const year of years) {
        console.log(`📂 Processing year: ${year}...`);
        const yearData = indexData[year];

        for (const [eventName, eventData] of Object.entries(yearData)) {
            if (!eventData.album || eventData.album.length === 0) {
                continue;
            }

            // e.g. "Sacramento Roller Derby Bout 1" -> "Sacramento_Roller_Derby_Bout_1.zip"
            const safeName = eventName
                .replace(/[^a-z0-9]/gi, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            const zipFilename = `${year}_${safeName}.zip`;
            const absZipPath = path.join(ZIPS_DIR, zipFilename);
            const webZipPath = `/zips/${zipFilename}`;

            validZips.add(zipFilename);

            if (fs.existsSync(absZipPath)) {
                console.log(`  ⏭️  Skipped (already exists): ${zipFilename}`);
                eventData.zip = webZipPath;
                continue;
            }

            try {
                await createZipArchive(eventData.album, absZipPath);
                // Attach the zip path to the event data in photos.json
                eventData.zip = webZipPath;
            } catch (e) {
                console.error(`  ❌ Failed to generate zip for ${eventName}:`, e);
            }
        }
    }

    // Save updated index with zip paths
    fs.writeFileSync(DATA_FILE, JSON.stringify(indexData, null, 2));

    // Cleanup old zips
    console.log('\n🧹 Cleaning up obsolete zips...');
    if (fs.existsSync(ZIPS_DIR)) {
        for (const file of fs.readdirSync(ZIPS_DIR)) {
            if (file.endsWith('.zip') && !validZips.has(file)) {
                fs.unlinkSync(path.join(ZIPS_DIR, file));
                console.log(`  🗑️  Deleted old zip: ${file}`);
            }
        }
    }

    console.log(`\n✨ Finished generating zips for all years and updating ${DATA_FILE}`);
}

main().catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
});
