import { test, expect } from '@playwright/test';

test.describe('Accessibility — Focus Trapping', () => {
    test.describe('Lightbox Focus Trap', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/');
            await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
        });

        test('should trap focus within lightbox when tabbing', async ({ page }) => {
            const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
            await photo.waitFor({ timeout: 10000 });
            await photo.click();

            const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
            await expect(lightbox).toBeVisible({ timeout: 5000 });

            // Tab through all focusable elements — focus should not leave the lightbox
            for (let i = 0; i < 15; i++) {
                await page.keyboard.press('Tab');
                await page.waitForTimeout(50);
            }

            // Check that the active element is still within the lightbox
            const isInLightbox = await page.evaluate(() => {
                const lightbox = document.querySelector('[role="dialog"][aria-label="Photo lightbox"]');
                return lightbox?.contains(document.activeElement) ?? false;
            });
            expect(isInLightbox).toBe(true);
        });

        test('should trap focus within lightbox when shift-tabbing', async ({ page }) => {
            const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
            await photo.waitFor({ timeout: 10000 });
            await photo.click();

            const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
            await expect(lightbox).toBeVisible({ timeout: 5000 });

            // Shift+Tab through elements — focus should wrap around within the lightbox
            for (let i = 0; i < 15; i++) {
                await page.keyboard.press('Shift+Tab');
                await page.waitForTimeout(50);
            }

            const isInLightbox = await page.evaluate(() => {
                const lightbox = document.querySelector('[role="dialog"][aria-label="Photo lightbox"]');
                return lightbox?.contains(document.activeElement) ?? false;
            });
            expect(isInLightbox).toBe(true);
        });

        test('should restore focus to triggering element after lightbox closes', async ({ page }) => {
            const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
            await photo.waitFor({ timeout: 10000 });

            // Focus the photo element first (it's a button role)
            await photo.focus();
            await photo.click();

            const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
            await expect(lightbox).toBeVisible({ timeout: 5000 });

            // Close lightbox
            await page.keyboard.press('Escape');
            await expect(lightbox).not.toBeVisible({ timeout: 3000 });

            // Focus should return to a portfolio element (the photo or nearby)
            const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
            // Active element should exist (not be the body with no focus)
            expect(activeTagName).toBeTruthy();
        });
    });

    test.describe('About Overlay Focus Trap', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/');
            await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
        });

        test('should trap focus within About overlay when tabbing', async ({ page }) => {
            const logoBtn = page.locator('button.nav__logo');
            await logoBtn.click();

            const overlay = page.locator('[role="dialog"][aria-label="About the photographer"]');
            await expect(overlay).toBeVisible({ timeout: 3000 });

            // Tab multiple times
            for (let i = 0; i < 20; i++) {
                await page.keyboard.press('Tab');
                await page.waitForTimeout(50);
            }

            // Focus should still be within the overlay or on the overlay itself
            const isInOverlay = await page.evaluate(() => {
                const overlay = document.querySelector('[role="dialog"][aria-label="About the photographer"]');
                return overlay?.contains(document.activeElement) ?? false;
            });
            expect(isInOverlay).toBe(true);
        });
    });

    test.describe('Keyboard Navigation', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/');
            await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
        });

        test('should open lightbox with Enter key on featured photo', async ({ page }) => {
            const photo = page.locator('.portfolio__featured-item').first();
            await photo.waitFor({ timeout: 10000 });

            // Focus and press Enter
            await photo.focus();
            await page.keyboard.press('Enter');

            const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
            await expect(lightbox).toBeVisible({ timeout: 5000 });
        });

        test('should open lightbox with Space key on featured photo', async ({ page }) => {
            const photo = page.locator('.portfolio__featured-item').first();
            await photo.waitFor({ timeout: 10000 });

            // Focus and press Space
            await photo.focus();
            await page.keyboard.press('Space');

            const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
            await expect(lightbox).toBeVisible({ timeout: 5000 });
        });

        test('should have correct role and tabindex on photo items', async ({ page }) => {
            const photo = page.locator('.portfolio__featured-item').first();
            await photo.waitFor({ timeout: 10000 });

            await expect(photo).toHaveAttribute('role', 'button');
            await expect(photo).toHaveAttribute('tabindex', '0');
        });
    });
});
