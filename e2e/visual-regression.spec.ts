import { test, expect } from '@playwright/test';

test.describe('Deterministic Visual Regression (toHaveScreenshot)', () => {
    test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    });

    test('navigation header renders consistently in dark and light themes', async ({ page }) => {
        await page.goto('/');
        const nav = page.locator('header.nav, nav.nav').first();
        await expect(nav).toBeVisible({ timeout: 10000 });

        await expect(nav).toHaveScreenshot('nav-header-dark.png', {
            animations: 'disabled',
            maxDiffPixelRatio: 0.02,
        });

        const toggle = page.locator('.theme-toggle-floating, button[aria-label="Toggle theme"]').first();
        if ((await toggle.count()) > 0) {
            await toggle.click();
            await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
            await expect(nav).toHaveScreenshot('nav-header-light.png', {
                animations: 'disabled',
                maxDiffPixelRatio: 0.02,
            });
        }
    });

    test('floating action dock renders consistently', async ({ page }) => {
        await page.goto('/');
        const dock = page.locator('.portfolio__floating-dock');
        await expect(dock).toBeVisible({ timeout: 10000 });

        await expect(dock).toHaveScreenshot('floating-dock-dark.png', {
            animations: 'disabled',
            maxDiffPixelRatio: 0.02,
        });
    });
});
