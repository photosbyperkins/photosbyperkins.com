import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Portfolio from './index';
import { useAppStore } from '../../../store/useAppStore';
import { _clearYearDataCache } from '../../../hooks/usePortfolioData';
import type { YearData } from '../../../types';

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
    useInView: () => true,
}));

vi.mock('./StoryExportModal', () => ({
    default: () => null,
}));

vi.mock('./GlobalSearchOverlay', () => ({
    default: () => null,
}));

vi.mock('./LightboxContainer', () => ({
    default: () => null,
}));

describe('Portfolio Select All visible photos', () => {
    // 10 highlights for event 1 (numbers 1 to 10)
    const mockHighlightsEvent1 = Array.from({ length: 10 }, (_, i) => ({
        original: `/photos/2026/game1/photo_${String(i + 1).padStart(3, '0')}.jpg`,
        thumb: `/thumbnails/2026/game1/photo_${String(i + 1).padStart(3, '0')}.avif`,
    }));

    // 8 album photos for event 1
    const mockAlbumEvent1 = Array.from({ length: 8 }, (_, i) => ({
        original: `/photos/2026/game1/photo_${String(i + 1).padStart(3, '0')}.jpg`,
        thumb: `/thumbnails/2026/game1/photo_${String(i + 1).padStart(3, '0')}.avif`,
    }));

    // 10 highlights for event 2
    const mockHighlightsEvent2 = Array.from({ length: 10 }, (_, i) => ({
        original: `/photos/2026/game2/photo_${String(i + 1).padStart(3, '0')}.jpg`,
        thumb: `/thumbnails/2026/game2/photo_${String(i + 1).padStart(3, '0')}.avif`,
    }));

    const mockYearData: YearData = {
        '09.19 Alpha vs Beta': {
            album: mockAlbumEvent1,
            highlights: mockHighlightsEvent1,
            photoCount: 8,
            albumSlug: '0919-game1',
            originalYear: '2026',
        },
        '08.22 Gamma vs Delta': {
            album: [],
            highlights: mockHighlightsEvent2,
            photoCount: 10,
            albumSlug: '0822-game2',
            originalYear: '2026',
        },
    };

    beforeEach(() => {
        _clearYearDataCache();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation((url: string) => {
                if (url.includes('/data/years/2026.json')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ events: mockYearData, recapCount: 0, recapEvents: [] }),
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => [],
                });
            })
        );

        useAppStore.setState({
            isBatchSelectMode: false,
            batchSelectedPhotos: [],
            visiblePhotosMap: {},
            favorites: [],
            lightbox: { isOpen: false, images: [], index: 0, eventName: '', year: '' },
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('selects exactly visible photos (5 per event) when all events are in highlight mode', async () => {
        render(
            <MemoryRouter initialEntries={['/portfolio/2026']}>
                <Portfolio years={['2026']} />
            </MemoryRouter>
        );

        // Wait for events to render
        await waitFor(() => {
            expect(screen.getByText('Alpha')).toBeDefined();
            expect(screen.getByText('Gamma')).toBeDefined();
        });

        // Enter batch select mode via floating dock button
        const selectBtn = screen.getByRole('button', { name: /Select Photos/i });
        fireEvent.click(selectBtn);
        expect(useAppStore.getState().isBatchSelectMode).toBe(true);

        // Visible photo thumbnails in highlight mode (5 per event = 10 total)
        const visibleCheckboxes = screen.getAllByRole('checkbox');
        expect(visibleCheckboxes.length).toBe(10);

        // Click "Select All" in the BatchActionBar
        const selectAllBtn = screen.getByRole('button', { name: /^Select All$/i });
        fireEvent.click(selectAllBtn);

        // Every visible thumbnail is now aria-checked="true"
        const updatedCheckboxes = screen.getAllByRole('checkbox');
        expect(updatedCheckboxes.length).toBe(10);
        for (const cb of updatedCheckboxes) {
            expect(cb.getAttribute('aria-checked')).toBe('true');
        }

        // Batch bar shows exactly 10 selected (5 from event 1 + 5 from event 2)
        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(10);
        const countNum = document.querySelector('.portfolio__batch-count-num');
        expect(countNum?.textContent).toBe('10');
    });

    it('selects all visible photos when one event is expanded to full album mode', async () => {
        render(
            <MemoryRouter initialEntries={['/portfolio/2026']}>
                <Portfolio years={['2026']} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Alpha')).toBeDefined();
        });

        // Expand Event 1 to Full Album mode
        const fullAlbumBtns = screen.getAllByRole('button', { name: /Show Full Album/i });
        fireEvent.click(fullAlbumBtns[0]);

        // Enter select mode
        const selectBtn = screen.getByRole('button', { name: /Select Photos/i });
        fireEvent.click(selectBtn);

        // Event 1 has 8 album photos, Event 2 has 5 highlight photos = 13 visible photos
        const visibleCheckboxes = screen.getAllByRole('checkbox');
        expect(visibleCheckboxes.length).toBe(13);

        // Click Select All
        const selectAllBtn = screen.getByRole('button', { name: /^Select All$/i });
        fireEvent.click(selectAllBtn);

        // All 13 visible thumbnails are selected
        const updatedCheckboxes = screen.getAllByRole('checkbox');
        expect(updatedCheckboxes.length).toBe(13);
        for (const cb of updatedCheckboxes) {
            expect(cb.getAttribute('aria-checked')).toBe('true');
        }

        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(13);
        const countNum = document.querySelector('.portfolio__batch-count-num');
        expect(countNum?.textContent).toBe('13');
    });

    it('updates selection when switching back from full album to highlights', async () => {
        render(
            <MemoryRouter initialEntries={['/portfolio/2026']}>
                <Portfolio years={['2026']} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Alpha')).toBeDefined();
        });

        // 1. Expand Event 1 to Full Album mode
        const fullAlbumBtns = screen.getAllByRole('button', { name: /Show Full Album/i });
        fireEvent.click(fullAlbumBtns[0]);

        // 2. Enter select mode & Select All
        const selectBtn = screen.getByRole('button', { name: /Select Photos/i });
        fireEvent.click(selectBtn);

        await waitFor(() => {
            expect(screen.getAllByRole('checkbox').length).toBe(13);
        });

        const selectAllBtn = screen.getByRole('button', { name: /^Select All$/i });
        fireEvent.click(selectAllBtn);
        expect(useAppStore.getState().batchSelectedPhotos.length).toBe(13);

        // 3. Switch Event 1 back to Highlights mode
        const showHighlightsBtns = screen.getAllByRole('button', { name: /Show Featured Photos/i });
        fireEvent.click(showHighlightsBtns[0]);

        // Visible photos are now 5 (Event 1) + 5 (Event 2) = 10
        const visibleCheckboxes = screen.getAllByRole('checkbox');
        expect(visibleCheckboxes.length).toBe(10);

        // All 10 visible thumbnails remain selected because they were part of the previous selection
        for (const cb of visibleCheckboxes) {
            expect(cb.getAttribute('aria-checked')).toBe('true');
        }
    });

    it('selects all visible photos including visible recap slices when recap is present', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation((url: string) => {
                if (url.includes('/data/years/2026.json')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            events: mockYearData,
                            recapCount: 3,
                            recapEvents: [
                                { eventName: '09.19 Alpha vs Beta', photoIndex: 0 },
                                { eventName: '09.19 Alpha vs Beta', photoIndex: 1 },
                                { eventName: '08.22 Gamma vs Delta', photoIndex: 0 },
                            ],
                        }),
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => [],
                });
            })
        );

        render(
            <MemoryRouter initialEntries={['/portfolio/2026']}>
                <Portfolio years={['2026']} />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Alpha')).toBeDefined();
        });

        // Enter batch select mode via floating dock button
        const selectBtn = screen.getByRole('button', { name: /Select Photos/i });
        fireEvent.click(selectBtn);
        expect(useAppStore.getState().isBatchSelectMode).toBe(true);

        // Click "Select All" in the BatchActionBar
        const selectAllBtn = screen.getByRole('button', { name: /^Select All$/i });
        fireEvent.click(selectAllBtn);

        // All visible checkboxes (10 from events + 3 from recap = 13 total) should be checked
        await waitFor(() => {
            const checkboxes = screen.getAllByRole('checkbox');
            expect(checkboxes.length).toBe(13);
            for (const cb of checkboxes) {
                expect(cb.getAttribute('aria-checked')).toBe('true');
            }
        });
    });
});
