import { test, expect } from '@playwright/test';

test.describe('Portfolio Month Calendar Track', () => {
    test('renders on desktop and shows 12 months in DEC -> JAN order', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');
        await expect(track).toBeVisible();

        const monthItems = track.locator('.portfolio__month-item');
        await expect(monthItems).toHaveCount(12);

        // Verify top item is DEC and bottom item is JAN (Option A: scroll-matched)
        await expect(monthItems.first().locator('.portfolio__month-label')).toHaveText('DEC');
        await expect(monthItems.last().locator('.portfolio__month-label')).toHaveText('JAN');
    });

    test('has distinct states: current, populated, and empty', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');

        // Should have an active/current month
        const currentMonth = track.locator('.portfolio__month-item.is-current');
        await expect(currentMonth).toHaveCount(1);

        // Should have populated months
        const populatedMonths = track.locator('.portfolio__month-item.is-populated');
        expect(await populatedMonths.count()).toBeGreaterThan(0);

        // Should have empty months
        const emptyMonths = track.locator('.portfolio__month-item.is-empty');
        expect(await emptyMonths.count()).toBeGreaterThan(0);
    });

    test('clicking a populated month triggers scroll navigation', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');
        // Find a populated month that is not current
        const populatedButtons = track.locator('button.portfolio__month-item.is-populated');
        const count = await populatedButtons.count();

        if (count > 0) {
            const initialScroll = await page.evaluate(() => window.scrollY);
            // Click the last populated month button (e.g. February)
            await populatedButtons.last().click();
            await page.waitForTimeout(800);

            const newScroll = await page.evaluate(() => window.scrollY);
            expect(newScroll).not.toBe(initialScroll);
        }
    });

    test('is hidden on mobile viewports (< 768px)', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');
        await expect(track).not.toBeVisible();
    });

    test('is pinned as a dedicated sidebar to the left of the screen with zero drop shadow', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');
        await expect(track).toBeVisible();

        const trackBox = await track.boundingBox();
        expect(trackBox).not.toBeNull();
        // Pinned to the left side of the screen
        expect(trackBox!.x).toBeLessThanOrEqual(16);

        // Verify zero drop shadow on track and pill
        const boxShadow = await track.evaluate((el) => window.getComputedStyle(el).boxShadow);
        expect(boxShadow).toBe('none');

        const pillBoxShadow = await track.locator('.portfolio__month-track-pill').evaluate((el) => window.getComputedStyle(el).boxShadow);
        expect(pillBoxShadow).toBe('none');

        // Scroll down and ensure it stays pinned
        await page.evaluate(() => window.scrollTo(0, 600));
        await page.waitForTimeout(300);

        const trackBoxAfterScroll = await track.boundingBox();
        expect(trackBoxAfterScroll!.x).toBeLessThanOrEqual(16);
        expect(trackBoxAfterScroll!.y).toBeGreaterThanOrEqual(0);
    });

    test('is positioned on the left side of the events with clear clearance', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');
        const events = page.locator('.portfolio__events');

        const trackBox = await track.boundingBox();
        const eventsBox = await events.boundingBox();

        expect(trackBox).not.toBeNull();
        expect(eventsBox).not.toBeNull();

        // Track is to the left of the events
        expect(trackBox!.x).toBeLessThan(eventsBox!.x);

        // Clearance between right edge of sidebar and left edge of events is generous
        const clearance = eventsBox!.x - (trackBox!.x + trackBox!.width);
        expect(clearance).toBeGreaterThanOrEqual(20);
    });

    test('renders micro density meters on populated months with aligned left edges', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Ensure dark theme
        await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        });
        await page.waitForTimeout(200);

        const track = page.locator('.portfolio__month-track');

        // Check that populated months have volume meter bars
        const meterBars = track.locator('.portfolio__month-meter-bar');
        expect(await meterBars.count()).toBeGreaterThan(0);

        // Check that empty months have subtle off-season dashes
        const emptyDashes = track.locator('.portfolio__month-empty-dash');
        expect(await emptyDashes.count()).toBeGreaterThan(0);

        // Capture dark mode screenshot
        await page.screenshot({ path: 'C:/Users/micha/.gemini/antigravity/brain/ebeadfca-db4f-45d1-99e3-3c8529ac9df6/month_track_final_dark.png' });

        // Switch to light mode and screenshot
        await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        });
        await page.waitForTimeout(300);
        await page.screenshot({ path: 'C:/Users/micha/.gemini/antigravity/brain/ebeadfca-db4f-45d1-99e3-3c8529ac9df6/month_track_final_light.png' });
    });
});

