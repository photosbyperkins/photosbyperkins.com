import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEventAlbum } from './useEventAlbum';
import type { EventData } from '../types';

describe('useEventAlbum', () => {
    const mockSetEv = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not trigger fetch when not visible', () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const ev: EventData = {
            album: [],
            highlights: [],
            albumSlug: 'test-slug',
        };

        const { result } = renderHook(() =>
            useEventAlbum({
                ev,
                isVisible: false,
                selectedYear: '2026',
                eventName: 'Test Event',
                setEv: mockSetEv,
            })
        );

        expect(result.current.loading).toBe(false);
        expect(result.current.fetchError).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('does not trigger fetch when album is already loaded', () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const ev: EventData = {
            album: ['/photos/2026/img1.jpg'],
            highlights: [],
            albumSlug: 'test-slug',
        };

        const { result } = renderHook(() =>
            useEventAlbum({
                ev,
                isVisible: true,
                selectedYear: '2026',
                eventName: 'Test Event',
                setEv: mockSetEv,
            })
        );

        expect(result.current.loading).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fetches album data when visible and updates state', async () => {
        const mockAlbumData = [
            { original: '/photos/2026/1.jpg', thumb: '/thumbnails/2026/1.webp' },
            { original: '/photos/2026/2.jpg', thumb: '/thumbnails/2026/2.webp' },
        ];

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockAlbumData,
        } as unknown as Response);

        const ev: EventData = {
            album: [],
            highlights: [],
            albumSlug: 'derby-match',
        };

        const { result } = renderHook(() =>
            useEventAlbum({
                ev,
                isVisible: true,
                selectedYear: '2026',
                eventName: 'Derby Match',
                setEv: mockSetEv,
            })
        );

        await waitFor(() => {
            expect(mockSetEv).toHaveBeenCalledTimes(1);
        });

        // Verify setEv was called with callback updater
        const updater = mockSetEv.mock.calls[0][0];
        const updated = updater({ ...ev });
        expect(updated.album).toEqual(mockAlbumData);
        expect(result.current.fetchError).toBe(false);
    });

    it('sets loading to true while fetching and false after completion without hanging indefinitely', async () => {
        let resolveFetch: (data: unknown) => void = () => {};
        const fetchPromise = new Promise((resolve) => {
            resolveFetch = resolve;
        });

        vi.spyOn(globalThis, 'fetch').mockReturnValue(fetchPromise as unknown as Promise<Response>);

        const ev: EventData = {
            album: [],
            highlights: [],
            albumSlug: 'delayed-match',
        };

        const { result } = renderHook(() =>
            useEventAlbum({
                ev,
                isVisible: true,
                selectedYear: '2026',
                eventName: 'Delayed Match',
                setEv: mockSetEv,
            })
        );

        // Once fetch begins, loading should be true
        await waitFor(() => {
            expect(result.current.loading).toBe(true);
        });

        // Resolve the fetch with album data
        resolveFetch({
            ok: true,
            status: 200,
            json: async () => [{ original: '/photos/1.jpg' }],
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
            expect(mockSetEv).toHaveBeenCalled();
        });
    });

    it('handles HTTP error by incrementing retry and flagging error after retries', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({}),
        } as unknown as Response);

        const ev: EventData = {
            album: [],
            highlights: [],
            albumSlug: 'failing-match',
        };

        const { result, rerender } = renderHook(
            ({ currentEv }) =>
                useEventAlbum({
                    ev: currentEv,
                    isVisible: true,
                    selectedYear: '2026',
                    eventName: 'Failing Match',
                    setEv: mockSetEv,
                }),
            { initialProps: { currentEv: ev } }
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Trigger second retry attempt by rerendering with same empty state
        rerender({ currentEv: { ...ev } });

        await waitFor(() => {
            expect(result.current.fetchError).toBe(true);
        });
    });
});
