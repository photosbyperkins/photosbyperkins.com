import { test, expect } from '@playwright/test';

// These tests are designed for mobile viewports (e.g., Pixel 5)
// They will also run on desktop but the mobile-specific selectors may not apply

test.describe('Mobile Viewport', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should render year tabs in mobile view', async ({ page }) => {
        const yearLinks = page.locator('.portfolio__years a');
        await expect(yearLinks.first()).toBeVisible();
        const count = await yearLinks.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should render navigation bar on mobile', async ({ page }) => {
        const nav = page.locator('nav').first();
        await expect(nav).toBeVisible();

        // Logo should be visible
        const logo = page.locator('.nav__logo');
        await expect(logo).toBeVisible();
    });

    test('should open lightbox on mobile', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        // Scrubber should be visible on mobile
        const scrubber = lightbox.locator('.portfolio__lightbox-scrubber');
        await expect(scrubber).toBeVisible();
    });

    test('should close lightbox on mobile via close button', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const closeBtn = lightbox.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });
    });

    test('should render footer on mobile', async ({ page }) => {
        const footer = page.locator('footer');
        await expect(footer).toBeVisible();
    });

    test('should open About overlay on mobile', async ({ page }) => {
        const logoBtn = page.locator('button.nav__logo');
        await logoBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="About the photographer"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        // Close button should be visible
        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await expect(closeBtn).toBeVisible();
    });

    test('should toggle theme on mobile', async ({ page }) => {
        const toggle = page.locator('.theme-toggle-nav, button[aria-label="Toggle theme"]').first();
        if ((await toggle.count()) === 0) return;

        await toggle.click();
        await page.waitForTimeout(300);

        const theme = await page.locator('html').getAttribute('data-theme');
        expect(theme).toBe('light');
    });

    test('should navigate years on mobile', async ({ page }) => {
        const yearLinks = page.locator('.portfolio__years a:not(.portfolio__search-tab):not(.portfolio__active-filter)');
        const count = await yearLinks.count();
        if (count < 2) return;

        const secondYear = yearLinks.nth(1);
        await secondYear.click();
        await page.waitForTimeout(500);

        await expect(secondYear).toHaveClass(/active/);
    });

    test('should navigate to favorites on mobile', async ({ page }) => {
        const favTab = page.locator('.portfolio__years a[aria-label="Favorites"]');
        if ((await favTab.count()) === 0) return;

        await favTab.click();
        await page.waitForTimeout(500);

        await expect(favTab).toHaveClass(/active/);
    });
});
