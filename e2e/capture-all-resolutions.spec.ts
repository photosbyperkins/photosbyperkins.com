import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import zlib from 'zlib';

/**
 * Build a #photos= v2 hash using grouped album:numbers format + DEFLATE.
 * Mirrors src/utils/favoritesUrl.ts -> encodeFavorites().
 */
function encodeV2Hash(grouped: string): string {
    const raw = Buffer.from(grouped, 'utf-8');
    const compressed = zlib.deflateRawSync(raw);
    const b64 = compressed.toString('base64');
    const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return '2.' + b64url;
}

const TEST_GROUPED = '2025/0412-team-philippines-headshots:1,2,3';
const TEST_HASH = encodeV2Hash(TEST_GROUPED);
const TEST_COUNT = 3;

interface ResolutionConfig {
    name: string;
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    userAgent?: string;
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
        name: 'desktop',
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
    },
];

const BASE_SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots');

test.describe('Platform Complete Resolution Suite', () => {
    test.setTimeout(240000);

    for (const res of RESOLUTIONS) {
        test(`Capture all features at ${res.name} (${res.width}x${res.height})`, async ({ browser }) => {
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

            if (res.isMobile) {
                await context.addInitScript(() => {
                    if (!navigator.share) {
                        (navigator as any).share = async (data: any) => {
                            (window as any).__lastSharedData = data;
                            return Promise.resolve();
                        };
                    }
                    if (!navigator.canShare) {
                        (navigator as any).canShare = () => true;
                    }
                });
            }

            const page = await context.newPage();

            try {
                // 1. Homepage / Portfolio Overview
                await page.goto('/');
                const eventLocator = page.locator('.portfolio__event, .portfolio__grid-item').first();
                await eventLocator.waitFor({ timeout: 15000 });
                await page.waitForTimeout(600);
                await page.screenshot({ path: path.join(outDir, '01_homepage.png') });

                // 2. Year View (2025)
                await page.goto('/portfolio/2025');
                await eventLocator.waitFor({ timeout: 15000 });
                await page.waitForTimeout(600);
                await page.screenshot({ path: path.join(outDir, '02_year_2025.png') });

                // 3. Event Grid View
                await page.goto('/');
                await eventLocator.waitFor({ timeout: 15000 });
                const firstEvent = page.locator('.portfolio__event').first();
                if (await firstEvent.isVisible()) {
                    await firstEvent.scrollIntoViewIfNeeded();
                    await page.waitForTimeout(400);
                    await page.screenshot({ path: path.join(outDir, '03_event_grid.png') });
                }

                // 4. Lightbox View
                const photoItem = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
                await photoItem.click();
                const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
                await expect(lightbox).toBeVisible({ timeout: 10000 });
                await page.waitForTimeout(600);
                await page.screenshot({ path: path.join(outDir, '04_lightbox.png') });

                // 5. Story Maker (Crop Mode)
                const storyBtn = lightbox.locator('button[aria-label="Story Maker"]');
                if (await storyBtn.isVisible()) {
                    await storyBtn.click();
                } else {
                    await page.keyboard.press('c');
                }
                const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
                await expect(studioModal).toBeVisible({ timeout: 10000 });
                await page.waitForTimeout(600);

                // Ensure Layout tab and Crop mode
                const layoutTab = studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Layout")');
                if (await layoutTab.isVisible()) {
                    await layoutTab.click();
                    await page.waitForTimeout(300);
                }
                const cropBtn = studioModal.locator('button:has-text("9:16 Crop")');
                if (await cropBtn.isVisible()) {
                    await cropBtn.click();
                    await page.waitForTimeout(300);
                }
                await page.screenshot({ path: path.join(outDir, '05_story_maker_crop.png') });

                // 6. Story Maker (Padded Mode)
                const paddedBtn = studioModal.locator('button:has-text("Padded")');
                if (await paddedBtn.isVisible()) {
                    await paddedBtn.click();
                    await page.waitForTimeout(400);
                }
                await page.screenshot({ path: path.join(outDir, '06_story_maker_padded.png') });

                // 7. Story Maker (Filters Tab)
                const filtersTab = studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Filters")');
                if (await filtersTab.isVisible()) {
                    await filtersTab.click();
                    await page.waitForTimeout(400);
                    const vividPill = studioModal.locator('.story-export-modal__filter-pill:has-text("Vivid")');
                    if (await vividPill.isVisible()) {
                        await vividPill.click();
                        await page.waitForTimeout(300);
                    }
                }
                await page.screenshot({ path: path.join(outDir, '07_story_maker_filters.png') });

                // 8. Story Maker (Frames Tab)
                const framesTab = studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Frames")');
                if (await framesTab.isVisible()) {
                    await framesTab.click();
                    await page.waitForTimeout(400);
                    const frameBtn = studioModal.locator('.story-export-modal__frames-grid button').nth(1);
                    if (await frameBtn.isVisible()) {
                        await frameBtn.click();
                        await page.waitForTimeout(400);
                    }
                }
                await page.screenshot({ path: path.join(outDir, '08_story_maker_frames.png') });

                // 9. Story Maker (Badges Tab)
                const badgesTab = studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Badges")');
                if (await badgesTab.isVisible()) {
                    await badgesTab.click();
                    await page.waitForTimeout(400);
                }
                await page.screenshot({ path: path.join(outDir, '09_story_maker_badges.png') });

                // Close Story Studio & Lightbox
                const closeStudio = studioModal.locator('button[aria-label="Close"]');
                if (await closeStudio.isVisible()) {
                    await closeStudio.click();
                    await page.waitForTimeout(300);
                }
                const closeLightbox = lightbox.locator('button[aria-label="Close"]');
                if (await closeLightbox.isVisible()) {
                    await closeLightbox.click();
                    await page.waitForTimeout(300);
                }

                // 10. Filter By Gear Page
                await page.goto('/portfolio/gear/nikon-z8');
                const gearTitle = page.locator('.gear-info-card__title-row');
                await gearTitle.waitFor({ timeout: 10000 });
                await page.waitForTimeout(600);
                await page.screenshot({ path: path.join(outDir, '10_gear_filter_page.png') });

                // 11. Global Search (Teams Tab)
                await page.goto('/');
                await eventLocator.waitFor({ timeout: 15000 });
                const searchBtn = page.locator('button[aria-label="Open Search"], .portfolio__global-floating-search').first();
                if (await searchBtn.isVisible()) {
                    await searchBtn.click();
                } else {
                    await page.waitForTimeout(500);
                    await page.keyboard.press('/');
                }
                const searchModal = page.locator('.portfolio__global-search-overlay');
                await expect(searchModal).toBeVisible({ timeout: 8000 });
                await page.waitForTimeout(500);
                await page.screenshot({ path: path.join(outDir, '11_search_teams.png') });

                // 12. Global Search (Gear Tab)
                const gearTabBtn = searchModal.locator('.portfolio__search-tab-toggle button:has-text("Gear")');
                if (await gearTabBtn.isVisible()) {
                    await gearTabBtn.click();
                    await page.waitForTimeout(400);
                }
                await page.screenshot({ path: path.join(outDir, '12_search_gear.png') });

                // Close search overlay
                await page.keyboard.press('Escape');
                await page.waitForTimeout(300);

                // 13. Behind the Lens (About) Modal
                const aboutBtn = page.locator('button.footer__about-btn, button[aria-label="Behind the Lens"]').first();
                if (await aboutBtn.isVisible()) {
                    await aboutBtn.scrollIntoViewIfNeeded();
                    await aboutBtn.click();
                    const aboutModal = page.locator('[role="dialog"][aria-label*="Behind the Lens"], [role="dialog"][aria-label*="About"]');
                    await expect(aboutModal).toBeVisible({ timeout: 8000 });
                    await page.waitForTimeout(500);
                    await page.screenshot({ path: path.join(outDir, '13_about_modal.png') });
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(300);
                }

                // 14. AI Policy Modal
                const aiBtn = page.locator('button.footer__ai-policy-btn').first();
                if (await aiBtn.isVisible()) {
                    await aiBtn.scrollIntoViewIfNeeded();
                    await aiBtn.click();
                    const aiModal = page.locator('[role="dialog"][aria-label*="AI Policy"]');
                    await expect(aiModal).toBeVisible({ timeout: 8000 });
                    await page.waitForTimeout(500);
                    await page.screenshot({ path: path.join(outDir, '14_ai_policy_modal.png') });
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(300);
                }

                // 15. Code License Modal
                const codeBtn = page.locator('button.footer__code-license-btn').first();
                if (await codeBtn.isVisible()) {
                    await codeBtn.scrollIntoViewIfNeeded();
                    await codeBtn.click();
                    const codeModal = page.locator('[role="dialog"][aria-label*="Code License"]');
                    await expect(codeModal).toBeVisible({ timeout: 8000 });
                    await page.waitForTimeout(500);
                    await page.screenshot({ path: path.join(outDir, '15_code_license_modal.png') });
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(300);
                }

                // 16. Photo License Modal
                const photoLicenseBtn = page.locator('button.footer__license-btn').first();
                if (await photoLicenseBtn.isVisible()) {
                    await photoLicenseBtn.scrollIntoViewIfNeeded();
                    await photoLicenseBtn.click();
                    const photoModal = page.locator('[role="dialog"][aria-label*="Photo License"]');
                    await expect(photoModal).toBeVisible({ timeout: 8000 });
                    await page.waitForTimeout(500);
                    await page.screenshot({ path: path.join(outDir, '16_photo_license_modal.png') });
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(300);
                }

                // 17. Favorites Page (Empty State)
                await page.goto('/portfolio/favorites');
                await page.evaluate(() => localStorage.clear());
                await page.reload();
                const emptyState = page.locator('.portfolio__empty-state');
                await expect(emptyState).toBeVisible({ timeout: 10000 });
                await page.waitForTimeout(400);
                await page.screenshot({ path: path.join(outDir, '17_favorites_empty.png') });

                // 18. Shared Favorites (Receiving Shared Link)
                await page.goto(`/portfolio/2025#photos=${TEST_HASH}`);
                const sharedOverlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
                await expect(sharedOverlay).toBeVisible({ timeout: 15000 });
                const sharedGridItems = sharedOverlay.locator('.portfolio__grid-item');
                await expect(sharedGridItems).toHaveCount(TEST_COUNT, { timeout: 10000 });
                await page.waitForTimeout(600);
                await page.screenshot({ path: path.join(outDir, '18_shared_favorites_received.png') });

                // 19. Shared Favorites (Accepting Favorites - CTA State Change)
                const addBtn = sharedOverlay.locator('button.is-cta');
                await expect(addBtn).toBeVisible({ timeout: 5000 });
                await addBtn.click();
                await expect(addBtn).toHaveClass(/is-done/, { timeout: 5000 });
                await page.waitForTimeout(400);
                await page.screenshot({ path: path.join(outDir, '19_shared_favorites_accepted.png') });

                // Close Shared Favorites Panel
                const closeShared = sharedOverlay.locator('button[aria-label="Close"]');
                if (await closeShared.isVisible()) {
                    await closeShared.click();
                    await page.waitForTimeout(300);
                }

                // 20. Favorites Page Populated (Showing Share Favorites Action Button)
                await page.goto('/portfolio/favorites');
                const favGrid = page.locator('.portfolio__grid-item');
                await expect(favGrid.first()).toBeVisible({ timeout: 10000 });
                await page.waitForTimeout(600);
                await page.screenshot({ path: path.join(outDir, '20_favorites_populated_share.png') });

                // 21. Lightbox for Favorited Photo (Showing Active Scrubber Heart & Share Action)
                await favGrid.first().click();
                await expect(lightbox).toBeVisible({ timeout: 10000 });
                await page.waitForTimeout(600);
                await page.screenshot({ path: path.join(outDir, '21_favorites_lightbox_share.png') });
                const closeFavLightbox = lightbox.locator('button[aria-label="Close"]');
                if (await closeFavLightbox.isVisible()) {
                    await closeFavLightbox.click();
                    await page.waitForTimeout(300);
                }
            } finally {
                await context.close();
            }
        });
    }
});
