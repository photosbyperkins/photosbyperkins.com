import { test, expect } from '@playwright/test';

/**
 * Build a #photos= hash from an array of basenames using base64url encoding.
 * Mirrors src/utils/favoritesUrl.ts → encodeFavorites().
 */
function encodePhotosHash(basenames: string[]): string {
    const raw = basenames.join(',');
    const b64 = Buffer.from(raw).toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Use real basenames from the first 2025 album
const TEST_BASENAMES = ['photo_001.jpg', 'photo_002.jpg', 'photo_003.jpg'];
const TEST_HASH = encodePhotosHash(TEST_BASENAMES);

test.describe('Shared Favorites Panel', () => {
    test('should open the panel when URL has #photos= hash', async ({ page }) => {
        await page.goto(`/portfolio/2025#photos=${TEST_HASH}`);

        // Wait for the shared favorites overlay to appear
        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).toBeVisible({ timeout: 15000 });

        // Check header text
        const header = overlay.locator('.section-label');
        await expect(header).toContainText('SHARED');
        await expect(header).toContainText('FAVORITES');
    });

    test('should display the correct number of shared photos', async ({ page }) => {
        await page.goto(`/portfolio/2025#photos=${TEST_HASH}`);

        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).toBeVisible({ timeout: 15000 });

        // The grid should contain exactly 3 photos
        const gridItems = overlay.locator('.portfolio__grid-item');
        await expect(gridItems).toHaveCount(TEST_BASENAMES.length, { timeout: 10000 });
    });

    test('should close the panel via close button', async ({ page }) => {
        await page.goto(`/portfolio/2025#photos=${TEST_HASH}`);

        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).toBeVisible({ timeout: 15000 });

        // Click the close button
        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();

        // Panel should disappear
        await expect(overlay).not.toBeVisible({ timeout: 3000 });

        // URL hash should be cleared
        const url = page.url();
        expect(url).not.toContain('#photos=');
    });

    test('should close the panel via Escape key', async ({ page }) => {
        await page.goto(`/portfolio/2025#photos=${TEST_HASH}`);

        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).toBeVisible({ timeout: 15000 });

        await page.keyboard.press('Escape');
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('should lock body scroll when panel is open', async ({ page }) => {
        await page.goto(`/portfolio/2025#photos=${TEST_HASH}`);

        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).toBeVisible({ timeout: 15000 });

        const overflow = await page.evaluate(() => document.body.style.overflow);
        expect(overflow).toBe('hidden');
    });

    test('should restore body scroll after panel closes', async ({ page }) => {
        await page.goto(`/portfolio/2025#photos=${TEST_HASH}`);

        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).toBeVisible({ timeout: 15000 });

        // Close the panel via the close button
        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeVisible({ timeout: 5000 });

        const overflow = await page.evaluate(() => document.body.style.overflow);
        expect(overflow).toBe('');
    });

    test('should add shared photos to local favorites', async ({ page }) => {
        // Clear any existing favorites
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());

        await page.goto(`/portfolio/2025#photos=${TEST_HASH}`);

        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).toBeVisible({ timeout: 15000 });

        // Wait for the grid to load
        const gridItems = overlay.locator('.portfolio__grid-item');
        await expect(gridItems).toHaveCount(TEST_BASENAMES.length, { timeout: 10000 });

        // Click "Add to Your Favorites"
        const addBtn = overlay.locator('button.is-cta');
        await expect(addBtn).toContainText('Add to Your Favorites');
        await addBtn.click();

        // Button should show "Added" state
        await expect(addBtn).toContainText('Added');
        await expect(addBtn).toHaveClass(/is-done/);
        await expect(addBtn).toBeDisabled();

        // Verify favorites in localStorage
        const favCount = await page.evaluate(() => {
            const data = localStorage.getItem('portfolio-favorites');
            if (!data) return 0;
            try {
                return JSON.parse(data)?.state?.favorites?.length || 0;
            } catch {
                return 0;
            }
        });
        expect(favCount).toBe(TEST_BASENAMES.length);
    });

    test('should open the lightbox when clicking a shared photo', async ({ page }) => {
        await page.goto(`/portfolio/2025#photos=${TEST_HASH}`);

        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).toBeVisible({ timeout: 15000 });

        // Wait for photos to load then click the first one
        const firstPhoto = overlay.locator('.portfolio__grid-item').first();
        await firstPhoto.waitFor({ timeout: 10000 });
        await firstPhoto.click();

        // Lightbox should open
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        // Shared favorites panel should be hidden while lightbox is open
        await expect(overlay).toBeHidden();
    });

    test('should show panel again after lightbox closes', async ({ page }) => {
        await page.goto(`/portfolio/2025#photos=${TEST_HASH}`);

        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).toBeVisible({ timeout: 15000 });

        // Open lightbox
        const firstPhoto = overlay.locator('.portfolio__grid-item').first();
        await firstPhoto.waitFor({ timeout: 10000 });
        await firstPhoto.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        // Close lightbox via its own close button to avoid Escape cascading to the panel
        const closeBtn = lightbox.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(lightbox).not.toBeVisible({ timeout: 5000 });

        // Panel should reappear
        await expect(overlay).toBeVisible({ timeout: 5000 });
    });

    test('should work on any portfolio tab, not just favorites', async ({ page }) => {
        // Navigate to a specific year tab with shared favorites hash
        await page.goto(`/portfolio/2024#photos=${TEST_HASH}`);

        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).toBeVisible({ timeout: 15000 });

        // Verify photos resolved correctly
        const gridItems = overlay.locator('.portfolio__grid-item');
        await expect(gridItems).toHaveCount(TEST_BASENAMES.length, { timeout: 10000 });
    });

    test('should show footer bar with action buttons', async ({ page }) => {
        await page.goto(`/portfolio/2025#photos=${TEST_HASH}`);

        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).toBeVisible({ timeout: 15000 });

        // Footer bar should be visible
        const footer = overlay.locator('.shared-favorites-overlay__footer-bar');
        await expect(footer).toBeVisible();

        // "Add to Your Favorites" CTA button should be present
        const ctaBtn = footer.locator('button.is-cta');
        await expect(ctaBtn).toBeVisible();
        await expect(ctaBtn).toContainText('Add to Your Favorites');
    });

    test('should handle invalid hash gracefully', async ({ page }) => {
        await page.goto('/portfolio/2025#photos=INVALID_HASH_DATA');

        // Should not crash — panel should not appear since no photos resolve
        await page.waitForTimeout(3000);
        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).not.toBeVisible();
    });

    test('should handle empty hash gracefully', async ({ page }) => {
        await page.goto('/portfolio/2025#photos=');

        // Should not crash — panel should not appear
        await page.waitForTimeout(3000);
        const overlay = page.locator('[role="dialog"][aria-label="Shared Favorites"]');
        await expect(overlay).not.toBeVisible();
    });
});
