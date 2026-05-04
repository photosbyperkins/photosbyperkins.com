// @ts-nocheck
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import 'dotenv/config';
import { IndexState } from './types';
import { logger } from './logger';
const DIST_DIR = path.join(process.cwd(), 'dist');
const OUTPUT_DIR = path.join(DIST_DIR, 'social-cards');

// Load environment variables for branding
const LOGO_TEXT = process.env.VITE_NAV_LOGO_TEXT || 'PHOTOS';
const LOGO_ACCENT = process.env.VITE_NAV_LOGO_ACCENT || 'PERKINS';

function safeFilename(year, event) {
    return `${encodeURIComponent(year)}_${encodeURIComponent(event)}.webp`;
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

// Word-wrap function for SVG text
function wrapText(text, maxCharsPerLine) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    for (let word of words) {
        if ((currentLine + word).length > maxCharsPerLine) {
            if (currentLine.trim()) lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    return lines;
}

export async function generateSocialCards(data: IndexState) {
    logger.header('Generating Branded OpenGraph Social Cards...');

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    let count = 0;
    const promises = [];
    
    const ICON_FILE = path.join(process.cwd(), 'icon.svg');
    let hasCustomIcon = fs.existsSync(ICON_FILE);
    let iconBuffer = null;
    
    if (hasCustomIcon) {
        try {
            iconBuffer = await sharp(ICON_FILE).resize(60, 60).toBuffer();
        } catch (e: any) {
            logger.warn(`Could not resize custom icon.svg:`, e.message);
            hasCustomIcon = false;
        }
    }

    // Read abbreviations from .env
    const envAbbrsStr = process.env.VITE_TEAM_ABBREVIATIONS;
    let teamAbbrs = {};
    if (envAbbrsStr) {
        try {
            teamAbbrs = JSON.parse(envAbbrsStr);
        } catch {}
    }

    function formatTeamName(teamName) {
        let short = teamName;
        for (const [f, abbr] of Object.entries(teamAbbrs)) {
            short = short.replace(new RegExp(`\\b${f}\\b`, 'g'), abbr);
        }
        short = short.replace(/\s+Roller Derby\b/gi, '').trim();
        short = short
            .replace(/\b(Roller Derby|Derby|All Stars|All-Stars|Juniors|Quad Squad|Round Robin)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
            
        // Strip home league abbreviations if followed by a sub-team name
        const words = short.split(' ');
        if (words.length > 1) {
            const abbrValues = Object.values(teamAbbrs).filter(Boolean);
            if (abbrValues.includes(words[0])) {
                short = words.slice(1).join(' ');
            }
        }
        return short.toUpperCase();
    }

    // Helper to parse event title exactly like the UI
    function parseEventTitle(eventName) {
        const titleMatch = eventName.match(/^(?:\[(\d{4})\]\s*)?(\d{2}\.\d{2})\s+(.*)/);
        const datePrefix = titleMatch ? titleMatch[2] : '';
        const mainTitle = titleMatch ? titleMatch[3] : eventName;
        return { datePrefix, mainTitle };
    }

    for (const year in data) {
        for (const event in data[year]) {
            const eventData = data[year][event];
            let firstImgPath = '';
            let img = null;

            if (eventData.highlights && eventData.highlights.length > 0) {
                img = eventData.highlights[0];
                firstImgPath = typeof img === 'string' ? img : img.absPath || img.source;
            } else if (eventData.album && eventData.album.length > 0) {
                img = eventData.album[0];
                firstImgPath = typeof img === 'string' ? img : img.absPath || img.source;
            }

            if (!firstImgPath) continue;

            let sourceFile = firstImgPath;
            if (sourceFile.startsWith('/')) {
                sourceFile = path.join(process.cwd(), sourceFile);
            }

            if (!fs.existsSync(sourceFile)) {
                continue;
            }

            const { datePrefix, mainTitle } = parseEventTitle(event);
            const teams = mainTitle.split(/\s+(?:vs|versus)\s+/i).map(t => formatTeamName(t.trim()));

            const safeLogoText = escapeXml(LOGO_TEXT);
            const safeLogoAccent = escapeXml(LOGO_ACCENT);
            const fontBase = "font-family=\"'Barlow Condensed', 'Arial Narrow', 'Impact', sans-serif\" font-stretch=\"condensed\"";
            const fontModern = "font-family=\"'Outfit', 'Segoe UI', 'Helvetica Neue', sans-serif\"";
            
            let eventContent = '';

            if (teams.length >= 2) {
                // Stacked format with vertical rule aligned to favicon
                eventContent = `
                    <text x="65" y="325" ${fontBase} font-size="110" fill="#e60000" font-weight="bold" dominant-baseline="middle">${escapeXml(datePrefix)}</text>
                    <rect x="330" y="265" width="3" height="120" fill="rgba(255,255,255,0.15)" />
                    <text x="370" y="290" ${fontBase} font-size="56" fill="white" font-weight="bold" dominant-baseline="middle" letter-spacing="1">${escapeXml(teams[0])}</text>
                    <text x="370" y="360" ${fontBase} font-size="56" fill="#aaaaaa" font-weight="bold" dominant-baseline="middle" letter-spacing="1">${escapeXml(teams[1])}</text>
                `;
            } else {
                // Fallback for non-vs events
                const shortTitle = formatTeamName(mainTitle);
                const lines = wrapText(shortTitle, 35);
                const lineHeights = 75;
                const startY = 325 - ((lines.length - 1) * lineHeights) / 2;

                const textNodes = lines.map((line, idx) => {
                    return `<text x="600" y="${startY + idx * lineHeights}" ${fontBase} font-size="64" fill="white" font-weight="bold" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">${escapeXml(line)}</text>`;
                }).join('\n');

                eventContent = `
                    ${datePrefix ? `<text x="600" y="190" ${fontBase} font-size="80" fill="#e60000" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${escapeXml(datePrefix)}</text>` : ''}
                    ${textNodes}
                `;
            }

            const brandTextX = hasCustomIcon ? 140 : 80;

            const svgOverlay = `
                <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
                    <!-- Dark Translucent Overlay -->
                    <rect x="0" y="0" width="1200" height="630" fill="rgba(20,20,20,0.82)" />
                    
                    <!-- Clean Inset Border (Business Card Feel) -->
                    <rect x="40" y="40" width="1120" height="550" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2" rx="10" ry="10" />
                    
                    <!-- Branding Top Left -->
                    <g transform="translate(0, 0)">
                        <text x="${brandTextX}" y="90" ${fontBase} font-size="44" fill="white" font-weight="bold" dominant-baseline="middle" letter-spacing="4">${safeLogoText} <tspan fill="#e60000">${safeLogoAccent}</tspan></text>
                    </g>
                    
                    ${eventContent}
                    
                    <!-- Domain Bottom Right -->
                    <text x="1120" y="565" ${fontModern} font-size="18" fill="rgba(255,255,255,0.4)" font-weight="600" letter-spacing="3" text-anchor="end">PHOTOSBYPERKINS.COM</text>
                    
                    <!-- Year Top Right -->
                    <text x="1120" y="95" ${fontBase} font-size="34" fill="rgba(255,255,255,0.3)" font-weight="bold" letter-spacing="4" text-anchor="end">${escapeXml(year)}</text>
                </svg>
            `;

            const compositeLayers = [
                {
                    input: Buffer.from(svgOverlay),
                    blend: 'over',
                }
            ];

            if (hasCustomIcon && iconBuffer) {
                compositeLayers.push({
                    input: iconBuffer,
                    top: 60,
                    left: 65,
                    blend: 'over'
                });
            }

            const outputFile = path.join(OUTPUT_DIR, safeFilename(year, event));
            
            let pipeline = sharp(sourceFile);
            
            if (img && img.width && img.height && typeof img.focusX !== 'undefined' && typeof img.focusY !== 'undefined') {
                const targetRatio = 1200 / 630;
                const imgRatio = img.width / img.height;
                
                let cropWidth, cropHeight;
                if (imgRatio > targetRatio) {
                    cropHeight = img.height;
                    cropWidth = Math.round(cropHeight * targetRatio);
                } else {
                    cropWidth = img.width;
                    cropHeight = Math.round(cropWidth / targetRatio);
                }
                
                const targetCenterX = img.focusX * img.width;
                const targetCenterY = img.focusY * img.height;
                
                let cropLeft = Math.round(targetCenterX - cropWidth / 2);
                let cropTop = Math.round(targetCenterY - cropHeight / 2);
                
                cropLeft = Math.max(0, Math.min(cropLeft, img.width - cropWidth));
                cropTop = Math.max(0, Math.min(cropTop, img.height - cropHeight));
                
                pipeline = pipeline
                    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
                    .resize(1200, 630);
            } else {
                pipeline = pipeline.resize(1200, 630, { fit: 'cover', position: 'entropy' });
            }

            const generatePromise = pipeline
                .composite(compositeLayers)
                .webp({ quality: 85 })
                .toFile(outputFile)
                .then(() => {
                    count++;
                })
                .catch((err: any) => {
                    logger.error(`Failed to generate social card for ${event}:`, err.message);
                });

            promises.push(generatePromise);
        }
    }

    await Promise.all(promises);
    logger.success(`Generated ${count} branded social cards.`);
}

// If run directly
if (process.argv[1] && process.argv[1].includes('generateSocialCards')) {
    import('fs').then(fs => {
        const p = path.join(process.cwd(), 'data', 'photos.json');
        if (fs.existsSync(p)) {
            generateSocialCards(JSON.parse(fs.readFileSync(p, 'utf8'))).catch(console.error);
        }
    })
}
