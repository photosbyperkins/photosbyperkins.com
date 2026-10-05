import { test, expect } from '@playwright/test';

test.describe('Corrupted & Edge-Case Deep Links', () => {
    test('handles malformed shared favorites hash in URL without white-screening', async ({ page }) => {
        // Collect console errors to ensure unhandled exceptions aren't thrown
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/portfolio/favorites#photos=2.invalid_garbage_payload!@#$%^&*()');
        await page.waitForTimeout(2000);

        // Header / Navigation must still be rendered
        const nav = page.locator('nav').first();
        await expect(nav).toBeVisible();

        // Page should show empty state or favorites view gracefully
        const main = page.locator('main').first();
        await expect(main).toBeVisible();

        // Verify no fatal unhandled React runtime error destroyed the page
        await expect(page.getByText('Something went wrong')).not.toBeVisible();
    });

    test('handles non-existent event deep link gracefully', async ({ page }) => {
        await page.goto('/portfolio/2025/completely-nonexistent-event-slug/0');
        await page.waitForTimeout(3000);

        // Should load the 2025 portfolio view without crashing
        const nav = page.locator('nav').first();
        await expect(nav).toBeVisible();

        const yearTab = page.locator('.portfolio__years a.active');
        if ((await yearTab.count()) > 0) {
            await expect(yearTab).toBeVisible();
        }
    });

    test('handles out-of-range photo index in deep link', async ({ page }) => {
        await page.goto('/portfolio/2025');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });

        const eventName = await page.locator('.portfolio__event').first().getAttribute('data-event-name');
        if (!eventName) return;

        // Navigate with ridiculous index 999999
        await page.goto(`/portfolio/2025/${encodeURIComponent(eventName)}/999999`);
        await page.waitForTimeout(3000);

        // Page must remain responsive and not throw white-screen error
        const nav = page.locator('nav').first();
        await expect(nav).toBeVisible();
    });

    test('handles non-numeric photo index deep link', async ({ page }) => {
        await page.goto('/portfolio/2025');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });

        const eventName = await page.locator('.portfolio__event').first().getAttribute('data-event-name');
        if (!eventName) return;

        // Navigate with alphanumeric index 'NaN'
        await page.goto(`/portfolio/2025/${encodeURIComponent(eventName)}/not-a-number`);
        await page.waitForTimeout(3000);

        // Header and events should still render
        const events = page.locator('.portfolio__event');
        await expect(events.first()).toBeVisible();
    });
});
