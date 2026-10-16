import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const EVENT_SLUG =
    '1108-sacramento-roller-derby-river-city-rapids-vs-sacramento-roller-derby-tower-bridge-terrors';
const EVENT_TITLE =
    '11.08 - Sacramento Roller Derby (River City Rapids) vs Sacramento Roller Derby (Tower Bridge Terrors)';
const YEAR = '2025';

function writeJson(filePath: string, data: unknown): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
}

async function main(): Promise<void> {
    const publicDir = path.join(process.cwd(), 'public');
    const indexJsonPath = path.join(publicDir, 'data', 'index.json');
    const findIndexPath = path.join(publicDir, 'data', 'find', 'index.json');

    if (!fs.existsSync(findIndexPath)) {
        writeJson(findIndexPath, {
            v: 1,
            teams: [
                {
                    name: 'Sacramento',
                    slug: 'sacramento',
                    colorHex: '#4B2E83',
                    photoCount: 5,
                    eventCount: 1,
                    topNumbers: ['42', '88'],
                },
            ],
        });
        writeJson(path.join(publicDir, 'data', 'find', 'sacramento.json'), {
            v: 1,
            team: 'Sacramento',
            slug: 'sacramento',
            colorHex: '#4B2E83',
            events: [{ y: YEAR, s: EVENT_SLUG, t: EVENT_TITLE }],
            photos: [
                { e: 0, i: 0, n: ['42'], r: 'jammer', g: ['apex-jump'], b: 1 },
                { e: 0, i: 1, n: ['88'], r: 'pivot', g: ['pack'] },
            ],
        });
    }

    // Only synthesize CI fixtures when real generated photo data is absent (e.g. clean GitHub Actions checkout)
    if (fs.existsSync(indexJsonPath)) {
        return;
    }

    console.log('[lhci-fixtures] Generating minimal deterministic fixtures for Lighthouse CI...');

    writeJson(indexJsonPath, {
        years: [YEAR],
        teams: [
            'Sacramento Roller Derby (River City Rapids)',
            'Sacramento Roller Derby (Tower Bridge Terrors)',
        ],
    });

    writeJson(path.join(publicDir, 'data', 'years', `${YEAR}.json`), {
        events: {
            [EVENT_TITLE]: {
                albumSlug: EVENT_SLUG,
                originalYear: YEAR,
                photoCount: 5,
                localScore: { team1Score: 182, team2Score: 164 },
                hl: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }],
            },
        },
        recapCount: 5,
        recapEvents: [
            {
                name: EVENT_TITLE,
                slug: EVENT_SLUG,
                date: '11.08',
                count: 5,
            },
        ],
        recapHash: 'ci',
        nextPart: null,
        stats: {
            totalEvents: 1,
            totalPhotos: 5,
            firstSeenTeam: { name: 'River City Rapids', slug: 'river-city-rapids', date: '11.08' },
            mostSeenTeam: { name: 'River City Rapids', slug: 'river-city-rapids', count: 1 },
        },
    });

    writeJson(path.join(publicDir, 'data', 'albums', YEAR, `${EVENT_SLUG}.json`), {
        version: 2,
        year: YEAR,
        slug: EVENT_SLUG,
        dims: [[3000, 2000]],
        cameras: ['Canon EOS R5'],
        lenses: ['RF70-200mm F2.8 L IS USM'],
        isos: [1600],
        apertures: ['f/2.8'],
        shutters: ['1/1000s'],
        dates: ['2025-11-08'],
        p: [1, 2, 3, 4, 5].map((n) => ({
            n,
            d: 0,
            f: [50, 40],
            e: [0, 0, 8192, 0, 0, 0, 0],
        })),
    });

    const thumbDir = path.join(publicDir, 'thumbnails', YEAR, EVENT_SLUG);
    const avifDir = path.join(publicDir, 'avif', YEAR, EVENT_SLUG);
    const recapDir = path.join(publicDir, 'recap', YEAR);
    const scrubberDir = path.join(publicDir, 'scrubber', YEAR, EVENT_SLUG);

    fs.mkdirSync(thumbDir, { recursive: true });
    fs.mkdirSync(avifDir, { recursive: true });
    fs.mkdirSync(recapDir, { recursive: true });
    fs.mkdirSync(scrubberDir, { recursive: true });

    const thumbBuf = await sharp({
        create: { width: 1080, height: 720, channels: 3, background: { r: 24, g: 26, b: 36 } },
    })
        .avif({ quality: 50 })
        .toBuffer();

    const fullBuf = await sharp({
        create: { width: 1600, height: 1067, channels: 3, background: { r: 24, g: 26, b: 36 } },
    })
        .avif({ quality: 50 })
        .toBuffer();

    for (let i = 1; i <= 5; i++) {
        const name = `photo_${String(i).padStart(3, '0')}.avif`;
        fs.writeFileSync(path.join(thumbDir, name), thumbBuf);
        fs.writeFileSync(path.join(avifDir, name), fullBuf);
    }

    const recapBuf = await sharp({
        create: { width: 500, height: 200, channels: 3, background: { r: 20, g: 22, b: 30 } },
    })
        .webp({ quality: 60 })
        .toBuffer();
    fs.writeFileSync(path.join(recapDir, 'sprite.webp'), recapBuf);

    const scrubberBuf = await sharp({
        create: { width: 360, height: 48, channels: 3, background: { r: 20, g: 22, b: 30 } },
    })
        .webp({ quality: 60 })
        .toBuffer();
    fs.writeFileSync(path.join(scrubberDir, 'sprite_0.webp'), scrubberBuf);

    const faviconSvgPath = path.join(publicDir, 'favicon.svg');
    if (!fs.existsSync(faviconSvgPath)) {
        fs.writeFileSync(
            faviconSvgPath,
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#ff3366"/></svg>',
            'utf8'
        );
    }

    const faviconPngPath = path.join(publicDir, 'favicon.png');
    if (!fs.existsSync(faviconPngPath)) {
        const png32 = await sharp({
            create: { width: 32, height: 32, channels: 4, background: { r: 255, g: 51, b: 102, alpha: 1 } },
        })
            .png()
            .toBuffer();
        fs.writeFileSync(faviconPngPath, png32);
    }

    const appleIconPath = path.join(publicDir, 'apple-touch-icon.png');
    if (!fs.existsSync(appleIconPath)) {
        const png180 = await sharp({
            create: { width: 180, height: 180, channels: 4, background: { r: 255, g: 51, b: 102, alpha: 1 } },
        })
            .png()
            .toBuffer();
        fs.writeFileSync(appleIconPath, png180);
    }
}

main().catch((err) => {
    console.error('[lhci-fixtures] Failed to generate fixtures:', err);
    process.exit(1);
});
