import { test, expect } from '@playwright/test';

test.describe('Footer Redesign (One-Line Bar)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should display copyright on left of footer on desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.locator('.footer').scrollIntoViewIfNeeded();

        const copy = page.locator('.footer__copy');
        await expect(copy).toBeVisible();
        await expect(copy).toContainText('Photos by Perkins');

        const copyBox = await page.locator('.footer__group--copy').boundingBox();
        const actionsBox = await page.locator('.footer__actions').boundingBox();
        expect(copyBox).not.toBeNull();
        expect(actionsBox).not.toBeNull();
        if (copyBox && actionsBox) {
            expect(copyBox.x).toBeLessThan(actionsBox.x);
        }
    });

    test('should display legal policy triggers on right side of footer', async ({ page }) => {
        const aiBtn = page.locator('button.footer__ai-policy-btn');
        const codeBtn = page.locator('button.footer__code-license-btn');
        const photoBtn = page.locator('button.footer__license-btn');

        await expect(aiBtn).toBeVisible();
        await expect(codeBtn).toBeVisible();
        await expect(photoBtn).toBeVisible();

        // Clicking AI policy opens native modal
        await aiBtn.click();
        const modal = page.locator('[role="dialog"][aria-label="AI Policy"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
    });

    test('should display social icons on right side of footer and no top button', async ({ page }) => {
        const socialLinks = page.locator('.footer__social');
        expect(await socialLinks.count()).toBeGreaterThanOrEqual(1);

        const topBtn = page.locator('button.footer__top-btn');
        await expect(topBtn).toHaveCount(0);
    });

    test('should have accessible touch targets >= 44px on all footer social links', async ({ page }) => {
        const interactiveElements = page.locator('.footer__social');
        const count = await interactiveElements.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const box = await interactiveElements.nth(i).boundingBox();
            expect(box).not.toBeNull();
            if (box) {
                expect(box.width).toBeGreaterThanOrEqual(44);
                expect(box.height).toBeGreaterThanOrEqual(44);
            }
        }
    });

    test('should align all elements on one visual line on desktop with left attribution and right actions', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.locator('.footer').scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);

        const copyBox = await page.locator('.footer__group--copy').boundingBox();
        const linksBox = await page.locator('.footer__group--links').boundingBox();
        const socialsBox = await page.locator('.footer__group--socials').boundingBox();

        expect(copyBox).not.toBeNull();
        expect(linksBox).not.toBeNull();
        expect(socialsBox).not.toBeNull();

        if (copyBox && linksBox && socialsBox) {
            // Check that vertical midpoints are aligned within 6px
            const copyMid = copyBox.y + copyBox.height / 2;
            const linksMid = linksBox.y + linksBox.height / 2;
            const socialsMid = socialsBox.y + socialsBox.height / 2;

            expect(Math.abs(copyMid - linksMid)).toBeLessThan(6);
            expect(Math.abs(linksMid - socialsMid)).toBeLessThan(6);

            // Left attribution < Right actions (Links < Socials)
            expect(copyBox.x).toBeLessThan(linksBox.x);
            expect(linksBox.x).toBeLessThan(socialsBox.x);
        }
    });

    test('should use a balanced 2-row layout on mobile with copy and socials centered on row 2', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('.footer').scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);

        const linksBox = await page.locator('.footer__group--links').boundingBox();
        const copyBox = await page.locator('.footer__group--copy').boundingBox();
        const socialsBox = await page.locator('.footer__group--socials').boundingBox();

        expect(linksBox).not.toBeNull();
        expect(copyBox).not.toBeNull();
        expect(socialsBox).not.toBeNull();

        if (linksBox && copyBox && socialsBox) {
            // Row 1 (links) must be strictly above Row 2 (copy & socials)
            expect(linksBox.y + linksBox.height).toBeLessThanOrEqual(copyBox.y + 4);

            // Row 2: copy and socials must share the same horizontal line
            const copyMid = copyBox.y + copyBox.height / 2;
            const socialsMid = socialsBox.y + socialsBox.height / 2;
            expect(Math.abs(copyMid - socialsMid)).toBeLessThan(15);

            // Row 2: copy is to the left of socials
            expect(copyBox.x).toBeLessThan(socialsBox.x);
        }
    });
});
