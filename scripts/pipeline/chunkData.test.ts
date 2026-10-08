import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
    slugify,
    sortTaggedEvents,
    writeChunkedFile,
    generateRecapImages,
    toClientPhoto,
} from './chunkData';

describe('chunkData pipeline helpers', () => {
    describe('slugify', () => {
        it('normalizes strings to url-friendly slugs', () => {
            expect(slugify('Sacramento Roller Derby vs Bay Area')).toBe('sacramento-roller-derby-vs-bay-area');
            expect(slugify('  2024.10.15 - Championship!  ')).toBe('20241015-championship');
            expect(slugify('Multiple---Dashes   & Spaces')).toBe('multiple-dashes-spaces');
        });
    });

    describe('sortTaggedEvents', () => {
        it('sorts events in reverse chronological order across years and dates', () => {
            const events = {
                '[2023] 04.15 Spring Bout': { earliestTime: 100 },
                '[2024] 10.22 Fall Championship': { earliestTime: 200 },
                '[2024] 03.10 Season Opener': { earliestTime: 300 },
                '[2024] 10.22 Evening Match': { earliestTime: 500 },
            };

            const sorted = sortTaggedEvents(events);
            const keys = Object.keys(sorted);

            expect(keys).toEqual([
                '[2024] 10.22 Evening Match', // Later time on 10.22
                '[2024] 10.22 Fall Championship',
                '[2024] 03.10 Season Opener',
                '[2023] 04.15 Spring Bout',
            ]);
        });
    });

    describe('writeChunkedFile', () => {
        let tempDir: string;

        beforeEach(() => {
            tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chunkdata-test-'));
        });

        afterEach(() => {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        });

        it('writes a single file for empty events', () => {
            const written = writeChunkedFile(tempDir, 'empty', {}, { stats: { total: 0 } }, 10);
            expect(written).toHaveLength(1);
            expect(written[0]).toBe(path.join(tempDir, 'empty.json'));

            const content = JSON.parse(fs.readFileSync(written[0], 'utf8'));
            expect(content).toEqual({
                events: {},
                stats: { total: 0 },
            });
        });

        it('writes a single file when events count is <= chunkSize', () => {
            const events = {
                event1: { name: 'E1' },
                event2: { name: 'E2' },
            };

            const written = writeChunkedFile(tempDir, 'small', events, { total: 2 }, 5);
            expect(written).toHaveLength(1);

            const content = JSON.parse(fs.readFileSync(written[0], 'utf8'));
            expect(content.events).toEqual(events);
            expect(content.total).toBe(2);
            expect(content.nextPart).toBeUndefined();
        });

        it('splits events into multiple linked chunks when count exceeds chunkSize', () => {
            const events = {
                e1: { name: 'E1' },
                e2: { name: 'E2' },
                e3: { name: 'E3' },
                e4: { name: 'E4' },
                e5: { name: 'E5' },
            };

            const written = writeChunkedFile(tempDir, 'split', events, { extraInfo: 'firstOnly' }, 2);
            expect(written).toHaveLength(3);

            // Part 1: split.json
            const part1 = JSON.parse(fs.readFileSync(path.join(tempDir, 'split.json'), 'utf8'));
            expect(Object.keys(part1.events)).toEqual(['e1', 'e2']);
            expect(part1.nextPart).toBe('split_part2');
            expect(part1.extraInfo).toBe('firstOnly');

            // Part 2: split_part2.json
            const part2 = JSON.parse(fs.readFileSync(path.join(tempDir, 'split_part2.json'), 'utf8'));
            expect(Object.keys(part2.events)).toEqual(['e3', 'e4']);
            expect(part2.nextPart).toBe('split_part3');
            expect(part2.extraInfo).toBeUndefined();

            // Part 3: split_part3.json
            const part3 = JSON.parse(fs.readFileSync(path.join(tempDir, 'split_part3.json'), 'utf8'));
            expect(Object.keys(part3.events)).toEqual(['e5']);
            expect(part3.nextPart).toBeUndefined();
        });
    });

    describe('generateRecapImages', () => {
        it('excludes headshots and collects unique photos sorted by date descending', () => {
            const events = {
                '10.22 Championship vs Bay Area': {
                    date: '2024-10-22',
                    recapImages: [
                        { src: '/photos/photo1.webp', recapScore: 10 },
                        { src: '/photos/photo2.webp', recapScore: 5 },
                    ],
                },
                'Headshots - Team A': {
                    date: '2024-10-20',
                    recapImages: [{ src: '/photos/headshot1.webp', recapScore: 100 }],
                },
                '03.15 Opener vs Roseville': {
                    date: '2024-03-15',
                    recapImages: [
                        { src: '/photos/photo3.webp', recapScore: 8 },
                        { src: '/photos/photo1.webp', recapScore: 7 }, // Duplicate src
                    ],
                },
            };

            const recaps = generateRecapImages(events);

            const srcs = recaps.map((r) => r.src);
            expect(srcs).toContain('/photos/photo1.webp');
            expect(srcs).toContain('/photos/photo3.webp');
            expect(srcs).not.toContain('/photos/headshot1.webp');
            // Duplicate src should only appear once
            expect(srcs.filter((s) => s === '/photos/photo1.webp')).toHaveLength(1);

            // Latest date first
            expect(recaps[0].date).toBe('2024-10-22');
        });
    });

    describe('toClientPhoto', () => {
        it('drops pipeline-only fields and keeps only the lead body box', () => {
            const face = (x: number) => ({ x, y: 0.2, w: 0.04, h: 0.05, confidence: 0.9 });
            const out = toClientPhoto({
                source: '/photos/a.jpg',
                original: '/a.avif',
                thumb: '/t/a.avif',
                focusX: 0.6,
                focusY: 0.175,
                focusSource: 'face',
                faceScore: 12.3,
                recapScore: 4.5,
                faces: [face(0.6), face(0.2), face(0.3), face(0.4), face(0.5)],
                subjects: [
                    { x: 0.2, y: 0.5, w: 0.1, h: 0.7, confidence: 0.9 },
                    { x: 0.6, y: 0.5, w: 0.12, h: 0.7, confidence: 0.8 },
                ],
            });
            expect(out).not.toHaveProperty('faceScore');
            expect(out).not.toHaveProperty('recapScore');
            expect(out.focusSource).toBe('face');
            expect(out.faces).toHaveLength(4);
            expect(out.faces?.[0]).toEqual({ x: 0.6, y: 0.2, w: 0.04, h: 0.05 });
            expect(out.subjects).toEqual([{ x: 0.6, y: 0.5, w: 0.12, h: 0.7 }]);
        });

        it('keeps the primary subject for person-only photos', () => {
            const out = toClientPhoto({
                source: '/photos/b.jpg',
                original: '/b.avif',
                thumb: '/t/b.avif',
                subjects: [
                    { x: 0.3, y: 0.5, w: 0.1, h: 0.7, confidence: 0.9 },
                    { x: 0.7, y: 0.5, w: 0.1, h: 0.7, confidence: 0.8 },
                ],
            });
            expect(out.faces).toBeUndefined();
            expect(out.subjects).toEqual([{ x: 0.3, y: 0.5, w: 0.1, h: 0.7 }]);
        });
    });
});
