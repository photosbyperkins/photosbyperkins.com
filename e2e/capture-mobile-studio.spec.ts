import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Mobile Studio Screenshot Capture', () => {
    test.use({
        viewport: { width: 402, height: 874 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1',
    });

    test('capture all mobile studio tabs in light and dark mode', async ({ page }) => {
        const artifactDir = 'C:/Users/micha/.gemini/antigravity/brain/3af11443-3f63-4b23-a069-31408a4b0d54';

        const runCapturePass = async (mode: 'light' | 'dark') => {
            const prefix = mode === 'dark' ? 'mobile_studio_dark_' : 'mobile_studio_';
            await page.emulateMedia({ colorScheme: mode });
            await page.goto('/');
            const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
            await photo.waitFor({ timeout: 15000 });
            await photo.click();

            const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
            await expect(lightbox).toBeVisible({ timeout: 10000 });

            const storyBtn = lightbox.locator('button[aria-label="Story Maker (9:16)"]');
            await storyBtn.click();

            const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
            await expect(studioModal).toBeVisible({ timeout: 8000 });
            await page.waitForTimeout(1200);

            // 1. Tab 1: Layout - Crop Mode
            await page.screenshot({
                path: path.join(artifactDir, `${prefix}layout_crop.png`),
            });

            // 2. Tab 1: Layout - Padded Mode
            const paddedBtn = studioModal.locator('button:has-text("Padded")');
            await paddedBtn.click();
            await page.waitForTimeout(500);
            await page.screenshot({
                path: path.join(artifactDir, `${prefix}layout_padded.png`),
            });

            // Switch back to Crop
            const cropBtn = studioModal.locator('button:has-text("9:16")').first();
            await cropBtn.click();
            await page.waitForTimeout(400);

            // 3. Tab 2: Filters
            const filtersTab = studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Filters")');
            await filtersTab.click();
            await page.waitForTimeout(500);

            const vintageFilter = studioModal.locator('.story-export-modal__filter-pill:has-text("Vintage")');
            if (await vintageFilter.isVisible()) {
                await vintageFilter.click();
                await page.waitForTimeout(400);
            }
            await page.screenshot({
                path: path.join(artifactDir, `${prefix}filters.png`),
            });

            // 4. Tab 3: Frames - Default
            const framesTab = studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Frames")');
            await framesTab.click();
            await page.waitForTimeout(500);
            await page.screenshot({
                path: path.join(artifactDir, `${prefix}frames_default.png`),
            });

            // 5. Tab 3: Frames - Active Frame with Tint Bar
            const grizzlyFrame = studioModal.locator('.story-export-modal__frames-grid button:has-text("Grizzly")');
            if (await grizzlyFrame.isVisible()) {
                await grizzlyFrame.click();
                await page.waitForTimeout(400);
                const goldTint = studioModal.locator('button[title="Gold"]');
                if (await goldTint.isVisible()) {
                    await goldTint.click();
                }
                await page.waitForTimeout(400);
            }
            await page.screenshot({
                path: path.join(artifactDir, `${prefix}frames_active.png`),
            });

            // 6. Tab 4: Badges
            const badgesTab = studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Badges")');
            await badgesTab.click();
            await page.waitForTimeout(500);
            await page.screenshot({
                path: path.join(artifactDir, `${prefix}badges.png`),
            });
        };

        // Run light mode pass
        await runCapturePass('light');

        // Run dark mode pass
        await runCapturePass('dark');
    });
});
