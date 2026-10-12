import { test, expect, type Page } from '@playwright/test';

async function openAiPolicy(page: Page) {
    const aiPolicyBtn = page.locator('button.footer__ai-policy-btn');
    await aiPolicyBtn.waitFor({ state: 'visible', timeout: 10000 });
    await aiPolicyBtn.scrollIntoViewIfNeeded();
    await aiPolicyBtn.click();

    const overlay = page.locator('[role="dialog"][aria-label="AI Policy"]');
    await expect(overlay).toBeVisible({ timeout: 10000 });
    return { aiPolicyBtn, overlay };
}

test.describe('AI Policy Overlay', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should display footer links in order: 1. Behind the Lens, 2. AI Policy, 3. Code License, 4. Photo License', async ({ page }) => {
        const links = page.locator('.footer__links button');
        await expect(links).toHaveCount(4);
        await expect(links.nth(0)).toHaveText('Behind the Lens');
        await expect(links.nth(1)).toHaveText('AI Policy');
        await expect(links.nth(2)).toContainText('Code License');
        await expect(links.nth(3)).toContainText('Photo License');
    });

    test('should open Code License in native modal', async ({ page }) => {
        const codeLicenseBtn = page.locator('button.footer__code-license-btn');
        await codeLicenseBtn.scrollIntoViewIfNeeded();
        await codeLicenseBtn.click();

        const overlay = page.locator('.code-license-overlay');
        await expect(overlay).toBeVisible({ timeout: 5000 });
        await expect(overlay.locator('.section-label')).toHaveText('CODE LICENSE');
        await expect(overlay.locator('.code-license__subtitle')).toContainText('MIT License');
        await expect(overlay.locator('pre')).toContainText('Permission is hereby granted, free of charge');

        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeVisible({ timeout: 5000 });
    });

    test('should open Photos License in native modal', async ({ page }) => {
        const photosLicenseBtn = page.locator('button.footer__license-btn');
        await photosLicenseBtn.scrollIntoViewIfNeeded();
        await photosLicenseBtn.click();

        const overlay = page.locator('.photo-license-overlay');
        await expect(overlay).toBeVisible({ timeout: 5000 });
        await expect(overlay.locator('.section-label')).toHaveText('PHOTO LICENSE');
        await expect(overlay.locator('.photo-license__subtitle')).toContainText(
            'Creative Commons Attribution-ShareAlike 4.0 International license'
        );
        await expect(overlay.locator('pre')).toContainText('CC BY-SA 4.0');

        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeVisible({ timeout: 5000 });
    });

    test('should open AI Policy overlay when clicking the footer button', async ({ page }) => {
        const { overlay } = await openAiPolicy(page);
        await expect(overlay).toBeVisible();
    });

    test('should close AI Policy overlay via close button', async ({ page }) => {
        const { overlay } = await openAiPolicy(page);
        await page.waitForTimeout(300);

        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeVisible({ timeout: 5000 });
    });

    test('should close AI Policy overlay via Escape key', async ({ page }) => {
        const { overlay } = await openAiPolicy(page);
        await page.waitForTimeout(300);

        await page.keyboard.press('Escape');
        await expect(overlay).not.toBeVisible({ timeout: 5000 });
    });

    test('should lock body scroll when AI Policy overlay is open', async ({ page }) => {
        await openAiPolicy(page);
        await expect.poll(async () => page.evaluate(() => document.body.style.overflow), { timeout: 5000 }).toBe('hidden');
    });

    test('should restore body scroll after AI Policy overlay closes', async ({ page }) => {
        const { overlay } = await openAiPolicy(page);
        await page.waitForTimeout(300);

        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeVisible({ timeout: 5000 });

        await expect.poll(async () => page.evaluate(() => document.body.style.overflow), { timeout: 5000 }).toBe('');
    });

    test('should auto-focus the close button when opened', async ({ page }) => {
        await openAiPolicy(page);
        await expect.poll(async () => page.evaluate(() => document.activeElement?.getAttribute('aria-label')), { timeout: 5000 }).toBe('Close');
    });

    test('should display policy content covering sharpening, denoising, alterations, and face detection', async ({
        page,
    }) => {
        const { overlay } = await openAiPolicy(page);

        // Verify header
        const header = overlay.locator('.section-label');
        await expect(header).toContainText('AI POLICY');

        // Verify key policy provisions
        const content = overlay.locator('.ai-policy__container');
        await expect(content).toContainText('Real Moments, Not Prompts');
        await expect(content).toContainText('High-ISO Cleanup Only');
        await expect(content).toContainText('Site Plumbing: Cropping & Code');
    });

    test('should have correct ARIA attributes', async ({ page }) => {
        const { overlay } = await openAiPolicy(page);
        await expect(overlay).toHaveAttribute('aria-modal', 'true');
    });
});
