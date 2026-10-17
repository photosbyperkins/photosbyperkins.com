import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GlobalSearchOverlay from './GlobalSearchOverlay';
import { stripMotionProps } from '../../../testUtils/stripMotionProps';

vi.mock('../../../utils/constants', () => ({
    TEAM_ABBREVIATIONS: {
        'Sacramento Roller Derby': 'SRD',
        'Bay Area Derby': 'BAD',
    },
}));

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
                <div className={className} {...stripMotionProps(props)}>
                    {children}
                </div>
            ),
            span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
                <span className={className} {...stripMotionProps(props)}>
                    {children}
                </span>
            ),
        },
        AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
        useIsPresent: () => true,
    };
});

describe('GlobalSearchOverlay', () => {
    const mockProps = {
        isOpen: true,
        onClose: vi.fn(),
        teamSearchQuery: 'Sacramento',
        setTeamSearchQuery: vi.fn(),
        filteredTeams: [
            { name: 'Sacramento Roller Derby', slug: 'sacramento-roller-derby', count: 12 },
        ],
        isTeamIndexLoading: false,
        gearSearchQuery: 'Nikon',
        setGearSearchQuery: vi.fn(),
        filteredGear: [
            {
                id: 'nikon-z8',
                name: 'Nikon Z8',
                shortName: 'Z8',
                compactName: 'Z8',
                brand: 'Nikon',
                type: 'camera' as const,
                photoCount: 1500,
                eventCount: 10,
            },
        ],
        isGearIndexLoading: false,
    };

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('renders dialog when isOpen is true', () => {
        render(
            <MemoryRouter>
                <GlobalSearchOverlay {...mockProps} />
            </MemoryRouter>
        );

        expect(screen.getByRole('dialog', { name: 'Search portfolio' })).not.toBeNull();
        expect(screen.getByText('SRD')).not.toBeNull();
    });

    it('switches between Teams and Gear tabs', () => {
        render(
            <MemoryRouter>
                <GlobalSearchOverlay {...mockProps} />
            </MemoryRouter>
        );

        // Initially on Teams tab
        expect(screen.getByText('SRD')).not.toBeNull();
        expect(screen.queryByText('Z8')).toBeNull();

        // Switch to Gear tab
        const gearTabBtn = screen.getByRole('button', { name: 'Gear' });
        fireEvent.click(gearTabBtn);

        expect(screen.getByText('Z8')).not.toBeNull();
        expect(screen.queryByText('SRD')).toBeNull();
    });

    it('updates query on input change', () => {
        render(
            <MemoryRouter>
                <GlobalSearchOverlay {...mockProps} />
            </MemoryRouter>
        );

        const searchInput = screen.getByRole('searchbox');
        fireEvent.change(searchInput, { target: { value: 'Bay Area' } });

        expect(mockProps.setTeamSearchQuery).toHaveBeenCalledWith('Bay Area');
    });

    it('calls onClose when close button is clicked', () => {
        render(
            <MemoryRouter>
                <GlobalSearchOverlay {...mockProps} />
            </MemoryRouter>
        );

        const closeBtn = screen.getByRole('button', { name: 'Close' });
        fireEvent.click(closeBtn);

        expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', () => {
        render(
            <MemoryRouter>
                <GlobalSearchOverlay {...mockProps} />
            </MemoryRouter>
        );

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('renders Jersey tab in middle position with unfiltered pills linking to search results and partial matches', async () => {
        const setJerseySearchQuery = vi.fn();
        const findTeams = [
            {
                name: 'Sacramento Roller Derby',
                slug: 'sacramento-roller-derby',
                photoCount: 3,
                numberedPhotoCount: 3,
                eventCount: 1,
                topNumbers: ['42', '88'],
                numberCounts: { '42': 2, '88': 1 },
            },
        ];

        const { rerender } = render(
            <MemoryRouter>
                <GlobalSearchOverlay
                    {...mockProps}
                    initialTab="jersey"
                    jerseySearchQuery=""
                    setJerseySearchQuery={setJerseySearchQuery}
                    findTeams={findTeams}
                />
            </MemoryRouter>
        );

        // Verify tab order: Teams, Jersey, Gear
        const tabButtons = screen.getByRole('group', { name: 'Search category' }).querySelectorAll('button');
        expect(Array.from(tabButtons).map((b) => b.textContent)).toEqual(['Teams', 'Jersey', 'Gear']);

        // Verify search input has no placeholder
        const searchInput = screen.getByRole('searchbox');
        expect(searchInput.getAttribute('placeholder')).toBeNull();

        // Unfiltered Jersey pills (#42, #88) link to /portfolio/find?num=...
        const pill42 = await screen.findByRole('link', { name: /#42/i });
        expect(pill42.getAttribute('href')).toBe('/portfolio/find?num=42');
        fireEvent.click(pill42);
        expect(mockProps.onClose).toHaveBeenCalled();

        // Rerender with query that has no exact match -> shows Possible Partial Matches
        rerender(
            <MemoryRouter>
                <GlobalSearchOverlay
                    {...mockProps}
                    initialTab="jersey"
                    jerseySearchQuery="429"
                    setJerseySearchQuery={setJerseySearchQuery}
                    findTeams={findTeams}
                />
            </MemoryRouter>
        );

        expect(await screen.findByText(/Possible Partial Matches for #429/i)).toBeTruthy();
        expect(screen.getByRole('link', { name: /#42/i }).getAttribute('href')).toBe('/portfolio/find?num=42');
    });
});

