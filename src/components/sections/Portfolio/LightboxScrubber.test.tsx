import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { motionValue } from 'framer-motion';
import LightboxScrubber, { SCRUBBER_COLUMNS, MAX_SPRITE_FRAMES } from './LightboxScrubber';
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
        const { rerender } = render(
            <LightboxScrubber {...defaultProps} index={0} isFavorite={true} isChangingSlide={false} />
        );

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

    it('renders burst ribbon bars with start/end rounding when images contain burst metadata', () => {
        const burstMeta = {
            id: 'burst-event-1',
            index: 0,
            total: 3,
            deltaSec: 0,
            frameSources: ['/p1.jpg', '/p2.jpg', '/p3.jpg'],
            frameThumbs: ['/t1.jpg', '/t2.jpg', '/t3.jpg'],
            frameDeltas: [0, 0.42, 0.85],
        };

        const burstImages: PhotoInput[] = [
            { original: '/photos/b1.jpg', thumb: '/photos/tb1.jpg', burst: { ...burstMeta, index: 0 } },
            { original: '/photos/b2.jpg', thumb: '/photos/tb2.jpg', burst: { ...burstMeta, index: 1, deltaSec: 0.42 } },
            { original: '/photos/b3.jpg', thumb: '/photos/tb3.jpg', burst: { ...burstMeta, index: 2, deltaSec: 0.85 } },
        ];

        render(<LightboxScrubber {...defaultProps} images={burstImages} index={0} />);

        // Check counter displays clean photo count without tag
        const counter = document.querySelector('.portfolio__lightbox-scrubber-counter');
        expect(counter?.textContent?.trim()).toBe('1 / 3');

        // Check burst bars on thumbnails
        const burstBars = document.querySelectorAll('.portfolio__lightbox-scrubber-burst-bar');
        expect(burstBars.length).toBeGreaterThan(0);

        // First frame should have is-start
        const startBar = document.querySelector('.portfolio__lightbox-scrubber-burst-bar.is-start');
        expect(startBar).not.toBeNull();

        // Last frame should have is-end
        const endBar = document.querySelector('.portfolio__lightbox-scrubber-burst-bar.is-end');
        expect(endBar).not.toBeNull();
    });

    it('renders arbitrary aspect ratio photos in scrubber with focal positioning when no sprite is present', () => {
        const arbitraryBurstMeta = {
            id: 'portrait-burst-1',
            total: 3,
            frameSources: ['/p1.jpg', '/p2.jpg', '/p3.jpg'],
        };

        const portraitAndSquareBurst: PhotoInput[] = [
            {
                original: '/p1.jpg',
                thumb: '/tp1.jpg',
                width: 2000,
                height: 3000, // Portrait 2:3
                focusX: 0.6,
                focusY: 0.35,
                burst: { ...arbitraryBurstMeta, index: 0 },
            },
            {
                original: '/p2.jpg',
                thumb: '/tp2.jpg',
                width: 2000,
                height: 2000, // Square 1:1
                focusX: 0.5,
                focusY: 0.5,
                burst: { ...arbitraryBurstMeta, index: 1, deltaSec: 0.5 },
            },
            {
                original: '/p3.jpg',
                thumb: '/tp3.jpg',
                width: 3000,
                height: 2000, // Landscape 3:2
                burst: { ...arbitraryBurstMeta, index: 2, deltaSec: 1.0 },
            },
        ];

        const { container } = render(
            <LightboxScrubber {...defaultProps} images={portraitAndSquareBurst} index={0} spriteUrl={null} />
        );

        const activeThumb = container.querySelector('.portfolio__lightbox-scrubber-thumb.is-active') as HTMLElement;
        expect(activeThumb).not.toBeNull();
        expect(activeThumb.style.backgroundPosition).toBe('60.0% 35.0%');

        const burstBars = container.querySelectorAll('.portfolio__lightbox-scrubber-burst-bar');
        expect(burstBars.length).toBeGreaterThan(0);
    });

    it('wraps thumbnail indices endlessly and maps wrapped photos accurately across large offsets', () => {
        const { container } = render(<LightboxScrubber {...defaultProps} maxDist={150} index={0} />);

        // With maxDist = 150, 301 thumbnails should be rendered
        const thumbs = container.querySelectorAll('.portfolio__lightbox-scrubber-thumb');
        expect(thumbs.length).toBe(301);

        // Center thumbnail is active
        expect(thumbs[150]?.className).toContain('is-active');

        // Check wrapping across boundaries:
        // offset -150: index (0 - 150) % 3 = 0 -> photo 1
        expect(thumbs[0]?.getAttribute('aria-label')).toContain('Go to photo 1');
        // offset 0: photo 1
        expect(thumbs[150]?.getAttribute('aria-label')).toContain('Go to photo 1');
        // offset 1: photo 2
        expect(thumbs[151]?.getAttribute('aria-label')).toContain('Go to photo 2');
        // offset 2: photo 3
        expect(thumbs[152]?.getAttribute('aria-label')).toContain('Go to photo 3');
        // offset 3: photo 1 (wrapped)
        expect(thumbs[153]?.getAttribute('aria-label')).toContain('Go to photo 1');
    });

    it('exports valid scrubber constants and safeguards', () => {
        expect(SCRUBBER_COLUMNS).toBe(50);
        expect(MAX_SPRITE_FRAMES).toBe(4250);
    });

    it('applies 2x retina scaled backgroundSize and position when spriteUrl is provided', () => {
        const spriteImages: PhotoInput[] = [
            { original: '/p1.jpg', thumb: '/t1.jpg', spriteIndex: 0 },
            { original: '/p2.jpg', thumb: '/t2.jpg', spriteIndex: 1 },
            { original: '/p3.jpg', thumb: '/t3.jpg', spriteIndex: 51 }, // Row 1, Col 1 with SCRUBBER_COLUMNS = 50
        ];

        const { container } = render(
            <LightboxScrubber
                {...defaultProps}
                images={spriteImages}
                index={0}
                spriteUrl="/build/scrubber/sprite.webp"
            />
        );

        const thumbs = container.querySelectorAll('.portfolio__lightbox-scrubber-thumb') as NodeListOf<HTMLElement>;
        // offset 0 is thumb for index 0 (spriteIndex: 0 -> col: 0, row: 0)
        // with maxDist=2 (offsets -2, -1, 0, 1, 2), offset 0 is thumbs[2]
        const activeThumb = thumbs[2];
        expect(activeThumb.style.backgroundImage).toBe('url("/build/scrubber/sprite.webp")');
        expect(activeThumb.style.backgroundPosition).toBe('0px 0px');
        // 3 images -> totalCols = 3, totalRows = 1
        expect(activeThumb.style.backgroundSize).toBe(`${3 * 72}px ${1 * 48}px`);

        // offset 2 is thumb for index 2 (spriteIndex: 51 -> col: 1, row: 1) -> thumbs[4]
        const rowWrapThumb = thumbs[4];
        expect(rowWrapThumb.style.backgroundPosition).toBe(`${-(1 * 72)}px ${-(1 * 48)}px`);
    });
});
