import fs from 'fs';
import path from 'path';
import { buildEventJsonFromDirectory } from './pipeline/eventMetadata.js';
import { logger } from './pipeline/logger.js';

const PHOTOS_DIR = path.join(process.cwd(), 'photos');

function formatEventLabel(dirName: string): string {
    return dirName
        .replace(/^(\d{2})[-_](\d{2})\s*/, (_, m, d) => `${m}.${d} `)
        .replace(/^(\d{4}[-_]\d{2})\s*/, '$1 ')
        .replace(/\bSRD\b/g, 'Sacramento Roller Derby')
        .replace(/\bSLOCO Junior Roller Derby\b/g, 'San Luis Obispo County Junior Roller Derby')
        .replace(/\bSLOCO\b/g, 'San Luis Obispo County')
        .trim();
}

export function migrateAllEvents(overwriteExisting = false): {
    created: number;
    updated: number;
    skipped: number;
    juniorBouts: number;
} {
    logger.header('Migrating event folders to event.json (v1 schema)...');

    if (!fs.existsSync(PHOTOS_DIR)) {
        logger.warn(`No photos directory found at ${PHOTOS_DIR}`);
        return { created: 0, updated: 0, skipped: 0, juniorBouts: 0 };
    }

    const years = fs
        .readdirSync(PHOTOS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let juniorBouts = 0;

    for (const year of years) {
        const yearDir = path.join(PHOTOS_DIR, year);
        const eventDirs = fs
            .readdirSync(yearDir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => d.name)
            .sort();

        for (const eventFolder of eventDirs) {
            const eventDir = path.join(yearDir, eventFolder);
            const eventJsonPath = path.join(eventDir, 'event.json');
            const exists = fs.existsSync(eventJsonPath);

            if (exists && !overwriteExisting) {
                const payload = buildEventJsonFromDirectory(eventDir, formatEventLabel(eventFolder));
                if (payload.isJuniorBout) juniorBouts++;
                skipped++;
                continue;
            }

            const label = formatEventLabel(eventFolder);
            const payload = buildEventJsonFromDirectory(eventDir, label);
            if (payload.isJuniorBout) juniorBouts++;

            fs.writeFileSync(eventJsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
            if (exists) {
                updated++;
            } else {
                created++;
            }
        }
    }

    logger.success(
        `event.json migration complete: ${created} created, ${updated} updated, ${skipped} already up-to-date (${juniorBouts} junior bouts flagged).`
    );
    return { created, updated, skipped, juniorBouts };
}

if (process.argv[1] && process.argv[1].includes('migrateEvents')) {
    const overwrite = process.argv.includes('--force') || process.argv.includes('--overwrite');
    migrateAllEvents(overwrite);
}
