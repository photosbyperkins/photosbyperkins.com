import { test, expect } from '@playwright/test';

test.describe('Gear Deep Links & Dedicated Gear Pages', () => {
    test('should cold-load direct deep link to camera gear (Nikon Z8)', async ({ page }) => {
        await page.goto('/portfolio/gear/nikon-z8');

        // Verify URL preserved
        await expect(page).toHaveURL(/\/portfolio\/gear\/nikon-z8/);

        // Header and info card
        const header = page.locator('.portfolio__gear-header');
        await expect(header).toBeVisible({ timeout: 10000 });

        const infoCard = header.locator('.gear-info-card');
        await expect(infoCard).toBeVisible();

        // Check badges
        await expect(infoCard.locator('.gear-info-card__badge--type')).toHaveText('camera');
        await expect(infoCard.locator('.gear-info-card__badge--brand')).toHaveText('Nikon');

        // Check title
        await expect(infoCard.locator('.gear-info-card__title')).toContainText('Nikon ℤ8');

        // Check spec grid
        const specGrid = infoCard.locator('.gear-modal__spec-grid');
        await expect(specGrid).toBeVisible();
        await expect(specGrid.locator('.gear-modal__spec-item').first()).toBeVisible();

        // Check official link
        const officialLink = infoCard.locator('a.gear-info-card__official-link');
        await expect(officialLink).toBeVisible();
        await expect(officialLink).toHaveAttribute('href', 'https://www.nikonusa.com/p/z-8/1695');

        // Check active filter pill in navigation bar
        const activeFilter = page.locator('.portfolio__active-filter');
        await expect(activeFilter).toBeVisible();
        await expect(activeFilter).toContainText('Nikon ℤ8');
    });

    test('should cold-load direct deep link to lens gear (Nikon 120-300mm)', async ({ page }) => {
        await page.goto('/portfolio/gear/nikon-120-300mm');

        await expect(page).toHaveURL(/\/portfolio\/gear\/nikon-120-300mm/);

        const header = page.locator('.portfolio__gear-header');
        await expect(header).toBeVisible({ timeout: 10000 });

        const infoCard = header.locator('.gear-info-card');
        await expect(infoCard.locator('.gear-info-card__badge--type')).toHaveText('lens');
        await expect(infoCard.locator('.gear-info-card__badge--brand')).toHaveText('Nikon');
        await expect(infoCard.locator('.gear-info-card__title')).toContainText('120-300mm');
    });

    test('should render multi-year event list and year dividers for gear', async ({ page }) => {
        await page.goto('/portfolio/gear/nikon-z8');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Verify events render
        const eventCount = await page.locator('.portfolio__event').count();
        expect(eventCount).toBeGreaterThan(0);

        // Verify year dividers exist in multi-year view
        const yearDividers = page.locator('.portfolio__year-divider');
        await expect(yearDividers.first()).toBeVisible({ timeout: 5000 });
    });

    test('should dismiss gear filter and restore standard portfolio view', async ({ page }) => {
        await page.goto('/portfolio/gear/nikon-z8');
        const header = page.locator('.portfolio__gear-header');
        await expect(header).toBeVisible({ timeout: 10000 });

        const activeFilter = page.locator('.portfolio__active-filter');
        await expect(activeFilter).toBeVisible();
        await activeFilter.click();

        // Gear header should hide
        await expect(header).not.toBeVisible({ timeout: 5000 });
        // Active filter should disappear
        await expect(activeFilter).not.toBeVisible();
    });

    test('should support browser back and forward navigation for gear deep links', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Navigate to gear page
        await page.goto('/portfolio/gear/nikon-z8');
        const header = page.locator('.portfolio__gear-header');
        await expect(header).toBeVisible({ timeout: 10000 });

        // Navigate back
        await page.goBack();
        await expect(header).not.toBeVisible({ timeout: 5000 });

        // Navigate forward
        await page.goForward();
        await expect(header).toBeVisible({ timeout: 5000 });
        await expect(page).toHaveURL(/\/portfolio\/gear\/nikon-z8/);
    });
});
