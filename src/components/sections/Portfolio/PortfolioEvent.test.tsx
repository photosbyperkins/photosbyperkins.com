import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PortfolioEvent from './PortfolioEvent';
import { useAppStore } from '../../../store/useAppStore';
import { getPhotoOriginalUrl } from '../../../utils/formatters';
import type { EventData, PhotoInput } from '../../../types';

vi.mock('framer-motion', () => ({
    motion: {
        article: ({
            children,
            className,
            id,
            ...props
        }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => (
            <article className={className} id={id} {...props}>
                {children}
            </article>
        ),
        aside: ({
            children,
            className,
            id,
            ...props
        }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => (
            <aside className={className} id={id} {...props}>
                {children}
            </aside>
        ),
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useInView: () => true,
}));

vi.mock('./StoryExportModal', () => ({
    default: ({ photo, isOpen, onClose }: { photo: PhotoInput; isOpen: boolean; onClose: () => void }) => {
        const photoRecord = typeof photo === 'string' ? { original: photo, thumb: photo, burst: undefined } : photo;
        return isOpen ? (
            <div
                data-testid="story-export-modal"
                data-photo-original={photoRecord.original}
                data-burst-total={photoRecord.burst?.total}
            >
                <button onClick={onClose}>Close Story</button>
            </div>
        ) : null;
    },
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
        highlights: [{ original: '/photos/h1.webp', thumb: '/photos/h1_thumb.webp', width: 1200, height: 800 }],
        album: [
            { original: '/photos/h1.webp', thumb: '/photos/h1_thumb.webp', width: 1200, height: 800 },
            { original: '/photos/h2.webp', thumb: '/photos/h2_thumb.webp', width: 1200, height: 800 },
            { original: '/photos/h3.webp', thumb: '/photos/h3_thumb.webp', width: 1200, height: 800 },
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

    it('supports batch selection across highlights and full album grid views', async () => {
        const { rerender } = render(
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

        // Initially in highlights view, not in select mode
        expect(screen.queryAllByRole('checkbox').length).toBe(0);

        // 1. Activate batch select mode in store
        useAppStore.setState({ isBatchSelectMode: true });
        rerender(
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

        // Highlights now render as selectable checkboxes
        const highlightCheckboxes = screen.getAllByRole('checkbox');
        expect(highlightCheckboxes.length).toBeGreaterThan(0);

        // Click a photo in highlights to select it
        fireEvent.click(highlightCheckboxes[0]);
        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(1);
        const item1 = useAppStore.getState().batchSelectedPhotos[0];
        expect(getPhotoOriginalUrl(item1)).toBe('/photos/h1.webp');

        // 2. Switch to full album grid view
        const fullAlbumBtn = screen.getByRole('button', { name: /Show Full Album/i });
        fireEvent.click(fullAlbumBtn);

        // Full album grid items are also selectable checkboxes
        const gridCheckboxes = screen.getAllByRole('checkbox');
        expect(gridCheckboxes.length).toBe(3);

        // First item is already checked because it was selected in highlights
        expect(gridCheckboxes[0].getAttribute('aria-checked')).toBe('true');

        // Click second item to select it
        fireEvent.click(gridCheckboxes[1]);
        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(2);

        // Click first item again to toggle/unselect it
        fireEvent.click(gridCheckboxes[0]);
        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(1);
        const item2 = useAppStore.getState().batchSelectedPhotos[0];
        expect(getPhotoOriginalUrl(item2)).toBe('/photos/h2.webp');
    });
});
