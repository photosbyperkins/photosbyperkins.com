/**
 * Compact wire format (v2) for the static JSON payloads under `/data`.
 *
 * The build pipeline encodes; the client decodes back into the exact in-memory shapes
 * (`PhotoRecord`, `EventData`) the app already uses, so nothing downstream changes.
 *
 * What makes v2 small:
 * - Asset paths are rebuilt from `year + albumSlug + photo number` instead of being shipped.
 * - `spriteIndex` (always the array index) and the album-wide `scrubberHash` are not repeated per photo.
 * - EXIF blocks are de-duplicated into a per-album dictionary.
 * - The most common width/height pair is stored once per album.
 * - Normalised coordinates (focus, faces, subjects) ship as integer hundredths in flat arrays.
 * - Burst groups reference album indices; frame paths, focus points and dimensions are rebuilt
 *   from the referenced photos on decode.
 *
 * Legacy (v1) payloads pass through untouched so stale service-worker caches keep working.
 */
import type { BurstMetadata, EventData, ExifData, FaceBox, FocusSource, PhotoRecord } from '../types';

export const DATA_FORMAT_VERSION = 2;

/** Normalised 0–1 coordinates are shipped as integer hundredths (±0.005 precision). */
const COORD_SCALE = 100;
/** Sentinel for an absent optional number inside a flat numeric array. */
const ABSENT = -1;

// --- Wire types ---------------------------------------------------------------------------

/** Compact burst: `k` = burst number (or full id when non-standard), `fr` = album indices. */
export interface BurstWire {
    k: number | string;
    i: number;
    fr: number[];
    dt: number[];
    bf?: number;
}

export interface PhotoWire {
    /** Photo number when it differs from `index + 1`, or the raw filename stem when non-standard. */
    n?: number | string;
    /** Raw paths, only when they can't be derived from year/slug/stem. */
    o?: string;
    t?: string;
    /** `[width, height]` when it differs from the album default. */
    wh?: [number, number];
    /** Index into the album EXIF dictionary. */
    e?: number;
    /** Focus point `[x, y]` in hundredths. */
    f?: [number, number];
    fs?: FocusSourceCode;
    /** Faces / subjects as flat `[x, y, w, h, ...]` in hundredths. */
    fb?: number[];
    sb?: number[];
    /** Compact 28-byte binary ThumbHash placeholder (base64). */
    th?: string;
    b?: BurstWire;
    /** Raw burst metadata, only when it can't be expressed compactly. */
    rb?: BurstMetadata;
}

export interface AlbumWire {
    v: typeof DATA_FORMAT_VERSION;
    y: string;
    s: string;
    h?: string;
    d: [number, number];
    x?: ExifData[];
    p: PhotoWire[];
}

export interface HighlightWire {
    n?: number | string;
    o?: string;
    t?: string;
    wh?: [number, number];
    f?: [number, number];
    fb?: number[];
    th?: string;
}

/** Event metadata with `highlights` replaced by compact `hl` and the empty `album` omitted. */
export type EventWire = Omit<EventData, 'album' | 'highlights'> & { hl?: HighlightWire[] };

type FocusSourceCode = 'f' | 'p' | 's';
const FOCUS_SOURCE_TO_CODE: Record<FocusSource, FocusSourceCode> = { face: 'f', person: 'p', saliency: 's' };
const CODE_TO_FOCUS_SOURCE: Record<FocusSourceCode, FocusSource> = { f: 'face', p: 'person', s: 'saliency' };

// --- Shared helpers -----------------------------------------------------------------------

const photoStemForNumber = (n: number) => `photo_${String(n).padStart(3, '0')}`;
const originalPath = (year: string, slug: string, stem: string) => `/photos/${year}/${slug}/${stem}.jpg`;
const thumbPath = (year: string, slug: string, stem: string) => `/thumbnails/${year}/${slug}/${stem}.avif`;

const quantize = (v: number) => Math.round(v * COORD_SCALE);
const dequantize = (v: number) => v / COORD_SCALE;

function encodeBoxes(boxes: FaceBox[] | undefined): number[] | undefined {
    if (!boxes || boxes.length === 0) return undefined;
    return boxes.flatMap((b) => [quantize(b.x), quantize(b.y), b.w != null ? quantize(b.w) : ABSENT, b.h != null ? quantize(b.h) : ABSENT]);
}

function decodeBoxes(flat: number[] | undefined): FaceBox[] | undefined {
    if (!flat || flat.length === 0) return undefined;
    const out: FaceBox[] = [];
    for (let i = 0; i + 3 < flat.length; i += 4) {
        const box: FaceBox = { x: dequantize(flat[i]), y: dequantize(flat[i + 1]) };
        if (flat[i + 2] !== ABSENT) box.w = dequantize(flat[i + 2]);
        if (flat[i + 3] !== ABSENT) box.h = dequantize(flat[i + 3]);
        out.push(box);
    }
    return out;
}

