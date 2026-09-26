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

        // Verify preview pane is pinned to top (flex-start)
        const previewPane = studioModal.locator('.story-export-modal__preview-pane');
        await expect(previewPane).toHaveCSS('align-self', 'flex-start');
        await expect(previewPane).toHaveCSS('justify-content', 'flex-start');

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

        // Verify uniform pill toggle widths
        const bgPillGroup = studioModal.locator('.story-export-modal__toggle-row .story-export-modal__pill-group').first();
        const posPillGroup = studioModal.locator('.story-export-modal__toggle-row .story-export-modal__pill-group').nth(1);
        const bgBox = await bgPillGroup.boundingBox();
        const posBox = await posPillGroup.boundingBox();
        expect(bgBox?.width).toBeCloseTo(posBox?.width ?? 0, 1);

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

    test('should render Share/Download button pinned in modal footer bar', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Verify modal footer bar is rendered and pinned to bottom
        const footerBar = studioModal.locator('.modal-shell__footer-bar');
        await expect(footerBar).toBeVisible();

        const actionBtn = footerBar.locator('.story-export-modal__primary-action');
        await expect(actionBtn).toBeVisible();
        const btnText = await actionBtn.textContent();
        expect(btnText).toMatch(/Download Story Card|Share Story Card/);

        // Verify footer bar touches the bottom of the viewport (within safe-area / subpixel tolerance)
        const footerBox = await footerBar.boundingBox();
        const viewport = page.viewportSize();
        if (footerBox && viewport) {
            expect(Math.abs((footerBox.y + footerBox.height) - viewport.height)).toBeLessThanOrEqual(32);
        }

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
        const attributionCheckbox = studioModal.locator('label:has-text("Photographer Attribution") input[type="checkbox"]');
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

    test('should support expanding frame accordion, selecting frames, and applying tint', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Locate Frame accordion header
        const accordionHeader = studioModal.locator('.story-export-modal__accordion-header');
        await expect(accordionHeader).toBeVisible();
        await expect(studioModal.locator('.story-export-modal__frame-current-badge')).toHaveText('None');

        // Initially no frame overlay in viewport
        await expect(studioModal.locator('.story-frame-overlay')).toHaveCount(0);

        // Click to expand accordion drawer
        await accordionHeader.click();
        const framesGrid = studioModal.locator('.story-export-modal__frames-grid');
        await expect(framesGrid).toBeVisible();

        // Select "Capital Grizzly" frame
        const bearCard = framesGrid.locator('button:has-text("Capital Grizzly")');
        await expect(bearCard).toBeVisible();
        await bearCard.click();

        // Verify badge updates and frame overlay appears in preview
        await expect(studioModal.locator('.story-export-modal__frame-current-badge')).toHaveText('Capital Grizzly');
        const frameOverlay = studioModal.locator('.story-frame-overlay');
        await expect(frameOverlay).toBeVisible();
        await expect(frameOverlay.locator('.story-frame-sac-bear')).toBeVisible();

        // Verify Frame Tint bar appeared
        const tintRow = studioModal.locator('.story-export-modal__frame-tint-row');
        await expect(tintRow).toBeVisible();

        // Verify no icons in 9:16 Crop / Padded buttons, zoom header, frame header, frame tint header, or badge list
        await expect(studioModal.locator('.story-export-modal__seg-btn svg')).toHaveCount(0);
        await expect(studioModal.locator('.story-export-modal__zoom-header svg')).toHaveCount(0);
        await expect(studioModal.locator('.story-export-modal__accordion-title svg')).toHaveCount(0);
        await expect(studioModal.locator('.story-export-modal__tint-header svg')).toHaveCount(0);
        await expect(studioModal.locator('.story-export-modal__badge-icon')).toHaveCount(0);

        // Click Gold tint
        const goldBtn = tintRow.locator('button:has-text("Gold")');
        await goldBtn.click();
        await expect(goldBtn).toHaveClass(/active/);

        // Click Custom tint
        const customTintBtn = tintRow.locator('button:has-text("Custom")');
        await customTintBtn.click();
        await expect(customTintBtn).toHaveClass(/active/);
        // Verify custom color row appears under Frame Tint with swatches and color picker input
        await expect(tintRow.locator('.story-export-modal__custom-color-row')).toHaveCount(1);
        const customColorInput = tintRow.locator('input[type="color"]');
        await expect(customColorInput).toHaveCount(1);

        // Switch to Beast Claws
        const clawCard = framesGrid.locator('button:has-text("Beast Claws")');
        await clawCard.click();
        await expect(studioModal.locator('.story-export-modal__frame-current-badge')).toHaveText('Beast Claws');
        await expect(frameOverlay.locator('.story-frame-claw-marks')).toBeVisible();

        // Collapse accordion drawer
        await accordionHeader.click();
        await expect(framesGrid).not.toBeVisible();

        // Overlay remains visible while collapsed
        await expect(frameOverlay).toBeVisible();

        // Re-open and select "None"
        await accordionHeader.click();
        const noneCard = framesGrid.locator('button:has-text("None")');
        await noneCard.click();
        await expect(studioModal.locator('.story-export-modal__frame-current-badge')).toHaveText('None');
        await expect(studioModal.locator('.story-frame-overlay')).toHaveCount(0);
        await expect(studioModal.locator('.story-export-modal__frame-tint-row')).not.toBeVisible();
    });

    test('should dynamically relocate frame elements based on context when badges are toggled', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Open frame drawer and select Capital Grizzly
        const accordionHeader = studioModal.locator('.story-export-modal__accordion-header');
        await accordionHeader.click();
        const bearCard = studioModal.locator('.story-export-modal__frames-grid button:has-text("Capital Grizzly")');
        await bearCard.click();

        const frameOverlay = studioModal.locator('.story-frame-overlay');
        await expect(frameOverlay).toBeVisible();

        // Check if scoreboard checkbox is present
        const scoreboardCheckbox = studioModal.locator('label:has-text("Event Badge") input[type="checkbox"]');
        if (await scoreboardCheckbox.isVisible() && (await scoreboardCheckbox.isChecked())) {
            // When scoreboard badge is active, bear is elevated into the flank
            const bearGroup = frameOverlay.locator('.story-frame-sac-bear g[transform*="1510"]');
            await expect(bearGroup).toBeVisible();

            // Uncheck scoreboard badge
            await scoreboardCheckbox.uncheck();

            // Bear dynamically repositions down to the bottom corner
            const bearLowerGroup = frameOverlay.locator('.story-frame-sac-bear g[transform*="1680"]');
            await expect(bearLowerGroup).toBeVisible();

            // Re-check scoreboard badge -> bear dynamically elevates back
            await scoreboardCheckbox.check();
            await expect(bearGroup).toBeVisible();
        }
    });

    test('should transition download button to confirmed state on download and reset when card is altered', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        const downloadBtn = studioModal.locator('.story-export-modal__primary-action');
        await expect(downloadBtn).toContainText('Download Story Card');
        await expect(downloadBtn).not.toHaveClass(/is-done/);

        // Click download
        await downloadBtn.click();

        // Button transitions to confirmed Downloaded state with is-done
        await expect(downloadBtn).toContainText('Downloaded');
        await expect(downloadBtn).toHaveClass(/is-done/);
        await expect(downloadBtn).toBeDisabled();

        // Altering card (e.g. clicking an alternate preset) resets button back to Download Story Card
        const altPreset = studioModal.locator('.story-export-modal__preset-pill:not(.active)').first();
        await altPreset.click();

        await expect(downloadBtn).toContainText('Download Story Card');
        await expect(downloadBtn).not.toHaveClass(/is-done/);
        await expect(downloadBtn).toBeEnabled();

        // Download altered card -> transitions to Downloaded again
        await downloadBtn.click();
        await expect(downloadBtn).toContainText('Downloaded');
        await expect(downloadBtn).toHaveClass(/is-done/);
        await expect(downloadBtn).toBeDisabled();

        // Altering card via zoom slider resets it again
        const zoomSlider = studioModal.locator('input[aria-label="Crop Zoom Level"]');
        await zoomSlider.fill('1.5');
        await zoomSlider.dispatchEvent('change');

        await expect(downloadBtn).toContainText('Download Story Card');
        await expect(downloadBtn).not.toHaveClass(/is-done/);
        await expect(downloadBtn).toBeEnabled();
    });

    test('should render Through the Lens frame when EXIF is present and display camera telemetry', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Open frame drawer
        const accordionHeader = studioModal.locator('.story-export-modal__accordion-header');
        await accordionHeader.click();

        const ttlCard = studioModal.locator('.story-export-modal__frames-grid button:has-text("Through the Lens")');
        if (await ttlCard.isVisible()) {
            await ttlCard.click();

            const frameOverlay = studioModal.locator('.story-frame-overlay');
            await expect(frameOverlay).toBeVisible();

            const ttlGroup = frameOverlay.locator('.story-frame-through-the-lens');
            await expect(ttlGroup).toBeVisible();

            // Verify telemetry items are present (SPEED, APERTURE, ISO, FOCAL)
            await expect(ttlGroup.getByText('SPEED')).toBeVisible();
            await expect(ttlGroup.getByText('APERTURE')).toBeVisible();
            await expect(ttlGroup.getByText('ISO', { exact: true })).toBeVisible();
            await expect(ttlGroup.getByText('FOCAL')).toBeVisible();

            // Verify top line HUD items (RAW, AF-C) are omitted per user request
            await expect(ttlGroup.getByText('RAW')).not.toBeVisible();
            await expect(ttlGroup.getByText('AF-C')).not.toBeVisible();
        }
    });

    test('should apply photo filters to image while keeping frames and badges unfiltered', async ({ page }) => {
        const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
        await photo.waitFor({ timeout: 10000 });
        await photo.click();

        const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
        await expect(lightbox).toBeVisible({ timeout: 10000 });

        await page.keyboard.press('c');
        const studioModal = page.locator('[role="dialog"][aria-label="Story Maker"]');
        await expect(studioModal).toBeVisible({ timeout: 8000 });

        // Verify filter section and initial state
        const filterSection = studioModal.locator('.story-export-modal__section--filters');
        await expect(filterSection).toBeVisible();
        const currentFilterBadge = filterSection.locator('.story-export-modal__filter-current-badge');
        await expect(currentFilterBadge).toHaveText('None');

        const cropperImg = studioModal.locator('.story-cropper__image');
        await expect(cropperImg).toBeVisible();

        // Select B&W filter
        const bwBtn = filterSection.locator('button:has-text("B&W"):not(:has-text("Contrast"))');
        await bwBtn.click();
        await expect(currentFilterBadge).toHaveText('B&W');
        await expect(bwBtn).toHaveClass(/active/);

        // Verify cropper image has grayscale filter applied
        await expect(cropperImg).toHaveCSS('filter', /grayscale\(1\)|grayscale\(100%\)/);

        // Open frame drawer and select Capital Grizzly frame
        const accordionHeader = studioModal.locator('.story-export-modal__accordion-header');
        await accordionHeader.click();
        const bearCard = studioModal.locator('.story-export-modal__frames-grid button:has-text("Capital Grizzly")');
        await bearCard.click();

        const frameOverlay = studioModal.locator('.story-frame-overlay');
        await expect(frameOverlay).toBeVisible();
        const bearSvg = frameOverlay.locator('.story-frame-sac-bear');
        await expect(bearSvg).toBeVisible();

        // Verify frame overlay does NOT have a grayscale filter
        await expect(frameOverlay).toHaveCSS('filter', 'none');
        await expect(bearSvg).toHaveCSS('filter', 'none');

        // Select B&W Contrast filter
        const bwContrastBtn = filterSection.locator('button:has-text("B&W Contrast")');
        await bwContrastBtn.click();
        await expect(currentFilterBadge).toHaveText('B&W Contrast');
        await expect(bwContrastBtn).toHaveClass(/active/);
        await expect(cropperImg).toHaveCSS('filter', /grayscale\(1\)|grayscale\(100%\)/);

        // Select None to restore
        const noneFilterBtn = filterSection.locator('button:has-text("None")');
        await noneFilterBtn.click();
        await expect(currentFilterBadge).toHaveText('None');
        await expect(cropperImg).toHaveCSS('filter', 'none');
    });
});

