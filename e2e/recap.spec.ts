import { test, expect } from '@playwright/test';

test.describe('Recap Section', () => {
    test('should render the recap section on the homepage', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        // Recap may take time to load sprites
        await expect(recap).toBeVisible({ timeout: 10000 });
    });

    test('should display recap slices in a grid', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        const slices = recap.locator('.recap__slice');
        const count = await slices.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should display recap slices with sprite backgrounds', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        // Wait for sprite to load (slices animate in)
        await page.waitForTimeout(2000);

        const slice = recap.locator('.recap__sprite-slice').first();
        const bgImage = await slice.evaluate((el) => getComputedStyle(el).backgroundImage);
        expect(bgImage).toContain('sprite.webp');
    });

    test('should show overlay text on recap', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        const overlayText = recap.locator('.recap__overlay-text');
        if ((await overlayText.count()) > 0) {
            await expect(overlayText).toBeVisible();
            const text = await overlayText.textContent();
            // Should display the year number
            expect(text).toMatch(/\d{4}/);
        }
    });

    test('should open lightbox when clicking a recap slice', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        // Wait for slices to animate in
        await page.waitForTimeout(2000);

        const slice = recap.locator('.recap__slice').first();
        await slice.click();
        await page.waitForTimeout(1000);

        // Lightbox should open (the slice click sets sharedPhoto which triggers lightbox)
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });
    });

    test('should open exactly the matching event and photo when clicking recap slices', async ({ page }) => {
        const yearRecapEvents: Record<string, Array<{ eventName: string; photoIndex: number }>> = {};

        page.on('response', async (response) => {
            const match = response.url().match(/\/data\/years\/(\d{4})\.json/);
            if (match && response.status() === 200) {
                try {
                    const data = await response.json();
                    if (data.recapEvents && Array.isArray(data.recapEvents)) {
                        yearRecapEvents[match[1]] = data.recapEvents;
                    }
                } catch {
                    // Ignore non-json responses
                }
            }
        });

        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const activeYearTab = page.locator('.portfolio__years a.active');
        const activeYear = (await activeYearTab.textContent())?.trim() || '2026';

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;
        await expect(recap).toBeVisible({ timeout: 10000 });

        // Wait for slices and sprite to load
        await page.waitForTimeout(2000);

        const slices = recap.locator('.recap__slice');
        const count = await slices.count();
        expect(count).toBeGreaterThan(0);

        let recapEvents = yearRecapEvents[activeYear];
        if (!recapEvents || recapEvents.length === 0) {
            recapEvents = await page.evaluate(async (yr) => {
                try {
                    const res = await fetch(`/data/years/${yr}.json`);
                    const data = await res.json();
                    return data.recapEvents;
                } catch {
                    return [];
                }
            }, activeYear);
        }

        if (recapEvents && recapEvents.length > 0) {
            // Test first slice (slice index 1 -> recapEvents[0])
            const firstSlice = slices.first();
            const firstLabel = await firstSlice.getAttribute('aria-label');
            const match = firstLabel?.match(/View recap image (\d+)/);
            if (match) {
                const sliceNum = parseInt(match[1], 10);
                const expectedEvent = recapEvents[sliceNum - 1];

                await firstSlice.click();
                const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
                await expect(lightbox).toBeVisible({ timeout: 10000 });

                // Verify slide image alt text contains the exact event and 1-based photo index
                const slideImg = lightbox.locator('.portfolio__lightbox-slide--current img');
                await expect(slideImg).toBeVisible({ timeout: 10000 });
                const altText = await slideImg.getAttribute('alt');
                expect(altText).toContain(expectedEvent.eventName);
                expect(altText).toContain(`Photo ${expectedEvent.photoIndex + 1}`);

                // Close lightbox
                await page.keyboard.press('Escape');
                await expect(lightbox).not.toBeVisible({ timeout: 5000 });
                await page.waitForTimeout(500);
            }

            // Test a middle slice if multiple slices exist to verify alignment across strip
            if (count > 2) {
                const midIdx = Math.floor(count / 2);
                const midSlice = slices.nth(midIdx);
                const midLabel = await midSlice.getAttribute('aria-label');
                const midMatch = midLabel?.match(/View recap image (\d+)/);
                if (midMatch) {
                    const sliceNum = parseInt(midMatch[1], 10);
                    const expectedEvent = recapEvents[sliceNum - 1];

                    await midSlice.click();
                    const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
                    await expect(lightbox).toBeVisible({ timeout: 10000 });

                    const slideImg = lightbox.locator('.portfolio__lightbox-slide--current img');
                    await expect(slideImg).toBeVisible({ timeout: 10000 });
                    const altText = await slideImg.getAttribute('alt');
                    expect(altText).toContain(expectedEvent.eventName);
                    expect(altText).toContain(`Photo ${expectedEvent.photoIndex + 1}`);

                    await page.keyboard.press('Escape');
                    await expect(lightbox).not.toBeVisible({ timeout: 5000 });
                }
            }
        }
    });

    test('should verify recap sprite response and slice geometry', async ({ page }) => {
        let spriteLoaded = false;
        let spriteStatus = 0;

        page.on('response', (response) => {
            if (response.url().includes('/recap/') && response.url().includes('sprite.webp')) {
                spriteLoaded = true;
                spriteStatus = response.status();
            }
        });

        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;
        await expect(recap).toBeVisible({ timeout: 10000 });

        // Wait for sprite load
        await page.waitForTimeout(2000);

        // Verify HTTP response was successful
        expect(spriteLoaded).toBe(true);
        expect(spriteStatus).toBe(200);

        // Verify sprite-slice CSS background positioning
        const slices = recap.locator('.recap__sprite-slice');
        const count = await slices.count();
        if (count > 1) {
            const firstBgPos = await slices.first().evaluate((el) => getComputedStyle(el).backgroundPosition);
            expect(firstBgPos).toContain('0%');

            const lastBgPos = await slices.last().evaluate((el) => getComputedStyle(el).backgroundPosition);
            expect(lastBgPos).toContain('100%');
        }
    });

    test('should render recap for different years', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Navigate to a different year
        const yearLinks = page.locator('.portfolio__years a:not(.portfolio__search-tab):not(.portfolio__active-filter)');
        const count = await yearLinks.count();
        if (count < 2) return;

        await yearLinks.nth(1).click();
        await page.waitForTimeout(2000);

        // Recap should still render for the new year
        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        const slices = recap.locator('.recap__slice');
        const sliceCount = await slices.count();
        expect(sliceCount).toBeGreaterThanOrEqual(1);
    });

    test('should have aria-labels on recap slices', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.recap').first();
        if ((await recap.count()) === 0) return;

        await expect(recap).toBeVisible({ timeout: 10000 });

        const slice = recap.locator('.recap__slice').first();
        const ariaLabel = await slice.getAttribute('aria-label');
        expect(ariaLabel).toContain('View recap image');
    });
});
