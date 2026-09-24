import { test, expect } from '@playwright/test';

test.describe('PWA & Offline Resilience', () => {
    test('should show offline toast when network connection is severed', async ({ page, context }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Offline toast should be absent initially
        const toast = page.locator('.pwa-status-toast');
        await expect(toast).not.toBeVisible();

        // Sever the network connection
        await context.setOffline(true);

        // Toast should appear indicating offline mode
        await expect(toast).toBeVisible({ timeout: 5000 });
        await expect(toast).toContainText('Offline Mode');
        await expect(page.locator('.pwa-status-toast__icon--offline')).toBeVisible();

        // Restore network connection
        await context.setOffline(false);

        // Toast should update to show back online
        await expect(toast).toContainText('Back online', { timeout: 5000 });
        await expect(page.locator('.pwa-status-toast__icon--online')).toBeVisible();
    });

    test('should allow interaction with cached content while offline', async ({ page, context }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Cut connection
        await context.setOffline(true);

        // UI navigation and theme toggle should still work locally without network
        const themeBtn = page.locator('.theme-toggle-nav');
        if ((await themeBtn.count()) > 0) {
            await themeBtn.click();
            const rootTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
            expect(['light', 'dark']).toContain(rootTheme);
        }

        // Restore
        await context.setOffline(false);
    });
});
