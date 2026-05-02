import { test, expect } from '@playwright/test';

test.describe('Featured/Grid View Toggle', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should default to Featured view for events', async ({ page }) => {
        // The first non-Favorites event should show featured layout
        const featuredSection = page.locator('.portfolio__event-featured').first();
        await expect(featuredSection).toBeVisible({ timeout: 10000 });
    });

    test('should display the segmented toggle on events', async ({ page }) => {
        const toggle = page.locator('.portfolio__segmented-toggle').first();
        await expect(toggle).toBeVisible({ timeout: 10000 });

        // Should have two buttons: star (featured) and grid
        const starBtn = toggle.locator('button[aria-label="Show Featured Photos"]');
        const gridBtn = toggle.locator('button[aria-label="Show Full Album"]');
        await expect(starBtn).toBeVisible();
        await expect(gridBtn).toBeVisible();
    });

    test('should have Featured button active by default', async ({ page }) => {
        const toggle = page.locator('.portfolio__segmented-toggle').first();
        await expect(toggle).toBeVisible({ timeout: 10000 });

        const starBtn = toggle.locator('button[aria-label="Show Featured Photos"]');
        await expect(starBtn).toHaveClass(/active/);

        const gridBtn = toggle.locator('button[aria-label="Show Full Album"]');
        // Grid button should NOT have active class
        const gridClass = await gridBtn.getAttribute('class');
        expect(gridClass).not.toContain('active');
    });

    test('should switch to Full Album grid view when clicking the grid toggle', async ({ page }) => {
        const toggle = page.locator('.portfolio__segmented-toggle').first();
        await expect(toggle).toBeVisible({ timeout: 10000 });

        const gridBtn = toggle.locator('button[aria-label="Show Full Album"]');
        await gridBtn.click();
        await page.waitForTimeout(500);

        // Grid button should now be active
        await expect(gridBtn).toHaveClass(/active/);

        // The grid view should now be visible
        const gridView = page.locator('.portfolio__event-grid, .portfolio__virtualized-grid').first();
        await expect(gridView).toBeVisible({ timeout: 5000 });
    });

    test('should switch back to Featured view when clicking the star toggle', async ({ page }) => {
        const toggle = page.locator('.portfolio__segmented-toggle').first();
        await expect(toggle).toBeVisible({ timeout: 10000 });

        // First switch to grid
        const gridBtn = toggle.locator('button[aria-label="Show Full Album"]');
        await gridBtn.click();
        await page.waitForTimeout(500);

        // Then switch back to featured
        const starBtn = toggle.locator('button[aria-label="Show Featured Photos"]');
        await starBtn.click();
        await page.waitForTimeout(500);

        // Star button should be active again
        await expect(starBtn).toHaveClass(/active/);

        // Featured view should be visible
        const featuredSection = page.locator('.portfolio__event-featured').first();
        await expect(featuredSection).toBeVisible({ timeout: 5000 });
    });

    test('should show featured photos with progressive images', async ({ page }) => {
        const featuredItems = page.locator('.portfolio__featured-item').first();
        await expect(featuredItems).toBeVisible({ timeout: 10000 });

        // Should contain an img element
        const img = featuredItems.locator('img');
        await expect(img).toBeVisible();
    });

    test('should open lightbox when clicking a featured photo', async ({ page }) => {
        const featuredItem = page.locator('.portfolio__featured-item').first();
        await expect(featuredItem).toBeVisible({ timeout: 10000 });
        await featuredItem.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });
    });

    test('should open lightbox from grid view at correct photo', async ({ page }) => {
        const toggle = page.locator('.portfolio__segmented-toggle').first();
        await expect(toggle).toBeVisible({ timeout: 10000 });

        // Switch to grid view
        const gridBtn = toggle.locator('button[aria-label="Show Full Album"]');
        await gridBtn.click();
        await page.waitForTimeout(1000);

        // Click the second grid item (index 1)
        const gridItems = page.locator('.portfolio__event-grid .portfolio__grid-item, .portfolio__virtualized-grid .portfolio__grid-item');
        const count = await gridItems.count();
        if (count < 2) return;

        await gridItems.nth(1).click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        // Counter should show "2 /" indicating the second photo
        const counter = lightbox.locator('.portfolio__lightbox-scrubber-counter');
        const counterText = await counter.textContent();
        expect(counterText).toContain('2 /');
    });

    test('should show "+N" overlay on last featured photo when album has more than 10 photos', async ({ page }) => {
        // Look for any featured overlay with "+N" text
        const overlays = page.locator('.portfolio__featured-overlay');
        await page.waitForTimeout(3000);

        const count = await overlays.count();
        if (count === 0) return; // No events with > 10 photos

        const overlayText = await overlays.first().textContent();
        expect(overlayText).toMatch(/\+\d+/);
    });

    test('should not show segmented toggle on Favorites event', async ({ page }) => {
        // Navigate to favorites tab
        const favTab = page.locator('.portfolio__years a[aria-label="Favorites"]');
        if ((await favTab.count()) === 0) return;

        await favTab.click();
        await page.waitForTimeout(1000);

        // Favorites event should NOT have the segmented toggle
        const favEvent = page.locator('#event-Favorites');
        if ((await favEvent.count()) === 0) return;

        const toggle = favEvent.locator('.portfolio__segmented-toggle');
        await expect(toggle).toHaveCount(0);
    });
});
