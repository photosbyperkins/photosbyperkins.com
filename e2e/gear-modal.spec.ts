import { test, expect } from '@playwright/test';

test.describe('Favorite Camera & Lens Manufacturer Modals', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should display interactive camera and lens buttons in the season strip on desktop', async ({ page, isMobile }) => {
        if (isMobile) {
            test.skip();
            return;
        }

        const cameraBtn = page.locator('.portfolio__season-stat-compact--camera .portfolio__season-stat-btn');
        const lensBtn = page.locator('.portfolio__season-stat-compact--lens .portfolio__season-stat-btn');

        await expect(cameraBtn).toBeVisible();
        await expect(lensBtn).toBeVisible();

        await expect(cameraBtn).toContainText('NIKON');
        await expect(lensBtn).toContainText('120-300mm');

        const firstSeenBtn = page.locator('.portfolio__season-stat-compact--first-seen .portfolio__season-stat-btn');
        if (await firstSeenBtn.isVisible()) {
            await expect(firstSeenBtn).toHaveClass(/portfolio__season-stat-btn/);
        }
    });

    test('should open Nikon Z 8 modal and link to Nikon USA when clicking favorite camera', async ({ page, isMobile }) => {
        if (isMobile) {
            test.skip();
            return;
        }

        const cameraBtn = page.locator('.portfolio__season-stat-compact--camera .portfolio__season-stat-btn');
        await cameraBtn.click();

        const overlay = page.locator('.gear-modal-overlay');
        await expect(overlay).toBeVisible({ timeout: 3000 });
        await expect(overlay.locator('.section-label')).toContainText('Nikon Z 8');
        await expect(overlay.locator('.gear-modal__spec-grid')).toBeVisible();

        // External link button points directly to Nikon USA product page
        const externalLink = overlay.locator('a.gear-modal__action-btn');
        await expect(externalLink).toHaveAttribute('href', 'https://www.nikonusa.com/p/z-8/1695');

        // Close via close button
        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('should open Nikon 120-300mm modal when clicking favorite lens on 2026', async ({ page, isMobile }) => {
        if (isMobile) {
            test.skip();
            return;
        }

        const lensBtn = page.locator('.portfolio__season-stat-compact--lens .portfolio__season-stat-btn');
        await lensBtn.click();

        const overlay = page.locator('.gear-modal-overlay');
        await expect(overlay).toBeVisible({ timeout: 3000 });
        await expect(overlay.locator('.section-label')).toContainText('120-300mm');
        await expect(overlay.locator('.gear-modal__name-full')).toBeVisible();
        await expect(overlay.locator('.gear-modal__name-compact')).toBeHidden();
        await expect(overlay.locator('.gear-modal__spec-grid')).toBeVisible();

        // External link button points directly to Nikon USA product page
        const externalLink = overlay.locator('a.gear-modal__action-btn');
        await expect(externalLink).toHaveAttribute('href', 'https://www.nikonusa.com/p/af-s-nikkor-120-300mm-f28e-fl-ed-sr-vr/20088/overview');

        // Close via Escape key
        await page.keyboard.press('Escape');
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('should responsively show compact product name on mobile viewports', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        // Trigger gear modal via direct store action to verify mobile modal rendering
        await page.evaluate(() => {
            const store = (window as unknown as { __photoStore?: { getState: () => { openGearModal: (gear: unknown) => void } } }).__photoStore;
            // Or click button if visible or test modal styles
        });

        // Test with desktop viewport first, open modal, then resize to mobile
        await page.setViewportSize({ width: 1200, height: 800 });
        const lensBtn = page.locator('.portfolio__season-stat-compact--lens .portfolio__season-stat-btn');
        await lensBtn.click();

        const overlay = page.locator('.gear-modal-overlay');
        await expect(overlay).toBeVisible({ timeout: 3000 });
        await expect(overlay.locator('.gear-modal__name-full')).toBeVisible();
        await expect(overlay.locator('.gear-modal__name-compact')).toBeHidden();

        // Resize down to mobile width (<= 768px)
        await page.setViewportSize({ width: 400, height: 800 });
        await expect(overlay.locator('.gear-modal__name-compact')).toBeVisible();
        await expect(overlay.locator('.gear-modal__name-full')).toBeHidden();
        await expect(overlay.locator('.gear-modal__name-compact')).toHaveText('Nikon 120-300mm f/2.8');

        // Close modal
        await page.keyboard.press('Escape');
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('should open Sigma 50mm Art modal and link to Sigma Photo when navigating to 2017', async ({ page, isMobile }) => {
        if (isMobile) {
            test.skip();
            return;
        }

        // Navigate to year 2017
        await page.goto('/portfolio/2017');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const lensBtn = page.locator('.portfolio__season-stat-compact--lens .portfolio__season-stat-btn');
        await expect(lensBtn).toContainText('50mm');
        await lensBtn.click();

        const overlay = page.locator('.gear-modal-overlay');
        await expect(overlay).toBeVisible({ timeout: 3000 });
        await expect(overlay.locator('.section-label')).toContainText('Sigma 50mm');
        await expect(overlay.locator('.gear-modal__spec-grid')).toBeVisible();

        // External link button points directly to Sigma Photo product page
        const externalLink = overlay.locator('a.gear-modal__action-btn');
        await expect(externalLink).toHaveAttribute('href', 'https://www.sigmaphoto.com/50mm-f1-4-dg-hsm-a');

        // Close via close button
        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });
});
