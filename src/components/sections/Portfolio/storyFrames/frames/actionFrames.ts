import type { StoryFrameDefinition } from '../types';
import { defineFrame } from './helper';

export const ACTION_FRAMES: StoryFrameDefinition[] = [
    defineFrame(
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

            const clawCluster = (scale = 1) => `
                <g transform="scale(${scale})">
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
                    <path d="M-130,110 Q-80,195 -40,260" stroke="${primary}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5" />

                    <!-- Glowing Impact Embers -->
                    <circle cx="40" cy="200" r="4.5" fill="${highlight}" />
                    <circle cx="80" cy="280" r="3.5" fill="${accent}" />
                    <circle cx="-20" cy="260" r="5" fill="${highlight}" />
                    <circle cx="115" cy="245" r="2.5" fill="${primary}" opacity="0.85" />
                    <circle cx="10" cy="310" r="3" fill="${highlight}" opacity="0.9" />
                    <circle cx="-55" cy="295" r="2.5" fill="${accent}" opacity="0.75" />
                </g>
            `;

            return `
                <!-- Dynamic Asymmetric Clustered Claw Strikes -->
                <!-- Top-Right Primary Rake -->
                <g transform="translate(860, 45) rotate(16)">
                    ${clawCluster(1.1)}
                </g>

                <!-- Bottom-Left Counter Rake -->
                <g transform="${bottomTransform}">
                    ${clawCluster(1.05)}
                </g>
            `;
        }
    ),
    defineFrame(
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

            return `
                <!-- Top-Right Ben-Day Dot Matrix -->
                <g transform="translate(970, 0)">
                    <circle cx="90" cy="18" r="18" fill="${red}" />
                    <circle cx="90" cy="54" r="14" fill="${yellow}" />
                    <circle cx="90" cy="88" r="11" fill="${yellow}" />
                    <circle cx="90" cy="120" r="7" fill="${cyan}" />

                    <circle cx="55" cy="18" r="14" fill="${yellow}" />
                    <circle cx="55" cy="54" r="11" fill="${yellow}" />
                    <circle cx="55" cy="88" r="8" fill="${cyan}" />
                    <circle cx="55" cy="120" r="5" fill="${cyan}" />

                    <circle cx="22" cy="18" r="10" fill="${yellow}" />
                    <circle cx="22" cy="54" r="8" fill="${cyan}" />
                    <circle cx="22" cy="88" r="5" fill="${cyan}" />
                    <circle cx="22" cy="120" r="3.5" fill="${yellow}" />

                    <circle cx="-8" cy="18" r="6" fill="${cyan}" />
                    <circle cx="-8" cy="54" r="4.5" fill="${yellow}" />
                </g>

                <!-- Top-Left Action Speed Stripes -->
                <line x1="0" y1="0" x2="160" y2="100" stroke="${red}" stroke-width="6" stroke-linecap="round" />
                <line x1="0" y1="40" x2="120" y2="120" stroke="${yellow}" stroke-width="5" stroke-linecap="round" />
                <line x1="0" y1="80" x2="80" y2="130" stroke="${cyan}" stroke-width="4" stroke-linecap="round" />
                <polygon points="175,108 178,118 188,121 178,124 175,134 172,124 162,121 172,118" fill="${yellow}" />

                <!-- Bottom-Left Ben-Day Dot Matrix -->
                <g transform="translate(0, ${bottomOffset})">
                    <circle cx="18" cy="95" r="18" fill="${red}" />
                    <circle cx="18" cy="60" r="14" fill="${yellow}" />
                    <circle cx="18" cy="28" r="11" fill="${yellow}" />
                    <circle cx="18" cy="-2" r="7" fill="${cyan}" />

                    <circle cx="52" cy="95" r="14" fill="${yellow}" />
                    <circle cx="52" cy="60" r="11" fill="${yellow}" />
                    <circle cx="52" cy="28" r="8" fill="${cyan}" />
                    <circle cx="52" cy="-2" r="5" fill="${cyan}" />

                    <circle cx="84" cy="95" r="10" fill="${yellow}" />
                    <circle cx="84" cy="60" r="8" fill="${cyan}" />
                    <circle cx="84" cy="28" r="5" fill="${cyan}" />
                    <circle cx="84" cy="-2" r="3.5" fill="${yellow}" />

                    <circle cx="114" cy="95" r="6" fill="${cyan}" />
                    <circle cx="114" cy="60" r="4.5" fill="${yellow}" />
                </g>

                <!-- Bottom-Right Action Speed Stripes -->
                <g transform="translate(0, ${bottomOffset - 1750})">
                    <line x1="1080" y1="1890" x2="920" y2="1790" stroke="${red}" stroke-width="6" stroke-linecap="round" />
                    <line x1="1080" y1="1850" x2="960" y2="1770" stroke="${yellow}" stroke-width="5" stroke-linecap="round" />
                    <line x1="1080" y1="1810" x2="1000" y2="1760" stroke="${cyan}" stroke-width="4" stroke-linecap="round" />
                    <polygon points="905,1782 902,1772 892,1769 902,1766 905,1756 908,1766 918,1769 908,1772" fill="${yellow}" />
                </g>
            `;
        }
    ),
    defineFrame(
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

            const flameTongues = `
                <path d="M0,220 L0,90 C25,80 35,50 45,15 C60,50 80,80 65,110 C85,90 100,55 110,25 C125,70 140,110 125,150 C145,135 160,100 165,70 C175,120 170,170 150,220 Z" fill="${red}" opacity="0.95" />
                <path d="M0,220 L0,120 C20,110 30,80 38,50 C48,80 65,110 55,130 C70,120 85,85 95,60 C105,100 120,130 110,170 C125,160 140,130 142,105 C148,145 142,185 125,220 Z" fill="${amber}" />
            `;

            return `
                <!-- Bottom Symmetrical Flames -->
                <g transform="translate(0, ${bottomY})">
                    ${flameTongues}
                </g>
                <g transform="translate(1080, ${bottomY}) scale(-1, 1)">
                    ${flameTongues}
                </g>

                <!-- Top Corner Flame Pinstripes -->
                <g transform="translate(0, ${topY}) scale(0.65, -0.65)">
                    ${flameTongues}
                </g>
                <g transform="translate(1080, ${topY}) scale(-0.65, -0.65)">
                    ${flameTongues}
                </g>
            `;
        }
    ),
    defineFrame(
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

            return `
                <!-- Left Vertical High-Voltage Lightning -->
                <path d="M40,-20 L95,110 L60,150 L130,280 L85,330 L150,490 L105,550 L160,680" stroke="${primary}" stroke-width="7" stroke-linejoin="bevel" stroke-linecap="round" fill="none" opacity="0.4" />
                <path d="M40,-20 L95,110 L60,150 L130,280 L85,330 L150,490 L105,550 L160,680" stroke="${plasma}" stroke-width="4" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="M40,-20 L95,110 L60,150 L130,280 L85,330 L150,490 L105,550 L160,680" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />

                <!-- Right Vertical High-Voltage Lightning -->
                <path d="M1040,-20 L985,110 L1020,150 L950,280 L995,330 L930,490 L975,550 L920,680" stroke="${primary}" stroke-width="7" stroke-linejoin="bevel" stroke-linecap="round" fill="none" opacity="0.4" />
                <path d="M1040,-20 L985,110 L1020,150 L950,280 L995,330 L930,490 L975,550 L920,680" stroke="${plasma}" stroke-width="4" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="M1040,-20 L985,110 L1020,150 L950,280 L995,330 L930,490 L975,550 L920,680" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />

                <!-- Symmetrical Top Flanking Sparks -->
                <polygon points="120,${topSparkY - 15} 125,${topSparkY} 140,${topSparkY + 5} 125,${topSparkY + 10} 120,${topSparkY + 25} 115,${topSparkY + 10} 100,${topSparkY + 5} 115,${topSparkY}" fill="${spark}" />
                <polygon points="960,${topSparkY - 15} 965,${topSparkY} 980,${topSparkY + 5} 965,${topSparkY + 10} 960,${topSparkY + 25} 955,${topSparkY + 10} 940,${topSparkY + 5} 955,${topSparkY}" fill="${spark}" />

                <!-- Symmetrical Mid Sparks -->
                <polygon points="175,380 179,392 191,396 179,400 175,412 171,400 159,396 171,392" fill="#ffffff" />
                <polygon points="905,380 909,392 921,396 909,400 905,412 901,400 889,396 901,392" fill="#ffffff" />

                <!-- Mid-Flank Lightning Pulses -->
                <path d="M35,820 L65,880 L45,920 L75,990" stroke="${primary}" stroke-width="2.5" fill="none" opacity="0.75" />
                <circle cx="75" cy="990" r="3" fill="${spark}" />
                <path d="M1045,820 L1015,880 L1035,920 L1005,990" stroke="${primary}" stroke-width="2.5" fill="none" opacity="0.75" />
                <circle cx="1005" cy="990" r="3" fill="${spark}" />

                <!-- Bottom Lightning Bolts -->
                <path d="${bottomBoltLeft}" stroke="${primary}" stroke-width="5" stroke-linejoin="bevel" stroke-linecap="round" fill="none" opacity="0.4" />
                <path d="${bottomBoltLeft}" stroke="${plasma}" stroke-width="3" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="${bottomBoltLeft}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />

                <path d="${bottomBoltRight}" stroke="${primary}" stroke-width="5" stroke-linejoin="bevel" stroke-linecap="round" fill="none" opacity="0.4" />
                <path d="${bottomBoltRight}" stroke="${plasma}" stroke-width="3" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="${bottomBoltRight}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />

                <g transform="${groundSparksLeft}">
                    <circle cx="0" cy="0" r="6" fill="${primary}" opacity="0.6" />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                    <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="${spark}" />
                </g>
                <g transform="${groundSparksRight}">
                    <circle cx="0" cy="0" r="6" fill="${primary}" opacity="0.6" />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                    <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="${spark}" />
                </g>
            `;
        }
    ),
    defineFrame(
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

            const shockwaveQuarter = (flipX: boolean, flipY: boolean) => `
                <g transform="scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})">
                    <circle cx="0" cy="0" r="130" stroke="${primary}" stroke-width="4.5" fill="none" opacity="0.8" />
                    <circle cx="0" cy="0" r="210" stroke="${secondary}" stroke-width="2.5" stroke-dasharray="14 10" fill="none" opacity="0.65" />
                    <polygon points="60,40 100,25 75,70" fill="${primary}" opacity="0.85" />
                    <polygon points="120,70 160,50 140,95" fill="${secondary}" opacity="0.75" />
                </g>
            `;

            return `
                <!-- 4 Symmetrical Sonic Blast Corners -->
                <g transform="translate(0, ${topOriginY})">
                    ${shockwaveQuarter(false, false)}
                </g>
                <g transform="translate(1080, ${topOriginY})">
                    ${shockwaveQuarter(true, false)}
                </g>
                <g transform="translate(0, ${bottomOriginY})">
                    ${shockwaveQuarter(false, true)}
                </g>
                <g transform="translate(1080, ${bottomOriginY})">
                    ${shockwaveQuarter(true, true)}
                </g>
            `;
        }
    ),
    defineFrame(
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

            return `
                ${topStreams}
                ${bottomStreams}

                <!-- Symmetrical Left and Right Flank Wind-Tunnel Chevrons -->
                ${chevronFlank(40, 500, 1)}
                ${chevronFlank(1040, 500, -1)}
                ${chevronFlank(40, 1100, 1)}
                ${chevronFlank(1040, 1100, -1)}

                <!-- Edge Dashed Speed Boundaries -->
                <line x1="24" y1="260" x2="24" y2="1660" stroke="${c2}" stroke-width="2" stroke-dasharray="24 16" opacity="0.5" />
                <line x1="1056" y1="260" x2="1056" y2="1660" stroke="${c2}" stroke-width="2" stroke-dasharray="24 16" opacity="0.5" />
            `;
        }
    ),
];
