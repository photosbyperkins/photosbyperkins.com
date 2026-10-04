import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { EventHighlights } from './EventHighlights';
import type { PhotoRecord } from '../../../../types';

describe('EventHighlights', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const mockPhotos: PhotoRecord[] = [
        {
            original: '/photos/photo1.webp',
            thumb: '/photos/photo1_thumb.webp',
            src: '/photos/photo1.webp',
            width: 1200,
            height: 800,
            focusX: 0.5,
            focusY: 0.4,
        },
        {
            original: '/photos/photo2.webp',
            thumb: '/photos/photo2_thumb.webp',
            src: '/photos/photo2.webp',
            width: 1200,
            height: 800,
        },
        {
            original: '/photos/photo3.webp',
            thumb: '/photos/photo3_thumb.webp',
            src: '/photos/photo3.webp',
            width: 1200,
            height: 800,
        },
    ];

    const albumIndexMap = new Map<string, number>([
        ['/photos/photo1.webp', 0],
        ['/photos/photo2.webp', 1],
        ['/photos/photo3.webp', 2],
    ]);

    const defaultProps = {
        featuredPhotos: mockPhotos,
        albumImages: mockPhotos,
        albumIndexMap,
        eventName: 'Spring Championship',
        selectedYear: '2026',
        totalPhotos: 3,
        evIdx: 0,
        loading: false,
        fetchError: false,
        openLightbox: vi.fn(),
    };

    it('renders featured photos in normal mode without select badges', () => {
        const { container } = render(<EventHighlights {...defaultProps} isSelectMode={false} />);
        const badges = container.querySelectorAll('.portfolio__grid-select-badge');
        expect(badges.length).toBe(0);
    });

    it('renders portfolio__grid-select-badge for all photos in select mode', () => {
        const { container } = render(
            <EventHighlights
                {...defaultProps}
                isSelectMode={true}
                selectedUrls={new Set(['/photos/photo1.webp'])}
                selectionIndexMap={new Map([['/photos/photo1.webp', 1]])}
            />
        );

        const badges = container.querySelectorAll('.portfolio__grid-select-badge');
        expect(badges.length).toBe(3);

        // Photo 1 is selected -> active badge
        expect(badges[0].classList.contains('portfolio__grid-select-badge--active')).toBe(true);
        expect(badges[0].querySelector('.portfolio__grid-select-number')?.textContent).toBe('1');

        // Photo 2 & 3 are not selected -> inactive badge
        expect(badges[1].classList.contains('portfolio__grid-select-badge--active')).toBe(false);
        expect(badges[2].classList.contains('portfolio__grid-select-badge--active')).toBe(false);
    });

    it('calls onToggleSelect when clicking a photo in select mode', () => {
        const mockToggle = vi.fn();
        const { container } = render(
            <EventHighlights
                {...defaultProps}
                isSelectMode={true}
                selectedUrls={new Set()}
                onToggleSelect={mockToggle}
            />
        );

        const featuredItems = container.querySelectorAll('.portfolio__featured-item');
        fireEvent.click(featuredItems[1]);

        expect(mockToggle).toHaveBeenCalledTimes(1);
        expect(mockToggle).toHaveBeenCalledWith(mockPhotos[1], 1, false);
    });
});
