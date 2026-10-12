import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Shared Story Maker (Story Studio) helpers for e2e specs.
 *
 * Layout modes (src/hooks/useStoryLayoutMode.ts):
 * - `side`: landscape windows, preview left + panel right.
 * - `stacked`: portrait, width >= 600 and height >= 820, preview top + always-open panel.
 * - `sheet`: other portrait windows (phones), panel is a collapsible bottom sheet.
 */
export type StoryLayoutMode = 'side' | 'stacked' | 'sheet';
export type StudioTabName = 'Layout' | 'Filters' | 'Frames' | 'Badges';

export const STORY_MODAL_SELECTOR = '[role="dialog"][aria-label="Story Maker"]';
export const LIGHTBOX_SELECTOR = '[role="dialog"][aria-label="Photo lightbox"]';

/** Opens the lightbox on the first photo and returns its locator. */
export async function openFirstPhotoLightbox(page: Page): Promise<Locator> {
    const lightbox = page.locator(LIGHTBOX_SELECTOR);
    if (await lightbox.isVisible()) return lightbox;

    const photo = page.locator('.portfolio__featured-item, .portfolio__grid-item').first();
    await photo.waitFor({ state: 'visible', timeout: 15000 });
    await photo.scrollIntoViewIfNeeded();
    await photo.click();

    try {
        await expect(lightbox).toBeVisible({ timeout: 3000 });
    } catch {
        await photo.scrollIntoViewIfNeeded();
        await photo.click();
        await expect(lightbox).toBeVisible({ timeout: 15000 });
    }
    return lightbox;
}

/** Opens Story Maker from an open lightbox with the "c" shortcut and returns the modal locator. */
export async function openStoryMakerFromLightbox(page: Page): Promise<Locator> {
    const studioModal = page.locator(STORY_MODAL_SELECTOR);
    await page.waitForTimeout(400);
    await page.keyboard.press('c');

    try {
        await expect(studioModal).toBeVisible({ timeout: 5000 });
    } catch {
        const storyBtn = page.locator('button[aria-label="Story Maker (9:16)"]');
        if (await storyBtn.isVisible()) {
            await storyBtn.click();
        } else {
            await page.keyboard.press('c');
        }
        await expect(studioModal).toBeVisible({ timeout: 15000 });
    }

    return studioModal;
}

/** Reads the active layout mode from the `.story-studio--{mode}` root class. */
export async function getStoryLayoutMode(studioModal: Locator): Promise<StoryLayoutMode> {
    const root = studioModal.locator('.story-studio');
    await expect(root).toBeVisible();
    const cls = (await root.getAttribute('class')) ?? '';
    if (cls.includes('story-studio--sheet')) return 'sheet';
    if (cls.includes('story-studio--stacked')) return 'stacked';
    return 'side';
}

export function studioTab(studioModal: Locator, name: StudioTabName): Locator {
    return studioModal.locator(`.story-tab-bar [role="tab"][aria-label="${name}"]`);
}

export function studioPanel(studioModal: Locator): Locator {
    return studioModal.locator('section.story-studio-panel');
}

export function studioTabPanel(studioModal: Locator): Locator {
    return studioModal.locator('#story-studio-tabpanel');
}

/**
 * Shows a studio tab's content in any layout mode.
 * Side / stacked: selects the tab. Sheet: taps the tab so the sheet opens on it (never collapses it).
 */
export async function openStudioTab(studioModal: Locator, name: StudioTabName): Promise<void> {
    const tab = studioTab(studioModal, name);
    const mode = await getStoryLayoutMode(studioModal);
    if (mode === 'sheet') {
        // Clicking the active tab of an open sheet collapses it, so only click when not already shown.
        if ((await tab.getAttribute('aria-expanded')) !== 'true') {
            await tab.click();
        }
        await expect(tab).toHaveAttribute('aria-expanded', 'true');
        await expect(studioPanel(studioModal)).toHaveClass(/story-studio-panel--open/);
    } else if ((await tab.getAttribute('aria-selected')) !== 'true') {
        await tab.click();
    }
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(studioTabPanel(studioModal)).toBeVisible();
}

/** Collapses the bottom sheet (sheet mode only) with Escape. No-op in side / stacked modes. */
export async function collapseSheet(page: Page, studioModal: Locator): Promise<void> {
    if ((await getStoryLayoutMode(studioModal)) !== 'sheet') return;
    const panel = studioPanel(studioModal);
    if (!/story-studio-panel--open/.test((await panel.getAttribute('class')) ?? '')) return;
    await page.keyboard.press('Escape');
    await expect(panel).not.toHaveClass(/story-studio-panel--open/);
    await expect(studioTabPanel(studioModal)).toHaveCount(0);
}

/** Main export (Download / Share) button. Its visible labels crossfade, so assert on aria-label, not text. */
export function exportButton(studioModal: Locator): Locator {
    return studioModal.locator('button.story-export-button__main');
}

export function exportCancelButton(studioModal: Locator): Locator {
    return studioModal.locator('button.story-export-button__cancel[aria-label="Cancel video export"]');
}

/**
 * A Frames / Filters thumbnail located by its exact visible label (thumb SVGs may contain other text).
 * Returns the first match so it stays usable if a thumb is listed in more than one section (e.g. Recent).
 */
export function thumbByLabel(grid: Locator, label: string): Locator {
    return grid
        .locator('button.story-thumb')
        .filter({
            has: grid.page().locator('.story-thumb__label', { hasText: new RegExp(`^${escapeRegExp(label)}$`) }),
        })
        .first();
}

/**
 * Selects a thumbnail, ensuring it is scrolled into view (crucial for WebKit where offscreen
 * thumbs inside custom scroll containers are not automatically scrolled before click).
 */
export async function selectThumb(thumb: Locator): Promise<void> {
    await thumb.scrollIntoViewIfNeeded();
    await thumb.click();
}

/** The selected thumb is the only "current selection" indicator now that the header badges are gone. */
export async function expectSelectedThumb(grid: Locator, label: string): Promise<void> {
    const selectedLabels = grid.locator('button.story-thumb[aria-pressed="true"] .story-thumb__label');
    await expect(selectedLabels.first()).toHaveText(label);
    // Every selected copy (if a thumb appears in several sections) must be the same item
    for (const text of await selectedLabels.allTextContents()) {
        expect(text).toBe(label);
    }
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
