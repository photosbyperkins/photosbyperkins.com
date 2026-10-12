import { describe, it, expect } from 'vitest';
import {
    DATA_FORMAT_VERSION,
    decodeAlbum,
    decodeEvent,
    decodeEventChunk,
    encodeAlbum,
    encodeEvent,
    type AlbumWire,
} from './dataCodec';
import type { BurstMetadata, EventData, PhotoRecord } from '../types';

const Y = '2025';
const S = '1108-team-a-vs-team-b';
const orig = (stem: string) => `/photos/${Y}/${S}/${stem}.jpg`;
const thumb = (stem: string) => `/thumbnails/${Y}/${S}/${stem}.avif`;
const exifA = { cameraModel: 'NIKON ℤ8', lens: 'F 120-300mm f/2.8', focalLength: '120mm', aperture: 'f/2.8', shutterSpeed: '1/1000s', iso: 'ISO 6400', isPrime: false, gearLensId: 'nikon-120-300mm' };
const exifB = { cameraModel: 'NIKON ℤ8', lens: 'ℤ 35mm f/1.2 S', focalLength: '35mm', aperture: 'f/2.8', shutterSpeed: '1/1000s', iso: 'ISO 3200', isPrime: true };

function photo(n: number, i: number, extra: Partial<PhotoRecord> = {}): PhotoRecord {
    const stem = `photo_${String(n).padStart(3, '0')}`;
    return { original: orig(stem), thumb: thumb(stem), width: 3072, height: 2048, spriteIndex: i, scrubberHash: 'abc123def0', ...extra };
}

function sampleAlbum(): PhotoRecord[] {
    const album: PhotoRecord[] = [
        photo(1, 0, { exif: exifA, focusX: 0.363, focusY: 0.208, focusSource: 'face', faces: [{ x: 0.363, y: 0.301, w: 0.102, h: 0.186 }], subjects: [{ x: 0.488, y: 0.567, w: 0.416, h: 0.806 }] }),
        photo(2, 1, { exif: exifA, focusX: 0.5, focusY: 0.4, focusSource: 'person' }),
        photo(3, 2, { exif: exifB, width: 2048, height: 1367 }),
        // Masonry reordering moves later photos out of numeric order.
        photo(7, 3, { exif: exifB, focusX: 0.25, focusY: 0.75, focusSource: 'saliency' }),
        { original: orig('highlight_001'), thumb: thumb('highlight_001'), width: 3072, height: 2048, spriteIndex: 4, scrubberHash: 'abc123def0' },
    ];
    // Burst of photos 2 and 3 with stale (null) frame focus, as the pipeline produces today.
    const burst = (index: number): BurstMetadata => ({
        id: `${S}-burst-4`,
        index,
        total: 2,
        deltaSec: [0, 0.42][index],
        frameSources: [album[1].original, album[2].original],
        frameThumbs: [album[1].thumb, album[2].thumb],
        frameDeltas: [0, 0.42],
        frameFocusX: [undefined, undefined],
        frameFocusY: [undefined, undefined],
        isDuet: true,
    });
    album[1].burst = burst(0);
    album[2].burst = burst(1);
    return album;
}

const roundTrip = (album: PhotoRecord[]) => decodeAlbum(JSON.parse(JSON.stringify(encodeAlbum(Y, S, album))));

