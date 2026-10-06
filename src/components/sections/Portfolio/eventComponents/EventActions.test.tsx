import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { EventActions } from './EventActions';
import { useAppStore } from '../../../../store/useAppStore';

const componentCache: Record<
    string,
    React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLElement> & Record<string, unknown>>
> = {};

vi.mock('framer-motion', () => ({
    motion: new Proxy(
        {},
        {
            get: (_target, prop: string) => {
                if (!componentCache[prop]) {
                    const Component = React.forwardRef<
                        HTMLElement,
                        { children?: React.ReactNode } & Record<string, unknown>
                    >(({ children, ...props }, ref) => {
                        const {
                            layoutId: _l,
                            transition: _t,
                            initial: _i,
                            animate: _a,
                            exit: _e,
                            whileHover: _wh,
                            whileTap: _wt,
                            ...domProps
                        } = props;
                        return React.createElement(prop, { ...domProps, ref }, children as React.ReactNode);
                    });
                    Component.displayName = `motion.${prop}`;
                    componentCache[prop] = Component;
                }
                return componentCache[prop];
            },
        }
    ),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

describe('EventActions', () => {
    beforeEach(() => {
        useAppStore.setState({
            favorites: [],
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const defaultProps = {
        eventName: '2024-03-01 Gotham Girls Roller Derby',
        date: 'March 1, 2024',
        zip: '/downloads/event.zip',
        canShare: true,
        selectedYear: '2024',
        hasAlbumPhotos: true,
        isZipping: false,
        zipProgress: 0,
        onDownloadFavorites: vi.fn(),
        isGridView: false,
        onToggleGridView: vi.fn(),
    };

    it('renders segmented toggle with featured/highlights active by default', () => {
        render(<EventActions {...defaultProps} isGridView={false} />);

        const starBtn = screen.getByRole('button', { name: /Show Featured Photos/i });
        const gridBtn = screen.getByRole('button', { name: /Show Full Album/i });

        expect(starBtn).toBeDefined();
        expect(gridBtn).toBeDefined();

        expect(starBtn.classList.contains('active')).toBe(true);
        expect(gridBtn.classList.contains('active')).toBe(false);

        // Featured button contains the sliding motion pill
        const pill = starBtn.querySelector('.portfolio__segment-pill');
        expect(pill).not.toBeNull();
        expect(gridBtn.querySelector('.portfolio__segment-pill')).toBeNull();
    });

    it('renders segmented toggle with full album active when isGridView is true', () => {
        render(<EventActions {...defaultProps} isGridView={true} />);

        const starBtn = screen.getByRole('button', { name: /Show Featured Photos/i });
        const gridBtn = screen.getByRole('button', { name: /Show Full Album/i });

        expect(starBtn.classList.contains('active')).toBe(false);
        expect(gridBtn.classList.contains('active')).toBe(true);

        // Full album button contains the sliding motion pill
        expect(starBtn.querySelector('.portfolio__segment-pill')).toBeNull();
        const pill = gridBtn.querySelector('.portfolio__segment-pill');
        expect(pill).not.toBeNull();
    });

    it('triggers onToggleGridView only when clicking the inactive segment', () => {
        const onToggleGridView = vi.fn();
        const { rerender } = render(
            <EventActions {...defaultProps} isGridView={false} onToggleGridView={onToggleGridView} />
        );

        const starBtn = screen.getByRole('button', { name: /Show Featured Photos/i });
        const gridBtn = screen.getByRole('button', { name: /Show Full Album/i });

        // Clicking the currently active star button should NOT trigger onToggleGridView
        fireEvent.click(starBtn);
        expect(onToggleGridView).not.toHaveBeenCalled();

        // Clicking the inactive grid button SHOULD trigger onToggleGridView
        fireEvent.click(gridBtn);
        expect(onToggleGridView).toHaveBeenCalledTimes(1);

        // Rerender as active grid
        rerender(<EventActions {...defaultProps} isGridView={true} onToggleGridView={onToggleGridView} />);

        // Clicking the active grid button should NOT trigger onToggleGridView
        fireEvent.click(gridBtn);
        expect(onToggleGridView).toHaveBeenCalledTimes(1);

        // Clicking the inactive star button SHOULD trigger onToggleGridView
        fireEvent.click(starBtn);
        expect(onToggleGridView).toHaveBeenCalledTimes(2);
    });

    it('does not render segmented toggle for Favorites album', () => {
        render(<EventActions {...defaultProps} eventName="Favorites" />);

        expect(screen.queryByRole('button', { name: /Show Featured Photos/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /Show Full Album/i })).toBeNull();
    });

    it('renders share favorites button and hides download favorites button when canShare is true', () => {
        render(<EventActions {...defaultProps} eventName="Favorites" hasAlbumPhotos={true} canShare={true} />);

        expect(screen.queryByRole('button', { name: /Download Favorites as .zip/i })).toBeNull();
        const shareBtn = screen.getByRole('button', { name: /Share Favorites/i });
        expect(shareBtn).toBeDefined();
    });

    it('renders download favorites button and hides share favorites button when canShare is false', () => {
        render(<EventActions {...defaultProps} eventName="Favorites" hasAlbumPhotos={true} canShare={false} />);

        const downloadBtn = screen.getByRole('button', { name: /Download Favorites as .zip/i });
        expect(downloadBtn).toBeDefined();
        expect(screen.queryByRole('button', { name: /Share Favorites/i })).toBeNull();
    });

    it('renders share album button and hides download link when canShare is true', () => {
        render(<EventActions {...defaultProps} zip="/downloads/event.zip" canShare={true} />);

        expect(screen.queryByTitle(/Download All Original Photos \(\.zip\)/i)).toBeNull();
        const shareBtn = screen.getByRole('button', { name: /Share Album/i });
        expect(shareBtn).toBeDefined();
    });

    it('renders download link and hides share album button when canShare is false', () => {
        render(<EventActions {...defaultProps} zip="/downloads/event.zip" canShare={false} />);

        const downloadLink = screen.getByTitle(/Download All Original Photos \(\.zip\)/i);
        expect(downloadLink).toBeDefined();
        expect(screen.queryByRole('button', { name: /Share Album/i })).toBeNull();
    });

    it('renders download button titled "Download All Original Photos (.zip)" on favorites tab when canShare is false', () => {
        const onDownloadFavorites = vi.fn();
        render(
            <EventActions
                {...defaultProps}
                eventName="2024.03.15 vs Salpointe"
                hasAlbumPhotos={true}
                canShare={false}
                isFavoritesTab={true}
                onDownloadFavorites={onDownloadFavorites}
            />
        );

        // Should NOT render static <a download> link
        expect(screen.queryByRole('link')).toBeNull();

        // Should render <button> with "Download All Original Photos (.zip)"
        const downloadBtn = screen.getByRole('button', { name: /Download All Original Photos \(\.zip\)/i });
        expect(downloadBtn).toBeDefined();

        fireEvent.click(downloadBtn);
        expect(onDownloadFavorites).toHaveBeenCalledTimes(1);
    });

    it('renders share favorites button on favorites tab when canShare is true', () => {
        render(
            <EventActions
                {...defaultProps}
                eventName="2024.03.15 vs Salpointe"
                hasAlbumPhotos={true}
                canShare={true}
                isFavoritesTab={true}
            />
        );

        expect(screen.queryByTitle(/Download All Original Photos \(\.zip\)/i)).toBeNull();
        const shareBtn = screen.getByRole('button', { name: /Share Favorites/i });
        expect(shareBtn).toBeDefined();
    });

    it('triggers onShareFavorites when share button is clicked on favorites tab', () => {
        const onShareFavorites = vi.fn();
        render(
            <EventActions
                {...defaultProps}
                eventName="2024.03.15 vs Salpointe"
                hasAlbumPhotos={true}
                canShare={true}
                isFavoritesTab={true}
                onShareFavorites={onShareFavorites}
            />
        );

        const shareBtn = screen.getByRole('button', { name: /Share Favorites/i });
        fireEvent.click(shareBtn);
        expect(onShareFavorites).toHaveBeenCalledTimes(1);
    });

    it('falls back to navigator.share when onShareFavorites is not provided', async () => {
        const mockShare = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'share', {
            value: mockShare,
            configurable: true,
            writable: true,
        });

        useAppStore.setState({
            favorites: [
                { original: '/photos/2024/game/photo_001.jpg', thumb: '/photos/2024/game/photo_001.jpg', width: 100, height: 100 },
            ],
        });

        render(
            <EventActions
                {...defaultProps}
                eventName="2024.03.15 vs Salpointe"
                hasAlbumPhotos={true}
                canShare={true}
                isFavoritesTab={true}
            />
        );

        const shareBtn = screen.getByRole('button', { name: /Share Favorites/i });
        fireEvent.click(shareBtn);

        await vi.waitFor(() => {
            expect(mockShare).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'My Favorite Photos',
                    text: 'Check out my 1 favorite photos!',
                })
            );
        });
    });
});

