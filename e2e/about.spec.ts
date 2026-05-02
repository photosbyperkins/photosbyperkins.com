import { test, expect } from '@playwright/test';

test.describe('About Overlay', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should open About overlay when clicking the nav logo', async ({ page }) => {
        const logoBtn = page.locator('button.nav__logo');
        await expect(logoBtn).toBeVisible();
        await logoBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="About the photographer"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });
    });

    test('should close About overlay via close button', async ({ page }) => {
        const logoBtn = page.locator('button.nav__logo');
        await logoBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="About the photographer"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('should close About overlay via Escape key', async ({ page }) => {
        const logoBtn = page.locator('button.nav__logo');
        await logoBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="About the photographer"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        await page.keyboard.press('Escape');
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('should lock body scroll when About overlay is open', async ({ page }) => {
        const logoBtn = page.locator('button.nav__logo');
        await logoBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="About the photographer"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        const overflow = await page.evaluate(() => document.body.style.overflow);
        expect(overflow).toBe('hidden');
    });

    test('should restore body scroll after About overlay closes', async ({ page }) => {
        const logoBtn = page.locator('button.nav__logo');
        await logoBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="About the photographer"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeVisible({ timeout: 3000 });

        const overflow = await page.evaluate(() => document.body.style.overflow);
        expect(overflow).toBe('');
    });

    test('should auto-focus the close button when opened', async ({ page }) => {
        const logoBtn = page.locator('button.nav__logo');
        await logoBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="About the photographer"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        // Wait a frame for requestAnimationFrame focus
        await page.waitForTimeout(100);

        const focusedLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
        expect(focusedLabel).toBe('Close');
    });

    test('should display profile photo and bio text', async ({ page }) => {
        const logoBtn = page.locator('button.nav__logo');
        await logoBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="About the photographer"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        // Profile photo should be visible
        const photo = overlay.locator('img.about__photo');
        await expect(photo).toBeVisible();

        // Bio text should be present
        const body = overlay.locator('.about__body');
        await expect(body).toBeVisible();
        const text = await body.textContent();
        expect(text?.length).toBeGreaterThan(0);
    });

    test('should display "BEHIND THE LENS" header', async ({ page }) => {
        const logoBtn = page.locator('button.nav__logo');
        await logoBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="About the photographer"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        const header = overlay.locator('.section-label');
        await expect(header).toContainText('BEHIND THE LENS');
    });

    test('should have correct ARIA attributes', async ({ page }) => {
        const logoBtn = page.locator('button.nav__logo');
        await logoBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="About the photographer"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });
        await expect(overlay).toHaveAttribute('aria-modal', 'true');
    });
});
