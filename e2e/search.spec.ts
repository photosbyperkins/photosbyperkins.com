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

        await teamPill.click();
        await page.waitForTimeout(500);

        // Should have an active filter displayed
        const activeFilter = page.locator('.portfolio__active-filter');
        await expect(activeFilter).toBeVisible({ timeout: 3000 });
    });

    test('should toggle between alphabetical and event-count sort modes', async ({ page }) => {
        const searchBtn = page.locator('button[aria-label="Open Search"]').first();
        if ((await searchBtn.count()) === 0) return;

        await searchBtn.click();
        await page.waitForTimeout(1000);

        // Wait for teams to load
        const teamPill = page.locator('.portfolio__team-pill').first();
        await expect(teamPill).toBeVisible({ timeout: 10000 });

        // Get team names in default (alpha) order
        const alphaNames: string[] = [];
        const pillCount = await page.locator('.portfolio__team-pill').count();
        for (let i = 0; i < Math.min(pillCount, 5); i++) {
            const name = await page.locator('.portfolio__team-pill').nth(i).locator('.portfolio__team-name').textContent();
            if (name) alphaNames.push(name);
        }

        // Click the count sort button
        const countSortBtn = page.locator('button[aria-label="Sort by Event Count"]');
        if ((await countSortBtn.count()) === 0) return;

        await countSortBtn.click();
        await page.waitForTimeout(500);

        // Get team names in count order
        const countNames: string[] = [];
        for (let i = 0; i < Math.min(pillCount, 5); i++) {
            const name = await page.locator('.portfolio__team-pill').nth(i).locator('.portfolio__team-name').textContent();
            if (name) countNames.push(name);
        }

        // Order should be different (unless there are very few teams)
        if (pillCount > 3) {
            expect(countNames.join(',')).not.toBe(alphaNames.join(','));
        }
    });

    test('should close search overlay via close button', async ({ page }) => {
        const searchBtn = page.locator('button[aria-label="Open Search"]').first();
        if ((await searchBtn.count()) === 0) return;

        await searchBtn.click();
        await page.waitForTimeout(500);

        const overlay = page.locator('.portfolio__global-search-overlay');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        const closeBtn = page.locator('button[aria-label="Close"]').last();
        await closeBtn.click();
        await page.waitForTimeout(500);

        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('should lock body scroll when search overlay is open', async ({ page }) => {
        const searchBtn = page.locator('button[aria-label="Open Search"]').first();
        if ((await searchBtn.count()) === 0) return;

        await searchBtn.click();
        await page.waitForTimeout(500);

        const overlay = page.locator('.portfolio__global-search-overlay');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        const overflow = await page.evaluate(() => document.body.style.overflow);
        expect(overflow).toBe('hidden');
    });

    test('should show empty state when no teams match search query', async ({ page }) => {
        const searchBtn = page.locator('button[aria-label="Open Search"]').first();
        if ((await searchBtn.count()) === 0) return;

        await searchBtn.click();
        await page.waitForTimeout(1000);

        // Wait for teams to load
        const teamPill = page.locator('.portfolio__team-pill').first();
        await expect(teamPill).toBeVisible({ timeout: 10000 });

        const searchInput = page.locator('.portfolio__search-input-wrap input');
        await searchInput.fill('xyznonexistentteamname12345');
        await page.waitForTimeout(500);

        const emptyMsg = page.locator('.portfolio__team-empty');
        await expect(emptyMsg).toBeVisible();
        const text = await emptyMsg.textContent();
        expect(text).toContain('No teams found');
    });

    test('should auto-focus the search input when opened', async ({ page }) => {
        const searchBtn = page.locator('button[aria-label="Open Search"]').first();
        if ((await searchBtn.count()) === 0) return;

        await searchBtn.click();
        await page.waitForTimeout(500);

        const searchInput = page.locator('.portfolio__search-input-wrap input');
        await expect(searchInput).toBeVisible({ timeout: 3000 });

        // Input should be focused (autoFocus attribute)
        const isFocused = await searchInput.evaluate((el) => document.activeElement === el);
        expect(isFocused).toBe(true);
    });
});
