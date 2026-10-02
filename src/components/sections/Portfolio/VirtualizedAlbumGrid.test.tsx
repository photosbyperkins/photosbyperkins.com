import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import VirtualizedAlbumGrid from './VirtualizedAlbumGrid';
import type { PhotoRecord } from '../../../types';

describe('VirtualizedAlbumGrid', () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    const originalIntersectionObserver = globalThis.IntersectionObserver;

    beforeEach(() => {
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as unknown as typeof ResizeObserver;

        globalThis.IntersectionObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as unknown as typeof IntersectionObserver;
    });

    afterEach(() => {
        cleanup();
        globalThis.ResizeObserver = originalResizeObserver;
        globalThis.IntersectionObserver = originalIntersectionObserver;
        vi.restoreAllMocks();
    });

    const mockPhotos: PhotoRecord[] = [
        {
            original: '/photos/match1.webp',
            thumb: '/photos/match1_thumb.webp',
            src: '/photos/match1.webp',
            width: 1200,
            height: 800,
            focusX: 0.5,
            focusY: 0.4,
        },
        {
            original: '/photos/match2.webp',
            thumb: '/photos/match2_thumb.webp',
            src: '/photos/match2.webp',
            width: 1200,
            height: 800,
        },
        {
            original: '/photos/match3.webp',
            thumb: '/photos/match3_thumb.webp',
            src: '/photos/match3.webp',
            width: 1200,
            height: 800,
        },
    ];

    it('renders empty virtual container when no photos are provided', () => {
        const { container } = render(
            <VirtualizedAlbumGrid
                photos={[]}
                eventName="Championship Match"
                selectedYear="2024"
                openLightbox={vi.fn()}
            />
        );

        const virtualContainer = container.querySelector('.portfolio__event-grid--virtual-container');
        expect(virtualContainer).not.toBeNull();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('renders photo buttons with accessible labels', () => {
        render(
            <VirtualizedAlbumGrid
                photos={mockPhotos}
                eventName="Championship Match"
                selectedYear="2024"
                openLightbox={vi.fn()}
            />
        );

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBe(3);
        expect(buttons[0].getAttribute('aria-label')).toBe('View Championship Match photo 1');
        expect(buttons[1].getAttribute('aria-label')).toBe('View Championship Match photo 2');
        expect(buttons[2].getAttribute('aria-label')).toBe('View Championship Match photo 3');
    });

    it('calls openLightbox with correct parameters when a photo is clicked', () => {
        const openLightbox = vi.fn();
        const localScore = { team1Score: 120, team2Score: 90 };

        render(
            <VirtualizedAlbumGrid
                photos={mockPhotos}
                eventName="Championship Match"
                selectedYear="2024"
                maxExifChars={45}
                localScore={localScore}
                openLightbox={openLightbox}
            />
        );

        const secondPhotoButton = screen.getByRole('button', {
            name: 'View Championship Match photo 2',
        });
        fireEvent.click(secondPhotoButton);

        expect(openLightbox).toHaveBeenCalledTimes(1);
        expect(openLightbox).toHaveBeenCalledWith(mockPhotos, 1, 'Championship Match', '2024', 45, localScore);
    });

    it('attaches and detaches scroll listeners safely', () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        const removeSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = render(
            <VirtualizedAlbumGrid
                photos={mockPhotos}
                eventName="Championship Match"
                selectedYear="2024"
                openLightbox={vi.fn()}
            />
        );

        expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });

        unmount();

        expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('renders checkbox roles and handles selection toggling in select mode', () => {
        const onToggleSelect = vi.fn();
        const selectedUrls = new Set<string>(['/photos/match1.webp']);

        render(
            <VirtualizedAlbumGrid
                photos={mockPhotos}
                eventName="Championship Match"
                selectedYear="2024"
                openLightbox={vi.fn()}
                isSelectMode={true}
                selectedUrls={selectedUrls}
                onToggleSelect={onToggleSelect}
            />
        );

        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBe(3);

        // Photo 1 should be selected
        expect(checkboxes[0].getAttribute('aria-checked')).toBe('true');
        expect(checkboxes[0].getAttribute('aria-label')).toBe('Championship Match photo 1, selected');

        // Photo 2 should not be selected
        expect(checkboxes[1].getAttribute('aria-checked')).toBe('false');
        expect(checkboxes[1].getAttribute('aria-label')).toBe('Championship Match photo 2, not selected');

        // Clicking photo 2 calls onToggleSelect with index 1
        fireEvent.click(checkboxes[1]);
        expect(onToggleSelect).toHaveBeenCalledTimes(1);
        expect(onToggleSelect).toHaveBeenCalledWith(mockPhotos[1], 1, false);

        // Shift+Click calls onToggleSelect with isShift = true
        fireEvent.click(checkboxes[2], { shiftKey: true });
        expect(onToggleSelect).toHaveBeenCalledWith(mockPhotos[2], 2, true);

        // Space key triggers onToggleSelect
        fireEvent.keyDown(checkboxes[1], { key: ' ' });
        expect(onToggleSelect).toHaveBeenCalledWith(mockPhotos[1], 1, false);
    });
});
