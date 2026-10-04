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

    it('renders download favorites button when hasAlbumPhotos is true even if canShare is true', () => {
        render(<EventActions {...defaultProps} eventName="Favorites" hasAlbumPhotos={true} canShare={true} />);

        const downloadBtn = screen.getByRole('button', { name: /Download Favorites as .zip/i });
        expect(downloadBtn).toBeDefined();

        const shareBtn = screen.getByRole('button', { name: /Share Favorites/i });
        expect(shareBtn).toBeDefined();
    });

    it('renders album download link when zip is provided even if canShare is true', () => {
        render(<EventActions {...defaultProps} zip="/downloads/event.zip" canShare={true} />);

        const downloadLink = screen.getByTitle(/Download All Original Photos \(\.zip\)/i);
        expect(downloadLink).toBeDefined();

        const shareBtn = screen.getByRole('button', { name: /Share Album/i });
        expect(shareBtn).toBeDefined();
    });
});

