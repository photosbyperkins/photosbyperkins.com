import { describe, it, expect } from 'vitest';
import { GEAR_REGISTRY, getGearItem } from './gearData';

describe('gearData registry', () => {
    it('should have valid registry entries for all 8 cameras and 17 lenses', () => {
        const cameras = Object.values(GEAR_REGISTRY).filter((g) => g.type === 'camera');
        const lenses = Object.values(GEAR_REGISTRY).filter((g) => g.type === 'lens');

        expect(cameras.length).toBe(8);
        expect(lenses.length).toBe(17);
        expect(Object.keys(GEAR_REGISTRY).length).toBe(25);

        // Core cameras
        expect(GEAR_REGISTRY['nikon-z8']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-d850']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-d750']).toBeDefined();
        expect(GEAR_REGISTRY['panasonic-gh4']).toBeDefined();
        expect(GEAR_REGISTRY['olympus-em5-ii']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-z6-ii']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-z5-ii']).toBeDefined();
        expect(GEAR_REGISTRY['olympus-em5']).toBeDefined();

        // Core lenses
        expect(GEAR_REGISTRY['nikon-120-300mm']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-135mm-plena']).toBeDefined();
        expect(GEAR_REGISTRY['sigma-135mm-art']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-35mm-12s']).toBeDefined();
        expect(GEAR_REGISTRY['sigma-35mm-art']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-85mm-12s']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-85mm-18g']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-50mm-12s']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-24-70mm-28s']).toBeDefined();
        expect(GEAR_REGISTRY['sigma-50mm-art']).toBeDefined();
        expect(GEAR_REGISTRY['panasonic-42-5mm']).toBeDefined();
        expect(GEAR_REGISTRY['sigma-85mm-art']).toBeDefined();
        expect(GEAR_REGISTRY['olympus-75mm-18']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-300mm-pf']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-40mm-2']).toBeDefined();
        expect(GEAR_REGISTRY['olympus-12-40mm-pro']).toBeDefined();
        expect(GEAR_REGISTRY['olympus-40-150mm-pro']).toBeDefined();
    });

    it('should be consistent about displaying the stylized ℤ for all Nikon Z Systems camera and lenses', () => {
        const nikonZItems = [
            'nikon-z8',
            'nikon-z6-ii',
            'nikon-z5-ii',
            'nikon-135mm-plena',
            'nikon-35mm-12s',
            'nikon-85mm-12s',
            'nikon-50mm-12s',
            'nikon-24-70mm-28s',
            'nikon-40mm-2',
        ];

        for (const id of nikonZItems) {
            const item = GEAR_REGISTRY[id];
            expect(item).toBeDefined();
            // Verify stylized ℤ in name, shortName, compactName, modalTitle, and specs
            expect(item.name).toContain('ℤ');
            expect(item.shortName).toContain('ℤ');
            expect(item.compactName).toContain('ℤ');
            expect(item.modalTitle).toContain('ℤ');
            expect(item.specs.Mount).toContain('ℤ');
        }

        // Verify that F-mount lenses adapted to ℤ mention ℤ
        expect(GEAR_REGISTRY['nikon-120-300mm'].specs.Mount).toContain('ℤ');
        expect(GEAR_REGISTRY['sigma-35mm-art'].specs.Mount).toContain('ℤ');
    });

    it('should have valid manufacturer URLs and specs on every gear item', () => {
        for (const [id, item] of Object.entries(GEAR_REGISTRY)) {
            expect(item.id).toBe(id);
            expect(item.name.length).toBeGreaterThan(0);
            expect(item.compactName.length).toBeGreaterThan(0);
            expect(item.compactName.length).toBeLessThanOrEqual(25);
            expect(item.officialUrl).toMatch(
                /^https:\/\/(www\.)?(nikonusa\.com|sigmaphoto\.com|shop\.panasonic\.com|explore\.omsystem\.com)/
            );
            expect(Object.keys(item.specs).length).toBeGreaterThanOrEqual(3);
        }
    });

    it('should resolve all cameras correctly by name or id', () => {
        expect(getGearItem('nikon-z8')?.id).toBe('nikon-z8');
        expect(getGearItem('NIKON ℤ8', null, 'camera')?.id).toBe('nikon-z8');
        expect(getGearItem('NIKON D850', null, 'camera')?.id).toBe('nikon-d850');
        expect(getGearItem('NIKON D750', null, 'camera')?.id).toBe('nikon-d750');
        expect(getGearItem('DMC-GH4', null, 'camera')?.id).toBe('panasonic-gh4');
        expect(getGearItem('NIKON ℤ5_2', null, 'camera')?.id).toBe('nikon-z5-ii');
        expect(getGearItem('NIKON ℤ6_2', null, 'camera')?.id).toBe('nikon-z6-ii');
        expect(getGearItem('E-M5MarkII', null, 'camera')?.id).toBe('olympus-em5-ii');
        expect(getGearItem('E-M5', null, 'camera')?.id).toBe('olympus-em5');
    });

    it('should resolve all lenses correctly by name, EXIF string, or id', () => {
        expect(getGearItem('ℤ 135mm f/1.8 S Plena')?.id).toBe('nikon-135mm-plena');
        expect(getGearItem('F 120-300mm f/2.8')?.id).toBe('nikon-120-300mm');
        expect(getGearItem('135mm f/1.8')?.id).toBe('sigma-135mm-art');
        expect(getGearItem('ℤ 35mm f/1.2 S')?.id).toBe('nikon-35mm-12s');
        expect(getGearItem('35mm f/1.4')?.id).toBe('sigma-35mm-art');
        expect(getGearItem('F 35mm f/1.4')?.id).toBe('sigma-35mm-art');
        expect(getGearItem('ℤ 85mm f/1.2 S')?.id).toBe('nikon-85mm-12s');
        expect(getGearItem('85mm f/1.8')?.id).toBe('nikon-85mm-18g');
        expect(getGearItem('ℤ 50mm f/1.2 S')?.id).toBe('nikon-50mm-12s');
        expect(getGearItem('ℤ 24-70mm f/2.8 S')?.id).toBe('nikon-24-70mm-28s');
        expect(getGearItem('50mm f/1.4')?.id).toBe('sigma-50mm-art');
        expect(getGearItem('42.5/F1.2')?.id).toBe('panasonic-42-5mm');
        expect(getGearItem('85mm f/1.4')?.id).toBe('sigma-85mm-art');
        expect(getGearItem('75mm F1.8')?.id).toBe('olympus-75mm-18');
        expect(getGearItem('Nikon 300mm f/4 PF')?.id).toBe('nikon-300mm-pf');
        expect(getGearItem('12-40mm F2.8')?.id).toBe('olympus-12-40mm-pro');
        expect(getGearItem('40-150mm F2.8')?.id).toBe('olympus-40-150mm-pro');
        expect(getGearItem('ℤ 40mm f/2')?.id).toBe('nikon-40mm-2');
    });

    it('should return null for undefined or empty inputs', () => {
        expect(getGearItem(null)).toBeNull();
        expect(getGearItem(undefined)).toBeNull();
        expect(getGearItem('')).toBeNull();
    });

    it('should correctly match photo EXIF metadata across all camera and lens types', () => {
        const testPhotos: Array<{
            exif: { cameraModel?: string; lens?: string; gearLensId?: string };
            expectedCamera: string;
            expectedLens: string;
        }> = [
            {
                exif: { cameraModel: 'NIKON ℤ8', lens: 'ℤ 135mm f/1.8 S Plena' },
                expectedCamera: 'nikon-z8',
                expectedLens: 'nikon-135mm-plena',
            },
            {
                exif: { cameraModel: 'NIKON D850', lens: '135mm f/1.8' },
                expectedCamera: 'nikon-d850',
                expectedLens: 'sigma-135mm-art',
            },
            {
                exif: { cameraModel: 'NIKON D750', lens: '85mm f/1.8' },
                expectedCamera: 'nikon-d750',
                expectedLens: 'nikon-85mm-18g',
            },
            {
                exif: { cameraModel: 'NIKON ℤ8', gearLensId: 'nikon-120-300mm', lens: 'F 120-300mm f/2.8' },
                expectedCamera: 'nikon-z8',
                expectedLens: 'nikon-120-300mm',
            },
            {
                exif: { cameraModel: 'DMC-GH4', lens: '42.5/F1.2' },
                expectedCamera: 'panasonic-gh4',
                expectedLens: 'panasonic-42-5mm',
            },
            {
                exif: { cameraModel: 'E-M5MarkII', lens: '75mm F1.8' },
                expectedCamera: 'olympus-em5-ii',
                expectedLens: 'olympus-75mm-18',
            },
            {
                exif: { cameraModel: 'NIKON ℤ5_2', lens: 'ℤ 35mm f/1.2 S' },
                expectedCamera: 'nikon-z5-ii',
                expectedLens: 'nikon-35mm-12s',
            },
            {
                exif: { cameraModel: 'NIKON ℤ6_2', lens: 'ℤ 40mm f/2' },
                expectedCamera: 'nikon-z6-ii',
                expectedLens: 'nikon-40mm-2',
            },
        ];

        for (const tp of testPhotos) {
            const cam = getGearItem(tp.exif.cameraModel, null, 'camera');
            expect(cam?.id).toBe(tp.expectedCamera);

            const lens = getGearItem(tp.exif.gearLensId || tp.exif.lens, null, 'lens');
            expect(lens?.id).toBe(tp.expectedLens);
        }
    });
});
