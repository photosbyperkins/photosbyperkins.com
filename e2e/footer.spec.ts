import { test, expect } from '@playwright/test';

test.describe('Footer Redesign (One-Line Bar)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.portfolio__event').first().waitFor({ timeout: 10000 });
    });

    test('should display copyright on right of footer on desktop', async ({ page }) => {
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
            expect(actionsBox.x).toBeLessThan(copyBox.x);
        }
    });

    test('should display legal policy triggers on right side of footer', async ({ page }) => {
        const aboutBtn = page.locator('button.footer__about-btn');
        const aiBtn = page.locator('button.footer__ai-policy-btn');
        const codeBtn = page.locator('button.footer__code-license-btn');
        const photoBtn = page.locator('button.footer__license-btn');

        await expect(aboutBtn).toBeVisible();
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
                expect(box.width).toBeGreaterThanOrEqual(43.9);
                expect(box.height).toBeGreaterThanOrEqual(43.9);
            }
        }
    });

    test('should align all elements on one visual line on desktop with left actions and right attribution', async ({
        page,
        isMobile,
    }) => {
        test.skip(isMobile, 'Desktop one-line footer test is desktop-only');
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.locator('.footer').scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);

        const boxes = await page.evaluate(() => {
            const copy = document.querySelector('.footer__group--copy')?.getBoundingClientRect();
            const links = document.querySelector('.footer__group--links')?.getBoundingClientRect();
            const socials = document.querySelector('.footer__group--socials')?.getBoundingClientRect();
            if (!copy || !links || !socials) return null;
            return {
                copy: { x: copy.x, y: copy.y, width: copy.width, height: copy.height },
                links: { x: links.x, y: links.y, width: links.width, height: links.height },
                socials: { x: socials.x, y: socials.y, width: socials.width, height: socials.height },
            };
        });

        expect(boxes).not.toBeNull();
        if (boxes) {
            const { copy, links, socials } = boxes;
            // Check that vertical midpoints are aligned within 6px
            const copyMid = copy.y + copy.height / 2;
            const linksMid = links.y + links.height / 2;
            const socialsMid = socials.y + socials.height / 2;

            expect(Math.abs(copyMid - linksMid)).toBeLessThan(6);
            expect(Math.abs(linksMid - socialsMid)).toBeLessThan(6);

            // Left actions < Right attribution (Socials < Links < Copy)
            expect(socials.x).toBeLessThan(links.x);
            expect(links.x).toBeLessThan(copy.x);
        }
    });

    test('should use a balanced 2-row layout on mobile with copy and socials centered on row 2', async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.locator('.footer').scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);

        const boxes = await page.evaluate(() => {
            const links = document.querySelector('.footer__group--links')?.getBoundingClientRect();
            const copy = document.querySelector('.footer__group--copy')?.getBoundingClientRect();
            const socials = document.querySelector('.footer__group--socials')?.getBoundingClientRect();
            if (!links || !copy || !socials) return null;
            return {
                links: { x: links.x, y: links.y, width: links.width, height: links.height },
                copy: { x: copy.x, y: copy.y, width: copy.width, height: copy.height },
                socials: { x: socials.x, y: socials.y, width: socials.width, height: socials.height },
            };
        });

        expect(boxes).not.toBeNull();
        if (boxes) {
            const { links, copy, socials } = boxes;
            // Row 1 (links) must be strictly above Row 2 (copy & socials)
            expect(links.y + links.height).toBeLessThanOrEqual(copy.y + 4);

            // Row 2: copy and socials must share the same horizontal line
            const copyMid = copy.y + copy.height / 2;
            const socialsMid = socials.y + socials.height / 2;
            expect(Math.abs(copyMid - socialsMid)).toBeLessThan(15);

            // Row 2: copy is to the left of socials
            expect(copy.x).toBeLessThan(socials.x);
        }
    });
});
