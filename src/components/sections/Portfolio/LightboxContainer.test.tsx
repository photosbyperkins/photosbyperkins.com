import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import LightboxContainer from './LightboxContainer';
import { useAppStore } from '../../../store/useAppStore';

vi.mock('./Lightbox', () => ({
    default: ({ images, index }: { images: unknown[]; index: number }) => (
        <div data-testid="mock-lightbox" data-index={String(index)} data-count={images.length}>
            Mock Lightbox
        </div>
    ),
}));

vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return {
        ...actual,
        AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    };
});

describe('LightboxContainer', () => {
    beforeEach(() => {
        useAppStore.getState().closeLightbox();
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders nothing when lightbox.isOpen is false', () => {
        const { container } = render(<LightboxContainer />);
        expect(screen.queryByTestId('mock-lightbox')).toBeNull();
        expect(container.firstChild).toBeNull();
    });

    it('renders Lightbox with store images and index when openLightbox is called', () => {
        render(<LightboxContainer />);

        act(() => {
            useAppStore.getState().openLightbox(
                [
                    { original: '/photos/1.jpg', thumb: '/photos/1_thumb.jpg' },
                    { original: '/photos/2.jpg', thumb: '/photos/2_thumb.jpg' },
                ],
                1,
                'Derby Match',
                '2026'
            );
        });

        const lightboxEl = screen.getByTestId('mock-lightbox');
        expect(lightboxEl).not.toBeNull();
        expect(lightboxEl.getAttribute('data-index')).toBe('1');
        expect(lightboxEl.getAttribute('data-count')).toBe('2');
    });
});