describe('dataCodec albums', () => {
    it('round-trips paths, dimensions, sprite indices, scrubber hash and EXIF exactly', () => {
        const album = sampleAlbum();
        const out = roundTrip(album);
        expect(out).toHaveLength(album.length);
        out.forEach((p, i) => {
            expect(p.original).toBe(album[i].original);
            expect(p.thumb).toBe(album[i].thumb);
            expect(p.width).toBe(album[i].width);
            expect(p.height).toBe(album[i].height);
            expect(p.spriteIndex).toBe(i);
            expect(p.scrubberHash).toBe('abc123def0');
            expect(p.exif).toEqual(album[i].exif);
            expect(p.focusSource).toBe(album[i].focusSource);
        });
    });

    it('quantizes coordinates to hundredths (within ±0.005)', () => {
        const [first] = roundTrip(sampleAlbum());
        expect(first.focusX).toBe(0.36);
        expect(first.focusY).toBe(0.21);
        expect(first.faces).toEqual([{ x: 0.36, y: 0.3, w: 0.1, h: 0.19 }]);
        expect(first.subjects).toEqual([{ x: 0.49, y: 0.57, w: 0.42, h: 0.81 }]);
    });

    it('stores only what cannot be derived', () => {
        const wire = encodeAlbum(Y, S, sampleAlbum());
        expect(wire.v).toBe(DATA_FORMAT_VERSION);
        expect(wire.h).toBe('abc123def0');
        expect(wire.d).toEqual([3072, 2048]);
        expect(wire.x).toHaveLength(2); // EXIF de-duplicated
        expect(wire.p[0].n).toBeUndefined(); // photo_001 at index 0 is the default
        expect(wire.p[3].n).toBe(7); // reordered
        expect(wire.p[4].n).toBe('highlight_001'); // non-numeric stem
        expect(wire.p[2].wh).toEqual([2048, 1367]); // differs from album default
        expect(wire.p[0].wh).toBeUndefined();
        const json = JSON.stringify(wire);
        expect(json).not.toContain('/photos/');
        expect(json).not.toContain('spriteIndex');
    });

    it('never ships the pipeline-only source path', () => {
        const album = sampleAlbum().map((p) => ({ ...p, source: '/photos/2025/11_08 Raw Folder/20251108_190613.jpg' }));
        const json = JSON.stringify(encodeAlbum(Y, S, album as PhotoRecord[]));
        expect(json).not.toContain('Raw Folder');
        expect(roundTrip(album as PhotoRecord[]).some((p) => 'source' in p)).toBe(false);
    });

    it('falls back to raw paths when they do not follow the naming convention', () => {
        const album = [{ ...photo(1, 0), original: '/legacy/odd.jpg', thumb: '/legacy/odd-thumb.avif' }];
        const wire = encodeAlbum(Y, S, album);
        expect(wire.p[0].o).toBe('/legacy/odd.jpg');
        const [out] = decodeAlbum(wire);
        expect(out.original).toBe('/legacy/odd.jpg');
        expect(out.thumb).toBe('/legacy/odd-thumb.avif');
    });

    it('gives each photo its own EXIF object so mutations do not leak across photos', () => {
        const out = roundTrip(sampleAlbum());
        expect(out[0].exif).toEqual(out[1].exif);
        expect(out[0].exif).not.toBe(out[1].exif);
    });

    it('compacts bursts to album indices and rebuilds frame metadata from the referenced photos', () => {
        const album = sampleAlbum();
        const wire = encodeAlbum(Y, S, album);
        expect(wire.p[1].b).toEqual({ k: 4, i: 0, fr: [1, 2], dt: [0, 0.42] });
        expect(wire.p[1].rb).toBeUndefined();

        const out = decodeAlbum(JSON.parse(JSON.stringify(wire)));
        const b = out[2].burst!;
        expect(b.id).toBe(`${S}-burst-4`);
        expect(b.index).toBe(1);
        expect(b.total).toBe(2);
        expect(b.deltaSec).toBe(0.42);
        expect(b.isDuet).toBe(true);
        expect(b.frameSources).toEqual([album[1].original, album[2].original]);
        expect(b.frameThumbs).toEqual([album[1].thumb, album[2].thumb]);
        expect(b.frameDeltas).toEqual([0, 0.42]);
        // Previously-stale focus points are now filled from the frames themselves.
        expect(b.frameFocusX).toEqual([0.5, undefined]);
        expect(b.frameFocusY).toEqual([0.4, undefined]);
        expect(b.frameWidths).toEqual([3072, 2048]);
        expect(b.frameHeights).toEqual([2048, 1367]);
    });

    it('keeps bursts it cannot express compactly as raw metadata', () => {
        const album = sampleAlbum();
        album[1].burst = { ...album[1].burst!, isTriptych: true };
        const wire = encodeAlbum(Y, S, album);
        expect(wire.p[1].b).toBeUndefined();
        expect(wire.p[1].rb).toEqual(album[1].burst);
        expect(decodeAlbum(wire)[1].burst).toEqual(album[1].burst);
    });

    it('fails loudly on unknown photo fields so new data is never silently dropped', () => {
        const album = [{ ...photo(1, 0), brandNewField: 1 } as PhotoRecord];
        expect(() => encodeAlbum(Y, S, album)).toThrow(/unsupported album photo field "brandNewField"/);
    });

    it('rejects sprite indices that do not match array positions', () => {
        expect(() => encodeAlbum(Y, S, [photo(1, 5)])).toThrow(/spriteIndex/);
    });

    it('passes legacy (v1) array payloads through untouched', () => {
        const legacy = sampleAlbum();
        expect(decodeAlbum(legacy)).toBe(legacy);
    });

    it('throws on unrecognised payloads', () => {
        expect(() => decodeAlbum({ v: 99 })).toThrow(/unrecognised album payload/);
        expect(() => decodeAlbum(null)).toThrow();
    });

    it('handles empty albums', () => {
        const wire: AlbumWire = encodeAlbum(Y, S, []);
        expect(decodeAlbum(wire)).toEqual([]);
    });
});

