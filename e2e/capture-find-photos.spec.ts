import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

interface ResolutionConfig {
    name: string;
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    userAgent?: string;
    aliasDirs?: string[];
}

const IPHONE_17_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1';

const RESOLUTIONS: ResolutionConfig[] = [
    {
        name: 'iphone-17',
        width: 402,
        height: 874,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: IPHONE_17_UA,
        aliasDirs: ['iphone-17-portrait'],
    },
    {
        name: 'iphone-17-landscape',
        width: 874,
        height: 402,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: IPHONE_17_UA,
    },
    {
        name: 'mobile-standard',
        width: 393,
        height: 852,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        aliasDirs: ['mobile-standard-portrait'],
    },
    {
        name: 'mobile-standard-landscape',
        width: 852,
        height: 393,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    },
    {
        name: 'mobile-compact',
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    },
    {
        name: 'tablet',
        width: 768,
        height: 1024,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent:
            'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    },
    {
        name: 'tablet-landscape',
        width: 1024,
        height: 768,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent:
            'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    },
    {
        name: 'desktop',
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
    },
];

const BASE_SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots');

test.describe('Capture Find My Photos Across All Resolution Targets', () => {
    test.setTimeout(180000);

    for (const res of RESOLUTIONS) {
        test(`Capture /portfolio/find at ${res.name} (${res.width}x${res.height})`, async ({ browser }) => {
            const outDir = path.join(BASE_SCREENSHOT_DIR, res.name);
            if (!fs.existsSync(outDir)) {
                fs.mkdirSync(outDir, { recursive: true });
            }

            const context = await browser.newContext({
                viewport: { width: res.width, height: res.height },
                deviceScaleFactor: res.deviceScaleFactor || 1,
                isMobile: res.isMobile ?? false,
                hasTouch: res.hasTouch ?? false,
                userAgent: res.userAgent,
            });

            const page = await context.newPage();

            try {
                // 25. Unfiltered Jersey Tab in Search Modal (Jersey number pills)
                await page.goto('/portfolio/find');
                const searchModal = page.locator('.portfolio__global-search-overlay');
                await expect(searchModal).toBeVisible({ timeout: 15000 });
                const jerseySearch = searchModal.locator('.portfolio__jersey-search');
                await expect(jerseySearch).toBeVisible({ timeout: 10000 });
                const jerseyPill = searchModal.locator('.portfolio__jersey-pill').first();
                await expect(jerseyPill).toBeVisible({ timeout: 15000 });
                await page.waitForTimeout(800);
                await page.screenshot({ path: path.join(outDir, '25_find_my_photos_overview.png') });

                // 26. Possible Partial Matches when a searched number has no exact results
                const searchInput = searchModal.locator('.portfolio__search-input-wrap input');
                await searchInput.fill('449');
                await page.waitForTimeout(500);
                await page.screenshot({ path: path.join(outDir, '26_find_my_photos_team.png') });

                // 27. Filtered by Jersey Number on Main Page — PortfolioEvent view + Month/Year track + floating Select
                await page.goto('/portfolio/find?num=44');
                const findResults = page.locator('.portfolio__find-my-photos');
                await expect(findResults).toBeVisible({ timeout: 15000 });
                const firstPhoto = findResults.locator('.portfolio__featured-item, .portfolio__grid-item').first();
                await expect(firstPhoto).toBeVisible({ timeout: 15000 });
                await page.waitForTimeout(700);
                await page.screenshot({ path: path.join(outDir, '27_find_my_photos_filtered.png') });

                // 28. Filtered by Jersey Number — Floating Select Mode (BatchActionBar)
                const selectBtn = page.locator('.portfolio__floating-dock .portfolio__dock-btn--select');
                if (await selectBtn.isVisible()) {
                    await selectBtn.click();
                    await page.waitForTimeout(350);
                }
                await page.screenshot({ path: path.join(outDir, '28_search_jersey.png') });

                // Mirror to alias directories if defined (e.g. iphone-17-portrait, mobile-standard-portrait)
                if (res.aliasDirs && res.aliasDirs.length > 0) {
                    for (const alias of res.aliasDirs) {
                        const aliasDir = path.join(BASE_SCREENSHOT_DIR, alias);
                        if (!fs.existsSync(aliasDir)) {
                            fs.mkdirSync(aliasDir, { recursive: true });
                        }
                        for (const file of [
                            '25_find_my_photos_overview.png',
                            '26_find_my_photos_team.png',
                            '27_find_my_photos_filtered.png',
                            '28_search_jersey.png',
                        ]) {
                            const srcPath = path.join(outDir, file);
                            if (fs.existsSync(srcPath)) {
                                fs.copyFileSync(srcPath, path.join(aliasDir, file));
                            }
                        }
                    }
                }
            } finally {
                await context.close();
            }
        });
    }
});
