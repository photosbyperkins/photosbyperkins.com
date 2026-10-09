import { test, expect } from '@playwright/test';
import * as path from 'path';
import { openStudioTab, thumbByLabel } from './helpers/storyStudio';

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

            // 1. Tab 1: Layout - Crop Mode (collapsed sheet: preview + tab bar + export button)
            await page.screenshot({
                path: path.join(artifactDir, `${prefix}layout_crop.png`),
            });

            // 2. Tab 1: Layout - Padded Mode (tap Layout to open the bottom sheet)
            await openStudioTab(studioModal, 'Layout');
            const paddedBtn = studioModal.locator('button:has-text("Padded")');
            await paddedBtn.click();
            await page.waitForTimeout(500);
            await page.screenshot({
                path: path.join(artifactDir, `${prefix}layout_padded.png`),
            });

            // Switch back to Crop (first non-Padded framing preset; "9:16" only exists for burst photos)
            const cropBtn = studioModal
                .locator('[role="group"][aria-label="Framing presets"] button:not(:has-text("Padded"))')
                .first();
            await cropBtn.click();
            await page.waitForTimeout(400);

            // 3. Tab 2: Filters
            await openStudioTab(studioModal, 'Filters');
            await page.waitForTimeout(500);

            const vintageFilter = studioModal.getByRole('button', { name: 'Photo filter: Vintage', exact: true });
            if (await vintageFilter.isVisible()) {
                await vintageFilter.click();
                await page.waitForTimeout(400);
            }
            await page.screenshot({
                path: path.join(artifactDir, `${prefix}filters.png`),
            });

            // 4. Tab 3: Frames - Default
            await openStudioTab(studioModal, 'Frames');
            await page.waitForTimeout(500);
            await page.screenshot({
                path: path.join(artifactDir, `${prefix}frames_default.png`),
            });

            // 5. Tab 3: Frames - Active Frame with Gold tint (via the Tint popover)
            const grizzlyFrame = thumbByLabel(studioModal.locator('#story-export-frames-grid'), 'Grizzly');
            if (await grizzlyFrame.isVisible()) {
                await grizzlyFrame.click();
                await page.waitForTimeout(400);
                const tintTrigger = studioModal.locator('button.story-tint__trigger');
                if (await tintTrigger.isVisible()) {
                    await tintTrigger.click();
                    const goldTint = studioModal.locator('#story-tint-popover button[aria-label="Frame tint: Gold"]');
                    if (await goldTint.isVisible()) {
                        await goldTint.click();
                    }
                    // Close the popover only (Escape is captured by the popover first)
                    await page.keyboard.press('Escape');
                }
                await page.waitForTimeout(400);
            }
            await page.screenshot({
                path: path.join(artifactDir, `${prefix}frames_active.png`),
            });

            // 6. Tab 4: Badges
            await openStudioTab(studioModal, 'Badges');
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
