import { test, expect } from '@playwright/test';

test.describe('Lightbox', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for at least one event to render
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should open lightbox when clicking a photo', async ({ page }) => {
        // Click on a grid item or featured item
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });
    });

    test('should close lightbox with close button', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const closeBtn = lightbox.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });
    });

    test('should close lightbox with Escape key', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        await page.keyboard.press('Escape');
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });
    });

    test('should navigate with arrow keys', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        // Get initial counter text
        const counter = lightbox.locator('.portfolio__lightbox-scrubber-counter');
        const initialText = await counter.textContent();

        // Navigate right
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);
        const afterRightText = await counter.textContent();

        // Counter should have changed
        expect(afterRightText).not.toBe(initialText);
    });

    test('should have correct ARIA attributes', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });
        await expect(lightbox).toHaveAttribute('aria-modal', 'true');
    });
});
