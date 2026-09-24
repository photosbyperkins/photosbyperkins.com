import { test, expect } from '@playwright/test';

test.describe('WFTDA Stats Overlay Modal', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to 2024 where WFTDA sanctioned games are in the primary data payload
        await page.goto('/portfolio/2024');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should display WFTDA badge on sanctioned matches', async ({ page }) => {
        const wftdaBadge = page.locator('.portfolio__wftda-badge').first();
        await expect(wftdaBadge).toBeVisible({ timeout: 5000 });
        await expect(wftdaBadge).toHaveText('WFTDA');
        await expect(wftdaBadge).toHaveAttribute('title', 'Official WFTDA Match Details');
    });

    test('should open iframe modal with correct URL when badge or title is clicked', async ({ page }) => {
        const wftdaLink = page.locator('a:has(.portfolio__wftda-badge)').first();
        await expect(wftdaLink).toBeVisible();

        const expectedHref = await wftdaLink.getAttribute('href');
        expect(expectedHref).toContain('stats.wftda.com');

        await wftdaLink.click();

        const modal = page.locator('.modal-shell.iframe-overlay');
        await expect(modal).toBeVisible({ timeout: 5000 });
        await expect(modal).toHaveAttribute('role', 'dialog');
        await expect(modal).toHaveAttribute('aria-modal', 'true');

        // Check header title
        const title = modal.locator('.modal-shell__title');
        await expect(title).toHaveText('WFTDA STATS');

        // Check external link points to match page
        const externalLink = modal.locator('a.modal-shell__action-btn[title="Open in new tab"]');
        await expect(externalLink).toBeVisible();
        await expect(externalLink).toHaveAttribute('href', expectedHref || '');

        // Check iframe src
        const iframe = modal.locator('iframe.iframe-overlay__iframe');
        await expect(iframe).toBeVisible();
        await expect(iframe).toHaveAttribute('src', expectedHref || '');
    });

    test('should close modal when clicking the close button', async ({ page }) => {
        const wftdaLink = page.locator('a:has(.portfolio__wftda-badge)').first();
        await wftdaLink.click();

        const modal = page.locator('.modal-shell.iframe-overlay');
        await expect(modal).toBeVisible({ timeout: 5000 });

        const closeBtn = modal.locator('button.modal-shell__close-btn');
        await expect(closeBtn).toBeVisible();
        await closeBtn.click();

        await expect(modal).not.toBeVisible({ timeout: 3000 });
    });

    test('should close modal when pressing Escape key', async ({ page }) => {
        const wftdaLink = page.locator('a:has(.portfolio__wftda-badge)').first();
        await wftdaLink.click();

        const modal = page.locator('.modal-shell.iframe-overlay');
        await expect(modal).toBeVisible({ timeout: 5000 });

        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible({ timeout: 3000 });
    });

    test('should trap focus within the modal when tabbing', async ({ page }) => {
        const wftdaLink = page.locator('a:has(.portfolio__wftda-badge)').first();
        await wftdaLink.click();

        const modal = page.locator('.modal-shell.iframe-overlay');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Tab multiple times and verify activeElement remains inside modal
        for (let i = 0; i < 6; i++) {
            await page.keyboard.press('Tab');
            await page.waitForTimeout(50);
            const isInsideModal = await page.evaluate(() => {
                const modalEl = document.querySelector('.modal-shell.iframe-overlay');
                return modalEl ? modalEl.contains(document.activeElement) : false;
            });
            expect(isInsideModal).toBe(true);
        }
    });
});
