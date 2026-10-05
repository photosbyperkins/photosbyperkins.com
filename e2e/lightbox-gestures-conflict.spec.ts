import { test, expect } from '@playwright/test';

test.describe('Lightbox Gesture Isolation (Zoom vs Swipe/Pan)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });

        // Open lightbox by clicking the first photo
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });
    });

    test('disables pagination chevron overlays and keyboard navigation when zoomed in', async ({ page }) => {
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        const counter = lightbox.locator('.portfolio__lightbox-scrubber-counter');
        await expect(counter).toBeVisible();

        // Chevrons should exist when unzoomed
        const nextOverlay = lightbox.locator('.portfolio__lightbox-nav-overlay--right');
        await expect(nextOverlay).toBeVisible();

        // Capture initial counter text
        const initialCount = await counter.textContent();

        // Toggle zoom via 'z' key
        await page.keyboard.press('z');
        await page.waitForTimeout(300);

        // Chevron overlays must be hidden to prevent conflicting taps during panning
        await expect(nextOverlay).not.toBeVisible();

        // Arrow navigation must be inhibited during zoom
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(300);
        await expect(counter).toHaveText(initialCount!);

        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(300);
        await expect(counter).toHaveText(initialCount!);

        // Unzoom via 'z' key
        await page.keyboard.press('z');
        await page.waitForTimeout(300);

        // Chevron overlays and navigation must be restored
        await expect(nextOverlay).toBeVisible();
        await page.keyboard.press('ArrowRight');
        await expect(counter).not.toHaveText(initialCount!, { timeout: 5000 });
    });

    test('resets zoom when closing lightbox and reopening', async ({ page }) => {
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        const nextOverlay = lightbox.locator('.portfolio__lightbox-nav-overlay--right');

        // Toggle zoom in
        await page.keyboard.press('z');
        await expect(nextOverlay).not.toBeVisible();

        // Close lightbox with Escape
        await page.keyboard.press('Escape');
        await expect(lightbox).not.toBeVisible();

        // Reopen lightbox
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.click();
        await expect(lightbox).toBeVisible();

        // Should be unzoomed again
        await expect(nextOverlay).toBeVisible();
    });
});
