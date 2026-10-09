import { test, expect } from '@playwright/test';
import {
    collapseSheet,
    expectSelectedThumb,
    exportButton,
    exportCancelButton,
    getStoryLayoutMode,
    openFirstPhotoLightbox,
    openStoryMakerFromLightbox,
    openStudioTab,
    studioPanel,
    studioTab,
    studioTabPanel,
    thumbByLabel,
} from './helpers/storyStudio';

test.describe('Story Maker (9:16)', () => {
    test.beforeEach(async ({ page, isMobile }) => {
        test.skip(isMobile, 'Desktop Story Studio layout tests run on desktop browsers');
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

        // Check framing options
        const paddedModeBtn = studioModal.locator('button:has-text("Padded")');
        await expect(paddedModeBtn).toBeVisible();

        // Check prepared preset pills
        const presetPills = studioModal.locator('.story-export-modal__preset-pill');
        const count = await presetPills.count();
        expect(count).toBeGreaterThan(0);

        // Check 4 studio tabs in the single tab bar
        const tabBar = studioModal.locator('.story-tab-bar[role="tablist"][aria-label="Story Studio Navigation"]');
        await expect(tabBar).toHaveCount(1);
        await expect(tabBar.locator('[role="tab"]')).toHaveCount(4);
        for (const name of ['Layout', 'Filters', 'Frames', 'Badges'] as const) {
            await expect(studioTab(studioModal, name)).toBeVisible();
        }
        await expect(studioTab(studioModal, 'Layout')).toHaveAttribute('aria-selected', 'true');

        // Check download action button (labels crossfade, so the state lives in aria-label)
        const downloadBtn = exportButton(studioModal);
        await expect(downloadBtn).toHaveAttribute('aria-label', 'Download Story Card');

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

    test('should switch to Padded mode and render padded elements', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

        // Show the Layout tab (opens the sheet in sheet mode)
        await openStudioTab(studioModal, 'Layout');

        // Click Padded preset
        const paddedBtn = studioModal.locator('button:has-text("Padded")');
        await paddedBtn.click();

        // Verify cropper padded elements are rendered
        const paddedWrapper = studioModal.locator('.story-cropper__image-wrapper--padded');
        await expect(paddedWrapper).toBeVisible({ timeout: 5000 });
        const bgLayer = studioModal.locator('.story-cropper__background-layer');
        await expect(bgLayer).toBeVisible({ timeout: 5000 });

        // Verify padded settings are displayed
        await expect(studioModal.locator('.story-export-modal__padded-settings')).toBeVisible();
        await expect(studioModal.locator('button:has-text("Frosted")')).toBeVisible();
        await expect(studioModal.locator('button:has-text("Solid")')).toBeVisible();

        // Background colour pill is visible in Frosted mode
        const bgColorTrigger = studioModal.locator('.story-export-modal__background-header-tint .story-tint__trigger');
        await expect(bgColorTrigger).toBeVisible();

        // Clicking Solid keeps the colour pill visible for solid fill
        await studioModal.locator('button:has-text("Solid")').click();
        await expect(bgColorTrigger).toBeVisible();

        // Verify photo zoom slider is visible
        const zoomSlider = studioModal.locator('input[aria-label="Photo Zoom"]');
        await expect(zoomSlider).toBeVisible();

        // Close modal
        await page.keyboard.press('Escape');
        await expect(studioModal).not.toBeVisible({ timeout: 5000 });
    });

    test('should render Share/Download button pinned in the studio panel footer', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

        // The export button lives in the panel footer (no separate modal footer bar any more)
        const panel = studioPanel(studioModal);
        const footer = panel.locator('.story-studio-panel__footer');
        await expect(footer).toBeVisible();

        const actionBtn = footer.locator('.story-export-modal__primary-action');
        await expect(actionBtn).toBeVisible();
        await expect(actionBtn).toHaveAttribute('aria-label', /Download Story Card|Share Story Card/);

        // Integrated cancel segment is always in the DOM but inert while idle
        const cancelBtn = footer.locator('.story-export-button__cancel');
        await expect(cancelBtn).toHaveAttribute('aria-label', 'Cancel video export');
        await expect(cancelBtn).toBeDisabled();
        await expect(cancelBtn).toHaveAttribute('aria-hidden', 'true');

        // Footer is pinned to the bottom of the panel and the panel's bottom stays on screen
        const footerBox = await footer.boundingBox();
        const panelBox = await panel.boundingBox();
        const viewport = page.viewportSize();
        expect(footerBox).not.toBeNull();
        expect(panelBox).not.toBeNull();
        expect(Math.abs(footerBox!.y + footerBox!.height - (panelBox!.y + panelBox!.height))).toBeLessThanOrEqual(24);
        if (viewport) {
            expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(viewport.height + 1);
        }

        // Close modal
        await page.keyboard.press('Escape');
        await expect(studioModal).not.toBeVisible({ timeout: 5000 });
    });

    test('should display cropper image and remain open when clicking controls, presets, or cropper', async ({ page }) => {
        const lightbox = await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

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

        // 5. Click framing preset buttons
        const paddedBtn = studioModal.locator('button:has-text("Padded")');
        await paddedBtn.click();
        await expect(studioModal).toBeVisible();
        await expect(lightbox).toBeVisible();

        // Presets are photo-dependent (Center / Subject / Lead / Close-up ...): use the first non-Padded one
        const cropPresetBtn = studioModal
            .locator('[role="group"][aria-label="Framing presets"] button:not(:has-text("Padded"))')
            .first();
        await cropPresetBtn.click();
        await expect(cropPresetBtn).toHaveAttribute('aria-pressed', 'true');
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
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

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

        // 3. Test toggling attribution badge visibility (Show / Hide segmented toggle) updates preview
        await openStudioTab(studioModal, 'Badges');
        const attributionToggle = studioModal.locator('[role="group"][aria-label="Photographer Attribution visibility"]');
        const hideAttribution = attributionToggle.locator('button[aria-label="Hide attribution badge"]');
        const showAttribution = attributionToggle.locator('button[aria-label="Show attribution badge"]');
        await hideAttribution.click();
        await expect(hideAttribution).toHaveAttribute('aria-pressed', 'true');
        await expect(attributionBadge).not.toBeVisible();

        await showAttribution.click();
        await expect(showAttribution).toHaveAttribute('aria-pressed', 'true');
        await expect(attributionBadge).toBeVisible();
    });

    test('should toggle story card light and dark theme', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

        // Switch to Badges tab where theme toggle is now located
        await openStudioTab(studioModal, 'Badges');

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

    test('should toggle scores on and off in event badge', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

        // Navigate to Badges tab
        await openStudioTab(studioModal, 'Badges');

        // Check if event has scores toggle (Scores / Event / Hide)
        const scoresToggle = studioModal.locator('[role="group"][aria-label="Event badge visibility and scores"]');
        if (await scoresToggle.isVisible()) {
            const scoreboardBadge = studioModal.locator('.story-cropper__badge--scoreboard');
            const previewScores = studioModal.locator('.story-export-modal__preview-team-score');

            // Initially scores should be visible
            await expect(scoreboardBadge.locator('.story-cropper__team-score').first()).toBeVisible();
            await expect(previewScores.first()).toBeVisible();

            // Toggle scores off (event badge without scores)
            const offBtn = scoresToggle.locator('button[aria-label="Show event badge without scores"]');
            await offBtn.click();
            await expect(offBtn).toHaveClass(/story-export-modal__scores-btn--active/);

            // Scores should now be hidden in both cropper overlay and mini preview
            await expect(scoreboardBadge.locator('.story-cropper__team-score')).toHaveCount(0);
            await expect(previewScores).toHaveCount(0);

            // Toggle scores back on
            const scoresBtn = scoresToggle.locator('button[aria-label="Show event badge with scores"]');
            await scoresBtn.click();
            await expect(scoresBtn).toHaveClass(/story-export-modal__scores-btn--active/);

            // Scores should be restored
            await expect(scoreboardBadge.locator('.story-cropper__team-score').first()).toBeVisible();
            await expect(previewScores.first()).toBeVisible();
        }
    });

    test('should maintain identical badge sizes between 9:16 crop and Padded modes', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

        // Get badge bounding box in crop mode
        const cropAttribution = studioModal.locator('.story-cropper__badge--attribution');
        await expect(cropAttribution).toBeVisible({ timeout: 5000 });
        const cropBox = await cropAttribution.boundingBox();
        expect(cropBox).not.toBeNull();

        // Show the Layout tab (opens the sheet in sheet mode)
        await openStudioTab(studioModal, 'Layout');

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
        await openFirstPhotoLightbox(page);

        // 1. Open Story Maker
        let studioModal = await openStoryMakerFromLightbox(page);
        await openStudioTab(studioModal, 'Layout');

        // Remember the photo's default framing preset (labels depend on the photo: Center / Subject / Lead ...)
        const presetGroup = () => studioModal.locator('[role="group"][aria-label="Framing presets"]');
        const defaultPresetLabel = ((await presetGroup().locator('button[aria-pressed="true"]').first().textContent()) ?? '').trim();
        expect(defaultPresetLabel).not.toBe('');
        expect(defaultPresetLabel).not.toBe('Padded');

        // Switch to Padded mode and Solid background
        const paddedBtn = studioModal.locator('button:has-text("Padded")');
        await paddedBtn.click();
        const solidBtn = studioModal.locator('button:has-text("Solid")');
        await solidBtn.click();
        await expect(studioModal.locator('.story-export-modal__background-header-tint .story-tint__trigger')).toBeVisible();

        // 2. Close Story Maker (collapse the sheet first in sheet mode: Escape only collapses an open sheet)
        await collapseSheet(page, studioModal);
        await page.keyboard.press('Escape');
        await expect(studioModal).not.toBeVisible({ timeout: 5000 });

        // 3. Reopen Story Maker
        studioModal = await openStoryMakerFromLightbox(page);
        await openStudioTab(studioModal, 'Layout');

        // Verify it reset back to the default framing (not Padded)
        const defaultBtn = presetGroup().getByRole('button', { name: defaultPresetLabel, exact: true });
        await expect(defaultBtn).toHaveAttribute('aria-pressed', 'true');
        await expect(defaultBtn).toHaveClass(/active/);
        await expect(presetGroup().getByRole('button', { name: 'Padded', exact: true })).toHaveAttribute(
            'aria-pressed',
            'false'
        );
    });

    test('should support selecting frames and applying tint', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);
        const preview = studioModal.locator('.story-studio__preview');

        // Switch to Frames tab
        await openStudioTab(studioModal, 'Frames');

        // Thumb browser renders; the selected thumb (not a header badge) shows the current frame
        const framesGrid = studioModal.locator('#story-export-frames-grid');
        await expect(framesGrid).toBeVisible();
        await expectSelectedThumb(framesGrid, 'None');

        // Initially no frame overlay in viewport, and no tint trigger
        await expect(preview.locator('.story-frame-overlay')).toHaveCount(0);
        const tintTrigger = studioModal.locator('button.story-tint__trigger');
        await expect(tintTrigger).toHaveCount(0);

        // Select "Grizzly" frame
        const bearCard = thumbByLabel(framesGrid, 'Grizzly');
        await expect(bearCard).toBeVisible();
        await bearCard.click();

        // Verify selection and frame overlay appears in preview
        await expect(bearCard).toHaveAttribute('aria-pressed', 'true');
        await expect(bearCard).toHaveClass(/story-thumb--selected/);
        await expectSelectedThumb(framesGrid, 'Grizzly');
        const frameOverlay = preview.locator('.story-frame-overlay');
        await expect(frameOverlay).toBeVisible();
        await expect(frameOverlay.locator('.story-frame-sac-bear')).toBeVisible();

        // Verify Frame Tint trigger appeared in the options row
        await expect(tintTrigger).toBeVisible();
        await expect(tintTrigger).toHaveAttribute('aria-label', 'Frame tint: Default. Change tint');

        // Verify no icons in 9:16 / Padded buttons, zoom header, frame header, or badge list
        await expect(studioModal.locator('.story-export-modal__seg-btn svg')).toHaveCount(0);
        await expect(studioModal.locator('.story-export-modal__zoom-header svg')).toHaveCount(0);
        await expect(studioModal.locator('.story-export-modal__accordion-title svg')).toHaveCount(0);
        await expect(studioModal.locator('.story-export-modal__badge-icon')).toHaveCount(0);

        // Open tint popover and click Gold swatch
        await tintTrigger.click();
        const tintPopover = studioModal.locator('#story-tint-popover');
        await expect(tintPopover).toBeVisible();
        const goldBtn = tintPopover.locator('button[aria-label="Frame tint: Gold"]');
        await goldBtn.click();
        await expect(goldBtn).toHaveClass(/is-active/);
        await expect(goldBtn).toHaveAttribute('aria-pressed', 'true');
        await expect(tintTrigger).toHaveAttribute('aria-label', 'Frame tint: Gold. Change tint');

        // Verify color picker input is present
        const customColorInput = tintPopover.locator('input[type="color"][aria-label="Custom frame tint color"]');
        await expect(customColorInput).toHaveCount(1);

        // Escape closes only the popover, not the modal
        await page.keyboard.press('Escape');
        await expect(tintPopover).toHaveCount(0);
        await expect(studioModal).toBeVisible();

        // Switch to Claws
        const clawCard = thumbByLabel(framesGrid, 'Claws');
        await clawCard.click();
        await expectSelectedThumb(framesGrid, 'Claws');
        await expect(frameOverlay.locator('.story-frame-claw-marks')).toBeVisible();

        // Select "None"
        const noneCard = thumbByLabel(framesGrid, 'None');
        await noneCard.click();
        await expectSelectedThumb(framesGrid, 'None');
        await expect(preview.locator('.story-frame-overlay')).toHaveCount(0);
        await expect(tintTrigger).toHaveCount(0);
    });

    test('should dynamically relocate frame elements based on context when badges are toggled', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

        // Switch to Frames tab and select Grizzly
        await openStudioTab(studioModal, 'Frames');
        const bearCard = thumbByLabel(studioModal.locator('#story-export-frames-grid'), 'Grizzly');
        await bearCard.click();

        const frameOverlay = studioModal.locator('.story-studio__preview .story-frame-overlay');
        await expect(frameOverlay).toBeVisible();

        // Switch to Badges tab to check/toggle event scoreboard badge (Show/Scores/Event | Hide segmented toggle)
        await openStudioTab(studioModal, 'Badges');
        const hideEventBadge = studioModal.locator('button[aria-label="Hide event badge"]');
        const showEventBadge = studioModal
            .locator('button[aria-label="Show event badge with scores"], button[aria-label="Show event badge"]')
            .first();
        if (await hideEventBadge.isVisible() && (await hideEventBadge.getAttribute('aria-pressed')) === 'false') {
            // When scoreboard badge is active, bear is elevated into the flank
            const bearGroup = frameOverlay.locator('.story-frame-sac-bear g[transform*="1530"]');
            await expect(bearGroup).toBeVisible();

            // Hide scoreboard badge
            await hideEventBadge.click();

            // Bear dynamically repositions down to the bottom corner
            const bearLowerGroup = frameOverlay.locator('.story-frame-sac-bear g[transform*="1690"]');
            await expect(bearLowerGroup).toBeVisible();

            // Show scoreboard badge again -> bear dynamically elevates back
            await showEventBadge.click();
            await expect(bearGroup).toBeVisible();
        }
    });

    test('should transition download button to confirmed state on download and reset when card is altered', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

        const downloadBtn = exportButton(studioModal);
        const buttonShell = studioModal.locator('.story-export-button');
        const cancelBtn = exportCancelButton(studioModal);
        await expect(downloadBtn).toHaveAttribute('aria-label', 'Download Story Card');
        await expect(downloadBtn).not.toHaveClass(/is-done/);
        await expect(buttonShell).toHaveClass(/story-export-button--idle/);
        await expect(downloadBtn).toBeEnabled({ timeout: 10000 });
        await expect(cancelBtn).toBeDisabled();

        // Click download
        await downloadBtn.click();

        // Button transitions to confirmed Downloaded state with is-done
        await expect(downloadBtn).toHaveAttribute('aria-label', 'Story Card Downloaded');
        await expect(downloadBtn).toHaveClass(/is-done/);
        await expect(buttonShell).toHaveClass(/story-export-button--done/);
        await expect(downloadBtn).toBeDisabled();
        await expect(cancelBtn).toBeDisabled();

        // Altering card (e.g. clicking an alternate preset) resets button back to Download Story Card
        await openStudioTab(studioModal, 'Layout');

        const altPreset = studioModal.locator('.story-export-modal__preset-pill:not(.active)').first();
        await altPreset.click();

        await expect(downloadBtn).toHaveAttribute('aria-label', 'Download Story Card');
        await expect(downloadBtn).not.toHaveClass(/is-done/);
        await expect(buttonShell).toHaveClass(/story-export-button--idle/);
        await expect(downloadBtn).toBeEnabled();

        // Download altered card -> transitions to Downloaded again
        await downloadBtn.click();
        await expect(downloadBtn).toHaveAttribute('aria-label', 'Story Card Downloaded');
        await expect(downloadBtn).toHaveClass(/is-done/);
        await expect(downloadBtn).toBeDisabled();

        // Altering card via zoom slider resets it again
        const zoomSlider = studioModal.locator('input[aria-label="Photo Zoom"]');
        await zoomSlider.evaluate((el: HTMLInputElement) => {
            el.value = '1.5';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        await expect(downloadBtn).toHaveAttribute('aria-label', 'Download Story Card');
        await expect(downloadBtn).not.toHaveClass(/is-done/);
        await expect(downloadBtn).toBeEnabled();
    });

    test('should render Through the Lens frame when EXIF is present and display camera telemetry', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

        // Switch to Frames tab
        await openStudioTab(studioModal, 'Frames');

        const ttlCard = thumbByLabel(studioModal.locator('#story-export-frames-grid'), 'Camera');
        if (await ttlCard.isVisible()) {
            await ttlCard.click();

            const frameOverlay = studioModal.locator('.story-studio__preview .story-frame-overlay');
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
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

        // Switch to Filters tab
        await openStudioTab(studioModal, 'Filters');

        // Verify filter section and initial state (selected thumb replaces the old header badge)
        const filterSection = studioModal.locator('.story-tab--filters');
        await expect(filterSection).toBeVisible();
        const filtersGrid = filterSection.locator('#story-export-filters-grid');
        await expectSelectedThumb(filtersGrid, 'None');
        await expect(filterSection.locator('input[aria-label="Filter Strength"]')).toHaveCount(0);

        const cropperImg = studioModal.locator('.story-cropper__image');
        await expect(cropperImg).toBeVisible();

        // Select Mono (B&W) filter
        const bwBtn = filterSection.getByRole('button', { name: 'Photo filter: Mono', exact: true });
        await bwBtn.click();
        await expectSelectedThumb(filtersGrid, 'Mono');
        await expect(bwBtn).toHaveAttribute('aria-pressed', 'true');
        await expect(bwBtn).toHaveClass(/story-thumb--selected/);

        // Verify cropper image has grayscale filter applied
        await expect(cropperImg).toHaveCSS('filter', /grayscale\(1\)|grayscale\(100%\)/);

        // Switch to Frames tab and select Grizzly frame
        await openStudioTab(studioModal, 'Frames');
        const bearCard = thumbByLabel(studioModal.locator('#story-export-frames-grid'), 'Grizzly');
        await bearCard.click();

        const frameOverlay = studioModal.locator('.story-studio__preview .story-frame-overlay');
        await expect(frameOverlay).toBeVisible();
        const bearSvg = frameOverlay.locator('.story-frame-sac-bear');
        await expect(bearSvg).toBeVisible();

        // Verify frame overlay does NOT have a grayscale filter
        await expect(frameOverlay).toHaveCSS('filter', 'none');
        await expect(bearSvg).toHaveCSS('filter', 'none');

        // Switch back to Filters tab and select Hi-Con Mono (B&W+) filter
        await openStudioTab(studioModal, 'Filters');
        const bwContrastBtn = filterSection.getByRole('button', { name: 'Photo filter: Hi-Con Mono', exact: true });
        await bwContrastBtn.click();
        await expectSelectedThumb(filtersGrid, 'Hi-Con Mono');
        await expect(bwContrastBtn).toHaveAttribute('aria-pressed', 'true');
        await expect(cropperImg).toHaveCSS('filter', /grayscale\(1\)|grayscale\(100%\)/);

        // Select None to restore
        const noneFilterBtn = filterSection.getByRole('button', { name: 'Photo filter: None', exact: true });
        await noneFilterBtn.click();
        await expectSelectedThumb(filtersGrid, 'None');
        await expect(cropperImg).toHaveCSS('filter', 'none');
    });

    test('should support selective color filters (Red Pop, Green Pop, Blue Pop) and export successfully', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

        // Switch to Filters tab
        await openStudioTab(studioModal, 'Filters');

        const filterSection = studioModal.locator('.story-tab--filters');
        await expect(filterSection).toBeVisible();
        const filtersGrid = filterSection.locator('#story-export-filters-grid');
        const cropperImg = studioModal.locator('.story-cropper__image');
        const filterBtn = (label: string) =>
            filterSection.getByRole('button', { name: `Photo filter: ${label}`, exact: true });

        // 1. Test Red Pop
        const redPopBtn = filterBtn('Red Pop');
        await redPopBtn.click();
        await expectSelectedThumb(filtersGrid, 'Red Pop');
        await expect(redPopBtn).toHaveAttribute('aria-pressed', 'true');
        await expect(cropperImg).toHaveCSS('filter', /url\("#?story-filter-selective-red"\)/);

        // Verify strength slider is active
        const slider = filterSection.locator('.story-strength input[type="range"][aria-label="Filter Strength"]');
        await expect(slider).toBeVisible();

        // 2. Test Green Pop & Blue Pop
        await filterBtn('Green Pop').click();
        await expectSelectedThumb(filtersGrid, 'Green Pop');
        await expect(cropperImg).toHaveCSS('filter', /url\("#?story-filter-selective-green"\)/);

        await filterBtn('Blue Pop').click();
        await expectSelectedThumb(filtersGrid, 'Blue Pop');
        await expect(cropperImg).toHaveCSS('filter', /url\("#?story-filter-selective-blue"\)/);

        // 3. Test Yellow Pop & Purple Pop
        await filterBtn('Yellow Pop').click();
        await expectSelectedThumb(filtersGrid, 'Yellow Pop');
        await expect(cropperImg).toHaveCSS('filter', /url\("#?story-filter-selective-yellow"\)/);

        await filterBtn('Purple Pop').click();
        await expectSelectedThumb(filtersGrid, 'Purple Pop');
        await expect(cropperImg).toHaveCSS('filter', /url\("#?story-filter-selective-purple"\)/);

        // 4. Test Teal & Orange (cinematic), Neon, Bleach, and Duotone
        await filterBtn('Teal & Orange').click();
        await expectSelectedThumb(filtersGrid, 'Teal & Orange');
        await expect(cropperImg).toHaveCSS('filter', /url\("#?story-filter-cinematic"\)/);

        await filterBtn('Neon').click();
        await expectSelectedThumb(filtersGrid, 'Neon');
        await expect(cropperImg).toHaveCSS('filter', /url\("#?story-filter-neon"\)/);

        await filterBtn('Bleach').click();
        await expectSelectedThumb(filtersGrid, 'Bleach');
        await expect(cropperImg).toHaveCSS('filter', /contrast\(135%\)|contrast\(1\.35\)/);

        await filterBtn('Duotone').click();
        await expectSelectedThumb(filtersGrid, 'Duotone');
        await expect(cropperImg).toHaveCSS('filter', /url\("#?story-filter-duotone"\)/);

        // 5. Download story with Duotone filter active to ensure canvas export succeeds
        const downloadBtn = exportButton(studioModal);
        await expect(downloadBtn).toBeEnabled({ timeout: 10000 });
        await downloadBtn.click();

        // Check for download confirmation state
        await expect(downloadBtn).toHaveAttribute('aria-label', 'Story Card Downloaded', { timeout: 10000 });
    });

    // The thumbnail lists are sectioned: Recent (only once something was exported), then one section per
    // category, with None pinned first in the first section. Selecting alone records nothing; a download
    // records the item and surfaces it in Recent.
    test('should record a filter as Recent only upon download/share', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);
        const readRecent = () =>
            page.evaluate(() => JSON.parse(localStorage.getItem('story-recent-filters') || '[]') as string[]);
        expect(await readRecent()).toEqual([]);

        // Switch to Filters tab and select Red Pop by its thumb label
        await openStudioTab(studioModal, 'Filters');
        const filtersGrid = studioModal.locator('#story-export-filters-grid');
        await expect(thumbByLabel(filtersGrid, 'None')).toBeVisible();
        const redPopCard = thumbByLabel(filtersGrid, 'Red Pop');
        await redPopCard.click();

        // Selecting alone does not record a recent filter
        await expectSelectedThumb(filtersGrid, 'Red Pop');
        expect(await readRecent()).toEqual([]);
        await expect(filtersGrid.getByRole('group', { name: 'Recent', exact: true })).toHaveCount(0);

        // Download the story card
        const downloadBtn = exportButton(studioModal);
        await expect(downloadBtn).toBeEnabled({ timeout: 10000 });
        await downloadBtn.click();
        await expect(downloadBtn).toHaveAttribute('aria-label', 'Story Card Downloaded', { timeout: 10000 });

        // Now exactly one recent filter is recorded and listed under Recent
        await expect.poll(async () => (await readRecent()).length).toBe(1);
        await expect(
            thumbByLabel(filtersGrid.getByRole('group', { name: 'Recent', exact: true }), 'Red Pop')
        ).toBeVisible();
    });

    test('should record a frame as Recent only upon download/share', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);
        const readRecent = () =>
            page.evaluate(() => JSON.parse(localStorage.getItem('story-recent-frames') || '[]') as string[]);
        expect(await readRecent()).toEqual([]);

        // Switch to Frames tab and select Grizzly by its thumb label
        await openStudioTab(studioModal, 'Frames');
        const framesGrid = studioModal.locator('#story-export-frames-grid');
        await expect(thumbByLabel(framesGrid, 'None')).toBeVisible();
        const grizzlyCard = thumbByLabel(framesGrid, 'Grizzly');
        await grizzlyCard.click();

        // Selecting alone does not record a recent frame
        await expectSelectedThumb(framesGrid, 'Grizzly');
        expect(await readRecent()).toEqual([]);
        await expect(framesGrid.getByRole('group', { name: 'Recent', exact: true })).toHaveCount(0);

        // Download the story card
        const downloadBtn = exportButton(studioModal);
        await expect(downloadBtn).toBeEnabled({ timeout: 10000 });
        await downloadBtn.click();
        await expect(downloadBtn).toHaveAttribute('aria-label', 'Story Card Downloaded', { timeout: 10000 });

        // Now exactly one recent frame is recorded and listed under Recent
        await expect.poll(async () => (await readRecent()).length).toBe(1);
        await expect(
            thumbByLabel(framesGrid.getByRole('group', { name: 'Recent', exact: true }), 'Grizzly')
        ).toBeVisible();
    });

    test('should not automatically switch to Padded mode when changing background color or frosting style', async ({ page }) => {
        await openFirstPhotoLightbox(page);
        const studioModal = await openStoryMakerFromLightbox(page);

        // Ensure we are in Layout tab
        await openStudioTab(studioModal, 'Layout');

        // Check active preset is not Padded
        const paddedPill = studioModal.locator('.story-export-modal__preset-pill:has-text("Padded")');
        await expect(paddedPill).not.toHaveClass(/active/);
        await expect(studioModal.locator('.story-cropper--padded')).toHaveCount(0);

        // Click "Solid" background style pill
        const solidBtn = studioModal.locator('.story-export-modal__pill:has-text("Solid")');
        await expect(solidBtn).toBeVisible();
        await solidBtn.click();
        await expect(solidBtn).toHaveClass(/active/);

        // Verify it did NOT switch to Padded mode
        await expect(paddedPill).not.toHaveClass(/active/);
        await expect(studioModal.locator('.story-cropper--padded')).toHaveCount(0);

        // Pick a background colour preset (e.g. Red) from the colour popover
        await studioModal.locator('.story-export-modal__background-header-tint .story-tint__trigger').click();
        const redSwatch = studioModal.locator('#story-bg-color-popover button[aria-label="Background color: Red"]');
        await expect(redSwatch).toBeVisible();
        await redSwatch.click();
        await expect(redSwatch).toHaveClass(/is-active/);

        // Verify it still did NOT switch to Padded mode
        await expect(paddedPill).not.toHaveClass(/active/);
        await expect(studioModal.locator('.story-cropper--padded')).toHaveCount(0);
    });
});

