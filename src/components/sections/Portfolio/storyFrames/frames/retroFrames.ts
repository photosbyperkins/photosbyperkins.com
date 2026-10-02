import type { StoryFrameDefinition } from '../types';
import { defineFrame } from './helper';

export const RETRO_FRAMES: StoryFrameDefinition[] = [
    defineFrame(
        'synthwave',
        'Synthwave',
        'retro',
        '80s retro cyber grid horizon & neon laser triangles',
        ['#f43f5e', '#06b6d4'],
        (override, context) => {
            const magenta = override || '#f43f5e';
            const cyan = override || '#06b6d4';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const topY = hasAttribution ? 148 : 90;
            const gridY = hasScoreboard ? 1835 : 1805;

            const horizonLines = hasScoreboard
                ? `
                    <line x1="20" y1="1835" x2="200" y2="1835" stroke="${magenta}" stroke-width="2.5" />
                    <line x1="880" y1="1835" x2="1060" y2="1835" stroke="${magenta}" stroke-width="2.5" />
                    <line x1="0" y1="1865" x2="1080" y2="1865" stroke="${magenta}" stroke-width="3.5" />
                    <line x1="0" y1="1895" x2="1080" y2="1895" stroke="${magenta}" stroke-width="5" />
                  `
                : `
                    <line x1="0" y1="1805" x2="1080" y2="1805" stroke="${magenta}" stroke-width="2.5" />
                    <line x1="0" y1="1840" x2="1080" y2="1840" stroke="${magenta}" stroke-width="3" />
                    <line x1="0" y1="1875" x2="1080" y2="1875" stroke="${magenta}" stroke-width="4" />
                    <line x1="0" y1="1905" x2="1080" y2="1905" stroke="${magenta}" stroke-width="6" />
                  `;

            return `
                ${horizonLines}
                <line x1="540" y1="${gridY}" x2="60" y2="1920" stroke="${cyan}" stroke-width="2.5" />
                <line x1="540" y1="${gridY}" x2="240" y2="1920" stroke="${cyan}" stroke-width="2.5" />
                <line x1="540" y1="${gridY}" x2="420" y2="1920" stroke="${cyan}" stroke-width="2" />
                <line x1="540" y1="${gridY}" x2="660" y2="1920" stroke="${cyan}" stroke-width="2" />
                <line x1="540" y1="${gridY}" x2="840" y2="1920" stroke="${cyan}" stroke-width="2.5" />
                <line x1="540" y1="${gridY}" x2="1020" y2="1920" stroke="${cyan}" stroke-width="2.5" />

                <!-- Symmetrical Top Neon Wireframe Triangles -->
                <g transform="translate(100, ${topY})">
                    <polygon points="0,-28 32,28 -32,28" stroke="${cyan}" stroke-width="3.5" fill="none" />
                    <polygon points="0,-16 20,18 -20,18" stroke="${magenta}" stroke-width="2" fill="none" />
                </g>
                <g transform="translate(980, ${topY})">
                    <polygon points="0,-28 32,28 -32,28" stroke="${magenta}" stroke-width="3.5" fill="none" />
                    <polygon points="0,-16 20,18 -20,18" stroke="${cyan}" stroke-width="2" fill="none" />
                </g>

                <line x1="20" y1="220" x2="20" y2="1750" stroke="${cyan}" stroke-width="2" stroke-dasharray="40 20" opacity="0.65" />
                <line x1="1060" y1="220" x2="1060" y2="1750" stroke="${magenta}" stroke-width="2" stroke-dasharray="40 20" opacity="0.65" />
            `;
        }
    ),
    defineFrame(
        'film-strip',
        'Film',
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
        'Polaroid',
        'retro',
        'Classic analog instant film border with chin & mounting corner tabs',
        ['#ffffff', '#f1f5f9', '#94a3b8'],
        (override, context) => {
            const frameColor = override || '#ffffff';
            const tabColor = override || '#94a3b8';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const chinLineY = hasScoreboard ? 1660 : 1730;
            const signY = hasScoreboard ? 1860 : 1820;

            return `
                <rect x="24" y="24" width="1032" height="1872" rx="8" stroke="${frameColor}" stroke-width="3" fill="none" opacity="0.85" />
                <line x1="24" y1="${chinLineY}" x2="1056" y2="${chinLineY}" stroke="${frameColor}" stroke-width="2.5" opacity="0.5" />
                <polygon points="24,80 80,24 60,24 24,60" fill="${tabColor}" opacity="0.9" />
                <polygon points="1056,80 1000,24 1020,24 1056,60" fill="${tabColor}" opacity="0.9" />
                <polygon points="24,1840 80,1896 60,1896 24,1860" fill="${tabColor}" opacity="0.9" />
                <polygon points="1056,1840 1000,1896 1020,1896 1056,1860" fill="${tabColor}" opacity="0.9" />
                <line x1="490" y1="${signY}" x2="590" y2="${signY}" stroke="${frameColor}" stroke-width="3" stroke-linecap="round" opacity="0.45" />
            `;
        }
    ),
    defineFrame(
        'vhs-glitch',
        'VHS',
        'retro',
        'Phosphor VHS on-screen display with PLAY, REC, battery gauge & tracking lines',
        ['#22c55e', '#ef4444', '#ffffff'],
        (override, context) => {
            const phosphor = override || '#22c55e';
            const recRed = override || '#ef4444';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const topY = hasAttribution ? 148 : 90;
            const bottomY = hasScoreboard ? 1730 : 1820;

            return `
                <!-- Top-Left OSD: PLAY and Tape Speed -->
                <g transform="translate(60, ${topY - 15})">
                    <text x="0" y="22" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="28" font-weight="bold" letter-spacing="0.1em">PLAY</text>
                    <polygon points="90,7 110,18 90,29" fill="${phosphor}" />
                    <text x="0" y="52" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="bold" opacity="0.8">SP</text>
                </g>

                <!-- Top-Right OSD: REC and Battery Meter -->
                <g transform="translate(860, ${topY - 15})">
                    <circle cx="16" cy="15" r="9" fill="${recRed}" />
                    <text x="34" y="22" fill="#ffffff" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="bold">REC</text>
                    <g transform="translate(100, 7)">
                        <rect x="0" y="0" width="34" height="18" rx="3" stroke="#ffffff" stroke-width="2" fill="none" />
                        <rect x="34" y="4" width="3.5" height="10" rx="1" fill="#ffffff" />
                        <rect x="4" y="3" width="7" height="12" fill="${phosphor}" />
                        <rect x="14" y="3" width="7" height="12" fill="${phosphor}" />
                    </g>
                </g>

                <!-- Bottom-Left OSD: Timecode and Tracking -->
                <g transform="translate(60, ${bottomY})">
                    <text x="0" y="0" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="bold" letter-spacing="0.1em">-0:14:26</text>
                    <text x="0" y="24" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="bold" opacity="0.75">CH 03 • AUTO</text>
                </g>

                <!-- Bottom-Right OSD: Date and Hi-Fi Audio (Symmetrical Balance) -->
                <g transform="translate(860, ${bottomY})">
                    <text x="160" y="0" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="22" font-weight="bold" letter-spacing="0.08em" text-anchor="end">OCT 24 1994</text>
                    <text x="160" y="24" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="14" font-weight="bold" opacity="0.75" text-anchor="end">HI-FI STEREO</text>
                </g>

                <!-- Tracking Static Pulses on Left and Right Margins -->
                <line x1="24" y1="720" x2="80" y2="720" stroke="${phosphor}" stroke-width="2.5" opacity="0.5" />
                <line x1="1000" y1="720" x2="1056" y2="720" stroke="${phosphor}" stroke-width="2.5" opacity="0.5" />
            `;
        }
    ),
    defineFrame(
        'risograph',
        'Riso',
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
