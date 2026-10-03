import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/micha/.gemini/antigravity/brain/c75a3805-ef02-4dfb-a348-ae4696ad5adc';

test.describe('Design Review Screenshot Capture', () => {
    test.setTimeout(90000);
    test('capture Story Maker across desktop and mobile', async ({ page }) => {
        // Desktop Story Maker capture
        await page.setViewportSize({ width: 1280, height: 800 });
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
        await studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Filters")').click();
        await page.waitForTimeout(400);
        const vividFilter = studioModal.locator('.story-export-modal__filter-pill:has-text("Vivid")');
        if (await vividFilter.isVisible()) {
            await vividFilter.click();
            await page.waitForTimeout(300);
        }
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_desktop_filters.png') });

        // 4. Desktop Tab 3: Frames
        await studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Frames")').click();
        await page.waitForTimeout(400);
        const bearFrame = studioModal.locator('.story-export-modal__frames-grid button:has-text("Grizzly")');
        if (await bearFrame.isVisible()) {
            await bearFrame.click();
            await page.waitForTimeout(400);
        }
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_desktop_frames.png') });

        // 5. Desktop Tab 4: Badges
        await studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Badges")').click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_desktop_badges.png') });

        // Close modal and lightbox
        await studioModal.locator('button[aria-label="Close"]').click();
        await page.waitForTimeout(300);
        await lightbox.locator('button[aria-label="Close"]').click();
        await page.waitForTimeout(300);

        // Mobile Story Maker capture (Pixel 5: 393 x 851)
        await page.setViewportSize({ width: 393, height: 851 });
        await photo.click();
        await expect(lightbox).toBeVisible();
        await lightbox.locator('button[aria-label="Story Maker (9:16)"]').click();
        await expect(studioModal).toBeVisible();
        await page.waitForTimeout(600);

        // Mobile Layout Crop
        await studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Layout")').click();
        await studioModal.locator('button:has-text("9:16")').first().click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_mobile_layout_crop.png') });

        // Mobile Layout Padded
        await studioModal.locator('button:has-text("Padded")').click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_mobile_layout_padded.png') });

        // Mobile Filters
        await studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Filters")').click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_mobile_filters.png') });

        // Mobile Frames
        await studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Frames")').click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_mobile_frames.png') });

        // Mobile Badges
        await studioModal.locator('.story-export-modal__studio-tab-btn:has-text("Badges")').click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_story_mobile_badges.png') });
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
