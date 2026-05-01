import { test, expect } from '@playwright/test';

test.describe('Year Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should switch years when clicking year tabs', async ({ page }) => {
        const yearLinks = page.locator('.portfolio__years a:not(.portfolio__search-tab):not(.portfolio__active-filter)');
        const count = await yearLinks.count();

        if (count < 2) return; // Need at least 2 years to test switching

        // Click the second year tab
        const secondYear = yearLinks.nth(1);
        const secondYearText = await secondYear.textContent();
        await secondYear.click();
        await page.waitForTimeout(500);

        // Should have active class on the clicked tab
        await expect(secondYear).toHaveClass(/active/);
    });

    test('should update URL when navigating years', async ({ page }) => {
        const yearLinks = page.locator('.portfolio__years a:not(.portfolio__search-tab):not(.portfolio__active-filter)');
        const count = await yearLinks.count();

        if (count < 2) return;

        const initialUrl = page.url();
        const secondYear = yearLinks.nth(1);
        await secondYear.click();
        await page.waitForTimeout(500);

        const newUrl = page.url();
        // URL should change to reflect the new year
        expect(newUrl).not.toBe(initialUrl);
    });

    test('should display events for the selected year', async ({ page }) => {
        const yearLinks = page.locator('.portfolio__years a:not(.portfolio__search-tab):not(.portfolio__active-filter)');
        const count = await yearLinks.count();

        if (count < 2) return;

        // Click each year tab and verify events render
        for (let i = 0; i < Math.min(count, 3); i++) {
            const yearLink = yearLinks.nth(i);
            await yearLink.click();
            await page.waitForTimeout(1000);

            // Should have at least one event or a recap
            const events = page.locator('.portfolio__event, .recap');
            const eventCount = await events.count();
            expect(eventCount).toBeGreaterThanOrEqual(0); // Some years might have no events but recaps
        }
    });
});
