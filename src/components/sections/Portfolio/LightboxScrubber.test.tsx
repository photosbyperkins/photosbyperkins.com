import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';
import { motionValue } from 'framer-motion';
import LightboxScrubber from './LightboxScrubber';
import type { PhotoInput } from '../../../types';

describe('LightboxScrubber', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    const mockImages: PhotoInput[] = [
        { original: '/photos/1.jpg', thumb: '/photos/t1.jpg' },
        { original: '/photos/2.jpg', thumb: '/photos/t2.jpg' },
        { original: '/photos/3.jpg', thumb: '/photos/t3.jpg' },
    ];

    const defaultProps = {
        images: mockImages,
        index: 0,
        maxDist: 2,
        spriteUrl: null,
        getThumbSrc: (photo: PhotoInput) => (typeof photo === 'string' ? photo : photo.thumb),
        checkIfFavorite: (photo: PhotoInput) => typeof photo !== 'string' && photo.original === '/photos/1.jpg',
        trackX: motionValue(0),
        thumbOpacity0: motionValue(1),
        thumbOpacityPrev: motionValue(0.5),
        thumbOpacityNext: motionValue(0.5),
        emptyHeartOpacity: motionValue(0),
        filledHeartOpacity: motionValue(1),
        filledHeartScale: motionValue(1),
        onSetIndex: vi.fn(),
        toggleFavorite: vi.fn(),
        isFavorite: true,
    };

    it('renders playhead heart with is-active when isFavorite is true and not changing slides', () => {
        render(<LightboxScrubber {...defaultProps} isFavorite={true} isChangingSlide={false} />);

        const heartBtn = screen.getByRole('button', { name: 'Toggle Favorite' });
        expect(heartBtn.className).toContain('is-active');
        expect(heartBtn.className).not.toContain('is-popping');
    });

    it('suppresses is-active when isChangingSlide is true', () => {
        render(<LightboxScrubber {...defaultProps} isFavorite={true} isChangingSlide={true} />);

        const heartBtn = screen.getByRole('button', { name: 'Toggle Favorite' });
        expect(heartBtn.className).not.toContain('is-active');
    });

    it('suppresses is-active temporarily when index changes', () => {
        vi.useFakeTimers();
        const { rerender } = render(<LightboxScrubber {...defaultProps} index={0} isFavorite={true} isChangingSlide={false} />);

        const heartBtn = screen.getByRole('button', { name: 'Toggle Favorite' });
        expect(heartBtn.className).toContain('is-active');

        // Change index to 1 while favorite
        rerender(<LightboxScrubber {...defaultProps} index={1} isFavorite={true} isChangingSlide={false} />);

        // Should temporarily suppress is-active
        expect(heartBtn.className).not.toContain('is-active');

        // Advance timers past 150ms
        act(() => {
            vi.advanceTimersByTime(200);
        });

        // is-active should be restored
        expect(heartBtn.className).toContain('is-active');
    });

    it('applies is-popping when isPopping is true and not changing slides', () => {
        render(<LightboxScrubber {...defaultProps} isFavorite={true} isChangingSlide={false} isPopping={true} />);

        const heartBtn = screen.getByRole('button', { name: 'Toggle Favorite' });
        expect(heartBtn.className).toContain('is-active');
        expect(heartBtn.className).toContain('is-popping');
    });

    it('suppresses is-popping when isChangingSlide is true', () => {
        render(<LightboxScrubber {...defaultProps} isFavorite={true} isChangingSlide={true} isPopping={true} />);

        const heartBtn = screen.getByRole('button', { name: 'Toggle Favorite' });
        expect(heartBtn.className).not.toContain('is-popping');
        expect(heartBtn.className).not.toContain('is-active');
    });

    it('renders thumb hearts with portfolio__lightbox-scrubber-heart--thumb modifier', () => {
        render(<LightboxScrubber {...defaultProps} />);

        const thumbHearts = document.querySelectorAll('.portfolio__lightbox-scrubber-heart--thumb');
        expect(thumbHearts.length).toBeGreaterThan(0);
        thumbHearts.forEach((thumbHeart) => {
            expect(thumbHeart.className).toContain('portfolio__lightbox-scrubber-heart--thumb');
        });
    });

    it('calls toggleFavorite when playhead heart is clicked', () => {
        const toggleFavorite = vi.fn();
        render(<LightboxScrubber {...defaultProps} toggleFavorite={toggleFavorite} />);

        const heartBtn = screen.getByRole('button', { name: 'Toggle Favorite' });
        fireEvent.click(heartBtn);

        expect(toggleFavorite).toHaveBeenCalledTimes(1);
    });
});
