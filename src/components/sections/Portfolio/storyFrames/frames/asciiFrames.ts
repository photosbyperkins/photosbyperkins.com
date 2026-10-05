import type { StoryFrameDefinition } from '../types';
import { defineFrame } from './helper';

/**
 * ASCII / text-mode frames. Everything is drawn with monospace <text> so the same SVG string
 * renders identically in the DOM preview and the canvas export (system fonts only, no web fonts).
 */

const MONO = `'Courier New', Courier, 'Lucida Console', monospace`;
const W = 1080;
const H = 1920;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One line of monospace text. `width` stretches it to an exact pixel width via textLength. */
const txt = (
    x: number,
    y: number,
    text: string,
    fill: string,
    size: number,
    opts: { width?: number; anchor?: 'start' | 'middle' | 'end'; opacity?: number } = {}
) => {
    const fit = opts.width ? ` textLength="${opts.width}" lengthAdjust="spacingAndGlyphs"` : '';
    const anchor = opts.anchor && opts.anchor !== 'start' ? ` text-anchor="${opts.anchor}"` : '';
    const op = opts.opacity !== undefined ? ` opacity="${opts.opacity}"` : '';
    return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="700" fill="${fill}" xml:space="preserve"${fit}${anchor}${op}>${esc(text)}</text>`;
};

/** Multi-line block (array of rows), top-left anchored at (x, y). */
const block = (x: number, y: number, rows: string[], fill: string, size: number, lineH = size * 1.15) =>
    rows.map((r, i) => txt(x, y + i * lineH, r, fill, size)).join('');

/** Vertical column of single characters, one glyph per row. */
const column = (x: number, y0: number, y1: number, chars: string, fill: string, size: number, step = size * 1.1) => {
    const out: string[] = [];
    let i = 0;
    for (let y = y0; y <= y1; y += step) {
        out.push(txt(x, y, chars[i % chars.length], fill, size, { anchor: 'middle' }));
        i++;
    }
    return out.join('');
};

/** Deterministic pseudo-random so previews and exports always match. */
const rng = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};

export const ASCII_FRAMES: StoryFrameDefinition[] = [
    defineFrame(
        'ascii-terminal',
        'Terminal',
        'ascii',
        'Green-phosphor shell window with +--+ borders & a blinking prompt',
        ['#4ade80', '#22c55e', '#bbf7d0'],
        (override, context) => {
            const green = override || '#4ade80';
            const dim = override || '#22c55e';
            const pale = override || '#bbf7d0';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;

            const top = 44;
            const bot = H - 24;
            const bar = '+' + '-'.repeat(Math.floor((W - 40) / (0.6 * 30)) - 2) + '+';
            const promptY = hasScoreboard ? 1690 : 1800;

            return `
                <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${dim}" stroke-width="2" opacity="0.35" />
                ${txt(20, top, bar, green, 30, { width: W - 40 })}
                ${txt(20, bot, bar, green, 30, { width: W - 40 })}
                ${column(30, top + 40, bot - 34, '|', green, 30)}
                ${column(W - 30, top + 40, bot - 34, '|', green, 30)}
                ${hasAttribution ? '' : txt(60, 110, '[ o o o ]  ~/derby/bout.jpg', pale, 26, { opacity: 0.9 })}
                ${txt(60, promptY, 'user@rink:~$ ./skate --fast', green, 30)}
                ${txt(60, promptY + 40, '> jam started_', pale, 30)}
            `;
        }
    ),
    defineFrame(
        'ascii-matrix',
        'Matrix',
        'ascii',
        'Cascading code-rain columns down both edges',
        ['#22c55e', '#86efac', '#ffffff'],
        (override) => {
            const green = override || '#22c55e';
            const bright = override || '#86efac';
            const r = rng(42);
            const glyphs = '01<>/\\|=+*#@$%&ABCDEFXYZ';
            const cols: string[] = [];
            const xs = [26, 64, 102, W - 102, W - 64, W - 26];
            xs.forEach((x, ci) => {
                const start = 40 + Math.floor(r() * 500);
                const len = 14 + Math.floor(r() * 18);
                for (let i = 0; i < len; i++) {
                    const y = start + i * 34;
                    if (y > H - 40) break;
                    const ch = glyphs[Math.floor(r() * glyphs.length)];
                    const head = i === len - 1;
                    const fade = Math.max(0.15, (i + 1) / len);
                    cols.push(txt(x, y, ch, head ? '#ffffff' : i > len - 4 ? bright : green, 30, { anchor: 'middle', opacity: head ? 1 : +fade.toFixed(2) }));
                }
                // second, shorter drip lower down each column
                const s2 = 1100 + Math.floor(r() * 400) + ci * 20;
                for (let i = 0; i < 8; i++) {
                    const y = s2 + i * 34;
                    if (y > H - 40) break;
                    cols.push(txt(x, y, glyphs[Math.floor(r() * glyphs.length)], green, 30, { anchor: 'middle', opacity: +((i + 1) / 10).toFixed(2) }));
                }
            });
            return cols.join('');
        }
    ),
    defineFrame(
        'ascii-bbs',
        'BBS',
        'ascii',
        '90s dial-up BBS banner with ANSI colour shading blocks',
        ['#f472b6', '#22d3ee', '#facc15', '#a78bfa'],
        (override, context) => {
            const pink = override || '#f472b6';
            const cyan = override || '#22d3ee';
            const yellow = override || '#facc15';
            const violet = override || '#a78bfa';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;
            const ramp = '.:-=+*#%@';
            const shade = (len: number) =>
                Array.from({ length: len }, (_, i) => ramp[Math.min(ramp.length - 1, Math.floor((i / len) * ramp.length))]).join('');
            // Courier advance is 0.6em, so this many glyphs span the frame width at 26px.
            const half = Math.floor((W - 40) / (0.6 * 26) / 2);
            const s = shade(half);
            const rev = s.split('').reverse().join('');
            const by = hasScoreboard ? 1680 : 1780;

            // Badges sit just inside the top/bottom bands: keep only the outermost row when they're shown.
            const topRows = hasAttribution
                ? txt(20, 40, s + rev, pink, 26)
                : `${txt(20, 40, s + rev, pink, 26)}${txt(20, 72, rev + s, cyan, 26, { opacity: 0.85 })}${txt(20, 104, s + rev, violet, 26, { opacity: 0.6 })}`;
            const bottomRows = hasScoreboard
                ? txt(20, H - 20, rev + s, pink, 26)
                : `${txt(20, H - 84, rev + s, violet, 26, { opacity: 0.6 })}${txt(20, H - 52, s + rev, cyan, 26, { opacity: 0.85 })}${txt(20, H - 20, rev + s, pink, 26)}`;

            return `
                ${topRows}

                ${column(22, 160, by - 60, '#%@%#*+=-:', cyan, 26)}
                ${column(W - 22, 160, by - 60, ':-=+*#%@%#', pink, 26)}

                ${txt(W / 2, by + 10, '-=[ CONNECT 14400 ]=-', yellow, 30, { anchor: 'middle' })}
                ${bottomRows}
            `;
        }
    ),
    defineFrame(
        'ascii-kaomoji',
        'Kaomoji',
        'ascii',
        'Text emoticons, <3 hearts & sparkles in candy colours',
        ['#f472b6', '#fde047', '#67e8f9', '#c4b5fd'],
        (override, context) => {
            const pink = override || '#f472b6';
            const yellow = override || '#fde047';
            const cyan = override || '#67e8f9';
            const lilac = override || '#c4b5fd';
            const hasAttribution = context?.hasAttribution ?? true;
            const hasScoreboard = context?.hasScoreboard ?? true;
            const topY = hasAttribution ? 170 : 110;
            const botY = hasScoreboard ? 1700 : 1790;

            return `
                ${txt(40, topY, '(^_^)/', pink, 52)}
                ${txt(W - 40, topY, '\\(^o^)', cyan, 52, { anchor: 'end' })}
                ${txt(60, topY + 64, '<3  *  <3', yellow, 34)}
                ${txt(W - 60, topY + 64, '+  <3  +', lilac, 34, { anchor: 'end' })}

                ${txt(30, 620, '<3', pink, 40)}
                ${txt(44, 860, '*', yellow, 40)}
                ${txt(28, 1100, '(o.o)', lilac, 30)}
                ${txt(40, 1340, '<3', cyan, 40)}
                ${txt(W - 30, 740, '<3', cyan, 40, { anchor: 'end' })}
                ${txt(W - 44, 980, '+', yellow, 40, { anchor: 'end' })}
                ${txt(W - 28, 1220, '(-.-)zZ', pink, 30, { anchor: 'end' })}
                ${txt(W - 40, 1460, '<3', lilac, 40, { anchor: 'end' })}

                ${txt(40, botY, '~(=^.^=)~', yellow, 44)}
                ${txt(W - 40, botY, '(>_<)!!', pink, 44, { anchor: 'end' })}
                ${txt(60, botY + 60, '<3 <3 <3', cyan, 30)}
                ${txt(W - 60, botY + 60, '* GG * ', lilac, 30, { anchor: 'end' })}
            `;
        }
    ),
    defineFrame(
        'ascii-starfield',
        'Starfield',
        'ascii',
        'Text-mode night sky of * . + o glyphs with an ASCII comet',
        ['#e0e7ff', '#a5b4fc', '#fde68a'],
        (override, context) => {
            const white = override || '#e0e7ff';
            const indigo = override || '#a5b4fc';
            const gold = override || '#fde68a';
            const hasAttribution = context?.hasAttribution ?? true;
            const r = rng(7);
            const stars: string[] = [];
            const glyphs = ['.', '.', '.', '*', '+', 'o', "'"];
            for (let i = 0; i < 90; i++) {
                // keep stars in the outer bands (edges + top/bottom corners), never the photo centre
                const side = r() < 0.5;
                const x = side ? 20 + r() * 150 : W - 20 - r() * 150;
                const y = 40 + r() * (H - 80);
                const g = glyphs[Math.floor(r() * glyphs.length)];
                const col = r() < 0.15 ? gold : r() < 0.5 ? indigo : white;
                const size = g === '.' ? 30 : 24 + Math.floor(r() * 14);
                stars.push(txt(x, y, g, col, size, { anchor: 'middle', opacity: +(0.45 + r() * 0.55).toFixed(2) }));
            }
            const cy = hasAttribution ? 170 : 120;
            return `
                ${stars.join('')}
                ${txt(W - 60, cy, '- - =====*', gold, 34, { anchor: 'end' })}
                ${txt(W - 60, cy + 30, ' -  ==  - ', indigo, 22, { anchor: 'end', opacity: 0.7 })}
            `;
        }
    ),
    defineFrame(
        'ascii-skate',
        'Skate ASCII',
        'ascii',
        'Old-school ASCII roller skate art with speed lines',
        ['#fb7185', '#fbbf24', '#38bdf8', '#ffffff'],
        (override, context) => {
            const boot = override || '#fb7185';
            const wheel = override || '#fbbf24';
            const speed = override || '#38bdf8';
            const hasScoreboard = context?.hasScoreboard ?? true;
            const hasAttribution = context?.hasAttribution ?? true;

            const skate = [
                '   ____     ',
                '  |    |    ',
                '  |    |__  ',
                '  |       \\_',
                '  |_________|',
                '  [=========]',
            ];
            const wheels = '   (O)   (O) ';
            const y = hasScoreboard ? 1600 : 1680;
            const topY = hasAttribution ? 160 : 100;

            return `
                <!-- Bottom-left skate with speed lines -->
                ${block(40, y, skate, boot, 30, 32)}
                ${txt(40, y + 6 * 32, wheels, wheel, 30)}
                ${txt(290, y + 80, '== --  -', speed, 30)}
                ${txt(290, y + 130, '=== -- -', speed, 30, { opacity: 0.75 })}

                <!-- Top corners: track arrows -->
                ${txt(40, topY, '>>> JAM >>>', speed, 34)}
                ${txt(W - 40, topY, '<<< ON <<<', wheel, 34, { anchor: 'end' })}

                <!-- Side lane markers -->
                ${column(26, 360, 1500, '|:', boot, 28, 60)}
                ${column(W - 26, 360, 1500, ':|', boot, 28, 60)}

                <!-- Bottom-right score ticker -->
                ${txt(W - 40, y + 190, '[####----]', wheel, 30, { anchor: 'end' })}
            `;
        }
    ),
];
