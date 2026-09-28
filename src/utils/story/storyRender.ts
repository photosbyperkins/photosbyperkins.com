import { STORY_WIDTH, STORY_HEIGHT, hexToRgba, isColorLight, getStoryFilterCss } from './storyConstants';
import type { StoryRenderConfig } from './storyConstants';
import { drawRoundRect, drawCameraLogoIcon, drawStoryFrameToCanvas, applyFastBlurAndAdjust } from './storyDraw';
import type { StoryFrameContext } from '../../components/sections/Portfolio/storyFrames/types';
import { formatTeamName } from '../formatters';

/**
 * Renders the story image onto an HTML5 Canvas.
 */
export async function renderStoryToCanvas(
    img: HTMLImageElement | HTMLCanvasElement,
    config: StoryRenderConfig,
    targetCanvas?: HTMLCanvasElement
): Promise<HTMLCanvasElement> {
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

    const naturalW = 'naturalWidth' in img ? img.naturalWidth : img.width;
    const naturalH = 'naturalHeight' in img ? img.naturalHeight : img.height;

    if (!naturalW || !naturalH) {
        return canvas;
    }

    // Resolve optional photo filter with strength
    const filterCss = config.filterId ? getStoryFilterCss(config.filterId, config.filterStrength ?? 1.0) : '';

    // ==========================================
    // 1. RENDER MODE: CROP (9:16)
    // ==========================================
    if (config.mode === 'crop') {
        const { crop } = config;
        const sx = crop.x * naturalW;
        const sy = crop.y * naturalH;
        const sw = crop.width * naturalW;
        const sh = crop.height * naturalH;

        ctx.save();
        if (filterCss && 'filter' in ctx) {
            ctx.filter = filterCss;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
        ctx.restore();
    }
    // ==========================================
    // 2. RENDER MODE: PADDED (GLASSMORPHIC)
    // ==========================================
    else {
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
                        if (filterCss && 'filter' in sCtx) {
                            try {
                                sCtx.filter = filterCss;
                            } catch {
                                /* ignore */
                            }
                        }
                        const sScale = Math.max(sw / naturalW, sh / naturalH);
                        const sW = naturalW * sScale;
                        const sH = naturalH * sScale;
                        const sX = (sw - sW) / 2;
                        const sY = (sh - sH) / 2;
                        sCtx.drawImage(img, sX, sY, sW, sH);

                        const imgData = sCtx.getImageData(0, 0, sw, sh);
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
                ctx.drawImage(img, bgX, bgY, bgW, bgH);
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
        if (filterCss && 'filter' in ctx) {
            ctx.filter = filterCss;
        }
        ctx.drawImage(img, cardX, cardY, cardW, cardH);
        ctx.filter = 'none';

        // Subtle 1px Glass Border
        ctx.strokeStyle = isCustomBgLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = Math.max(1.5, 2 * (targetW / STORY_WIDTH));
        ctx.stroke();
        ctx.restore();
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
    const resScale = targetW / STORY_WIDTH;

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
    img: HTMLImageElement | HTMLCanvasElement,
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
