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
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const topY = hasAttribution ? 148 : 80;
            const unicornTransform = hasScoreboard
                ? 'translate(860, 1630) scale(0.92)'
                : 'translate(860, 1660) scale(1.05)';

            return `
                <!-- Top-Left Rainbow Arch and Clouds -->
                <path d="M-30,220 C100,220 220,100 220,-30" stroke="${c1}" stroke-width="16" fill="none" />
                <path d="M-30,200 C85,200 200,85 200,-30" stroke="${c2}" stroke-width="16" fill="none" />
                <path d="M-30,180 C70,180 180,70 180,-30" stroke="${c3}" stroke-width="16" fill="none" />
                <path d="M-30,160 C55,160 160,55 160,-30" stroke="${c4}" stroke-width="16" fill="none" />
                <circle cx="190" cy="50" r="26" fill="#ffffff" opacity="0.85" />
                <circle cx="220" cy="65" r="20" fill="#ffffff" opacity="0.85" />
                <circle cx="65" cy="190" r="24" fill="#ffffff" opacity="0.85" />

                <!-- Top-Right Dream Cloud and Magic Starbursts -->
                <g transform="translate(980, ${topY})">
                    <circle cx="10" cy="-10" r="24" fill="#ffffff" opacity="0.85" />
                    <circle cx="-16" cy="6" r="20" fill="#ffffff" opacity="0.85" />
                    <circle cx="28" cy="10" r="18" fill="#ffffff" opacity="0.85" />
                    <polygon points="0,-35 4,-12 25,0 4,12 0,35 -4,12 -25,0 -4,-12" fill="${c4}" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />
                </g>

                <!-- Bottom Unicorn Mascot on Cloud Flank -->
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
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const topY = hasAttribution ? 148 : 100;
            const moonTransform = hasScoreboard ? 'translate(90, 1730)' : 'translate(90, 1800)';
            const rightAnchorTransform = hasScoreboard ? 'translate(980, 1730)' : 'translate(980, 1800)';

            return `
                <!-- Top-Right Ringed Celestial Planet -->
                <g transform="translate(950, ${topY}) rotate(-22)">
                    <path d="M-85,0 A85,18 0 0,1 85,0" stroke="${p2}" stroke-width="6" fill="none" opacity="0.8" />
                    <path d="M-66,0 A66,13 0 0,1 66,0" stroke="${p1}" stroke-width="3.5" fill="none" opacity="0.9" />
                    <circle cx="0" cy="0" r="38" fill="${p1}" />
                    <path d="M-38,-12 Q0,-8 38,-12" stroke="#a78bfa" stroke-width="4.5" fill="none" opacity="0.8" />
                    <path d="M-40,2 Q0,6 40,2" stroke="${p2}" stroke-width="3.5" fill="none" opacity="0.75" />
                    <path d="M-36,16 Q0,20 36,16" stroke="#c084fc" stroke-width="3.5" fill="none" opacity="0.7" />
                    <path d="M85,0 A85,18 0 0,1 -85,0" stroke="${p2}" stroke-width="6" fill="none" opacity="0.95" />
                    <path d="M66,0 A66,13 0 0,1 -66,0" stroke="${p1}" stroke-width="3.5" fill="none" opacity="0.95" />
                    <path d="M78,0 A78,16 0 0,1 -78,0" stroke="#ffffff" stroke-width="1.2" fill="none" opacity="0.75" />
                </g>

                <!-- Top-Left Streaking Comet and Orbit Rays -->
                <g opacity="0.95">
                    <line x1="-30" y1="80" x2="200" y2="190" stroke="${p2}" stroke-width="3" opacity="0.85" />
                    <line x1="10" y1="75" x2="195" y2="182" stroke="#ffffff" stroke-width="1.5" opacity="0.9" />
                    <polygon points="200,186 210,190 200,194 194,190" fill="#ffffff" />
                    <circle cx="198" cy="190" r="5" fill="${p2}" opacity="0.6" />
                </g>
                <path d="M-20,130 A260,260 0 0,1 260,-20" stroke="${p2}" stroke-width="2" stroke-dasharray="10 8" fill="none" opacity="0.6" />

                <!-- Flank Constellation Points -->
                <polygon points="80,290 84,302 96,306 84,310 80,322 76,310 64,306 76,302" fill="#ffffff" opacity="0.9" />
                <polygon points="1010,480 1013,490 1023,493 1013,496 1010,506 1007,496 997,493 1007,490" fill="${gold}" opacity="0.85" />
                <polyline points="50,420 75,490 35,570 85,660 50,740" stroke="${p2}" stroke-width="1.8" stroke-dasharray="5 5" fill="none" opacity="0.65" />
                <circle cx="50" cy="420" r="4.5" fill="#ffffff" />
                <circle cx="75" cy="490" r="5" fill="${gold}" />
                <circle cx="35" cy="570" r="4" fill="#ffffff" />
                <circle cx="85" cy="660" r="5" fill="${p1}" />
                <circle cx="50" cy="740" r="4.5" fill="${gold}" />

                <!-- Bottom-Left Moon and Orbit -->
                <g transform="${moonTransform}">
                    <path d="M-18,-28 A30,30 0 0,0 20,28 A24,24 0 0,1 -18,-28 Z" fill="${gold}" />
                    <ellipse cx="32" cy="6" rx="36" ry="12" stroke="${p2}" stroke-width="1.8" stroke-dasharray="6 4" fill="none" transform="rotate(-15 32 6)" opacity="0.8" />
                    <circle cx="32" cy="6" r="3.5" fill="#ffffff" />
                </g>

                <!-- Bottom-Right Golden Starburst Flank -->
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
        // Id stays 'celestial-moon' so persisted story settings / recent frames keep resolving.
        'celestial-moon',
        'Lunar',
        'cosmic',
        'Cratered full moon, a lunar-phase track & drifting star dust',
        ['#e2e8f0', '#94a3b8', '#fde68a'],
        (override, context) => {
            const silver = override || '#e2e8f0';
            const slate = override || '#94a3b8';
            const glow = override || '#fde68a';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const moonY = hasAttribution ? 150 : 110;
            const bottomY = hasScoreboard ? 1700 : 1790;

            // Phase glyph. k in [-1, 1]: -1 = new, 0 = quarter, 1 = full; lit side on the right.
            // Lit shape = right half-disc closed by an elliptical terminator of x-radius r*|k|.
            const phase = (r: number, k: number) => {
                const disc = `<circle cx="0" cy="0" r="${r}" fill="${slate}" fill-opacity="0.18" stroke="${silver}" stroke-width="1.5" stroke-opacity="0.55" />`;
                if (k <= -1) return disc;
                if (k >= 1) return `${disc}<circle cx="0" cy="0" r="${r}" fill="${silver}" />`;
                const t = (Math.abs(k) * r).toFixed(2);
                // Returning bottom->top: sweep 0 bulges right (crescent), sweep 1 bulges left (gibbous).
                const back = k === 0 ? 'Z' : `A${t},${r} 0 0,${k < 0 ? 0 : 1} 0,${-r} Z`;
                return `${disc}<path d="M0,${-r} A${r},${r} 0 0,1 0,${r} ${back}" fill="${silver}" />`;
            };

            // Waxing crescent -> full -> waning crescent (waning ones mirrored so the lit side flips).
            const phaseTrack = [
                { k: -1, mirror: false },
                { k: -0.55, mirror: false },
                { k: 0, mirror: false },
                { k: 0.55, mirror: false },
                { k: 1, mirror: false },
                { k: 0.55, mirror: true },
                { k: 0, mirror: true },
                { k: -0.55, mirror: true },
            ]
                .map(({ k, mirror }, i) => {
                    const y = 520 + i * 120;
                    return `<g transform="translate(1022, ${y})${mirror ? ' scale(-1, 1)' : ''}">${phase(20, k)}</g>`;
                })
                .join('');

            const twinkle = (x: number, y: number, s: number, col: string) => `
                <g transform="translate(${x}, ${y}) scale(${s})">
                    <path d="M0,-14 Q1.5,-1.5 14,0 Q1.5,1.5 0,14 Q-1.5,1.5 -14,0 Q-1.5,-1.5 0,-14 Z" fill="${col}" />
                </g>`;

            return `
                <defs>
                    <radialGradient id="lunar-surface" cx="0.62" cy="0.38" r="0.75">
                        <stop offset="0" stop-color="#ffffff" />
                        <stop offset="0.55" stop-color="${silver}" />
                        <stop offset="1" stop-color="${slate}" />
                    </radialGradient>
                    <radialGradient id="lunar-halo" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0.55" stop-color="${glow}" stop-opacity="0.35" />
                        <stop offset="1" stop-color="${glow}" stop-opacity="0" />
                    </radialGradient>
                </defs>

                <!-- Top-Left Full Moon (cropped by the edge) with halo and craters -->
                <g transform="translate(40, ${moonY})">
                    <circle cx="0" cy="0" r="250" fill="url(#lunar-halo)" />
                    <circle cx="0" cy="0" r="150" fill="url(#lunar-surface)" />
                    <g fill="${slate}" fill-opacity="0.38">
                        <circle cx="62" cy="-48" r="26" />
                        <circle cx="96" cy="36" r="16" />
                        <circle cx="30" cy="70" r="34" />
                        <circle cx="-20" cy="-92" r="14" />
                        <circle cx="118" cy="-6" r="8" />
                        <circle cx="70" cy="104" r="10" />
                    </g>
                    <g fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2">
                        <path d="M40,-62 A26,26 0 0,1 84,-30" />
                        <path d="M6,48 A34,34 0 0,1 58,52" />
                    </g>
                    <circle cx="0" cy="0" r="150" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2" />
                </g>

                <!-- Dashed orbit sweeping from the moon down the left flank -->
                <path d="M210,${moonY + 40} C330,${moonY + 360} 120,${moonY + 700} 34,${moonY + 980}" stroke="${silver}" stroke-width="1.5" stroke-dasharray="3 10" stroke-linecap="round" fill="none" opacity="0.7" />
                <circle cx="34" cy="${moonY + 980}" r="5" fill="${glow}" />

                <!-- Right-Edge Lunar Phase Track -->
                <line x1="1022" y1="470" x2="1022" y2="1410" stroke="${silver}" stroke-width="1" opacity="0.35" />
                ${phaseTrack}

                <!-- Star Dust -->
                ${twinkle(300, moonY - 60, 0.9, glow)}
                ${twinkle(960, 300, 1.2, silver)}
                ${twinkle(70, 1250, 0.8, silver)}
                ${twinkle(120, bottomY, 1.4, glow)}
                ${twinkle(960, bottomY + 30, 1, silver)}
                <g fill="${silver}">
                    <circle cx="250" cy="${moonY + 190}" r="2.5" opacity="0.8" />
                    <circle cx="880" cy="220" r="2" opacity="0.7" />
                    <circle cx="1000" cy="420" r="2.5" opacity="0.8" />
                    <circle cx="56" cy="1460" r="2" opacity="0.7" />
                    <circle cx="200" cy="${bottomY + 70}" r="2.5" opacity="0.8" />
                    <circle cx="900" cy="${bottomY - 40}" r="2" opacity="0.7" />
                    <circle cx="1040" cy="1520" r="2" opacity="0.6" />
                </g>
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
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const topY = hasAttribution ? 148 : 80;
            const bottomY = hasScoreboard ? 1730 : 1820;

            const sparkle = (scale: number) => `
                <g transform="scale(${scale})">
                    <polygon points="0,-48 10,-12 48,0 10,12 0,48 -10,12 -48,0 -10,-12" fill="${gold}" />
                    <polygon points="0,-26 5,-7 26,0 5,7 0,26 -5,7 -26,0 -5,-7" fill="#ffffff" />
                    <circle cx="28" cy="-28" r="3" fill="${light}" />
                    <circle cx="-28" cy="28" r="2.5" fill="${gold}" />
                </g>
            `;

            return `
                <!-- 4 Symmetrical Glamour Sparkles -->
                <g transform="translate(90, ${topY})">
                    ${sparkle(0.85)}
                </g>
                <g transform="translate(990, ${topY})">
                    ${sparkle(0.85)}
                </g>
                <g transform="translate(90, ${bottomY})">
                    ${sparkle(0.85)}
                </g>
                <g transform="translate(990, ${bottomY})">
                    ${sparkle(0.85)}
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
            const topY = hasAttribution ? 148 : 90;

            const mirrorBall = `
                <line x1="0" y1="-80" x2="0" y2="-32" stroke="${gold}" stroke-width="2" />
                <circle cx="0" cy="0" r="34" fill="rgba(255,255,255,0.15)" stroke="${gold}" stroke-width="2.5" />
                <ellipse cx="0" cy="0" rx="34" ry="10" stroke="${gold}" stroke-width="1.5" fill="none" opacity="0.6" />
                <ellipse cx="0" cy="0" rx="34" ry="20" stroke="${gold}" stroke-width="1.5" fill="none" opacity="0.6" />
                <line x1="-34" y1="0" x2="34" y2="0" stroke="${gold}" stroke-width="1.5" opacity="0.6" />
                <line x1="0" y1="-34" x2="0" y2="34" stroke="${gold}" stroke-width="1.5" opacity="0.6" />
                <polygon points="0,-52 5,-36 20,-36 8,-26 12,-10 0,-20 -12,-10 -8,-26 -20,-36 -5,-36" fill="${pink}" opacity="0.85" />
            `;

            return `
                <!-- Symmetrical Top Mirror Balls -->
                <g transform="translate(100, ${topY})">
                    ${mirrorBall}
                </g>
                <g transform="translate(980, ${topY})">
                    ${mirrorBall}
                </g>

                <!-- Symmetrical Bottom Disco Neon Floor Curves -->
                <path d="M0,1740 Q180,1740 180,1920" stroke="${pink}" stroke-width="4" fill="none" opacity="0.8" />
                <path d="M0,1760 Q160,1760 160,1920" stroke="${purple}" stroke-width="3" fill="none" opacity="0.7" />
                <path d="M0,1780 Q140,1780 140,1920" stroke="${gold}" stroke-width="2" fill="none" opacity="0.6" />
                <path d="M1080,1740 Q900,1740 900,1920" stroke="${pink}" stroke-width="4" fill="none" opacity="0.8" />
                <path d="M1080,1760 Q920,1760 920,1920" stroke="${purple}" stroke-width="3" fill="none" opacity="0.7" />
                <path d="M1080,1780 Q940,1780 940,1920" stroke="${gold}" stroke-width="2" fill="none" opacity="0.6" />

                <!-- Mid-Flank Disco Sparkles -->
                <g transform="translate(60, 480)">
                    <polygon points="0,-20 4,-5 20,0 4,5 0,20 -4,5 -20,0 -4,-5" fill="${gold}" />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                </g>
                <g transform="translate(1020, 480)">
                    <polygon points="0,-20 4,-5 20,0 4,5 0,20 -4,5 -20,0 -4,-5" fill="${gold}" />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                </g>
                <g transform="translate(60, 1200)">
                    <polygon points="0,-20 4,-5 20,0 4,5 0,20 -4,5 -20,0 -4,-5" fill="${gold}" />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                </g>
                <g transform="translate(1020, 1200)">
                    <polygon points="0,-20 4,-5 20,0 4,5 0,20 -4,5 -20,0 -4,-5" fill="${gold}" />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
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
