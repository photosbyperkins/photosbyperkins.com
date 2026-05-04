import fs from 'fs';
import path from 'path';

const PHOTOS_DIR = path.join(process.cwd(), 'photos');

function main() {
    console.log('🔄 Scanning events for score.json population...\n');

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
            if (!eventDir.toLowerCase().includes('vs')) continue;

            const scoreFile = path.join(yearPath, eventDir, 'score.json');
            if (!fs.existsSync(scoreFile)) {
                const template = {
                    team1Score: null,
                    team2Score: null,
                };
                fs.writeFileSync(scoreFile, JSON.stringify(template, null, 2));
                addedCount++;
                console.log(`  ➕ Created score.json for: ${year}/${eventDir}`);
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
