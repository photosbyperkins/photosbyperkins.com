import { test, expect, type Page, type Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Design-review captures for the Story Maker studio (side / stacked / sheet layouts) and animated frames.
 *
 * Run: STORY_SHOTS_DIR=<dir> npx playwright test e2e/capture-animated-story.spec.ts --project=chromium
 * Optional: STORY_FRAMES="Voltage,Claws" captures frame motion for those frame labels.
 */
const OUT_DIR = process.env.STORY_SHOTS_DIR || path.join('test-results', 'animated-story-shots');
const FRAME_LABELS = (process.env.STORY_FRAMES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

type LayoutMode = 'side' | 'stacked' | 'sheet';

test.use({ channel: 'chrome' });
test.describe.configure({ mode: 'parallel' });

async function shot(page: Page, name: string) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
}

async function openStoryMaker(page: Page, viaButton: boolean): Promise<Locator> {
    await page.goto('/');
    const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
    await photo.waitFor({ timeout: 20000 });
    await photo.click();
    const lightbox = page.locator('[role="dialog"][aria-label="Photo lightbox"]');
    await expect(lightbox).toBeVisible({ timeout: 10000 });
    if (viaButton) {
        await lightbox.locator('button[aria-label="Story Maker (9:16)"]').click();
    } else {
        await page.keyboard.press('c');
    }
    const modal = page.locator('[role="dialog"][aria-label="Story Maker"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(900);
    return modal;
}

/** Selects a studio tab. In sheet mode this also expands the sheet (a tap on the open tab would collapse it). */
async function openTab(page: Page, modal: Locator, name: string) {
    const tab = modal.locator(`.story-tab-bar [role="tab"][aria-label="${name}"]`);
    const isOpen = (await modal.locator('#story-studio-tabpanel').count()) > 0;
    const isSelected = (await tab.getAttribute('aria-selected')) === 'true';
    if (!(isOpen && isSelected)) await tab.click();
    await expect(modal.locator('#story-studio-tabpanel')).toBeVisible();
    await page.waitForTimeout(500);
}

async function collapseSheet(page: Page) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
}

async function captureAnimatedFrame(page: Page, modal: Locator, prefix: string, mode: LayoutMode) {
    await openTab(page, modal, 'Frames');
    await shot(page, `${prefix}_03_frames_tab`);

    // Filmstrip: scroll into the middle of a section so its sticky header is visible
    const strip = modal.locator('#story-export-frames-grid.story-thumbs--strip');
    if (await strip.count()) {
        await strip.evaluate((el) => el.scrollTo({ left: 1500 }));
        await page.waitForTimeout(250);
        await shot(page, `${prefix}_03b_frames_strip_scrolled`);
    }

    // Pick a decorative frame (index 0 is "None")
    await modal.locator('.story-thumb--frame').nth(1).click();
    await page.waitForTimeout(300);

    const animateOn = modal.locator('.story-animate-toggle').getByRole('button', { name: 'On', exact: true });
    await expect(animateOn).toBeEnabled({ timeout: 8000 });
    await animateOn.click();
    await expect(animateOn).toHaveAttribute('aria-pressed', 'true');
    await shot(page, `${prefix}_04_frames_animate_on`);

    // Tint popover
    await modal.locator('.story-tint__trigger').click();
    await page.waitForTimeout(250);
    await shot(page, `${prefix}_05_frames_tint_popover`);
    await page.keyboard.press('Escape');

    if (mode === 'sheet') await collapseSheet(page);
    await page.waitForTimeout(800);

    const canvas = modal.locator('canvas.story-frame-overlay').first();
    await expect(canvas).toBeVisible({ timeout: 5000 });
    await shot(page, `${prefix}_06_frame_animated_live`);

    const dlBtn = modal.locator('.story-export-modal__primary-action');
    await expect(dlBtn).toContainText('Story Card');
}

/** Starts a video export and captures the integrated progress + ✕ cancel state, then cancels. */
async function captureRendering(page: Page, modal: Locator, prefix: string) {
    await modal.locator('.story-export-modal__primary-action').click();
    const rendering = modal.locator('.story-export-button--rendering');
    const started = await rendering
        .waitFor({ timeout: 8000 })
        .then(() => true)
        .catch(() => false);
    if (!started) return;
    await page.waitForTimeout(1200);
    await shot(page, `${prefix}_09_rendering`);
    await modal.getByRole('button', { name: 'Cancel video export' }).click();
    await expect(modal.locator('.story-export-button--idle')).toBeVisible({ timeout: 8000 });
}

async function captureFrames(page: Page, modal: Locator, prefix: string) {
    if (!FRAME_LABELS.length) return;
    await openTab(page, modal, 'Frames');
    for (const label of FRAME_LABELS) {
        const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const card = modal.locator(`.story-thumb--frame:has(.story-thumb__label:text-is("${label}"))`).first();
        await card.scrollIntoViewIfNeeded();
        await card.click();
        await page.waitForTimeout(600);
        await page.locator('.story-cropper__viewport, .story-burst-cropper').first().screenshot({
            path: path.join(OUT_DIR, `${prefix}_frame_${slug}_live.png`),
        });
    }
}

async function captureStudio(page: Page, prefix: string, mode: LayoutMode) {
    const modal = await openStoryMaker(page, true);
    await expect(modal.locator(`.story-studio--${mode}`)).toBeVisible();
    await shot(page, `${prefix}_01_initial`);

    await openTab(page, modal, 'Layout');
    await shot(page, `${prefix}_02_layout_tab`);

    await captureAnimatedFrame(page, modal, prefix, mode);

    await openTab(page, modal, 'Filters');
    await modal.locator('#story-export-filters-grid .story-thumb').nth(2).click();
    await page.waitForTimeout(300);
    await shot(page, `${prefix}_07_filters_tab`);

    await openTab(page, modal, 'Badges');
    await shot(page, `${prefix}_08_badges_tab`);

    if (mode === 'sheet') await collapseSheet(page);
    await captureRendering(page, modal, prefix);

    await captureFrames(page, modal, prefix);
}

test.describe('Story Maker design captures', () => {
    test.setTimeout(180000);

    test('desktop 1440x900 (side)', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await captureStudio(page, 'desktop', 'side');
    });

    test('small desktop 1280x720 (side)', async ({ page }) => {
        test.skip(FRAME_LABELS.length > 0, 'Frame captures run on desktop only');
        await page.setViewportSize({ width: 1280, height: 720 });
        await captureStudio(page, 'desktop-sm', 'side');
    });

    test('tablet portrait 1024x1366 (stacked)', async ({ page }) => {
        test.skip(FRAME_LABELS.length > 0, 'Frame captures run on desktop only');
        await page.setViewportSize({ width: 1024, height: 1366 });
        await captureStudio(page, 'tablet', 'stacked');
    });

    test.describe('phones', () => {
        test.use({ isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

        test('portrait phone 393x851 (sheet)', async ({ page }) => {
            test.skip(FRAME_LABELS.length > 0, 'Frame captures run on desktop only');
            await page.setViewportSize({ width: 393, height: 851 });
            await captureStudio(page, 'mobile', 'sheet');
        });

        test('landscape phone 851x393 (side)', async ({ page }) => {
            test.skip(FRAME_LABELS.length > 0, 'Frame captures run on desktop only');
            await page.setViewportSize({ width: 851, height: 393 });
            await captureStudio(page, 'landscape', 'side');
        });
    });
});
