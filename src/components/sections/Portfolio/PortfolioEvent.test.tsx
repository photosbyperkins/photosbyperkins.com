import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PortfolioEvent from './PortfolioEvent';
import { useAppStore } from '../../../store/useAppStore';
import type { EventData } from '../../../types';

vi.mock('framer-motion', () => ({
    motion: {
        article: ({ children, className, id, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => (
            <article className={className} id={id} {...props}>
                {children}
            </article>
        ),
    },
    useInView: () => true,
}));

describe('PortfolioEvent', () => {
    beforeEach(() => {
        useAppStore.setState({
            sharedPhoto: null,
            favorites: [],
            lightbox: { isOpen: false, images: [], index: 0, eventName: '', year: '' },
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const mockEvent: EventData = {
        date: '2024-03-01',
        highlights: [
            { original: '/photos/h1.webp', thumb: '/photos/h1_thumb.webp', width: 1200, height: 800 },
        ],
        album: [
            { original: '/photos/h1.webp', thumb: '/photos/h1_thumb.webp', width: 1200, height: 800 },
            { original: '/photos/h2.webp', thumb: '/photos/h2_thumb.webp', width: 1200, height: 800 },
        ],
    };

    it('renders event header and highlights view', () => {
        render(
            <MemoryRouter>
                <PortfolioEvent
                    eventName="2024-03-01 Gotham Girls Roller Derby"
                    ev={mockEvent}
                    evIdx={0}
                    selectedYear="2024"
                    inViewParent={true}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/Gotham Girls Roller Derby/i)).toBeDefined();
        // Featured highlights should be present
        const gridItems = screen.getAllByRole('button', { name: /View .*photo/i });
        expect(gridItems.length).toBeGreaterThan(0);
    });

    it('renders empty favorites view when event is Favorites and album is empty', () => {
        const emptyFavoritesEvent: EventData = {
            date: '2024',
            album: [],
            highlights: [],
        };

        render(
            <MemoryRouter>
                <PortfolioEvent
                    eventName="Favorites"
                    ev={emptyFavoritesEvent}
                    evIdx={0}
                    selectedYear="favorites"
                    inViewParent={true}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('NO FAVORITES YET')).toBeDefined();
    });
});
