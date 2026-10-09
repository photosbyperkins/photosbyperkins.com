import type { StoryFrameDefinition } from '../types';
import { defineLayeredFrame } from './helper';

export const COSMIC_FRAMES: StoryFrameDefinition[] = [
    defineLayeredFrame(
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
            // Mascot placement; the layer pivots (cloud base, horn tip) are derived from it.
            const u = hasScoreboard ? { x: 860, y: 1630, s: 0.92 } : { x: 860, y: 1660, s: 1.05 };
            const unicornTransform = `translate(${u.x}, ${u.y}) scale(${u.s})`;
            const mascot = (inner: string) => `<g transform="${unicornTransform}">${inner}</g>`;
            const dreamCloud = (inner: string) => `<g transform="translate(980, ${topY})">${inner}</g>`;
            const cloudBase = { x: u.x + 124 * u.s, y: u.y + 248 * u.s };

            return {
                layers: [
                    // Top-Left Rainbow Arch and Clouds
                    {
                        id: 'arch',
                        svg: `
                <path d="M-30,220 C100,220 220,100 220,-30" stroke="${c1}" stroke-width="16" fill="none" />
                <path d="M-30,200 C85,200 200,85 200,-30" stroke="${c2}" stroke-width="16" fill="none" />
                <path d="M-30,180 C70,180 180,70 180,-30" stroke="${c3}" stroke-width="16" fill="none" />
                <path d="M-30,160 C55,160 160,55 160,-30" stroke="${c4}" stroke-width="16" fill="none" />`,
                    },
                    {
                        id: 'archCloudTop',
                        svg: `
                <circle cx="190" cy="50" r="26" fill="#ffffff" opacity="0.85" />
                <circle cx="220" cy="65" r="20" fill="#ffffff" opacity="0.85" />`,
                    },
                    { id: 'archCloudLeft', svg: `<circle cx="65" cy="190" r="24" fill="#ffffff" opacity="0.85" />` },

                    // Top-Right Dream Cloud and Magic Starbursts
                    {
                        id: 'dreamCloud',
                        svg: dreamCloud(`
                    <circle cx="10" cy="-10" r="24" fill="#ffffff" opacity="0.85" />
                    <circle cx="-16" cy="6" r="20" fill="#ffffff" opacity="0.85" />
                    <circle cx="28" cy="10" r="18" fill="#ffffff" opacity="0.85" />`),
                    },
                    {
                        id: 'dreamStar',
                        svg: dreamCloud(`
                    <polygon points="0,-35 4,-12 25,0 4,12 0,35 -4,12 -25,0 -4,-12" fill="${c4}" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />`),
                        pivot: { x: 980, y: topY },
                    },

                    // Bottom Unicorn Mascot on Cloud Flank (body, horn-tip sparkles, face + cloud; the body and
                    // face share the cloud-base pivot so they always move as one)
                    {
                        id: 'unicorn',
                        pivot: cloudBase,
                        svg: mascot(`
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
                    <path d="M46,7 L54,28 L62,48" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.8" />`),
                    },
                    {
                        id: 'hornSparkle',
                        pivot: { x: u.x + 46 * u.s, y: u.y + 4 * u.s },
                        svg: mascot(`
                    <polygon points="46,-9 48,2 59,4 48,6 46,17 44,6 33,4 44,2" fill="${c4}" />
                    <polygon points="46,-4 47,2 53,4 47,6 46,12 45,6 39,4 45,2" fill="#ffffff" />
                    <circle cx="46" cy="4" r="2.2" fill="#ffffff" />
                    <polygon points="30,-2 31,3 36,4 31,5 30,10 29,5 24,4 29,3" fill="#ffffff" opacity="0.9" />
                    <polygon points="60,-5 61,-1 65,0 61,1 60,5 59,1 55,0 59,-1" fill="${c3}" opacity="0.85" />`),
                    },
                    {
                        id: 'unicornFace',
                        pivot: cloudBase,
                        svg: mascot(`
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
                    </g>`),
                    },
                ],
            };
        }
    ),
    defineLayeredFrame(
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
            const bottomY = hasScoreboard ? 1730 : 1800;
            const moonTransform = `translate(90, ${bottomY})`;
            const rightAnchorTransform = `translate(980, ${bottomY})`;
            const starburst = (inner: string) => `<g transform="${rightAnchorTransform}">${inner}</g>`;

            return {
                layers: [
                    // Top-Right Ringed Celestial Planet
                    {
                        id: 'planet',
                        pivot: { x: 950, y: topY },
                        svg: `
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
                </g>`,
                    },

                    // Top-Left Streaking Comet and Orbit Rays
                    {
                        id: 'comet',
                        svg: `
                <g opacity="0.95">
                    <line x1="-30" y1="80" x2="200" y2="190" stroke="${p2}" stroke-width="3" opacity="0.85" />
                    <line x1="10" y1="75" x2="195" y2="182" stroke="#ffffff" stroke-width="1.5" opacity="0.9" />
                    <polygon points="200,186 210,190 200,194 194,190" fill="#ffffff" />
                    <circle cx="198" cy="190" r="5" fill="${p2}" opacity="0.6" />
                </g>`,
                    },
                    {
                        id: 'orbit',
                        svg: `
                <path d="M-20,130 A260,260 0 0,1 260,-20" stroke="${p2}" stroke-width="2" stroke-dasharray="10 8" fill="none" opacity="0.6" />`,
                    },

                    // Flank Constellation Points
                    {
                        id: 'starL',
                        pivot: { x: 80, y: 306 },
                        svg: `
                <polygon points="80,290 84,302 96,306 84,310 80,322 76,310 64,306 76,302" fill="#ffffff" opacity="0.9" />`,
                    },
                    {
                        id: 'starR',
                        pivot: { x: 1010, y: 493 },
                        svg: `
                <polygon points="1010,480 1013,490 1023,493 1013,496 1010,506 1007,496 997,493 1007,490" fill="${gold}" opacity="0.85" />`,
                    },
                    {
                        id: 'constellationLine',
                        svg: `
                <polyline points="50,420 75,490 35,570 85,660 50,740" stroke="${p2}" stroke-width="1.8" stroke-dasharray="5 5" fill="none" opacity="0.65" />`,
                    },
                    {
                        id: 'constellationStars',
                        svg: `
                <circle cx="50" cy="420" r="4.5" fill="#ffffff" />
                <circle cx="75" cy="490" r="5" fill="${gold}" />
                <circle cx="35" cy="570" r="4" fill="#ffffff" />
                <circle cx="85" cy="660" r="5" fill="${p1}" />
                <circle cx="50" cy="740" r="4.5" fill="${gold}" />`,
                    },

                    // Bottom-Left Moon and Orbit
                    {
                        id: 'moon',
                        pivot: { x: 90, y: bottomY },
                        svg: `
                <g transform="${moonTransform}">
                    <path d="M-18,-28 A30,30 0 0,0 20,28 A24,24 0 0,1 -18,-28 Z" fill="${gold}" />
                    <ellipse cx="32" cy="6" rx="36" ry="12" stroke="${p2}" stroke-width="1.8" stroke-dasharray="6 4" fill="none" transform="rotate(-15 32 6)" opacity="0.8" />
                    <circle cx="32" cy="6" r="3.5" fill="#ffffff" />
                </g>`,
                    },

                    // Bottom-Right Golden Starburst Flank (the star and its satellite dots twinkle separately)
                    {
                        id: 'burstStar',
                        pivot: { x: 980, y: bottomY },
                        svg: starburst(`
                    <polygon points="0,-18 5,-5 18,0 5,5 0,18 -5,5 -18,0 -5,-5" fill="${gold}" />
                    <circle cx="0" cy="0" r="3" fill="#ffffff" />`),
                    },
                    {
                        id: 'burstDots',
                        svg: starburst(`
                    <circle cx="-24" cy="-14" r="3" fill="${p2}" />
                    <circle cx="-16" cy="18" r="2" fill="${p1}" />`),
                    },
                ],
            };
        }
    ),
    defineLayeredFrame(
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
            // Star-dust sparkle layer, pivoting on its own centre
            const dust = (id: string, x: number, y: number, s: number, col: string) => ({
                id,
                svg: twinkle(x, y, s, col),
                pivot: { x, y },
            });
            const moonAt = (inner: string) => `
                <g transform="translate(40, ${moonY})">${inner}
                </g>`;

            return {
                defs: `
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
                </defs>`,
                layers: [
                    // Top-Left Full Moon (cropped by the edge) with halo and craters
                    {
                        id: 'halo',
                        pivot: { x: 40, y: moonY },
                        svg: moonAt(`
                    <circle cx="0" cy="0" r="250" fill="url(#lunar-halo)" />`),
                    },
                    {
                        id: 'moon',
                        svg: moonAt(`
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
                    <circle cx="0" cy="0" r="150" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2" />`),
                    },

                    // Dashed orbit sweeping from the moon down the left flank
                    {
                        id: 'orbit',
                        svg: `
                <path d="M210,${moonY + 40} C330,${moonY + 360} 120,${moonY + 700} 34,${moonY + 980}" stroke="${silver}" stroke-width="1.5" stroke-dasharray="3 10" stroke-linecap="round" fill="none" opacity="0.7" />
                <circle cx="34" cy="${moonY + 980}" r="5" fill="${glow}" />`,
                    },

                    // Right-Edge Lunar Phase Track (glyphs every 120px, so an 8-step type reveals one per step)
                    {
                        id: 'track',
                        svg: `
                <line x1="1022" y1="470" x2="1022" y2="1410" stroke="${silver}" stroke-width="1" opacity="0.35" />
                ${phaseTrack}`,
                    },

                    // Star Dust
                    dust('dust1', 300, moonY - 60, 0.9, glow),
                    dust('dust2', 960, 300, 1.2, silver),
                    dust('dust3', 70, 1250, 0.8, silver),
                    dust('dust4', 120, bottomY, 1.4, glow),
                    dust('dust5', 960, bottomY + 30, 1, silver),
                    {
                        id: 'dots',
                        svg: `
                <g fill="${silver}">
                    <circle cx="250" cy="${moonY + 190}" r="2.5" opacity="0.8" />
                    <circle cx="880" cy="220" r="2" opacity="0.7" />
                    <circle cx="1000" cy="420" r="2.5" opacity="0.8" />
                    <circle cx="56" cy="1460" r="2" opacity="0.7" />
                    <circle cx="200" cy="${bottomY + 70}" r="2.5" opacity="0.8" />
                    <circle cx="900" cy="${bottomY - 40}" r="2" opacity="0.7" />
                    <circle cx="1040" cy="1520" r="2" opacity="0.6" />
                </g>`,
                    },
                ],
            };
        }
    ),
    defineLayeredFrame(
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
            // One corner sparkle, pivoting on its centre
            const corner = (id: string, x: number, y: number) => ({
                id,
                svg: `
                <g transform="translate(${x}, ${y})">
                    ${sparkle(0.85)}
                </g>`,
                pivot: { x, y },
            });

            return {
                // 4 Symmetrical Glamour Sparkles
                layers: [
                    corner('sparkleTL', 90, topY),
                    corner('sparkleTR', 990, topY),
                    corner('sparkleBL', 90, bottomY),
                    corner('sparkleBR', 990, bottomY),
                ],
            };
        }
    ),
    defineLayeredFrame(
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
                <line x1="0" y1="-34" x2="0" y2="34" stroke="${gold}" stroke-width="1.5" opacity="0.6" />`;
            const discoStar = `<polygon points="0,-52 5,-36 20,-36 8,-26 12,-10 0,-20 -12,-10 -8,-26 -20,-36 -5,-36" fill="${pink}" opacity="0.85" />`;
            const at = (x: number, y: number, inner: string) => `<g transform="translate(${x}, ${y})">${inner}</g>`;
            const sparkle = `
                    <polygon points="0,-20 4,-5 20,0 4,5 0,20 -4,5 -20,0 -4,-5" fill="${gold}" />
                    <circle cx="0" cy="0" r="2.5" fill="#ffffff" />`;

            return {
                layers: [
                    // Symmetrical top mirror balls (each ball's star is drawn right after it)
                    { id: 'ballL', svg: at(100, topY, mirrorBall) },
                    { id: 'discoStarL', svg: at(100, topY, discoStar), pivot: { x: 100, y: topY - 31 } },
                    { id: 'ballR', svg: at(980, topY, mirrorBall) },
                    { id: 'discoStarR', svg: at(980, topY, discoStar), pivot: { x: 980, y: topY - 31 } },
                    // Symmetrical bottom disco neon floor curves
                    {
                        id: 'floorL',
                        svg: `<path d="M0,1740 Q180,1740 180,1920" stroke="${pink}" stroke-width="4" fill="none" opacity="0.8" />
                <path d="M0,1760 Q160,1760 160,1920" stroke="${purple}" stroke-width="3" fill="none" opacity="0.7" />
                <path d="M0,1780 Q140,1780 140,1920" stroke="${gold}" stroke-width="2" fill="none" opacity="0.6" />`,
                    },
                    {
                        id: 'floorR',
                        svg: `<path d="M1080,1740 Q900,1740 900,1920" stroke="${pink}" stroke-width="4" fill="none" opacity="0.8" />
                <path d="M1080,1760 Q920,1760 920,1920" stroke="${purple}" stroke-width="3" fill="none" opacity="0.7" />
                <path d="M1080,1780 Q940,1780 940,1920" stroke="${gold}" stroke-width="2" fill="none" opacity="0.6" />`,
                    },
                    // Mid-flank disco sparkles
                    { id: 'sparkle1', svg: at(60, 480, sparkle) },
                    { id: 'sparkle2', svg: at(1020, 480, sparkle) },
                    { id: 'sparkle3', svg: at(60, 1200, sparkle) },
                    { id: 'sparkle4', svg: at(1020, 1200, sparkle) },
                ],
            };
        }
    ),
    defineLayeredFrame(
        'mystic-tarot',
        'Tarot',
        'cosmic',
        'Gothic tarot card filigree, celestial sunburst corners & crescent medallions',
        ['#eab308', '#fef08a', '#ca8a04'],
        (override) => {
            const gold = override || '#eab308';
            const lightGold = override || '#fef08a';

            // Corner medallion: the disc and its sunburst are separate layers sharing the centre pivot
            const medallion = (corner: string, x: number, y: number) => [
                {
                    id: `disc${corner}`,
                    pivot: { x, y },
                    svg: `
                <g transform="translate(${x}, ${y})">
                    <circle cx="0" cy="0" r="28" fill="rgba(17,17,22,0.85)" stroke="${gold}" stroke-width="2" /></g>`,
                },
                {
                    id: `sun${corner}`,
                    pivot: { x, y },
                    svg: `<g transform="translate(${x}, ${y})">
                    <polygon points="0,-18 4,-5 18,0 4,5 0,18 -4,5 -18,0 -4,-5" fill="${lightGold}" />
                    <circle cx="0" cy="0" r="4" fill="#ffffff" />
                </g>`,
                },
            ];
            const ornament = (id: string, y: number) => ({
                id,
                svg: `
                <g transform="translate(540, ${y})">
                    <polygon points="0,-16 10,0 0,16 -10,0" fill="${gold}" />
                    <line x1="-80" y1="0" x2="-20" y2="0" stroke="${gold}" stroke-width="2" />
                    <line x1="20" y1="0" x2="80" y2="0" stroke="${gold}" stroke-width="2" />
                    <circle cx="-50" cy="0" r="3" fill="${lightGold}" />
                    <circle cx="50" cy="0" r="3" fill="${lightGold}" />
                </g>`,
            });

            return {
                layers: [
                    {
                        id: 'border',
                        svg: `
                <rect x="36" y="36" width="1008" height="1848" rx="14" stroke="${gold}" stroke-width="3" fill="none" />`,
                    },
                    {
                        id: 'borderDash',
                        svg: `
                <rect x="48" y="48" width="984" height="1824" rx="10" stroke="${gold}" stroke-width="1.5" stroke-dasharray="12 8" fill="none" opacity="0.7" />`,
                    },
                    ...medallion('TL', 52, 52),
                    ...medallion('TR', 1028, 52),
                    ...medallion('BL', 52, 1868),
                    ...medallion('BR', 1028, 1868),
                    ornament('ornamentTop', 48),
                    ornament('ornamentBottom', 1872),
                ],
            };
        }
    ),
    defineLayeredFrame(
        'hearts',
        'Hearts',
        'cosmic',
        'Layered candy hearts, outline doodles & tiny sparkles',
        ['#f43f5e', '#f9a8d4', '#fb7185', '#ffffff'],
        (override, context) => {
            const red = override || '#f43f5e';
            const pink = override || '#f9a8d4';
            const rose = override || '#fb7185';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const topY = hasAttribution ? 150 : 100;
            const bottomY = hasScoreboard ? 1700 : 1790;

            // Unit heart roughly 100 wide, centred on (0,0).
            const HEART =
                'M0,38 C-8,30 -50,4 -50,-20 C-50,-40 -34,-50 -20,-50 C-10,-50 -3,-44 0,-36 C3,-44 10,-50 20,-50 C34,-50 50,-40 50,-20 C50,4 8,30 0,38 Z';

            const solid = (x: number, y: number, s: number, rot: number, col: string) => `
                <g transform="translate(${x}, ${y}) rotate(${rot}) scale(${s})">
                    <path d="${HEART}" fill="${col}" />
                    <path d="M-34,-30 C-30,-40 -20,-42 -14,-38" stroke="#ffffff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.7" />
                </g>`;

            const outline = (x: number, y: number, s: number, rot: number, col: string) => `
                <g transform="translate(${x}, ${y}) rotate(${rot}) scale(${s})">
                    <path d="${HEART}" fill="none" stroke="${col}" stroke-width="${(4 / s).toFixed(2)}" />
                </g>`;

            const sparkle = (x: number, y: number, s: number, col: string) => `
                <g transform="translate(${x}, ${y}) scale(${s})">
                    <path d="M0,-12 Q1.5,-1.5 12,0 Q1.5,1.5 0,12 Q-1.5,1.5 -12,0 Q-1.5,-1.5 0,-12 Z" fill="${col}" />
                </g>`;

            const cornerAt = (x: number, y: number, flip: boolean, inner: string) => `
                <g transform="translate(${x}, ${y})${flip ? ' scale(-1, 1)' : ''}">${inner}
                </g>`;
            // Top corner cluster: the big heart (beats), its small hearts and its sparkles, all pivoting on the
            // big heart so the small ones spring out of it
            const corner = (side: string, x: number, y: number, flip: boolean) => [
                { id: `beat${side}`, pivot: { x, y }, svg: cornerAt(x, y, flip, solid(0, 0, 1.25, -14, red)) },
                {
                    id: `hearts${side}`,
                    pivot: { x, y },
                    svg: cornerAt(
                        x,
                        y,
                        flip,
                        solid(92, -38, 0.7, 12, pink) + solid(70, 62, 0.5, -6, rose) + outline(-6, 108, 0.55, 10, pink)
                    ),
                },
                {
                    id: `sparkles${side}`,
                    svg: cornerAt(x, y, flip, sparkle(140, 20, 1, '#ffffff') + sparkle(30, -86, 0.7, pink)),
                },
            ];

            return {
                layers: [
                    // Top Corner Heart Clusters
                    ...corner('TL', 90, topY, false),
                    ...corner('TR', 990, topY, true),

                    // Side Edge Drifting Hearts
                    {
                        id: 'sideL',
                        svg:
                            outline(48, 640, 0.35, -12, rose) +
                            solid(64, 900, 0.28, 8, pink) +
                            outline(40, 1180, 0.3, 14, red),
                    },
                    {
                        id: 'sideR',
                        svg:
                            solid(1030, 760, 0.3, -10, rose) +
                            outline(1040, 1040, 0.35, 6, pink) +
                            solid(1020, 1320, 0.26, -14, red),
                    },
                    { id: 'sideSparkles', svg: sparkle(80, 780, 0.6, '#ffffff') + sparkle(1000, 1180, 0.6, '#ffffff') },

                    // Bottom Corner Hearts
                    {
                        id: 'bottomL',
                        pivot: { x: 110, y: bottomY },
                        svg: solid(110, bottomY, 0.9, 10, rose) + outline(190, bottomY + 60, 0.45, -8, red),
                    },
                    {
                        id: 'bottomR',
                        pivot: { x: 970, y: bottomY },
                        svg: solid(970, bottomY, 0.9, -10, red) + outline(890, bottomY + 60, 0.45, 8, pink),
                    },
                    {
                        id: 'bottomSparkles',
                        svg: sparkle(60, bottomY - 80, 0.8, pink) + sparkle(1020, bottomY - 80, 0.8, pink),
                    },
                ],
            };
        }
    ),
    defineLayeredFrame(
        'rainbows',
        'Rainbows',
        'cosmic',
        'Bold striped rainbow arcs, puffy clouds & sunshine',
        ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6'],
        (override, context) => {
            const bands = override
                ? [override, override, override, override, override, override]
                : ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6'];
            const sun = override || '#facc15';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const topShift = hasAttribution ? 0 : -40;
            const bottomY = hasScoreboard ? 1720 : 1800;

            // Quarter-circle rainbow anchored at a corner point (cx, cy), outer radius R.
            // With an override colour, bands alternate opacity so the stripes stay readable.
            const arc = (cx: number, cy: number, R: number, dirX: 1 | -1, dirY: 1 | -1) => {
                const w = 18;
                return bands
                    .map((col, i) => {
                        const r = R - i * w;
                        const sx = cx + dirX * r;
                        const ey = cy + dirY * r;
                        const sweep = dirX * dirY > 0 ? 0 : 1;
                        const op = override ? (i % 2 === 0 ? 1 : 0.55) : 1;
                        return `<path d="M${sx},${cy} A${r},${r} 0 0,${sweep} ${cx},${ey}" stroke="${col}" stroke-width="${w}" fill="none" opacity="${op}" />`;
                    })
                    .join('');
            };

            const cloud = (x: number, y: number, s: number) => `
                <g transform="translate(${x}, ${y}) scale(${s})" fill="#ffffff">
                    <ellipse cx="0" cy="12" rx="62" ry="24" />
                    <circle cx="-30" cy="0" r="26" />
                    <circle cx="8" cy="-14" r="34" />
                    <circle cx="40" cy="2" r="24" />
                </g>`;

            const rays = Array.from({ length: 10 }, (_, i) => {
                const a = (i * 36 * Math.PI) / 180;
                const x1 = (Math.cos(a) * 40).toFixed(1);
                const y1 = (Math.sin(a) * 40).toFixed(1);
                const x2 = (Math.cos(a) * 56).toFixed(1);
                const y2 = (Math.sin(a) * 56).toFixed(1);
                return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${sun}" stroke-width="6" stroke-linecap="round" />`;
            }).join('');

            const topLeft = (inner: string) => `
                <g transform="translate(0, ${topShift})">
                    ${inner}
                </g>`;
            const sunAt = (inner: string) => `
                <g transform="translate(980, ${150 + topShift})">
                    ${inner}
                </g>`;
            const sunCentre = { x: 980, y: 150 + topShift };

            // Edge-cropped clouds pivot on the canvas edge that crops them, so a pop never exposes the cut.
            return {
                layers: [
                    // Top-Left Corner Rainbow, clouds capping both ends
                    { id: 'arcTL', pivot: { x: -20, y: -20 + topShift }, svg: topLeft(arc(-20, -20, 340, 1, 1)) },
                    { id: 'cloudTLTop', pivot: { x: 255, y: 0 }, svg: topLeft(cloud(255, 20, 0.9)) },
                    { id: 'cloudTLSide', pivot: { x: 0, y: 275 + topShift }, svg: topLeft(cloud(20, 275, 0.85)) },

                    // Top-Right Sunshine
                    { id: 'sunDisc', pivot: sunCentre, svg: sunAt(`<circle cx="0" cy="0" r="32" fill="${sun}" />`) },
                    { id: 'sunRays', pivot: sunCentre, svg: sunAt(rays) },

                    // Bottom-Right Corner Rainbow, clouds capping both ends
                    { id: 'arcBR', pivot: { x: 1100, y: 1940 }, svg: arc(1100, 1940, 340, -1, -1) },
                    { id: 'cloudBRBottom', pivot: { x: 825, y: 1920 }, svg: cloud(825, 1900, 0.9) },
                    { id: 'cloudBRSide', pivot: { x: 1080, y: 1645 }, svg: cloud(1060, 1645, 0.85) },

                    // Bottom-Left Cloud
                    { id: 'cloudBL', svg: cloud(90, bottomY, 0.6) },

                    // Side Edge Mini Clouds
                    { id: 'cloudSideL', svg: cloud(40, 900, 0.45) },
                    { id: 'cloudSideR', svg: cloud(1040, 1150, 0.45) },
                ],
            };
        }
    ),
    defineLayeredFrame(
        'sol',
        'Sol',
        'cosmic',
        'Big smiling sun, warm rays & sunbeam sparkles',
        ['#facc15', '#fb923c', '#f97316', '#fda4af'],
        (override, context) => {
            const yellow = override || '#facc15';
            const orange = override || '#fb923c';
            const deep = override || '#f97316';
            const blush = override || '#fda4af';
            const ink = '#7c2d12';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const sunY = hasAttribution ? 190 : 150;
            const bottomY = hasScoreboard ? 1700 : 1790;

            // 16 rays alternating long/short, in two colours.
            const rays = Array.from({ length: 16 }, (_, i) => {
                const a = (i * 22.5 * Math.PI) / 180;
                const long = i % 2 === 0;
                const r0 = 150;
                const r1 = long ? 235 : 200;
                const hw = long ? 0.11 : 0.09;
                const p = (r: number, da: number) =>
                    `${(Math.cos(a + da) * r).toFixed(1)},${(Math.sin(a + da) * r).toFixed(1)}`;
                return `<polygon points="${p(r0, -hw)} ${p(r1, 0)} ${p(r0, hw)}" fill="${long ? orange : yellow}" />`;
            }).join('');

            // Mini sun = ray ring (spins: 8 rays, 45° symmetric) + smiling face, sharing the centre pivot
            const miniAt = (x: number, y: number, s: number, inner: string) => `
                <g transform="translate(${x}, ${y}) scale(${s})">
                    ${inner}
                </g>`;
            const miniRays = Array.from({ length: 8 }, (_, i) => {
                const a = (i * 45 * Math.PI) / 180;
                return `<line x1="${(Math.cos(a) * 26).toFixed(1)}" y1="${(Math.sin(a) * 26).toFixed(1)}" x2="${(Math.cos(a) * 38).toFixed(1)}" y2="${(Math.sin(a) * 38).toFixed(1)}" stroke="${orange}" stroke-width="5" stroke-linecap="round" />`;
            }).join('');
            const miniFace = `
                    <circle cx="0" cy="0" r="20" fill="${yellow}" />
                    <path d="M-8,4 Q0,11 8,4" stroke="${ink}" stroke-width="2.5" stroke-linecap="round" fill="none" />`;
            const miniSun = (side: string, x: number, y: number, s: number) => [
                { id: `miniRays${side}`, pivot: { x, y }, svg: miniAt(x, y, s, miniRays) },
                { id: `miniFace${side}`, pivot: { x, y }, svg: miniAt(x, y, s, miniFace) },
            ];

            const sparkle = (x: number, y: number, s: number, col: string) => `
                <g transform="translate(${x}, ${y}) scale(${s})">
                    <path d="M0,-14 Q1.5,-1.5 14,0 Q1.5,1.5 0,14 Q-1.5,1.5 -14,0 Q-1.5,-1.5 0,-14 Z" fill="${col}" />
                </g>`;
            // Sparkle layer, pivoting on its own centre
            const spark = (id: string, x: number, y: number, s: number, col: string) => ({
                id,
                svg: sparkle(x, y, s, col),
                pivot: { x, y },
            });
            const sunAt = (inner: string) => `
                <g transform="translate(930, ${sunY})">${inner}
                </g>`;
            const sunCentre = { x: 930, y: sunY };

            return {
                defs: `
                <defs>
                    <radialGradient id="sol-face" cx="0.4" cy="0.35" r="0.7">
                        <stop offset="0" stop-color="#fef9c3" />
                        <stop offset="0.6" stop-color="${yellow}" />
                        <stop offset="1" stop-color="${orange}" />
                    </radialGradient>
                    <radialGradient id="sol-glow" cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0.5" stop-color="${yellow}" stop-opacity="0.35" />
                        <stop offset="1" stop-color="${yellow}" stop-opacity="0" />
                    </radialGradient>
                </defs>`,
                layers: [
                    // Top-Right Smiling Sun (slightly cropped by the corner: glow and rays only ever grow or
                    // reveal in place, never shrink or rotate, so the cut edge stays off-canvas)
                    {
                        id: 'glow',
                        pivot: sunCentre,
                        svg: sunAt(`
                    <circle cx="0" cy="0" r="300" fill="url(#sol-glow)" />`),
                    },
                    {
                        id: 'rays',
                        pivot: sunCentre,
                        svg: sunAt(`
                    <g transform="rotate(8)">${rays}</g>`),
                    },
                    {
                        id: 'face',
                        pivot: sunCentre,
                        svg: sunAt(`
                    <circle cx="0" cy="0" r="140" fill="url(#sol-face)" stroke="${deep}" stroke-width="5" />
                    <!-- Happy closed eyes -->
                    <path d="M-62,-20 Q-44,-42 -26,-20" stroke="${ink}" stroke-width="9" stroke-linecap="round" fill="none" />
                    <path d="M26,-20 Q44,-42 62,-20" stroke="${ink}" stroke-width="9" stroke-linecap="round" fill="none" />
                    <!-- Rosy cheeks -->
                    <ellipse cx="-78" cy="26" rx="24" ry="15" fill="${blush}" opacity="0.75" />
                    <ellipse cx="78" cy="26" rx="24" ry="15" fill="${blush}" opacity="0.75" />
                    <!-- Big smile -->
                    <path d="M-50,30 Q0,92 50,30 Q0,58 -50,30 Z" fill="${ink}" />
                    <path d="M-22,58 Q0,70 22,58 Q0,64 -22,58 Z" fill="#fb7185" />
                    <!-- Face shine -->
                    <path d="M-92,-70 Q-70,-104 -30,-112" stroke="#ffffff" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.6" />`),
                    },

                    // Side edge sparkles and light dots
                    spark('spark1', 60, 560, 0.9, yellow),
                    spark('spark2', 44, 960, 0.6, orange),
                    spark('spark3', 64, 1320, 0.8, yellow),
                    spark('spark4', 1024, 820, 0.7, orange),
                    spark('spark5', 1036, 1180, 0.9, yellow),
                    {
                        id: 'dots',
                        svg: `
                <g fill="${yellow}">
                    <circle cx="38" cy="760" r="4" opacity="0.8" />
                    <circle cx="70" cy="1140" r="3" opacity="0.7" />
                    <circle cx="1046" cy="1000" r="4" opacity="0.8" />
                    <circle cx="1020" cy="1420" r="3" opacity="0.7" />
                </g>`,
                    },

                    // Top-left sparkle and bottom mini suns
                    spark('sparkTL', 90, hasAttribution ? 170 : 110, 1.4, yellow),
                    spark('sparkTL2', 170, hasAttribution ? 250 : 190, 0.8, orange),
                    ...miniSun('L', 110, bottomY, 1.3),
                    ...miniSun('R', 970, bottomY, 1),
                    spark('sparkBL', 200, bottomY + 70, 0.9, yellow),
                    spark('sparkBR', 880, bottomY - 60, 0.9, orange),
                ],
            };
        }
    ),
];
