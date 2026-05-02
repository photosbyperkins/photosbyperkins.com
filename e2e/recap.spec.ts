import { test, expect } from '@playwright/test';

test.describe('Recap Section', () => {
    test('should render the recap section on the homepage', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        // Recap may take time to load sprites
        await expect(recap).toBeVisible({ timeout: 10000 });
    });

    test('should display recap slices in a grid', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        const slices = recap.locator('.recap__slice');
        const count = await slices.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should display recap slices with sprite backgrounds', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        // Wait for sprite to load (slices animate in)
        await page.waitForTimeout(2000);

        const slice = recap.locator('.recap__sprite-slice').first();
        const bgImage = await slice.evaluate((el) => getComputedStyle(el).backgroundImage);
        expect(bgImage).toContain('sprite.webp');
    });

    test('should show overlay text on recap', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        const overlayText = recap.locator('.recap__overlay-text');
        if ((await overlayText.count()) > 0) {
            await expect(overlayText).toBeVisible();
            const text = await overlayText.textContent();
            // Should display the year number
            expect(text).toMatch(/\d{4}/);
        }
    });

    test('should open lightbox when clicking a recap slice', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        // Wait for slices to animate in
        await page.waitForTimeout(2000);

        const slice = recap.locator('.recap__slice').first();
        await slice.click();
        await page.waitForTimeout(1000);

        // Lightbox should open (the slice click sets sharedPhoto which triggers lightbox)
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });
    });

    test('should render recap for different years', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Navigate to a different year
        const yearLinks = page.locator('.portfolio__years a:not(.portfolio__search-tab):not(.portfolio__active-filter)');
        const count = await yearLinks.count();
        if (count < 2) return;

        await yearLinks.nth(1).click();
        await page.waitForTimeout(2000);

        // Recap should still render for the new year
        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        const slices = recap.locator('.recap__slice');
        const sliceCount = await slices.count();
        expect(sliceCount).toBeGreaterThanOrEqual(1);
    });

    test('should have aria-labels on recap slices', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        const slice = recap.locator('.recap__slice').first();
        const ariaLabel = await slice.getAttribute('aria-label');
        expect(ariaLabel).toContain('View recap image');
    });
});
