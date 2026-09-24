import { test, expect } from '@playwright/test';

test.describe('Reduced Motion Accessibility (prefers-reduced-motion: reduce)', () => {
    test.use({ reducedMotion: 'reduce' });

    test('should suppress CSS transitions and animation durations globally', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const styles = await page.evaluate(() => {
            const body = document.body;
            const computed = window.getComputedStyle(body);
            return {
                animationDuration: computed.animationDuration,
                transitionDuration: computed.transitionDuration,
            };
        });

        // Computed style for 0.01ms is '0.00001s' or '1e-05s' in Chromium
        expect(parseFloat(styles.animationDuration)).toBeLessThanOrEqual(0.001);
        expect(parseFloat(styles.transitionDuration)).toBeLessThanOrEqual(0.001);
    });

    test('should disable smooth scrolling when reduced motion is preferred', async ({ page }) => {
        await page.goto('/');

        const scrollBehavior = await page.evaluate(() => {
            return window.getComputedStyle(document.documentElement).scrollBehavior;
        });

        expect(scrollBehavior).toBe('auto');
    });

    test('should render recap slices with opacity transition and no 3D rotation', async ({ page, isMobile }) => {
        if (isMobile) {
            test.skip();
            return;
        }

        await page.goto('/');
        const recapSlice = page.locator('.recap__slice').first();
        await expect(recapSlice).toBeVisible({ timeout: 10000 });

        // In reduced motion mode, slices animate opacity directly without rotateY flip
        const transform = await recapSlice.evaluate((el) => {
            return window.getComputedStyle(el).transform;
        });

        // The transform should either be none or not have a 3D matrix with rotation
        expect(transform === 'none' || !transform.includes('matrix3d')).toBe(true);
    });

    test('should immediately display modal overlays without prolonged motion', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const logoBtn = page.locator('button.nav__logo');
        await logoBtn.click();

        const modal = page.locator('.modal-shell');
        await expect(modal).toBeVisible({ timeout: 3000 });

        // Modal should have near-zero transition duration
        const transitionDuration = await modal.evaluate((el) => {
            return parseFloat(window.getComputedStyle(el).transitionDuration);
        });
        expect(transitionDuration).toBeLessThanOrEqual(0.001);
    });
});
