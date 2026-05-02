import { test, expect } from '@playwright/test';

test.describe('Lightbox Theater Mode', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Open lightbox
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });
    });

    test('should enter Theater Mode when clicking on the photo', async ({ page }) => {
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');

        // Click on the image area (single click toggles theater mode)
        const imageContainer = lightbox.locator('.portfolio__lightbox-image-container').first();
        await imageContainer.click();
        await page.waitForTimeout(500);

        // Lightbox should have the theater mode class
        await expect(lightbox).toHaveClass(/is-theater-mode/);
    });

    test('should hide controls in Theater Mode', async ({ page }) => {
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');

        // Enter theater mode
        const imageContainer = lightbox.locator('.portfolio__lightbox-image-container').first();
        await imageContainer.click();
        await page.waitForTimeout(500);

        await expect(lightbox).toHaveClass(/is-theater-mode/);

        // Top bar controls should have pointer-events disabled
        const topBar = lightbox.locator('.portfolio__lightbox-top-bar');
        const pointerEvents = await topBar.evaluate((el) => getComputedStyle(el).pointerEvents);
        expect(pointerEvents).toBe('none');
    });

    test('should exit Theater Mode when clicking the photo again', async ({ page }) => {
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        const imageContainer = lightbox.locator('.portfolio__lightbox-image-container').first();

        // Enter theater mode
        await imageContainer.click();
        await page.waitForTimeout(500);
        await expect(lightbox).toHaveClass(/is-theater-mode/);

        // Exit theater mode
        await imageContainer.click();
        await page.waitForTimeout(500);

        // Theater mode class should be removed
        const classes = await lightbox.getAttribute('class');
        expect(classes).not.toContain('is-theater-mode');
    });

    test('should still allow Escape to close lightbox during Theater Mode', async ({ page }) => {
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        const imageContainer = lightbox.locator('.portfolio__lightbox-image-container').first();

        // Enter theater mode
        await imageContainer.click();
        await page.waitForTimeout(500);
        await expect(lightbox).toHaveClass(/is-theater-mode/);

        // Escape should still close
        await page.keyboard.press('Escape');
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });
    });

    test('should still allow arrow key navigation during Theater Mode', async ({ page }) => {
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        const imageContainer = lightbox.locator('.portfolio__lightbox-image-container').first();

        // Enter theater mode
        await imageContainer.click();
        await page.waitForTimeout(500);

        // Get initial counter
        const counter = lightbox.locator('.portfolio__lightbox-scrubber-counter');
        const initialText = await counter.textContent();

        // Navigate right
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);
        const afterText = await counter.textContent();

        expect(afterText).not.toBe(initialText);
    });
});
