import React from 'react';
import type { StoryFrameDefinition } from './types';
import { createSvgString } from './frameDefinitions';

export const EXTENDED_FRAME_DEFINITIONS: StoryFrameDefinition[] = [
    // ----------------------------------------------------
    // 1. ref-zebra (Derby & Track)
    // ----------------------------------------------------
    {
        id: 'ref-zebra',
        label: 'The Zebra',
        category: 'derby',
        vibe: 'Bold referee stripes, whistle silhouette & penalty box hashes',
        signaturePalette: ['#ffffff', '#111116', '#e2e8f0'],
        renderSvg: (override, context) => {
            const stripeColor = override || '#ffffff';
            const accent = override || '#f59e0b';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const topOffset = hasAttribution ? 180 : 80;
            const bottomOffset = hasScoreboard ? 1660 : 1800;

            return (
                <g className="story-frame-ref-zebra">
                    {/* Top-Right Referee Stripes Block */}
                    <g transform={`translate(860, ${topOffset})`}>
                        <polygon points="0,0 200,0 200,30 30,30" fill={stripeColor} opacity={0.9} />
                        <polygon points="0,45 200,45 200,75 30,75" fill={stripeColor} opacity={0.9} />
                        <polygon points="0,90 200,90 200,120 30,120" fill={stripeColor} opacity={0.9} />
                        <polygon points="0,135 200,135 200,165 30,165" fill={stripeColor} opacity={0.9} />
                    </g>

                    {/* Bottom-Left Referee Stripes Block */}
                    <g transform={`translate(0, ${bottomOffset})`}>
                        <polygon points="0,0 170,0 140,30 0,30" fill={stripeColor} opacity={0.9} />
                        <polygon points="0,45 170,45 140,75 0,75" fill={stripeColor} opacity={0.9} />
                        <polygon points="0,90 170,90 140,120 0,120" fill={stripeColor} opacity={0.9} />
                    </g>

                    {/* Top-Left Official Whistle */}
                    <g transform="translate(60, 90)">
                        {/* Lanyard ring */}
                        <circle cx="20" cy="20" r="14" stroke={accent} strokeWidth="3" fill="none" />
                        {/* Whistle barrel */}
                        <rect x="28" y="14" width="38" height="12" rx="3" fill={stripeColor} />
                        {/* Whistle chamber */}
                        <circle cx="78" cy="20" r="18" fill={stripeColor} />
                        <circle cx="78" cy="20" r="8" fill="#111116" />
                        {/* Mouthpiece */}
                        <polygon points="28,14 16,17 16,23 28,26" fill={stripeColor} />
                        {/* Sound vibrations */}
                        <path d="M102,12 Q112,20 102,28" stroke={accent} strokeWidth="3" fill="none" />
                        <path d="M110,6 Q124,20 110,34" stroke={accent} strokeWidth="2.5" fill="none" opacity={0.7} />
                    </g>

                    {/* Corner Penalty Box Ticks */}
                    <path d="M40,220 L40,160 L100,160" stroke={stripeColor} strokeWidth="4" fill="none" />
                    <text
                        x="50"
                        y="250"
                        fill={accent}
                        fontFamily="monospace"
                        fontSize="16"
                        fontWeight="bold"
                        letterSpacing="0.1em"
                    >
                        BOX // 0:30
                    </text>
                    <path d="M1040,1680 L1040,1740 L980,1740" stroke={stripeColor} strokeWidth="4" fill="none" />
                </g>
            );
        },
        getSvgString: (override, context) => {
            const stripeColor = override || '#ffffff';
            const accent = override || '#f59e0b';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const topOffset = hasAttribution ? 180 : 80;
            const bottomOffset = hasScoreboard ? 1660 : 1800;

            return createSvgString(`
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
            `);
        },
    },

    // ----------------------------------------------------
    // 2. bout-day (Derby & Track)
    // ----------------------------------------------------
    {
        id: 'bout-day',
        label: 'Bout Day',
        category: 'derby',
        vibe: 'Athletic stencil corner brackets, double jammer stars & track markings',
        signaturePalette: ['#f59e0b', '#fbbf24', '#1e3a8a'],
        renderSvg: (override, context) => {
            const gold = override || '#f59e0b';
            const starColor = override || '#fbbf24';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return (
                <g className="story-frame-bout-day">
                    {/* Athletic Corner Notches */}
                    <path d="M40,160 L40,80 L120,80" stroke={gold} strokeWidth="6" fill="none" />
                    <path d="M1040,160 L1040,80 L960,80" stroke={gold} strokeWidth="6" fill="none" />
                    <path d="M40,1760 L40,1840 L120,1840" stroke={gold} strokeWidth="6" fill="none" />
                    <path d="M1040,1760 L1040,1840 L960,1840" stroke={gold} strokeWidth="6" fill="none" />

                    {/* Collegiate Stencil Inner Ticks */}
                    <line x1="56" y1="96" x2="104" y2="96" stroke={gold} strokeWidth="2" />
                    <line x1="56" y1="96" x2="56" y2="144" stroke={gold} strokeWidth="2" />
                    <line x1="976" y1="96" x2="1024" y2="96" stroke={gold} strokeWidth="2" />
                    <line x1="1024" y1="96" x2="1024" y2="144" stroke={gold} strokeWidth="2" />

                    {/* Top Jammer Star Emblem */}
                    <g transform={`translate(960, ${topY})`}>
                        <circle cx="0" cy="0" r="36" stroke={gold} strokeWidth="3" fill="rgba(245,158,11,0.12)" />
                        <polygon points="0,-24 7,-7 24,-7 11,4 16,21 0,11 -16,21 -11,4 -24,-7 -7,-7" fill={starColor} />
                    </g>

                    {/* Track Boundary Dashes along left & right */}
                    <line
                        x1="30"
                        y1="360"
                        x2="30"
                        y2="1560"
                        stroke={gold}
                        strokeWidth="3"
                        strokeDasharray="24 16"
                        opacity={0.65}
                    />
                    <line
                        x1="1050"
                        y1="360"
                        x2="1050"
                        y2="1560"
                        stroke={gold}
                        strokeWidth="3"
                        strokeDasharray="24 16"
                        opacity={0.65}
                    />

                    {/* Lead Jammer Stencil Badge */}
                    <g transform="translate(60, 240)">
                        <rect x="0" y="0" width="130" height="26" rx="4" fill={gold} opacity={0.9} />
                        <text
                            x="65"
                            y="18"
                            fill="#111116"
                            fontFamily="system-ui, sans-serif"
                            fontSize="13"
                            fontWeight="900"
                            letterSpacing="0.15em"
                            textAnchor="middle"
                        >
                            ★ LEAD JAM ★
                        </text>
                    </g>
                </g>
            );
        },
        getSvgString: (override, context) => {
            const gold = override || '#f59e0b';
            const starColor = override || '#fbbf24';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return createSvgString(`
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
            `);
        },
    },

    // ----------------------------------------------------
    // 3. derby-punk (Derby & Track)
    // ----------------------------------------------------
    {
        id: 'derby-punk',
        label: 'Derby Punk',
        category: 'derby',
        vibe: 'Safety pins, battle patch zig-zag overlock stitches & edge distress',
        signaturePalette: ['#e11d48', '#fafafa', '#fbbf24'],
        renderSvg: (override, context) => {
            const stitch = override || '#fafafa';
            const pinColor = override || '#fbbf24';
            const hasAttribution = context?.hasAttribution ?? true;
            const pinY = hasAttribution ? 210 : 80;

            // Generate zigzag stitch paths
            const leftStitches = [];
            const rightStitches = [];
            for (let y = 300; y <= 1620; y += 36) {
                leftStitches.push(`M24,${y} L36,${y + 18} L24,${y + 36}`);
                rightStitches.push(`M1056,${y} L1044,${y + 18} L1056,${y + 36}`);
            }

            return (
                <g className="story-frame-derby-punk">
                    {/* Overlock battle zigzag stitches */}
                    <path d={leftStitches.join(' ')} stroke={stitch} strokeWidth="3" fill="none" opacity={0.8} />
                    <path d={rightStitches.join(' ')} stroke={stitch} strokeWidth="3" fill="none" opacity={0.8} />

                    {/* Vector Safety Pin (Top Corner) */}
                    <g transform={`translate(100, ${pinY}) rotate(-35)`}>
                        {/* Pin Head / Clasp */}
                        <path d="M-10,-40 C-10,-55 30,-55 30,-40 L30,-15 C30,-5 10,-5 10,-15 Z" fill={pinColor} />
                        <circle cx="10" cy="-44" r="5" fill="#111116" />
                        {/* Pin Wire & Spring Coil */}
                        <path
                            d="M0,-15 L0,70 A16,16 0 1 0 20,70 L20,-35"
                            stroke={pinColor}
                            strokeWidth="5"
                            fill="none"
                            strokeLinecap="round"
                        />
                    </g>

                    {/* Cross-stitch corner reinforcements */}
                    <g stroke={stitch} strokeWidth="3.5" opacity={0.85}>
                        {/* Top Left */}
                        <line x1="45" y1="45" x2="65" y2="65" />
                        <line x1="65" y1="45" x2="45" y2="65" />
                        {/* Top Right */}
                        <line x1="1015" y1="45" x2="1035" y2="65" />
                        <line x1="1035" y1="45" x2="1015" y2="65" />
                        {/* Bottom Left */}
                        <line x1="45" y1="1855" x2="65" y2="1875" />
                        <line x1="65" y1="1855" x2="45" y2="1875" />
                        {/* Bottom Right */}
                        <line x1="1015" y1="1855" x2="1035" y2="1875" />
                        <line x1="1035" y1="1855" x2="1015" y2="1875" />
                    </g>
                </g>
            );
        },
        getSvgString: (override, context) => {
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

            return createSvgString(`
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
            `);
        },
    },

    // ----------------------------------------------------
    // 4. sonic-boom (High Action)
    // ----------------------------------------------------
    {
        id: 'sonic-boom',
        label: 'Impact Blast',
        category: 'action',
        vibe: 'High-impact radial shockwave rings & kinetic fracture shards',
        signaturePalette: ['#f43f5e', '#fb7185', '#ffffff'],
        renderSvg: (override, context) => {
            const primary = override || '#f43f5e';
            const secondary = override || '#fb7185';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const bottomOriginY = hasScoreboard ? 1680 : 1840;

            return (
                <g className="story-frame-sonic-boom">
                    {/* Top-Right Shockwave Rings */}
                    <g transform="translate(1080, 0)">
                        <circle cx="0" cy="0" r="160" stroke={primary} strokeWidth="5" fill="none" opacity={0.8} />
                        <circle
                            cx="0"
                            cy="0"
                            r="260"
                            stroke={secondary}
                            strokeWidth="3"
                            strokeDasharray="16 12"
                            fill="none"
                            opacity={0.65}
                        />
                        <circle
                            cx="0"
                            cy="0"
                            r="380"
                            stroke={primary}
                            strokeWidth="2"
                            strokeDasharray="32 16"
                            fill="none"
                            opacity={0.45}
                        />
                        {/* Shards */}
                        <polygon points="-80,80 -120,60 -90,110" fill={primary} />
                        <polygon points="-140,160 -190,130 -160,200" fill={secondary} opacity={0.8} />
                        <polygon points="-240,90 -280,70 -260,115" fill={primary} opacity={0.7} />
                    </g>

                    {/* Bottom-Left Kinetic Impact */}
                    <g transform={`translate(0, ${bottomOriginY})`}>
                        <circle cx="0" cy="0" r="140" stroke={primary} strokeWidth="5" fill="none" opacity={0.8} />
                        <circle
                            cx="0"
                            cy="0"
                            r="240"
                            stroke={secondary}
                            strokeWidth="3"
                            strokeDasharray="20 10"
                            fill="none"
                            opacity={0.6}
                        />
                        {/* Shards */}
                        <polygon points="70,-70 110,-50 80,-95" fill={primary} />
                        <polygon points="130,-140 180,-110 150,-175" fill={secondary} opacity={0.8} />
                    </g>

                    {/* Radial Blast Ray lines */}
                    <line x1="1020" y1="60" x2="880" y2="180" stroke={primary} strokeWidth="3" opacity={0.6} />
                    <line
                        x1="980"
                        y1="120"
                        x2="820"
                        y2="260"
                        stroke={secondary}
                        strokeWidth="2"
                        strokeDasharray="8 6"
                        opacity={0.5}
                    />
                    <line
                        x1="60"
                        y1={bottomOriginY - 60}
                        x2="200"
                        y2={bottomOriginY - 180}
                        stroke={primary}
                        strokeWidth="3"
                        opacity={0.6}
                    />
                </g>
            );
        },
        getSvgString: (override, context) => {
            const primary = override || '#f43f5e';
            const secondary = override || '#fb7185';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const bottomOriginY = hasScoreboard ? 1680 : 1840;

            return createSvgString(`
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
            `);
        },
    },

    // ----------------------------------------------------
    // 5. speed-demons (High Action)
    // ----------------------------------------------------
    {
        id: 'speed-demons',
        label: 'Velocity Trails',
        category: 'action',
        vibe: 'Aerodynamic wind-tunnel slipstreams & trailing speed chevrons',
        signaturePalette: ['#06b6d4', '#3b82f6', '#60a5fa'],
        renderSvg: (override, context) => {
            const c1 = override || '#06b6d4';
            const c2 = override || '#3b82f6';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return (
                <g className="story-frame-speed-demons">
                    {/* Top Velocity Slipstream Curves */}
                    <path
                        d={`M30,${topY} Q540,${topY - 40} 1050,${topY}`}
                        stroke={c1}
                        strokeWidth="3"
                        fill="none"
                        opacity={0.7}
                    />
                    <path
                        d={`M60,${topY + 24} Q540,${topY - 10} 1020,${topY + 24}`}
                        stroke={c2}
                        strokeWidth="2"
                        strokeDasharray="30 15"
                        fill="none"
                        opacity={0.6}
                    />

                    {/* Left Forward Chevrons (>>>) */}
                    <g transform="translate(40, 480)">
                        <polygon points="0,0 20,15 0,30 8,15" fill={c1} />
                        <polygon points="26,0 46,15 26,30 34,15" fill={c1} opacity={0.8} />
                        <polygon points="52,0 72,15 52,30 60,15" fill={c2} opacity={0.6} />
                        <line x1="84" y1="15" x2="240" y2="15" stroke={c1} strokeWidth="3" strokeDasharray="24 12" />
                    </g>

                    {/* Right Forward Chevrons (>>>) */}
                    <g transform="translate(1040, 1400) scale(-1, 1)">
                        <polygon points="0,0 20,15 0,30 8,15" fill={c1} />
                        <polygon points="26,0 46,15 26,30 34,15" fill={c1} opacity={0.8} />
                        <polygon points="52,0 72,15 52,30 60,15" fill={c2} opacity={0.6} />
                        <line x1="84" y1="15" x2="240" y2="15" stroke={c1} strokeWidth="3" strokeDasharray="24 12" />
                    </g>

                    {/* Wind Tunnel Streamlines along bottom */}
                    <path
                        d="M40,1780 C300,1810 780,1750 1040,1780"
                        stroke={c1}
                        strokeWidth="4"
                        fill="none"
                        opacity={0.75}
                    />
                    <path
                        d="M80,1804 C340,1830 740,1774 1000,1804"
                        stroke={c2}
                        strokeWidth="2"
                        strokeDasharray="40 20"
                        fill="none"
                        opacity={0.6}
                    />
                </g>
            );
        },
        getSvgString: (override, context) => {
            const c1 = override || '#06b6d4';
            const c2 = override || '#3b82f6';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return createSvgString(`
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
            `);
        },
    },

    // ----------------------------------------------------
    // 6. instant-film (Retro & Film)
    // ----------------------------------------------------
    {
        id: 'instant-film',
        label: 'Vintage Polaroid',
        category: 'retro',
        vibe: 'Classic analog instant film border with chin & mounting corner tabs',
        signaturePalette: ['#ffffff', '#f1f5f9', '#94a3b8'],
        renderSvg: (override) => {
            const frameColor = override || '#ffffff';
            const tabColor = override || '#94a3b8';

            return (
                <g className="story-frame-instant-film">
                    {/* Clean Instant Photo Outer Border Lines */}
                    <rect
                        x="24"
                        y="24"
                        width="1032"
                        height="1872"
                        rx="8"
                        stroke={frameColor}
                        strokeWidth="3"
                        fill="none"
                        opacity={0.85}
                    />
                    <line x1="24" y1="1740" x2="1056" y2="1740" stroke={frameColor} strokeWidth="2.5" opacity={0.6} />

                    {/* Classic 4 Corner Photo Album Mounting Tabs */}
                    {/* Top-Left */}
                    <polygon points="24,80 80,24 60,24 24,60" fill={tabColor} opacity={0.9} />
                    {/* Top-Right */}
                    <polygon points="1056,80 1000,24 1020,24 1056,60" fill={tabColor} opacity={0.9} />
                    {/* Bottom-Left */}
                    <polygon points="24,1840 80,1896 60,1896 24,1860" fill={tabColor} opacity={0.9} />
                    {/* Bottom-Right */}
                    <polygon points="1056,1840 1000,1896 1020,1896 1056,1860" fill={tabColor} opacity={0.9} />

                    {/* Instant Film Bottom Chin Notch */}
                    <line
                        x1="500"
                        y1="1840"
                        x2="580"
                        y2="1840"
                        stroke={frameColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity={0.5}
                    />
                </g>
            );
        },
        getSvgString: (override) => {
            const frameColor = override || '#ffffff';
            const tabColor = override || '#94a3b8';

            return createSvgString(`
                <rect x="24" y="24" width="1032" height="1872" rx="8" stroke="${frameColor}" stroke-width="3" fill="none" opacity="0.85" />
                <line x1="24" y1="1740" x2="1056" y2="1740" stroke="${frameColor}" stroke-width="2.5" opacity="0.6" />
                <polygon points="24,80 80,24 60,24 24,60" fill="${tabColor}" opacity="0.9" />
                <polygon points="1056,80 1000,24 1020,24 1056,60" fill="${tabColor}" opacity="0.9" />
                <polygon points="24,1840 80,1896 60,1896 24,1860" fill="${tabColor}" opacity="0.9" />
                <polygon points="1056,1840 1000,1896 1020,1896 1056,1860" fill="${tabColor}" opacity="0.9" />
                <line x1="500" y1="1840" x2="580" y2="1840" stroke="${frameColor}" stroke-width="3" stroke-linecap="round" opacity="0.5" />
            `);
        },
    },

    // ----------------------------------------------------
    // 7. vhs-glitch (Retro & Film)
    // ----------------------------------------------------
    {
        id: 'vhs-glitch',
        label: '90s Camcorder',
        category: 'retro',
        vibe: 'Phosphor VHS on-screen display with PLAY, REC, battery gauge & tracking lines',
        signaturePalette: ['#22c55e', '#ef4444', '#ffffff'],
        renderSvg: (override, context) => {
            const phosphor = override || '#22c55e';
            const recRed = override || '#ef4444';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return (
                <g className="story-frame-vhs-glitch">
                    {/* Top-Left: PLAY ▶ */}
                    <g transform={`translate(60, ${topY})`}>
                        <text
                            x="0"
                            y="24"
                            fill={phosphor}
                            fontFamily="'Courier New', Courier, monospace"
                            fontSize="32"
                            fontWeight="bold"
                            letterSpacing="0.1em"
                        >
                            PLAY
                        </text>
                        <polygon points="100,6 122,18 100,30" fill={phosphor} />
                        <text
                            x="0"
                            y="60"
                            fill={phosphor}
                            fontFamily="'Courier New', Courier, monospace"
                            fontSize="20"
                            fontWeight="bold"
                            opacity={0.8}
                        >
                            SP
                        </text>
                    </g>

                    {/* Top-Right: REC ● + Battery Outline */}
                    <g transform={`translate(860, ${topY})`}>
                        <circle cx="16" cy="16" r="10" fill={recRed} />
                        <text
                            x="36"
                            y="24"
                            fill="#ffffff"
                            fontFamily="'Courier New', Courier, monospace"
                            fontSize="26"
                            fontWeight="bold"
                        >
                            REC
                        </text>
                        {/* Battery Icon */}
                        <g transform="translate(110, 8)">
                            <rect
                                x="0"
                                y="0"
                                width="36"
                                height="20"
                                rx="3"
                                stroke="#ffffff"
                                strokeWidth="2.5"
                                fill="none"
                            />
                            <rect x="36" y="5" width="4" height="10" rx="1" fill="#ffffff" />
                            <rect x="4" y="4" width="8" height="12" fill={phosphor} />
                            <rect x="15" y="4" width="8" height="12" fill={phosphor} />
                        </g>
                    </g>

                    {/* Bottom-Left: VCR Time Counter */}
                    <g transform="translate(60, 1780)">
                        <text
                            x="0"
                            y="0"
                            fill={phosphor}
                            fontFamily="'Courier New', Courier, monospace"
                            fontSize="28"
                            fontWeight="bold"
                            letterSpacing="0.1em"
                        >
                            -0:14:26
                        </text>
                        <text
                            x="0"
                            y="30"
                            fill={phosphor}
                            fontFamily="'Courier New', Courier, monospace"
                            fontSize="16"
                            fontWeight="bold"
                            opacity={0.7}
                        >
                            CH 03 • AUTO TRACKING
                        </text>
                    </g>

                    {/* Subtle VHS Scanline Tracking Glitch Marks */}
                    <line x1="30" y1="720" x2="90" y2="720" stroke={phosphor} strokeWidth="3" opacity={0.5} />
                    <line x1="990" y1="1200" x2="1050" y2="1200" stroke={phosphor} strokeWidth="3" opacity={0.5} />
                </g>
            );
        },
        getSvgString: (override, context) => {
            const phosphor = override || '#22c55e';
            const recRed = override || '#ef4444';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return createSvgString(`
                <g transform="translate(60, ${topY})">
                    <text x="0" y="24" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="32" font-weight="bold" letter-spacing="0.1em">PLAY</text>
                    <polygon points="100,6 122,18 100,30" fill="${phosphor}" />
                    <text x="0" y="60" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="20" font-weight="bold" opacity="0.8">SP</text>
                </g>
                <g transform="translate(860, ${topY})">
                    <circle cx="16" cy="16" r="10" fill="${recRed}" />
                    <text x="36" y="24" fill="#ffffff" font-family="'Courier New', Courier, monospace" font-size="26" font-weight="bold">REC</text>
                    <g transform="translate(110, 8)">
                        <rect x="0" y="0" width="36" height="20" rx="3" stroke="#ffffff" stroke-width="2.5" fill="none" />
                        <rect x="36" y="5" width="4" height="10" rx="1" fill="#ffffff" />
                        <rect x="4" y="4" width="8" height="12" fill="${phosphor}" />
                        <rect x="15" y="4" width="8" height="12" fill="${phosphor}" />
                    </g>
                </g>
                <g transform="translate(60, 1780)">
                    <text x="0" y="0" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="28" font-weight="bold" letter-spacing="0.1em">-0:14:26</text>
                    <text x="0" y="30" fill="${phosphor}" font-family="'Courier New', Courier, monospace" font-size="16" font-weight="bold" opacity="0.7">CH 03 • AUTO TRACKING</text>
                </g>
                <line x1="30" y1="720" x2="90" y2="720" stroke="${phosphor}" stroke-width="3" opacity="0.5" />
                <line x1="990" y1="1200" x2="1050" y2="1200" stroke="${phosphor}" stroke-width="3" opacity="0.5" />
            `);
        },
    },

    // ----------------------------------------------------
    // 8. risograph (Retro & Film)
    // ----------------------------------------------------
    {
        id: 'risograph',
        label: 'Riso Halftone',
        category: 'retro',
        vibe: 'Vintage zine offset CMYK calibration crosses & halftone grain edges',
        signaturePalette: ['#ec4899', '#06b6d4', '#facc15'],
        renderSvg: (override) => {
            const primary = override || '#ec4899';
            const cyan = override || '#06b6d4';
            const yellow = override || '#facc15';

            return (
                <g className="story-frame-risograph">
                    {/* 4 Corner Calibration Target Crosses (⊕) */}
                    {[
                        { x: 50, y: 50 },
                        { x: 1030, y: 50 },
                        { x: 50, y: 1870 },
                        { x: 1030, y: 1870 },
                    ].map((pt, i) => (
                        <g key={i} transform={`translate(${pt.x}, ${pt.y})`}>
                            <circle cx="0" cy="0" r="16" stroke={primary} strokeWidth="2" fill="none" />
                            <circle cx="0" cy="0" r="8" stroke={cyan} strokeWidth="1.5" fill="none" />
                            <line x1="-24" y1="0" x2="24" y2="0" stroke={primary} strokeWidth="1.5" />
                            <line x1="0" y1="-24" x2="0" y2="24" stroke={primary} strokeWidth="1.5" />
                        </g>
                    ))}

                    {/* Edge Color Density Step Bars (Left margin) */}
                    <g transform="translate(18, 860)">
                        <rect x="0" y="0" width="12" height="30" fill={cyan} opacity={0.9} />
                        <rect x="0" y="36" width="12" height="30" fill={primary} opacity={0.9} />
                        <rect x="0" y="72" width="12" height="30" fill={yellow} opacity={0.9} />
                        <rect x="0" y="108" width="12" height="30" fill="#ffffff" opacity={0.8} />
                    </g>

                    {/* Edge Color Density Step Bars (Right margin) */}
                    <g transform="translate(1050, 860)">
                        <rect x="0" y="0" width="12" height="30" fill={primary} opacity={0.9} />
                        <rect x="0" y="36" width="12" height="30" fill={cyan} opacity={0.9} />
                        <rect x="0" y="72" width="12" height="30" fill={yellow} opacity={0.9} />
                        <rect x="0" y="108" width="12" height="30" fill="#ffffff" opacity={0.8} />
                    </g>

                    {/* Double Misregistration Frame Borders */}
                    <rect
                        x="36"
                        y="36"
                        width="1008"
                        height="1848"
                        stroke={cyan}
                        strokeWidth="1.5"
                        fill="none"
                        opacity={0.65}
                    />
                    <rect
                        x="38"
                        y="38"
                        width="1008"
                        height="1848"
                        stroke={primary}
                        strokeWidth="1.5"
                        fill="none"
                        opacity={0.65}
                    />
                </g>
            );
        },
        getSvgString: (override) => {
            const primary = override || '#ec4899';
            const cyan = override || '#06b6d4';
            const yellow = override || '#facc15';

            return createSvgString(`
                <g transform="translate(50, 50)">
                    <circle cx="0" cy="0" r="16" stroke="${primary}" stroke-width="2" fill="none" />
                    <circle cx="0" cy="0" r="8" stroke="${cyan}" stroke-width="1.5" fill="none" />
                    <line x1="-24" y1="0" x2="24" y2="0" stroke="${primary}" stroke-width="1.5" />
                    <line x1="0" y1="-24" x2="0" y2="24" stroke="${primary}" stroke-width="1.5" />
                </g>
                <g transform="translate(1030, 50)">
                    <circle cx="0" cy="0" r="16" stroke="${primary}" stroke-width="2" fill="none" />
                    <circle cx="0" cy="0" r="8" stroke="${cyan}" stroke-width="1.5" fill="none" />
                    <line x1="-24" y1="0" x2="24" y2="0" stroke="${primary}" stroke-width="1.5" />
                    <line x1="0" y1="-24" x2="0" y2="24" stroke="${primary}" stroke-width="1.5" />
                </g>
                <g transform="translate(50, 1870)">
                    <circle cx="0" cy="0" r="16" stroke="${primary}" stroke-width="2" fill="none" />
                    <circle cx="0" cy="0" r="8" stroke="${cyan}" stroke-width="1.5" fill="none" />
                    <line x1="-24" y1="0" x2="24" y2="0" stroke="${primary}" stroke-width="1.5" />
                    <line x1="0" y1="-24" x2="0" y2="24" stroke="${primary}" stroke-width="1.5" />
                </g>
                <g transform="translate(1030, 1870)">
                    <circle cx="0" cy="0" r="16" stroke="${primary}" stroke-width="2" fill="none" />
                    <circle cx="0" cy="0" r="8" stroke="${cyan}" stroke-width="1.5" fill="none" />
                    <line x1="-24" y1="0" x2="24" y2="0" stroke="${primary}" stroke-width="1.5" />
                    <line x1="0" y1="-24" x2="0" y2="24" stroke="${primary}" stroke-width="1.5" />
                </g>
                <g transform="translate(18, 860)">
                    <rect x="0" y="0" width="12" height="30" fill="${cyan}" opacity="0.9" />
                    <rect x="0" y="36" width="12" height="30" fill="${primary}" opacity="0.9" />
                    <rect x="0" y="72" width="12" height="30" fill="${yellow}" opacity="0.9" />
                    <rect x="0" y="108" width="12" height="30" fill="#ffffff" opacity="0.8" />
                </g>
                <g transform="translate(1050, 860)">
                    <rect x="0" y="0" width="12" height="30" fill="${primary}" opacity="0.9" />
                    <rect x="0" y="36" width="12" height="30" fill="${cyan}" opacity="0.9" />
                    <rect x="0" y="72" width="12" height="30" fill="${yellow}" opacity="0.9" />
                    <rect x="0" y="108" width="12" height="30" fill="#ffffff" opacity="0.8" />
                </g>
                <rect x="36" y="36" width="1008" height="1848" stroke="${cyan}" stroke-width="1.5" fill="none" opacity="0.65" />
                <rect x="38" y="38" width="1008" height="1848" stroke="${primary}" stroke-width="1.5" fill="none" opacity="0.65" />
            `);
        },
    },

    // ----------------------------------------------------
    // 9. broadcast-live (Tech & HUD)
    // ----------------------------------------------------
    {
        id: 'broadcast-live',
        label: 'Live Broadcast',
        category: 'tech',
        vibe: 'Sports TV network championship live bug, CAM 01 & lower-third graphics',
        signaturePalette: ['#ef4444', '#ffffff', '#3b82f6'],
        renderSvg: (override, context) => {
            const red = override || '#ef4444';
            const borderCol = override || '#3b82f6';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return (
                <g className="story-frame-broadcast-live">
                    {/* Top-Right: LIVE Broadcast Bug */}
                    <g transform={`translate(840, ${topY})`}>
                        <rect
                            x="0"
                            y="0"
                            width="180"
                            height="42"
                            rx="8"
                            fill="rgba(17, 17, 22, 0.85)"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="1.5"
                        />
                        <circle cx="28" cy="21" r="7" fill={red} />
                        <text
                            x="46"
                            y="28"
                            fill="#ffffff"
                            fontFamily="system-ui, -apple-system, sans-serif"
                            fontSize="18"
                            fontWeight="800"
                            letterSpacing="0.1em"
                        >
                            LIVE
                        </text>
                        <line x1="105" y1="12" x2="105" y2="30" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                        <text x="116" y="27" fill={red} fontFamily="monospace" fontSize="14" fontWeight="bold">
                            HD
                        </text>
                    </g>

                    {/* Top-Left: Camera Telemetry Source */}
                    <g transform={`translate(60, ${topY})`}>
                        <text
                            x="0"
                            y="28"
                            fill="#ffffff"
                            fontFamily="monospace"
                            fontSize="18"
                            fontWeight="bold"
                            opacity={0.85}
                        >
                            CAM 01 // 60 FPS
                        </text>
                    </g>

                    {/* Broadcast Viewport Corner Ticks */}
                    <path d="M40,260 L40,180 L120,180" stroke={borderCol} strokeWidth="3" fill="none" opacity={0.75} />
                    <path
                        d="M1040,260 L1040,180 L960,180"
                        stroke={borderCol}
                        strokeWidth="3"
                        fill="none"
                        opacity={0.75}
                    />
                    <path
                        d="M40,1720 L40,1800 L120,1800"
                        stroke={borderCol}
                        strokeWidth="3"
                        fill="none"
                        opacity={0.75}
                    />
                    <path
                        d="M1040,1720 L1040,1800 L960,1800"
                        stroke={borderCol}
                        strokeWidth="3"
                        fill="none"
                        opacity={0.75}
                    />
                </g>
            );
        },
        getSvgString: (override, context) => {
            const red = override || '#ef4444';
            const borderCol = override || '#3b82f6';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return createSvgString(`
                <g transform="translate(840, ${topY})">
                    <rect x="0" y="0" width="180" height="42" rx="8" fill="rgba(17, 17, 22, 0.85)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
                    <circle cx="28" cy="21" r="7" fill="${red}" />
                    <text x="46" y="28" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" letter-spacing="0.1em">LIVE</text>
                    <line x1="105" y1="12" x2="105" y2="30" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
                    <text x="116" y="27" fill="${red}" font-family="monospace" font-size="14" font-weight="bold">HD</text>
                </g>
                <g transform="translate(60, ${topY})">
                    <text x="0" y="28" fill="#ffffff" font-family="monospace" font-size="18" font-weight="bold" opacity="0.85">CAM 01 // 60 FPS</text>
                </g>
                <path d="M40,260 L40,180 L120,180" stroke="${borderCol}" stroke-width="3" fill="none" opacity="0.75" />
                <path d="M1040,260 L1040,180 L960,180" stroke="${borderCol}" stroke-width="3" fill="none" opacity="0.75" />
                <path d="M40,1720 L40,1800 L120,1800" stroke="${borderCol}" stroke-width="3" fill="none" opacity="0.75" />
                <path d="M1040,1720 L1040,1800 L960,1800" stroke="${borderCol}" stroke-width="3" fill="none" opacity="0.75" />
            `);
        },
    },

    // ----------------------------------------------------
    // 10. night-vision (Tech & HUD)
    // ----------------------------------------------------
    {
        id: 'night-vision',
        label: 'Tactical NVG',
        category: 'tech',
        vibe: 'Military-spec FLIR thermal HUD with azimuth compass tape & mil-dot reticle',
        signaturePalette: ['#10b981', '#059669', '#34d399'],
        renderSvg: (override, context) => {
            const green = override || '#10b981';
            const hasAttribution = context?.hasAttribution ?? true;
            const compassY = hasAttribution ? 210 : 80;

            return (
                <g className="story-frame-night-vision">
                    {/* Top Compass Azimuth Heading Tape */}
                    <g transform={`translate(540, ${compassY})`}>
                        <line x1="-200" y1="0" x2="200" y2="0" stroke={green} strokeWidth="2" opacity={0.8} />
                        {[-150, -100, -50, 0, 50, 100, 150].map((x) => (
                            <line
                                key={x}
                                x1={x}
                                y1="0"
                                x2={x}
                                y2={x === 0 ? '14' : '8'}
                                stroke={green}
                                strokeWidth="2"
                            />
                        ))}
                        <polygon points="0,22 -6,30 6,30" fill={green} />
                        <text
                            x="0"
                            y="-8"
                            fill={green}
                            fontFamily="monospace"
                            fontSize="16"
                            fontWeight="bold"
                            textAnchor="middle"
                        >
                            045° NE
                        </text>
                    </g>

                    {/* Center Crosshair Mil-Dot Brackets */}
                    <g transform="translate(540, 960)">
                        <circle cx="0" cy="0" r="12" stroke={green} strokeWidth="2" fill="none" opacity={0.6} />
                        <circle cx="0" cy="0" r="3" fill={green} />
                        <line x1="-60" y1="0" x2="-20" y2="0" stroke={green} strokeWidth="2" />
                        <line x1="20" y1="0" x2="60" y2="0" stroke={green} strokeWidth="2" />
                        <line x1="0" y1="-60" x2="0" y2="-20" stroke={green} strokeWidth="2" />
                        <line x1="0" y1="20" x2="0" y2="60" stroke={green} strokeWidth="2" />
                    </g>

                    {/* Left & Right Pitch Angle Ladders */}
                    <g transform="translate(80, 960)">
                        <line x1="0" y1="-80" x2="20" y2="-80" stroke={green} strokeWidth="2" />
                        <line x1="0" y1="-40" x2="14" y2="-40" stroke={green} strokeWidth="1.5" />
                        <line x1="0" y1="0" x2="30" y2="0" stroke={green} strokeWidth="2.5" />
                        <line x1="0" y1="40" x2="14" y2="40" stroke={green} strokeWidth="1.5" />
                        <line x1="0" y1="80" x2="20" y2="80" stroke={green} strokeWidth="2" />
                    </g>
                    <g transform="translate(1000, 960) scale(-1, 1)">
                        <line x1="0" y1="-80" x2="20" y2="-80" stroke={green} strokeWidth="2" />
                        <line x1="0" y1="-40" x2="14" y2="-40" stroke={green} strokeWidth="1.5" />
                        <line x1="0" y1="0" x2="30" y2="0" stroke={green} strokeWidth="2.5" />
                        <line x1="0" y1="40" x2="14" y2="40" stroke={green} strokeWidth="1.5" />
                        <line x1="0" y1="80" x2="20" y2="80" stroke={green} strokeWidth="2" />
                    </g>

                    {/* Bottom Status Telemetry */}
                    <g transform="translate(60, 1780)">
                        <text
                            x="0"
                            y="0"
                            fill={green}
                            fontFamily="monospace"
                            fontSize="16"
                            fontWeight="bold"
                            opacity={0.8}
                        >
                            NVG // GAIN: +12dB • FOV: 40°
                        </text>
                    </g>
                </g>
            );
        },
        getSvgString: (override, context) => {
            const green = override || '#10b981';
            const hasAttribution = context?.hasAttribution ?? true;
            const compassY = hasAttribution ? 210 : 80;

            return createSvgString(`
                <g transform="translate(540, ${compassY})">
                    <line x1="-200" y1="0" x2="200" y2="0" stroke="${green}" stroke-width="2" opacity="0.8" />
                    <line x1="-150" y1="0" x2="-150" y2="8" stroke="${green}" stroke-width="2" />
                    <line x1="-100" y1="0" x2="-100" y2="8" stroke="${green}" stroke-width="2" />
                    <line x1="-50" y1="0" x2="-50" y2="8" stroke="${green}" stroke-width="2" />
                    <line x1="0" y1="0" x2="0" y2="14" stroke="${green}" stroke-width="2" />
                    <line x1="50" y1="0" x2="50" y2="8" stroke="${green}" stroke-width="2" />
                    <line x1="100" y1="0" x2="100" y2="8" stroke="${green}" stroke-width="2" />
                    <line x1="150" y1="0" x2="150" y2="8" stroke="${green}" stroke-width="2" />
                    <polygon points="0,22 -6,30 6,30" fill="${green}" />
                    <text x="0" y="-8" fill="${green}" font-family="monospace" font-size="16" font-weight="bold" text-anchor="middle">045° NE</text>
                </g>
                <g transform="translate(540, 960)">
                    <circle cx="0" cy="0" r="12" stroke="${green}" stroke-width="2" fill="none" opacity="0.6" />
                    <circle cx="0" cy="0" r="3" fill="${green}" />
                    <line x1="-60" y1="0" x2="-20" y2="0" stroke="${green}" stroke-width="2" />
                    <line x1="20" y1="0" x2="60" y2="0" stroke="${green}" stroke-width="2" />
                    <line x1="0" y1="-60" x2="0" y2="-20" stroke="${green}" stroke-width="2" />
                    <line x1="0" y1="20" x2="0" y2="60" stroke="${green}" stroke-width="2" />
                </g>
                <g transform="translate(80, 960)">
                    <line x1="0" y1="-80" x2="20" y2="-80" stroke="${green}" stroke-width="2" />
                    <line x1="0" y1="-40" x2="14" y2="-40" stroke="${green}" stroke-width="1.5" />
                    <line x1="0" y1="0" x2="30" y2="0" stroke="${green}" stroke-width="2.5" />
                    <line x1="0" y1="40" x2="14" y2="40" stroke="${green}" stroke-width="1.5" />
                    <line x1="0" y1="80" x2="20" y2="80" stroke="${green}" stroke-width="2" />
                </g>
                <g transform="translate(1000, 960) scale(-1, 1)">
                    <line x1="0" y1="-80" x2="20" y2="-80" stroke="${green}" stroke-width="2" />
                    <line x1="0" y1="-40" x2="14" y2="-40" stroke="${green}" stroke-width="1.5" />
                    <line x1="0" y1="0" x2="30" y2="0" stroke="${green}" stroke-width="2.5" />
                    <line x1="0" y1="40" x2="14" y2="40" stroke="${green}" stroke-width="1.5" />
                    <line x1="0" y1="80" x2="20" y2="80" stroke="${green}" stroke-width="2" />
                </g>
                <g transform="translate(60, 1780)">
                    <text x="0" y="0" fill="${green}" font-family="monospace" font-size="16" font-weight="bold" opacity="0.8">NVG // GAIN: +12dB • FOV: 40°</text>
                </g>
            `);
        },
    },

    // ----------------------------------------------------
    // 11. roller-disco (Cosmic & Glow)
    // ----------------------------------------------------
    {
        id: 'roller-disco',
        label: '70s Roller Disco',
        category: 'cosmic',
        vibe: 'Mirror ball starlight reflections, multi-color neon tube curves & disco sparkles',
        signaturePalette: ['#ec4899', '#8b5cf6', '#facc15'],
        renderSvg: (override, context) => {
            const pink = override || '#ec4899';
            const purple = override || '#8b5cf6';
            const gold = override || '#facc15';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return (
                <g className="story-frame-roller-disco">
                    {/* Top-Right: Mirror Ball with Facets */}
                    <g transform={`translate(960, ${topY})`}>
                        {/* Hanging wire */}
                        <line x1="0" y1="-80" x2="0" y2="-36" stroke={gold} strokeWidth="2" />
                        {/* Mirror ball sphere */}
                        <circle cx="0" cy="0" r="38" fill="rgba(255,255,255,0.15)" stroke={gold} strokeWidth="3" />
                        {/* Facet grids */}
                        <ellipse
                            cx="0"
                            cy="0"
                            rx="38"
                            ry="12"
                            stroke={gold}
                            strokeWidth="1.5"
                            fill="none"
                            opacity={0.6}
                        />
                        <ellipse
                            cx="0"
                            cy="0"
                            rx="38"
                            ry="24"
                            stroke={gold}
                            strokeWidth="1.5"
                            fill="none"
                            opacity={0.6}
                        />
                        <line x1="-38" y1="0" x2="38" y2="0" stroke={gold} strokeWidth="1.5" opacity={0.6} />
                        <line x1="0" y1="-38" x2="0" y2="38" stroke={gold} strokeWidth="1.5" opacity={0.6} />
                        {/* Sparkle Rays */}
                        <polygon
                            points="0,-60 6,-42 24,-42 10,-30 15,-12 0,-24 -15,-12 -10,-30 -24,-42 -6,-42"
                            fill={pink}
                            opacity={0.8}
                        />
                    </g>

                    {/* Concentric Neon Tube Arches (Bottom Corners) */}
                    <path d="M0,1720 Q180,1720 180,1920" stroke={pink} strokeWidth="4" fill="none" opacity={0.8} />
                    <path d="M0,1740 Q160,1740 160,1920" stroke={purple} strokeWidth="3" fill="none" opacity={0.7} />
                    <path d="M0,1760 Q140,1760 140,1920" stroke={gold} strokeWidth="2" fill="none" opacity={0.6} />

                    <path d="M1080,1720 Q900,1720 900,1920" stroke={pink} strokeWidth="4" fill="none" opacity={0.8} />
                    <path d="M1080,1740 Q920,1740 920,1920" stroke={purple} strokeWidth="3" fill="none" opacity={0.7} />
                    <path d="M1080,1760 Q940,1760 940,1920" stroke={gold} strokeWidth="2" fill="none" opacity={0.6} />

                    {/* Scattered 8-Point Disco Starbursts */}
                    {[
                        { x: 90, y: 380, s: 20 },
                        { x: 1010, y: 720, s: 26 },
                        { x: 70, y: 1300, s: 22 },
                    ].map((star, i) => (
                        <g key={i} transform={`translate(${star.x}, ${star.y})`}>
                            <polygon points="0,-24 5,-6 24,0 5,6 0,24 -5,6 -24,0 -5,-6" fill={gold} />
                            <circle cx="0" cy="0" r="3" fill="#ffffff" />
                        </g>
                    ))}
                </g>
            );
        },
        getSvgString: (override, context) => {
            const pink = override || '#ec4899';
            const purple = override || '#8b5cf6';
            const gold = override || '#facc15';
            const hasAttribution = context?.hasAttribution ?? true;
            const topY = hasAttribution ? 210 : 80;

            return createSvgString(`
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
            `);
        },
    },

    // ----------------------------------------------------
    // 12. mystic-tarot (Cosmic & Glow)
    // ----------------------------------------------------
    {
        id: 'mystic-tarot',
        label: 'The Skater Arcana',
        category: 'cosmic',
        vibe: 'Gothic tarot card filigree, celestial sunburst corners & crescent medallions',
        signaturePalette: ['#eab308', '#fef08a', '#ca8a04'],
        renderSvg: (override) => {
            const gold = override || '#eab308';
            const lightGold = override || '#fef08a';

            return (
                <g className="story-frame-mystic-tarot">
                    {/* Double Ornate Border Lines */}
                    <rect x="36" y="36" width="1008" height="1848" rx="14" stroke={gold} strokeWidth="3" fill="none" />
                    <rect
                        x="48"
                        y="48"
                        width="984"
                        height="1824"
                        rx="10"
                        stroke={gold}
                        strokeWidth="1.5"
                        strokeDasharray="12 8"
                        fill="none"
                        opacity={0.7}
                    />

                    {/* 4 Corner Sun/Moon Medallions */}
                    {[
                        { x: 52, y: 52 },
                        { x: 1028, y: 52 },
                        { x: 52, y: 1868 },
                        { x: 1028, y: 1868 },
                    ].map((corner, i) => (
                        <g key={i} transform={`translate(${corner.x}, ${corner.y})`}>
                            <circle cx="0" cy="0" r="28" fill="rgba(17,17,22,0.85)" stroke={gold} strokeWidth="2" />
                            {/* Celestial Sunburst / Star */}
                            <polygon points="0,-18 4,-5 18,0 4,5 0,18 -4,5 -18,0 -4,-5" fill={lightGold} />
                            <circle cx="0" cy="0" r="4" fill="#ffffff" />
                        </g>
                    ))}

                    {/* Top Center Arch Ornament */}
                    <g transform="translate(540, 48)">
                        <polygon points="0,-16 10,0 0,16 -10,0" fill={gold} />
                        <line x1="-80" y1="0" x2="-20" y2="0" stroke={gold} strokeWidth="2" />
                        <line x1="20" y1="0" x2="80" y2="0" stroke={gold} strokeWidth="2" />
                        <circle cx="-50" cy="0" r="3" fill={lightGold} />
                        <circle cx="50" cy="0" r="3" fill={lightGold} />
                    </g>

                    {/* Bottom Center Arch Ornament */}
                    <g transform="translate(540, 1872)">
                        <polygon points="0,-16 10,0 0,16 -10,0" fill={gold} />
                        <line x1="-80" y1="0" x2="-20" y2="0" stroke={gold} strokeWidth="2" />
                        <line x1="20" y1="0" x2="80" y2="0" stroke={gold} strokeWidth="2" />
                        <circle cx="-50" cy="0" r="3" fill={lightGold} />
                        <circle cx="50" cy="0" r="3" fill={lightGold} />
                    </g>
                </g>
            );
        },
        getSvgString: (override) => {
            const gold = override || '#eab308';
            const lightGold = override || '#fef08a';

            return createSvgString(`
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
            `);
        },
    },
];
