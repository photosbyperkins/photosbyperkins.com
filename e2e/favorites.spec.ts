import { test, expect } from '@playwright/test';

test.describe('Favorites', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should toggle favorite from lightbox', async ({ page }) => {
        // Open lightbox
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        // Click the heart/favorite button in the scrubber
        const heartBtn = lightbox.locator('button[aria-label="Toggle Favorite"]');
        await heartBtn.click();
        await page.waitForTimeout(300);

        // Close lightbox
        await page.keyboard.press('Escape');
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });
    });

    test('should persist favorites across page reload', async ({ page }) => {
        // Open lightbox and favorite a photo
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const heartBtn = lightbox.locator('button[aria-label="Toggle Favorite"]');
        await heartBtn.click();
        await page.waitForTimeout(300);

        // Close and reload
        await page.keyboard.press('Escape');
        await page.reload();

        // Check localStorage still has favorites
        const favs = await page.evaluate(() => {
            const data = localStorage.getItem('portfolio-store');
            if (!data) return [];
            try {
                const parsed = JSON.parse(data);
                return parsed?.state?.favorites || [];
            } catch {
                return [];
            }
        });
        expect(favs.length).toBeGreaterThanOrEqual(1);
    });

    test('should show empty state when no favorites', async ({ page }) => {
        // Navigate to favorites
        const favTab = page.locator('.portfolio__years a[aria-label="Favorites"]');
        if ((await favTab.count()) > 0) {
            await favTab.click();
            await page.waitForTimeout(500);

            // Should see empty state
            const emptyState = page.locator('.portfolio__empty-state');
            await expect(emptyState).toBeVisible({ timeout: 5000 });
        }
    });
});