describe('dataCodec event chunks', () => {
    const event = {
        album: [],
        highlights: [
            { original: orig('photo_057'), thumb: thumb('photo_057'), focusX: 0.525, focusY: 0.363, faces: [{ x: 0.525, y: 0.424, w: 0.067, h: 0.122 }] },
            { original: orig('highlight_002'), thumb: thumb('highlight_002') },
        ],
        date: null,
        description: null,
        zip: '/zips/2025_11_08_Team_A_vs_Team_B.zip',
        photoCount: 287,
        albumSlug: S,
        originalYear: Y,
        maxExifChars: 34,
        scrubberHash: 'abc123def0',
        localScore: { team1Score: 210, team2Score: 180 },
        wftdaRankings: { 'Team A': { rank: 12 } },
        earliestTime: 1762650000000,
        hero: { src: '/x.jpg' },
    };

    it('drops unused fields and compacts highlights', () => {
        const wire = encodeEvent(event);
        expect(wire).not.toHaveProperty('wftdaRankings');
        expect(wire).not.toHaveProperty('earliestTime');
        expect(wire).not.toHaveProperty('hero');
        expect(wire).not.toHaveProperty('album');
        expect(wire).not.toHaveProperty('highlights');
        expect(wire.hl).toEqual([{ n: 57, f: [53, 36], fb: [53, 42, 7, 12] }, { n: 'highlight_002' }]);
    });

    it('round-trips event metadata and highlights', () => {
        const out = decodeEvent(JSON.parse(JSON.stringify(encodeEvent(event))));
        expect(out.album).toEqual([]);
        expect(out.zip).toBe(event.zip);
        expect(out.localScore).toEqual(event.localScore);
        expect(out.photoCount).toBe(287);
        expect(out.highlights).toEqual([
            { original: orig('photo_057'), thumb: thumb('photo_057'), focusX: 0.53, focusY: 0.36, faces: [{ x: 0.53, y: 0.42, w: 0.07, h: 0.12 }] },
            { original: orig('highlight_002'), thumb: thumb('highlight_002') },
        ]);
    });

    it('decodes events without highlights to an empty list', () => {
        const out = decodeEvent(encodeEvent({ ...event, highlights: [] }));
        expect(out.highlights).toEqual([]);
    });

    it('refuses to encode events that still carry album photos', () => {
        expect(() => encodeEvent({ ...event, album: [photo(1, 0)] })).toThrow(/still contains album photos/);
    });

    it('decodes versioned chunk payloads and leaves other top-level fields intact', () => {
        const payload = { v: DATA_FORMAT_VERSION, events: { 'Bout A': encodeEvent(event) }, nextPart: '2025_part2', recapCount: 3 };
        const out = decodeEventChunk(JSON.parse(JSON.stringify(payload)));
        expect(out.nextPart).toBe('2025_part2');
        expect(out.recapCount).toBe(3);
        const ev = out.events['Bout A'] as EventData;
        expect(ev.highlights[0]).toMatchObject({ original: orig('photo_057') });
        expect(ev.album).toEqual([]);
    });

    it('passes legacy (unversioned) chunk payloads through untouched', () => {
        const legacy = { events: { 'Bout A': { ...event } }, recapCount: 0 };
        expect(decodeEventChunk(legacy)).toBe(legacy);
    });
});
