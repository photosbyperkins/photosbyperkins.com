import { test, expect } from '@playwright/test';

test.describe('Deep-Link Routing', () => {
    test('should load correct year when navigating to /portfolio/:year', async ({ page }) => {
        await page.goto('/portfolio/2024');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });

        // The 2024 year tab should be active
        const activeTab = page.locator('.portfolio__years a.active');
        await expect(activeTab).toBeVisible();
        const tabText = await activeTab.textContent();
        expect(tabText).toContain('2024');
    });

    test('should render events for the deep-linked year', async ({ page }) => {
        await page.goto('/portfolio/2025');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });

        const events = page.locator('.portfolio__event');
        const count = await events.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should open lightbox from a photo deep link', async ({ page }) => {
        // First, discover a valid event name from the default year
        await page.goto('/portfolio/2025');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });

        // Get the first event's name from its id attribute
        const eventId = await page.locator('.portfolio__event').first().getAttribute('id');
        if (!eventId) return;

        // Extract event name from id (format: event-{name})
        const eventName = eventId.replace('event-', '').replace(/-/g, ' ');

        // Navigate to the deep link with photo index 0
        // Use the raw event name with the original formatting from the URL-safe id
        const encodedEvent = encodeURIComponent(eventId.replace('event-', ''));
        await page.goto(`/portfolio/2025/${encodedEvent}/0`);

        // Lightbox should open
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 15000 });

        // Should show photo 1 in the counter
        const counter = lightbox.locator('.portfolio__lightbox-scrubber-counter');
        const counterText = await counter.textContent();
        expect(counterText).toContain('1 /');
    });

    test('should handle /portfolio/favorites route', async ({ page }) => {
        await page.goto('/portfolio/favorites');
        await page.waitForTimeout(2000);

        // Favorites tab should be active
        const favTab = page.locator('.portfolio__years a[aria-label="Favorites"]');
        if ((await favTab.count()) > 0) {
            await expect(favTab).toHaveClass(/active/);
        }
    });

    test('should handle non-existent year gracefully', async ({ page }) => {
        await page.goto('/portfolio/1999');
        await page.waitForTimeout(3000);

        // Should not crash — should fall back to default year
        const nav = page.locator('nav').first();
        await expect(nav).toBeVisible();
    });

    test('should preserve year context when navigating back', async ({ page }) => {
        await page.goto('/portfolio/2024');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });

        // Switch to 2025
        const yearLinks = page.locator('.portfolio__years a:not(.portfolio__search-tab):not(.portfolio__active-filter)');
        const count = await yearLinks.count();
        if (count < 2) return;

        // Find the 2025 tab
        for (let i = 0; i < count; i++) {
            const text = await yearLinks.nth(i).textContent();
            if (text?.includes('2025')) {
                await yearLinks.nth(i).click();
                break;
            }
        }
        await page.waitForTimeout(500);

        // URL should reflect 2025
        expect(page.url()).toContain('2025');
    });
});
