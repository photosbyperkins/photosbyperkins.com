import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStoryExport } from './useStoryExport';
import type { StoryRenderConfig } from '../utils/storyCanvas';

vi.mock('../utils/storyCanvas', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../utils/storyCanvas')>();
    return {
        ...actual,
        renderStoryToBlob: vi.fn().mockResolvedValue(new Blob(['fake-image'], { type: 'image/jpeg' })),
    };
});

describe('useStoryExport', () => {
    const mockConfig: StoryRenderConfig = {
        mode: 'crop',
        crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1.0, centerX: 0.5, centerY: 0.5 },
        padded: { style: 'frosted', position: 'center', cardScale: 0.92, cardCornerRadius: 24, customColor: '#0a0a14' },
        resolution: '1080x1920',
        cardTheme: 'dark',
        badgeTheme: 'dark',
        badges: {
            showScoreboard: false,
            showAttribution: false,
            teams: [],
            score1: null,
            score2: null,
        },
    };

    it('initializes with default non-exporting and non-downloaded states', () => {
        const { result } = renderHook(() =>
            useStoryExport({
                loadedImage: null,
                currentConfig: mockConfig,
                eventTitle: 'Championship Game',
                year: '2026',
                canShare: false,
                photoKey: 'photo-1',
            })
        );

        expect(result.current.isExporting).toBe(false);
        expect(result.current.isDownloaded).toBe(false);
        expect(result.current.statusToast).toBeNull();
    });

    it('allows manually toggling isDownloaded and resetting state', () => {
        const { result } = renderHook(() =>
            useStoryExport({
                loadedImage: null,
                currentConfig: mockConfig,
                eventTitle: 'Championship Game',
                year: '2026',
                canShare: false,
                photoKey: 'photo-1',
            })
        );

        act(() => {
            result.current.setIsDownloaded(true);
            result.current.setStatusToast('Exporting ready');
        });

        expect(result.current.isDownloaded).toBe(true);
        expect(result.current.statusToast).toBe('Exporting ready');

        act(() => {
            result.current.resetExportState();
        });

        expect(result.current.isDownloaded).toBe(false);
        expect(result.current.statusToast).toBeNull();
    });

    it('automatically resets isDownloaded when photoKey changes', () => {
        let photoKey = 'photo-1';
        const { result, rerender } = renderHook(() =>
            useStoryExport({
                loadedImage: null,
                currentConfig: mockConfig,
                eventTitle: 'Championship Game',
                year: '2026',
                canShare: false,
                photoKey,
            })
        );

        act(() => {
            result.current.setIsDownloaded(true);
        });
        expect(result.current.isDownloaded).toBe(true);

        // Switch photo
        photoKey = 'photo-2';
        rerender();

        expect(result.current.isDownloaded).toBe(false);
    });

    it('triggers onExportSuccess on successful download', async () => {
        globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
        globalThis.URL.revokeObjectURL = vi.fn();
        const onExportSuccess = vi.fn();
        const mockImg = document.createElement('img');

        const { result } = renderHook(() =>
            useStoryExport({
                loadedImage: mockImg,
                currentConfig: { ...mockConfig, frameId: 'instant-film' },
                eventTitle: 'Championship Game',
                year: '2026',
                canShare: false,
                photoKey: 'photo-1',
                onExportSuccess,
            })
        );

        await act(async () => {
            await result.current.handleDownload();
        });

        expect(onExportSuccess).toHaveBeenCalledTimes(1);
        expect(onExportSuccess).toHaveBeenCalledWith(expect.objectContaining({ frameId: 'instant-film' }));
    });
});
