import { test, expect } from '@playwright/test';

test.describe('SEO & Lighthouse Performance Contract', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should declare charset early in head', async ({ page }) => {
        const html = await page.content();
        const charsetIndex = html.indexOf('charset="UTF-8"');
        expect(charsetIndex).toBeGreaterThan(-1);
        // HTML spec / Lighthouse requires charset within first 1024 bytes
        expect(charsetIndex).toBeLessThan(1024);
    });

    test('should contain valid canonical link', async ({ page }) => {
        const canonical = page.locator('link[rel="canonical"]');
        await expect(canonical).toHaveCount(1);
        const href = await canonical.getAttribute('href');
        expect(href).toMatch(/^https?:\/\/[^/]+\/?$/);
    });

    test('should have exactly one semantic h1 heading', async ({ page }) => {
        const h1 = page.locator('h1');
        await expect(h1).toHaveCount(1);
        const text = await h1.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
    });

    test('should maintain valid heading chain descending from h1 to h2', async ({ page }) => {
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBe(1);

        const h2Count = await page.locator('h2').count();
        expect(h2Count).toBeGreaterThan(0);

        // First non-visually hidden headings in the content feed should be h2 (event titles)
        const firstEventTitle = page.locator('.portfolio__event-teams h2').first();
        await expect(firstEventTitle).toBeVisible();
    });

    test('should contain valid Schema.org JSON-LD structured data', async ({ page }) => {
        const script = page.locator('script[type="application/ld+json"]');
        await expect(script).toHaveCount(1);

        const jsonText = await script.textContent();
        expect(jsonText).toBeTruthy();

        const data = JSON.parse(jsonText!);
        expect(data['@context']).toBe('https://schema.org');
        expect(Array.isArray(data['@graph'])).toBe(true);

        const types = data['@graph'].map((item: { '@type': string }) => item['@type']);
        expect(types).toContain('WebSite');
        expect(types).toContain('Person');
    });

    test('should preload primary web fonts in head', async ({ page }) => {
        const fontPreloads = page.locator('link[rel="preload"][as="font"]');
        const count = await fontPreloads.count();
        expect(count).toBeGreaterThanOrEqual(2);

        const hrefs = await fontPreloads.evaluateAll((links) =>
            links.map((link) => (link as HTMLLinkElement).href)
        );

        const hasBarlow = hrefs.some((h) => h.includes('barlow-condensed'));
        const hasOutfit = hrefs.some((h) => h.includes('outfit'));
        expect(hasBarlow).toBe(true);
        expect(hasOutfit).toBe(true);
    });

    test('should preload root photo index data', async ({ page }) => {
        const dataPreload = page.locator('link[rel="preload"][as="fetch"]');
        await expect(dataPreload).toHaveCount(1);
        const href = await dataPreload.getAttribute('href');
        expect(href).toContain('/data/index.json');
    });

    test('should configure LCP priority attributes on first featured image', async ({ page }) => {
        const firstFeaturedImg = page.locator('.portfolio__event-featured img').first();
        await expect(firstFeaturedImg).toBeVisible({ timeout: 10000 });

        // High priority LCP attributes
        await expect(firstFeaturedImg).toHaveAttribute('loading', 'eager');
        await expect(firstFeaturedImg).toHaveAttribute('fetchpriority', 'high');

        // Explicit width/height to eliminate layout shift (CLS = 0)
        await expect(firstFeaturedImg).toHaveAttribute('width');
        await expect(firstFeaturedImg).toHaveAttribute('height');
    });
});
