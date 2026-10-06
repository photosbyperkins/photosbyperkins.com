import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Portfolio from './index';
import { useAppStore } from '../../../store/useAppStore';

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

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
            <div className={className} {...props}>
                {children}
            </div>
        ),
        article: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => (
            <article className={className} {...props}>
                {children}
            </article>
        ),
        span: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
            <span className={className} {...props}>
                {children}
            </span>
        ),
        button: ({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
            <button className={className} {...props}>
                {children}
            </button>
        ),
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useInView: () => true,
}));

describe('Portfolio Favorites Header Actions', () => {
    beforeEach(() => {
        mockCanShare = false;
        mockStartZipping.mockClear();

        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ events: {}, recapCount: 0, recapEvents: [] }),
            })
        );

        useAppStore.setState({
            isBatchSelectMode: false,
            batchSelectedPhotos: [],
            favorites: [
                { original: '/photos/2026/fav1.jpg', thumb: '/photos/2026/fav1.jpg', eventName: 'Match 1', year: '2026' },
                { original: '/photos/2024/fav2.jpg', thumb: '/photos/2024/fav2.jpg', eventName: 'Match 2', year: '2024' },
            ],
            lightbox: { isOpen: false, images: [], index: 0, eventName: '', year: '' },
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders Download All Favorites button on desktop and triggers startZipping on all favorites', () => {
        mockCanShare = false;

        render(
            <MemoryRouter initialEntries={['/portfolio/favorites']}>
                <Portfolio years={['2026', '2024']} />
            </MemoryRouter>
        );

        const favHeader = document.querySelector('.portfolio__favorites-header');
        expect(favHeader).not.toBeNull();

        const downloadBtns = screen.getAllByRole('button', { name: /Download All Original Photos \(\.zip\)/i });
        // The first download button is in the top-level favorites header
        const topHeaderDownloadBtn = downloadBtns[0];
        expect(topHeaderDownloadBtn).toBeDefined();

        fireEvent.click(topHeaderDownloadBtn);

        expect(mockStartZipping).toHaveBeenCalledWith(
            ['/photos/2026/fav1.jpg', '/photos/2024/fav2.jpg'],
            'Favorites.zip'
        );
    });

    it('renders Share Favorites button on mobile and triggers navigator.share with all favorites', async () => {
        mockCanShare = true;
        const mockShare = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'share', {
            value: mockShare,
            configurable: true,
            writable: true,
        });

        render(
            <MemoryRouter initialEntries={['/portfolio/favorites']}>
                <Portfolio years={['2026', '2024']} />
            </MemoryRouter>
        );

        const favHeader = document.querySelector('.portfolio__favorites-header');
        expect(favHeader).not.toBeNull();

        const shareBtns = screen.getAllByRole('button', { name: /Share Favorites/i });
        const topHeaderShareBtn = shareBtns[0];
        expect(topHeaderShareBtn).toBeDefined();

        fireEvent.click(topHeaderShareBtn);

        await vi.waitFor(() => {
            expect(mockShare).toHaveBeenCalledTimes(1);
        });
        const shareArg = mockShare.mock.calls[0][0];
        expect(shareArg.title).toBe('My Favorite Photos');
        expect(shareArg.text).toBe('Check out my 2 favorite photos!');
        expect(shareArg.url).toContain('/portfolio/favorites#photos=');
    });
});
