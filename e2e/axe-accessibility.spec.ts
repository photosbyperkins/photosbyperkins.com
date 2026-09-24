import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Automated WCAG 2.1 AA Accessibility (axe-core)', () => {
    test('homepage should have zero WCAG 2.1 AA critical or serious violations', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
        // Allow initial theme CSS color transition (150ms) to settle
        await page.waitForTimeout(300);

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalOrSerious = results.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        if (criticalOrSerious.length > 0) {
            console.error('Homepage WCAG Violations:', JSON.stringify(criticalOrSerious, null, 2));
        }

        expect(criticalOrSerious).toEqual([]);
    });

    test('lightbox view should have zero WCAG 2.1 AA critical or serious violations', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });
        // Allow framer-motion entrance animation to reach full opacity
        await page.waitForTimeout(500);

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalOrSerious = results.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        if (criticalOrSerious.length > 0) {
            console.error('Lightbox WCAG Violations:', JSON.stringify(criticalOrSerious, null, 2));
        }

        expect(criticalOrSerious).toEqual([]);
    });

    test('about modal should have zero WCAG 2.1 AA critical or serious violations', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const logoBtn = page.locator('button.nav__logo');
        await logoBtn.click();

        const modal = page.locator('[role="dialog"][aria-label="About the photographer"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
        // Allow framer-motion entrance animation to reach full opacity
        await page.waitForTimeout(500);

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalOrSerious = results.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        if (criticalOrSerious.length > 0) {
            console.error('About Modal WCAG Violations:', JSON.stringify(criticalOrSerious, null, 2));
        }

        expect(criticalOrSerious).toEqual([]);
    });

    test('search view should have zero WCAG 2.1 AA critical or serious violations', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const searchBtn = page.locator('button.portfolio__global-floating-search, button[aria-label="Open Search"]').first();
        await expect(searchBtn).toBeVisible({ timeout: 5000 });
        await searchBtn.click();

        const searchOverlay = page.locator('.portfolio__global-search-overlay');
        await expect(searchOverlay).toBeVisible({ timeout: 5000 });
        // Allow framer-motion entrance animation to reach full opacity
        await page.waitForTimeout(500);

        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        const criticalOrSerious = results.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        if (criticalOrSerious.length > 0) {
            console.error('Search WCAG Violations:', JSON.stringify(criticalOrSerious, null, 2));
        }

        expect(criticalOrSerious).toEqual([]);
    });
});
