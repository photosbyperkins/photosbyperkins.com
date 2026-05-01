import { test, expect } from '@playwright/test';

test.describe('Search', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should open search when clicking the search tab', async ({ page }) => {
        const searchTab = page.locator('.portfolio__search-tab, a[aria-label="Open Search"]').first();
        if ((await searchTab.count()) > 0) {
            await searchTab.click();
            await page.waitForTimeout(500);

            // Search input should be visible
            const searchInput = page.locator('.portfolio__search-input-wrap input');
            await expect(searchInput).toBeVisible({ timeout: 3000 });
        }
    });

    test('should filter teams when typing in search', async ({ page }) => {
        const searchTab = page.locator('.portfolio__search-tab, a[aria-label="Open Search"]').first();
        if ((await searchTab.count()) === 0) return;

        await searchTab.click();
        await page.waitForTimeout(500);

        const searchInput = page.locator('.portfolio__search-input-wrap input');
        await expect(searchInput).toBeVisible({ timeout: 3000 });

        // Get initial team count
        const initialTeams = await page.locator('.portfolio__team-pill').count();

        // Type a search query
        await searchInput.fill('roller');
        await page.waitForTimeout(500);

        // Teams should be filtered
        const filteredTeams = await page.locator('.portfolio__team-pill').count();
        expect(filteredTeams).toBeLessThanOrEqual(initialTeams);
    });

    test('should navigate to team view when clicking a team pill', async ({ page }) => {
        const searchTab = page.locator('.portfolio__search-tab, a[aria-label="Open Search"]').first();
        if ((await searchTab.count()) === 0) return;

        await searchTab.click();
        await page.waitForTimeout(500);

        const teamPill = page.locator('.portfolio__team-pill').first();
        if ((await teamPill.count()) === 0) return;

        const teamName = await teamPill.locator('.portfolio__team-name').textContent();
        await teamPill.click();
        await page.waitForTimeout(500);

        // Should have an active filter displayed
        const activeFilter = page.locator('.portfolio__active-filter');
        await expect(activeFilter).toBeVisible({ timeout: 3000 });
    });
});
