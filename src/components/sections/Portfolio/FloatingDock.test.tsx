import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Portfolio from './index';
import { useAppStore } from '../../../store/useAppStore';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({
            children,
            className,
            ...props
        }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
            <div className={className} {...props}>
                {children}
            </div>
        ),
        aside: ({
            children,
            className,
            ...props
        }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => (
            <aside className={className} {...props}>
                {children}
            </aside>
        ),
        article: ({
            children,
            className,
            ...props
        }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => (
            <article className={className} {...props}>
                {children}
            </article>
        ),
        span: ({
            children,
            className,
            ...props
        }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
            <span className={className} {...props}>
                {children}
            </span>
        ),
        button: ({
            children,
            className,
            ...props
        }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
            <button className={className} {...props}>
                {children}
            </button>
        ),
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useInView: () => true,
}));

describe('Portfolio Cohesive Action Dock', () => {
    beforeEach(() => {
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
            favorites: [],
            lightbox: { isOpen: false, images: [], index: 0, eventName: '', year: '' },
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders the cohesive floating dock with search and select buttons without kbd shortcuts', () => {
        render(
            <MemoryRouter initialEntries={['/portfolio/2026']}>
                <Portfolio years={['2026']} />
            </MemoryRouter>
        );

        const dock = document.querySelector('.portfolio__floating-dock');
        expect(dock).not.toBeNull();
        expect(dock?.getAttribute('role')).toBe('toolbar');

        const searchBtn = screen.getByRole('button', { name: /Open Search/i });
        expect(searchBtn).toBeDefined();
        expect(searchBtn.querySelector('.portfolio__dock-btn-kbd')).toBeNull();
        expect(searchBtn.getAttribute('title')).toBe('Search photos');

        const selectBtn = screen.getByRole('button', { name: /Select Photos/i });
        expect(selectBtn).toBeDefined();
        expect(selectBtn.querySelector('.portfolio__dock-btn-kbd')).toBeNull();
        expect(selectBtn.getAttribute('title')).toBe('Select photos');

        const divider = document.querySelector('.portfolio__dock-divider');
        expect(divider).not.toBeNull();
    });

    it('enters select mode when clicking the Select button', () => {
        render(
            <MemoryRouter initialEntries={['/portfolio/2026']}>
                <Portfolio years={['2026']} />
            </MemoryRouter>
        );

        const selectBtn = screen.getByRole('button', { name: /Select Photos/i });
        fireEvent.click(selectBtn);

        expect(useAppStore.getState().isBatchSelectMode).toBe(true);
        expect(screen.getByRole('toolbar', { name: /Batch photo actions toolbar/i })).toBeDefined();
    });

    it('supports keyboard shortcut S to toggle select mode and Escape to exit', () => {
        render(
            <MemoryRouter initialEntries={['/portfolio/2026']}>
                <Portfolio years={['2026']} />
            </MemoryRouter>
        );

        // Press 's' to activate select mode
        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
        });
        expect(useAppStore.getState().isBatchSelectMode).toBe(true);

        // Press 'Escape' to exit select mode
        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });
        expect(useAppStore.getState().isBatchSelectMode).toBe(false);
    });

    it('displays active selection badge when photos are selected', () => {
        useAppStore.setState({
            batchSelectedPhotos: [
                { original: 'photo1.jpg', thumb: 'photo1.jpg', eventName: 'Match 1', year: '2026' },
                { original: 'photo2.jpg', thumb: 'photo2.jpg', eventName: 'Match 1', year: '2026' },
            ],
        });

        render(
            <MemoryRouter initialEntries={['/portfolio/2026']}>
                <Portfolio years={['2026']} />
            </MemoryRouter>
        );

        const badge = document.querySelector('.portfolio__dock-badge');
        expect(badge).not.toBeNull();
        expect(badge?.textContent).toBe('2');

        const selectBtn = document.querySelector('.portfolio__dock-btn--select');
        expect(selectBtn?.classList.contains('portfolio__dock-btn--has-selection')).toBe(true);
    });

    it('renders the floating dock on YOUR FAVORITES tab (/portfolio/favorites)', () => {
        useAppStore.setState({
            favorites: [
                { original: '/photos/2026/fav1.jpg', thumb: '/photos/2026/fav1.jpg', eventName: 'Match 1', year: '2026' },
            ],
        });

        render(
            <MemoryRouter initialEntries={['/portfolio/favorites']}>
                <Portfolio years={['2026']} />
            </MemoryRouter>
        );

        const dock = document.querySelector('.portfolio__floating-dock');
        expect(dock).not.toBeNull();

        const searchBtn = screen.getByRole('button', { name: /Open Search/i });
        expect(searchBtn).toBeDefined();

        const selectBtn = screen.getByRole('button', { name: /Select Photos/i });
        expect(selectBtn).toBeDefined();

        // Verify "YOUR FAVORITES" header is rendered before events
        const favHeader = document.querySelector('.portfolio__favorites-header');
        expect(favHeader).not.toBeNull();
        expect(favHeader?.textContent).toContain('YOUR');
        expect(favHeader?.textContent).toContain('FAVORITES');
    });

    it('renders PortfolioYearTrack on YOUR FAVORITES tab when favorites span multiple years', () => {
        useAppStore.setState({
            favorites: [
                { original: '/photos/2026/fav1.jpg', thumb: '/photos/2026/fav1.jpg', eventName: 'Match 1', year: '2026' },
                { original: '/photos/2024/fav2.jpg', thumb: '/photos/2024/fav2.jpg', eventName: 'Match 2', year: '2024' },
            ],
        });

        render(
            <MemoryRouter initialEntries={['/portfolio/favorites']}>
                <Portfolio years={['2026', '2024']} />
            </MemoryRouter>
        );

        const yearTrack = document.querySelector('.portfolio__year-track');
        expect(yearTrack).not.toBeNull();
        expect(screen.getByRole('button', { name: /Jump to 2026/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /Jump to 2024/i })).toBeDefined();
    });
});
