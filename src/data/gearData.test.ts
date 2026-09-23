import { describe, it, expect } from 'vitest';
import { GEAR_REGISTRY, getGearItem } from './gearData';

describe('gearData registry', () => {
    it('should have valid registry entries for all seasons', () => {
        expect(GEAR_REGISTRY['nikon-z8']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-d850']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-d750']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-120-300mm']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-135mm-plena']).toBeDefined();
        expect(GEAR_REGISTRY['sigma-135mm-art']).toBeDefined();
        expect(GEAR_REGISTRY['sigma-85mm-art']).toBeDefined();
        expect(GEAR_REGISTRY['sigma-50mm-art']).toBeDefined();
        expect(GEAR_REGISTRY['nikon-85mm-18g']).toBeDefined();
    });

    it('should have valid manufacturer URLs and specs on every gear item', () => {
        for (const [id, item] of Object.entries(GEAR_REGISTRY)) {
            expect(item.id).toBe(id);
            expect(item.name.length).toBeGreaterThan(0);
            expect(item.compactName.length).toBeGreaterThan(0);
            expect(item.compactName.length).toBeLessThanOrEqual(25);
            expect(item.officialUrl).toMatch(/^https:\/\/(www\.)?(nikonusa\.com|sigmaphoto\.com)/);
            expect(Object.keys(item.specs).length).toBeGreaterThan(3);
            expect(item.description.length).toBeGreaterThan(20);
        }
    });

    it('should resolve cameras correctly by name or id', () => {
        expect(getGearItem('nikon-z8')?.id).toBe('nikon-z8');
        expect(getGearItem('NIKON ℤ8', '2026', 'camera')?.id).toBe('nikon-z8');
        expect(getGearItem('NIKON D850', '2020', 'camera')?.id).toBe('nikon-d850');
        expect(getGearItem('NIKON D750', '2017', 'camera')?.id).toBe('nikon-d750');
    });

    it('should resolve lenses correctly with year-context', () => {
        // 2026 Nikon 120-300mm
        expect(getGearItem('F 120-300mm f/2.8', '2026', 'lens')?.id).toBe('nikon-120-300mm');
        expect(getGearItem('F 120-300mm f/2.8', '2026', 'lens')?.brand).toBe('Nikon');

        // 2024/2025 Plena
        expect(getGearItem('ℤ 135mm f/1.8 S Plena', '2024', 'lens')?.id).toBe('nikon-135mm-plena');
        expect(getGearItem('ℤ 135mm f/1.8 S Plena', '2025', 'lens')?.id).toBe('nikon-135mm-plena');

        // 2020 Sigma 85mm Art
        expect(getGearItem('85mm f/1.4', '2020', 'lens')?.id).toBe('sigma-85mm-art');
        expect(getGearItem('85mm f/1.4', '2020', 'lens')?.brand).toBe('Sigma');

        // 2018/2019 Sigma 135mm Art
        expect(getGearItem('135mm f/1.8', '2018', 'lens')?.id).toBe('sigma-135mm-art');
        expect(getGearItem('135mm f/1.8', '2019', 'lens')?.id).toBe('sigma-135mm-art');

        // 2017 Sigma 50mm Art
        expect(getGearItem('50mm f/1.4', '2017', 'lens')?.id).toBe('sigma-50mm-art');
        expect(getGearItem('50mm f/1.4', '2017', 'lens')?.brand).toBe('Sigma');

        // 2016 Nikon 85mm f/1.8G
        expect(getGearItem('85mm f/1.8', '2016', 'lens')?.id).toBe('nikon-85mm-18g');
        expect(getGearItem('85mm f/1.8', '2016', 'lens')?.brand).toBe('Nikon');
    });

    it('should return null for undefined or empty inputs', () => {
        expect(getGearItem(null)).toBeNull();
        expect(getGearItem(undefined)).toBeNull();
        expect(getGearItem('')).toBeNull();
    });
});
