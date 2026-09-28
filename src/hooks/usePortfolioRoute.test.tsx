import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { usePortfolioRoute } from './usePortfolioRoute';
import { useAppStore } from '../store/useAppStore';

describe('usePortfolioRoute', () => {
    const mockYears = ['2026', '2025', '2024'];

    beforeEach(() => {
        vi.clearAllMocks();
        useAppStore.setState({ sharedPhoto: null });
    });

    const createWrapper = (initialUrl: string) => {
        return ({ children }: { children: React.ReactNode }) => (
            <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
        );
    };

    it('defaults to first year when root /portfolio is visited', () => {
        const { result } = renderHook(() => usePortfolioRoute({ years: mockYears }), {
            wrapper: createWrapper('/portfolio'),
        });

        expect(result.current.selectedTab).toBe('2026');
        expect(result.current.isGearRoute).toBe(false);
        expect(result.current.isTeamRoute).toBe(false);
        expect(result.current.initialSearchOpen).toBe(false);
    });

    it('resolves explicit year tab from route', () => {
        const { result } = renderHook(() => usePortfolioRoute({ years: mockYears }), {
            wrapper: createWrapper('/portfolio/2025'),
        });

        expect(result.current.selectedTab).toBe('2025');
        expect(result.current.activeRouteSlug).toBe('2025');
    });

    it('detects gear route correctly', () => {
        const { result } = renderHook(() => usePortfolioRoute({ years: mockYears }), {
            wrapper: createWrapper('/portfolio/gear/sony-a9iii'),
        });

        expect(result.current.isGearRoute).toBe(true);
        expect(result.current.isTeamRoute).toBe(false);
        expect(result.current.selectedTab).toBe('sony-a9iii');
        expect(result.current.activeRouteSlug).toBe('sony-a9iii');
    });

    it('detects team route correctly', () => {
        const { result } = renderHook(() => usePortfolioRoute({ years: mockYears }), {
            wrapper: createWrapper('/portfolio/team/sacramento-roller-derby'),
        });

        expect(result.current.isTeamRoute).toBe(true);
        expect(result.current.isGearRoute).toBe(false);
        expect(result.current.selectedTab).toBe('sacramento-roller-derby');
        expect(result.current.activeRouteSlug).toBe('sacramento-roller-derby');
    });

    it('parses search query parameters correctly', () => {
        const { result } = renderHook(() => usePortfolioRoute({ years: mockYears }), {
            wrapper: createWrapper('/portfolio?search=true&q=championship'),
        });

        expect(result.current.initialSearchOpen).toBe(true);
        expect(result.current.initialSearchQuery).toBe('championship');
    });

    it('hydrates sharedPhoto state on deep link with photo index', () => {
        renderHook(() => usePortfolioRoute({ years: mockYears }), {
            wrapper: createWrapper('/portfolio/2026/Championship%20Match/4'),
        });

        const store = useAppStore.getState();
        expect(store.sharedPhoto).toEqual({
            eventName: 'Championship Match',
            photoIndex: 4,
        });
    });
});
