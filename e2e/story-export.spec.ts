import { test, expect } from '@playwright/test';

test.describe('Story Maker (9:16)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should display Story Studio action button in lightbox header', async ({ page }) => {
        // Click first photo thumbnail to open lightbox
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        // Verify Story Studio button exists
        const storyBtn = lightbox.locator('button[aria-label="Story Maker (9:16)"]');
        await expect(storyBtn).toBeVisible({ timeout: 5000 });
    });

    test('should open Story Studio modal on button click', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        const storyBtn = lightbox.locator('button[aria-label="Story Maker (9:16)"]');
        await storyBtn.click();

        // Verify Story Studio modal opens
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Check title
        await expect(studioModal.locator('.modal-shell__title')).toContainText('STORY MAKER');

        // Check composition mode buttons
        const cropModeBtn = studioModal.locator('button:has-text("9:16 Crop")');
        const paddedModeBtn = studioModal.locator('button:has-text("Padded")');
        await expect(cropModeBtn).toBeVisible();
        await expect(paddedModeBtn).toBeVisible();

        // Check prepared preset pills
        const presetPills = studioModal.locator('.story-export-modal__preset-pill');
        const count = await presetPills.count();
        expect(count).toBeGreaterThan(0);

        // Check download action button
        const downloadBtn = studioModal.locator('.story-export-modal__primary-action');
        await expect(downloadBtn).toContainText('Download Story Card');

        // Press Escape to close Story Studio
        await page.keyboard.press('Escape');
        await expect(studioModal).not.toBeVisible({ timeout: 5000 });
    });

    test('should open Story Studio with keyboard shortcut "c"', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        // Press 'c' to open Story Studio
        await page.keyboard.press('c');

        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Press Escape to close
        await page.keyboard.press('Escape');
        await expect(studioModal).not.toBeVisible({ timeout: 5000 });
    });

    test('should switch to Padded mode and render canvas preview', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Click Padded mode
        const paddedBtn = studioModal.locator('button:has-text("Padded")');
        await paddedBtn.click();

        // Verify canvas preview is rendered
        const canvas = studioModal.locator('.story-export-modal__canvas');
        await expect(canvas).toBeVisible({ timeout: 5000 });

        // Verify padded settings are displayed
        await expect(studioModal.locator('.story-export-modal__padded-settings')).toBeVisible();
        await expect(studioModal.locator('button:has-text("Frosted")')).toBeVisible();
        await expect(studioModal.locator('button:has-text("Custom")')).toBeVisible();

        // Clicking Custom shows custom color row
        await studioModal.locator('button:has-text("Custom")').click();
        await expect(studioModal.locator('.story-export-modal__custom-color-row')).toBeVisible();
        await expect(studioModal.locator('.story-export-modal__color-picker')).toBeVisible();

        // Verify photo scale slider has max="1" and can display 100%
        const scaleSlider = studioModal.locator('input[aria-label="Photo Card Scale"]');
        await expect(scaleSlider).toBeVisible();
        await expect(scaleSlider).toHaveAttribute('max', '1');
        await scaleSlider.fill('1');
        const scaleValue = studioModal.locator('.story-export-modal__padded-settings .story-export-modal__zoom-value');
        await expect(scaleValue).toContainText('100%');

        // Close modal
        await page.keyboard.press('Escape');
        await expect(studioModal).not.toBeVisible({ timeout: 5000 });
    });

    test('should display cropper image and remain open when clicking controls, presets, or cropper', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // 1. Verify cropper image is displayed and rendered
        const cropperImg = studioModal.locator('.story-cropper__image');
        await expect(cropperImg).toBeVisible({ timeout: 5000 });
        const box = await cropperImg.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(50);
        expect(box!.height).toBeGreaterThan(50);

        // 2. Click preset pills - modal and lightbox must NOT close
        const presetPill = studioModal.locator('.story-export-modal__preset-pill').first();
        if (await presetPill.isVisible()) {
            await presetPill.click();
            await expect(studioModal).toBeVisible();
            await expect(lightbox).toBeVisible();
        }

        // 3. Click inside cropper viewport - modal and lightbox must NOT close
        const cropperViewport = studioModal.locator('.story-cropper__viewport');
        await cropperViewport.click({ position: { x: 50, y: 50 } });
        await expect(studioModal).toBeVisible();
        await expect(lightbox).toBeVisible();

        // 4. Click zoom slider
        const zoomSlider = studioModal.locator('.story-export-modal__slider').first();
        if (await zoomSlider.isVisible()) {
            await zoomSlider.click();
            await expect(studioModal).toBeVisible();
            await expect(lightbox).toBeVisible();
        }

        // 5. Click segmented control mode switch
        const paddedBtn = studioModal.locator('button:has-text("Padded")');
        await paddedBtn.click();
        await expect(studioModal).toBeVisible();
        await expect(lightbox).toBeVisible();

        const cropBtn = studioModal.locator('button:has-text("9:16 Crop")');
        await cropBtn.click();
        await expect(studioModal).toBeVisible();
        await expect(lightbox).toBeVisible();

        // 6. Test dragging inside cropper
        const viewportBox = await cropperViewport.boundingBox();
        if (viewportBox) {
            await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(viewportBox.x + viewportBox.width / 2 + 30, viewportBox.y + viewportBox.height / 2 + 20);
            await page.mouse.up();
            await expect(studioModal).toBeVisible();
            await expect(lightbox).toBeVisible();
        }
    });

    test('should render scoreboard and attribution overlays in cropper preview', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // 1. Verify attribution overlay badge is displayed with nav__logo style and @photosbyperkins at the top
        const attributionBadge = studioModal.locator('.story-cropper__badge--attribution');
        await expect(attributionBadge).toBeVisible({ timeout: 5000 });
        await expect(attributionBadge.locator('.story-cropper__logo-icon')).toBeVisible();
        await expect(attributionBadge.locator('.story-cropper__logo-text')).toBeVisible();
        await expect(attributionBadge.locator('.story-cropper__logo-accent')).toBeVisible();
        await expect(attributionBadge.locator('.story-cropper__logo-domain')).toContainText('@photosbyperkins');

        const cropperViewport = studioModal.locator('.story-cropper__viewport');
        const viewportBox = await cropperViewport.boundingBox();
        const attributionBox = await attributionBadge.boundingBox();
        expect(viewportBox).not.toBeNull();
        expect(attributionBox).not.toBeNull();
        // Attribution should be in the top portion of the viewport
        expect(attributionBox!.y).toBeLessThan(viewportBox!.y + viewportBox!.height * 0.2);

        // 2. Check scoreboard badge overlay if event has a match/title (positioned at bottom center)
        const scoreboardBadge = studioModal.locator('.story-cropper__badge--scoreboard');
        if (await scoreboardBadge.isVisible()) {
            await expect(scoreboardBadge.locator('.story-cropper__event-teams-stack')).toBeVisible();
            const scoreboardBox = await scoreboardBadge.boundingBox();
            expect(scoreboardBox).not.toBeNull();
            // Scoreboard should be in the bottom portion and centered horizontally
            expect(scoreboardBox!.y + scoreboardBox!.height).toBeGreaterThan(viewportBox!.y + viewportBox!.height * 0.75);
            const scoreboardCenterX = scoreboardBox!.x + scoreboardBox!.width / 2;
            const viewportCenterX = viewportBox!.x + viewportBox!.width / 2;
            expect(Math.abs(scoreboardCenterX - viewportCenterX)).toBeLessThan(5);
        }

        // 3. Test toggling attribution badge checkbox updates preview
        const attributionCheckbox = studioModal.locator('input[type="checkbox"]').last();
        await attributionCheckbox.uncheck();
        await expect(attributionBadge).not.toBeVisible();

        await attributionCheckbox.check();
        await expect(attributionBadge).toBeVisible();
    });

    test('should toggle story card light and dark theme', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Find story card theme switcher toggle
        const themeToggle = studioModal.locator('.story-export-modal__theme-toggle');
        await expect(themeToggle).toBeVisible({ timeout: 5000 });

        const darkBtn = themeToggle.locator('button[aria-label="Dark card theme"]');
        const lightBtn = themeToggle.locator('button[aria-label="Light card theme"]');
        await expect(darkBtn).toBeVisible({ timeout: 5000 });
        await expect(lightBtn).toBeVisible({ timeout: 5000 });

        const attributionBadge = studioModal.locator('.story-cropper__badge--attribution');
        await expect(attributionBadge).toBeVisible({ timeout: 5000 });

        const wasInitiallyLight = await attributionBadge.evaluate((el) =>
            el.classList.contains('story-cropper__badge--light')
        );

        // Click light button if dark, or dark button if light
        const targetBtn = wasInitiallyLight ? darkBtn : lightBtn;
        await targetBtn.click();

        if (wasInitiallyLight) {
            await expect(attributionBadge).not.toHaveClass(/story-cropper__badge--light/);
        } else {
            await expect(attributionBadge).toHaveClass(/story-cropper__badge--light/);
        }

        // Click revert button
        const revertBtn = wasInitiallyLight ? lightBtn : darkBtn;
        await revertBtn.click();

        if (wasInitiallyLight) {
            await expect(attributionBadge).toHaveClass(/story-cropper__badge--light/);
        } else {
            await expect(attributionBadge).not.toHaveClass(/story-cropper__badge--light/);
        }
    });

    test('should maintain identical badge sizes between 9:16 crop and Padded modes', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Get badge bounding box in crop mode
        const cropAttribution = studioModal.locator('.story-cropper__badge--attribution');
        await expect(cropAttribution).toBeVisible({ timeout: 5000 });
        const cropBox = await cropAttribution.boundingBox();
        expect(cropBox).not.toBeNull();

        // Switch to Padded mode
        const paddedBtn = studioModal.locator('button:has-text("Padded")');
        await paddedBtn.click();

        // Get badge bounding box in padded mode
        const paddedAttribution = studioModal.locator('.story-cropper__badge--attribution');
        await expect(paddedAttribution).toBeVisible({ timeout: 5000 });
        const paddedBox = await paddedAttribution.boundingBox();
        expect(paddedBox).not.toBeNull();

        // Verify width and height match within 1px
        expect(Math.round(paddedBox!.width)).toBe(Math.round(cropBox!.width));
        expect(Math.round(paddedBox!.height)).toBe(Math.round(cropBox!.height));
    });

    test('should reset to default settings when closed and reopened', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        // 1. Open Story Maker
        await page.keyboard.press('c');
        let studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Switch to Padded mode and Custom background
        const paddedBtn = studioModal.locator('button:has-text("Padded")');
        await paddedBtn.click();
        const customBtn = studioModal.locator('button:has-text("Custom")');
        await customBtn.click();
        await expect(studioModal.locator('.story-export-modal__custom-color-row')).toBeVisible();

        // 2. Close Story Maker
        await page.keyboard.press('Escape');
        await expect(studioModal).not.toBeVisible({ timeout: 5000 });

        // 3. Reopen Story Maker
        await page.keyboard.press('c');
        studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Verify it reset back to default 9:16 Crop mode (not Padded)
        const cropBtn = studioModal.locator('button:has-text("9:16 Crop")');
        await expect(cropBtn).toHaveClass(/active/);
        await expect(studioModal.locator('.story-export-modal__padded-settings')).not.toBeVisible();
    });
});
