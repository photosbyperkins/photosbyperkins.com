import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePortfolioData, _clearYearDataCache } from './usePortfolioData';
import { useAppStore } from '../store/useAppStore';
import type { FavoriteStoreItem } from '../types';

describe('usePortfolioData', () => {
    const years = ['2026', '2025', '2024'];

    const mock2026Payload = {
        events: {
            '03.15 Match A': {
                album: [{ original: '/photos/a1.jpg', thumb: '/photos/a1_thumb.jpg' }],
                photoCount: 1,
            },
        },
        recapCount: 5,
        recapEvents: [{ eventName: '03.15 Match A', photoIndex: 0 }],
        stats: {
            totalEvents: 1,
            totalPhotos: 1,
            firstSeenTeams: ['Match A'],
            mostSeenTeams: ['Match A'],
            mostUsedCamera: 'Sony A9 III',
            mostUsedLens: '70-200mm GM II',
        },
    };

    const mock2025Payload = {
        events: {
            '05.10 Match B': {
                album: [{ original: '/photos/b1.jpg', thumb: '/photos/b1_thumb.jpg' }],
                photoCount: 1,
            },
        },
        recapCount: 0,
    };

    beforeEach(() => {
        vi.restoreAllMocks();
        _clearYearDataCache();
        useAppStore.setState({
            favorites: [],
            lightbox: { isOpen: false, index: 0, images: [], eventName: '', year: '' },
        });

        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/data/years/2026.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mock2026Payload),
                });
            }
            if (url.includes('/data/years/2025.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mock2025Payload),
                });
            }
            if (url.includes('/data/teams/sac-derby.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            events: {
                                '04.01 Sac Derby': {
                                    album: [{ original: '/photos/s1.jpg', thumb: '/photos/s1_thumb.jpg' }],
                                    photoCount: 1,
                                },
                            },
                        }),
                });
            }
            if (url.includes('/data/gear/sony-a9iii.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            events: {
                                '06.01 Gear Event': {
                                    album: [{ original: '/photos/g1.jpg', thumb: '/photos/g1_thumb.jpg' }],
                                    photoCount: 1,
                                },
                            },
                        }),
                });
            }
            return Promise.reject(new Error(`404: ${url}`));
        }) as unknown as typeof fetch;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('loads active year data on mount and calls onDataLoadAction', async () => {
        const onDataLoadAction = vi.fn();
        const { result } = renderHook(() =>
            usePortfolioData({
                selectedTab: '2026',
                years,
                onDataLoadAction,
            })
        );

        await waitFor(() => {
            expect(result.current.yearData['03.15 Match A']).toBeDefined();
        });

        expect(result.current.recapCount).toBe(5);
        expect(result.current.stats?.mostUsedCamera).toBe('Sony A9 III');
        expect(onDataLoadAction).toHaveBeenCalled();
    });

    it('serves from module cache without network request when switching back to cached year', async () => {
        const { result, rerender } = renderHook(({ tab }) => usePortfolioData({ selectedTab: tab, years }), {
            initialProps: { tab: '2026' },
        });

        await waitFor(() => {
            expect(result.current.yearData['03.15 Match A']).toBeDefined();
        });

        const fetchCallsCount = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

        // Switch to 2025
        rerender({ tab: '2025' });
        await waitFor(() => {
            expect(result.current.yearData['05.10 Match B']).toBeDefined();
        });

        // Switch back to 2026: should serve instantly from cache
        rerender({ tab: '2026' });
        expect(result.current.yearData['03.15 Match A']).toBeDefined();
        // Network calls should only have increased for 2025, not a second time for 2026
        expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallsCount + 1);
    });

    it('loads data from /data/teams/ when selectedTab is a team slug', async () => {
        const { result } = renderHook(() =>
            usePortfolioData({
                selectedTab: 'sac-derby',
                years,
            })
        );

        await waitFor(() => {
            expect(result.current.yearData['04.01 Sac Derby']).toBeDefined();
        });

        const fetchUrls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0] as string);
        expect(fetchUrls.some((url) => url.includes('/data/teams/sac-derby.json'))).toBe(true);
    });

    it('loads data from /data/gear/ when isGearMode is true', async () => {
        const { result } = renderHook(() =>
            usePortfolioData({
                selectedTab: 'sony-a9iii',
                years,
                isGearMode: true,
            })
        );

        await waitFor(() => {
            expect(result.current.yearData['06.01 Gear Event']).toBeDefined();
        });

        const fetchUrls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0] as string);
        expect(fetchUrls.some((url) => url.includes('/data/gear/sony-a9iii.json'))).toBe(true);
    });

    it('synthesizes virtual sorted favorites event without network calls', () => {
        const fav1: FavoriteStoreItem = {
            eventName: '03.01 Early Game',
            year: '2026',
            original: '/photos/early.jpg',
            thumb: '/photos/early_thumb.jpg',
        };
        const fav2: FavoriteStoreItem = {
            eventName: '10.20 Late Game',
            year: '2026',
            original: '/photos/late.jpg',
            thumb: '/photos/late_thumb.jpg',
        };

        useAppStore.setState({ favorites: [fav1, fav2] });

        const { result } = renderHook(() =>
            usePortfolioData({
                selectedTab: 'favorites',
                years,
            })
        );

        expect(result.current.yearData.Favorites).toBeDefined();
        // Sorted reverse chronologically: Late Game should be before Early Game
        const album = result.current.yearData.Favorites.album;
        expect(album).toHaveLength(2);
        expect((album[0] as unknown as { eventName: string }).eventName).toBe('10.20 Late Game');
        expect((album[1] as unknown as { eventName: string }).eventName).toBe('03.01 Early Game');
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('freezes favorites data when lightbox is open and updates when closed', () => {
        const fav1: FavoriteStoreItem = {
            eventName: '03.01 Early Game',
            year: '2026',
            original: '/photos/early.jpg',
            thumb: '/photos/early_thumb.jpg',
        };

        useAppStore.setState({
            favorites: [fav1],
            lightbox: { isOpen: false, index: 0, images: [], eventName: '', year: '' },
        });

        const { result } = renderHook(() =>
            usePortfolioData({
                selectedTab: 'favorites',
                years,
            })
        );

        expect(result.current.yearData.Favorites.album).toHaveLength(1);

        // Open lightbox
        act(() => {
            useAppStore.setState({
                lightbox: { isOpen: true, index: 0, images: [], eventName: '', year: '' },
            });
        });

        // Add a new favorite while lightbox is open
        const fav2: FavoriteStoreItem = {
            eventName: '04.01 Middle Game',
            year: '2026',
            original: '/photos/mid.jpg',
            thumb: '/photos/mid_thumb.jpg',
        };

        act(() => {
            useAppStore.setState({
                favorites: [fav1, fav2],
            });
        });

        // Background list should still be frozen at 1 item!
        expect(result.current.yearData.Favorites.album).toHaveLength(1);

        // Close lightbox
        act(() => {
            useAppStore.setState({
                lightbox: { isOpen: false, index: 0, images: [], eventName: '', year: '' },
            });
        });

        // Now unfrozen, displays 2 items
        expect(result.current.yearData.Favorites.album).toHaveLength(2);
    });

    it('prefetches a tab into cache in the background', async () => {
        const { result } = renderHook(() =>
            usePortfolioData({
                selectedTab: '2026',
                years,
            })
        );

        await waitFor(() => {
            expect(result.current.yearData['03.15 Match A']).toBeDefined();
        });

        act(() => {
            result.current.prefetchTab('2025');
        });

        await waitFor(() => {
            const fetchUrls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.map(
                (call) => call[0] as string
            );
            expect(fetchUrls.some((url) => url.includes('/data/years/2025.json'))).toBe(true);
        });

        // Active year data remains 2026
        expect(result.current.yearData['03.15 Match A']).toBeDefined();
        expect(result.current.yearData['05.10 Match B']).toBeUndefined();
    });

    it('discards stale response when tab is switched before fetch completes', async () => {
        let resolve2026: (value: unknown) => void = () => {};
        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/data/years/2026.json')) {
                return new Promise((resolve) => {
                    resolve2026 = resolve;
                });
            }
            if (url.includes('/data/years/2025.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mock2025Payload),
                });
            }
            return Promise.reject(new Error('Unknown url'));
        }) as unknown as typeof fetch;

        const { result, rerender } = renderHook(({ tab }) => usePortfolioData({ selectedTab: tab, years }), {
            initialProps: { tab: '2026' },
        });

        // Immediately switch to 2025 before 2026 resolves
        rerender({ tab: '2025' });

        await waitFor(() => {
            expect(result.current.yearData['05.10 Match B']).toBeDefined();
        });

        // Now resolve the late 2026 response
        act(() => {
            resolve2026({
                ok: true,
                json: () => Promise.resolve(mock2026Payload),
            });
        });

        // Current active data should still be 2025's, not overwritten by 2026
        expect(result.current.yearData['05.10 Match B']).toBeDefined();
        expect(result.current.yearData['03.15 Match A']).toBeUndefined();
    });
});
