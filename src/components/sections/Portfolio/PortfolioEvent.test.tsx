import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PortfolioEvent from './PortfolioEvent';
import { useAppStore } from '../../../store/useAppStore';
import { getPhotoOriginalUrl } from '../../../utils/formatters';
import type { EventData, PhotoInput } from '../../../types';

const mockStartZipping = vi.fn();
vi.mock('../../../hooks/useZipWorker', () => ({
    useZipWorker: () => ({
        isZipping: false,
        zipProgress: 0,
        startZipping: mockStartZipping,
    }),
}));

let mockCanShare = false;
vi.mock('../../../hooks/useCanShare', () => ({
    useCanShare: () => mockCanShare,
}));

const componentCache: Record<
    string,
    React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLElement> & Record<string, unknown>>
> = {};

vi.mock('framer-motion', () => ({
    motion: new Proxy(
        {},
        {
            get: (_target, prop: string) => {
                if (!componentCache[prop]) {
                    const Component = React.forwardRef<
                        HTMLElement,
                        { children?: React.ReactNode } & Record<string, unknown>
                    >(({ children, ...props }, ref) => {
                        const {
                            layoutId: _l,
                            transition: _t,
                            initial: _i,
                            animate: _a,
                            exit: _e,
                            whileHover: _wh,
                            whileTap: _wt,
                            ...domProps
                        } = props;
                        return React.createElement(prop, { ...domProps, ref }, children as React.ReactNode);
                    });
                    Component.displayName = `motion.${prop}`;
                    componentCache[prop] = Component;
                }
                return componentCache[prop];
            },
        }
    ),
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
        mockCanShare = false;
        useAppStore.setState({
            sharedPhoto: null,
            favorites: [],
            isBatchSelectMode: false,
            batchSelectedPhotos: [],
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

    it('renders full event header (including scores and actions) identical to filtered views', () => {
        const eventData: EventData = {
            album: [
                { original: '/photos/fav2.jpg', thumb: '/photos/fav2.jpg', eventName: 'Rose vs Gotham', year: '2024' },
            ],
            highlights: [],
            originalYear: '2024',
            localScore: { team1Score: 196, team2Score: 131 },
        };

        render(
            <MemoryRouter>
                <PortfolioEvent
                    eventName="11.15 Rose City Rollers vs Gotham Girls Roller Derby"
                    ev={eventData}
                    evIdx={0}
                    selectedYear="2024"
                    inViewParent={true}
                />
            </MemoryRouter>
        );

        // Event title and team names should be rendered
        expect(screen.getByText(/Gotham Girls Roller Derby/i)).toBeDefined();

        // Scores should be rendered
        expect(screen.getByText('196')).toBeDefined();
        expect(screen.getByText('131')).toBeDefined();

        // Event date prefix should be rendered in the title side
        expect(screen.getByText('11.15')).toBeDefined();

        // Featured / Full Album toggle should be present
        expect(screen.getByRole('button', { name: /Show Full Album/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /Show Featured Photos/i })).toBeDefined();

        // Photo should be displayed
        const photos = screen.getAllByRole('button', { name: /View .*photo/i });
        expect(photos.length).toBe(1);
    });

    it('downloads only favorite photos from the event when isFavoritesTab is true', () => {
        mockStartZipping.mockClear();

        const eventData: EventData = {
            album: [
                { original: '/photos/2024/game/fav1.jpg', thumb: '/photos/2024/game/fav1.jpg', eventName: 'Rose vs Gotham', year: '2024' },
                { original: '/photos/2024/game/fav2.jpg', thumb: '/photos/2024/game/fav2.jpg', eventName: 'Rose vs Gotham', year: '2024' },
            ],
            albumSlug: '2024-rose-vs-gotham',
            highlights: [],
            originalYear: '2024',
            zip: '/photos/2024/full-album-all-200-photos.zip',
        };

        render(
            <MemoryRouter>
                <PortfolioEvent
                    eventName="11.15 Rose City Rollers vs Gotham Girls Roller Derby"
                    ev={eventData}
                    evIdx={0}
                    selectedYear="2024"
                    inViewParent={true}
                    isFavoritesTab={true}
                />
            </MemoryRouter>
        );

        // Does NOT render the static <a href> link pointing to full-album-all-200-photos.zip
        expect(screen.queryByRole('link', { name: /Download All Original Photos \(\.zip\)/i })).toBeNull();

        // Renders the button with title "Download All Original Photos (.zip)"
        const downloadBtn = screen.getByRole('button', { name: /Download All Original Photos \(\.zip\)/i });
        expect(downloadBtn).toBeDefined();

        fireEvent.click(downloadBtn);

        // startZipping is called with ONLY the 2 favorite photos from this event and an event-specific zip name
        expect(mockStartZipping).toHaveBeenCalledWith(
            ['/photos/2024/game/fav1.jpg', '/photos/2024/game/fav2.jpg'],
            '2024-rose-vs-gotham-favorites.zip'
        );
    });

    it('shares only favorite photos from the event when isFavoritesTab is true and canShare is true', async () => {
        mockCanShare = true;
        const mockShare = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'share', {
            value: mockShare,
            configurable: true,
            writable: true,
        });

        const eventData: EventData = {
            album: [
                { original: '/photos/2024/game/fav1.jpg', thumb: '/photos/2024/game/fav1.jpg', eventName: 'Rose vs Gotham', year: '2024' },
                { original: '/photos/2024/game/fav2.jpg', thumb: '/photos/2024/game/fav2.jpg', eventName: 'Rose vs Gotham', year: '2024' },
            ],
            albumSlug: '2024-rose-vs-gotham',
            highlights: [],
            originalYear: '2024',
        };

        render(
            <MemoryRouter>
                <PortfolioEvent
                    eventName="11.15 Rose City Rollers vs Gotham Girls Roller Derby"
                    ev={eventData}
                    evIdx={0}
                    selectedYear="2024"
                    inViewParent={true}
                    isFavoritesTab={true}
                />
            </MemoryRouter>
        );

        const shareBtn = screen.getByRole('button', { name: /Share Favorites/i });
        expect(shareBtn).toBeDefined();

        fireEvent.click(shareBtn);

        await vi.waitFor(() => {
            expect(mockShare).toHaveBeenCalledTimes(1);
        });
        const shareArg = mockShare.mock.calls[0][0];
        expect(shareArg.title).toBe('11.15 Rose City Rollers vs Gotham Girls Roller Derby Favorites');
        expect(shareArg.text).toBe('Check out my favorite photos from 11.15 Rose City Rollers vs Gotham Girls Roller Derby!');
        expect(shareArg.url).toContain('/portfolio/favorites#photos=');
    });
});