/**
 * Layout modes: one tab bar in every mode; the panel is docked (side), stacked under the preview,
 * or a collapsible bottom sheet (phones).
 */
test.describe('Story Maker layout modes', () => {
    test.beforeEach(async ({ page, isMobile }) => {
        test.skip(isMobile, 'Viewport-driven layout mode tests run on desktop browsers');
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test.describe('phone portrait (sheet)', () => {
        test.use({ viewport: { width: 393, height: 851 } });

        test('collapsed sheet shows tab bar + export button; tabs open, switch and collapse the sheet', async ({ page }) => {
            await openFirstPhotoLightbox(page);
            const studioModal = await openStoryMakerFromLightbox(page);

            expect(await getStoryLayoutMode(studioModal)).toBe('sheet');
            await expect(page.locator('.story-export-modal--sheet')).toHaveCount(1);

            const panel = studioPanel(studioModal);
            await expect(panel).toHaveClass(/story-studio-panel--sheet/);
            await expect(panel).not.toHaveClass(/story-studio-panel--open/);
            await expect(panel.locator('.story-studio-panel__handle')).toBeVisible();
            await expect(studioModal.locator('.story-tab-bar')).toHaveCount(1);
            await expect(studioModal.locator('.story-tab-bar [role="tab"]')).toHaveCount(4);
            // Collapsed: no tab is shown open, content not rendered
            await expect(studioModal.locator('.story-tab-bar__tab.is-active')).toHaveCount(0);
            await expect(studioTabPanel(studioModal)).toHaveCount(0);
            await expect(studioModal.locator('.story-studio-panel__backdrop')).toHaveCount(0);
            await expect(exportButton(studioModal)).toBeVisible();

            // Tap Frames -> sheet opens on Frames
            const framesTab = studioTab(studioModal, 'Frames');
            await framesTab.click();
            await expect(panel).toHaveClass(/story-studio-panel--open/);
            await expect(framesTab).toHaveAttribute('aria-expanded', 'true');
            await expect(framesTab).toHaveClass(/is-active/);
            await expect(studioTabPanel(studioModal)).toBeVisible();
            await expect(studioModal.locator('#story-export-frames-grid')).toBeVisible();
            await expect(studioModal.locator('.story-studio-panel__backdrop')).toBeVisible();
            await expect(exportButton(studioModal)).toBeVisible();

            // Tap Filters -> stays open, switches content
            const filtersTab = studioTab(studioModal, 'Filters');
            await filtersTab.click();
            await expect(panel).toHaveClass(/story-studio-panel--open/);
            await expect(filtersTab).toHaveAttribute('aria-expanded', 'true');
            await expect(framesTab).toHaveAttribute('aria-expanded', 'false');
            await expect(studioModal.locator('#story-export-filters-grid')).toBeVisible();

            // Tap the active tab again -> collapses
            await filtersTab.click();
            await expect(panel).not.toHaveClass(/story-studio-panel--open/);
            await expect(filtersTab).toHaveAttribute('aria-expanded', 'false');
            await expect(studioTabPanel(studioModal)).toHaveCount(0);

            // Escape collapses an open sheet without closing the modal
            await openStudioTab(studioModal, 'Layout');
            await page.keyboard.press('Escape');
            await expect(panel).not.toHaveClass(/story-studio-panel--open/);
            await expect(studioModal).toBeVisible();

            // Backdrop click collapses the sheet
            await openStudioTab(studioModal, 'Badges');
            const backdrop = studioModal.locator('.story-studio-panel__backdrop');
            await expect(backdrop).toBeVisible();
            await backdrop.click({ position: { x: 10, y: 10 } });
            await expect(panel).not.toHaveClass(/story-studio-panel--open/);
            await expect(studioModal).toBeVisible();

            // With the sheet collapsed, Escape closes the modal
            await page.keyboard.press('Escape');
            await expect(studioModal).not.toBeVisible({ timeout: 5000 });
        });

        test('edits made in the sheet apply to the preview', async ({ page }) => {
            await openFirstPhotoLightbox(page);
            const studioModal = await openStoryMakerFromLightbox(page);

            // Layout -> Padded
            await openStudioTab(studioModal, 'Layout');
            await studioModal.locator('button:has-text("Padded")').click();
            await expect(studioModal.locator('.story-cropper__image-wrapper--padded')).toBeVisible({ timeout: 5000 });

            // Frames -> Grizzly; selection persists after collapsing
            await openStudioTab(studioModal, 'Frames');
            const framesGrid = studioModal.locator('#story-export-frames-grid');
            await thumbByLabel(framesGrid, 'Grizzly').click();
            await expectSelectedThumb(framesGrid, 'Grizzly');
            await collapseSheet(page, studioModal);
            await expect(studioModal.locator('.story-studio__preview .story-frame-overlay')).toBeVisible();

            await openStudioTab(studioModal, 'Frames');
            await expectSelectedThumb(studioModal.locator('#story-export-frames-grid'), 'Grizzly');
        });
    });

    test.describe('tablet portrait (stacked)', () => {
        test.use({ viewport: { width: 1024, height: 1366 } });

        test('preview sits above an always-open panel', async ({ page }) => {
            await openFirstPhotoLightbox(page);
            const studioModal = await openStoryMakerFromLightbox(page);

            expect(await getStoryLayoutMode(studioModal)).toBe('stacked');
            await expect(page.locator('.story-export-modal--stacked')).toHaveCount(1);

            const panel = studioPanel(studioModal);
            await expect(panel).toHaveClass(/story-studio-panel--stacked/);
            await expect(panel.locator('.story-studio-panel__handle')).toHaveCount(0);
            await expect(studioModal.locator('.story-studio-panel__backdrop')).toHaveCount(0);
            await expect(studioTabPanel(studioModal)).toBeVisible();
            await expect(studioTab(studioModal, 'Layout')).toHaveClass(/is-active/);
            await expect(studioTab(studioModal, 'Layout')).not.toHaveAttribute('aria-expanded', /.*/);

            const previewBox = await studioModal.locator('.story-studio__preview').boundingBox();
            const panelBox = await panel.boundingBox();
            expect(previewBox).not.toBeNull();
            expect(panelBox).not.toBeNull();
            expect(previewBox!.y + previewBox!.height).toBeLessThanOrEqual(panelBox!.y + 1);

            // Clicking the active tab never collapses the panel outside sheet mode
            await studioTab(studioModal, 'Frames').click();
            await expect(studioModal.locator('#story-export-frames-grid')).toBeVisible();
            await studioTab(studioModal, 'Frames').click();
            await expect(studioTabPanel(studioModal)).toBeVisible();

            await page.keyboard.press('Escape');
            await expect(studioModal).not.toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('landscape phone (side)', () => {
        test.use({ viewport: { width: 851, height: 393 } });

        test('preview on the left, panel docked on the right', async ({ page }) => {
            await openFirstPhotoLightbox(page);
            const studioModal = await openStoryMakerFromLightbox(page);

            expect(await getStoryLayoutMode(studioModal)).toBe('side');
            await expect(page.locator('.story-export-modal--side')).toHaveCount(1);

            const panel = studioPanel(studioModal);
            await expect(panel).toHaveClass(/story-studio-panel--side/);
            await expect(panel.locator('.story-studio-panel__handle')).toHaveCount(0);
            await expect(studioTabPanel(studioModal)).toBeVisible();
            await expect(exportButton(studioModal)).toBeVisible();

            const previewBox = await studioModal.locator('.story-studio__preview').boundingBox();
            const panelBox = await panel.boundingBox();
            expect(previewBox).not.toBeNull();
            expect(panelBox).not.toBeNull();
            expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(panelBox!.x + 1);

            await openStudioTab(studioModal, 'Filters');
            await expect(studioModal.locator('#story-export-filters-grid')).toBeVisible();
        });
    });
});
