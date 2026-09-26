import React from 'react';
import type { StoryFrameDefinition, StoryFrameId } from './types';
import { SAC_BEAR_PATHS } from './sacBearData';

// Helper to wrap inner SVG content in a standard 1080x1920 SVG container
function createSvgString(inner: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920" fill="none">${inner}</svg>`;
}

export const STORY_FRAME_DEFINITIONS: StoryFrameDefinition[] = [
    {
        id: 'none',
        label: 'None',
        vibe: 'Clean, borderless photo export',
        signaturePalette: ['transparent'],
        renderSvg: () => null,
        getSvgString: () => createSvgString(''),
    },
    {
        id: 'sac-bear',
        label: 'Capital Grizzly',
        vibe: 'SRD California Republic heritage & golden pride',
        signaturePalette: ['#f59e0b', '#e60000', '#1e3a8a'],
        renderSvg: (override, context) => {
            const primary = override || '#f59e0b';
            const accent = override || '#e60000';
            const highlight = override || '#fbbf24';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const bearTransform = hasScoreboard
                ? 'translate(750, 1510) scale(0.70) translate(-200, -180)'
                : 'translate(660, 1680) scale(0.80) translate(-200, -180)';

            return (
                <g className="story-frame-sac-bear">
                    {/* Top-left Lone Star */}
                    <polygon
                        points="90,70 102,106 140,106 110,128 121,164 90,142 59,164 70,128 40,106 78,106"
                        fill={accent}
                    />
                    {/* California racing edge lines */}
                    {hasAttribution ? (
                        <>
                            <line x1="140" y1="117" x2="250" y2="117" stroke={primary} strokeWidth="4" strokeDasharray="16 8" />
                            <line x1="830" y1="117" x2="940" y2="117" stroke={primary} strokeWidth="4" strokeDasharray="16 8" />
                        </>
                    ) : (
                        <line x1="140" y1="117" x2="940" y2="117" stroke={primary} strokeWidth="4" strokeDasharray="16 8" />
                    )}

                    {hasScoreboard ? (
                        <>
                            <line x1="40" y1="1870" x2="200" y2="1870" stroke={accent} strokeWidth="6" />
                            <line x1="40" y1="1882" x2="200" y2="1882" stroke={primary} strokeWidth="3" />
                        </>
                    ) : (
                        <>
                            <line x1="60" y1="1850" x2="650" y2="1850" stroke={accent} strokeWidth="6" />
                            <line x1="60" y1="1862" x2="650" y2="1862" stroke={primary} strokeWidth="3" />
                        </>
                    )}

                    {/* Official California Republic Grizzly Bear */}
                    <g transform={bearTransform}>
                        {SAC_BEAR_PATHS.map((p, idx) => (
                            <path
                                key={idx}
                                d={p.d}
                                fill={p.type === 'accent' ? accent : p.type === 'highlight' ? highlight : primary}
                            />
                        ))}
                    </g>
                    {/* Corner athletic ticks */}
                    <path d="M40,240 L40,160 L120,160" stroke={primary} strokeWidth="4" fill="none" />
                    <path d="M1040,240 L1040,160 L960,160" stroke={primary} strokeWidth="4" fill="none" />
                    <path d="M40,1680 L40,1760 L120,1760" stroke={primary} strokeWidth="4" fill="none" />
                    <path d="M1040,1680 L1040,1760 L960,1760" stroke={primary} strokeWidth="4" fill="none" />
                </g>
            );
        },
        getSvgString: (override, context) => {
            const primary = override || '#f59e0b';
            const accent = override || '#e60000';
            const highlight = override || '#fbbf24';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const bearTransform = hasScoreboard
                ? 'translate(750, 1510) scale(0.70) translate(-200, -180)'
                : 'translate(660, 1680) scale(0.80) translate(-200, -180)';

            const topLines = hasAttribution
                ? `<line x1="140" y1="117" x2="250" y2="117" stroke="${primary}" stroke-width="4" stroke-dasharray="16 8" />
                   <line x1="830" y1="117" x2="940" y2="117" stroke="${primary}" stroke-width="4" stroke-dasharray="16 8" />`
                : `<line x1="140" y1="117" x2="940" y2="117" stroke="${primary}" stroke-width="4" stroke-dasharray="16 8" />`;

            const bottomLines = hasScoreboard
                ? `<line x1="40" y1="1870" x2="200" y2="1870" stroke="${accent}" stroke-width="6" />
                   <line x1="40" y1="1882" x2="200" y2="1882" stroke="${primary}" stroke-width="3" />`
                : `<line x1="60" y1="1850" x2="650" y2="1850" stroke="${accent}" stroke-width="6" />
                   <line x1="60" y1="1862" x2="650" y2="1862" stroke="${primary}" stroke-width="3" />`;

            const bearPathsSvg = SAC_BEAR_PATHS.map((p) => {
                const col = p.type === 'accent' ? accent : p.type === 'highlight' ? highlight : primary;
                return `<path d="${p.d}" fill="${col}" />`;
            }).join('');

            return createSvgString(`
                <polygon points="90,70 102,106 140,106 110,128 121,164 90,142 59,164 70,128 40,106 78,106" fill="${accent}" />
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
    {
        id: 'derby-quads',
        label: 'Derby Quads',
        vibe: 'Quad roller skates, speed track lines & jammer star',
        signaturePalette: ['#f97316', '#dc2626', '#ffffff'],
        renderSvg: (override, context) => {
            const primary = override || '#f97316';
            const accent = override || '#dc2626';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const skateTransform = hasScoreboard ? 'translate(50, 1530) scale(1.35)' : 'translate(60, 1720) scale(1.5)';
            const flagTransform = hasScoreboard ? 'translate(920, 160)' : 'translate(860, 1800)';

            return (
                <g className="story-frame-derby-quads">
                    {/* Top right Jammer Star */}
                    <polygon
                        points="980,80 990,110 1022,110 996,128 1006,158 980,140 954,158 964,128 938,110 970,110"
                        fill={primary}
                    />
                    {/* Lateral Track Apex Hash Marks */}
                    {[300, 450, 600, 750, 900, 1050, 1200, 1350, 1500].map((y) => (
                        <React.Fragment key={y}>
                            <line x1="30" y1={y} x2="60" y2={y - 15} stroke={primary} strokeWidth="4" />
                            <line x1="1050" y1={y} x2="1020" y2={y - 15} stroke={primary} strokeWidth="4" />
                        </React.Fragment>
                    ))}
                    {/* Quad Roller Skate Silhouette */}
                    <g transform={skateTransform}>
                        {/* High-top Boot */}
                        <path
                            d="M20,60 L20,10 C20,8 24,6 30,6 L45,10 L50,30 L75,38 C80,40 85,50 85,60 Z"
                            fill={accent}
                        />
                        {/* Skate Plate */}
                        <rect x="18" y="60" width="70" height="6" rx="2" fill="#e2e8f0" />
                        {/* Front & Back Wheels */}
                        <circle cx="32" cy="74" r="11" fill={primary} stroke="#ffffff" strokeWidth="2" />
                        <circle cx="32" cy="74" r="4" fill="#334155" />
                        <circle cx="74" cy="74" r="11" fill={primary} stroke="#ffffff" strokeWidth="2" />
                        <circle cx="74" cy="74" r="4" fill="#334155" />
                        {/* Toe Stop */}
                        <path d="M85,63 L92,67 L88,73 L82,68 Z" fill="#64748b" />
                    </g>
                    {/* Checkered flag strip */}
                    <g transform={flagTransform}>
                        <rect x="0" y="0" width="30" height="20" fill={primary} />
                        <rect x="30" y="0" width="30" height="20" fill="#ffffff" />
                        <rect x="60" y="0" width="30" height="20" fill={primary} />
                        <rect x="90" y="0" width="30" height="20" fill="#ffffff" />
                        <rect x="0" y="20" width="30" height="20" fill="#ffffff" />
                        <rect x="30" y="20" width="30" height="20" fill={primary} />
                        <rect x="60" y="20" width="30" height="20" fill="#ffffff" />
                        <rect x="90" y="20" width="30" height="20" fill={primary} />
                    </g>
                </g>
            );
        },
        getSvgString: (override, context) => {
            const primary = override || '#f97316';
            const accent = override || '#dc2626';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const skateTransform = hasScoreboard ? 'translate(50, 1530) scale(1.35)' : 'translate(60, 1720) scale(1.5)';
            const flagTransform = hasScoreboard ? 'translate(920, 160)' : 'translate(860, 1800)';

            const hashes = [300, 450, 600, 750, 900, 1050, 1200, 1350, 1500]
                .map(
                    (y) => `
                <line x1="30" y1="${y}" x2="60" y2="${y - 15}" stroke="${primary}" stroke-width="4" />
                <line x1="1050" y1="${y}" x2="1020" y2="${y - 15}" stroke="${primary}" stroke-width="4" />`
                )
                .join('');
            return createSvgString(`
                <polygon points="980,80 990,110 1022,110 996,128 1006,158 980,140 954,158 964,128 938,110 970,110" fill="${primary}" />
                ${hashes}
                <g transform="${skateTransform}">
                    <path d="M20,60 L20,10 C20,8 24,6 30,6 L45,10 L50,30 L75,38 C80,40 85,50 85,60 Z" fill="${accent}" />
                    <rect x="18" y="60" width="70" height="6" rx="2" fill="#e2e8f0" />
                    <circle cx="32" cy="74" r="11" fill="${primary}" stroke="#ffffff" stroke-width="2" />
                    <circle cx="32" cy="74" r="4" fill="#334155" />
                    <circle cx="74" cy="74" r="11" fill="${primary}" stroke="#ffffff" strokeWidth="2" />
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
            `);
        },
    },
    {
        id: 'claw-marks',
        label: 'Beast Claws',
        vibe: 'High-impact razor claw slashes & glowing embers',
        signaturePalette: ['#ef4444', '#ea580c', '#f59e0b'],
        renderSvg: (override, context) => {
            const primary = override || '#ef4444';
            const accent = override || '#ea580c';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const bottomTransform = hasScoreboard
                ? 'translate(120, 1560) rotate(195)'
                : 'translate(150, 1660) rotate(195)';

            return (
                <g className="story-frame-claw-marks">
                    {/* Top-Right Triple Claw Slash */}
                    <g transform="translate(850, 40) rotate(15)">
                        <path d="M0,0 Q60,120 120,260 Q105,240 100,180 Q60,90 0,0 Z" fill={primary} opacity="0.95" />
                        <path d="M-50,30 Q10,150 70,290 Q55,270 50,210 Q10,120 -50,30 Z" fill={accent} opacity="0.9" />
                        <path
                            d="M-100,60 Q-40,180 20,320 Q5,300 0,240 Q-40,150 -100,60 Z"
                            fill={primary}
                            opacity="0.85"
                        />
                        {/* Glowing Ember Dots */}
                        <circle cx="40" cy="200" r="4" fill="#fbbf24" />
                        <circle cx="80" cy="280" r="3" fill="#f59e0b" />
                        <circle cx="-20" cy="260" r="5" fill="#fbbf24" />
                    </g>
                    {/* Bottom-Left Triple Claw Slash */}
                    <g transform={bottomTransform}>
                        <path d="M0,0 Q60,120 120,260 Q105,240 100,180 Q60,90 0,0 Z" fill={primary} opacity="0.95" />
                        <path d="M-50,30 Q10,150 70,290 Q55,270 50,210 Q10,120 -50,30 Z" fill={accent} opacity="0.9" />
                        <path
                            d="M-100,60 Q-40,180 20,320 Q5,300 0,240 Q-40,150 -100,60 Z"
                            fill={primary}
                            opacity="0.85"
                        />
                        <circle cx="40" cy="200" r="4" fill="#fbbf24" />
                        <circle cx="80" cy="280" r="3" fill="#f59e0b" />
                        <circle cx="-20" cy="260" r="5" fill="#fbbf24" />
                    </g>
                </g>
            );
        },
        getSvgString: (override, context) => {
            const primary = override || '#ef4444';
            const accent = override || '#ea580c';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const bottomTransform = hasScoreboard
                ? 'translate(120, 1560) rotate(195)'
                : 'translate(150, 1660) rotate(195)';

            return createSvgString(`
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
            `);
        },
    },
    {
        id: 'unicorns',
        label: 'Rainbow Unicorn',
        vibe: 'Pastel dream arches, cute starbursts & magic horn',
        signaturePalette: ['#f472b6', '#c084fc', '#38bdf8', '#facc15'],
        renderSvg: (override, context) => {
            const c1 = override || '#f472b6'; // pink
            const c2 = override || '#c084fc'; // purple
            const c3 = override || '#38bdf8'; // cyan
            const c4 = override || '#facc15'; // yellow
            const hasScoreboard = context?.hasScoreboard ?? true;
            const unicornTransform = hasScoreboard
                ? 'translate(870, 1520) scale(1.35)'
                : 'translate(860, 1680) scale(1.4)';

            return (
                <g className="story-frame-unicorns">
                    {/* Top-Left Rainbow Arc */}
                    <path d="M-30,220 C100,220 220,100 220,-30" stroke={c1} strokeWidth="16" fill="none" />
                    <path d="M-30,200 C85,200 200,85 200,-30" stroke={c2} strokeWidth="16" fill="none" />
                    <path d="M-30,180 C70,180 180,70 180,-30" stroke={c3} strokeWidth="16" fill="none" />
                    <path d="M-30,160 C55,160 160,55 160,-30" stroke={c4} strokeWidth="16" fill="none" />
                    {/* Clouds */}
                    <circle cx="190" cy="50" r="26" fill="#ffffff" opacity="0.85" />
                    <circle cx="220" cy="65" r="20" fill="#ffffff" opacity="0.85" />
                    <circle cx="65" cy="190" r="24" fill="#ffffff" opacity="0.85" />
                    {/* Sparkle Stars */}
                    <polygon points="980,100 985,115 1000,120 985,125 980,140 975,125 960,120 975,115" fill={c4} />
                    <polygon points="920,160 923,172 935,175 923,178 920,190 917,178 905,175 917,172" fill={c1} />
                    {/* Stylized Unicorn head */}
                    <g transform={unicornTransform}>
                        {/* Spiral Horn */}
                        <polygon points="45,-15 52,18 38,18" fill={c4} />
                        <line x1="42" y1="-5" x2="48" y2="-1" stroke="#ea580c" strokeWidth="1.5" />
                        <line x1="40" y1="5" x2="50" y2="9" stroke="#ea580c" strokeWidth="1.5" />
                        {/* Head & Mane */}
                        <path
                            d="M30,25 C30,15 45,15 55,25 C65,32 75,40 75,60 C65,65 50,65 40,60 C32,55 25,45 25,35 Z"
                            fill="#ffffff"
                        />
                        <path d="M28,22 C18,30 18,50 30,55 C22,45 25,30 35,26 Z" fill={c2} />
                        <path d="M22,35 C12,45 15,62 32,68 C22,58 22,45 28,38 Z" fill={c1} />
                        {/* Eye */}
                        <circle cx="52" cy="35" r="3" fill="#1e1b4b" />
                    </g>
                </g>
            );
        },
        getSvgString: (override, context) => {
            const c1 = override || '#f472b6';
            const c2 = override || '#c084fc';
            const c3 = override || '#38bdf8';
            const c4 = override || '#facc15';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const unicornTransform = hasScoreboard
                ? 'translate(870, 1520) scale(1.35)'
                : 'translate(860, 1680) scale(1.4)';

            return createSvgString(`
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
                    <polygon points="45,-15 52,18 38,18" fill="${c4}" />
                    <line x1="42" y1="-5" x2="48" y2="-1" stroke="#ea580c" stroke-width="1.5" />
                    <line x1="40" y1="5" x2="50" y2="9" stroke="#ea580c" stroke-width="1.5" />
                    <path d="M30,25 C30,15 45,15 55,25 C65,32 75,40 75,60 C65,65 50,65 40,60 C32,55 25,45 25,35 Z" fill="#ffffff" />
                    <path d="M28,22 C18,30 18,50 30,55 C22,45 25,30 35,26 Z" fill="${c2}" />
                    <path d="M22,35 C12,45 15,62 32,68 C22,58 22,45 28,38 Z" fill="${c1}" />
                    <circle cx="52" cy="35" r="3" fill="#1e1b4b" />
                </g>
            `);
        },
    },
    {
        id: 'intergalactic',
        label: 'Deep Space',
        vibe: 'Ringed celestial planets, streaking comets & starfield constellations',
        signaturePalette: ['#8b5cf6', '#06b6d4', '#fbbf24'],
        renderSvg: (override, context) => {
            const p1 = override || '#8b5cf6';
            const p2 = override || '#06b6d4';
            const gold = override || '#fbbf24';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const moonTransform = hasScoreboard ? 'translate(80, 1530)' : 'translate(90, 1750)';
            const rightAnchorTransform = hasScoreboard ? 'translate(970, 1540)' : 'translate(960, 1760)';

            return (
                <g className="story-frame-cosmos">
                    {/* Ringed Saturn Planet at Top-Right with Dual Rings & Atmosphere Bands */}
                    <g transform="translate(930, 130) rotate(-22)">
                        {/* Back Ring Half */}
                        <path d="M-85,0 A85,18 0 0,1 85,0" stroke={p2} strokeWidth="6" fill="none" opacity="0.8" />
                        <path d="M-66,0 A66,13 0 0,1 66,0" stroke={p1} strokeWidth="3.5" fill="none" opacity="0.9" />
                        {/* Planet Sphere */}
                        <circle cx="0" cy="0" r="40" fill={p1} />
                        {/* Atmospheric Latitude Stripes */}
                        <path d="M-38,-12 Q0,-8 38,-12" stroke="#a78bfa" strokeWidth="5" fill="none" opacity="0.8" />
                        <path d="M-40,2 Q0,6 40,2" stroke={p2} strokeWidth="4" fill="none" opacity="0.75" />
                        <path d="M-36,16 Q0,20 36,16" stroke="#c084fc" strokeWidth="4" fill="none" opacity="0.7" />
                        {/* Front Ring Half (Overlaps Planet for 3D Depth) */}
                        <path d="M85,0 A85,18 0 0,1 -85,0" stroke={p2} strokeWidth="6" fill="none" opacity="0.95" />
                        <path d="M66,0 A66,13 0 0,1 -66,0" stroke={p1} strokeWidth="3.5" fill="none" opacity="0.95" />
                        <path d="M78,0 A78,16 0 0,1 -78,0" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.75" />
                        {/* Orbiting Moonlets */}
                        <circle cx="75" cy="-35" r="5" fill={gold} />
                        <circle cx="-65" cy="42" r="3.5" fill={p2} />
                    </g>

                    {/* Streaking Meteor Comet in Top-Left */}
                    <g opacity="0.95">
                        <line x1="-30" y1="80" x2="220" y2="210" stroke={p2} strokeWidth="3" opacity="0.85" />
                        <line x1="10" y1="75" x2="215" y2="202" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
                        <line x1="-50" y1="95" x2="180" y2="218" stroke={p1} strokeWidth="2" opacity="0.6" strokeDasharray="12 8" />
                        <polygon points="220,206 230,210 220,214 214,210" fill="#ffffff" />
                        <circle cx="218" cy="210" r="6" fill={p2} opacity="0.6" />
                        {/* Trailing Comet Dust Particles */}
                        <circle cx="160" cy="175" r="2.5" fill={gold} />
                        <circle cx="100" cy="142" r="2" fill="#ffffff" />
                        <circle cx="40" cy="110" r="1.5" fill={p2} />
                    </g>

                    {/* Nested Planetary Orbit Arcs in Top-Left */}
                    <path
                        d="M-20,130 A260,260 0 0,1 260,-20"
                        stroke={p2}
                        strokeWidth="2"
                        strokeDasharray="10 8"
                        fill="none"
                        opacity="0.65"
                    />
                    <path
                        d="M-20,170 A300,300 0 0,1 300,-20"
                        stroke={p1}
                        strokeWidth="1.5"
                        strokeDasharray="6 6"
                        fill="none"
                        opacity="0.45"
                    />

                    {/* Radiant 4-Point Cosmic Twinkle Stars */}
                    <polygon points="985,280 990,295 1005,300 990,305 985,320 980,305 965,300 980,295" fill={gold} />
                    <circle cx="985" cy="300" r="2.5" fill="#ffffff" />

                    <polygon points="80,290 84,302 96,306 84,310 80,322 76,310 64,306 76,302" fill="#ffffff" opacity="0.9" />
                    <polygon points="1010,480 1013,490 1023,493 1013,496 1010,506 1007,496 997,493 1007,490" fill={gold} opacity="0.85" />
                    <polygon points="50,750 53,760 63,763 53,766 50,776 47,766 37,763 47,760" fill={p2} opacity="0.9" />

                    {/* Constellation Dots & Stellar Lines along Left Border */}
                    <polyline
                        points="50,420 75,490 35,570 85,660 50,740"
                        stroke={p2}
                        strokeWidth="1.8"
                        strokeDasharray="5 5"
                        fill="none"
                        opacity="0.7"
                    />
                    <circle cx="50" cy="420" r="5" fill="#ffffff" />
                    <circle cx="50" cy="420" r="9" fill={p2} opacity="0.3" />
                    <circle cx="75" cy="490" r="6" fill={gold} />
                    <circle cx="75" cy="490" r="10" fill={gold} opacity="0.25" />
                    <circle cx="35" cy="570" r="4.5" fill="#ffffff" />
                    <circle cx="85" cy="660" r="5.5" fill={p1} />
                    <circle cx="85" cy="660" r="9" fill={p1} opacity="0.3" />
                    <circle cx="50" cy="740" r="5" fill={gold} />

                    {/* Micro Stardust Cluster */}
                    <circle cx="950" cy="380" r="2" fill="#ffffff" opacity="0.7" />
                    <circle cx="1025" cy="410" r="2.5" fill={p2} opacity="0.8" />
                    <circle cx="60" cy="350" r="2" fill={gold} opacity="0.75" />
                    <circle cx="1020" cy="630" r="2" fill="#ffffff" opacity="0.6" />

                    {/* Bottom-Left: Crescent Moon, Mini Vortex Ring & Satellite */}
                    <g transform={moonTransform}>
                        <path d="M-20,-32 A36,36 0 0,0 22,32 A28,28 0 0,1 -20,-32 Z" fill={gold} />
                        <circle cx="-2" cy="-4" r="3" fill="#d97706" opacity="0.6" />
                        <circle cx="-8" cy="10" r="2" fill="#d97706" opacity="0.6" />
                        <ellipse cx="38" cy="8" rx="42" ry="14" stroke={p2} strokeWidth="2" strokeDasharray="6 4" fill="none" transform="rotate(-15 38 8)" opacity="0.8" />
                        <circle cx="38" cy="8" r="4" fill="#ffffff" />
                        <circle cx="68" cy="1" r="2.5" fill={p1} />
                        <polygon points="75,28 78,34 84,36 78,38 75,44 72,38 66,36 72,34" fill={gold} />
                    </g>

                    {/* Bottom-Right: Floating Starlight Crystal */}
                    <g transform={rightAnchorTransform}>
                        <polygon points="0,-18 5,-5 18,0 5,5 0,18 -5,5 -18,0 -5,-5" fill={gold} />
                        <circle cx="0" cy="0" r="3" fill="#ffffff" />
                        <circle cx="-24" cy="-14" r="3" fill={p2} />
                        <circle cx="-16" cy="18" r="2" fill={p1} />
                    </g>
                </g>
            );
        },
        getSvgString: (override, context) => {
            const p1 = override || '#8b5cf6';
            const p2 = override || '#06b6d4';
            const gold = override || '#fbbf24';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const moonTransform = hasScoreboard ? 'translate(80, 1530)' : 'translate(90, 1750)';
            const rightAnchorTransform = hasScoreboard ? 'translate(970, 1540)' : 'translate(960, 1760)';

            return createSvgString(`
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
            `);
        },
    },
    {
        id: 'celestial-moon',
        label: 'Celestial Moon',
        vibe: 'Minimalist art-deco crescent moons & gold starlight',
        signaturePalette: ['#facc15', '#e2e8f0'],
        renderSvg: (override, context) => {
            const gold = override || '#facc15';
            const silver = override || '#e2e8f0';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const starburstTransform = hasScoreboard ? 'translate(960, 1590)' : 'translate(980, 1800)';

            return (
                <g className="story-frame-celestial">
                    {/* Top-Left Crescent Moon */}
                    <g transform="translate(80, 80)">
                        <path d="M-20,-35 A40,40 0 0,0 25,35 A30,30 0 0,1 -20,-35 Z" fill={gold} />
                        <line x1="40" y1="-20" x2="40" y2="40" stroke={silver} strokeWidth="1.5" />
                        <polygon points="40,40 37,47 40,54 43,47" fill={gold} />
                    </g>
                    {/* Border Lunar Phase Indicators */}
                    {[450, 750, 1050, 1350].map((y, idx) => (
                        <circle
                            key={y}
                            cx="35"
                            cy={y}
                            r={idx % 2 === 0 ? 5 : 3.5}
                            fill={idx % 2 === 0 ? gold : silver}
                        />
                    ))}
                    {[450, 750, 1050, 1350].map((y, idx) => (
                        <circle
                            key={`r-${y}`}
                            cx="1045"
                            cy={y}
                            r={idx % 2 === 0 ? 3.5 : 5}
                            fill={idx % 2 === 0 ? silver : gold}
                        />
                    ))}
                    {/* Radiant Starburst */}
                    <g transform={starburstTransform}>
                        <polygon points="0,-45 8,-12 45,0 8,12 0,45 -8,12 -45,0 -8,-12" fill={gold} />
                        <polygon points="0,-25 5,-7 25,0 5,7 0,25 -5,7 -25,0 -5,-7" fill="#ffffff" />
                    </g>
                    {/* Delicate Corner Border Frames */}
                    <path d="M30,140 L30,50 L120,50" stroke={gold} strokeWidth="2" fill="none" />
                    <path d="M1050,140 L1050,50 L960,50" stroke={gold} strokeWidth="2" fill="none" />
                    <path d="M30,1780 L30,1870 L120,1870" stroke={gold} strokeWidth="2" fill="none" />
                    <path d="M1050,1780 L1050,1870 L960,1870" stroke={gold} strokeWidth="2" fill="none" />
                </g>
            );
        },
        getSvgString: (override, context) => {
            const gold = override || '#facc15';
            const silver = override || '#e2e8f0';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const starburstTransform = hasScoreboard ? 'translate(960, 1590)' : 'translate(980, 1800)';

            return createSvgString(`
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
            `);
        },
    },
    {
        id: 'synthwave',
        label: '80s Synthwave',
        vibe: '80s retro cyber grid horizon & neon laser triangles',
        signaturePalette: ['#f43f5e', '#06b6d4'],
        renderSvg: (override, context) => {
            const magenta = override || '#f43f5e';
            const cyan = override || '#06b6d4';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const gridY = hasScoreboard ? 1845 : 1810;

            return (
                <g className="story-frame-synthwave">
                    {/* Bottom Perspective Wireframe Grid */}
                    {!hasScoreboard && <line x1="0" y1="1810" x2="1080" y2="1810" stroke={magenta} strokeWidth="2.5" />}
                    <line x1="0" y1="1845" x2="1080" y2="1845" stroke={magenta} strokeWidth="3" />
                    <line x1="0" y1="1875" x2="1080" y2="1875" stroke={magenta} strokeWidth="4" />
                    <line x1="0" y1="1905" x2="1080" y2="1905" stroke={magenta} strokeWidth="6" />
                    {/* Perspective grid spokes radiating from center */}
                    <line x1="540" y1={gridY} x2="80" y2="1920" stroke={cyan} strokeWidth="2.5" />
                    <line x1="540" y1={gridY} x2="260" y2="1920" stroke={cyan} strokeWidth="2.5" />
                    <line x1="540" y1={gridY} x2="440" y2="1920" stroke={cyan} strokeWidth="2" />
                    <line x1="540" y1={gridY} x2="640" y2="1920" stroke={cyan} strokeWidth="2" />
                    <line x1="540" y1={gridY} x2="820" y2="1920" stroke={cyan} strokeWidth="2.5" />
                    <line x1="540" y1={gridY} x2="1000" y2="1920" stroke={cyan} strokeWidth="2.5" />

                    {/* Top-Right Neon Geometric Triangle */}
                    <g transform="translate(980, 80)">
                        <polygon points="0,-30 35,30 -35,30" stroke={magenta} strokeWidth="4" fill="none" />
                        <polygon points="0,-18 22,20 -22,20" stroke={cyan} strokeWidth="2.5" fill="none" />
                    </g>
                    {/* Top-Left Neon Triangle */}
                    <g transform="translate(100, 80)">
                        <polygon points="0,-30 35,30 -35,30" stroke={cyan} strokeWidth="4" fill="none" />
                        <polygon points="0,-18 22,20 -22,20" stroke={magenta} strokeWidth="2.5" fill="none" />
                    </g>
                    {/* Border Neon Laser Pinstripes */}
                    <line
                        x1="20"
                        y1="200"
                        x2="20"
                        y2="1750"
                        stroke={cyan}
                        strokeWidth="2"
                        strokeDasharray="40 20"
                        opacity="0.7"
                    />
                    <line
                        x1="1060"
                        y1="200"
                        x2="1060"
                        y2="1750"
                        stroke={magenta}
                        strokeWidth="2"
                        strokeDasharray="40 20"
                        opacity="0.7"
                    />
                </g>
            );
        },
        getSvgString: (override, context) => {
            const magenta = override || '#f43f5e';
            const cyan = override || '#06b6d4';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const gridY = hasScoreboard ? 1845 : 1810;
            const extraLine = !hasScoreboard
                ? `<line x1="0" y1="1810" x2="1080" y2="1810" stroke="${magenta}" stroke-width="2.5" />`
                : '';

            return createSvgString(`
                ${extraLine}
                <line x1="0" y1="1845" x2="1080" y2="1845" stroke="${magenta}" stroke-width="3" />
                <line x1="0" y1="1875" x2="1080" y2="1875" stroke="${magenta}" stroke-width="4" />
                <line x1="0" y1="1905" x2="1080" y2="1905" stroke="${magenta}" stroke-width="6" />
                <line x1="540" y1="${gridY}" x2="80" y2="1920" stroke="${cyan}" stroke-width="2.5" />
                <line x1="540" y1="${gridY}" x2="260" y2="1920" stroke="${cyan}" stroke-width="2.5" />
                <line x1="540" y1="${gridY}" x2="440" y2="1920" stroke="${cyan}" stroke-width="2" />
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
            `);
        },
    },
    {
        id: 'film-strip',
        label: '35mm Film',
        vibe: 'Classic analog negative perforated sprockets & frame markers',
        signaturePalette: ['#f8fafc', '#0f172a'],
        renderSvg: (override) => {
            const sprocketColor = override || '#f8fafc';
            // Evenly spaced vertical film sprockets
            const sprockets = [];
            for (let y = 140; y <= 1780; y += 80) {
                sprockets.push(y);
            }
            return (
                <g className="story-frame-film">
                    {/* Left & Right dark film edge borders */}
                    <rect x="0" y="0" width="56" height="1920" fill="rgba(15, 23, 42, 0.65)" />
                    <rect x="1024" y="0" width="56" height="1920" fill="rgba(15, 23, 42, 0.65)" />
                    {/* Sprocket holes */}
                    {sprockets.map((y) => (
                        <React.Fragment key={y}>
                            <rect x="14" y={y} width="28" height="42" rx="6" fill={sprocketColor} opacity="0.9" />
                            <rect x="1038" y={y} width="28" height="42" rx="6" fill={sprocketColor} opacity="0.9" />
                        </React.Fragment>
                    ))}
                    {/* Film Counter Text */}
                    <text
                        x="72"
                        y="500"
                        fill={sprocketColor}
                        fontFamily="monospace"
                        fontSize="20"
                        transform="rotate(-90 72 500)"
                        opacity="0.8"
                    >
                        KODAK 400 • 36
                    </text>
                    <text
                        x="72"
                        y="1400"
                        fill={sprocketColor}
                        fontFamily="monospace"
                        fontSize="20"
                        transform="rotate(-90 72 1400)"
                        opacity="0.8"
                    >
                        36A ►
                    </text>
                </g>
            );
        },
        getSvgString: (override) => {
            const sprocketColor = override || '#f8fafc';
            const holes: string[] = [];
            for (let y = 140; y <= 1780; y += 80) {
                holes.push(`
                    <rect x="14" y="${y}" width="28" height="42" rx="6" fill="${sprocketColor}" opacity="0.9" />
                    <rect x="1038" y="${y}" width="28" height="42" rx="6" fill="${sprocketColor}" opacity="0.9" />
                `);
            }
            return createSvgString(`
                <rect x="0" y="0" width="56" height="1920" fill="rgba(15, 23, 42, 0.65)" />
                <rect x="1024" y="0" width="56" height="1920" fill="rgba(15, 23, 42, 0.65)" />
                ${holes.join('')}
                <text x="72" y="500" fill="${sprocketColor}" font-family="monospace" font-size="20" transform="rotate(-90 72 500)" opacity="0.8">KODAK 400 • 36</text>
                <text x="72" y="1400" fill="${sprocketColor}" font-family="monospace" font-size="20" transform="rotate(-90 72 1400)" opacity="0.8">36A ►</text>
            `);
        },
    },
    {
        id: 'cyber-hud',
        label: 'Cyber HUD',
        vibe: 'High-tech tactical viewfinder, [REC] indicator & telemetry',
        signaturePalette: ['#06b6d4', '#ef4444', '#ffffff'],
        renderSvg: (override, context) => {
            const primary = override || '#06b6d4';
            const recRed = override || '#ef4444';
            const textCol = override || '#ffffff';
            const hasAttribution = context?.hasAttribution ?? true;
            const telemetryX = hasAttribution ? '1040' : '1020';

            return (
                <g className="story-frame-hud">
                    {/* Viewfinder Corner Brackets */}
                    {/* Top-Left */}
                    <path d="M40,120 L40,40 L120,40" stroke={primary} strokeWidth="5" fill="none" />
                    {/* Top-Right */}
                    <path d="M1040,120 L1040,40 L960,40" stroke={primary} strokeWidth="5" fill="none" />
                    {/* Bottom-Left */}
                    <path d="M40,1800 L40,1880 L120,1880" stroke={primary} strokeWidth="5" fill="none" />
                    {/* Bottom-Right */}
                    <path d="M1040,1800 L1040,1880 L960,1880" stroke={primary} strokeWidth="5" fill="none" />

                    {/* [REC] 🔴 Telemetry indicator */}
                    <g transform="translate(60, 80)">
                        <circle cx="10" cy="10" r="7" fill={recRed} />
                        <text x="26" y="16" fill={textCol} fontFamily="monospace" fontSize="22" fontWeight="bold">
                            REC 4K
                        </text>
                    </g>
                    {/* Crosshair ticks at lateral centers */}
                    <line x1="20" y1="960" x2="50" y2="960" stroke={primary} strokeWidth="3" />
                    <line x1="35" y1="945" x2="35" y2="975" stroke={primary} strokeWidth="2" />
                    <line x1="1060" y1="960" x2="1030" y2="960" stroke={primary} strokeWidth="3" />
                    <line x1="1045" y1="945" x2="1045" y2="975" stroke={primary} strokeWidth="2" />

                    {/* Top-Right Telemetry Data */}
                    <text
                        x={telemetryX}
                        y="95"
                        fill={primary}
                        fontFamily="monospace"
                        fontSize="18"
                        textAnchor="end"
                        opacity="0.9"
                    >
                        60 FPS • RAW
                    </text>
                </g>
            );
        },
        getSvgString: (override, context) => {
            const primary = override || '#06b6d4';
            const recRed = override || '#ef4444';
            const textCol = override || '#ffffff';
            const hasAttribution = context?.hasAttribution ?? true;
            const telemetryX = hasAttribution ? '1040' : '1020';

            return createSvgString(`
                <path d="M40,120 L40,40 L120,40" stroke="${primary}" stroke-width="5" fill="none" />
                <path d="M1040,120 L1040,40 L960,40" stroke="${primary}" stroke-width="5" fill="none" />
                <path d="M40,1800 L40,1880 L120,1880" stroke="${primary}" stroke-width="5" fill="none" />
                <path d="M1040,1800 L1040,1880 L960,1880" stroke="${primary}" stroke-width="5" fill="none" />
                <g transform="translate(60, 80)">
                    <circle cx="10" cy="10" r="7" fill="${recRed}" />
                    <text x="26" y="16" fill="${textCol}" font-family="monospace" font-size="22" font-weight="bold">REC 4K</text>
                </g>
                <line x1="20" y1="960" x2="50" y2="960" stroke="${primary}" stroke-width="3" />
                <line x1="35" y1="945" x2="35" y2="975" stroke="${primary}" stroke-width="2" />
                <line x1="1060" y1="960" x2="1030" y2="960" stroke="${primary}" stroke-width="3" />
                <line x1="1045" y1="945" x2="1045" y2="975" stroke="${primary}" stroke-width="2" />
                <text x="${telemetryX}" y="95" fill="${primary}" font-family="monospace" font-size="18" text-anchor="end" opacity="0.9">60 FPS • RAW</text>
            `);
        },
    },
    {
        id: 'golden-sparkle',
        label: 'Golden Hour',
        vibe: 'Glamour diamond sparkles, lens flares & champagne glow',
        signaturePalette: ['#fef08a', '#fbbf24', '#ffffff'],
        renderSvg: (override, context) => {
            const gold = override || '#fbbf24';
            const light = override || '#fef08a';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const flareTransform = hasScoreboard ? 'translate(90, 1590)' : 'translate(100, 1820)';
            const starTransform = hasScoreboard ? 'translate(980, 1600)' : 'translate(990, 1830)';

            return (
                <g className="story-frame-sparkle">
                    {/* Top-Right Multi-Point Flare */}
                    <g transform="translate(980, 80)">
                        <polygon points="0,-60 12,-16 60,0 12,16 0,60 -12,16 -60,0 -12,-16" fill={gold} />
                        <polygon points="0,-35 7,-9 35,0 7,9 0,35 -7,9 -35,0 -7,-9" fill="#ffffff" />
                        <circle cx="-50" cy="50" r="4" fill={light} />
                        <circle cx="30" cy="80" r="3" fill={gold} />
                    </g>
                    {/* Top-Left Cluster */}
                    <g transform="translate(90, 80)">
                        <polygon points="0,-40 8,-10 40,0 8,10 0,40 -8,10 -40,0 -8,-10" fill={light} />
                        <circle cx="30" cy="-20" r="3" fill="#ffffff" />
                        <circle cx="-25" cy="30" r="5" fill={gold} />
                    </g>
                    {/* Bottom-Left Multi-Point Flare */}
                    <g transform={flareTransform}>
                        <polygon points="0,-55 11,-15 55,0 11,15 0,55 -11,15 -55,0 -11,-15" fill={gold} />
                        <polygon points="0,-30 6,-8 30,0 6,8 0,30 -6,8 -30,0 -6,-8" fill="#ffffff" />
                        <circle cx="45" cy="-40" r="4" fill={light} />
                    </g>
                    {/* Bottom-Right Small Star */}
                    <g transform={starTransform}>
                        <polygon points="0,-30 6,-8 30,0 6,8 0,30 -6,8 -30,0 -6,-8" fill={light} />
                    </g>
                </g>
            );
        },
        getSvgString: (override, context) => {
            const gold = override || '#fbbf24';
            const light = override || '#fef08a';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const flareTransform = hasScoreboard ? 'translate(90, 1590)' : 'translate(100, 1820)';
            const starTransform = hasScoreboard ? 'translate(980, 1600)' : 'translate(990, 1830)';

            return createSvgString(`
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
            `);
        },
    },
    {
        id: 'pop-art',
        label: 'Pop Art',
        vibe: 'Comic action halftone dot clusters & speed lines',
        signaturePalette: ['#facc15', '#06b6d4', '#ef4444'],
        renderSvg: (override, context) => {
            const yellow = override || '#facc15';
            const cyan = override || '#06b6d4';
            const red = override || '#ef4444';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const halftoneTransform = hasScoreboard ? 'translate(30, 1560)' : 'translate(30, 1760)';

            return (
                <g className="story-frame-popart">
                    {/* Top-Right Halftone Matrix */}
                    <g transform="translate(920, 40)">
                        <circle cx="20" cy="20" r="10" fill={yellow} />
                        <circle cx="55" cy="20" r="14" fill={yellow} />
                        <circle cx="90" cy="20" r="18" fill={red} />
                        <circle cx="20" cy="55" r="7" fill={cyan} />
                        <circle cx="55" cy="55" r="10" fill={yellow} />
                        <circle cx="90" cy="55" r="14" fill={yellow} />
                        <circle cx="20" cy="90" r="4" fill={cyan} />
                        <circle cx="55" cy="90" r="7" fill={cyan} />
                        <circle cx="90" cy="90" r="10" fill={yellow} />
                    </g>
                    {/* Top-Left Action Speed lines */}
                    <line x1="0" y1="0" x2="160" y2="100" stroke={red} strokeWidth="6" />
                    <line x1="0" y1="40" x2="120" y2="120" stroke={yellow} strokeWidth="5" />
                    <line x1="0" y1="80" x2="80" y2="130" stroke={cyan} strokeWidth="4" />

                    {/* Bottom-Left Halftone Matrix */}
                    <g transform={halftoneTransform}>
                        <circle cx="20" cy="90" r="18" fill={red} />
                        <circle cx="55" cy="90" r="14" fill={yellow} />
                        <circle cx="90" cy="90" r="10" fill={yellow} />
                        <circle cx="20" cy="55" r="14" fill={yellow} />
                        <circle cx="55" cy="55" r="10" fill={yellow} />
                        <circle cx="90" cy="55" r="7" fill={cyan} />
                        <circle cx="20" cy="20" r="10" fill={yellow} />
                        <circle cx="55" cy="20" r="7" fill={cyan} />
                        <circle cx="90" cy="20" r="4" fill={cyan} />
                    </g>
                    {/* Bottom-Right Action Speed lines */}
                    {hasScoreboard ? (
                        <>
                            <line x1="1080" y1="1720" x2="920" y2="1620" stroke={red} strokeWidth="6" />
                            <line x1="1080" y1="1680" x2="960" y2="1600" stroke={yellow} strokeWidth="5" />
                        </>
                    ) : (
                        <>
                            <line x1="1080" y1="1920" x2="920" y2="1820" stroke={red} strokeWidth="6" />
                            <line x1="1080" y1="1880" x2="960" y2="1800" stroke={yellow} strokeWidth="5" />
                        </>
                    )}
                </g>
            );
        },
        getSvgString: (override, context) => {
            const yellow = override || '#facc15';
            const cyan = override || '#06b6d4';
            const red = override || '#ef4444';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const halftoneTransform = hasScoreboard ? 'translate(30, 1560)' : 'translate(30, 1760)';
            const speedLines = hasScoreboard
                ? `<line x1="1080" y1="1720" x2="920" y2="1620" stroke="${red}" stroke-width="6" />
                   <line x1="1080" y1="1680" x2="960" y2="1600" stroke="${yellow}" stroke-width="5" />`
                : `<line x1="1080" y1="1920" x2="920" y2="1820" stroke="${red}" stroke-width="6" />
                   <line x1="1080" y1="1880" x2="960" y2="1800" stroke="${yellow}" stroke-width="5" />`;

            return createSvgString(`
                <g transform="translate(920, 40)">
                    <circle cx="20" cy="20" r="10" fill="${yellow}" />
                    <circle cx="55" cy="20" r="14" fill="${yellow}" />
                    <circle cx="90" cy="20" r="18" fill="${red}" />
                    <circle cx="20" cy="55" r="7" fill="${cyan}" />
                    <circle cx="55" cy="55" r="10" fill="${yellow}" />
                    <circle cx="90" cy="55" r="14" fill="${yellow}" />
                    <circle cx="20" cy="90" r="4" fill="${cyan}" />
                    <circle cx="55" cy="90" r="7" fill="${cyan}" />
                    <circle cx="90" cy="90" r="10" fill="${yellow}" />
                </g>
                <line x1="0" y1="0" x2="160" y2="100" stroke="${red}" stroke-width="6" />
                <line x1="0" y1="40" x2="120" y2="120" stroke="${yellow}" stroke-width="5" />
                <line x1="0" y1="80" x2="80" y2="130" stroke="${cyan}" stroke-width="4" />
                <g transform="${halftoneTransform}">
                    <circle cx="20" cy="90" r="18" fill="${red}" />
                    <circle cx="55" cy="90" r="14" fill="${yellow}" />
                    <circle cx="90" cy="90" r="10" fill="${yellow}" />
                    <circle cx="20" cy="55" r="14" fill="${yellow}" />
                    <circle cx="55" cy="55" r="10" fill="${yellow}" />
                    <circle cx="90" cy="55" r="7" fill="${cyan}" />
                    <circle cx="20" cy="20" r="10" fill="${yellow}" />
                    <circle cx="55" cy="20" r="7" fill="${cyan}" />
                    <circle cx="90" cy="20" r="4" fill="${cyan}" />
                </g>
                ${speedLines}
            `);
        },
    },
    {
        id: 'street-flames',
        label: 'Hot Rod Flames',
        vibe: 'Hot rod fire flames rising from lower corners',
        signaturePalette: ['#f59e0b', '#ef4444', '#ffffff'],
        renderSvg: (override, context) => {
            const amber = override || '#f59e0b';
            const red = override || '#ef4444';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const leftTransform = hasScoreboard ? 'translate(0, 1690) scale(0.85, 0.95)' : 'translate(0, 1680)';
            const rightTransform = hasScoreboard
                ? 'translate(1080, 1690) scale(-0.85, 0.95)'
                : 'translate(1080, 1680) scale(-1, 1)';

            return (
                <g className="story-frame-flames">
                    {/* Bottom-Left Flame */}
                    <g transform={leftTransform}>
                        <path
                            d="M0,240 
                               L0,100 
                               C30,90 40,60 50,20 
                               C65,60 85,90 70,120 
                               C90,100 110,60 120,30 
                               C135,80 150,120 135,160 
                               C155,145 170,110 175,80 
                               C185,130 180,180 160,240 Z"
                            fill={red}
                            opacity="0.95"
                        />
                        <path
                            d="M0,240 
                               L0,130 
                               C25,120 35,90 42,60 
                               C52,90 70,120 60,140 
                               C75,130 90,95 100,70 
                               C110,110 125,140 115,180 
                               C130,170 145,140 148,115 
                               C155,155 150,195 135,240 Z"
                            fill={amber}
                        />
                    </g>
                    {/* Bottom-Right Flame (Mirrored) */}
                    <g transform={rightTransform}>
                        <path
                            d="M0,240 
                               L0,100 
                               C30,90 40,60 50,20 
                               C65,60 85,90 70,120 
                               C90,100 110,60 120,30 
                               C135,80 150,120 135,160 
                               C155,145 170,110 175,80 
                               C185,130 180,180 160,240 Z"
                            fill={red}
                            opacity="0.95"
                        />
                        <path
                            d="M0,240 
                               L0,130 
                               C25,120 35,90 42,60 
                               C52,90 70,120 60,140 
                               C75,130 90,95 100,70 
                               C110,110 125,140 115,180 
                               C130,170 145,140 148,115 
                               C155,155 150,195 135,240 Z"
                            fill={amber}
                        />
                    </g>
                </g>
            );
        },
        getSvgString: (override, context) => {
            const amber = override || '#f59e0b';
            const red = override || '#ef4444';
            const hasScoreboard = context?.hasScoreboard ?? true;

            const leftTransform = hasScoreboard ? 'translate(0, 1690) scale(0.85, 0.95)' : 'translate(0, 1680)';
            const rightTransform = hasScoreboard
                ? 'translate(1080, 1690) scale(-0.85, 0.95)'
                : 'translate(1080, 1680) scale(-1, 1)';

            return createSvgString(`
                <g transform="${leftTransform}">
                    <path d="M0,240 L0,100 C30,90 40,60 50,20 C65,60 85,90 70,120 C90,100 110,60 120,30 C135,80 150,120 135,160 C155,145 170,110 175,80 C185,130 180,180 160,240 Z" fill="${red}" opacity="0.95" />
                    <path d="M0,240 L0,130 C25,120 35,90 42,60 C52,90 70,120 60,140 C75,130 90,95 100,70 C110,110 125,140 115,180 C130,170 145,140 148,115 C155,155 150,195 135,240 Z" fill="${amber}" />
                </g>
                <g transform="${rightTransform}">
                    <path d="M0,240 L0,100 C30,90 40,60 50,20 C65,60 85,90 70,120 C90,100 110,60 120,30 C135,80 150,120 135,160 C155,145 170,110 175,80 C185,130 180,180 160,240 Z" fill="${red}" opacity="0.95" />
                    <path d="M0,240 L0,130 C25,120 35,90 42,60 C52,90 70,120 60,140 C75,130 90,95 100,70 C110,110 125,140 115,180 C130,170 145,140 148,115 C155,155 150,195 135,240 Z" fill="${amber}" />
                </g>
            `);
        },
    },
    {
        id: 'electric-lightning',
        label: 'High Voltage',
        vibe: 'High-voltage lightning bolts, kinetic energy arcs & plasma sparks',
        signaturePalette: ['#00f0ff', '#3b82f6', '#facc15'],
        renderSvg: (override, context) => {
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

            return (
                <g className="story-frame-electric-lightning">
                    {/* Top-Left Forked Main Lightning Bolt */}
                    <path
                        d="M40,-20 L95,110 L60,150 L130,280 L85,330 L160,490 L115,550 L180,680"
                        stroke={primary}
                        strokeWidth="8"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.45"
                    />
                    <path
                        d="M40,-20 L95,110 L60,150 L130,280 L85,330 L160,490 L115,550 L180,680"
                        stroke={plasma}
                        strokeWidth="4.5"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <path
                        d="M40,-20 L95,110 L60,150 L130,280 L85,330 L160,490 L115,550 L180,680"
                        stroke="#ffffff"
                        strokeWidth="1.8"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                    />

                    {/* Top-Left Secondary Branch Arcs */}
                    <path
                        d="M95,110 L150,145 L135,185 L180,225"
                        stroke={plasma}
                        strokeWidth="2.5"
                        strokeLinejoin="bevel"
                        fill="none"
                        opacity="0.85"
                    />
                    <path
                        d="M130,280 L195,310 L180,355 L225,395"
                        stroke={primary}
                        strokeWidth="2"
                        strokeLinejoin="bevel"
                        fill="none"
                        opacity="0.8"
                    />

                    {/* Top-Right Forked Main Lightning Bolt */}
                    <path
                        d="M1040,-20 L985,110 L1020,150 L950,280 L995,330 L920,490 L965,550 L900,680"
                        stroke={primary}
                        strokeWidth="8"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.45"
                    />
                    <path
                        d="M1040,-20 L985,110 L1020,150 L950,280 L995,330 L920,490 L965,550 L900,680"
                        stroke={plasma}
                        strokeWidth="4.5"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <path
                        d="M1040,-20 L985,110 L1020,150 L950,280 L995,330 L920,490 L965,550 L900,680"
                        stroke="#ffffff"
                        strokeWidth="1.8"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                    />

                    {/* Top-Right Secondary Branch Arcs */}
                    <path
                        d="M985,110 L930,145 L945,185 L900,225"
                        stroke={plasma}
                        strokeWidth="2.5"
                        strokeLinejoin="bevel"
                        fill="none"
                        opacity="0.85"
                    />
                    <path
                        d="M950,280 L885,310 L900,355 L855,395"
                        stroke={primary}
                        strokeWidth="2"
                        strokeLinejoin="bevel"
                        fill="none"
                        opacity="0.8"
                    />

                    {/* Kinetic Spark Flashes along Upper Margins */}
                    <polygon points="175,130 180,145 195,150 180,155 175,170 170,155 155,150 170,145" fill={spark} />
                    <polygon points="905,130 910,145 925,150 910,155 905,170 900,155 885,150 900,145" fill={spark} />
                    <polygon points="215,380 219,392 231,396 219,400 215,412 211,400 199,396 211,392" fill="#ffffff" />
                    <polygon points="865,380 869,392 881,396 869,400 865,412 861,400 849,396 861,392" fill="#ffffff" />

                    {/* Mid-Flank High-Voltage Arcs */}
                    <path d="M35,820 L65,880 L45,920 L75,990" stroke={primary} strokeWidth="2.5" fill="none" opacity="0.75" />
                    <circle cx="75" cy="990" r="3" fill={spark} />
                    <path d="M1045,820 L1015,880 L1035,920 L1005,990" stroke={primary} strokeWidth="2.5" fill="none" opacity="0.75" />
                    <circle cx="1005" cy="990" r="3" fill={spark} />

                    {/* Bottom-Left Lightning Strike (Context Adaptive) */}
                    <path
                        d={bottomBoltLeft}
                        stroke={primary}
                        strokeWidth="6"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.4"
                    />
                    <path
                        d={bottomBoltLeft}
                        stroke={plasma}
                        strokeWidth="3.5"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <path
                        d={bottomBoltLeft}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                    />

                    {/* Bottom-Right Lightning Strike (Context Adaptive) */}
                    <path
                        d={bottomBoltRight}
                        stroke={primary}
                        strokeWidth="6"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.4"
                    />
                    <path
                        d={bottomBoltRight}
                        stroke={plasma}
                        strokeWidth="3.5"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <path
                        d={bottomBoltRight}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeLinejoin="bevel"
                        strokeLinecap="round"
                        fill="none"
                    />

                    {/* Ground Impact Plasma Bursts */}
                    <g transform={groundSparksLeft}>
                        <circle cx="0" cy="0" r="7" fill={primary} opacity="0.6" />
                        <circle cx="0" cy="0" r="3" fill="#ffffff" />
                        <polygon points="0,-14 3,-4 14,0 3,4 0,14 -3,4 -14,0 -3,-4" fill={spark} />
                        <line x1="-20" y1="0" x2="20" y2="0" stroke={primary} strokeWidth="2" />
                    </g>
                    <g transform={groundSparksRight}>
                        <circle cx="0" cy="0" r="7" fill={primary} opacity="0.6" />
                        <circle cx="0" cy="0" r="3" fill="#ffffff" />
                        <polygon points="0,-14 3,-4 14,0 3,4 0,14 -3,4 -14,0 -3,-4" fill={spark} />
                        <line x1="-20" y1="0" x2="20" y2="0" stroke={primary} strokeWidth="2" />
                    </g>
                </g>
            );
        },
        getSvgString: (override, context) => {
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

            return createSvgString(`
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
            `);
        },
    },
    {
        id: 'through-the-lens',
        label: 'Through the Lens',
        vibe: 'Nikon Z 8 EVF / rear screen telemetry HUD with live photo EXIF',
        signaturePalette: ['#ffffff', '#e60000', '#22c55e'],
        renderSvg: (override, context) => {
            const textColor = override || '#ffffff';
            const hudGreen = override || '#22c55e';
            const subdued = override || 'rgba(255, 255, 255, 0.75)';
            const hudBg = 'rgba(10, 12, 16, 0.72)';
            const borderCol = override ? `${override}40` : 'rgba(255, 255, 255, 0.22)';

            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const shutterSpeedText = context?.exif?.shutterSpeed?.replace(/s$/, '') || '1/3200';
            const apertureText = context?.exif?.aperture
                ? context.exif.aperture.startsWith('f/')
                    ? 'F' + context.exif.aperture.slice(2)
                    : context.exif.aperture.toUpperCase()
                : 'F2.8';
            const isoText = context?.exif?.iso
                ? context.exif.iso.startsWith('ISO')
                    ? context.exif.iso
                    : `ISO ${context.exif.iso}`
                : 'ISO 2500';
            const focalLengthText = context?.exif?.focalLength || '135mm';

            const bottomBarY = 1820;
            const topBracketY = hasAttribution ? 230 : 140;
            const bracketBottomY = hasScoreboard ? 1640 : 1780;

            return (
                <g className="story-frame-through-the-lens">
                    {/* Viewfinder Corner Framing Brackets */}
                    <path
                        d={`M 50,${topBracketY + 60} L 50,${topBracketY} L 110,${topBracketY}`}
                        stroke={textColor}
                        strokeWidth="3"
                        fill="none"
                        opacity="0.8"
                    />
                    <path
                        d={`M 970,${topBracketY} L 1030,${topBracketY} L 1030,${topBracketY + 60}`}
                        stroke={textColor}
                        strokeWidth="3"
                        fill="none"
                        opacity="0.8"
                    />
                    <path
                        d={`M 50,${bracketBottomY - 60} L 50,${bracketBottomY} L 110,${bracketBottomY}`}
                        stroke={textColor}
                        strokeWidth="3"
                        fill="none"
                        opacity="0.8"
                    />
                    <path
                        d={`M 970,${bracketBottomY} L 1030,${bracketBottomY} L 1030,${bracketBottomY - 60}`}
                        stroke={textColor}
                        strokeWidth="3"
                        fill="none"
                        opacity="0.8"
                    />

                    {/* Right-Side Vertical Exposure Scale (EV ladder) */}
                    <g transform="translate(1014, 820)" opacity="0.85">
                        <text
                            x="0"
                            y="0"
                            fill={textColor}
                            fontFamily="system-ui, monospace"
                            fontSize="18"
                            fontWeight="bold"
                            textAnchor="middle"
                        >
                            +
                        </text>
                        <line x1="-8" y1="35" x2="8" y2="35" stroke={textColor} strokeWidth="1.5" />
                        <line x1="-5" y1="70" x2="5" y2="70" stroke={textColor} strokeWidth="1.5" />
                        <line x1="-5" y1="105" x2="5" y2="105" stroke={textColor} strokeWidth="1.5" />
                        {/* 0 Major mark */}
                        <line x1="-12" y1="140" x2="12" y2="140" stroke={hudGreen} strokeWidth="3" />
                        <polygon points="-16,140 -26,134 -26,146" fill={hudGreen} />
                        <line x1="-5" y1="175" x2="5" y2="175" stroke={textColor} strokeWidth="1.5" />
                        <line x1="-5" y1="210" x2="5" y2="210" stroke={textColor} strokeWidth="1.5" />
                        <line x1="-8" y1="245" x2="8" y2="245" stroke={textColor} strokeWidth="1.5" />
                        <text
                            x="0"
                            y="280"
                            fill={textColor}
                            fontFamily="system-ui, monospace"
                            fontSize="20"
                            fontWeight="bold"
                            textAnchor="middle"
                        >
                            -
                        </text>
                    </g>

                    {/* Bottom Telemetry Bar */}
                    <rect
                        x="40"
                        y={bottomBarY}
                        width="1000"
                        height="72"
                        rx="14"
                        fill={hudBg}
                        stroke={borderCol}
                        strokeWidth="1.5"
                    />

                    {/* Column 1: Shutter Speed */}
                    <text
                        x="70"
                        y={bottomBarY + 22}
                        fill={subdued}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontSize="11"
                        fontWeight="700"
                        letterSpacing="0.1em"
                    >
                        SPEED
                    </text>
                    <text
                        x="70"
                        y={bottomBarY + 54}
                        fill={textColor}
                        fontFamily="'SF Pro Display', system-ui, -apple-system, sans-serif"
                        fontSize="26"
                        fontWeight="800"
                    >
                        {shutterSpeedText}
                    </text>

                    {/* Column 2: Aperture */}
                    <text
                        x="270"
                        y={bottomBarY + 22}
                        fill={subdued}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontSize="11"
                        fontWeight="700"
                        letterSpacing="0.1em"
                    >
                        APERTURE
                    </text>
                    <text
                        x="270"
                        y={bottomBarY + 54}
                        fill={textColor}
                        fontFamily="'SF Pro Display', system-ui, -apple-system, sans-serif"
                        fontSize="26"
                        fontWeight="800"
                    >
                        {apertureText}
                    </text>

                    {/* Column 3: ISO */}
                    <text
                        x="470"
                        y={bottomBarY + 22}
                        fill={subdued}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontSize="11"
                        fontWeight="700"
                        letterSpacing="0.1em"
                    >
                        ISO
                    </text>
                    <text
                        x="470"
                        y={bottomBarY + 54}
                        fill={textColor}
                        fontFamily="'SF Pro Display', system-ui, -apple-system, sans-serif"
                        fontSize="26"
                        fontWeight="800"
                    >
                        {isoText}
                    </text>

                    {/* Column 4: Focal Length */}
                    <text
                        x="670"
                        y={bottomBarY + 22}
                        fill={subdued}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontSize="11"
                        fontWeight="700"
                        letterSpacing="0.1em"
                    >
                        FOCAL
                    </text>
                    <text
                        x="670"
                        y={bottomBarY + 54}
                        fill={textColor}
                        fontFamily="'SF Pro Display', system-ui, -apple-system, sans-serif"
                        fontSize="26"
                        fontWeight="800"
                    >
                        {focalLengthText}
                    </text>

                    {/* Column 5: [ i ] Button & Battery */}
                    <circle cx="866" cy={bottomBarY + 36} r="16" stroke={textColor} strokeWidth="1.5" fill="rgba(255,255,255,0.08)" />
                    <text
                        x="866"
                        y={bottomBarY + 36}
                        fill={textColor}
                        fontFamily="serif"
                        fontStyle="italic"
                        fontWeight="bold"
                        fontSize="18"
                        textAnchor="middle"
                        dominantBaseline="central"
                    >
                        i
                    </text>

                    <rect x="906" y={bottomBarY + 24} width="46" height="24" rx="4" stroke={textColor} strokeWidth="2" fill="none" />
                    <rect x="952" y={bottomBarY + 30} width="4" height="12" rx="1" fill={textColor} />
                    <rect x="910" y={bottomBarY + 28} width="7" height="16" rx="1" fill={hudGreen} />
                    <rect x="919" y={bottomBarY + 28} width="7" height="16" rx="1" fill={hudGreen} />
                    <rect x="928" y={bottomBarY + 28} width="7" height="16" rx="1" fill={hudGreen} />
                    <rect x="937" y={bottomBarY + 28} width="7" height="16" rx="1" fill={hudGreen} />
                </g>
            );
        },
        getSvgString: (override, context) => {
            const textColor = override || '#ffffff';
            const hudGreen = override || '#22c55e';
            const subdued = override || 'rgba(255, 255, 255, 0.75)';
            const hudBg = 'rgba(10, 12, 16, 0.72)';
            const borderCol = override ? `${override}40` : 'rgba(255, 255, 255, 0.22)';

            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const shutterSpeedText = context?.exif?.shutterSpeed?.replace(/s$/, '') || '1/3200';
            const apertureText = context?.exif?.aperture
                ? context.exif.aperture.startsWith('f/')
                    ? 'F' + context.exif.aperture.slice(2)
                    : context.exif.aperture.toUpperCase()
                : 'F2.8';
            const isoText = context?.exif?.iso
                ? context.exif.iso.startsWith('ISO')
                    ? context.exif.iso
                    : `ISO ${context.exif.iso}`
                : 'ISO 2500';
            const focalLengthText = context?.exif?.focalLength || '135mm';

            const bottomBarY = 1820;
            const topBracketY = hasAttribution ? 230 : 140;
            const bracketBottomY = hasScoreboard ? 1640 : 1780;

            return createSvgString(`
                <path d="M 50,${topBracketY + 60} L 50,${topBracketY} L 110,${topBracketY}" stroke="${textColor}" stroke-width="3" fill="none" opacity="0.8" />
                <path d="M 970,${topBracketY} L 1030,${topBracketY} L 1030,${topBracketY + 60}" stroke="${textColor}" stroke-width="3" fill="none" opacity="0.8" />
                <path d="M 50,${bracketBottomY - 60} L 50,${bracketBottomY} L 110,${bracketBottomY}" stroke="${textColor}" stroke-width="3" fill="none" opacity="0.8" />
                <path d="M 970,${bracketBottomY} L 1030,${bracketBottomY} L 1030,${bracketBottomY - 60}" stroke="${textColor}" stroke-width="3" fill="none" opacity="0.8" />

                <g transform="translate(1014, 820)" opacity="0.85">
                    <text x="0" y="0" fill="${textColor}" font-family="system-ui, monospace" font-size="18" font-weight="bold" text-anchor="middle">+</text>
                    <line x1="-8" y1="35" x2="8" y2="35" stroke="${textColor}" stroke-width="1.5" />
                    <line x1="-5" y1="70" x2="5" y2="70" stroke="${textColor}" stroke-width="1.5" />
                    <line x1="-5" y1="105" x2="5" y2="105" stroke="${textColor}" stroke-width="1.5" />
                    <line x1="-12" y1="140" x2="12" y2="140" stroke="${hudGreen}" stroke-width="3" />
                    <polygon points="-16,140 -26,134 -26,146" fill="${hudGreen}" />
                    <line x1="-5" y1="175" x2="5" y2="175" stroke="${textColor}" stroke-width="1.5" />
                    <line x1="-5" y1="210" x2="5" y2="210" stroke="${textColor}" stroke-width="1.5" />
                    <line x1="-8" y1="245" x2="8" y2="245" stroke="${textColor}" stroke-width="1.5" />
                    <text x="0" y="280" fill="${textColor}" font-family="system-ui, monospace" font-size="20" font-weight="bold" text-anchor="middle">-</text>
                </g>

                <rect x="40" y="${bottomBarY}" width="1000" height="72" rx="14" fill="${hudBg}" stroke="${borderCol}" stroke-width="1.5" />

                <text x="70" y="${bottomBarY + 22}" fill="${subdued}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="0.1em">SPEED</text>
                <text x="70" y="${bottomBarY + 54}" fill="${textColor}" font-family="'SF Pro Display', system-ui, -apple-system, sans-serif" font-size="26" font-weight="800">${shutterSpeedText}</text>

                <text x="270" y="${bottomBarY + 22}" fill="${subdued}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="0.1em">APERTURE</text>
                <text x="270" y="${bottomBarY + 54}" fill="${textColor}" font-family="'SF Pro Display', system-ui, -apple-system, sans-serif" font-size="26" font-weight="800">${apertureText}</text>

                <text x="470" y="${bottomBarY + 22}" fill="${subdued}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="0.1em">ISO</text>
                <text x="470" y="${bottomBarY + 54}" fill="${textColor}" font-family="'SF Pro Display', system-ui, -apple-system, sans-serif" font-size="26" font-weight="800">${isoText}</text>

                <text x="670" y="${bottomBarY + 22}" fill="${subdued}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="0.1em">FOCAL</text>
                <text x="670" y="${bottomBarY + 54}" fill="${textColor}" font-family="'SF Pro Display', system-ui, -apple-system, sans-serif" font-size="26" font-weight="800">${focalLengthText}</text>

                <circle cx="866" cy="${bottomBarY + 36}" r="16" stroke="${textColor}" stroke-width="1.5" fill="rgba(255,255,255,0.08)" />
                <text x="866" y="${bottomBarY + 36}" fill="${textColor}" font-family="serif" font-style="italic" font-weight="bold" font-size="18" text-anchor="middle" dominant-baseline="central">i</text>

                <rect x="906" y="${bottomBarY + 24}" width="46" height="24" rx="4" stroke="${textColor}" stroke-width="2" fill="none" />
                <rect x="952" y="${bottomBarY + 30}" width="4" height="12" rx="1" fill="${textColor}" />
                <rect x="910" y="${bottomBarY + 28}" width="7" height="16" rx="1" fill="${hudGreen}" />
                <rect x="919" y="${bottomBarY + 28}" width="7" height="16" rx="1" fill="${hudGreen}" />
                <rect x="928" y="${bottomBarY + 28}" width="7" height="16" rx="1" fill="${hudGreen}" />
                <rect x="937" y="${bottomBarY + 28}" width="7" height="16" rx="1" fill="${hudGreen}" />
            `);
        },
    },
];

export const STORY_FRAMES_MAP: Record<StoryFrameId, StoryFrameDefinition> = STORY_FRAME_DEFINITIONS.reduce(
    (acc, def) => {
        acc[def.id] = def;
        return acc;
    },
    {} as Record<StoryFrameId, StoryFrameDefinition>
);
