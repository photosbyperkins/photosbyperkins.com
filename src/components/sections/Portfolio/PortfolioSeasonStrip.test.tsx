import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PortfolioSeasonStrip from './PortfolioSeasonStrip';
import type { SeasonStats, EventData } from '../../../types';
import type { GearItem } from '../../../data/gearData';
import * as scrollModule from '../../../utils/scroll';

vi.mock('../../../utils/scroll', () => ({
    scrollToElement: vi.fn(),
}));

describe('PortfolioSeasonStrip', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const mockStats: SeasonStats = {
        totalPhotos: 250,
        totalEvents: 8,
        mostUsedCamera: 'Canon EOS R6 Mark II',
        mostUsedLens: 'RF 70-200mm F2.8 L IS USM',
    };

    const mockCamera: GearItem = {
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

    const mockLens: GearItem = {
        id: 'rf-70-200',
        name: 'RF 70-200mm F2.8 L IS USM',
        shortName: '70-200 f/2.8',
        compactName: '70-200 f/2.8',
        brand: 'Other',
        type: 'lens',
        officialUrl: '',
        specs: {},
        modalTitle: 'RF 70-200mm F2.8 L IS USM',
    };

    const mockEvents: [string, EventData][] = [
        [
            '2024-03-01-tigers-vs-bears',
            {
                date: '2024-03-01',
                album: [],
                highlights: [],
            },
        ],
    ];

    it('renders total games and photos correctly', () => {
        render(
            <MemoryRouter>
                <PortfolioSeasonStrip
                    stats={mockStats}
                    totalEvents={8}
                    totalPhotos={250}
                    firstSeenTeam="Bears"
                    mostSeenTeam={null}
                    cameraGear={mockCamera}
                    lensGear={mockLens}
                    events={mockEvents}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('Games')).toBeDefined();
        expect(screen.getByText('8')).toBeDefined();
        expect(screen.getByText('Photos')).toBeDefined();
        expect(screen.getByText('250')).toBeDefined();
    });

    it('renders First Seen button and triggers scrollToElement on click', () => {
        render(
            <MemoryRouter>
                <PortfolioSeasonStrip
                    stats={mockStats}
                    totalEvents={8}
                    totalPhotos={250}
                    firstSeenTeam="Bears"
                    mostSeenTeam={null}
                    cameraGear={null}
                    lensGear={null}
                    events={mockEvents}
                />
            </MemoryRouter>
        );

        const firstSeenBtn = screen.getByRole('button', { name: /scroll to event: bears/i });
        expect(firstSeenBtn).toBeDefined();
        fireEvent.click(firstSeenBtn);
        expect(scrollModule.scrollToElement).toHaveBeenCalledWith('event-2024-03-01-tigers-vs-bears');
    });

    it('renders Most Seen team when firstSeenTeam is null', () => {
        render(
            <MemoryRouter>
                <PortfolioSeasonStrip
                    stats={mockStats}
                    totalEvents={8}
                    totalPhotos={250}
                    firstSeenTeam={null}
                    mostSeenTeam="Lions"
                    cameraGear={null}
                    lensGear={null}
                    events={mockEvents}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('Most Seen')).toBeDefined();
        expect(screen.getByText('Lions')).toBeDefined();
    });

    it('renders camera and lens gear links when items are provided', () => {
        render(
            <MemoryRouter>
                <PortfolioSeasonStrip
                    stats={mockStats}
                    totalEvents={8}
                    totalPhotos={250}
                    firstSeenTeam={null}
                    mostSeenTeam={null}
                    cameraGear={mockCamera}
                    lensGear={mockLens}
                    events={mockEvents}
                />
            </MemoryRouter>
        );

        const cameraLink = screen.getByRole('link', { name: /view photos taken with canon eos r6 mark ii/i });
        expect(cameraLink.getAttribute('href')).toBe('/portfolio/gear/canon-r6m2');

        const lensLink = screen.getByRole('link', { name: /view photos taken with rf 70-200mm f2.8 l is usm/i });
        expect(lensLink.getAttribute('href')).toBe('/portfolio/gear/rf-70-200');
    });

    it('renders camera and lens as plain text when gear items are null', () => {
        render(
            <MemoryRouter>
                <PortfolioSeasonStrip
                    stats={mockStats}
                    totalEvents={8}
                    totalPhotos={250}
                    firstSeenTeam={null}
                    mostSeenTeam={null}
                    cameraGear={null}
                    lensGear={null}
                    events={mockEvents}
                />
            </MemoryRouter>
        );

        expect(screen.queryByRole('link', { name: /view photos/i })).toBeNull();
        expect(screen.getByText('Canon EOS R6 Mark II')).toBeDefined();
        expect(screen.getByText('RF 70-200mm F2.8 L IS USM')).toBeDefined();
    });
});
