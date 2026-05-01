import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
    test('should load and display the page title', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Photography|Portfolio|Photos/i);
    });

    test('should render the navigation bar', async ({ page }) => {
        await page.goto('/');
        const nav = page.locator('nav').first();
        await expect(nav).toBeVisible();
    });

    test('should render year tabs', async ({ page }) => {
        await page.goto('/');
        const yearLinks = page.locator('.portfolio__years a');
        await expect(yearLinks.first()).toBeVisible();
        const count = await yearLinks.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should render at least one event', async ({ page }) => {
        await page.goto('/');
        const event = page.locator('.portfolio__event').first();
        await expect(event).toBeVisible({ timeout: 10000 });
    });

    test('should render footer with social links', async ({ page }) => {
        await page.goto('/');
        const footer = page.locator('footer');
        await expect(footer).toBeVisible();
        const socialLinks = footer.locator('a[aria-label]');
        const count = await socialLinks.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });
});
