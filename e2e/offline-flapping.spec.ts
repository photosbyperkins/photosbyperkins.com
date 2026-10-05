import { test, expect } from '@playwright/test';

test.describe('PWA & Network Flapping Resilience', () => {
    test('handles rapid offline/online state transitions without crashing or leaking toast', async ({ page, context }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });

        const toast = page.locator('.pwa-status-toast');
        await expect(toast).not.toBeVisible();

        // Rapid flapping simulation (e.g. subway tunnel or elevator)
        for (let i = 0; i < 4; i++) {
            await context.setOffline(true);
            await page.waitForTimeout(100);
            await context.setOffline(false);
            await page.waitForTimeout(100);
        }

        // Now settle in offline state
        await context.setOffline(true);
        await expect(toast).toBeVisible({ timeout: 5000 });
        await expect(toast).toContainText('Offline Mode');

        // Settle in online state
        await context.setOffline(false);
        await expect(toast).toContainText('Back online', { timeout: 5000 });

        // Toast should auto-dismiss after its ~3000ms timer
        await expect(toast).not.toBeVisible({ timeout: 6000 });
    });

    test('retains store and UI interactivity during repeated flapping', async ({ page, context }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });

        // Flap connection while opening search
        await context.setOffline(true);
        const searchBtn = page.locator('button[aria-label="Search photos, teams, gear"]').first();
        if ((await searchBtn.count()) > 0) {
            await searchBtn.click();
            const searchOverlay = page.locator('.portfolio__search-overlay');
            await expect(searchOverlay).toBeVisible({ timeout: 5000 });

            // Flap online/offline with overlay open
            await context.setOffline(false);
            await page.waitForTimeout(150);
            await context.setOffline(true);
            await page.waitForTimeout(150);

            // Close search overlay with Escape
            await page.keyboard.press('Escape');
            await expect(searchOverlay).not.toBeVisible({ timeout: 5000 });
        }

        // Restore network
        await context.setOffline(false);
    });
});
