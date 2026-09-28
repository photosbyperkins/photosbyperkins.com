import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EventGrid } from './EventGrid';
import type { PhotoRecord } from '../../../../types';

describe('EventGrid', () => {
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
    ];

    const mockOpenLightbox = vi.fn();

    it('renders all photos as interactive grid items', () => {
        render(
            <EventGrid
                albumImages={mockPhotos}
                eventName="Spring Championship"
                selectedYear="2024"
                loading={false}
                fetchError={false}
                openLightbox={mockOpenLightbox}
            />
        );

        const items = screen.getAllByRole('button', { name: /View Spring Championship photo/i });
        expect(items.length).toBe(2);
    });

    it('calls openLightbox on photo click', () => {
        render(
            <EventGrid
                albumImages={mockPhotos}
                eventName="Spring Championship"
                selectedYear="2024"
                loading={false}
                fetchError={false}
                openLightbox={mockOpenLightbox}
            />
        );

        const firstPhotoImg = screen.getByAltText('Spring Championship photo 1');
        fireEvent.click(firstPhotoImg);
        expect(mockOpenLightbox).toHaveBeenCalledWith(
            mockPhotos,
            0,
            'Spring Championship',
            '2024',
            undefined,
            undefined
        );
    });

    it('calls openLightbox on Enter or Space key press on grid item', () => {
        render(
            <EventGrid
                albumImages={mockPhotos}
                eventName="Spring Championship"
                selectedYear="2024"
                loading={false}
                fetchError={false}
                openLightbox={mockOpenLightbox}
            />
        );

        const items = screen.getAllByRole('button', { name: /View Spring Championship photo/i });
        fireEvent.keyDown(items[1], { key: 'Enter' });
        expect(mockOpenLightbox).toHaveBeenCalledWith(
            mockPhotos,
            1,
            'Spring Championship',
            '2024',
            undefined,
            undefined
        );

        mockOpenLightbox.mockClear();
        fireEvent.keyDown(items[0], { key: ' ' });
        expect(mockOpenLightbox).toHaveBeenCalledWith(
            mockPhotos,
            0,
            'Spring Championship',
            '2024',
            undefined,
            undefined
        );
    });

    it('shows loading indicator when loading is true', () => {
        render(
            <EventGrid
                albumImages={mockPhotos}
                eventName="Spring Championship"
                selectedYear="2024"
                loading={true}
                fetchError={false}
                openLightbox={mockOpenLightbox}
            />
        );

        expect(screen.getByText('Loading photos...')).toBeDefined();
    });

    it('shows error message when fetchError is true', () => {
        render(
            <EventGrid
                albumImages={mockPhotos}
                eventName="Spring Championship"
                selectedYear="2024"
                loading={false}
                fetchError={true}
                openLightbox={mockOpenLightbox}
            />
        );

        expect(screen.getByText(/Error loading photos/i)).toBeDefined();
    });
});
