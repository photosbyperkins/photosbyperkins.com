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
            const hasScoreboard = context?.hasScoreboard ?? true;
            const bottomTransform = hasScoreboard
                ? 'translate(120, 1560) rotate(195)'
                : 'translate(150, 1660) rotate(195)';

            return `
                <g transform="translate(850, 40) rotate(15)">
                    <path d="M0,0 Q60,120 120,260 Q105,240 100,180 Q60,90 0,0 Z" fill="${primary}" opacity="0.95" />
                    <path d="M-50,30 Q10,150 70,290 Q55,270 50,210 Q10,120 -50,30 Z" fill="${accent}" opacity="0.9" />
                    <path d="M-100,60 Q-40,180 20,320 Q5,300 0,240 Q-40,150 -100,60 Z" fill="${primary}" opacity="0.85" />
                    <circle cx="40" cy="200" r="4" fill="#fbbf24" />
                    <circle cx="80" cy="280" r="3" fill="#f59e0b" />
                    <circle cx="-20" cy="260" r="5" fill="#fbbf24" />
                </g>
                <g transform="${bottomTransform}">
                    <path d="M0,0 Q60,120 120,260 Q105,240 100,180 Q60,90 0,0 Z" fill="${primary}" opacity="0.95" />
                    <path d="M-50,30 Q10,150 70,290 Q55,270 50,210 Q10,120 -50,30 Z" fill="${accent}" opacity="0.9" />
                    <path d="M-100,60 Q-40,180 20,320 Q5,300 0,240 Q-40,150 -100,60 Z" fill="${primary}" opacity="0.85" />
                    <circle cx="40" cy="200" r="4" fill="#fbbf24" />
                    <circle cx="80" cy="280" r="3" fill="#f59e0b" />
                    <circle cx="-20" cy="260" r="5" fill="#fbbf24" />
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

            const halftoneBottomTransform = hasScoreboard ? 'translate(0, 1560)' : 'translate(0, 1805)';
            const speedLines = hasScoreboard
                ? `<line x1="1080" y1="1720" x2="920" y2="1620" stroke="${red}" stroke-width="6" stroke-linecap="round" />
                   <line x1="1080" y1="1680" x2="960" y2="1600" stroke="${yellow}" stroke-width="5" stroke-linecap="round" />
                   <line x1="1080" y1="1640" x2="1000" y2="1590" stroke="${cyan}" stroke-width="4" stroke-linecap="round" />
                   <polygon points="905,1612 902,1602 892,1599 902,1596 905,1586 908,1596 918,1599 908,1602" fill="${yellow}" />`
                : `<line x1="1080" y1="1920" x2="920" y2="1820" stroke="${red}" stroke-width="6" stroke-linecap="round" />
                   <line x1="1080" y1="1880" x2="960" y2="1800" stroke="${yellow}" stroke-width="5" stroke-linecap="round" />
                   <line x1="1080" y1="1840" x2="1000" y2="1790" stroke="${cyan}" stroke-width="4" stroke-linecap="round" />
                   <polygon points="905,1812 902,1802 892,1799 902,1796 905,1786 908,1796 918,1799 908,1802" fill="${yellow}" />`;

            return `
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
                <line x1="0" y1="0" x2="160" y2="100" stroke="${red}" stroke-width="6" stroke-linecap="round" />
                <line x1="0" y1="40" x2="120" y2="120" stroke="${yellow}" stroke-width="5" stroke-linecap="round" />
                <line x1="0" y1="80" x2="80" y2="130" stroke="${cyan}" stroke-width="4" stroke-linecap="round" />
                <polygon points="175,108 178,118 188,121 178,124 175,134 172,124 162,121 172,118" fill="${yellow}" />
                <g transform="${halftoneBottomTransform}">
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
                ${speedLines}
            `;
        }
    ),
    defineFrame(
        'street-flames',
        'Flames',
        'action',
        'Hot rod fire flames rising from lower corners',
        ['#f59e0b', '#ef4444', '#ffffff'],
        (override, context) => {
            const amber = override || '#f59e0b';
            const red = override || '#ef4444';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const leftTransform = hasScoreboard ? 'translate(0, 1690) scale(0.85, 0.95)' : 'translate(0, 1680)';
            const rightTransform = hasScoreboard
                ? 'translate(1080, 1690) scale(-0.85, 0.95)'
                : 'translate(1080, 1680) scale(-1, 1)';

            return `
                <g transform="${leftTransform}">
                    <path d="M0,240 L0,100 C30,90 40,60 50,20 C65,60 85,90 70,120 C90,100 110,60 120,30 C135,80 150,120 135,160 C155,145 170,110 175,80 C185,130 180,180 160,240 Z" fill="${red}" opacity="0.95" />
                    <path d="M0,240 L0,130 C25,120 35,90 42,60 C52,90 70,120 60,140 C75,130 90,95 100,70 C110,110 125,140 115,180 C130,170 145,140 148,115 C155,155 150,195 135,240 Z" fill="${amber}" />
                </g>
                <g transform="${rightTransform}">
                    <path d="M0,240 L0,100 C30,90 40,60 50,20 C65,60 85,90 70,120 C90,100 110,60 120,30 C135,80 150,120 135,160 C155,145 170,110 175,80 C185,130 180,180 160,240 Z" fill="${red}" opacity="0.95" />
                    <path d="M0,240 L0,130 C25,120 35,90 42,60 C52,90 70,120 60,140 C75,130 90,95 100,70 C110,110 125,140 115,180 C130,170 145,140 148,115 C155,155 150,195 135,240 Z" fill="${amber}" />
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

            const bottomBoltLeft = hasScoreboard
                ? 'M60,1180 L110,1300 L75,1350 L140,1470 L95,1520'
                : 'M60,1350 L110,1480 L75,1530 L150,1680 L90,1740 L130,1820';
            const bottomBoltRight = hasScoreboard
                ? 'M1020,1180 L970,1300 L1005,1350 L940,1470 L985,1520'
                : 'M1020,1350 L970,1480 L1005,1530 L930,1680 L990,1740 L950,1820';

            const groundSparksLeft = hasScoreboard ? 'translate(95, 1520)' : 'translate(130, 1820)';
            const groundSparksRight = hasScoreboard ? 'translate(985, 1520)' : 'translate(950, 1820)';

            return `
                <path d="M40,-20 L95,110 L60,150 L130,280 L85,330 L160,490 L115,550 L180,680" stroke="${primary}" stroke-width="8" stroke-linejoin="bevel" stroke-linecap="round" fill="none" opacity="0.45" />
                <path d="M40,-20 L95,110 L60,150 L130,280 L85,330 L160,490 L115,550 L180,680" stroke="${plasma}" stroke-width="4.5" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="M40,-20 L95,110 L60,150 L130,280 L85,330 L160,490 L115,550 L180,680" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="M95,110 L150,145 L135,185 L180,225" stroke="${plasma}" stroke-width="2.5" stroke-linejoin="bevel" fill="none" opacity="0.85" />
                <path d="M130,280 L195,310 L180,355 L225,395" stroke="${primary}" stroke-width="2" stroke-linejoin="bevel" fill="none" opacity="0.8" />
                <path d="M1040,-20 L985,110 L1020,150 L950,280 L995,330 L920,490 L965,550 L900,680" stroke="${primary}" stroke-width="8" stroke-linejoin="bevel" stroke-linecap="round" fill="none" opacity="0.45" />
                <path d="M1040,-20 L985,110 L1020,150 L950,280 L995,330 L920,490 L965,550 L900,680" stroke="${plasma}" stroke-width="4.5" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="M1040,-20 L985,110 L1020,150 L950,280 L995,330 L920,490 L965,550 L900,680" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="M985,110 L930,145 L945,185 L900,225" stroke="${plasma}" stroke-width="2.5" stroke-linejoin="bevel" fill="none" opacity="0.85" />
                <path d="M950,280 L885,310 L900,355 L855,395" stroke="${primary}" stroke-width="2" stroke-linejoin="bevel" fill="none" opacity="0.8" />
                <polygon points="175,130 180,145 195,150 180,155 175,170 170,155 155,150 170,145" fill="${spark}" />
                <polygon points="905,130 910,145 925,150 910,155 905,170 900,155 885,150 900,145" fill="${spark}" />
                <polygon points="215,380 219,392 231,396 219,400 215,412 211,400 199,396 211,392" fill="#ffffff" />
                <polygon points="865,380 869,392 881,396 869,400 865,412 861,400 849,396 861,392" fill="#ffffff" />
                <path d="M35,820 L65,880 L45,920 L75,990" stroke="${primary}" stroke-width="2.5" fill="none" opacity="0.75" />
                <circle cx="75" cy="990" r="3" fill="${spark}" />
                <path d="M1045,820 L1015,880 L1035,920 L1005,990" stroke="${primary}" stroke-width="2.5" fill="none" opacity="0.75" />
                <circle cx="1005" cy="990" r="3" fill="${spark}" />
                <path d="${bottomBoltLeft}" stroke="${primary}" stroke-width="6" stroke-linejoin="bevel" stroke-linecap="round" fill="none" opacity="0.4" />
                <path d="${bottomBoltLeft}" stroke="${plasma}" stroke-width="3.5" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="${bottomBoltLeft}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="${bottomBoltRight}" stroke="${primary}" stroke-width="6" stroke-linejoin="bevel" stroke-linecap="round" fill="none" opacity="0.4" />
                <path d="${bottomBoltRight}" stroke="${plasma}" stroke-width="3.5" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <path d="${bottomBoltRight}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="bevel" stroke-linecap="round" fill="none" />
                <g transform="${groundSparksLeft}">
                    <circle cx="0" cy="0" r="7" fill="${primary}" opacity="0.6" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                    <polygon points="0,-14 3,-4 14,0 3,4 0,14 -3,4 -14,0 -3,-4" fill="${spark}" />
                    <line x1="-20" y1="0" x2="20" y2="0" stroke="${primary}" stroke-width="2" />
                </g>
                <g transform="${groundSparksRight}">
                    <circle cx="0" cy="0" r="7" fill="${primary}" opacity="0.6" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                    <polygon points="0,-14 3,-4 14,0 3,4 0,14 -3,4 -14,0 -3,-4" fill="${spark}" />
                    <line x1="-20" y1="0" x2="20" y2="0" stroke="${primary}" stroke-width="2" />
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
            const hasScoreboard = context?.hasScoreboard ?? true;
            const bottomOriginY = hasScoreboard ? 1680 : 1840;

            return `
                <g transform="translate(1080, 0)">
                    <circle cx="0" cy="0" r="160" stroke="${primary}" stroke-width="5" fill="none" opacity="0.8" />
                    <circle cx="0" cy="0" r="260" stroke="${secondary}" stroke-width="3" stroke-dasharray="16 12" fill="none" opacity="0.65" />
                    <circle cx="0" cy="0" r="380" stroke="${primary}" stroke-width="2" stroke-dasharray="32 16" fill="none" opacity="0.45" />
                    <polygon points="-80,80 -120,60 -90,110" fill="${primary}" />
                    <polygon points="-140,160 -190,130 -160,200" fill="${secondary}" opacity="0.8" />
                    <polygon points="-240,90 -280,70 -260,115" fill="${primary}" opacity="0.7" />
                </g>
                <g transform="translate(0, ${bottomOriginY})">
                    <circle cx="0" cy="0" r="140" stroke="${primary}" stroke-width="5" fill="none" opacity="0.8" />
                    <circle cx="0" cy="0" r="240" stroke="${secondary}" stroke-width="3" stroke-dasharray="20 10" fill="none" opacity="0.6" />
                    <polygon points="70,-70 110,-50 80,-95" fill="${primary}" />
                    <polygon points="130,-140 180,-110 150,-175" fill="${secondary}" opacity="0.8" />
                </g>
                <line x1="1020" y1="60" x2="880" y2="180" stroke="${primary}" stroke-width="3" opacity="0.6" />
                <line x1="980" y1="120" x2="820" y2="260" stroke="${secondary}" stroke-width="2" stroke-dasharray="8 6" opacity="0.5" />
                <line x1="60" y1="${bottomOriginY - 60}" x2="200" y2="${bottomOriginY - 180}" stroke="${primary}" stroke-width="3" opacity="0.6" />
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
            const topY = hasAttribution ? 210 : 80;

            return `
                <path d="M30,${topY} Q540,${topY - 40} 1050,${topY}" stroke="${c1}" stroke-width="3" fill="none" opacity="0.7" />
                <path d="M60,${topY + 24} Q540,${topY - 10} 1020,${topY + 24}" stroke="${c2}" stroke-width="2" stroke-dasharray="30 15" fill="none" opacity="0.6" />
                <g transform="translate(40, 480)">
                    <polygon points="0,0 20,15 0,30 8,15" fill="${c1}" />
                    <polygon points="26,0 46,15 26,30 34,15" fill="${c1}" opacity="0.8" />
                    <polygon points="52,0 72,15 52,30 60,15" fill="${c2}" opacity="0.6" />
                    <line x1="84" y1="15" x2="240" y2="15" stroke="${c1}" stroke-width="3" stroke-dasharray="24 12" />
                </g>
                <g transform="translate(1040, 1400) scale(-1, 1)">
                    <polygon points="0,0 20,15 0,30 8,15" fill="${c1}" />
                    <polygon points="26,0 46,15 26,30 34,15" fill="${c1}" opacity="0.8" />
                    <polygon points="52,0 72,15 52,30 60,15" fill="${c2}" opacity="0.6" />
                    <line x1="84" y1="15" x2="240" y2="15" stroke="${c1}" stroke-width="3" stroke-dasharray="24 12" />
                </g>
                <path d="M40,1780 C300,1810 780,1750 1040,1780" stroke="${c1}" stroke-width="4" fill="none" opacity="0.75" />
                <path d="M80,1804 C340,1830 740,1774 1000,1804" stroke="${c2}" stroke-width="2" stroke-dasharray="40 20" fill="none" opacity="0.6" />
            `;
        }
    ),
];
