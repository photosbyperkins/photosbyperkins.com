import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PortfolioYearNav from './PortfolioYearNav';
import type { GearItem } from '../../../data/gearData';

describe('PortfolioYearNav', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const mockYears = ['2024', '2023', '2022'];
    const mockPrefetchTab = vi.fn();

    const mockGearItem: GearItem = {
        id: 'canon-r6m2',
        name: 'Canon EOS R6 Mark II',
        shortName: 'Canon R6 II',
        compactName: 'Canon R6 II',
        brand: 'Other',
        type: 'camera',
        officialUrl: '',
        specs: {},
        modalTitle: 'Canon EOS R6 Mark II',
    };

    it('renders list of year links and favorites link in standard mode', () => {
        render(
            <MemoryRouter>
                <PortfolioYearNav
                    years={mockYears}
                    selectedTab="2024"
                    isGearRoute={false}
                    currentGearItem={null}
                    isTeamMode={false}
                    activeTeamMeta={null}
                    prefetchTab={mockPrefetchTab}
                />
            </MemoryRouter>
        );

        expect(screen.getByLabelText('Season 2024')).toBeDefined();
        expect(screen.getByLabelText('Season 2023')).toBeDefined();
        expect(screen.getByLabelText('Season 2022')).toBeDefined();
        expect(screen.getByLabelText('Favorites')).toBeDefined();

        // 2024 should have active class
        const year2024 = screen.getByLabelText('Season 2024');
        expect(year2024.className).toContain('active');

        const year2023 = screen.getByLabelText('Season 2023');
        expect(year2023.className).not.toContain('active');
    });

    it('triggers prefetchTab on pointer enter and focus', () => {
        render(
            <MemoryRouter>
                <PortfolioYearNav
                    years={mockYears}
                    selectedTab="2024"
                    isGearRoute={false}
                    currentGearItem={null}
                    isTeamMode={false}
                    activeTeamMeta={null}
                    prefetchTab={mockPrefetchTab}
                />
            </MemoryRouter>
        );

        const year2023 = screen.getByLabelText('Season 2023');
        fireEvent.pointerEnter(year2023);
        expect(mockPrefetchTab).toHaveBeenCalledWith('2023');

        fireEvent.focus(year2023);
        expect(mockPrefetchTab).toHaveBeenCalledWith('2023');
    });

    it('renders gear filter dismiss badge when in gear mode', () => {
        render(
            <MemoryRouter>
                <PortfolioYearNav
                    years={mockYears}
                    selectedTab="2024"
                    isGearRoute={true}
                    currentGearItem={mockGearItem}
                    isTeamMode={false}
                    activeTeamMeta={null}
                    prefetchTab={mockPrefetchTab}
                />
            </MemoryRouter>
        );

        const gearFilter = screen.getByLabelText(`Remove filter for ${mockGearItem.name}`);
        expect(gearFilter).toBeDefined();
        expect(gearFilter.getAttribute('href')).toBe('/portfolio');
        expect(screen.getByText('Canon R6 II')).toBeDefined();
        // Regular year links should not be rendered
        expect(screen.queryByLabelText('Season 2024')).toBeNull();
    });

    it('renders team filter dismiss badge when in team mode', () => {
        const teamMeta = { name: 'tigers', slug: 'tigers', count: 12 };

        render(
            <MemoryRouter>
                <PortfolioYearNav
                    years={mockYears}
                    selectedTab="tigers"
                    isGearRoute={false}
                    currentGearItem={null}
                    isTeamMode={true}
                    activeTeamMeta={teamMeta}
                    prefetchTab={mockPrefetchTab}
                />
            </MemoryRouter>
        );

        const teamFilter = screen.getByLabelText('Remove filter for tigers');
        expect(teamFilter).toBeDefined();
        expect(teamFilter.getAttribute('href')).toBe('/portfolio');
        expect(screen.queryByLabelText('Season 2024')).toBeNull();
    });
});
