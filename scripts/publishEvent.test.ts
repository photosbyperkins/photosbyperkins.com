import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const { YEAR, EVENT, SLUG, RECAP_DEFS, mocks } = vi.hoisted(() => {
    const YEAR = '2026';
    const EVENT = '10.24 Team A vs Team B';
    const SLUG = '1024-team-a-vs-team-b';
    return {
        YEAR,
        EVENT,
        SLUG,
        RECAP_DEFS: { [YEAR]: [{ src: `/photos/${YEAR}/${SLUG}/photo_001.jpg`, title: EVENT, date: '10.24' }] },
        mocks: { execFileSync: vi.fn(), chunkData: vi.fn(), generateRecaps: vi.fn() },
    };
});

vi.mock('dotenv/config', () => ({}));
vi.mock('child_process', () => {
    const childProcess = { execFileSync: mocks.execFileSync, spawnSync: vi.fn() };
    return { ...childProcess, default: childProcess };
});
vi.mock('./pipeline/generatePhotoIndex.js', () => ({
    generatePhotoIndex: vi.fn(async () => ({ [YEAR]: { [EVENT]: { album: [] } } })),
    matchesTargetEventFilter: () => true,
    slugify: () => SLUG,
}));
vi.mock('./pipeline/encodePhotos.js', () => ({ encodePhotos: vi.fn() }));
vi.mock('./pipeline/ssim2Pool.js', () => ({ stopPool: vi.fn() }));
vi.mock('./pipeline/generateZips.js', () => ({ generateZips: vi.fn() }));
vi.mock('./pipeline/chunkData.js', () => ({ chunkData: mocks.chunkData }));
vi.mock('./pipeline/generateRecaps.js', () => ({ generateRecaps: mocks.generateRecaps }));
vi.mock('./pipeline/generateScrubber.js', () => ({ generateScrubber: vi.fn() }));
vi.mock('./pipeline/generateSocialCards.js', () => ({ generateSocialCards: vi.fn() }));
vi.mock('./pipeline/generateSitemap.js', () => ({ generateSitemap: vi.fn() }));
vi.mock('./pipeline/generateSharePages.js', () => ({ generateSharePages: vi.fn() }));
vi.mock('./pipeline/logger.js', () => ({
    logger: { header: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), success: vi.fn(), step: vi.fn() },
}));

const toPosix = (p: string) => p.replace(/\\/g, '/');

describe('publishSingleEvent recap sprite', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-event-'));
        vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.stubEnv('DEPLOY_SSH_USER', 'user');
        vi.stubEnv('DEPLOY_SSH_HOST', 'host');
        vi.stubEnv('DEPLOY_REMOTE_PATH', '/www');

        mocks.execFileSync.mockReset();
        mocks.chunkData.mockReset().mockImplementation(async () => {
            const yearFile = path.join(tmpDir, 'public', 'data', 'years', `${YEAR}.json`);
            fs.mkdirSync(path.dirname(yearFile), { recursive: true });
            fs.writeFileSync(yearFile, JSON.stringify({ recapCount: 1, recapEvents: [], recapHash: 'new' }));
            return RECAP_DEFS;
        });
        mocks.generateRecaps.mockReset().mockImplementation(async () => {
            const sprite = path.join(tmpDir, 'build', 'recap', YEAR, 'sprite.webp');
            fs.mkdirSync(path.dirname(sprite), { recursive: true });
            fs.writeFileSync(sprite, 'new sprite');
        });
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    const publish = async () => {
        const { publishSingleEvent } = await import('./publishEvent');
        await publishSingleEvent({ eventFilter: `${YEAR}/10_24`, deploy: true, skipMl: true, skipClientBuild: true });
    };

    it('rebuilds the recap sprite from the new recap definitions and stages it in dist', async () => {
        await publish();

        expect(mocks.generateRecaps).toHaveBeenCalledWith(RECAP_DEFS);
        const distSprite = path.join(tmpDir, 'dist', 'recap', YEAR, 'sprite.webp');
        expect(fs.readFileSync(distSprite, 'utf8')).toBe('new sprite');
    });

    it('uploads the sprite before the year JSON whose recapHash points at it', async () => {
        await publish();

        const uploads = mocks.execFileSync.mock.calls
            .filter(([cmd]) => cmd === 'scp')
            .map(([, args]) => toPosix((args as string[]).at(-2)!));
        const spriteAt = uploads.findIndex((p) => p.endsWith(`dist/recap/${YEAR}/sprite.webp`));
        const yearAt = uploads.findIndex((p) => p.endsWith(`dist/data/years/${YEAR}.json`));
        expect(spriteAt).toBeGreaterThanOrEqual(0);
        expect(yearAt).toBeGreaterThan(spriteAt);
    });
});
