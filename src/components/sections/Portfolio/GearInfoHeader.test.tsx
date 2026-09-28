import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { GearInfoHeader } from './GearInfoHeader';
import type { GearItem } from '../../../data/gearData';

describe('GearInfoHeader', () => {
    afterEach(() => {
        cleanup();
    });

    const mockGear: GearItem = {
        id: 'nikon-120-300',
        name: 'Nikon 120-300mm f/2.8',
        shortName: '120-300mm f/2.8',
        compactName: '120-300mm f/2.8',
        modalTitle: 'NIKON 120-300MM F/2.8',
        type: 'lens',
        brand: 'Nikon',
        officialUrl: 'https://www.nikonusa.com/gear/120-300mm',
        specs: {
            'Focal Range': '120 - 300mm',
            'Max Aperture': 'f/2.8 Constant',
        },
    };

    it('renders badges row and title row with official link', () => {
        const { container } = render(<GearInfoHeader gear={mockGear} totalPhotos={2175} totalEvents={21} />);

        // Verify badges
        expect(screen.getByText('lens')).toBeDefined();
        expect(screen.getByText('Nikon')).toBeDefined();
        expect(screen.getByText(/2,175 Photos across 21 Events/)).toBeDefined();

        // Verify title
        expect(screen.getByText('Nikon 120-300mm f/2.8')).toBeDefined();

        // Verify official link is rendered inside title-row
        const titleRow = container.querySelector('.gear-info-card__title-row');
        expect(titleRow).not.toBeNull();

        const officialLink = screen.getByRole('link', { name: /Open official product page/i });
        expect(officialLink).toBeDefined();
        expect(officialLink.getAttribute('href')).toBe('https://www.nikonusa.com/gear/120-300mm');
        expect(titleRow?.contains(officialLink)).toBe(true);
    });

    it('omits official link when officialUrl is not provided', () => {
        const gearWithoutUrl: GearItem = {
            ...mockGear,
            officialUrl: '',
        };

        const { container } = render(<GearInfoHeader gear={gearWithoutUrl} totalPhotos={10} totalEvents={1} />);

        const titleRow = container.querySelector('.gear-info-card__title-row');
        expect(titleRow).not.toBeNull();
        expect(screen.queryByRole('link', { name: /Open official product page/i })).toBeNull();
    });
});
