import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
    test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
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
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    test('should persist theme across reload', async ({ page }) => {
        const toggle = page.locator('.theme-toggle-floating, button[aria-label="Toggle theme"]').first();
        if ((await toggle.count()) === 0) return;

        await toggle.click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

        // Reload and check
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    test('should toggle back to dark theme', async ({ page }) => {
        const toggle = page.locator('.theme-toggle-floating, button[aria-label="Toggle theme"]').first();
        if ((await toggle.count()) === 0) return;

        // Toggle to light
        await toggle.click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

        // Toggle back to dark
        await toggle.click();
        await expect
            .poll(async () => {
                const attr = await page.locator('html').getAttribute('data-theme');
                return attr === null || attr === 'dark';
            })
            .toBe(true);
    });
});
