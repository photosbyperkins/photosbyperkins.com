import { test, expect } from '@playwright/test';

test.describe('AI Policy Overlay', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should display AI Policy button in footer next to License', async ({ page }) => {
        const licenseLink = page.locator('.footer__license');
        const aiPolicyBtn = page.locator('button.footer__ai-policy-btn');

        await expect(licenseLink).toBeVisible();
        await expect(aiPolicyBtn).toBeVisible();
        await expect(aiPolicyBtn).toHaveText('AI Policy');
    });

    test('should open AI Policy overlay when clicking the footer button', async ({ page }) => {
        const aiPolicyBtn = page.locator('button.footer__ai-policy-btn');
        await aiPolicyBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="AI Policy"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });
    });

    test('should close AI Policy overlay via close button', async ({ page }) => {
        const aiPolicyBtn = page.locator('button.footer__ai-policy-btn');
        await aiPolicyBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="AI Policy"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });
        await page.waitForTimeout(500);

        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('should close AI Policy overlay via Escape key', async ({ page }) => {
        const aiPolicyBtn = page.locator('button.footer__ai-policy-btn');
        await aiPolicyBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="AI Policy"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });
        await page.waitForTimeout(500);

        await page.keyboard.press('Escape');
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('should lock body scroll when AI Policy overlay is open', async ({ page }) => {
        const aiPolicyBtn = page.locator('button.footer__ai-policy-btn');
        await aiPolicyBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="AI Policy"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        const overflow = await page.evaluate(() => document.body.style.overflow);
        expect(overflow).toBe('hidden');
    });

    test('should restore body scroll after AI Policy overlay closes', async ({ page }) => {
        const aiPolicyBtn = page.locator('button.footer__ai-policy-btn');
        await aiPolicyBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="AI Policy"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });
        await page.waitForTimeout(500);

        const closeBtn = overlay.locator('button[aria-label="Close"]');
        await closeBtn.click();
        await expect(overlay).not.toBeVisible({ timeout: 3000 });

        const overflow = await page.evaluate(() => document.body.style.overflow);
        expect(overflow).toBe('');
    });

    test('should auto-focus the close button when opened', async ({ page }) => {
        const aiPolicyBtn = page.locator('button.footer__ai-policy-btn');
        await aiPolicyBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="AI Policy"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        // Wait a frame for requestAnimationFrame focus
        await page.waitForTimeout(100);

        const focusedLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
        expect(focusedLabel).toBe('Close');
    });

    test('should display policy content covering sharpening, denoising, alterations, and face detection', async ({
        page,
    }) => {
        const aiPolicyBtn = page.locator('button.footer__ai-policy-btn');
        await aiPolicyBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="AI Policy"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });

        // Verify header
        const header = overlay.locator('.section-label');
        await expect(header).toContainText('AI POLICY');

        // Verify key policy provisions
        const content = overlay.locator('.ai-policy__container');
        await expect(content).toContainText('Sharpening & Denoising');
        await expect(content).toContainText('No Generative Alterations');
        await expect(content).toContainText('Build-Time Focal Area Detection');
        await expect(content).toContainText('Website Development & Coding Assistance');
    });

    test('should have correct ARIA attributes', async ({ page }) => {
        const aiPolicyBtn = page.locator('button.footer__ai-policy-btn');
        await aiPolicyBtn.click();

        const overlay = page.locator('[role="dialog"][aria-label="AI Policy"]');
        await expect(overlay).toBeVisible({ timeout: 3000 });
        await expect(overlay).toHaveAttribute('aria-modal', 'true');
    });
});
