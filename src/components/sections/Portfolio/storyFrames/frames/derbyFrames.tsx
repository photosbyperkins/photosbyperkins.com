import type { StoryFrameDefinition } from '../types';
import { defineFrame, createSvgString } from './helper';
import { SacBearGraphic } from '../sacBearOverlay';
import { loadSacBearPaths } from '../sacBearLoader';

export const DERBY_FRAMES: StoryFrameDefinition[] = [
    {
        id: 'sac-bear',
        label: 'Grizzly',
        category: 'derby',
        vibe: 'SRD California Republic heritage & golden pride',
        signaturePalette: ['#f59e0b', '#e60000', '#1e3a8a'],
        renderSvg: (override, context) => {
            const primary = override || '#f59e0b';
            const accent = override || '#e60000';
            const highlight = override || '#fbbf24';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const bearTransform = hasScoreboard
                ? 'translate(760, 1530) scale(0.68) translate(-200, -180)'
                : 'translate(680, 1690) scale(0.78) translate(-200, -180)';

            return (
                <g className="story-frame-sac-bear">
                    {/* Top Twin California Stars */}
                    <polygon
                        points="90,70 102,106 140,106 110,128 121,164 90,142 59,164 70,128 40,106 78,106"
                        fill={accent}
                    />
                    <polygon
                        points="990,70 978,106 940,106 970,128 959,164 990,142 1021,164 1010,128 1040,106 1002,106"
                        fill={accent}
                    />
                    {hasAttribution ? (
                        <>
                            <line
                                x1="140"
                                y1="117"
                                x2="250"
                                y2="117"
                                stroke={primary}
                                strokeWidth="4"
                                strokeDasharray="16 8"
                            />
                            <line
                                x1="830"
                                y1="117"
                                x2="940"
                                y2="117"
                                stroke={primary}
                                strokeWidth="4"
                                strokeDasharray="16 8"
                            />
                        </>
                    ) : (
                        <line
                            x1="140"
                            y1="117"
                            x2="940"
                            y2="117"
                            stroke={primary}
                            strokeWidth="4"
                            strokeDasharray="16 8"
                        />
                    )}

                    {/* Bottom Red Stripe and Gold Underline */}
                    {hasScoreboard ? (
                        <>
                            <line x1="40" y1="1870" x2="200" y2="1870" stroke={accent} strokeWidth="6" />
                            <line x1="40" y1="1882" x2="200" y2="1882" stroke={primary} strokeWidth="3" />
                            <line x1="880" y1="1870" x2="1040" y2="1870" stroke={accent} strokeWidth="6" />
                            <line x1="880" y1="1882" x2="1040" y2="1882" stroke={primary} strokeWidth="3" />
                        </>
                    ) : (
                        <>
                            <line x1="40" y1="1850" x2="1040" y2="1850" stroke={accent} strokeWidth="8" />
                            <line x1="40" y1="1864" x2="1040" y2="1864" stroke={primary} strokeWidth="3" />
                        </>
                    )}

                    <SacBearGraphic transform={bearTransform} primary={primary} accent={accent} highlight={highlight} />
                    <path d="M40,240 L40,160 L120,160" stroke={primary} strokeWidth="4" fill="none" />
                    <path d="M1040,240 L1040,160 L960,160" stroke={primary} strokeWidth="4" fill="none" />
                    <path d="M40,1680 L40,1760 L120,1760" stroke={primary} strokeWidth="4" fill="none" />
                    <path d="M1040,1680 L1040,1760 L960,1760" stroke={primary} strokeWidth="4" fill="none" />
                </g>
            );
        },
        getSvgString: async (override, context) => {
            const primary = override || '#f59e0b';
            const accent = override || '#e60000';
            const highlight = override || '#fbbf24';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const bearTransform = hasScoreboard
                ? 'translate(760, 1530) scale(0.68) translate(-200, -180)'
                : 'translate(680, 1690) scale(0.78) translate(-200, -180)';

            const topLines = hasAttribution
                ? `<line x1="140" y1="117" x2="250" y2="117" stroke="${primary}" stroke-width="4" stroke-dasharray="16 8" />
                   <line x1="830" y1="117" x2="940" y2="117" stroke="${primary}" stroke-width="4" stroke-dasharray="16 8" />`
                : `<line x1="140" y1="117" x2="940" y2="117" stroke="${primary}" stroke-width="4" stroke-dasharray="16 8" />`;

            const bottomLines = hasScoreboard
                ? `<line x1="40" y1="1870" x2="200" y2="1870" stroke="${accent}" stroke-width="6" />
                   <line x1="40" y1="1882" x2="200" y2="1882" stroke="${primary}" stroke-width="3" />
                   <line x1="880" y1="1870" x2="1040" y2="1870" stroke="${accent}" stroke-width="6" />
                   <line x1="880" y1="1882" x2="1040" y2="1882" stroke="${primary}" stroke-width="3" />`
                : `<line x1="40" y1="1850" x2="1040" y2="1850" stroke="${accent}" stroke-width="8" />
                   <line x1="40" y1="1864" x2="1040" y2="1864" stroke="${primary}" stroke-width="3" />`;

            const paths = await loadSacBearPaths();
            const bearPathsSvg = paths
                .map((p) => {
                    const col = p.type === 'accent' ? accent : p.type === 'highlight' ? highlight : primary;
                    return `<path d="${p.d}" fill="${col}" />`;
                })
                .join('');

            return createSvgString(`
                <polygon points="90,70 102,106 140,106 110,128 121,164 90,142 59,164 70,128 40,106 78,106" fill="${accent}" />
                <polygon points="990,70 978,106 940,106 970,128 959,164 990,142 1021,164 1010,128 1040,106 1002,106" fill="${accent}" />
                ${topLines}
                ${bottomLines}
                <g transform="${bearTransform}">
                    ${bearPathsSvg}
                </g>
                <path d="M40,240 L40,160 L120,160" stroke="${primary}" stroke-width="4" fill="none" />
                <path d="M1040,240 L1040,160 L960,160" stroke="${primary}" stroke-width="4" fill="none" />
                <path d="M40,1680 L40,1760 L120,1760" stroke="${primary}" stroke-width="4" fill="none" />
                <path d="M1040,1680 L1040,1760 L960,1760" stroke="${primary}" stroke-width="4" fill="none" />
            `);
        },
    },
    defineFrame(
        'derby-quads',
        'Quads',
        'derby',
        'Quad roller skates, speed track lines & jammer star',
        ['#f97316', '#dc2626', '#ffffff'],
        (override, context) => {
            const primary = override || '#f97316';
            const accent = override || '#dc2626';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const skateTransform = hasScoreboard ? 'translate(45, 1660) scale(1.3)' : 'translate(60, 1720) scale(1.45)';
            const flagTransform = hasScoreboard ? 'translate(895, 1720) scale(1.2)' : 'translate(875, 1760) scale(1.3)';

            const hashes = [320, 470, 620, 770, 920, 1070, 1220, 1370, 1520]
                .map(
                    (y) => `
                <line x1="30" y1="${y}" x2="60" y2="${y - 15}" stroke="${primary}" stroke-width="4" />
                <line x1="1050" y1="${y}" x2="1020" y2="${y - 15}" stroke="${primary}" stroke-width="4" />`
                )
                .join('');

            const topConnector = hasAttribution
                ? `<line x1="150" y1="120" x2="250" y2="120" stroke="${primary}" stroke-width="3" stroke-dasharray="12 8" opacity="0.6" />
                   <line x1="830" y1="120" x2="930" y2="120" stroke="${primary}" stroke-width="3" stroke-dasharray="12 8" opacity="0.6" />`
                : `<line x1="150" y1="120" x2="930" y2="120" stroke="${primary}" stroke-width="3" stroke-dasharray="12 8" opacity="0.6" />`;

            return `
                <!-- Twin Jammer Stars -->
                <polygon points="100,80 110,110 142,110 116,128 126,158 100,140 74,158 84,128 58,110 90,110" fill="${primary}" />
                <polygon points="980,80 990,110 1022,110 996,128 1006,158 980,140 954,158 964,128 938,110 970,110" fill="${primary}" />
                ${topConnector}
                ${hashes}
                <g transform="${skateTransform}">
                    <path d="M20,60 L20,10 C20,8 24,6 30,6 L45,10 L50,30 L75,38 C80,40 85,50 85,60 Z" fill="${accent}" />
                    <rect x="18" y="60" width="70" height="6" rx="2" fill="#e2e8f0" />
                    <circle cx="32" cy="74" r="11" fill="${primary}" stroke="#ffffff" stroke-width="2" />
                    <circle cx="32" cy="74" r="4" fill="#334155" />
                    <circle cx="74" cy="74" r="11" fill="${primary}" stroke="#ffffff" stroke-width="2" />
                    <circle cx="74" cy="74" r="4" fill="#334155" />
                    <path d="M85,63 L92,67 L88,73 L82,68 Z" fill="#64748b" />
                </g>
                <g transform="${flagTransform}">
                    <rect x="0" y="0" width="30" height="20" fill="${primary}" />
                    <rect x="30" y="0" width="30" height="20" fill="#ffffff" />
                    <rect x="60" y="0" width="30" height="20" fill="${primary}" />
                    <rect x="90" y="0" width="30" height="20" fill="#ffffff" />
                    <rect x="0" y="20" width="30" height="20" fill="#ffffff" />
                    <rect x="30" y="20" width="30" height="20" fill="${primary}" />
                    <rect x="60" y="20" width="30" height="20" fill="#ffffff" />
                    <rect x="90" y="20" width="30" height="20" fill="${primary}" />
                </g>
            `;
        }
    ),
    defineFrame(
        'ref-zebra',
        'Zebra',
        'derby',
        'Bold referee stripes, whistle silhouette & penalty box hashes',
        ['#ffffff', '#111116', '#e2e8f0'],
        (override, context) => {
            const stripeColor = override || '#ffffff';
            const accent = override || '#f59e0b';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const topOffset = hasAttribution ? 190 : 120;
            const bottomOffset = hasScoreboard ? 1670 : 1770;
            const whistleY = hasAttribution ? 120 : 90;

            return `
                <!-- Balanced Top Left and Right Zebra Chevrons -->
                <g transform="translate(0, ${topOffset})">
                    <polygon points="0,0 160,0 130,26 0,26" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="0,38 160,38 130,64 0,64" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="0,76 160,76 130,102 0,102" fill="${stripeColor}" opacity="0.9" />
                </g>
                <g transform="translate(920, ${topOffset})">
                    <polygon points="160,0 0,0 30,26 160,26" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="160,38 0,38 30,64 160,64" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="160,76 0,76 30,102 160,102" fill="${stripeColor}" opacity="0.9" />
                </g>

                <!-- Balanced Bottom Left and Right Zebra Chevrons -->
                <g transform="translate(0, ${bottomOffset})">
                    <polygon points="0,0 160,0 130,26 0,26" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="0,38 160,38 130,64 0,64" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="0,76 160,76 130,102 0,102" fill="${stripeColor}" opacity="0.9" />
                </g>
                <g transform="translate(920, ${bottomOffset})">
                    <polygon points="160,0 0,0 30,26 160,26" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="160,38 0,38 30,64 160,64" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="160,76 0,76 30,102 160,102" fill="${stripeColor}" opacity="0.9" />
                </g>

                <!-- Whistle Icon on Top Left Flank -->
                <g transform="translate(50, ${whistleY})">
                    <circle cx="20" cy="20" r="14" stroke="${accent}" stroke-width="3" fill="none" />
                    <rect x="28" y="14" width="38" height="12" rx="3" fill="${stripeColor}" />
                    <circle cx="78" cy="20" r="18" fill="${stripeColor}" />
                    <circle cx="78" cy="20" r="8" fill="#111116" />
                    <polygon points="28,14 16,17 16,23 28,26" fill="${stripeColor}" />
                    <path d="M102,12 Q112,20 102,28" stroke="${accent}" stroke-width="3" fill="none" />
                    <path d="M110,6 Q124,20 110,34" stroke="${accent}" stroke-width="2.5" fill="none" opacity="0.7" />
                </g>

                <!-- Technical Officials Penalty Marker on Top Right Flank -->
                <g transform="translate(920, ${whistleY + 20})">
                    <text x="100" y="0" fill="${accent}" font-family="monospace" font-size="15" font-weight="bold" letter-spacing="0.12em" text-anchor="end">BOX // 0:30</text>
                    <text x="100" y="18" fill="${stripeColor}" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="0.1em" opacity="0.8" text-anchor="end">OFFICIAL // WFTDA</text>
                </g>

                <!-- 4 Corner Athletic Brackets -->
                <path d="M40,240 L40,160 L120,160" stroke="${stripeColor}" stroke-width="4" fill="none" />
                <path d="M1040,240 L1040,160 L960,160" stroke="${stripeColor}" stroke-width="4" fill="none" />
                <path d="M40,1680 L40,1760 L120,1760" stroke="${stripeColor}" stroke-width="4" fill="none" />
                <path d="M1040,1680 L1040,1760 L960,1760" stroke="${stripeColor}" stroke-width="4" fill="none" />
            `;
        }
    ),
    defineFrame(
        'bout-day',
        'Bout Day',
        'derby',
        'Athletic stencil corner brackets, double jammer stars & track markings',
        ['#f59e0b', '#fbbf24', '#1e3a8a'],
        (override, context) => {
            const gold = override || '#f59e0b';
            const starColor = override || '#fbbf24';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;
            const topY = hasAttribution ? 148 : 130;

            const centerBadge = hasAttribution
                ? ''
                : `
                <g transform="translate(540, 130)">
                    <rect x="-85" y="-18" width="170" height="36" rx="6" fill="${gold}" opacity="0.95" />
                    <text x="0" y="6" fill="#111116" font-family="system-ui, sans-serif" font-size="14" font-weight="900" letter-spacing="0.18em" text-anchor="middle">★ BOUT DAY ★</text>
                </g>
            `;

            const bottomLeadJammer = hasScoreboard
                ? ''
                : `
                <g transform="translate(540, 1780)">
                    <rect x="-85" y="-15" width="170" height="30" rx="5" fill="${gold}" opacity="0.92" />
                    <text x="0" y="5" fill="#111116" font-family="system-ui, sans-serif" font-size="13" font-weight="900" letter-spacing="0.15em" text-anchor="middle">★ LEAD JAMMER ★</text>
                </g>
            `;

            return `
                <path d="M40,160 L40,80 L120,80" stroke="${gold}" stroke-width="6" fill="none" />
                <path d="M1040,160 L1040,80 L960,80" stroke="${gold}" stroke-width="6" fill="none" />
                <path d="M40,1760 L40,1840 L120,1840" stroke="${gold}" stroke-width="6" fill="none" />
                <path d="M1040,1760 L1040,1840 L960,1840" stroke="${gold}" stroke-width="6" fill="none" />
                <line x1="56" y1="96" x2="104" y2="96" stroke="${gold}" stroke-width="2" />
                <line x1="56" y1="96" x2="56" y2="144" stroke="${gold}" stroke-width="2" />
                <line x1="976" y1="96" x2="1024" y2="96" stroke="${gold}" stroke-width="2" />
                <line x1="1024" y1="96" x2="1024" y2="144" stroke="${gold}" stroke-width="2" />

                <!-- Left: Jammer Star Helmet Crest -->
                <g transform="translate(110, ${topY})">
                    <circle cx="0" cy="0" r="30" stroke="${gold}" stroke-width="3" fill="rgba(245,158,11,0.15)" />
                    <polygon points="0,-20 6,-6 20,-6 9,3 13,17 0,9 -13,17 -9,3 -20,-6 -6,-6" fill="${starColor}" />
                </g>

                <!-- Right: Pivot Stripe Helmet Crest -->
                <g transform="translate(970, ${topY})">
                    <circle cx="0" cy="0" r="30" stroke="${gold}" stroke-width="3" fill="rgba(245,158,11,0.15)" />
                    <rect x="-6" y="-20" width="12" height="40" rx="3" fill="${starColor}" />
                </g>

                ${centerBadge}
                ${bottomLeadJammer}

                <!-- Symmetrical Dashed Track Lines -->
                <line x1="30" y1="280" x2="30" y2="1640" stroke="${gold}" stroke-width="3" stroke-dasharray="24 16" opacity="0.6" />
                <line x1="1050" y1="280" x2="1050" y2="1640" stroke="${gold}" stroke-width="3" stroke-dasharray="24 16" opacity="0.6" />
            `;
        }
    ),
    defineFrame(
        'derby-punk',
        'Punk',
        'derby',
        'Safety pins, battle patch zig-zag overlock stitches & edge distress',
        ['#e11d48', '#fafafa', '#fbbf24'],
        (override, context) => {
            const stitch = override || '#fafafa';
            const pinColor = override || '#fbbf24';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const topPinY = hasAttribution ? 148 : 110;
            const bottomPinY = hasScoreboard ? 1730 : 1810;

            const leftStitches = [];
            const rightStitches = [];
            for (let y = 240; y <= 1680; y += 36) {
                leftStitches.push(`M24,${y} L36,${y + 18} L24,${y + 36}`);
                rightStitches.push(`M1056,${y} L1044,${y + 18} L1056,${y + 36}`);
            }

            return `
                <!-- Symmetrical Zigzag Overlock Stitching -->
                <path d="${leftStitches.join(' ')}" stroke="${stitch}" stroke-width="3" fill="none" opacity="0.8" />
                <path d="${rightStitches.join(' ')}" stroke="${stitch}" stroke-width="3" fill="none" opacity="0.8" />

                <!-- Top Symmetrical Safety Pins (Flanking Badges) -->
                <g transform="translate(90, ${topPinY}) rotate(-35)">
                    <path d="M-10,-35 C-10,-48 26,-48 26,-35 L26,-12 C26,-4 10,-4 10,-12 Z" fill="${pinColor}" />
                    <circle cx="8" cy="-38" r="4.5" fill="#111116" />
                    <path d="M0,-12 L0,55 A13,13 0 1 0 16,55 L16,-30" stroke="${pinColor}" stroke-width="4.5" fill="none" stroke-linecap="round" />
                </g>
                <g transform="translate(990, ${topPinY}) rotate(35)">
                    <path d="M-10,-35 C-10,-48 26,-48 26,-35 L26,-12 C26,-4 10,-4 10,-12 Z" fill="${pinColor}" />
                    <circle cx="8" cy="-38" r="4.5" fill="#111116" />
                    <path d="M0,-12 L0,55 A13,13 0 1 0 16,55 L16,-30" stroke="${pinColor}" stroke-width="4.5" fill="none" stroke-linecap="round" />
                </g>

                <!-- Bottom Symmetrical Safety Pins -->
                <g transform="translate(90, ${bottomPinY}) rotate(-145)">
                    <path d="M-10,-35 C-10,-48 26,-48 26,-35 L26,-12 C26,-4 10,-4 10,-12 Z" fill="${pinColor}" />
                    <circle cx="8" cy="-38" r="4.5" fill="#111116" />
                    <path d="M0,-12 L0,55 A13,13 0 1 0 16,55 L16,-30" stroke="${pinColor}" stroke-width="4.5" fill="none" stroke-linecap="round" />
                </g>
                <g transform="translate(990, ${bottomPinY}) rotate(145)">
                    <path d="M-10,-35 C-10,-48 26,-48 26,-35 L26,-12 C26,-4 10,-4 10,-12 Z" fill="${pinColor}" />
                    <circle cx="8" cy="-38" r="4.5" fill="#111116" />
                    <path d="M0,-12 L0,55 A13,13 0 1 0 16,55 L16,-30" stroke="${pinColor}" stroke-width="4.5" fill="none" stroke-linecap="round" />
                </g>

                <!-- Corner Cross Stitches -->
                <g stroke="${stitch}" stroke-width="3.5" opacity="0.85">
                    <line x1="45" y1="45" x2="65" y2="65" />
                    <line x1="65" y1="45" x2="45" y2="65" />
                    <line x1="1015" y1="45" x2="1035" y2="65" />
                    <line x1="1035" y1="45" x2="1015" y2="65" />
                    <line x1="45" y1="1855" x2="65" y2="1875" />
                    <line x1="65" y1="1855" x2="45" y2="1875" />
                    <line x1="1015" y1="1855" x2="1035" y2="1875" />
                    <line x1="1035" y1="1855" x2="1015" y2="1875" />
                </g>
            `;
        }
    ),
];