/**
 * Resolves a stored photo reference (`n`, or raw `o`/`t`) into its asset paths.
 * Returns the derived reference to store, or raw paths when they don't follow the convention.
 */
function encodePathRef(
    year: string,
    slug: string,
    original: string,
    thumb: string,
    defaultNumber?: number
): Pick<PhotoWire, 'n' | 'o' | 't'> {
    const stem = original.split('/').pop()?.replace(/\.jpg$/, '') ?? '';
    if (stem && original === originalPath(year, slug, stem) && thumb === thumbPath(year, slug, stem)) {
        const m = stem.match(/^photo_(\d+)$/);
        const num = m ? Number(m[1]) : undefined;
        if (num !== undefined && photoStemForNumber(num) === stem) {
            return num === defaultNumber ? {} : { n: num };
        }
        return { n: stem };
    }
    return { o: original, t: thumb };
}

function decodePathRef(year: string, slug: string, ref: Pick<PhotoWire, 'n' | 'o' | 't'>, defaultNumber?: number) {
    if (ref.o !== undefined) return { original: ref.o, thumb: ref.t ?? ref.o };
    const n = ref.n ?? defaultNumber;
    const stem = typeof n === 'number' ? photoStemForNumber(n) : (n ?? '');
    return { original: originalPath(year, slug, stem), thumb: thumbPath(year, slug, stem) };
}

// --- Albums -------------------------------------------------------------------------------

/** Fields the album encoder understands. Anything else fails loudly so new fields aren't silently dropped. */
const ALBUM_PHOTO_FIELDS = new Set([
    'original',
    'thumb',
    'tiny',
    'th',
    'width',
    'height',
    'spriteIndex',
    'exif',
    'focusX',
    'focusY',
    'focusSource',
    'faces',
    'subjects',
    'scrubberHash',
    'burst',
    'bestInBurst',
    'qualityScore',
    // Pipeline-only: intentionally not shipped (leaks original filenames).
    'source',
]);

/** Burst fields that are either stored compactly or rebuilt from the referenced photos on decode. */
const COMPACT_BURST_FIELDS = new Set([
    'id',
    'index',
    'total',
    'deltaSec',
    'frameSources',
    'frameThumbs',
    'frameDeltas',
    'frameFocusX',
    'frameFocusY',
    'frameWidths',
    'frameHeights',
    'isDuet',
    'bestFrameIndex',
]);

function encodeBurst(burst: BurstMetadata, slug: string, indexByOriginal: Map<string, number>, album: PhotoRecord[]): Pick<PhotoWire, 'b' | 'rb'> {
    const fr = burst.frameSources.map((src) => indexByOriginal.get(src));
    const prefix = `${slug}-burst-`;
    const suffix = burst.id.startsWith(prefix) ? burst.id.slice(prefix.length) : undefined;
    const k: number | string = suffix !== undefined && /^\d+$/.test(suffix) ? Number(suffix) : burst.id;

    const compactable =
        Object.keys(burst).every((key) => COMPACT_BURST_FIELDS.has(key)) &&
        fr.every((j): j is number => j !== undefined) &&
        Array.isArray(burst.frameDeltas) &&
        burst.frameDeltas.length === fr.length &&
        burst.total === fr.length &&
        (burst.deltaSec ?? 0) === (burst.frameDeltas[burst.index] ?? 0) &&
        Boolean(burst.isDuet) === (fr.length === 2) &&
        (!burst.frameThumbs || burst.frameThumbs.every((t, j) => t === album[fr[j]!].thumb));

    if (!compactable) return { rb: burst };
    return {
        b: {
            k,
            i: burst.index,
            fr: fr as number[],
            dt: burst.frameDeltas!,
            ...(burst.bestFrameIndex !== undefined ? { bf: burst.bestFrameIndex } : {}),
        },
    };
}

function mostCommonDims(photos: PhotoRecord[]): [number, number] {
    const counts = new Map<string, number>();
    let best: [number, number] = [ABSENT, ABSENT];
    let bestCount = 0;
    for (const p of photos) {
        const key = `${p.width ?? ABSENT}x${p.height ?? ABSENT}`;
        const c = (counts.get(key) ?? 0) + 1;
        counts.set(key, c);
        if (c > bestCount) {
            bestCount = c;
            best = [p.width ?? ABSENT, p.height ?? ABSENT];
        }
    }
    return best;
}

