import type { StoryFrameDefinition } from '../types';
import { defineLayeredFrame } from './helper';

export const ACTION_FRAMES: StoryFrameDefinition[] = [
    defineLayeredFrame(
        'claw-marks',
        'Claws',
        'action',
        'High-impact razor claw slashes & glowing embers',
        ['#ef4444', '#ea580c', '#f59e0b'],
        (override, context) => {
            const primary = override || '#ef4444';
            const accent = override || '#ea580c';
            const highlight = '#fbbf24';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const bottomTransform = hasScoreboard
                ? 'translate(110, 1530) rotate(195) scale(1.05)'
                : 'translate(140, 1680) rotate(195) scale(1.15)';

            const claws = `
                    <!-- Claw 1 (Outer) -->
                    <path d="M0,0 Q60,120 120,260 Q105,240 100,180 Q60,90 0,0 Z" fill="${primary}" opacity="0.95" />
                    <path d="M20,30 Q65,120 105,225 Q95,210 90,170 Q60,100 20,30 Z" fill="${highlight}" opacity="0.4" />

                    <!-- Claw 2 (Middle) -->
                    <path d="M-50,30 Q10,150 70,290 Q55,270 50,210 Q10,120 -50,30 Z" fill="${accent}" opacity="0.92" />
                    <path d="M-30,60 Q15,150 60,255 Q48,240 44,200 Q15,130 -30,60 Z" fill="${highlight}" opacity="0.55" />

                    <!-- Claw 3 (Inner - Longest) -->
                    <path d="M-100,60 Q-40,180 20,320 Q5,300 0,240 Q-40,150 -100,60 Z" fill="${primary}" opacity="0.88" />
                    <path d="M-80,90 Q-32,180 12,285 Q0,270 -4,230 Q-32,160 -80,90 Z" fill="${highlight}" opacity="0.4" />

                    <!-- Micro Scratch Marks -->
                    <path d="M40,50 Q80,130 115,200" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.6" />
                    <path d="M-130,110 Q-80,195 -40,260" stroke="${primary}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5" />`;

            // Glowing impact embers, split into two alternating sets so they twinkle out of phase
            const embersA = `
                    <circle cx="40" cy="200" r="4.5" fill="${highlight}" />
                    <circle cx="-20" cy="260" r="5" fill="${highlight}" />
                    <circle cx="10" cy="310" r="3" fill="${highlight}" opacity="0.9" />`;
            const embersB = `
                    <circle cx="80" cy="280" r="3.5" fill="${accent}" />
                    <circle cx="115" cy="245" r="2.5" fill="${primary}" opacity="0.85" />
                    <circle cx="-55" cy="295" r="2.5" fill="${accent}" opacity="0.75" />`;

            // Dynamic asymmetric clustered claw strikes: top-right primary rake, bottom-left counter rake
            const rake = (transform: string, scale: number, inner: string) =>
                `<g transform="${transform}"><g transform="scale(${scale})">${inner}</g></g>`;
            const topRight = 'translate(860, 45) rotate(16)';

            return {
                layers: [
                    { id: 'rakeTR', svg: rake(topRight, 1.1, claws) },
                    { id: 'embersTRa', svg: rake(topRight, 1.1, embersA) },
                    { id: 'embersTRb', svg: rake(topRight, 1.1, embersB) },
                    { id: 'rakeBL', svg: rake(bottomTransform, 1.05, claws) },
                    { id: 'embersBLa', svg: rake(bottomTransform, 1.05, embersA) },
                    { id: 'embersBLb', svg: rake(bottomTransform, 1.05, embersB) },
                ],
            };
        }
    ),
    defineLayeredFrame(
        'pop-art',
        'Pop Art',
        'action',
        'Halftone dot matrix, bold dynamic action bursts & speed stripes',
        ['#facc15', '#06b6d4', '#ef4444'],
        (override, context) => {
            const yellow = override || '#facc15';
            const cyan = override || '#06b6d4';
            const red = override || '#ef4444';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const bottomOffset = hasScoreboard ? 1750 : 1800;
            const bottomShift = bottomOffset - 1750;

            // Ben-Day dot matrix columns from the corner outwards: [radius, colour] per row, corner row first.
            // Both matrices share the pattern; each column is its own layer so the dots ripple out of the corner.
            const halftone: [number, string][][] = [
                [
                    [18, red],
                    [14, yellow],
                    [11, yellow],
                    [7, cyan],
                ],
                [
                    [14, yellow],
                    [11, yellow],
                    [8, cyan],
                    [5, cyan],
                ],
                [
                    [10, yellow],
                    [8, cyan],
                    [5, cyan],
                    [3.5, yellow],
                ],
                [
                    [6, cyan],
                    [4.5, yellow],
                ],
            ];
            const matrix = (id: string, transform: string, xs: number[], ys: number[]) =>
                halftone.map((col, i) => ({
                    id: `${id}${i}`,
                    svg: `<g transform="${transform}">${col
                        .map(([r, fill], j) => `<circle cx="${xs[i]}" cy="${ys[j]}" r="${r}" fill="${fill}" />`)
                        .join('')}</g>`,
                }));

            return {
                layers: [
                    // Top-Right Ben-Day Dot Matrix
                    ...matrix('dotsTR', 'translate(970, 0)', [90, 55, 22, -8], [18, 54, 88, 120]),
                    // Top-Left Action Speed Stripes
                    {
                        id: 'stripesTL',
                        svg: `<line x1="0" y1="0" x2="160" y2="100" stroke="${red}" stroke-width="6" stroke-linecap="round" />
                <line x1="0" y1="40" x2="120" y2="120" stroke="${yellow}" stroke-width="5" stroke-linecap="round" />
                <line x1="0" y1="80" x2="80" y2="130" stroke="${cyan}" stroke-width="4" stroke-linecap="round" />`,
                    },
                    {
                        id: 'starTL',
                        svg: `<polygon points="175,108 178,118 188,121 178,124 175,134 172,124 162,121 172,118" fill="${yellow}" />`,
                        pivot: { x: 175, y: 121 },
                    },
                    // Bottom-Left Ben-Day Dot Matrix
                    ...matrix('dotsBL', `translate(0, ${bottomOffset})`, [18, 52, 84, 114], [95, 60, 28, -2]),
                    // Bottom-Right Action Speed Stripes
                    {
                        id: 'stripesBR',
                        svg: `<g transform="translate(0, ${bottomShift})">
                    <line x1="1080" y1="1890" x2="920" y2="1790" stroke="${red}" stroke-width="6" stroke-linecap="round" />
                    <line x1="1080" y1="1850" x2="960" y2="1770" stroke="${yellow}" stroke-width="5" stroke-linecap="round" />
                    <line x1="1080" y1="1810" x2="1000" y2="1760" stroke="${cyan}" stroke-width="4" stroke-linecap="round" />
                </g>`,
                    },
                    {
                        id: 'starBR',
                        svg: `<g transform="translate(0, ${bottomShift})"><polygon points="905,1782 902,1772 892,1769 902,1766 905,1756 908,1766 918,1769 908,1772" fill="${yellow}" /></g>`,
                        pivot: { x: 905, y: 1769 + bottomShift },
                    },
                ],
            };
        }
    ),
    defineLayeredFrame(
        'street-flames',
        'Flames',
        'action',
        'Hot rod fire flames rising from lower corners & top licking accents',
        ['#f59e0b', '#ef4444', '#ffffff'],
        (override, context) => {
            const amber = override || '#f59e0b';
            const red = override || '#ef4444';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const bottomY = hasScoreboard ? 1700 : 1690;
            // Top flames are the flipped tongues scaled by 0.65, so their base edge (y=220) sits at
            // topY - 0.65 * 220 = topY - 143. 142 puts it 1px past the top edge: flush, no hairline gap.
            const topY = hasAttribution ? 142 : 100;

            const outerTongue = `<path d="M0,220 L0,90 C25,80 35,50 45,15 C60,50 80,80 65,110 C85,90 100,55 110,25 C125,70 140,110 125,150 C145,135 160,100 165,70 C175,120 170,170 150,220 Z" fill="${red}" opacity="0.95" />`;
            const innerTongue = `<path d="M0,220 L0,120 C20,110 30,80 38,50 C48,80 65,110 55,130 C70,120 85,85 95,60 C105,100 120,130 110,170 C125,160 140,130 142,105 C148,145 142,185 125,220 Z" fill="${amber}" />`;

            // Bottom symmetrical flames, then the top corner flame pinstripes. Each flame is an outer and
            // an inner tongue (separate layers so they flicker out of phase), pivoted on its base edge.
            const corners = [
                { id: 'flameBL', transform: `translate(0, ${bottomY})`, pivot: { x: 80, y: bottomY + 220 } },
                { id: 'flameBR', transform: `translate(1080, ${bottomY}) scale(-1, 1)`, pivot: { x: 1000, y: bottomY + 220 } },
                { id: 'flameTL', transform: `translate(0, ${topY}) scale(0.65, -0.65)`, pivot: { x: 52, y: topY - 143 } },
                { id: 'flameTR', transform: `translate(1080, ${topY}) scale(-0.65, -0.65)`, pivot: { x: 1028, y: topY - 143 } },
            ];

            return {
                layers: corners.flatMap(({ id, transform, pivot }) => [
                    { id: `${id}Outer`, svg: `<g transform="${transform}">${outerTongue}</g>`, pivot },
                    { id: `${id}Inner`, svg: `<g transform="${transform}">${innerTongue}</g>`, pivot },
                ]),
            };
        }
    ),
    defineLayeredFrame(
        'electric-lightning',
        'Voltage',
        'action',
        'High-voltage lightning bolts, kinetic energy arcs & plasma sparks',
        ['#00f0ff', '#3b82f6', '#facc15'],
        (override, context) => {
            const primary = override || '#00f0ff';
            const plasma = override || '#3b82f6';
            const spark = override || '#facc15';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const topSparkY = hasAttribution ? 148 : 100;
            const bottomBoltLeft = hasScoreboard
                ? 'M60,1180 L110,1300 L75,1350 L140,1470 L95,1520 L130,1650 L80,1730'
                : 'M60,1350 L110,1480 L75,1530 L150,1680 L90,1740 L130,1830';
            const bottomBoltRight = hasScoreboard
                ? 'M1020,1180 L970,1300 L1005,1350 L940,1470 L985,1520 L950,1650 L1000,1730'
                : 'M1020,1350 L970,1480 L1005,1530 L930,1680 L990,1740 L950,1830';

            const groundSparksLeft = hasScoreboard ? 'translate(80, 1730)' : 'translate(130, 1830)';
            const groundSparksRight = hasScoreboard ? 'translate(1000, 1730)' : 'translate(950, 1830)';

            // Glow, plasma and white core strokes of one bolt
            const bolt = (d: string, w: [number, number, number]) => `
                <path d="${d}" stroke="${primary}" stroke-width="${w[0]}" stroke-linejoin="bevel" stroke-linecap="round" fill="none" opacity="0.4" />
                <path d="${d}" stroke="${plasma}" stroke-width="${w[1]}" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="${d}" stroke="#ffffff" stroke-width="${w[2]}" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />`;
            const groundSpark = (transform: string) => `
                <g transform="${transform}">
                    <circle cx="0" cy="0" r="6" fill="${primary}" opacity="0.6" />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                    <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="${spark}" />
                </g>`;
            const topSpark = (x: number) =>
                `<polygon points="${x},${topSparkY - 15} ${x + 5},${topSparkY} ${x + 20},${topSparkY + 5} ${x + 5},${topSparkY + 10} ${x},${topSparkY + 25} ${x - 5},${topSparkY + 10} ${x - 20},${topSparkY + 5} ${x - 5},${topSparkY}" fill="${spark}" />`;

            return {
                layers: [
                    // Left / right vertical high-voltage lightning
                    {
                        id: 'boltL',
                        svg: bolt('M40,-20 L95,110 L60,150 L130,280 L85,330 L150,490 L105,550 L160,680', [7, 4, 1.8]),
                    },
                    {
                        id: 'boltR',
                        svg: bolt(
                            'M1040,-20 L985,110 L1020,150 L950,280 L995,330 L930,490 L975,550 L920,680',
                            [7, 4, 1.8]
                        ),
                    },
                    // Symmetrical top flanking sparks
                    { id: 'sparkTL', svg: topSpark(120) },
                    { id: 'sparkTR', svg: topSpark(960) },
                    // Symmetrical mid sparks
                    {
                        id: 'sparkML',
                        svg: `<polygon points="175,380 179,392 191,396 179,400 175,412 171,400 159,396 171,392" fill="#ffffff" />`,
                    },
                    {
                        id: 'sparkMR',
                        svg: `<polygon points="905,380 909,392 921,396 909,400 905,412 901,400 889,396 901,392" fill="#ffffff" />`,
                    },
                    // Mid-flank lightning pulses
                    {
                        id: 'pulseL',
                        svg: `<path d="M35,820 L65,880 L45,920 L75,990" stroke="${primary}" stroke-width="2.5" fill="none" opacity="0.75" />
                <circle cx="75" cy="990" r="3" fill="${spark}" />`,
                    },
                    {
                        id: 'pulseR',
                        svg: `<path d="M1045,820 L1015,880 L1035,920 L1005,990" stroke="${primary}" stroke-width="2.5" fill="none" opacity="0.75" />
                <circle cx="1005" cy="990" r="3" fill="${spark}" />`,
                    },
                    // Bottom lightning bolts
                    { id: 'bottomBoltL', svg: bolt(bottomBoltLeft, [5, 3, 1.2]) },
                    { id: 'bottomBoltR', svg: bolt(bottomBoltRight, [5, 3, 1.2]) },
                    { id: 'groundL', svg: groundSpark(groundSparksLeft) },
                    { id: 'groundR', svg: groundSpark(groundSparksRight) },
                ],
            };
        }
    ),
    defineLayeredFrame(
        'sonic-boom',
        'Sonic',
        'action',
        'High-speed concentric acoustic rings, particle shockwaves & blast rays',
        ['#f43f5e', '#fb7185', '#ffffff'],
        (override, context) => {
            const primary = override || '#f43f5e';
            const secondary = override || '#fb7185';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const topOriginY = hasAttribution ? 60 : 0;
            const bottomOriginY = hasScoreboard ? 1860 : 1920;

            // 4 Symmetrical Sonic Blast Corners. Each quarter is a solid ring, a dashed outer ring and two shards,
            // split into layers (same draw order) that all pivot on the corner origin, the shockwave centre.
            const corners = [
                { id: 'TL', x: 0, y: topOriginY, flipX: false, flipY: false },
                { id: 'TR', x: 1080, y: topOriginY, flipX: true, flipY: false },
                { id: 'BL', x: 0, y: bottomOriginY, flipX: false, flipY: true },
                { id: 'BR', x: 1080, y: bottomOriginY, flipX: true, flipY: true },
            ];

            return {
                layers: corners.flatMap(({ id, x, y, flipX, flipY }) => {
                    const quarter = (inner: string) =>
                        `<g transform="translate(${x}, ${y})"><g transform="scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})">${inner}</g></g>`;
                    const pivot = { x, y };
                    return [
                        {
                            id: `ring${id}`,
                            svg: quarter(
                                `<circle cx="0" cy="0" r="130" stroke="${primary}" stroke-width="4.5" fill="none" opacity="0.8" />`
                            ),
                            pivot,
                        },
                        {
                            id: `dash${id}`,
                            svg: quarter(
                                `<circle cx="0" cy="0" r="210" stroke="${secondary}" stroke-width="2.5" stroke-dasharray="14 10" fill="none" opacity="0.65" />`
                            ),
                            pivot,
                        },
                        {
                            id: `shards${id}`,
                            svg: quarter(`<polygon points="60,40 100,25 75,70" fill="${primary}" opacity="0.85" />
                    <polygon points="120,70 160,50 140,95" fill="${secondary}" opacity="0.75" />`),
                            pivot,
                        },
                    ];
                }),
            };
        }
    ),
    defineLayeredFrame(
        'speed-demons',
        'Velocity',
        'action',
        'Aerodynamic wind-tunnel slipstreams & trailing speed chevrons',
        ['#06b6d4', '#3b82f6', '#60a5fa'],
        (override, context) => {
            const c1 = override || '#06b6d4';
            const c2 = override || '#3b82f6';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const topY = hasAttribution ? 148 : 100;
            const bottomY = hasScoreboard ? 1730 : 1820;

            const chevronFlank = (x: number, y: number, dir: 1 | -1) => `
                <g transform="translate(${x}, ${y}) scale(${dir}, 1)">
                    <polygon points="0,0 16,12 0,24 6,12" fill="${c1}" />
                    <polygon points="20,0 36,12 20,24 26,12" fill="${c1}" opacity="0.8" />
                    <polygon points="40,0 56,12 40,24 46,12" fill="${c2}" opacity="0.6" />
                    <line x1="62" y1="12" x2="140" y2="12" stroke="${c1}" stroke-width="2.5" stroke-dasharray="16 8" />
                </g>
            `;

            const topStreams = hasAttribution
                ? `<path d="M40,${topY} Q140,${topY - 15} 240,${topY}" stroke="${c1}" stroke-width="3" fill="none" opacity="0.7" />
                   <path d="M840,${topY} Q940,${topY - 15} 1040,${topY}" stroke="${c1}" stroke-width="3" fill="none" opacity="0.7" />`
                : `<path d="M40,${topY} Q540,${topY - 30} 1040,${topY}" stroke="${c1}" stroke-width="3" fill="none" opacity="0.7" />`;

            const bottomStreams = hasScoreboard
                ? `<path d="M40,${bottomY} Q130,${bottomY + 15} 200,${bottomY}" stroke="${c1}" stroke-width="3" fill="none" opacity="0.7" />
                   <path d="M880,${bottomY} Q950,${bottomY + 15} 1040,${bottomY}" stroke="${c1}" stroke-width="3" fill="none" opacity="0.7" />`
                : `<path d="M40,${bottomY} Q540,${bottomY + 30} 1040,${bottomY}" stroke="${c1}" stroke-width="3" fill="none" opacity="0.7" />`;

            return {
                layers: [
                    { id: 'streamsTop', svg: topStreams },
                    { id: 'streamsBottom', svg: bottomStreams },
                    // Symmetrical Left and Right Flank Wind-Tunnel Chevrons
                    { id: 'chevronL1', svg: chevronFlank(40, 500, 1) },
                    { id: 'chevronR1', svg: chevronFlank(1040, 500, -1) },
                    { id: 'chevronL2', svg: chevronFlank(40, 1100, 1) },
                    { id: 'chevronR2', svg: chevronFlank(1040, 1100, -1) },
                    // Edge Dashed Speed Boundaries. 1400px = 35 whole 24+16 dash periods from a dash start, so
                    // clipped to the exact line extent they scroll seamlessly by one period.
                    {
                        id: 'edgeL',
                        svg: `<line x1="24" y1="260" x2="24" y2="1660" stroke="${c2}" stroke-width="2" stroke-dasharray="24 16" opacity="0.5" />`,
                        clip: { x: 20, y: 260, w: 8, h: 1400 },
                    },
                    {
                        id: 'edgeR',
                        svg: `<line x1="1056" y1="260" x2="1056" y2="1660" stroke="${c2}" stroke-width="2" stroke-dasharray="24 16" opacity="0.5" />`,
                        clip: { x: 1052, y: 260, w: 8, h: 1400 },
                    },
                ],
            };
        }
    ),
];
