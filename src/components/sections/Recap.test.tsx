import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Recap from './Recap';
import { useAppStore } from '../../store/useAppStore';
import { _clearAlbumCache, setCachedAlbum } from '../../utils/albumData';
import { getPhotoOriginalUrl } from '../../utils/formatters';
import type { YearData } from '../../types';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({
            children,
            className,
            onClick,
            onKeyDown,
            layout: _layout,
            ...props
        }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode; layout?: unknown }) => (
            <div className={className} onClick={onClick} onKeyDown={onKeyDown} {...props}>
                {children}
            </div>
        ),
    },
    useReducedMotion: () => false,
}));

vi.mock('../../hooks/useElementSize', () => ({
    useElementSize: () => ({ width: 500 }),
}));

describe('Recap Component - Batch Selection & Interactions', () => {
    const mockEvents = [
        { eventName: '03.23 Roller Derby Match A', photoIndex: 0 },
        { eventName: '03.23 Roller Derby Match A', photoIndex: 1 },
        { eventName: '04.16 Roller Derby Match B', photoIndex: 0 },
    ];

    const mockYearData: YearData = {
        '03.23 Roller Derby Match A': {
            album: [
                { original: '/photos/2024/match-a/photo_001.jpg', thumb: '/thumbnails/2024/match-a/photo_001.avif', width: 3000, height: 2000 },
                { original: '/photos/2024/match-a/photo_002.jpg', thumb: '/thumbnails/2024/match-a/photo_002.avif', width: 3000, height: 2000 },
            ],
            highlights: [],
            albumSlug: 'match-a',
            originalYear: '2024',
        },
        '04.16 Roller Derby Match B': {
            album: [
                { original: '/photos/2024/match-b/photo_001.jpg', thumb: '/thumbnails/2024/match-b/photo_001.avif', width: 3000, height: 2000 },
            ],
            highlights: [],
            albumSlug: 'match-b',
            originalYear: '2024',
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        _clearAlbumCache();

        useAppStore.setState({
            isBatchSelectMode: false,
            batchSelectedPhotos: [],
            favorites: [],
            sharedPhoto: null,
            lightbox: { isOpen: false, images: [], index: 0, eventName: '', year: '' },
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders slices with role="button" and opens lightbox on click in normal mode', () => {
        render(
            <Recap
                slug="2024"
                count={3}
                events={mockEvents}
                yearData={mockYearData}
            />
        );

        const slices = screen.getAllByRole('button');
        expect(slices.length).toBe(3);
        expect(slices[0].getAttribute('aria-checked')).toBeNull();
        expect(slices[0].getAttribute('aria-label')).toBe('View recap image 1');

        // Click first slice
        fireEvent.click(slices[0]);

        const shared = useAppStore.getState().sharedPhoto;
        expect(shared).toEqual({
            eventName: '03.23 Roller Derby Match A',
            photoIndex: 0,
            preventScroll: true,
        });
    });

    it('triggers lightbox on Enter or Space key in normal mode', () => {
        render(
            <Recap
                slug="2024"
                count={3}
                events={mockEvents}
                yearData={mockYearData}
            />
        );

        const slices = screen.getAllByRole('button');

        // Enter key
        fireEvent.keyDown(slices[1], { key: 'Enter' });
        expect(useAppStore.getState().sharedPhoto).toEqual({
            eventName: '03.23 Roller Derby Match A',
            photoIndex: 1,
            preventScroll: true,
        });

        // Space key
        fireEvent.keyDown(slices[2], { key: ' ' });
        expect(useAppStore.getState().sharedPhoto).toEqual({
            eventName: '04.16 Roller Derby Match B',
            photoIndex: 0,
            preventScroll: true,
        });
    });

    it('enters batch select mode and selects slice when shift-clicked from normal mode', () => {
        render(
            <Recap
                slug="2024"
                count={3}
                events={mockEvents}
                yearData={mockYearData}
            />
        );

        const slices = screen.getAllByRole('button');
        fireEvent.click(slices[0], { shiftKey: true });

        expect(useAppStore.getState().isBatchSelectMode).toBe(true);
        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(1);
        expect(getPhotoOriginalUrl(useAppStore.getState().batchSelectedPhotos[0])).toBe('/photos/2024/match-a/photo_001.jpg');
    });

    it('renders slices with role="checkbox", aria-checked, and select badges when in batch select mode', () => {
        useAppStore.setState({ isBatchSelectMode: true });

        const { container } = render(
            <Recap
                slug="2024"
                count={3}
                events={mockEvents}
                yearData={mockYearData}
            />
        );

        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBe(3);
        expect(checkboxes[0].getAttribute('aria-checked')).toBe('false');
        expect(checkboxes[0].className).toContain('recap__slice--select-mode');

        // Selection badges should be present in top center
        const badges = container.querySelectorAll('.portfolio__grid-select-badge');
        expect(badges.length).toBe(3);
    });

    it('toggles selection when clicking slices in batch select mode', () => {
        useAppStore.setState({ isBatchSelectMode: true });

        const { container } = render(
            <Recap
                slug="2024"
                count={3}
                events={mockEvents}
                yearData={mockYearData}
            />
        );

        const slices = screen.getAllByRole('checkbox');

        // Click first slice to select
        fireEvent.click(slices[0]);
        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(1);
        expect(getPhotoOriginalUrl(useAppStore.getState().batchSelectedPhotos[0])).toBe('/photos/2024/match-a/photo_001.jpg');

        // Badge should show selection number 1
        const activeBadge = container.querySelector('.portfolio__grid-select-badge--active');
        expect(activeBadge).not.toBeNull();
        expect(activeBadge?.textContent).toContain('1');

        // Click again to deselect
        fireEvent.click(slices[0]);
        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(0);
    });

    it('performs range selection across slices with shift-click', () => {
        useAppStore.setState({ isBatchSelectMode: true });

        render(
            <Recap
                slug="2024"
                count={3}
                events={mockEvents}
                yearData={mockYearData}
            />
        );

        const slices = screen.getAllByRole('checkbox');

        // Click slice 1
        fireEvent.click(slices[0]);
        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(1);

        // Shift-click slice 3 (indices 0 to 2)
        fireEvent.click(slices[2], { shiftKey: true });
        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(3);
        expect(useAppStore.getState().batchSelectedPhotos.map((p) => getPhotoOriginalUrl(p))).toEqual([
            '/photos/2024/match-a/photo_001.jpg',
            '/photos/2024/match-a/photo_002.jpg',
            '/photos/2024/match-b/photo_001.jpg',
        ]);
    });

    it('synchronizes selection state two-way with store', () => {
        // Pre-select photo 2 from external store action (e.g. event grid)
        useAppStore.setState({
            isBatchSelectMode: true,
            batchSelectedPhotos: [
                {
                    original: '/photos/2024/match-a/photo_002.jpg',
                    thumb: '/thumbnails/2024/match-a/photo_002.avif',
                    eventName: '03.23 Roller Derby Match A',
                    year: '2024',
                },
            ],
        });

        render(
            <Recap
                slug="2024"
                count={3}
                events={mockEvents}
                yearData={mockYearData}
            />
        );

        const slices = screen.getAllByRole('checkbox');
        expect(slices[0].getAttribute('aria-checked')).toBe('false');
        expect(slices[1].getAttribute('aria-checked')).toBe('true');
        expect(slices[1].className).toContain('recap__slice--selected');
    });

    it('falls back to cached album or synthetic photo path if yearData album is not yet loaded', () => {
        const emptyYearData: YearData = {
            '03.23 Roller Derby Match A': {
                album: [],
                highlights: [],
                albumSlug: 'match-a',
                originalYear: '2024',
            },
        };

        // Cache album in albumMemoryCache
        setCachedAlbum('2024', 'match-a', [
            { original: '/photos/2024/match-a/cached_001.jpg', thumb: '/thumbnails/2024/match-a/cached_001.avif' },
        ]);

        useAppStore.setState({ isBatchSelectMode: true });

        render(
            <Recap
                slug="2024"
                count={1}
                events={[{ eventName: '03.23 Roller Derby Match A', photoIndex: 0 }]}
                yearData={emptyYearData}
            />
        );

        const slices = screen.getAllByRole('checkbox');
        fireEvent.click(slices[0]);

        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(1);
        expect(getPhotoOriginalUrl(useAppStore.getState().batchSelectedPhotos[0])).toBe('/photos/2024/match-a/cached_001.jpg');
    });

    it('preloads sprite image with hash query parameter when provided', () => {
        const imageSrcs: string[] = [];
        const originalImage = window.Image;
        try {
            window.Image = class extends originalImage {
                set src(val: string) {
                    imageSrcs.push(val);
                }
            } as unknown as typeof Image;

            render(
                <Recap
                    slug="2024"
                    count={3}
                    events={mockEvents}
                    yearData={mockYearData}
                    hash="abc123def4"
                />
            );

            expect(imageSrcs.some((src) => src.includes('/recap/2024/sprite.webp?h=abc123def4'))).toBe(true);
        } finally {
            window.Image = originalImage;
        }
    });
});
