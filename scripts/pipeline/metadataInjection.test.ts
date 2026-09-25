import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import exifr from 'exifr';
import {
    buildXmpPacket,
    buildExifTags,
    applyPhotoMetadata,
    getResolvedMetadata,
} from './metadataInjection';

describe('metadataInjection', () => {
    const expectedDefaultCreator = process.env.VITE_COPYRIGHT_NAME || 'Michael Perkins';

    describe('getResolvedMetadata', () => {
        it('uses default values when no options are provided', () => {
            const meta = getResolvedMetadata({ year: 2026 });
            expect(meta.creator).toBe(expectedDefaultCreator);
            expect(meta.siteUrl).toBe('https://photosbyperkins.com');
            expect(meta.licenseUrl).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
            expect(meta.copyrightNotice).toBe(
                `Copyright (c) 2026 ${expectedDefaultCreator}. All rights reserved. Licensed under CC BY-SA 4.0.`
            );
            expect(meta.attributionText).toBe(`Photo by ${expectedDefaultCreator} / photosbyperkins.com (CC BY-SA 4.0)`);
        });

        it('overrides values when custom options are supplied', () => {
            const meta = getResolvedMetadata({
                year: '2024',
                creator: 'Jane Doe',
                siteUrl: 'https://example.com',
                licenseUrl: 'https://example.com/license',
                title: 'Championship Bout',
            });
            expect(meta.creator).toBe('Jane Doe');
            expect(meta.copyrightNotice).toBe(
                'Copyright (c) 2024 Jane Doe. All rights reserved. Licensed under CC BY-SA 4.0.'
            );
            expect(meta.attributionText).toBe(
                'Championship Bout - Photo by Jane Doe / photosbyperkins.com (CC BY-SA 4.0)'
            );
        });
    });

    describe('buildXmpPacket', () => {
        it('generates well-formed XMP packet with Dublin Core, CC, and Photoshop tags', () => {
            const xmp = buildXmpPacket({ year: 2026, creator: 'Michael Perkins' });
            expect(xmp).toContain('<x:xmpmeta');
            expect(xmp).toContain('<dc:creator>');
            expect(xmp).toContain('<rdf:li>Michael Perkins</rdf:li>');
            expect(xmp).toContain('<xmpRights:WebStatement>https://creativecommons.org/licenses/by-sa/4.0/</xmpRights:WebStatement>');
            expect(xmp).toContain('<cc:license>https://creativecommons.org/licenses/by-sa/4.0/</cc:license>');
            expect(xmp).toContain('<photoshop:Source>https://photosbyperkins.com</photoshop:Source>');
            expect(xmp).toContain('<?xpacket end="w"?>');
        });
    });

    describe('buildExifTags', () => {
        it('constructs IFD0 tags for Artist, Copyright, and ImageDescription', () => {
            const exif = buildExifTags({ year: 2025, creator: 'Michael Perkins' });
            expect(exif.IFD0).toBeDefined();
            expect(exif.IFD0.Artist).toBe('Michael Perkins');
            expect(exif.IFD0.Copyright).toContain('2025');
            expect(exif.IFD0.ImageDescription).toContain('Michael Perkins');
        });
    });

    describe('applyPhotoMetadata integration with Sharp & exifr', () => {
        it('injects EXIF, IPTC, and XMP into JPEG buffer while preserving existing EXIF tags', async () => {
            const initialExif = {
                IFD0: {
                    Make: 'Olympus',
                    Model: 'OM-D E-M1',
                },
            };
            const baseBuf = await sharp({
                create: {
                    width: 50,
                    height: 50,
                    channels: 3,
                    background: { r: 100, g: 150, b: 200 },
                },
            })
                .withExif(initialExif)
                .jpeg()
                .toBuffer();

            const pipeline = sharp(baseBuf);
            const injectedBuf = await applyPhotoMetadata(pipeline, { year: 2026, creator: 'Michael Perkins' })
                .jpeg({ quality: 85 })
                .toBuffer();

            const parsed = await exifr.parse(injectedBuf, { tiff: true, exif: true, iptc: true, xmp: true });
            expect(parsed).toBeDefined();
            // Preserved camera EXIF
            expect(parsed?.Make).toBe('Olympus');
            expect(parsed?.Model).toBe('OM-D E-M1');
            // Injected EXIF
            expect(parsed?.Artist).toBe('Michael Perkins');
            expect(parsed?.Copyright).toContain('2026');
            // Injected XMP / IPTC
            expect(parsed?.Credit).toBe('Michael Perkins');
            expect(parsed?.Source).toBe('https://photosbyperkins.com');
            expect(parsed?.WebStatement).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
        });

        it('injects EXIF and XMP into AVIF format', async () => {
            const baseBuf = await sharp({
                create: {
                    width: 50,
                    height: 50,
                    channels: 3,
                    background: { r: 10, g: 20, b: 30 },
                },
            })
                .png()
                .toBuffer();

            const pipeline = sharp(baseBuf);
            const avifBuf = await applyPhotoMetadata(pipeline, { year: 2026, creator: 'Michael Perkins' })
                .avif({ quality: 50 })
                .toBuffer();

            const meta = await sharp(avifBuf).metadata();
            expect(meta.exif).toBeDefined();
            expect(meta.xmp).toBeDefined();
            const xmpStr = meta.xmp!.toString('utf8');
            expect(xmpStr).toContain('Michael Perkins');
            expect(xmpStr).toContain('https://creativecommons.org/licenses/by-sa/4.0/');
        });
    });
});
