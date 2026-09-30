import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUDIT_DIR = path.resolve(process.cwd(), 'screenshots', 'frames_audit');

test.describe('Export Frame Permutations Visual Audit', () => {
    test.setTimeout(120000);

    test('generate 2x2 contact sheets for all frames across badge permutations', async ({ page }) => {
        if (!fs.existsSync(AUDIT_DIR)) {
            fs.mkdirSync(AUDIT_DIR, { recursive: true });
        }

        // Navigate to homepage to boot Vite and load fonts
        await page.goto('/');
        await page.waitForSelector('.portfolio__event, .portfolio__grid-item', { timeout: 15000 });
        await page.waitForTimeout(500);

        // Get sample photo URL from page
        const samplePhotoUrl = await page.evaluate(() => {
            const img = document.querySelector<HTMLImageElement>('.portfolio__featured-item img, .portfolio__grid-item img');
            return img ? img.src : '';
        });

        // Inject the audit runner into page
        const frameResults = await page.evaluate(async (photoUrl) => {
            // Import frame definitions via Vite
            const { STORY_FRAME_DEFINITIONS } = await import(
                '/src/components/sections/Portfolio/storyFrames/frameDefinitions.ts'
            );

            // Container for rendering
            let container = document.getElementById('audit-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'audit-container';
                container.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 1080px;
                    height: 1920px;
                    z-index: 999999;
                    background: #090a0f;
                    display: grid;
                    grid-template-columns: 540px 540px;
                    grid-template-rows: 960px 960px;
                    overflow: hidden;
                    box-sizing: border-box;
                    font-family: 'Outfit', sans-serif;
                `;
                document.body.appendChild(container);
            }

            const results: { id: string; label: string; index: number }[] = [];

            for (let i = 0; i < STORY_FRAME_DEFINITIONS.length; i++) {
                const def = STORY_FRAME_DEFINITIONS[i];
                results.push({ id: def.id, label: def.label, index: i });
            }

            return { frames: results, photoUrl };
        }, samplePhotoUrl);

        console.log(`Found ${frameResults.frames.length} frames to audit.`);

        // For each frame, render the 2x2 contact sheet and take a screenshot
        for (const frame of frameResults.frames) {
            await page.evaluate(async ({ frameId, photoUrl }) => {
                const { STORY_FRAMES_MAP } = await import(
                    '/src/components/sections/Portfolio/storyFrames/frameDefinitions.ts'
                );
                const def = STORY_FRAMES_MAP[frameId];
                const container = document.getElementById('audit-container')!;

                // Permutations: [hasAttribution, hasScoreboard, title]
                const configs = [
                    { hasAttribution: true, hasScoreboard: true, title: 'BOTH BADGES' },
                    { hasAttribution: true, hasScoreboard: false, title: 'ATTRIBUTION ONLY' },
                    { hasAttribution: false, hasScoreboard: true, title: 'SCOREBOARD ONLY' },
                    { hasAttribution: false, hasScoreboard: false, title: 'NO BADGES (CLEAN)' },
                ];

                const cardsHtml = await Promise.all(
                    configs.map(async (cfg) => {
                        const svgString = await def.getSvgString(undefined, {
                            hasAttribution: cfg.hasAttribution,
                            hasScoreboard: cfg.hasScoreboard,
                        });

                        const attributionBadgeHtml = cfg.hasAttribution
                            ? `
                            <div style="
                                position: absolute;
                                top: 52px;
                                left: 50%;
                                transform: translateX(-50%);
                                background: rgba(10, 10, 16, 0.88);
                                backdrop-filter: blur(12px);
                                border: 1px solid rgba(255, 255, 255, 0.2);
                                border-radius: 9999px;
                                height: 43px;
                                padding: 0 18px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                box-shadow: 0 4px 16px rgba(0,0,0,0.5);
                                z-index: 20;
                                white-space: nowrap;
                            ">
                                <svg width="21" height="21" viewBox="0 0 42 42" fill="none">
                                    <rect x="2" y="9" width="38" height="27" rx="6" stroke="#fff" stroke-width="3"/>
                                    <circle cx="21" cy="22.5" r="7.5" stroke="#fff" stroke-width="3"/>
                                    <path d="M14 9L17 4H25L28 9" stroke="#fff" stroke-width="3"/>
                                </svg>
                                <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 300; color: #fff; letter-spacing: 0.05em;">
                                    PHOTOS BY <span style="color: #e60000; font-weight: 600;">PERKINS</span>
                                </span>
                                <span style="font-family: 'Outfit', sans-serif; font-size: 13px; color: rgba(255,255,255,0.7);">@photosbyperkins</span>
                            </div>
                        `
                            : '';

                        const scoreboardBadgeHtml = cfg.hasScoreboard
                            ? `
                            <div style="
                                position: absolute;
                                bottom: 52px;
                                left: 50%;
                                transform: translateX(-50%);
                                background: rgba(10, 10, 16, 0.9);
                                backdrop-filter: blur(14px);
                                border: 1px solid rgba(255, 255, 255, 0.2);
                                border-radius: 14px;
                                height: 66px;
                                padding: 0 20px;
                                display: flex;
                                align-items: center;
                                gap: 14px;
                                box-shadow: 0 6px 20px rgba(0,0,0,0.6);
                                z-index: 20;
                                white-space: nowrap;
                            ">
                                <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 26px; font-weight: 700; color: #e60000; letter-spacing: 0.02em;">09.19</span>
                                <div style="width: 1px; height: 38px; background: rgba(255,255,255,0.25);"></div>
                                <div style="display: flex; flex-direction: column; gap: 2px;">
                                    <div style="display: flex; justify-content: space-between; gap: 16px; font-family: 'Barlow Condensed', sans-serif; font-size: 15px; font-weight: 700; color: #fff;">
                                        <span>SRD CAPITAL MAULSTARS</span>
                                        <span>196</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; gap: 16px; font-family: 'Barlow Condensed', sans-serif; font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.7);">
                                        <span>RCR HIGH ROLLERS</span>
                                        <span>131</span>
                                    </div>
                                </div>
                            </div>
                        `
                            : '';

                        return `
                            <div style="
                                position: relative;
                                width: 540px;
                                height: 960px;
                                overflow: hidden;
                                background: #000;
                                border: 1px solid rgba(255,255,255,0.1);
                                box-sizing: border-box;
                            ">
                                <!-- Photo Background (Blurred + Centered Crop) -->
                                <img src="${photoUrl}" style="
                                    position: absolute;
                                    inset: 0;
                                    width: 100%;
                                    height: 100%;
                                    object-fit: cover;
                                    filter: brightness(0.9);
                                " />

                                <!-- Decorative Frame Overlay (Scaled to 540x960) -->
                                <div style="
                                    position: absolute;
                                    inset: 0;
                                    width: 540px;
                                    height: 960px;
                                    pointer-events: none;
                                    z-index: 10;
                                ">
                                    <div style="
                                        width: 1080px;
                                        height: 1920px;
                                        transform: scale(0.5);
                                        transform-origin: top left;
                                    ">
                                        ${svgString}
                                    </div>
                                </div>

                                <!-- Badges -->
                                ${attributionBadgeHtml}
                                ${scoreboardBadgeHtml}

                                <!-- Quadrant Label Tag -->
                                <div style="
                                    position: absolute;
                                    top: 12px;
                                    left: 14px;
                                    background: rgba(0, 0, 0, 0.75);
                                    border: 1px solid rgba(255, 255, 255, 0.25);
                                    border-radius: 6px;
                                    padding: 3px 8px;
                                    font-size: 11px;
                                    font-weight: 700;
                                    color: #fbbf24;
                                    letter-spacing: 0.08em;
                                    z-index: 30;
                                    text-transform: uppercase;
                                ">
                                    ${cfg.title}
                                </div>
                            </div>
                        `;
                    })
                );

                container.innerHTML = cardsHtml.join('');
            }, { frameId: frame.id, photoUrl: frameResults.photoUrl });

            await page.waitForTimeout(100);
            const containerHandle = page.locator('#audit-container');
            const paddedIdx = String(frame.index).padStart(2, '0');
            const outFile = path.join(AUDIT_DIR, `${paddedIdx}_${frame.id}.png`);
            await containerHandle.screenshot({ path: outFile });
            console.log(`Saved audit sheet: ${paddedIdx}_${frame.id}.png`);
        }
    });
});
