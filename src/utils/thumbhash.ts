/**
 * Pure TypeScript implementation of the compact 28-byte binary ThumbHash
 * image placeholder algorithm (adapted from Evan Wallace's MIT/public-domain
 * specification) with client-side PNG data-URL decoding and memoization.
 */
import { withBuild } from './build';

const { PI, min, max, cos, round } = Math;

export function uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function base64ToUint8(b64: string): Uint8Array {
    const clean = b64.trim();
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        out[i] = bin.charCodeAt(i);
    }
    return out;
}

/**
 * Encodes an RGBA image (<= 100x100) to a compact binary ThumbHash (~25-28 bytes).
 */
export function rgbaToThumbHash(w: number, h: number, rgba: ArrayLike<number>): Uint8Array {
    if (w > 100 || h > 100) throw new Error(`${w}x${h} doesn't fit in 100x100`);

    let avg_r = 0,
        avg_g = 0,
        avg_b = 0,
        avg_a = 0;
    for (let i = 0, j = 0; i < w * h; i++, j += 4) {
        const alpha = rgba[j + 3] / 255;
        avg_r += (alpha / 255) * rgba[j];
        avg_g += (alpha / 255) * rgba[j + 1];
        avg_b += (alpha / 255) * rgba[j + 2];
        avg_a += alpha;
    }
    if (avg_a) {
        avg_r /= avg_a;
        avg_g /= avg_a;
        avg_b /= avg_a;
    }

    const hasAlpha = avg_a < w * h;
    const l_limit = hasAlpha ? 5 : 7;
    const lx = max(1, round((l_limit * w) / max(w, h)));
    const ly = max(1, round((l_limit * h) / max(w, h)));
    const l: number[] = [];
    const p: number[] = [];
    const q: number[] = [];
    const a: number[] = [];

    for (let i = 0, j = 0; i < w * h; i++, j += 4) {
        const alpha = rgba[j + 3] / 255;
        const r = avg_r * (1 - alpha) + (alpha / 255) * rgba[j];
        const g = avg_g * (1 - alpha) + (alpha / 255) * rgba[j + 1];
        const b = avg_b * (1 - alpha) + (alpha / 255) * rgba[j + 2];
        l[i] = (r + g + b) / 3;
        p[i] = (r + g) / 2 - b;
        q[i] = r - g;
        a[i] = alpha;
    }

    const encodeChannel = (channel: number[], nx: number, ny: number): [number, number[], number] => {
        let dc = 0;
        const ac: number[] = [];
        let scale = 0;
        const fx: number[] = [];
        for (let cy = 0; cy < ny; cy++) {
            for (let cx = 0; cx * ny < nx * (ny - cy); cx++) {
                let f = 0;
                for (let x = 0; x < w; x++) fx[x] = cos((PI / w) * cx * (x + 0.5));
                for (let y = 0; y < h; y++) {
                    for (let x = 0, fy = cos((PI / h) * cy * (y + 0.5)); x < w; x++) {
                        f += channel[x + y * w] * fx[x] * fy;
                    }
                }
                f /= w * h;
                if (cx || cy) {
                    ac.push(f);
                    scale = max(scale, Math.abs(f));
                } else {
                    dc = f;
                }
            }
        }
        if (scale) {
            for (let i = 0; i < ac.length; i++) {
                ac[i] = 0.5 + (0.5 / scale) * ac[i];
            }
        }
        return [dc, ac, scale];
    };

    const [l_dc, l_ac, l_scale] = encodeChannel(l, max(3, lx), max(3, ly));
    const [p_dc, p_ac, p_scale] = encodeChannel(p, 3, 3);
    const [q_dc, q_ac, q_scale] = encodeChannel(q, 3, 3);
    const [a_dc, a_ac, a_scale] = hasAlpha ? encodeChannel(a, 5, 5) : [0, [], 0];

    const isLandscape = w > h;
    const header24 =
        round(63 * l_dc) |
        (round(31.5 + 31.5 * p_dc) << 6) |
        (round(31.5 + 31.5 * q_dc) << 12) |
        (round(31 * l_scale) << 18) |
        ((hasAlpha ? 1 : 0) << 23);
    const header16 =
        (isLandscape ? ly : lx) |
        (round(63 * p_scale) << 3) |
        (round(63 * q_scale) << 9) |
        ((isLandscape ? 1 : 0) << 15);
    const hash = [header24 & 255, (header24 >> 8) & 255, header24 >> 16, header16 & 255, header16 >> 8];
    const ac_start = hasAlpha ? 6 : 5;
    let ac_index = 0;
    if (hasAlpha) hash.push(round(15 * a_dc) | (round(15 * a_scale) << 4));

    for (const ac of hasAlpha ? [l_ac, p_ac, q_ac, a_ac] : [l_ac, p_ac, q_ac]) {
        for (const f of ac) {
            const idx = ac_start + (ac_index >> 1);
            hash[idx] = (hash[idx] || 0) | (round(15 * f) << ((ac_index++ & 1) << 2));
        }
    }
    return new Uint8Array(hash);
}

