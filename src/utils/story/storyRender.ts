import { STORY_WIDTH, STORY_HEIGHT, hexToRgba, isColorLight, getStoryFilterCss } from './storyConstants';
import type { StoryRenderConfig, BurstStoryOptions, StoryPhotoFilterId } from './storyConstants';
import { calculateBurstPanelCrop } from './storyMath';
import {
    drawRoundRect,
    drawCameraLogoIcon,
    drawStoryFrameToCanvas,
    applyFastBlurAndAdjust,
    applyStoryFilterToImageData,
    drawImageWithStoryFilter,
} from './storyDraw';
import type { StoryFrameContext } from '../../components/sections/Portfolio/storyFrames/types';
import { formatTeamName } from '../formatters';

/**
 * Renders the story image onto an HTML5 Canvas.
 */
export async function renderStoryToCanvas(
    img: HTMLImageElement | HTMLCanvasElement | (HTMLImageElement | HTMLCanvasElement | null | undefined)[],
    config: StoryRenderConfig,
    targetCanvas?: HTMLCanvasElement
): Promise<HTMLCanvasElement> {
    // Ensure all custom web fonts (e.g. Outfit, Barlow Condensed) are fully loaded before rasterization
    if (typeof document !== 'undefined' && 'fonts' in document && document.fonts?.ready) {
        try {
            await document.fonts.ready;
        } catch {
            // Ignore font loading errors, proceed with fallback fonts
        }
    }

    const canvas = targetCanvas || document.createElement('canvas');

    // Parse target resolution
    let targetW = STORY_WIDTH;
    let targetH = STORY_HEIGHT;
    if (config.resolution === '1440x2560') {
        targetW = 1440;
        targetH = 2560;
    } else if (config.resolution === '2160x3840') {
        targetW = 2160;
        targetH = 3840;
    }

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D canvas context');

    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const resScale = targetW / STORY_WIDTH;
    const imageList: (HTMLImageElement | HTMLCanvasElement | null | undefined)[] = Array.isArray(img) ? img : [img];
    const primaryImg = imageList.find((i): i is HTMLImageElement | HTMLCanvasElement => Boolean(i));
    if (!primaryImg && config.mode !== 'burst') return canvas;

    const naturalW = primaryImg ? ('naturalWidth' in primaryImg ? primaryImg.naturalWidth : primaryImg.width) : 1080;
    const naturalH = primaryImg ? ('naturalHeight' in primaryImg ? primaryImg.naturalHeight : primaryImg.height) : 1920;

    if (!naturalW || !naturalH) {
        return canvas;
    }

    // Resolve optional photo filter with strength
    const filterCss = config.filterId ? getStoryFilterCss(config.filterId, config.filterStrength ?? 1.0) : '';

    // ==========================================
    // 1. RENDER MODE: BURST (3-PANEL STACK)
    // ==========================================
    if (config.mode === 'burst') {
        renderBurstPanels(ctx, imageList, config, targetW, targetH, resScale, filterCss);
    }
    // ==========================================
    // 2. RENDER MODE: CROP & PADDED (requires primaryImg)
    // ==========================================
    else if (primaryImg) {
        if (config.mode === 'crop') {
            const { crop } = config;
            const sx = crop.x * naturalW;
            const sy = crop.y * naturalH;
            const sw = crop.width * naturalW;
            const sh = crop.height * naturalH;

            drawImageWithStoryFilter(
                ctx,
                primaryImg,
                sx,
                sy,
                sw,
                sh,
                0,
                0,
                targetW,
                targetH,
                config.filterId,
                config.filterStrength ?? 1.0,
                filterCss
            );
        } else {
            const { padded } = config;
            const scale = padded.cardScale || 0.92;
            const cornerRadius = (padded.cardCornerRadius || 24) * (targetW / STORY_WIDTH);

            // --- A. Background Rendering ---
            const isFrosted = padded.style === 'frosted' || padded.style === 'glass';
            if (isFrosted) {
                // Draw scaled background image
                const bgScale = Math.max(targetW / naturalW, targetH / naturalH);
                const bgW = naturalW * bgScale;
                const bgH = naturalH * bgScale;
                const bgX = (targetW - bgW) / 2;
                const bgY = (targetH - bgH) / 2;

                let blurred = false;
                if (typeof document !== 'undefined') {
                    try {
                        const sw = 64;
                        const sh = Math.round(64 * (targetH / targetW));
                        const smallCanvas = document.createElement('canvas');
                        smallCanvas.width = sw;
                        smallCanvas.height = sh;
                        const sCtx = smallCanvas.getContext('2d', { willReadFrequently: true });
                        if (sCtx && typeof sCtx.getImageData === 'function') {
                            const sScale = Math.max(sw / naturalW, sh / naturalH);
                            const sW = naturalW * sScale;
                            const sH = naturalH * sScale;
                            const sX = (sw - sW) / 2;
                            const sY = (sh - sH) / 2;
                            sCtx.drawImage(primaryImg, sX, sY, sW, sH);

                            const imgData = sCtx.getImageData(0, 0, sw, sh);
                            if (config.filterId && config.filterId !== 'none') {
                                applyStoryFilterToImageData(imgData, config.filterId, config.filterStrength ?? 1.0);
                            }
                            applyFastBlurAndAdjust(imgData, 4, 1.8, 0.65);
                            sCtx.putImageData(imgData, 0, 0);

                            ctx.save();
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(smallCanvas, 0, 0, targetW, targetH);
                            ctx.restore();
                            blurred = true;
                        }
                    } catch {
                        blurred = false;
                    }
                }

                if (!blurred) {
                    ctx.save();
                    if ('filter' in ctx) {
                        const blurEffect = `blur(${Math.round(48 * (targetW / STORY_WIDTH))}px) saturate(180%) brightness(0.65)`;
                        ctx.filter = filterCss ? `${blurEffect} ${filterCss}` : blurEffect;
                    }
                    ctx.drawImage(primaryImg, bgX, bgY, bgW, bgH);
                    ctx.restore();
                }

                // Frosted glass overlay tint (affected by customColor, NOT by badge theme)
                const tintColor = padded.customColor || '#0a0a14';
                ctx.fillStyle = hexToRgba(tintColor);
                ctx.fillRect(0, 0, targetW, targetH);
            } else if (padded.style === 'solid' || padded.style === 'custom') {
                // Solid background color (affected by customColor, NOT by badge theme)
                ctx.fillStyle = padded.customColor || '#0a0a14';
                ctx.fillRect(0, 0, targetW, targetH);
            } else {
                // Minimal Noir Dark Background (default fallback)
                const grad = ctx.createLinearGradient(0, 0, 0, targetH);
                grad.addColorStop(0, '#0a0a0f');
                grad.addColorStop(0.5, '#0f0f18');
                grad.addColorStop(1, '#08080c');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, targetW, targetH);
            }

            // --- B. Foreground Card Rendering ---
            const imgRatio = naturalW / naturalH;
            let cardW = targetW * scale;
            let cardH = cardW / imgRatio;

            // If card exceeds 85% of vertical space, constrain by height
            const maxCardH = targetH * 0.82;
            if (cardH > maxCardH) {
                cardH = maxCardH;
                cardW = cardH * imgRatio;
            }

            const cardX = (targetW - cardW) / 2;
            const cardY =
                padded.position === 'elevated'
                    ? (targetH - cardH) * 0.42 // slightly elevated to avoid Instagram Story reply bar
                    : (targetH - cardH) / 2;

            const effectiveRadius = cardX <= 2 ? 0 : cornerRadius;
            const isCustomBgLight = Boolean(padded.customColor && isColorLight(padded.customColor));

            // Render Drop Shadow
            ctx.save();
            ctx.shadowColor = isCustomBgLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.55)';
            ctx.shadowBlur = Math.round(40 * (targetW / STORY_WIDTH));
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = Math.round(18 * (targetW / STORY_WIDTH));

            drawRoundRect(ctx, cardX, cardY, cardW, cardH, effectiveRadius);
            ctx.fillStyle = isCustomBgLight ? '#ffffff' : '#0a0a0f';
            ctx.fill();
            ctx.restore();

            // Render Clipped Photo Card
            ctx.save();
            drawRoundRect(ctx, cardX, cardY, cardW, cardH, effectiveRadius);
            ctx.clip();
            drawImageWithStoryFilter(
                ctx,
                primaryImg,
                0,
                0,
                naturalW,
                naturalH,
                cardX,
                cardY,
                cardW,
                cardH,
                config.filterId,
                config.filterStrength ?? 1.0,
                filterCss
            );

            // Subtle 1px Glass Border
            ctx.strokeStyle = isCustomBgLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = Math.max(1.5, 2 * (targetW / STORY_WIDTH));
            ctx.stroke();
            ctx.restore();
        }
    }

    // ==========================================
    // 2.5. RENDER OPTIONAL DECORATIVE FRAME
    // ==========================================
    if (config.frameId && config.frameId !== 'none') {
        const frameContext: StoryFrameContext = {
            hasScoreboard: Boolean(
                config.badges.showScoreboard && (config.badges.scoreboardTitle || config.badges.teams?.length)
            ),
            hasAttribution: Boolean(config.badges.showAttribution),
            layoutMode: config.mode,
            exif: config.exif,
        };
        await drawStoryFrameToCanvas(ctx, config.frameId, targetW, targetH, config.frameColorOverride, frameContext);
    }

    // ==========================================
    // 3. RENDER OPTIONAL STORY BADGES
    // ==========================================
    const { badges } = config;

    // --- Scoreboard Badge (portfolio__event-header style) ---
    if (badges.showScoreboard && (badges.scoreboardTitle || badges.teams?.length)) {
        const cardPadH = Math.round(36 * resScale);
        const cardRadius = Math.round(24 * resScale);

        const hasTeams = badges.teams && badges.teams.length >= 2;
        const dateText = badges.matchDate || '';

        // Typography settings
        const dateFontSize = Math.round(80 * resScale);
        const dateFont = `600 ${dateFontSize}px "Barlow Condensed", "Arial Narrow", sans-serif`;

        const teamFontSize = Math.round(38 * resScale);
        const teamFont = `700 ${teamFontSize}px "Barlow Condensed", "Arial Narrow", sans-serif`;

        const scoreFontSize = Math.round(40 * resScale);
        const scoreFont = `700 ${scoreFontSize}px "Barlow Condensed", "Arial Narrow", sans-serif`;

        // Measure Date
        let dateW = 0;
        if (dateText) {
            ctx.font = dateFont;
            dateW = ctx.measureText(dateText).width;
        }

        // Measure Teams and Scores
        let teamsW: number;
        let t1Name = '';
        let t2Name = '';
        let s1Str = '';
        let s2Str = '';
        let t1Win = false;
        let t2Win = false;

        if (hasTeams) {
            t1Name = formatTeamName(badges.teams![0]).toUpperCase();
            t2Name = formatTeamName(badges.teams![1]).toUpperCase();
            const renderScores = badges.showScores !== false;
            s1Str = renderScores && badges.score1 != null ? `${badges.score1}` : '';
            s2Str = renderScores && badges.score2 != null ? `${badges.score2}` : '';

            if (s1Str && s2Str) {
                const num1 = Number(s1Str);
                const num2 = Number(s2Str);
                if (!isNaN(num1) && !isNaN(num2)) {
                    t1Win = num1 > num2;
                    t2Win = num2 > num1;
                }
            }

            ctx.font = teamFont;
            const t1W = ctx.measureText(t1Name).width;
            const t2W = ctx.measureText(t2Name).width;

            ctx.font = scoreFont;
            const s1W = s1Str ? ctx.measureText(s1Str).width + 30 * resScale : 0;
            const s2W = s2Str ? ctx.measureText(s2Str).width + 30 * resScale : 0;

            const row1W = t1W + s1W;
            const row2W = t2W + s2W;
            teamsW = Math.max(row1W, row2W);
        } else {
            const singleTitle = (badges.scoreboardTitle || badges.teams?.[0] || '').toUpperCase();
            ctx.font = teamFont;
            teamsW = ctx.measureText(singleTitle).width;
        }

        // Divider spacing
        const dividerGap = Math.round(26 * resScale);
        const dividerW = dateW > 0 ? 2 * resScale : 0;

        // Total card dimensions (positioned at bottom center)
        const contentW = dateW + (dateW > 0 ? dividerGap * 2 + dividerW : 0) + teamsW;
        const cardW = contentW + cardPadH * 2;
        const cardH = Math.round(132 * resScale);
        const cardX = (targetW - cardW) / 2;
        const badgeY = targetH - cardH - Math.round(105 * resScale);

        const isLight = (config.badgeTheme || config.cardTheme) === 'light';

        // Draw Card Background (Frosted Glass)
        ctx.save();
        ctx.shadowColor = isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = Math.round(30 * resScale);
        ctx.shadowOffsetY = Math.round(12 * resScale);

        drawRoundRect(ctx, cardX, badgeY, cardW, cardH, cardRadius);
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(10, 10, 16, 0.86)';
        ctx.fill();

        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = Math.max(1.5, 2 * resScale);
        ctx.stroke();
        ctx.restore();

        // Draw Date Prefix
        let currX = cardX + cardPadH;
        const centerY = badgeY + cardH / 2;

        if (dateW > 0) {
            ctx.save();
            ctx.font = dateFont;
            ctx.fillStyle = '#e60000'; // Brand accent red
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(dateText, currX, centerY + 2 * resScale);
            ctx.restore();

            currX += dateW + dividerGap;

            // Draw Vertical Divider
            ctx.save();
            ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = Math.max(1.5, 2 * resScale);
            const divH = Math.round(80 * resScale);
            ctx.beginPath();
            ctx.moveTo(currX, centerY - divH / 2);
            ctx.lineTo(currX, centerY + divH / 2);
            ctx.stroke();
            ctx.restore();

            currX += dividerGap;
        }

        // Draw Stacked Teams
        if (hasTeams) {
            const rowSpacing = Math.round(26 * resScale);
            const row1Y = centerY - rowSpacing;
            const row2Y = centerY + rowSpacing;

            // Row 1: Team 1
            ctx.save();
            ctx.font = teamFont;
            ctx.fillStyle = isLight ? '#111116' : '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(t1Name, currX, row1Y);

            if (s1Str) {
                ctx.font = scoreFont;
                ctx.fillStyle = t1Win
                    ? isLight
                        ? '#111116'
                        : '#ffffff'
                    : isLight
                      ? 'rgba(0, 0, 0, 0.45)'
                      : 'rgba(255, 255, 255, 0.5)';
                ctx.textAlign = 'right';
                ctx.fillText(s1Str, currX + teamsW, row1Y);
            }

            // Row 2: Team 2
            ctx.font = teamFont;
            ctx.fillStyle = isLight ? '#111116' : '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(t2Name, currX, row2Y);

            if (s2Str) {
                ctx.font = scoreFont;
                ctx.fillStyle = t2Win
                    ? isLight
                        ? '#111116'
                        : '#ffffff'
                    : isLight
                      ? 'rgba(0, 0, 0, 0.45)'
                      : 'rgba(255, 255, 255, 0.5)';
                ctx.textAlign = 'right';
                ctx.fillText(s2Str, currX + teamsW, row2Y);
            }
            ctx.restore();
        } else {
            const singleTitle = (badges.scoreboardTitle || badges.teams?.[0] || '').toUpperCase();
            ctx.save();
            ctx.font = teamFont;
            ctx.fillStyle = isLight ? '#111116' : '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(singleTitle, currX, centerY);
            ctx.restore();
        }
    }

    // --- Attribution Badge (nav__logo style) ---
    if (badges.showAttribution) {
        const isLight = (config.badgeTheme || config.cardTheme) === 'light';
        const pillH = Math.round(86 * resScale);
        const pillR = pillH / 2;
        const attrY = Math.round(105 * resScale);
        const iconSize = Math.round(42 * resScale);
        const gap = Math.round(16 * resScale);
        const padH = Math.round(36 * resScale);

        const logoText = (badges.attributionLogoText || 'PHOTOS BY').toUpperCase();
        const logoAccent = (badges.attributionLogoAccent || 'PERKINS').toUpperCase();
        const domainText = badges.attributionDomain ? `${badges.attributionDomain}` : '';

        const textFont = `300 ${Math.round(36 * resScale)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
        const accentFont = `300 ${Math.round(36 * resScale)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
        const domainFont = `400 ${Math.round(26 * resScale)}px "Outfit", system-ui, sans-serif`;

        // Measure widths
        ctx.font = textFont;
        const textW = ctx.measureText(logoText + ' ').width;

        ctx.font = accentFont;
        const accentW = ctx.measureText(logoAccent).width;

        let domainW = 0;
        if (domainText) {
            ctx.font = domainFont;
            domainW = ctx.measureText(' ' + domainText).width;
        }

        const contentW = iconSize + gap + textW + accentW + (domainW > 0 ? domainW : 0);
        const pillW = contentW + padH * 2;
        const pillX = (targetW - pillW) / 2;

        // Draw pill background (frosted glass)
        ctx.save();
        ctx.shadowColor = isLight ? 'rgba(0, 0, 0, 0.18)' : 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = Math.round(16 * resScale);
        ctx.shadowOffsetY = Math.round(6 * resScale);

        drawRoundRect(ctx, pillX, attrY, pillW, pillH, pillR);
        ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(10, 10, 16, 0.84)';
        ctx.fill();

        ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = Math.max(1.2, 1.5 * resScale);
        ctx.stroke();
        ctx.restore();

        // Draw camera logo icon
        const centerY = attrY + pillH / 2;
        let curX = pillX + padH;

        drawCameraLogoIcon(ctx, curX, centerY - iconSize / 2, iconSize, isLight ? '#111116' : '#ffffff');
        curX += iconSize + gap;

        // Draw 'PHOTOS BY '
        ctx.save();
        ctx.font = textFont;
        ctx.fillStyle = isLight ? '#111116' : '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(logoText + ' ', curX, centerY);
        curX += textW;

        // Draw 'PERKINS' (Accent red)
        ctx.font = accentFont;
        ctx.fillStyle = '#e60000';
        ctx.fillText(logoAccent, curX, centerY);
        curX += accentW;

        // Draw ' • @photosbyperkins'
        if (domainText) {
            ctx.font = domainFont;
            ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.65)';
            ctx.fillText(' ' + domainText, curX, centerY);
        }
        ctx.restore();
    }

    return canvas;
}