/** Encodes a client album (already compacted by the pipeline) into the v2 wire format. */
export function encodeAlbum(year: string, slug: string, photos: PhotoRecord[]): AlbumWire {
    const dims = mostCommonDims(photos);
    const exifDict: ExifData[] = [];
    const exifIndex = new Map<string, number>();
    const indexByOriginal = new Map(photos.map((p, i) => [p.original, i]));
    const scrubberHash = photos.find((p) => p.scrubberHash)?.scrubberHash;

    const p = photos.map((photo, i): PhotoWire => {
        for (const key of Object.keys(photo)) {
            if (!ALBUM_PHOTO_FIELDS.has(key)) {
                throw new Error(`dataCodec: unsupported album photo field "${key}" in ${year}/${slug}. Update src/utils/dataCodec.ts.`);
            }
        }
        if (photo.spriteIndex !== undefined && photo.spriteIndex !== i) {
            throw new Error(`dataCodec: spriteIndex ${photo.spriteIndex} != array index ${i} in ${year}/${slug}.`);
        }
        if (photo.scrubberHash !== undefined && photo.scrubberHash !== scrubberHash) {
            throw new Error(`dataCodec: mixed scrubberHash values within ${year}/${slug}.`);
        }

        const w: PhotoWire = encodePathRef(year, slug, photo.original, photo.thumb, i + 1);
        const width = photo.width ?? ABSENT;
        const height = photo.height ?? ABSENT;
        if (width !== dims[0] || height !== dims[1]) w.wh = [width, height];
        if (photo.exif) {
            const key = JSON.stringify(photo.exif);
            let idx = exifIndex.get(key);
            if (idx === undefined) {
                idx = exifDict.length;
                exifIndex.set(key, idx);
                exifDict.push(photo.exif);
            }
            w.e = idx;
        }
        if (photo.focusX != null && photo.focusY != null) w.f = [quantize(photo.focusX), quantize(photo.focusY)];
        if (photo.focusSource) w.fs = FOCUS_SOURCE_TO_CODE[photo.focusSource];
        const fb = encodeBoxes(photo.faces);
        if (fb) w.fb = fb;
        const sb = encodeBoxes(photo.subjects);
        if (sb) w.sb = sb;
        const thVal = photo.th || (photo.tiny && !photo.tiny.startsWith('data:') && !photo.tiny.startsWith('/') ? photo.tiny : undefined);
        if (thVal) w.th = thVal;
        if (photo.burst) Object.assign(w, encodeBurst(photo.burst, slug, indexByOriginal, photos));
        return w;
    });

    return {
        v: DATA_FORMAT_VERSION,
        y: year,
        s: slug,
        ...(scrubberHash ? { h: scrubberHash } : {}),
        d: dims,
        ...(exifDict.length > 0 ? { x: exifDict } : {}),
        p,
    };
}

function isAlbumWire(json: unknown): json is AlbumWire {
    return typeof json === 'object' && json !== null && (json as AlbumWire).v === DATA_FORMAT_VERSION && Array.isArray((json as AlbumWire).p);
}

/** Decodes an album payload (v2 or legacy v1 array) into `PhotoRecord[]`. */
export function decodeAlbum(json: unknown): PhotoRecord[] {
    if (Array.isArray(json)) return json as PhotoRecord[];
    if (!isAlbumWire(json)) throw new Error('dataCodec: unrecognised album payload');

    const { y, s, h, d, x = [], p } = json;
    const photos = p.map((w, i): PhotoRecord => {
        const rec: PhotoRecord = { ...decodePathRef(y, s, w, i + 1) };
        const [width, height] = w.wh ?? d;
        if (width !== ABSENT) rec.width = width;
        if (height !== ABSENT) rec.height = height;
        rec.spriteIndex = i;
        if (w.e !== undefined && x[w.e]) rec.exif = { ...x[w.e] };
        if (w.f) {
            rec.focusX = dequantize(w.f[0]);
            rec.focusY = dequantize(w.f[1]);
        }
        if (w.fs) rec.focusSource = CODE_TO_FOCUS_SOURCE[w.fs];
        const faces = decodeBoxes(w.fb);
        if (faces) rec.faces = faces;
        const subjects = decodeBoxes(w.sb);
        if (subjects) rec.subjects = subjects;
        if (w.th) {
            rec.th = w.th;
            rec.tiny = w.th;
        }
        if (h) rec.scrubberHash = h;
        return rec;
    });

    // Second pass: bursts reference other photos in the album for paths, focus and dimensions.
    p.forEach((w, i) => {
        if (w.rb) {
            photos[i].burst = w.rb;
            return;
        }
        if (!w.b) return;
        const { k, i: index, fr, dt, bf } = w.b;
        const frames = fr.map((j) => photos[j]);
        const total = frames.length;
        photos[i].burst = {
            id: typeof k === 'number' ? `${s}-burst-${k}` : k,
            index,
            total,
            deltaSec: dt[index] ?? 0,
            frameSources: frames.map((f) => f.original),
            frameThumbs: frames.map((f) => f.thumb),
            frameDeltas: dt,
            frameFocusX: frames.map((f) => f.focusX),
            frameFocusY: frames.map((f) => f.focusY),
            frameWidths: frames.map((f) => f.width),
            frameHeights: frames.map((f) => f.height),
            ...(total === 2 ? { isDuet: true } : {}),
            ...(bf !== undefined ? { bestFrameIndex: bf } : {}),
        };
    });

    return photos;
}

