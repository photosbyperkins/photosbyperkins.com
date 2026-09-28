import type { StoryFrameDefinition } from '../types';
import { defineFrame } from './helper';

export const RETRO_FRAMES: StoryFrameDefinition[] = [
    defineFrame(
        'synthwave',
        '80s Synthwave',
        'retro',
        '80s retro cyber grid horizon & neon laser triangles',
        ['#f43f5e', '#06b6d4'],
        (override, context) => {
            const magenta = override || '#f43f5e';
            const cyan = override || '#06b6d4';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const gridY = hasScoreboard ? 1845 : 1810;
            const extraLine = !hasScoreboard
                ? `<line x1="0" y1="1810" x2="1080" y2="1810" stroke="${magenta}" stroke-width="2.5" />`
                : '';

            return `
                ${extraLine}
                <line x1="0" y1="1845" x2="1080" y2="1845" stroke="${magenta}" stroke-width="3" />
                <line x1="0" y1="1875" x2="1080" y2="1875" stroke="${magenta}" stroke-width="4" />
                <line x1="0" y1="1905" x2="1080" y2="1905" stroke="${magenta}" stroke-width="6" />
                <line x1="540" y1="${gridY}" x2="80" y2="1920" stroke="${cyan}" stroke-width="2.5" />
                <line x1="540" y1="${gridY}" x2="260" y2="1920" stroke="${cyan}" stroke-width="2.5" />
                <line x1="540" y1="${gridY}" x2="440" y2="1920" stroke="${cyan}" stroke-width="2.5" />
                <line x1="540" y1="${gridY}" x2="640" y2="1920" stroke="${cyan}" stroke-width="2" />
                <line x1="540" y1="${gridY}" x2="820" y2="1920" stroke="${cyan}" stroke-width="2.5" />
                <line x1="540" y1="${gridY}" x2="1000" y2="1920" stroke="${cyan}" stroke-width="2.5" />
                <g transform="translate(980, 80)">
                    <polygon points="0,-30 35,30 -35,30" stroke="${magenta}" stroke-width="4" fill="none" />
                    <polygon points="0,-18 22,20 -22,20" stroke="${cyan}" stroke-width="2.5" fill="none" />
                </g>
                <g transform="translate(100, 80)">
                    <polygon points="0,-30 35,30 -35,30" stroke="${cyan}" stroke-width="4" fill="none" />
                    <polygon points="0,-18 22,20 -22,20" stroke="${magenta}" stroke-width="2.5" fill="none" />
                </g>
                <line x1="20" y1="200" x2="20" y2="1750" stroke="${cyan}" stroke-width="2" stroke-dasharray="40 20" opacity="0.7" />
                <line x1="1060" y1="200" x2="1060" y2="1750" stroke="${magenta}" stroke-width="2" stroke-dasharray="40 20" opacity="0.7" />
            `;
        }
    ),
    defineFrame(
        'film-strip',
        '35mm Film',
        'retro',
        'Classic analog negative perforated sprockets & frame markers',
        ['#f8fafc', '#0f172a'],
        (override) => {
            const sprocketColor = override || '#f8fafc';
            const holes: string[] = [];
            for (let y = 140; y <= 1780; y += 80) {
                holes.push(`
                    <rect x="14" y="${y}" width="28" height="42" rx="6" fill="${sprocketColor}" opacity="0.9" />
                    <rect x="1038" y="${y}" width="28" height="42" rx="6" fill="${sprocketColor}" opacity="0.9" />
                `);
            }
            return `
                <rect x="0" y="0" width="56" height="1920" fill="rgba(15, 23, 42, 0.65)" />
                <rect x="1024" y="0" width="56" height="1920" fill="rgba(15, 23, 42, 0.65)" />
                ${holes.join('')}
                <text x="72" y="500" fill="${sprocketColor}" font-family="monospace" font-size="20" transform="rotate(-90 72 500)" opacity="0.8">KODAK 400 • 36</text>
                <text x="72" y="1400" fill="${sprocketColor}" font-family="monospace" font-size="20" transform="rotate(-90 72 1400)" opacity="0.8">36A ►</text>
            `;
        }
    ),
    defineFrame(
        'instant-film',
        'Vintage Polaroid',
        'retro',
        'Classic analog instant film border with chin & mounting corner tabs',
        ['#ffffff', '#f1f5f9', '#94a3b8'],
        (override) => {
            const frameColor = override || '#ffffff';
            const tabColor = override || '#94a3b8';

            return `
                <rect x="24" y="24" width="1032" height="1872" rx="8" stroke="${frameColor}" stroke-width="3" fill="none" opacity="0.85" />
                <line x1="24" y1="1740" x2="1056" y2="1740" stroke="${frameColor}" stroke-width="2.5" opacity="0.6" />
                <polygon points="24,80 80,24 60,24 24,60" fill="${tabColor}" opacity="0.9" />
                <polygon points="1056,80 1000,24 1020,24 1056,60" fill="${tabColor}" opacity="0.9" />
                <polygon points="24,1840 80,1896 60,1896 24,1860" fill="${tabColor}" opacity="0.9" />
                <polygon points="1056,1840 1000,1896 1020,1896 1056,1860" fill="${tabColor}" opacity="0.9" />
                <line x1="500" y1="1840" x2="580" y2="1840" stroke="${frameColor}" stroke-width="3" stroke-linecap="round" opacity="0.5" />
            `;
        }
    ),
    defineFrame(
        'vhs-glitch',
        '90s Camcorder',
        'retro',
        'Phosphor VHS on-screen display with PLAY, REC, battery gauge & tracking lines',
        ['#22c55e', '#ef4444', '#ffffff'],
        (override, context) => {
            const phosphor = override || '#22c55e';
            const recRed = override || '#ef4444';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return `
                <g transform="translate(60, ${topY})">
                    <text x="0" y="24" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="32" font-weight="bold" letter-spacing="0.1em">PLAY</text>
                    <polygon points="100,6 122,18 100,30" fill="${phosphor}" />
                    <text x="0" y="60" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="20" font-weight="bold" opacity="0.8">SP</text>
                </g>
                <g transform="translate(860, ${topY})">
                    <circle cx="16" cy="16" r="10" fill="${recRed}" />
                    <text x="36" y="24" fill="#ffffff" font-family="'Courier New', Courier, monospace" font-size="26" font-weight="bold">REC</text>
                    <g transform="translate(110, 8)">
                        <rect x="0" y="0" width="36" height="20" rx="3" stroke="#ffffff" stroke-width="2.5" fill="none" />
                        <rect x="36" y="5" width="4" height="10" rx="1" fill="#ffffff" />
                        <rect x="4" y="4" width="8" height="12" fill="${phosphor}" />
                        <rect x="15" y="4" width="8" height="12" fill="${phosphor}" />
                    </g>
                </g>
                <g transform="translate(60, 1780)">
                    <text x="0" y="0" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="28" font-weight="bold" letter-spacing="0.1em">-0:14:26</text>
                    <text x="0" y="30" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="16" font-weight="bold" opacity="0.7">CH 03 • AUTO TRACKING</text>
                </g>
                <line x1="30" y1="720" x2="90" y2="720" stroke="${phosphor}" stroke-width="3" opacity="0.5" />
                <line x1="990" y1="1200" x2="1050" y2="1200" stroke="${phosphor}" stroke-width="3" opacity="0.5" />
            `;
        }
    ),
    defineFrame(
        'risograph',
        'Riso Halftone',
        'retro',
        'Vintage zine offset CMYK calibration crosses & halftone grain edges',
        ['#ec4899', '#06b6d4', '#facc15'],
        (override) => {
            const primary = override || '#ec4899';
            const cyan = override || '#06b6d4';
            const yellow = override || '#facc15';

            return `
                <g transform="translate(50, 50)">
                    <circle cx="0" cy="0" r="16" stroke="${primary}" stroke-width="2" fill="none" />
                    <circle cx="0" cy="0" r="8" stroke="${cyan}" stroke-width="1.5" fill="none" />
                    <line x1="-24" y1="0" x2="24" y2="0" stroke="${primary}" stroke-width="1.5" />
                    <line x1="0" y1="-24" x2="0" y2="24" stroke="${primary}" stroke-width="1.5" />
                </g>
                <g transform="translate(1030, 50)">
                    <circle cx="0" cy="0" r="16" stroke="${primary}" stroke-width="2" fill="none" />
                    <circle cx="0" cy="0" r="8" stroke="${cyan}" stroke-width="1.5" fill="none" />
                    <line x1="-24" y1="0" x2="24" y2="0" stroke="${primary}" stroke-width="1.5" />
                    <line x1="0" y1="-24" x2="0" y2="24" stroke="${primary}" stroke-width="1.5" />
                </g>
                <g transform="translate(50, 1870)">
                    <circle cx="0" cy="0" r="16" stroke="${primary}" stroke-width="2" fill="none" />
                    <circle cx="0" cy="0" r="8" stroke="${cyan}" stroke-width="1.5" fill="none" />
                    <line x1="-24" y1="0" x2="24" y2="0" stroke="${primary}" stroke-width="1.5" />
                    <line x1="0" y1="-24" x2="0" y2="24" stroke="${primary}" stroke-width="1.5" />
                </g>
                <g transform="translate(1030, 1870)">
                    <circle cx="0" cy="0" r="16" stroke="${primary}" stroke-width="2" fill="none" />
                    <circle cx="0" cy="0" r="8" stroke="${cyan}" stroke-width="1.5" fill="none" />
                    <line x1="-24" y1="0" x2="24" y2="0" stroke="${primary}" stroke-width="1.5" />
                    <line x1="0" y1="-24" x2="0" y2="24" stroke="${primary}" stroke-width="1.5" />
                </g>
                <g transform="translate(18, 860)">
                    <rect x="0" y="0" width="12" height="30" fill="${cyan}" opacity="0.9" />
                    <rect x="0" y="36" width="12" height="30" fill="${primary}" opacity="0.9" />
                    <rect x="0" y="72" width="12" height="30" fill="${yellow}" opacity="0.9" />
                    <rect x="0" y="108" width="12" height="30" fill="#ffffff" opacity="0.8" />
                </g>
                <g transform="translate(1050, 860)">
                    <rect x="0" y="0" width="12" height="30" fill="${primary}" opacity="0.9" />
                    <rect x="0" y="36" width="12" height="30" fill="${cyan}" opacity="0.9" />
                    <rect x="0" y="72" width="12" height="30" fill="${yellow}" opacity="0.9" />
                    <rect x="0" y="108" width="12" height="30" fill="#ffffff" opacity="0.8" />
                </g>
                <rect x="36" y="36" width="1008" height="1848" stroke="${cyan}" stroke-width="1.5" fill="none" opacity="0.65" />
                <rect x="38" y="38" width="1008" height="1848" stroke="${primary}" stroke-width="1.5" fill="none" opacity="0.65" />
            `;
        }
    ),
];
