import type { StoryFrameDefinition } from '../types';
import { defineLayeredFrame } from './helper';
import { escapeXml } from '../../../../../utils/formatters';

export const TECH_FRAMES: StoryFrameDefinition[] = [
    defineLayeredFrame(
        'cyber-hud',
        'Cyber HUD',
        'tech',
        'High-tech tactical viewfinder, [REC] indicator & telemetry',
        ['#06b6d4', '#ef4444', '#ffffff'],
        (override, context) => {
            const primary = override || '#06b6d4';
            const recRed = override || '#ef4444';
            const textCol = override || '#ffffff';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const topY = hasAttribution ? 148 : 80;
            const bottomY = hasScoreboard ? 1730 : 1820;
            // Brackets scale about the canvas centre so they converge on the shot together (lock-on)
            const centre = { x: 540, y: 960 };
            const bracket = (id: string, d: string) => ({
                id,
                svg: `<path d="${d}" stroke="${primary}" stroke-width="5" fill="none" />`,
                pivot: centre,
            });

            return {
                layers: [
                    // 4 Corner Viewfinder Brackets
                    bracket('bracketTL', 'M40,120 L40,40 L120,40'),
                    bracket('bracketTR', 'M1040,120 L1040,40 L960,40'),
                    bracket('bracketBL', 'M40,1800 L40,1880 L120,1880'),
                    bracket('bracketBR', 'M1040,1800 L1040,1880 L960,1880'),
                    // Top-Left REC Indicator (the dot is its own layer so it can blink)
                    {
                        id: 'recDot',
                        svg: `<g transform="translate(60, ${topY - 10})">
                    <circle cx="10" cy="10" r="7" fill="${recRed}" />
                </g>`,
                    },
                    {
                        id: 'recText',
                        svg: `<g transform="translate(60, ${topY - 10})">
                    <text x="26" y="16" fill="${textCol}" font-family="monospace" font-size="20" font-weight="bold">REC 4K</text>
                </g>`,
                    },
                    // Top-Right Telemetry
                    {
                        id: 'telemetry',
                        svg: `<text x="1020" y="${topY + 6}" fill="${primary}" font-family="monospace" font-size="18" text-anchor="end" opacity="0.9">60 FPS • RAW</text>`,
                    },
                    // Left and Right Mid-Crosshairs
                    {
                        id: 'crossL',
                        svg: `<line x1="20" y1="960" x2="50" y2="960" stroke="${primary}" stroke-width="3" />
                <line x1="35" y1="945" x2="35" y2="975" stroke="${primary}" stroke-width="2" />`,
                        pivot: { x: 35, y: 960 },
                    },
                    {
                        id: 'crossR',
                        svg: `<line x1="1060" y1="960" x2="1030" y2="960" stroke="${primary}" stroke-width="3" />
                <line x1="1045" y1="945" x2="1045" y2="975" stroke="${primary}" stroke-width="2" />`,
                        pivot: { x: 1045, y: 960 },
                    },
                    // Bottom Balanced Status Readouts
                    {
                        id: 'readoutL',
                        svg: `<text x="60" y="${bottomY}" fill="${primary}" font-family="monospace" font-size="15" opacity="0.8">BATT // 94%</text>`,
                    },
                    {
                        id: 'readoutR',
                        svg: `<text x="1020" y="${bottomY}" fill="${primary}" font-family="monospace" font-size="15" text-anchor="end" opacity="0.8">ISO // AUTO</text>`,
                    },
                ],
            };
        }
    ),
    defineLayeredFrame(
        'through-the-lens',
        'Camera',
        'tech',
        'Nikon Z 8 EVF / rear screen telemetry HUD with live photo EXIF',
        ['#ffffff', '#e60000', '#22c55e'],
        (override, context) => {
            const textColor = override || '#ffffff';
            const hudGreen = override || '#22c55e';
            const subdued = override || 'rgba(255, 255, 255, 0.75)';
            const hudBg = 'rgba(10, 12, 16, 0.72)';
            const borderCol = override ? `${override}40` : 'rgba(255, 255, 255, 0.22)';

            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const rawShutter = context?.exif?.shutterSpeed?.replace(/s$/, '') || '1/3200';
            const rawAperture = context?.exif?.aperture
                ? context.exif.aperture.startsWith('f/')
                    ? 'F' + context.exif.aperture.slice(2)
                    : context.exif.aperture.toUpperCase()
                : 'F2.8';
            const rawIso = context?.exif?.iso
                ? context.exif.iso.startsWith('ISO')
                    ? context.exif.iso
                    : `ISO ${context.exif.iso}`
                : 'ISO 2500';
            const rawFocal = context?.exif?.focalLength || '135mm';

            const shutterSpeedText = escapeXml(rawShutter);
            const apertureText = escapeXml(rawAperture);
            const isoText = escapeXml(rawIso);
            const focalLengthText = escapeXml(rawFocal);

            const bottomBarY = 1820;
            const topBracketY = hasAttribution ? 150 : 90;
            const bracketBottomY = hasScoreboard ? 1680 : 1780;
            // AF brackets scale about the centre of the AF area so they close in on the subject together
            const afCentre = { x: 540, y: (topBracketY + bracketBottomY) / 2 };
            const af = (id: string, d: string) => ({
                id,
                svg: `<path d="${d}" stroke="${textColor}" stroke-width="3" fill="none" opacity="0.8" />`,
                pivot: afCentre,
            });
            // Exposure ladder pieces share the ladder's transform (the pieces never overlap, so the group opacity is unchanged)
            const ladder = (inner: string) => `<g transform="translate(1014, 820)" opacity="0.85">${inner}
                </g>`;
            // One EXIF readout column: small caption over the value
            const readout = (id: string, x: number, label: string, value: string) => ({
                id,
                svg: `<text x="${x}" y="${bottomBarY + 22}" fill="${subdued}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="0.1em">${label}</text>
                <text x="${x}" y="${bottomBarY + 54}" fill="${textColor}" font-family="'SF Pro Display', system-ui, -apple-system, sans-serif" font-size="26" font-weight="800">${value}</text>`,
            });

            return {
                layers: [
                    af('afTL', `M 50,${topBracketY + 60} L 50,${topBracketY} L 110,${topBracketY}`),
                    af('afTR', `M 970,${topBracketY} L 1030,${topBracketY} L 1030,${topBracketY + 60}`),
                    af('afBL', `M 50,${bracketBottomY - 60} L 50,${bracketBottomY} L 110,${bracketBottomY}`),
                    af('afBR', `M 970,${bracketBottomY} L 1030,${bracketBottomY} L 1030,${bracketBottomY - 60}`),
                    {
                        id: 'ladderTop',
                        svg: ladder(`
                    <text x="0" y="0" fill="${textColor}" font-family="system-ui, monospace" font-size="18" font-weight="bold" text-anchor="middle">+</text>
                    <line x1="-8" y1="35" x2="8" y2="35" stroke="${textColor}" stroke-width="1.5" />
                    <line x1="-5" y1="70" x2="5" y2="70" stroke="${textColor}" stroke-width="1.5" />
                    <line x1="-5" y1="105" x2="5" y2="105" stroke="${textColor}" stroke-width="1.5" />`),
                    },
                    {
                        id: 'ladderMark',
                        svg: ladder(`
                    <line x1="-12" y1="140" x2="12" y2="140" stroke="${hudGreen}" stroke-width="3" />
                    <polygon points="-16,140 -26,134 -26,146" fill="${hudGreen}" />`),
                    },
                    {
                        id: 'ladderBottom',
                        svg: ladder(`
                    <line x1="-5" y1="175" x2="5" y2="175" stroke="${textColor}" stroke-width="1.5" />
                    <line x1="-5" y1="210" x2="5" y2="210" stroke="${textColor}" stroke-width="1.5" />
                    <line x1="-8" y1="245" x2="8" y2="245" stroke="${textColor}" stroke-width="1.5" />
                    <text x="0" y="280" fill="${textColor}" font-family="system-ui, monospace" font-size="20" font-weight="bold" text-anchor="middle">-</text>`),
                    },
                    {
                        id: 'bar',
                        svg: `<rect x="40" y="${bottomBarY}" width="1000" height="72" rx="14" fill="${hudBg}" stroke="${borderCol}" stroke-width="1.5" />`,
                    },
                    readout('speed', 70, 'SPEED', shutterSpeedText),
                    readout('aperture', 270, 'APERTURE', apertureText),
                    readout('iso', 470, 'ISO', isoText),
                    readout('focal', 670, 'FOCAL', focalLengthText),
                    {
                        id: 'info',
                        svg: `<circle cx="866" cy="${bottomBarY + 36}" r="16" stroke="${textColor}" stroke-width="1.5" fill="rgba(255,255,255,0.08)" />
                <text x="866" y="${bottomBarY + 36}" fill="${textColor}" font-family="serif" font-style="italic" font-weight="bold" font-size="18" text-anchor="middle" dominant-baseline="central">i</text>`,
                    },
                    {
                        id: 'batteryShell',
                        svg: `<rect x="906" y="${bottomBarY + 24}" width="46" height="24" rx="4" stroke="${textColor}" stroke-width="2" fill="none" />
                <rect x="952" y="${bottomBarY + 30}" width="4" height="12" rx="1" fill="${textColor}" />`,
                    },
                    {
                        // Low battery: one red bar (blinks its warning in the animated story). Fixed red so it
                        // reads as a warning whatever the frame colour.
                        id: 'batteryCells',
                        svg: `<rect x="910" y="${bottomBarY + 28}" width="7" height="16" rx="1" fill="#ef4444" />`,
                    },
                ],
            };
        }
    ),
    defineLayeredFrame(
        'broadcast-live',
        'On Air',
        'tech',
        'Sports TV network championship live bug, CAM 01 & lower-third graphics',
        ['#ef4444', '#ffffff', '#3b82f6'],
        (override, context) => {
            const red = override || '#ef4444';
            const borderCol = override || '#3b82f6';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const topY = hasAttribution ? 148 : 80;
            const bottomY = hasScoreboard ? 1730 : 1820;
            const bracket = (d: string) =>
                `<path d="${d}" stroke="${borderCol}" stroke-width="3.5" fill="none" opacity="0.8" />`;

            return {
                layers: [
                    // Top-right LIVE HD pill (its dot is a separate layer drawn on top, clear of the text)
                    {
                        id: 'livePill',
                        svg: `<g transform="translate(860, ${topY - 20})">
                    <rect x="0" y="0" width="160" height="38" rx="8" fill="rgba(17, 17, 22, 0.88)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
                    <text x="40" y="25" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" letter-spacing="0.1em">LIVE</text>
                    <line x1="94" y1="10" x2="94" y2="28" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
                    <text x="105" y="24" fill="${red}" font-family="monospace" font-size="13" font-weight="bold">HD</text>
                </g>`,
                    },
                    {
                        id: 'liveDot',
                        svg: `<g transform="translate(860, ${topY - 20})"><circle cx="24" cy="19" r="6" fill="${red}" /></g>`,
                    },
                    // Top-left camera source
                    {
                        id: 'camPill',
                        svg: `<g transform="translate(60, ${topY - 20})">
                    <rect x="0" y="0" width="170" height="38" rx="8" fill="rgba(17, 17, 22, 0.88)" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
                    <text x="85" y="24" fill="#ffffff" font-family="monospace" font-size="14" font-weight="bold" letter-spacing="0.08em" text-anchor="middle">CAM 01 // 60 FPS</text>
                </g>`,
                    },
                    // Corner broadcast framing
                    { id: 'bracketTL', svg: bracket('M40,240 L40,160 L120,160') },
                    { id: 'bracketTR', svg: bracket('M1040,240 L1040,160 L960,160') },
                    { id: 'bracketBL', svg: bracket('M40,1680 L40,1760 L120,1760') },
                    { id: 'bracketBR', svg: bracket('M1040,1680 L1040,1760 L960,1760') },
                    // Bottom symmetrical studio lower-third info
                    {
                        id: 'lowerL',
                        svg: `<text x="60" y="${bottomY}" fill="#ffffff" font-family="monospace" font-size="14" font-weight="bold" opacity="0.75">CH 01 // WFTDA</text>`,
                    },
                    {
                        id: 'lowerR',
                        svg: `<text x="1020" y="${bottomY}" fill="#ffffff" font-family="monospace" font-size="14" font-weight="bold" text-anchor="end" opacity="0.75">CHAMPIONSHIP TOUR</text>`,
                    },
                ],
            };
        }
    ),
    defineLayeredFrame(
        'night-vision',
        'NVG',
        'tech',
        'Military-spec FLIR thermal HUD with azimuth compass tape & mil-dot reticle',
        ['#10b981', '#059669', '#34d399'],
        (override, context) => {
            const green = override || '#10b981';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const compassY = hasAttribution ? 215 : 90;
            const bottomY = hasScoreboard ? 1730 : 1820;
            const compass = (inner: string) => `<g transform="translate(540, ${compassY})">${inner}
                </g>`;
            // The minor ticks scroll as a tape either side of the fixed centre (lubber) tick. Each half scrolls by
            // one 50px tick spacing inside its own window (3 whole tiles, ticks centred in each), so the pattern
            // is periodic across its clip and lands exactly on the static ticks at rest.
            const tapeClip = (x: number) => ({ x, y: compassY - 2, w: 150, h: 12 });

            return {
                layers: [
                    // Azimuth Compass Tape (Clear of attribution badge)
                    {
                        id: 'compassLine',
                        svg: compass(`
                    <line x1="-180" y1="0" x2="180" y2="0" stroke="${green}" stroke-width="2" opacity="0.8" />`),
                    },
                    {
                        id: 'ticksL',
                        svg: compass(`
                    <line x1="-150" y1="0" x2="-150" y2="8" stroke="${green}" stroke-width="1.5" />
                    <line x1="-100" y1="0" x2="-100" y2="8" stroke="${green}" stroke-width="1.5" />
                    <line x1="-50" y1="0" x2="-50" y2="8" stroke="${green}" stroke-width="1.5" />`),
                        clip: tapeClip(365),
                    },
                    {
                        id: 'lubber',
                        svg: compass(`
                    <line x1="0" y1="0" x2="0" y2="12" stroke="${green}" stroke-width="2" />`),
                    },
                    {
                        id: 'ticksR',
                        svg: compass(`
                    <line x1="50" y1="0" x2="50" y2="8" stroke="${green}" stroke-width="1.5" />
                    <line x1="100" y1="0" x2="100" y2="8" stroke="${green}" stroke-width="1.5" />
                    <line x1="150" y1="0" x2="150" y2="8" stroke="${green}" stroke-width="1.5" />`),
                        clip: tapeClip(565),
                    },
                    {
                        id: 'heading',
                        svg: compass(`
                    <polygon points="0,18 -5,26 5,26" fill="${green}" />
                    <text x="0" y="-8" fill="${green}" font-family="monospace" font-size="15" font-weight="bold" text-anchor="middle">045° NE</text>`),
                    },
                    // Center Crosshair (Subtle, unobstructed)
                    {
                        id: 'reticle',
                        svg: `<g transform="translate(540, 960)" opacity="0.4">
                    <circle cx="0" cy="0" r="10" stroke="${green}" stroke-width="1.5" fill="none" />
                    <circle cx="0" cy="0" r="2.5" fill="${green}" />
                    <line x1="-45" y1="0" x2="-18" y2="0" stroke="${green}" stroke-width="1.5" />
                    <line x1="18" y1="0" x2="45" y2="0" stroke="${green}" stroke-width="1.5" />
                    <line x1="0" y1="-45" x2="0" y2="-18" stroke="${green}" stroke-width="1.5" />
                    <line x1="0" y1="18" x2="0" y2="45" stroke="${green}" stroke-width="1.5" />
                </g>`,
                        pivot: { x: 540, y: 960 },
                    },
                    // Left and Right Flank Mil-Reticule Elevation Ladders
                    {
                        id: 'ladderL',
                        svg: `<g transform="translate(80, 960)">
                    <line x1="0" y1="-80" x2="20" y2="-80" stroke="${green}" stroke-width="2" />
                    <line x1="0" y1="-40" x2="14" y2="-40" stroke="${green}" stroke-width="1.5" />
                    <line x1="0" y1="0" x2="30" y2="0" stroke="${green}" stroke-width="2.5" />
                    <line x1="0" y1="40" x2="14" y2="40" stroke="${green}" stroke-width="1.5" />
                    <line x1="0" y1="80" x2="20" y2="80" stroke="${green}" stroke-width="2" />
                </g>`,
                    },
                    {
                        id: 'ladderR',
                        svg: `<g transform="translate(1000, 960) scale(-1, 1)">
                    <line x1="0" y1="-80" x2="20" y2="-80" stroke="${green}" stroke-width="2" />
                    <line x1="0" y1="-40" x2="14" y2="-40" stroke="${green}" stroke-width="1.5" />
                    <line x1="0" y1="0" x2="30" y2="0" stroke="${green}" stroke-width="2.5" />
                    <line x1="0" y1="40" x2="14" y2="40" stroke="${green}" stroke-width="1.5" />
                    <line x1="0" y1="80" x2="20" y2="80" stroke="${green}" stroke-width="2" />
                </g>`,
                    },
                    // Bottom Symmetrical Telemetry Flanks
                    {
                        id: 'telemetryL',
                        svg: `<g transform="translate(60, ${bottomY})">
                    <text x="0" y="0" fill="${green}" font-family="monospace" font-size="14" font-weight="bold" opacity="0.85">${hasScoreboard ? 'GAIN: +12dB' : 'NVG // GAIN: +12dB • FOV: 40°'}</text>
                </g>`,
                    },
                    {
                        id: 'telemetryR',
                        svg: `<g transform="translate(1020, ${bottomY})">
                    <text x="0" y="0" fill="${green}" font-family="monospace" font-size="14" font-weight="bold" text-anchor="end" opacity="0.85">${hasScoreboard ? 'IR: ON • 98%' : 'IR ILLUM: ON • BAT: 98%'}</text>
                </g>`,
                    },
                ],
            };
        }
    ),
];
