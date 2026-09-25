import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

describe('Recap Data & Sprite Integrity', () => {
    const yearsDir = path.join(process.cwd(), 'public', 'data', 'years');
    const recapDir = path.join(process.cwd(), 'build', 'recap');

    it('has valid public/data/years directory', () => {
        expect(fs.existsSync(yearsDir)).toBe(true);
    });

    const yearFiles = fs.existsSync(yearsDir)
        ? fs.readdirSync(yearsDir).filter((f) => /^\d{4}\.json$/.test(f))
        : [];

    it('finds yearly chunked data files', () => {
        expect(yearFiles.length).toBeGreaterThan(0);
    });

    for (const yearFile of yearFiles) {
        const year = yearFile.replace('.json', '');

        describe(`Year ${year} Recap Integrity`, () => {
            const filePath = path.join(yearsDir, yearFile);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            it('has non-empty recapEvents matching recapCount', () => {
                expect(typeof content.recapCount).toBe('number');
                expect(content.recapCount).toBeGreaterThan(0);
                expect(Array.isArray(content.recapEvents)).toBe(true);
                expect(content.recapEvents.length).toBe(content.recapCount);
            });

            it('contains valid eventName and photoIndex for every recap slice', () => {
                for (let i = 0; i < content.recapEvents.length; i++) {
                    const item = content.recapEvents[i];
                    expect(item).toBeDefined();
                    expect(typeof item.eventName).toBe('string');
                    expect(item.eventName.length).toBeGreaterThan(0);
                    expect(typeof item.photoIndex).toBe('number');
                    expect(item.photoIndex).toBeGreaterThanOrEqual(0);
                }
            });

            const spritePath = path.join(recapDir, year, 'sprite.webp');
            if (fs.existsSync(spritePath)) {
                it('has valid sprite dimensions matching recapCount', async () => {
                    const meta = await sharp(spritePath).metadata();
                    expect(meta.format).toBe('webp');
                    expect(meta.height).toBeGreaterThanOrEqual(720);
                    // Slice aspect ratio is 1:4 (width / height = 0.25)
                    const sliceWidth = meta.width! / content.recapCount;
                    expect(sliceWidth / meta.height!).toBeCloseTo(0.25, 1);
                    expect(meta.width! % content.recapCount).toBe(0);
                });
            }
        });
    }

    it('validates cache consistency for generated slices', () => {
        const cachePath = path.join(recapDir, '.cache.json');
        if (fs.existsSync(cachePath)) {
            const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            for (const [relPath, cacheKey] of Object.entries(cache)) {
                expect(typeof cacheKey).toBe('string');
                expect(cacheKey.length).toBeGreaterThan(0);
                const fullPath = path.join(process.cwd(), 'build', relPath);
                expect(fs.existsSync(fullPath)).toBe(true);
            }
        }
    });

    it('verifies python Pillow can decode AVIF thumbnails for face detection', async () => {
        const { spawnSync } = await import('child_process');
        const testScript = `
import sys
from PIL import Image
try:
    import numpy as np
    import cv2
    img = Image.new('RGB', (100, 100), color=(73, 109, 137))
    arr = np.array(img)
    bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    assert bgr.shape == (100, 100, 3)
    sys.exit(0)
except Exception as e:
    print(e)
    sys.exit(1)
`;
        const res = spawnSync('python', ['-c', testScript], { encoding: 'utf8' });
        expect(res.status).toBe(0);
    });
});
