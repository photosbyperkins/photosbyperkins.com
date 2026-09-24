import { test, expect } from '@playwright/test';

test.describe('Network & Intent-Based Prefetching', () => {
    test('should not eagerly fetch all historical years on initial mount', async ({ page }) => {
        const fetchedYears: string[] = [];

        page.on('request', (req) => {
            const url = req.url();
            const match = url.match(/\/data\/years\/(\d{4})\.json/);
            if (match) {
                fetchedYears.push(match[1]);
            }
        });

        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Wait 1 second after initial render
        await page.waitForTimeout(1000);

        // Should have fetched the active year (e.g. 2026), but NOT older historical years like 2020 or 2016
        expect(fetchedYears.length).toBeLessThanOrEqual(2);
        expect(fetchedYears).not.toContain('2019');
        expect(fetchedYears).not.toContain('2016');
    });

    test('should trigger prefetch when hovering over a year tab', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        // Listen for requests after initial load
        const prefetchedUrls: string[] = [];
        page.on('request', (req) => {
            if (req.url().includes('/data/years/')) {
                prefetchedUrls.push(req.url());
            }
        });

        // Hover over the 2024 year tab
        const tab2024 = page.locator('.portfolio__years a[aria-label="Season 2024"]');
        if ((await tab2024.count()) > 0) {
            await tab2024.hover();
            // Wait for fetch to initiate
            await page.waitForTimeout(500);

            const fetched2024 = prefetchedUrls.some((u) => u.includes('2024.json'));
            expect(fetched2024).toBe(true);
        }
    });

    test('should trigger prefetch when keyboard focusing a year tab', async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });

        const prefetchedUrls: string[] = [];
        page.on('request', (req) => {
            if (req.url().includes('/data/years/')) {
                prefetchedUrls.push(req.url());
            }
        });

        const tab2025 = page.locator('.portfolio__years a[aria-label="Season 2025"]');
        if ((await tab2025.count()) > 0) {
            await tab2025.focus();
            await page.waitForTimeout(500);

            const fetched2025 = prefetchedUrls.some((u) => u.includes('2025.json'));
            expect(fetched2025).toBe(true);
        }
    });
});
