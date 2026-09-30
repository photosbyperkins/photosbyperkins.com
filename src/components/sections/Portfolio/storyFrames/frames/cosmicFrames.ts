import type { StoryFrameDefinition } from '../types';
import { defineFrame } from './helper';

export const COSMIC_FRAMES: StoryFrameDefinition[] = [
    defineFrame(
        'unicorns',
        'Unicorn',
        'cosmic',
        'Pastel dream arches, cute starbursts & magic horn',
        ['#f472b6', '#c084fc', '#38bdf8', '#facc15'],
        (override, context) => {
            const c1 = override || '#f472b6';
            const c2 = override || '#c084fc';
            const c3 = override || '#38bdf8';
            const c4 = override || '#facc15';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const unicornTransform = hasScoreboard
                ? 'translate(800, 1370) scale(1.15)'
                : 'translate(800, 1590) scale(1.15)';

            return `
                <path d="M-30,220 C100,220 220,100 220,-30" stroke="${c1}" stroke-width="16" fill="none" />
                <path d="M-30,200 C85,200 200,85 200,-30" stroke="${c2}" stroke-width="16" fill="none" />
                <path d="M-30,180 C70,180 180,70 180,-30" stroke="${c3}" stroke-width="16" fill="none" />
                <path d="M-30,160 C55,160 160,55 160,-30" stroke="${c4}" stroke-width="16" fill="none" />
                <circle cx="190" cy="50" r="26" fill="#ffffff" opacity="0.85" />
                <circle cx="220" cy="65" r="20" fill="#ffffff" opacity="0.85" />
                <circle cx="65" cy="190" r="24" fill="#ffffff" opacity="0.85" />
                <polygon points="980,100 985,115 1000,120 985,125 980,140 975,125 960,120 975,115" fill="${c4}" />
                <polygon points="920,160 923,172 935,175 923,178 920,190 917,178 905,175 917,172" fill="${c1}" />
                <g transform="${unicornTransform}">
                    <path d="M96,62 C125,40 170,44 198,68 C212,80 214,96 198,104 C184,110 172,100 178,88 C182,78 165,62 118,74 Z" fill="${c2}" />
                    <path d="M112,82 C145,68 190,78 214,105 C226,118 225,134 208,142 C194,148 184,136 190,125 C195,114 175,98 124,106 Z" fill="${c3}" />
                    <path d="M120,112 C152,102 195,114 218,144 C228,158 226,174 208,182 C194,188 185,176 190,165 C195,152 176,134 128,142 Z" fill="${c1}" />
                    <path d="M126,145 C155,138 192,152 210,182 C220,198 215,214 196,224 C182,230 174,218 180,206 C186,192 168,172 132,178 Z" fill="${c4}" />

                    <path d="M130,55 Q168,52 190,70" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.45" />
                    <path d="M140,84 Q182,88 206,108" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.45" />
                    <path d="M148,118 Q188,124 210,146" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.45" />
                    <path d="M152,154 Q184,162 202,185" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.45" />

                    <path d="M84,64 C75,74 58,92 48,106 C39,116 36,128 44,135 C52,141 62,139 68,133 C74,128 80,132 82,144 C84,164 80,190 74,228 L142,228 C138,185 130,135 110,82 C102,68 94,64 84,64 Z" fill="#ffffff" />

                    <path d="M98,66 C96,44 105,20 119,14 C125,28 124,50 114,68 Z" fill="#ffffff" />
                    <path d="M102,62 C101,46 107,30 116,23 C119,33 118,48 112,64 Z" fill="${c1}" opacity="0.65" />

                    <path d="M88,62 C74,54 58,64 54,78 C52,86 60,90 66,85 C71,80 65,72 68,66 C71,62 78,62 84,63 Z" fill="${c1}" />
                    <path d="M94,64 C86,56 74,58 71,70 C70,77 77,80 81,76 C84,72 78,67 82,64 Z" fill="${c3}" />

                    <path d="M68,67 L46,4 L80,61 Z" fill="${c4}" />
                    <polygon points="46,4 54,18 45,21" fill="#fef08a" />
                    <polygon points="45,21 54,18 62,34 52,38" fill="${c4}" />
                    <polygon points="52,38 62,34 71,49 60,54" fill="#fbbf24" />
                    <polygon points="60,54 71,49 80,61 68,67" fill="#f59e0b" />
                    <path d="M45,21 Q50,18 54,18" stroke="#d97706" stroke-width="1.8" stroke-linecap="round" fill="none" />
                    <path d="M52,38 Q58,35 62,34" stroke="#d97706" stroke-width="1.8" stroke-linecap="round" fill="none" />
                    <path d="M60,54 Q66,50 71,49" stroke="#d97706" stroke-width="1.8" stroke-linecap="round" fill="none" />
                    <path d="M46,7 L54,28 L62,48" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.8" />

                    <polygon points="46,-9 48,2 59,4 48,6 46,17 44,6 33,4 44,2" fill="${c4}" />
                    <polygon points="46,-4 47,2 53,4 47,6 46,12 45,6 39,4 45,2" fill="#ffffff" />
                    <circle cx="46" cy="4" r="2.2" fill="#ffffff" />
                    <polygon points="30,-2 31,3 36,4 31,5 30,10 29,5 24,4 29,3" fill="#ffffff" opacity="0.9" />
                    <polygon points="60,-5 61,-1 65,0 61,1 60,5 59,1 55,0 59,-1" fill="${c3}" opacity="0.85" />

                    <path d="M55,102 Q64,94 74,101" stroke="#1e1b4b" stroke-width="2.6" stroke-linecap="round" fill="none" />
                    <line x1="72" y1="100" x2="79" y2="94" stroke="#1e1b4b" stroke-width="2.2" stroke-linecap="round" />
                    <line x1="67" y1="97" x2="72" y2="90" stroke="#1e1b4b" stroke-width="2.2" stroke-linecap="round" />
                    <line x1="60" y1="97" x2="62" y2="91" stroke="#1e1b4b" stroke-width="2" stroke-linecap="round" />
                    <ellipse cx="62" cy="113" rx="10" ry="6" fill="${c1}" opacity="0.45" />
                    <path d="M39,129 Q45,133 49,129" stroke="#1e1b4b" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.85" />
                    <ellipse cx="44" cy="123" rx="1.8" ry="2.2" fill="${c1}" opacity="0.8" />

                    <g fill="#ffffff" opacity="0.95">
                        <ellipse cx="74" cy="230" rx="26" ry="18" />
                        <circle cx="106" cy="222" r="26" />
                        <circle cx="140" cy="225" r="24" />
                        <ellipse cx="174" cy="232" rx="26" ry="18" />
                        <circle cx="122" cy="228" r="20" />
                    </g>

                    <polygon points="68,212 70,217 75,218 70,219 68,224 66,219 61,218 66,217" fill="${c4}" opacity="0.9" />
                    <circle cx="218" cy="168" r="3" fill="#ffffff" opacity="0.85" />
                    <polygon points="226,134 227,138 231,139 227,140 226,144 225,140 221,139 225,138" fill="${c3}" opacity="0.85" />
                    <circle cx="228" cy="176" r="2" fill="${c1}" opacity="0.9" />
                </g>
            `;
        }
    ),
    defineFrame(
        'intergalactic',
        'Cosmos',
        'cosmic',
        'Ringed celestial planets, streaking comets & starfield constellations',
        ['#8b5cf6', '#06b6d4', '#fbbf24'],
        (override, context) => {
            const p1 = override || '#8b5cf6';
            const p2 = override || '#06b6d4';
            const gold = override || '#fbbf24';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const moonTransform = hasScoreboard ? 'translate(80, 1530)' : 'translate(90, 1750)';
            const rightAnchorTransform = hasScoreboard ? 'translate(970, 1540)' : 'translate(960, 1760)';

            return `
                <g transform="translate(930, 130) rotate(-22)">
                    <path d="M-85,0 A85,18 0 0,1 85,0" stroke="${p2}" stroke-width="6" fill="none" opacity="0.8" />
                    <path d="M-66,0 A66,13 0 0,1 66,0" stroke="${p1}" stroke-width="3.5" fill="none" opacity="0.9" />
                    <circle cx="0" cy="0" r="40" fill="${p1}" />
                    <path d="M-38,-12 Q0,-8 38,-12" stroke="#a78bfa" stroke-width="5" fill="none" opacity="0.8" />
                    <path d="M-40,2 Q0,6 40,2" stroke="${p2}" stroke-width="4" fill="none" opacity="0.75" />
                    <path d="M-36,16 Q0,20 36,16" stroke="#c084fc" stroke-width="4" fill="none" opacity="0.7" />
                    <path d="M85,0 A85,18 0 0,1 -85,0" stroke="${p2}" stroke-width="6" fill="none" opacity="0.95" />
                    <path d="M66,0 A66,13 0 0,1 -66,0" stroke="${p1}" stroke-width="3.5" fill="none" opacity="0.95" />
                    <path d="M78,0 A78,16 0 0,1 -78,0" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.75" />
                    <circle cx="75" cy="-35" r="5" fill="${gold}" />
                    <circle cx="-65" cy="42" r="3.5" fill="${p2}" />
                </g>
                <g opacity="0.95">
                    <line x1="-30" y1="80" x2="220" y2="210" stroke="${p2}" stroke-width="3" opacity="0.85" />
                    <line x1="10" y1="75" x2="215" y2="202" stroke="#ffffff" stroke-width="1.5" opacity="0.9" />
                    <line x1="-50" y1="95" x2="180" y2="218" stroke="${p1}" stroke-width="2" opacity="0.6" stroke-dasharray="12 8" />
                    <polygon points="220,206 230,210 220,214 214,210" fill="#ffffff" />
                    <circle cx="218" cy="210" r="6" fill="${p2}" opacity="0.6" />
                    <circle cx="160" cy="175" r="2.5" fill="${gold}" />
                    <circle cx="100" cy="142" r="2" fill="#ffffff" />
                    <circle cx="40" cy="110" r="1.5" fill="${p2}" />
                </g>
                <path d="M-20,130 A260,260 0 0,1 260,-20" stroke="${p2}" stroke-width="2" stroke-dasharray="10 8" fill="none" opacity="0.65" />
                <path d="M-20,170 A300,300 0 0,1 300,-20" stroke="${p1}" stroke-width="1.5" stroke-dasharray="6 6" fill="none" opacity="0.45" />

                <polygon points="985,280 990,295 1005,300 990,305 985,320 980,305 965,300 980,295" fill="${gold}" />
                <circle cx="985" cy="300" r="2.5" fill="#ffffff" />

                <polygon points="80,290 84,302 96,306 84,310 80,322 76,310 64,306 76,302" fill="#ffffff" opacity="0.9" />
                <polygon points="1010,480 1013,490 1023,493 1013,496 1010,506 1007,496 997,493 1007,490" fill="${gold}" opacity="0.85" />
                <polygon points="50,750 53,760 63,763 53,766 50,776 47,766 37,763 47,760" fill="${p2}" opacity="0.9" />

                <polyline points="50,420 75,490 35,570 85,660 50,740" stroke="${p2}" stroke-width="1.8" stroke-dasharray="5 5" fill="none" opacity="0.7" />
                <circle cx="50" cy="420" r="5" fill="#ffffff" />
                <circle cx="50" cy="420" r="9" fill="${p2}" opacity="0.3" />
                <circle cx="75" cy="490" r="6" fill="${gold}" />
                <circle cx="75" cy="490" r="10" fill="${gold}" opacity="0.25" />
                <circle cx="35" cy="570" r="4.5" fill="#ffffff" />
                <circle cx="85" cy="660" r="5.5" fill="${p1}" />
                <circle cx="85" cy="660" r="9" fill="${p1}" opacity="0.3" />
                <circle cx="50" cy="740" r="5" fill="${gold}" />

                <circle cx="950" cy="380" r="2" fill="#ffffff" opacity="0.7" />
                <circle cx="1025" cy="410" r="2.5" fill="${p2}" opacity="0.8" />
                <circle cx="60" cy="350" r="2" fill="${gold}" opacity="0.75" />
                <circle cx="1020" cy="630" r="2" fill="#ffffff" opacity="0.6" />

                <g transform="${moonTransform}">
                    <path d="M-20,-32 A36,36 0 0,0 22,32 A28,28 0 0,1 -20,-32 Z" fill="${gold}" />
                    <circle cx="-2" cy="-4" r="3" fill="#d97706" opacity="0.6" />
                    <circle cx="-8" cy="10" r="2" fill="#d97706" opacity="0.6" />
                    <ellipse cx="38" cy="8" rx="42" ry="14" stroke="${p2}" stroke-width="2" stroke-dasharray="6 4" fill="none" transform="rotate(-15 38 8)" opacity="0.8" />
                    <circle cx="38" cy="8" r="4" fill="#ffffff" />
                    <circle cx="68" cy="1" r="2.5" fill="${p1}" />
                    <polygon points="75,28 78,34 84,36 78,38 75,44 72,38 66,36 72,34" fill="${gold}" />
                </g>

                <g transform="${rightAnchorTransform}">
                    <polygon points="0,-18 5,-5 18,0 5,5 0,18 -5,5 -18,0 -5,-5" fill="${gold}" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                    <circle cx="-24" cy="-14" r="3" fill="${p2}" />
                    <circle cx="-16" cy="18" r="2" fill="${p1}" />
                </g>
            `;
        }
    ),
    defineFrame(
        'celestial-moon',
        'Moon',
        'cosmic',
        'Minimalist art-deco crescent moons & gold starlight',
        ['#facc15', '#e2e8f0'],
        (override, context) => {
            const gold = override || '#facc15';
            const silver = override || '#e2e8f0';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const starburstTransform = hasScoreboard ? 'translate(960, 1590)' : 'translate(980, 1800)';

            return `
                <g transform="translate(80, 80)">
                    <path d="M-20,-35 A40,40 0 0,0 25,35 A30,30 0 0,1 -20,-35 Z" fill="${gold}" />
                    <line x1="40" y1="-20" x2="40" y2="40" stroke="${silver}" stroke-width="1.5" />
                    <polygon points="40,40 37,47 40,54 43,47" fill="${gold}" />
                </g>
                <circle cx="35" cy="450" r="5" fill="${gold}" />
                <circle cx="35" cy="750" r="3.5" fill="${silver}" />
                <circle cx="35" cy="1050" r="5" fill="${gold}" />
                <circle cx="35" cy="1350" r="3.5" fill="${silver}" />
                <circle cx="1045" cy="450" r="3.5" fill="${silver}" />
                <circle cx="1045" cy="750" r="5" fill="${gold}" />
                <circle cx="1045" cy="1050" r="3.5" fill="${silver}" />
                <circle cx="1045" cy="1350" r="5" fill="${gold}" />
                <g transform="${starburstTransform}">
                    <polygon points="0,-45 8,-12 45,0 8,12 0,45 -8,12 -45,0 -8,-12" fill="${gold}" />
                    <polygon points="0,-25 5,-7 25,0 5,7 0,25 -5,7 -25,0 -5,-7" fill="#ffffff" />
                </g>
                <path d="M30,140 L30,50 L120,50" stroke="${gold}" stroke-width="2" fill="none" />
                <path d="M1050,140 L1050,50 L960,50" stroke="${gold}" stroke-width="2" fill="none" />
                <path d="M30,1780 L30,1870 L120,1870" stroke="${gold}" stroke-width="2" fill="none" />
                <path d="M1050,1780 L1050,1870 L960,1870" stroke="${gold}" stroke-width="2" fill="none" />
            `;
        }
    ),
    defineFrame(
        'golden-sparkle',
        'Sparkle',
        'cosmic',
        'Glamour diamond sparkles, lens flares & champagne glow',
        ['#fef08a', '#fbbf24', '#ffffff'],
        (override, context) => {
            const gold = override || '#fbbf24';
            const light = override || '#fef08a';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const flareTransform = hasScoreboard ? 'translate(90, 1590)' : 'translate(100, 1820)';
            const starTransform = hasScoreboard ? 'translate(980, 1600)' : 'translate(990, 1830)';

            return `
                <g transform="translate(980, 80)">
                    <polygon points="0,-60 12,-16 60,0 12,16 0,60 -12,16 -60,0 -12,-16" fill="${gold}" />
                    <polygon points="0,-35 7,-9 35,0 7,9 0,35 -7,9 -35,0 -7,-9" fill="#ffffff" />
                    <circle cx="-50" cy="50" r="4" fill="${light}" />
                    <circle cx="30" cy="80" r="3" fill="${gold}" />
                </g>
                <g transform="translate(90, 80)">
                    <polygon points="0,-40 8,-10 40,0 8,10 0,40 -8,10 -40,0 -8,-10" fill="${light}" />
                    <circle cx="30" cy="-20" r="3" fill="#ffffff" />
                    <circle cx="-25" cy="30" r="5" fill="${gold}" />
                </g>
                <g transform="${flareTransform}">
                    <polygon points="0,-55 11,-15 55,0 11,15 0,55 -11,15 -55,0 -11,-15" fill="${gold}" />
                    <polygon points="0,-30 6,-8 30,0 6,8 0,30 -6,8 -30,0 -6,-8" fill="#ffffff" />
                    <circle cx="45" cy="-40" r="4" fill="${light}" />
                </g>
                <g transform="${starTransform}">
                    <polygon points="0,-30 6,-8 30,0 6,8 0,30 -6,8 -30,0 -6,-8" fill="${light}" />
                </g>
            `;
        }
    ),
    defineFrame(
        'roller-disco',
        'Disco',
        'cosmic',
        'Mirror ball starlight reflections, multi-color neon tube curves & disco sparkles',
        ['#ec4899', '#8b5cf6', '#facc15'],
        (override, context) => {
            const pink = override || '#ec4899';
            const purple = override || '#8b5cf6';
            const gold = override || '#facc15';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return `
                <g transform="translate(960, ${topY})">
                    <line x1="0" y1="-80" x2="0" y2="-36" stroke="${gold}" stroke-width="2" />
                    <circle cx="0" cy="0" r="38" fill="rgba(255,255,255,0.15)" stroke="${gold}" stroke-width="3" />
                    <ellipse cx="0" cy="0" rx="38" ry="12" stroke="${gold}" stroke-width="1.5" fill="none" opacity="0.6" />
                    <ellipse cx="0" cy="0" rx="38" ry="24" stroke="${gold}" stroke-width="1.5" fill="none" opacity="0.6" />
                    <line x1="-38" y1="0" x2="38" y2="0" stroke="${gold}" stroke-width="1.5" opacity="0.6" />
                    <line x1="0" y1="-38" x2="0" y2="38" stroke="${gold}" stroke-width="1.5" opacity="0.6" />
                    <polygon points="0,-60 6,-42 24,-42 10,-30 15,-12 0,-24 -15,-12 -10,-30 -24,-42 -6,-42" fill="${pink}" opacity="0.8" />
                </g>
                <path d="M0,1720 Q180,1720 180,1920" stroke="${pink}" stroke-width="4" fill="none" opacity="0.8" />
                <path d="M0,1740 Q160,1740 160,1920" stroke="${purple}" stroke-width="3" fill="none" opacity="0.7" />
                <path d="M0,1760 Q140,1760 140,1920" stroke="${gold}" stroke-width="2" fill="none" opacity="0.6" />
                <path d="M1080,1720 Q900,1720 900,1920" stroke="${pink}" stroke-width="4" fill="none" opacity="0.8" />
                <path d="M1080,1740 Q920,1740 920,1920" stroke="${purple}" stroke-width="3" fill="none" opacity="0.7" />
                <path d="M1080,1760 Q940,1760 940,1920" stroke="${gold}" stroke-width="2" fill="none" opacity="0.6" />
                <g transform="translate(90, 380)">
                    <polygon points="0,-24 5,-6 24,0 5,6 0,24 -5,6 -24,0 -5,-6" fill="${gold}" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                </g>
                <g transform="translate(1010, 720)">
                    <polygon points="0,-24 5,-6 24,0 5,6 0,24 -5,6 -24,0 -5,-6" fill="${gold}" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                </g>
                <g transform="translate(70, 1300)">
                    <polygon points="0,-24 5,-6 24,0 5,6 0,24 -5,6 -24,0 -5,-6" fill="${gold}" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                </g>
            `;
        }
    ),
    defineFrame(
        'mystic-tarot',
        'Tarot',
        'cosmic',
        'Gothic tarot card filigree, celestial sunburst corners & crescent medallions',
        ['#eab308', '#fef08a', '#ca8a04'],
        (override) => {
            const gold = override || '#eab308';
            const lightGold = override || '#fef08a';

            return `
                <rect x="36" y="36" width="1008" height="1848" rx="14" stroke="${gold}" stroke-width="3" fill="none" />
                <rect x="48" y="48" width="984" height="1824" rx="10" stroke="${gold}" stroke-width="1.5" stroke-dasharray="12 8" fill="none" opacity="0.7" />
                <g transform="translate(52, 52)">
                    <circle cx="0" cy="0" r="28" fill="rgba(17,17,22,0.85)" stroke="${gold}" stroke-width="2" />
                    <polygon points="0,-18 4,-5 18,0 4,5 0,18 -4,5 -18,0 -4,-5" fill="${lightGold}" />
                    <circle cx="0" cy="0" r="4" fill="#ffffff" />
                </g>
                <g transform="translate(1028, 52)">
                    <circle cx="0" cy="0" r="28" fill="rgba(17,17,22,0.85)" stroke="${gold}" stroke-width="2" />
                    <polygon points="0,-18 4,-5 18,0 4,5 0,18 -4,5 -18,0 -4,-5" fill="${lightGold}" />
                    <circle cx="0" cy="0" r="4" fill="#ffffff" />
                </g>
                <g transform="translate(52, 1868)">
                    <circle cx="0" cy="0" r="28" fill="rgba(17,17,22,0.85)" stroke="${gold}" stroke-width="2" />
                    <polygon points="0,-18 4,-5 18,0 4,5 0,18 -4,5 -18,0 -4,-5" fill="${lightGold}" />
                    <circle cx="0" cy="0" r="4" fill="#ffffff" />
                </g>
                <g transform="translate(1028, 1868)">
                    <circle cx="0" cy="0" r="28" fill="rgba(17,17,22,0.85)" stroke="${gold}" stroke-width="2" />
                    <polygon points="0,-18 4,-5 18,0 4,5 0,18 -4,5 -18,0 -4,-5" fill="${lightGold}" />
                    <circle cx="0" cy="0" r="4" fill="#ffffff" />
                </g>
                <g transform="translate(540, 48)">
                    <polygon points="0,-16 10,0 0,16 -10,0" fill="${gold}" />
                    <line x1="-80" y1="0" x2="-20" y2="0" stroke="${gold}" stroke-width="2" />
                    <line x1="20" y1="0" x2="80" y2="0" stroke="${gold}" stroke-width="2" />
                    <circle cx="-50" cy="0" r="3" fill="${lightGold}" />
                    <circle cx="50" cy="0" r="3" fill="${lightGold}" />
                </g>
                <g transform="translate(540, 1872)">
                    <polygon points="0,-16 10,0 0,16 -10,0" fill="${gold}" />
                    <line x1="-80" y1="0" x2="-20" y2="0" stroke="${gold}" stroke-width="2" />
                    <line x1="20" y1="0" x2="80" y2="0" stroke="${gold}" stroke-width="2" />
                    <circle cx="-50" cy="0" r="3" fill="${lightGold}" />
                    <circle cx="50" cy="0" r="3" fill="${lightGold}" />
                </g>
            `;
        }
    ),
];