/**
 * Exports the canvas as a JPEG Blob ready for download or navigator.share.
 */
export async function renderStoryToBlob(
    img: HTMLImageElement | HTMLCanvasElement | (HTMLImageElement | HTMLCanvasElement | null | undefined)[],
    config: StoryRenderConfig
): Promise<Blob> {
    const canvas = await renderStoryToCanvas(img, config);
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to generate image blob'));
            },
            'image/jpeg',
            0.95
        );
    });
}

/**
 * Renders 3 stacked landscape photos for sequential burst action stories.
 */
export function renderBurstPanels(
    ctx: CanvasRenderingContext2D,
    images: (HTMLImageElement | HTMLCanvasElement | null | undefined)[],
    config: StoryRenderConfig,
    targetW: number,
    targetH: number,
    resScale: number,
    filterCss: string
) {
    const burst: BurstStoryOptions = config.burst || {
        dividerStyle: 'hairline',
        showTimeStamps: true,
        timeStamps: [0.0, 0.84, 1.42],
        focusYList: [0.45, 0.45, 0.45],
    };
    const style = burst.dividerStyle || 'hairline';
    const showTimeStamps = burst.showTimeStamps ?? true;
    const timeStamps = burst.timeStamps || [0.0, 0.84, 1.42];
    const panOffsets: { x: number; y: number; zoom?: number }[] =
        burst.panOffsets ||
        (burst.focusYList
            ? burst.focusYList.map((y) => ({ x: 0.5, y }))
            : [
                  { x: 0.5, y: 0.45 },
                  { x: 0.5, y: 0.45 },
                  { x: 0.5, y: 0.45 },
              ]);

    // Ensure 3 panel slots with null for missing frames
    const panelImages: (HTMLImageElement | HTMLCanvasElement | null | undefined)[] = [
        images[0] ?? null,
        images[1] ?? null,
        images[2] ?? null,
    ];

    if (style === 'gutter') {
        // Dark background with blurred middle image glow
        ctx.fillStyle = '#08090e';
        ctx.fillRect(0, 0, targetW, targetH);

        const midImg = panelImages.find((img): img is HTMLImageElement | HTMLCanvasElement => Boolean(img));
        if (midImg) {
            const mw = 'naturalWidth' in midImg ? midImg.naturalWidth : midImg.width;
            const mh = 'naturalHeight' in midImg ? midImg.naturalHeight : midImg.height;
            if (mw && mh) {
                ctx.save();
                ctx.globalAlpha = 0.22;
                const bgScale = Math.max(targetW / mw, targetH / mh);
                const bw = mw * bgScale;
                const bh = mh * bgScale;
                ctx.drawImage(midImg, (targetW - bw) / 2, (targetH - bh) / 2, bw, bh);
                ctx.restore();
            }
        }

        const margin = Math.round(20 * resScale);
        const gutter = Math.round(14 * resScale);
        const topBottomMargin = Math.round(40 * resScale);
        const panelW = targetW - margin * 2;
        const panelX = margin;
        const availableH = targetH - topBottomMargin * 2 - gutter * 2;
        const panelH = Math.floor(availableH / 3);
        const panelRadius = Math.round(18 * resScale);

        for (let i = 0; i < 3; i++) {
            const pImg = panelImages[i];
            const panelY = topBottomMargin + i * (panelH + gutter);
            const pan = panOffsets[i] || { x: 0.5, y: 0.45 };

            ctx.save();
            // Drop shadow for card
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = Math.round(20 * resScale);
            ctx.shadowOffsetY = Math.round(8 * resScale);
            drawRoundRect(ctx, panelX, panelY, panelW, panelH, panelRadius);
            ctx.fillStyle = '#101018';
            ctx.fill();
            ctx.restore();

            if (pImg) {
                // Clip and draw image
                ctx.save();
                drawRoundRect(ctx, panelX, panelY, panelW, panelH, panelRadius);
                ctx.clip();

                drawImageFocalCrop(
                    ctx,
                    pImg,
                    panelX,
                    panelY,
                    panelW,
                    panelH,
                    pan.x,
                    pan.y,
                    pan.zoom,
                    filterCss,
                    config.filterId,
                    config.filterStrength
                );
                ctx.restore();

                // Card stroke border
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
                ctx.lineWidth = Math.round(2 * resScale);
                drawRoundRect(ctx, panelX, panelY, panelW, panelH, panelRadius);
                ctx.stroke();
                ctx.restore();

                if (showTimeStamps) {
                    const dt = timeStamps[i] ?? (i === 0 ? 0 : i * 0.8);
                    drawTimestampPill(ctx, panelX, panelY, panelW, panelH, dt, resScale);
                }
            } else {
                // Blank area for missing frame
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = Math.round(1.5 * resScale);
                drawRoundRect(ctx, panelX, panelY, panelW, panelH, panelRadius);
                ctx.fillStyle = 'rgba(16, 16, 24, 0.6)';
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        }
    } else if (style === 'filmstrip') {
        // Cinematic Contact Sheet
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, targetW, targetH);

        const sideMargin = Math.round(46 * resScale);
        const gutter = Math.round(18 * resScale);
        const topBottomMargin = Math.round(42 * resScale);
        const panelW = targetW - sideMargin * 2;
        const panelX = sideMargin;
        const availableH = targetH - topBottomMargin * 2 - gutter * 2;
        const panelH = Math.floor(availableH / 3);

        // Draw decorative film perforations / sprocket holes
        const holeW = Math.round(14 * resScale);
        const holeH = Math.round(22 * resScale);
        const holeR = Math.round(4 * resScale);
        const totalHoles = 24;
        const holeSpacing = targetH / totalHoles;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        for (let h = 0; h < totalHoles; h++) {
            const hy = h * holeSpacing + (holeSpacing - holeH) / 2;
            drawRoundRect(ctx, Math.round(14 * resScale), hy, holeW, holeH, holeR);
            ctx.fill();
            drawRoundRect(ctx, targetW - Math.round(14 * resScale) - holeW, hy, holeW, holeH, holeR);
            ctx.fill();
        }
        ctx.restore();

        for (let i = 0; i < 3; i++) {
            const pImg = panelImages[i];
            const panelY = topBottomMargin + i * (panelH + gutter);
            const pan = panOffsets[i] || { x: 0.5, y: 0.45 };

            if (pImg) {
                ctx.save();
                drawImageFocalCrop(
                    ctx,
                    pImg,
                    panelX,
                    panelY,
                    panelW,
                    panelH,
                    pan.x,
                    pan.y,
                    pan.zoom,
                    filterCss,
                    config.filterId,
                    config.filterStrength
                );
                ctx.restore();

                if (showTimeStamps) {
                    const dt = timeStamps[i] ?? (i === 0 ? 0 : i * 0.8);
                    drawTimestampPill(ctx, panelX, panelY, panelW, panelH, dt, resScale);
                }
            } else {
                // Blank area for missing frame
                ctx.save();
                ctx.fillStyle = '#0a0a10';
                ctx.fillRect(panelX, panelY, panelW, panelH);
                ctx.restore();
            }

            // Film frame border
            ctx.save();
            ctx.strokeStyle = pImg ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = Math.max(1, Math.round(1.5 * resScale));
            ctx.strokeRect(panelX, panelY, panelW, panelH);
            ctx.restore();

            // Frame number label (e.g. 01A, 02A, 03A)
            ctx.save();
            ctx.font = `600 ${Math.round(14 * resScale)}px "Outfit", monospace, sans-serif`;
            ctx.fillStyle = pImg ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(`0${i + 1}A`, panelX - Math.round(10 * resScale), panelY + Math.round(6 * resScale));
            ctx.restore();
        }
    } else {
        // Clean Hairline (default)
        ctx.fillStyle = '#0a0a10';
        ctx.fillRect(0, 0, targetW, targetH);

        const gap = Math.round(4 * resScale);
        const availableH = targetH - gap * 2;
        const panelH = Math.floor(availableH / 3);

        for (let i = 0; i < 3; i++) {
            const pImg = panelImages[i];
            const panelX = 0;
            const panelY = i * (panelH + gap);
            const currentH = i === 2 ? targetH - panelY : panelH;
            const pan = panOffsets[i] || { x: 0.5, y: 0.45 };

            if (pImg) {
                ctx.save();
                drawImageFocalCrop(
                    ctx,
                    pImg,
                    panelX,
                    panelY,
                    targetW,
                    currentH,
                    pan.x,
                    pan.y,
                    pan.zoom,
                    filterCss,
                    config.filterId,
                    config.filterStrength
                );
                ctx.restore();

                if (showTimeStamps) {
                    const dt = timeStamps[i] ?? (i === 0 ? 0 : i * 0.8);
                    drawTimestampPill(ctx, panelX, panelY, targetW, currentH, dt, resScale);
                }
            } else {
                // Blank area for missing frame
                ctx.save();
                ctx.fillStyle = '#0e0e14';
                ctx.fillRect(panelX, panelY, targetW, currentH);
                ctx.restore();
            }

            // Hairline separator
            if (i < 2) {
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
                ctx.fillRect(0, panelY + currentH, targetW, gap);
                ctx.restore();
            }
        }
    }
}

