import fs from 'fs';
import path from 'path';
import { buildEventJsonFromDirectory } from './pipeline/eventMetadata.js';

const PHOTOS_DIR = path.join(process.cwd(), 'photos');

function main() {
    console.log('🔄 Scanning events for event.json & score.json population...\n');

    if (!fs.existsSync(PHOTOS_DIR)) {
        console.error('❌ Cannot find photos directory.');
        process.exit(1);
    }

    const years = fs
        .readdirSync(PHOTOS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);

    let addedCount = 0;
    let existingCount = 0;

    for (const year of years) {
        const yearPath = path.join(PHOTOS_DIR, year);
        const eventDirs = fs
            .readdirSync(yearPath, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name);

        for (const eventDir of eventDirs) {
            const eventPath = path.join(yearPath, eventDir);
            const eventJsonFile = path.join(eventPath, 'event.json');
            if (!fs.existsSync(eventJsonFile)) {
                const eventPayload = buildEventJsonFromDirectory(eventPath, eventDir);
                fs.writeFileSync(eventJsonFile, JSON.stringify(eventPayload, null, 2) + '\n');
            }

            if (!eventDir.toLowerCase().includes('vs')) continue;

            const scoreFile = path.join(eventPath, 'score.json');
            if (!fs.existsSync(scoreFile)) {
                const template = {
                    team1Score: null,
                    team2Score: null,
                };
                fs.writeFileSync(scoreFile, JSON.stringify(template, null, 2));
                addedCount++;
                console.log(`  ➕ Created score.json & event.json for: ${year}/${eventDir}`);
            } else {
                existingCount++;
            }
        }
    }

    console.log(`\n✨ Done! Added ${addedCount} missing score files.`);
    if (existingCount > 0) {
        console.log(`  ℹ️  ${existingCount} events already had a score.json file.`);
    }
}

main();
