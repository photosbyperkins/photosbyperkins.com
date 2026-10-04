import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SharedFavoritesPanel from './SharedFavoritesPanel';
import { useAppStore } from '../../../store/useAppStore';
import type { PhotoRecord } from '../../../types';

describe('SharedFavoritesPanel', () => {
    beforeEach(() => {
        useAppStore.setState({
            favorites: [],
            lightbox: {
                isOpen: false,
                images: [],
                index: 0,
                eventName: '',
                year: '',
            },
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const mockPhotos: PhotoRecord[] = [
        {
            original: '/photos/fav1.webp',
            thumb: '/photos/fav1_thumb.webp',
            src: '/photos/fav1.webp',
            width: 1200,
            height: 800,
        },
        {
            original: '/photos/fav2.webp',
            thumb: '/photos/fav2_thumb.webp',
            src: '/photos/fav2.webp',
            width: 1200,
            height: 800,
        },
    ];

    it('renders shared favorites photos and modal header', () => {
        render(<SharedFavoritesPanel photos={mockPhotos} onClose={vi.fn()} />);

        expect(screen.getByText('FAVORITES')).toBeDefined();
        const photoButtons = screen.getAllByRole('button', { name: /View shared favorites photo/i });
        expect(photoButtons.length).toBe(2);
    });

    it('adds all photos to store favorites when clicking Add to Your Favorites', () => {
        render(<SharedFavoritesPanel photos={mockPhotos} onClose={vi.fn()} />);

        const addBtn = screen.getByRole('button', { name: 'Add to Your Favorites' });
        fireEvent.click(addBtn);

        const storeFavorites = useAppStore.getState().favorites;
        expect(storeFavorites.length).toBe(2);
        expect(screen.getByText('Added')).toBeDefined();
    });

    it('opens lightbox when a photo is clicked', () => {
        render(<SharedFavoritesPanel photos={mockPhotos} onClose={vi.fn()} />);

        const firstPhoto = screen.getByRole('button', { name: 'View shared favorites photo 1' });
        fireEvent.click(firstPhoto);

        const lightboxState = useAppStore.getState().lightbox;
        expect(lightboxState.isOpen).toBe(true);
        expect(lightboxState.index).toBe(0);
        expect(lightboxState.eventName).toBe('Shared Favorites');
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<SharedFavoritesPanel photos={mockPhotos} onClose={onClose} />);

        const closeBtn = screen.getByRole('button', { name: 'Close' });
        fireEvent.click(closeBtn);

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
