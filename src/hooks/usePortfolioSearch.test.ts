import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePortfolioSearch } from './usePortfolioSearch';

describe('usePortfolioSearch', () => {
    const mockTeams = [
        { name: 'Bay Area Derby', slug: 'bay-area-derby', count: 12 },
        { name: 'Sacramento Roller Derby', slug: 'sacramento-roller-derby', count: 8 },
        { name: 'Rose City Rollers', slug: 'rose-city-rollers', count: 15 },
    ];

    const mockGear = [
        { id: 'sony-a9iii', name: 'Sony Alpha 9 III', compactName: 'A9 III', shortName: 'A9 III', brand: 'Sony', type: 'camera' as const, photoCount: 200, eventCount: 10 },
        { id: 'canon-r5', name: 'Canon EOS R5', compactName: 'R5', shortName: 'R5', brand: 'Canon', type: 'camera' as const, photoCount: 150, eventCount: 8 },
    ];

    beforeEach(() => {
        vi.restoreAllMocks();
        globalThis.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes('/data/teams/index.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockTeams),
                });
            }
            if (url.includes('/data/gear/index.json')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockGear),
                });
            }
            return Promise.reject(new Error('Unknown url'));
        }) as unknown as typeof fetch;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with default empty state when not open or gear route', () => {
        const { result } = renderHook(() => usePortfolioSearch());

        expect(result.current.teamIndex).toEqual([]);
        expect(result.current.gearIndex).toEqual([]);
        expect(result.current.isTeamIndexLoading).toBe(false);
        expect(result.current.isGearIndexLoading).toBe(false);
        expect(result.current.teamSearchQuery).toBe('');
        expect(result.current.gearSearchQuery).toBe('');
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('automatically triggers fetch if initialSearchOpen is true', async () => {
        const { result } = renderHook(() =>
            usePortfolioSearch({ initialSearchOpen: true })
        );

        await waitFor(() => {
            expect(result.current.teamIndex).toEqual(mockTeams);
            expect(result.current.gearIndex).toEqual(mockGear);
        });

        expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('loads indexes when ensureIndexesLoaded is called', async () => {
        const { result } = renderHook(() => usePortfolioSearch());

        expect(result.current.teamIndex).toHaveLength(0);

        act(() => {
            result.current.ensureIndexesLoaded();
        });

        await waitFor(() => {
            expect(result.current.teamIndex).toEqual(mockTeams);
            expect(result.current.gearIndex).toEqual(mockGear);
        });
    });

    it('filters teams using fuzzy search after fuse module loads', async () => {
        const { result } = renderHook(() =>
            usePortfolioSearch({ initialSearchOpen: true, initialSearchQuery: 'Sacramento' })
        );

        await waitFor(() => {
            expect(result.current.teamIndex.length).toBeGreaterThan(0);
        });

        await waitFor(() => {
            expect(result.current.filteredTeams).toHaveLength(1);
            expect(result.current.filteredTeams[0].slug).toBe('sacramento-roller-derby');
        });

        act(() => {
            result.current.setTeamSearchQuery('Rose');
        });

        await waitFor(() => {
            expect(result.current.filteredTeams).toHaveLength(1);
            expect(result.current.filteredTeams[0].slug).toBe('rose-city-rollers');
        });
    });

    it('filters gear based on gearSearchQuery', async () => {
        const { result } = renderHook(() =>
            usePortfolioSearch({ isGearRoute: true })
        );

        await waitFor(() => {
            expect(result.current.gearIndex.length).toBe(2);
        });

        act(() => {
            result.current.setGearSearchQuery('Canon');
        });

        await waitFor(() => {
            expect(result.current.filteredGear).toHaveLength(1);
            expect(result.current.filteredGear[0].id).toBe('canon-r5');
        });
    });

    it('handles fetch failure gracefully without throwing', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { result } = renderHook(() =>
            usePortfolioSearch({ initialSearchOpen: true })
        );

        await waitFor(() => {
            expect(result.current.isTeamIndexLoading).toBe(false);
            expect(result.current.isGearIndexLoading).toBe(false);
        });

        expect(result.current.teamIndex).toEqual([]);
        expect(result.current.gearIndex).toEqual([]);
        consoleSpy.mockRestore();
    });
});
