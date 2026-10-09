import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import Lightbox from './Lightbox';
import { useAppStore } from '../../../store/useAppStore';
import type { PhotoInput } from '../../../types';

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className, style, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
                <div className={className} style={style} {...props}>
                    {children}
                </div>
            ),
            img: ({ src, alt, className, onLoad, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
                <img src={src} alt={alt} className={className} onLoad={onLoad} {...props} />
            ),
        },
        AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
        animate: (_val: unknown, _target: unknown, opts?: { onComplete?: () => void }) => {
            opts?.onComplete?.();
            return { stop: () => {} };
        },
    };
});

describe('Lightbox', () => {
    const mockImages: PhotoInput[] = [
        { original: '/photos/photo_01.jpg', thumb: '/photos/photo_01_thumb.jpg', exif: { cameraModel: 'Nikon Z8' } },
        { original: '/photos/photo_02.jpg', thumb: '/photos/photo_02_thumb.jpg', exif: { lens: 'Nikon 70-200mm' } },
        { original: '/photos/photo_03.jpg', thumb: '/photos/photo_03_thumb.jpg' },
    ];

    const defaultProps = {
        images: mockImages,
        index: 0,
        year: '2026',
        eventName: 'Championship Match',
        onClose: vi.fn(),
        onSetIndex: vi.fn(),
    };

    beforeEach(() => {
        useAppStore.setState({ favorites: [] });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders lightbox dialog with current image and sets document.title', () => {
        render(<Lightbox {...defaultProps} />);

        expect(screen.getByRole('dialog', { name: 'Photo lightbox' })).not.toBeNull();
        expect(document.title).toContain('Championship Match');
    });

    it('navigates to next photo via chevron', async () => {
        render(<Lightbox {...defaultProps} index={1} />);

        const nextOverlay = document.querySelector('.portfolio__lightbox-nav-overlay--right');
        expect(nextOverlay).not.toBeNull();
        fireEvent.click(nextOverlay!);
        await waitFor(() => {
            expect(defaultProps.onSetIndex).toHaveBeenCalledWith(2);
        });
    });

    it('navigates to prev photo via chevron', async () => {
        render(<Lightbox {...defaultProps} index={1} />);

        const prevOverlay = document.querySelector('.portfolio__lightbox-nav-overlay--left');
        expect(prevOverlay).not.toBeNull();
        fireEvent.click(prevOverlay!);
        await waitFor(() => {
            expect(defaultProps.onSetIndex).toHaveBeenCalledWith(0);
        });
    });

    it('calls onClose when close button is clicked', () => {
        render(<Lightbox {...defaultProps} />);

        const closeBtn = screen.getByRole('button', { name: 'Close' });
        fireEvent.click(closeBtn);

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('handles keyboard shortcuts (ArrowRight, ArrowLeft, Escape)', async () => {
        const { unmount } = render(<Lightbox {...defaultProps} index={1} />);

        // ArrowRight -> next
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        await waitFor(() => {
            expect(defaultProps.onSetIndex).toHaveBeenCalledWith(2);
        });

        // Escape -> close
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(defaultProps.onClose).toHaveBeenCalled();

        unmount();

        // Separate render for ArrowLeft
        render(<Lightbox {...defaultProps} index={1} />);
        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        await waitFor(() => {
            expect(defaultProps.onSetIndex).toHaveBeenCalledWith(0);
        });
    });

    it('toggles favorite on keypress "f"', () => {
        render(<Lightbox {...defaultProps} index={0} />);

        expect(useAppStore.getState().favorites).toHaveLength(0);

        fireEvent.keyDown(window, { key: 'f' });
        expect(useAppStore.getState().favorites).toHaveLength(1);

        fireEvent.keyDown(window, { key: 'f' });
        expect(useAppStore.getState().favorites).toHaveLength(0);
    });

    it('toggles theater mode on keypress "t"', () => {
        render(<Lightbox {...defaultProps} />);

        const dialog = screen.getByRole('dialog');
        expect(dialog.classList.contains('is-theater-mode')).toBe(false);

        fireEvent.keyDown(window, { key: 't' });
        expect(dialog.classList.contains('is-theater-mode')).toBe(true);

        fireEvent.keyDown(window, { key: 't' });
        expect(dialog.classList.contains('is-theater-mode')).toBe(false);
    });

    it('appends scrubberHash to scrubber spriteUrl when provided on images', () => {
        const imagesWithSprite: PhotoInput[] = [
            { original: '/photos/photo_01.jpg', thumb: '/thumbnails/2026/event/photo_01.webp', spriteIndex: 0, scrubberHash: 'hash123456' },
            { original: '/photos/photo_02.jpg', thumb: '/thumbnails/2026/event/photo_02.webp', spriteIndex: 1, scrubberHash: 'hash123456' },
        ];
        render(<Lightbox {...defaultProps} images={imagesWithSprite} />);
        const scrubberThumbs = document.querySelectorAll('.portfolio__lightbox-scrubber-thumb');
        expect(scrubberThumbs.length).toBeGreaterThan(0);
        const firstThumb = scrubberThumbs[0] as HTMLElement;
        expect(firstThumb.style.backgroundImage).toContain('/scrubber/2026/event/sprite.webp?h=hash123456');
    });
});
