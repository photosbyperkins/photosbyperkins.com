import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/micha/.gemini/antigravity/brain/c75a3805-ef02-4dfb-a348-ae4696ad5adc';

test.describe('Additional Feature Screen Captures', () => {
    test.setTimeout(90000);

    test('capture desktop search, gear modal, about modal, and dark themes', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });
        await page.waitForTimeout(600);

        // 1. Desktop Search Overlay
        const searchTab = page.locator('.portfolio__search-tab, a[aria-label="Open Search"]').first();
        if (await searchTab.isVisible()) {
            await searchTab.click();
            await page.waitForTimeout(600);
            await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_desktop_search.png') });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(400);
        }

        // 2. Desktop Gear Modal via Season Strip Camera Button
        const cameraBtn = page.locator('.portfolio__season-stat-compact--camera .portfolio__season-stat-btn').first();
        if (await cameraBtn.isVisible()) {
            await cameraBtn.click();
            await page.waitForTimeout(800);
            await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_desktop_gear_page.png') });
            await page.goto('/');
            await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });
            await page.waitForTimeout(400);
        }

        // 3. Desktop About Modal
        const aboutBtn = page.locator('button.nav__logo-btn, button[aria-label="Behind the Lens"], button[aria-label="About Me"]').first();
        if (await aboutBtn.isVisible()) {
            await aboutBtn.click();
            await page.waitForTimeout(800);
            await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_desktop_about_modal.png') });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(400);
        }

        // 4. Desktop Dark Mode Homepage
        const themeBtn = page.locator('button[aria-label*="theme"], button.nav__theme-toggle').first();
        if (await themeBtn.isVisible()) {
            await themeBtn.click();
            await page.waitForTimeout(600);
            await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_desktop_homepage_dark.png') });

            // Lightbox in Dark Mode
            const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
            await photo.click();
            const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
            await expect(lightbox).toBeVisible();
            await page.waitForTimeout(600);
            await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_desktop_lightbox_dark.png') });
            await lightbox.locator('button[aria-label="Close"]').click();
            await page.waitForTimeout(400);
        }

        // Mobile Viewport (Pixel 5)
        await page.setViewportSize({ width: 393, height: 851 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });
        await page.waitForTimeout(600);

        // Mobile About Modal
        if (await aboutBtn.isVisible()) {
            await aboutBtn.click();
            await page.waitForTimeout(800);
            await page.screenshot({ path: path.join(ARTIFACT_DIR, 'review_feature_mobile_about_modal.png') });
            await page.keyboard.press('Escape');
            await page.waitForTimeout(400);
        }
    });
});
