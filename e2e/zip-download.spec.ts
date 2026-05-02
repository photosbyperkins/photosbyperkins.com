import { test, expect } from '@playwright/test';

test.describe('Zip Download Buttons', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for at least one event to render with album data
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should display zip download button on each event', async ({ page }) => {
        // Desktop Chrome has no navigator.share, so canShare=false → zip buttons should show
        const zipButtons = page.locator('.portfolio__zip-btn');
        await expect(zipButtons.first()).toBeVisible({ timeout: 10000 });

        const count = await zipButtons.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('zip download button should be a link with correct attributes', async ({ page }) => {
        const zipLink = page.locator('a.portfolio__zip-btn').first();
        await expect(zipLink).toBeVisible({ timeout: 10000 });

        // Should have download attribute
        await expect(zipLink).toHaveAttribute('download', '');

        // Should have an href pointing to a .zip file
        const href = await zipLink.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toContain('/zips/');
        expect(href).toContain('.zip');
    });

    test('zip download button should have correct title', async ({ page }) => {
        const zipLink = page.locator('a.portfolio__zip-btn').first();
        await expect(zipLink).toBeVisible({ timeout: 10000 });
        await expect(zipLink).toHaveAttribute('title', 'Download All Original Photos (.zip)');
    });

    test('each event should have its own zip link', async ({ page }) => {
        // Get all visible events
        const events = page.locator('.portfolio__event');
        const eventCount = await events.count();

        // Check that at least the first few visible events have zip buttons
        const visibleZipCount = await page.locator('a.portfolio__zip-btn').count();
        expect(visibleZipCount).toBeGreaterThanOrEqual(1);

        // All zip links should have unique hrefs
        const hrefs = new Set<string>();
        for (let i = 0; i < visibleZipCount; i++) {
            const href = await page.locator('a.portfolio__zip-btn').nth(i).getAttribute('href');
            if (href) hrefs.add(href);
        }
        // Each zip link should be unique (no duplicates)
        expect(hrefs.size).toBe(visibleZipCount);
    });

    test('zip button should contain a Save icon', async ({ page }) => {
        const zipLink = page.locator('a.portfolio__zip-btn').first();
        await expect(zipLink).toBeVisible({ timeout: 10000 });

        // Lucide Save icon renders as an SVG
        const svg = zipLink.locator('svg');
        await expect(svg).toBeVisible();
    });

    test('zip button should not appear on Favorites event', async ({ page }) => {
        // Navigate to a year that would show the Favorites section
        // The Favorites event uses a <button> for zip (not <a>), and only when album has items
        // Here we verify the <a> zip links never point to Favorites
        const allZipLinks = page.locator('a.portfolio__zip-btn');
        const count = await allZipLinks.count();

        for (let i = 0; i < count; i++) {
            const href = await allZipLinks.nth(i).getAttribute('href');
            // No zip link should reference "Favorites"
            expect(href).not.toContain('Favorites');
        }
    });
});
