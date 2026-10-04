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
        'Gritty DIY punk zine border with torn halftone paper, spray drips & ransom typography',
        ['#facc15', '#dc2626', '#fafafa', '#18181b'],
        (override) => {
            const hazardYellow = override || '#facc15';
            const crimsonRed = override && override !== '#facc15' ? override : '#dc2626';
            const zineBlack = '#09090b';

            const drawSkullBadge = (cx: number, cy: number, r: number, angle = 0) => `
                <g transform="translate(${cx}, ${cy}) rotate(${angle})">
                    <!-- Pinback button drop shadow -->
                    <circle cx="0" cy="0" r="${r}" fill="rgba(0,0,0,0.55)" transform="translate(3, 4)" />
                    <!-- Badge rim and face -->
                    <circle cx="0" cy="0" r="${r}" fill="${hazardYellow}" stroke="${zineBlack}" stroke-width="3" />
                    <circle cx="0" cy="0" r="${r - 3}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" fill="none" />

                    <!-- Spiky crimson punk mohawk -->
                    <path d="M -7,-${r * 0.72} L -3,-${r * 0.92} L 1,-${r * 0.68} L 5,-${r * 0.94} L 8,-${r * 0.65} L 12,-${r * 0.88} L 9,-${r * 0.45} L -7,-${r * 0.45} Z" fill="${crimsonRed}" stroke="${zineBlack}" stroke-width="1.6" stroke-linejoin="round" />

                    <!-- Skull cranium -->
                    <ellipse cx="0" cy="-${r * 0.14}" rx="${r * 0.45}" ry="${r * 0.38}" fill="#fafafa" stroke="${zineBlack}" stroke-width="2.2" />
                    <!-- Eye sockets -->
                    <ellipse cx="-${r * 0.18}" cy="-${r * 0.14}" rx="${r * 0.12}" ry="${r * 0.14}" fill="${zineBlack}" />
                    <ellipse cx="${r * 0.18}" cy="-${r * 0.14}" rx="${r * 0.12}" ry="${r * 0.14}" fill="${zineBlack}" />
                    <!-- Nose cavity -->
                    <polygon points="0,-${r * 0.08} -${r * 0.06},0 ${r * 0.06},0" fill="${zineBlack}" />
                    <!-- Stitched jaw / teeth -->
                    <path d="M -${r * 0.22},${r * 0.06} L ${r * 0.22},${r * 0.06} L ${r * 0.18},${r * 0.36} L -${r * 0.18},${r * 0.36} Z" fill="#fafafa" stroke="${zineBlack}" stroke-width="1.8" />
                    <line x1="-${r * 0.08}" y1="${r * 0.06}" x2="-${r * 0.08}" y2="${r * 0.36}" stroke="${zineBlack}" stroke-width="1.5" />
                    <line x1="0" y1="${r * 0.06}" x2="0" y2="${r * 0.36}" stroke="${zineBlack}" stroke-width="1.5" />
                    <line x1="${r * 0.08}" y1="${r * 0.06}" x2="${r * 0.08}" y2="${r * 0.36}" stroke="${zineBlack}" stroke-width="1.5" />
                    <line x1="-${r * 0.18}" y1="${r * 0.21}" x2="${r * 0.18}" y2="${r * 0.21}" stroke="${zineBlack}" stroke-width="1.5" />

                    <!-- Plastic button gloss highlight -->
                    <path d="M -${r * 0.72},-${r * 0.2} A ${r * 0.75},${r * 0.75} 0 0 1 -${r * 0.2},-${r * 0.72}" stroke="rgba(255,255,255,0.75)" stroke-width="3" stroke-linecap="round" fill="none" />
                </g>`;

            return `
                <defs>
                    <!-- 1970s Xerox zine halftone dot pattern -->
                    <pattern id="punk-halftone" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="14" height="14" fill="#fafafa" />
                        <circle cx="7" cy="7" r="3.2" fill="${zineBlack}" />
                        <circle cx="0" cy="0" r="1.8" fill="${zineBlack}" />
                        <circle cx="14" cy="0" r="1.8" fill="${zineBlack}" />
                        <circle cx="0" cy="14" r="1.8" fill="${zineBlack}" />
                        <circle cx="14" cy="14" r="1.8" fill="${zineBlack}" />
                    </pattern>

                    <!-- Derby fishnet tights diamond mesh -->
                    <pattern id="punk-fishnet" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <line x1="0" y1="0" x2="18" y2="0" stroke="${zineBlack}" stroke-width="2.5" />
                        <line x1="0" y1="0" x2="0" y2="18" stroke="${zineBlack}" stroke-width="2.5" />
                        <circle cx="0" cy="0" r="1.8" fill="${zineBlack}" />
                        <circle cx="18" cy="0" r="1.8" fill="${zineBlack}" />
                        <circle cx="0" cy="18" r="1.8" fill="${zineBlack}" />
                        <circle cx="18" cy="18" r="1.8" fill="${zineBlack}" />
                    </pattern>

                    <!-- Hazard yellow & black diagonal caution stripes -->
                    <pattern id="punk-caution" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                        <rect width="20" height="40" fill="${hazardYellow}" />
                        <rect x="20" width="20" height="40" fill="${zineBlack}" />
                    </pattern>
                </defs>

                <!-- ================= TOP-LEFT CORNER ================= -->
                <!-- Torn zine paper drop shadow -->
                <path d="M-10,-10 L280,-10 L270,45 L290,95 L260,140 L285,190 L240,245 L180,260 L140,295 L80,280 L35,320 L-10,310 Z" fill="rgba(0,0,0,0.55)" transform="translate(6, 6)" />
                <!-- White torn paper backing with jagged fibrous edge -->
                <path d="M-10,-10 L275,-10 L265,45 L285,95 L255,140 L280,190 L235,245 L175,260 L135,295 L75,280 L30,320 L-10,310 Z" fill="#fafafa" stroke="${zineBlack}" stroke-width="3" />
                <!-- Halftone screenprint inset on torn scrap -->
                <path d="M-10,-10 L245,-10 L238,40 L255,85 L230,125 L250,170 L210,220 L155,235 L120,265 L65,250 L25,285 L-10,275 Z" fill="url(#punk-halftone)" stroke="${zineBlack}" stroke-width="2" />

                <!-- 1970s Jamie Reid Ransom-Note Cutout Typography Collage: P - U - N - K mounted on zine scrap -->
                <!-- Letter Tile 'P' (Black on white) -->
                <g transform="translate(40, 95) rotate(-7)">
                    <rect x="-3" y="-3" width="36" height="46" fill="rgba(0,0,0,0.6)" />
                    <polygon points="0,0 35,-2 37,43 1,42" fill="#18181b" stroke="${zineBlack}" stroke-width="2" />
                    <text x="18" y="32" fill="#fafafa" font-family="Impact, 'Arial Black', sans-serif" font-size="33" font-weight="900" text-anchor="middle">P</text>
                </g>
                <!-- Letter Tile 'U' (Black on Hazard Yellow) -->
                <g transform="translate(84, 88) rotate(5)">
                    <rect x="-3" y="-3" width="35" height="47" fill="rgba(0,0,0,0.6)" />
                    <polygon points="-1,1 35,-1 33,45 0,46" fill="${hazardYellow}" stroke="${zineBlack}" stroke-width="2" />
                    <text x="17" y="33" fill="${zineBlack}" font-family="Impact, 'Arial Black', sans-serif" font-size="33" font-weight="900" text-anchor="middle">U</text>
                </g>
                <!-- Letter Tile 'N' (White on Crimson Red) -->
                <g transform="translate(126, 92) rotate(-5)">
                    <rect x="-3" y="-3" width="36" height="46" fill="rgba(0,0,0,0.6)" />
                    <polygon points="0,0 35,2 34,45 2,42" fill="${crimsonRed}" stroke="${zineBlack}" stroke-width="2" />
                    <text x="18" y="32" fill="#fafafa" font-family="Impact, 'Arial Black', sans-serif" font-size="33" font-weight="900" text-anchor="middle">N</text>
                </g>
                <!-- Letter Tile 'K' (Black on Paper White) -->
                <g transform="translate(168, 85) rotate(8)">
                    <rect x="-3" y="-3" width="35" height="47" fill="rgba(0,0,0,0.6)" />
                    <polygon points="1,-2 35,1 33,45 -1,43" fill="#fafafa" stroke="${zineBlack}" stroke-width="2" />
                    <text x="17" y="32" fill="${zineBlack}" font-family="Impact, 'Arial Black', sans-serif" font-size="33" font-weight="900" text-anchor="middle">K</text>
                </g>

                <!-- ================= TOP-RIGHT CORNER ================= -->
                <!-- Black jagged spray paint drips -->
                <path d="M 850,-10 L 850,75 C 850,88 842,98 847,108 C 852,118 862,118 867,108 C 872,98 864,88 864,75 L 864,-10 Z" fill="${zineBlack}" />
                <circle cx="857" cy="130" r="4.5" fill="${zineBlack}" />
                <circle cx="857" cy="150" r="2.5" fill="${zineBlack}" />

                <path d="M 940,-10 L 940,140 C 940,158 930,170 937,184 C 944,198 958,198 965,184 C 972,170 962,158 962,140 L 962,-10 Z" fill="${zineBlack}" />
                <circle cx="951" cy="214" r="5" fill="${zineBlack}" />
                <circle cx="951" cy="238" r="3" fill="${zineBlack}" />
                <circle cx="951" cy="254" r="1.5" fill="${zineBlack}" />

                <!-- Crimson Red spray paint drips overlapping -->
                <path d="M 885,-10 L 885,115 C 885,130 876,142 882,154 C 888,166 900,166 906,154 C 912,142 903,130 903,115 L 903,-10 Z" fill="${crimsonRed}" />
                <circle cx="894" cy="178" r="4.5" fill="${crimsonRed}" />
                <circle cx="894" cy="198" r="2.5" fill="${crimsonRed}" />

                <path d="M 1010,-10 L 1010,85 C 1010,98 1002,108 1007,118 C 1012,128 1024,128 1029,118 C 1034,108 1026,98 1026,85 L 1026,-10 Z" fill="${crimsonRed}" />
                <circle cx="1018" cy="138" r="4" fill="${crimsonRed}" />

                <!-- ================= RIGHT BORDER ================= -->
                <!-- Fishnet Tights Mesh Patch -->
                <path d="M 1085,620 L 990,640 L 1010,700 L 975,760 L 1005,820 L 980,880 L 1085,900 Z" fill="#fafafa" stroke="${zineBlack}" stroke-width="3" />
                <path d="M 1085,630 L 1005,648 L 1020,705 L 990,758 L 1018,815 L 995,870 L 1085,888 Z" fill="url(#punk-fishnet)" />

                <!-- Stencil Tally Marks (|||| /) -->
                <g stroke="${hazardYellow}" stroke-width="4.5" stroke-linecap="round">
                    <line x1="1025" y1="960" x2="1030" y2="1010" />
                    <line x1="1040" y1="958" x2="1045" y2="1008" />
                    <line x1="1055" y1="962" x2="1060" y2="1012" />
                    <line x1="1070" y1="960" x2="1075" y2="1010" />
                    <line x1="1015" y1="1000" x2="1080" y2="970" stroke="${crimsonRed}" stroke-width="5" />
                </g>

                <!-- ================= LEFT BORDER ================= -->
                <!-- Long cracked concrete fissure -->
                <path d="M -5,820 L 45,860 L 20,910 L 60,970 L 35,1030 L 55,1080 L 15,1140 L 40,1190 L -5,1230" stroke="${zineBlack}" stroke-width="2.5" fill="none" stroke-linejoin="round" />
                <path d="M -5,820 L 45,860 L 20,910 L 60,970 L 35,1030 L 55,1080 L 15,1140 L 40,1190 L -5,1230" stroke="rgba(255,255,255,0.4)" stroke-width="1" fill="none" stroke-linejoin="round" transform="translate(1, 1)" />

                <!-- ================= BOTTOM-LEFT CORNER ================= -->
                <!-- Torn Hazard Caution Tape Strip -->
                <g transform="translate(-15, 1720) rotate(22)">
                    <polygon points="0,-4 240,-2 238,58 -2,56" fill="rgba(0,0,0,0.55)" />
                    <path d="M 0,4 L 6,-1 L 12,3 L 18,-1 L 225,-1 L 232,5 L 228,52 L 234,57 L 226,54 L 14,54 L 8,58 L 0,54 Z" fill="url(#punk-caution)" stroke="${zineBlack}" stroke-width="2.5" />
                </g>

                <!-- ================= BOTTOM-RIGHT CORNER ================= -->
                <!-- Large Torn Battle Patch with Halftone -->
                <g>
                    <!-- Patch drop shadow -->
                    <path d="M 820,1925 L 800,1840 L 835,1790 L 795,1730 L 830,1670 L 880,1630 L 950,1650 L 1010,1610 L 1090,1625 L 1090,1925 Z" fill="rgba(0,0,0,0.6)" transform="translate(6, 6)" />
                    <!-- Off-white torn canvas battle patch -->
                    <path d="M 815,1925 L 795,1840 L 830,1790 L 790,1730 L 825,1670 L 875,1630 L 945,1650 L 1005,1610 L 1090,1625 L 1090,1925 Z" fill="#fafafa" stroke="${zineBlack}" stroke-width="3" />
                    <!-- Halftone screenprint inset on patch -->
                    <path d="M 845,1925 L 830,1850 L 860,1805 L 825,1750 L 855,1695 L 900,1660 L 965,1680 L 1020,1645 L 1090,1655 L 1090,1925 Z" fill="url(#punk-halftone)" stroke="${zineBlack}" stroke-width="2" />

                    <!-- DIY 1-inch Pinback Button Badge with Punk Mohawk Skull pinned to battle patch -->
                    ${drawSkullBadge(935, 1740, 35, -10)}
                </g>
            `;
        }
    ),
];
