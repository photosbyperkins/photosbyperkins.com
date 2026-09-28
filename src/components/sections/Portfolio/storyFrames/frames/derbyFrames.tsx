import React from 'react';
import type { StoryFrameDefinition } from '../types';
import { defineFrame, createSvgString } from './helper';
import { SacBearGraphic } from '../sacBearOverlay';
import { loadSacBearPaths } from '../sacBearLoader';

export const DERBY_FRAMES: StoryFrameDefinition[] = [
    {
        id: 'sac-bear',
        label: 'Capital Grizzly',
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
                ? 'translate(750, 1510) scale(0.70) translate(-200, -180)'
                : 'translate(660, 1680) scale(0.80) translate(-200, -180)';

            return (
                <g className="story-frame-sac-bear">
                    <polygon
                        points="90,70 102,106 140,106 110,128 121,164 90,142 59,164 70,128 40,106 78,106"
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

            const paths = await loadSacBearPaths();
            const bearPathsSvg = paths
                .map((p) => {
                    const col = p.type === 'accent' ? accent : p.type === 'highlight' ? highlight : primary;
                    return `<path d="${p.d}" fill="${col}" />`;
                })
                .join('');

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
    defineFrame(
        'derby-quads',
        'Derby Quads',
        'derby',
        'Quad roller skates, speed track lines & jammer star',
        ['#f97316', '#dc2626', '#ffffff'],
        (override, context) => {
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
            return `
                <polygon points="980,80 990,110 1022,110 996,128 1006,158 980,140 954,158 964,128 938,110 970,110" fill="${primary}" />
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
        'The Zebra',
        'derby',
        'Bold referee stripes, whistle silhouette & penalty box hashes',
        ['#ffffff', '#111116', '#e2e8f0'],
        (override, context) => {
            const stripeColor = override || '#ffffff';
            const accent = override || '#f59e0b';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const topOffset = hasAttribution ? 180 : 80;
            const bottomOffset = hasScoreboard ? 1660 : 1800;

            return `
                <g transform="translate(860, ${topOffset})">
                    <polygon points="0,0 200,0 200,30 30,30" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="0,45 200,45 200,75 30,75" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="0,90 200,90 200,120 30,120" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="0,135 200,135 200,165 30,165" fill="${stripeColor}" opacity="0.9" />
                </g>
                <g transform="translate(0, ${bottomOffset})">
                    <polygon points="0,0 170,0 140,30 0,30" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="0,45 170,45 140,75 0,75" fill="${stripeColor}" opacity="0.9" />
                    <polygon points="0,90 170,90 140,120 0,120" fill="${stripeColor}" opacity="0.9" />
                </g>
                <g transform="translate(60, 90)">
                    <circle cx="20" cy="20" r="14" stroke="${accent}" stroke-width="3" fill="none" />
                    <rect x="28" y="14" width="38" height="12" rx="3" fill="${stripeColor}" />
                    <circle cx="78" cy="20" r="18" fill="${stripeColor}" />
                    <circle cx="78" cy="20" r="8" fill="#111116" />
                    <polygon points="28,14 16,17 16,23 28,26" fill="${stripeColor}" />
                    <path d="M102,12 Q112,20 102,28" stroke="${accent}" stroke-width="3" fill="none" />
                    <path d="M110,6 Q124,20 110,34" stroke="${accent}" stroke-width="2.5" fill="none" opacity="0.7" />
                </g>
                <path d="M40,220 L40,160 L100,160" stroke="${stripeColor}" stroke-width="4" fill="none" />
                <text x="50" y="250" fill="${accent}" font-family="monospace" font-size="16" font-weight="bold" letter-spacing="0.1em">BOX // 0:30</text>
                <path d="M1040,1680 L1040,1740 L980,1740" stroke="${stripeColor}" stroke-width="4" fill="none" />
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
            const topY = hasAttribution ? 210 : 80;

            return `
                <path d="M40,160 L40,80 L120,80" stroke="${gold}" stroke-width="6" fill="none" />
                <path d="M1040,160 L1040,80 L960,80" stroke="${gold}" stroke-width="6" fill="none" />
                <path d="M40,1760 L40,1840 L120,1840" stroke="${gold}" stroke-width="6" fill="none" />
                <path d="M1040,1760 L1040,1840 L960,1840" stroke="${gold}" stroke-width="6" fill="none" />
                <line x1="56" y1="96" x2="104" y2="96" stroke="${gold}" stroke-width="2" />
                <line x1="56" y1="96" x2="56" y2="144" stroke="${gold}" stroke-width="2" />
                <line x1="976" y1="96" x2="1024" y2="96" stroke="${gold}" stroke-width="2" />
                <line x1="1024" y1="96" x2="1024" y2="144" stroke="${gold}" stroke-width="2" />
                <g transform="translate(960, ${topY})">
                    <circle cx="0" cy="0" r="36" stroke="${gold}" stroke-width="3" fill="rgba(245,158,11,0.12)" />
                    <polygon points="0,-24 7,-7 24,-7 11,4 16,21 0,11 -16,21 -11,4 -24,-7 -7,-7" fill="${starColor}" />
                </g>
                <line x1="30" y1="360" x2="30" y2="1560" stroke="${gold}" stroke-width="3" stroke-dasharray="24 16" opacity="0.65" />
                <line x1="1050" y1="360" x2="1050" y2="1560" stroke="${gold}" stroke-width="3" stroke-dasharray="24 16" opacity="0.65" />
                <g transform="translate(60, 240)">
                    <rect x="0" y="0" width="130" height="26" rx="4" fill="${gold}" opacity="0.9" />
                    <text x="65" y="18" fill="#111116" font-family="system-ui, sans-serif" font-size="13" font-weight="900" letter-spacing="0.15em" text-anchor="middle">★ LEAD JAM ★</text>
                </g>
            `;
        }
    ),
    defineFrame(
        'derby-punk',
        'Derby Punk',
        'derby',
        'Safety pins, battle patch zig-zag overlock stitches & edge distress',
        ['#e11d48', '#fafafa', '#fbbf24'],
        (override, context) => {
            const stitch = override || '#fafafa';
            const pinColor = override || '#fbbf24';
            const hasAttribution = context?.hasAttribution ?? true;
            const pinY = hasAttribution ? 210 : 80;

            const leftStitches = [];
            const rightStitches = [];
            for (let y = 300; y <= 1620; y += 36) {
                leftStitches.push(`M24,${y} L36,${y + 18} L24,${y + 36}`);
                rightStitches.push(`M1056,${y} L1044,${y + 18} L1056,${y + 36}`);
            }

            return `
                <path d="${leftStitches.join(' ')}" stroke="${stitch}" stroke-width="3" fill="none" opacity="0.8" />
                <path d="${rightStitches.join(' ')}" stroke="${stitch}" stroke-width="3" fill="none" opacity="0.8" />
                <g transform="translate(100, ${pinY}) rotate(-35)">
                    <path d="M-10,-40 C-10,-55 30,-55 30,-40 L30,-15 C30,-5 10,-5 10,-15 Z" fill="${pinColor}" />
                    <circle cx="10" cy="-44" r="5" fill="#111116" />
                    <path d="M0,-15 L0,70 A16,16 0 1 0 20,70 L20,-35" stroke="${pinColor}" stroke-width="5" fill="none" stroke-linecap="round" />
                </g>
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