export function rgbaToThumbHashBase64(w: number, h: number, rgba: ArrayLike<number>): string {
    return uint8ToBase64(rgbaToThumbHash(w, h, rgba));
}

/**
 * Decodes a binary ThumbHash into approximate dimensions and an RGBA pixel buffer.
 */
export function thumbHashToRGBA(hash: ArrayLike<number>): { w: number; h: number; rgba: Uint8Array } {
    const header24 = hash[0] | (hash[1] << 8) | (hash[2] << 16);
    const header16 = hash[3] | (hash[4] << 8);
    const l_dc = (header24 & 63) / 63;
    const p_dc = ((header24 >> 6) & 63) / 31.5 - 1;
    const q_dc = ((header24 >> 12) & 63) / 31.5 - 1;
    const l_scale = ((header24 >> 18) & 31) / 31;
    const hasAlpha = (header24 >> 23) !== 0;
    const p_scale = ((header16 >> 3) & 63) / 63;
    const q_scale = ((header16 >> 9) & 63) / 63;
    const isLandscape = (header16 >> 15) !== 0;
    const lx = max(3, isLandscape ? (hasAlpha ? 5 : 7) : header16 & 7);
    const ly = max(3, isLandscape ? header16 & 7 : hasAlpha ? 5 : 7);
    const a_dc = hasAlpha ? (hash[5] & 15) / 15 : 1;
    const a_scale = ((hash[5] >> 4) & 15) / 15;

    const ac_start = hasAlpha ? 6 : 5;
    let ac_index = 0;
    const decodeChannel = (nx: number, ny: number, scale: number) => {
        const ac: number[] = [];
        for (let cy = 0; cy < ny; cy++) {
            for (let cx = cy ? 0 : 1; cx * ny < nx * (ny - cy); cx++) {
                ac.push((((hash[ac_start + (ac_index >> 1)] >> ((ac_index++ & 1) << 2)) & 15) / 7.5 - 1) * scale);
            }
        }
        return ac;
    };
    const l_ac = decodeChannel(lx, ly, l_scale);
    const p_ac = decodeChannel(3, 3, p_scale * 1.25);
    const q_ac = decodeChannel(3, 3, q_scale * 1.25);
    const a_ac = hasAlpha ? decodeChannel(5, 5, a_scale) : [];

    const ratio = isLandscape ? lx / ly : (header16 & 7) / (hasAlpha ? 5 : 7);
    const w = round(ratio > 1 ? 32 : 32 * ratio);
    const h = round(ratio > 1 ? 32 / ratio : 32);
    const rgba = new Uint8Array(w * h * 4);
    const fx: number[] = [];
    const fy: number[] = [];

    for (let y = 0, i = 0; y < h; y++) {
        for (let x = 0; x < w; x++, i += 4) {
            let l = l_dc,
                p = p_dc,
                q = q_dc,
                a = a_dc;

            for (let cx = 0, n = max(lx, hasAlpha ? 5 : 3); cx < n; cx++) {
                fx[cx] = cos((PI / w) * (x + 0.5) * cx);
            }
            for (let cy = 0, n = max(ly, hasAlpha ? 5 : 3); cy < n; cy++) {
                fy[cy] = cos((PI / h) * (y + 0.5) * cy);
            }

            for (let cy = 0, j = 0; cy < ly; cy++) {
                for (let cx = cy ? 0 : 1, fy2 = fy[cy] * 2; cx * ly < lx * (ly - cy); cx++, j++) {
                    l += l_ac[j] * fx[cx] * fy2;
                }
            }

            for (let cy = 0, j = 0; cy < 3; cy++) {
                for (let cx = cy ? 0 : 1, fy2 = fy[cy] * 2; cx < 3 - cy; cx++, j++) {
                    const f = fx[cx] * fy2;
                    p += p_ac[j] * f;
                    q += q_ac[j] * f;
                }
            }

            if (hasAlpha) {
                for (let cy = 0, j = 0; cy < 5; cy++) {
                    for (let cx = cy ? 0 : 1, fy2 = fy[cy] * 2; cx < 5 - cy; cx++, j++) {
                        a += a_ac[j] * fx[cx] * fy2;
                    }
                }
            }

            const b = l - (2 / 3) * p;
            const r = (3 * l - b + q) / 2;
            const g = r - q;
            rgba[i] = max(0, 255 * min(1, r));
            rgba[i + 1] = max(0, 255 * min(1, g));
            rgba[i + 2] = max(0, 255 * min(1, b));
            rgba[i + 3] = max(0, 255 * min(1, a));
        }
    }
    return { w, h, rgba };
}

