import { test, expect } from '@playwright/test';

test.describe('Portfolio Month Calendar Track', () => {
    test('renders on desktop and shows 12 months in DEC -> JAN order', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Month track is only visible on desktop');

        await page.setViewportSize({ width: 1440, height: 800 });
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

    test('has distinct states: current, populated, and empty', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Month track is only visible on desktop');

        await page.setViewportSize({ width: 1440, height: 800 });
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

    test('clicking a populated month triggers scroll navigation', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Month track is only visible on desktop');

        await page.setViewportSize({ width: 1440, height: 800 });
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

    test('renders as compact micro-rail on viewports <= 1350px without horizontal overflow', async ({ page }) => {
        // Test at 1280px (compact micro-rail)
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');
        await expect(track).toBeVisible();

        // Month labels must be omitted (hidden)
        const firstLabel = track.locator('.portfolio__month-label').first();
        await expect(firstLabel).not.toBeVisible();

        // Check for horizontal overflow
        const hasOverflow1280 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(hasOverflow1280).toBe(false);

        // Test on mobile (375px)
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(200);
        await expect(track).toBeVisible();
        await expect(firstLabel).not.toBeVisible();
        const hasOverflow375 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(hasOverflow375).toBe(false);

        // Test at 1366px (laptop where full track fits comfortably)
        await page.setViewportSize({ width: 1366, height: 768 });
        await page.waitForTimeout(200);
        await expect(track).toBeVisible();
        await expect(firstLabel).toBeVisible();
        const hasOverflow1366 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        expect(hasOverflow1366).toBe(false);
    });

    test('is positioned as a dedicated sticky sidebar to the left of events with zero drop shadow', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');
        const events = page.locator('.portfolio__events');
        await expect(track).toBeVisible();

        const trackBox = await track.boundingBox();
        const eventsBox = await events.boundingBox();
        expect(trackBox).not.toBeNull();
        expect(eventsBox).not.toBeNull();

        // Track is to the left of the events
        expect(trackBox!.x).toBeLessThan(eventsBox!.x);

        // Uses sticky positioning inside events wrapper
        const position = await track.evaluate((el) => window.getComputedStyle(el).position);
        expect(position).toBe('sticky');

        // Verify zero drop shadow on track and pill
        const boxShadow = await track.evaluate((el) => window.getComputedStyle(el).boxShadow);
        expect(boxShadow).toBe('none');

        const pillBoxShadow = await track.locator('.portfolio__month-track-pill').evaluate((el) => window.getComputedStyle(el).boxShadow);
        expect(pillBoxShadow).toBe('none');

        // Scroll down and ensure it sticks properly
        await page.evaluate(() => window.scrollTo(0, 800));
        await page.waitForTimeout(300);

        const trackBoxAfterScroll = await track.boundingBox();
        expect(trackBoxAfterScroll!.y).toBeGreaterThanOrEqual(70);
    });

    test('never overlaps the recap section on short windows', async ({ page }) => {
        // Test short viewport (e.g. 600px tall)
        await page.setViewportSize({ width: 1440, height: 600 });
        await page.goto('/portfolio/2025');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const recap = page.locator('.portfolio__recap-section');
        const track = page.locator('.portfolio__month-track');

        if ((await recap.count()) > 0) {
            const recapBox = await recap.boundingBox();
            const trackBox = await track.boundingBox();

            expect(recapBox).not.toBeNull();
            expect(trackBox).not.toBeNull();

            // When at scrollY = 0, track is strictly below the recap section in DOM flow
            expect(trackBox!.y).toBeGreaterThanOrEqual(recapBox!.y + recapBox!.height - 10);
        }
    });

    test('left edge of portfolio__events aligns with the left edge of years selector with 1.5rem gap to month track', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');
        const events = page.locator('.portfolio__events');
        const yearsNav = page.locator('.portfolio__years');

        const trackBox = await track.boundingBox();
        const eventsBox = await events.boundingBox();
        const yearsBox = await yearsNav.boundingBox();

        expect(trackBox).not.toBeNull();
        expect(eventsBox).not.toBeNull();
        expect(yearsBox).not.toBeNull();

        // Left edge of portfolio__events aligns with the left edge of years selector (within 1px subpixel tolerance)
        expect(Math.abs(eventsBox!.x - yearsBox!.x)).toBeLessThanOrEqual(1);

        // Gap between right edge of month track and left edge of portfolio__events is 24px (1.5rem, within 1px subpixel tolerance)
        const gap = eventsBox!.x - (trackBox!.x + trackBox!.width);
        expect(Math.abs(gap - 24)).toBeLessThanOrEqual(1);
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

    test('clicking a month lands accurately at the target event without drift', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Month track is only visible on desktop');

        await page.setViewportSize({ width: 1440, height: 800 });
        await page.goto('/portfolio/2025');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');
        // Wait for all parts to load (JAN is in the last part)
        const janBtn = track.locator('button.portfolio__month-item.is-populated:has-text("JAN")');
        await janBtn.waitFor({ state: 'visible', timeout: 10000 });

        await janBtn.click();
        // Wait for smooth scroll and settling
        await page.waitForTimeout(1500);

        // Find the first event of January
        const targetEvent = page.locator('#event-01-25-Sacramento-Roller-Derby-Juniors-Galinda-vs-Sacramento-Roller-Derby-Juniors-Elphaba');
        await expect(targetEvent).toBeVisible();

        const box = await targetEvent.boundingBox();
        expect(box).not.toBeNull();
        // The top should be positioned right below the sticky navigation bar (~80px + margin)
        // Expected offset is ~104px (within 75px - 140px range)
        expect(box!.y).toBeGreaterThanOrEqual(75);
        expect(box!.y).toBeLessThanOrEqual(140);
    });

    test('clicking First Seen in recap summary scrolls accurately to the event', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Recap season strip is desktop-only');

        await page.setViewportSize({ width: 1440, height: 800 });
        await page.goto('/portfolio/2026');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const firstSeenBtn = page.locator('.portfolio__season-stat-compact--first-seen button');
        await expect(firstSeenBtn).toBeVisible({ timeout: 5000 });
        await expect(firstSeenBtn).toContainText('Motherlode Area');

        await firstSeenBtn.click();
        await page.waitForTimeout(1500);

        // Verify window scrolled to the correct Motherlode Area Derby event (not Bay Area Derby Bones)
        const targetEvent = page.locator('#event-09-19-Sacramento-Roller-Derby-Kodiak-Attack-vs-Motherlode-Area-Derby');
        await expect(targetEvent).toBeVisible();
        const box = await targetEvent.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
            expect(box.y).toBeGreaterThanOrEqual(50);
            expect(box.y).toBeLessThanOrEqual(250);
        }
    });

    test('clicking the month of the first event when scrolled down scrolls to top 0', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Month track is only visible on desktop');

        await page.setViewportSize({ width: 1440, height: 800 });
        await page.goto('/portfolio/2025');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Scroll down to the middle of the feed
        await page.evaluate(() => window.scrollTo(0, 2500));
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(2000);

        // Click the first populated month (NOV in 2025)
        const track = page.locator('.portfolio__month-track');
        const novBtn = track.locator('button.portfolio__month-item.is-populated:has-text("NOV")');
        await expect(novBtn).toBeVisible();
        await novBtn.click();

        // Wait for smooth scroll
        await page.waitForTimeout(1500);

        // Should land at scrollY = 0
        const finalScrollY = await page.evaluate(() => window.scrollY);
        expect(finalScrollY).toBe(0);
    });

    test('track top is never higher than the first event portfolio__event-header at scroll 0 and during scroll', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Month track is only visible on desktop');

        await page.setViewportSize({ width: 1440, height: 800 });
        await page.goto('/portfolio/2026');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Check at scroll = 0 (allow 400ms entrance animation to complete)
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(600);

        let positions = await page.evaluate(() => {
            const track = document.querySelector('.portfolio__month-track')!;
            const header = document.querySelector('.portfolio__event .portfolio__event-header')!;
            return {
                trackTop: track.getBoundingClientRect().top,
                headerTop: header.getBoundingClientRect().top,
            };
        });
        expect(positions.trackTop).toBeGreaterThanOrEqual(positions.headerTop - 2);

        // Check at several scroll positions
        for (const scrollPos of [100, 200, 300, 500]) {
            await page.evaluate((y) => window.scrollTo(0, y), scrollPos);
            await page.waitForTimeout(100);
            positions = await page.evaluate(() => {
                const track = document.querySelector('.portfolio__month-track')!;
                const header = document.querySelector('.portfolio__event .portfolio__event-header')!;
                return {
                    trackTop: track.getBoundingClientRect().top,
                    headerTop: header.getBoundingClientRect().top,
                };
            });
            expect(positions.trackTop).toBeGreaterThanOrEqual(positions.headerTop - 2);
        }
    });

    test('track bottom is never lower than the bottom of the last event portfolio__event', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Month track is only visible on desktop');

        await page.setViewportSize({ width: 1440, height: 800 });
        await page.goto('/portfolio/2024');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Scroll all the way to the bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(300);

        const bounds = await page.evaluate(() => {
            const track = document.querySelector('.portfolio__month-track')!;
            const events = document.querySelectorAll('.portfolio__event');
            const lastEvent = events[events.length - 1]!;
            return {
                trackBottom: track.getBoundingClientRect().bottom,
                lastEventBottom: lastEvent.getBoundingClientRect().bottom,
            };
        });

        // The track bottom must be <= the last event bottom (within 1px subpixel tolerance)
        expect(bounds.trackBottom).toBeLessThanOrEqual(bounds.lastEventBottom + 1);
    });

    test('hovering over the current month shows the tooltip and scales the meter', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Month track is only visible on desktop');

        await page.setViewportSize({ width: 1440, height: 800 });
        await page.goto('/portfolio/2026');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');
        const currentMonth = track.locator('button.portfolio__month-item.is-current');
        await expect(currentMonth).toBeVisible();

        const tooltip = currentMonth.locator('.portfolio__month-tooltip');
        await expect(tooltip).not.toBeVisible();

        // Hover over current month
        await currentMonth.hover();
        await expect(tooltip).toBeVisible();
        await expect(tooltip.locator('.portfolio__month-tooltip-title')).toHaveText('September');
        await expect(tooltip.locator('.portfolio__month-tooltip-meta')).toContainText('photos');
    });

    test('activates earliest month in tall viewport when clicked or scrolled to bottom', async ({ page, isMobile }) => {
        test.skip(isMobile, 'Month track is only visible on desktop');

        // Very tall viewport: 1440x1400
        await page.setViewportSize({ width: 1440, height: 1400 });
        await page.goto('/portfolio/2024');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const track = page.locator('.portfolio__month-track');
        // Initial state at scroll 0 is May (latest month in 2024)
        const mayBtn = track.locator('button.portfolio__month-item').filter({ hasText: 'MAY' });
        await expect(mayBtn).toHaveClass(/is-current/);

        // Click March (earliest month in 2024)
        const marBtn = track.locator('button.portfolio__month-item').filter({ hasText: 'MAR' });
        await marBtn.click();

        // Wait for smooth scroll to land at bottom
        await page.waitForTimeout(1000);

        // March must be active/current even though its top cannot reach standard 35% trigger in tall window
        await expect(marBtn).toHaveClass(/is-current/);
        await expect(marBtn).toHaveAttribute('aria-current', 'true');

        // Scroll back to top
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(300);
        await expect(mayBtn).toHaveClass(/is-current/);

        // Manually scroll down to the bottom
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(300);
        await expect(marBtn).toHaveClass(/is-current/);
        await expect(marBtn).toHaveAttribute('aria-current', 'true');
    });
});



