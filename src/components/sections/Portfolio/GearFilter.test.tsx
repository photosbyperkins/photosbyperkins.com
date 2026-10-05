import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GearFilter, { type GearMeta } from './GearFilter';

describe('GearFilter', () => {
    const mockGear: GearMeta[] = [
        {
            id: 'nikon-z8',
            name: 'Nikon Z8',
            shortName: 'Z8',
            compactName: 'Z8',
            brand: 'Nikon',
            type: 'camera',
            photoCount: 1500,
            eventCount: 10,
        },
        {
            id: 'nikkor-24-70',
            name: 'Nikkor 24-70mm f/2.8',
            shortName: '24-70mm',
            compactName: '24-70mm',
            brand: 'Nikon',
            type: 'lens',
            photoCount: 3000,
            eventCount: 15,
        },
    ];

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders loading state when gearIndexLoading is true', () => {
        render(
            <MemoryRouter>
                <GearFilter
                    gearSearchQuery=""
                    filteredGear={[]}
                    gearIndexLoading={true}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/Loading gear.../i)).not.toBeNull();
    });

    it('renders gear pills sorted by photo count descending', () => {
        render(
            <MemoryRouter>
                <GearFilter
                    gearSearchQuery=""
                    filteredGear={mockGear}
                    gearIndexLoading={false}
                />
            </MemoryRouter>
        );

        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(2);
        // Sorted by photoCount desc: 24-70mm (3,000) then Z8 (1,500)
        expect(links[0].textContent).toContain('24-70mm');
        expect(links[1].textContent).toContain('Z8');
    });

    it('renders empty message when filteredGear is empty', () => {
        render(
            <MemoryRouter>
                <GearFilter
                    gearSearchQuery="500mm"
                    filteredGear={[]}
                    gearIndexLoading={false}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('No gear found matching "500mm"')).not.toBeNull();
    });

    it('calls onBack and scrolls to top on link click', () => {
        const onBack = vi.fn();
        window.scrollTo = vi.fn();

        render(
            <MemoryRouter>
                <GearFilter
                    gearSearchQuery=""
                    filteredGear={mockGear}
                    gearIndexLoading={false}
                    onBack={onBack}
                />
            </MemoryRouter>
        );

        const firstLink = screen.getAllByRole('link')[0];
        fireEvent.click(firstLink);

        expect(onBack).toHaveBeenCalled();
        expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    });
});
