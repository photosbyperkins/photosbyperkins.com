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
            id: 'nikon-d850',
            name: 'Nikon D850',
            shortName: 'D850',
            compactName: 'D850',
            brand: 'Nikon',
            type: 'camera',
            photoCount: 2000,
            eventCount: 12,
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
        {
            id: 'nikkor-70-200',
            name: 'Nikkor 70-200mm f/2.8',
            shortName: '70-200mm',
            compactName: '70-200mm',
            brand: 'Nikon',
            type: 'lens',
            photoCount: 1000,
            eventCount: 8,
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

    it('renders category headers for cameras and lenses when both are present', () => {
        render(
            <MemoryRouter>
                <GearFilter
                    gearSearchQuery=""
                    filteredGear={mockGear}
                    gearIndexLoading={false}
                />
            </MemoryRouter>
        );

        const cameraHeader = screen.getByRole('heading', { name: 'Cameras', level: 3 });
        const lensHeader = screen.getByRole('heading', { name: 'Lenses', level: 3 });
        expect(cameraHeader).not.toBeNull();
        expect(lensHeader).not.toBeNull();
    });

    it('renders gear pills grouped by category and sorted by photo count descending within each category', () => {
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
        expect(links).toHaveLength(4);
        // Cameras section first, sorted by photoCount desc: D850 (2,000) then Z8 (1,500)
        expect(links[0].textContent).toContain('D850');
        expect(links[1].textContent).toContain('Z8');
        // Lenses section second, sorted by photoCount desc: 24-70mm (3,000) then 70-200mm (1,000)
        expect(links[2].textContent).toContain('24-70mm');
        expect(links[3].textContent).toContain('70-200mm');
    });

    it('renders only the Cameras category header when only cameras match', () => {
        render(
            <MemoryRouter>
                <GearFilter
                    gearSearchQuery="Z8"
                    filteredGear={[mockGear[0]]}
                    gearIndexLoading={false}
                />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Cameras' })).not.toBeNull();
        expect(screen.queryByRole('heading', { name: 'Lenses' })).toBeNull();
        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(1);
        expect(links[0].textContent).toContain('Z8');
    });

    it('renders only the Lenses category header when only lenses match', () => {
        render(
            <MemoryRouter>
                <GearFilter
                    gearSearchQuery="24-70"
                    filteredGear={[mockGear[2]]}
                    gearIndexLoading={false}
                />
            </MemoryRouter>
        );

        expect(screen.queryByRole('heading', { name: 'Cameras' })).toBeNull();
        expect(screen.getByRole('heading', { name: 'Lenses' })).not.toBeNull();
        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(1);
        expect(links[0].textContent).toContain('24-70mm');
    });

    it('renders empty message when filteredGear is empty and no category headers', () => {
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
        expect(screen.queryByRole('heading')).toBeNull();
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
