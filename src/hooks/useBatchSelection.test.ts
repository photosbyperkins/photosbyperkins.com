import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBatchSelection } from './useBatchSelection';
import type { PhotoRecord } from '../types';

describe('useBatchSelection', () => {
    const mockPhotos: PhotoRecord[] = [
        { original: '/photos/match/photo_001.jpg', thumb: '/photos/match/photo_001_thumb.jpg' },
        { original: '/photos/match/photo_002.jpg', thumb: '/photos/match/photo_002_thumb.jpg' },
        { original: '/photos/match/photo_003.jpg', thumb: '/photos/match/photo_003_thumb.jpg' },
        { original: '/photos/match/photo_004.jpg', thumb: '/photos/match/photo_004_thumb.jpg' },
        { original: '/photos/match/photo_005.jpg', thumb: '/photos/match/photo_005_thumb.jpg' },
    ];

    it('initializes with inactive select mode and empty selection', () => {
        const { result } = renderHook(() => useBatchSelection({ photos: mockPhotos, eventName: 'Championship 2026' }));

        expect(result.current.isSelectMode).toBe(false);
        expect(result.current.selectedCount).toBe(0);
        expect(result.current.selectedUrls.size).toBe(0);
        expect(result.current.isAllSelected).toBe(false);
        expect(result.current.selectedPhotos).toEqual([]);
    });

    it('toggles select mode and clears selection on exit', () => {
        const { result } = renderHook(() => useBatchSelection({ photos: mockPhotos, eventName: 'Championship 2026' }));

        act(() => {
            result.current.enterSelectMode();
        });
        expect(result.current.isSelectMode).toBe(true);

        act(() => {
            result.current.togglePhoto(mockPhotos[0], 0);
        });
        expect(result.current.selectedCount).toBe(1);

        act(() => {
            result.current.exitSelectMode();
        });
        expect(result.current.isSelectMode).toBe(false);
        expect(result.current.selectedCount).toBe(0);
        expect(result.current.selectedUrls.size).toBe(0);
    });

    it('toggles individual photos on and off', () => {
        const { result } = renderHook(() => useBatchSelection({ photos: mockPhotos, eventName: 'Championship 2026' }));

        act(() => {
            result.current.togglePhoto(mockPhotos[1], 1);
        });
        expect(result.current.isSelectMode).toBe(true); // auto-activates
        expect(result.current.selectedUrls.has('/photos/match/photo_002.jpg')).toBe(true);
        expect(result.current.selectedCount).toBe(1);

        // Toggle again to deselect
        act(() => {
            result.current.togglePhoto(mockPhotos[1], 1);
        });
        expect(result.current.selectedUrls.has('/photos/match/photo_002.jpg')).toBe(false);
        expect(result.current.selectedCount).toBe(0);
    });

    it('supports contiguous range selection via Shift+Click', () => {
        const { result } = renderHook(() => useBatchSelection({ photos: mockPhotos, eventName: 'Championship 2026' }));

        // Select photo at index 1
        act(() => {
            result.current.togglePhoto(mockPhotos[1], 1);
        });

        // Shift+Click photo at index 4 (should select 1, 2, 3, 4)
        act(() => {
            result.current.togglePhoto(mockPhotos[4], 4, true);
        });

        expect(result.current.selectedCount).toBe(4);
        expect(result.current.selectedUrls.has('/photos/match/photo_002.jpg')).toBe(true);
        expect(result.current.selectedUrls.has('/photos/match/photo_003.jpg')).toBe(true);
        expect(result.current.selectedUrls.has('/photos/match/photo_004.jpg')).toBe(true);
        expect(result.current.selectedUrls.has('/photos/match/photo_005.jpg')).toBe(true);
        expect(result.current.selectedUrls.has('/photos/match/photo_001.jpg')).toBe(false);
    });

    it('selects and deselects all photos', () => {
        const { result } = renderHook(() => useBatchSelection({ photos: mockPhotos, eventName: 'Championship 2026' }));

        act(() => {
            result.current.selectAll();
        });
        expect(result.current.isSelectMode).toBe(true);
        expect(result.current.selectedCount).toBe(5);
        expect(result.current.isAllSelected).toBe(true);

        act(() => {
            result.current.deselectAll();
        });
        expect(result.current.selectedCount).toBe(0);
        expect(result.current.isAllSelected).toBe(false);
    });

    it('resets selection when eventName changes', () => {
        let event = 'Bout 1';
        const { result, rerender } = renderHook(() => useBatchSelection({ photos: mockPhotos, eventName: event }));

        act(() => {
            result.current.togglePhoto(mockPhotos[0], 0);
        });
        expect(result.current.selectedCount).toBe(1);

        event = 'Bout 2';
        rerender();

        expect(result.current.isSelectMode).toBe(false);
        expect(result.current.selectedCount).toBe(0);
    });

    it('exits select mode on Escape key press', () => {
        const { result } = renderHook(() => useBatchSelection({ photos: mockPhotos, eventName: 'Championship 2026' }));

        act(() => {
            result.current.enterSelectMode();
            result.current.togglePhoto(mockPhotos[0], 0);
        });
        expect(result.current.isSelectMode).toBe(true);

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });

        expect(result.current.isSelectMode).toBe(false);
        expect(result.current.selectedCount).toBe(0);
    });
});
