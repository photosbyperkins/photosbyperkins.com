import { test, expect } from '@playwright/test';
import * as path from 'path';
import { collapseSheet, openStudioTab, thumbByLabel } from './helpers/storyStudio';

const ARTIFACT_DIR = 'C:/Users/micha/.gemini/antigravity/brain/c75a3805-ef02-4dfb-a348-ae4696ad5adc';

test.describe('Design Review Screenshot Capture', () => {
    test.setTimeout(150000);
    test('capture Story Maker across desktop and mobile', async ({ page }) => {
        // Desktop Story Maker capture (side layout)
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 15000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });
        await page.waitForTimeout(600);

        // 1. Desktop Tab 1: Layout - Crop
        const tick2x = studioModal.locator('.story-export-modal__zoom-tick:has-text("2.0x")');
        if (await tick2x.isVisible()) {
            await tick2x.click();
            await page.waitForTimeout(300);
        }
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_desktop_layout_crop.png') });

        // 2. Desktop Tab 1: Layout - Padded
        await studioModal.locator('button:has-text("Padded")').click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_desktop_layout_padded.png') });

        // 3. Desktop Tab 2: Filters
        await openStudioTab(studioModal, 'Filters');
        await page.waitForTimeout(400);
        const vividFilter = studioModal.getByRole('button', { name: 'Photo filter: Vivid', exact: true });
        if (await vividFilter.isVisible()) {
            await vividFilter.click();
            await page.waitForTimeout(300);
        }
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_desktop_filters.png') });

        // 4. Desktop Tab 3: Frames
        await openStudioTab(studioModal, 'Frames');
        await page.waitForTimeout(400);
        const bearFrame = thumbByLabel(studioModal.locator('#story-export-frames-grid'), 'Grizzly');
        if (await bearFrame.isVisible()) {
            await bearFrame.click();
            await page.waitForTimeout(400);
        }
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_desktop_frames.png') });

        // 5. Desktop Tab 4: Badges
        await openStudioTab(studioModal, 'Badges');
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_desktop_badges.png') });

        // Close modal and lightbox
        await studioModal.locator('button[aria-label="Close"]').click();
        await expect(studioModal).not.toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(300);
        await lightbox.locator('button[aria-label="Close"]').click();
        await page.waitForTimeout(300);

        // Mobile Story Maker capture (Pixel 5: 393 x 851, bottom-sheet layout)
        await page.setViewportSize({ width: 393, height: 851 });
        await photo.click();
        await expect(lightbox).toBeVisible();
        await lightbox.locator('button[aria-label="Story Maker (9:16)"]').click();
        await expect(studioModal).toBeVisible();
        await page.waitForTimeout(600);

        // Mobile collapsed sheet (preview + tab bar + export button)
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_mobile_sheet_collapsed.png') });

        // Mobile Layout Crop (tap Layout to open the sheet)
        await openStudioTab(studioModal, 'Layout');
        // First non-Padded framing preset ("9:16" only exists for burst photos)
        await studioModal
            .locator('[role="group"][aria-label="Framing presets"] button:not(:has-text("Padded"))')
            .first()
            .click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_mobile_layout_crop.png') });

        // Mobile Layout Padded
        await studioModal.locator('button:has-text("Padded")').click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_mobile_layout_padded.png') });

        // Mobile Filters
        await openStudioTab(studioModal, 'Filters');
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_mobile_filters.png') });

        // Mobile Frames
        await openStudioTab(studioModal, 'Frames');
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_mobile_frames.png') });

        // Mobile Badges
        await openStudioTab(studioModal, 'Badges');
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_mobile_badges.png') });

        // Collapse the sheet, then close the modal
        await collapseSheet(page, studioModal);
        await page.keyboard.press('Escape');
        await expect(studioModal).not.toBeVisible({ timeout: 5000 });

        // Landscape phone (851 x 393, side layout)
        await page.setViewportSize({ width: 851, height: 393 });
        await page.keyboard.press('c');
        await expect(studioModal).toBeVisible({ timeout: 8000 });
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_landscape_layout.png') });
        await openStudioTab(studioModal, 'Frames');
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_landscape_frames.png') });
        await page.keyboard.press('Escape');
        await expect(studioModal).not.toBeVisible({ timeout: 5000 });

        // Tablet portrait (1024 x 1366, stacked layout)
        await page.setViewportSize({ width: 1024, height: 1366 });
        await page.keyboard.press('c');
        await expect(studioModal).toBeVisible({ timeout: 8000 });
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_tablet_layout.png') });
        await openStudioTab(studioModal, 'Filters');
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_tablet_filters.png') });
    });

    test('capture Core Pages and Features across desktop and mobile', async ({ page }) => {
        // Desktop Viewport
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });
        await page.waitForTimeout(600);

        // 1. Homepage Hero & Navigation
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_desktop_homepage.png') });

        // 2. Lightbox View with EXIF
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.click();
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_desktop_lightbox.png') });

        // Click camera/lens EXIF tag to open Gear Modal
        const exifBtn = lightbox.locator('.lightbox__exif-item--interactive, button.lightbox__exif-btn').first();
        if (await exifBtn.isVisible()) {
            await exifBtn.click();
            const gearModal = page.locator('[role="dialog"][aria-label*="Gear"]');
            if (await gearModal.isVisible()) {
                await page.waitForTimeout(500);
                await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_desktop_gear_modal.png') });
                await gearModal.locator('button[aria-label="Close"]').click();
                await page.waitForTimeout(300);
            }
        }

        // Close lightbox
        await lightbox.locator('button[aria-label="Close"]').click();
        await page.waitForTimeout(300);

        // 3. Search Overlay
        const searchBtn = page.locator('button[aria-label="Open Search"], .portfolio__global-floating-search, .portfolio__search-tab').first();
        if (await searchBtn.isVisible()) {
            await searchBtn.click();
            await page.waitForTimeout(600);
            await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_desktop_search.png') });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
        }

        // 4. About Page
        await page.goto('/about');
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_desktop_about.png') });

        // 5. Shared Favorites
        await page.goto('/portfolio/favorites');
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_desktop_favorites.png') });

        // Mobile Viewport (Pixel 5)
        await page.setViewportSize({ width: 393, height: 851 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });
        await page.waitForTimeout(600);

        // Mobile Homepage
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_mobile_homepage.png') });

        // Mobile Lightbox
        const mobilePhoto = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await mobilePhoto.click();
        await expect(lightbox).toBeVisible();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_mobile_lightbox.png') });
        await lightbox.locator('button[aria-label="Close"]').click();
        await page.waitForTimeout(300);

        // Mobile Search
        const mobileSearchBtn = page.locator('button[aria-label="Open Search"], .portfolio__global-floating-search').first();
        if (await mobileSearchBtn.isVisible()) {
            await mobileSearchBtn.click();
            await page.waitForTimeout(600);
            await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_mobile_search.png') });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
        }

        // Mobile About
        await page.goto('/about');
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_mobile_about.png') });
    });
});
