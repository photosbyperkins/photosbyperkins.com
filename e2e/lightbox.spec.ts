import { test, expect } from '@playwright/test';

test.describe('Lightbox', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for at least one event to render
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should open lightbox when clicking a photo', async ({ page }) => {
        // Click on a grid item or featured item
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });
    });

    test('should close lightbox with close button', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const closeBtn = lightbox.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });
    });

    test('should close lightbox with Escape key', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        await page.keyboard.press('Escape');
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });
    });

    test('should navigate with arrow keys', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(400);

        // Get initial counter text
        const counter = lightbox.locator('.portfolio__lightbox-scrubber-counter');
        const initialText = await counter.textContent();

        // Navigate right
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);
        const afterRightText = await counter.textContent();

        // Counter should have changed
        expect(afterRightText).not.toBe(initialText);
    });

    test('should have correct ARIA attributes', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });
        await expect(lightbox).toHaveAttribute('aria-modal', 'true');
    });

    test('should display download button in lightbox header', async ({ page }) => {
        // Desktop Chrome has no navigator.share, so download button should show
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const downloadBtn = lightbox.locator('button[aria-label="Download"]');
        await expect(downloadBtn).toBeVisible();
    });

    test('should arrange action group horizontally in consolidated top bar', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const actionGroup = lightbox.locator('.portfolio__lightbox-action-group');
        await expect(actionGroup).toBeVisible();

        const flexDirection = await actionGroup.evaluate((el) => window.getComputedStyle(el).flexDirection);
        expect(flexDirection).toBe('row');

        // Verify top-bar row alignment: first action button, EXIF data display, and close button share the same top edge
        const firstAction = actionGroup.locator('button').first();
        const closeBtn = lightbox.locator('button[aria-label="Close"]');
        const dataDisplay = lightbox.locator('.portfolio__lightbox-data-display').first();

        const [actionBox, closeBox] = await Promise.all([firstAction.boundingBox(), closeBtn.boundingBox()]);

        expect(actionBox).not.toBeNull();
        expect(closeBox).not.toBeNull();
        expect(Math.abs(actionBox!.y - closeBox!.y)).toBeLessThanOrEqual(2);

        if (await dataDisplay.isVisible()) {
            const dataBox = await dataDisplay.boundingBox();
            expect(dataBox).not.toBeNull();
            expect(Math.abs(dataBox!.y - actionBox!.y)).toBeLessThanOrEqual(2);
        }
    });

    test('should display scrubber with photo counter', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        // Scrubber should be visible
        const scrubber = lightbox.locator('.portfolio__lightbox-scrubber');
        await expect(scrubber).toBeVisible();

        // Counter should show "N / M" format
        const counter = lightbox.locator('.portfolio__lightbox-scrubber-counter');
        const text = await counter.textContent();
        expect(text).toMatch(/\d+\s*\/\s*\d+/);
    });

    test('should display scrubber thumbnails', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const thumbs = lightbox.locator('.portfolio__lightbox-scrubber-thumb');
        const count = await thumbs.count();
        expect(count).toBeGreaterThanOrEqual(1);

        // Active thumb should exist
        const activeThumb = lightbox.locator('.portfolio__lightbox-scrubber-thumb.is-active');
        await expect(activeThumb).toBeVisible();
    });

    test('should lock body scroll when lightbox is open', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const overflow = await page.evaluate(() => document.body.style.overflow);
        expect(overflow).toBe('hidden');
    });

    test('should restore body scroll after lightbox closes', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        await page.keyboard.press('Escape');
        await expect(lightbox).not.toBeVisible({ timeout: 3000 });

        const overflow = await page.evaluate(() => document.body.style.overflow);
        expect(overflow).toBe('');
    });

    test('should navigate left with ArrowLeft key', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(400);

        const counter = lightbox.locator('.portfolio__lightbox-scrubber-counter');
        const initialText = await counter.textContent();

        // Navigate left (wraps around)
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(500);
        const afterLeftText = await counter.textContent();

        // Counter should change (wraps to last photo)
        expect(afterLeftText).not.toBe(initialText);
    });

    test('should display the favorite toggle button in scrubber', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const heartBtn = lightbox.locator('button[aria-label="Toggle Favorite"]');
        await expect(heartBtn).toBeVisible();
    });

    test('should center EXIF metadata display in top bar on desktop, tablet, and mobile', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });

        const topBar = page.locator('.portfolio__lightbox-top-bar');
        await expect(topBar).toBeVisible();

        const exifCenter = page.locator('.portfolio__lightbox-top-center');
        await expect(exifCenter).toBeVisible();

        // 1. Desktop centering (1280px)
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(200);
        const desktopBox = await exifCenter.boundingBox();
        expect(desktopBox).not.toBeNull();
        if (desktopBox) {
            const centerX = desktopBox.x + desktopBox.width / 2;
            expect(Math.abs(centerX - 640)).toBeLessThan(1.0);
        }

        // 2. Tablet centering (768px)
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(200);
        const tabletBox = await exifCenter.boundingBox();
        expect(tabletBox).not.toBeNull();
        if (tabletBox) {
            const centerX = tabletBox.x + tabletBox.width / 2;
            expect(Math.abs(centerX - 384)).toBeLessThan(1.0);
        }

        // 3. Mobile centering and clearance (375px)
        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(200);
        const mobileBox = await exifCenter.boundingBox();
        const leftBox = await page.locator('.portfolio__lightbox-top-left').boundingBox();
        const rightBox = await page.locator('.portfolio__lightbox-top-right').boundingBox();

        expect(mobileBox).not.toBeNull();
        expect(leftBox).not.toBeNull();
        expect(rightBox).not.toBeNull();
        if (mobileBox && leftBox && rightBox) {
            const centerX = mobileBox.x + mobileBox.width / 2;
            expect(Math.abs(centerX - 187.5)).toBeLessThan(1.0);
            expect(mobileBox.x).toBeGreaterThanOrEqual(leftBox.x + leftBox.width - 1);
            expect(mobileBox.x + mobileBox.width).toBeLessThanOrEqual(rightBox.x + 1);
        }
    });
});