// --- Event chunks (years / teams / gear) --------------------------------------------------

/** Pipeline-only or unused event fields that are never shipped to the client. */
const DROPPED_EVENT_FIELDS = new Set(['wftdaRankings', 'earliestTime', 'hero', 'recapImages', 'teams', 'isJuniorBout']);

interface HighlightInput {
    original?: string;
    thumb?: string;
    tiny?: string;
    th?: string;
    width?: number;
    height?: number;
    focusX?: number;
    focusY?: number;
    faces?: FaceBox[];
}

function encodeHighlight(h: HighlightInput, year: string | undefined, slug: string | undefined): HighlightWire {
    const original = h.original ?? '';
    const thumb = h.thumb ?? original;
    const w: HighlightWire = year && slug ? encodePathRef(year, slug, original, thumb) : { o: original, t: thumb };
    if (h.width && h.height) w.wh = [h.width, h.height];
    if (h.focusX != null && h.focusY != null) w.f = [quantize(h.focusX), quantize(h.focusY)];
    const fb = encodeBoxes(h.faces);
    if (fb) w.fb = fb;
    const thVal = h.th || (h.tiny && !h.tiny.startsWith('data:') && !h.tiny.startsWith('/') ? h.tiny : undefined);
    if (thVal) w.th = thVal;
    return w;
}

function decodeHighlight(w: HighlightWire, year: string | undefined, slug: string | undefined): PhotoRecord {
    const rec: PhotoRecord =
        year && slug && w.o === undefined ? decodePathRef(year, slug, w) : { original: w.o ?? '', thumb: w.t ?? w.o ?? '' };
    if (w.wh) {
        rec.width = w.wh[0];
        rec.height = w.wh[1];
    }
    if (w.f) {
        rec.focusX = dequantize(w.f[0]);
        rec.focusY = dequantize(w.f[1]);
    }
    const faces = decodeBoxes(w.fb);
    if (faces) rec.faces = faces;
    if (w.th) {
        rec.th = w.th;
        rec.tiny = w.th;
    }
    return rec;
}

/** Encodes one event's metadata for a year/team/gear chunk. */
export function encodeEvent(ev: Record<string, unknown>): EventWire {
    const out: Record<string, unknown> = {};
    const year = ev.originalYear as string | undefined;
    const slug = ev.albumSlug as string | undefined;
    for (const [key, value] of Object.entries(ev)) {
        if (DROPPED_EVENT_FIELDS.has(key) || value === undefined) continue;
        if (key === 'album') {
            if (Array.isArray(value) && value.length > 0) {
                throw new Error(`dataCodec: event chunk for ${year}/${slug} still contains album photos.`);
            }
            continue;
        }
        if (key === 'highlights') {
            const list = (value as HighlightInput[] | undefined) ?? [];
            if (list.length > 0) out.hl = list.map((h) => encodeHighlight(h, year, slug));
            continue;
        }
        out[key] = value;
    }
    return out as EventWire;
}

/** Decodes one event from a chunk. Legacy (v1) events are returned as-is. */
export function decodeEvent(ev: EventWire | EventData): EventData {
    if ('highlights' in ev && Array.isArray(ev.highlights)) return ev as EventData;
    const { hl, ...rest } = ev as EventWire;
    return {
        ...rest,
        album: [],
        highlights: (hl ?? []).map((h) => decodeHighlight(h, rest.originalYear, rest.albumSlug)),
    };
}

/** Decodes a year/team/gear chunk payload in place of `res.json()` output. */
export function decodeEventChunk<T extends { events?: Record<string, unknown>; v?: number }>(json: T): T {
    if (!json || json.v !== DATA_FORMAT_VERSION || !json.events) return json;
    const events: Record<string, EventData> = {};
    for (const [name, ev] of Object.entries(json.events)) {
        events[name] = decodeEvent(ev as EventWire);
    }
    return { ...json, events } as T;
}