/**
 * Encodes an RGBA pixel buffer (<= 100x100) into an uncompressed PNG `data:image/png;base64,...` URL.
 */
export function rgbaToDataURL(w: number, h: number, rgba: ArrayLike<number>): string {
    const row = w * 4 + 1;
    const idat = 6 + h * (5 + row);
    const bytes = [
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0,
        w >> 8, w & 255, 0, 0, h >> 8, h & 255, 8, 6, 0, 0, 0, 0, 0, 0, 0,
        idat >>> 24, (idat >> 16) & 255, (idat >> 8) & 255, idat & 255,
        73, 68, 65, 84, 120, 1,
    ];
    const table = [
        0, 498536548, 997073096, 651767980, 1994146192, 1802195444, 1303535960,
        1342533948, -306674912, -267414716, -690576408, -882789492, -1687895376,
        -1732555268, -1209088432, -1404237640,
    ];
    let a = 1,
        b = 0;
    for (let y = 0, i = 0, end = row - 1; y < h; y++, end += row - 1) {
        bytes.push(y + 1 < h ? 0 : 1, row & 255, row >> 8, ~row & 255, (row >> 8) ^ 255, 0);
        for (b = (b + a) % 65521; i < end; i++) {
            const u = rgba[i] & 255;
            bytes.push(u);
            a = (a + u) % 65521;
            b = (b + a) % 65521;
        }
    }
    bytes.push(b >> 8, b & 255, a >> 8, a & 255, 0, 0, 0, 0, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130);
    for (const [start, end] of [[12, 29], [37, 41 + idat]]) {
        let c = ~0;
        for (let i = start; i < end; i++) {
            c ^= bytes[i];
            c = (c >>> 4) ^ table[c & 15];
            c = (c >>> 4) ^ table[c & 15];
        }
        c = ~c;
        bytes[end] = c >>> 24;
        bytes[end + 1] = (c >> 16) & 255;
        bytes[end + 2] = (c >> 8) & 255;
        bytes[end + 3] = c & 255;
    }
    return 'data:image/png;base64,' + uint8ToBase64(new Uint8Array(bytes));
}

const decodedHashCache = new Map<string, string>();
const MAX_DECODED_HASH_CACHE = 500;

export function thumbHashToDataURL(hashOrBase64: ArrayLike<number> | string): string {
    if (typeof hashOrBase64 === 'string') {
        const key = hashOrBase64.trim();
        const cached = decodedHashCache.get(key);
        if (cached) return cached;
        const hashBytes = base64ToUint8(key);
        if (hashBytes.length < 5) return '';
        const { w, h, rgba } = thumbHashToRGBA(hashBytes);
        const url = rgbaToDataURL(w, h, rgba);
        if (decodedHashCache.size >= MAX_DECODED_HASH_CACHE) {
            const firstKey = decodedHashCache.keys().next().value;
            if (firstKey !== undefined) decodedHashCache.delete(firstKey);
        }
        decodedHashCache.set(key, url);
        return url;
    }
    if (hashOrBase64.length < 5) return '';
    const { w, h, rgba } = thumbHashToRGBA(hashOrBase64);
    return rgbaToDataURL(w, h, rgba);
}

/**
 * Resolves any placeholder string into an `<img src>` URL:
 * - Standard URL paths (`/photos/...`, `https://...`) pass through `withBuild(placeholder)`
 * - Data/blob URLs (`data:image/...`, `blob:...`) pass through unchanged
 * - Base64 ThumbHash strings (~28 bytes binary / ~36-40 chars base64) decode to a cached PNG data URL
 */
export function resolvePlaceholderSrc(placeholder?: string | null): string | null {
    if (!placeholder) return null;
    const trimmed = placeholder.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
        return trimmed;
    }
    if (trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed) || /\.(jpe?g|png|webp|avif|gif|svg)(\?|$)/i.test(trimmed)) {
        return withBuild(trimmed);
    }
    try {
        const url = thumbHashToDataURL(trimmed);
        return url || null;
    } catch {
        return withBuild(trimmed);
    }
}
