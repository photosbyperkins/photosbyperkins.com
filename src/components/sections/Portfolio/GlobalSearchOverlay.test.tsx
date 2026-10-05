import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GlobalSearchOverlay from './GlobalSearchOverlay';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
            <div className={className} {...props}>
                {children}
            </div>
        ),
        span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
            <span className={className} {...props}>
                {children}
            </span>
        ),
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

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
});