function drawImageFocalCrop(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement | HTMLCanvasElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    panX: number,
    panY: number,
    zoom?: number,
    filterCss = '',
    filterId?: StoryPhotoFilterId,
    filterStrength = 1.0
) {
    const nw = 'naturalWidth' in img ? img.naturalWidth : img.width;
    const nh = 'naturalHeight' in img ? img.naturalHeight : img.height;
    if (!nw || !nh) return;

    const panelAspect = dw / dh;
    const crop = calculateBurstPanelCrop(nw, nh, panX, panY, zoom, panelAspect);

    const sx = crop.x * nw;
    const sy = crop.y * nh;
    const sw = crop.width * nw;
    const sh = crop.height * nh;

    drawImageWithStoryFilter(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh, filterId, filterStrength, filterCss);
}

function drawTimestampPill(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pw: number,
    ph: number,
    dt: number,
    resScale: number
) {
    const timeText = dt === 0 ? '+0.00s' : `+${dt.toFixed(2)}s`;
    const pillH = Math.round(36 * resScale);
    const pillR = pillH / 2;

    ctx.save();
    ctx.font = `600 ${Math.round(20 * resScale)}px "Outfit", system-ui, sans-serif`;
    const textW = ctx.measureText(timeText).width;
    const padX = Math.round(14 * resScale);
    const pillW = textW + padX * 2;

    const pillX = px + pw - pillW - Math.round(18 * resScale);
    const pillY = py + ph - pillH - Math.round(16 * resScale);

    // Pill background
    ctx.fillStyle = 'rgba(8, 8, 12, 0.72)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.round(10 * resScale);
    ctx.shadowOffsetY = Math.round(3 * resScale);
    drawRoundRect(ctx, pillX, pillY, pillW, pillH, pillR);
    ctx.fill();

    // Subtle pill stroke
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = Math.max(1, Math.round(1.2 * resScale));
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeText, pillX + pillW / 2, pillY + pillH / 2 + 1);
    ctx.restore();
}
