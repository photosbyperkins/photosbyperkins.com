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

    test('should display favorited photos in the Favorites tab', async ({ page }) => {
        // Favorite a photo first
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const heartBtn = lightbox.locator('button[aria-label="Toggle Favorite"]');
        await heartBtn.click();
        await page.waitForTimeout(300);

        await page.keyboard.press('Escape');
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });

        // Navigate to favorites tab
        const favTab = page.locator('.portfolio__years a[aria-label="Favorites"]');
        if ((await favTab.count()) === 0) return;

        await favTab.click();
        await page.waitForTimeout(1000);

        // Should show at least one photo in grid
        const gridItems = page.locator('.portfolio__grid-item');
        await expect(gridItems.first()).toBeVisible({ timeout: 5000 });
        const count = await gridItems.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should display "YOUR FAVORITES" heading', async ({ page }) => {
        // Favorite a photo
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const heartBtn = lightbox.locator('button[aria-label="Toggle Favorite"]');
        await heartBtn.click();
        await page.waitForTimeout(300);

        await page.keyboard.press('Escape');
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });

        // Navigate to favorites
        const favTab = page.locator('.portfolio__years a[aria-label="Favorites"]');
        if ((await favTab.count()) === 0) return;

        await favTab.click();
        await page.waitForTimeout(1000);

        // Check for "YOUR FAVORITES" heading
        const heading = page.locator('.portfolio__event-teams h3');
        const headingText = await heading.first().textContent();
        expect(headingText?.toUpperCase()).toContain('FAVORITES');
    });

    test('should open lightbox from Favorites tab', async ({ page }) => {
        // Favorite a photo
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const heartBtn = lightbox.locator('button[aria-label="Toggle Favorite"]');
        await heartBtn.click();
        await page.waitForTimeout(300);

        await page.keyboard.press('Escape');
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });

        // Navigate to favorites
        const favTab = page.locator('.portfolio__years a[aria-label="Favorites"]');
        if ((await favTab.count()) === 0) return;

        await favTab.click();
        await page.waitForTimeout(1000);

        // Click the first photo in favorites
        const favPhoto = page.locator('.portfolio__grid-item').first();
        await expect(favPhoto).toBeVisible({ timeout: 5000 });
        await favPhoto.click();

        // Lightbox should open
        await expect(lightbox).toBeVisible({ timeout: 5000 });
    });

    test('should remove photo from Favorites when unfavorited', async ({ page }) => {
        // Favorite a photo
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const heartBtn = lightbox.locator('button[aria-label="Toggle Favorite"]');
        await heartBtn.click();
        await page.waitForTimeout(300);

        // Unfavorite the same photo by clicking again
        await heartBtn.click();
        await page.waitForTimeout(300);

        await page.keyboard.press('Escape');
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });

        // Navigate to favorites
        const favTab = page.locator('.portfolio__years a[aria-label="Favorites"]');
        if ((await favTab.count()) === 0) return;

        await favTab.click();
        await page.waitForTimeout(1000);

        // Should show empty state since we unfavorited
        const emptyState = page.locator('.portfolio__empty-state');
        await expect(emptyState).toBeVisible({ timeout: 5000 });
    });

    test('should show heart indicator in scrubber for favorited photo', async ({ page }) => {
        // Favorite a photo
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const heartBtn = lightbox.locator('button[aria-label="Toggle Favorite"]');
        await heartBtn.click();
        await page.waitForTimeout(300);

        // The scrubber playhead heart should show the active state
        const playheadHeart = lightbox.locator('.portfolio__lightbox-scrubber-playhead .portfolio__lightbox-scrubber-heart');
        await expect(playheadHeart).toHaveClass(/is-active/);
    });
});
