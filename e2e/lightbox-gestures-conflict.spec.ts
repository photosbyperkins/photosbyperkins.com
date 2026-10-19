import { test, expect } from '@playwright/test';

test.describe('Lightbox Gesture Isolation (Zoom vs Swipe/Pan)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 15000 });

        // Open lightbox by clicking the first photo
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.scrollIntoViewIfNeeded();
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 5000 });
    });

    test('disables pagination chevron overlays and keyboard navigation when zoomed in', async ({ page }) => {
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        const fullImg = lightbox.locator('.portfolio__lightbox-slide--current .portfolio__lightbox-image-full');
        await expect(fullImg).toBeVisible({ timeout: 10000 });

        const counter = lightbox.locator('.portfolio__lightbox-scrubber-counter');
        await expect(counter).toBeVisible();

        // Chevrons should exist when unzoomed
        const nextOverlay = lightbox.locator('.portfolio__lightbox-nav-overlay--right');
        await expect(nextOverlay).toBeVisible();

        // Capture initial counter text
        const initialCount = await counter.textContent();

        // Toggle zoom via 'z' key
        await page.keyboard.press('z');
        await page.waitForTimeout(300);

        // Chevron overlays must be hidden to prevent conflicting taps during panning
        await expect(nextOverlay).not.toBeVisible();

        // Arrow navigation must be inhibited during zoom
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(300);
        await expect(counter).toHaveText(initialCount!);

        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(300);
        await expect(counter).toHaveText(initialCount!);

        // Unzoom via 'z' key
        await page.keyboard.press('z');
        await page.waitForTimeout(300);

        // Chevron overlays and navigation must be restored
        await expect(nextOverlay).toBeVisible();
        await page.keyboard.press('ArrowRight');
        await expect(counter).not.toHaveText(initialCount!, { timeout: 5000 });
    });

    test('resets zoom when closing lightbox and reopening', async ({ page }) => {
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        const fullImg = lightbox.locator('.portfolio__lightbox-slide--current .portfolio__lightbox-image-full');
        await expect(fullImg).toBeVisible({ timeout: 10000 });

        const nextOverlay = lightbox.locator('.portfolio__lightbox-nav-overlay--right');
        await expect(nextOverlay).toBeVisible();

        // Toggle zoom in
        await page.keyboard.press('z');
        await page.waitForTimeout(300);
        await expect(nextOverlay).not.toBeVisible();

        // Close lightbox
        const closeBtn = lightbox.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(lightbox).not.toBeVisible({ timeout: 10000 });

        // Reopen lightbox
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.scrollIntoViewIfNeeded();
        await photo.click();
        await expect(lightbox).toBeVisible();

        // Should be unzoomed again
        await expect(nextOverlay).toBeVisible();
    });

    test('double-tap zoom stops at one image pixel per device pixel so high-DPR screens stay sharp', async ({
        page,
        hasTouch,
    }) => {
        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        const fullImg = lightbox.locator('.portfolio__lightbox-slide--current .portfolio__lightbox-image-full');
        await expect(fullImg).toBeVisible({ timeout: 10000 });
        // Wait for the swap from the thumbnail to the display AVIF.
        await expect(fullImg).toHaveAttribute('src', /\/avif\//, { timeout: 15000 });

        if (hasTouch) {
            // Two quick taps hit the touch double-tap path used on phones.
            const box = (await fullImg.boundingBox())!;
            const x = box.x + box.width / 2;
            const y = box.y + box.height / 2;
            await page.touchscreen.tap(x, y);
            await page.touchscreen.tap(x, y);
        } else {
            await fullImg.dblclick();
        }
        // `is-zoomed` is set once the zoom animation settles.
        await expect(fullImg).toHaveClass(/is-zoomed/, { timeout: 5000 });

        const { scale, devicePxPerImagePx } = await fullImg.evaluate((el: HTMLImageElement) => {
            // Some WebKit builds (e.g. Playwright's on Windows) can't decode AVIF, so naturalWidth is 0.
            // Fall back to the photo's dimensions fitted inside the 3840px display AVIF.
            const w = Number(el.getAttribute('width'));
            const h = Number(el.getAttribute('height'));
            const sourceWidth = el.naturalWidth || Math.round(w * Math.min(1, 3840 / Math.max(w, h)));
            const renderedWidth = el.getBoundingClientRect().width;
            return {
                scale: renderedWidth / el.clientWidth,
                devicePxPerImagePx: (renderedWidth * window.devicePixelRatio) / sourceWidth,
            };
        });
        expect(scale).toBeGreaterThan(1.05);
        // Either capped at 1:1 device pixels, or at the 2x minimum zoom for small sources.
        expect(devicePxPerImagePx <= 1.01 || Math.abs(scale - 2) < 0.01).toBe(true);
        // The settled zoom drops `will-change` so the browser re-rasterizes at the final scale.
        await expect(fullImg).toHaveCSS('will-change', 'auto');
    });
});
