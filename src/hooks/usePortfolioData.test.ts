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
        recapHash: 'hash2026',
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
        expect(result.current.recapHash).toBe('hash2026');
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

    it('groups favorites by event and year reverse-chronologically', () => {
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

        expect(result.current.yearData.Favorites).toBeUndefined();
        const eventKeys = Object.keys(result.current.yearData);
        // Sorted reverse chronologically: Late Game should be before Early Game
        expect(eventKeys).toEqual(['10.20 Late Game', '03.01 Early Game']);
        expect(result.current.yearData['10.20 Late Game'].album).toHaveLength(1);
        expect(result.current.yearData['03.01 Early Game'].album).toHaveLength(1);
    });

    it('groups favorites by event and year reverse-chronologically across multiple years', () => {
        const fav1: FavoriteStoreItem = {
            eventName: '08.10 Arch Rival vs Victorian',
            year: '2024',
            original: '/photos/2024/arch.jpg',
            thumb: '/photos/2024/arch_thumb.jpg',
        };
        const fav2: FavoriteStoreItem = {
            eventName: '11.15 Rose vs Gotham',
            year: '2024',
            original: '/photos/2024/rose.jpg',
            thumb: '/photos/2024/rose_thumb.jpg',
        };
        const fav3: FavoriteStoreItem = {
            eventName: '09.20 Playoffs Day 1',
            year: '2023',
            original: '/photos/2023/playoffs.jpg',
            thumb: '/photos/2023/playoffs_thumb.jpg',
        };

        useAppStore.setState({
            favorites: [fav1, fav2, fav3],
        });

        const { result } = renderHook(() =>
            usePortfolioData({
                selectedTab: 'favorites',
                years,
            })
        );

        expect(result.current.yearData.Favorites).toBeUndefined();
        const eventKeys = Object.keys(result.current.yearData);
        expect(eventKeys).toHaveLength(3);
        // Reverse-chronological order: 2024.11.15, then 2024.08.10, then 2023.09.20
        expect(eventKeys[0]).toBe('11.15 Rose vs Gotham');
        expect(result.current.yearData['11.15 Rose vs Gotham'].originalYear).toBe('2024');
        expect(result.current.yearData['11.15 Rose vs Gotham'].album).toHaveLength(1);

        expect(eventKeys[1]).toBe('08.10 Arch Rival vs Victorian');
        expect(result.current.yearData['08.10 Arch Rival vs Victorian'].originalYear).toBe('2024');

        expect(eventKeys[2]).toBe('09.20 Playoffs Day 1');
        expect(result.current.yearData['09.20 Playoffs Day 1'].originalYear).toBe('2023');
    });

    it('falls back to parsing year and slug from original url when explicit event metadata is absent', () => {
        const fav: FavoriteStoreItem = {
            original: '/photos/2025/2025.04.12-champs/photo1.jpg',
            thumb: '/thumbnails/2025/2025.04.12-champs/photo1.webp',
        };

        useAppStore.setState({
            favorites: [fav],
        });

        const { result } = renderHook(() =>
            usePortfolioData({
                selectedTab: 'favorites',
                years,
            })
        );

        expect(result.current.yearData['2025.04.12-champs']).toBeDefined();
        expect(result.current.yearData['2025.04.12-champs'].originalYear).toBe('2025');
        expect(result.current.yearData['2025.04.12-champs'].album).toHaveLength(1);
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

        expect(result.current.yearData['03.01 Early Game']?.album).toHaveLength(1);

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
        expect(Object.keys(result.current.yearData)).toHaveLength(1);
        expect(result.current.yearData['04.01 Middle Game']).toBeUndefined();

        // Close lightbox
        act(() => {
            useAppStore.setState({
                lightbox: { isOpen: false, index: 0, images: [], eventName: '', year: '' },
            });
        });

        // Now unfrozen, displays 2 items
        expect(Object.keys(result.current.yearData)).toHaveLength(2);
        expect(result.current.yearData['04.01 Middle Game']).toBeDefined();
    });

    it('enriches favorite photos with EXIF from cached album data', async () => {
        const { setCachedAlbum, _clearAlbumCache } = await import('../utils/albumData');
        _clearAlbumCache();
        setCachedAlbum('2024', 'game', [
            {
                original: '/photos/2024/game/photo_001.jpg',
                thumb: '/thumbnails/2024/game/photo_001.avif',
                exif: {
                    cameraModel: 'NIKON Z 8',
                    lens: '135mm Plena',
                },
            },
        ]);

        const favWithoutExif: FavoriteStoreItem = {
            eventName: '10.20 Championship',
            year: '2024',
            original: '/photos/2024/game/photo_001.jpg',
            thumb: '/thumbnails/2024/game/photo_001.avif',
        };

        useAppStore.setState({
            favorites: [favWithoutExif],
            lightbox: { isOpen: false, index: 0, images: [], eventName: '', year: '' },
        });

        const { result } = renderHook(() =>
            usePortfolioData({
                selectedTab: 'favorites',
                years,
            })
        );

        const album = result.current.yearData['10.20 Championship'].album;
        expect(album).toHaveLength(1);
        const photoRecord = album[0] as import('../types').PhotoRecord;
        expect(photoRecord.exif).toEqual({
            cameraModel: 'NIKON Z 8',
            lens: '135mm Plena',
        });
        _clearAlbumCache();
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

    it('evicts least recently used season from cache when exceeding capacity', async () => {
        const manyYears = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];
        (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
            const match = url.match(/\/data\/years\/(\d{4})\.json/);
            const y = match ? match[1] : 'unknown';
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        events: { [`Match in ${y}`]: { album: [], photoCount: 0 } },
                        recapCount: 0,
                    }),
            });
        });

        const { result, rerender } = renderHook(({ tab }) => usePortfolioData({ selectedTab: tab, years: manyYears }), {
            initialProps: { tab: '2026' },
        });

        await waitFor(() => {
            expect(result.current.yearData['Match in 2026']).toBeDefined();
        });

        // Load 6 more seasons (total 7 distinct seasons, capacity is 6)
        for (const yr of ['2025', '2024', '2023', '2022', '2021', '2020']) {
            rerender({ tab: yr });
            await waitFor(() => {
                expect(result.current.yearData[`Match in ${yr}`]).toBeDefined();
            });
        }

        const fetchCallsCount = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

        // Switch back to 2026: since it was evicted, it should trigger a new fetch
        rerender({ tab: '2026' });
        await waitFor(() => {
            expect(result.current.yearData['Match in 2026']).toBeDefined();
        });
        expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallsCount + 1);

        // Switch to 2020: it's recent so it should be served from cache without an extra fetch
        rerender({ tab: '2020' });
        expect(result.current.yearData['Match in 2020']).toBeDefined();
        expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallsCount + 1);
    });
});
