import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.removeItem('theme'));
        await page.reload();
    });

    test('should default to dark theme', async ({ page }) => {
        const theme = await page.locator('html').getAttribute('data-theme');
        // Default should be dark (no data-theme or data-theme="dark")
        expect(theme === null || theme === 'dark').toBeTruthy();
    });

    test('should toggle to light theme', async ({ page }) => {
        const toggle = page.locator('.theme-toggle-floating, button[aria-label="Toggle theme"]').first();
        if ((await toggle.count()) === 0) return;

        await toggle.click();
        await page.waitForTimeout(300);

        const theme = await page.locator('html').getAttribute('data-theme');
        expect(theme).toBe('light');
    });

    test('should persist theme across reload', async ({ page }) => {
        const toggle = page.locator('.theme-toggle-floating, button[aria-label="Toggle theme"]').first();
        if ((await toggle.count()) === 0) return;

        await toggle.click();
        await page.waitForTimeout(300);

        // Reload and check
        await page.reload();
        const theme = await page.locator('html').getAttribute('data-theme');
        expect(theme).toBe('light');
    });

    test('should toggle back to dark theme', async ({ page }) => {
        const toggle = page.locator('.theme-toggle-floating, button[aria-label="Toggle theme"]').first();
        if ((await toggle.count()) === 0) return;

        // Toggle to light
        await toggle.click();
        await page.waitForTimeout(300);

        // Toggle back to dark
        await toggle.click();
        await page.waitForTimeout(300);

        const theme = await page.locator('html').getAttribute('data-theme');
        expect(theme === null || theme === 'dark').toBeTruthy();
    });
});
