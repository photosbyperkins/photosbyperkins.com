import { test, expect } from '@playwright/test';

test.describe('Favorite Camera & Lens Gear Pages', () => {
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

    test('should open Nikon Z 8 gear page and link to Nikon USA when clicking favorite camera', async ({ page, isMobile }) => {
        if (isMobile) {
            test.skip();
            return;
        }

        const cameraBtn = page.locator('.portfolio__season-stat-compact--camera .portfolio__season-stat-btn');
        await cameraBtn.click();

        await expect(page).toHaveURL(/\/portfolio\/gear\/nikon-z8/);
        const header = page.locator('.portfolio__gear-header');
        await expect(header).toBeVisible({ timeout: 5000 });
        await expect(header.locator('.gear-info-card__title')).toContainText('Nikon');
        await expect(header.locator('.gear-modal__spec-grid')).toBeVisible();

        // External link button points directly to Nikon USA product page
        const externalLink = header.locator('a.gear-info-card__official-link');
        await expect(externalLink).toHaveAttribute('href', 'https://www.nikonusa.com/p/z-8/1695');

        // Clear filter via active filter pill in navigation
        const activeFilter = page.locator('.portfolio__active-filter');
        await activeFilter.click();
        await expect(header).not.toBeVisible({ timeout: 3000 });
    });

    test('should open Nikon 120-300mm gear page when clicking favorite lens on 2026', async ({ page, isMobile }) => {
        if (isMobile) {
            test.skip();
            return;
        }

        const lensBtn = page.locator('.portfolio__season-stat-compact--lens .portfolio__season-stat-btn');
        await lensBtn.click();

        await expect(page).toHaveURL(/\/portfolio\/gear\/nikon-120-300mm/);
        const header = page.locator('.portfolio__gear-header');
        await expect(header).toBeVisible({ timeout: 5000 });
        await expect(header.locator('.gear-info-card__title')).toContainText('120-300mm');
        await expect(header.locator('.gear-modal__name-full')).toBeVisible();
        await expect(header.locator('.gear-modal__name-compact')).toBeHidden();
        await expect(header.locator('.gear-modal__spec-grid')).toBeVisible();

        // External link button points directly to Nikon USA product page
        const externalLink = header.locator('a.gear-info-card__official-link');
        await expect(externalLink).toHaveAttribute('href', 'https://www.nikonusa.com/p/af-s-nikkor-120-300mm-f28e-fl-ed-sr-vr/20088/overview');

        // Clear filter via active filter pill in navigation
        const activeFilter = page.locator('.portfolio__active-filter');
        await activeFilter.click();
        await expect(header).not.toBeVisible({ timeout: 3000 });
    });

    test('should responsively show compact product name on mobile viewports', async ({ page, isMobile }) => {
        if (isMobile) {
            test.skip();
            return;
        }

        // Test with desktop viewport first, navigate to gear page
        await page.setViewportSize({ width: 1200, height: 800 });
        const lensBtn = page.locator('.portfolio__season-stat-compact--lens .portfolio__season-stat-btn');
        if ((await lensBtn.count()) === 0) return;
        await lensBtn.click();

        const header = page.locator('.portfolio__gear-header');
        await expect(header).toBeVisible({ timeout: 5000 });
        await expect(header.locator('.gear-modal__name-full')).toBeVisible();
        await expect(header.locator('.gear-modal__name-compact')).toBeHidden();

        // Resize down to mobile width (<= 768px)
        await page.setViewportSize({ width: 400, height: 800 });
        await expect(header.locator('.gear-modal__name-compact')).toBeVisible();
        await expect(header.locator('.gear-modal__name-full')).toBeHidden();
        await expect(header.locator('.gear-modal__name-compact')).toHaveText('Nikon 120-300mm f/2.8');

        // Clear filter
        const activeFilter = page.locator('.portfolio__active-filter');
        await activeFilter.click();
        await expect(header).not.toBeVisible({ timeout: 3000 });
    });

    test('should open Sigma 50mm Art gear page and link to Sigma Photo when navigating to 2017', async ({ page, isMobile }) => {
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

        await expect(page).toHaveURL(/\/portfolio\/gear\/sigma-50mm-art/);
        const header = page.locator('.portfolio__gear-header');
        await expect(header).toBeVisible({ timeout: 5000 });
        await expect(header.locator('.gear-info-card__title')).toContainText('Sigma 50mm');
        await expect(header.locator('.gear-modal__spec-grid')).toBeVisible();

        // External link button points directly to Sigma Photo product page
        const externalLink = header.locator('a.gear-info-card__official-link');
        await expect(externalLink).toHaveAttribute('href', 'https://www.sigmaphoto.com/50mm-f1-4-dg-hsm-a');

        // Clear filter via active filter pill in navigation
        const activeFilter = page.locator('.portfolio__active-filter');
        await activeFilter.click();
        await expect(header).not.toBeVisible({ timeout: 3000 });
    });
});
